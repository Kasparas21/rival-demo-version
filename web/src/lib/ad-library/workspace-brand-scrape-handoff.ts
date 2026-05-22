import type { AdsLibraryResponse } from "./api-types";
import { coerceAdsLibraryResponse } from "./api-types";
import type { FetchAdsLibraryResult } from "./deduped-fetch";

const HANDOFF_PREFIX = "ads-library:workspace-handoff:";

function cleanDomain(d: string): string {
  const t = d.trim().toLowerCase();
  return t.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || t;
}

/** One-shot session payload so the brand page hydrates scraped creatives before server cache catches up. */
export function writeWorkspaceBrandScrapeHandoff(
  domain: string,
  response: AdsLibraryResponse,
  httpOk = true
): void {
  if (typeof window === "undefined") return;
  const d = cleanDomain(domain);
  if (!d) return;
  try {
    window.sessionStorage.setItem(
      `${HANDOFF_PREFIX}${d}`,
      JSON.stringify({
        at: Date.now(),
        result: { response: coerceAdsLibraryResponse(response), httpOk },
      })
    );
  } catch {
    /* quota */
  }
}

export function readWorkspaceBrandScrapeHandoff(domain: string): FetchAdsLibraryResult | null {
  if (typeof window === "undefined") return null;
  const d = cleanDomain(domain);
  if (!d) return null;
  try {
    const raw = window.sessionStorage.getItem(`${HANDOFF_PREFIX}${d}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { result?: FetchAdsLibraryResult };
    const result = parsed?.result;
    if (!result || result.response === undefined) return null;
    return result;
  } catch {
    return null;
  }
}

export function clearWorkspaceBrandScrapeHandoff(domain: string): void {
  if (typeof window === "undefined") return;
  const d = cleanDomain(domain);
  if (!d) return;
  try {
    window.sessionStorage.removeItem(`${HANDOFF_PREFIX}${d}`);
  } catch {
    /* ignore */
  }
}
