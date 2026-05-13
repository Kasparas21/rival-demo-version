import type { ComparisonMoveRow } from "@/lib/comparison/comparison-move-types";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";

export type ComparisonSideResponse = {
  meta: {
    competitorId: string;
    name: string;
    domain: string;
    logoUrl: string | null;
    lastScrapedAt: string | null;
  };
  payload: CompetitorStrategyOverviewPayload | null;
  recomputing: boolean;
  needsScrape?: boolean;
  recent_moves: ComparisonMoveRow[];
  snapshot_count: number;
};

/** JSON shape from GET /api/comparison/payload */
export type ComparisonPayloadJson = {
  ok: boolean;
  error?: string;
  workspace?: ComparisonSideResponse;
  competitor?: ComparisonSideResponse;
};
