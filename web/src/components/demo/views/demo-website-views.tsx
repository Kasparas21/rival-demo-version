"use client";

import { useMemo, useState } from "react";
import { Copy, ExternalLink, Globe, Link2, Search } from "lucide-react";
import { toast } from "sonner";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { DemoPageDetailDrawer } from "@/components/demo/demo-page-detail-drawer";
import { DemoSectionHeader } from "@/components/landing/hero-variant-b-demo/chrome";
import {
  CHANGE_FILTER_OPTIONS,
  matchesChangeFilter,
  type ChangeFilterKind,
} from "@/components/website-tracker/change-display";
import { ChangeCard } from "@/components/website-tracker/ChangeCard";
import { parseChangeAnalysis } from "@/components/website-tracker/types";
import { demoTrackedPageHref } from "@/lib/demo/demo-landing-page-detail-payload";
import { buildDemoLandingPageChangeRows } from "@/lib/demo/demo-landing-page-changes-payload";
import {
  demoAdsForLandingPageGroup,
  demoLandingPagePreviewUrl,
  DEMO_LANDING_PAGES_FROM_ADS_ROWS,
  type DemoLandingPageAdRow,
  type DemoLandingPageFromAdsRow,
} from "@/lib/demo/demo-landing-pages-from-ads-payload";
import { DEMO_TRACKED_PAGES } from "@/lib/demo/dashboard-demo-data";
import { displayUrlShort } from "@/lib/landing-pages/normalize-url";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import { cn } from "@/lib/utils";

const PLATFORM_BAR_COLORS: Record<string, string> = {
  meta: "#1877F2",
  google: "#34A853",
  tiktok: "#000000",
  linkedin: "#0A66C2",
  pinterest: "#E60023",
  snapchat: "#FFFC00",
};

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta",
  google: "Google",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
};

const PLATFORM_SORT_ORDER = ["meta", "google", "tiktok", "linkedin", "pinterest", "snapchat"];
const LANDING_PAGES_URL_DISPLAY_MAX = 36;
const LANDING_PAGE_ADS_INITIAL = 4;

function sortedPlatformShares(breakdown: Record<string, number>): { key: string; n: number }[] {
  const entries = Object.entries(breakdown).filter(([, n]) => n > 0);
  entries.sort((a, b) => {
    const ia = PLATFORM_SORT_ORDER.indexOf(a[0]);
    const ib = PLATFORM_SORT_ORDER.indexOf(b[0]);
    const aUnknown = ia === -1;
    const bUnknown = ib === -1;
    if (aUnknown && bUnknown) return b[1] - a[1];
    if (aUnknown) return 1;
    if (bUnknown) return -1;
    if (ia !== ib) return ia - ib;
    return b[1] - a[1];
  });
  return entries.map(([key, n]) => ({ key, n }));
}

