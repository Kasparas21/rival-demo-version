import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildActivityDropDedupeKey,
  buildActivitySpikeDedupeKey,
  buildAlertBody,
  buildAlertTitle,
  buildCreativePushDedupeKey,
  buildNewAngleDedupeKey,
  buildNewPlatformDedupeKey,
  buildPlatformExitDedupeKey,
  buildProvenWinnerDedupeKey,
  DEFAULT_SEVERITY,
  parseThresholds,
  type AlertCopyParams,
  type AlertType,
} from "@/lib/alerts/alert-types";
import { resolveRuleForType } from "@/lib/alerts/seed-default-rules";
import { getBillingEntitlement } from "@/lib/billing/entitlements";
import { detectMoves } from "@/lib/comparison/move-detector";
import { getLatestScrapeBatchId } from "@/lib/scrape-batches/get-latest-batch-id";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import { normalizeCompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/normalize-strategy-payload";
import type { Database, Json } from "@/lib/supabase/types";

type AlertInsert = Database["public"]["Tables"]["competitor_alerts"]["Insert"];

export async function generateAlertsForCompetitor(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  competitorId: string;
  beforePayload?: CompetitorStrategyOverviewPayload | null;
  afterPayload?: CompetitorStrategyOverviewPayload | null;
  batchId?: string | null;
  activityScoreBefore?: number | null;
  activityScoreAfter?: number | null;
}): Promise<void> {
  const {
    supabase,
    userId,
    competitorId,
    beforePayload,
    afterPayload,
    activityScoreBefore,
    activityScoreAfter,
  } = params;

  let batchId = params.batchId ?? null;
  if (!batchId) {
    batchId = await getLatestScrapeBatchId(supabase, competitorId);
  }

  const [billing, compRes, rulesRes] = await Promise.all([
    getBillingEntitlement(supabase, userId),
    supabase
      .from("saved_competitors")
      .select("name, brand_name")
      .eq("id", competitorId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("alert_rules").select("*").eq("user_id", userId),
  ]);

  const canCustomizeRules = billing.limits.allowAlertRules === true;
  const rules = rulesRes.data ?? [];
  const competitorName =
    compRes.data?.brand_name?.trim() ||
    compRes.data?.name?.trim() ||
    afterPayload?.map?.competitor?.name?.trim() ||
    beforePayload?.map?.competitor?.name?.trim() ||
    "Competitor";

  const rows: AlertInsert[] = [];
  const nowIso = new Date().toISOString();

  function shouldInsert(alertType: AlertType): boolean {
    if (!canCustomizeRules) return true;
    const rule = resolveRuleForType(rules, alertType, competitorId);
    if (!rule) return true;
    return rule.enabled !== false;
  }

  function thresholdsFor(alertType: AlertType) {
    if (!canCustomizeRules) {
      return parseThresholds(null);
    }
    const rule = resolveRuleForType(rules, alertType, competitorId);
    return parseThresholds(rule?.threshold);
  }

  function pushRow(
    alertType: AlertType,
    dedupeKey: string,
    copyParams: Omit<AlertCopyParams, "competitorName">,
    metadata: Record<string, unknown>
  ) {
    if (!shouldInsert(alertType)) return;
    const copy: AlertCopyParams = { competitorName, ...copyParams };
    rows.push({
      user_id: userId,
      competitor_id: competitorId,
      alert_type: alertType,
      severity: DEFAULT_SEVERITY[alertType],
      title: buildAlertTitle(alertType, copy),
      body: buildAlertBody(alertType, copy),
      metadata: metadata as Json,
      detected_at: nowIso,
      source_scrape_batch_id: batchId,
      dedupe_key: dedupeKey,
      is_read: false,
    });
  }

  if (beforePayload && afterPayload) {
    const before = normalizeCompetitorStrategyOverviewPayload(beforePayload);
    const after = normalizeCompetitorStrategyOverviewPayload(afterPayload);
    const moves = detectMoves(before, after);

    for (const move of moves) {
      if (move.event_type === "new_platform" && move.platform) {
        const activeAds =
          (move.after_state as { activeAds?: number }).activeAds ??
          after.insights.platform_footprint.platforms.find((p) => p.platform === move.platform)?.activeAds ??
          0;
        pushRow(
          "new_platform",
          buildNewPlatformDedupeKey(competitorId, move.platform),
          { platform: move.platform, activeAds },
          { platform: move.platform, activeAds, eventType: move.event_type }
        );
      }

      if (move.event_type === "dropped_platform" && move.platform) {
        const priorActiveAds =
          (move.before_state as { activeAds?: number }).activeAds ??
          before.insights.platform_footprint.platforms.find((p) => p.platform === move.platform)?.activeAds ??
          0;
        pushRow(
          "platform_exit",
          buildPlatformExitDedupeKey(competitorId, move.platform),
          { platform: move.platform, priorActiveAds },
          { platform: move.platform, priorActiveAds, eventType: move.event_type }
        );
      }

      if (move.event_type === "new_angle") {
        const angle = (move.after_state as { angle?: string }).angle;
        if (!angle) continue;
        pushRow(
          "new_angle",
          buildNewAngleDedupeKey(competitorId, angle),
          { angle },
          { angle, eventType: move.event_type, ...(move.after_state as object) }
        );
      }
    }
  }

  if (
    typeof activityScoreBefore === "number" &&
    typeof activityScoreAfter === "number" &&
    batchId
  ) {
    const delta = activityScoreAfter - activityScoreBefore;
    const t = thresholdsFor("activity_spike");
    if (delta >= t.activityScoreDelta) {
      pushRow(
        "activity_spike",
        buildActivitySpikeDedupeKey(competitorId, batchId),
        {
          scoreBefore: activityScoreBefore,
          scoreAfter: activityScoreAfter,
          scoreDelta: delta,
        },
        {
          scoreBefore: activityScoreBefore,
          scoreAfter: activityScoreAfter,
          scoreDelta: delta,
          batchId,
        }
      );
    } else if (delta <= -t.activityScoreDelta) {
      pushRow(
        "activity_drop",
        buildActivityDropDedupeKey(competitorId, batchId),
        {
          scoreBefore: activityScoreBefore,
          scoreAfter: activityScoreAfter,
          scoreDelta: delta,
        },
        {
          scoreBefore: activityScoreBefore,
          scoreAfter: activityScoreAfter,
          scoreDelta: delta,
          batchId,
        }
      );
    }
  }

  if (batchId) {
    const creativeThreshold = thresholdsFor("creative_push").creativePushCount;

    let batchCreatedAt: string | null = null;
    const { data: batchRow } = await supabase
      .from("scrape_batches")
      .select("created_at")
      .eq("id", batchId)
      .maybeSingle();
    batchCreatedAt = batchRow?.created_at ?? null;

    let newAdsQuery = supabase
      .from("scraped_ads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("competitor_id", competitorId)
      .eq("scrape_batch_id", batchId);

    if (batchCreatedAt) {
      newAdsQuery = newAdsQuery.gte("first_seen_at", batchCreatedAt);
    }

    const { count: newAdCount, error: countErr } = await newAdsQuery;
    if (!countErr && (newAdCount ?? 0) >= creativeThreshold) {
      pushRow(
        "creative_push",
        buildCreativePushDedupeKey(competitorId, batchId),
        { newAdCount: newAdCount ?? 0 },
        { newAdCount: newAdCount ?? 0, batchId, threshold: creativeThreshold }
      );
    }

    const lifespanDays = thresholdsFor("proven_winner").lifespanDays;
    const cutoff = new Date(Date.now() - lifespanDays * 86400000).toISOString();
    const { data: winnerAds, error: winnerErr } = await supabase
      .from("scraped_ads")
      .select("id, platform, ad_text, first_seen_at")
      .eq("user_id", userId)
      .eq("competitor_id", competitorId)
      .eq("is_active", true)
      .lte("first_seen_at", cutoff)
      .limit(50);

    if (!winnerErr && winnerAds?.length) {
      for (const ad of winnerAds) {
        const firstSeen = Date.parse(ad.first_seen_at);
        const daysLive = Number.isFinite(firstSeen)
          ? Math.floor((Date.now() - firstSeen) / 86400000)
          : lifespanDays;
        pushRow(
          "proven_winner",
          buildProvenWinnerDedupeKey(competitorId, ad.id),
          {
            platform: ad.platform,
            lifespanDays: daysLive,
            adPreview: ad.ad_text,
          },
          {
            scrapedAdId: ad.id,
            platform: ad.platform,
            lifespanDays: daysLive,
            firstSeenAt: ad.first_seen_at,
          }
        );
      }
    }
  }

  if (rows.length === 0) return;

  const { error: insertErr } = await supabase.from("competitor_alerts").upsert(rows, {
    onConflict: "user_id,competitor_id,dedupe_key",
    ignoreDuplicates: true,
  });

  if (insertErr) {
    console.error("[alerts] insert failed", insertErr.message);
  }
}
