"use client";

import type { ReactNode } from "react";
import {
  Bookmark,
  Eye,
  Globe,
  Heart,
  Mail,
  MessageCircle,
  Share2,
  Trash2,
} from "lucide-react";

import { SavedAdLibraryCard } from "@/components/competitor/saved-hub/saved-ad-library-card";
import {
  emailTypeBadgeClass,
  formatEmailType,
  formatRelativeTime,
} from "@/components/email-intelligence/email-intelligence-ui";
import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { CompetitorLogo } from "@/components/shared/competitor-logo";
import type { SavedAdRow } from "@/components/ads-library/saved-ads-panel";
import type { SavedFeedItem } from "@/lib/saved/types";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import { cn } from "@/lib/utils";

type Props = {
  item: SavedFeedItem;
  onOpenAd?: (scrapedAdId: string) => void;
  onOpenEmail?: (competitorId: string, emailId: string, savedEmailId: string) => void;
  onUnsave: () => void;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

const TYPE_LABELS: Record<SavedFeedItem["item_type"], string> = {
  ad: "Ad",
  email: "Email",
  organic: "Organic",
  landing: "Landing page",
};

function ItemHeader({
  item,
  onUnsave,
}: {
  item: SavedFeedItem;
  onUnsave: () => void;
}) {
  const domain = item.competitor_domain ?? "";
  const platform =
    item.item_type === "ad" || item.item_type === "organic" ? item.platform : null;

  return (
    <div className="relative flex items-center gap-2 border-b border-slate-100/90 bg-white/80 px-3 py-2.5 backdrop-blur-sm">
      <CompetitorLogo
        sources={{ primary: item.competitor_logo_url, domain }}
        name={item.competitor_name}
        size="xs"
      />
      <div className="min-w-0 flex-1 pr-10">
        <p className="truncate text-[13px] font-semibold text-slate-900">{item.competitor_name}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
          {platform ? (
            <ComparisonPlatformIcon platform={platform as StrategyPlatform} className="h-3 w-3" />
          ) : (
            <Bookmark className="h-3 w-3" />
          )}
          <span>{TYPE_LABELS[item.item_type]}</span>
          <span className="text-slate-400">·</span>
          <span>Saved {formatRelativeTime(item.saved_at)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onUnsave();
        }}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        aria-label="Remove from saved"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function SavedFeedCard({ item, onOpenAd, onOpenEmail, onUnsave }: Props) {
  const shell = (body: ReactNode) => (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]",
      )}
    >
      <ItemHeader item={item} onUnsave={onUnsave} />
      <div className="p-2">{body}</div>
    </article>
  );

  if (item.item_type === "ad") {
    const adRow: SavedAdRow = {
      id: item.id,
      source_scraped_ad_id: item.source_scraped_ad_id,
      platform: item.platform,
      ad_text: item.ad_text,
      ad_creative_url: null,
      format: item.format,
      ai_extracted_angle: item.ai_extracted_angle,
      notes: item.notes,
      saved_at: item.saved_at,
      raw_payload: item.raw_payload,
    };
    return shell(
      <SavedAdLibraryCard
        ad={adRow}
        brand={{
          name: item.competitor_name,
          domain: item.competitor_domain ?? "",
          logoUrl: item.competitor_logo_url ?? undefined,
        }}
        gridCreativeSizing="natural"
        onOpen={
          item.source_scraped_ad_id && onOpenAd
            ? () => onOpenAd(item.source_scraped_ad_id!)
            : undefined
        }
        onUnsave={onUnsave}
      />,
    );
  }

  if (item.item_type === "email") {
    return shell(
      <button
        type="button"
        className="w-full rounded-xl border border-slate-100 bg-white p-3 text-left"
        onClick={() => {
          if (onOpenEmail) {
            onOpenEmail(
              item.competitor_id,
              item.source_competitor_email_id ?? item.id,
              item.id,
            );
          }
        }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700">
            <Mail className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-slate-900">
              {item.subject?.trim() || "(no subject)"}
            </p>
            <p className="truncate text-[12px] text-slate-500">
              {item.from_name || item.from_email || "Unknown sender"}
            </p>
            {item.ai_summary ? (
              <p className="mt-1 line-clamp-3 text-[12px] text-slate-600">{item.ai_summary}</p>
            ) : item.preview_text ? (
              <p className="mt-1 line-clamp-3 text-[12px] text-slate-600">{item.preview_text}</p>
            ) : null}
            {item.email_type ? (
              <span
                className={cn(
                  "mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                  emailTypeBadgeClass(item.email_type),
                )}
              >
                {formatEmailType(item.email_type)}
              </span>
            ) : null}
          </div>
        </div>
      </button>,
    );
  }

  if (item.item_type === "organic") {
    const preview = item.media_urls[0] ?? null;
    return shell(
      <div
        className={cn(item.post_url && "cursor-pointer")}
        onClick={() => {
          if (item.post_url) window.open(item.post_url, "_blank", "noopener,noreferrer");
        }}
        role={item.post_url ? "button" : undefined}
        tabIndex={item.post_url ? 0 : undefined}
      >
        <div className="overflow-hidden rounded-xl bg-slate-100">
          {preview ? (
            <img
              src={preview}
              alt=""
              loading="lazy"
              className="block w-full h-auto object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="px-4 py-8">
              <p className="line-clamp-8 text-[12px] leading-relaxed text-slate-600">
                {item.content?.slice(0, 400) || "Saved organic post"}
              </p>
            </div>
          )}
        </div>
        <div className="mt-2 px-1">
          <p className="line-clamp-2 text-[12px] font-medium text-slate-800">
            {item.content?.slice(0, 120) || item.author_display_name || "Saved post"}
          </p>
          <div className="mt-1.5 flex items-center gap-2.5 text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-0.5">
              <Heart className="h-3 w-3" />
              {formatCount(item.likes)}
            </span>
            <span className="inline-flex items-center gap-0.5">
              <MessageCircle className="h-3 w-3" />
              {formatCount(item.comments)}
            </span>
            {item.views > 0 ? (
              <span className="inline-flex items-center gap-0.5">
                <Eye className="h-3 w-3" />
                {formatCount(item.views)}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-0.5 capitalize">
              <Share2 className="h-3 w-3" />
              {item.platform}
            </span>
          </div>
        </div>
      </div>,
    );
  }

  const preview = item.hero_screenshot_url || item.screenshot_url;
  const displayUrl = item.url.replace(/^https?:\/\//i, "").replace(/\/$/, "");

  return shell(
    <div>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-xl bg-slate-100"
      >
        {preview ? (
          <img src={preview} alt="" loading="lazy" className="block w-full h-auto object-cover object-top" />
        ) : (
          <div className="flex aspect-[16/10] w-full items-center justify-center">
            <Globe className="h-10 w-10 text-slate-300" />
          </div>
        )}
      </a>
      <div className="mt-2 px-1">
        <p className="truncate text-[13px] font-semibold text-slate-900">{item.label || displayUrl}</p>
        <p className="truncate text-[11px] text-slate-500">{displayUrl}</p>
        {item.page_type ? (
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">{item.page_type}</p>
        ) : null}
      </div>
    </div>,
  );
}
