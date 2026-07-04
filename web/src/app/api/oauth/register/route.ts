import { randomBytes } from "crypto";
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";

import { isMcpOAuthEnabled } from "@/lib/mcp/oauth-enabled";
import { oauthErrorResponse, oauthJsonResponse, oauthOptionsResponse } from "@/lib/mcp/oauth/cors";
import { isAllowedOAuthRedirectUri } from "@/lib/mcp/oauth/redirect-uri";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RegisterBody = {
  client_name?: string;
  redirect_uris?: string[];
};

export async function OPTIONS() {
  if (!isMcpOAuthEnabled()) notFound();
  return oauthOptionsResponse();
}

export async function POST(req: Request) {
  if (!isMcpOAuthEnabled()) notFound();

  let body: RegisterBody;
  try {
    body = (await req.json()) as RegisterBody;
  } catch {
    return oauthErrorResponse("invalid_request", "JSON body required");
  }

  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u): u is string => typeof u === "string").map((u) => u.trim())
    : [];

  if (!redirectUris.length) {
    return oauthErrorResponse("invalid_redirect_uri", "redirect_uris required");
  }

  for (const uri of redirectUris) {
    if (!isAllowedOAuthRedirectUri(uri)) {
      return oauthErrorResponse("invalid_redirect_uri", `disallowed redirect: ${uri}`);
    }
  }

  const clientId = `mcp_${randomBytes(16).toString("base64url")}`;
  const clientName = typeof body.client_name === "string" ? body.client_name.trim().slice(0, 120) : "MCP client";

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("mcp_oauth_clients").insert({
    client_id: clientId,
    client_name: clientName || "MCP client",
    redirect_uris: redirectUris,
  });

  if (error) {
    return oauthErrorResponse("server_error", "registration failed", 500);
  }

  return oauthJsonResponse(
    {
      client_id: clientId,
      client_name: clientName,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
    201,
  );
}
