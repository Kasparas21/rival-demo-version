import { NextResponse } from "next/server";

import { isMcpOAuthEnabled } from "@/lib/mcp/oauth-enabled";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MCP_VERSION = "0.1.4";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      oauth_enabled: isMcpOAuthEnabled(),
      version: MCP_VERSION,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    },
    {
      headers: { "X-Robots-Tag": "noindex" },
    },
  );
}
