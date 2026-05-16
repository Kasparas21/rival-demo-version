import { normalizeGoogleAdsRegion } from "@/lib/ad-library/google-ads-regions";
import { parseGoogleShownSummaryRange } from "@/lib/ad-library/google-shown-range";

function toIsoOrNull(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export type GoogleFamilyAdDetailFields = {
  firstShownIso: string | null;
  lastShownIso: string | null;
  /** Same day-boundary rule as `ad-detail` API: floor((last − first) / 1 day). */
  libraryRunDays: number | null;
  region: string | null;
  targeting: string | null;
};

export function buildGoogleFamilyAdDetailFields(
  platform: string,
  rawPayload: unknown
): GoogleFamilyAdDetailFields {
  const pl = platform.trim().toLowerCase();
  if (pl !== "google" && pl !== "youtube") {
    return {
      firstShownIso: null,
      lastShownIso: null,
      libraryRunDays: null,
      region: null,
      targeting: null,
    };
  }
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return {
      firstShownIso: null,
      lastShownIso: null,
      libraryRunDays: null,
      region: null,
      targeting: null,
    };
  }
  const p = rawPayload as Record<string, unknown>;

  const firstShownRaw =
    typeof p.firstShown === "string" && p.firstShown.trim() ? p.firstShown.trim() : null;
  const lastShownRaw =
    typeof p.lastShown === "string" && p.lastShown.trim() ? p.lastShown.trim() : null;
  const summary =
    typeof p.shownSummary === "string" && p.shownSummary.trim() ? p.shownSummary.trim() : null;
  const fromSummary = parseGoogleShownSummaryRange(summary);
  const lastShownLabel =
    typeof p.lastShownLabel === "string" && p.lastShownLabel.trim()
      ? p.lastShownLabel.trim()
      : null;

  const firstShownIso = toIsoOrNull(firstShownRaw || fromSummary.first || null);
  const lastShownIso = toIsoOrNull(
    lastShownRaw || fromSummary.last || lastShownLabel || firstShownRaw || null
  );

  let libraryRunDays: number | null = null;
  if (firstShownIso && lastShownIso) {
    const t0 = new Date(firstShownIso).getTime();
    const t1 = new Date(lastShownIso).getTime();
    if (!Number.isNaN(t0) && !Number.isNaN(t1)) {
      libraryRunDays = Math.max(0, Math.floor((t1 - t0) / (24 * 60 * 60 * 1000)));
    }
  }

  const region =
    typeof p.libraryRegionSummary === "string" && p.libraryRegionSummary.trim()
      ? p.libraryRegionSummary.trim()
      : null;
  const targeting =
    typeof p.libraryTargetingSummary === "string" && p.libraryTargetingSummary.trim()
      ? p.libraryTargetingSummary.trim()
      : null;

  const regionEffective = region ?? googleRegionLineFromTransparencyUrl(p);

  return {
    firstShownIso,
    lastShownIso,
    libraryRunDays,
    region: regionEffective,
    targeting,
  };
}

/** When scrape omits enrichment, Transparency `adUrl` still carries `?region=ISO` or anywhere. */
function googleRegionLineFromTransparencyUrl(p: Record<string, unknown>): string | null {
  const adUrl =
    (typeof p.adUrl === "string" && p.adUrl.trim()
      ? p.adUrl.trim()
      : typeof p.ad_library_url === "string" && p.ad_library_url.trim()
        ? p.ad_library_url.trim()
        : "") || "";
  if (!adUrl) return null;

  try {
    const u = new URL(adUrl);
    const rRaw = u.searchParams.get("region")?.trim();
    if (!rRaw) return null;

    const code = normalizeGoogleAdsRegion(rRaw);
    if (code === "anywhere") return "All countries";

    try {
      const dn = new Intl.DisplayNames(["en"], { type: "region" });
      return dn.of(code) ?? code;
    } catch {
      return code;
    }
  } catch {
    return null;
  }
}
