import type { FunnelCellLayoutEntry } from "@/lib/strategy-overview/layout-funnel-cells";
import type { FunnelStage } from "@/lib/strategy-overview/payload-types";
import { STAGE_THEME } from "@/lib/strategy-overview/map-node-sizing";

export type ArrowAnchor = "top" | "bottom" | "left" | "right";

export type ResolvedFunnelArrow = {
  id: string;
  path: string;
  arrowPoints: string;
  fromColor: string;
  toColor: string;
  dashed: boolean;
  reasoning: string;
  confidence: number;
  gradId: string;
  gradX1: number;
  gradY1: number;
  gradX2: number;
  gradY2: number;
};

function anchor(box: FunnelCellLayoutEntry, side: ArrowAnchor): { x: number; y: number } {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  switch (side) {
    case "top":
      return { x: cx, y: box.y };
    case "bottom":
      return { x: cx, y: box.y + box.height };
    case "left":
      return { x: box.x, y: cy };
    case "right":
      return { x: box.x + box.width, y: cy };
  }
}

function arrowHead(fromCtrl: { x: number; y: number }, tip: { x: number; y: number }, size = 13): string {
  const angle = Math.atan2(tip.y - fromCtrl.y, tip.x - fromCtrl.x);
  const wing = Math.PI / 7;
  const x1 = tip.x - size * Math.cos(angle - wing);
  const y1 = tip.y - size * Math.sin(angle - wing);
  const x2 = tip.x - size * Math.cos(angle + wing);
  const y2 = tip.y - size * Math.sin(angle + wing);
  return `${tip.x},${tip.y} ${x1},${y1} ${x2},${y2}`;
}

/** Curved path between two cell boxes — vertical, horizontal, or diagonal. */
export function buildFunnelArrowPath(
  fromBox: FunnelCellLayoutEntry,
  toBox: FunnelCellLayoutEntry,
  fromSide: ArrowAnchor,
  toSide: ArrowAnchor
): { path: string; arrowPoints: string } {
  const start = anchor(fromBox, fromSide);
  const end = anchor(toBox, toSide);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const curve = Math.min(120, Math.max(36, Math.hypot(dx, dy) * 0.35));

  if (fromSide === "bottom" && toSide === "top") {
    const c1 = { x: start.x, y: start.y + curve };
    const c2 = { x: end.x, y: end.y - curve };
    const path = `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`;
    return { path, arrowPoints: arrowHead(c2, end) };
  }

  if (fromSide === "right" && toSide === "left") {
    const sag = Math.min(48, Math.abs(dy) * 0.25 + 18);
    const c1 = { x: start.x + curve, y: start.y + sag };
    const c2 = { x: end.x - curve, y: end.y + sag };
    const path = `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`;
    return { path, arrowPoints: arrowHead(c2, end) };
  }

  const c1 = { x: start.x + dx * 0.35, y: start.y + dy * 0.1 };
  const c2 = { x: start.x + dx * 0.65, y: start.y + dy * 0.9 };
  const path = `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`;
  return { path, arrowPoints: arrowHead(c2, end) };
}

export function anchorsForCells(
  fromId: string,
  toId: string,
  cells: { id: string; platform: string }[]
): { fromSide: ArrowAnchor; toSide: ArrowAnchor } {
  const from = cells.find((c) => c.id === fromId);
  const to = cells.find((c) => c.id === toId);
  if (from && to && from.platform === to.platform) {
    return { fromSide: "bottom", toSide: "top" };
  }
  return { fromSide: "right", toSide: "left" };
}

export const CHANNEL_ORGANIC_COLOR = "#8b5cf6";
export const CHANNEL_EMAIL_COLOR = "#f59e0b";
export const CHANNEL_GOAL_COLOR = "#e11d48";

/** Vertical channel + goal edges. */
export function buildChannelArrows(params: {
  edges: {
    from: string;
    to: string;
    style: "solid" | "dashed";
    reasoning: string;
    confidence: number;
    kind?: "organic_to_paid" | "paid_to_email" | "bof_to_goal" | "email_to_goal";
  }[];
  layout: Map<string, FunnelCellLayoutEntry>;
}): ResolvedFunnelArrow[] {
  const out: ResolvedFunnelArrow[] = [];

  for (const e of params.edges) {
    const fromBox = params.layout.get(e.from);
    const toBox = params.layout.get(e.to);
    if (!fromBox || !toBox) continue;

    const fromSide: ArrowAnchor = "bottom";
    const toSide: ArrowAnchor = "top";
    const { path, arrowPoints } = buildFunnelArrowPath(fromBox, toBox, fromSide, toSide);
    const start = anchor(fromBox, fromSide);
    const end = anchor(toBox, toSide);
    const safeKey = `ch_${e.from}__${e.to}`.replace(/[^a-zA-Z0-9_-]/g, "_");

    const fromColor =
      e.kind === "paid_to_email"
        ? STAGE_THEME.BOF.border
        : e.kind === "bof_to_goal"
          ? STAGE_THEME.BOF.border
          : e.kind === "email_to_goal"
            ? CHANNEL_EMAIL_COLOR
            : CHANNEL_ORGANIC_COLOR;
    const toColor =
      e.kind === "organic_to_paid"
        ? STAGE_THEME.TOF.border
        : e.kind === "paid_to_email"
          ? CHANNEL_EMAIL_COLOR
          : CHANNEL_GOAL_COLOR;

    out.push({
      id: safeKey,
      path,
      arrowPoints,
      fromColor,
      toColor,
      dashed: e.style === "dashed",
      reasoning: e.reasoning,
      confidence: e.confidence,
      gradId: `rival-ch-grad-${safeKey}`,
      gradX1: start.x,
      gradY1: start.y,
      gradX2: end.x,
      gradY2: end.y,
    });
  }

  return out;
}

export function buildFunnelArrows(params: {
  edges: {
    from: string;
    to: string;
    fromStage?: FunnelStage;
    toStage?: FunnelStage;
    style: "solid" | "dashed";
    reasoning: string;
    confidence: number;
  }[];
  layout: Map<string, FunnelCellLayoutEntry>;
  cells: { id: string; platform: string; funnelStage: FunnelStage }[];
}): ResolvedFunnelArrow[] {
  const out: ResolvedFunnelArrow[] = [];

  for (const e of params.edges) {
    const fromBox = params.layout.get(e.from);
    const toBox = params.layout.get(e.to);
    if (!fromBox || !toBox) continue;

    const fromStage =
      e.fromStage ?? params.cells.find((c) => c.id === e.from)?.funnelStage ?? "MOF";
    const toStage = e.toStage ?? params.cells.find((c) => c.id === e.to)?.funnelStage ?? "MOF";
    const { fromSide, toSide } = anchorsForCells(e.from, e.to, params.cells);
    const { path, arrowPoints } = buildFunnelArrowPath(fromBox, toBox, fromSide, toSide);
    const start = anchor(fromBox, fromSide);
    const end = anchor(toBox, toSide);
    const safeKey = `${e.from}__${e.to}`.replace(/[^a-zA-Z0-9_-]/g, "_");

    out.push({
      id: safeKey,
      path,
      arrowPoints,
      fromColor: STAGE_THEME[fromStage].border,
      toColor: STAGE_THEME[toStage].border,
      dashed: e.style === "dashed",
      reasoning: e.reasoning,
      confidence: e.confidence,
      gradId: `rival-grad-${safeKey}`,
      gradX1: start.x,
      gradY1: start.y,
      gradX2: end.x,
      gradY2: end.y,
    });
  }

  return out;
}
