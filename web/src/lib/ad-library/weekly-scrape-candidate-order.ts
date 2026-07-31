import type { Database } from "@/lib/supabase/types";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { userAllowsScheduledAdsScrape } from "@/lib/billing/scrape-eligibility";
import { isPlatformDueForScheduledScrape } from "./platform-prioritization";
import { filterWeeklyScrapeCandidates } from "./weekly-scrape-candidates";

type ScheduledScrapeRow = Database["public"]["Tables"]["saved_competitors"]["Row"];
type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/** Competitors that still have at least one platform due (or no tracking rows yet). */
export async function competitorIdsWithDuePlatforms(
  admin: AdminClient,
  competitorIds: string[],
  nowMs: number,
): Promise<Set<string>> {
  if (competitorIds.length === 0) return new Set();

  const { data: trackingRows } = await admin
    .from("competitor_platform_tracking")
    .select("competitor_id, platform, classification, next_scrape_at, last_scrape_at")
    .in("competitor_id", competitorIds);

  const byCompetitor = new Map<string, typeof trackingRows>();
  for (const row of trackingRows ?? []) {
    const list = byCompetitor.get(row.competitor_id) ?? [];
    list.push(row);
    byCompetitor.set(row.competitor_id, list);
  }

  const due = new Set<string>();
  for (const id of competitorIds) {
    const rows = byCompetitor.get(id);
    if (!rows?.length) {
      due.add(id);
      continue;
    }
    const hasDue = rows.some((r) =>
      isPlatformDueForScheduledScrape(
        {
          platform: r.platform,
          classification: r.classification as "PRIMARY" | "SECONDARY" | "MINIMAL" | "INACTIVE",
          next_scrape_at: r.next_scrape_at,
          last_scrape_at: r.last_scrape_at,
        },
        nowMs,
      ),
    );
    if (hasDue) due.add(id);
  }
  return due;
}

async function filterRowsForScheduledScrapeAllowed(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  rows: ScheduledScrapeRow[],
): Promise<ScheduledScrapeRow[]> {
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const allowedByUser = new Map<string, boolean>();
  await Promise.all(
    userIds.map(async (userId) => {
      allowedByUser.set(userId, await userAllowsScheduledAdsScrape(admin, userId));
    }),
  );
  return rows.filter((row) => allowedByUser.get(row.user_id) === true);
}

export async function loadOrderedWeeklyScrapeCandidates(
  admin: AdminClient,
  savedRows: ScheduledScrapeRow[],
  runDayYmd: string,
  opts?: { skipDoneTodayForCompetitorId?: string | null; nowMs?: number },
): Promise<ScheduledScrapeRow[]> {
  const nowMs = opts?.nowMs ?? Date.now();
  const candidates = filterWeeklyScrapeCandidates(savedRows);
  const scheduledCandidates = await filterRowsForScheduledScrapeAllowed(admin, candidates);
  if (scheduledCandidates.length === 0) return [];

  const { data: doneToday } = await admin
    .from("weekly_scrape_jobs")
    .select("competitor_id")
    .eq("week_start", runDayYmd)
    .eq("status", "done");

  const skipDoneId = opts?.skipDoneTodayForCompetitorId?.trim() || null;
  const doneTodayIds = (doneToday ?? [])
    .map((r) => r.competitor_id)
    .filter((id) => !skipDoneId || id !== skipDoneId);

  const stillDueIds = await competitorIdsWithDuePlatforms(admin, doneTodayIds, nowMs);
  const doneTodaySkipIds = new Set(
    doneTodayIds.filter((id) => !stillDueIds.has(id)),
  );

  const { data: runningRecent } = await admin
    .from("weekly_scrape_jobs")
    .select("competitor_id")
    .eq("status", "running")
    .gte("updated_at", new Date(nowMs - 2 * 60 * 60 * 1000).toISOString());

  const runningIds = new Set((runningRecent ?? []).map((r) => r.competitor_id));

  const eligible = scheduledCandidates.filter((r) => !doneTodaySkipIds.has(r.id) && !runningIds.has(r.id));
  if (eligible.length === 0) return [];

  const dueEligibleIds = await competitorIdsWithDuePlatforms(
    admin,
    eligible.map((r) => r.id),
    nowMs,
  );
  const dueEligible = eligible.filter((r) => dueEligibleIds.has(r.id));
  if (dueEligible.length === 0) return [];

  const competitorIds = dueEligible.map((r) => r.id);
  const { data: trackingRows } = await admin
    .from("competitor_platform_tracking")
    .select("competitor_id, next_scrape_at")
    .in("competitor_id", competitorIds);

  const earliestDueByCompetitor = new Map<string, number>();
  for (const row of trackingRows ?? []) {
    const cid = row.competitor_id;
    const dueMs = row.next_scrape_at ? Date.parse(row.next_scrape_at) : 0;
    const prev = earliestDueByCompetitor.get(cid);
    if (prev === undefined || dueMs < prev) {
      earliestDueByCompetitor.set(cid, Number.isNaN(dueMs) ? 0 : dueMs);
    }
  }

  return [...dueEligible].sort((a, b) => {
    const aDue = earliestDueByCompetitor.get(a.id) ?? 0;
    const bDue = earliestDueByCompetitor.get(b.id) ?? 0;
    if (aDue !== bDue) return aDue - bDue;
    return a.id.localeCompare(b.id);
  });
}
