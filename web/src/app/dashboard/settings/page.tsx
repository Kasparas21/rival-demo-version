"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, BarChart3, CreditCard, LogOut, Trash2, User } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { clearSidebarCompetitorsStorageForSignOut } from "@/lib/sidebar-competitors";
import { RIVAL_PROFILE_UPDATED_EVENT } from "@/lib/account/profile-events";
import { CheckoutNavigationAnchor } from "@/components/analytics/checkout-navigation-link";
import { McpKeysSection } from "@/components/settings/McpKeysSection";
import { SettingsAutopilotSection } from "@/components/settings/SettingsAutopilotSection";
import {
  SettingsFieldHint,
  SettingsFieldLabel,
  SettingsGlassBanner,
  SettingsGlassButton,
  SettingsGlassInsetPanel,
  SettingsGlassModalShell,
  SettingsGlassSection,
  SettingsGlassStatCard,
  settingsGlassInputClass,
  settingsGlassInputReadonlyClass,
} from "@/components/settings/settings-glass-ui";
import {
  buildCheckoutHref,
  buildUpgradeToProHref,
  POLAR_BILLING_PORTAL_HREF,
} from "@/lib/billing/checkout-url";
import {
  hasActivePaidSubscription,
  isBillingActivating,
  shouldUsePolarSubscriptionUi,
  subscriptionStatusBadge,
  subscriptionStatusBadgeClassName,
} from "@/lib/billing/entitlements";
import type { PlanTier } from "@/lib/billing/plan-limits";

type ProfileState = {
  company_name: string;
  company_url: string;
  email: string;
  brand_context: string;
};

type PlanLimitsState = {
  maxWatchedCompetitors: number;
  maxOwnBrandWorkspaces: number;
  maxAdsProcessedPerMonth: number;
  maxSwapsPerMonth: number;
  csvExportsPerMonth: number;
};

type UsageState = {
  scrapedAdsTotal: number;
  scrapedAdsThisMonth: number;
  adLibraryScrapeRunsThisMonth: number;
  competitorsWatched: number;
  aiStrategyOverviews: number;
  adLibraryRefreshes: number;
  swapsThisMonth: number;
  csvExportsThisMonth: number;
  limits: PlanLimitsState;
  remaining: {
    adsProcessedThisMonth: number;
    competitorsWatched: number;
    swapsThisMonth: number;
    csvExportsThisMonth: number;
  };
};

type BillingState = {
  hasAccess: boolean;
  isUnlimited: boolean;
  status: string;
  planTier: PlanTier;
  planName: string;
  polarProductId: string | null;
  hasPolarBillingRecord: boolean;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canUseDevPlanSwitcher: boolean;
  devPlanOverride: string | null;
  limits: PlanLimitsState;
  remaining: {
    adsProcessedThisMonth: number;
    competitorsWatched: number;
    swapsThisMonth: number;
    csvExportsThisMonth: number;
  };
};

const emptyLimits: PlanLimitsState = {
  maxWatchedCompetitors: 5,
  maxOwnBrandWorkspaces: 1,
  maxAdsProcessedPerMonth: 50_000,
  maxSwapsPerMonth: 15,
  csvExportsPerMonth: 0,
};

const emptyUsage: UsageState = {
  scrapedAdsTotal: 0,
  scrapedAdsThisMonth: 0,
  adLibraryScrapeRunsThisMonth: 0,
  competitorsWatched: 0,
  aiStrategyOverviews: 0,
  adLibraryRefreshes: 0,
  swapsThisMonth: 0,
  csvExportsThisMonth: 0,
  limits: emptyLimits,
  remaining: {
    adsProcessedThisMonth: 50_000,
    competitorsWatched: 5,
    swapsThisMonth: 15,
    csvExportsThisMonth: 0,
  },
};

