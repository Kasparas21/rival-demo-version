import type { SupabaseClient } from "@supabase/supabase-js";

import { stripJsonFences } from "@/lib/email-intelligence/analyze";
import { resolveModelForTask } from "@/lib/llm/model-routing";
import { McpToolError } from "@/lib/mcp/errors";
import { createMcpToolContext } from "@/lib/mcp/tool-context";
import type { McpAuthContext } from "@/lib/mcp/types";
import type { Database } from "@/lib/supabase/types";
import {
  mcpAnalyzeDiscoveryKeywords,
  mcpGetDiscoveryAd,
  mcpGetDiscoveryCompetitors,
  mcpGetDiscoveryFeed,
  mcpGetDiscoveryMarketStats,
  mcpGetDiscoveryPatterns,
  mcpSearchDiscoveryAds,
} from "@/lib/mcp/tools/discovery-tools";

import {
  discoveryAssistantResponseSchema,
  type DiscoveryAssistantAdRef,
  type DiscoveryAssistantMessage,
  type DiscoveryAssistantResponse,
  type DiscoveryVisualStat,
} from "./discovery-assistant-types";
import { loadDiscoveryAdsByIds } from "./load-discovery-ads-by-ids";
import type { DiscoveryAdDto, DiscoveryMarketStats } from "./types";

const MAX_TOOL_ROUNDS = 6;
const MAX_ADS_IN_TOOL_PAYLOAD = 25;
const MAX_TOOL_JSON_CHARS = 14_000;

const SYSTEM_PROMPT = `You are the Spy-Rival Discovery assistant — a visual competitive intelligence copilot for Meta ads.

The UI shows FULL AD CREATIVES (video/image) inline. Users watch and save ads directly in chat. Your text is secondary.

CRITICAL OUTPUT RULES:
- Respond with ONLY a single valid JSON object. No markdown, no tables, no prose before or after the JSON.
- "message": MAX 2 short sentences (under 200 chars total). No bullet lists, no headers, no tables in message.
- "visual_stats": 3-5 punchy stat chips, e.g. [{"label":"Video implant ads","value":"97","tone":"hot"},{"label":"Market temp","value":"Cooling ↓32%","tone":"down"}]
- "ad_refs": REQUIRED — include 8-12 ad objects from your tool results. Each: {"id":"<uuid from tool>","competitor_name":"...","preview":"<first 80 chars of ad copy>"}
- "highlight_ad_ids": same ids as ad_refs
- "filter_patch": apply relevant filters so the feed matches
- "suggestions": 3 short follow-up prompts

Use tools for real data. Never invent ad ids or counts.
sort options: shuffle, newest, impressions, ultimate_winner, longest_running, oldest.

JSON schema:
{
  "message": "2 sentences max",
  "visual_stats": [{"label":"...","value":"...","tone":"up|down|neutral|hot"}],
  "filter_patch": { optional },
  "highlight_ad_ids": ["uuid", ...],
  "ad_refs": [{"id","competitor_name","preview"}],
  "suggestions": ["...", ...]
}`;

type OpenRouterTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

