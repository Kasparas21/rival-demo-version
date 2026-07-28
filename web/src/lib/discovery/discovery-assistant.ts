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
import type { DiscoveryAssistantAttachmentInput } from "./discovery-assistant-attachments";
import {
  buildDiscoveryAssistantUserContext,
  historyContentWithContext,
} from "./discovery-assistant-context";
import { loadDiscoveryAdsByIds } from "./load-discovery-ads-by-ids";
import type { DiscoveryAdDto, DiscoveryMarketStats } from "./types";

const MAX_TOOL_ROUNDS = 5;
const MAX_ADS_IN_TOOL_PAYLOAD = 25;
const MAX_TOOL_JSON_CHARS = 14_000;
const OPENROUTER_TIMEOUT_MS = 90_000;
const OPENROUTER_MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
For specific product/treatment searches (e.g. aligners, implants, whitening), pass ALL distinguishing keywords with match:"all" — do not use broad single words like "dental" alone.
Pick ad_refs from the most relevant tool results (highest keyword overlap). Include real ad copy in each preview field.
sort options: shuffle, newest, impressions, ultimate_winner, longest_running, oldest.

When USER-SELECTED ADS or USER FILE ATTACHMENTS are in the message:
- Answer about those specific ads/files first. For creative ideation, propose fresh angles inspired by the selected ad (hook, offer, visual style) without copying it.
- ad_refs are optional in this mode unless the user also wants similar ads from the market — then search and include 4-8 relevant refs.
- visual_stats optional when not doing a market search.

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
          include_full_copy: true,
          sort: searchArgs.sort ?? "impressions",
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

type OpenRouterChatResult = {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
    };
  }>;
};

function parseOpenRouterResponseBody(body: string, status: number): OpenRouterChatResult {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error(`OpenRouter returned empty body (${status})`);
  }

  try {
    return JSON.parse(trimmed) as OpenRouterChatResult;
  } catch {
    // Some providers occasionally return SSE chunks even when stream=false.
    if (trimmed.includes("data:")) {
      const chunks = trimmed
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .filter((line) => line && line !== "[DONE]");

      for (let i = chunks.length - 1; i >= 0; i--) {
        try {
          return JSON.parse(chunks[i]!) as OpenRouterChatResult;
        } catch {
          /* try previous chunk */
        }
      }
    }

    throw new Error(trimmed.slice(0, 300) || `OpenRouter returned invalid JSON (${status})`);
  }
}

