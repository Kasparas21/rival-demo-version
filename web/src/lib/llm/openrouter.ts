import { OpenRouter } from "@openrouter/sdk";

/** Default model for all OpenRouter-backed features unless OPENROUTER_MODEL is set. */
export const DEFAULT_OPENROUTER_MODEL = "x-ai/grok-4.3";

export function resolveOpenRouterModel(): string {
  const m = process.env.OPENROUTER_MODEL?.trim();
  return m || DEFAULT_OPENROUTER_MODEL;
}

export type OpenRouterUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  /** Total cost in USD when returned by the API */
  costUsd?: number;
};

function createOpenRouterClient(): OpenRouter | null {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;

  const httpReferer = process.env.OPENROUTER_HTTP_REFERER?.trim();
  const appTitle = process.env.OPENROUTER_APP_TITLE?.trim() ?? "Rival";

  return new OpenRouter({
    apiKey,
    ...(httpReferer ? { httpReferer } : {}),
    appTitle,
  });
}

function assistantContentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const item of content) {
    if (item && typeof item === "object" && "text" in item && typeof (item as { text?: unknown }).text === "string") {
      parts.push((item as { text: string }).text);
    }
  }
  return parts.join("\n");
}

function extractUsage(result: unknown): OpenRouterUsage | undefined {
  if (!result || typeof result !== "object") return undefined;
  const r = result as Record<string, unknown>;
  const u = r.usage;
  if (!u || typeof u !== "object") return undefined;
  const o = u as Record<string, unknown>;
  const promptTokens = typeof o.prompt_tokens === "number" ? o.prompt_tokens : typeof o.promptTokens === "number" ? o.promptTokens : undefined;
  const completionTokens =
    typeof o.completion_tokens === "number"
      ? o.completion_tokens
      : typeof o.completionTokens === "number"
        ? o.completionTokens
        : undefined;
  const totalTokens = typeof o.total_tokens === "number" ? o.total_tokens : typeof o.totalTokens === "number" ? o.totalTokens : undefined;
  const costUsd = typeof o.cost === "number" ? o.cost : typeof o.total_cost === "number" ? o.total_cost : undefined;
  if (promptTokens == null && completionTokens == null && totalTokens == null && costUsd == null) return undefined;
  return { promptTokens, completionTokens, totalTokens, costUsd };
}

export type OpenRouterChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string };

export type OpenRouterChatTextResult =
  | { ok: true; text: string; model: string; usage?: OpenRouterUsage }
  | { ok: false; error: string };

/**
 * Non-streaming chat completion; returns assistant text.
 */
export async function openRouterChatText(params: {
  messages: OpenRouterChatMessage[];
  maxCompletionTokens?: number;
  model?: string;
}): Promise<OpenRouterChatTextResult> {
  const client = createOpenRouterClient();
  if (!client) {
    return { ok: false, error: "OPENROUTER_API_KEY not configured" };
  }

  const model = params.model ?? resolveOpenRouterModel();

  try {
    const result = await client.chat.send({
      chatRequest: {
        model,
        maxCompletionTokens: params.maxCompletionTokens ?? 4096,
        messages: params.messages,
      },
    });

    if (!result || typeof result !== "object" || !("choices" in result)) {
      return { ok: false, error: "Invalid OpenRouter response" };
    }

    const choices = (result as { choices?: unknown }).choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      return { ok: false, error: "Empty choices from OpenRouter" };
    }

    const message = (choices[0] as { message?: { content?: unknown } })?.message;
    const raw = message?.content;
    const text = typeof raw === "string" ? raw : assistantContentToString(raw);

    if (!text.trim()) {
      return { ok: false, error: "No text content from model" };
    }

    const resolvedModel = (result as { model?: string }).model ?? model;
    const usage = extractUsage(result);
    return { ok: true, text: text.trim(), model: resolvedModel, usage };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OpenRouter request failed";
    return { ok: false, error: msg };
  }
}
