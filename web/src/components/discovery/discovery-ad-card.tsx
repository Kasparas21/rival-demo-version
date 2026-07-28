"use client";

import type { ReactNode } from "react";
import { Bookmark, BookmarkCheck, Sparkles } from "lucide-react";
import { MetaAdCard } from "@/components/ads-library/meta-ad-card";
import { CompetitorLogo } from "@/components/shared/competitor-logo";
import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { hydrateMetaAdCardForLibrary } from "@/lib/ad-library/count-active-ads";
import type { MetaAdCard as MetaAdCardModel } from "@/lib/ad-library/normalize";
import type { DiscoveryAdDto } from "@/lib/discovery/types";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import { cn } from "@/lib/utils";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type Props = {
  ad: DiscoveryAdDto;
  onOpen?: () => void;
  className?: string;
  isSaved?: boolean;
  isSavePending?: boolean;
  onToggleSave?: () => void;
};

export function DiscoveryAdCard({
  ad,
  onOpen,
  className,
  isSaved = false,
  isSavePending = false,
  onToggleSave,
}: Props) {
  const platform = ad.platform.trim().toLowerCase();
  if (platform !== "meta" || !isRecord(ad.raw_payload)) {
    return null;
  }

  const domain = ad.competitor_domain ?? "";
  const brand = { name: ad.competitor_name, domain, logoUrl: ad.competitor_logo_url ?? "" };
  const hydrated = hydrateMetaAdCardForLibrary(ad.raw_payload as unknown as MetaAdCardModel);
  const saveProps = {
    scrapedAdId: ad.id,
    isSaved: isSaved || isSavePending,
    onToggleSave,
    saveDisabled: !onToggleSave,
  };

  const header = (
    <div className="relative flex items-center gap-2 border-b border-slate-100/90 bg-white/80 px-3 py-2.5 backdrop-blur-sm">
      <CompetitorLogo
        sources={{ primary: ad.competitor_logo_url, domain }}
        name={ad.competitor_name}
        size="xs"
      />
      <div className="min-w-0 flex-1 pr-10">
        <p className="truncate text-[13px] font-semibold text-slate-900">{ad.competitor_name}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
          <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-3 w-3" />
          <span className="capitalize">{platform}</span>
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
        "group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]",
        className,
      )}
    >
      {header}
      <div className="p-2">{body}</div>
    </article>
  );

  return shell(
    <MetaAdCard
      ad={hydrated}
      viewMode="grid"
      gridCreativeSizing="natural"
      brand={brand}
      onClick={onOpen}
      {...saveProps}
    />,
  );
}
