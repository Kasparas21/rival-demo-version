import type { FunnelCellLayoutEntry } from "@/lib/strategy-overview/layout-funnel-cells";
import type {
  OrganicChannelNodePayload,
  StrategyChannelSignals,
  StrategyJourneyGoal,
  StrategyPlatform,
} from "@/lib/strategy-overview/payload-types";

/** Default when width cannot be derived from the grid. */
export const ORGANIC_NODE_SIZE = { width: 184, height: 120 };
export const EMAIL_NODE_SIZE = { width: 196, height: 132 };
/** Terminal outcome — wide pill, not a channel card. */
export const GOAL_NODE_SIZE = { width: 280, height: 108 };
export const JOURNEY_GOAL_NODE_ID = "goal" as const;

const RAIL_GAP = 56;
const GOAL_RAIL_GAP = 52;
const MIN_NODE_GAP = 10;

const PLATFORM_ORDER: StrategyPlatform[] = [
  "google",
  "meta",
  "tiktok",
  "linkedin",
  "pinterest",
  "snapchat",
];

/** Size organic cards from available rail width — ~85% of a standard funnel cell. */
export function resolveOrganicNodeSize(
  nodeCount: number,
  availableWidth: number,
): { width: number; height: number } {
  if (nodeCount <= 0) return ORGANIC_NODE_SIZE;
  const minW = 172;
  const maxW = 198;
  const gap = MIN_NODE_GAP;
  const fitW =
    nodeCount > 1
      ? Math.floor((availableWidth - (nodeCount - 1) * gap) / nodeCount)
      : Math.min(maxW, availableWidth);
  const width = Math.min(maxW, Math.max(minW, fitW));
  const height = Math.round(112 + (width - minW) * 0.22);
  return { width, height };
}

function platformRank(platform: string | null | undefined): number {
  if (!platform) return 99;
  const i = PLATFORM_ORDER.indexOf(platform as StrategyPlatform);
  return i === -1 ? 99 : i;
}

function boundsFromCells(cellLayout: Map<string, FunnelCellLayoutEntry>) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const box of cellLayout.values()) {
    minX = Math.min(minX, box.x);
    maxX = Math.max(maxX, box.x + box.width);
    minY = Math.min(minY, box.y);
    maxY = Math.max(maxY, box.y + box.height);
  }
  return { minX, maxX, minY, maxY };
}

function columnCenter(
  platform: string,
  cellLayout: Map<string, FunnelCellLayoutEntry>,
  cells: { id: string; platform: string }[],
): number | null {
  let left = Infinity;
  let right = -Infinity;
  for (const c of cells) {
    if (c.platform !== platform) continue;
    const box = cellLayout.get(c.id);
    if (!box) continue;
    left = Math.min(left, box.x);
    right = Math.max(right, box.x + box.width);
  }
  return Number.isFinite(left) ? (left + right) / 2 : null;
}

function idealOrganicX(
  node: OrganicChannelNodePayload,
  nodeWidth: number,
  cellLayout: Map<string, FunnelCellLayoutEntry>,
  cells: { id: string; platform: string }[],
  gridCenter: number,
): number {
  const paired = node.pairedPaidPlatform;
  if (paired) {
    const center = columnCenter(paired, cellLayout, cells);
    if (center != null) return center - nodeWidth / 2;
  }
  return gridCenter - nodeWidth / 2;
}

/**
 * Pack organic nodes left-to-right with a minimum gap, then center the group on
 * the funnel grid. Falls back to collision-aware packing when the row is tight.
 */
