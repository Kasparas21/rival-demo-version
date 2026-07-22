import type { SupabaseClient } from "@supabase/supabase-js";

import { scoreWithHaikuBatch } from "@/lib/activity-score/haiku-scorer";
import { tierFromScore } from "@/lib/activity-score/tier-mapping";
import { computeActivityDuration } from "@/lib/activity-score/signals/activity-duration";
import { computeCopySophistication } from "@/lib/activity-score/signals/copy-sophistication";
import { computeCreativeDiversity } from "@/lib/activity-score/signals/creative-diversity";
import { computeFormatSophistication } from "@/lib/activity-score/signals/format-sophistication";
import { computeLandingInfra } from "@/lib/activity-score/signals/landing-infra";
import { computeProductDepthHeuristic, productCountScore } from "@/lib/activity-score/signals/product-depth";
import { computeProductionValueHeuristic } from "@/lib/activity-score/signals/production-value";
import { computeRefreshVelocity } from "@/lib/activity-score/signals/refresh-velocity";
import type {
  ActivityScoreConfidence,
  ActivityScoreResult,
  ActivitySignalName,
  ActivityTopReason,
  ScrapedAdForActivityScore,
} from "@/lib/activity-score/types";
import { SIGNAL_WEIGHTS as W } from "@/lib/activity-score/types";
import type { Database, Json } from "@/lib/supabase/types";
import { generateAlertsForCompetitor } from "@/lib/alerts/generate-alerts-for-competitor";
import { getLatestScrapeBatchId } from "@/lib/scrape-batches/get-latest-batch-id";

type Row = {
  format: string;
  ad_text: string;
  first_seen_at: string;
  platform: string;
  raw_payload: Json;
  ad_creative_url: string | null;
};

function average(a: number, b: number): number {
  return Math.round((a + b) / 2);
}

function buildTopReasons(
  signals: Record<ActivitySignalName, { score: number; weight: number; contribution: number }>,
  ctx: Record<string, unknown>
): ActivityTopReason[] {
  const entries = Object.entries(signals) as [ActivitySignalName, { contribution: number; score: number }][];
  const sorted = [...entries].sort((x, y) => y[1].contribution - x[1].contribution);

  const out: ActivityTopReason[] = [];
  for (const [name, v] of sorted.slice(0, 2)) {
    if (v.contribution >= W[name] * 0.35) {
      out.push({ type: "positive", signal: name, text: reasonForSignal(name, v.score, ctx, "positive") });
    }
  }
  const lowest = [...entries].sort((x, y) => x[1].contribution - y[1].contribution)[0];
  if (lowest && lowest[1].contribution <= W[lowest[0]] * 0.22) {
    out.push({
      type: "negative",
      signal: lowest[0],
      text: reasonForSignal(lowest[0], lowest[1].score, ctx, "negative"),
    });
  }
  return out.slice(0, 3);
}

