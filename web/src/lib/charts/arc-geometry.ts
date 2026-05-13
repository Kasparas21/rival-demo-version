/**
 * Polar coords for SVG arcs: 0° = top (12 o'clock), 90° = right, increasing clockwise.
 */
export function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

/**
 * Clockwise elliptical arc `d` from startAngleDeg to endAngleDeg (same angle convention).
 * Expect endAngleDeg >= startAngleDeg (angles may exceed 360° — trig wraps correctly).
 */
export function describeArcClockwise(
  cx: number,
  cy: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number
): string {
  const start = polarToCartesian(cx, cy, radius, startAngleDeg);
  const end = polarToCartesian(cx, cy, radius, endAngleDeg);
  const sweepDeg = endAngleDeg - startAngleDeg;
  const largeArcFlag = sweepDeg > 180 ? 1 : 0;
  const sweepFlag = 1;
  return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, sweepFlag, end.x, end.y].join(" ");
}
