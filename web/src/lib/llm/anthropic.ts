import {
  DEFAULT_OPENROUTER_MODEL,
  openRouterChatText,
  type OpenRouterChatMessage,
} from "@/lib/llm/openrouter";
import {
  defaultFastRoute,
  defaultSmartRoute,
  modelLabelForTask,
  resolveModelForTask,
  type LlmTask,
} from "@/lib/llm/model-routing";

export type { LlmTask } from "@/lib/llm/model-routing";
export { MODEL_ROUTING, modelLabelForTask, resolveModelForTask } from "@/lib/llm/model-routing";

export type LlmChatMessage = OpenRouterChatMessage;

export type LlmTextResult =
  | {
      ok: true;
      text: string;
      model: string;
      task: LlmTask;
      usage: { inputTokens: number; outputTokens: number; costUsd: number };
    }
  | { ok: false; error: string; task?: LlmTask };

async function callRoutedLlm(params: {
  task: LlmTask;
  messages: LlmChatMessage[];
  maxTokens?: number;
  systemPrompt?: string;
}): Promise<LlmTextResult> {
  const route = resolveModelForTask(params.task);
  const result = await openRouterChatText({
    messages: params.messages,
    maxTokens: params.maxTokens,
    systemPrompt: params.systemPrompt,
    model: route.model,
  });
  if (!result.ok) {
    return { ok: false, error: result.error, task: params.task };
  }
  return { ...result, task: params.task };
}

/** Fast-tier LLM call — maps to each task's route in MODEL_ROUTING (default: OpenRouter DeepSeek). */
export async function llmFast(params: {
  task: LlmTask;
  messages: LlmChatMessage[];
  maxTokens?: number;
  systemPrompt?: string;
}): Promise<LlmTextResult> {
  return callRoutedLlm(params);
}

/** Smart-tier LLM call — maps to each task's route in MODEL_ROUTING (default: OpenRouter DeepSeek). */
export async function llmSmart(params: {
  task: LlmTask;
  messages: LlmChatMessage[];
  maxTokens?: number;
  systemPrompt?: string;
}): Promise<LlmTextResult> {
  return callRoutedLlm(params);
}

/** @deprecated Use llmFast({ task: '...' }) or modelLabelForTask(task). */
export const HAIKU_MODEL = defaultFastRoute().model;

/** @deprecated Use llmSmart({ task: '...' }) or modelLabelForTask(task). */
export const SONNET_MODEL = defaultSmartRoute().model;

/** Legacy alias — OpenRouter default model id. */
export const LEGACY_DEFAULT_MODEL = DEFAULT_OPENROUTER_MODEL;

export type AnthropicChatMessage = LlmChatMessage;

export type AnthropicChatTextResult = LlmTextResult;

/**
 * @deprecated Use llmFast({ task: 'your_task', ... }). Untyped calls use the global fast default model only.
 */
export async function anthropicHaiku(params: {
  messages: LlmChatMessage[];
  maxTokens?: number;
  systemPrompt?: string;
}): Promise<LlmTextResult> {
  const route = defaultFastRoute();
  const result = await openRouterChatText({
    ...params,
    model: route.model,
  });
  if (!result.ok) return result;
  return { ...result, task: "ad_enrichment" };
}

/**
 * @deprecated Use llmSmart({ task: 'your_task', ... }). Untyped calls use the global smart default model only.
 */
export async function anthropicSonnet(params: {
  messages: LlmChatMessage[];
  maxTokens?: number;
  systemPrompt?: string;
}): Promise<LlmTextResult> {
  const route = defaultSmartRoute();
  const result = await openRouterChatText({
    ...params,
    model: route.model,
  });
  if (!result.ok) return result;
  return { ...result, task: "report_summary" };
}
