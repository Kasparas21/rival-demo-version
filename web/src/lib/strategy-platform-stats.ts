import type { AdsLibraryResponse } from "@/lib/ad-library/api-types";
import { coerceAdsLibraryResponse } from "@/lib/ad-library/api-types";
import type { AdsLibraryPlatform } from "@/lib/ad-library/api-types";

export type PlatformCanvasStat = {
  platform: AdsLibraryPlatform | "youtube";
  label: string;
  count: number;
  /** One line when we can summarize reach / impressions / audience from scrapes */
  reachLine?: string;
  /** Run window or recency from first/last seen */
  runtimeLine?: string;
};

const PLATFORM_LABEL: Record<string, string> = {
  meta: "Meta",
  google: "Google",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  microsoft: "Microsoft",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
};

function fmtShortDate(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Collapse per-ad reach/impression strings: show typical values; note coverage when sparse. */
function formatReachAggregate(totalAds: number, values: (string | null | undefined)[]): string | undefined {
  const nonempty = values
    .map((v) => (v == null ? "" : String(v).trim()))
    .filter((s) => s.length > 0);
  if (nonempty.length === 0) return undefined;
  const unique = [...new Set(nonempty)];
  const sample = unique.slice(0, 3).join(" · ");
  const tail = unique.length > 3 ? " · …" : "";
  if (totalAds === 0 || nonempty.length / totalAds >= 0.75) return sample + tail;
  return `${sample + tail} (${nonempty.length}/${totalAds} ads)`;
}

function uniqueRuntimeHints(hints: string[], maxShow = 3): string | undefined {
  const u = [...new Set(hints.map((h) => h.trim()).filter(Boolean))];
  if (u.length === 0) return undefined;
  return u.slice(0, maxShow).join(" · ") + (u.length > maxShow ? " · …" : "");
}

/** Earliest / latest UNIX seconds from Meta start/end dates */
function metaRuntimeLines(
  ads: { startedAt?: number; endedAt?: number }[]
): string | undefined {
  let min: number | undefined;
  let max: number | undefined;
  for (const a of ads) {
    if (typeof a.startedAt === "number" && Number.isFinite(a.startedAt)) {
      min = min === undefined ? a.startedAt : Math.min(min, a.startedAt);
    }
    if (typeof a.endedAt === "number" && Number.isFinite(a.endedAt)) {
      max = max === undefined ? a.endedAt : Math.max(max, a.endedAt);
    } else if (typeof a.startedAt === "number" && Number.isFinite(a.startedAt)) {
      max = max === undefined ? a.startedAt : Math.max(max, a.startedAt);
    }
  }
  if (min === undefined && max === undefined) return undefined;
  const a = min !== undefined ? fmtShortDate(min * 1000) : "?";
  const b = max !== undefined ? fmtShortDate(max * 1000) : "running";
  return `Running ${a} → ${b}`;
}

function parseIsoish(s: string): number | undefined {
  const t = Date.parse(s);
  return Number.isNaN(t) ? undefined : t;
}

function googleRowRuntime(
  rows: AdsLibraryResponse["google"]["rows"]
): string | undefined {
  let min: number | undefined;
  let max: number | undefined;
  for (const row of rows) {
    if (row.type !== "google") continue;
    const itemFirst = row.shownSummary?.split(/[–-]/)[0]?.trim();
    const itemLast = row.shownSummary?.split(/[–-]/)[1]?.trim();
    for (const raw of [itemFirst, itemLast]) {
      if (!raw) continue;
      const ms = parseIsoish(raw);
      if (ms === undefined) continue;
      min = min === undefined ? ms : Math.min(min, ms);
      max = max === undefined ? ms : Math.max(max, ms);
    }
  }
  if (min === undefined && max === undefined) return undefined;
  const a = min !== undefined ? fmtShortDate(min) : "?";
  const b = max !== undefined ? fmtShortDate(max) : "?";
  if (a === b) return `Last seen ${b}`;
  return `Shown ${a} → ${b}`;
}

export function buildPlatformCanvasStats(adLib: AdsLibraryResponse | null): PlatformCanvasStat[] {
  const lib = coerceAdsLibraryResponse(adLib);
  const out: PlatformCanvasStat[] = [];

  const metaAds = lib.meta.ads ?? [];
  if (metaAds.length > 0) {
    const idxParts = metaAds
      .map((a) => a.impressionsIndex)
      .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
    let reachLine: string | undefined;
    if (idxParts.length > 0) {
      const lo = Math.min(...idxParts);
      const hi = Math.max(...idxParts);
      reachLine =
        lo === hi
          ? `Impression index ${lo} (Meta)`
          : `Impression index ${lo}–${hi} (Meta bands)`;
    }
    out.push({
      platform: "meta",
      label: PLATFORM_LABEL.meta,
      count: metaAds.length,
      reachLine,
      runtimeLine: metaRuntimeLines(metaAds),
    });
  }

  const googleRows = lib.google.rows ?? [];
  const googleOnly = googleRows.filter((r) => r.type === "google");
  const youtubeOnly = googleRows.filter((r) => r.type === "youtube");
  if (googleOnly.length > 0) {
    out.push({
      platform: "google",
      label: PLATFORM_LABEL.google,
      count: googleOnly.length,
      runtimeLine: googleRowRuntime(googleRows),
    });
  }
  if (youtubeOnly.length > 0) {
    out.push({
      platform: "youtube",
      label: PLATFORM_LABEL.youtube,
      count: youtubeOnly.length,
      reachLine: formatReachAggregate(
        youtubeOnly.length,
        youtubeOnly.map((r) => r.views)
      ),
    });
  }

  const linkedinAds = lib.linkedin.ads ?? [];
  if (linkedinAds.length > 0) {
    out.push({
      platform: "linkedin",
      label: PLATFORM_LABEL.linkedin,
      count: linkedinAds.length,
    });
  }

  const tiktokAds = lib.tiktok.ads ?? [];
  if (tiktokAds.length > 0) {
    const runs = tiktokAds.flatMap((a) => {
      const bits: string[] = [];
      if (a.firstShown?.trim()) bits.push(a.firstShown.trim());
      if (a.lastShown?.trim()) bits.push(a.lastShown.trim());
      return bits.length ? [bits.join(" → ")] : [];
    });
    out.push({
      platform: "tiktok",
      label: PLATFORM_LABEL.tiktok,
      count: tiktokAds.length,
      reachLine: formatReachAggregate(tiktokAds.length, tiktokAds.map((a) => a.uniqueUsersSeen)),
      runtimeLine: uniqueRuntimeHints(runs),
    });
  }

  const microsoftAds = lib.microsoft.ads ?? [];
  if (microsoftAds.length > 0) {
    out.push({
      platform: "microsoft",
      label: PLATFORM_LABEL.microsoft,
      count: microsoftAds.length,
      reachLine: formatReachAggregate(
        microsoftAds.length,
        microsoftAds.map((a) => a.impressionsRange)
      ),
    });
  }

  const pinterestAds = lib.pinterest.ads ?? [];
  if (pinterestAds.length > 0) {
    out.push({
      platform: "pinterest",
      label: PLATFORM_LABEL.pinterest,
      count: pinterestAds.length,
      reachLine: formatReachAggregate(
        pinterestAds.length,
        pinterestAds.map((a) => a.reachSummary)
      ),
    });
  }

  const snapchatAds = lib.snapchat.ads ?? [];
  if (snapchatAds.length > 0) {
    const snapReach = [
      ...snapchatAds.map((a) => a.impressionsLabel),
      ...snapchatAds.map((a) => (a.euCountry?.trim() ? `Market ${a.euCountry.trim()}` : null)),
    ];
    out.push({
      platform: "snapchat",
      label: PLATFORM_LABEL.snapchat,
      count: snapchatAds.length,
      reachLine: formatReachAggregate(snapchatAds.length, snapReach),
    });
  }

  out.sort((a, b) => b.count - a.count);
  return out;
}

export function totalAdsInCanvas(stats: PlatformCanvasStat[]): number {
  return stats.reduce((s, p) => s + p.count, 0);
}
