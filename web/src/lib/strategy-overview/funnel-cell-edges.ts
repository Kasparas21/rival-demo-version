import type {
  FunnelCellNodePayload,
  FunnelEdgePayload,
  FunnelStage,
} from "@/lib/strategy-overview/payload-types";

const STAGE_ORDER: FunnelStage[] = ["TOF", "MOF", "BOF"];

const PLATFORM_LABEL: Record<string, string> = {
  meta: "Meta",
  google: "Google",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
};

/** Ads per landing page in one funnel cell (or platform). Keys are landing-page group keys. */
export type LandingPagesByCell = Map<string, Map<string, number>>;

/** A homepage is where most ads land, so sharing one says nothing about a funnel. */
export function isSpecificLandingPage(key: string): boolean {
  try {
    const path = new URL(key).pathname;
    return path !== "" && path !== "/";
  } catch {
    return false;
  }
}

export function displayLandingPage(key: string): string {
  return key.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}

const STAGE_WORD: Record<FunnelStage, string> = { TOF: "awareness", MOF: "consideration", BOF: "conversion" };

/** Ads needed on both ends for a solid (rather than dashed) arrow. */
const SOLID_MIN_ADS_EACH_SIDE = 3;

/**
 * Shared specific landing pages between two cells, the evidence an arrow needs. Returns null when they
 * share none.
 */
export function sharedLandingPageEvidence(
  from: Map<string, number> | undefined,
  to: Map<string, number> | undefined,
): NonNullable<FunnelEdgePayload["evidence"]> | null {
  if (!from || !to) return null;
  const shared: { key: string; fromAds: number; toAds: number }[] = [];
  for (const [key, fromAds] of from) {
    const toAds = to.get(key);
    if (toAds && isSpecificLandingPage(key)) shared.push({ key, fromAds, toAds });
  }
  if (shared.length === 0) return null;
  shared.sort((a, b) => Math.min(b.fromAds, b.toAds) - Math.min(a.fromAds, a.toAds) || a.key.localeCompare(b.key));
  return {
    sharedLandingPages: shared.map((x) => displayLandingPage(x.key)),
    fromAds: shared.reduce((s, x) => s + x.fromAds, 0),
    toAds: shared.reduce((s, x) => s + x.toAds, 0),
  };
}

/** One evidence-backed arrow; wording is a hypothesis, since ad libraries can't show who saw which ad. */
export function evidenceEdge(params: {
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  fromStage: FunnelStage;
  toStage: FunnelStage;
  evidence: NonNullable<FunnelEdgePayload["evidence"]>;
}): Omit<FunnelEdgePayload, "fromStage" | "toStage"> {
  const { evidence: ev } = params;
  const [page, ...more] = ev.sharedLandingPages;
  const plural = (n: number) => (n === 1 ? "ad" : "ads");
  const weakest = Math.min(ev.fromAds, ev.toAds);
  const pages = more.length > 0 ? `${page} (and ${more.length} more shared page${more.length === 1 ? "" : "s"})` : page;
  return {
    from: params.from,
    to: params.to,
    confidence: Math.min(0.9, 0.4 + 0.1 * weakest),
    style: weakest >= SOLID_MIN_ADS_EACH_SIDE ? "solid" : "dashed",
    evidence: ev,
    reasoning:
      `${ev.fromAds} ${params.fromLabel} ${params.fromStage} ${plural(ev.fromAds)} and ${ev.toAds} ${params.toLabel} ${params.toStage} ${plural(ev.toAds)} send people to ${pages}. ` +
      `Possibly one campaign moving people from ${STAGE_WORD[params.fromStage]} to ${STAGE_WORD[params.toStage]}; ad libraries don't show who saw which ad.`,
  };
}

/** Arrow between two cells backed by `evidence` (also used for the demo maps' fixed arrows). */
export function evidenceEdgeBetween(
  from: Pick<FunnelCellNodePayload, "id" | "platform" | "funnelStage">,
  to: Pick<FunnelCellNodePayload, "id" | "platform" | "funnelStage">,
  evidence: NonNullable<FunnelEdgePayload["evidence"]>,
): FunnelEdgePayload {
  return {
    ...evidenceEdge({
      from: from.id,
      to: to.id,
      fromLabel: PLATFORM_LABEL[from.platform] ?? from.platform,
      toLabel: PLATFORM_LABEL[to.platform] ?? to.platform,
      fromStage: from.funnelStage,
      toStage: to.funnelStage,
      evidence,
    }),
    fromStage: from.funnelStage,
    toStage: to.funnelStage,
  };
}

/**
 * Connect funnel cells only where an earlier-stage cell and a later-stage cell send people to the same
 * specific landing page. Arrows used to follow stage order and ad volume alone ("Google TOF (1 ad) feeds
 * Meta MOF"): on real accounts none of the 72 cross-platform arrows had a shared page or shared copy.
 */
export function deriveFunnelCellEdges(params: {
  cells: FunnelCellNodePayload[];
  landingPagesByCell: LandingPagesByCell;
  allowCrossPlatform?: boolean;
}): { edges: FunnelEdgePayload[]; detected: number; suppressed: number } {
  const { cells, landingPagesByCell } = params;
  const allowCrossPlatform = params.allowCrossPlatform !== false;
  const stageIndex = (s: FunnelStage) => STAGE_ORDER.indexOf(s);
  const edges: FunnelEdgePayload[] = [];
  let detected = 0;

  for (const from of cells) {
    for (const to of cells) {
      if (stageIndex(to.funnelStage) <= stageIndex(from.funnelStage)) continue;
      const evidence = sharedLandingPageEvidence(landingPagesByCell.get(from.id), landingPagesByCell.get(to.id));
      if (!evidence) continue;
      detected += 1;
      if (from.platform !== to.platform && !allowCrossPlatform) continue;
      edges.push(evidenceEdgeBetween(from, to, evidence));
    }
  }

  return { edges, detected, suppressed: detected - edges.length };
}

