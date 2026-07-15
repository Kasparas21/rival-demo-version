"use client";

import { Bookmark, BookmarkCheck, Camera, ChevronRight, ExternalLink, Eye, Globe, Loader2, Sparkles, Trash2 } from "lucide-react";

import { displayUrlShort } from "@/lib/landing-pages/normalize-url";
import { cn } from "@/lib/utils";

import { fmtRelative, fmtUntil, isAdLandingCandidate, pageStatus, snapshotPreviewUrl, type TrackedPageRow } from "./types";

type Props = {
  page: TrackedPageRow;
  hostBlocked?: boolean;
  onOpenDetail?: () => void;
  onCaptureNow?: () => void;
  onActivateSpying?: () => void;
  onRemove?: () => void;
  capturing?: boolean;
  removing?: boolean;
  activating?: boolean;
  isSaved?: boolean;
  onToggleSave?: () => void;
};

function statusBadge(status: ReturnType<typeof pageStatus>) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
        <span className="h-2 w-2 rounded-full bg-slate-300" />
        Pending first check
      </span>
    );
  }
  if (status === "changed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Changed
      </span>
    );
  }
  if (status === "ab_suspected") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Possible A/B test
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      No change
    </span>
  );
}

export function TrackedPageRowCard({
  page,
  hostBlocked = false,
  onOpenDetail,
  onCaptureNow,
  onActivateSpying,
  onRemove,
  capturing = false,
  removing = false,
  activating = false,
  isSaved = false,
  onToggleSave,
}: Props) {
  const isSpying = page.is_active;
  const fromAds = isAdLandingCandidate(page);
  const status = pageStatus(page);
  const previewUrl = snapshotPreviewUrl(page.latestSnapshot);
  const hasScreenshot = Boolean(previewUrl);
  const isBlocked = page.latestSnapshot?.status === "blocked" || hostBlocked;

  const openAnalytics = () => {
    if (isSpying) onOpenDetail?.();
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-sm">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
        {onToggleSave ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
            aria-label={isSaved ? "Unsave page" : "Save page"}
            title={isSaved ? "Remove from Saved" : "Save to your collection"}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              isSaved
                ? "bg-sky-50 text-sky-700 hover:bg-sky-100"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
            )}
          >
            {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
        ) : null}
        {onRemove ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            disabled={removing}
            aria-label={`Delete ${page.label}`}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          >
            {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        ) : null}
      </div>

      <div
        role={isSpying && onOpenDetail ? "button" : undefined}
        tabIndex={isSpying && onOpenDetail ? 0 : undefined}
        onClick={openAnalytics}
        onKeyDown={(e) => {
          if (!isSpying || !onOpenDetail) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openAnalytics();
          }
        }}
        className={cn(isSpying && onOpenDetail && "cursor-pointer transition hover:border-slate-300 hover:shadow-md")}
      >
        <div className="flex flex-col gap-3 p-3 pr-20 sm:flex-row sm:items-stretch sm:gap-4 sm:p-4 sm:pr-24">
          <div
            className={cn(
              "relative w-full shrink-0 overflow-hidden rounded-lg border border-slate-200/80 bg-slate-100 sm:w-44 md:w-52",
            )}
            style={{ aspectRatio: "16 / 10" }}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={`${page.label} screenshot`}
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1.5 px-3 text-center">
                {capturing || activating ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                ) : isSpying ? (
                  <Camera className="h-5 w-5 text-slate-300" />
                ) : (
                  <Eye className="h-5 w-5 text-slate-300" />
                )}
                <span className="text-[11px] font-medium text-slate-400">
                  {capturing ? "Capturing…" : activating ? "Activating…" : isSpying ? "No screenshot yet" : "Not spying"}
                </span>
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2 pr-2">
                <h3 className="truncate text-sm font-semibold text-slate-900">{page.label}</h3>
                {isSpying ? (
                  statusBadge(status)
                ) : fromAds ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    From ads
                  </span>
                ) : null}
              </div>
              <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
                <Globe className="h-3 w-3 shrink-0" />
                {displayUrlShort(page.url, 56)}
              </p>
              {(isSpying || fromAds) && isBlocked ? (
                <div
                  className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p>
                    We&apos;re sorry — this site uses anti-bot protection, so we can&apos;t take screenshots or track
                    changes.
                  </p>
                </div>
              ) : null}
              <p className="mt-1 text-[11px] text-slate-400">
                {isSpying
                  ? page.last_screenshotted_at
                    ? isBlocked
                      ? `Last checked ${fmtRelative(page.last_screenshotted_at)} · Automatic tracking paused`
                      : `Last checked ${fmtRelative(page.last_screenshotted_at)} · Next check ${fmtUntil(page.next_screenshot_at)}`
                    : isBlocked
                      ? "Tracking unavailable on this site"
                      : `First check ${fmtUntil(page.next_screenshot_at)}`
                  : fromAds
                    ? isBlocked
                      ? "Detected in ads · tracking unavailable on this site"
                      : "Detected in ads · activate to track visual and copy changes every 3 days"
                    : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <a
                href={page.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200/80 hover:bg-slate-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Visit
              </a>
              {!isSpying && fromAds && onActivateSpying && !isBlocked ? (
                <button
                  type="button"
                  onClick={onActivateSpying}
                  disabled={activating}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {activating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  Activate spying
                </button>
              ) : null}
              {isSpying && !hasScreenshot && onCaptureNow && !isBlocked ? (
                <button
                  type="button"
                  onClick={onCaptureNow}
                  disabled={capturing}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {capturing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  Capture now
                </button>
              ) : null}
              {isSpying && hasScreenshot && onOpenDetail ? (
                <button
                  type="button"
                  onClick={() => onOpenDetail()}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  See analysis
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
