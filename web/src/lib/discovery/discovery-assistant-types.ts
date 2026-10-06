import { z } from "zod";

import type { DiscoveryToolbarState } from "@/components/discovery/discovery-types";
import type {
  DiscoveryDateFilterMode,
  DiscoveryDatePreset,
  DiscoveryFormatFilter,
  DiscoveryMarketStats,
  DiscoverySort,
  DiscoveryStatusFilter,
  DiscoveryAdDto,
} from "@/lib/discovery/types";

export type DiscoveryAssistantMessage = {
  role: "user" | "assistant";
  content: string;
  selectedAdIds?: string[];
  contextSummary?: string;
};

export type DiscoveryAssistantSelectedAdRef = {
  id: string;
  competitor_name: string;
  preview: string;
};

export type DiscoveryFilterPatch = {
  search?: string;
  sort?: DiscoverySort;
  datePreset?: DiscoveryDatePreset;
  dateFilterMode?: DiscoveryDateFilterMode;
  format?: DiscoveryFormatFilter;
  status?: DiscoveryStatusFilter;
  ultimateOnly?: boolean;
  competitorNames?: string[];
  competitorIds?: string[];
  tab?: "explore" | "trending" | "ultimate" | "whats_new" | "patterns";
};

export type DiscoveryAssistantAdRef = {
  id: string;
  competitor_name: string;
  preview: string;
  format?: string;
  creative_url?: string | null;
  competitor_logo_url?: string | null;
  is_ultimate_winner?: boolean;
  is_active?: boolean;
  impressions_index?: number | null;
};

export type DiscoveryVisualStat = {
  label: string;
  value: string;
  tone?: "up" | "down" | "neutral" | "hot";
};

export type DiscoveryAssistantResponse = {
  message: string;
  filter_patch?: DiscoveryFilterPatch;
  highlight_ad_ids?: string[];
  ad_refs?: DiscoveryAssistantAdRef[];
  discovery_ads?: DiscoveryAdDto[];
  market_stats?: DiscoveryMarketStats;
  visual_stats?: DiscoveryVisualStat[];
  suggestions?: string[];
};

export const discoveryFilterPatchSchema = z.object({
  search: z.string().optional(),
  sort: z
    .enum(["shuffle", "newest", "oldest", "longest_running", "impressions", "ultimate_winner"])
    .optional(),
  datePreset: z.enum(["all", "today", "3d", "4d", "7d", "30d", "90d"]).optional(),
  dateFilterMode: z.enum(["live", "launched"]).optional(),
  format: z.enum(["all", "video", "image"]).optional(),
  status: z.enum(["all", "active", "retired"]).optional(),
  ultimateOnly: z.boolean().optional(),
  competitorNames: z.array(z.string()).optional(),
  tab: z.enum(["explore", "trending", "ultimate", "whats_new", "patterns"]).optional(),
});

export const discoveryAssistantResponseSchema = z.object({
  message: z.string().trim().min(1),
  filter_patch: discoveryFilterPatchSchema.optional(),
  highlight_ad_ids: z.array(z.string()).optional(),
  ad_refs: z
    .array(
      z.object({
        id: z.string(),
        competitor_name: z.string(),
        preview: z.string(),
        format: z.string().optional(),
        creative_url: z.string().nullable().optional(),
        competitor_logo_url: z.string().nullable().optional(),
        is_ultimate_winner: z.boolean().optional(),
        is_active: z.boolean().optional(),
        impressions_index: z.number().nullable().optional(),
      }),
    )
    .optional(),
  visual_stats: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        tone: z.enum(["up", "down", "neutral", "hot"]).optional(),
      }),
    )
    .optional(),
  suggestions: z.array(z.string()).optional(),
});

export function applyDiscoveryFilterPatch(
  current: DiscoveryToolbarState,
  patch: DiscoveryFilterPatch,
  competitors: { id: string; name: string }[],
): Partial<DiscoveryToolbarState> {
  const next: Partial<DiscoveryToolbarState> = {};

  if (patch.search !== undefined) next.search = patch.search;
  if (patch.sort !== undefined) next.sort = patch.sort;
  if (patch.datePreset !== undefined) next.datePreset = patch.datePreset;
  if (patch.dateFilterMode !== undefined) next.dateFilterMode = patch.dateFilterMode;
  if (patch.format !== undefined) next.format = patch.format;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.ultimateOnly !== undefined) next.ultimateOnly = patch.ultimateOnly;

  if (patch.competitorIds?.length) {
    const valid = new Set(competitors.map((c) => c.id));
    next.selectedCompetitorIds = new Set(patch.competitorIds.filter((id) => valid.has(id)));
  } else if (patch.competitorNames?.length) {
    const names = patch.competitorNames.map((n) => n.trim().toLowerCase());
    const ids = competitors
      .filter((c) => names.some((n) => c.name.toLowerCase().includes(n)))
      .map((c) => c.id);
    if (ids.length) next.selectedCompetitorIds = new Set(ids);
  }

  return next;
}

export const DISCOVERY_ASSISTANT_SUGGESTIONS = [
  "Show video ads mentioning implants",
  "Which competitor launched the most ads this week?",
  "Find ultimate winners with free consultation hooks",
  "What keywords appear most in active ads?",
  "Show retired ads from the last 30 days",
  "Compare competitor ad volume in my market",
];
