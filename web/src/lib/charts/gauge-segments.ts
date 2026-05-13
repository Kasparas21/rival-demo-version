/**
 * Compute per-segment sweep angles (degrees) for a multi-segment gauge with fixed angular gaps.
 */
export function allocateGaugeSegmentSweeps(
  counts: Record<string, number>,
  total: number,
  platformOrder: readonly string[],
  arcTotalDeg: number,
  gapDeg: number,
  gapCount: number
): { platform: string; count: number; sweepDeg: number }[] {
  const sweepable = arcTotalDeg - gapCount * gapDeg;
  const active = platformOrder.filter((p) => (counts[p] ?? 0) > 0);
  return active.map((platform) => {
    const count = counts[platform] ?? 0;
    const sweepDeg = (count / total) * sweepable;
    return { platform, count, sweepDeg };
  });
}
