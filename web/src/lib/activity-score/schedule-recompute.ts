import { computeActivityScore } from "@/lib/activity-score/compute";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Fire-and-forget after scraped_ads rows succeed — never blocks scrape pipeline. */
export function scheduleActivityScoreRecompute(userId: string, competitorId: string): void {
  const admin = createSupabaseAdminClient();
  void computeActivityScore({ userId, competitorId, supabaseAdmin: admin }).catch((err) => {
    console.error("[activity-score:background]", err);
  });
}
