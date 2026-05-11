import Anthropic, { RateLimitError } from "@anthropic-ai/sdk";

export type AnthropicChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AnthropicChatTextResult =
  | {
      ok: true;
      text: string;
      model: string;
      usage: { inputTokens: number; outputTokens: number; costUsd: number };
    }
  | { ok: false; error: string };

export const HAIKU_MODEL = "claude-haiku-4-5";
export const SONNET_MODEL = "claude-sonnet-4-6";

/** USD per million tokens — adjust if Anthropic pricing changes. */
const PRICING: Record<string, { input: number; output: number }> = {
  [HAIKU_MODEL]: { input: 1.0, output: 5.0 },
  [SONNET_MODEL]: { input: 3.0, output: 15.0 },
};

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  /** Default SDK timeout can be tight on cold serverless connections; enrichment batches need a healthy margin. */
  cachedClient = new Anthropic({ apiKey, timeout: 120_000 });
  return cachedClient;
}

function textFromResponse(response: Anthropic.Messages.Message): string {
  const parts: string[] = [];
  for (const b of response.content) {
    if (b.type === "text") parts.push(b.text);
  }
  return parts.join("\n").trim();
}

function costForUsage(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model] ?? PRICING[HAIKU_MODEL];
  return (inputTokens * pricing.input) / 1_000_000 + (outputTokens * pricing.output) / 1_000_000;
}

function messageFromResponse(model: string, response: Anthropic.Messages.Message): AnthropicChatTextResult {
  const text = textFromResponse(response);
  if (!text) {
    return { ok: false, error: "No text content in Anthropic response" };
  }
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const costUsd = costForUsage(model, inputTokens, outputTokens);
  return {
    ok: true,
    text,
    model,
    usage: { inputTokens, outputTokens, costUsd },
  };
}

async function callAnthropic(params: {
  model: string;
  messages: AnthropicChatMessage[];
  maxTokens: number;
  systemPrompt?: string;
}): Promise<AnthropicChatTextResult> {
  const client = getClient();
  if (!client) {
    return { ok: false, error: "ANTHROPIC_API_KEY not configured" };
  }

  const createParams: Anthropic.Messages.MessageCreateParams = {
    model: params.model,
    max_tokens: params.maxTokens,
    messages: params.messages,
  };
  if (params.systemPrompt) {
    createParams.system = params.systemPrompt;
  }

  try {
    const response = await client.messages.create(createParams);
    return messageFromResponse(params.model, response);
  } catch (err) {
    if (err instanceof RateLimitError) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const response = await client.messages.create(createParams);
        return messageFromResponse(params.model, response);
      } catch (retryErr) {
        return {
          ok: false,
          error: retryErr instanceof Error ? retryErr.message : "Retry failed",
        };
      }
    }
    const msg = err instanceof Error ? err.message : "Anthropic request failed";
    return { ok: false, error: msg };
  }
}

export async function anthropicHaiku(params: {
  messages: AnthropicChatMessage[];
  maxTokens?: number;
  systemPrompt?: string;
}): Promise<AnthropicChatTextResult> {
  return callAnthropic({
    model: HAIKU_MODEL,
    messages: params.messages,
    maxTokens: params.maxTokens ?? 4096,
    systemPrompt: params.systemPrompt,
  });
}

export async function anthropicSonnet(params: {
  messages: AnthropicChatMessage[];
  maxTokens?: number;
  systemPrompt?: string;
}): Promise<AnthropicChatTextResult> {
  return callAnthropic({
    model: SONNET_MODEL,
    messages: params.messages,
    maxTokens: params.maxTokens ?? 4096,
    systemPrompt: params.systemPrompt,
  });
}
