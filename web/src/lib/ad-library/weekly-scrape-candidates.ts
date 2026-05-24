import type { Database } from "@/lib/supabase/types";

type SavedCompetitorRow = Database["public"]["Tables"]["saved_competitors"]["Row"];

/** Saved rivals and workspace brand rows eligible for nightly scheduled refresh. */
export function isEligibleWeeklyScrapeCandidate(
  _row: Pick<SavedCompetitorRow, "is_workspace_brand">,
): boolean {
  return true;
}

export function filterWeeklyScrapeCandidates<
  T extends Pick<SavedCompetitorRow, "is_workspace_brand">,
>(rows: T[]): T[] {
  return rows.filter(isEligibleWeeklyScrapeCandidate);
}
