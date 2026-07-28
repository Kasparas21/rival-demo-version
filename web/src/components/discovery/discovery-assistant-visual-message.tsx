"use client";

import type { DiscoveryVisualStat } from "@/lib/discovery/discovery-assistant-types";
import { cn } from "@/lib/utils";

type Props = {
  message: string;
  visualStats?: DiscoveryVisualStat[];
};

const TONE_CLASS: Record<NonNullable<DiscoveryVisualStat["tone"]>, string> = {
  up: "border-[color-mix(in_srgb,var(--rival-success)_35%,white)] bg-[color-mix(in_srgb,var(--rival-success)_12%,white)] text-[color-mix(in_srgb,var(--rival-success)_75%,#1a1a2e)]",
  down: "border-rose-200/80 bg-rose-50/90 text-rose-900 backdrop-blur-sm",
  hot: "border-[color-mix(in_srgb,var(--rival-accent-warm)_55%,white)] bg-[color-mix(in_srgb,var(--rival-accent-warm)_35%,white)] text-amber-950 backdrop-blur-sm",
  neutral: "border-white/70 bg-white/55 text-[color:var(--rival-primary)] backdrop-blur-sm",
};

export function DiscoveryAssistantVisualMessage({ message, visualStats }: Props) {
  return (
    <div className="space-y-3">
      {visualStats?.length ? (
        <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visualStats.map((stat) => (
            <div
              key={`${stat.label}-${stat.value}`}
              className={cn(
                "shrink-0 rounded-xl border px-3 py-2 shadow-sm",
                TONE_CLASS[stat.tone ?? "neutral"],
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{stat.label}</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums">{stat.value}</p>
            </div>
          ))}
        </div>
      ) : null}
      {message ? (
        <p className="text-[13px] font-medium leading-snug text-slate-700">{message}</p>
      ) : null}
    </div>
  );
}
