import { NextResponse } from "next/server";

import {
  buildGuestSessionCookie,
  guestSessionCookieOptions,
  validateGuestInviteAccess,
} from "@/lib/team/guest-session";
import { getTeamInvitePreview, parseInviteToken } from "@/lib/team/team-invite-by-token";
import { ownerDisplayLabel } from "@/lib/team/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(_req: Request, context: RouteContext): Promise<NextResponse> {
  const { token: tokenRaw } = await context.params;
  const inviteToken = parseInviteToken(tokenRaw);
  if (!inviteToken) {
    return NextResponse.json({ ok: false, error: "Invalid invite link." }, { status: 400 });
  }

  const validation = await validateGuestInviteAccess(inviteToken);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
  }

  const preview = await getTeamInvitePreview(inviteToken);
  if (!preview.ok) {
    return NextResponse.json({ ok: false, error: preview.error }, { status: preview.status });
  }

  const { value, expiresAtMs } = buildGuestSessionCookie(validation.row);

  const response = NextResponse.json({
    ok: true,
    ownerLabel: ownerDisplayLabel(preview.owner),
    expiresAt: new Date(expiresAtMs).toISOString(),
  });

  response.cookies.set("rival_team_guest", value, guestSessionCookieOptions(expiresAtMs));
  return response;
}
