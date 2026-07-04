import { NextResponse } from "next/server";

import { isMcpOAuthEnabled } from "@/lib/mcp/oauth-enabled";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MCP_VERSION = "0.1.0";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      oauth_enabled: isMcpOAuthEnabled(),
      version: MCP_VERSION,
    },
    {
      headers: { "X-Robots-Tag": "noindex" },
    },
  );
}
