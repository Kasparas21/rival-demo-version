import { NextResponse, type NextRequest } from "next/server";

import { getAppOrigin } from "@/lib/integrations/app-origin";
import { verifyIntegrationOAuthState, type IntegrationOAuthReturnTo } from "@/lib/integrations/oauth-state";
import { integrationOAuthRedirect } from "@/lib/integrations/oauth-redirect";
import { saveSlackConnection } from "@/lib/integrations/save-channel-connection";
import { exchangeSlackOAuthCode } from "@/lib/integrations/slack-oauth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = getAppOrigin();
  const { searchParams } = request.nextUrl;

  const oauthError = searchParams.get("error");
  const stateRaw = searchParams.get("state");
  const code = searchParams.get("code");

  let returnTo: IntegrationOAuthReturnTo = "settings";

  if (oauthError === "access_denied") {
    return integrationOAuthRedirect(origin, returnTo, { error: "slack_connect_failed" });
  }

  const state = stateRaw ? verifyIntegrationOAuthState(stateRaw) : null;
  if (!state) {
    return NextResponse.json({ ok: false, error: "invalid_state" }, { status: 400 });
  }
  returnTo = state.return_to;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user || user.id !== state.user_id) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!code) {
    return integrationOAuthRedirect(origin, returnTo, { error: "slack_connect_failed" });
  }

  try {
    const redirectUri = `${origin}/api/integrations/slack/callback`;
    const result = await exchangeSlackOAuthCode(code, redirectUri);

    if (!result.ok || !result.webhookUrl) {
      return integrationOAuthRedirect(origin, returnTo, { error: "slack_connect_failed" });
    }

    await saveSlackConnection(supabase, user.id, {
      webhookUrl: result.webhookUrl,
      connection: {
        team_name: result.teamName ?? "Slack workspace",
        channel: result.channel ?? "channel",
        configuration_url: result.configurationUrl ?? null,
        connected_at: new Date().toISOString(),
      },
    });

    return integrationOAuthRedirect(origin, returnTo, { connected: "slack" });
  } catch {
    return integrationOAuthRedirect(origin, returnTo, { error: "slack_connect_failed" });
  }
}
