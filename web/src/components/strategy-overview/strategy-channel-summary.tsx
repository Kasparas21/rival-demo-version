"use client";

import { Leaf, Link2, Mail } from "lucide-react";

import type { StrategyChannelSignals } from "@/lib/strategy-overview/payload-types";
import { formatEngagementCount } from "@/components/organic/organic-ui-utils";

type Props = {
  signals: StrategyChannelSignals;
  onOpenOrganic?: () => void;
  onOpenEmail?: () => void;
};

const CARD =
  "relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] min-w-0";

export function StrategyChannelSummary({ signals, onOpenOrganic, onOpenEmail }: Props) {
  const hasOrganic = signals.organicNodes.length > 0;
  const hasEmail = signals.emailNode != null;
  if (!hasOrganic && !hasEmail) return null;

  const crossChannelEdges = signals.channelEdges.filter(
    (e) => e.kind === "organic_to_paid" || e.kind === "paid_to_email",
  );

  return (
    <div className={CARD}>
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-violet-400/20 blur-2xl" aria-hidden />
      <div className="relative">
        <div className="mb-2.5 flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <Link2 className="h-3.5 w-3.5" />
          </span>
          <p className="text-[11px] font-semibold leading-tight text-[#0f172a]">Cross-channel funnel</p>
        </div>

        {hasOrganic ? (
          <div className="mt-2 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Organic surfaces</p>
            {signals.organicNodes.slice(0, 4).map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={onOpenOrganic}
                className="flex w-full items-center justify-between rounded-lg border border-violet-100 bg-violet-50/50 px-2.5 py-1.5 text-left transition hover:bg-violet-50"
              >
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-800">
                  <Leaf className="h-3 w-3 text-violet-500" />
                  {n.label}
                </span>
                <span className="text-[10px] tabular-nums text-slate-500">
                  {n.postCount} posts · {formatEngagementCount(n.avgEngagement)} avg
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {hasEmail && signals.emailNode ? (
          <button
            type="button"
            onClick={onOpenEmail}
            className="mt-2.5 flex w-full items-center justify-between rounded-lg border border-amber-100 bg-amber-50/50 px-2.5 py-2 text-left transition hover:bg-amber-50"
          >
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-800">
              <Mail className="h-3 w-3 text-amber-600" />
              Email capture
            </span>
            <span className="text-[10px] tabular-nums text-slate-500">
              {signals.emailNode.emailCount} emails · ~{signals.emailNode.emailsPerWeek}/wk
            </span>
          </button>
        ) : null}

        {crossChannelEdges.length > 0 ? (
          <p className="mt-2.5 text-[10px] leading-relaxed text-slate-500">
            {crossChannelEdges.length} connection{crossChannelEdges.length === 1 ? "" : "s"} link organic
            audience warming to paid ads and bottom-funnel capture into email.
          </p>
        ) : null}
      </div>
    </div>
  );
}