const emptyBilling: BillingState = {
  hasAccess: false,
  isUnlimited: false,
  status: "none",
  planTier: "free_trial",
  planName: "Free trial",
  polarProductId: null,
  hasPolarBillingRecord: false,
  trialEnd: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  canUseDevPlanSwitcher: false,
  devPlanOverride: null,
  limits: emptyLimits,
  remaining: {
    adsProcessedThisMonth: 0,
    competitorsWatched: 0,
    swapsThisMonth: 0,
    csvExportsThisMonth: 0,
  },
};

function mapLimitsFromApi(raw: Record<string, unknown> | undefined): PlanLimitsState {
  if (!raw) return emptyLimits;
  return {
    maxWatchedCompetitors:
      typeof raw.maxWatchedCompetitors === "number"
        ? raw.maxWatchedCompetitors
        : emptyLimits.maxWatchedCompetitors,
    maxOwnBrandWorkspaces:
      typeof raw.maxOwnBrandWorkspaces === "number" && raw.maxOwnBrandWorkspaces >= 1
        ? raw.maxOwnBrandWorkspaces
        : emptyLimits.maxOwnBrandWorkspaces,
    maxAdsProcessedPerMonth:
      typeof raw.maxAdsProcessedPerMonth === "number"
        ? raw.maxAdsProcessedPerMonth
        : typeof raw.maxAdLibraryScrapeRunsPerMonth === "number"
          ? raw.maxAdLibraryScrapeRunsPerMonth
          : emptyLimits.maxAdsProcessedPerMonth,
    maxSwapsPerMonth:
      typeof raw.maxSwapsPerMonth === "number" ? raw.maxSwapsPerMonth : emptyLimits.maxSwapsPerMonth,
    csvExportsPerMonth:
      typeof raw.csvExportsPerMonth === "number"
        ? raw.csvExportsPerMonth
        : emptyLimits.csvExportsPerMonth,
  };
}

