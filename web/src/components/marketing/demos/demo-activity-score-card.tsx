"use client";

import { Check } from "lucide-react";
import { DEMO_ACTIVITY_SCORE } from "@/lib/landing/hero-variant-b-demo-data";

export function DemoActivityScoreCard() {
  const tierClass =
    DEMO_ACTIVITY_SCORE.tier === 4
      ? "bg-indigo-100 text-indigo-900 border-indigo-300"
      : "bg-slate-100 text-slate-800 border-slate-200";

  return (
    <div className="rounded-2xl border border-[#e5e7eb]/90 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">Activity score</p>
      <div className="mt-3 flex flex-wrap items-end gap-2 sm:gap-3">
        <p className="text-[48px] font-extrabold leading-none tabular-nums text-[color:var(--rival-primary)]">
          {DEMO_ACTIVITY_SCORE.score}
        </p>
        <span className="mb-1 text-sm text-[#71717a]">/100</span>
        <span
          className={`mb-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tierClass}`}
        >
          {DEMO_ACTIVITY_SCORE.tierLabel}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f4f4f5]">
        <div
          className="h-full rounded-full bg-[color:var(--rival-primary)]"
          style={{ width: `${DEMO_ACTIVITY_SCORE.score}%` }}
        />
      </div>
      <p className="mt-3 text-sm font-semibold text-[#3f3f46]">{DEMO_ACTIVITY_SCORE.spend}</p>
      <p className="mt-0.5 text-xs text-[#71717a]">
        {DEMO_ACTIVITY_SCORE.confidence} · {DEMO_ACTIVITY_SCORE.topPercent}
      </p>
      <div className="mt-4 rounded-xl border border-[color:var(--rival-accent-blue)]/35 bg-[color:var(--rival-accent-blue)]/25 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#52525b]">Why this score</p>
        <ul className="mt-2 space-y-2">
          {DEMO_ACTIVITY_SCORE.reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-2 text-sm text-[#3f3f46]">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--rival-primary)]" aria-hidden />
              {reason}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
