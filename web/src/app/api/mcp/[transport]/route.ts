import { createMcpHandler } from "mcp-handler";
import type { NextRequest } from "next/server";

import {
  authenticateMcpRequest,
  rejectNonBearerScheme,
} from "@/lib/mcp/authenticate";
import { mcpUnauthorizedResponse } from "@/lib/mcp/http";
import { enforceMcpRateLimit } from "@/lib/mcp/rate-limit";
import { registerMcpTools } from "@/lib/mcp/register-tools";
import type { McpAuthContext } from "@/lib/mcp/types";
import { createMcpToolContext } from "@/lib/mcp/tool-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function buildHandler(auth: McpAuthContext) {
  return createMcpHandler(
    (server) => {
      registerMcpTools(server, async () => createMcpToolContext(auth));
    },
    {
      serverInfo: {
        name: "Spy-Rival",
        version: "1.0.0",
      },
      instructions:
        "Spy-Rival competitor ad intelligence across Meta, Google, TikTok, LinkedIn, YouTube, and Pinterest. Read-only.\n\n" +
        "Pagination: every list tool accepts limit + offset and returns pagination { total, has_more, next_offset }. " +
        "Loop with offset=next_offset until has_more is false to fetch complete datasets.\n\n" +
        "Defaults: ad copy is truncated to 300 chars unless include_full_copy=true. " +
        "Page sizes up to 200 (ads/alerts/timeline/moves/organic/email) or 500 (copy vault / proven winners / landing pages).\n\n" +
        "Dashboard parity tools: get_organic_posts (view=insights), get_email_intelligence (view=insights|detail), " +
        "get_landing_pages (url for ads-on-page), get_journey_goal (full map terminal goal + evidence), get_competitor_moves, " +
        "get_saved_ads (your bookmarked ad snapshots).\n\n" +
        "list_competitors: tracked_slot_count may exceed listed_competitor_count when one competitor is mapped to multiple brands.",
    },
    {
      basePath: "/api/mcp",
      redisUrl: process.env.REDIS_URL,
      maxDuration: 300,
      verboseLogs: process.env.NODE_ENV === "development",
    },
  );
}

async function handleAuthorized(req: NextRequest, auth: McpAuthContext) {
  const limited = await enforceMcpRateLimit(auth);
  if (limited) return limited;
  const handler = buildHandler(auth);
  return handler(req);
}

async function gateRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader && rejectNonBearerScheme(authHeader)) {
    return mcpUnauthorizedResponse();
  }
  const auth = await authenticateMcpRequest(authHeader);
  if (!auth) return mcpUnauthorizedResponse();
  return handleAuthorized(req, auth);
}

export async function GET(req: NextRequest) {
  return gateRequest(req);
}

export async function POST(req: NextRequest) {
  return gateRequest(req);
}

export async function DELETE(req: NextRequest) {
  return gateRequest(req);
}
