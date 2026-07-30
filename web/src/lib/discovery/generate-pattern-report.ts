import type { SupabaseClient } from "@supabase/supabase-js";

import {
  extractImpressionsIndex,
  qualifiesAsUltimateWinner,
  resolveScrapedAdRunDays,
} from "@/lib/ad-library/ad-performance-ranking";
import { stripJsonFences } from "@/lib/email-intelligence/analyze";
import { resolveModelForTask } from "@/lib/llm/model-routing";
import { openRouterChatText } from "@/lib/llm/openrouter";
import { resolveTimelineAdKilled } from "@/lib/timeline/resolve-timeline-ad-killed";
import { landingPageKeyFromAd } from "@/lib/landing-pages/count-unique-landing-pages";
import type { Database, Json } from "@/lib/supabase/types";

import { loadCompetitorIdsForBrandIds } from "./build-discovery-feed";
import {
  computeDiscoveryPatternMetrics,
  parsePatternWeekStartMs,
  resolvePatternWeekStartMs,
  resolvePatternWeekStartYmd,
  type PatternMetricsAd,
} from "./compute-pattern-metrics";
import { DAY_MS, inUtcHalfOpenRange } from "./pattern-week-utils";
import { normalizeDiscoveryPatternInsights } from "./pattern-types";
import type { DiscoveryPatternMetrics, DiscoveryPatternReportDto } from "./types";

import { fetchAllDiscoveryScrapedAds } from "@/lib/discovery/fetch-discovery-scraped-ads";

const IN_CHUNK = 40;
const LEAN_AD_SELECT =
  "id, competitor_id, platform, format, ad_text, ad_creative_url, first_seen_at, last_seen_at, is_active, ai_extracted_angle, ai_extracted_launch_date";
const FULL_AD_SELECT = `${LEAN_AD_SELECT}, raw_payload`;

type ScrapedRow = {
  id: string;
  competitor_id: string;
  platform: string;
  format: string | null;
  ad_text: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean | null;
  raw_payload?: unknown;
  ai_extracted_angle?: string | null;
  ai_extracted_launch_date?: string | null;
};

type CompetitorRow = {
  id: string;
  name: string | null;
  brand_name: string | null;
  last_scraped_at: string | null;
};

const SYSTEM_PROMPT = `You are a senior paid-social strategist analyzing a competitive market for an agency. You receive structured data about every Meta ad tracked in this market: launches, kills, long-running winners, and pre-computed aggregate metrics. Your job is to find PATTERNS — what creative approaches, offers, hooks, and formats are winning or dying in this specific market, and what that implies for an advertiser entering it this week. The market vertical must be inferred from the competitor names and ad texts (e.g. dental clinics); use vertical-appropriate language. Never invent numbers — every numeric claim must come from the provided metrics. Reference evidence ads by their id. Write in clear, punchy English. Return ONLY valid JSON matching the requested schema. No markdown, no preamble.`;

const OUTPUT_SCHEMA = `{
  headline: string;
  market_temperature: "heating_up" | "steady" | "cooling_down";
  temperature_reason: string;
  patterns: Array<{
    title: string;
    category: "offer" | "hook" | "format" | "creative" | "timing" | "competitor_move";
    description: string;
    confidence: "high" | "medium" | "low";
    evidence_ad_ids: string[];
    trend_direction: "rising" | "falling" | "stable";
  }>;
  winners_playbook: string[];
  graveyard_lessons: string[];
  recommended_tests: Array<{
    idea: string;
    rationale: string;
    inspired_by_ad_ids: string[];
  }>;
  competitor_spotlight: { name: string; observation: string } | null;
}`;

