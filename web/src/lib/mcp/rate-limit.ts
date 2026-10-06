import type { NextResponse } from "next/server";

import type { McpAuthContext } from "@/lib/mcp/types";
import { mcpRateLimitKey } from "@/lib/mcp/authenticate";
import { mcpRateLimitedResponse } from "@/lib/mcp/http";
import { hitRateLimit } from "@/lib/rate-limit";

const MINUTE_LIMIT = 60;
const DAY_LIMIT = 1000;

/** Per MCP key: 60 calls/minute and 1000/day (shared Redis in production, see `lib/rate-limit`). */
export async function enforceMcpRateLimit(auth: McpAuthContext): Promise<NextResponse | null> {
  const ok = await hitRateLimit(`mcp:${mcpRateLimitKey(auth)}`, [
    { windowSec: 60, max: MINUTE_LIMIT },
    { windowSec: 86_400, max: DAY_LIMIT },
  ]);
  if (ok) return null;
  return mcpRateLimitedResponse();
}
