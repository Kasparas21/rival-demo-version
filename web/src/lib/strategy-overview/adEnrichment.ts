import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database, Json } from "@/lib/supabase/types";
import { llmFast, modelLabelForTask } from "@/lib/llm/anthropic";
import type { ScrapedAdInput } from "@/lib/strategy-overview/strategyDerivation";
import {
  SCRAPED_ADS_DERIVATION_SELECT,
  scrapedAdDerivationRowToInput,
  type ScrapedAdDerivationRow,
} from "@/lib/strategy-overview/scraped-ads-derivation-columns";

/**
 * Parse JSON that may be truncated mid-array. Returns valid leading objects.
 * Used when model output hits max_tokens and the tail is cut off mid-string.
 */
function parseJsonArraySalvage(text: string): unknown[] | null {
  const trimmed = text.trim();

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* fall through */
  }

  const startIdx = trimmed.indexOf("[");
  if (startIdx === -1) return null;

  const results: unknown[] = [];
  let depth = 0;
  let objectStart = -1;
  let inString = false;
  let escaped = false;

  for (let i = startIdx + 1; i < trimmed.length; i++) {
    const ch = trimmed[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") {
      if (depth === 0) objectStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && objectStart >= 0) {
        const objStr = trimmed.slice(objectStart, i + 1);
        try {
          results.push(JSON.parse(objStr));
        } catch {
          /* skip malformed object */
        }
        objectStart = -1;
      }
    }
  }

  return results.length > 0 ? results : null;
}

// Sized so batches stay well under max_tokens output. At ~120 output tokens per ad,
// BATCH_MAX × 120 must stay below LLM maxTokens with headroom.
const BATCH_MAX = 15;

const MIN_AD_TEXT_CHARS = 10;

const ALLOWED_ANGLES = new Set([
  "discount",
  "social_proof",
  "urgency",
  "quality",
  "price",
  "speed",
  "transformation",
  "fear",
  "curiosity",
  "identity",
]);

const voiceToneSchema = z.object({
  formal: z.number().min(0).max(1),
  emotional: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
});

const modelRowSchema = z.object({
  id: z.string(),
  angle: z.string().optional(),
  angle_free_text: z.string().optional(),
  funnel_stage: z.string(),
  voice_tone: voiceToneSchema.optional(),
  headline_guess: z.string().optional(),
  body_theme: z.string().optional(),
});

/** First letter or digit (any Unicode script) — strips emoji, stray slashes, ZWSP, etc. */
export function prepareAdTextForEnrichment(raw: string): string {
  const t = raw.trim();
  const match = t.match(/[\p{L}\p{N}]/u);
  if (!match || match.index == null) return t;
  return t.slice(match.index).trim();
}

export function hashAdText(text: string): string {
  return createHash("sha256").update(text.trim(), "utf8").digest("hex");
}

type EnrichItem = {
  id: string;
  ad_text: string;
  format: string;
  platform: string;
};

/**
 * Maps model output to TOF | MOF | BOF. Accepts exact tokens plus common EN synonyms and light Lithuanian/French/German cues.
 */
