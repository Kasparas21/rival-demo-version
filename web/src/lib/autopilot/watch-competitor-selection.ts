/** null = all competitors in scope; [] = none; non-empty = explicit subset */
export function isWatchAllCompetitors(watchCompetitorIds: string[] | null): boolean {
  return watchCompetitorIds === null;
}

export function resolveExplicitWatchedCompetitorIds(
  watchCompetitorIds: string[] | null,
  poolIds: Iterable<string>,
): Set<string> {
  const pool = new Set(poolIds);
  if (isWatchAllCompetitors(watchCompetitorIds)) {
    return new Set(pool);
  }
  return new Set((watchCompetitorIds ?? []).filter((id) => pool.has(id)));
}

export function normalizeWatchCompetitorIdsFromSelection(
  selected: Set<string>,
  poolIds: string[],
): string[] | null {
  if (poolIds.length === 0) return null;
  if (poolIds.every((id) => selected.has(id))) return null;
  return poolIds.filter((id) => selected.has(id));
}
