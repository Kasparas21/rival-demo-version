import type { SupabaseClient } from "@supabase/supabase-js";

import { stripJsonFences } from "@/lib/email-intelligence/analyze";
import { resolveModelForTask } from "@/lib/llm/model-routing";
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

import { buildDiscoveryFeed } from "./build-discovery-feed";
import {
  discoveryAssistantResponseSchema,
  type DiscoveryAssistantAdRef,
  type DiscoveryAssistantMessage,
  type DiscoveryAssistantResponse,
} from "./discovery-assistant-types";

const MAX_TOOL_ROUNDS = 6;

const SYSTEM_PROMPT = `You are Claude, a senior competitive intelligence analyst embedded in Spy-Rival's Discovery feed. You help agency users search, filter, and interpret Meta ads from their tracked competitors.

You have tools to search ads by keywords, browse the discovery feed with filters, analyze keyword frequency, compare competitors, read weekly pattern reports, and fetch individual ads.

Rules:
- Use tools to answer with real data — never invent ad counts, competitor names, or copy.
- When the user wants to see ads in the UI, include a filter_patch in your final JSON response.
- filter_patch can set: search, sort, format, status, datePreset, ultimateOnly, competitorNames, tab.
- For keyword searches, set filter_patch.search to the main keyword(s) joined by space.
- Reference specific ad ids from tool results in highlight_ad_ids and ad_refs (preview = first 120 chars).
- Be concise, punchy, and actionable. Agency users want creative/market insights, not fluff.
- If asked about patterns/trends, call get_discovery_patterns first.
- sort options: shuffle, newest, impressions, ultimate_winner, longest_running, oldest.

After using tools, respond with ONLY valid JSON:
{
  "message": "your analysis for the user",
  "filter_patch": { optional filters to apply in UI },
  "highlight_ad_ids": ["uuid", ...],
  "ad_refs": [{ "id", "competitor_name", "preview" }],
  "suggestions": ["follow-up question 1", ...]
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

async function executeDiscoveryTool(
  ctx: Awaited<ReturnType<typeof createMcpToolContext>>,
  brandId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const withBrand = { ...args, brand_id: brandId };
  switch (name) {
    case "search_discovery_ads":
      return mcpSearchDiscoveryAds(ctx, withBrand as Parameters<typeof mcpSearchDiscoveryAds>[1]);
    case "get_discovery_feed":
      return mcpGetDiscoveryFeed(ctx, withBrand as Parameters<typeof mcpGetDiscoveryFeed>[1]);
    case "get_discovery_market_stats":
      return mcpGetDiscoveryMarketStats(ctx, withBrand as Parameters<typeof mcpGetDiscoveryMarketStats>[1]);
    case "get_discovery_patterns":
      return mcpGetDiscoveryPatterns(ctx, withBrand as Parameters<typeof mcpGetDiscoveryPatterns>[1]);
    case "analyze_discovery_keywords":
      return mcpAnalyzeDiscoveryKeywords(ctx, withBrand as Parameters<typeof mcpAnalyzeDiscoveryKeywords>[1]);
    case "get_discovery_competitors":
      return mcpGetDiscoveryCompetitors(ctx, withBrand as Parameters<typeof mcpGetDiscoveryCompetitors>[1]);
    case "get_discovery_ad":
      return mcpGetDiscoveryAd(ctx, withBrand as Parameters<typeof mcpGetDiscoveryAd>[1]);
    default:
      return { ok: false, error: `Unknown tool: ${name}` };
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

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenRouter failed (${response.status}): ${body.slice(0, 300)}`);
  }

  return (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
      };
    }>;
  };
}

function parseAssistantJson(text: string): DiscoveryAssistantResponse {
  const parsed = JSON.parse(stripJsonFences(text));
  return discoveryAssistantResponseSchema.parse(parsed);
}

async function enrichAssistantAdRefs(
  supabase: SupabaseClient<Database>,
  userId: string,
  brandId: string,
  response: DiscoveryAssistantResponse,
): Promise<DiscoveryAssistantResponse> {
  const ids = [
    ...new Set([
      ...(response.ad_refs?.map((a) => a.id) ?? []),
      ...(response.highlight_ad_ids ?? []),
    ]),
  ];
  if (!ids.length) return response;

  const feed = await buildDiscoveryFeed(supabase, userId, {
    brandId,
    clientBrandIds: [brandId],
    offset: 0,
    limit: 50_000_000,
    sort: "impressions",
    shuffleSeed: `assistant-enrich:${brandId}`,
    platforms: [],
    format: "all",
    status: "all",
    ultimateOnly: false,
    query: "",
    competitorFilterIds: [],
    datePreset: "all",
  });
  if (!("ads" in feed)) return response;

  const byId = new Map(feed.ads.map((ad) => [ad.id, ad]));
  const enriched: DiscoveryAssistantAdRef[] = [];
  const seen = new Set<string>();

  const push = (id: string, partial?: DiscoveryAssistantAdRef) => {
    if (seen.has(id)) return;
    seen.add(id);
    const ad = byId.get(id);
    if (!ad) {
      if (partial) enriched.push(partial);
      return;
    }
    enriched.push({
      id: ad.id,
      competitor_name: ad.competitor_name,
      preview: (partial?.preview ?? ad.ad_text).trim().slice(0, 160) || "Ad",
      format: ad.format,
      creative_url: ad.ad_creative_url ?? ad.archived_creative_url ?? null,
      competitor_logo_url: ad.competitor_logo_url,
      is_ultimate_winner: ad.is_ultimate_winner,
      is_active: ad.is_active,
      impressions_index: ad.impressions_index,
    });
  };

  for (const ref of response.ad_refs ?? []) push(ref.id, ref);
  for (const id of response.highlight_ad_ids ?? []) push(id);

  return { ...response, ad_refs: enriched.slice(0, 12) };
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
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: JSON.stringify(toolResult),
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
      content: "Summarize your findings as JSON matching the required schema. No markdown.",
    });
    const final = await openRouterChat(messages, [], route.model);
    lastText = (final.choices?.[0]?.message?.content ?? "").trim();
  }

  try {
    const parsed = parseAssistantJson(lastText);
    return enrichAssistantAdRefs(params.supabase, params.userId, params.brandId, parsed);
  } catch {
    return {
      message: lastText || "I couldn't process that request. Try rephrasing or be more specific about keywords or competitors.",
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
