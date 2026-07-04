import { notFound } from "next/navigation";
import { NextResponse } from "next/server";

import { isMcpOAuthEnabled } from "@/lib/mcp/oauth-enabled";
import { createAuthorizationCode } from "@/lib/mcp/oauth/authorization-codes";
import { oauthErrorResponse, oauthOptionsResponse } from "@/lib/mcp/oauth/cors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function OPTIONS() {
  if (!isMcpOAuthEnabled()) notFound();
  return oauthOptionsResponse();
}

export async function POST(req: Request) {
  if (!isMcpOAuthEnabled()) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return oauthErrorResponse("login_required", "Sign in required", 401);
  }

  let body: Record<string, string>;
  try {
    const fd = await req.formData();
    body = Object.fromEntries(
      [...fd.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]),
    );
  } catch {
    try {
      body = (await req.json()) as Record<string, string>;
    } catch {
      return oauthErrorResponse("invalid_request");
    }
  }

  const clientId = (body.client_id ?? "").trim();
  const redirectUri = (body.redirect_uri ?? "").trim();
  const codeChallenge = (body.code_challenge ?? "").trim();
  const codeChallengeMethod = (body.code_challenge_method ?? "").trim();
  const scope = (body.scope ?? "mcp:read").trim();
  const state = body.state?.trim();
  const decision = (body.decision ?? "").trim();

  if (!clientId || !redirectUri || !codeChallenge || codeChallengeMethod !== "S256") {
    return oauthErrorResponse("invalid_request");
  }

  const redirect = new URL(redirectUri);

  if (decision === "deny") {
    redirect.searchParams.set("error", "access_denied");
    if (state) redirect.searchParams.set("state", state);
    return NextResponse.redirect(redirect.toString());
  }

  if (decision !== "allow") {
    return oauthErrorResponse("invalid_request", "decision must be allow or deny");
  }

  try {
    const code = await createAuthorizationCode({
      userId: user.id,
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      scope,
    });

    redirect.searchParams.set("code", code);
    if (state) redirect.searchParams.set("state", state);
    return NextResponse.redirect(redirect.toString());
  } catch {
    return oauthErrorResponse("server_error", "could not issue code", 500);
  }
}