function formatNum(n: number): string {
  return new Intl.NumberFormat().format(n);
}

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function labelStatus(status: string, activating: boolean, cancelScheduled = false): string {
  if (activating) return "Activating…";
  if (cancelScheduled) return "Canceling";
  if (status === "none") return "No active subscription";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function subscriptionAccessEndDate(
  billing: Pick<BillingState, "status" | "trialEnd" | "currentPeriodEnd">,
): string | null {
  if (billing.status === "trialing") {
    return billing.trialEnd ?? billing.currentPeriodEnd;
  }
  return billing.currentPeriodEnd;
}

const CANCELED_SUBSCRIPTION_STATUSES = new Set(["canceled", "cancelled", "ended"]);

const POLAR_BILLING_PORTAL = POLAR_BILLING_PORTAL_HREF;

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<ProfileState>({
    company_name: "",
    company_url: "",
    email: "",
    brand_context: "",
  });
  const [initialProfile, setInitialProfile] = useState<ProfileState | null>(null);
  const [usage, setUsage] = useState<UsageState>(emptyUsage);
  const [billing, setBilling] = useState<BillingState>(emptyBilling);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [devPlanSaving, setDevPlanSaving] = useState(false);
  const [devPlanError, setDevPlanError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [billingSyncing, setBillingSyncing] = useState(false);

  const upgradeBanner = useMemo(() => {
    const status = searchParams.get("upgrade");
    const message = searchParams.get("message");
    if (status === "success") {
      return { kind: "success" as const, text: "Upgraded to Pro. You were charged the prorated difference for the rest of this billing period." };
    }
    if (status === "already_pro") {
      return { kind: "info" as const, text: "You are already on Pro." };
    }
    if (status === "error" && message) {
      return { kind: "error" as const, text: message };
    }
    return null;
  }, [searchParams]);

  const hydrate = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const [profileRes, usageRes] = await Promise.all([
        fetch("/api/account/profile", { cache: "no-store", credentials: "include" }),
        fetch("/api/account/usage", { cache: "no-store", credentials: "include" }),
      ]);

      const profileJson = (await profileRes.json()) as {
        ok?: boolean;
        profile?: ProfileState & { email?: string | null; brand_context?: string | null };
        error?: string;
      };
      if (!profileRes.ok || !profileJson.ok || !profileJson.profile) {
        throw new Error(profileJson.error ?? "Could not load your profile.");
      }
      const p = profileJson.profile;
      const next: ProfileState = {
        company_name: p.company_name ?? "",
        company_url: p.company_url ?? "",
        email: p.email ?? "",
        brand_context: p.brand_context ?? "",
      };
      setProfile(next);
      setInitialProfile(next);

      if (usageRes.ok) {
        const u = (await usageRes.json()) as {
          usage?: Partial<UsageState>;
          billing?: Partial<BillingState> & {
            limits?: Partial<BillingState["limits"]>;
            remaining?: Partial<BillingState["remaining"]>;
          };
        };
        if (u.usage) {
          const limits = mapLimitsFromApi(u.usage.limits as Record<string, unknown> | undefined);
          setUsage({
            scrapedAdsTotal: u.usage.scrapedAdsTotal ?? 0,
            scrapedAdsThisMonth: u.usage.scrapedAdsThisMonth ?? 0,
            adLibraryScrapeRunsThisMonth: u.usage.adLibraryScrapeRunsThisMonth ?? 0,
            competitorsWatched: u.usage.competitorsWatched ?? 0,
            aiStrategyOverviews: u.usage.aiStrategyOverviews ?? 0,
            adLibraryRefreshes: u.usage.adLibraryRefreshes ?? 0,
            swapsThisMonth: u.usage.swapsThisMonth ?? 0,
            csvExportsThisMonth: u.usage.csvExportsThisMonth ?? 0,
            limits,
            remaining: {
              adsProcessedThisMonth:
                u.usage.remaining?.adsProcessedThisMonth ?? limits.maxAdsProcessedPerMonth,
              competitorsWatched:
                u.usage.remaining?.competitorsWatched ?? limits.maxWatchedCompetitors,
              swapsThisMonth: u.usage.remaining?.swapsThisMonth ?? limits.maxSwapsPerMonth,
              csvExportsThisMonth:
                u.usage.remaining?.csvExportsThisMonth ?? limits.csvExportsPerMonth,
            },
          });
        }
        if (u.billing) {
          const limits = mapLimitsFromApi(u.billing.limits as Record<string, unknown> | undefined);
          setBilling({
            hasAccess: u.billing.hasAccess ?? false,
            isUnlimited: u.billing.isUnlimited ?? false,
            status: u.billing.status ?? "none",
            planTier: u.billing.planTier ?? "free_trial",
            planName: u.billing.planName ?? "Free",
            polarProductId: u.billing.polarProductId ?? null,
            hasPolarBillingRecord: u.billing.hasPolarBillingRecord === true,
            trialEnd: u.billing.trialEnd ?? null,
            currentPeriodEnd: u.billing.currentPeriodEnd ?? null,
            cancelAtPeriodEnd: u.billing.cancelAtPeriodEnd ?? false,
            canUseDevPlanSwitcher: u.billing.canUseDevPlanSwitcher ?? false,
            devPlanOverride: u.billing.devPlanOverride ?? null,
            limits,
            remaining: {
              adsProcessedThisMonth:
                u.billing.remaining?.adsProcessedThisMonth ?? limits.maxAdsProcessedPerMonth,
              competitorsWatched:
                u.billing.remaining?.competitorsWatched ?? limits.maxWatchedCompetitors,
              swapsThisMonth: u.billing.remaining?.swapsThisMonth ?? limits.maxSwapsPerMonth,
              csvExportsThisMonth:
                u.billing.remaining?.csvExportsThisMonth ?? limits.csvExportsPerMonth,
            },
          });
        }
      }
    } catch (e) {
      if (!silent) {
        setLoadError(e instanceof Error ? e.message : "Something went wrong while loading settings.");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void hydrate());
  }, [hydrate]);

  const syncPolarBilling = useCallback(async () => {
    setBillingSyncing(true);
    try {
      const res = await fetch("/api/billing/sync-subscription", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as { synced?: boolean };
      if (json.synced) await hydrate({ silent: true });
    } catch {
      /* ignore */
    } finally {
      setBillingSyncing(false);
    }
  }, [hydrate]);

  useEffect(() => {
    if (searchParams.get("upgrade") !== "success") return;
    void syncPolarBilling();
  }, [searchParams, syncPolarBilling]);

  const billingActivating = isBillingActivating(billing) || billingSyncing;

  useEffect(() => {
    if (loading) return;
    void syncPolarBilling();
  }, [loading, syncPolarBilling]);

  useEffect(() => {
    if (loading) return;
    if (!billing.hasPolarBillingRecord && !hasActivePaidSubscription(billing)) return;

    let timeout: ReturnType<typeof setTimeout> | null = null;
    const onFocus = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => void syncPolarBilling(), 300);
    };

    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      if (timeout) clearTimeout(timeout);
    };
  }, [
    loading,
    billing.hasPolarBillingRecord,
    billing.planTier,
    billing.status,
    billing.isUnlimited,
    syncPolarBilling,
  ]);

  const upgradeToProHref = useMemo(
    () =>
      buildUpgradeToProHref({
        planTier: billing.planTier,
        status: billing.status,
        isUnlimited: billing.isUnlimited,
      }),
    [billing.planTier, billing.status, billing.isUnlimited],
  );

  const statusBadge = useMemo(() => {
    if (billingActivating) {
      return { label: "Activating", tone: "amber" as const };
    }
    return subscriptionStatusBadge(billing);
  }, [billing, billingActivating]);

  const applyDevPlan = async (plan: string | null) => {
    setDevPlanSaving(true);
    setDevPlanError(null);
    try {
      const res = await fetch("/api/account/dev-plan-override", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Could not switch plan.");
      }
      await hydrate();
    } catch (e) {
      setDevPlanError(e instanceof Error ? e.message : "Could not switch plan.");
    } finally {
      setDevPlanSaving(false);
    }
  };

  const isDirty =
    initialProfile !== null &&
    (profile.company_name !== initialProfile.company_name ||
      profile.company_url !== initialProfile.company_url ||
      profile.brand_context !== initialProfile.brand_context);

  const handleSave = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: profile.company_name,
          company_url: profile.company_url,
          brand_context: profile.brand_context,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        profile?: ProfileState & { email?: string | null; brand_context?: string | null };
      };
      if (!res.ok || !json.ok || !json.profile) {
        setSaveError(json.error ?? "Save failed. Try again.");
        return;
      }
      const p = json.profile;
      const next: ProfileState = {
        company_name: p.company_name ?? "",
        company_url: p.company_url ?? "",
        email: p.email ?? profile.email,
        brand_context: p.brand_context ?? "",
      };
      setProfile(next);
      setInitialProfile(next);
      setSavedFlash(true);
      router.refresh();
      window.dispatchEvent(new Event(RIVAL_PROFILE_UPDATED_EVENT));
      window.setTimeout(() => setSavedFlash(false), 2500);
    } catch {
      setSaveError("Network error — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    clearSidebarCompetitorsStorageForSignOut();
    try {
      await fetch("/auth/sign-out", { method: "POST", credentials: "same-origin" });
    } catch {
      /* continue */
    }
    await createSupabaseBrowserClient().auth.signOut();
    window.location.assign("/login");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; redirect?: string };
      if (!res.ok || !json.ok) {
        setDeleteError(json.error ?? "Could not delete account.");
        return;
      }
      clearSidebarCompetitorsStorageForSignOut();
      try {
        await fetch("/auth/sign-out", { method: "POST", credentials: "same-origin" });
      } catch {
        /* continue */
      }
      await createSupabaseBrowserClient().auth.signOut();
      window.location.assign(json.redirect ?? "/login");
    } catch {
      setDeleteError("Network error — try again.");
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteConfirm("");
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteModalOpen(false);
    setDeleteConfirm("");
    setDeleteError(null);
  };

  const subscriptionActions = useMemo(() => {
    if (billing.isUnlimited) {
      return {
        showCheckout: false,
        showPolarPortal: false,
        showUpgradeToPro: false,
        showManage: false,
        cancelScheduled: false,
        accessEndsAt: null as string | null,
        isFullyCanceled: false,
      };
    }

    const polarUi = shouldUsePolarSubscriptionUi(billing) || billingSyncing;
    const cancelScheduled =
      billing.cancelAtPeriodEnd && (billing.status === "active" || billing.status === "trialing");
    const accessEndsAt = subscriptionAccessEndDate(billing);
    const isFullyCanceled = CANCELED_SUBSCRIPTION_STATUSES.has(billing.status);

    return {
      showCheckout: !polarUi,
      showPolarPortal: polarUi,
      showUpgradeToPro: polarUi && billing.planTier !== "pro",
      showManage: polarUi,
      cancelScheduled,
      accessEndsAt,
      isFullyCanceled,
    };
  }, [billing, billingSyncing]);

  return (
    <div className="mx-auto max-w-[720px] px-6 py-10 pb-16">
      <header className="mb-8">
        <h1 className="text-[26px] font-bold tracking-tight text-[#1a1a2e]">Account settings</h1>
        <p className="mt-1.5 text-[15px] text-[#71717a]">Profile, workspace usage, and subscription.</p>
      </header>

      {loadError ? (
        <SettingsGlassBanner tone="error" className="mb-6">
          {loadError}{" "}
          <button
            type="button"
            className="font-semibold underline underline-offset-2 hover:no-underline"
            onClick={() => void hydrate()}
          >
            Retry
          </button>
        </SettingsGlassBanner>
      ) : null}

      <div className="flex flex-col gap-6">
        <SettingsGlassSection
          icon={User}
          accent="default"
          title="Profile"
          subtitle="Used across the dashboard and reports."
          headerRight={
            savedFlash ? (
              <span className="text-[12px] font-semibold text-emerald-600">Saved</span>
            ) : (
              <span className="text-[12px] text-[#a1a1aa]">
                {loading ? "Loading…" : isDirty ? "Unsaved changes" : ""}
              </span>
            )
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <SettingsFieldLabel htmlFor="email">Email</SettingsFieldLabel>
              <input
                id="email"
                type="email"
                value={profile.email}
                readOnly
                className={settingsGlassInputReadonlyClass}
              />
              <SettingsFieldHint>
                Used for login and billing receipts. Contact support to change your email.
              </SettingsFieldHint>
            </div>

            <div>
              <SettingsFieldLabel htmlFor="company_name">Company name</SettingsFieldLabel>
              <input
                id="company_name"
                type="text"
                autoComplete="organization"
                disabled={loading}
                placeholder="Acme Inc."
                value={profile.company_name}
                onChange={(e) => setProfile((p) => ({ ...p, company_name: e.target.value }))}
                className={settingsGlassInputClass}
              />
            </div>

            <div>
              <SettingsFieldLabel htmlFor="company_url">Company website</SettingsFieldLabel>
              <input
                id="company_url"
                type="text"
                autoComplete="url"
                disabled={loading}
                placeholder="acme.com"
                value={profile.company_url}
                onChange={(e) => setProfile((p) => ({ ...p, company_url: e.target.value }))}
                className={settingsGlassInputClass}
              />
              <SettingsFieldHint>
                Use a public domain (e.g. <span className="text-[#71717a]">yourbrand.com</span>). This updates your
                workspace brand and ad-library lookups.
              </SettingsFieldHint>
            </div>

            <div className="sm:col-span-2">
              <SettingsFieldLabel htmlFor="brand_context">Brand context</SettingsFieldLabel>
              <textarea
                id="brand_context"
                rows={5}
                maxLength={12000}
                disabled={loading}
                placeholder='What you do, who you serve, and how you position — same idea as the "About" we pull during onboarding.'
                value={profile.brand_context}
                onChange={(e) => setProfile((p) => ({ ...p, brand_context: e.target.value }))}
                className={`${settingsGlassInputClass} min-h-[120px] resize-y`}
              />
              <SettingsFieldHint>
                Shown to AI features as grounding for your company. Up to 12,000 characters.
              </SettingsFieldHint>
            </div>
          </div>

          {saveError ? (
            <p className="mt-4 text-[13px] font-medium text-[#b42318]" role="alert">
              {saveError}
            </p>
          ) : null}

          <div className="mt-6">
            <SettingsGlassButton disabled={loading || saving || !isDirty} onClick={() => void handleSave()}>
              {saving ? "Saving…" : "Save changes"}
            </SettingsGlassButton>
          </div>
        </SettingsGlassSection>

        <SettingsAutopilotSection />

        <McpKeysSection />

        <SettingsGlassSection
          icon={BarChart3}
          accent="indigo"
          title="Usage this period"
          subtitle={
            <>
              Totals from your workspace mapped to your current subscription quotas. Monthly figures use the calendar
              month in UTC. <span className="text-[#52525b]">Ad-library refreshes</span> (
              {formatNum(usage.adLibraryRefreshes)}) count cached platform snapshots;{" "}
              <span className="text-[#52525b]">Scrape runs (month)</span> (
              {formatNum(usage.adLibraryScrapeRunsThisMonth)}) are fresh Apify jobs not served from cache.
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SettingsGlassStatCard
              label="Ads processed (month, UTC)"
              value={formatNum(usage.scrapedAdsThisMonth)}
              hint={
                <>
                  {formatNum(usage.remaining.adsProcessedThisMonth)} of{" "}
                  {formatNum(usage.limits.maxAdsProcessedPerMonth)} remaining.
                </>
              }
            />
            <SettingsGlassStatCard
              label="Competitors watched"
              value={formatNum(usage.competitorsWatched)}
              hint={
                <>
                  {formatNum(usage.remaining.competitorsWatched)} of {formatNum(usage.limits.maxWatchedCompetitors)}{" "}
                  slots remaining (shared across up to {formatNum(usage.limits.maxOwnBrandWorkspaces)} brand
                  workspaces).
                </>
              }
            />
            <SettingsGlassStatCard
              label="AI strategy overviews"
              value={formatNum(usage.aiStrategyOverviews)}
              hint="Generated summaries (token cost)—good limit target alongside ads volume."
            />
          </div>
        </SettingsGlassSection>

        <SettingsGlassSection
          icon={CreditCard}
          accent="subscription"
          title="Subscription"
          headerRight={
            <span
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold ${subscriptionStatusBadgeClassName(statusBadge.tone)}`}
            >
              {statusBadge.label}
            </span>
          }
          subtitle={
            <>
              <span>
                Status:{" "}
                <span className="font-semibold text-[#1a1a2e]">
                  {labelStatus(billing.status, billingActivating, subscriptionActions.cancelScheduled)}
                </span>
                {billing.isUnlimited ? (
                  <> · Complimentary admin access — full product, no paywall.</>
                ) : subscriptionActions.isFullyCanceled ? (
                  <> · Your subscription has been canceled.</>
                ) : (
                  <>
                    {billing.status === "trialing"
                      ? ` · Trial ends ${formatDate(subscriptionActions.accessEndsAt)}`
                      : billing.hasAccess
                        ? ` · Renews ${formatDate(subscriptionActions.accessEndsAt)}`
                        : ""}
                    {subscriptionActions.cancelScheduled ? " · Cancels at period end" : ""}
                  </>
                )}
              </span>
              <span className="mt-2 block text-[12px]">
                Plan: <span className="font-medium text-[#52525b]">{billing.planName}</span>
              </span>
              {!billing.isUnlimited ? (
                <span className="mt-2 block text-[11px] leading-relaxed text-[#a1a1aa]">
                  Checkout, upgrades, and cancellations are handled securely by Polar. After you cancel in Polar,
                  access continues until the end of your billing period.
                </span>
              ) : null}
            </>
          }
        >
          {upgradeBanner ? (
            <SettingsGlassBanner
              tone={
                upgradeBanner.kind === "success"
                  ? "success"
                  : upgradeBanner.kind === "error"
                    ? "error"
                    : "info"
              }
              className="mb-4"
            >
              {upgradeBanner.text}
            </SettingsGlassBanner>
          ) : null}

          {subscriptionActions.cancelScheduled ? (
            <SettingsGlassBanner tone="warning" className="mb-4">
              Your subscription is set to cancel on{" "}
              <span className="font-semibold">{formatDate(subscriptionActions.accessEndsAt)}</span>. You can reopen
              Polar billing to keep your plan or change it before that date.
            </SettingsGlassBanner>
          ) : null}

          {subscriptionActions.isFullyCanceled ? (
            <SettingsGlassBanner tone="error" className="mb-4">
              Your subscription was canceled
              {subscriptionActions.accessEndsAt
                ? ` on ${formatDate(subscriptionActions.accessEndsAt)}`
                : ""}
              . Resubscribe below to restore access.
            </SettingsGlassBanner>
          ) : null}

          {billing.canUseDevPlanSwitcher ? (
            <SettingsGlassInsetPanel className="mb-4 border border-dashed border-indigo-200/70 bg-indigo-50/30">
              <p className="text-[12px] font-semibold text-[#3730a3]">Dev plan switcher</p>
              <p className="mt-1 text-[11px] text-[#6366f1]">
                Simulate Free trial, Starter, Pro, or Admin without Polar checkout.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    { id: "free_trial", label: "Free trial" },
                    { id: "starter", label: "Starter" },
                    { id: "pro", label: "Pro" },
                    { id: "agency", label: "Agency" },
                    { id: "admin", label: "Admin" },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    disabled={devPlanSaving}
                    onClick={() => void applyDevPlan(id)}
                    className={`min-h-[40px] rounded-xl px-3.5 py-2 text-[12px] font-semibold transition active:scale-[0.98] ${
                      billing.planTier === id
                        ? "bg-[#4f46e5] text-white shadow-sm"
                        : "border border-white/70 bg-white/60 text-[#4338ca] backdrop-blur-sm hover:bg-white/85"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={devPlanSaving}
                  onClick={() => void applyDevPlan(null)}
                  className="min-h-[40px] rounded-xl border border-white/70 bg-white/50 px-3.5 py-2 text-[12px] font-semibold text-[#64748b] backdrop-blur-sm hover:bg-white/80"
                >
                  Clear override
                </button>
              </div>
              {devPlanError ? (
                <p className="mt-2 text-[11px] font-medium text-[#b42318]">{devPlanError}</p>
              ) : null}
            </SettingsGlassInsetPanel>
          ) : null}

          <div className="flex flex-col gap-3">
            {billing.isUnlimited ? (
              <p className="text-[13px] leading-relaxed text-[#52525b]">
                No subscription or checkout needed — your account is enabled for full usage.
              </p>
            ) : subscriptionActions.showCheckout ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <CheckoutNavigationAnchor
                  href={buildCheckoutHref("starter")}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#1a1a2e] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_6px_20px_-8px_rgba(26,26,46,0.5)] transition hover:bg-[#2d2d44] active:scale-[0.98]"
                >
                  Start 7-day free trial — Starter
                </CheckoutNavigationAnchor>
                <CheckoutNavigationAnchor
                  href={upgradeToProHref}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/70 bg-white/60 px-5 py-2.5 text-[14px] font-semibold text-[#1a1a2e] shadow-sm backdrop-blur-sm transition hover:bg-white/85 active:scale-[0.98]"
                >
                  Upgrade to Pro
                </CheckoutNavigationAnchor>
              </div>
            ) : subscriptionActions.showManage ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <a
                  href={POLAR_BILLING_PORTAL}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#1a1a2e] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_6px_20px_-8px_rgba(26,26,46,0.5)] transition hover:bg-[#2d2d44] active:scale-[0.98]"
                >
                  Manage subscription
                  <ExternalLink className="h-3.5 w-3.5 opacity-80" aria-hidden />
                </a>
                {subscriptionActions.showUpgradeToPro ? (
                  <CheckoutNavigationAnchor
                    href={upgradeToProHref}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/70 bg-white/60 px-5 py-2.5 text-[14px] font-semibold text-[#1a1a2e] shadow-sm backdrop-blur-sm transition hover:bg-white/85 active:scale-[0.98]"
                  >
                    Upgrade to Pro
                  </CheckoutNavigationAnchor>
                ) : null}
              </div>
            ) : null}

            {subscriptionActions.showManage ? (
              <p className="text-[11px] leading-relaxed text-[#a1a1aa]">
                <a href={POLAR_BILLING_PORTAL} className="font-medium text-[#52525b] underline underline-offset-2 hover:text-[#1a1a2e]">
                  View invoices &amp; receipts
                </a>
                {" "}or cancel in Polar&apos;s billing portal via Manage subscription. Upgrade to Pro charges only the
                prorated difference for the rest of this billing period.
              </p>
            ) : null}
          </div>
        </SettingsGlassSection>

        <SettingsGlassSection
          icon={LogOut}
          accent="danger"
          title="Sign out"
          subtitle="Ends your session on this device."
        >
          <SettingsGlassButton variant="dangerGhost" disabled={signingOut} onClick={() => void handleSignOut()}>
            {signingOut ? "Signing out…" : "Sign out"}
          </SettingsGlassButton>
        </SettingsGlassSection>

        <SettingsGlassSection
          icon={Trash2}
          accent="danger"
          title="Delete account"
          subtitle="Permanently removes your workspace, billing profile, and all data. Any active subscription is canceled in Polar automatically."
        >
          <SettingsGlassButton variant="danger" onClick={openDeleteModal}>
            Delete my account permanently
          </SettingsGlassButton>
        </SettingsGlassSection>
      </div>

      {deleteModalOpen ? (
        <SettingsGlassModalShell onBackdropClick={closeDeleteModal} labelledBy="delete-account-title">
            <h2 id="delete-account-title" className="text-[18px] font-semibold text-[#1a1a2e]">
              Delete account?
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[#71717a]">
              This cannot be undone. Type{" "}
              <span className="font-mono font-semibold text-[#991b1b]">DELETE</span> to confirm.
            </p>
            <input
              id="delete_confirm"
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className={`${settingsGlassInputClass} mt-4 focus:border-red-300/70 focus:ring-red-400/20`}
            />
            {deleteError ? (
              <p className="mt-3 text-[13px] font-medium text-[#b42318]" role="alert">
                {deleteError}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <SettingsGlassButton variant="secondary" disabled={deleting} onClick={closeDeleteModal}>
                Cancel
              </SettingsGlassButton>
              <SettingsGlassButton
                variant="danger"
                disabled={deleting || deleteConfirm !== "DELETE"}
                onClick={() => void handleDeleteAccount()}
                className="bg-[#dc2626] text-white hover:bg-[#b91c1c] disabled:opacity-45"
              >
                {deleting ? "Deleting…" : "Delete account"}
              </SettingsGlassButton>
            </div>
        </SettingsGlassModalShell>
      ) : null}
    </div>
  );
}