const DISCOVERY_TOOLS: OpenRouterTool[] = [
  {
    type: "function",
    function: {
      name: "search_discovery_ads",
      description: "Search discovery ads by keywords in ad copy, hooks, and competitor names. Supports filters.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Primary search text" },
          keywords: { type: "array", items: { type: "string" }, description: "Additional keywords (match any by default)" },
          match: { type: "string", enum: ["any", "all"] },
          competitor: { type: "string" },
          competitors: { type: "array", items: { type: "string" } },
          format: { type: "string", enum: ["all", "video", "image"] },
          status: { type: "string", enum: ["all", "active", "retired"] },
          ultimate_only: { type: "boolean" },
          date_preset: { type: "string", enum: ["all", "7d", "30d", "90d"] },
          sort: { type: "string" },
          limit: { type: "number" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_discovery_feed",
      description: "Browse the discovery feed with sort and filters without a keyword requirement.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          competitor: { type: "string" },
          format: { type: "string", enum: ["all", "video", "image"] },
          status: { type: "string", enum: ["all", "active", "retired"] },
          ultimate_only: { type: "boolean" },
          date_preset: { type: "string", enum: ["all", "7d", "30d", "90d"] },
          sort: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_discovery_market_stats",
      description: "Market pulse stats: totals, new this week, ultimate winners, video share, hottest competitor.",
      parameters: {
        type: "object",
        properties: { competitor: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_discovery_patterns",
      description: "Latest weekly AI pattern report with market temperature, patterns, and recommended tests.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_discovery_keywords",
      description: "Frequency analysis of terms across all discovery ads. Great for finding dominant hooks/offers.",
      parameters: {
        type: "object",
        properties: {
          seed_terms: { type: "array", items: { type: "string" } },
          min_ad_count: { type: "number" },
          limit: { type: "number" },
          status: { type: "string", enum: ["all", "active", "retired"] },
          ultimate_only: { type: "boolean" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_discovery_competitors",
      description: "Competitor breakdown in discovery scope: ad counts, winners, video share, newest launch.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_discovery_ad",
      description: "Fetch full details for one ad by UUID.",
      parameters: {
        type: "object",
        properties: { ad_id: { type: "string" } },
        required: ["ad_id"],
      },
    },
  },
];

function compactToolResultForModel(result: unknown): string {
  if (!result || typeof result !== "object") return JSON.stringify(result);
  const r = result as Record<string, unknown>;
  if (r.ok !== true) return JSON.stringify(result);

  const compact: Record<string, unknown> = { ok: true };
  for (const key of ["brand_id", "query", "keywords", "market_stats", "pagination", "applied_filters"] as const) {
    if (r[key] !== undefined) compact[key] = r[key];
  }

  if (Array.isArray(r.ads)) {
    const ads = r.ads as Array<Record<string, unknown>>;
    compact.ads_total = ads.length;
    compact.ads = ads.slice(0, MAX_ADS_IN_TOOL_PAYLOAD).map((ad) => ({
      id: ad.id,
      competitor_id: ad.competitor_id,
      competitor_name: ad.competitor_name,
      format: ad.format,
      ad_text: String(ad.ad_text ?? "").slice(0, 120),
      impressions_index: ad.impressions_index ?? null,
      is_ultimate_winner: ad.is_ultimate_winner ?? false,
      is_killed: ad.is_killed ?? false,
    }));
    if (ads.length > MAX_ADS_IN_TOOL_PAYLOAD) compact.ads_truncated = true;
  }

  let json = JSON.stringify(compact);
  if (json.length > MAX_TOOL_JSON_CHARS && Array.isArray(compact.ads)) {
    compact.ads = (compact.ads as Array<Record<string, unknown>>).map((ad) => ({
      id: ad.id,
      competitor_name: ad.competitor_name,
      format: ad.format,
    }));
    json = JSON.stringify(compact);
  }
  return json;
}

async function executeDiscoveryTool(
  ctx: Awaited<ReturnType<typeof createMcpToolContext>>,
  brandId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const withBrand = { ...args, brand_id: brandId };
  try {
    switch (name) {
      case "search_discovery_ads": {
        const searchArgs = withBrand as Parameters<typeof mcpSearchDiscoveryAds>[1];
        return await mcpSearchDiscoveryAds(ctx, {
          ...searchArgs,
          sort: searchArgs.sort ?? "newest",
          limit: Math.min(Math.max(Number(searchArgs.limit) || 50, 1), 50),
        });
      }
      case "get_discovery_feed":
        return await mcpGetDiscoveryFeed(ctx, withBrand as Parameters<typeof mcpGetDiscoveryFeed>[1]);
      case "get_discovery_market_stats":
        return await mcpGetDiscoveryMarketStats(ctx, withBrand as Parameters<typeof mcpGetDiscoveryMarketStats>[1]);
      case "get_discovery_patterns":
        return await mcpGetDiscoveryPatterns(ctx, withBrand as Parameters<typeof mcpGetDiscoveryPatterns>[1]);
      case "analyze_discovery_keywords":
        return await mcpAnalyzeDiscoveryKeywords(ctx, withBrand as Parameters<typeof mcpAnalyzeDiscoveryKeywords>[1]);
      case "get_discovery_competitors":
        return await mcpGetDiscoveryCompetitors(ctx, withBrand as Parameters<typeof mcpGetDiscoveryCompetitors>[1]);
      case "get_discovery_ad":
        return await mcpGetDiscoveryAd(ctx, withBrand as Parameters<typeof mcpGetDiscoveryAd>[1]);
      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    if (err instanceof McpToolError) return err.toBody();
    const message = err instanceof Error ? err.message : "Tool execution failed";
    return { ok: false, code: "internal_error", message };
  }
}

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
  name?: string;
};

async function openRouterChat(messages: ChatMessage[], tools: OpenRouterTool[], model: string) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(process.env.OPENROUTER_HTTP_REFERER?.trim()
        ? { "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER.trim() }
        : {}),
      "X-Title": process.env.OPENROUTER_APP_TITLE?.trim() ?? "Rival",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      messages,
      tools,
      tool_choice: "auto",
    }),
  });

  const body = await response.text().catch(() => "");
  if (!response.ok) {
    throw new Error(`OpenRouter failed (${response.status}): ${body.slice(0, 300)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error(
      body.trim().slice(0, 300) || `OpenRouter returned invalid JSON (${response.status})`,
    );
  }

  return parsed as {
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
      };
    }>;
  };
}

function extractJsonPayload(text: string): string {
  const stripped = stripJsonFences(text).trim();
  try {
    JSON.parse(stripped);
    return stripped;
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const candidate = stripped.slice(start, end + 1);
      JSON.parse(candidate);
      return candidate;
    }
    throw new Error("No JSON object in model response");
  }
}

function sanitizeDisplayMessage(text: string): string {
  let s = text.trim();
  s = s.replace(/\{[\s\S]*"message"\s*:[\s\S]*\}\s*$/m, "").trim();
  s = s.replace(/^#{1,3}\s+.+$/gm, "").trim();
  s = s.replace(/\|.+\|/g, "").trim();
  s = s.replace(/\n{3,}/g, "\n\n");
  if (s.length > 240) s = `${s.slice(0, 237)}…`;
  return s;
}

function parseAssistantJson(text: string): DiscoveryAssistantResponse {
  const parsed = JSON.parse(extractJsonPayload(text));
  const result = discoveryAssistantResponseSchema.parse(parsed);
  return {
    ...result,
    message: sanitizeDisplayMessage(result.message),
  };
}

function harvestFromToolResult(result: unknown, bucket: {
  adIds: string[];
  marketStats: DiscoveryMarketStats | null;
}) {
  if (!result || typeof result !== "object") return;
  const r = result as Record<string, unknown>;
  if (r.ok !== true) return;

  if (r.market_stats && typeof r.market_stats === "object") {
    bucket.marketStats = r.market_stats as DiscoveryMarketStats;
  }

  const ads = r.ads;
  if (!Array.isArray(ads)) return;
  for (const ad of ads) {
    if (ad && typeof ad === "object" && "id" in ad) {
      const id = String((ad as { id: unknown }).id).trim();
      if (id) bucket.adIds.push(id);
    }
  }
}

function buildVisualStatsFromMarket(stats: DiscoveryMarketStats): DiscoveryVisualStat[] {
  const chips: DiscoveryVisualStat[] = [
    { label: "Total ads", value: String(stats.total_ads), tone: "neutral" },
    { label: "Active", value: String(stats.active_ads), tone: "up" },
    { label: "New this week", value: String(stats.new_this_week), tone: stats.new_this_week > 0 ? "hot" : "neutral" },
  ];
  if (stats.video_percent != null) {
    chips.push({ label: "Video share", value: `${Math.round(stats.video_percent)}%`, tone: "neutral" });
  }
  if (stats.hottest_competitor_name) {
    chips.push({
      label: "Hottest",
      value: stats.hottest_competitor_name,
      tone: "hot",
    });
  }
  return chips.slice(0, 5);
}

async function enrichAssistantResponse(
  supabase: SupabaseClient<Database>,
  userId: string,
  response: DiscoveryAssistantResponse,
  harvestedAdIds: string[],
  harvestedMarketStats: DiscoveryMarketStats | null,
): Promise<DiscoveryAssistantResponse> {
  const ids = [
    ...new Set([
      ...harvestedAdIds,
      ...(response.ad_refs?.map((a) => a.id) ?? []),
      ...(response.highlight_ad_ids ?? []),
    ]),
  ].slice(0, 12);

  const loadedAds = ids.length ? await loadDiscoveryAdsByIds(supabase, userId, ids) : [];
  const discovery_ads = loadedAds.map((ad) => ({ ...ad, raw_payload: {} }));

  const ad_refs: DiscoveryAssistantAdRef[] = discovery_ads.map((ad) => ({
    id: ad.id,
    competitor_name: ad.competitor_name,
    preview: ad.ad_text.trim().slice(0, 80) || "Ad",
    format: ad.format,
    creative_url: ad.ad_creative_url ?? ad.archived_creative_url ?? null,
    competitor_logo_url: ad.competitor_logo_url,
    is_ultimate_winner: ad.is_ultimate_winner,
    is_active: ad.is_active && !ad.is_killed,
    impressions_index: ad.impressions_index,
  }));

  const market_stats = harvestedMarketStats ?? response.market_stats;
  const visual_stats =
    response.visual_stats?.length
      ? response.visual_stats
      : market_stats
        ? buildVisualStatsFromMarket(market_stats)
        : undefined;

  return {
    ...response,
    ad_refs,
    highlight_ad_ids: ids,
    discovery_ads,
    market_stats: market_stats ?? undefined,
    visual_stats,
  };
}

export async function runDiscoveryAssistant(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  brandId: string;
  brandName: string;
  message: string;
  history?: DiscoveryAssistantMessage[];
  appOrigin: string;
  currentTab?: string;
  currentFilters?: Record<string, unknown>;
}): Promise<DiscoveryAssistantResponse> {
  const auth: McpAuthContext = {
    userId: params.userId,
    appOrigin: params.appOrigin,
    authMethod: "api_key",
  };
  const ctx = await createMcpToolContext(auth);

  const route = resolveModelForTask("discovery_chat");
  const contextBlock = JSON.stringify({
    brand_id: params.brandId,
    brand_name: params.brandName,
    current_tab: params.currentTab ?? "explore",
    current_filters: params.currentFilters ?? {},
  });

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Workspace context: ${contextBlock}\n\nUser message: ${params.message.trim()}`,
    },
  ];

  for (const h of (params.history ?? []).slice(-8)) {
    messages.splice(messages.length - 1, 0, { role: h.role, content: h.content });
  }

  let lastText = "";
  const harvest = { adIds: [] as string[], marketStats: null as DiscoveryMarketStats | null };

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const result = await openRouterChat(messages, DISCOVERY_TOOLS, route.model);
    const choice = result.choices?.[0]?.message;
    if (!choice) throw new Error("Empty model response");

    if (choice.tool_calls?.length) {
      messages.push({
        role: "assistant",
        content: choice.content ?? "",
        tool_calls: choice.tool_calls,
      });

      for (const call of choice.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments) as Record<string, unknown>;
        } catch {
          args = {};
        }
        const toolResult = await executeDiscoveryTool(ctx, params.brandId, call.function.name, args);
        harvestFromToolResult(toolResult, harvest);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: compactToolResultForModel(toolResult),
        });
      }
      continue;
    }

    lastText = (choice.content ?? "").trim();
    break;
  }

  if (!lastText) {
    messages.push({
      role: "user",
      content:
        "Output ONLY valid JSON per schema. No markdown. Include 8-12 ad_refs from tool results with real ids.",
    });
    const final = await openRouterChat(messages, [], route.model);
    lastText = (final.choices?.[0]?.message?.content ?? "").trim();
  }

  try {
    const parsed = parseAssistantJson(lastText);
    return enrichAssistantResponse(
      params.supabase,
      params.userId,
      parsed,
      harvest.adIds,
      harvest.marketStats,
    );
  } catch {
    if (harvest.adIds.length) {
      return enrichAssistantResponse(
        params.supabase,
        params.userId,
        {
          message: "Here are the matching ads from your market.",
          suggestions: ["Show more like these", "Which competitor is hottest this week?"],
        },
        harvest.adIds,
        harvest.marketStats,
      );
    }
    return {
      message: sanitizeDisplayMessage(lastText) || "Try a more specific question about keywords, competitors, or ad format.",
      suggestions: ["Show video ads about implants", "What are the top keywords this week?"],
    };
  }
}

export async function runDiscoveryAssistantForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: {
    brandId: string;
    brandName: string;
    message: string;
    history?: DiscoveryAssistantMessage[];
    currentTab?: string;
    currentFilters?: Record<string, unknown>;
  },
  appOrigin: string,
): Promise<DiscoveryAssistantResponse> {
  return runDiscoveryAssistant({
    supabase,
    userId,
    brandId: input.brandId,
    brandName: input.brandName,
    message: input.message,
    history: input.history,
    appOrigin,
    currentTab: input.currentTab,
    currentFilters: input.currentFilters,
  });
}
