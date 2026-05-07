"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import type { TikTokAdCard as TikTokAdCardModel } from "@/lib/ad-library/normalize";

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[13px] leading-snug">
      <span className="text-[#64748b]">{label}</span>
      <span className="min-w-0 font-medium text-[#0f172a] tabular-nums">{value}</span>
    </div>
  );
}

/** Always-visible creative area when CDN URLs fail or are missing (never an empty “no preview” box). */
function TikTokCreativePlaceholder({ ad }: { ad: TikTokAdCardModel }) {
  const title =
    ad.headline?.trim() && ad.headline.trim() !== ad.advertiser.trim() ? ad.headline.trim() : ad.advertiser;
  return (
    <a
      href={ad.adUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="relative flex h-full min-h-[220px] w-full flex-col items-center justify-center bg-gradient-to-br from-[#010101] via-[#0c4a6e]/35 to-[#0f172a] px-4 text-center transition-opacity hover:opacity-95"
    >
      <span className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white shadow-lg backdrop-blur-sm ring-1 ring-white/20">
        <Play className="ml-1 h-8 w-8" fill="currentColor" aria-hidden />
      </span>
      <p className="max-w-[240px] text-[13px] font-semibold leading-snug text-white line-clamp-4 [text-shadow:_0_1px_3px_rgb(0_0_0_/_90%)]">
        {title}
      </p>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-teal-300/95">Open in TikTok Ads Library</p>
    </a>
  );
}

export function TikTokAdCard({ ad }: { ad: TikTokAdCardModel }) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setVideoFailed(false);
    setImgFailed(false);
  }, [ad.id]);

  const first = ad.firstShown?.trim() || "—";
  const last = ad.lastShown?.trim() || "—";
  const reach = ad.uniqueUsersSeen?.trim() || "—";
  const overlayCopy = (() => {
    const h = ad.headline?.trim() ?? "";
    if (h && h !== ad.advertiser.trim()) return h;
    const d = ad.desc?.trim() ?? "";
    if (d && d !== "—") return d.split("\n")[0]!.slice(0, 280);
    return "";
  })();

  const poster = ad.img?.trim();
  const hasVideo = Boolean(ad.videoUrl?.trim());
  const tryVideo = hasVideo && !videoFailed;
  const tryImg = Boolean(poster) && !imgFailed && (!tryVideo || videoFailed);

  return (
    <article className="min-w-0 h-full flex flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="space-y-3 shrink-0 px-4 pb-3 pt-4">
        <div className="flex min-w-0 items-start gap-2">
          <span className="shrink-0 rounded bg-[#38bdf8] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            Ad
          </span>
          <span className="min-w-0 truncate text-[15px] font-bold leading-tight text-[#0f172a]" title={ad.advertiser}>
            {ad.advertiser}
          </span>
        </div>
        <div className="space-y-1.5">
          <MetaRow label="First shown:" value={first} />
          <MetaRow label="Last shown:" value={last} />
          <MetaRow label="Unique users seen:" value={reach} />
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col w-full overflow-hidden bg-[#0f172a]">
        <div className="mx-auto aspect-[9/16] w-full max-w-[min(100%,280px)] max-h-[min(480px,55vh)] min-h-[200px]">
          {tryVideo ? (
            <div className="relative h-full w-full">
              <video
                controls
                playsInline
                preload="metadata"
                poster={poster || undefined}
                className="h-full w-full object-contain object-center"
                src={ad.videoUrl}
                onError={() => setVideoFailed(true)}
              />
              {overlayCopy ? (
                <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/65 via-black/25 to-transparent px-3 pb-10 pt-3">
                  <p className="line-clamp-4 text-[13px] font-semibold leading-snug text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_90%)]">
                    {overlayCopy}
                  </p>
                </div>
              ) : null}
            </div>
          ) : tryImg ? (
            <a
              href={ad.adUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block h-full w-full"
            >
              <img
                src={poster}
                alt=""
                className="h-full w-full object-contain object-center"
                onError={() => setImgFailed(true)}
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 text-white shadow-lg">
                  <Play className="ml-1 h-8 w-8" fill="currentColor" aria-hidden />
                </span>
              </div>
              {overlayCopy ? (
                <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/65 via-black/25 to-transparent px-3 pb-10 pt-3">
                  <p className="line-clamp-4 text-[13px] font-semibold leading-snug text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_90%)]">
                    {overlayCopy}
                  </p>
                </div>
              ) : null}
            </a>
          ) : (
            <TikTokCreativePlaceholder ad={ad} />
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-[#f1f5f9] px-4 py-3">
        <a
          href={ad.adUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#2563eb] hover:underline"
        >
          View in TikTok Ads Library
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </article>
  );
}