export function normalizeFunnel(raw: string): "TOF" | "MOF" | "BOF" | null {
  const s = (raw ?? "").trim();
  if (!s) return null;

  const u = s.toUpperCase().replace(/[\s-]+/g, "_");
  if (u === "TOF" || u === "TOFU") return "TOF";
  if (u === "MOF" || u === "MOFU") return "MOF";
  if (u === "BOF" || u === "BOFU") return "BOF";

  const compact = s.replace(/\s/g, "").toUpperCase();
  if (compact.includes("TOF") || compact.includes("TOFU")) return "TOF";
  if (compact.includes("MOF") || compact.includes("MOFU")) return "MOF";
  if (compact.includes("BOF") || compact.includes("BOFU")) return "BOF";

  const t = s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

  if (
    /\b(awareness|discovery|reach|branding|brand story|upper funnel|top funnel|cold)\b/.test(t) ||
    /\b(notoriete|decouverte|reichweite)\b/.test(t) ||
    /(zinojimo|pasiekiam|demesio|story)/i.test(s)
  ) {
    return "TOF";
  }

  if (
    /\b(consideration|education|compare|comparison|community|why us|middle funnel|warm)\b/.test(t) ||
    /\b(erwaenung|information|nutzen)\b/.test(t) ||
    /(palygin|issilavin|bendruomen|kodel)/i.test(s)
  ) {
    return "MOF";
  }

  if (
    /\b(buy|book|order|shop|sign up|subscribe|discount|offer|coupon|appointment|consultation|quote|today|now|limited)\b/.test(
      t
    ) ||
    /\b(acheter|offre|rabais|rdv|devis|gratuit)\b/.test(t) ||
    /\b(kaufen|angebot|jetzt|termin)\b/.test(t) ||
    /(pasiulym|nemokam|konsultac|rezervu|uzsak|nuolaid|kaina|€\s*\d)/i.test(t)
  ) {
    return "BOF";
  }

  return null;
}

/** Canonical angle slug, free-text label, or best-effort from headline/body fields. */
export function resolveAngle(r: z.infer<typeof modelRowSchema>): string | null {
  const raw = typeof r.angle === "string" ? r.angle.trim().toLowerCase().replace(/\s+/g, "_") : "";
  if (raw && ALLOWED_ANGLES.has(raw)) return raw;
  const ft = typeof r.angle_free_text === "string" ? r.angle_free_text.trim() : "";
  if (ft.length >= 2) return ft.slice(0, 80);
  const hook = typeof r.headline_guess === "string" ? r.headline_guess.trim() : "";
  if (hook.length >= 3) return hook.slice(0, 80);
  const body = typeof r.body_theme === "string" ? r.body_theme.trim() : "";
  if (body.length >= 3) return body.slice(0, 80);
  return null;
}

function buildEnrichmentUserPrompt(items: EnrichItem[]): string {
  return `You label paid ads for funnel analytics. **Ads may be in any language** (Lithuanian, English, German, French, …). Classify by **commercial intent and structure**, not by language. Ignore leading emojis, slashes, or decorative punctuation — focus on the first real words.

**Truncated copy:** Library text is often cut mid-sentence (e.g. ending with "…" or "d..."). Infer the likely full intent from what is visible; still output every required field.

For each object in "Ads", return **one** JSON object with the **same** "id".

Fields:
- headline_guess: main hook (≤100 chars). Use the ad's language or English if mixed — short and specific.
- body_theme: what the ad does in one phrase (≤100 chars).

- angle: exactly one of: discount, social_proof, urgency, quality, price, speed, transformation, fear, curiosity, identity — **only** if it clearly fits. Else use "" and put a short label in angle_free_text (≤80 chars, any language).

- funnel_stage: **exactly one string**, must be one of: **TOF**, **MOF**, **BOF** (Latin letters only).
  - TOF = awareness / brand / reach / story, light CTA
  - MOF = education / comparison / trust / community
  - BOF = direct response: offers, appointments, savings, "consultation", prices, strong booking/buy CTA

- voice_tone: **required** object with numbers in [0,1]: formal (0 casual → 1 formal), emotional (0 rational → 1 emotional), confidence (your certainty; use 0.25–0.45 for very short or truncated copy).

Worked examples (format only — your ids come from Ads):

1) English long Meta:
{"id":"ex1","angle":"urgency","angle_free_text":"","funnel_stage":"MOF","voice_tone":{"formal":0.55,"emotional":0.5,"confidence":0.82},"headline_guess":"Limited-time playoff watch party","body_theme":"Drive tune-in with countdown energy"}

2) Lithuanian short Google Search:
{"id":"ex2","angle":"price","angle_free_text":"","funnel_stage":"BOF","voice_tone":{"formal":0.65,"emotional":0.35,"confidence":0.55},"headline_guess":"Implantai nuo 999€","body_theme":"Price-led dental offer"}

3) German image ad:
{"id":"ex3","angle":"quality","angle_free_text":"","funnel_stage":"MOF","voice_tone":{"formal":0.7,"emotional":0.4,"confidence":0.68},"headline_guess":"Zahnimplantate mit Garantie","body_theme":"Trust and quality positioning"}

4) French awareness:
{"id":"ex4","angle":"curiosity","angle_free_text":"","funnel_stage":"TOF","voice_tone":{"formal":0.5,"emotional":0.55,"confidence":0.72},"headline_guess":"Découvrez une nouvelle routine sourire","body_theme":"Soft brand / discovery"}

Ads:
${JSON.stringify(items)}

Return **only** a valid JSON array (no markdown):
[{"id":"uuid","angle":"","angle_free_text":"...","funnel_stage":"BOF","voice_tone":{"formal":0.4,"emotional":0.5,"confidence":0.5},"headline_guess":"...","body_theme":"..."},...]`;
}

