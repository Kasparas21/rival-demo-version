import {
  DEFAULT_OPENROUTER_MODEL,
  openRouterChatText,
  type OpenRouterChatMessage,
} from "@/lib/llm/openrouter";

export type AnthropicChatMessage = OpenRouterChatMessage;

export type AnthropicChatTextResult =
  | {
      ok: true;
      text: string;
      model: string;
      usage: { inputTokens: number; outputTokens: number; costUsd: number };
    }
  | { ok: false; error: string };

/** Legacy names kept for call-site imports; both routes use DeepSeek via OpenRouter. */
export const HAIKU_MODEL = DEFAULT_OPENROUTER_MODEL;
export const SONNET_MODEL = DEFAULT_OPENROUTER_MODEL;

async function callLlm(params: {
  messages: AnthropicChatMessage[];
  maxTokens: number;
  systemPrompt?: string;
}): Promise<AnthropicChatTextResult> {
  return openRouterChatText({
    messages: params.messages,
    maxTokens: params.maxTokens,
    systemPrompt: params.systemPrompt,
    model: DEFAULT_OPENROUTER_MODEL,
  });
}

export async function anthropicHaiku(params: {
  messages: AnthropicChatMessage[];
  maxTokens?: number;
  systemPrompt?: string;
}): Promise<AnthropicChatTextResult> {
  return callLlm({
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
  return callLlm({
    messages: params.messages,
    maxTokens: params.maxTokens ?? 4096,
    systemPrompt: params.systemPrompt,
  });
}
