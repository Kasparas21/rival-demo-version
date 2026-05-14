"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, RefreshCw } from "lucide-react";

import type { BrandComparisonLlmResult } from "@/lib/brand-comparison/run-brand-comparison-llm";
import { RivalLoadingBlock, RivalLogoVideo } from "@/components/ui/rival-loading";

const PILL: Record<
  BrandComparisonLlmResult["moves"][number]["category"],
  { label: string; className: string }
> = {
  COPY_ANGLE: { label: "COPY ANGLE", className: "bg-blue-100 text-blue-700 border-blue-200" },
  SHIFT_BUDGET: { label: "SHIFT BUDGET", className: "bg-purple-100 text-purple-700 border-purple-200" },
  REFRESH_CREATIVE: { label: "REFRESH CREATIVE", className: "bg-amber-100 text-amber-700 border-amber-200" },
  DEFEND: { label: "DEFEND", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  EXPAND: { label: "EXPAND", className: "bg-cyan-100 text-cyan-700 border-cyan-200" },
};

type Props = {
  headlineTitles: BrandComparisonLlmResult["headlineTitles"] | null;
  moves: BrandComparisonLlmResult["moves"] | null;
  isLoading: boolean;
  errorMessage: string | null;
  workspaceName: string;
  competitorName: string;
  onInvalidate: () => void;
};

export function ThreeMovesPanel({
  headlineTitles,
  moves,
  isLoading,
  errorMessage,
  workspaceName,
  competitorName,
  onInvalidate,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goBriefs = () => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", "audience-copy");
    p.set("sub", "briefs");
    router.push(`${pathname}?${p.toString()}`);
  };

  const scrollAdWall = () => {
    document.getElementById("comparison-ad-wall")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollBudget = () => {
    document.getElementById("comparison-budget-split")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAction = (args: { type: string; angleRef?: string }) => {
    const { type, angleRef } = args;
    if (type === "create_brief") {
      goBriefs();
    } else if (type === "view_ads") {
      scrollAdWall();
      if (angleRef?.trim()) {
        const target = angleRef.trim();
        window.setTimeout(() => {
          const nodes = document.querySelectorAll("[data-stealable-angle]");
          for (const el of nodes) {
            if (el.getAttribute("data-stealable-angle") === target) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              break;
            }
          }
        }, 400);
      }
    } else if (type === "view_analysis") {
      scrollBudget();
    }
  };

  return (
    <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold uppercase tracking-wider text-slate-700">Three moves to make this week</h3>
          <p className="mt-1 text-sm text-slate-500">Tactical, evidence-backed priorities from Claude Sonnet.</p>
        </div>
        {isLoading ? (
          <span className="inline-flex shrink-0 rounded-md border border-slate-200/80 bg-white p-[3px]">
            <RivalLogoVideo size="inline" />
          </span>
        ) : null}
      </div>

      {headlineTitles ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">
            {workspaceName}: {headlineTitles.userArchetype}
          </span>
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">
            {competitorName}: {headlineTitles.competitorArchetype}
          </span>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Analysis in progress</p>
          <p className="mt-1 text-amber-900/90">{errorMessage}</p>
          <button
            type="button"
            onClick={() => onInvalidate()}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : isLoading && !moves ? (
        <RivalLoadingBlock title="Generating three moves…" description="Grounding recommendations in your live stats." padded className="mt-4 py-10" />
      ) : !moves || moves.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No moves available yet.</p>
      ) : (
        <>
          <ol className="mt-4 space-y-4">
            {moves.map((m, i) => {
              const pill = PILL[m.category];
              return (
                <li
                  key={`${m.category}-${i}`}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 tabular-nums">{i + 1}.</span>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${pill.className}`}
                    >
                      {pill.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{m.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{m.evidence}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleAction({ type: m.primaryAction.type, angleRef: m.primaryAction.angleRef })}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-800 shadow-sm hover:bg-[var(--rival-accent-blue,#DDF1FD)]"
                    >
                      {m.primaryAction.label}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          {moves.length < 3 ? (
            <p className="mt-3 text-xs text-slate-500">
              Limited data: only {moves.length} move{moves.length === 1 ? "" : "s"} identified. Results sharpen after the next scrape.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
