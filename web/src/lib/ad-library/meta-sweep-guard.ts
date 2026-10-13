/**
 * Truncation guard for Meta kill detection. A sweep that returns fewer ads than its cap counts as
 * complete, so every stored ad it missed gets marked killed — but a run cut short (captcha, dead proxy)
 * also comes back under the cap. A sweep that drops below half of the previous complete sweep is
 * therefore trusted only once the next sweep confirms the lower count.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/** Below this many ads a big relative drop is ordinary churn, not a sign of truncation. */
const MIN_PREVIOUS_SWEEP_ADS = 10;
const MIN_TRUSTED_SHARE_OF_PREVIOUS = 0.5;

export function isSuspectedTruncatedSweep(incomingCount: number, previousSweepCount: number | null): boolean {
  if (previousSweepCount == null || previousSweepCount < MIN_PREVIOUS_SWEEP_ADS) return false;
  return incomingCount < previousSweepCount * MIN_TRUSTED_SHARE_OF_PREVIOUS;
}

/**
 * The Meta sweep cap to reconcile with: the requested cap, or null (absence proves nothing) when the
 * sweep looks cut short. Complete-looking sweeps record their count either way, so a real drop is
 * accepted one sweep later. Capped and empty sweeps prove nothing and aren't recorded.
 */
export async function guardMetaSweepCap(
  supabase: SupabaseClient<Database>,
  params: { competitorId: string; incomingCount: number; sweepCap: number | null },
): Promise<number | null> {
  const { competitorId, incomingCount, sweepCap } = params;
  if (sweepCap == null || incomingCount === 0 || incomingCount >= sweepCap) return sweepCap;

  const { data, error } = await supabase
    .from("competitor_platform_tracking")
    .select("last_sweep_ad_count")
    .eq("competitor_id", competitorId)
    .eq("platform", "meta")
    .maybeSingle();
  if (error) {
    console.error("[metaSweepGuard] load", error.message);
    return sweepCap;
  }
  if (!data) return sweepCap;

  const { error: updateError } = await supabase
    .from("competitor_platform_tracking")
    .update({ last_sweep_ad_count: incomingCount })
    .eq("competitor_id", competitorId)
    .eq("platform", "meta");
  if (updateError) console.error("[metaSweepGuard] record", updateError.message);

  const previous = data.last_sweep_ad_count;
  if (!isSuspectedTruncatedSweep(incomingCount, previous)) return sweepCap;
  console.warn(
    `[metaSweepGuard] competitor ${competitorId}: sweep returned ${incomingCount} ads vs ${previous} last time; not marking kills until the next sweep confirms`,
  );
  return null;
}
