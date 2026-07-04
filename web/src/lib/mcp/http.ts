import { NextResponse } from "next/server";

import { isMcpOAuthEnabled } from "@/lib/mcp/oauth-enabled";
import { getMcpAppOrigin } from "@/lib/mcp/oauth/app-origin";

const MCP_ROBOTS_HEADER = { "X-Robots-Tag": "noindex" } as const;

function unauthorizedHeaders(): Record<string, string> {
  const headers: Record<string, string> = { ...MCP_ROBOTS_HEADER };
  if (isMcpOAuthEnabled()) {
    const origin = getMcpAppOrigin();
    headers["WWW-Authenticate"] = `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`;
  }
  return headers;
}

export function mcpJsonResponse(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: MCP_ROBOTS_HEADER });
}

export function mcpUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      code: "unauthorized",
      message: isMcpOAuthEnabled()
        ? "invalid or missing access token — connect via OAuth or generate an API key in Settings → MCP / AI assistants"
        : "invalid or missing API key — generate one in Settings → MCP / AI assistants",
    },
    { status: 401, headers: unauthorizedHeaders() },
  );
}

export function mcpRateLimitedResponse(retryAfterSeconds = 60): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      code: "rate_limited",
      retry_after_seconds: retryAfterSeconds,
      message: "MCP rate limit exceeded (60/min or 1000/day per API key). Try again shortly.",
    },
    {
      status: 429,
      headers: {
        ...MCP_ROBOTS_HEADER,
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}
