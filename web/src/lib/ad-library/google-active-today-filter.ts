import type { GoogleAdRow } from "@/lib/ad-library/normalize";
import { msToUtcYmd } from "@/lib/ad-library/scheduled-scrape-date-window";

function parseYmdFromIso(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const m = iso.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }
  return msToUtcYmd(d.getTime());
}

/** True when ad was shown on or after `ymd` (UTC). */
function lastShownOnOrAfter(row: GoogleAdRow, ymd: string): boolean {
  if (row.type !== "google" && row.type !== "youtube") return true;
  const last = parseYmdFromIso(row.lastShown);
  if (last && last >= ymd) return true;
  const first = parseYmdFromIso(row.firstShown);
  if (first && first >= ymd) return true;
  return false;
}

/**
 * Best-effort filter for Google Transparency rows active today (UTC).
 * If filtering would remove every row, returns the original list unchanged.
 */
export function filterGoogleRowsActiveToday(
  rows: GoogleAdRow[],
  nowMs = Date.now(),
): GoogleAdRow[] {
  const today = msToUtcYmd(nowMs);
  const filtered = rows.filter((r) => lastShownOnOrAfter(r, today));
  return filtered.length > 0 ? filtered : rows;
}
