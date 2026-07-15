"use client";

import type { KeyboardEvent } from "react";
import { ExternalLink, Globe, Play } from "lucide-react";

import { AdSaveRow } from "@/components/ads-library/ad-save-row";
import { GenericLogo } from "@/components/landing/hero-variant-b-demo/chrome";
import { YouTubeLogo } from "@/components/platform-logos";
import type { DemoAd, DemoPlatform } from "@/lib/demo/dashboard-demo-data";

type DemoCardProps = {
  ad: DemoAd;
  saved: boolean;
  onToggleSave: () => void;
  onOpen?: () => void;
};

function demoCardShellProps(onOpen?: () => void) {
  if (!onOpen) return {};
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: onOpen,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpen();
      }
    },
  };
}

function clickableCardClass(onOpen?: () => void) {
  return onOpen ? "cursor-pointer" : "";
}

function DemoAdCreativePreview({ ad, className }: { ad: DemoAd; className?: string }) {
  if (ad.creativeUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={ad.creativeUrl} alt="" className={className ?? "h-full w-full object-cover"} />
    );
  }
  return <div className={className ?? "h-full w-full"} style={{ background: ad.gradient }} />;
}

function DemoAdSaveRow({
  adId,
  saved,
  onToggleSave,
}: {
  adId: string;
  saved: boolean;
  onToggleSave: () => void;
}) {
  return (
    <AdSaveRow scrapedAdId={adId} isSaved={saved} onToggleSave={onToggleSave} />
  );
}