async function enrichBatchWithLlm(
  items: EnrichItem[]
): Promise<{ rows: z.infer<typeof modelRowSchema>[] | null; costUsd: number; preZodCount: number }> {
  console.log("[enrich-trace] enrichBatch called, items=", items.length, "model=", modelLabelForTask("ad_enrichment"));
  const userPrompt = buildEnrichmentUserPrompt(items);

  console.log("[enrich-trace] sending to OpenRouter");
  const out = await llmFast({
    task: "ad_enrichment",
    systemPrompt:
      "You output strict JSON only. Multilingual ads: classify funnel and angle by intent in any language. funnel_stage must be exactly TOF, MOF, or BOF. Never invent platforms or brands not in the copy.",
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 8192,
  });
  console.log("[enrich-trace] OpenRouter response ok=", out.ok, "error=", !out.ok ? out.error : "none");

  const costUsd = out.ok ? out.usage.costUsd : 0;

  if (!out.ok) {
    console.error("[adEnrichment] OpenRouter error", out.error);
    return { rows: null, costUsd: 0, preZodCount: 0 };
  }

  let t = out.text;
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  try {
    const parsed = parseJsonArraySalvage(t);
    if (!parsed || parsed.length === 0) {
      console.warn("[enrich-trace] LLM JSON parse and salvage both failed, first 300 chars:", t.slice(0, 300));
      return { rows: null, costUsd, preZodCount: 0 };
    }

    if (parsed.length < items.length) {
      console.warn(
        `[enrich-trace] JSON salvaged ${parsed.length}/${items.length} objects — truncated or incomplete array`
      );
    }

    const rows: z.infer<typeof modelRowSchema>[] = [];
    let zodFailed = 0;
    for (const item of parsed) {
      const zr = modelRowSchema.safeParse(item);
      if (zr.success) rows.push(zr.data);
      else zodFailed += 1;
    }
    if (rows.length > 0) {
      console.log("[enrich-trace] sample row:", JSON.stringify(rows[0]).slice(0, 500));
    } else if (parsed.length > 0) {
      console.warn("[enrich-trace] sample raw first element:", JSON.stringify(parsed[0]).slice(0, 500));
    }
    if (rows.length === 0) {
      console.warn("[enrich-trace] No rows passed Zod validation, first 300 chars:", t.slice(0, 300));
      return { rows: null, costUsd, preZodCount: parsed.length };
    }
    if (zodFailed > 0) {
      console.warn(`[enrich-trace] Zod dropped ${zodFailed} row(s) from LLM array`);
    }
    return { rows, costUsd, preZodCount: parsed.length };
  } catch (e) {
    console.warn("[enrich-trace] Unexpected parse error, first 400 chars:", t.slice(0, 400), e);
    return { rows: null, costUsd, preZodCount: 0 };
  }
}

