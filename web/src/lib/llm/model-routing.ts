/**
 * Explicit task → provider/model routing. Override per task via env (see defaults below).
 * All tasks currently default to OpenRouter DeepSeek V4 Flash — same as pre-routing behavior.
 */

export type LlmProvider = "openrouter" | "anthropic";

export type LlmTask =
  | "watch_recommendation"
  | "report_summary"
  | "organic_insights"
  | "organic_post_analysis"
  | "email_intelligence"
  | "benchmark"
  | "ad_enrichment"
  | "ad_detail_analysis"
  | "marketing_improvement"
  | "move_detector"
  | "audience_inference"
  | "brand_comparison"
  | "strategy_overview"
  | "activity_score"
  | "copy_structure"
  | "landing_page_text_extract"
  | "landing_page_change_analysis";

export type LlmRoute = {
  provider: LlmProvider;
  model: string;
};

const DEFAULT_OPENROUTER_FAST = "deepseek/deepseek-v4-flash";
const DEFAULT_OPENROUTER_SMART = "deepseek/deepseek-v4-flash";
const DEFAULT_ANTHROPIC_FAST = "claude-haiku-4-5-20251001";
const DEFAULT_ANTHROPIC_SMART = "claude-sonnet-4-6-20250514";

function envModel(envKey: string, fallback: string): string {
  const v = process.env[envKey]?.trim();
  return v || fallback;
}

function openRouterRoute(envKey: string, fallback = DEFAULT_OPENROUTER_FAST): LlmRoute {
  return { provider: "openrouter", model: envModel(envKey, fallback) };
}

/** Global fallbacks when a task-specific env is unset. */
export function defaultFastRoute(): LlmRoute {
  return openRouterRoute("LLM_MODEL_FAST", DEFAULT_OPENROUTER_FAST);
}

export function defaultSmartRoute(): LlmRoute {
  return openRouterRoute("LLM_MODEL_SMART", DEFAULT_OPENROUTER_SMART);
}

/**
 * Task → provider + model. Env keys: LLM_MODEL_<TASK> (e.g. LLM_MODEL_WATCH_RECOMMENDATION).
 * Provider override: LLM_PROVIDER_<TASK> = openrouter | anthropic (optional).
 */
export const MODEL_ROUTING: Record<LlmTask, LlmRoute> = {
  watch_recommendation: openRouterRoute("LLM_MODEL_WATCH_RECOMMENDATION"),
  report_summary: openRouterRoute("LLM_MODEL_REPORT_SUMMARY", DEFAULT_OPENROUTER_SMART),
  organic_insights: openRouterRoute("LLM_MODEL_ORGANIC_INSIGHTS"),
  organic_post_analysis: openRouterRoute("LLM_MODEL_ORGANIC_POST_ANALYSIS"),
  email_intelligence: openRouterRoute("LLM_MODEL_EMAIL_INTELLIGENCE"),
  benchmark: openRouterRoute("LLM_MODEL_BENCHMARK", DEFAULT_OPENROUTER_SMART),
  ad_enrichment: openRouterRoute("LLM_MODEL_AD_ENRICHMENT"),
  ad_detail_analysis: openRouterRoute("LLM_MODEL_AD_DETAIL_ANALYSIS"),
  marketing_improvement: openRouterRoute("LLM_MODEL_MARKETING_IMPROVEMENT", DEFAULT_OPENROUTER_SMART),
  move_detector: openRouterRoute("LLM_MODEL_MOVE_DETECTOR", DEFAULT_OPENROUTER_SMART),
  audience_inference: openRouterRoute("LLM_MODEL_AUDIENCE_INFERENCE", DEFAULT_OPENROUTER_SMART),
  brand_comparison: openRouterRoute("LLM_MODEL_BRAND_COMPARISON", DEFAULT_OPENROUTER_SMART),
  strategy_overview: openRouterRoute("LLM_MODEL_STRATEGY_OVERVIEW"),
  activity_score: openRouterRoute("LLM_MODEL_ACTIVITY_SCORE"),
  copy_structure: openRouterRoute("LLM_MODEL_COPY_STRUCTURE"),
  landing_page_text_extract: openRouterRoute("LLM_MODEL_LANDING_PAGE_TEXT_EXTRACT"),
  landing_page_change_analysis: openRouterRoute(
    "LLM_MODEL_LANDING_PAGE_CHANGE_ANALYSIS",
    "anthropic/claude-sonnet-4-6",
  ),
};

export function resolveModelForTask(task: LlmTask): LlmRoute {
  const base = MODEL_ROUTING[task];
  const providerKey = `LLM_PROVIDER_${task.toUpperCase()}` as const;
  const providerOverride = process.env[providerKey]?.trim().toLowerCase();
  if (providerOverride === "anthropic") {
    const anthropicEnv = `LLM_MODEL_${task.toUpperCase()}`;
    const isSmartTier =
      task === "report_summary" ||
      task === "benchmark" ||
      task === "marketing_improvement" ||
      task === "move_detector" ||
      task === "audience_inference" ||
      task === "brand_comparison" ||
      task === "landing_page_change_analysis";
    return {
      provider: "anthropic",
      model: envModel(anthropicEnv, isSmartTier ? DEFAULT_ANTHROPIC_SMART : DEFAULT_ANTHROPIC_FAST),
    };
  }
  if (providerOverride === "openrouter") {
    return { provider: "openrouter", model: base.model };
  }
  return base;
}

export function modelLabelForTask(task: LlmTask): string {
  const route = resolveModelForTask(task);
  return `${route.provider}:${route.model}`;
}
