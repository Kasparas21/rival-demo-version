"use client";

import { ExternalLink, Globe, MoreHorizontal, X } from "lucide-react";
import { BrandLogoThumb } from "@/components/brand-logo-thumb";
import { ExpandableAdText } from "@/components/ads-library/expandable-ad-text";
import type { MetaAdCard as MetaAdCardModel } from "@/lib/ad-library/normalize";
import { safeHttpsUrl } from "@/lib/ad-library/normalize";

function metaSiteLabel(ad: MetaAdCardModel, brandDomain: string): { destHttps: string | null; siteLabel: string } {
  const destHttps = safeHttpsUrl(ad.subtext);
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

  return (
    <article
      className={`min-w-0 h-full bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-200 ${viewMode === "list" ? "flex flex-row" : "flex flex-col"}`}
    >
      {viewMode === "list" && (
        <div className="relative w-56 shrink-0 bg-[#f3f4f6] border-r border-[#e5e7eb] flex items-center justify-center p-2 min-h-[220px]">
          {ad.isVideo && ad.videoUrl ? (
            <video
              controls
              playsInline
              preload="metadata"
              poster={ad.img || undefined}
              className="w-full h-full max-h-[300px] rounded-lg object-contain bg-black"
              src={ad.videoUrl}
            />
          ) : ad.img ? (
            <img src={ad.img} alt="" className="max-w-full max-h-[300px] w-auto h-auto object-contain" />
          ) : (
            <div className="w-full min-h-[120px] flex items-center justify-center text-[12px] text-[#9ca3af] px-2 text-center">No preview</div>
          )}
          {ad.isVideo && !ad.videoUrl ? (
            <a
              href={ad.adLibraryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2 left-2 rounded-full bg-black/70 text-white text-[11px] px-2.5 py-1"
            >
              Play on Meta
            </a>
          ) : null}
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="p-4 flex items-start gap-3 border-b border-[#f1f5f9]">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#e5e7eb] bg-white">
            <BrandLogoThumb src={ad.pageProfilePic || brand.logoUrl} alt="" className="bg-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] text-[#343434] break-words [overflow-wrap:anywhere]">{ad.pageName}</p>
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
        {ad.desc?.trim() ? (
          <div className="px-4 py-3">
            <ExpandableAdText
              text={ad.desc}
              className="text-[14px] text-[#374151] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
            />
          </div>
        ) : null}
        {viewMode === "grid" && (
          <div className="relative w-full flex-1 min-h-[260px] bg-[#f3f4f6] border-y border-[#e5e7eb] flex items-center justify-center py-3 px-2">
            {ad.isVideo && ad.videoUrl ? (
              <video
                controls
                playsInline
                preload="metadata"
                poster={ad.img || undefined}
                className="max-w-full max-h-[420px] w-auto h-auto object-contain rounded-lg bg-black"
                src={ad.videoUrl}
              />
            ) : ad.img ? (
              <img src={ad.img} alt="" className="max-w-full max-h-[420px] w-auto h-auto object-contain object-center" />
            ) : (
              <div className="w-full min-h-[180px] flex items-center justify-center text-[13px] text-[#9ca3af] px-4 text-center">No creative preview</div>
            )}
            {ad.isVideo && !ad.videoUrl ? (
              <a
                href={ad.adLibraryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 left-3 rounded-full bg-black/70 text-white text-[11px] px-3 py-1.5"
              >
                Play on Meta
              </a>
            ) : null}
          </div>
        )}
        <div className="px-4 py-3.5 flex flex-col gap-3 bg-[#f8fafc] shrink-0 border-t border-[#f1f5f9]">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] text-[#6b7280] truncate">{siteLabel}</p>
            <p className="font-semibold text-[14px] text-[#1f2937] break-words [overflow-wrap:anywhere] leading-snug">{ad.headline}</p>
            {ad.subtext && !destHttps && ad.subtext !== ad.headline ? (
              <p className="text-[13px] text-[#6b7280] line-clamp-2 break-words">{ad.subtext}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={ad.adLibraryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-full bg-white text-[#2563eb] text-[12px] font-semibold hover:bg-[#eff6ff] transition-colors border border-[#bfdbfe] whitespace-nowrap"
            >
              View in Meta library
            </a>
            <button
              type="button"
              className="px-4 py-2 rounded-full bg-[#e5e7eb] text-[#1f2937] text-[13px] font-semibold hover:bg-[#d1d5db] transition-colors border border-[#d1d5db] whitespace-nowrap max-w-full truncate"
            >
              {ad.cta}
            </button>
            {destHttps ? (
              <a
                href={destHttps}
                target="_blank"
                rel="noopener noreferrer"
                title={ad.subtext}
                aria-label="Open ad destination in a new tab"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#2563eb] hover:bg-[#eff6ff] transition-colors"
              >
                <ExternalLink className="w-4 h-4" aria-hidden />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
