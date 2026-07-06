"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import { DEMO_STRATEGY_CHANNEL_SIGNALS, DEMO_STRATEGY_MAP } from "@/lib/landing/hero-variant-b-demo-data";

const StrategyMapFlow = dynamic(
  () =>
    import("@/components/strategy-overview/strategy-map-flow").then((m) => m.StrategyMapFlow),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[188px] items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50/80">
        <p className="text-[10px] text-slate-500">Loading strategy map…</p>
      </div>
    ),
  },
);

/** Strategy Map card — production flow, compact to match other landing coverage cards. */
export function LandingStrategyMapMock() {
  const mapKey = useMemo(() => {
    const cells = DEMO_STRATEGY_MAP.funnelCells ?? [];
    const organic = DEMO_STRATEGY_CHANNEL_SIGNALS.organicNodes.map((n) => n.id).join(",");
    return `landing-coverage-${cells.map((c) => `${c.id}:${c.adCount}`).join("|")}-${organic}`;
  }, []);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <StrategyMapFlow
        mapKey={mapKey}
        map={DEMO_STRATEGY_MAP}
        channelSignals={DEMO_STRATEGY_CHANNEL_SIGNALS}
        compact
      />
    </div>
  );
}
