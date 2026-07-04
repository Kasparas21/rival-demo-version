import { notFound } from "next/navigation";

import { isMcpOAuthEnabled } from "@/lib/mcp/oauth-enabled";
import { consumeAuthorizationCode } from "@/lib/mcp/oauth/authorization-codes";
import { oauthErrorResponse, oauthJsonResponse, oauthOptionsResponse } from "@/lib/mcp/oauth/cors";
import { verifyPkceS256 } from "@/lib/mcp/oauth/pkce";
import {
  createMcpAccessToken,
  MCP_ACCESS_TOKEN_TTL_SEC,
} from "@/lib/mcp/oauth/tokens";
import { issueRefreshToken, rotateRefreshToken } from "@/lib/mcp/oauth/refresh-tokens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function parseTokenBody(req: Request): Promise<URLSearchParams> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = (await req.json()) as Record<string, string>;
    return new URLSearchParams(json);
  }
  const text = await req.text();
  return new URLSearchParams(text);
}

export async function OPTIONS() {
  if (!isMcpOAuthEnabled()) notFound();
  return oauthOptionsResponse();
}

export async function POST(req: Request) {
  if (!isMcpOAuthEnabled()) notFound();

  let params: URLSearchParams;
  try {
    params = await parseTokenBody(req);
  } catch {
    return oauthErrorResponse("invalid_request");
  }

  const grantType = (params.get("grant_type") ?? "").trim();

  if (grantType === "authorization_code") {
    const code = (params.get("code") ?? "").trim();
    const redirectUri = (params.get("redirect_uri") ?? "").trim();
    const clientId = (params.get("client_id") ?? "").trim();
    const codeVerifier = (params.get("code_verifier") ?? "").trim();

    if (!code || !redirectUri || !clientId || !codeVerifier) {
      return oauthErrorResponse("invalid_request");
    }

    const consumed = await consumeAuthorizationCode(code, clientId, redirectUri);
    if (!consumed) {
      return oauthErrorResponse("invalid_grant", "code invalid or expired");
    }

    if (consumed.codeChallengeMethod !== "S256" || !verifyPkceS256(codeVerifier, consumed.codeChallenge)) {
      return oauthErrorResponse("invalid_grant", "PKCE verification failed");
    }

    const accessToken = createMcpAccessToken({
      userId: consumed.userId,
      clientId: consumed.clientId,
      scope: consumed.scope,
    });
    const refreshToken = await issueRefreshToken(consumed.userId, consumed.clientId);

    return oauthJsonResponse({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: MCP_ACCESS_TOKEN_TTL_SEC,
      refresh_token: refreshToken,
      scope: consumed.scope,
    });
  }

  if (grantType === "refresh_token") {
    const refreshToken = (params.get("refresh_token") ?? "").trim();
    const clientId = (params.get("client_id") ?? "").trim();
    if (!refreshToken || !clientId) {
      return oauthErrorResponse("invalid_request");
    }

    const rotated = await rotateRefreshToken(refreshToken);
    if (!rotated || rotated.clientId !== clientId) {
      return oauthErrorResponse("invalid_grant", "refresh token invalid or revoked");
    }

    const accessToken = createMcpAccessToken({
      userId: rotated.userId,
      clientId: rotated.clientId,
    });
    const newRefresh = await issueRefreshToken(rotated.userId, rotated.clientId);

    return oauthJsonResponse({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: MCP_ACCESS_TOKEN_TTL_SEC,
      refresh_token: newRefresh,
      scope: "mcp:read",
    });
  }

  return oauthErrorResponse("unsupported_grant_type");
}
