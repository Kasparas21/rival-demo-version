import { strategyMapNodeSize } from "@/lib/strategy-overview/map-node-sizing";
import type { FunnelCellId, FunnelCellNodePayload, FunnelStage, StrategyPlatform } from "@/lib/strategy-overview/payload-types";

const STAGE_ORDER: FunnelStage[] = ["TOF", "MOF", "BOF"];

const PLATFORM_ORDER: StrategyPlatform[] = [
  "google",
  "meta",
  "tiktok",
  "linkedin",
  "pinterest",
  "snapchat",
];

export type FunnelCellLayoutEntry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Platform columns × funnel-stage rows. Row height and column width use the largest
 * cell in that row/column so dynamic card sizes never overlap.
 */
export function layoutFunnelCellPositions(
  cells: FunnelCellNodePayload[],
  maxAdCount: number
): Map<FunnelCellId, FunnelCellLayoutEntry> {
  const gap = 52;
  const originX = 32;
  const originY = 32;
  const out = new Map<FunnelCellId, FunnelCellLayoutEntry>();
  if (cells.length === 0) return out;

  const sizes = new Map(
    cells.map((c) => {
      const size = strategyMapNodeSize(c.adCount, maxAdCount);
      return [c.id, size] as const;
    })
  );

  const platforms = [
    ...new Set(
      cells
        .map((c) => c.platform)
        .sort((a, b) => {
          const ai = PLATFORM_ORDER.indexOf(a);
          const bi = PLATFORM_ORDER.indexOf(b);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        })
    ),
  ];

  const rowMaxH: Record<FunnelStage, number> = { TOF: 0, MOF: 0, BOF: 0 };
  const colMaxW = new Map<StrategyPlatform, number>();
  for (const p of platforms) colMaxW.set(p, 0);

  for (const c of cells) {
    const { width, height } = sizes.get(c.id)!;
    rowMaxH[c.funnelStage] = Math.max(rowMaxH[c.funnelStage], height);
    colMaxW.set(c.platform, Math.max(colMaxW.get(c.platform) ?? 0, width));
  }

  const rowY: Record<FunnelStage, number> = { TOF: originY, MOF: 0, BOF: 0 };
  rowY.MOF = rowY.TOF + rowMaxH.TOF + gap;
  rowY.BOF = rowY.MOF + rowMaxH.MOF + gap;

  const colX = new Map<StrategyPlatform, number>();
  let x = originX;
  for (const p of platforms) {
    colX.set(p, x);
    x += (colMaxW.get(p) ?? 0) + gap;
  }

  for (const c of cells) {
    const size = sizes.get(c.id)!;
    out.set(c.id, {
      x: colX.get(c.platform) ?? originX,
      y: rowY[c.funnelStage],
      width: size.width,
      height: size.height,
    });
  }

  return out;
}

export function applyFunnelCellLayout(
  cells: FunnelCellNodePayload[],
  maxAdCount?: number
): FunnelCellNodePayload[] {
  const max = maxAdCount ?? Math.max(1, ...cells.map((c) => c.adCount));
  const positions = layoutFunnelCellPositions(cells, max);
  return cells.map((c) => ({
    ...c,
    position: { x: positions.get(c.id)?.x ?? 0, y: positions.get(c.id)?.y ?? 0 },
  }));
}

export { STAGE_ORDER as FUNNEL_STAGE_ORDER };
