import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { formatToolError, formatToolResult } from "@/lib/mcp/errors";
import { logMcpCall } from "@/lib/mcp/logging";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { getCompetitorAds } from "@/lib/mcp/tools/get-competitor-ads";
import { getCompetitorTimeline } from "@/lib/mcp/tools/get-competitor-timeline";
import { getProvenWinners } from "@/lib/mcp/tools/get-proven-winners";
import { getRecentAlerts } from "@/lib/mcp/tools/get-recent-alerts";
import { getStealableAngles } from "@/lib/mcp/tools/get-stealable-angles";
import { getStrategyOverview } from "@/lib/mcp/tools/get-strategy-overview";
import { listCompetitors } from "@/lib/mcp/tools/list-competitors";
import { searchCopyVault } from "@/lib/mcp/tools/search-copy-vault";

async function runTool(
  name: string,
  ctx: McpToolContext,
  fn: (ctx: McpToolContext) => Promise<unknown>,
) {
  const started = Date.now();
  try {
    const result = await fn(ctx);
    logMcpCall({
      userId: ctx.auth.userId,
      tool: name,
      durationMs: Date.now() - started,
      keyId: ctx.auth.keyId ?? ctx.auth.oauthClientId,
    });
    return formatToolResult(result);
  } catch (err) {
    logMcpCall({
      userId: ctx.auth.userId,
      tool: name,
      durationMs: Date.now() - started,
      keyId: ctx.auth.keyId ?? ctx.auth.oauthClientId,
    });
    return formatToolError(err);
  }
}

export function registerMcpTools(
  server: McpServer,
  buildContext: () => Promise<McpToolContext>,
): void {
  server.registerTool(
    "list_competitors",
    {
      title: "List competitors",
      description:
        "List tracked competitors with platforms, activity score, and last scraped time. Returns tracked_count and plan_limit.",
      inputSchema: {},
    },
    async () => {
      const ctx = await buildContext();
      return runTool("list_competitors", ctx, listCompetitors);
    },
  );

  server.registerTool(
    "get_competitor_ads",
    {
      title: "Get competitor ads",
      description:
        "Active ads for one tracked competitor. Optional platform filter, limit (max 50), sort newest or longest_running.",
      inputSchema: {
        competitor: z.string().min(1).describe("Competitor name, domain, or UUID"),
        platform: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
        sort: z.enum(["newest", "longest_running"]).optional(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("get_competitor_ads", ctx, (c) => getCompetitorAds(c, input));
    },
  );

  server.registerTool(
    "get_strategy_overview",
    {
      title: "Get strategy overview",
      description: "Read cached strategy overview for a competitor. Never triggers recompute.",
      inputSchema: {
        competitor: z.string().min(1),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("get_strategy_overview", ctx, (c) => getStrategyOverview(c, input));
    },
  );

  server.registerTool(
    "get_stealable_angles",
    {
      title: "Get stealable angles",
      description: "Extracted creative angles from cached strategy overviews for one or all competitors.",
      inputSchema: {
        competitor: z.string().optional(),
        limit: z.number().int().min(1).max(30).optional(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("get_stealable_angles", ctx, (c) => getStealableAngles(c, input));
    },
  );

  server.registerTool(
    "search_copy_vault",
    {
      title: "Search copy vault",
      description: "Full-text search across enriched ad copy and angles for tracked competitors.",
      inputSchema: {
        query: z.string().min(1),
        competitor: z.string().optional(),
        platform: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("search_copy_vault", ctx, (c) => searchCopyVault(c, input));
    },
  );

  server.registerTool(
    "get_proven_winners",
    {
      title: "Get proven winners",
      description: "Longest-running active ads (30+ days) across tracked competitors.",
      inputSchema: {
        competitor: z.string().optional(),
        platform: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("get_proven_winners", ctx, (c) => getProvenWinners(c, input));
    },
  );

  server.registerTool(
    "get_recent_alerts",
    {
      title: "Get recent alerts",
      description: "Recent competitor move alerts for the user, optional competitor filter and since_days.",
      inputSchema: {
        limit: z.number().int().min(1).max(50).optional(),
        since_days: z.number().int().min(1).max(90).optional(),
        competitor: z.string().optional(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("get_recent_alerts", ctx, (c) => getRecentAlerts(c, input));
    },
  );

  server.registerTool(
    "get_competitor_timeline",
    {
      title: "Get competitor timeline",
      description: "Key events (new ads and alerts) for one competitor over the last N days.",
      inputSchema: {
        competitor: z.string().min(1),
        days: z.number().int().min(1).max(90).optional(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("get_competitor_timeline", ctx, (c) => getCompetitorTimeline(c, input));
    },
  );
}
