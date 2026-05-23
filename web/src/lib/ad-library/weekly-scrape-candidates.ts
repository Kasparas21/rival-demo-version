import type { Database } from "@/lib/supabase/types";

type SavedCompetitorRow = Database["public"]["Tables"]["saved_competitors"]["Row"];

/** Saved rivals eligible for nightly scheduled refresh (excludes workspace brand row). */
export function isEligibleWeeklyScrapeCandidate(
  row: Pick<SavedCompetitorRow, "is_workspace_brand">,
): boolean {
  return row.is_workspace_brand !== true;
}

export function filterWeeklyScrapeCandidates<
  T extends Pick<SavedCompetitorRow, "is_workspace_brand">,
>(rows: T[]): T[] {
  return rows.filter(isEligibleWeeklyScrapeCandidate);
}
