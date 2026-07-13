import type { SupabaseClient } from "@supabase/supabase-js";

import { getBillingEntitlement } from "@/lib/billing/entitlements";
import {
  loadActiveEmailTrackerCount,
  loadEmailAiAnalysisUsage,
  loadLifetimeScrapeOperations,
  loadMonthlyUsageSnapshot,
  loadWorkspaceManualRefreshUsage,
  utcYearMonth,
} from "@/lib/billing/usage-quotas";
import { parseOrganicSocials } from "@/lib/organic-content/socials";
import { ORGANIC_PLATFORMS } from "@/lib/organic-content/types";
import type { Database } from "@/lib/supabase/types";

export type AdminCompetitorPlatformRow = {
  platform: string;
  classification: string;
  active_ad_count: number;
  last_scrape_at: string | null;
};

export type AdminCompetitorLandingPageRow = {
  id: string;
  url: string;
  label: string;
  is_active: boolean;
  auto_detected_from: string | null;
  snapshotCount: number;
  last_screenshotted_at: string | null;
  latestScreenshotUrl: string | null;
};

export type AdminCompetitorUsageRow = {
  id: string;
  name: string;
  brand_domain: string | null;
  created_at: string;
  last_scraped_at: string | null;
  organic_last_scraped_at: string | null;
  organicPlatforms: string[];
  platforms: AdminCompetitorPlatformRow[];
  adsByPlatform: Record<string, number>;
  totalActiveAds: number;
  organicPostCount: number;
  landingPages: AdminCompetitorLandingPageRow[];
};

export type AdminLandingPageRow = {
  id: string;
  competitor_id: string;
  competitor_name: string;
  url: string;
  label: string;
  is_active: boolean;
  auto_detected_from: string | null;
  last_screenshotted_at: string | null;
  snapshotCount: number;
  latestScreenshotUrl: string | null;
  latestTakenAt: string | null;
};

export type AdminUserUsageDetail = {
  month: string;
  usage: {
    adsScraped: number;
    scrapeOperations: number;
    lifetimeScrapeOperations: number;
    swapCount: number;
    csvExportCount: number;
    csvAdsExported: number;
    adPreviewAnalyses: number;
    emailAiAnalyses: number;
    manualRefreshes: number;
  };
  limits: {
    maxAdsProcessedPerMonth: number | null;
    maxAdPreviewAnalysesPerMonth: number | null;
    maxEmailAiAnalysesPerMonth: number | null;
    maxEmailTrackers: number | null;
    maxWatchedCompetitors: number | null;
  };
  inventory: {
    activeScrapedAds: number;
    organicPosts: number;
    strategyOverviews: number;
    adLibraryRefreshes: number;
    adPreviewCacheCount: number;
    organicPreviewCacheCount: number;
    organicInsightsCount: number;
  };
  competitors: AdminCompetitorUsageRow[];
  landingPages: AdminLandingPageRow[];
  email: {
    activeTrackers: number;
    trackerLimit: number | null;
    trackers: { id: string; competitor_id: string; tracking_address: string; is_active: boolean }[];
    inboundCount: number;
    analyzedCount: number;
    savedCount: number;
    lastReceivedAt: string | null;
    recentInbound: { subject: string | null; received_at: string; competitor_id: string }[];
  };
  intelligence: {
    autopilot: {
      configured: boolean;
      enabled: boolean;
      watch_enabled: boolean;
      report_enabled: boolean;
      brief_enabled: boolean;
      slackConnected: boolean;
      recentOutputs: {
        output_type: string;
        status: string;
        sent_at: string | null;
        channels_sent: unknown;
      }[];
    };
    agent: {
      configured: boolean;
      enabled: boolean;
      weekly_brief_enabled: boolean;
      channels: unknown;
      recentMessages: {
        subject: string | null;
        status: string;
        sent_at: string;
        channels_delivered: string[];
      }[];
    };
    mcp: {
      activeKeys: number;
      keys: { label: string; key_hint: string; last_used_at: string | null; created_at: string }[];
    };
  };
};

type SnapshotAgg = {
  count: number;
  latestUrl: string | null;
  latestTakenAt: string | null;
};

