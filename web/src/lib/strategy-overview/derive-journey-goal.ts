import type { SupabaseClient } from "@supabase/supabase-js";

import { buildJourneyGoalEvidence } from "@/lib/strategy-overview/build-journey-goal-evidence";
import {
  extractGoogleHostnameLandingKey,
  extractLandingPageUrl,
} from "@/lib/landing-pages/extract-lp-url";
import { displayUrlShort } from "@/lib/landing-pages/normalize-url";
import type { Database, Json } from "@/lib/supabase/types";
import type {
  EmailChannelNodePayload,
  FunnelCellNodePayload,
  JourneyPathAlignment,
  JourneyPathIntent,
  JourneyPathIntentSummary,
  StrategyChannelSignals,
  StrategyJourneyGoal,
  StrategyMapPayload,
} from "@/lib/strategy-overview/payload-types";

const SOLID_CONFIDENCE = 0.72;

type GoalKind = StrategyJourneyGoal["kind"];

type AdRow = {
  id: string;
  platform: string;
  ad_text: string;
  ai_extracted_angle: string | null;
  funnel_stage: string | null;
  ad_creative_url: string | null;
  raw_payload: Json;
};

type EmailRow = {
  email_type: string | null;
  subject: string | null;
  ai_angle: string | null;
  ai_cta: string | null;
  ai_summary: string | null;
  ai_offers: Json | null;
};

export type JourneyGoalInputs = {
  bofAds: AdRow[];
  allActiveAds: AdRow[];
  emails: EmailRow[];
  brandDomain: string | null;
};

const PURCHASE_TOKENS = new Set([
  "buy",
  "shop",
  "cart",
  "checkout",
  "order",
  "sale",
  "discount",
  "off",
  "product",
  "collection",
  "store",
  "shipping",
  "bundle",
  "deal",
]);

const SIGNUP_TOKENS = new Set([
  "signup",
  "sign",
  "trial",
  "register",
  "started",
  "join",
  "account",
  "free",
  "plan",
  "pricing",
]);

const LEAD_TOKENS = new Set([
  "demo",
  "book",
  "schedule",
  "consultation",
  "quote",
  "contact",
  "call",
  "speak",
  "meeting",
  "request",
]);

const INSTALL_TOKENS = new Set(["download", "install", "app", "ios", "android", "play"]);

const SUBSCRIBE_TOKENS = new Set(["newsletter", "subscribe", "mailing", "updates"]);

const PURCHASE_PATH = /\/(product|products|shop|store|checkout|cart|collections?|p\/|item)/i;
const SIGNUP_PATH = /\/(signup|sign-up|register|trial|pricing|plans?|get-started)/i;
const LEAD_PATH = /\/(demo|contact|book|schedule|consult|quote|request)/i;
const INSTALL_PATH = /\/(app|download|install)|apps\.(apple|google)/i;

function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9%]+/)) {
    const t = raw.trim();
    if (t.length >= 3) out.add(t);
  }
  return out;
}

function scoreKindFromTokens(tokens: Set<string>): Record<GoalKind, number> {
  const scores: Record<GoalKind, number> = {
    purchase: 0,
    signup: 0,
    lead_gen: 0,
    install: 0,
    subscribe: 0,
    brand_awareness: 0,
  };
  for (const t of tokens) {
    if (PURCHASE_TOKENS.has(t)) scores.purchase += 1;
    if (SIGNUP_TOKENS.has(t)) scores.signup += 1;
    if (LEAD_TOKENS.has(t)) scores.lead_gen += 1;
    if (INSTALL_TOKENS.has(t)) scores.install += 1;
    if (SUBSCRIBE_TOKENS.has(t)) scores.subscribe += 1;
  }
  return scores;
}

function scoreKindFromPath(url: string): Record<GoalKind, number> {
  const scores: Record<GoalKind, number> = {
    purchase: 0,
    signup: 0,
    lead_gen: 0,
    install: 0,
    subscribe: 0,
    brand_awareness: 0,
  };
  if (PURCHASE_PATH.test(url)) scores.purchase += 3;
  if (SIGNUP_PATH.test(url)) scores.signup += 3;
  if (LEAD_PATH.test(url)) scores.lead_gen += 3;
  if (INSTALL_PATH.test(url)) scores.install += 3;
  return scores;
}

function mergeScores(...parts: Record<GoalKind, number>[]): Record<GoalKind, number> {
  const out: Record<GoalKind, number> = {
    purchase: 0,
    signup: 0,
    lead_gen: 0,
    install: 0,
    subscribe: 0,
    brand_awareness: 0,
  };
  for (const p of parts) {
    for (const k of Object.keys(out) as GoalKind[]) {
      out[k] += p[k] ?? 0;
    }
  }
  return out;
}

