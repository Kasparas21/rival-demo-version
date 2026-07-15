"use client";

import { ExternalLink } from "lucide-react";
import { AdSaveRow } from "@/components/ads-library/ad-save-row";
import { AdCardTopRightLinkStack } from "@/components/ads-library/creative-test-winner-trophy";
import { AdCreativeVideoOrImage } from "@/components/ads-library/ad-creative-video-or-image";
import { ExpandableAdText } from "@/components/ads-library/expandable-ad-text";
import { UnverifiedSourceBadge } from "@/components/ads-library/unverified-source-overlay";
import { CompetitorLogo } from "@/components/shared/competitor-logo";
import type { LinkedInAdCard } from "@/lib/ad-library/normalize";

/** Public LinkedIn Ad Library detail URL for this card (stable id or parsed from ad URL). */
function linkedInAdLibraryDetailHref(ad: LinkedInAdCard): string {
  const raw = ad.adUrl?.trim() || "";
  if (/linkedin\.com\/ad-library\/detail/i.test(raw)) {
    const idMatch = /ad-library\/detail\/([^/?#]+)/i.exec(raw);
    if (idMatch?.[1]) {
      return `https://www.linkedin.com/ad-library/detail/${encodeURIComponent(idMatch[1])}`;
    }
  }
  const id = ad.id?.trim() || "";
  if (id && !/^li-\d+$/i.test(id)) {
    return `https://www.linkedin.com/ad-library/detail/${encodeURIComponent(id)}`;
  }
  const fromAdUrl = /ad-library\/detail\/([^/?#]+)/i.exec(raw);
  if (fromAdUrl?.[1]) {
    return `https://www.linkedin.com/ad-library/detail/${encodeURIComponent(fromAdUrl[1])}`;
  }
  return "https://www.linkedin.com/ad-library/home";
}

/** Sponsored landing URL when `adUrl` is not already an Ad Library page. */
function linkedInNonLibraryDestinationHref(ad: LinkedInAdCard): string | null {
  const raw = ad.adUrl?.trim() || "";
  if (!raw || /linkedin\.com\/ad-library/i.test(raw)) return null;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

/** Legacy cards: infer `https://…` from truncated `url` display (no protocol). */
function linkedInGuessLandingFromDisplayUrl(display: string | null | undefined): string | null {
  const t = display?.trim() ?? "";
  if (!t || t === "—" || /linkedin\.com/i.test(t)) return null;
  if (!t.includes(".")) return null;
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/+/, "")}`;
  try {
    const u = new URL(withProto);
    if (/linkedin\.com$/i.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** URL for the sponsor-site button — never Ad Library. */
function linkedInSponsoredSiteHref(ad: LinkedInAdCard): string | null {
  const fromCard = ad.landingPageUrl?.trim();
  if (fromCard && /^https?:\/\//i.test(fromCard)) return fromCard;

  const fromAdUrl = linkedInNonLibraryDestinationHref(ad);
  if (fromAdUrl) return fromAdUrl;

  return linkedInGuessLandingFromDisplayUrl(ad.url ?? "");
}

/** Short label: host + path, no query/hash (drops UTM noise). */
function shortenLinkedInLandingLinkLabel(fullHref: string, maxChars = 52): string {
  try {
    const u = new URL(fullHref.startsWith("http") ? fullHref : `https://${fullHref}`);
    u.search = "";
    u.hash = "";
    const host = u.hostname.replace(/^www\./i, "");
    const path = u.pathname.replace(/\/$/, "") || "";
    let out = path && path !== "/" ? `${host}${path}` : host;
    if (out.length > maxChars) return `${out.slice(0, Math.max(1, maxChars - 1))}…`;
    return out;
  } catch {
    const stripped = fullHref.replace(/^https?:\/\//, "").split(/[?#]/)[0]?.trim() ?? "";
    if (!stripped) return fullHref.slice(0, maxChars);
    return stripped.length > maxChars ? `${stripped.slice(0, maxChars - 1)}…` : stripped;
  }
}

function linkedInFeedSiteLabelFromLanding(
  sponsoredHref: string | null,
  brandDomain: string
): { site: string; detail?: string } {
  const fallbackHost = (brandDomain || "linkedin.com").replace(/^www\./i, "").split("/")[0] || "linkedin.com";
  if (!sponsoredHref) {
    return { site: fallbackHost };
  }
  try {
    const u = new URL(sponsoredHref);
    const site = u.hostname.replace(/^www\./i, "");
    const short = shortenLinkedInLandingLinkLabel(sponsoredHref);
    const detail = short.toLowerCase() !== site.toLowerCase() ? short : undefined;
    return { site, detail };
  } catch {
    return { site: fallbackHost };
  }
}

/** LinkedIn cards use `desc` up top and `headline` under the creative — often the same primary text. */
function linkedInHeadlineRedundantWithDescription(
  headline: string | undefined,
  desc: string | undefined
): boolean {
  const h = (headline ?? "").replace(/\s+/g, " ").trim();
  const rawBody = desc ?? "";
  if (!h || !rawBody.trim()) return false;
  const bodyCollapsed = rawBody.replace(/\s+/g, " ").trim();
  if (h === bodyCollapsed) return true;
  const firstLine =
    rawBody
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(Boolean) ?? "";
  return h === firstLine.replace(/\s+/g, " ").trim();
}

function linkedInDisplayDescription(desc: string | undefined): string {
  const raw = desc?.trim() ?? "";
  if (!raw) return "";

  const paragraphs = raw
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (paragraphs.length < 2) return raw;

  const first = paragraphs[0];
  const rest = paragraphs.slice(1).join("\n\n");
  const restCollapsed = rest.replace(/\s+/g, " ").trim();

  // LinkedIn sometimes emits a truncated teaser, then repeats the full ad copy.
  if (restCollapsed.startsWith(first)) {
    return rest;
  }

  return raw;
}

export function LinkedInFeedAdCard({
  ad,
  brand,
  onOpenDetail,
  scrapedAdId,
  isSaved,
  onToggleSave,
  saveDisabled,
  isCreativeTestWinner,
}: {
  ad: LinkedInAdCard;
  brand: { name: string; domain: string; logoUrl?: string };
  onOpenDetail?: () => void;
  scrapedAdId?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  saveDisabled?: boolean;
  isCreativeTestWinner?: boolean;
}) {
  const libraryDetailHref = linkedInAdLibraryDetailHref(ad);
  const sponsoredHref = linkedInSponsoredSiteHref(ad);
  const { site: siteLabel, detail: siteDetail } = linkedInFeedSiteLabelFromLanding(sponsoredHref, brand.domain);

  const displayDesc = linkedInDisplayDescription(ad.desc);
  const showHeadlineUnderCreative =
    Boolean(ad.headline?.trim()) &&
    !linkedInHeadlineRedundantWithDescription(ad.headline, displayDesc);

  return (
    <article
      onClick={() => onOpenDetail?.()}
      className={`relative min-w-0 h-full flex flex-col bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 overflow-hidden hover:shadow-[0_8px_32px_rgba(31,38,135,0.07)] hover:border-[#DDF1FD]/60 transition-all duration-200 text-left${
        onOpenDetail ? " cursor-pointer hover:ring-2 hover:ring-slate-200" : ""
      }`}
    >
      <div className="p-4 shrink-0">
        <div className="flex items-start gap-3">
          <CompetitorLogo
            sources={{
              primary: ad.advertiserLogoUrl,
              secondary: brand.logoUrl,
              domain: brand.domain,
            }}
            name={ad.advertiser}
            size="md"
            shape="rounded"
            className="rounded-lg border-[#e5e7eb] bg-[#f3f4f6]"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] text-[#0a66c2]">{ad.advertiser}</p>
            <p className="text-[12px] text-[#6b7280] mt-0.5">
              Promoted
              {ad.ctaLabel?.trim() ? (
                <>
                  {" · "}
                  <span className="font-semibold text-[#374151]">{ad.ctaLabel}</span>
                </>
              ) : null}
            </p>
            {ad.advertiserMismatch ? (
              <div className="mt-2">
                <UnverifiedSourceBadge />
              </div>
            ) : null}
          </div>
          <AdCardTopRightLinkStack
            href={ad.adUrl}
            hrefTitle="Open original ad on LinkedIn"
            isCreativeTestWinner={isCreativeTestWinner}
            onLinkClick={(e) => e.stopPropagation()}
            linkClassName="rounded-md p-1.5 transition-colors hover:bg-[#f3f4f6] hover:text-[#0a66c2] text-[#6b7280]"
          />
        </div>
        {displayDesc ? (
          <div className="mt-3">
            <ExpandableAdText
              text={displayDesc}
              className="text-[14px] text-[#374151] leading-relaxed break-words [overflow-wrap:anywhere] text-pretty whitespace-pre-wrap"
            />
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col min-h-0 border-y border-[#e5e7eb] bg-[#f3f4f6] p-3">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white">
          <AdCreativeVideoOrImage
            img={ad.img ?? ""}
            videoUrl={ad.videoUrl}
            openHref={ad.adUrl}
            onMediaClick={onOpenDetail ? () => onOpenDetail() : undefined}
            className="min-h-0 w-full flex-1"
            minHeightClass="min-h-[200px]"
            fillAvailableHeight
          />
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-3 border-t border-[#e5e7eb] bg-[#f3f4f6] px-4 py-3.5">
        {showHeadlineUnderCreative ? (
          <p className="text-[14px] font-semibold leading-snug text-[#1c1e21] [overflow-wrap:anywhere] text-pretty">
            {ad.headline}
          </p>
        ) : null}
        <div className="flex min-w-0 flex-col rounded-lg border border-[#e5e7eb] bg-white p-3 shadow-sm">
          <p className="truncate text-[12px] font-medium uppercase tracking-wide text-[#65676b]">{siteLabel}</p>
          {siteDetail ? (
            <p className="mt-1.5 text-[13px] leading-snug break-words text-[#65676b] [overflow-wrap:anywhere]">
              {siteDetail}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={sponsoredHref ?? libraryDetailHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-md border px-5 py-2 text-[14px] font-semibold transition-colors ${
              sponsoredHref
                ? "border-[#cce4ff] bg-[#e7f3ff] text-[#0d6efd] hover:bg-[#d8ebfc]"
                : "border-[#e4e6eb] bg-[#f0f2f5] text-[#65676b] hover:bg-[#e7e9ed]"
            }`}
            title={sponsoredHref ?? libraryDetailHref}
          >
            {sponsoredHref ? (ad.ctaLabel?.trim() || "Visit site") : "View on LinkedIn"}
          </a>
          <a
            href={libraryDetailHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="whitespace-nowrap rounded-full border border-[#bfdbfe] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#2563eb] transition-colors hover:bg-[#eff6ff]"
          >
            View in LinkedIn Ad Library
          </a>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <AdSaveRow
            scrapedAdId={scrapedAdId}
            isSaved={Boolean(isSaved)}
            onToggleSave={onToggleSave}
            saveDisabled={saveDisabled}
          />
        </div>
      </div>
    </article>
  );
}

