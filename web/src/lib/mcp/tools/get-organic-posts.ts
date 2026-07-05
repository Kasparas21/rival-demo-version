import { McpToolError, mcpSuccess } from "@/lib/mcp/errors";
import { MCP_EMPTY_NO_ORGANIC } from "@/lib/mcp/empty-states";
import { buildMcpPagination, parseMcpPage } from "@/lib/mcp/pagination";
import { requireCompetitor } from "@/lib/mcp/resolve-competitor";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { truncateAdCopy } from "@/lib/mcp/truncate";
import { mcpDashboardUrl } from "@/lib/mcp/urls";
import { toOrganicPostClientPayload } from "@/lib/organic-content/post-display";
import type { OrganicPlatform, OrganicPostSort } from "@/lib/organic-content/types";

const VALID_PLATFORMS = new Set([
  "linkedin",
  "twitter",
  "instagram",
  "tiktok",
  "facebook",
  "youtube",
]);

function formatPostForMcp(
  post: ReturnType<typeof toOrganicPostClientPayload>,
  includeFullText: boolean,
) {
  const content = includeFullText
    ? { text: (post.content ?? "").trim(), truncated: false }
    : truncateAdCopy(post.content ?? "", 500);
  return {
    id: post.id,
    post_id: post.post_id,
    platform: post.platform,
    content: content.text,
    truncated: content.truncated,
    likes: post.likes,
    comments: post.comments,
    shares: post.shares,
    views: post.views,
    posted_at: post.posted_at,
    post_url: post.post_url,
    author_display_name: post.author_display_name,
    author_username: post.author_username,
    media_urls: (post.media_urls ?? []).slice(0, 3),
    product_type: post.product_type,
  };
}

export async function getOrganicPosts(
  ctx: McpToolContext,
  input: {
    competitor: string;
    platform?: string;
    sort?: OrganicPostSort;
    limit?: number;
    offset?: number;
    include_full_text?: boolean;
  },
) {
  const comp = await requireCompetitor(ctx.supabase, ctx.auth.userId, input.competitor);
  const { limit, offset } = parseMcpPage(input, { defaultLimit: 50, maxLimit: 200 });
  const sort = input.sort === "likes" || input.sort === "comments" ? input.sort : "recent";
  const platformRaw = input.platform?.trim().toLowerCase() ?? "";

  let query = ctx.supabase
    .from("organic_posts")
    .select("*", { count: "exact" })
    .eq("competitor_id", comp.id)
    .eq("user_id", ctx.auth.userId);

  if (platformRaw && platformRaw !== "all" && VALID_PLATFORMS.has(platformRaw)) {
    query = query.eq("platform", platformRaw as OrganicPlatform);
  }

  if (sort === "likes") {
    query = query.order("likes", { ascending: false });
  } else if (sort === "comments") {
    query = query.order("comments", { ascending: false });
  } else {
    query = query.order("posted_at", { ascending: false, nullsFirst: false });
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw error;

  const { data: platformRows } = await ctx.supabase
    .from("organic_posts")
    .select("platform")
    .eq("competitor_id", comp.id)
    .eq("user_id", ctx.auth.userId);

  const platformsWithPosts = [...new Set((platformRows ?? []).map((r) => r.platform))];
  const includeFullText = input.include_full_text === true;
  const posts = (data ?? []).map((row) =>
    formatPostForMcp(toOrganicPostClientPayload(row), includeFullText),
  );

  return mcpSuccess({
    competitor: { id: comp.id, name: comp.name, domain: comp.domain },
    sort,
    platform: platformRaw || "all",
    platforms_with_posts: platformsWithPosts,
    posts,
    pagination: buildMcpPagination(count ?? 0, limit, offset),
    ...(posts.length === 0 ? { message: MCP_EMPTY_NO_ORGANIC } : {}),
    dashboard_url: mcpDashboardUrl(ctx.auth.appOrigin, comp.domain, "tab=organic"),
  });
}

export async function getOrganicInsights(
  ctx: McpToolContext,
  input: { competitor: string; platform?: string },
) {
  const comp = await requireCompetitor(ctx.supabase, ctx.auth.userId, input.competitor);
  const platform = input.platform?.trim() || "all";

  const { data: insight, error } = await ctx.supabase
    .from("organic_insights")
    .select(
      "generated_at, whats_working, whats_flopping, top_collaborators, hot_right_now, metrics_overview, platform",
    )
    .eq("competitor_id", comp.id)
    .eq("user_id", ctx.auth.userId)
    .eq("platform", platform)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!insight) {
    throw new McpToolError(
      "no_data",
      "No organic insights cached yet — scrape organic posts in the dashboard first.",
      mcpDashboardUrl(ctx.auth.appOrigin, comp.domain, "tab=organic"),
    );
  }

  return mcpSuccess({
    competitor: { id: comp.id, name: comp.name, domain: comp.domain },
    platform,
    generated_at: insight.generated_at,
    whats_working: insight.whats_working,
    whats_flopping: insight.whats_flopping,
    top_collaborators: insight.top_collaborators,
    hot_right_now: insight.hot_right_now,
    metrics_overview: insight.metrics_overview,
    dashboard_url: mcpDashboardUrl(ctx.auth.appOrigin, comp.domain, "tab=organic"),
  });
}
