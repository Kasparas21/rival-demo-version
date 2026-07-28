"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Play, Sparkles } from "lucide-react";

import type { DiscoveryAssistantAdRef } from "@/lib/discovery/discovery-assistant-types";
import { cn } from "@/lib/utils";

type Props = {
  ads: DiscoveryAssistantAdRef[];
  onOpenAd: (id: string) => void;
};

function isVideoFormat(format: string | undefined): boolean {
  const f = (format ?? "").toLowerCase();
  return f.includes("video") || f === "reel";
}

export function DiscoveryAssistantAdGallery({ ads, onOpenAd }: Props) {
  const reduceMotion = useReducedMotion();
  if (!ads.length) return null;

  return (
    <motion.div
      className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2"
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.07, delayChildren: 0.05 } },
      }}
    >
      {ads.map((ad) => (
        <motion.button
          key={ad.id}
          type="button"
          onClick={() => onOpenAd(ad.id)}
          variants={
            reduceMotion
              ? undefined
              : {
                  hidden: { opacity: 0, y: 14, scale: 0.96 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { type: "spring", damping: 26, stiffness: 340 },
                  },
                }
          }
          whileHover={reduceMotion ? undefined : { y: -2, transition: { duration: 0.18 } }}
          className="group overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-left shadow-[0_4px_20px_-8px_rgba(15,23,42,0.18)] transition-shadow hover:shadow-[0_12px_32px_-10px_rgba(15,23,42,0.22)]"
        >
          <div className="relative aspect-[4/5] max-h-[140px] w-full overflow-hidden bg-slate-100">
            {ad.creative_url ? (
              isVideoFormat(ad.format) ? (
                <>
                  <video
                    src={ad.creative_url}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-md">
                      <Play className="ml-0.5 h-4 w-4" aria-hidden />
                    </span>
                  </span>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ad.creative_url}
                  alt=""
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              )
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Ad preview</p>
                <p className="line-clamp-3 text-xs text-slate-500">{ad.preview}</p>
              </div>
            )}
            {ad.is_ultimate_winner ? (
              <span className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-amber-400/95 px-2 py-0.5 text-[10px] font-bold text-amber-950 shadow-sm">
                <Sparkles className="h-3 w-3" aria-hidden />
                Winner
              </span>
            ) : null}
            {!ad.is_active ? (
              <span className="absolute right-2 top-2 rounded-full bg-slate-900/75 px-2 py-0.5 text-[10px] font-semibold text-white">
                Retired
              </span>
            ) : null}
          </div>
          <div className="space-y-1 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-900">{ad.competitor_name}</p>
            <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">{ad.preview}</p>
            <p className="text-[10px] font-medium text-slate-400">
              {ad.format || "ad"}
              {ad.impressions_index != null ? ` · index ${ad.impressions_index}` : ""}
            </p>
          </div>
        </motion.button>
      ))}
    </motion.div>
  );
}
