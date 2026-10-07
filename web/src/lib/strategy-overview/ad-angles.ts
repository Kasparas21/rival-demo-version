/**
 * Ad-angle categories assigned by enrichment. `scraped_ads.ai_extracted_angle` stores
 * `"<slug> · Hook: … · Body: …"`: anything that groups, counts or compares angles must use
 * {@link angleSlugOf}, never the whole string — the hook and body make nearly every label unique.
 */
export const AD_ANGLE_SLUGS = [
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
  "education",
  "brand",
  "other",
] as const;

export type AdAngleSlug = (typeof AD_ANGLE_SLUGS)[number];

export const AD_ANGLE_LABELS: Record<AdAngleSlug, string> = {
  discount: "Discount",
  social_proof: "Social proof",
  urgency: "Urgency",
  quality: "Quality",
  price: "Price",
  speed: "Speed",
  transformation: "Transformation",
  fear: "Fear",
  curiosity: "Curiosity",
  identity: "Identity",
  education: "Education",
  brand: "Brand awareness",
  other: "Other",
};

const SLUG_SET: ReadonlySet<string> = new Set(AD_ANGLE_SLUGS);

/** Recurring free-text labels from before the model was held to the list. */
const SYNONYMS: ReadonlyArray<[RegExp, AdAngleSlug]> = [
  [/^(brand(_(awareness|story|building))?|awareness|institutional)$/, "brand"],
  [/^(education(al)?|education_.*|how_to.*|q&a.*|tutorial|informative|švietimas)$/, "education"],
];

/** A model answer or legacy label → category; unknown non-empty labels are "other", empty is null. */
export function normalizeAngleSlug(raw: string | null | undefined): AdAngleSlug | null {
  const s = (raw ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!s || s === "unclassified") return null;
  if (SLUG_SET.has(s)) return s as AdAngleSlug;
  for (const [pattern, slug] of SYNONYMS) {
    if (pattern.test(s)) return slug;
  }
  return "other";
}

/** Category of a stored `ai_extracted_angle` (its first ` · ` segment), or null when unlabelled. */
export function angleSlugOf(aiExtractedAngle: string | null | undefined): AdAngleSlug | null {
  const head = (aiExtractedAngle ?? "").split(" · ")[0];
  return normalizeAngleSlug(head);
}

/** A category given by its slug or display name ("social_proof" / "Social proof"); null for anything else. */
export function angleSlugFromName(name: string | null | undefined): AdAngleSlug | null {
  const n = (name ?? "").trim().toLowerCase();
  if (!n) return null;
  for (const slug of AD_ANGLE_SLUGS) {
    if (slug === n || AD_ANGLE_LABELS[slug].toLowerCase() === n) return slug;
  }
  return null;
}

/** Display name of a stored `ai_extracted_angle`, or null when unlabelled. */
export function angleLabelOf(aiExtractedAngle: string | null | undefined): string | null {
  const slug = angleSlugOf(aiExtractedAngle);
  return slug ? AD_ANGLE_LABELS[slug] : null;
}