function pickKind(scores: Record<GoalKind, number>): GoalKind {
  let best: GoalKind = "brand_awareness";
  let bestN = 0;
  for (const [k, n] of Object.entries(scores) as [GoalKind, number][]) {
    if (k === "brand_awareness") continue;
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return bestN >= 2 ? best : "brand_awareness";
}

const GOAL_LABELS: Record<GoalKind, string> = {
  purchase: "Purchase on site",
  signup: "Sign up / start trial",
  lead_gen: "Book demo or lead",
  install: "App install",
  subscribe: "Email subscribe",
  brand_awareness: "Brand site visit",
};

const GOAL_SUBTITLES: Record<GoalKind, string> = {
  purchase: "Bottom-funnel ads and emails push shoppers toward checkout.",
  signup: "Conversion ads drive account creation or free trial starts.",
  lead_gen: "Ads capture interest and route prospects to a sales touchpoint.",
  install: "Campaigns drive users to download or open the mobile app.",
  subscribe: "Primary conversion is list growth and content nurture.",
  brand_awareness: "Traffic lands on the main site without a sharp conversion CTA.",
};

const PATH_INTENT_LABELS: Record<JourneyPathIntent, string> = {
  direct_sale: "Direct sale",
  discount_sale: "Discount sale",
  retargeting: "Retargeting",
  nurture: "Nurture",
  awareness: "Awareness",
  lead_capture: "Lead capture",
};

const RETARGETING_TOKENS = new Set([
  "retarget",
  "remarket",
  "abandon",
  "abandoned",
  "cart",
  "return",
  "returning",
  "reminder",
  "previously",
  "viewed",
  "left",
  "unfinished",
]);

const DISCOUNT_INTENT_TOKENS = new Set([
  "discount",
  "promo",
  "promotion",
  "coupon",
  "limited",
  "flash",
  "clearance",
  "bundle",
]);

const AWARENESS_INTENT_TOKENS = new Set([
  "discover",
  "introducing",
  "meet",
  "awareness",
  "story",
  "learn",
  "explore",
  "brand",
]);

const NURTURE_INTENT_TOKENS = new Set(["newsletter", "subscribe", "updates", "tips", "guide", "content"]);

function adsForFunnelCell(cell: FunnelCellNodePayload, pool: AdRow[]): AdRow[] {
  const [platform, stage] = cell.id.split(":");
  if (!platform || !stage) return [];
  const pl = platform.toLowerCase();
  return pool.filter(
    (a) => a.platform.toLowerCase() === pl && (a.funnel_stage ?? "").toUpperCase() === stage.toUpperCase(),
  );
}

function inferPathIntentFromAds(ads: AdRow[], fallbackStage: string): JourneyPathIntent {
  const scores: Record<JourneyPathIntent, number> = {
    direct_sale: 0,
    discount_sale: 0,
    retargeting: 0,
    nurture: 0,
    awareness: 0,
    lead_capture: 0,
  };

  for (const ad of ads) {
    const tokens = tokenize(adTextBlob(ad));
    for (const t of tokens) {
      if (RETARGETING_TOKENS.has(t)) scores.retargeting += 3;
      if (DISCOUNT_INTENT_TOKENS.has(t) || t === "off" || t.includes("%")) scores.discount_sale += 2;
      if (AWARENESS_INTENT_TOKENS.has(t)) scores.awareness += 2;
      if (NURTURE_INTENT_TOKENS.has(t)) scores.nurture += 2;
      if (LEAD_TOKENS.has(t)) scores.lead_capture += 2;
      if (PURCHASE_TOKENS.has(t) && !DISCOUNT_INTENT_TOKENS.has(t) && t !== "off") scores.direct_sale += 1;
    }
  }

  let best: JourneyPathIntent = fallbackStage === "TOF" ? "awareness" : "direct_sale";
  let bestN = 0;
  for (const [k, n] of Object.entries(scores) as [JourneyPathIntent, number][]) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return bestN >= 2 ? best : fallbackStage === "TOF" ? "awareness" : "direct_sale";
}

function inferEmailPathIntent(emailNode: EmailChannelNodePayload): JourneyPathIntent {
  const type = (emailNode.dominantType ?? "").toLowerCase();
  if (type === "cart_abandonment" || type === "reengagement") return "retargeting";
  if (type === "promotional" && (emailNode.offerSharePct ?? 0) >= 20) return "discount_sale";
  if (type === "newsletter" || type === "welcome") return "nurture";
  return "nurture";
}

function pathAlignment(intent: JourneyPathIntent, macroKind: GoalKind): JourneyPathAlignment {
  if (macroKind === "brand_awareness") return intent === "awareness" ? "direct" : "supporting";
  if (macroKind === "subscribe") return intent === "nurture" ? "direct" : "supporting";
  if (macroKind === "lead_gen") return intent === "lead_capture" ? "direct" : "supporting";
  if (intent === "awareness" || intent === "nurture") return "supporting";
  return "direct";
}

function buildPathIntentBreakdown(edges: StrategyJourneyGoal["goalEdges"]): JourneyPathIntentSummary[] {
  const counts = new Map<JourneyPathIntent, number>();
  for (const e of edges) {
    counts.set(e.pathIntent, (counts.get(e.pathIntent) ?? 0) + 1);
  }
  const total = Math.max(1, edges.length);
  return [...counts.entries()]
    .map(([intent, pathCount]) => ({
      intent,
      label: PATH_INTENT_LABELS[intent],
      pathCount,
      sharePct: Math.round((pathCount / total) * 100),
    }))
    .sort((a, b) => b.pathCount - a.pathCount);
}

function macroFramingText(kind: GoalKind, breakdown: JourneyPathIntentSummary[]): string {
  if (breakdown.length <= 1) {
    return `One conversion path rolls up to ${GOAL_LABELS[kind].toLowerCase()}.`;
  }
  const roles = breakdown.map((b) => b.label.toLowerCase()).join(", ");
  return `Different channel roles (${roles}) roll up to one outcome: ${GOAL_LABELS[kind].toLowerCase()}.`;
}

function journeySummaryText(
  kind: GoalKind,
  breakdown: JourneyPathIntentSummary[],
  channelSignals?: StrategyChannelSignals | null,
): string {
  const emailNode = channelSignals?.emailNode ?? null;
  const hasOrganic = (channelSignals?.organicNodes.length ?? 0) > 0;
  const rolePart =
    breakdown.length > 1
      ? breakdown.map((b) => b.label).join(" + ")
      : breakdown[0]?.label ?? GOAL_LABELS[kind];
  const parts: string[] = [];
  if (hasOrganic) parts.push("Organic");
  parts.push(rolePart);
  if (emailNode) parts.push("Email");
  parts.push(GOAL_LABELS[kind]);
  return parts.join(" → ");
}

function extractLpFromAd(ad: AdRow): string | null {
  const lp = extractLandingPageUrl(ad.platform, ad.raw_payload);
  if (lp) return lp;
  return extractGoogleHostnameLandingKey(ad.platform, ad.raw_payload);
}

function adTextBlob(ad: AdRow): string {
  const raw = ad.raw_payload;
  let extra = "";
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const p = raw as Record<string, unknown>;
    extra = [p.headline, p.cta_text, p.cta, p.link_title].filter((x) => typeof x === "string").join(" ");
  }
  return `${ad.ad_text ?? ""} ${ad.ai_extracted_angle ?? ""} ${extra}`;
}

