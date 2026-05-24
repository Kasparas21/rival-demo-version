"use client";

const SIZE = 240;
const CX = SIZE / 2;
const CY = SIZE / 2;
const MAX_R = 72;
const LABEL_R = 102;
const VIEW_PAD = 28;

function polarToCartesian(angleRad: number, radius: number): { x: number; y: number } {
  return {
    x: CX + radius * Math.cos(angleRad),
    y: CY + radius * Math.sin(angleRad),
  };
}

function gridRingPoints(fraction: number): string {
  const step = (2 * Math.PI) / 6;
  const start = -Math.PI / 2;
  const r = MAX_R * fraction;
  return Array.from({ length: 6 }, (_, i) => {
    const { x, y } = polarToCartesian(start + i * step, r);
    return `${x},${y}`;
  }).join(" ");
}

function SkeletonHexagon() {
  const step = (2 * Math.PI) / 6;
  const start = -Math.PI / 2;
  const outer = Array.from({ length: 6 }, (_, i) => {
    const { x, y } = polarToCartesian(start + i * step, MAX_R);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div className="relative rounded-2xl border border-white/70 bg-gradient-to-br from-white/70 via-white/45 to-emerald-50/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_32px_-14px_rgba(149,193,75,0.18)] backdrop-blur-md ring-1 ring-white/55">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
        />
        <svg
          viewBox={`${-VIEW_PAD} ${-VIEW_PAD} ${SIZE + VIEW_PAD * 2} ${SIZE + VIEW_PAD * 2}`}
          className="mx-auto h-auto w-full max-w-[260px]"
          aria-hidden
        >
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <polygon
              key={f}
              points={gridRingPoints(f)}
              fill="none"
              stroke="rgba(226,232,240,0.9)"
              strokeWidth={1}
              className="animate-pulse"
              style={{ animationDelay: `${f * 120}ms` }}
            />
          ))}
          <polygon
            points={outer}
            fill="rgba(241,245,249,0.65)"
            stroke="rgba(203,213,225,0.8)"
            strokeWidth={1.5}
            className="animate-pulse"
          />
          {Array.from({ length: 6 }).map((_, i) => {
            const { x, y } = polarToCartesian(start + i * step, LABEL_R);
            return (
              <rect
                key={i}
                x={x - 14}
                y={y - 5}
                width={28}
                height={10}
                rx={5}
                className="ai-sk-shimmer"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function SkBlock({ className }: { className?: string }) {
  return <div className={`ai-sk-shimmer rounded-lg ${className ?? ""}`} aria-hidden />;
}

export function AdPreviewAnalysisSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading AI analysis">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <SkBlock className="h-2.5 w-20" />
          <SkBlock className="h-3 w-28" />
        </div>
        <SkBlock className="h-6 w-24 rounded-full" />
      </div>

      <SkeletonHexagon />

      <div className="space-y-2.5 rounded-xl border border-white/70 bg-white/45 p-3.5 backdrop-blur-md ring-1 ring-white/50">
        <SkBlock className="h-2 w-24" />
        <SkBlock className="h-7 w-32 rounded-full" />
        <SkBlock className="h-3 w-full" />
        <SkBlock className="h-3 w-[92%]" />
        <SkBlock className="h-3 w-[78%]" />
      </div>

      <div className="space-y-3 rounded-xl border border-white/70 bg-gradient-to-br from-white/60 to-[#DDF1FD]/25 p-3.5 backdrop-blur-md ring-1 ring-white/50">
        <SkBlock className="h-3 w-32" />
        <SkBlock className="h-12 w-full rounded-lg" />
        <div className="space-y-1.5">
          <SkBlock className="h-2.5 w-[88%]" />
          <SkBlock className="h-2.5 w-[72%]" />
          <SkBlock className="h-2.5 w-[80%]" />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-white/70 bg-white/45 p-3.5 backdrop-blur-md ring-1 ring-white/50">
        <SkBlock className="h-3 w-20" />
        <SkBlock className="h-10 w-full rounded-lg" />
      </div>

      <div className="flex flex-wrap gap-2">
        <SkBlock className="h-6 w-20 rounded-full" />
        <SkBlock className="h-6 w-24 rounded-full" />
        <SkBlock className="h-6 w-[4.5rem] rounded-full" />
      </div>
    </div>
  );
}
