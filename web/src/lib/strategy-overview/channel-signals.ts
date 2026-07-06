import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import type {
  ChannelEdgePayload,
  EmailChannelNodePayload,
  OrganicChannelNodePayload,
  OrganicChannelPlatform,
  StrategyChannelSignals,
  StrategyMapPayload,
  StrategyPlatform,
} from "@/lib/strategy-overview/payload-types";

/** Lookback window for both email and organic aggregation. */
const CHANNEL_WINDOW_DAYS = 90;
/** Consistent with funnel-cell-edges: score at/above this renders solid. */
const SOLID_CONFIDENCE = 0.72;
const MIN_ORGANIC_POSTS_FOR_EDGE = 2;

/**
 * Organic surface -> paid platform whose audience it feeds (retargeting pools,
 * lookalikes, platform-native amplification).
 */
export const ORGANIC_TO_PAID_AFFINITY: Record<OrganicChannelPlatform, StrategyPlatform | null> = {
  instagram: "meta",
  facebook: "meta",
  tiktok: "tiktok",
  youtube: "google",
  linkedin: "linkedin",
  twitter: null,
};

const ORGANIC_LABELS: Record<OrganicChannelPlatform, string> = {
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
};

const PROMO_TOKENS = new Set([
  "sale",
  "discount",
  "off",
  "free",
  "trial",
  "offer",
  "promo",
  "promotion",
  "deal",
  "save",
  "savings",
  "code",
  "coupon",
  "bundle",
  "limited",
]);

const THEME_STOPWORDS = new Set([
  "the",
  "and",
  "with",
  "for",
  "from",
  "that",
  "this",
  "are",
  "their",
  "your",
  "our",
  "posts",
  "post",
  "content",
  "brand",
  "high",
  "strong",
  "well",
  "works",
  "working",
  "engagement",
]);

export type EmailChannelAggregate = {
  emailCount: number;
  emailsPerWeek: number;
  dominantType: string | null;
  dominantAngle: string | null;
  offerSharePct: number;
  lastEmailAt: string | null;
  espDetected: string | null;
};

export type OrganicChannelAggregate = {
  platform: OrganicChannelPlatform;
  postCount: number;
  postsPerWeek: number;
  avgEngagement: number;
  lastPostAt: string | null;
};

export type ChannelAggregates = {
  email: EmailChannelAggregate | null;
  organic: OrganicChannelAggregate[];
  /** Up to 3 "what's working" summaries from stored organic insights (platform=all). */
  organicThemes: string[];
};

export const EMPTY_CHANNEL_AGGREGATES: ChannelAggregates = {
  email: null,
  organic: [],
  organicThemes: [],
};

function modeOf(values: (string | null | undefined)[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = (v ?? "").trim();
    if (!key || key === "unknown" || key === "other") continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return best;
}

function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9%]+/)) {
    const t = raw.trim();
    if (t.length < 3 && t !== "%") continue;
    if (THEME_STOPWORDS.has(t)) continue;
    out.add(t);
  }
  return out;
}

/** Overlap of the smaller set that also appears in the larger set (0..1). */
export function tokenOverlapScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let hits = 0;
  for (const t of small) if (large.has(t)) hits += 1;
  return hits / small.size;
}

function withinDays(iso: string | null, days: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= days * 24 * 60 * 60 * 1000;
}

/**
 * Load email + organic aggregates for one competitor. Three cheap indexed
 * queries in parallel; never throws (map rendering must not depend on
 * channel data being available).
 */
