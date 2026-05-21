import { isGoogleAdRowActive } from "@/lib/ad-library/count-active-ads";
import type { GoogleAdRow } from "@/lib/ad-library/normalize";

/**
 * Best-effort filter for Google Transparency rows still in their visibility window.
 * If filtering would remove every row, returns the original list unchanged.
 */
export function filterGoogleRowsActiveToday(
  rows: GoogleAdRow[],
  nowMs = Date.now(),
): GoogleAdRow[] {
  const filtered = rows.filter((r) => isGoogleAdRowActive(r, nowMs));
  return filtered.length > 0 ? filtered : rows;
}