function DemoMetaAdCard({ ad, saved, onToggleSave, onOpen }: DemoCardProps) {
  return (
    <article
      {...demoCardShellProps(onOpen)}
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white transition-all duration-200 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] ${clickableCardClass(onOpen)}`}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-start gap-3 border-b border-[#f1f5f9] p-4">
          <GenericLogo className="size-10 rounded-full text-[11px]" />
          <div className="min-w-0 flex-1">
            <p className="break-words text-[15px] font-semibold text-[#343434] [overflow-wrap:anywhere]">
              {ad.pageName}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[#6b7280]">
              Sponsored <Globe className="size-3.5 shrink-0 text-[#9ca3af]" aria-hidden />
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-[#6b7280]">
            <span className="size-1.5 shrink-0 rounded-full bg-green-500" aria-hidden />
            <span className="whitespace-nowrap font-medium">Active {ad.activeDays}D</span>
          </div>
        </div>
        {ad.body || ad.headline ? (
          <div className="shrink-0 px-4 py-3">
            {ad.headline ? (
              <p className="break-words text-[15px] font-semibold leading-snug text-[#1c1e21] [overflow-wrap:anywhere]">
                {ad.headline}
              </p>
            ) : null}
            {ad.body ? (
              <p className="mt-2 break-words text-[14px] leading-relaxed text-[#374151] [overflow-wrap:anywhere]">
                {ad.body}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col border-y border-[#e5e7eb] bg-[#f3f4f6]">
          <div className="relative z-0 w-full shrink-0 px-3 py-3">
            <div className="relative h-[280px] w-full overflow-hidden rounded-xl">
              <DemoAdCreativePreview ad={ad} />
              {ad.isVideo ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-black/45 text-white">
                    <Play className="ml-0.5 size-5 fill-current" aria-hidden />
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div
          className="flex shrink-0 flex-col gap-3 border-t border-[#e5e7eb] bg-[#f3f4f6] px-4 py-3.5"
          data-pa-section="cta"
        >
          <div className="flex min-w-0 flex-col rounded-lg border border-[#e5e7eb] bg-white p-3 shadow-sm">
            <p className="truncate text-[12px] font-medium uppercase tracking-wide text-[#65676b]">
              {ad.siteLabel}
            </p>
            {ad.linkDescription ? (
              <p className="mt-1.5 break-words whitespace-pre-wrap text-[13px] leading-snug text-[#65676b] [overflow-wrap:anywhere]">
                {ad.linkDescription}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-md border border-[#cce4ff] bg-[#e7f3ff] px-5 py-2 text-[14px] font-semibold text-[#0d6efd]">
              {ad.cta}
            </span>
            <span className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[#bfdbfe] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#2563eb]">
              View in Meta library
            </span>
          </div>
          <DemoAdSaveRow adId={ad.id} saved={saved} onToggleSave={onToggleSave} />
        </div>
      </div>
    </article>
  );
}

function DemoGoogleSearchAdCard({ ad, saved, onToggleSave, onOpen }: DemoCardProps) {
  return (
    <article
      {...demoCardShellProps(onOpen)}
      className={`flex h-full min-h-[440px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#dadce0] bg-white text-left shadow-[0_1px_2px_rgba(60,64,67,0.08)] sm:min-h-[460px] ${clickableCardClass(onOpen)}`}
    >
      <div className="shrink-0 border-b border-[#e8eaed] px-4 py-3">
        <h3 className="break-words text-[17px] font-medium leading-snug text-[#202124] [overflow-wrap:anywhere]">
          {ad.pageName}
        </h3>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-[#f1f3f4] pt-3 text-[13px]">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[#5f6368]">Last shown</span>
            <span className="font-medium text-[#202124]">Jul 14, 2026</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#6b7280]">
            <span className="size-1.5 shrink-0 rounded-full bg-green-500" aria-hidden />
            <span className="font-medium">Active {ad.activeDays}D</span>
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col bg-[#f1f3f4] px-4 py-4">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[360px] flex-1 flex-col overflow-hidden rounded-2xl border border-[#e8eaed] bg-white shadow-sm">
          <div className="flex h-[200px] min-h-[200px] max-h-[200px] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border-b border-[#e8eaed]">
            <DemoAdCreativePreview ad={ad} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col bg-white p-4">
            <p className="flex items-center gap-1.5 text-[12px] leading-tight text-[#188038]">
              <Globe className="size-3.5 shrink-0 opacity-80" aria-hidden />
              <span className="truncate font-medium">{ad.siteLabel}</span>
            </p>
            <p className="mt-2 break-words text-[15px] font-normal leading-snug text-[#1a0dab] [overflow-wrap:anywhere]">
              {ad.headline}
            </p>
            {ad.body ? (
              <p className="mt-2 break-words text-[13px] leading-relaxed text-[#3c4043] [overflow-wrap:anywhere]">
                {ad.body}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 border-t border-[#f1f3f4] px-4 py-3">
        <span className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#bfdbfe] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#2563eb] shadow-sm sm:w-auto">
          View in Google Ads Transparency
          <ExternalLink className="size-3.5 shrink-0 opacity-90" aria-hidden />
        </span>
        <DemoAdSaveRow adId={ad.id} saved={saved} onToggleSave={onToggleSave} />
      </div>
    </article>
  );
}

function DemoGoogleYoutubeAdCard({ ad, saved, onToggleSave, onOpen }: DemoCardProps) {
  return (
    <article
      {...demoCardShellProps(onOpen)}
      className={`flex h-full min-h-[440px] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 text-left backdrop-blur-sm hover:border-[#DDF1FD]/60 sm:min-h-[460px] ${clickableCardClass(onOpen)}`}
    >
      <div className="shrink-0 border-b border-[#e8eaed] px-4 py-3">
        <h3 className="break-words text-[17px] font-medium leading-snug text-[#202124] [overflow-wrap:anywhere]">
          {ad.pageName}
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#f1f3f4] pt-3 text-[13px] text-[#5f6368]">
          <span>Last shown Jul 14, 2026</span>
          <YouTubeLogo className="h-4 w-4 shrink-0" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
        <div
          className="relative flex h-[200px] min-h-[200px] w-full items-center justify-center overflow-hidden rounded-xl bg-[#0f0f0f]"
          style={{ background: ad.gradient }}
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-black/50 text-white">
            <Play className="ml-1 size-6 fill-current" aria-hidden />
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 border-t border-[#f1f3f4] px-4 py-3">
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#2563eb]">
          View in Google Ads Transparency
          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
        </span>
        <DemoAdSaveRow adId={ad.id} saved={saved} onToggleSave={onToggleSave} />
      </div>
    </article>
  );
}

function DemoPinterestAdCard({ ad, saved, onToggleSave, onOpen }: DemoCardProps) {
  return (
    <article
      {...demoCardShellProps(onOpen)}
      className={`relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 text-left backdrop-blur-sm transition-all duration-200 hover:border-[#DDF1FD]/60 hover:shadow-[0_8px_32px_rgba(31,38,135,0.07)] ${clickableCardClass(onOpen)}`}
    >
      <div className="shrink-0 px-4 pb-3 pt-4">
        <p className="min-w-0 break-words text-[15px] font-semibold text-[#bd081c] [overflow-wrap:anywhere]">
          {ad.pageName}
        </p>
        <p className="mt-0.5 text-[12px] text-[#6b7280]">Pinterest Ad Transparency (EU / BR / TR)</p>
        <div className="mt-4 space-y-3">
          <p className="break-words text-[14px] leading-relaxed text-[#111827] [overflow-wrap:anywhere]">
            {ad.headline}
          </p>
          {ad.body ? (
            <p className="break-words text-[14px] leading-relaxed text-[#111827] [overflow-wrap:anywhere]">
              {ad.body}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col border-y border-[#e5e7eb] bg-[#f9fafb] p-3">
        <div className="flex min-h-[200px] flex-1 flex-col overflow-hidden rounded-xl bg-white">
          <div className="min-h-[200px] w-full flex-1 overflow-hidden">
            <DemoAdCreativePreview ad={ad} />
          </div>
        </div>
        <span className="mt-3 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-center text-[13px] font-semibold text-[#bd081c] shadow-sm">
          <ExternalLink className="size-4 shrink-0 opacity-80" aria-hidden />
          {ad.siteLabel}
        </span>
      </div>
      <div className="shrink-0 bg-white px-4 pb-4 pt-1">
        <DemoAdSaveRow adId={ad.id} saved={saved} onToggleSave={onToggleSave} />
      </div>
    </article>
  );
}

function DemoTikTokAdCard({ ad, saved, onToggleSave, onOpen }: DemoCardProps) {
  return (
    <article
      {...demoCardShellProps(onOpen)}
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] ${clickableCardClass(onOpen)}`}
    >
      <div className="shrink-0 space-y-3 px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="shrink-0 rounded bg-[#38bdf8] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
              Ad
            </span>
            <span className="min-w-0 break-words text-[15px] font-bold leading-tight text-[#0f172a] [overflow-wrap:anywhere]">
              {ad.pageName}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-[#64748b]">
            <span className="size-1.5 shrink-0 rounded-full bg-green-500" aria-hidden />
            <span className="font-medium">Active {ad.activeDays}D</span>
          </div>
        </div>
        <div className="space-y-1.5 text-[13px] leading-snug">
          <div className="grid grid-cols-[auto_1fr] gap-x-2">
            <span className="text-[#64748b]">First shown:</span>
            <span className="font-medium text-[#0f172a]">Jun 1, 2026</span>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-2">
            <span className="text-[#64748b]">Last shown:</span>
            <span className="font-medium text-[#0f172a]">Jul 14, 2026</span>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-2">
            <span className="text-[#64748b]">Unique users seen:</span>
            <span className="font-medium text-[#0f172a]">12.4K</span>
          </div>
        </div>
      </div>
      <div className="relative flex min-h-0 w-full flex-1 flex-col bg-[#0f172a] p-3">
        <div
          className="relative mx-auto aspect-[9/16] w-full max-w-[min(100%,280px)] min-h-[200px] max-h-[min(480px,55vh)] overflow-hidden rounded-xl"
          style={{ background: ad.gradient }}
        >
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-black/45 text-white shadow-lg">
              <Play className="ml-1 size-8 fill-current" aria-hidden />
            </span>
          </span>
        </div>
      </div>
      <div className="shrink-0 border-t border-[#f1f5f9] px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#2563eb]">
          View in TikTok Ads Library
          <ExternalLink className="size-3.5" aria-hidden />
        </span>
        <DemoAdSaveRow adId={ad.id} saved={saved} onToggleSave={onToggleSave} />
      </div>
    </article>
  );
}

function DemoLinkedInAdCard({ ad, saved, onToggleSave, onOpen }: DemoCardProps) {
  return (
    <article
      {...demoCardShellProps(onOpen)}
      className={`relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 text-left backdrop-blur-sm transition-all duration-200 hover:border-[#DDF1FD]/60 hover:shadow-[0_8px_32px_rgba(31,38,135,0.07)] ${clickableCardClass(onOpen)}`}
    >
      <div className="shrink-0 p-4">
        <div className="flex items-start gap-3">
          <GenericLogo className="size-10 rounded-lg text-[11px]" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-[#0a66c2]">{ad.pageName}</p>
            <p className="mt-0.5 text-[12px] text-[#6b7280]">
              Promoted · <span className="font-semibold text-[#374151]">{ad.cta}</span>
            </p>
          </div>
        </div>
        {ad.body ? (
          <p className="mt-3 line-clamp-4 break-words text-[14px] leading-relaxed text-[#374151] [overflow-wrap:anywhere]">
            {ad.body}
          </p>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col border-y border-[#e5e7eb] bg-[#f3f4f6] p-3">
        <div className="flex min-h-[200px] flex-1 flex-col overflow-hidden rounded-xl bg-white">
          <div className="min-h-[200px] w-full flex-1 overflow-hidden">
            <DemoAdCreativePreview ad={ad} />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-3 border-t border-[#e5e7eb] bg-[#f3f4f6] px-4 py-3.5">
        {ad.headline ? (
          <p className="text-[14px] font-semibold leading-snug text-[#1c1e21] [overflow-wrap:anywhere]">
            {ad.headline}
          </p>
        ) : null}
        <div className="flex min-w-0 flex-col rounded-lg border border-[#e5e7eb] bg-white p-3 shadow-sm">
          <p className="truncate text-[12px] font-medium uppercase tracking-wide text-[#65676b]">
            {ad.siteLabel}
          </p>
        </div>
        <DemoAdSaveRow adId={ad.id} saved={saved} onToggleSave={onToggleSave} />
      </div>
    </article>
  );
}

function DemoSnapchatAdCard({ ad, saved, onToggleSave, onOpen }: DemoCardProps) {
  return (
    <article
      {...demoCardShellProps(onOpen)}
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm transition-shadow hover:shadow-[0_8px_30px_rgba(15,23,42,0.08)] ${clickableCardClass(onOpen)}`}
    >
      <div className="shrink-0 border-b border-[#ececec] px-4 pb-4 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="min-w-0 flex-1 text-[13px] text-[#111827]">
            <span className="font-semibold">Ad Publisher:</span>{" "}
            <span className="font-bold">{ad.pageName}</span>
          </p>
          <span className="shrink-0 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Active
          </span>
        </div>
        <div className="mt-3 space-y-1">
          {[
            ["Brand Advertised:", ad.pageName],
            ["Ad Start Date:", "Jun 1, 2026"],
            ["Ad End Date:", "Active"],
            ["Total Impressions:", "24.8K"],
            ["Market:", "EU"],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-wrap gap-x-1 text-[11px] leading-snug">
              <span className="shrink-0 text-[#6b7280]">{label}</span>
              <span className="min-w-0 font-medium text-[#171717]">{value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={`flex min-h-0 flex-1 flex-col ${ad.isVideo ? "bg-neutral-950" : "bg-[#f4f4f5]"}`}>
        <div className={`relative w-full shrink-0 p-3 sm:p-4 ${ad.isVideo ? "min-h-[280px]" : "min-h-[260px]"}`}>
          <div
            className={`relative mx-auto min-h-[220px] w-full overflow-hidden rounded-xl ${
              ad.isVideo
                ? "bg-neutral-950"
                : "border border-black/[0.06] bg-white py-5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
            }`}
            style={{ background: ad.isVideo ? ad.gradient : undefined }}
          >
            {!ad.isVideo ? (
              <div className="h-[220px] w-full" style={{ background: ad.gradient }} />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center">
                <Play className="size-10 fill-white text-white" aria-hidden />
              </span>
            )}
          </div>
        </div>
        {ad.headline ? (
          <div
            className={`shrink-0 space-y-2 px-4 py-3 ${
              ad.isVideo ? "border-t border-neutral-800" : "border-t border-zinc-200/90 bg-[#fafafa]"
            }`}
          >
            <p className="text-[14px] font-semibold leading-snug text-[#111827]">{ad.headline}</p>
          </div>
        ) : null}
      </div>
      <div className="shrink-0 px-4 py-3">
        <DemoAdSaveRow adId={ad.id} saved={saved} onToggleSave={onToggleSave} />
      </div>
    </article>
  );
}

export function DemoPlatformAdCard({
  platform,
  ad,
  saved,
  onToggleSave,
  onOpen,
}: DemoCardProps & { platform: DemoPlatform }) {
  switch (platform) {
    case "meta":
      return <DemoMetaAdCard ad={ad} saved={saved} onToggleSave={onToggleSave} onOpen={onOpen} />;
    case "google":
      return ad.isVideo ? (
        <DemoGoogleYoutubeAdCard ad={ad} saved={saved} onToggleSave={onToggleSave} onOpen={onOpen} />
      ) : (
        <DemoGoogleSearchAdCard ad={ad} saved={saved} onToggleSave={onToggleSave} onOpen={onOpen} />
      );
    case "pinterest":
      return <DemoPinterestAdCard ad={ad} saved={saved} onToggleSave={onToggleSave} onOpen={onOpen} />;
    case "tiktok":
      return <DemoTikTokAdCard ad={ad} saved={saved} onToggleSave={onToggleSave} onOpen={onOpen} />;
    case "linkedin":
      return <DemoLinkedInAdCard ad={ad} saved={saved} onToggleSave={onToggleSave} onOpen={onOpen} />;
    case "snapchat":
      return <DemoSnapchatAdCard ad={ad} saved={saved} onToggleSave={onToggleSave} onOpen={onOpen} />;
    default:
      return <DemoMetaAdCard ad={ad} saved={saved} onToggleSave={onToggleSave} onOpen={onOpen} />;
  }
}
