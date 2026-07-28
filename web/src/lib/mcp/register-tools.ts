import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { formatToolError, formatToolResult } from "@/lib/mcp/errors";
import { logMcpCall } from "@/lib/mcp/logging";
import {
  mcpIncludeFullCopySchema,
  mcpLimitSchema,
  mcpOffsetSchema,
  MCP_PAGE_MAX,
  MCP_PAGE_MAX_VAULT,
} from "@/lib/mcp/pagination";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { getCompetitorAds } from "@/lib/mcp/tools/get-competitor-ads";
import { getCompetitorMoves } from "@/lib/mcp/tools/get-competitor-moves";
import { getCompetitorTimeline } from "@/lib/mcp/tools/get-competitor-timeline";
import { getEmailIntelligence } from "@/lib/mcp/tools/get-email-intelligence";
import { getJourneyGoal } from "@/lib/mcp/tools/get-journey-goal";
import { getLandingPages } from "@/lib/mcp/tools/get-landing-pages";
import { getOrganicInsights, getOrganicPosts } from "@/lib/mcp/tools/get-organic-posts";
import { getProvenWinners } from "@/lib/mcp/tools/get-proven-winners";
import { getRecentAlerts } from "@/lib/mcp/tools/get-recent-alerts";
import { getSavedAds } from "@/lib/mcp/tools/get-saved-ads";
import { getStealableAngles } from "@/lib/mcp/tools/get-stealable-angles";
import { getStrategyOverview } from "@/lib/mcp/tools/get-strategy-overview";
import { listCompetitors } from "@/lib/mcp/tools/list-competitors";
import { searchCopyVault } from "@/lib/mcp/tools/search-copy-vault";
import {
  mcpAnalyzeDiscoveryKeywords,
  mcpGetDiscoveryAd,
  mcpGetDiscoveryCompetitors,
  mcpGetDiscoveryFeed,
  mcpGetDiscoveryMarketStats,
  mcpGetDiscoveryPatterns,
  mcpSearchDiscoveryAds,
} from "@/lib/mcp/tools/discovery-tools";

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
        "List tracked competitors with platforms, activity score, and last scraped time. Supports pagination (limit/offset). Returns tracked_slot_count (brand mappings) and listed_competitor_count (unique competitors).",
      inputSchema: {
        limit: mcpLimitSchema(500, 100),
        offset: mcpOffsetSchema(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("list_competitors", ctx, (c) => listCompetitors(c, input));
    },
  );

  server.registerTool(
    "get_competitor_ads",
    {
      title: "Get competitor ads",
      description:
        `Active ads for one tracked competitor. Paginate with offset + limit (max ${MCP_PAGE_MAX} per page). Sort: newest, oldest, longest_running, impressions (Meta impression band, high first), or ultimate_winner (combines high impressions + long runtime). Set include_full_copy=true for untruncated ad text. Each ad includes spy_rival_url, platform_library_url, impressions_index (Meta), and is_ultimate_winner when it qualifies.`,
      inputSchema: {
        competitor: z.string().min(1).describe("Competitor name, domain, or UUID"),
        platform: z.string().optional(),
        limit: mcpLimitSchema(MCP_PAGE_MAX, 50),
        offset: mcpOffsetSchema(),
        sort: z
          .enum(["newest", "oldest", "longest_running", "impressions", "ultimate_winner"])
          .optional()
          .describe("Sort order. Use impressions or ultimate_winner for Meta performance ranking."),
        include_full_copy: mcpIncludeFullCopySchema(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("get_competitor_ads", ctx, (c) => getCompetitorAds(c, input));
    },
  );

  server.registerTool(
    "get_saved_ads",
    {
      title: "Get saved ads",
      description:
        `Your bookmarked ad snapshots across tracked competitors. Paginate with offset + limit (max ${MCP_PAGE_MAX} per page). ` +
        "Optional competitor filter. Each result includes ad copy, angle, notes, saved_at, spy_rival_url, and platform_library_url. " +
        "Use this to answer questions about ads you have saved for later reference.",
      inputSchema: {
        competitor: z.string().optional().describe("Competitor name, domain, or UUID"),
        platform: z.string().optional().describe("Filter by platform, e.g. meta"),
        limit: mcpLimitSchema(MCP_PAGE_MAX, 50),
        offset: mcpOffsetSchema(),
        include_full_copy: mcpIncludeFullCopySchema(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("get_saved_ads", ctx, (c) => getSavedAds(c, input));
    },
  );

  server.registerTool(
    "get_strategy_overview",
    {
      title: "Get strategy overview",
      description:
        "Cached strategy overview: funnel cells, spend band, top angles, angle categories, format mix, tone, audience signals, and insight card summaries. Never triggers recompute.",
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
      description:
        "Extracted creative angles from cached strategy overviews. Paginate with offset + limit (max 200). Omit competitor to scan all tracked brands.",
      inputSchema: {
        competitor: z.string().optional(),
        limit: mcpLimitSchema(200, 30),
        offset: mcpOffsetSchema(),
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
      description:
        `Full-text search across enriched ad copy and angles. Paginate with offset + limit (max ${MCP_PAGE_MAX_VAULT} per page). Requires active subscription. Each result includes spy_rival_url and platform_library_url (direct Meta Ads Library link when available).`,
      inputSchema: {
        query: z.string().min(1),
        competitor: z.string().optional(),
        platform: z.string().optional(),
        limit: mcpLimitSchema(MCP_PAGE_MAX_VAULT, 50),
        offset: mcpOffsetSchema(),
        include_full_copy: mcpIncludeFullCopySchema(),
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
      description:
        `Longest-running active ads (30+ days). Paginate with offset + limit (max ${MCP_PAGE_MAX_VAULT}). Requires active subscription. Each winner includes spy_rival_url and platform_library_url (direct Meta Ads Library link when available).`,
      inputSchema: {
        competitor: z.string().optional(),
        platform: z.string().optional(),
        limit: mcpLimitSchema(MCP_PAGE_MAX_VAULT, 50),
        offset: mcpOffsetSchema(),
        include_full_copy: mcpIncludeFullCopySchema(),
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
      description:
        "Recent competitor move alerts. Paginate with offset + limit (max 200). Optional since_days (max 90) and competitor filter.",
      inputSchema: {
        limit: mcpLimitSchema(200, 50),
        offset: mcpOffsetSchema(),
        since_days: z.number().int().min(1).max(90).optional(),
        competitor: z.string().optional(),
        include_full_body: z.boolean().optional().describe("Return full alert body instead of 200-char preview."),
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
      description:
        "Merged timeline of new ads and alerts for one competitor. Paginate events with offset + limit (max 200 per page).",
      inputSchema: {
        competitor: z.string().min(1),
        days: z.number().int().min(1).max(90).optional(),
        limit: mcpLimitSchema(200, 100),
        offset: mcpOffsetSchema(),
        include_full_copy: mcpIncludeFullCopySchema(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("get_competitor_timeline", ctx, (c) => getCompetitorTimeline(c, input));
    },
  );

  server.registerTool(
    "get_organic_posts",
    {
      title: "Get organic posts",
      description:
        "Organic social posts for a tracked competitor. Paginate with offset + limit (max 200). Filter by platform, sort by recent/likes/comments. Set view=insights for AI organic insights instead of post list.",
      inputSchema: {
        competitor: z.string().min(1),
        view: z.enum(["posts", "insights"]).optional(),
        platform: z.string().optional().describe("linkedin, twitter, instagram, tiktok, facebook, youtube, or all"),
        sort: z.enum(["recent", "likes", "comments"]).optional(),
        limit: mcpLimitSchema(MCP_PAGE_MAX, 50),
        offset: mcpOffsetSchema(),
        include_full_text: z.boolean().optional().describe("Return full post content instead of 500-char preview."),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      if (input.view === "insights") {
        return runTool("get_organic_posts", ctx, (c) => getOrganicInsights(c, input));
      }
      return runTool("get_organic_posts", ctx, (c) => getOrganicPosts(c, input));
    },
  );

  server.registerTool(
    "get_email_intelligence",
    {
      title: "Get email intelligence",
      description:
        "Captured competitor emails and marketing insights. view=inbox (default, paginated), view=insights (aggregated cadence/offers/angles), or view=detail with email_id for one email.",
      inputSchema: {
        competitor: z.string().min(1),
        view: z.enum(["inbox", "insights", "detail"]).optional(),
        email_id: z.string().optional(),
        q: z.string().optional().describe("Search subject, sender, summary, or offers (inbox view)."),
        limit: mcpLimitSchema(MCP_PAGE_MAX, 50),
        offset: mcpOffsetSchema(),
        include_full_body: z.boolean().optional(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("get_email_intelligence", ctx, (c) => getEmailIntelligence(c, input));
    },
  );

  server.registerTool(
    "get_landing_pages",
    {
      title: "Get landing pages",
      description:
        `Landing page groups from active ads (max ${MCP_PAGE_MAX_VAULT} per page). Pass url to fetch ads for a specific landing page instead. Ads include spy_rival_url and platform_library_url (direct Meta Ads Library link when available).`,
      inputSchema: {
        competitor: z.string().min(1),
        url: z.string().optional().describe("When set, returns ads pointing to this URL instead of page groups."),
        limit: mcpLimitSchema(MCP_PAGE_MAX_VAULT, 50),
        offset: mcpOffsetSchema(),
        include_full_copy: mcpIncludeFullCopySchema(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("get_landing_pages", ctx, (c) => getLandingPages(c, input));
    },
  );

  server.registerTool(
    "get_journey_goal",
    {
      title: "Get journey goal",
      description:
        "Full strategy map journey end goal: macro outcome, path roles (direct sale, discount, retargeting), deals, categories, creatives, landing previews, and channel signals (organic + email). Requires cached strategy overview.",
      inputSchema: {
        competitor: z.string().min(1),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("get_journey_goal", ctx, (c) => getJourneyGoal(c, input));
    },
  );

  server.registerTool(
    "get_competitor_moves",
    {
      title: "Get competitor moves",
      description:
        "Strategy snapshot diffs: new platforms, angle migrations, budget shifts, voice changes. Paginate with offset + limit (max 200). Optional since_days filter (max 90).",
      inputSchema: {
        competitor: z.string().min(1),
        limit: mcpLimitSchema(MCP_PAGE_MAX, 40),
        offset: mcpOffsetSchema(),
        since_days: z.number().int().min(1).max(90).optional(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("get_competitor_moves", ctx, (c) => getCompetitorMoves(c, input));
    },
  );

  server.registerTool(
    "search_discovery_ads",
    {
      title: "Search discovery ads",
      description:
        "Keyword search across the Discovery feed for the current workspace: ad copy, hooks, and competitor names. " +
        "Supports format (video/image), status (active/retired), date_preset (7d/30d/90d), ultimate_only, competitor filter, and sort. " +
        "Use match=all to require every keyword. Returns ads with spy_rival_url links and market_stats.",
      inputSchema: {
        query: z.string().min(1).describe("Primary search text or comma-separated keywords"),
        brand_id: z.string().optional().describe("Client workspace brand UUID; defaults to primary brand"),
        keywords: z.array(z.string()).optional(),
        match: z.enum(["any", "all"]).optional(),
        competitor: z.string().optional(),
        competitors: z.array(z.string()).optional(),
        format: z.enum(["all", "video", "image"]).optional(),
        status: z.enum(["all", "active", "retired"]).optional(),
        ultimate_only: z.boolean().optional(),
        date_preset: z.enum(["all", "7d", "30d", "90d"]).optional(),
        sort: z
          .enum(["shuffle", "newest", "oldest", "longest_running", "impressions", "ultimate_winner"])
          .optional(),
        limit: mcpLimitSchema(MCP_PAGE_MAX, 50),
        offset: mcpOffsetSchema(),
        include_full_copy: mcpIncludeFullCopySchema(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("search_discovery_ads", ctx, (c) => mcpSearchDiscoveryAds(c, input));
    },
  );

  server.registerTool(
    "get_discovery_feed",
    {
      title: "Get discovery feed",
      description:
        "Browse the Discovery feed with sort and filters (no keyword required). Returns paginated Meta ads, competitor chips, and market_stats for the workspace.",
      inputSchema: {
        brand_id: z.string().optional(),
        query: z.string().optional(),
        competitor: z.string().optional(),
        competitors: z.array(z.string()).optional(),
        format: z.enum(["all", "video", "image"]).optional(),
        status: z.enum(["all", "active", "retired"]).optional(),
        ultimate_only: z.boolean().optional(),
        date_preset: z.enum(["all", "7d", "30d", "90d"]).optional(),
        sort: z
          .enum(["shuffle", "newest", "oldest", "longest_running", "impressions", "ultimate_winner"])
          .optional(),
        limit: mcpLimitSchema(MCP_PAGE_MAX, 50),
        offset: mcpOffsetSchema(),
        include_full_copy: mcpIncludeFullCopySchema(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("get_discovery_feed", ctx, (c) => mcpGetDiscoveryFeed(c, input));
    },
  );

  server.registerTool(
    "get_discovery_market_stats",
    {
      title: "Get discovery market stats",
      description:
        "Market pulse for Discovery: total/active ads, new this week, ultimate winners, video share, hottest competitor. Optional competitor filter.",
      inputSchema: {
        brand_id: z.string().optional(),
        competitor: z.string().optional(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("get_discovery_market_stats", ctx, (c) => mcpGetDiscoveryMarketStats(c, input));
    },
  );

  server.registerTool(
    "get_discovery_patterns",
    {
      title: "Get discovery patterns",
      description:
        "Latest weekly AI market-pattern report for the workspace: headline, market temperature, patterns, winners playbook, graveyard lessons, recommended tests, and 12-week metrics history.",
      inputSchema: {
        brand_id: z.string().optional(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("get_discovery_patterns", ctx, (c) => mcpGetDiscoveryPatterns(c, input));
    },
  );

  server.registerTool(
    "analyze_discovery_keywords",
    {
      title: "Analyze discovery keywords",
      description:
        "Term frequency analysis across all ads in Discovery scope. Returns top terms with ad counts, competitor spread, ultimate-winner count, and sample ad ids. Optional seed_terms to force-include specific hooks/offers.",
      inputSchema: {
        brand_id: z.string().optional(),
        seed_terms: z.array(z.string()).optional(),
        min_ad_count: z.number().int().min(1).max(20).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        status: z.enum(["all", "active", "retired"]).optional(),
        ultimate_only: z.boolean().optional(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("analyze_discovery_keywords", ctx, (c) => mcpAnalyzeDiscoveryKeywords(c, input));
    },
  );

  server.registerTool(
    "get_discovery_competitors",
    {
      title: "Get discovery competitors",
      description:
        "Competitor breakdown in Discovery scope: ad counts, active ads, ultimate winners, video ads, and newest launch date per competitor.",
      inputSchema: {
        brand_id: z.string().optional(),
        limit: mcpLimitSchema(200, 50),
        offset: mcpOffsetSchema(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("get_discovery_competitors", ctx, (c) => mcpGetDiscoveryCompetitors(c, input));
    },
  );

  server.registerTool(
    "get_discovery_ad",
    {
      title: "Get discovery ad",
      description: "Fetch one Meta ad from Discovery by scraped_ads UUID. Returns full copy, performance signals, and links.",
      inputSchema: {
        ad_id: z.string().min(1),
        brand_id: z.string().optional(),
        include_full_copy: mcpIncludeFullCopySchema(),
      },
    },
    async (input) => {
      const ctx = await buildContext();
      return runTool("get_discovery_ad", ctx, (c) => mcpGetDiscoveryAd(c, input));
    },
  );
}
