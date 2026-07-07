import type { LandingPageText } from "./constants";

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function dedupeSentences(value: string): string {
  const parts = value
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(part);
  }
  return unique.join(" ");
}

export function normalizePageText(text: LandingPageText): LandingPageText {
  const headline = text.headline ? collapseWhitespace(text.headline) : undefined;
  const subheadlineRaw = text.subheadline ? dedupeSentences(collapseWhitespace(text.subheadline)) : undefined;
  const cta_text = text.cta_text ? collapseWhitespace(text.cta_text) : undefined;
  const pricing_tiers = text.pricing_tiers?.map((tier) => collapseWhitespace(tier)).filter(Boolean);
  const full_text = text.full_text ? collapseWhitespace(text.full_text).slice(0, 1000) : undefined;

  return {
    headline,
    subheadline: subheadlineRaw,
    cta_text,
    pricing_tiers: pricing_tiers?.length ? pricing_tiers : undefined,
    full_text,
  };
}
