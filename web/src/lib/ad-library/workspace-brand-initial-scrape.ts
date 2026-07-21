import type { ChannelId } from "@/components/channel-picker-modal";
import type { PlatformIdentifier } from "@/components/manual-identifiers-form";
import { buildManualRefreshScrapeParams } from "@/lib/ad-library/manual-refresh-date-window";
import {
  applyInitialScrapeLimits,
  type ScrapeRequestFields,
} from "@/lib/ad-library/scrape-request-fields";
import { parseAdsProfileSetup, scrapeHintsToPlatformIds } from "@/lib/onboarding/workspace-ads-setup";

export type WorkspaceBrandScrapeContext = {
  brand: { name: string; domain: string; logoUrl?: string };
  channels: ChannelId[];
  ids: Record<string, string>;
  adMarketCountryCodes: string[];
};

type BrandRow = {
  id?: string | null;
  name?: string | null;
  domain?: string | null;
  logo_url?: string | null;
  ads_profile_setup?: unknown;
  is_primary?: boolean | null;
};

function normalizeWorkspaceDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0] ?? "";
}

/** Load onboarding workspace brand + platform identifiers for the initial discovery scrape. */
export async function loadWorkspaceBrandScrapeContext(
  brandId?: string | null,
): Promise<WorkspaceBrandScrapeContext | null> {
  const res = await fetch("/api/account/brands", { credentials: "include", cache: "no-store" });
  if (!res.ok) return null;

  const json = (await res.json()) as { ok?: boolean; brands?: BrandRow[] };
  const rows = json.brands ?? [];
  const requested = brandId?.trim();
  const row =
    requested && requested !== "_workspace"
      ? rows.find((b) => b.id === requested)
      : rows.find((b) => b.is_primary) ?? rows[0];
  if (!row) return null;

  const setup = parseAdsProfileSetup(row.ads_profile_setup ?? null);
  if (!setup?.channels.length) return null;

  const domainFromRow = typeof row.domain === "string" ? normalizeWorkspaceDomain(row.domain) : "";
  const domainFromSetup = setup.scrape.websiteUrl.trim()
    ? normalizeWorkspaceDomain(setup.scrape.websiteUrl)
    : "";
  const domain = domainFromRow || domainFromSetup;
  if (!domain) return null;

  const ids = scrapeHintsToPlatformIds({
    scrape: setup.scrape,
    workspaceDomain: domain,
    channels: setup.channels,
  });
  if (Object.keys(ids).length === 0) return null;

  const name =
    (typeof row.name === "string" && row.name.trim()) ||
    domain.replace(/^www\./i, "").split(".")[0] ||
    domain;

  return {
    brand: {
      name,
      domain,
      logoUrl: typeof row.logo_url === "string" ? row.logo_url : undefined,
    },
    channels: setup.channels,
    ids,
    adMarketCountryCodes: setup.adMarketCountryCodes,
  };
}

export function platformIdentifierFromScrapeIds(ids: Record<string, string>): PlatformIdentifier {
  return {
    meta: ids.meta,
    metaPageUrl: ids.metaPageUrl,
    google: ids.google,
    tiktok: ids.tiktok,
    linkedin: ids.linkedin,
    pinterest: ids.pinterest,
    pinterestAdvertiserName: ids.pinterestAdvertiserName,
    snapchat: ids.snapchat,
  };
}

export const WORKSPACE_BRAND_SCRAPE_SEARCH_PARAM = "workspaceBrandScrape";

export function buildWorkspaceBrandScrapeHref(brandId?: string | null): string {
  const params = new URLSearchParams({ [WORKSPACE_BRAND_SCRAPE_SEARCH_PARAM]: "1" });
  if (brandId?.trim() && brandId !== "_workspace") params.set("brandId", brandId.trim());
  return `/dashboard/searching?${params.toString()}`;
}

/** Post-onboarding workspace scrape: max 500 per platform, active-only date windows (not competitor discovery). */
export function buildWorkspaceBrandInitialScrapeFields(base: ScrapeRequestFields): ScrapeRequestFields {
  const limits = applyInitialScrapeLimits(base);
  const active = buildManualRefreshScrapeParams();
  return {
    ...limits,
    metaStartDate: active.metaStartDate,
    metaEndDate: active.metaEndDate,
    linkedinDateRange: active.linkedinDateRange,
    tiktokStartDate: active.tiktokStartDate,
    tiktokEndDate: active.tiktokEndDate,
    pinterestStartDate: active.pinterestStartDate,
    pinterestEndDate: active.pinterestEndDate,
    snapchatStartDate: active.snapchatStartDate,
    snapchatEndDate: active.snapchatEndDate,
    microsoftStartDate: active.microsoftStartDate,
    microsoftEndDate: active.microsoftEndDate,
  };
}