function captionTopPlatforms(breakdown: Record<string, number>, maxParts = 2): string {
  const shares = sortedPlatformShares(breakdown);
  return shares
    .slice(0, maxParts)
    .map(({ key, n }) => {
      const label = PLATFORM_LABELS[key] ?? key;
      return `${label} ${n} ${n === 1 ? "ad" : "ads"}`;
    })
    .join(" · ");
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Changed"
      ? "bg-amber-50 text-amber-800 ring-amber-100"
      : status === "Possible A/B"
        ? "bg-violet-50 text-violet-800 ring-violet-100"
        : status === "From ads"
          ? "bg-sky-50 text-sky-800 ring-sky-100"
          : status === "Permanent"
            ? "bg-rose-50 text-rose-800 ring-rose-100"
            : status === "A/B test"
              ? "bg-violet-50 text-violet-800 ring-violet-100"
              : "bg-slate-50 text-slate-700 ring-slate-100";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${tone}`}>{status}</span>
  );
}

export function DemoWebsiteTrackedView() {
  const [detailPageId, setDetailPageId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <DemoSectionHeader
        overline="Website"
        title="Tracked pages"
        description="Static demo snapshots — open See analysis for Overview, History, and A/B compare."
      />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
        <input
          readOnly
          placeholder="Search URLs to spy on…"
          className="w-full rounded-xl border border-[#e5e7eb] bg-white py-2.5 pl-10 pr-3 text-[13px] text-[#64748b]"
        />
      </div>
      <div className="space-y-3">
        {DEMO_TRACKED_PAGES.map((page) => {
          const href = demoTrackedPageHref(page.id) ?? `https://${page.url}`;
          return (
            <div
              key={page.id}
              className="flex flex-col gap-3 rounded-xl border border-[#e5e7eb] bg-white p-3 transition-shadow hover:shadow-sm sm:flex-row sm:items-center"
            >
              <button
                type="button"
                onClick={() => setDetailPageId(page.id)}
                className="flex min-w-0 flex-1 flex-col gap-3 text-left sm:flex-row sm:items-center"
              >
                <div className="h-20 w-full shrink-0 overflow-hidden rounded-lg ring-1 ring-[#e2e8f0] sm:h-16 sm:w-28">
                  {page.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={page.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <div className="h-full w-full" style={{ background: page.gradient }} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-[#111827]">{page.label}</p>
                    <StatusBadge status={page.status} />
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-[#64748b]">{page.url}</p>
                  <p className="mt-1 text-[11px] text-[#94a3b8]">Last checked {page.lastChecked}</p>
                </div>
              </button>
              <div className="flex shrink-0 gap-2">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-[#f8fafc] px-3 py-1.5 text-[11px] font-medium text-[#475569] ring-1 ring-[#e2e8f0] hover:bg-white"
                >
                  Visit
                </a>
                <button
                  type="button"
                  onClick={() => setDetailPageId(page.id)}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800"
                >
                  See analysis
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <DemoPageDetailDrawer pageId={detailPageId} onClose={() => setDetailPageId(null)} />
    </div>
  );
}

export function DemoWebsiteFromAdsView() {
  const rows = DEMO_LANDING_PAGES_FROM_ADS_ROWS;
  const [selectedUrl, setSelectedUrl] = useState<string>(rows[0]?.url ?? "");
  const selectedRow = useMemo(
    () => rows.find((row) => row.url === selectedUrl) ?? rows[0] ?? null,
    [rows, selectedUrl],
  );
  const pageAds = useMemo(
    () => (selectedRow ? demoAdsForLandingPageGroup(selectedRow.groupId) : []),
    [selectedRow],
  );

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Copied URL");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="space-y-5">
      <DemoSectionHeader
        overline="Website"
        title="Landing Pages"
        description="URLs detected from scraped ads — static Neptunas screenshots, same layout as production."
      />

      <div className="flex flex-col-reverse gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-[38%]">
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
            <input
              readOnly
              placeholder="Search URLs…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-[13px] text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Landing pages</p>
          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <DemoLandingPageListRow
                key={row.groupId}
                row={row}
                selected={selectedUrl === row.url}
                onSelect={() => setSelectedUrl(row.url)}
              />
            ))}
          </div>
        </aside>

        <section className="min-w-0 flex-1 lg:w-[62%]">
          {selectedRow ? (
            <>
              <DemoLandingPagePreviewPane row={selectedRow} onCopy={() => void copyUrl(selectedRow.url)} />
              <DemoLandingPageAdsSection ads={pageAds} total={selectedRow.totalAds} />
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function DemoLandingPageListRow({
  row,
  selected,
  onSelect,
}: {
  row: DemoLandingPageFromAdsRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const shares = sortedPlatformShares(row.platformBreakdown);
  const cap = captionTopPlatforms(row.platformBreakdown, 2);
  const display = displayUrlShort(row.url, LANDING_PAGES_URL_DISPLAY_MAX);
  const thumbUrl = demoLandingPagePreviewUrl(row.snapshot);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex h-14 w-full min-w-0 items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-left transition-colors",
        selected
          ? "border-l-4 border-[color:var(--rival-primary)] bg-[color:var(--rival-accent-blue)]"
          : "hover:bg-slate-50",
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center self-center overflow-hidden rounded-md border border-slate-200/80 bg-slate-100">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt="" className="h-full w-full object-cover object-top" />
        ) : faviconFailed ? (
          <Globe className="h-4 w-4 text-slate-400" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.faviconUrl}
            alt=""
            width={20}
            height={20}
            className="h-5 w-5 object-contain"
            onError={() => setFaviconFailed(true)}
          />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-slate-900" title={row.url}>
            {display}
          </span>
          <span className="shrink-0 text-[13px] font-bold text-[color:var(--rival-primary)]">{row.count}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
            {shares.map(({ key, n }) => (
              <div
                key={key}
                className="h-full min-w-[2px]"
                style={{
                  width: `${(n / row.count) * 100}%`,
                  backgroundColor: PLATFORM_BAR_COLORS[key] ?? "#94a3b8",
                }}
                title={`${PLATFORM_LABELS[key] ?? key}: ${n}`}
              />
            ))}
          </div>
        </div>
        <p className="mt-0.5 text-[10px] text-slate-500">{cap}</p>
      </div>
    </button>
  );
}

function DemoLandingPagePreviewPane({
  row,
  onCopy,
}: {
  row: DemoLandingPageFromAdsRow;
  onCopy: () => void;
}) {
  const displayPath = row.url.replace(/^https?:\/\//, "");
  const displayUrlShortText =
    displayPath.length > 42 ? `${displayPath.slice(0, 41)}…` : displayPath;
  const previewUrl = demoLandingPagePreviewUrl(row.snapshot);
  const fullScreenshot = row.snapshot?.screenshot_url ?? previewUrl;

  return (
    <div className="flex w-full flex-col items-stretch">
      <div className="mb-4 flex w-full flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 basis-[200px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          <span className="truncate font-mono text-[11px] text-slate-700" title={row.url}>
            {displayUrlShortText}
          </span>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          aria-label="Copy URL"
        >
          <Copy className="h-4 w-4" />
        </button>
        <a
          href={row.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[color:var(--rival-primary)] px-3 py-2 text-[11px] font-semibold text-white hover:opacity-90"
        >
          Open
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {fullScreenshot ? (
        <div className="flex w-full min-w-0 justify-center">
          <div
            className="relative w-full max-w-[960px] overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.1)]"
            style={{ maxHeight: "min(72vh, 720px)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullScreenshot}
              alt={`Screenshot of ${displayPath}`}
              className="block w-full bg-white"
            />
          </div>
        </div>
      ) : (
        <div className="flex min-h-[400px] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 px-6 py-10 text-[14px] text-slate-600">
          No screenshot available
        </div>
      )}
    </div>
  );
}

function DemoLandingPageAdsSection({
  ads,
  total,
}: {
  ads: DemoLandingPageAdRow[];
  total: number;
}) {
  const visible = ads.slice(0, LANDING_PAGE_ADS_INITIAL);

  return (
    <div className="mt-8 w-full border-t border-slate-100 pt-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-slate-900">Ads using this page</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-bold text-[color:var(--rival-primary)]">
          {total}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((ad) => (
          <DemoLandingPageAdCard key={ad.id} ad={ad} />
        ))}
      </div>
    </div>
  );
}

function DemoLandingPageAdCard({ ad }: { ad: DemoLandingPageAdRow }) {
  const previewText = (ad.ad_text ?? "").trim();
  const angle = (ad.ai_extracted_angle ?? "").trim();

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white text-left shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200/80">
        <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 px-3 py-4 text-center">
          <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-7 w-7 opacity-50" />
          {previewText ? (
            <p className="line-clamp-3 text-[10px] font-medium leading-snug text-slate-600">{previewText}</p>
          ) : (
            <p className="text-[10px] font-medium text-slate-500">No preview</p>
          )}
        </div>
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-sm">
          <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="flex min-h-[52px] flex-col justify-center gap-0.5 border-t border-slate-100 px-2.5 py-2">
        <p className="line-clamp-2 text-[11px] font-medium leading-snug text-slate-800">
          {previewText || "Untitled ad"}
        </p>
        {angle ? (
          <p className="line-clamp-1 text-[10px] text-slate-500">{angle}</p>
        ) : (
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {PLATFORM_LABELS[ad.platform] ?? ad.platform}
          </p>
        )}
      </div>
    </div>
  );
}

export function DemoWebsiteLatestChangesView() {
  const [filter, setFilter] = useState<ChangeFilterKind>("all");
  const [detailPageId, setDetailPageId] = useState<string | null>(null);
  const changes = useMemo(() => buildDemoLandingPageChangeRows(), []);

  const filteredChanges = useMemo(() => {
    if (filter === "all") return changes;
    return changes.filter((change) =>
      matchesChangeFilter(parseChangeAnalysis(change.change_analysis), filter),
    );
  }, [changes, filter]);

  const filterCounts = useMemo(() => {
    const counts: Record<ChangeFilterKind, number> = {
      all: changes.length,
      permanent: 0,
      ab_test: 0,
      unknown: 0,
    };
    for (const change of changes) {
      const confidence = parseChangeAnalysis(change.change_analysis).change_confidence;
      if (confidence === "confirmed") counts.permanent += 1;
      else if (confidence === "suspected_ab") counts.ab_test += 1;
      else counts.unknown += 1;
    }
    return counts;
  }, [changes]);

  const visibleFilters = CHANGE_FILTER_OPTIONS.filter(
    (opt) => opt.id === "all" || filterCounts[opt.id] > 0 || filter === opt.id,
  );

  return (
    <div className="space-y-5">
      <DemoSectionHeader
        overline="Website"
        title="Latest changes"
        description="Before/after comparisons with headline, CTA, and close-up section diffs — same UI as production."
      />

      <div className="flex flex-wrap gap-2">
        {visibleFilters.map((opt) => {
          const active = filter === opt.id;
          const count = filterCounts[opt.id];
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                active
                  ? opt.activeClass
                  : "border-[#e5e7eb] bg-white text-[#475569] hover:border-[#cbd5e1] hover:bg-[#f8fafc]"
              }`}
            >
              {opt.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  active ? "bg-white/20 text-inherit" : "bg-[#f1f5f9] text-[#64748b]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {filteredChanges.map((change) => (
          <div key={change.id} className="space-y-2">
            <ChangeCard
              change={change}
              prevScreenshotUrl={change.prev_screenshot_url}
              prevHeroScreenshotUrl={change.prev_hero_screenshot_url}
            />
            {change.landing_pages?.id ? (
              <div className="flex justify-end px-1">
                <button
                  type="button"
                  onClick={() => setDetailPageId(change.landing_pages!.id)}
                  className="text-[11px] font-medium text-[#475569] underline-offset-2 hover:text-slate-900 hover:underline"
                >
                  Open page analytics →
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <DemoPageDetailDrawer pageId={detailPageId} onClose={() => setDetailPageId(null)} />
    </div>
  );
}
