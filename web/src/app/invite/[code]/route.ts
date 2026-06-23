import { NextResponse, type NextRequest } from "next/server";

import {
  isTesterInviteExpired,
  getTesterInviteConfig,
  matchesTesterInviteCode,
  normalizeInviteCode,
  setTesterInviteCookie,
} from "@/lib/billing/tester-invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Branded invite entry: /invite/barcelona → onboarding with complimentary Pro attribution. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await context.params;
  const config = getTesterInviteConfig();

  if (!config || !rawCode?.trim() || !matchesTesterInviteCode(rawCode)) {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  if (isTesterInviteExpired(config)) {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.searchParams.set("invite_error", "expired");
    return NextResponse.redirect(home);
  }

  const inviteCode = normalizeInviteCode(rawCode);
  const dest = request.nextUrl.clone();
  dest.pathname = "/onboarding";
  dest.searchParams.set("tester", inviteCode);

  const response = NextResponse.redirect(dest);
  setTesterInviteCookie(response, inviteCode);
  return response;
}
