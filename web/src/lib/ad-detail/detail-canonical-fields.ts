import { normalizeAdDetailPlatformKey } from "@/lib/ad-detail/ad-detail-platform";
import type { GoogleFamilyAdDetailFields } from "@/lib/ad-detail/google-family-ad-detail-fields";
import { metaTargetingRegionDisplayLine } from "@/lib/ad-detail/meta-ad-detail-fields";
import {
  formatImpressionsDetailLabel,
  mergeReachAndImpressionsLine,
  formatRunStartLabelFromUtcMs,
  parseLooseDateStringToUtcMs,
} from "@/lib/ad-detail/detail-field-format";
import { pinterestRunStartFromPayload } from "@/lib/ad-detail/linkedin-pinterest-snapchat-detail-rows";
import type { PinterestTargetingRow } from "@/lib/ad-library/normalize";

export type CanonicalDetailSlices = {
  runStartUtcMs: number | null;
  impressionsFormatted: string | null;
  regionDisplay: string | null;
};

function isPinterestTargetingRow(x: unknown): x is PinterestTargetingRow {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.label === "string" && typeof o.value === "string";
}

function linkedInRegionLine(p: Record<string, unknown>): string | null {
  const breakdown = p.linkedinCountryBreakdown;
  if (!Array.isArray(breakdown) || breakdown.length === 0) return null;
  const parts: string[] = [];
  for (const x of breakdown) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const c = typeof o.country === "string" ? o.country.trim() : "";
    const pct = typeof o.percentage === "string" ? o.percentage.trim() : "";
    if (c && pct) parts.push(`${c}: ${pct}`);
    else if (c) parts.push(c);
  }
  return parts.length ? parts.join(" · ") : null;
}

function pinterestCountriesValue(tr: unknown): string | null {
  if (!Array.isArray(tr)) return null;
  for (const x of tr) {
    if (!isPinterestTargetingRow(x)) continue;
    const label = x.label.trim().toLowerCase().replace(/\s+/g, "");
    if (label === "countries" || label === "country") {
      const v = x.value.trim();
      return v || null;
    }
  }
  return null;
}

export function buildCanonicalDetailSlices(
  platform: string,
  rawPayload: unknown,
  googleDetail: GoogleFamilyAdDetailFields | null
): CanonicalDetailSlices {
  const pl = normalizeAdDetailPlatformKey(platform.trim());
  let runStartUtcMs: number | null = null;
  let impressionsFormatted: string | null = null;
  let regionDisplay: string | null = null;

  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return { runStartUtcMs: null, impressionsFormatted: null, regionDisplay: null };
  }
  const p = rawPayload as Record<string, unknown>;

  if (pl === "meta") {
    const s = p.startedAt;
    if (typeof s === "number" && Number.isFinite(s)) {
      const ms = s > 1e12 ? s : s * 1000;
      runStartUtcMs = utcCalendarMsFromEpoch(ms);
    }
    const ir = typeof p.impressionsRange === "string" ? p.impressionsRange.trim() : "";
    if (ir) impressionsFormatted = formatImpressionsDetailLabel(ir);
    const rf = metaTargetingRegionDisplayLine(rawPayload);
    if (rf) regionDisplay = rf;
  }

  if (pl === "google" || pl === "youtube") {
    if (googleDetail?.firstShownIso) {
      const d = new Date(googleDetail.firstShownIso);
      if (!Number.isNaN(d.getTime())) {
        runStartUtcMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      }
    } else {
      const fs = typeof p.firstShown === "string" && p.firstShown.trim() ? p.firstShown.trim() : null;
      runStartUtcMs = fs ? parseLooseDateStringToUtcMs(fs) : null;
    }
    if (googleDetail?.region?.trim()) regionDisplay = googleDetail.region.trim();
  }

  if (pl === "linkedin") {
    const pub = typeof p.publicationStart === "string" ? p.publicationStart.trim() : "";
    if (pub) runStartUtcMs = parseLooseDateStringToUtcMs(pub);
    const imp = typeof p.linkedinTotalImpressions === "string" ? p.linkedinTotalImpressions.trim() : "";
    if (imp) impressionsFormatted = formatImpressionsDetailLabel(imp);
    regionDisplay = linkedInRegionLine(p);
  }

  if (pl === "pinterest") {
    const ps = pinterestRunStartFromPayload(rawPayload);
    if (ps) runStartUtcMs = parseLooseDateStringToUtcMs(ps);
    const reach = typeof p.reachSummary === "string" ? p.reachSummary.trim() : "";
    const il = typeof p.impressionsLabel === "string" ? p.impressionsLabel.trim() : "";
    impressionsFormatted = mergeReachAndImpressionsLine(reach, il);
    const tr = p.targetingRows;
    regionDisplay = pinterestCountriesValue(tr);
  }

  if (pl === "snapchat") {
    const sd = typeof p.startDateLabel === "string" ? p.startDateLabel.trim() : "";
    if (sd && !/^n\/?a$/i.test(sd)) runStartUtcMs = parseLooseDateStringToUtcMs(sd);
    const imp = typeof p.impressionsLabel === "string" ? p.impressionsLabel.trim() : "";
    if (imp) impressionsFormatted = formatImpressionsDetailLabel(imp);
    const cc = typeof p.euCountry === "string" ? p.euCountry.trim() : "";
    if (cc) regionDisplay = cc;
  }

  if (pl === "tiktok") {
    const fs = typeof p.flightStartMs === "number" && Number.isFinite(p.flightStartMs) ? p.flightStartMs : null;
    if (fs != null) {
      runStartUtcMs = utcCalendarMsFromEpoch(fs);
    } else {
      const firstShown = typeof p.firstShown === "string" ? p.firstShown.trim() : "";
      if (firstShown) runStartUtcMs = parseLooseDateStringToUtcMs(firstShown);
    }
    const audience = typeof p.adAudienceLine === "string" ? p.adAudienceLine.trim() : "";
    const reachBand = typeof p.uniqueUsersSeen === "string" ? p.uniqueUsersSeen.trim() : "";
    impressionsFormatted = mergeReachAndImpressionsLine(audience, reachBand);
    const tr = typeof p.targetRegion === "string" ? p.targetRegion.trim() : "";
    if (tr) regionDisplay = tr;
  }

  return { runStartUtcMs, impressionsFormatted, regionDisplay };
}

function utcCalendarMsFromEpoch(epochMs: number): number | null {
  const d = new Date(epochMs);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** `Nov 17, 2025` Run start row when UTC calendar day resolves from payload. */
export function formatCanonicalRunStartLabel(slices: CanonicalDetailSlices): string | null {
  return formatRunStartLabelFromUtcMs(slices.runStartUtcMs);
}
