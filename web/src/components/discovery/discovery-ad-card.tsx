"use client";

import type { ReactNode } from "react";
import { Bookmark, BookmarkCheck, Check, Circle, Sparkles } from "lucide-react";
import { MetaAdCard } from "@/components/ads-library/meta-ad-card";
import { CompetitorLogo } from "@/components/shared/competitor-logo";
import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { hydrateDiscoveryMetaAdCard } from "@/lib/discovery/hydrate-discovery-meta-ad";
import type { DiscoveryAdDto } from "@/lib/discovery/types";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import { cn } from "@/lib/utils";

type Props = {
  ad: DiscoveryAdDto;
  onOpen?: () => void;
  className?: string;
  isSaved?: boolean;
  isSavePending?: boolean;
  onToggleSave?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
};

export function DiscoveryAdCard({
  ad,
  onOpen,
  className,
  isSaved = false,
  isSavePending = false,
  onToggleSave,
  selectable = false,
  selected = false,
  onToggleSelect,
}: Props) {
  const platform = ad.platform.trim().toLowerCase();
  const hydrated = hydrateDiscoveryMetaAdCard(ad);
  if (platform !== "meta" || !hydrated) {
    return null;
  }

  const domain = ad.competitor_domain ?? "";
  const brand = { name: ad.competitor_name, domain, logoUrl: ad.competitor_logo_url ?? "" };
  const { card, runStatus } = hydrated;
  const saveProps = {
    scrapedAdId: ad.id,
    isSaved: isSaved || isSavePending,
    onToggleSave,
    saveDisabled: !onToggleSave,
  };

  const header = (
    <div className="relative flex items-center gap-2.5 border-b border-slate-100/90 bg-white/80 px-3 py-2.5 backdrop-blur-sm">
      {selectable ? (
        <button
          type="button"
          data-discovery-no-open
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
          aria-label={selected ? "Deselect ad" : "Select ad for chat"}
          aria-pressed={selected}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 shadow-sm transition",
            selected
              ? "border-[color:var(--rival-primary)] bg-[color:var(--rival-primary)] text-white"
              : "border-slate-300 bg-white text-slate-400 hover:border-[color:var(--rival-primary)] hover:text-[color:var(--rival-primary)]",
          )}
        >
          {selected ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <Circle className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          )}
        </button>
      ) : null}
      <CompetitorLogo
        sources={{ primary: ad.competitor_logo_url, domain }}
        name={ad.competitor_name}
        size="xs"
      />
      <div className="min-w-0 flex-1 pr-10">
        <p className="truncate text-[13px] font-semibold text-slate-900">{ad.competitor_name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-3 w-3" />
          <span className="capitalize">{platform}</span>
          {ad.client_brand_name ? (
            <span className="rounded-full bg-slate-100 px-1.5 py-0 text-[10px] font-medium text-slate-600">
              {ad.client_brand_name}
            </span>
          ) : null}
          {ad.is_ultimate_winner ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0 text-[10px] font-bold text-amber-800">
              <Sparkles className="h-2.5 w-2.5" aria-hidden />
              Ultimate
            </span>
          ) : null}
        </div>
      </div>
      {onToggleSave ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave();
          }}
          disabled={isSavePending}
          aria-label={isSaved ? "Unsave ad" : "Save ad"}
          className={cn(
            "absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm transition",
            isSaved
              ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            isSavePending && "opacity-60",
          )}
        >
          {isSaved ? (
            <BookmarkCheck className="h-4 w-4" aria-hidden />
          ) : (
            <Bookmark className="h-4 w-4" aria-hidden />
          )}
        </button>
      ) : null}
    </div>
  );

  const shell = (body: ReactNode) => (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]",
        selected
          ? "border-[color:var(--rival-primary)] ring-2 ring-[color-mix(in_srgb,var(--rival-accent-blue)_55%,white)]"
          : "border-slate-200/90 hover:border-slate-300",
        className,
      )}
    >
      {header}
      <div className="p-2">{body}</div>
    </article>
  );

  return shell(
    <MetaAdCard
      ad={card}
      viewMode="grid"
      gridCreativeSizing="natural"
      brand={brand}
      runStatus={runStatus}
      onClick={
        onOpen
          ? (e) => {
              const target = e.target as HTMLElement;
              if (
                target.closest(
                  'button[aria-label="Play video ad"], video, a, [data-discovery-no-open]',
                )
              ) {
                return;
              }
              onOpen();
            }
          : undefined
      }
      {...saveProps}
    />,
  );
}
