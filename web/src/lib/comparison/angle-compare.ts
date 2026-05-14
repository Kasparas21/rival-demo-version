import type { AnglesByPlatformInsight, CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";

/** Exact-string angle sets from strategy payload rollups. */
export function angleKeysFromPayload(payload: CompetitorStrategyOverviewPayload | null): Set<string> {
  const s = new Set<string>();
  for (const row of payload?.insights.angles_by_platform ?? []) {
    const a = row.angle?.trim();
    if (a) s.add(a);
  }
  return s;
}

/** Competitor angles the workspace brand does not use (sorted by ad count desc). */
export function listStealableAngleRows(
  userPayload: CompetitorStrategyOverviewPayload | null,
  competitorPayload: CompetitorStrategyOverviewPayload | null
): AnglesByPlatformInsight[] {
  const userAngles = angleKeysFromPayload(userPayload);
  const rows = (competitorPayload?.insights.angles_by_platform ?? []).filter(
    (r) => r.angle?.trim() && !userAngles.has(r.angle)
  );
  return [...rows].sort((a, b) => (b.totalCount ?? 0) - (a.totalCount ?? 0));
}
