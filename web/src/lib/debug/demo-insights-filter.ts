import type { BenchmarkEntityMetrics, BenchmarkPayload } from "@/lib/benchmark/benchmark-types";
import { rebuildBenchmarkPayloadFromEntities } from "@/lib/benchmark/build-brand-benchmark";
import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";

import { isDemoSidebarOwner } from "./demo-sidebar-competitors";
import { isDebugPlatformClassificationEnabled } from "./platform-classification";

/** Demo owner + debug off → insights compare Nike vs Adidas only. */
export function shouldFilterInsightsToNikeAdidasDemo(email: string | null | undefined): boolean {
  return isDemoSidebarOwner(email) && !isDebugPlatformClassificationEnabled();
}

export function isDemoInsightsAllowedCompetitor(
  entity: Pick<BenchmarkEntityMetrics, "name" | "domain" | "isOwnBrand">,
): boolean {
  if (entity.isOwnBrand) return true;
  const name = entity.name.trim().toLowerCase();
  const domain = normalizeCompetitorSlug(entity.domain);
  return name.includes("adidas") || domain.includes("adidas");
}

export function applyDemoInsightsBenchmarkFilter(
  payload: BenchmarkPayload,
  email: string | null | undefined,
): BenchmarkPayload {
  if (!shouldFilterInsightsToNikeAdidasDemo(email)) return payload;
  const competitors = payload.competitors.filter((c) => isDemoInsightsAllowedCompetitor(c));
  return rebuildBenchmarkPayloadFromEntities(payload, payload.ownBrand, competitors);
}
