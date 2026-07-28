import { z } from "zod";

import type { DiscoveryToolbarState } from "@/components/discovery/discovery-types";
import type {
  DiscoveryDatePreset,
  DiscoveryFormatFilter,
  DiscoverySort,
  DiscoveryStatusFilter,
} from "@/lib/discovery/types";

export type DiscoveryAssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type DiscoveryFilterPatch = {
  search?: string;
  sort?: DiscoverySort;
  datePreset?: DiscoveryDatePreset;
  format?: DiscoveryFormatFilter;
  status?: DiscoveryStatusFilter;
  ultimateOnly?: boolean;
  competitorNames?: string[];
  competitorIds?: string[];
  tab?: "explore" | "trending" | "ultimate" | "patterns";
};

export type DiscoveryAssistantAdRef = {
  id: string;
  competitor_name: string;
  preview: string;
};

export type DiscoveryAssistantResponse = {
  message: string;
  filter_patch?: DiscoveryFilterPatch;
  highlight_ad_ids?: string[];
  ad_refs?: DiscoveryAssistantAdRef[];
  suggestions?: string[];
};

export const discoveryFilterPatchSchema = z.object({
  search: z.string().optional(),
  sort: z
    .enum(["shuffle", "newest", "oldest", "longest_running", "impressions", "ultimate_winner"])
    .optional(),
  datePreset: z.enum(["all", "7d", "30d", "90d"]).optional(),
  format: z.enum(["all", "video", "image"]).optional(),
  status: z.enum(["all", "active", "retired"]).optional(),
  ultimateOnly: z.boolean().optional(),
  competitorNames: z.array(z.string()).optional(),
  tab: z.enum(["explore", "trending", "ultimate", "patterns"]).optional(),
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
