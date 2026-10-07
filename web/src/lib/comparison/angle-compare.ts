import type { AnglesByPlatformInsight, CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import { angleSlugOf } from "@/lib/strategy-overview/ad-angles";

/**
 * Angle categories from a strategy payload. Rows from older payloads hold full labels ("price · Hook: Allbirds
 * Inc · Body: …") that embed each brand's own name and never match across brands; comparing by category works
 * for old and new payloads alike.
 */
export function angleKeysFromPayload(payload: CompetitorStrategyOverviewPayload | null): Set<string> {
  const s = new Set<string>();
  for (const row of payload?.insights?.angles_by_platform ?? []) {
    const slug = angleSlugOf(row.angle);
    if (slug) s.add(slug);
  }
  return s;
}

/** Competitor angle categories the workspace brand does not use (sorted by ad count desc). */
export function listStealableAngleRows(
  userPayload: CompetitorStrategyOverviewPayload | null,
  competitorPayload: CompetitorStrategyOverviewPayload | null
): AnglesByPlatformInsight[] {
  const userAngles = angleKeysFromPayload(userPayload);
  /** One row per category: older payloads hold one row per label, so the same category repeats. */
  const bySlug = new Map<string, AnglesByPlatformInsight>();
  for (const r of competitorPayload?.insights?.angles_by_platform ?? []) {
    const slug = angleSlugOf(r.angle);
    if (slug == null || slug === "other" || userAngles.has(slug)) continue;
    const prev = bySlug.get(slug);
    if (!prev) {
      bySlug.set(slug, { ...r });
      continue;
    }
    const lead = (r.totalCount ?? 0) > (prev.totalCount ?? 0) ? r : prev;
    const platformCounts = { ...prev.platformCounts };
    for (const [pl, n] of Object.entries(r.platformCounts ?? {})) {
      platformCounts[pl as keyof typeof platformCounts] = (platformCounts[pl as keyof typeof platformCounts] ?? 0) + (n ?? 0);
    }
    bySlug.set(slug, {
      ...lead,
      totalCount: (prev.totalCount ?? 0) + (r.totalCount ?? 0),
      platforms: [...new Set([...prev.platforms, ...r.platforms])],
      platformCounts,
    });
  }
  return [...bySlug.values()].sort((a, b) => (b.totalCount ?? 0) - (a.totalCount ?? 0));
}
