"use client";

import { ExternalLink } from "lucide-react";
import { isSnapchatAdActive } from "@/lib/ad-library/count-active-ads";
import type { SnapchatAdCard as SnapchatCardModel } from "@/lib/ad-library/normalize";
import { AdSaveRow } from "@/components/ads-library/ad-save-row";
import { AdCreativeVideoOrImage } from "@/components/ads-library/ad-creative-video-or-image";
import { UnverifiedSourceBadge } from "@/components/ads-library/unverified-source-overlay";

function GalleryMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-1 text-[11px] leading-snug">
      <span className="shrink-0 text-[#6b7280]">{label}</span>
      <span className="min-w-0 font-medium text-[#171717]" title={value}>
        {value}
      </span>
    </div>
  );
}

function formatSnapCtaLabel(raw: string | null | undefined): string {
  const t = raw?.trim();
  if (!t) return "Learn more";
  return t
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase())
    .join(" ");
}

export function SnapchatAdCard({
  ad,
  onClick,
  scrapedAdId,
  isSaved,
  onToggleSave,
  saveDisabled,
}: {
  ad: SnapchatCardModel;
  onClick?: () => void;
  scrapedAdId?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  saveDisabled?: boolean;
}) {
  const hasVideo = Boolean(ad.videoUrl?.trim());
  const tryImg = Boolean(ad.img?.trim());
  const hasCreative = hasVideo || tryImg;
  /** Light gallery framing + equal padding instead of letterboxed black chrome. */
  const lightCreativeChrome = hasCreative && tryImg && !hasVideo;
  const isActive = isSnapchatAdActive(ad);

  return (
    <article
      onClick={onClick}
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm transition-shadow hover:shadow-[0_8px_30px_rgba(15,23,42,0.08)] ${
        onClick ? "cursor-pointer hover:ring-2 hover:ring-slate-200" : ""
      }`}
    >
      {/* Ads Gallery–style facts */}
      <div className="shrink-0 border-b border-[#ececec] px-4 pb-4 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-[#111827]">
              <span className="font-semibold">Ad Publisher:</span>{" "}
              <span className="font-bold">{ad.advertiser}</span>
              {ad.advertiserMismatch ? <UnverifiedSourceBadge /> : null}
            </p>
          </div>
          {ad.status ? (
            <span
              className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                isActive ? "bg-emerald-600 text-white" : "border border-[#e5e5e5] bg-[#fafafa] text-[#525252]"
              }`}
            >
              {isActive ? "Active" : ad.status}
            </span>
          ) : null}
        </div>

        <div className="mt-3 space-y-1">
          <GalleryMetaRow
            label="Brand Advertised:"
            value={(ad.brandAdvertised ?? "N/A").trim() || "N/A"}
          />
          <GalleryMetaRow label="Ad Start Date:" value={ad.startDateLabel ?? "N/A"} />
          <GalleryMetaRow label="Ad End Date:" value={ad.endDateLabel ?? "N/A"} />
          <GalleryMetaRow
            label="Total Impressions:"
            value={ad.impressionsLabel?.trim() ? ad.impressionsLabel : "N/A"}
          />
          {ad.euCountry?.trim() ? (
            <GalleryMetaRow label="Market:" value={ad.euCountry.trim()} />
          ) : null}
        </div>

        <div className="mt-3 flex justify-center">
          <a
            href={ad.adUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[13px] font-semibold text-[#0077b5] underline decoration-[#0077b5]/35 underline-offset-2 hover:text-[#005582]"
          >
            See Details
          </a>
        </div>
      </div>

      {/* Static snapshot: airy light frame · video/no-preview: unchanged dark fallback */}
      <div
        className={`flex min-h-0 flex-1 flex-col ${
          lightCreativeChrome ? "bg-[#f4f4f5]" : "bg-neutral-950"
        }`}
      >
        <div
          className={`relative w-full shrink-0 ${lightCreativeChrome ? "min-h-[260px] p-3 sm:p-4" : "min-h-[280px] p-3 sm:p-4"}`}
        >
          {hasCreative ? (
            <AdCreativeVideoOrImage
              img={tryImg ? (ad.img ?? "") : ""}
              videoUrl={hasVideo ? (ad.videoUrl ?? "") : undefined}
              openHref={ad.adUrl}
              minHeightClass={lightCreativeChrome ? "min-h-[220px]" : "min-h-[280px]"}
              variant={lightCreativeChrome ? "neutralMat" : "default"}
              className={
                lightCreativeChrome
                  ? "rounded-xl border border-black/[0.06] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] py-5 px-4 sm:py-6 sm:px-5 !max-h-[min(500px,58vh)]"
                  : "rounded-xl bg-neutral-950 !py-0 !max-h-[min(520px,62vh)]"
              }
            />
          ) : (
            <a
              href={ad.adUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex min-h-[240px] w-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-neutral-900 to-neutral-950 px-4 py-10 text-center"
            >
              <p className="text-[15px] font-semibold leading-snug text-white drop-shadow-sm line-clamp-4">{ad.headline}</p>
              <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-sky-400 hover:text-sky-300">
                Open in Snapchat Ads Gallery
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              </span>
            </a>
          )}
        </div>

        {((ad.suppressCreativeHeadline ? false : Boolean(ad.headline?.trim())) || ad.ctaLabel?.trim()) && (
          <div
            className={`shrink-0 space-y-2 px-4 py-3 ${
              lightCreativeChrome
                ? "border-t border-zinc-200/90 bg-[#fafafa]"
                : "border-t border-neutral-800"
            }`}
          >
            {!ad.suppressCreativeHeadline && ad.headline?.trim() ? (
              <p
                className={`text-[14px] font-semibold leading-snug ${lightCreativeChrome ? "text-neutral-900" : "text-white"}`}
              >
                {ad.headline.trim()}
              </p>
            ) : null}
            {ad.ctaLabel?.trim() ? (
              <span
                className={`inline-flex rounded-full px-4 py-2 text-[12px] font-bold uppercase tracking-wide shadow-sm ring-1 ${
                  lightCreativeChrome
                    ? "bg-neutral-900 text-white ring-neutral-900/10"
                    : "bg-white text-neutral-950 ring-white/30"
                }`}
              >
                {formatSnapCtaLabel(ad.ctaLabel)}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {ad.desc?.trim() && ad.desc.trim() !== "—" ? (
        <div className="shrink-0 border-t border-[#ececec] px-4 py-2.5">
          <p className="line-clamp-2 text-[11px] leading-relaxed text-[#6b7280]" title={ad.desc}>
            {ad.desc}
          </p>
        </div>
      ) : null}

      <div className="shrink-0 border-t border-[#ececec] bg-white px-4 pb-4 pt-1" onClick={(e) => e.stopPropagation()}>
        <AdSaveRow
          scrapedAdId={scrapedAdId}
          isSaved={Boolean(isSaved)}
          onToggleSave={onToggleSave}
          saveDisabled={saveDisabled}
        />
      </div>
    </article>
  );
}
