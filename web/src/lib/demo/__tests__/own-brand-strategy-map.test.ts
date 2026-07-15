import { describe, expect, it } from "vitest";

import {
  OWN_STRATEGY_CHANNEL_SIGNALS,
  OWN_STRATEGY_JOURNEY_GOAL,
  OWN_STRATEGY_MAP,
} from "@/lib/demo/demo-own-brand-data";
import { buildChannelArrows, buildFunnelArrows } from "@/lib/strategy-overview/funnel-arrow-geometry";
import { layoutChannelNodePositions } from "@/lib/strategy-overview/layout-channel-nodes";
import { layoutFunnelCellPositions } from "@/lib/strategy-overview/layout-funnel-cells";
import { normalizeStrategyMapPayload } from "@/lib/strategy-overview/normalize-strategy-payload";
import { resolveStrategyMapEdges } from "@/lib/strategy-overview/resolve-map-edges";

describe("own brand strategy map fixtures", () => {
  it("builds layout and arrows without duplicate ids", () => {
    const map = normalizeStrategyMapPayload(OWN_STRATEGY_MAP);
    const cells = map.funnelCells ?? [];
    expect(cells.length).toBeGreaterThan(0);

    const max = Math.max(1, ...cells.map((c) => c.adCount));
    const cellLayout = layoutFunnelCellPositions(cells, max);
    const channelLayout = layoutChannelNodePositions({
      cellLayout,
      cells: cells.map((c) => ({ id: c.id, platform: String(c.platform) })),
      signals: OWN_STRATEGY_CHANNEL_SIGNALS,
      emailAnchorCellId: "meta:BOF",
      journeyGoal: OWN_STRATEGY_JOURNEY_GOAL,
    });

    expect(channelLayout.has("goal")).toBe(true);
    expect(channelLayout.has("email")).toBe(true);
    expect(channelLayout.has("organic:linkedin")).toBe(true);

    const merged = new Map(cellLayout);
    for (const [k, v] of channelLayout) merged.set(k, v);

    const funnelEdges = resolveStrategyMapEdges(map);
    const paid = buildFunnelArrows({
      edges: funnelEdges,
      layout: merged,
      cells: cells.map((c) => ({
        id: c.id,
        platform: String(c.platform),
        funnelStage: c.funnelStage,
      })),
    });
    const cross = [
      ...OWN_STRATEGY_CHANNEL_SIGNALS.channelEdges,
      ...OWN_STRATEGY_JOURNEY_GOAL.goalEdges,
    ];
    const channel = buildChannelArrows({ edges: cross, layout: merged });

    const ids = [...paid, ...channel].map((a) => a.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dup).toEqual([]);
    expect(paid.length).toBeGreaterThan(0);
    expect(channel.length).toBeGreaterThan(0);
  });
});