async function openRouterChat(messages: ChatMessage[], tools: OpenRouterTool[], model: string) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < OPENROUTER_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(OPENROUTER_TIMEOUT_MS),
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
          stream: false,
          max_tokens: tools.length ? 1536 : 2048,
          messages,
          tools: tools.length ? tools : undefined,
          tool_choice: tools.length ? "auto" : undefined,
        }),
      });

      const body = await response.text().catch(() => "");
      if (!response.ok) {
        throw new Error(`OpenRouter failed (${response.status}): ${body.slice(0, 300)}`);
      }

      return parseOpenRouterResponseBody(body, response.status);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < OPENROUTER_MAX_RETRIES - 1) {
        await sleep(400 * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError ?? new Error("OpenRouter request failed");
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

function buildHarvestFallbackResponse(
  userMessage: string,
  harvest: { adIds: string[]; marketStats: DiscoveryMarketStats | null },
  selectedAdsCount: number,
): DiscoveryAssistantResponse {
  const count = harvest.adIds.length;
  const wantsUltimate = /\bultimate\b/i.test(userMessage);

  if (selectedAdsCount && !count) {
    return {
      message: "Here are creative directions based on your selected ad.",
      suggestions: [
        "Give me 3 more creative angles",
        "Find similar ads in the market",
        "Which competitor runs the most?",
      ],
    };
  }

  if (count > 0) {
    const label = wantsUltimate ? "ultimate winner" : "matching";
    return {
      message: `Found ${count} ${label} ads for your query.`,
      filter_patch: wantsUltimate ? { ultimateOnly: true } : undefined,
      suggestions: [
        "Show only video ads",
        "Which competitor runs the most?",
        "Compare video vs image share",
      ],
    };
  }

  return {
    message: "I couldn't format a full answer, but try refining your keywords or filters.",
    suggestions: [
      "Show video ads about implants",
      "What are the top keywords this week?",
      "Show ultimate winners",
    ],
  };
}

async function finalizeAssistantResponse(
  supabase: SupabaseClient<Database>,
  userId: string,
  params: {
    lastText: string;
    messages: ChatMessage[];
    model: string;
    harvest: { adIds: string[]; marketStats: DiscoveryMarketStats | null };
    selectedAds: DiscoveryAdDto[];
    userMessage: string;
  },
): Promise<DiscoveryAssistantResponse> {
  const mergedHarvestIds = [...params.harvest.adIds, ...params.selectedAds.map((ad) => ad.id)];

  let lastText = params.lastText;
  if (!lastText) {
    params.messages.push({
      role: "user",
      content:
        "Using the tool results above, output ONLY one valid JSON object per the schema. Include ad_refs with real ids from tool results.",
    });
    try {
      const final = await openRouterChat(params.messages, [], params.model);
      lastText = (final.choices?.[0]?.message?.content ?? "").trim();
    } catch {
      lastText = "";
    }
  }

  if (lastText) {
    try {
      const parsed = parseAssistantJson(lastText);
      return enrichAssistantResponse(
        supabase,
        userId,
        parsed,
        mergedHarvestIds,
        params.harvest.marketStats,
      );
    } catch {
      /* fall through to harvest fallback */
    }
  }

  if (mergedHarvestIds.length) {
    return enrichAssistantResponse(
      supabase,
      userId,
      buildHarvestFallbackResponse(params.userMessage, params.harvest, params.selectedAds.length),
      mergedHarvestIds,
      params.harvest.marketStats,
    );
  }

  return {
    message:
      sanitizeDisplayMessage(lastText) ||
      "Try a more specific question about keywords, competitors, or ad format.",
    suggestions: ["Show video ads about implants", "What are the top keywords this week?"],
  };
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
  const discovery_ads = loadedAds;

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
  selectedAdIds?: string[];
  attachments?: DiscoveryAssistantAttachmentInput[];
}): Promise<DiscoveryAssistantResponse> {
  const auth: McpAuthContext = {
    userId: params.userId,
    appOrigin: params.appOrigin,
    authMethod: "api_key",
  };
  const ctx = await createMcpToolContext(auth);

  const route = resolveModelForTask("discovery_chat");
  const { enrichedMessage, selectedAds, contextSummary } = await buildDiscoveryAssistantUserContext({
    supabase: params.supabase,
    userId: params.userId,
    message: params.message,
    selectedAdIds: params.selectedAdIds,
    attachments: params.attachments,
  });

  const contextBlock = JSON.stringify({
    brand_id: params.brandId,
    brand_name: params.brandName,
    current_tab: params.currentTab ?? "explore",
    current_filters: params.currentFilters ?? {},
    selected_ad_count: selectedAds.length,
    attachment_count: params.attachments?.length ?? 0,
  });

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Workspace context: ${contextBlock}\n\n${enrichedMessage}`,
    },
  ];

  for (const h of (params.history ?? []).slice(-8)) {
    const historyContent =
      h.role === "user"
        ? historyContentWithContext(h.content, h.contextSummary, h.selectedAdIds)
        : h.content;
    messages.splice(messages.length - 1, 0, { role: h.role, content: historyContent });
  }

  let lastText = "";
  const harvest = { adIds: [] as string[], marketStats: null as DiscoveryMarketStats | null };

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let result: OpenRouterChatResult;
    try {
      result = await openRouterChat(messages, DISCOVERY_TOOLS, route.model);
    } catch (err) {
      if (harvest.adIds.length || selectedAds.length) break;
      throw err;
    }

    const choice = result.choices?.[0]?.message;
    if (!choice) {
      if (harvest.adIds.length || selectedAds.length) break;
      throw new Error("Empty model response");
    }

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

  return finalizeAssistantResponse(params.supabase, params.userId, {
    lastText,
    messages,
    model: route.model,
    harvest,
    selectedAds,
    userMessage: params.message,
  });
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
    selectedAdIds?: string[];
    attachments?: DiscoveryAssistantAttachmentInput[];
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
    selectedAdIds: input.selectedAdIds,
    attachments: input.attachments,
  });
}
