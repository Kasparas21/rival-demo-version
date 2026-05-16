"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Globe } from "lucide-react";
import { AdSaveRow } from "@/components/ads-library/ad-save-row";
import { CompetitorLogo } from "@/components/shared/competitor-logo";
import { ExpandableAdText } from "@/components/ads-library/expandable-ad-text";
import type { MetaAdCard as MetaAdCardModel } from "@/lib/ad-library/normalize";
import { safeHttpsUrl } from "@/lib/ad-library/normalize";
import { UnverifiedSourceBadge } from "@/components/ads-library/unverified-source-overlay";

function MetaCreativeMedia({ ad, compact }: { ad: MetaAdCardModel; compact: boolean }) {
  const [videoFailed, setVideoFailed] = useState(false);
  const stream = ad.videoUrl?.trim() ?? "";
  useEffect(() => {
    setVideoFailed(false);
  }, [ad.id, stream]);
  const still = ad.img?.trim() ?? "";
  /** Try native `<video>` first for Ad Library MP4s (`referrerPolicy` helps FB CDN). Fallback on `error`. */
  const wantsVideo = Boolean(stream && ad.isVideo);
  const maxH = compact ? "max-h-[300px]" : "max-h-[420px]";
  const minH = compact ? "min-h-[120px]" : "min-h-[180px]";
  const videoClass = `max-w-full w-auto h-auto ${maxH} rounded-xl object-contain bg-black`;

  if (wantsVideo && !videoFailed) {
    return (
      <video
        controls
        playsInline
        preload="metadata"
        poster={still || undefined}
        className={compact ? `w-full h-full ${videoClass}` : videoClass}
        src={stream}
        onClick={(e) => e.stopPropagation()}
        onError={() => setVideoFailed(true)}
        // DOM: HTMLVideoElement.referrerPolicy — @types/react VideoHTMLAttributes omit it in this project
        {...{ referrerPolicy: "no-referrer" as React.HTMLAttributeReferrerPolicy }}
      />
    );
  }

  if (wantsVideo && videoFailed && still) {
    return (
      <div className={`relative flex w-full items-center justify-center ${compact ? "min-h-0" : ""}`}>
        <img
          src={still}
          alt=""
          referrerPolicy="no-referrer"
          className={`max-w-full ${maxH} w-auto h-auto object-contain rounded-xl ${compact ? "" : "object-center"}`}
          onClick={(e) => e.stopPropagation()}
        />
        <a
          href={ad.adLibraryUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`absolute ${compact ? "bottom-2 left-2" : "bottom-3 left-3"} rounded-full bg-black/70 text-white text-[11px] px-2.5 py-1`}
        >
          Play on Meta
        </a>
      </div>
    );
  }

  if (wantsVideo && videoFailed && !still) {
    return (
      <div
        className={`flex w-full ${minH} flex-col items-center justify-center gap-2 px-4 text-center`}
      >
        <p className="text-[12px] text-[#6b7280]">Video didn&apos;t load in the browser. Open it on Meta.</p>
        <a
          href={ad.adLibraryUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="rounded-full bg-[#1877f2] text-white text-[12px] font-semibold px-4 py-2 hover:bg-[#166fe5]"
        >
          Play on Meta
        </a>
      </div>
    );
  }

  if (still) {
    return (
      <img
        src={still}
        alt=""
        referrerPolicy="no-referrer"
        className={`max-w-full ${maxH} w-auto h-auto object-contain rounded-xl ${compact ? "" : "object-center"}`}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <div
      className={`flex w-full ${minH} items-center justify-center text-[12px] text-[#9ca3af] px-2 text-center`}
    >
      {compact ? "No preview" : "No creative preview"}
    </div>
  );
}

function metaTimestampToMs(ts: number): number {
  return ts > 1e12 ? ts : ts * 1000;
}

function computeMetaAdLifespanDays(ad: MetaAdCardModel): number {
  if (ad.startedAt == null || !Number.isFinite(ad.startedAt)) return 0;
  const start = metaTimestampToMs(ad.startedAt);
  const end =
    ad.endedAt != null && Number.isFinite(ad.endedAt)
      ? metaTimestampToMs(ad.endedAt)
      : Date.now();
  return Math.max(0, Math.floor((end - start) / (24 * 60 * 60 * 1000)));
}

function isMetaAdKilled(ad: MetaAdCardModel): boolean {
  if (ad.endedAt == null || !Number.isFinite(ad.endedAt)) return false;
  return metaTimestampToMs(ad.endedAt) < Date.now() - 48 * 60 * 60 * 1000;
}

function metaSiteLabel(ad: MetaAdCardModel, brandDomain: string): { destHttps: string | null; siteLabel: string } {
  const probe = (ad.destinationUrl || ad.subtext || "").trim();
  let destHttps = safeHttpsUrl(probe);
  if (!destHttps && probe && !/\s/.test(probe) && !/^https?:\/\//i.test(probe)) {
    destHttps = safeHttpsUrl(`https://${probe.replace(/^\/\/+/, "")}`);
  }
  const siteLabel = destHttps
    ? (() => {
        try {
          return new URL(destHttps).hostname.replace(/^www\./, "");
        } catch {
          return brandDomain;
        }
      })()
    : ad.subtext && !/^https?:\/\//i.test(ad.subtext.trim())
      ? ad.subtext.trim().split(/[\s/]/)[0]?.slice(0, 48) || `www.${brandDomain}`
      : `www.${brandDomain}`;
  return { destHttps, siteLabel };
}

export function MetaAdCard({
  ad,
  viewMode,
  brand,
  onClick,
  scrapedAdId,
  isSaved,
  onToggleSave,
  saveDisabled,
}: {
  ad: MetaAdCardModel;
  viewMode: "grid" | "list";
  brand: { domain: string; logoUrl: string };
  onClick?: () => void;
  /** DB row id when this card exists as scraped_ads (may be absent until resolve). */
  scrapedAdId?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  saveDisabled?: boolean;
}) {
  const { destHttps, siteLabel } = metaSiteLabel(ad, brand.domain);
  const ctaHref = destHttps || ad.adLibraryUrl;
  const metaTitle = ad.headline?.trim() || "";
  const metaPrimary = ad.desc?.trim() || "";
  const metaLinkDesc = ad.linkDescription?.trim() || "";

  return (
    <article
      onClick={onClick}
      className={`min-w-0 h-full bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden transition-all duration-200 flex flex-col ${
        onClick ? "cursor-pointer hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:ring-2 hover:ring-slate-200" : "hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
      }`}
    >
      <div className={`flex min-h-0 flex-1 ${viewMode === "list" ? "flex-row" : "flex-col"}`}>
        {viewMode === "list" ? (
          <div className="relative w-56 shrink-0 min-h-[220px] border-r border-[#e5e7eb] bg-[#f3f4f6] p-2">
            <div className="relative flex h-full min-h-[204px] w-full items-center justify-center overflow-hidden rounded-xl bg-white">
              <MetaCreativeMedia ad={ad} compact />
            </div>
          </div>
        ) : null}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="p-4 flex items-start gap-3 border-b border-[#f1f5f9]">
            <CompetitorLogo
              sources={{
                primary: ad.pageProfilePic,
                secondary: brand.logoUrl,
                domain: brand.domain,
              }}
              name={ad.pageName?.trim() || brand.domain || "Brand"}
              size="md"
              shape="circle"
            />
            <div className="flex-1 min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <p className="font-semibold text-[15px] text-[#343434] break-words [overflow-wrap:anywhere]">
                  {ad.pageName}
                </p>
                {ad.advertiserMismatch ? <UnverifiedSourceBadge /> : null}
              </div>
              <p className="text-[13px] text-[#6b7280] flex items-center gap-1.5 mt-0.5">
                Sponsored <Globe className="w-3.5 h-3.5 text-[#9ca3af] shrink-0" />
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {ad.startedAt != null && Number.isFinite(ad.startedAt) ? (
                <div className="flex items-center gap-1.5 text-[11px] text-[#6b7280]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isMetaAdKilled(ad) ? "bg-[#9ca3af]" : "bg-green-500"
                    }`}
                  />
                  <span className="font-medium whitespace-nowrap">
                    {isMetaAdKilled(ad) ? "Ended" : "Active"} {computeMetaAdLifespanDays(ad)}D
                  </span>
                </div>
              ) : null}
              {ad.adLibraryUrl?.trim() ? (
                <a
                  href={ad.adLibraryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded-md hover:bg-[#f3f4f6] text-[#9ca3af] hover:text-[#343434] transition-colors"
                  title="Open original ad on Meta"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </div>
          {metaTitle || metaPrimary ? (
            <div className="px-4 py-3 shrink-0">
              {metaTitle ? (
                <ExpandableAdText
                  text={metaTitle}
                  className="font-semibold text-[15px] text-[#1c1e21] leading-snug break-words [overflow-wrap:anywhere]"
                />
              ) : null}
              {metaTitle && metaPrimary ? (
                <div className="h-[1lh] min-h-[1.125rem] shrink-0" aria-hidden />
              ) : null}
              {metaPrimary ? (
                <ExpandableAdText
                  text={metaPrimary}
                  className="text-[14px] text-[#374151] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                />
              ) : null}
            </div>
          ) : null}
          {viewMode === "grid" && (
            <div className="relative w-full flex-1 border-y border-[#e5e7eb] bg-[#f3f4f6] p-3">
              <div className="relative flex min-h-[240px] w-full items-center justify-center overflow-hidden rounded-xl bg-white">
                <MetaCreativeMedia ad={ad} compact={false} />
              </div>
            </div>
          )}
          <div className="px-4 py-3.5 flex flex-col gap-3 bg-[#f3f4f6] shrink-0 border-t border-[#e5e7eb]">
            <div className="min-w-0 flex flex-col rounded-lg border border-[#e5e7eb] bg-white p-3 shadow-sm">
              <p className="text-[12px] font-medium text-[#65676b] uppercase tracking-wide truncate">{siteLabel}</p>
              {metaLinkDesc ? (
                <ExpandableAdText
                  text={metaLinkDesc}
                  className="mt-1.5 text-[13px] text-[#65676b] leading-snug whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                />
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`px-5 py-2 min-h-[44px] inline-flex items-center justify-center rounded-md text-[14px] font-semibold shrink-0 border transition-colors ${
                  destHttps
                    ? "bg-[#e7f3ff] text-[#0d6efd] border-[#cce4ff] hover:bg-[#d8ebfc]"
                    : "bg-[#f0f2f5] text-[#65676b] border-[#e4e6eb] hover:bg-[#e7e9ed]"
                }`}
              >
                {ad.cta}
              </a>
              <a
                href={ad.adLibraryUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3.5 py-2 rounded-full bg-white text-[#2563eb] text-[12px] font-semibold hover:bg-[#eff6ff] transition-colors border border-[#bfdbfe] whitespace-nowrap"
              >
                View in Meta library
              </a>
            </div>
            <AdSaveRow
              scrapedAdId={scrapedAdId}
              isSaved={Boolean(isSaved)}
              onToggleSave={onToggleSave}
              saveDisabled={saveDisabled}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
