/** Subscription tier: free trial + paid Starter/Pro/Agency + admin. */
export type PlanTier = "free_trial" | "starter" | "pro" | "agency" | "admin";

export type DevPlanOverride = PlanTier;

export type PlanLimits = {
  maxWatchedCompetitors: number;
  /** Max own-brand workspaces (`brands` rows) per account. Shared across tiers except free trial (1). */
  maxOwnBrandWorkspaces: number;
  /** Monthly ads processed via Apify (incremented in monthly_scrape_usage.ads_scraped). */
  maxAdsProcessedPerMonth: number;
  /** Lifetime cap on fresh Apify scrape runs (null = no lifetime cap). */
  maxTotalScrapeOperations: number | null;
  maxSwapsPerMonth: number;
  csvExportsPerMonth: number;
  csvMaxAdsPerExport: number;
  /** Workspace-wide manual refresh cap per UTC month (Pro). */
  manualRefreshPerMonth: number;
  manualRefreshMinIntervalMs: number;
  /** Ads per platform on manual force-rescrape (0 = not available). */
  manualRefreshAdsPerPlatform: number;
  canDisableSmartPrioritization: boolean;
  allowCsvExport: boolean;
  allowManualRefresh: boolean;
  allowAutoRefresh: boolean;
  /** Pro/admin: custom alert rules, thresholds, and per-competitor scope. */
  allowAlertRules: boolean;
  /** Pro/admin: alert email notifications between scrapes. */
  allowAlertEmail: boolean;
  /** null = unlimited */
  maxAiStrategyOverviews: number | null;
  /** Ad preview AI analyses per UTC month (null = unlimited). */
  maxAdPreviewAnalysesPerMonth: number | null;
  /** Email marketing intelligence (inbound tracking + AI). */
  allowEmailMarketing: boolean;
  /** Active email trackers per account (null = unlimited). */
  maxEmailTrackers: number | null;
  /** Competitor email AI analyses per UTC month (null = unlimited). */
  maxEmailAiAnalysesPerMonth: number | null;
  initialScrapeAdsPerPlatform: number | null;
};

/** Three competitors, one initial discovery scrape, then upgrade. */
const FREE_TRIAL_LIMITS: PlanLimits = {
  maxWatchedCompetitors: 3,
  maxOwnBrandWorkspaces: 1,
  maxAdsProcessedPerMonth: 15_000,
  maxTotalScrapeOperations: 1,
  maxSwapsPerMonth: 0,
  csvExportsPerMonth: 0,
  csvMaxAdsPerExport: 0,
  manualRefreshPerMonth: 0,
  manualRefreshMinIntervalMs: 86_400_000,
  manualRefreshAdsPerPlatform: 0,
  canDisableSmartPrioritization: false,
  allowCsvExport: false,
  allowManualRefresh: false,
  allowAutoRefresh: false,
  allowAlertRules: false,
  allowAlertEmail: false,
  maxAiStrategyOverviews: 1,
  maxAdPreviewAnalysesPerMonth: 0,
  allowEmailMarketing: true,
  maxEmailTrackers: 1,
  maxEmailAiAnalysesPerMonth: 5,
  initialScrapeAdsPerPlatform: 200,
};

const STARTER_LIMITS: PlanLimits = {
  maxWatchedCompetitors: 5,
  maxOwnBrandWorkspaces: 1,
  maxAdsProcessedPerMonth: 50_000,
  maxTotalScrapeOperations: null,
  maxSwapsPerMonth: 15,
  csvExportsPerMonth: 0,
  csvMaxAdsPerExport: 0,
  manualRefreshPerMonth: 0,
  manualRefreshMinIntervalMs: 86_400_000,
  manualRefreshAdsPerPlatform: 0,
  canDisableSmartPrioritization: false,
  allowCsvExport: false,
  allowManualRefresh: false,
  allowAutoRefresh: true,
  allowAlertRules: false,
  allowAlertEmail: false,
  maxAiStrategyOverviews: null,
  maxAdPreviewAnalysesPerMonth: 10,
  allowEmailMarketing: true,
  maxEmailTrackers: 5,
  maxEmailAiAnalysesPerMonth: 10,
  initialScrapeAdsPerPlatform: null,
};

const PRO_LIMITS: PlanLimits = {
  maxWatchedCompetitors: 15,
  maxOwnBrandWorkspaces: 1,
  maxAdsProcessedPerMonth: 150_000,
  maxTotalScrapeOperations: null,
  maxSwapsPerMonth: 50,
  csvExportsPerMonth: 20,
  csvMaxAdsPerExport: 10_000,
  manualRefreshPerMonth: 5,
  manualRefreshMinIntervalMs: 86_400_000,
  manualRefreshAdsPerPlatform: 300,
  canDisableSmartPrioritization: true,
  allowCsvExport: true,
  allowManualRefresh: true,
  allowAutoRefresh: true,
  allowAlertRules: true,
  allowAlertEmail: true,
  maxAiStrategyOverviews: null,
  maxAdPreviewAnalysesPerMonth: 20,
  allowEmailMarketing: true,
  maxEmailTrackers: 15,
  maxEmailAiAnalysesPerMonth: 20,
  initialScrapeAdsPerPlatform: null,
};