function voiceToneForDb(r: z.infer<typeof modelRowSchema>): Json | null {
  if (r.voice_tone == null) return null;
  const ok = voiceToneSchema.safeParse(r.voice_tone);
  if (!ok.success) return null;
  return ok.data as unknown as Json;
}

function needsEnrichmentStatus(r: ScrapedAdInput): boolean {
  const st = r.ai_enrichment_status;
  if (st === "enriched" || st === "skipped_no_text") return false;
  return st === "pending" || st === "failed" || st == null || st === "";
}

/**
 * Enrich ads with pending/failed/null status; skips rows already in ad_enrichment_log for same content hash (unless status is failed).
 */
export async function enrichScrapedAdsIfNeeded(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
  rows: ScrapedAdInput[],
  opts?: {
    /** Return false to stop batching (e.g. recompute lock lost). */
    beforeBatch?: () => Promise<boolean>;
    /** Renew recompute lock lease after each successful batch. */
    afterBatch?: () => Promise<void>;
    /** Max ads to attempt enriching this invocation (cron / interactive caps). */
    maxAdsToProcess?: number;
    /** Max LLM batches (each BATCH_MAX ads) per invocation. */
    maxBatches?: number;
  }
): Promise<{
  enriched: number;
  skipped: boolean;
  total: number;
  needsEnrichment: number;
  skippedNoText: number;
  failedInvalid: number;
  failedBatch: number;
  usageCostUsd: number;
}> {
  console.log("[enrich-trace] entered, total=", rows.length);
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const total = rows.length;
  let skippedNoText = 0;
  let failedInvalid = 0;
  let failedBatch = 0;
  let usageCostUsd = 0;

  if (!apiKey) {
    console.log(
      `[enrichment] start competitorId=${competitorId} | total=${total} | needsEnrichment=0 (no API key)`
    );
    return {
      enriched: 0,
      skipped: true,
      total,
      needsEnrichment: 0,
      skippedNoText: 0,
      failedInvalid: 0,
      failedBatch: 0,
      usageCostUsd: 0,
    };
  }

  const need: ScrapedAdInput[] = [];
  for (const r of rows) {
    if (needsEnrichmentStatus(r)) need.push(r);
  }

  console.log(
    `[enrichment] start competitorId=${competitorId} | total=${total} | needsEnrichment=${need.length}`
  );

  if (need.length === 0) {
    return {
      enriched: 0,
      skipped: false,
      total,
      needsEnrichment: 0,
      skippedNoText: 0,
      failedInvalid: 0,
      failedBatch: 0,
      usageCostUsd: 0,
    };
  }

  const toEnrich: ScrapedAdInput[] = [];
  const skippedNoTextIds: string[] = [];
  type TextCandidate = { row: ScrapedAdInput; hash: string };
  const textCandidates: TextCandidate[] = [];

  for (const r of need) {
    const prepared = prepareAdTextForEnrichment(r.ad_text ?? "");
    if (prepared.length < MIN_AD_TEXT_CHARS) {
      skippedNoText += 1;
      skippedNoTextIds.push(r.id);
      continue;
    }
    textCandidates.push({ row: r, hash: hashAdText(r.ad_text) });
  }

  if (skippedNoTextIds.length > 0) {
    await supabase
      .from("scraped_ads")
      .update({ ai_enrichment_status: "skipped_no_text" })
      .in("id", skippedNoTextIds)
      .eq("user_id", userId);
  }

  const logKeys = new Set<string>();
  if (textCandidates.length > 0) {
    const ids = textCandidates.map((c) => c.row.id);
    const { data: logRows } = await supabase
      .from("ad_enrichment_log")
      .select("scraped_ad_id, content_hash")
      .in("scraped_ad_id", ids);
    for (const row of logRows ?? []) {
      logKeys.add(`${row.scraped_ad_id}:${row.content_hash}`);
    }
  }

  for (const { row, hash } of textCandidates) {
    if (logKeys.has(`${row.id}:${hash}`) && row.ai_enrichment_status !== "failed") continue;
    toEnrich.push(row);
  }

  let workQueue = toEnrich;
  if (opts?.maxAdsToProcess != null && opts.maxAdsToProcess > 0) {
    workQueue = toEnrich.slice(0, opts.maxAdsToProcess);
  }

  console.log("[enrich-trace] toEnrich count=", workQueue.length);
  console.log("[enrich-trace] starting batch loop, batchMax=", BATCH_MAX);
  const modelLabel = modelLabelForTask("ad_enrichment");
  let enriched = 0;
  const maxBatches = opts?.maxBatches;
  for (let i = 0; i < workQueue.length; i += BATCH_MAX) {
    const batchNum = Math.floor(i / BATCH_MAX);
    if (maxBatches != null && batchNum >= maxBatches) break;
    if (opts?.beforeBatch) {
      const ok = await opts.beforeBatch();
      if (!ok) {
        console.warn(
          `[enrichment] stopping early competitorId=${competitorId} batch=${i} — recompute lock lost`
        );
        break;
      }
    }

    const batch = workQueue.slice(i, i + BATCH_MAX);
    console.log("[enrich-trace] batch index=", i, "batch size=", batch.length);

    const items: EnrichItem[] = batch.map((r) => {
      const cleaned = prepareAdTextForEnrichment(r.ad_text ?? "");
      return {
        id: r.id,
        ad_text: cleaned.slice(0, 4000),
        format: r.format,
        platform: r.platform,
      };
    });

    console.log("[enrich-trace] calling enrichBatch, items=", items.length);
    let results: z.infer<typeof modelRowSchema>[] | null;
    let costUsd: number;
    try {
      const batchOut = await enrichBatchWithLlm(items);
      results = batchOut.rows;
      costUsd = batchOut.costUsd;
      const batchNum = Math.floor(i / BATCH_MAX) + 1;
      const batchTotal = Math.max(1, Math.ceil(toEnrich.length / BATCH_MAX));
      const salvaged =
        batchOut.preZodCount > 0 && batchOut.preZodCount < batch.length;
      console.log(
        `[enrich-trace] batch ${batchNum} of ${batchTotal}: LLM returned ${results?.length ?? 0} parsed rows, batch had ${batch.length} items (salvaged=${salvaged ? "yes" : "no"})`
      );
      console.log(
        "[enrich-trace] enrichBatch returned, rowCount=",
        results?.length ?? "null",
        "cost=",
        costUsd
      );
    } catch (err) {
      console.error("[enrich-trace] enrichBatch THREW", err);
      continue;
    }
    usageCostUsd += costUsd;
    const costStr = costUsd > 0 ? `$${costUsd.toFixed(4)}` : "n/a";
    console.log(`[enrichment] batch sent size=${batch.length} cost_estimate=${costStr}`);

    let batchEnriched = 0;
    let batchFailed = 0;
    let batchSkippedOther = 0;

    if (!results) {
      failedBatch += batch.length;
      batchFailed = batch.length;
      for (const row of batch) {
        await supabase
          .from("scraped_ads")
          .update({ ai_enrichment_status: "failed" })
          .eq("id", row.id)
          .eq("user_id", userId);
      }
      console.log(
        `[enrichment] batch complete → enriched=${batchEnriched} | failed=${batchFailed} | skipped=${batchSkippedOther}`
      );
      continue;
    }

    const byId = new Map(results.map((r) => [r.id, r]));

    for (const row of batch) {
      const r = byId.get(row.id);
      if (!r) {
        batchSkippedOther += 1;
        failedInvalid += 1;
        console.warn(`[enrichment] invalid response for ad ID=${row.id}`);
        await supabase
          .from("scraped_ads")
          .update({ ai_enrichment_status: "failed" })
          .eq("id", row.id)
          .eq("user_id", userId);
        continue;
      }

      const fs = normalizeFunnel(r.funnel_stage);
      const angleResolved = resolveAngle(r);
      if (!fs || !angleResolved) {
        failedInvalid += 1;
        batchFailed += 1;
        console.warn(
          `[enrichment] invalid funnel/angle for ad ID=${row.id} funnel_raw=${JSON.stringify(r.funnel_stage)} angle_keys=${!!r.angle}/${!!r.angle_free_text}`
        );
        await supabase
          .from("scraped_ads")
          .update({ ai_enrichment_status: "failed" })
          .eq("id", row.id)
          .eq("user_id", userId);
        continue;
      }

      const hook = typeof r.headline_guess === "string" ? r.headline_guess.trim() : "";
      const bodyT = typeof r.body_theme === "string" ? r.body_theme.trim() : "";
      const angleCombined = [
        angleResolved.slice(0, 100),
        hook && `Hook: ${hook.slice(0, 140)}`,
        bodyT && `Body: ${bodyT.slice(0, 160)}`,
      ]
        .filter(Boolean)
        .join(" · ");

      const voiceJson = voiceToneForDb(r);

      const { error: upErr } = await supabase
        .from("scraped_ads")
        .update({
          ai_extracted_angle: angleCombined.slice(0, 2000),
          funnel_stage: fs,
          ai_extracted_voice_tone: voiceJson,
          ai_enrichment_status: "enriched",
        })
        .eq("id", row.id)
        .eq("user_id", userId);

      if (upErr) {
        console.error("[adEnrichment] update scraped_ads", upErr.message);
        batchFailed += 1;
        continue;
      }

      const h = hashAdText(row.ad_text);
      await supabase.from("ad_enrichment_log").insert({
        user_id: userId,
        scraped_ad_id: row.id,
        content_hash: h,
        model: modelLabel,
      });
      enriched += 1;
      batchEnriched += 1;
    }

    console.log(
      `[enrichment] batch complete → enriched=${batchEnriched} | failed=${batchFailed} | skipped=${batchSkippedOther}`
    );
    if (opts?.afterBatch) {
      await opts.afterBatch();
    }
  }

  return {
    enriched,
    skipped: false,
    total,
    needsEnrichment: need.length,
    skippedNoText,
    failedInvalid,
    failedBatch,
    usageCostUsd,
  };
}

