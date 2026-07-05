import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildChannelSignals,
  hasChannelSignals,
  loadChannelAggregates,
} from "@/lib/strategy-overview/channel-signals";
import {
  buildJourneyGoal,
  hasJourneyGoal,
  loadJourneyGoalInputs,
} from "@/lib/strategy-overview/derive-journey-goal";
import type {
  StrategyChannelSignals,
  StrategyJourneyGoal,
  StrategyMapPayload,
} from "@/lib/strategy-overview/payload-types";
import type { Database } from "@/lib/supabase/types";

/** Attach channel signals + journey goal (same logic as compiled strategy route). */
export async function buildStrategyRuntimeLayers(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
  map: StrategyMapPayload,
  brandDomain: string | null,
): Promise<{ channelSignals: StrategyChannelSignals | null; journeyGoal: StrategyJourneyGoal | null }> {
  const [aggregates, journeyInputs] = await Promise.all([
    loadChannelAggregates(supabase, userId, competitorId),
    loadJourneyGoalInputs(supabase, userId, competitorId, brandDomain),
  ]);
  const signals = buildChannelSignals(aggregates, map);
  const channelSignals = hasChannelSignals(signals) ? signals : null;
  const journeyGoalRaw = buildJourneyGoal(map, journeyInputs, channelSignals);
  const journeyGoal = hasJourneyGoal(journeyGoalRaw) ? journeyGoalRaw : null;
  return { channelSignals, journeyGoal };
}
