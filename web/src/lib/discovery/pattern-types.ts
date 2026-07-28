import { z } from "zod";

export const discoveryPatternCategorySchema = z.enum([
  "offer",
  "hook",
  "format",
  "creative",
  "timing",
  "competitor_move",
]);

export const discoveryPatternConfidenceSchema = z.enum(["high", "medium", "low"]);

export const discoveryPatternTrendSchema = z.enum(["rising", "falling", "stable"]);

export const discoveryMarketTemperatureSchema = z.enum(["heating_up", "steady", "cooling_down"]);

export const discoveryPatternItemSchema = z.object({
  title: z.string().trim().min(1),
  category: discoveryPatternCategorySchema,
  description: z.string().trim().min(1),
  confidence: discoveryPatternConfidenceSchema,
  evidence_ad_ids: z.array(z.string()).default([]),
  trend_direction: discoveryPatternTrendSchema,
});

export const discoveryRecommendedTestSchema = z.object({
  idea: z.string().trim().min(1),
  rationale: z.string().trim().min(1),
  inspired_by_ad_ids: z.array(z.string()).default([]),
});

export const discoveryPatternInsightsSchema = z.object({
  headline: z.string().trim().min(1),
  market_temperature: discoveryMarketTemperatureSchema,
  temperature_reason: z.string().trim().min(1),
  patterns: z.array(discoveryPatternItemSchema).default([]),
  winners_playbook: z.array(z.string()).default([]),
  graveyard_lessons: z.array(z.string()).default([]),
  recommended_tests: z.array(discoveryRecommendedTestSchema).default([]),
  competitor_spotlight: z
    .object({
      name: z.string().trim().min(1),
      observation: z.string().trim().min(1),
    })
    .nullable()
    .default(null),
});

export type DiscoveryPatternInsights = z.infer<typeof discoveryPatternInsightsSchema>;
export type DiscoveryPatternItem = z.infer<typeof discoveryPatternItemSchema>;

export function normalizeDiscoveryPatternInsights(raw: unknown): DiscoveryPatternInsights {
  const rec = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return discoveryPatternInsightsSchema.parse({
    headline: String(rec.headline ?? "").trim(),
    market_temperature: rec.market_temperature ?? "steady",
    temperature_reason: String(rec.temperature_reason ?? "").trim(),
    patterns: Array.isArray(rec.patterns) ? rec.patterns : [],
    winners_playbook: Array.isArray(rec.winners_playbook)
      ? rec.winners_playbook.map((s) => String(s).trim()).filter(Boolean)
      : [],
    graveyard_lessons: Array.isArray(rec.graveyard_lessons)
      ? rec.graveyard_lessons.map((s) => String(s).trim()).filter(Boolean)
      : [],
    recommended_tests: Array.isArray(rec.recommended_tests) ? rec.recommended_tests : [],
    competitor_spotlight:
      rec.competitor_spotlight && typeof rec.competitor_spotlight === "object"
        ? rec.competitor_spotlight
        : null,
  });
}
