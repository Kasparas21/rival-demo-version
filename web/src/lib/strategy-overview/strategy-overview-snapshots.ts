import type { SupabaseClient } from "@supabase/supabase-js";

import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import type { Database, Json } from "@/lib/supabase/types";

/** Persist snapshot after overview upsert; retain last 30 per competitor. */
export async function recordStrategyOverviewSnapshot(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  competitorId: string;
  payload: CompetitorStrategyOverviewPayload;
  sourceScrapeBatchId: string | null;
  aiModelVersion: string;
}): Promise<void> {
  const { supabase, userId, competitorId, payload, sourceScrapeBatchId, aiModelVersion } = params;

  const { error: insErr } = await supabase.from("competitor_strategy_overview_snapshots").insert({
    user_id: userId,
    competitor_id: competitorId,
    payload: payload as unknown as Json,
    source_scrape_batch_id: sourceScrapeBatchId,
    ai_model_version: aiModelVersion,
  });

  if (insErr) {
    console.error("[snapshots] insert failed", insErr.message);
    return;
  }

  const { data: rows, error: listErr } = await supabase
    .from("competitor_strategy_overview_snapshots")
    .select("id")
    .eq("competitor_id", competitorId)
    .eq("user_id", userId)
    .order("computed_at", { ascending: false });

  if (listErr || !rows || rows.length <= 30) return;

  const toDelete = rows.slice(30).map((r) => r.id);
  if (toDelete.length === 0) return;

  await supabase.from("competitor_strategy_overview_snapshots").delete().in("id", toDelete);
}
