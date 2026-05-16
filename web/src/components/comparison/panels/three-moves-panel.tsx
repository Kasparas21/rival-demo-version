"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  Crosshair,
  Eye,
  Lightbulb,
  RefreshCw,
  Target,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import type { BrandComparisonLlmResult } from "@/lib/brand-comparison/run-brand-comparison-llm";
import { RivalLoadingBlock, RivalLogoVideo } from "@/components/ui/rival-loading";

const CATEGORY_META: Record<
  BrandComparisonLlmResult["moves"][number]["category"],
  { label: string; pill: string; bar: string; chip: string }
> = {
  COPY_ANGLE: {
    label: "COPY ANGLE",
    pill: "bg-blue-100 text-blue-800 border-blue-200",
    bar: "bg-blue-500",
    chip: "bg-blue-100 text-blue-800",
  },
  SHIFT_BUDGET: {
    label: "SHIFT BUDGET",
    pill: "bg-purple-100 text-purple-800 border-purple-200",
    bar: "bg-purple-500",
    chip: "bg-purple-100 text-purple-800",
  },
  REFRESH_CREATIVE: {
    label: "REFRESH CREATIVE",
    pill: "bg-amber-100 text-amber-900 border-amber-200",
    bar: "bg-amber-500",
    chip: "bg-amber-100 text-amber-900",
  },
  DEFEND: {
    label: "DEFEND",
    pill: "bg-emerald-100 text-emerald-800 border-emerald-200",
    bar: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-800",
  },
  EXPAND: {
    label: "EXPAND",
    pill: "bg-cyan-100 text-cyan-800 border-cyan-200",
    bar: "bg-cyan-500",
    chip: "bg-cyan-100 text-cyan-800",
  },
};

function splitEvidence(text: string): { punch: string; rest: string } {
  const t = text.trim();
  const chunks = t.match(/[^.!?]+[.!?]+/g);
  if (!chunks || chunks.length <= 1) {
    return { punch: t, rest: "" };
  }
  const punch = chunks.slice(0, 2).join(" ").trim();
  const rest = chunks.slice(2).join(" ").trim();
  return { punch, rest };
}

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
  const rm = useReducedMotion() ?? false;

  const goCopyVault = (angleRef?: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", "audience-copy");
    p.set("sub", "copy-vault");
    p.delete("angle");
    p.delete("anglePick");
    p.delete("angleCat");
    if (angleRef?.trim()) {
      p.set("angleQ", angleRef.trim());
    } else {
      p.delete("angleQ");
    }
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
      goCopyVault(angleRef);
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
    <div
      id="comparison-moves"
      className="relative mb-12 scroll-mt-36 pt-8 pb-2"
    >
      <div
        className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
        aria-hidden
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Three moves to make</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">This week&apos;s tactical priorities</h3>
          <p className="mt-1 text-sm text-slate-500">Grounded in your latest scrape, not generic advice.</p>
        </div>
        {isLoading ? <RivalLogoVideo size="inline" className="shrink-0" /> : null}
      </div>

      {headlineTitles ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-gradient-to-r from-sky-50 to-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-800 shadow-sm">
            <Target className="h-3.5 w-3.5 text-sky-600" />
            {workspaceName}: {headlineTitles.userArchetype}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-gradient-to-r from-amber-50/80 to-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-800 shadow-sm">
            <Crosshair className="h-3.5 w-3.5 text-amber-700" />
            {competitorName}: {headlineTitles.competitorArchetype}
          </span>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Analysis in progress</p>
          <p className="mt-1 text-amber-900/90">{errorMessage}</p>
          <button
            type="button"
            onClick={() => onInvalidate()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : isLoading && !moves ? (
        <RivalLoadingBlock padded className="mt-6 py-10" />
      ) : !moves || moves.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No moves available yet.</p>
      ) : (
        <>
          <ol className="mt-6 space-y-5">
            {moves.map((m, i) => (
              <MoveCard
                key={`${m.category}-${i}`}
                move={m}
                index={i}
                reduceMotion={rm}
                onPrimary={() => handleAction({ type: m.primaryAction.type, angleRef: m.primaryAction.angleRef })}
                onSecondary={() => {
                  if (m.primaryAction.type === "create_brief") {
                    goCopyVault(m.primaryAction.angleRef);
                  } else {
                    handleAction({ type: "view_ads", angleRef: m.primaryAction.angleRef });
                  }
                }}
              />
            ))}
          </ol>
          {moves.length < 3 ? (
            <p className="mt-4 text-xs text-slate-500">
              Limited data: {moves.length} move{moves.length === 1 ? "" : "s"} surfaced. Results sharpen after the next scrape.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function MoveCard({
  move,
  index,
  reduceMotion,
  onPrimary,
  onSecondary,
}: {
  move: BrandComparisonLlmResult["moves"][number];
  index: number;
  reduceMotion: boolean;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  const meta = CATEGORY_META[move.category];
  const { punch, rest } = splitEvidence(move.evidence);
  const [open, setOpen] = useState(false);
  const showSecondary = move.primaryAction.type !== "view_ads";

  return (
    <motion.li
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/40 shadow-sm"
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${meta.bar}`} />
      <div className="relative pl-6 pr-5 py-5">
        <div className="flex flex-wrap items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${meta.chip} shadow-inner`}
          >
            {index + 1}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.pill}`}
            >
              {meta.label}
            </span>
            <h4 className="text-xl font-semibold tracking-tight text-slate-900">{move.title}</h4>
            <div className="border-t border-slate-200/80 pt-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">The opportunity</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">{punch}</p>
                </div>
              </div>
              {rest ? (
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
                  {open ? "Hide full evidence" : "See full evidence"}
                </button>
              ) : null}
              {open && rest ? <p className="mt-2 text-sm leading-relaxed text-slate-600">{rest}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-200/80 pt-4">
              <button
                type="button"
                onClick={onPrimary}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--rival-primary,#343434)] px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                {move.primaryAction.label}
                <ArrowRight className="h-4 w-4" />
              </button>
              {showSecondary ? (
                <button
                  type="button"
                  onClick={onSecondary}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                >
                  <Eye className="h-4 w-4" />
                  {move.primaryAction.type === "create_brief" ? "See their ads" : "Open analysis"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </motion.li>
  );
}
