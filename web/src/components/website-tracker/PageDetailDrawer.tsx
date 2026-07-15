"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  Camera,
  ExternalLink,
  GitCompareArrows,
  History,
  Loader2,
  Maximize2,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import { glassInputClass } from "@/components/ui/glass-styles";
import { cn } from "@/lib/utils";

import { ScreenshotCompareViewer } from "./ScreenshotCompareViewer";
import {
  fmtRelative,
  fmtUntil,
  parseChangeAnalysis,
  snapshotPreviewUrl,
  type TrackedPageRow,
  type TrackedPageSnapshot,
} from "./types";

type PageDetailStats = {
  totalSnapshots: number;
  changeCount: number;
  firstSnapshotAt: string | null;
  lastSnapshotAt: string | null;
};

type PageDetailResponse = {
  ok: boolean;
  page?: TrackedPageRow;
  stats?: PageDetailStats;
  snapshots?: TrackedPageSnapshot[];
  error?: string;
};

export type PageDetailStaticPayload = {
  page: TrackedPageRow;
  stats: PageDetailStats;
  snapshots: TrackedPageSnapshot[];
};

type TabId = "overview" | "history" | "compare";

type Props = {
  competitorId: string;
  pageId: string | null;
  seedPage?: TrackedPageRow | null;
  staticDetail?: PageDetailStaticPayload | null;
  onClose: () => void;
  onUpdated: () => void;
  onCaptureNow?: (pageId: string) => boolean | Promise<boolean>;
  onDelete?: () => void;
  capturing?: boolean;
  deleting?: boolean;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function pageTextFields(pageText: unknown): {
  headline?: string;
  subheadline?: string;
  cta_text?: string;
  pricing_tiers?: string[];
} {
  if (!pageText || typeof pageText !== "object" || Array.isArray(pageText)) return {};
  const o = pageText as Record<string, unknown>;
  return {
    headline: typeof o.headline === "string" ? o.headline : undefined,
    subheadline: typeof o.subheadline === "string" ? o.subheadline : undefined,
    cta_text: typeof o.cta_text === "string" ? o.cta_text : undefined,
    pricing_tiers: Array.isArray(o.pricing_tiers)
      ? o.pricing_tiers.filter((v): v is string => typeof v === "string")
      : undefined,
  };
}

export function PageDetailDrawer({
  competitorId,
  pageId,
  seedPage,
  staticDetail = null,
  onClose,
  onUpdated,
  onCaptureNow,
  onDelete,
  capturing = false,
  deleting = false,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<TrackedPageRow | null>(seedPage ?? null);
  const [stats, setStats] = useState<PageDetailStats | null>(null);
  const [snapshots, setSnapshots] = useState<TrackedPageSnapshot[]>([]);
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");
  const [compareOpen, setCompareOpen] = useState(false);
  const [fullViewUrl, setFullViewUrl] = useState<string | null>(null);

  const open = Boolean(pageId);

  useEffect(() => setMounted(true), []);

  const loadDetail = useCallback(async () => {
    if (!pageId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/competitor/${encodeURIComponent(competitorId)}/landing-pages/${encodeURIComponent(pageId)}`,
      );
      const json = (await res.json()) as PageDetailResponse;
      if (!res.ok || !json.ok || !json.page) {
        throw new Error(json.error ?? "Failed to load page");
      }
      setPage({
        ...json.page,
        latestSnapshot: json.snapshots?.[0] ?? json.page.latestSnapshot ?? null,
      });
      setStats(json.stats ?? null);
      setSnapshots(json.snapshots ?? []);
      if (json.snapshots && json.snapshots.length >= 2) {
        setCompareA(json.snapshots[1]!.id);
        setCompareB(json.snapshots[0]!.id);
      } else if (json.snapshots?.[0]) {
        setCompareB(json.snapshots[0].id);
        setCompareA("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [competitorId, pageId]);

  const applyStaticDetail = useCallback((detail: PageDetailStaticPayload) => {
    setPage({
      ...detail.page,
      latestSnapshot: detail.snapshots[0] ?? detail.page.latestSnapshot ?? null,
    });
    setStats(detail.stats);
    setSnapshots(detail.snapshots);
    if (detail.snapshots.length >= 2) {
      setCompareA(detail.snapshots[1]!.id);
      setCompareB(detail.snapshots[0]!.id);
    } else if (detail.snapshots[0]) {
      setCompareB(detail.snapshots[0].id);
      setCompareA("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    setTab("overview");
    if (staticDetail) {
      applyStaticDetail(staticDetail);
      return;
    }
    if (seedPage) {
      setPage(seedPage);
    }
    void loadDetail();
  }, [open, pageId, seedPage, loadDetail, staticDetail, applyStaticDetail]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const handleCaptureNow = useCallback(async () => {
    if (!pageId || !onCaptureNow) return;
    const ok = await onCaptureNow(pageId);
    if (ok) await loadDetail();
  }, [loadDetail, onCaptureNow, pageId]);

  const snapshotById = useCallback(
    (id: string) => snapshots.find((s) => s.id === id),
    [snapshots],
  );

  const compareSnapshotA = compareA ? snapshotById(compareA) : null;
  const compareSnapshotB = compareB ? snapshotById(compareB) : null;

  const changeSnapshots = snapshots.filter((s) => s.has_meaningful_change);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && pageId ? (
        <motion.div
          className="fixed inset-0 z-[200] flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={onClose}
          />
          <motion.aside
            className="relative flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <header className="shrink-0 border-b border-slate-100 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold text-slate-900">{page?.label ?? "Page"}</h2>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{page?.url}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {onDelete ? (
                    <button
                      type="button"
                      onClick={onDelete}
                      disabled={deleting}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-60"
                      title="Delete page"
                    >
                      {deleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  ) : null}
                  <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {page?.url ? (
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Visit site
                  </a>
                ) : null}
                {onCaptureNow && pageId ? (
                  <button
                    type="button"
                    onClick={() => void handleCaptureNow()}
                    disabled={capturing}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {capturing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                    Capture now
                  </button>
                ) : null}
              </div>

              {stats ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { label: "Snapshots", value: stats.totalSnapshots },
                    { label: "Changes", value: stats.changeCount },
                    {
                      label: "Last check",
                      value: stats.lastSnapshotAt ? fmtRelative(stats.lastSnapshotAt) : "—",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2 text-center"
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{item.label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 flex gap-1 rounded-lg bg-slate-100 p-1">
                {(
                  [
                    { id: "overview" as const, label: "Overview", icon: BarChart3 },
                    { id: "history" as const, label: "History", icon: History },
                    { id: "compare" as const, label: "A/B compare", icon: GitCompareArrows },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                      tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
                    )}
                  >
                    <t.icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {loading && !snapshots.length ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : null}

              {tab === "overview" && snapshots[0] ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 py-2.5">
                      <p className="text-xs font-medium text-slate-600">Latest screenshot</p>
                      <button
                        type="button"
                        onClick={() => setFullViewUrl(snapshots[0]!.screenshot_url)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                        View full page
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFullViewUrl(snapshots[0]!.screenshot_url)}
                      className="group relative block w-full cursor-zoom-in text-left"
                      aria-label="Open full page screenshot"
                    >
                      <div className="max-h-[min(70vh,880px)] overflow-y-auto overscroll-contain bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={snapshots[0]!.screenshot_url}
                          alt="Full page screenshot"
                          className="block w-full"
                        />
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/60 via-black/30 to-transparent px-4 pb-4 pt-10">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-md ring-1 ring-black/5 transition group-hover:scale-[1.02]">
                          <Maximize2 className="h-3.5 w-3.5" />
                          Click to expand
                        </span>
                      </div>
                    </button>
                    <p className="border-t border-slate-100 bg-white px-3 py-2 text-center text-[11px] text-slate-500">
                      Scroll inside the preview for more of the page
                    </p>
                  </div>
                  {(() => {
                    const text = pageTextFields(snapshots[0]!.page_text);
                    const fields = [
                      ["Headline", text.headline],
                      ["Subheadline", text.subheadline],
                      ["CTA", text.cta_text],
                      ["Pricing", text.pricing_tiers?.join(", ")],
                    ].filter(([, v]) => v);
                    if (fields.length === 0) return null;
                    return (
                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Page copy</h3>
                        <dl className="mt-2 space-y-2">
                          {fields.map(([label, value]) => (
                            <div key={label}>
                              <dt className="text-[10px] font-medium uppercase text-slate-400">{label}</dt>
                              <dd className="text-sm text-slate-800">{value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    );
                  })()}
                  {page?.next_screenshot_at ? (
                    <p className="text-xs text-slate-400">Next scheduled check {fmtUntil(page.next_screenshot_at)}</p>
                  ) : null}
                </div>
              ) : null}

              {tab === "overview" && !snapshots.length && !loading ? (
                <p className="py-8 text-center text-sm text-slate-500">No screenshots yet. Capture one to start tracking.</p>
              ) : null}

              {tab === "history" ? (
                <div className="space-y-3">
                  {snapshots.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">No screenshot history yet.</p>
                  ) : (
                    snapshots.map((snap, idx) => {
                      const prev = snapshots[idx + 1];
                      const analysis = parseChangeAnalysis(snap.change_analysis);
                      return (
                        <div
                          key={snap.id}
                          className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                        >
                          <div className="flex gap-3 p-3">
                            <button
                              type="button"
                              onClick={() => setFullViewUrl(snap.screenshot_url)}
                              className="group relative shrink-0 overflow-hidden rounded-lg border border-slate-100"
                              aria-label="Open full page screenshot"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={snapshotPreviewUrl(snap) ?? snap.screenshot_url}
                                alt=""
                                className="h-20 w-32 object-cover object-top"
                              />
                              <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/35">
                                <Maximize2 className="h-4 w-4 text-white opacity-0 drop-shadow group-hover:opacity-100" />
                              </span>
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-slate-900">{formatDate(snap.taken_at)}</p>
                              <p className="mt-0.5 text-[11px] text-slate-500">{fmtRelative(snap.taken_at)}</p>
                              {snap.pixel_diff_pct != null ? (
                                <p className="mt-1 text-[11px] text-slate-400">{snap.pixel_diff_pct}% changed vs prior</p>
                              ) : (
                                <p className="mt-1 text-[11px] text-slate-400">Baseline snapshot</p>
                              )}
                              {snap.has_meaningful_change ? (
                                <span className="mt-1 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                                  Meaningful change
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {snap.has_meaningful_change && analysis.what_changed ? (
                            <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-2">
                              <p className="text-xs text-slate-700">{analysis.what_changed}</p>
                              {prev ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCompareA(prev.id);
                                    setCompareB(snap.id);
                                    setCompareOpen(true);
                                  }}
                                  className="mt-2 text-[11px] font-medium text-slate-600 underline-offset-2 hover:underline"
                                >
                                  Compare with previous →
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              ) : null}

              {tab === "compare" ? (
                <div className="space-y-4">
                  {snapshots.length < 2 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      Need at least 2 screenshots to run an A/B comparison.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block text-xs font-medium text-slate-600">
                          Version A (before)
                          <select
                            className={`${glassInputClass} mt-1 w-full text-xs`}
                            value={compareA}
                            onChange={(e) => setCompareA(e.target.value)}
                          >
                            <option value="">Select snapshot…</option>
                            {snapshots.map((s) => (
                              <option key={s.id} value={s.id}>
                                {formatDate(s.taken_at)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-xs font-medium text-slate-600">
                          Version B (after)
                          <select
                            className={`${glassInputClass} mt-1 w-full text-xs`}
                            value={compareB}
                            onChange={(e) => setCompareB(e.target.value)}
                          >
                            <option value="">Select snapshot…</option>
                            {snapshots.map((s) => (
                              <option key={s.id} value={s.id}>
                                {formatDate(s.taken_at)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      {compareSnapshotA && compareSnapshotB ? (
                        <div className="grid grid-cols-2 gap-2">
                          {[compareSnapshotA, compareSnapshotB].map((snap, i) => (
                            <div key={snap.id}>
                              <p className="mb-1 text-[10px] font-semibold uppercase text-slate-400">
                                {i === 0 ? "A" : "B"}
                              </p>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={snapshotPreviewUrl(snap) ?? snap.screenshot_url}
                                alt=""
                                className="rounded-lg border border-slate-200 object-cover object-top"
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        disabled={!compareSnapshotA || !compareSnapshotB}
                        onClick={() => setCompareOpen(true)}
                        className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        Open full-page comparison
                      </button>

                      {changeSnapshots.length > 0 ? (
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Detected changes
                          </h3>
                          <ul className="mt-2 space-y-2">
                            {changeSnapshots.map((snap) => {
                              const analysis = parseChangeAnalysis(snap.change_analysis);
                              return (
                                <li
                                  key={snap.id}
                                  className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-xs text-slate-700"
                                >
                                  <span className="font-medium">{formatDate(snap.taken_at)}</span>
                                  {analysis.what_changed ? ` — ${analysis.what_changed}` : null}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </motion.aside>

          {compareSnapshotA && compareSnapshotB ? (
            <ScreenshotCompareViewer
              open={compareOpen}
              onClose={() => setCompareOpen(false)}
              beforeUrl={compareSnapshotA.screenshot_url}
              afterUrl={compareSnapshotB.screenshot_url}
              beforeLabel={`A — ${formatDate(compareSnapshotA.taken_at)}`}
              afterLabel={`B — ${formatDate(compareSnapshotB.taken_at)}`}
            />
          ) : null}

          {fullViewUrl ? (
            <ScreenshotCompareViewer
              open={Boolean(fullViewUrl)}
              onClose={() => setFullViewUrl(null)}
              beforeUrl={fullViewUrl}
              afterUrl={fullViewUrl}
              beforeLabel="Full page"
              afterLabel={formatDate(snapshots[0]?.taken_at ?? new Date().toISOString())}
              heroBeforeUrl={snapshots[0]?.hero_screenshot_url ?? null}
              heroAfterUrl={snapshots[0]?.hero_screenshot_url ?? null}
              defaultMode="full"
            />
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
