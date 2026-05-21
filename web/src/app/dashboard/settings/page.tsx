"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { clearSidebarCompetitorsStorageForSignOut } from "@/lib/sidebar-competitors";
import { RIVAL_PROFILE_UPDATED_EVENT } from "@/lib/account/profile-events";
import { buildCheckoutHref } from "@/lib/billing/checkout-url";
import { hasActivePaidSubscription } from "@/lib/billing/entitlements";

type ProfileState = {
  full_name: string;
  company_name: string;
  company_url: string;
  email: string;
  brand_context: string;
};

type PlanLimitsState = {
  maxWatchedCompetitors: number;
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
  planTier: string;
  planName: string;
  polarProductId: string | null;
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

function labelStatus(status: string): string {
  if (status === "none") return "No active subscription";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const POLAR_BILLING_PORTAL_HREF = "/api/billing/portal";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileState>({
    full_name: "",
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

  const hydrate = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
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
        full_name: p.full_name ?? "",
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
      setLoadError(e instanceof Error ? e.message : "Something went wrong while loading settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void hydrate());
  }, [hydrate]);

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
    (profile.full_name !== initialProfile.full_name ||
      profile.company_name !== initialProfile.company_name ||
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
          full_name: profile.full_name,
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
        full_name: p.full_name ?? "",
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

  const subscriptionActions = useMemo(() => {
    if (billing.isUnlimited) {
      return {
        showCheckout: false,
        showPolarPortal: false,
        showCancel: false,
        cancelScheduled: false,
      };
    }

    const paidPolar = hasActivePaidSubscription(billing);
    const hasPolarRecord = Boolean(billing.polarProductId) && billing.status !== "none";
    const cancelScheduled = billing.cancelAtPeriodEnd && (billing.status === "active" || billing.status === "trialing");

    return {
      showCheckout: !paidPolar && !hasPolarRecord,
      showPolarPortal: paidPolar || hasPolarRecord,
      showCancel: paidPolar && !cancelScheduled,
      cancelScheduled,
    };
  }, [billing]);

  return (
    <div className="mx-auto max-w-[720px] px-6 py-10 pb-16">
      <header className="mb-8">
        <h1 className="text-[22px] font-bold tracking-tight text-[#1a1a2e]">Account settings</h1>
        <p className="mt-1 text-[14px] text-[#71717a]">Profile, workspace usage, and subscription.</p>
      </header>

      {loadError ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-[#b42318]">
          {loadError}
          <button
            type="button"
            className="ml-3 underline underline-offset-2 hover:no-underline"
            onClick={() => void hydrate()}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-6">
        <section className="rounded-2xl border border-[#ececef] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-[#1a1a2e]">Profile</h2>
              <p className="text-[12px] text-[#71717a]">Used across the dashboard and reports.</p>
            </div>
            {savedFlash ? (
              <span className="text-[12px] font-medium text-emerald-600">Saved</span>
            ) : (
              <span className="text-[12px] text-[#a1a1aa]">{loading ? "Loading…" : isDirty ? "Unsaved changes" : ""}</span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[12px] font-medium text-[#3f3f46]" htmlFor="full_name">
                Full name
              </label>
              <input
                id="full_name"
                type="text"
                autoComplete="name"
                disabled={loading}
                placeholder="Jane Smith"
                value={profile.full_name}
                onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                className="w-full rounded-xl border border-[#e4e4e7] px-3.5 py-2.5 text-[14px] text-[#18181b] placeholder:text-[#a1a1aa] outline-none transition focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20 disabled:bg-[#fafafa] disabled:text-[#a1a1aa]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#3f3f46]" htmlFor="company_name">
                Company name
              </label>
              <input
                id="company_name"
                type="text"
                autoComplete="organization"
                disabled={loading}
                placeholder="Acme Inc."
                value={profile.company_name}
                onChange={(e) => setProfile((p) => ({ ...p, company_name: e.target.value }))}
                className="w-full rounded-xl border border-[#e4e4e7] px-3.5 py-2.5 text-[14px] text-[#18181b] placeholder:text-[#a1a1aa] outline-none transition focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20 disabled:bg-[#fafafa]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#3f3f46]" htmlFor="company_url">
                Company website
              </label>
              <input
                id="company_url"
                type="text"
                autoComplete="url"
                disabled={loading}
                placeholder="acme.com"
                value={profile.company_url}
                onChange={(e) => setProfile((p) => ({ ...p, company_url: e.target.value }))}
                className="w-full rounded-xl border border-[#e4e4e7] px-3.5 py-2.5 text-[14px] text-[#18181b] placeholder:text-[#a1a1aa] outline-none transition focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20 disabled:bg-[#fafafa]"
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#a1a1aa]">
                Use a public domain (e.g. <span className="text-[#71717a]">yourbrand.com</span>). This updates your
                workspace brand and ad-library lookups.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[12px] font-medium text-[#3f3f46]" htmlFor="brand_context">
                Brand context
              </label>
              <textarea
                id="brand_context"
                rows={5}
                maxLength={12000}
                disabled={loading}
                placeholder="What you do, who you serve, and how you position — same idea as the “About” we pull during onboarding."
                value={profile.brand_context}
                onChange={(e) => setProfile((p) => ({ ...p, brand_context: e.target.value }))}
                className="w-full resize-y rounded-xl border border-[#e4e4e7] px-3.5 py-2.5 text-[14px] text-[#18181b] placeholder:text-[#a1a1aa] outline-none transition focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20 disabled:bg-[#fafafa] min-h-[120px]"
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#a1a1aa]">
                Shown to AI features as grounding for your company. Up to 12,000 characters.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[12px] font-medium text-[#3f3f46]" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={profile.email}
                readOnly
                className="w-full cursor-not-allowed rounded-xl border border-[#e4e4e7] bg-[#f4f4f5] px-3.5 py-2.5 text-[14px] text-[#3f3f46]"
              />
            </div>
          </div>

          {saveError ? (
            <p className="mt-4 text-[13px] font-medium text-[#b42318]" role="alert">
              {saveError}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={loading || saving || !isDirty}
              onClick={() => void handleSave()}
              className="rounded-xl bg-[#1a1a2e] px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#2d2d44] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e8eafd] bg-gradient-to-br from-[#fafaff] to-[#f8fafc] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-[#1a1a2e]">Subscription</h2>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#52525b]">
                Status: <span className="font-semibold text-[#1a1a2e]">{labelStatus(billing.status)}</span>
                {billing.isUnlimited ? (
                  <> · Complimentary admin access — full product, no paywall.</>
                ) : (
                  <>
                    {billing.status === "trialing"
                      ? ` · Trial ends ${formatDate(billing.trialEnd)}`
                      : billing.hasAccess
                        ? ` · Renews ${formatDate(billing.currentPeriodEnd)}`
                        : ""}
                    {subscriptionActions.cancelScheduled ? " · Cancels at period end" : ""}
                  </>
                )}
              </p>
              <p className="mt-2 text-[12px] text-[#71717a]">
                Plan: <span className="font-medium text-[#52525b]">{billing.planName}</span>
                <span className="text-[#a1a1aa]"> ({billing.planTier})</span>
              </p>
              {!billing.isUnlimited ? (
                <p className="mt-2 text-[11px] leading-relaxed text-[#a1a1aa]">
                  Checkout, upgrades, and cancellations are handled securely by Polar. After you cancel in Polar,
                  access continues until the end of your billing period.
                </p>
              ) : null}
            </div>
            <span
              className={`w-fit rounded-full px-3 py-1 text-[11px] font-semibold ${
                billing.isUnlimited
                  ? "bg-sky-100 text-sky-800"
                  : billing.hasAccess
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
              }`}
            >
              {billing.isUnlimited ? "Admin access" : billing.hasAccess ? "Access enabled" : "Subscription required"}
            </span>
          </div>

          {subscriptionActions.cancelScheduled ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-[12px] leading-relaxed text-amber-950">
              Your subscription is set to cancel on{" "}
              <span className="font-semibold">{formatDate(billing.currentPeriodEnd)}</span>. You can reopen Polar billing
              to keep your plan or change it before that date.
            </div>
          ) : null}

          {billing.canUseDevPlanSwitcher ? (
            <div className="mt-5 rounded-xl border border-dashed border-[#c7d2fe] bg-[#eef2ff]/60 p-4">
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
                    { id: "admin", label: "Admin" },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    disabled={devPlanSaving}
                    onClick={() => void applyDevPlan(id)}
                    className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                      billing.planTier === id
                        ? "bg-[#4f46e5] text-white"
                        : "bg-white text-[#4338ca] ring-1 ring-[#c7d2fe] hover:bg-[#e0e7ff]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={devPlanSaving}
                  onClick={() => void applyDevPlan(null)}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#64748b] ring-1 ring-[#e2e8f0] hover:bg-white"
                >
                  Clear override
                </button>
              </div>
              {devPlanError ? (
                <p className="mt-2 text-[11px] font-medium text-[#b42318]">{devPlanError}</p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-3">
            {billing.isUnlimited ? (
              <p className="text-[13px] leading-relaxed text-[#52525b]">
                No subscription or checkout needed — your account is enabled for full usage.
              </p>
            ) : subscriptionActions.showCheckout ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <a
                  href={buildCheckoutHref("starter")}
                  className="inline-flex items-center justify-center rounded-xl bg-[#1a1a2e] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#2d2d44]"
                >
                  Start 7-day free trial — Starter
                </a>
                <a
                  href={buildCheckoutHref("pro")}
                  className="inline-flex items-center justify-center rounded-xl border border-[#d4d4d8] bg-white/90 px-4 py-2.5 text-[13px] font-medium text-[#1a1a2e] transition hover:bg-white"
                >
                  Upgrade to Pro
                </a>
              </div>
            ) : null}

            {subscriptionActions.showPolarPortal ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <a
                  href={POLAR_BILLING_PORTAL_HREF}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a1a2e] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#2d2d44]"
                >
                  {billing.planTier === "starter" ? "Upgrade to Pro" : "Manage subscription"}
                  <ExternalLink className="h-3.5 w-3.5 opacity-80" aria-hidden />
                </a>
                {subscriptionActions.showCancel ? (
                  <a
                    href={POLAR_BILLING_PORTAL_HREF}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#fca5a5] bg-white px-4 py-2.5 text-[13px] font-medium text-[#dc2626] transition hover:bg-[#fef2f2]"
                  >
                    Cancel subscription
                    <ExternalLink className="h-3.5 w-3.5 opacity-80" aria-hidden />
                  </a>
                ) : null}
              </div>
            ) : null}

            {subscriptionActions.showPolarPortal ? (
              <p className="text-[11px] leading-relaxed text-[#a1a1aa]">
                Opens Polar&apos;s billing portal — change plan, update payment method, or cancel there. We sync status
                automatically after you finish in Polar.
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-[#ececef] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-[15px] font-semibold text-[#1a1a2e]">Usage this period</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-[#71717a]">
            Totals from your workspace mapped to your current subscription quotas. Monthly figures use the calendar
            month in UTC. <span className="text-[#52525b]">Ad-library refreshes</span> (
            {formatNum(usage.adLibraryRefreshes)}) count cached platform snapshots;{" "}
            <span className="text-[#52525b]">Scrape runs (month)</span> (
            {formatNum(usage.adLibraryScrapeRunsThisMonth)}) are fresh Apify jobs not served from cache.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-[#f4f4f5] bg-[#fafafa]/80 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a1a1aa]">Ads processed (month, UTC)</p>
              <p className="mt-1 text-[22px] font-semibold tabular-nums text-[#1a1a2e]">
                {formatNum(usage.scrapedAdsThisMonth)}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-[#a1a1aa]">
                {formatNum(usage.remaining.adsProcessedThisMonth)} of{" "}
                {formatNum(usage.limits.maxAdsProcessedPerMonth)} remaining.
              </p>
            </div>
            <div className="rounded-xl border border-[#f4f4f5] bg-[#fafafa]/80 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a1a1aa]">Competitors watched</p>
              <p className="mt-1 text-[22px] font-semibold tabular-nums text-[#1a1a2e]">
                {formatNum(usage.competitorsWatched)}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-[#a1a1aa]">
                {formatNum(usage.remaining.competitorsWatched)} of {formatNum(usage.limits.maxWatchedCompetitors)}{" "}
                slots remaining.
              </p>
            </div>
            <div className="rounded-xl border border-[#f4f4f5] bg-[#fafafa]/80 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a1a1aa]">AI strategy overviews</p>
              <p className="mt-1 text-[22px] font-semibold tabular-nums text-[#1a1a2e]">
                {formatNum(usage.aiStrategyOverviews)}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-[#a1a1aa]">
                Generated summaries (token cost)—good limit target alongside ads volume.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#fee2e2] bg-white p-6">
          <h2 className="text-[15px] font-semibold text-[#1a1a2e]">Sign out</h2>
          <p className="mt-1 text-[13px] text-[#71717a]">Ends your session on this device.</p>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
            className="mt-4 rounded-xl border border-[#fca5a5] bg-white px-4 py-2.5 text-[13px] font-medium text-[#dc2626] transition hover:bg-[#fef2f2] disabled:opacity-60"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </section>
      </div>
    </div>
  );
}
