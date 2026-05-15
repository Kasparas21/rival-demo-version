import type { ComparisonPayloadJson } from "@/lib/comparison/comparison-payload-types";
import { normalizeCompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/normalize-strategy-payload";

/** Repair payloads after session/local cache hits (fetcher normalize does not run on HIT). */
export function normalizeComparisonPayloadJson(json: ComparisonPayloadJson | null): ComparisonPayloadJson | null {
  if (!json?.ok) return json;
  const w = json.workspace;
  const c = json.competitor;
  if (!w || !c) return json;

  return {
    ...json,
    workspace: {
      ...w,
      payload: w.payload ? normalizeCompetitorStrategyOverviewPayload(w.payload) : null,
    },
    competitor: {
      ...c,
      payload: c.payload ? normalizeCompetitorStrategyOverviewPayload(c.payload) : null,
    },
  };
}
