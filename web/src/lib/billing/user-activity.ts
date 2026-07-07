import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/** Pause scraping when a free user has not opened the app in this many UTC days. */
export const INACTIVE_SCRAPE_PAUSE_DAYS = 7;

export type UserActivitySnapshot = {
  lastActiveDate: string | null;
  updatedAt: string | null;
  createdAt: string | null;
};

export async function getUserActivitySnapshot(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UserActivitySnapshot> {
  const { data, error } = await supabase
    .from("profiles")
    .select("last_active_date, updated_at, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[user-activity] getUserActivitySnapshot", error.message);
    return { lastActiveDate: null, updatedAt: null, createdAt: null };
  }

  return {
    lastActiveDate: data?.last_active_date ?? null,
    updatedAt: data?.updated_at ?? null,
    createdAt: data?.created_at ?? null,
  };
}

export function dateYmdFromIso(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const ymd = iso.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}

/** Best-known UTC calendar day the user was last in the app. */
export function resolveLastActiveDateYmd(activity: UserActivitySnapshot): string | null {
  return (
    activity.lastActiveDate ??
    dateYmdFromIso(activity.updatedAt) ??
    dateYmdFromIso(activity.createdAt)
  );
}

export function daysSinceUtcDateYmd(lastActiveDateYmd: string, now = new Date()): number {
  const lastMs = Date.parse(`${lastActiveDateYmd}T00:00:00.000Z`);
  if (Number.isNaN(lastMs)) return Number.POSITIVE_INFINITY;
  const todayUtcMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((todayUtcMs - lastMs) / 86_400_000);
}

/** True when the user has not opened the app within the pause window. */
export function isUserInactiveForScrape(
  activity: UserActivitySnapshot,
  now = new Date(),
): boolean {
  const lastActiveDateYmd = resolveLastActiveDateYmd(activity);
  if (!lastActiveDateYmd) return true;
  return daysSinceUtcDateYmd(lastActiveDateYmd, now) >= INACTIVE_SCRAPE_PAUSE_DAYS;
}

export async function recordUserDailyActivity(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { error } = await supabase.rpc("record_user_daily_activity", {
    p_user_id: userId,
  });

  if (error) {
    console.warn("[user-activity] recordUserDailyActivity", error.message);
  }
}