export async function loadChannelAggregates(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string
): Promise<ChannelAggregates> {
  try {
    const sinceIso = new Date(Date.now() - CHANNEL_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const [emailsRes, postsRes, insightsRes] = await Promise.all([
      supabase
        .from("competitor_emails")
        .select("received_at, email_type, ai_angle, ai_offers, esp_detected")
        .eq("user_id", userId)
        .eq("competitor_id", competitorId)
        .gte("received_at", sinceIso)
        .order("received_at", { ascending: false })
        .limit(200),
      supabase
        .from("organic_posts")
        .select("platform, likes, comments, shares, posted_at, scraped_at")
        .eq("user_id", userId)
        .eq("competitor_id", competitorId)
        .or(`posted_at.gte.${sinceIso},and(posted_at.is.null,scraped_at.gte.${sinceIso})`)
        .order("posted_at", { ascending: false, nullsFirst: false })
        .limit(400),
      supabase
        .from("organic_insights")
        .select("whats_working")
        .eq("user_id", userId)
        .eq("competitor_id", competitorId)
        .eq("platform", "all")
        .maybeSingle(),
    ]);

    const emailRows = emailsRes.error ? [] : (emailsRes.data ?? []);
    const postRows = postsRes.error ? [] : (postsRes.data ?? []);
    if (postsRes.error) {
      console.warn("[channel-signals] organic_posts query failed", postsRes.error.message);
    }
    if (emailsRes.error) {
      console.warn("[channel-signals] competitor_emails query failed", emailsRes.error.message);
    }

    let email: EmailChannelAggregate | null = null;
    if (emailRows.length > 0) {
      const last30Count = emailRows.filter((r) => withinDays(r.received_at, 30)).length;
      const withOffers = emailRows.filter(
        (r) => Array.isArray(r.ai_offers) && (r.ai_offers as unknown[]).length > 0
      ).length;
      email = {
        emailCount: emailRows.length,
        emailsPerWeek: Math.round((last30Count / (30 / 7)) * 10) / 10,
        dominantType: modeOf(emailRows.map((r) => r.email_type)),
        dominantAngle: modeOf(emailRows.map((r) => r.ai_angle)),
        offerSharePct: Math.round((withOffers / emailRows.length) * 100),
        lastEmailAt: emailRows[0]?.received_at ?? null,
        espDetected: modeOf(emailRows.map((r) => r.esp_detected)),
      };
    }

    const byPlatform = new Map<OrganicChannelPlatform, typeof postRows>();
    for (const row of postRows) {
      const p = row.platform as OrganicChannelPlatform;
      if (!(p in ORGANIC_TO_PAID_AFFINITY)) continue;
      const list = byPlatform.get(p) ?? [];
      list.push(row);
      byPlatform.set(p, list);
    }

    const organic: OrganicChannelAggregate[] = [];
    for (const [platform, rows] of byPlatform) {
      const engagementTotal = rows.reduce(
        (sum, r) => sum + (r.likes ?? 0) + (r.comments ?? 0) + (r.shares ?? 0),
        0
      );
      const timestamps = rows
        .map((r) => {
          const iso = r.posted_at ?? r.scraped_at;
          return iso ? Date.parse(iso) : NaN;
        })
        .filter((t) => Number.isFinite(t));
      const spanDays =
        timestamps.length > 1
          ? Math.max(7, (Date.now() - Math.min(...timestamps)) / (24 * 60 * 60 * 1000))
          : CHANNEL_WINDOW_DAYS;
      organic.push({
        platform,
        postCount: rows.length,
        postsPerWeek: Math.round((rows.length / (spanDays / 7)) * 10) / 10,
        avgEngagement: Math.round(engagementTotal / rows.length),
        lastPostAt: rows[0]?.posted_at ?? rows[0]?.scraped_at ?? null,
      });
    }
    organic.sort((a, b) => b.postCount - a.postCount);

    const organicThemes: string[] = [];
    const ww = insightsRes.error ? null : insightsRes.data?.whats_working;
    if (Array.isArray(ww)) {
      for (const item of ww.slice(0, 3)) {
        const summary =
          item && typeof item === "object" ? (item as { summary?: unknown }).summary : null;
        if (typeof summary === "string" && summary.trim()) {
          organicThemes.push(summary.trim().slice(0, 120));
        }
      }
    }

    return { email, organic, organicThemes };
  } catch (e) {
    console.warn("[channel-signals] aggregate load failed", e);
    return EMPTY_CHANNEL_AGGREGATES;
  }
}

type FunnelCellRef = { id: string; platform: string; funnelStage: "TOF" | "MOF" | "BOF"; adCount: number };

function cellsFromMap(map: StrategyMapPayload): FunnelCellRef[] {
  const cells = Array.isArray(map.funnelCells) ? map.funnelCells : [];
  return cells.map((c) => ({
    id: c.id,
    platform: String(c.platform),
    funnelStage: c.funnelStage,
    adCount: c.adCount,
  }));
}

const STAGE_TOP_FIRST: ("TOF" | "MOF" | "BOF")[] = ["TOF", "MOF", "BOF"];
const STAGE_BOTTOM_FIRST: ("TOF" | "MOF" | "BOF")[] = ["BOF", "MOF", "TOF"];

function findCell(
  cells: FunnelCellRef[],
  platform: string,
  stageOrder: ("TOF" | "MOF" | "BOF")[]
): FunnelCellRef | null {
  for (const stage of stageOrder) {
    const hit = cells.find((c) => c.platform === platform && c.funnelStage === stage);
    if (hit) return hit;
  }
  return null;
}

function adAngleTokens(map: StrategyMapPayload): Set<string> {
  const out = new Set<string>();
  for (const a of map.topAngles ?? []) {
    for (const t of tokenize(a.angle)) out.add(t);
  }
  for (const cat of map.sidebarExtras?.angleCategories ?? []) {
    for (const t of tokenize(cat.label)) out.add(t);
  }
  return out;
}

function formatEngagement(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function clampConfidence(n: number): number {
  return Math.round(Math.min(0.95, Math.max(0.3, n)) * 100) / 100;
}

/** LinkedIn organic skews MOF (consideration); short-form surfaces feed TOF awareness. */
export function organicTargetStage(platform: OrganicChannelPlatform): "TOF" | "MOF" {
  return platform === "linkedin" ? "MOF" : "TOF";
}

/**
 * Pure derivation: turns channel aggregates + the current strategy map into
 * channel nodes and deterministic cross-channel edges. No I/O, no LLM.
 */
export function buildChannelSignals(
  aggregates: ChannelAggregates,
  map: StrategyMapPayload
): StrategyChannelSignals {
  const cells = cellsFromMap(map);
  const angleTokens = adAngleTokens(map);
  const themeTokens = tokenize(aggregates.organicThemes.join(" "));

  const organicNodes: OrganicChannelNodePayload[] = aggregates.organic.map((o) => {
    const paired = ORGANIC_TO_PAID_AFFINITY[o.platform];
    const pairedActive = paired && cells.some((c) => c.platform === paired) ? paired : null;
    return {
      id: `organic:${o.platform}`,
      platform: o.platform,
      label: ORGANIC_LABELS[o.platform],
      postCount: o.postCount,
      postsPerWeek: o.postsPerWeek,
      avgEngagement: o.avgEngagement,
      lastPostAt: o.lastPostAt,
      topThemes: aggregates.organicThemes,
      pairedPaidPlatform: pairedActive,
    };
  });

  const emailNode: EmailChannelNodePayload | null = aggregates.email
    ? {
        id: "email",
        label: "Email Marketing",
        emailCount: aggregates.email.emailCount,
        emailsPerWeek: aggregates.email.emailsPerWeek,
        dominantType: aggregates.email.dominantType,
        dominantAngle: aggregates.email.dominantAngle,
        offerSharePct: aggregates.email.offerSharePct,
        lastEmailAt: aggregates.email.lastEmailAt,
        espDetected: aggregates.email.espDetected,
      }
    : null;

  const channelEdges: ChannelEdgePayload[] = [];

  // Organic -> paid: organic audience feeds the paid retargeting pool on the
  // paired surface. LinkedIn organic targets MOF consideration; others target TOF.
  for (const node of organicNodes) {
    if (node.postCount < MIN_ORGANIC_POSTS_FOR_EDGE || !node.pairedPaidPlatform) continue;
    const targetStage = organicTargetStage(node.platform);
    const target =
      findCell(cells, node.pairedPaidPlatform, targetStage === "MOF" ? ["MOF", "TOF"] : STAGE_TOP_FIRST) ??
      findCell(cells, node.pairedPaidPlatform, STAGE_TOP_FIRST);
    if (!target) continue;

    const themeOverlap = tokenOverlapScore(themeTokens, angleTokens);
    const confidence = clampConfidence(
      0.45 +
        (Math.min(node.postCount, 16) / 16) * 0.2 +
        (withinDays(node.lastPostAt, 14) ? 0.12 : 0) +
        themeOverlap * 0.18
    );

    const overlapNote =
      themeOverlap >= 0.25
        ? " Organic themes overlap with paid creative angles - same story pushed on both sides."
        : "";
    channelEdges.push({
      from: node.id,
      to: target.id,
      kind: "organic_to_paid",
      confidence,
      reasoning: `${node.label} organic (${node.postCount} posts in ${CHANNEL_WINDOW_DAYS} days, ~${formatEngagement(node.avgEngagement)} avg engagement) warms the audience their paid ${target.platform} ads retarget.${overlapNote}`,
      style: confidence >= SOLID_CONFIDENCE ? "solid" : "dashed",
    });
  }

  // Paid BOF -> email: conversion traffic gets captured into the list, which
  // then nurtures and closes. Anchor on the strongest bottom-funnel cell.
  if (emailNode) {
    const bofCells = cells
      .filter((c) => c.funnelStage === "BOF")
      .sort((a, b) => b.adCount - a.adCount);
    let source: FunnelCellRef | null = bofCells[0] ?? null;
    if (!source && cells.length > 0) {
      const dominantPlatform = [...cells]
        .sort((a, b) => b.adCount - a.adCount)[0].platform;
      source = findCell(cells, dominantPlatform, STAGE_BOTTOM_FIRST);
    }

    if (source) {
      const offerSync =
        emailNode.offerSharePct >= 30 &&
        [...PROMO_TOKENS].some((t) => angleTokens.has(t));
      const confidence = clampConfidence(
        0.5 +
          (emailNode.emailsPerWeek >= 3 ? 0.22 : emailNode.emailsPerWeek >= 1 ? 0.12 : 0.04) +
          (emailNode.dominantType &&
          ["promotional", "cart_abandonment", "reengagement"].includes(emailNode.dominantType)
            ? 0.08
            : 0) +
          (offerSync ? 0.1 : 0)
      );

      const cadence =
        emailNode.emailsPerWeek > 0 ? ` (~${emailNode.emailsPerWeek}/week)` : "";
      const typeNote = emailNode.dominantType
        ? `, mostly ${emailNode.dominantType.replace(/_/g, " ")}`
        : "";
      const syncNote = offerSync
        ? " Email offers mirror the promo angles running in paid ads - a coordinated conversion push."
        : "";
      channelEdges.push({
        from: source.id,
        to: "email",
        kind: "paid_to_email",
        confidence,
        reasoning: `Bottom-funnel ${source.platform} traffic feeds the email list: ${emailNode.emailCount} emails captured in ${CHANNEL_WINDOW_DAYS} days${cadence}${typeNote}.${syncNote}`,
        style: confidence >= SOLID_CONFIDENCE ? "solid" : "dashed",
      });
    }
  }

  return {
    version: 1,
    computedAt: new Date().toISOString(),
    organicNodes,
    emailNode,
    channelEdges,
  };
}

/** True when there is anything worth rendering on the channel layer. */
export function hasChannelSignals(signals: StrategyChannelSignals | null | undefined): boolean {
  if (!signals) return false;
  return signals.organicNodes.length > 0 || signals.emailNode != null;
}
