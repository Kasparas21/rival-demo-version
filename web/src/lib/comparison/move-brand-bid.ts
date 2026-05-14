/**
 * Shared brand-bid / low-signal angle detection for move pipeline and Activity Feed UI.
 * Kept separate from move-detector.ts so client components don't bundle the LLM client.
 */

const BRAND_BID_KEYWORDS = [
  "brand_name",
  "brand mention",
  "brand_mention",
  "brand_awareness",
  "brand awareness",
  "naked url",
  "directory listing",
  "brand_only",
  "brand only",
  "brand name only",
];

export function isBrandBidAngle(angleName: string, brandName: string): boolean {
  const lower = angleName.toLowerCase();
  if (BRAND_BID_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()))) {
    return true;
  }
  const brandLower = brandName.toLowerCase().replace(/\s+/g, "");
  if (brandLower.length >= 3 && lower.replace(/\s+/g, "").includes(brandLower)) {
    return true;
  }
  return false;
}
