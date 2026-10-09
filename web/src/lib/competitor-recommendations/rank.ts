import type {
  BrandProfile,
  Recommendation,
  RecommendationGroup,
  SizeSignals,
  VerifiedCandidate,
} from "@/lib/competitor-recommendations/types";

/** Below this the model wasn't convinced they fight for the same customers. */
export const MIN_RELEVANCE = 60;

/** Roughly where the Tranco list ends: a site with no rank is at least this small. */
const UNRANKED = 3_000_000;

/**
 * How much bigger they are than the user (>1 = bigger). Local businesses compare Maps reviews; online
 * businesses compare Tranco ranks, or active Meta ads when either site isn't ranked. Null when unknown.
 */
export function sizeRatio(profile: BrandProfile, own: SizeSignals, theirs: SizeSignals): number | null {
  if (profile.businessType === "local") {
    if (own.reviewsCount == null || theirs.reviewsCount == null) return null;
    return (theirs.reviewsCount + 5) / (own.reviewsCount + 5);
  }
  if (own.trancoRank != null && theirs.trancoRank != null) return own.trancoRank / theirs.trancoRank;
  if (own.trancoRank == null && theirs.trancoRank != null) return 3; // they're ranked, the user isn't
  // The user is ranked and they aren't; near the list's tail that says little, so fall through to ads.
  if (own.trancoRank != null && own.trancoRank < UNRANKED / 3) return own.trancoRank / UNRANKED;
  if (own.metaAds != null && theirs.metaAds != null) return (theirs.metaAds + 2) / (own.metaAds + 2);
  return null;
}

export function groupFor(ratio: number | null, metaAds: number | null): RecommendationGroup {
  if (ratio == null) return "peer";
  if (ratio >= 10) return "leader";
  if (ratio >= 1.2) return "best_to_copy";
  if (ratio >= 0.5) return "peer";
  return (metaAds ?? 0) >= 5 ? "smaller_sharp" : "smaller";
}

/** Size fit dominates: a step ahead first, then about the same size; much smaller brands come last. */
const GROUP_BONUS: Record<RecommendationGroup, number> = {
  best_to_copy: 32,
  peer: 28,
  leader: 14,
  smaller_sharp: 12,
  smaller: 0,
};
/** When neither side's size is known: between a peer and a smaller brand. */
const UNKNOWN_SIZE_BONUS = 15;
const MAX_AD_BONUS = 10;

/**
 * Score and order direct competitors: how close they are, whether they're a step ahead, and whether they
 * advertise (that's what there is to copy). Pure.
 */
export function rankCandidates(
  profile: BrandProfile,
  own: SizeSignals,
  verified: VerifiedCandidate[],
  sizes: Map<string, SizeSignals>,
  limit = 10,
): Recommendation[] {
  return verified
    .filter((c) => c.isDirect && c.relevance >= MIN_RELEVANCE)
    .map((c) => {
      const size = sizes.get(c.domain) ?? { trancoRank: null, metaAds: null, reviewsCount: c.reviewsCount ?? null };
      const ratio = sizeRatio(profile, own, size);
      const group = groupFor(ratio, size.metaAds);
      const adBonus = size.metaAds == null ? 0 : (Math.min(size.metaAds, 10) / 10) * MAX_AD_BONUS;
      const sizeBonus = ratio == null ? UNKNOWN_SIZE_BONUS : GROUP_BONUS[group];
      const score = Math.round(c.relevance * 0.5 + sizeBonus + adBonus);
      return { ...c, size, sizeRatio: ratio == null ? null : Math.round(ratio * 100) / 100, group, score };
    })
    .sort((a, b) => b.score - a.score || b.relevance - a.relevance)
    .slice(0, limit);
}