export type EnrichScrapedAdsStats = Awaited<ReturnType<typeof enrichScrapedAdsIfNeeded>>;

/** Load every pending/failed ad for a competitor and enrich in LLM batches (15 ads per batch). */
export async function enrichAllPendingScrapedAdsForCompetitor(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
  opts?: {
    beforeBatch?: () => Promise<boolean>;
    afterBatch?: () => Promise<void>;
  },
): Promise<EnrichScrapedAdsStats> {
  const { data: adsRows, error: adsErr } = await supabase
    .from("scraped_ads")
    .select(SCRAPED_ADS_DERIVATION_SELECT)
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .eq("is_active", true)
    .or("ai_enrichment_status.is.null,ai_enrichment_status.eq.pending,ai_enrichment_status.eq.failed")
    .order("created_at", { ascending: true });

  if (adsErr) {
    console.error("[enrichAllPending] load scraped_ads", adsErr.message);
    return {
      enriched: 0,
      skipped: true,
      total: 0,
      needsEnrichment: 0,
      skippedNoText: 0,
      failedInvalid: 0,
      failedBatch: 0,
      usageCostUsd: 0,
    };
  }

  const inputs = ((adsRows ?? []) as ScrapedAdDerivationRow[]).map(scrapedAdDerivationRowToInput);
  if (inputs.length === 0) {
    return {
      enriched: 0,
      skipped: false,
      total: 0,
      needsEnrichment: 0,
      skippedNoText: 0,
      failedInvalid: 0,
      failedBatch: 0,
      usageCostUsd: 0,
    };
  }

  return enrichScrapedAdsIfNeeded(supabase, userId, competitorId, inputs, {
    beforeBatch: opts?.beforeBatch,
    afterBatch: opts?.afterBatch,
  });
}
