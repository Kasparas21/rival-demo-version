import type { GoogleTransparencyRegionStat } from "@/lib/ad-library/apify-raw-types";

/** Extract validated region/impression breakdown from Google Transparency scraper payload. */
export function parseGoogleRegionStatsFromRecord(o: Record<string, unknown>): GoogleTransparencyRegionStat[] {
  for (const k of ["regionStats", "region_stats", "RegionStats"] as const) {
    const v = o[k];
    if (!Array.isArray(v) || v.length === 0) continue;
    const out: GoogleTransparencyRegionStat[] = [];
    for (const e of v) {
      const row = coerceRegionStatEntry(e);
      if (row) out.push(row);
    }
    if (out.length > 0) return out;
  }
  return [];
}

function coerceRegionStatEntry(e: unknown): GoogleTransparencyRegionStat | null {
  if (!e || typeof e !== "object" || Array.isArray(e)) return null;
  const r = e as Record<string, unknown>;
  const regionRaw =
    typeof r.region === "string"
      ? r.region.trim()
      : typeof r.Region === "string"
        ? r.Region.trim()
        : "";
  if (!regionRaw) return null;

  const out: GoogleTransparencyRegionStat = { region: regionRaw };

  const cid = r.criteriaId ?? r.criteria_id ?? r.CriteriaId;
  if (typeof cid === "number" && Number.isFinite(cid)) out.criteriaId = Math.trunc(cid);
  else if (typeof cid === "string" && /^\d+$/.test(cid.trim())) out.criteriaId = parseInt(cid.trim(), 10);

  const last =
    typeof r.lastShown === "string"
      ? r.lastShown.trim()
      : typeof r.last_shown === "string"
        ? r.last_shown.trim()
        : "";
  if (last) out.lastShown = last;

  const ima = r.impressionsMax ?? r.impressions_max ?? r.ImpressionsMax;
  if (typeof ima === "number" && Number.isFinite(ima)) out.impressionsMax = ima;

  return out;
}

/** UK rows in Transparency disclosures often omit a stable cap — show territory label only on the impressions stack. */
function isUkLikeRegion(regionRaw: string): boolean {
  const t = regionRaw.trim();
  const u = t.toUpperCase();
  if (u === "GB" || u === "UK") return true;
  return /^(United Kingdom|Great Britain)$/i.test(t);
}

function isoRegionToEnglishLabel(regionCode: string): string {
  const c = regionCode.trim().toUpperCase();
  if (c.length === 2) {
    try {
      const dn = new Intl.DisplayNames(["en"], { type: "region" });
      return dn.of(c) ?? regionCode.trim();
    } catch {
      return regionCode.trim();
    }
  }
  return regionCode.trim();
}

const countFmt = typeof Intl !== "undefined" ? new Intl.NumberFormat("en-US") : null;

/** Comma-separated location names derived from Transparency `regionStats` (order preserved). */
export function summarizeGoogleTransparencyRegionLocations(stats: GoogleTransparencyRegionStat[]): string | null {
  if (!stats.length) return null;
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const s of stats) {
    const raw = s.region.trim();
    if (!raw) continue;
    const key = /^[a-z]{2}$/i.test(raw) ? raw.toUpperCase() : raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(/^[a-z]{2}$/i.test(raw) ? isoRegionToEnglishLabel(raw) : raw);
  }
  return parts.length ? parts.join(", ") : null;
}

/** Upper-bound caps summed across territories, excluding UK-style rows without reliable disclosure figures. */
export function sumGoogleTransparencyImpressionsCapsExcludingUk(stats: GoogleTransparencyRegionStat[]): number {
  let sum = 0;
  for (const s of stats) {
    const rawRg = s.region.trim();
    if (!rawRg) continue;
    if (isUkLikeRegion(rawRg)) continue;
    if (typeof s.impressionsMax !== "number" || !Number.isFinite(s.impressionsMax)) continue;
    sum += Math.trunc(s.impressionsMax);
  }
  return sum;
}

/** Collapsed impressions row label (drawer headline before expanding per-country breakdown). */
export function googleTransparencyImpressionsCollapsedHeadline(stats: GoogleTransparencyRegionStat[]): string {
  const territories = stats.filter((s) => s.region.trim()).length;
  const total = sumGoogleTransparencyImpressionsCapsExcludingUk(stats);
  if (total > 0) {
    const f = countFmt?.format(total) ?? String(total);
    return `About ${f}`;
  }
  if (territories > 1) return `Regional breakdown · ${territories} territories`;
  if (territories === 1) return "Regional disclosure";
  return "By territory";
}

export type GoogleTransparencyTerritoryDisclosureRow = {
  territory: string;
  valueLabel: string;
};

/** Per-territory rows for expandable disclosure UI (stable columns so middots line up across rows). */
export function googleTransparencyTerritoryDisclosureRows(
  stats: GoogleTransparencyRegionStat[]
): GoogleTransparencyTerritoryDisclosureRow[] {
  const out: GoogleTransparencyTerritoryDisclosureRow[] = [];
  for (const s of stats) {
    const rawRg = s.region.trim();
    if (!rawRg) continue;
    const loc = /^[a-z]{2}$/i.test(rawRg) ? isoRegionToEnglishLabel(rawRg) : rawRg;
    let valueLabel: string;
    if (isUkLikeRegion(rawRg)) valueLabel = "-";
    else if (typeof s.impressionsMax === "number" && Number.isFinite(s.impressionsMax)) {
      const n = Math.trunc(s.impressionsMax);
      const formatted = countFmt?.format(n) ?? String(n);
      valueLabel = `up to ${formatted}`;
    } else {
      valueLabel = "-";
    }
    out.push({ territory: loc, valueLabel });
  }
  return out;
}

/** One line per territory: UK family = explicit dash when no trustworthy cap; else `up to` + formatted disclosure cap when present. */
export function formatGoogleTransparencyRegionImpressionsPerLine(stats: GoogleTransparencyRegionStat[]): string | null {
  const rows = googleTransparencyTerritoryDisclosureRows(stats);
  if (!rows.length) return null;
  return rows.map((r) => `${r.territory} · ${r.valueLabel}`).join("\n");
}
