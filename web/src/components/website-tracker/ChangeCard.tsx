"use client";

import { ChevronDown, Expand, MousePointerClick } from "lucide-react";
import { useMemo, useState } from "react";

import { alertGlassCardClass } from "@/components/competitor/alerts/alert-ui-styles";
import { cn } from "@/lib/utils";

import {
  formatSectionLabels,
  getChangeStatusMeta,
  getElementChanges,
  parsePageTextSnapshot,
  summarizeWhatChanged,
  type ElementChange,
} from "./change-display";
import { ScreenshotCompareViewer } from "./ScreenshotCompareViewer";
import { fmtRelative, parseChangeAnalysis, type LandingPageChangeRow, type VisualChangeRegion } from "./types";

type Props = {
  change: LandingPageChangeRow & {
    prev_screenshot_url?: string | null;
    prev_hero_screenshot_url?: string | null;
    prev_page_text?: unknown;
    prev_taken_at?: string | null;
  };
  prevScreenshotUrl?: string | null;
  prevHeroScreenshotUrl?: string | null;
};

function ElementChangeRow({
  item,
  heroBefore,
  heroAfter,
}: {
  item: ElementChange;
  heroBefore: string | null;
  heroAfter: string | null;
}) {
  const isCta = item.id === "cta";
  const showHeroSlice = isCta && heroBefore && heroAfter;

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">Before</p>
          {isCta ? (
            <span className="inline-block max-w-full rounded-lg bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-800">
              {item.before}
            </span>
          ) : (
            <p className="text-[13px] font-medium leading-snug text-slate-800">{item.before}</p>
          )}
        </div>
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">After</p>
          {isCta ? (
            <span className="inline-block max-w-full rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white">
              {item.after}
            </span>
          ) : (
            <p className="text-[13px] font-medium leading-snug text-slate-900">{item.after}</p>
          )}
        </div>
      </div>
      {showHeroSlice ? (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
          <div>
            <p className="mb-1 text-[10px] text-slate-400">In page (before)</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroBefore}
              alt=""
              className="h-28 w-full rounded-lg border border-slate-200 object-cover object-[center_35%]"
            />
          </div>
          <div>
            <p className="mb-1 text-[10px] text-slate-400">In page (after)</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroAfter}
              alt=""
              className="h-28 w-full rounded-lg border border-slate-200 object-cover object-[center_35%]"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VisualChangeRow({ item }: { item: VisualChangeRegion }) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">Before</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.before_crop_url}
            alt=""
            className="max-h-40 w-full rounded-lg border border-slate-200 object-contain bg-slate-50"
          />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">After</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.after_crop_url}
            alt=""
            className="max-h-40 w-full rounded-lg border border-slate-200 object-contain bg-slate-50"
          />
        </div>
      </div>
      {item.color_changed && item.before_color && item.after_color ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
          <span className="font-medium text-slate-500">Color:</span>
          <span className="inline-flex items-center gap-1">
            <span
              className="h-3.5 w-3.5 rounded border border-slate-200"
              style={{ backgroundColor: item.before_color }}
            />
            {item.before_color}
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <span
              className="h-3.5 w-3.5 rounded border border-slate-200"
              style={{ backgroundColor: item.after_color }}
            />
            {item.after_color}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function ChangeCard({ change, prevScreenshotUrl, prevHeroScreenshotUrl }: Props) {
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareMode, setCompareMode] = useState<"hero" | "full">("full");
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const analysis = useMemo(() => parseChangeAnalysis(change.change_analysis), [change.change_analysis]);
  const status = useMemo(() => getChangeStatusMeta(analysis), [analysis]);
  const page = change.landing_pages;
  const label = page?.label ?? "Landing page";
  const displayUrl = page?.url?.replace(/^https?:\/\//, "") ?? "";

  const prevHero = prevHeroScreenshotUrl ?? prevScreenshotUrl ?? null;
  const newHero = change.hero_screenshot_url ?? change.screenshot_url;
  const fullBefore = prevScreenshotUrl ?? prevHero;
  const fullAfter = change.screenshot_url;

  const prevText = parsePageTextSnapshot(
    (change.prev_page_text ?? null) as import("@/lib/supabase/types").Json,
  );
  const newText = parsePageTextSnapshot(change.page_text);
  const elementChanges = useMemo(() => getElementChanges(prevText, newText), [prevText, newText]);
  const sectionLabels = formatSectionLabels(analysis.sections_changed);
  const shortSummary = summarizeWhatChanged(analysis.what_changed);

  const visualChanges = analysis.visual_changes ?? [];
  const canCompare = Boolean(fullBefore && fullAfter);

  return (
    <>
      <article className={`${alertGlassCardClass} overflow-hidden p-4 sm:p-5`}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full shadow-sm", status.dotClass)} />
              <h3 className="text-base font-semibold text-slate-900">{label}</h3>
              <span className="text-xs text-slate-500">{fmtRelative(change.taken_at)}</span>
            </div>
            {displayUrl ? (
              <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">{displayUrl}</p>
            ) : null}
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              status.badgeClass,
            )}
          >
            {status.badge}
          </span>
        </div>

        <p className="mb-4 text-[12px] leading-relaxed text-slate-600">{status.hint}</p>

        {analysis.ignored_animation ? (
          <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
            Ignored animated area (e.g. logo carousel) — difference was inside a calibrated moving region.
          </p>
        ) : null}

        {sectionLabels.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {sectionLabels.map((s) => (
              <span
                key={s}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600"
              >
                {s}
              </span>
            ))}
          </div>
        ) : null}

        {elementChanges.length > 0 ? (
          <div className="mb-4 space-y-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <MousePointerClick className="h-3.5 w-3.5" />
              What changed
            </p>
            {elementChanges.map((item) => (
              <ElementChangeRow
                key={item.id}
                item={item}
                heroBefore={prevHero}
                heroAfter={newHero}
              />
            ))}
          </div>
        ) : shortSummary ? (
          <p className="mb-4 text-[13px] leading-relaxed text-slate-800">{shortSummary}</p>
        ) : null}

        <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {prevHero ? (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Before</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={prevHero}
                alt="Before"
                className="max-h-[min(52vh,480px)] w-full rounded-xl border border-slate-200 object-cover object-top shadow-sm"
              />
            </div>
          ) : null}
          <div className={prevHero ? "" : "lg:col-span-2"}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">After</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={newHero}
              alt="After"
              className="max-h-[min(52vh,480px)] w-full rounded-xl border border-slate-200 object-cover object-top shadow-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canCompare ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setCompareMode("full");
                  setCompareOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Expand className="h-3.5 w-3.5" />
                View full page
              </button>
              {prevHero && change.hero_screenshot_url ? (
                <button
                  type="button"
                  onClick={() => {
                    setCompareMode("hero");
                    setCompareOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Compare hero section
                </button>
              ) : null}
            </>
          ) : null}
          {typeof analysis.threat_score === "number" ? (
            <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-2 text-[11px] font-medium text-slate-600">
              Threat {analysis.threat_score}/10
            </span>
          ) : null}
          {change.pixel_diff_pct != null ? (
            <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-2 text-[11px] font-medium text-slate-500">
              {change.pixel_diff_pct}% pixels changed
            </span>
          ) : null}
        </div>

        {(analysis.strategic_interpretation || analysis.what_to_do || (analysis.what_changed && analysis.what_changed.length > 160) || visualChanges.length > 0) ? (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setAnalysisOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <span>Full AI analysis</span>
              <ChevronDown className={cn("h-4 w-4 transition", analysisOpen && "rotate-180")} />
            </button>
            {analysisOpen ? (
              <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-slate-700">
                {visualChanges.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Close-up changes
                    </p>
                    {visualChanges.map((item) => (
                      <VisualChangeRow key={item.id} item={item} />
                    ))}
                  </div>
                ) : null}
                {analysis.what_changed ? (
                  <p>
                    <span className="font-semibold text-slate-800">What changed: </span>
                    {analysis.what_changed}
                  </p>
                ) : null}
                {analysis.strategic_interpretation ? (
                  <p>
                    <span className="font-semibold text-slate-800">Why it matters: </span>
                    {analysis.strategic_interpretation}
                  </p>
                ) : null}
                {analysis.what_to_do ? (
                  <p>
                    <span className="font-semibold text-slate-800">Suggested action: </span>
                    {analysis.what_to_do}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </article>

      {canCompare && fullBefore && fullAfter ? (
        <ScreenshotCompareViewer
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          beforeUrl={compareMode === "hero" && prevHero ? prevHero : fullBefore}
          afterUrl={compareMode === "hero" && change.hero_screenshot_url ? change.hero_screenshot_url : fullAfter}
          beforeLabel={change.prev_taken_at ? `Before — ${fmtRelative(change.prev_taken_at)}` : "Before"}
          afterLabel={`After — ${fmtRelative(change.taken_at)}`}
          heroBeforeUrl={prevHero}
          heroAfterUrl={change.hero_screenshot_url}
          defaultMode={compareMode}
        />
      ) : null}
    </>
  );
}
