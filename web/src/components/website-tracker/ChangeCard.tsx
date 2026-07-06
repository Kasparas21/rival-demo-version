"use client";

import { useMemo, useState } from "react";

import { alertGlassCardClass } from "@/components/competitor/alerts/alert-ui-styles";

import { ScreenshotCompareViewer } from "./ScreenshotCompareViewer";
import {
  fmtRelative,
  parseChangeAnalysis,
  type LandingPageChangeRow,
} from "./types";

type Props = {
  change: LandingPageChangeRow;
  prevScreenshotUrl?: string | null;
  prevHeroScreenshotUrl?: string | null;
};

function urgencyClass(urgency?: string): string {
  if (urgency === "high") return "text-red-600";
  if (urgency === "medium") return "text-amber-600";
  return "text-slate-500";
}

export function ChangeCard({ change, prevScreenshotUrl, prevHeroScreenshotUrl }: Props) {
  const [compareOpen, setCompareOpen] = useState(false);
  const analysis = useMemo(() => parseChangeAnalysis(change.change_analysis), [change.change_analysis]);
  const page = change.landing_pages;
  const label = page?.label ?? "Landing page";
  const prevHero = prevHeroScreenshotUrl ?? prevScreenshotUrl ?? null;
  const newHero = change.hero_screenshot_url ?? change.screenshot_url;
  const confidence = analysis.change_confidence ?? "confirmed";
  const isSuspectedAb = confidence === "suspected_ab";
  const isConfirmed = confidence === "confirmed";

  const title = isSuspectedAb
    ? `${label} · possible A/B test · ${fmtRelative(change.taken_at)}`
    : isConfirmed
      ? `${label} changed · ${fmtRelative(change.taken_at)}`
      : `${label} · ${fmtRelative(change.taken_at)}`;

  return (
    <>
      <article className={`${alertGlassCardClass} overflow-hidden p-4`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full shadow-sm ${
              isSuspectedAb ? "bg-amber-500" : isConfirmed ? "bg-red-500" : "bg-slate-300"
            }`}
          />
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        </div>

        {isSuspectedAb ? (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            We spotted a visual difference once. It might be an A/B test — we&apos;ll confirm if it
            persists on the next capture.
          </p>
        ) : null}

        {isConfirmed && analysis.change_confidence === "confirmed" && change.pixel_diff_pct != null && change.pixel_diff_pct < 2 ? (
          <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            This change has persisted across multiple checks — likely permanent or a winning test
            variant.
          </p>
        ) : null}

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {prevHero ? (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Before</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={prevHero}
                alt="Before"
                className="max-h-56 w-full rounded-lg border border-slate-200 object-cover object-top"
              />
            </div>
          ) : null}
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">After</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={newHero}
              alt="After"
              className="max-h-56 w-full rounded-lg border border-slate-200 object-cover object-top"
            />
          </div>
        </div>

        {analysis.what_changed ? (
          <section className="mb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">What changed</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-800">{analysis.what_changed}</p>
          </section>
        ) : null}

        {analysis.strategic_interpretation ? (
          <section className="mb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Why it matters</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{analysis.strategic_interpretation}</p>
          </section>
        ) : null}

        {analysis.what_to_do ? (
          <section className="mb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">What you should do</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-800">{analysis.what_to_do}</p>
          </section>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {analysis.urgency ? (
            <span className={urgencyClass(analysis.urgency)}>
              Urgency: <span className="capitalize">{analysis.urgency}</span>
            </span>
          ) : null}
          {typeof analysis.threat_score === "number" ? (
            <span className="font-medium text-slate-700">Threat score: {analysis.threat_score}/10</span>
          ) : null}
          {change.pixel_diff_pct != null ? (
            <span className="text-slate-400">{change.pixel_diff_pct}% pixels changed</span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setCompareOpen(true)}
          className="mt-4 text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
        >
          View full screenshots →
        </button>
      </article>

      {prevScreenshotUrl ? (
        <ScreenshotCompareViewer
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          beforeUrl={prevScreenshotUrl}
          afterUrl={change.screenshot_url}
          beforeLabel={`Before — ${fmtRelative(change.taken_at)}`}
          afterLabel={`After — ${fmtRelative(change.taken_at)}`}
        />
      ) : null}
    </>
  );
}
