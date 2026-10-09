"use client";

import { Check, Loader2 } from "lucide-react";

import {
  faviconFor,
  type RecommendedCompetitor,
  useCompetitorRecommendations,
} from "@/components/competitor-recommendations/use-competitor-recommendations";

function CompetitorRow({
  item,
  tracked,
  onTrack,
}: {
  item: RecommendedCompetitor;
  tracked: boolean;
  onTrack?: (domain: string) => void;
}) {
  return (
    <li className="flex items-center gap-4 px-5 py-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={faviconFor(item.domain)}
        alt=""
        className="size-10 shrink-0 rounded-[10px] bg-white object-contain p-1.5 ring-1 ring-black/[0.06]"
      />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">{item.name}</span>
          <a
            href={`https://${item.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 truncate text-[13px] text-[#86868b] hover:text-[#1d1d1f] hover:underline"
          >
            {item.domain}
          </a>
        </p>
        {item.edge ? <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#6e6e73]">{item.edge}</p> : null}
      </div>
      {onTrack ? (
        tracked ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-[#86868b]">
            <Check className="size-3.5" strokeWidth={2.5} aria-hidden /> Tracking
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onTrack(item.domain)}
            className="shrink-0 cursor-pointer rounded-full bg-[#f5f5f7] px-4 py-1.5 text-[13px] font-semibold text-[#1d1d1f] transition-colors hover:bg-[#e8e8ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1f]"
          >
            Track
          </button>
        )
      ) : null}
    </li>
  );
}

const panel =
  "overflow-hidden rounded-[20px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_28px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.04]";

/** Direct competitors found from the brand's website, on Find competitor. The user starts the search. */
export function RecommendedCompetitors({
  brandId,
  trackedDomains,
  onTrack,
}: {
  brandId: string;
  trackedDomains?: ReadonlySet<string>;
  onTrack?: (domain: string) => void;
}) {
  const { view, error, starting, start } = useCompetitorRecommendations({ brandId });
  const items = view?.recommendations ?? [];

  return (
    <section className="w-full text-left" aria-live="polite">
      <h2 className="mb-3 px-1 text-[20px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">Suggested competitors</h2>

      {error ? (
        <div className={`${panel} flex items-center gap-4 px-5 py-4 text-[14px] text-[#6e6e73]`}>
          <p className="flex-1">{error}</p>
          {view?.status !== "running" ? (
            <button type="button" onClick={() => void start()} className="cursor-pointer font-semibold text-[#0066cc] hover:underline">
              Try again
            </button>
          ) : null}
        </div>
      ) : !view ? (
        <div className={`${panel} h-[76px] animate-pulse`} />
      ) : view.status === "none" ? (
        <div className={`${panel} flex flex-col items-start gap-4 px-5 py-5 sm:flex-row sm:items-center`}>
          <p className="flex-1 text-[14px] leading-relaxed text-[#6e6e73]">
            Find the businesses competing with you for the same customers, and the ones worth learning from. Takes about a
            minute.
          </p>
          <button
            type="button"
            disabled={starting}
            onClick={() => void start()}
            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-[#1d1d1f] px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-black disabled:opacity-60"
          >
            {starting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Find competitors
          </button>
        </div>
      ) : view.status === "running" ? (
        <div className={`${panel} flex items-center gap-3 px-5 py-5 text-[14px] text-[#6e6e73]`}>
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          Finding competitors for {view.domain}. This takes a minute or two.
        </div>
      ) : view.status === "failed" ? (
        <div className={`${panel} flex items-center gap-4 px-5 py-4 text-[14px] text-[#6e6e73]`}>
          <p className="flex-1">The search didn&apos;t finish.</p>
          <button
            type="button"
            disabled={starting}
            onClick={() => void start()}
            className="cursor-pointer font-semibold text-[#0066cc] hover:underline disabled:opacity-60"
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className={`${panel} px-5 py-5 text-[14px] text-[#6e6e73]`}>
          We didn&apos;t find competitors we were sure about. Enter one above.
        </p>
      ) : (
        <ul className={`${panel} divide-y divide-black/[0.06]`}>
          {items.map((item) => (
            <CompetitorRow key={item.domain} item={item} tracked={trackedDomains?.has(item.domain) ?? false} onTrack={onTrack} />
          ))}
        </ul>
      )}
    </section>
  );
}
