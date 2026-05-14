import type { AnglesByPlatformInsight } from "@/lib/strategy-overview/payload-types";

const BLOCKED_SUBSTRINGS = [
  "brand_name_only",
  "brand_mention_only",
  "brand_awareness",
  "brand awareness",
  "brand name only",
  "naked url",
  "naked_url",
  "/ naked",
  "directory listing",
];

/**
 * Drops angles that are usually “bid on own brand” / nav listings, not creative hooks to steal.
 * Client-side only — same payload, safer product narrative.
 */
export function filterBrandAwarenessStealableRows(
  rows: AnglesByPlatformInsight[],
  competitorBrandLabel: string,
  competitorDomain?: string | null
): AnglesByPlatformInsight[] {
  const label = competitorBrandLabel.trim().toLowerCase();
  const dom = (competitorDomain ?? "").trim().toLowerCase().replace(/^www\./, "");
  const host = dom.split("/")[0] ?? "";

  return rows.filter((row) => {
    const raw = (row.angle ?? "").trim();
    if (!raw) return false;
    const a = raw.toLowerCase();

    for (const p of BLOCKED_SUBSTRINGS) {
      if (a.includes(p)) return false;
    }

    const hookMatch = raw.match(/hook:\s*([^·\n]+)/i);
    const hook = (hookMatch?.[1] ?? "").trim().toLowerCase();
    if (label.length >= 4 && hook && hook.includes(label)) return false;
    if (host.length >= 4 && hook && hook.includes(host.replace(/^www\./, ""))) return false;

    const firstSeg = raw.split("·")[0]?.trim().toLowerCase() ?? "";
    if (
      label.length >= 4 &&
      firstSeg.length <= 48 &&
      firstSeg.includes(label) &&
      (firstSeg.includes(".lt") || firstSeg.includes(".com"))
    ) {
      return false;
    }

    return true;
  });
}

export type AngleCardCategory =
  | "price"
  | "discount"
  | "fear"
  | "urgency"
  | "social_proof"
  | "speed"
  | "curiosity"
  | "brand"
  | "other";

const CATEGORY_STYLES: Record<AngleCardCategory, { label: string; className: string }> = {
  price: { label: "PRICE", className: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80" },
  discount: { label: "DISCOUNT", className: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80" },
  fear: { label: "FEAR", className: "bg-red-50 text-red-800 ring-1 ring-red-200/80" },
  urgency: { label: "URGENCY", className: "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80" },
  social_proof: { label: "SOCIAL PROOF", className: "bg-blue-50 text-blue-800 ring-1 ring-blue-200/80" },
  speed: { label: "SPEED", className: "bg-purple-50 text-purple-800 ring-1 ring-purple-200/80" },
  curiosity: { label: "CURIOSITY", className: "bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200/80" },
  brand: { label: "BRAND", className: "bg-slate-50 text-slate-800 ring-1 ring-slate-200/80" },
  other: { label: "ANGLE", className: "bg-slate-50 text-slate-800 ring-1 ring-slate-200/80" },
};

export function classifyAngleCategory(angleRaw: string): AngleCardCategory {
  const s = angleRaw.toLowerCase();
  if (/\b(brand|branded|direct navigation|official|\.com\/)\b/i.test(s)) return "brand";
  if (/\b(€|\$|eur|price|kaina|nuo\s+\d|fixed price|implant|from\s+\d)/i.test(s)) {
    if (/\b(discount|sale|% off|nuolaida|-\d)/i.test(s)) return "discount";
    return "price";
  }
  if (/\b(fear|risk|avoid|don't|niekada|pavoj)/i.test(s)) return "fear";
  if (/\b(urgent|limited|today only|last chance|skubiai|liko)/i.test(s)) return "urgency";
  if (/\b(recommended|reviews|trusted|\d+\s*(stars|klient|patenk))/i.test(s)) return "social_proof";
  if (/\b(same day|24h|instant|fast|greit|šiandien)/i.test(s)) return "speed";
  if (/\b(why|how|discover|secret|ar\s+\w+)/i.test(s)) return "curiosity";
  return "other";
}

export function angleCategoryPill(angleRaw: string): { label: string; className: string } {
  const cat = classifyAngleCategory(angleRaw);
  return CATEGORY_STYLES[cat];
}

/** Pull a short hook line and description from noisy enrichment labels. */
export function parseAngleForDisplay(angleRaw: string): { hook: string; blurb: string; rawHead: string } {
  const parts = angleRaw
    .split(/·+|(?:\n+)/)
    .map((p) => p.trim())
    .filter(Boolean);

  let hook = "";
  const hookPart = parts.find((p) => /^hook:/i.test(p));
  if (hookPart) {
    hook = hookPart.replace(/^hook:\s*/i, "").trim();
  }

  const bodyPart = parts.find((p) => /^body(?:\s+theme)?:/i.test(p));
  const body = bodyPart?.replace(/^body(?:\s+theme)?:\s*/i, "").trim() ?? "";

  const rawHead = parts[0] ?? angleRaw;

  if (!hook) {
    hook = parts.length > 1 ? parts[1].slice(0, 140) : rawHead.slice(0, 100);
  }

  const blurb = body || parts.filter((p) => p !== hookPart && p !== parts[0]).join(" · ").slice(0, 220);

  return {
    hook: hook.slice(0, 180),
    blurb: blurb || "Creative pattern they scale that you are not running yet.",
    rawHead: rawHead.slice(0, 80),
  };
}

export function lifespanDotClass(avgDays: number | null | undefined): string {
  if (avgDays == null || !Number.isFinite(avgDays)) return "bg-slate-400";
  if (avgDays > 60) return "bg-emerald-500";
  if (avgDays >= 30) return "bg-amber-500";
  return "bg-slate-400";
}
