import { NextResponse } from "next/server";

import { getBillingEntitlement } from "@/lib/billing/entitlements";
import { getAppUrl } from "@/lib/billing/config";
import { assertCanManageTeam, permissionDeniedResponse } from "@/lib/team/permissions";
import {
  assertCanInviteTeamViewer,
  normalizeInviteEmail,
  validateInviteEmail,
} from "@/lib/team/invite-limits";
import { sendTeamInviteEmail, teamInviteExpiresAt } from "@/lib/team/send-team-invite-email";
import { ownerDisplayLabel, resolveWorkspaceContext } from "@/lib/team/workspace-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function loadOwnerForEmail(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  ownerUserId: string,
) {
  const { data: owner } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", ownerUserId)
    .maybeSingle();

  return {
    ownerUserId,
    ownerEmail: owner?.email ?? null,
    ownerName: owner?.full_name ?? null,
  };
}

export async function POST(req: Request): Promise<NextResponse> {
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

  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  let invitedEmail: string;
  try {
    invitedEmail = validateInviteEmail(body.email ?? "");
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Invalid email" },
      { status: 400 },
    );
  }

  if (normalizeInviteEmail(user.email ?? "") === invitedEmail) {
    return NextResponse.json({ ok: false, error: "You cannot invite yourself." }, { status: 400 });
  }

  try {
    await assertCanInviteTeamViewer(supabase, ctx.sessionUserId);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Invite not allowed" },
      { status: 403 },
    );
  }

  const owner = await loadOwnerForEmail(supabase, ctx.sessionUserId);
  const appOrigin = getAppUrl() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://spy-rival.com";

  const { data: existingRow } = await supabase
    .from("team_memberships")
    .select("id, status, invite_token")
    .eq("owner_user_id", ctx.sessionUserId)
    .eq("invited_email", invitedEmail)
    .maybeSingle();

  let existing = existingRow;

  if (existing?.status === "revoked") {
    await supabase
      .from("team_memberships")
      .delete()
      .eq("id", existing.id)
      .eq("owner_user_id", ctx.sessionUserId);
    existing = null;
  }

  if (existing?.status === "active") {
    return NextResponse.json({ ok: false, error: "This person already has access." }, { status: 409 });
  }

  let memberId: string;
  let inviteToken: string;
  let resent = false;

  if (existing?.status === "pending") {
    memberId = existing.id;
    inviteToken = existing.invite_token;
    resent = true;

    const { error: refreshErr } = await supabase
      .from("team_memberships")
      .update({ invite_token_expires_at: teamInviteExpiresAt() })
      .eq("id", existing.id);

    if (refreshErr) {
      return NextResponse.json({ ok: false, error: refreshErr.message }, { status: 500 });
    }
  } else {
    const expiresAt = teamInviteExpiresAt();
    const { data: inserted, error: insertErr } = await supabase
      .from("team_memberships")
      .insert({
        owner_user_id: ctx.sessionUserId,
        invited_email: invitedEmail,
        role: "viewer",
        status: "pending",
        invite_token_expires_at: expiresAt,
      })
      .select("id, invited_email, status, created_at, invite_token")
      .single();

    if (insertErr || !inserted) {
      return NextResponse.json({ ok: false, error: insertErr?.message ?? "Invite failed" }, { status: 500 });
    }

    memberId = inserted.id;
    inviteToken = inserted.invite_token;
  }

  const emailResult = await sendTeamInviteEmail({
    to: invitedEmail,
    owner,
    inviteToken,
    appOrigin,
  });

  if (!emailResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: emailResult.error,
        memberId,
        emailSent: false,
        resent,
      },
      { status: 502 },
    );
  }

  const billing = await getBillingEntitlement(supabase, ctx.sessionUserId);

  return NextResponse.json({
    ok: true,
    memberId,
    invitedEmail,
    ownerLabel: ownerDisplayLabel(owner),
    emailSent: true,
    resent,
    limits: {
      maxTeamViewers: billing.limits.maxTeamViewers,
    },
  });
}
