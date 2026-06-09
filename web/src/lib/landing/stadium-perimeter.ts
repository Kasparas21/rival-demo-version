/** Point on a pill (stadium) outline; t ∈ [0,1) clockwise from top center. */
export function pointOnStadiumPerimeter(
  t: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const normalized = ((t % 1) + 1) % 1;
  const r = height / 2;
  const topHalf = Math.max(0, width / 2 - r);
  const bottomStraight = Math.max(0, width - 2 * r);
  const rightStraight = Math.max(0, height - 2 * r);
  const quarterArc = (Math.PI * r) / 2;

  const segments: { len: number; sample: (u: number) => { x: number; y: number } }[] = [
    {
      len: topHalf,
      sample: (u) => ({ x: width / 2 + u * topHalf, y: 0 }),
    },
    {
      len: quarterArc,
      sample: (u) => {
        const a = -Math.PI / 2 + u * (Math.PI / 2);
        return { x: width - r + Math.cos(a) * r, y: r + Math.sin(a) * r };
      },
    },
    {
      len: rightStraight,
      sample: (u) => ({ x: width - r, y: r + u * rightStraight }),
    },
    {
      len: quarterArc,
      sample: (u) => {
        const a = 0 + u * (Math.PI / 2);
        return { x: width - r + Math.cos(a) * r, y: height - r + Math.sin(a) * r };
      },
    },
    {
      len: bottomStraight,
      sample: (u) => ({ x: width - r - u * bottomStraight, y: height }),
    },
    {
      len: quarterArc,
      sample: (u) => {
        const a = Math.PI / 2 + u * (Math.PI / 2);
        return { x: r + Math.cos(a) * r, y: height - r + Math.sin(a) * r };
      },
    },
    {
      len: rightStraight,
      sample: (u) => ({ x: r, y: height - r - u * rightStraight }),
    },
    {
      len: quarterArc,
      sample: (u) => {
        const a = Math.PI + u * (Math.PI / 2);
        return { x: r + Math.cos(a) * r, y: r + Math.sin(a) * r };
      },
    },
    {
      len: topHalf,
      sample: (u) => ({ x: r + (1 - u) * topHalf, y: 0 }),
    },
  ];

  const total = segments.reduce((sum, s) => sum + s.len, 0);
  let dist = normalized * total;

  for (const segment of segments) {
    if (dist <= segment.len || segment === segments[segments.length - 1]) {
      const u = segment.len > 0 ? Math.min(1, dist / segment.len) : 0;
      return segment.sample(u);
    }
    dist -= segment.len;
  }

  return { x: width / 2, y: 0 };
}

/** Cosine ease — slow at ends, fast in the middle (vertical sides). */
export function cosineEase01(p: number): number {
  const clamped = Math.max(0, Math.min(1, p));
  return 0.5 * (1 - Math.cos(Math.PI * clamped));
}

export const CTA_COMET_CYCLE_MS = 2400;

/** One half-lap ease: slow at both ends, fastest at the middle (pill side). */
export function cometHalfEase01(p: number): number {
  const t = Math.max(0, Math.min(1, p));
  // Power < 1 compresses dwell at top/bottom centers → faster side transit.
  return 0.5 * (1 - Math.cos(Math.PI * Math.pow(t, 0.58)));
}

/** Path progress 0…1 — continuous clockwise loop. */
export function cometPathProgress(elapsedMs: number): number {
  return (elapsedMs % CTA_COMET_CYCLE_MS) / CTA_COMET_CYCLE_MS;
}

/** Clockwise head position along a closed stadium path (0 … totalLength, seamless loop). */
export function cometHeadDistance(elapsedMs: number, totalLength: number): number {
  return cometPathProgress(elapsedMs) * totalLength;
}

/** Closed stadium outline — clockwise from top-left, no seam overlap. */
export function buildStadiumPathD(width: number, height: number, pad = 0): string {
  const r = height / 2;
  const x0 = pad;
  const y0 = pad;
  const left = x0 + r;
  const right = x0 + width - r;
  const bottom = y0 + height;

  return [
    `M ${left} ${y0}`,
    `H ${right}`,
    `A ${r} ${r} 0 0 1 ${right} ${bottom}`,
    `H ${left}`,
    `A ${r} ${r} 0 0 1 ${left} ${y0}`,
    "Z",
  ].join(" ");
}

export function wrapPathDistance(distance: number, totalLength: number): number {
  if (totalLength <= 0) return 0;
  return ((distance % totalLength) + totalLength) % totalLength;
}

/** Sample points from head backward along the path by `cometLen` (handles seam wrap). */
export function sampleCometPoints(
  headDist: number,
  cometLen: number,
  totalLen: number,
  samples: number,
  pointAt: (distance: number) => { x: number; y: number },
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i <= samples; i += 1) {
    const arcBack = (cometLen * i) / samples;
    const dist =
      arcBack <= headDist ? headDist - arcBack : totalLen - (arcBack - headDist);
    points.push(pointAt(dist));
  }

  return points;
}
