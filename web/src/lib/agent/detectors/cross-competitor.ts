import type { SupabaseClient } from "@supabase/supabase-js";

import type { DetectedAgentSignal } from "@/lib/agent/types";
import type { Database } from "@/lib/supabase/types";

export async function detectCrossCompetitorTrends(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<DetectedAgentSignal[]> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const { data: recentSignals } = await admin
    .from("agent_signals")
    .select("id, competitor_id, signal_type, threat_score, payload, source")
    .eq("user_id", userId)
    .gte("created_at", since);

  if (!recentSignals?.length) return [];

  const byType = new Map<string, typeof recentSignals>();
  for (const s of recentSignals) {
    const list = byType.get(s.signal_type) ?? [];
    list.push(s);
    byType.set(s.signal_type, list);
  }

  const signals: DetectedAgentSignal[] = [];

  for (const [signalType, list] of byType) {
    const uniqueCompetitors = new Set(list.map((s) => s.competitor_id).filter(Boolean));
    if (uniqueCompetitors.size >= 2) {
      signals.push({
        signal_type: "cross_competitor_trend",
        source: "cross_competitor",
        threat_score: 9,
        payload: {
          trend_type: signalType,
          competitor_count: uniqueCompetitors.size,
          competitor_ids: [...uniqueCompetitors],
          signals: list,
        },
      });
    }
  }

  return signals;
}
