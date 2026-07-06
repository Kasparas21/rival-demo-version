import { OpenRouter } from "@openrouter/sdk";

/** Default model for all OpenRouter-backed features unless OPENROUTER_MODEL is set. */
export const DEFAULT_OPENROUTER_MODEL = "deepseek/deepseek-v4-flash";

export function resolveOpenRouterModel(): string {
  const m = process.env.OPENROUTER_MODEL?.trim();
  return m || DEFAULT_OPENROUTER_MODEL;
}

function resolveChatTimeoutMs(): number {
  const raw = process.env.OPENROUTER_CHAT_TIMEOUT_MS?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 120_000;
}

/** USD per million tokens — OpenRouter list pricing for DeepSeek V4 Flash. */
const DEEPSEEK_V4_FLASH_PRICING = { input: 0.112, output: 0.224 };

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
  const promptTokens =
    typeof o.prompt_tokens === "number"
      ? o.prompt_tokens
      : typeof o.promptTokens === "number"
        ? o.promptTokens
        : undefined;
  const completionTokens =
    typeof o.completion_tokens === "number"
      ? o.completion_tokens
      : typeof o.completionTokens === "number"
        ? o.completionTokens
        : undefined;
  const totalTokens =
    typeof o.total_tokens === "number" ? o.total_tokens : typeof o.totalTokens === "number" ? o.totalTokens : undefined;
  const costUsd = typeof o.cost === "number" ? o.cost : typeof o.total_cost === "number" ? o.total_cost : undefined;
  if (promptTokens == null && completionTokens == null && totalTokens == null && costUsd == null) return undefined;
  return { promptTokens, completionTokens, totalTokens, costUsd };
}

function costForUsage(inputTokens: number, outputTokens: number, apiCostUsd?: number): number {
  if (typeof apiCostUsd === "number" && Number.isFinite(apiCostUsd)) return apiCostUsd;
  return (
    (inputTokens * DEEPSEEK_V4_FLASH_PRICING.input) / 1_000_000 +
    (outputTokens * DEEPSEEK_V4_FLASH_PRICING.output) / 1_000_000
  );
}

function isRateLimitError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const status = "status" in err ? (err as { status?: unknown }).status : null;
  if (status === 429) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /rate.?limit|429|too many requests/i.test(message);
}

function isAuthFailure(err: unknown): boolean {
  const status =
    typeof err === "object" && err !== null && "status" in err ? (err as { status?: unknown }).status : null;
  const message = err instanceof Error ? err.message : String(err);
  return status === 401 || status === 403 || /authentication|invalid.*api.?key|unauthorized/i.test(message);
}

function logOpenRouterAuthFailure(err: unknown): void {
  if (!isAuthFailure(err)) return;
  const key = process.env.OPENROUTER_API_KEY?.trim() ?? "";
  const status =
    typeof err === "object" && err !== null && "status" in err ? (err as { status?: unknown }).status : null;
  const message = err instanceof Error ? err.message : String(err);
  console.error(
    "[openrouter-auth-failure]",
    JSON.stringify({
      type: "auth_error",
      status: typeof status === "number" ? status : null,
      message,
      timestamp: new Date().toISOString(),
      key_length: key.length,
      key_prefix: key.slice(0, 12) || "missing",
    })
  );
}

export type OpenRouterChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type OpenRouterChatTextResult =
  | {
      ok: true;
      text: string;
      model: string;
      usage: { inputTokens: number; outputTokens: number; costUsd: number };
    }
  | { ok: false; error: string };

