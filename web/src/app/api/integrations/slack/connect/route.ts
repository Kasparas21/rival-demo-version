import { NextResponse, type NextRequest } from "next/server";

import { getAppOrigin } from "@/lib/integrations/app-origin";
import {
  createIntegrationOAuthState,
  type IntegrationOAuthReturnTo,
} from "@/lib/integrations/oauth-state";
import {
  oauthConnectFailureRedirect,
  parseOAuthReturnTo,
} from "@/lib/integrations/oauth-redirect";
import { buildSlackAuthorizeUrl } from "@/lib/integrations/slack-oauth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const returnTo: IntegrationOAuthReturnTo = parseOAuthReturnTo(
    request.nextUrl.searchParams.get("return_to"),
  );

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  }

  try {
    const origin = getAppOrigin();
    const state = createIntegrationOAuthState(user.id, returnTo);
    const redirectUri = `${origin}/api/integrations/slack/callback`;
    return NextResponse.redirect(buildSlackAuthorizeUrl(state, redirectUri));
  } catch {
    return oauthConnectFailureRedirect(getAppOrigin(), returnTo);
  }
}
