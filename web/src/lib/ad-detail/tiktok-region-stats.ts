import { formatImpressionsDetailLabel } from "@/lib/ad-detail/detail-field-format";

export type TikTokLocationImpressionRow = {
  territory: string;
  valueLabel: string;
};

function expandTikTokRegionCode(code: string): string {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z]{2,3}$/.test(c)) return code.trim();
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    const name = dn.of(c);
    if (name && name !== c) return `${name} (${c})`;
  } catch {
    /* ignore */
  }
  return c;
}

/** Parse Lexis `targetingByLocation[]` into per-country impression bands. */
export function parseTikTokLocationImpressionsFromRecord(
  raw: Record<string, unknown>
): TikTokLocationImpressionRow[] {
  const loc = raw.targetingByLocation;
  if (!Array.isArray(loc) || loc.length === 0) return [];

  const out: TikTokLocationImpressionRow[] = [];
  for (const item of loc) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const region = typeof o.region === "string" ? o.region.trim() : "";
    const imp = typeof o.impressions === "string" ? o.impressions.trim() : "";
    if (!region) continue;
    const territory = expandTikTokRegionCode(region);
    out.push({
      territory,
      valueLabel: imp ? formatImpressionsDetailLabel(imp) : "—",
    });
  }
  return out;
}

/** Collapsed impressions headline before expanding per-country breakdown. */
export function tiktokImpressionsCollapsedHeadline(
  totalImpressions: string | null | undefined,
  locationRows: TikTokLocationImpressionRow[]
): string {
  const total = typeof totalImpressions === "string" ? totalImpressions.trim() : "";
  if (total) return formatImpressionsDetailLabel(total);
  if (locationRows.length > 1) return `Regional breakdown · ${locationRows.length} countries`;
  if (locationRows.length === 1) return locationRows[0]!.valueLabel;
  return "By country";
}
