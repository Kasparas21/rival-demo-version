import { NextResponse } from "next/server";

import {
  clearGuestSessionCookieOptions,
  clearPreviewActiveCookieOptions,
  TEAM_GUEST_COOKIE,
  RIVAL_PREVIEW_ACTIVE_COOKIE,
} from "@/lib/team/guest-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const response = NextResponse.json({ ok: true, hasAuthenticatedSession: Boolean(user) });
  response.cookies.set(TEAM_GUEST_COOKIE, "", clearGuestSessionCookieOptions());
  response.cookies.set(RIVAL_PREVIEW_ACTIVE_COOKIE, "", clearPreviewActiveCookieOptions());
  return response;
}
