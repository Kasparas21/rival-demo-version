import type { SupabaseClient } from "@supabase/supabase-js";

import type { DetectedAgentSignal } from "@/lib/agent/types";
import type { Database } from "@/lib/supabase/types";

const MAX_TREND_SIGNALS = 20;

type SignalRow = { id: string; competitor_id: string | null; threat_score: number; payload: unknown };

/** What the message writer needs from each signal in a trend: who, how strong, and one line of what. */
function signalRef(s: SignalRow) {
  const p = (s.payload ?? {}) as { hook?: unknown; ad?: { ad_text?: unknown; platform?: unknown }; new_cta?: unknown };
  const line = [p.hook, p.new_cta, p.ad?.ad_text].find((v): v is string => typeof v === "string" && v.trim() !== "");
  return {
    id: s.id,
    competitor_id: s.competitor_id,
    threat_score: s.threat_score,
    platform: typeof p.ad?.platform === "string" ? p.ad.platform : null,
    summary: line ? line.trim().slice(0, 160) : null,
  };
}

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
    // A trend of trends would embed last week's trends, each embedding the week before (rows reached 4 MB).
    if (signalType === "cross_competitor_trend") continue;
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
          // References, not copies: the full signals stay in their own rows. Embedding them made each trend
          // ~1.3 MB, and the message prompt pastes the payload in as JSON.
          signals: list.slice(0, MAX_TREND_SIGNALS).map(signalRef),
          signal_count: list.length,
        },
      });
    }
  }

  return signals;
}