function reasonForSignal(
  name: ActivitySignalName,
  score: number,
  ctx: Record<string, unknown>,
  kind: "positive" | "negative"
): string {
  const hi = kind === "positive";
  switch (name) {
    case "production_value": {
      const vr = ctx.videoRatio as number | undefined;
      if (vr != null && hi) return `High production mix (${Math.round(vr * 100)}% video-weighted creatives).`;
      if (!hi) return "Mostly static or light-weight creative formats.";
      return hi ? "Strong production-weighted signal." : "Limited production signal.";
    }
    case "creative_diversity": {
      const u = ctx.uniqueConcepts as number | undefined;
      if (u != null && hi) return `${u} distinct creative clusters — broad testing, not variant spam.`;
      if (!hi) return "Few unique concepts vs ad count — possible variant-heavy SMB pattern.";
      return hi ? "Healthy creative diversity." : "Low creative diversity.";
    }
    case "refresh_velocity": {
      const w = ctx.newPerWeek as number | undefined;
      if (w != null && hi) return `Roughly ${w.toFixed(1)} new creatives/week in the measured window.`;
      if (!hi) return "Slow refresh vs enterprise advertisers.";
      return hi ? "Solid launch cadence." : "Low launch cadence.";
    }
    case "format_sophistication": {
      const f = ctx.formatsUsed as number | undefined;
      if (f != null) return hi ? `${f} different formats in use.` : `Only ${f ?? "few"} format(s) — focused mix.`;
      return hi ? "Broad format mix." : "Narrow format mix.";
    }
    case "landing_infra": {
      const p = ctx.uniquePages as number | undefined;
      if (p != null && hi) return `${p} distinct landing destinations detected.`;
      if (!hi) return "Limited distinct landing URLs in scraped payloads.";
      return hi ? "Meaningful landing-page breadth." : "Shallow landing infrastructure signal.";
    }
    case "copy_sophistication": {
      return hi ? "Copy structure/length skews more sophisticated than templates." : "Copy skews short or templated.";
    }
    case "product_depth": {
      return hi ? "Many distinct offers/products called out across copy." : "Narrow product/story footprint in copy.";
    }
    case "activity_duration": {
      return hi ? "Long visible runway of activity in your tracking window." : "Short tracking window — duration signal capped.";
    }
    default:
      return `${name}: score ${score}`;
  }
}

function resolveConfidence(params: {
  adsCount: number;
  haikuImproved: boolean;
}): ActivityScoreConfidence {
  if (params.adsCount < 3) return "insufficient";
  if (params.adsCount < 10) return "low";
  if (params.adsCount < 25 && !params.haikuImproved) return "medium";
  return "high";
}

