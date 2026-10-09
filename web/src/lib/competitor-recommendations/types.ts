/** What the recommender learned about the user's own business from its website. */
export type BrandProfile = {
  domain: string;
  brandName: string;
  /** One line: what they sell ("Washable knit flats and sneakers for women"). */
  offering: string;
  /** Category words used for searching ("women's flats", "dental implants"). */
  category: string;
  customer: string;
  priceTier: "budget" | "mid" | "premium" | "luxury" | "unknown";
  /** local = customers come from one area (clinic, salon, restaurant); the rest compete online. */
  businessType: "local" | "ecommerce" | "saas" | "service" | "other";
  /** ISO-2 country the business mainly sells in. */
  country: string | null;
  /** Local businesses: the city or area to search around. */
  city: string | null;
  /** Language of the website (ISO 639-1), used for search queries. */
  language: string;
  /** Web searches likely to surface direct competitors, in the site's language. */
  searchQueries: string[];
  /** Local businesses: what to search on Google Maps ("dental clinic"). */
  localSearchTerm: string | null;
};

export type CandidateSource = "web" | "maps" | "knowledge";

export type Candidate = {
  domain: string;
  name: string;
  sources: CandidateSource[];
  /** Search snippet or Maps category that suggested it. */
  hint: string | null;
  /** Maps only. */
  reviewsCount?: number | null;
  rating?: number | null;
  address?: string | null;
};

export type VerifiedCandidate = Candidate & {
  isDirect: boolean;
  /** 0–100: how closely they compete for the same customers. */
  relevance: number;
  evidence: string[];
  /** One line on what they seem to do better, from their own site; null if nothing stands out. */
  edge: string | null;
  rejectReason: string | null;
};

export type SizeSignals = {
  /** Tranco top-1M rank (lower is bigger); null when not ranked. */
  trancoRank: number | null;
  /** Active Meta ads seen linking to the domain (capped by the sample size). */
  metaAds: number | null;
  /** Maps reviews, the size signal for local businesses. */
  reviewsCount: number | null;
};

export type RecommendationGroup = "best_to_copy" | "peer" | "smaller_sharp" | "smaller" | "leader";

export type Recommendation = VerifiedCandidate & {
  size: SizeSignals;
  /** Their size relative to the user's (>1 = bigger); null when either side is unknown. */
  sizeRatio: number | null;
  group: RecommendationGroup;
  score: number;
};

export type RecommendationRun = {
  profile: BrandProfile;
  ownSize: SizeSignals;
  recommendations: Recommendation[];
  /** Candidates looked at and dropped, with the reason (kept for checking quality). */
  rejected: { domain: string; name: string; reason: string }[];
  costUsd: number;
  durationMs: number;
  /** How long each stage took, for tuning. */
  stageMs: Record<string, number>;
};