function chunkIds<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function parseMs(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function effectiveLaunchMs(ad: PatternMetricsAd): number | null {
  const launchRaw = ad.ai_extracted_launch_date?.trim();
  const launchMs = launchRaw ? Date.parse(launchRaw) : NaN;
  if (Number.isFinite(launchMs)) return launchMs;
  return parseMs(ad.first_seen_at);
}

function launchYmd(ad: PatternMetricsAd): string {
  const ms = effectiveLaunchMs(ad);
  return ms != null ? new Date(ms).toISOString().slice(0, 10) : ad.first_seen_at.slice(0, 10);
}

async function loadCompetitorsById(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorIds: string[],
): Promise<{ rows: CompetitorRow[]; error?: string }> {
  const rows: CompetitorRow[] = [];
  for (const chunk of chunkIds(competitorIds, IN_CHUNK)) {
    const { data, error } = await supabase
      .from("saved_competitors")
      .select("id, name, brand_name, last_scraped_at")
      .eq("user_id", userId)
      .in("id", chunk);
    if (error) return { rows: [], error: error.message };
    rows.push(...((data ?? []) as CompetitorRow[]));
  }
  return { rows };
}

async function fetchPatternAdRows(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorIds: string[],
): Promise<{ rows: ScrapedRow[]; error?: string }> {
  return fetchAllDiscoveryScrapedAds(supabase, userId, competitorIds, FULL_AD_SELECT);
}

function hydratePatternAd(row: ScrapedRow, comp: CompetitorRow, nowMs: number): PatternMetricsAd {
  const platform = (row.platform ?? "meta").trim().toLowerCase();
  const is_killed = resolveTimelineAdKilled(
    {
      platform,
      last_seen_at: row.last_seen_at,
      is_active: row.is_active ?? true,
      raw_payload: row.raw_payload ?? null,
    },
    comp.last_scraped_at,
    nowMs,
  );
  const impressions_index = extractImpressionsIndex(row.raw_payload ?? null);
  const scrapeAtMs = comp.last_scraped_at ? new Date(comp.last_scraped_at).getTime() : nowMs;
  const days_running = resolveScrapedAdRunDays({
    platform,
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
    is_killed,
    raw_payload: row.raw_payload ?? null,
    scrapeAtMs,
    nowMs,
  });

  return {
    id: row.id,
    competitor_id: row.competitor_id,
    competitor_name: comp.brand_name?.trim() || comp.name?.trim() || "Competitor",
    format: row.format ?? "",
    ad_text: row.ad_text ?? "",
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
    is_killed,
    days_running,
    impressions_index,
    is_ultimate_winner: qualifiesAsUltimateWinner(impressions_index, days_running),
    ai_extracted_angle: row.ai_extracted_angle ?? null,
    ai_extracted_launch_date: row.ai_extracted_launch_date ?? null,
    landing_page_key: landingPageKeyFromAd({
      platform,
      raw_payload: row.raw_payload ?? null,
    }),
  };
}

type EvidenceAd = {
  id: string;
  competitor: string;
  status: "new" | "killed" | "new_winner";
  days_running: number;
  impressions_index: number | null;
  format: string;
  launched: string;
  text: string;
  angle: string | null;
};

function buildEvidencePayload(
  ads: PatternMetricsAd[],
  metrics: DiscoveryPatternMetrics,
  marketContext: string,
  weekStartMs: number,
  nowMs: number,
) {
  const lookbackStart = weekStartMs - 7 * DAY_MS;
  const thisWeekEnd = weekStartMs + 7 * DAY_MS;

  const changedAds: EvidenceAd[] = [];
  for (const ad of ads) {
    const launchMs = effectiveLaunchMs(ad);
    const lastMs = parseMs(ad.last_seen_at);
    const launchedRecently =
      launchMs != null && inUtcHalfOpenRange(launchMs, lookbackStart, thisWeekEnd);
    const killedRecently =
      ad.is_killed && lastMs != null && inUtcHalfOpenRange(lastMs, lookbackStart, thisWeekEnd);
    if (!launchedRecently && !killedRecently) continue;

    let status: EvidenceAd["status"] = "new";
    if (ad.is_killed && killedRecently) status = "killed";
    else if (ad.is_ultimate_winner && launchedRecently) status = "new_winner";

    changedAds.push({
      id: ad.id,
      competitor: ad.competitor_name,
      status,
      days_running: ad.days_running,
      impressions_index: ad.impressions_index,
      format: ad.format,
      launched: launchYmd(ad),
      text: ad.ad_text.slice(0, 280),
      angle: ad.ai_extracted_angle,
    });
  }

  changedAds.sort((a, b) => {
    const rank = (s: EvidenceAd["status"]) => (s === "new_winner" ? 0 : s === "new" ? 1 : 2);
    return rank(a.status) - rank(b.status) || b.days_running - a.days_running;
  });

  const longRunners = ads
    .filter((ad) => !ad.is_killed)
    .sort((a, b) => b.days_running - a.days_running)
    .slice(0, 20)
    .map(
      (ad): EvidenceAd => ({
        id: ad.id,
        competitor: ad.competitor_name,
        status: ad.is_ultimate_winner ? "new_winner" : "new",
        days_running: ad.days_running,
        impressions_index: ad.impressions_index,
        format: ad.format,
        launched: launchYmd(ad),
        text: ad.ad_text.slice(0, 280),
        angle: ad.ai_extracted_angle,
      }),
    );

  return {
    changed_ads: changedAds.slice(0, 250),
    long_runners: longRunners,
    metrics,
    market_context: marketContext,
  };
}

async function callPatternLlm(
  payload: ReturnType<typeof buildEvidencePayload>,
  retryInvalid = false,
): Promise<
  | { ok: true; insights: ReturnType<typeof normalizeDiscoveryPatternInsights>; model: string; usage: { inputTokens: number; outputTokens: number; costUsd: number } }
  | { ok: false; error: string }
> {
  const route = resolveModelForTask("discovery_patterns");
  const userContent = JSON.stringify(payload);
  const messages = [
    {
      role: "user" as const,
      content: `${userContent}\n\nReturn JSON matching this schema:\n${OUTPUT_SCHEMA}`,
    },
    ...(retryInvalid
      ? [
          {
            role: "assistant" as const,
            content: "Previous output was invalid.",
          },
          {
            role: "user" as const,
            content:
              "Your previous output was invalid JSON or did not match the schema. Return ONLY valid JSON matching the schema. No markdown fences.",
          },
        ]
      : []),
  ];

  const result = await openRouterChatText({
    model: route.model,
    systemPrompt: SYSTEM_PROMPT,
    messages,
    maxCompletionTokens: 4096,
  });

  if (!result.ok) return { ok: false, error: result.error };

  try {
    const parsed = JSON.parse(stripJsonFences(result.text));
    const insights = normalizeDiscoveryPatternInsights(parsed);
    return {
      ok: true,
      insights,
      model: result.model,
      usage: result.usage,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to parse LLM JSON",
    };
  }
}

function rowToDto(row: Database["public"]["Tables"]["discovery_pattern_reports"]["Row"]): DiscoveryPatternReportDto {
  return {
    id: row.id,
    brand_id: row.brand_id,
    week_start: row.week_start,
    status: row.status === "failed" ? "failed" : "done",
    error_text: row.error_text,
    metrics: (row.metrics ?? {}) as DiscoveryPatternMetrics,
    insights: normalizeDiscoveryPatternInsights(row.insights ?? {}),
    model: row.model,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export type GeneratePatternReportResult =
  | { ok: true; skipped: true; report: DiscoveryPatternReportDto }
  | { ok: true; skipped: false; report: DiscoveryPatternReportDto }
  | { ok: false; error: string };

export async function generatePatternReport(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  brandId: string;
  brandName?: string;
  force?: boolean;
  weekStartYmd?: string;
  nowMs?: number;
}): Promise<GeneratePatternReportResult> {
  const nowMs = params.nowMs ?? Date.now();
  const weekStartYmd = params.weekStartYmd ?? resolvePatternWeekStartYmd(nowMs);
  const weekStartMs = parsePatternWeekStartMs(weekStartYmd);

  if (!params.force) {
    const { data: existing } = await params.supabase
      .from("discovery_pattern_reports")
      .select("*")
      .eq("user_id", params.userId)
      .eq("brand_id", params.brandId)
      .eq("week_start", weekStartYmd)
      .maybeSingle();

    if (existing?.status === "done") {
      return { ok: true, skipped: true, report: rowToDto(existing) };
    }
  }

  const { ids: competitorIds, error: competitorError } = await loadCompetitorIdsForBrandIds(
    params.supabase,
    params.userId,
    [params.brandId],
  );
  if (competitorError) return { ok: false, error: competitorError };
  if (!competitorIds.length) {
    return { ok: false, error: "No tracked competitors for this workspace" };
  }

  const { rows: competitors, error: compLoadError } = await loadCompetitorsById(
    params.supabase,
    params.userId,
    competitorIds,
  );
  if (compLoadError) return { ok: false, error: compLoadError };

  const compById = new Map(competitors.map((c) => [c.id, c]));
  const { rows: scrapedRows, error: adsError } = await fetchPatternAdRows(
    params.supabase,
    params.userId,
    competitorIds,
  );
  if (adsError) return { ok: false, error: adsError };

  const ads = scrapedRows
    .map((row) => {
      const comp = compById.get(row.competitor_id);
      if (!comp) return null;
      return hydratePatternAd(row, comp, nowMs);
    })
    .filter((ad): ad is PatternMetricsAd => ad != null);

  const metrics = computeDiscoveryPatternMetrics(ads, weekStartMs, nowMs);
  const competitorNames = competitors
    .map((c) => c.brand_name?.trim() || c.name?.trim())
    .filter(Boolean) as string[];
  const marketContext = [params.brandName?.trim(), ...competitorNames].filter(Boolean).join(", ");
  const evidence = buildEvidencePayload(ads, metrics, marketContext, weekStartMs, nowMs);

  let llm = await callPatternLlm(evidence, false);
  if (!llm.ok) {
    llm = await callPatternLlm(evidence, true);
  }

  const nowIso = new Date(nowMs).toISOString();

  if (!llm.ok) {
    const { data: failedRow, error: upsertErr } = await params.supabase
      .from("discovery_pattern_reports")
      .upsert(
        {
          user_id: params.userId,
          brand_id: params.brandId,
          week_start: weekStartYmd,
          status: "failed",
          error_text: llm.error,
          metrics: metrics as unknown as Json,
          insights: {} as Json,
          model: resolveModelForTask("discovery_patterns").model,
          updated_at: nowIso,
        },
        { onConflict: "user_id,brand_id,week_start" },
      )
      .select("*")
      .single();

    if (upsertErr) return { ok: false, error: upsertErr.message };
    return { ok: true, skipped: false, report: rowToDto(failedRow) };
  }

  const { data: savedRow, error: saveErr } = await params.supabase
    .from("discovery_pattern_reports")
    .upsert(
      {
        user_id: params.userId,
        brand_id: params.brandId,
        week_start: weekStartYmd,
        status: "done",
        error_text: null,
        metrics: metrics as unknown as Json,
        insights: llm.insights as unknown as Json,
        model: llm.model,
        input_tokens: llm.usage.inputTokens,
        output_tokens: llm.usage.outputTokens,
        cost_usd: llm.usage.costUsd,
        updated_at: nowIso,
      },
      { onConflict: "user_id,brand_id,week_start" },
    )
    .select("*")
    .single();

  if (saveErr) return { ok: false, error: saveErr.message };
  return { ok: true, skipped: false, report: rowToDto(savedRow) };
}

export async function loadPatternReportHistory(
  supabase: SupabaseClient<Database>,
  userId: string,
  brandId: string,
  limit = 12,
): Promise<{ latest: DiscoveryPatternReportDto | null; history: DiscoveryPatternMetrics[] }> {
  const { data, error } = await supabase
    .from("discovery_pattern_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("brand_id", brandId)
    .order("week_start", { ascending: false })
    .limit(limit);

  if (error || !data?.length) {
    return { latest: null, history: [] };
  }

  const rows = data as Database["public"]["Tables"]["discovery_pattern_reports"]["Row"][];
  const latest = rowToDto(rows[0]!);
  const history = rows.map((r) => (r.metrics ?? {}) as DiscoveryPatternMetrics);
  return { latest, history };
}

export async function isPatternReportRefreshBlocked(
  supabase: SupabaseClient<Database>,
  userId: string,
  brandId: string,
  weekStartYmd: string,
  force: boolean,
  nowMs = Date.now(),
): Promise<{ blocked: boolean; reason?: string }> {
  if (!force) {
    const { data } = await supabase
      .from("discovery_pattern_reports")
      .select("status, created_at")
      .eq("user_id", userId)
      .eq("brand_id", brandId)
      .eq("week_start", weekStartYmd)
      .maybeSingle();

    if (data?.status === "done") {
      return { blocked: true, reason: "Report already exists for this week" };
    }
  }

  const { data: recent } = await supabase
    .from("discovery_pattern_reports")
    .select("created_at, status")
    .eq("user_id", userId)
    .eq("brand_id", brandId)
    .eq("week_start", weekStartYmd)
    .maybeSingle();

  if (recent?.status === "done" && force) {
    const createdMs = Date.parse(recent.created_at);
    if (Number.isFinite(createdMs) && nowMs - createdMs < 60 * 60 * 1000) {
      return { blocked: true, reason: "Report was generated less than 1 hour ago" };
    }
  }

  return { blocked: false };
}
