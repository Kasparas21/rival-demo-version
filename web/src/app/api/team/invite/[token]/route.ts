import { NextResponse } from "next/server";

import {
  acceptTeamInviteByToken,
  getTeamInvitePreview,
  parseInviteToken,
} from "@/lib/team/team-invite-by-token";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: Request, context: RouteContext): Promise<NextResponse> {
  const { token: tokenRaw } = await context.params;
  const inviteToken = parseInviteToken(tokenRaw);
  if (!inviteToken) {
    return NextResponse.json({ ok: false, error: "Invalid invite link." }, { status: 400 });
  }

  const preview = await getTeamInvitePreview(inviteToken);

  if (!preview.ok) {
    return NextResponse.json({ ok: false, error: preview.error }, { status: preview.status });
  }

  return NextResponse.json({
    ok: true,
    status: preview.status,
    invitedEmail: preview.invitedEmail,
    invitedEmailMasked: preview.invitedEmailMasked,
    expired: preview.expired,
    owner: preview.owner,
  });
}

export async function POST(_req: Request, context: RouteContext): Promise<NextResponse> {
  const { token: tokenRaw } = await context.params;
  const inviteToken = parseInviteToken(tokenRaw);
  if (!inviteToken) {
    return NextResponse.json({ ok: false, error: "Invalid invite link." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await acceptTeamInviteByToken(supabase, inviteToken, user.id, user.email);
  if ("status" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    accepted: result.accepted,
    alreadyActive: result.alreadyActive,
    ownerUserId: result.ownerUserId,
    ownerLabel: result.ownerLabel,
    chooseWorkspace: true,
  });
}