function catalogFromDestinations(count: number, topShare: number): StrategyJourneyGoal["catalogBreadth"] {
  if (count <= 0) return "unknown";
  if (count === 1 || topShare >= 0.72) return "single";
  if (count <= 5) return "focused";
  return "catalog";
}

function catalogLabel(breadth: StrategyJourneyGoal["catalogBreadth"], count: number): string {
  switch (breadth) {
    case "single":
      return count <= 1 ? "Single destination" : "One dominant landing page";
    case "focused":
      return `${count} key landing pages`;
    case "catalog":
      return `${count}+ product or category pages`;
    default:
      return "Destination unclear from ad data";
  }
}

function clampConfidence(n: number): number {
  return Math.round(Math.min(0.95, Math.max(0.35, n)) * 100) / 100;
}

/**
 * Load BOF-weighted ad rows + emails for journey goal inference.
 */
export async function loadJourneyGoalInputs(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
  brandDomain: string | null,
): Promise<JourneyGoalInputs> {
  try {
    const [adsRes, emailsRes, metaRes] = await Promise.all([
      supabase
        .from("scraped_ads")
        .select(
          "id, platform, ad_text, ai_extracted_angle, funnel_stage, ad_creative_url, raw_payload",
        )
        .eq("user_id", userId)
        .eq("competitor_id", competitorId)
        .eq("is_active", true)
        .limit(1500),
      supabase
        .from("competitor_emails")
        .select("email_type, subject, ai_angle, ai_cta, ai_summary, ai_offers")
        .eq("user_id", userId)
        .eq("competitor_id", competitorId)
        .order("received_at", { ascending: false })
        .limit(80),
      supabase
        .from("saved_competitors")
        .select("brand_domain")
        .eq("id", competitorId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const ads = (adsRes.error ? [] : adsRes.data ?? []) as AdRow[];
    const bofAds = ads.filter((a) => a.funnel_stage === "BOF");
    const domain =
      brandDomain?.trim() ||
      (metaRes.data?.brand_domain?.trim() ?? null);

    return {
      bofAds,
      allActiveAds: ads,
      emails: emailsRes.error ? [] : (emailsRes.data ?? []),
      brandDomain: domain,
    };
  } catch (e) {
    console.warn("[journey-goal] load failed", e);
    return { bofAds: [], allActiveAds: [], emails: [], brandDomain: brandDomain ?? null };
  }
}

/**
 * Pure derivation: infers the terminal conversion goal and convergence edges.
 */
export function buildJourneyGoal(
  map: StrategyMapPayload,
  inputs: JourneyGoalInputs,
  channelSignals?: StrategyChannelSignals | null,
): StrategyJourneyGoal | null {
  const cells = Array.isArray(map.funnelCells) ? map.funnelCells : [];
  const bofCells = cells.filter((c) => c.funnelStage === "BOF");
  if (bofCells.length === 0 && inputs.bofAds.length === 0) return null;

  const adsForGoal = inputs.bofAds.length > 0 ? inputs.bofAds : inputs.allActiveAds.filter((a) => a.funnel_stage === "BOF");
  const fallbackAds = adsForGoal.length > 0 ? adsForGoal : inputs.allActiveAds.slice(0, 200);

  let scores: Record<GoalKind, number> = {
    purchase: 0,
    signup: 0,
    lead_gen: 0,
    install: 0,
    subscribe: 0,
    brand_awareness: 0,
  };

  const lpCounts = new Map<string, number>();
  for (const ad of fallbackAds) {
    const blob = adTextBlob(ad);
    scores = mergeScores(scores, scoreKindFromTokens(tokenize(blob)));
    const lp = extractLpFromAd(ad);
    if (lp) {
      lpCounts.set(lp, (lpCounts.get(lp) ?? 0) + 1);
      scores = mergeScores(scores, scoreKindFromPath(lp));
    }
  }

  for (const e of inputs.emails) {
    const type = (e.email_type ?? "").toLowerCase();
    if (type === "cart_abandonment" || type === "promotional" || type === "reengagement") {
      scores.purchase += 2;
    }
    if (type === "welcome" || type === "newsletter") {
      scores.subscribe += 2;
    }
    const blob = `${e.ai_angle ?? ""} ${e.ai_cta ?? ""}`;
    scores = mergeScores(scores, scoreKindFromTokens(tokenize(blob)));
  }

  const emailNode = channelSignals?.emailNode ?? null;
  if (emailNode?.dominantType === "cart_abandonment") scores.purchase += 3;
  if (emailNode?.dominantType === "promotional" && (emailNode.offerSharePct ?? 0) >= 30) {
    scores.purchase += 2;
  }

  for (const cat of map.sidebarExtras?.angleCategories ?? []) {
    const label = cat.label.toLowerCase();
    if (/price|discount|sale|offer|promo/.test(label)) scores.purchase += 1;
    if (/demo|consult|book|trial/.test(label)) scores.lead_gen += 1;
  }

  const kind = pickKind(scores);
  const totalLpAds = [...lpCounts.values()].reduce((a, b) => a + b, 0);
  const sortedLps = [...lpCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topShare = sortedLps[0] && totalLpAds > 0 ? sortedLps[0][1] / totalLpAds : 0;
  const destCount = sortedLps.length;

  const catalogBreadth = catalogFromDestinations(destCount, topShare);
  const catalogLabelText = catalogLabel(catalogBreadth, destCount);

  const topDestinations = sortedLps.slice(0, 5).map(([url, adCount]) => ({
    url,
    displayUrl: displayUrlShort(url, 52),
    adCount,
    sharePct: totalLpAds > 0 ? Math.round((adCount / totalLpAds) * 100) : 0,
  }));

  if (topDestinations.length === 0 && inputs.brandDomain) {
    topDestinations.push({
      url: `https://${inputs.brandDomain.replace(/^https?:\/\//i, "")}`,
      displayUrl: inputs.brandDomain.replace(/^https?:\/\//i, "").replace(/^www\./i, ""),
      adCount: fallbackAds.length,
      sharePct: 100,
    });
  }

  const signals: string[] = [];
  if (bofCells.length > 0) {
    const bofAdTotal = bofCells.reduce((s, c) => s + c.adCount, 0);
    signals.push(`${bofAdTotal} BOF ads across ${bofCells.length} paid path${bofCells.length === 1 ? "" : "s"}`);
  }
  if (destCount > 0) {
    signals.push(
      destCount === 1
        ? "Most conversion traffic lands on one primary URL"
        : `${destCount} distinct landing URLs in conversion traffic`,
    );
  }
  if (emailNode && emailNode.emailCount > 0) {
    signals.push(`Email (${emailNode.emailCount} captured) plays a nurture / recovery role`);
  }
  if (kind === "purchase" && (emailNode?.offerSharePct ?? 0) >= 25) {
    signals.push("Promo-heavy email cadence supports discount-sale paths");
  }

  const confidence = clampConfidence(
    0.42 +
      (fallbackAds.length >= 5 ? 0.12 : 0.04) +
      (totalLpAds >= 3 ? 0.15 : 0) +
      (kind !== "brand_awareness" ? 0.12 : 0) +
      (emailNode ? 0.08 : 0),
  );

  const goalEdges: StrategyJourneyGoal["goalEdges"] = [];
  const adPool = fallbackAds;

  for (const cell of bofCells) {
    const cellAds = adsForFunnelCell(cell, adPool);
    const pathIntent = inferPathIntentFromAds(cellAds, cell.funnelStage);
    const pathIntentLabel = PATH_INTENT_LABELS[pathIntent];
    const alignment = pathAlignment(pathIntent, kind);
    const share = bofCells.reduce((s, c) => s + c.adCount, 0);
    const weight = share > 0 ? cell.adCount / share : 0;
    const edgeConf = clampConfidence(
      0.45 + weight * 0.3 + (alignment === "direct" ? 0.14 : 0.04) + (kind !== "brand_awareness" ? 0.08 : 0),
    );
    goalEdges.push({
      from: cell.id,
      to: "goal",
      kind: "bof_to_goal",
      pathIntent,
      pathIntentLabel,
      alignment,
      confidence: edgeConf,
      reasoning: `${cell.label} ${cell.funnelStage} · ${pathIntentLabel} path (${cell.adCount} ads) → ${GOAL_LABELS[kind].toLowerCase()}.`,
      style: alignment === "direct" && edgeConf >= SOLID_CONFIDENCE ? "solid" : "dashed",
    });
  }

  if (emailNode) {
    const pathIntent = inferEmailPathIntent(emailNode);
    const pathIntentLabel = PATH_INTENT_LABELS[pathIntent];
    const alignment = pathAlignment(pathIntent, kind);
    const edgeConf = clampConfidence(
      0.48 + (emailNode.emailsPerWeek >= 1 ? 0.12 : 0.04) + (alignment === "direct" ? 0.12 : 0.06),
    );
    goalEdges.push({
      from: "email",
      to: "goal",
      kind: "email_to_goal",
      pathIntent,
      pathIntentLabel,
      alignment,
      confidence: edgeConf,
      reasoning: `Email · ${pathIntentLabel} (${emailNode.emailCount} messages) → ${GOAL_LABELS[kind].toLowerCase()}.`,
      style: alignment === "direct" && edgeConf >= SOLID_CONFIDENCE ? "solid" : "dashed",
    });
  }

  const pathIntentBreakdown = buildPathIntentBreakdown(goalEdges);
  if (pathIntentBreakdown.length > 1) {
    signals.push(
      `Path mix: ${pathIntentBreakdown.map((b) => `${b.pathCount} ${b.label.toLowerCase()}`).join(", ")}`,
    );
  }

  const evidence = buildJourneyGoalEvidence({
    goalKind: kind,
    bofAds: fallbackAds,
    emails: inputs.emails,
    topDestinations,
    pathIntentBreakdown,
    angleCategories: map.sidebarExtras?.angleCategories,
    topAngles: map.topAngles,
    brandDomain: inputs.brandDomain,
  });

  return {
    version: 1,
    computedAt: new Date().toISOString(),
    kind,
    label: GOAL_LABELS[kind],
    subtitle: GOAL_SUBTITLES[kind],
    catalogBreadth: catalogBreadth,
    catalogLabel: catalogLabelText,
    topDestinations,
    goalEdges,
    pathIntentBreakdown,
    evidence,
    journeySummary: journeySummaryText(kind, pathIntentBreakdown, channelSignals),
    macroFraming: macroFramingText(kind, pathIntentBreakdown),
    signals,
    confidence,
  };
}

export function hasJourneyGoal(goal: StrategyJourneyGoal | null | undefined): boolean {
  return goal != null && goal.goalEdges.length > 0;
}
