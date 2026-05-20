import type {
  FunnelCellId,
  FunnelCellNodePayload,
  FunnelEdgePayload,
  FunnelStage,
  StrategyPlatform,
} from "@/lib/strategy-overview/payload-types";

const STAGE_ORDER: FunnelStage[] = ["TOF", "MOF", "BOF"];

const PLATFORM_LABEL: Record<string, string> = {
  meta: "Meta",
  google: "Google",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
};

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return union <= 0 ? 0 : inter / union;
}

const MIN_ENRICHED_PER_CELL_FOR_CROSS_EDGE = 3;

/**
 * Connect funnel cells: adjacent stages on the same platform (solid), then cross-platform
 * progression weighted by creative-angle overlap and relative ad volume.
 */
export function deriveFunnelCellEdges(params: {
  cells: FunnelCellNodePayload[];
  angleByCell: Map<FunnelCellId, Set<string>>;
  enrichedCountByCell: Map<FunnelCellId, number>;
  allowCrossPlatform?: boolean;
  minEnrichedPerCell?: number;
}): { edges: FunnelEdgePayload[]; detected: number; suppressed: number } {
  const { cells, angleByCell, enrichedCountByCell } = params;
  const allowCrossPlatform = params.allowCrossPlatform !== false;
  const minEnriched = params.minEnrichedPerCell ?? MIN_ENRICHED_PER_CELL_FOR_CROSS_EDGE;
  const edges: FunnelEdgePayload[] = [];
  const seen = new Set<string>();
  let detected = 0;

  const stageIndex = (s: FunnelStage) => STAGE_ORDER.indexOf(s);
  const maxAdCount = Math.max(1, ...cells.map((c) => c.adCount));
  const byStage = new Map<FunnelStage, FunnelCellNodePayload[]>();
  for (const stage of STAGE_ORDER) byStage.set(stage, []);
  for (const c of cells) byStage.get(c.funnelStage)!.push(c);
  for (const list of byStage.values()) list.sort((a, b) => b.adCount - a.adCount);

  const pushEdge = (
    from: FunnelCellNodePayload,
    to: FunnelCellNodePayload,
    edge: Omit<FunnelEdgePayload, "from" | "to" | "fromStage" | "toStage">
  ): boolean => {
    const key = `${from.id}->${to.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    edges.push({
      from: from.id,
      to: to.id,
      fromStage: from.funnelStage,
      toStage: to.funnelStage,
      ...edge,
    });
    return true;
  };

  const byPlatform = new Map<StrategyPlatform, FunnelCellNodePayload[]>();
  for (const c of cells) {
    if (!byPlatform.has(c.platform)) byPlatform.set(c.platform, []);
    byPlatform.get(c.platform)!.push(c);
  }
  for (const list of byPlatform.values()) {
    list.sort((a, b) => stageIndex(a.funnelStage) - stageIndex(b.funnelStage));
    for (let i = 0; i < list.length - 1; i++) {
      const from = list[i]!;
      const to = list[i + 1]!;
      if (stageIndex(to.funnelStage) - stageIndex(from.funnelStage) !== 1) continue;
      if (
        pushEdge(from, to, {
          confidence: 0.88,
          style: "solid",
          reasoning: `${PLATFORM_LABEL[from.platform] ?? from.platform} runs ${from.funnelStage} and ${to.funnelStage} creatives on the same channel — classic in-platform funnel progression.`,
        })
      ) {
        detected += 1;
      }
    }
  }

  if (allowCrossPlatform) {
    for (let si = 0; si < STAGE_ORDER.length - 1; si++) {
      const fromStage = STAGE_ORDER[si]!;
      const toStage = STAGE_ORDER[si + 1]!;
      const fromTop = byStage.get(fromStage)?.[0];
      const toTop = byStage.get(toStage)?.[0];
      if (!fromTop || !toTop || fromTop.id === toTop.id) continue;
      if (fromTop.platform === toTop.platform) continue;
      if (
        pushEdge(fromTop, toTop, {
          confidence: 0.82,
          style: "solid",
          reasoning: `Primary funnel path: ${PLATFORM_LABEL[fromTop.platform] ?? fromTop.platform} ${fromStage} (${fromTop.adCount} ads) feeds ${PLATFORM_LABEL[toTop.platform] ?? toTop.platform} ${toStage} (${toTop.adCount} ads).`,
        })
      ) {
        detected += 1;
      }
    }

    // Skip-ahead spine when an intermediate funnel column has no cells (e.g. TOF → BOF only).
    const tofTop = byStage.get("TOF")?.[0];
    const bofTop = byStage.get("BOF")?.[0];
    if (tofTop && bofTop && byStage.get("MOF")!.length === 0 && tofTop.platform !== bofTop.platform) {
      if (
        pushEdge(tofTop, bofTop, {
          confidence: 0.76,
          style: "solid",
          reasoning: `Direct funnel bridge: ${PLATFORM_LABEL[tofTop.platform] ?? tofTop.platform} awareness (${tofTop.adCount} ads) into ${PLATFORM_LABEL[bofTop.platform] ?? bofTop.platform} conversion (${bofTop.adCount} ads).`,
        })
      ) {
        detected += 1;
      }
    }
  }

  if (allowCrossPlatform) {
    for (let i = 0; i < cells.length; i++) {
      for (let j = 0; j < cells.length; j++) {
        if (i === j) continue;
        const from = cells[i]!;
        const to = cells[j]!;
        if (stageIndex(to.funnelStage) <= stageIndex(from.funnelStage)) continue;
        if (from.platform === to.platform) continue;

        const overlap = jaccard(angleByCell.get(from.id) ?? new Set(), angleByCell.get(to.id) ?? new Set());
        const stageGap = stageIndex(to.funnelStage) - stageIndex(from.funnelStage);
        const volumeScore = Math.min(from.adCount, to.adCount) / maxAdCount;
        const hasVolume = from.adCount >= 2 && to.adCount >= 2;
        let confidence = 0.28 + stageGap * 0.16 + overlap * 0.38 + volumeScore * 0.22;
        confidence = Math.min(0.94, confidence);
        if (confidence < 0.38 && !(hasVolume && volumeScore >= 0.05)) continue;

        detected += 1;
        const enFrom = enrichedCountByCell.get(from.id) ?? 0;
        const enTo = enrichedCountByCell.get(to.id) ?? 0;
        if (!hasVolume && enFrom < minEnriched && enTo < minEnriched && overlap < 0.08) continue;

        const style: "solid" | "dashed" = confidence >= 0.72 ? "solid" : "dashed";
        const reasoning =
          overlap >= 0.15
            ? `Shared creative angles between ${PLATFORM_LABEL[from.platform] ?? from.platform} ${from.funnelStage} and ${PLATFORM_LABEL[to.platform] ?? to.platform} ${to.funnelStage}.`
            : `${from.funnelStage} activity on ${PLATFORM_LABEL[from.platform] ?? from.platform} likely feeds ${to.funnelStage} on ${PLATFORM_LABEL[to.platform] ?? to.platform}.`;

        pushEdge(from, to, { confidence, style, reasoning });
      }
    }
  }

  const suppressed = detected - edges.length;
  return { edges, detected, suppressed };
}
