import { NextResponse } from "next/server";

import { getBillingEntitlement } from "@/lib/billing/entitlements";
import { countTeamViewerSlotsUsed } from "@/lib/team/invite-limits";
import { assertCanManageTeam, permissionDeniedResponse } from "@/lib/team/permissions";
import { resolveWorkspaceContext } from "@/lib/team/workspace-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  try {
    assertCanManageTeam(ctx);
  } catch (err) {
    return permissionDeniedResponse(err);
  }

  const { data: rows, error } = await supabase
    .from("team_memberships")
    .select("id, invited_email, member_user_id, role, status, created_at, accepted_at")
    .eq("owner_user_id", user.id)
    .neq("status", "revoked")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const memberIds = [...new Set((rows ?? []).map((r) => r.member_user_id).filter(Boolean))] as string[];
  const profilesById = new Map<string, { full_name: string | null; email: string | null }>();
  if (memberIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", memberIds);
    for (const p of profiles ?? []) {
      profilesById.set(p.id, { full_name: p.full_name, email: p.email });
    }
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  const used = await countTeamViewerSlotsUsed(supabase, user.id);

  return NextResponse.json({
    ok: true,
    members: (rows ?? []).map((row) => {
      const profile = row.member_user_id ? profilesById.get(row.member_user_id) : null;
      return {
        ...row,
        memberName: profile?.full_name ?? null,
        memberEmail: profile?.email ?? row.invited_email,
      };
    }),
    limits: {
      maxTeamViewers: billing.limits.maxTeamViewers,
      used,
    },
  });
}
