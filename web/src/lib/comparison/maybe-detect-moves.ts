import type { SupabaseClient } from "@supabase/supabase-js";

import { detectMoves, generateMoveNarrative } from "@/lib/comparison/move-detector";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import type { Database, Json } from "@/lib/supabase/types";

const DETECTION_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MOVE_MODEL_VERSION = "moves-v2";
const NEW_ANGLE_DEDUP_MS = 30 * 24 * 60 * 60 * 1000;

type SnapshotRow = {
  id: string;
  payload: unknown;
  computed_at: string;
};

function asPayload(raw: unknown): CompetitorStrategyOverviewPayload | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as CompetitorStrategyOverviewPayload;
}

async function hasRecentNewAngleDuplicate(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  competitorId: string;
  angle: string;
}): Promise<boolean> {
  const { supabase, userId, competitorId, angle } = params;
  const since = new Date(Date.now() - NEW_ANGLE_DEDUP_MS).toISOString();
  const { data, error } = await supabase
    .from("competitor_moves")
    .select("after_state")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .eq("event_type", "new_angle")
    .gte("detected_at", since);

  if (error || !data?.length) return false;

  return data.some((row) => {
    const st = row.after_state as { angle?: string } | null;
    return st?.angle === angle;
  });
}

export async function maybeDetectMoves(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  competitorId: string;
}): Promise<void> {
  const { supabase, userId, competitorId } = params;

  const { data: comp, error: compErr } = await supabase
    .from("saved_competitors")
    .select("last_move_detection_at")
    .eq("id", competitorId)
    .eq("user_id", userId)
    .maybeSingle();

  if (compErr || !comp) return;

  const lastMs = comp.last_move_detection_at ? Date.parse(comp.last_move_detection_at) : 0;
  if (Number.isFinite(lastMs) && Date.now() - lastMs < DETECTION_COOLDOWN_MS) return;

  const { data: snapshots, error: snapErr } = await supabase
    .from("competitor_strategy_overview_snapshots")
    .select("id, payload, computed_at")
    .eq("competitor_id", competitorId)
    .eq("user_id", userId)
    .order("computed_at", { ascending: false })
    .limit(2);

  if (snapErr || !snapshots || snapshots.length < 2) {
    return;
  }

  const [newer, older] = snapshots as SnapshotRow[];
  const afterPayload = asPayload(newer.payload);
  const beforePayload = asPayload(older.payload);
  if (!afterPayload || !beforePayload) return;

  const rawMoves = detectMoves(beforePayload, afterPayload);

  const moves = [];
  for (const move of rawMoves) {
    if (move.event_type === "new_angle") {
      const ang = (move.after_state as { angle?: string }).angle;
      if (!ang) continue;
      const dup = await hasRecentNewAngleDuplicate({ supabase, userId, competitorId, angle: ang });
      if (dup) continue;
    }
    moves.push(move);
  }

  await supabase
    .from("competitor_moves")
    .delete()
    .eq("competitor_id", competitorId)
    .eq("user_id", userId)
    .eq("source_snapshot_id_after", newer.id);

  for (const move of moves) {
    const narrative = await generateMoveNarrative(move);
    await supabase.from("competitor_moves").insert({
      user_id: userId,
      competitor_id: competitorId,
      event_type: move.event_type,
      significance: move.significance,
      platform: move.platform ?? null,
      before_state: move.before_state as Json,
      after_state: move.after_state as Json,
      narrative,
      ai_model_version: MOVE_MODEL_VERSION,
      source_snapshot_id_before: older.id,
      source_snapshot_id_after: newer.id,
    });
  }

  await supabase
    .from("saved_competitors")
    .update({ last_move_detection_at: new Date().toISOString() })
    .eq("id", competitorId)
    .eq("user_id", userId);
}