export function aggregateAdsByCompetitorPlatform(
  rows: { competitor_id: string; platform: string }[],
): Map<string, Record<string, number>> {
  const out = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const cid = row.competitor_id;
    const platform = row.platform;
    if (!cid || !platform) continue;
    const existing = out.get(cid) ?? {};
    existing[platform] = (existing[platform] ?? 0) + 1;
    out.set(cid, existing);
  }
  return out;
}

export function aggregateOrganicPostCounts(
  rows: { competitor_id: string }[],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of rows) {
    if (!row.competitor_id) continue;
    out.set(row.competitor_id, (out.get(row.competitor_id) ?? 0) + 1);
  }
  return out;
}

export function aggregateSnapshotStats(
  rows: { landing_page_id: string; screenshot_url: string; taken_at: string }[],
): Map<string, SnapshotAgg> {
  const out = new Map<string, SnapshotAgg>();
  for (const row of rows) {
    const id = row.landing_page_id;
    if (!id) continue;
    const prev = out.get(id) ?? { count: 0, latestUrl: null, latestTakenAt: null };
    prev.count += 1;
    if (!prev.latestTakenAt || row.taken_at > prev.latestTakenAt) {
      prev.latestTakenAt = row.taken_at;
      prev.latestUrl = row.screenshot_url;
    }
    out.set(id, prev);
  }
  return out;
}

export function buildCompetitorLandingPages(
  pages: {
    id: string;
    url: string;
    label: string;
    is_active: boolean;
    auto_detected_from: string | null;
    last_screenshotted_at: string | null;
  }[],
  snapshotAgg: Map<string, SnapshotAgg>,
): AdminCompetitorLandingPageRow[] {
  return pages.map((page) => {
    const snap = snapshotAgg.get(page.id);
    return {
      id: page.id,
      url: page.url,
      label: page.label,
      is_active: page.is_active,
      auto_detected_from: page.auto_detected_from,
      snapshotCount: snap?.count ?? 0,
      last_screenshotted_at: page.last_screenshotted_at,
      latestScreenshotUrl: snap?.latestUrl ?? null,
    };
  });
}

