import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { openRouterChatText, resolveOpenRouterModel } from "@/lib/llm/openrouter";
import type { ScrapedAdInput } from "@/lib/strategy-overview/strategyDerivation";

const BATCH_MAX = 50;

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

export function hashAdText(text: string): string {
  return createHash("sha256").update(text.trim(), "utf8").digest("hex");
}

type EnrichItem = {
  id: string;
  ad_text: string;
  format: string;
  platform: string;
};

type ModelRow = {
  id: string;
  angle?: string;
  angle_free_text?: string;
  funnel_stage: string;
  voice_tone: string[];
  headline_guess?: string;
  body_theme?: string;
};

async function enrichBatchWithOpenRouter(
  items: EnrichItem[]
): Promise<{ rows: ModelRow[] | null; costUsd: number }> {
  const userPrompt = `You analyze scraped paid ads. For each JSON object in "Ads" return ONE object with the SAME "id".

Infer from the creative copy + platform + format:
- headline_guess: the main hook / headline implied by the copy (≤100 chars). If unclear, best-effort paraphrase of the opening line.
- body_theme: what the body is doing in one phrase (≤100 chars), e.g. "Playoffs tune-in urgency on ABC/NBC/Prime".

angle: exactly one of discount,social_proof,urgency,quality,price,speed,transformation,fear,curiosity,identity — only if it fits. Otherwise set angle to an empty string and put your label in angle_free_text (≤80 chars).

funnel_stage — pick exactly ONE:
- TOF: awareness, hype, entertainment, brand story, massive reach, "tune in / watch live", UGC feel with no hard CTA to buy.
- MOF: education, comparison, social proof, community, "why this product/league", consideration content.
- BOF: direct response, sign up, buy now, subscribe, trial, discount code, ticket/package purchase path, last-click style CTA.

voice_tone: subset of formal,casual,emotional,rational,promotional,informative,benefit-driven

Ads:
${JSON.stringify(items)}

Return ONLY valid JSON array, no markdown:
[{"id":"uuid","angle":"discount","angle_free_text":"","funnel_stage":"TOF","voice_tone":["promotional"],"headline_guess":"...","body_theme":"..."},...]`;

  const out = await openRouterChatText({
    messages: [
      {
        role: "system",
        content:
          "You label ads for marketing funnel analytics. Ground every funnel_stage and angle in the actual text fields—no generic claims. Short, specific outputs only.",
      },
      { role: "user", content: userPrompt },
    ],
    maxCompletionTokens: 4096,
  });

  const costUsd = out.ok && out.usage?.costUsd != null ? out.usage.costUsd : 0;

  if (!out.ok) {
    console.error("[adEnrichment] OpenRouter error", out.error);
    return { rows: null, costUsd: 0 };
  }

  let t = out.text;
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  try {
    const parsed = JSON.parse(t) as unknown;
    if (!Array.isArray(parsed)) return { rows: null, costUsd };
    return { rows: parsed as ModelRow[], costUsd };
  } catch {
    return { rows: null, costUsd };
  }
}

function normalizeFunnel(s: string): string | null {
  const u = (s ?? "").trim().toUpperCase();
  if (u === "TOF" || u === "TOFU") return "TOF";
  if (u === "MOF" || u === "MOFU") return "MOF";
  if (u === "BOF" || u === "BOFU") return "BOF";
  return null;
}

function resolveAngle(r: ModelRow): string | null {
  const raw = typeof r.angle === "string" ? r.angle.trim().toLowerCase().replace(/\s+/g, "_") : "";
  if (raw && ALLOWED_ANGLES.has(raw)) return raw;
  const ft = typeof r.angle_free_text === "string" ? r.angle_free_text.trim() : "";
  if (ft.length >= 2) return ft.slice(0, 80);
  return null;
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
  rows: ScrapedAdInput[]
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
  for (const r of need) {
    const text = (r.ad_text ?? "").trim();
    if (text.length < MIN_AD_TEXT_CHARS) {
      skippedNoText += 1;
      await supabase
        .from("scraped_ads")
        .update({ ai_enrichment_status: "skipped_no_text" })
        .eq("id", r.id)
        .eq("user_id", userId);
      continue;
    }

    const h = hashAdText(r.ad_text);
    const { data: logRow } = await supabase
      .from("ad_enrichment_log")
      .select("id")
      .eq("scraped_ad_id", r.id)
      .eq("content_hash", h)
      .maybeSingle();
    if (logRow && r.ai_enrichment_status !== "failed") continue;
    toEnrich.push(r);
  }

  const modelLabel = resolveOpenRouterModel();
  let enriched = 0;
  for (let i = 0; i < toEnrich.length; i += BATCH_MAX) {
    const batch = toEnrich.slice(i, i + BATCH_MAX);

    const items: EnrichItem[] = batch.map((r) => ({
      id: r.id,
      ad_text: r.ad_text.slice(0, 4000),
      format: r.format,
      platform: r.platform,
    }));

    const { rows: results, costUsd } = await enrichBatchWithOpenRouter(items);
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
        console.warn(`[enrichment] invalid response for ad ID=${row.id}`);
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

      const { error: upErr } = await supabase
        .from("scraped_ads")
        .update({
          ai_extracted_angle: angleCombined.slice(0, 2000),
          funnel_stage: fs,
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
