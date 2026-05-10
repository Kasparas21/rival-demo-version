"use client";

import { useEffect, useState } from "react";
import { Globe, MoreHorizontal, X } from "lucide-react";
import { BrandLogoThumb } from "@/components/brand-logo-thumb";
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
  const videoClass = `max-w-full w-auto h-auto ${maxH} rounded-lg object-contain bg-black`;

  if (wantsVideo && !videoFailed) {
    return (
      <video
        controls
        playsInline
        preload="metadata"
        poster={still || undefined}
        className={compact ? `w-full h-full ${videoClass}` : videoClass}
        src={stream}
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
          className={`max-w-full ${maxH} w-auto h-auto object-contain ${compact ? "" : "object-center"}`}
        />
        <a
          href={ad.adLibraryUrl}
          target="_blank"
          rel="noopener noreferrer"
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
        className={`max-w-full ${maxH} w-auto h-auto object-contain ${compact ? "" : "object-center"}`}
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
}: {
  ad: MetaAdCardModel;
  viewMode: "grid" | "list";
  brand: { domain: string; logoUrl: string };
}) {
  const { destHttps, siteLabel } = metaSiteLabel(ad, brand.domain);
  const ctaHref = destHttps || ad.adLibraryUrl;

  return (
    <article className="min-w-0 h-full bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-200 flex flex-col">
      {viewMode === "list" && ad.desc?.trim() ? (
        <div className="px-4 py-3 border-b border-[#e5e7eb] shrink-0">
          <ExpandableAdText
            text={ad.desc}
            className="text-[14px] text-[#374151] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
          />
        </div>
      ) : null}
      <div className={`flex min-h-0 flex-1 ${viewMode === "list" ? "flex-row" : "flex-col"}`}>
        {viewMode === "list" ? (
            <div className="relative w-56 shrink-0 bg-[#f3f4f6] border-r border-[#e5e7eb] flex items-center justify-center p-2 min-h-[220px]">
            <MetaCreativeMedia ad={ad} compact />
          </div>
        ) : null}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="p-4 flex items-start gap-3 border-b border-[#f1f5f9]">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#e5e7eb] bg-white">
              {(ad.pageProfilePic || brand.logoUrl)?.trim() ? (
                <BrandLogoThumb
                  src={(ad.pageProfilePic || brand.logoUrl).trim()}
                  alt=""
                  className="bg-white"
                />
              ) : (
                <div
                  className="flex size-full items-center justify-center bg-[#f3f4f6] text-[13px] font-semibold text-[#9ca3af]"
                  aria-hidden
                >
                  {ad.pageName.trim().slice(0, 1).toUpperCase() || "?"}
                </div>
              )}
            </div>
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
            <div className="flex items-center gap-0.5 shrink-0 text-[#9ca3af]">
              <button type="button" className="p-1.5 rounded-lg hover:bg-[#f3f4f6]">
                <MoreHorizontal className="w-4 h-4" />
              </button>
              <button type="button" className="p-1.5 rounded-lg hover:bg-[#f3f4f6]">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {viewMode === "grid" && ad.desc?.trim() ? (
            <div className="px-4 py-3">
              <ExpandableAdText
                text={ad.desc}
                className="text-[14px] text-[#374151] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
              />
            </div>
          ) : null}
          {viewMode === "grid" && (
            <div className="relative w-full flex-1 min-h-[260px] bg-[#f3f4f6] border-y border-[#e5e7eb] flex items-center justify-center py-3 px-2">
              <MetaCreativeMedia ad={ad} compact={false} />
            </div>
          )}
          <div className="px-4 py-3.5 flex flex-col gap-3 bg-[#f3f4f6] shrink-0 border-t border-[#e5e7eb]">
            <div className="min-w-0 space-y-1.5 rounded-lg border border-[#e5e7eb] bg-white p-3 shadow-sm">
              <p className="text-[12px] font-medium text-[#65676b] uppercase tracking-wide truncate">{siteLabel}</p>
              {ad.headline?.trim() ? (
                <ExpandableAdText
                  text={ad.headline.trim()}
                  className="font-semibold text-[15px] text-[#1c1e21] leading-snug break-words [overflow-wrap:anywhere]"
                />
              ) : null}
              {ad.linkDescription?.trim() ? (
                <ExpandableAdText
                  text={ad.linkDescription.trim()}
                  className="text-[13px] text-[#65676b] leading-snug whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                />
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
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
                className="px-3.5 py-2 rounded-full bg-white text-[#2563eb] text-[12px] font-semibold hover:bg-[#eff6ff] transition-colors border border-[#bfdbfe] whitespace-nowrap"
              >
                View in Meta library
              </a>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
