export type InsightType =
  | "funnel"
  | "platform_role"
  | "creative"
  | "offer"
  | "messaging"
  | "seasonality"
  | "gap";

export type StrategyCard = {
  id: string;
  type: InsightType;
  title: string;
  body: string;
  platforms: string[];
};

export type NormalizedAdForStrategy = {
  platform: string;
  headline: string;
  body: string;
  cta: string;
  format: string;
  firstSeen?: string;
};

export type StrategyOverviewRequestBody = {
  competitorName: string;
  competitorDomain: string;
  ads: NormalizedAdForStrategy[];
  adsHash: string;
  force?: boolean;
};

export type StrategyOverviewSuccess = {
  ok: true;
  cards: StrategyCard[];
  /** True when response came from Supabase cache (no Anthropic call). */
  cached?: boolean;
};

export type StrategyOverviewFailure = {
  ok: false;
  error: string;
};

export type StrategyOverviewResponse = StrategyOverviewSuccess | StrategyOverviewFailure;

const INSIGHT_TYPES: readonly InsightType[] = [
  "funnel",
  "platform_role",
  "creative",
  "offer",
  "messaging",
  "seasonality",
  "gap",
];

export function isInsightType(v: string): v is InsightType {
  return (INSIGHT_TYPES as readonly string[]).includes(v);
}

export function parseStrategyCardsFromUnknown(data: unknown): StrategyCard[] | null {
  if (!Array.isArray(data)) return null;
  if (data.length < 5 || data.length > 8) return null;
  const cards: StrategyCard[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") return null;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const typeRaw = typeof o.type === "string" ? o.type.trim() : "";
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const body = typeof o.body === "string" ? o.body.trim() : "";
    const platformsRaw = o.platforms;
    if (!id || !isInsightType(typeRaw) || !title || !body) return null;
    if (!Array.isArray(platformsRaw)) return null;
    const platforms = platformsRaw.filter((p): p is string => typeof p === "string" && p.trim().length > 0);
    cards.push({ id, type: typeRaw, title, body, platforms });
  }
  return cards;
}