export async function loadAdminUserUsageDetail(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<AdminUserUsageDetail> {
  const yearMonth = utcYearMonth();

  const [
    billing,
    monthlyUsage,
    lifetimeScrapeOperations,
    emailAiAnalyses,
    manualRefresh,
    competitorsRes,
    platformTrackingRes,
    scrapedAdsRes,
    organicPostsRes,
    landingPagesRes,
    snapshotsRes,
    trackersRes,
    inboundEmailsRes,
    savedEmailsRes,
    strategyRes,
    adsCacheRes,
    adPreviewCacheRes,
    organicPreviewCacheRes,
    organicInsightsRes,
    autopilotSettingsRes,
    autopilotOutputsRes,
    agentSettingsRes,
    agentMessagesRes,
    mcpKeysRes,
    activeTrackerCount,
  ] = await Promise.all([
    getBillingEntitlement(admin, userId),
    loadMonthlyUsageSnapshot(admin, userId, yearMonth),
    loadLifetimeScrapeOperations(admin, userId),
    loadEmailAiAnalysisUsage(admin, userId, yearMonth),
    loadWorkspaceManualRefreshUsage(admin, userId, yearMonth),
    admin
      .from("saved_competitors")
      .select(
        "id, name, brand_domain, created_at, last_scraped_at, organic_last_scraped_at, socials",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    admin
      .from("competitor_platform_tracking")
      .select("competitor_id, platform, classification, active_ad_count, last_scrape_at")
      .eq("user_id", userId),
    admin
      .from("scraped_ads")
      .select("competitor_id, platform")
      .eq("user_id", userId)
      .eq("is_active", true),
    admin.from("organic_posts").select("competitor_id").eq("user_id", userId),
    admin
      .from("landing_pages")
      .select(
        "id, competitor_id, url, label, is_active, auto_detected_from, last_screenshotted_at",
      )
      .eq("user_id", userId)
      .order("added_at", { ascending: false }),
    admin
      .from("landing_page_snapshots")
      .select("landing_page_id, screenshot_url, taken_at")
      .eq("user_id", userId)
      .order("taken_at", { ascending: false }),
    admin
      .from("competitor_email_trackers")
      .select("id, competitor_id, tracking_address, is_active")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("competitor_emails")
      .select("subject, received_at, competitor_id, ai_processed_at")
      .eq("user_id", userId)
      .order("received_at", { ascending: false }),
    admin.from("saved_emails").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("strategy_overview_cache").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("ads_cache").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin
      .from("ad_preview_analysis_cache")
      .select("ad_id", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("organic_post_preview_analysis_cache")
      .select("organic_post_id", { count: "exact", head: true })
      .eq("user_id", userId),
    admin.from("organic_insights").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("autopilot_settings").select("*").eq("user_id", userId).maybeSingle(),
    admin
      .from("autopilot_outputs")
      .select("output_type, status, sent_at, channels_sent")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    admin.from("agent_settings").select("*").eq("user_id", userId).maybeSingle(),
    admin
      .from("agent_messages")
      .select("subject, status, sent_at, channels_delivered")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false })
      .limit(10),
    admin
      .from("mcp_api_keys")
      .select("label, key_hint, last_used_at, created_at, revoked_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    loadActiveEmailTrackerCount(admin, userId),
  ]);

  const competitors = competitorsRes.data ?? [];
  const competitorNameById = new Map(competitors.map((c) => [c.id, c.name ?? c.brand_domain ?? "—"]));

  const platformsByCompetitor = new Map<string, AdminCompetitorPlatformRow[]>();
  for (const row of platformTrackingRes.data ?? []) {
    const list = platformsByCompetitor.get(row.competitor_id) ?? [];
    list.push({
      platform: row.platform,
      classification: row.classification,
      active_ad_count: row.active_ad_count ?? 0,
      last_scrape_at: row.last_scrape_at,
    });
    platformsByCompetitor.set(row.competitor_id, list);
  }

  const adsByCompetitor = aggregateAdsByCompetitorPlatform(scrapedAdsRes.data ?? []);
  const organicByCompetitor = aggregateOrganicPostCounts(organicPostsRes.data ?? []);
  const snapshotAgg = aggregateSnapshotStats(snapshotsRes.data ?? []);

  const landingPagesByCompetitor = new Map<string, typeof landingPagesRes.data>();
  for (const page of landingPagesRes.data ?? []) {
    const list = landingPagesByCompetitor.get(page.competitor_id) ?? [];
    list.push(page);
    landingPagesByCompetitor.set(page.competitor_id, list);
  }

  const competitorRows: AdminCompetitorUsageRow[] = competitors.map((c) => {
    const socials = parseOrganicSocials(c.socials);
    const organicPlatforms = ORGANIC_PLATFORMS.filter((p) => Boolean(socials[p]?.trim()));
    const adsByPlatform = adsByCompetitor.get(c.id) ?? {};
    const totalActiveAds = Object.values(adsByPlatform).reduce((sum, n) => sum + n, 0);
    const pages = landingPagesByCompetitor.get(c.id) ?? [];

    return {
      id: c.id,
      name: c.name,
      brand_domain: c.brand_domain,
      created_at: c.created_at,
      last_scraped_at: c.last_scraped_at,
      organic_last_scraped_at: c.organic_last_scraped_at,
      organicPlatforms,
      platforms: platformsByCompetitor.get(c.id) ?? [],
      adsByPlatform,
      totalActiveAds,
      organicPostCount: organicByCompetitor.get(c.id) ?? 0,
      landingPages: buildCompetitorLandingPages(pages, snapshotAgg),
    };
  });

  const landingPages: AdminLandingPageRow[] = (landingPagesRes.data ?? []).map((page) => {
    const snap = snapshotAgg.get(page.id);
    return {
      id: page.id,
      competitor_id: page.competitor_id,
      competitor_name: competitorNameById.get(page.competitor_id) ?? "—",
      url: page.url,
      label: page.label,
      is_active: page.is_active,
      auto_detected_from: page.auto_detected_from,
      last_screenshotted_at: page.last_screenshotted_at,
      snapshotCount: snap?.count ?? 0,
      latestScreenshotUrl: snap?.latestUrl ?? null,
      latestTakenAt: snap?.latestTakenAt ?? null,
    };
  });

  const inboundEmails = inboundEmailsRes.data ?? [];
  const analyzedCount = inboundEmails.filter((e) => Boolean(e.ai_processed_at)).length;

  const autopilotSettings = autopilotSettingsRes.data;
  const agentSettings = agentSettingsRes.data;
  const mcpKeys = mcpKeysRes.data ?? [];

  return {
    month: yearMonth,
    usage: {
      adsScraped: monthlyUsage.adsScraped,
      scrapeOperations: monthlyUsage.scrapeOperations,
      lifetimeScrapeOperations,
      swapCount: monthlyUsage.swapCount,
      csvExportCount: monthlyUsage.csvExportCount,
      csvAdsExported: monthlyUsage.csvAdsExported,
      adPreviewAnalyses: monthlyUsage.adPreviewAnalyses,
      emailAiAnalyses,
      manualRefreshes: manualRefresh.workspaceRefreshCount,
    },
    limits: {
      maxAdsProcessedPerMonth: billing.limits.maxAdsProcessedPerMonth,
      maxAdPreviewAnalysesPerMonth: billing.limits.maxAdPreviewAnalysesPerMonth,
      maxEmailAiAnalysesPerMonth: billing.limits.maxEmailAiAnalysesPerMonth,
      maxEmailTrackers: billing.limits.maxEmailTrackers,
      maxWatchedCompetitors: billing.limits.maxWatchedCompetitors,
    },
    inventory: {
      activeScrapedAds: scrapedAdsRes.data?.length ?? 0,
      organicPosts: organicPostsRes.data?.length ?? 0,
      strategyOverviews: strategyRes.count ?? 0,
      adLibraryRefreshes: adsCacheRes.count ?? 0,
      adPreviewCacheCount: adPreviewCacheRes.count ?? 0,
      organicPreviewCacheCount: organicPreviewCacheRes.count ?? 0,
      organicInsightsCount: organicInsightsRes.count ?? 0,
    },
    competitors: competitorRows,
    landingPages,
    email: {
      activeTrackers: activeTrackerCount,
      trackerLimit: billing.limits.maxEmailTrackers,
      trackers: trackersRes.data ?? [],
      inboundCount: inboundEmails.length,
      analyzedCount,
      savedCount: savedEmailsRes.count ?? 0,
      lastReceivedAt: inboundEmails[0]?.received_at ?? null,
      recentInbound: inboundEmails.slice(0, 5).map((e) => ({
        subject: e.subject,
        received_at: e.received_at,
        competitor_id: e.competitor_id,
      })),
    },
    intelligence: {
      autopilot: {
        configured: Boolean(autopilotSettings),
        enabled: autopilotSettings?.enabled ?? false,
        watch_enabled: autopilotSettings?.watch_enabled ?? false,
        report_enabled: autopilotSettings?.report_enabled ?? false,
        brief_enabled: autopilotSettings?.brief_enabled ?? false,
        slackConnected: Boolean(
          autopilotSettings?.slack_webhook_url?.trim() ||
            (autopilotSettings?.slack_connection &&
              typeof autopilotSettings.slack_connection === "object"),
        ),
        recentOutputs: (autopilotOutputsRes.data ?? []).map((o) => ({
          output_type: o.output_type,
          status: o.status,
          sent_at: o.sent_at,
          channels_sent: o.channels_sent,
        })),
      },
      agent: {
        configured: Boolean(agentSettings),
        enabled: agentSettings?.enabled ?? false,
        weekly_brief_enabled: agentSettings?.weekly_brief_enabled ?? false,
        channels: agentSettings?.channels ?? null,
        recentMessages: (agentMessagesRes.data ?? []).map((m) => ({
          subject: m.subject,
          status: m.status,
          sent_at: m.sent_at,
          channels_delivered: m.channels_delivered ?? [],
        })),
      },
      mcp: {
        activeKeys: mcpKeys.length,
        keys: mcpKeys.map((k) => ({
          label: k.label,
          key_hint: k.key_hint,
          last_used_at: k.last_used_at,
          created_at: k.created_at,
        })),
      },
    },
  };
}