export function layoutOrganicRail(
  nodes: OrganicChannelNodePayload[],
  params: {
    minX: number;
    maxX: number;
    railY: number;
    cellLayout: Map<string, FunnelCellLayoutEntry>;
    cells: { id: string; platform: string }[];
    nodeSize: { width: number; height: number };
  },
): Map<string, FunnelCellLayoutEntry> {
  const out = new Map<string, FunnelCellLayoutEntry>();
  if (nodes.length === 0) return out;

  const { minX, maxX, railY, cellLayout, cells, nodeSize } = params;
  const gridCenter = (minX + maxX) / 2;
  const available = maxX - minX;
  const { width: w, height: h } = nodeSize;

  const sorted = [...nodes].sort((a, b) => {
    const ar = platformRank(a.pairedPaidPlatform);
    const br = platformRank(b.pairedPaidPlatform);
    if (ar !== br) return ar - br;
    return b.postCount - a.postCount;
  });

  const evenGap =
    sorted.length > 1
      ? Math.max(MIN_NODE_GAP, (available - sorted.length * w) / (sorted.length - 1))
      : 0;
  const evenTotal = sorted.length * w + (sorted.length - 1) * evenGap;
  const evenStart = minX + (available - evenTotal) / 2;

  if (evenTotal <= available + 1) {
    sorted.forEach((node, i) => {
      out.set(node.id, {
        x: evenStart + i * (w + evenGap),
        y: railY,
        width: w,
        height: h,
      });
    });
    return out;
  }

  const placed: { node: OrganicChannelNodePayload; x: number }[] = sorted.map((node) => ({
    node,
    x: idealOrganicX(node, w, cellLayout, cells, gridCenter),
  }));
  placed.sort((a, b) => a.x - b.x);

  for (let i = 1; i < placed.length; i++) {
    const minAllowed = placed[i - 1]!.x + w + MIN_NODE_GAP;
    if (placed[i]!.x < minAllowed) placed[i]!.x = minAllowed;
  }

  const groupLeft = placed[0]!.x;
  const groupRight = placed[placed.length - 1]!.x + w;
  const shift = gridCenter - (groupLeft + groupRight) / 2;
  for (const p of placed) p.x += shift;

  if (placed[0]!.x < minX) {
    const delta = minX - placed[0]!.x;
    for (const p of placed) p.x += delta;
  }
  const last = placed[placed.length - 1]!;
  if (last.x + w > maxX) {
    const delta = last.x + w - maxX;
    for (const p of placed) p.x -= delta;
  }

  for (const p of placed) {
    out.set(p.node.id, { x: p.x, y: railY, width: w, height: h });
  }
  return out;
}

/**
 * Positions channel nodes around the funnel cell grid: organic rail above the
 * TOF row, email node below the BOF row.
 */
export function layoutChannelNodePositions(params: {
  cellLayout: Map<string, FunnelCellLayoutEntry>;
  cells: { id: string; platform: string }[];
  signals?: StrategyChannelSignals | null;
  emailAnchorCellId?: string | null;
  journeyGoal?: StrategyJourneyGoal | null;
}): Map<string, FunnelCellLayoutEntry> {
  const { cellLayout, cells, signals, emailAnchorCellId, journeyGoal } = params;
  const out = new Map<string, FunnelCellLayoutEntry>();
  if (cellLayout.size === 0) return out;

  const { minX, maxX, minY, maxY } = boundsFromCells(cellLayout);
  const organicNodes = signals?.organicNodes ?? [];

  const organicSize = resolveOrganicNodeSize(organicNodes.length, maxX - minX);
  const railY = minY - RAIL_GAP - organicSize.height;

  if (organicNodes.length > 0) {
    const organicLayout = layoutOrganicRail(organicNodes, {
      minX,
      maxX,
      railY,
      cellLayout,
      cells,
      nodeSize: organicSize,
    });
    for (const [k, v] of organicLayout) out.set(k, v);
  }

  if (signals?.emailNode) {
    const anchorBox = emailAnchorCellId ? cellLayout.get(emailAnchorCellId) : null;
    const centerX = anchorBox ? anchorBox.x + anchorBox.width / 2 : (minX + maxX) / 2;
    out.set(signals.emailNode.id, {
      x: centerX - EMAIL_NODE_SIZE.width / 2,
      y: maxY + RAIL_GAP,
      ...EMAIL_NODE_SIZE,
    });
  }

  if (journeyGoal) {
    const emailBox = signals?.emailNode ? out.get("email") : null;
    const anchorBox = emailAnchorCellId ? cellLayout.get(emailAnchorCellId) : null;
    const centerX = emailBox
      ? emailBox.x + emailBox.width / 2
      : anchorBox
        ? anchorBox.x + anchorBox.width / 2
        : (minX + maxX) / 2;
    const goalY = emailBox
      ? emailBox.y + emailBox.height + GOAL_RAIL_GAP
      : maxY + RAIL_GAP + GOAL_RAIL_GAP;
    out.set(JOURNEY_GOAL_NODE_ID, {
      x: centerX - GOAL_NODE_SIZE.width / 2,
      y: goalY,
      ...GOAL_NODE_SIZE,
    });
  }

  return out;
}