/** Pro limits × 5 — multi-brand workspaces for agencies (up to 5 client brands). */
const AGENCY_LIMITS: PlanLimits = {
  maxWatchedCompetitors: 75,
  maxOwnBrandWorkspaces: 5,
  maxAdsProcessedPerMonth: 750_000,
  maxTotalScrapeOperations: null,
  maxSwapsPerMonth: 250,
  csvExportsPerMonth: 100,
  csvMaxAdsPerExport: 10_000,
  manualRefreshPerMonth: 25,
  manualRefreshMinIntervalMs: 86_400_000,
  manualRefreshAdsPerPlatform: 300,
  canDisableSmartPrioritization: true,
  allowCsvExport: true,
  allowManualRefresh: true,
  allowAutoRefresh: true,
  allowAlertRules: true,
  allowAlertEmail: true,
  maxAiStrategyOverviews: null,
  maxAdPreviewAnalysesPerMonth: 100,
  allowEmailMarketing: true,
  maxEmailTrackers: 75,
  maxEmailAiAnalysesPerMonth: 100,
  initialScrapeAdsPerPlatform: null,
};

const ADMIN_LIMITS: PlanLimits = {
  maxWatchedCompetitors: 1_000_000,
  maxOwnBrandWorkspaces: 5,
  maxAdsProcessedPerMonth: 1_000_000,
  maxTotalScrapeOperations: null,
  maxSwapsPerMonth: 1_000_000,
  csvExportsPerMonth: 1_000_000,
  csvMaxAdsPerExport: 1_000_000,
  manualRefreshPerMonth: 1_000_000,
  manualRefreshMinIntervalMs: 0,
  manualRefreshAdsPerPlatform: 300,
  canDisableSmartPrioritization: true,
  allowCsvExport: true,
  allowManualRefresh: true,
  allowAutoRefresh: true,
  allowAlertRules: true,
  allowAlertEmail: true,
  maxAiStrategyOverviews: null,
  maxAdPreviewAnalysesPerMonth: null,
  allowEmailMarketing: true,
  maxEmailTrackers: null,
  maxEmailAiAnalysesPerMonth: null,
  initialScrapeAdsPerPlatform: null,
};

export const PLAN_LIMITS_BY_TIER: Record<PlanTier, PlanLimits> = {
  free_trial: FREE_TRIAL_LIMITS,
  starter: STARTER_LIMITS,
  pro: PRO_LIMITS,
  agency: AGENCY_LIMITS,
  admin: ADMIN_LIMITS,
};

export const PLAN_DISPLAY_NAMES: Record<PlanTier, string> = {
  free_trial: "Free trial",
  starter: "Starter",
  pro: "Pro",
  agency: "Agency",
  admin: "Admin",
};

export function limitsForTier(tier: PlanTier): PlanLimits {
  return PLAN_LIMITS_BY_TIER[tier];
}

export function isPaidTier(tier: PlanTier): boolean {
  return tier === "starter" || tier === "pro" || tier === "agency";
}

export function tierHasProductAccess(tier: PlanTier): boolean {
  return (
    tier === "free_trial" ||
    tier === "starter" ||
    tier === "pro" ||
    tier === "agency" ||
    tier === "admin"
  );
}

/** Only Agency (and admin) may create more than one own-brand workspace. */
export function tierAllowsMultipleBrandWorkspaces(tier: PlanTier): boolean {
  return tier === "agency" || tier === "admin";
}

/** Map legacy dev overrides and DB values to current tiers. */
export function normalizePlanTier(value: string | null | undefined): PlanTier | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  if (v === "free" || v === "trial") return "free_trial";
  if (v === "free_trial" || v === "starter" || v === "pro" || v === "agency" || v === "admin") return v;
  return null;
}

/** @deprecated Use limitsForTier */
export const BILLING_LIMITS = {
  maxWatchedCompetitors: STARTER_LIMITS.maxWatchedCompetitors,
  maxAdLibraryScrapeRunsPerMonth: STARTER_LIMITS.maxAdsProcessedPerMonth,
} as const;

export const ADMIN_BILLING_LIMITS = {
  maxWatchedCompetitors: ADMIN_LIMITS.maxWatchedCompetitors,
  maxAdLibraryScrapeRunsPerMonth: ADMIN_LIMITS.maxAdsProcessedPerMonth,
} as const;
