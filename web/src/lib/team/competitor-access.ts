import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { resolveWorkspaceContext, type WorkspaceContext } from "@/lib/team/workspace-context";

export type CompetitorAccess = {
  supabase: SupabaseClient<Database>;
  ctx: WorkspaceContext;
  dataUserId: string;
  sessionUserId: string;
};

export async function requireCompetitorAccess(
  supabase: SupabaseClient<Database>,
  sessionUserId: string,
  competitorId: string,
): Promise<CompetitorAccess | NextResponse> {
  const ctx = await resolveWorkspaceContext(supabase, sessionUserId);
  const dataUserId = ctx.dataUserId;

  const { data: competitor } = await supabase
    .from("saved_competitors")
    .select("id")
    .eq("id", competitorId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (!competitor) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  return { supabase, ctx, dataUserId, sessionUserId };
}