function buildMessages(params: {
  messages: OpenRouterChatMessage[];
  systemPrompt?: string;
}): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const out: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
  if (params.systemPrompt?.trim()) {
    out.push({ role: "system", content: params.systemPrompt.trim() });
  }
  for (const m of params.messages) {
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

async function sendChatOnce(params: {
  client: OpenRouter;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  maxCompletionTokens: number;
}): Promise<unknown> {
  const chatSend = params.client.chat.send({
    chatRequest: {
      model: params.model,
      maxCompletionTokens: params.maxCompletionTokens,
      messages: params.messages,
      reasoning: { effort: "none" },
    },
  });

  const timeoutMs = resolveChatTimeoutMs();
  const result = await Promise.race([
    chatSend,
    new Promise<"__openrouter_timeout__">((resolve) =>
      setTimeout(() => resolve("__openrouter_timeout__"), timeoutMs)
    ),
  ]);

  if (result === "__openrouter_timeout__") {
    throw new Error(`OpenRouter timeout after ${Math.round(timeoutMs / 1000)}s`);
  }

  return result;
}

function parseChatResult(result: unknown, model: string): OpenRouterChatTextResult {
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
  const inputTokens = usage?.promptTokens ?? 0;
  const outputTokens = usage?.completionTokens ?? 0;
  const costUsd = costForUsage(inputTokens, outputTokens, usage?.costUsd);

  return {
    ok: true,
    text: text.trim(),
    model: resolvedModel,
    usage: { inputTokens, outputTokens, costUsd },
  };
}

/**
 * Non-streaming chat completion; returns assistant text.
 */
export async function openRouterChatText(params: {
  messages: OpenRouterChatMessage[];
  maxTokens?: number;
  maxCompletionTokens?: number;
  model?: string;
  systemPrompt?: string;
}): Promise<OpenRouterChatTextResult> {
  const client = createOpenRouterClient();
  if (!client) {
    return { ok: false, error: "OPENROUTER_API_KEY not configured" };
  }

  const model = params.model ?? resolveOpenRouterModel();
  const maxCompletionTokens = params.maxCompletionTokens ?? params.maxTokens ?? 4096;
  const messages = buildMessages(params);

  try {
    const result = await sendChatOnce({ client, model, messages, maxCompletionTokens });
    return parseChatResult(result, model);
  } catch (err) {
    if (isRateLimitError(err)) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const result = await sendChatOnce({ client, model, messages, maxCompletionTokens });
        return parseChatResult(result, model);
      } catch (retryErr) {
        logOpenRouterAuthFailure(retryErr);
        return {
          ok: false,
          error: retryErr instanceof Error ? retryErr.message : "Retry failed",
        };
      }
    }
    logOpenRouterAuthFailure(err);
    const msg = err instanceof Error ? err.message : "OpenRouter request failed";
    return { ok: false, error: msg };
  }
}

export type OpenRouterVisionImage = {
  label: string;
  base64Png: string;
};

type OpenRouterMultimodalContent =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

/**
 * Vision chat completion with base64 PNG images (OpenRouter multimodal format).
 */
export async function openRouterChatVision(params: {
  model?: string;
  maxTokens?: number;
  images: OpenRouterVisionImage[];
  prompt: string;
  systemPrompt?: string;
}): Promise<OpenRouterChatTextResult> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "OPENROUTER_API_KEY not configured" };
  }

  const model = params.model ?? "anthropic/claude-sonnet-4-6";
  const maxTokens = params.maxTokens ?? 1000;
  const content: OpenRouterMultimodalContent[] = [];

  for (const image of params.images) {
    content.push({ type: "text", text: image.label });
    content.push({
      type: "image_url",
      image_url: { url: `data:image/png;base64,${image.base64Png}` },
    });
  }
  content.push({ type: "text", text: params.prompt });

  const messages: Array<{ role: string; content: OpenRouterMultimodalContent[] | string }> = [];
  if (params.systemPrompt?.trim()) {
    messages.push({ role: "system", content: params.systemPrompt.trim() });
  }
  messages.push({ role: "user", content });

  const httpReferer = process.env.OPENROUTER_HTTP_REFERER?.trim();
  const appTitle = process.env.OPENROUTER_APP_TITLE?.trim() ?? "Rival";

  const controller = new AbortController();
  const timeoutMs = resolveChatTimeoutMs();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(httpReferer ? { "HTTP-Referer": httpReferer } : {}),
        "X-Title": appTitle,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { ok: false, error: `OpenRouter vision failed (${response.status}): ${body.slice(0, 200)}` };
    }

    const result = (await response.json()) as unknown;
    return parseChatResult(result, model);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OpenRouter vision request failed";
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timeout);
  }
}
