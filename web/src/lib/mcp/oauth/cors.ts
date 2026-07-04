import { NextResponse } from "next/server";

export const MCP_OAUTH_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "X-Robots-Tag": "noindex",
} as const;

export function oauthJsonResponse(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: MCP_OAUTH_CORS_HEADERS });
}

export function oauthOptionsResponse(): NextResponse {
  return new NextResponse(null, { status: 204, headers: MCP_OAUTH_CORS_HEADERS });
}

export function oauthErrorResponse(
  error: string,
  description?: string,
  status = 400,
): NextResponse {
  return oauthJsonResponse(
    { error, ...(description ? { error_description: description } : {}) },
    status,
  );
}
