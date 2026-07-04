import { notFound } from "next/navigation";
import { NextResponse } from "next/server";

import { isMcpOAuthEnabled } from "@/lib/mcp/oauth-enabled";
import { getMcpAppOrigin } from "@/lib/mcp/oauth/app-origin";
import { oauthOptionsResponse } from "@/lib/mcp/oauth/cors";
import { redirectUriMatchesRegistered, isAllowedOAuthRedirectUri } from "@/lib/mcp/oauth/redirect-uri";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function OPTIONS() {
  if (!isMcpOAuthEnabled()) notFound();
  return oauthOptionsResponse();
}

export async function GET(req: Request) {
  if (!isMcpOAuthEnabled()) notFound();

  const url = new URL(req.url);
  const clientId = (url.searchParams.get("client_id") ?? "").trim();
  const redirectUri = (url.searchParams.get("redirect_uri") ?? "").trim();
  const responseType = (url.searchParams.get("response_type") ?? "").trim();
  const codeChallenge = (url.searchParams.get("code_challenge") ?? "").trim();
  const codeChallengeMethod = (url.searchParams.get("code_challenge_method") ?? "").trim();
  const scope = (url.searchParams.get("scope") ?? "mcp:read").trim();
  const state = url.searchParams.get("state");

  if (!clientId || !redirectUri || responseType !== "code") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return NextResponse.json({ error: "invalid_request", error_description: "PKCE S256 required" }, { status: 400 });
  }
  if (scope !== "mcp:read") {
    return NextResponse.json({ error: "invalid_scope" }, { status: 400 });
  }
  if (!isAllowedOAuthRedirectUri(redirectUri)) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: client } = await admin
    .from("mcp_oauth_clients")
    .select("client_id, redirect_uris")
    .eq("client_id", clientId)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  }

  const registered = Array.isArray(client.redirect_uris)
    ? (client.redirect_uris as string[])
    : [];
  if (!redirectUriMatchesRegistered(registered, redirectUri)) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const origin = getMcpAppOrigin();
  const returnParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    scope,
  });
  if (state) returnParams.set("state", state);

  const consentPath = `/dashboard/oauth/consent?${returnParams.toString()}`;

  if (!user) {
    const loginUrl = `${origin}/login?next=${encodeURIComponent(consentPath)}`;
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(`${origin}${consentPath}`);
}