export async function computeActivityScore(params: {
  userId: string;
  competitorId: string;
  supabaseAdmin: SupabaseClient<Database>;
  skipPersist?: boolean;
}): Promise<ActivityScoreResult> {
  const { userId, competitorId, supabaseAdmin, skipPersist } = params;
  const now = new Date();

  const { data: priorScoreRow } = await supabaseAdmin
    .from("competitor_activity_scores")
    .select("score")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .maybeSingle();

  const activityScoreBefore = priorScoreRow?.score ?? null;

  const pageSize = 1000;
  const ads: ScrapedAdForActivityScore[] = [];
  let fetchErr: { message: string } | null = null;
  for (let from = 0; ; from += pageSize) {
    const { data: rows, error } = await supabaseAdmin
      .from("scraped_ads")
      .select("format, ad_text, first_seen_at, platform, raw_payload, ad_creative_url")
      .eq("user_id", userId)
      .eq("competitor_id", competitorId)
      .range(from, from + pageSize - 1);

    if (error) {
      fetchErr = error;
      console.error("[activity-score] scraped_ads fetch failed", error);
      ads.length = 0;
      break;
    }

    const batch = rows ?? [];
    for (const r of batch as Row[]) {
      ads.push({
        format: r.format,
        ad_text: r.ad_text ?? "",
        first_seen_at: r.first_seen_at,
        platform: r.platform,
        raw_payload: r.raw_payload,
        ad_creative_url: r.ad_creative_url,
      });
    }

    if (batch.length < pageSize) break;
  }

  const adsCount = ads.length;

  if (adsCount < 3) {
    const insufficient: ActivityScoreResult = {
      score: 0,
      tier: 1,
      tierLabel: "Hobbyist",
      spendRange: { min: 0, max: 500 },
      signals: {
        production_value: { score: 0, weight: W.production_value, contribution: 0 },
        creative_diversity: { score: 0, weight: W.creative_diversity, contribution: 0 },
        refresh_velocity: { score: 0, weight: W.refresh_velocity, contribution: 0 },
        format_sophistication: { score: 0, weight: W.format_sophistication, contribution: 0 },
        landing_infra: { score: 0, weight: W.landing_infra, contribution: 0 },
        copy_sophistication: { score: 0, weight: W.copy_sophistication, contribution: 0 },
        product_depth: { score: 0, weight: W.product_depth, contribution: 0 },
        activity_duration: { score: 0, weight: W.activity_duration, contribution: 0 },
      },
      topReasons: [
        {
          type: "negative",
          signal: "creative_diversity",
          text: "Not enough ads scraped yet to compute a meaningful score (minimum 3).",
        },
      ],
      confidence: "insufficient",
      adsCount,
      rawMetrics: { fetch_error: fetchErr?.message ?? null, adsCount },
    };
    if (!skipPersist) {
      const tier = tierFromScore(0);
      await supabaseAdmin.from("competitor_activity_scores").upsert(
        {
          user_id: userId,
          competitor_id: competitorId,
          score: 0,
          tier: tier.tier,
          tier_label: tier.label,
          spend_range_min: tier.spendMin,
          spend_range_max: tier.spendMax,
          signal_production_value: 0,
          signal_creative_diversity: 0,
          signal_refresh_velocity: 0,
          signal_format_sophistication: 0,
          signal_landing_infra: 0,
          signal_copy_sophistication: 0,
          signal_product_depth: 0,
          signal_activity_duration: 0,
          reasons_top: insufficient.topReasons as unknown as Json,
          raw_metrics: insufficient.rawMetrics as unknown as Json,
          ads_count_at_calc: adsCount,
          confidence: "insufficient",
        },
        { onConflict: "user_id,competitor_id" }
      );
    }
    return insufficient;
  }

  let haikuFailed = false;
  let haikuImproved = false;

  const prodH = computeProductionValueHeuristic(ads);
  const div = computeCreativeDiversity(ads);
  const refresh = computeRefreshVelocity(ads, now);
  const fmt = computeFormatSophistication(ads);
  const land = computeLandingInfra(ads);
  const copyH = computeCopySophistication(ads);
  const prodDepthH = computeProductDepthHeuristic(ads);
  const duration = computeActivityDuration(ads, now);

  let s1 = prodH.score;
  let s6 = copyH.score;
  let s7 = prodDepthH.score;

  if (adsCount > 5) {
    const distinctCopies = [...new Set(ads.map((a) => a.ad_text.replace(/\s+/g, " ").trim()).filter(Boolean))];
    const samplePool = [...ads];
    samplePool.sort(() => Math.random() - 0.5);
    const samples = samplePool.slice(0, 8).map((a) => {
      const f = a.format.trim().toLowerCase();
      const vid =
        f.includes("video") ||
        f.includes("reel") ||
        /\.(mp4|webm|mov)(\?|$)/i.test(a.ad_creative_url ?? "") ||
        (typeof a.raw_payload === "object" &&
          a.raw_payload !== null &&
          "videoUrl" in (a.raw_payload as object) &&
          typeof (a.raw_payload as { videoUrl?: string }).videoUrl === "string");
      return {
        format: a.format,
        copy: a.ad_text.replace(/\s+/g, " ").trim().slice(0, 200),
        hasVideo: Boolean(vid),
      };
    });

    const copyList =
      distinctCopies.length > 20
        ? [...distinctCopies].sort(() => Math.random() - 0.5).slice(0, 20)
        : distinctCopies;

    const hk = await scoreWithHaikuBatch({ sampleAds: samples, adCopiesForProducts: copyList });
    if (hk.ok) {
      haikuImproved = true;
      s1 = average(s1, hk.data.production_quality);
      s6 = average(s6, hk.data.copy_sophistication);
      const fromCount = productCountScore(hk.data.distinct_product_count);
      s7 = average(s7, fromCount);
    } else {
      haikuFailed = true;
      console.error("[activity-score] Haiku batch failed; using heuristics only:", hk.error);
      s7 = Math.max(0, s7 - 20);
    }
  } else {
    s7 = Math.max(0, s7 - 20);
  }

  const s2 = div.score;
  const s3 = refresh.score;
  const s4 = fmt.score;
  const s5 = land.score;
  const s8 = duration.score;

  const signalValues: Record<ActivitySignalName, number> = {
    production_value: s1,
    creative_diversity: s2,
    refresh_velocity: s3,
    format_sophistication: s4,
    landing_infra: s5,
    copy_sophistication: s6,
    product_depth: s7,
    activity_duration: s8,
  };

  let weighted = 0;
  const signals = {} as ActivityScoreResult["signals"];
  (Object.keys(W) as ActivitySignalName[]).forEach((k) => {
    const score = signalValues[k];
    const weight = W[k];
    const contribution = score * weight;
    weighted += contribution;
    signals[k] = { score, weight, contribution };
  });

  const scoreInt = Math.max(0, Math.min(100, Math.round(weighted)));
  const tier = tierFromScore(scoreInt);
  const confidence = resolveConfidence({ adsCount, haikuImproved });

  const rawMetrics: Record<string, unknown> = {
    adsCount,
    videoRatio: prodH.videoRatio,
    uniqueConcepts: div.uniqueConcepts,
    diversityRatio: div.diversityRatio,
    newAdsInWindow: refresh.newAdsInWindow,
    newPerWeek: refresh.newPerWeek,
    trackingDays: refresh.trackingDays,
    refreshProrateNote: refresh.proratedNote,
    formatsUsed: fmt.formatsUsed,
    uniquePages: land.uniquePages,
    avgCopyLength: copyH.avgCopyLength,
    identicalTextRatio: copyH.identicalTextRatio,
    productDepthDistinctPrefixes: prodDepthH.distinctPrefixes,
    monthsActive: duration.monthsActive,
    activityDurationCapped: duration.cappedByTracking,
    haikuFailed,
    haikuUsed: adsCount > 5,
  };

  let topReasons = buildTopReasons(signals, rawMetrics);
  if (topReasons.length === 0) {
    topReasons = [
      {
        type: "positive",
        signal: "production_value",
        text: `Blended footprint score ${scoreInt}/100 from eight signals measured on scraped ads.`,
      },
    ];
  }

  const result: ActivityScoreResult = {
    score: scoreInt,
    tier: tier.tier,
    tierLabel: tier.label,
    spendRange: { min: tier.spendMin, max: tier.spendMax },
    signals,
    topReasons,
    confidence,
    adsCount,
    rawMetrics,
  };

  if (!skipPersist) {
    const { error: upErr } = await supabaseAdmin.from("competitor_activity_scores").upsert(
      {
        user_id: userId,
        competitor_id: competitorId,
        score: scoreInt,
        tier: tier.tier,
        tier_label: tier.label,
        spend_range_min: tier.spendMin,
        spend_range_max: tier.spendMax,
        signal_production_value: s1,
        signal_creative_diversity: s2,
        signal_refresh_velocity: s3,
        signal_format_sophistication: s4,
        signal_landing_infra: s5,
        signal_copy_sophistication: s6,
        signal_product_depth: s7,
        signal_activity_duration: s8,
        reasons_top: topReasons as unknown as Json,
        raw_metrics: rawMetrics as unknown as Json,
        ads_count_at_calc: adsCount,
        confidence,
      },
      { onConflict: "user_id,competitor_id" }
    );
    if (upErr) {
      console.error("[activity-score] persist failed", upErr);
    } else {
      void (async () => {
        try {
          const batchId = await getLatestScrapeBatchId(supabaseAdmin, competitorId);
          await generateAlertsForCompetitor({
            supabase: supabaseAdmin,
            userId,
            competitorId,
            batchId,
            activityScoreBefore,
            activityScoreAfter: scoreInt,
          });
        } catch (e) {
          console.error("[activity-score] generateAlertsForCompetitor", e);
        }
      })();
    }
  }

  return result;
}
