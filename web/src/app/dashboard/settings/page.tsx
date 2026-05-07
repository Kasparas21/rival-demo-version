"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { RIVAL_PROFILE_UPDATED_EVENT } from "@/lib/account/profile-events";

type ProfileState = {
  full_name: string;
  company_name: string;
  company_url: string;
  email: string;
  brand_context: string;
};

type UsageState = {
  scrapedAdsTotal: number;
  scrapedAdsThisMonth: number;
  adLibraryScrapeRunsThisMonth: number;
  competitorsWatched: number;
  aiStrategyOverviews: number;
  adLibraryRefreshes: number;
  limits: {
    maxWatchedCompetitors: number;
    maxAdLibraryScrapeRunsPerMonth: number;
  };
  remaining: {
    adLibraryScrapeRunsThisMonth: number;
    competitorsWatched: number;
  };
};

type BillingState = {
  hasAccess: boolean;
  status: string;
  planName: string;
  polarProductId: string | null;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  limits: {
    maxWatchedCompetitors: number;
    maxAdLibraryScrapeRunsPerMonth: number;
  };
  remaining: {
    adLibraryScrapeRunsThisMonth: number;
    competitorsWatched: number;
  };
};

const emptyUsage: UsageState = {
  scrapedAdsTotal: 0,
  scrapedAdsThisMonth: 0,
  adLibraryScrapeRunsThisMonth: 0,
  competitorsWatched: 0,
  aiStrategyOverviews: 0,
  adLibraryRefreshes: 0,
  limits: {
    maxWatchedCompetitors: 10,
    maxAdLibraryScrapeRunsPerMonth: 15,
  },
  remaining: {
    adLibraryScrapeRunsThisMonth: 15,
    competitorsWatched: 10,
  },
};

const emptyBilling: BillingState = {
  hasAccess: false,
  status: "none",
  planName: "Spy Rival Pro",
  polarProductId: null,
  trialEnd: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  limits: {
    maxWatchedCompetitors: 10,
    maxAdLibraryScrapeRunsPerMonth: 15,
  },
  remaining: {
    adLibraryScrapeRunsThisMonth: 15,
    competitorsWatched: 10,
  },
};

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
          setUsage({
            scrapedAdsTotal: u.usage.scrapedAdsTotal ?? 0,
            scrapedAdsThisMonth: u.usage.scrapedAdsThisMonth ?? 0,
            adLibraryScrapeRunsThisMonth: u.usage.adLibraryScrapeRunsThisMonth ?? 0,
            competitorsWatched: u.usage.competitorsWatched ?? 0,
            aiStrategyOverviews: u.usage.aiStrategyOverviews ?? 0,
            adLibraryRefreshes: u.usage.adLibraryRefreshes ?? 0,
            limits: {
              maxWatchedCompetitors:
                u.usage.limits?.maxWatchedCompetitors ?? emptyUsage.limits.maxWatchedCompetitors,
              maxAdLibraryScrapeRunsPerMonth:
                u.usage.limits?.maxAdLibraryScrapeRunsPerMonth ??
                emptyUsage.limits.maxAdLibraryScrapeRunsPerMonth,
            },
            remaining: {
              adLibraryScrapeRunsThisMonth:
                u.usage.remaining?.adLibraryScrapeRunsThisMonth ??
                emptyUsage.remaining.adLibraryScrapeRunsThisMonth,
              competitorsWatched:
                u.usage.remaining?.competitorsWatched ?? emptyUsage.remaining.competitorsWatched,
            },
          });
        }
        if (u.billing) {
          setBilling({
            hasAccess: u.billing.hasAccess ?? false,
            status: u.billing.status ?? "none",
            planName: u.billing.planName ?? "Spy Rival Pro",
            polarProductId: u.billing.polarProductId ?? null,
            trialEnd: u.billing.trialEnd ?? null,
            currentPeriodEnd: u.billing.currentPeriodEnd ?? null,
            cancelAtPeriodEnd: u.billing.cancelAtPeriodEnd ?? false,
            limits: {
              maxWatchedCompetitors:
                u.billing.limits?.maxWatchedCompetitors ?? emptyBilling.limits.maxWatchedCompetitors,
              maxAdLibraryScrapeRunsPerMonth:
                u.billing.limits?.maxAdLibraryScrapeRunsPerMonth ??
                emptyBilling.limits.maxAdLibraryScrapeRunsPerMonth,
            },
            remaining: {
              adLibraryScrapeRunsThisMonth:
                u.billing.remaining?.adLibraryScrapeRunsThisMonth ??
                emptyBilling.remaining.adLibraryScrapeRunsThisMonth,
              competitorsWatched:
                u.billing.remaining?.competitorsWatched ?? emptyBilling.remaining.competitorsWatched,
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
    try {
      await fetch("/auth/sign-out", { method: "POST", credentials: "same-origin" });
    } catch {
      /* continue */
    }
    await createSupabaseBrowserClient().auth.signOut();
    window.location.assign("/login");
  };

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
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a1a1aa]">Scraped ads (month, UTC)</p>
              <p className="mt-1 text-[22px] font-semibold tabular-nums text-[#1a1a2e]">
                {formatNum(usage.scrapedAdsThisMonth)}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-[#a1a1aa]">
                {formatNum(usage.remaining.adLibraryScrapeRunsThisMonth)} of{" "}
                {formatNum(usage.limits.maxAdLibraryScrapeRunsPerMonth)} fresh searches remaining.
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

        <section className="rounded-2xl border border-[#e8eafd] bg-gradient-to-br from-[#fafaff] to-[#f8fafc] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-[#1a1a2e]">Subscription</h2>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#52525b]">
                Status: <span className="font-semibold text-[#1a1a2e]">{labelStatus(billing.status)}</span>
                {billing.status === "trialing"
                  ? ` · Trial ends ${formatDate(billing.trialEnd)}`
                  : billing.hasAccess
                    ? ` · Renews ${formatDate(billing.currentPeriodEnd)}`
                    : ""}
                {billing.cancelAtPeriodEnd ? " · Cancels at period end" : ""}
              </p>
              <p className="mt-2 text-[12px] text-[#71717a]">
                Plan: <span className="font-medium text-[#52525b]">{billing.planName}</span> · Product:{" "}
                {billing.polarProductId ?? "Not connected"} · Checkout and billing are handled by Polar.
              </p>
            </div>
            <span
              className={`w-fit rounded-full px-3 py-1 text-[11px] font-semibold ${
                billing.hasAccess ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {billing.hasAccess ? "Access enabled" : "Subscription required"}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {billing.hasAccess ? (
              <a
                href="/api/billing/portal"
                className="rounded-xl border border-[#d4d4d8] bg-white/90 px-4 py-2.5 text-[13px] font-medium text-[#1a1a2e] transition hover:bg-white"
              >
                Manage subscription
              </a>
            ) : (
              <a
                href="/checkout"
                className="rounded-xl bg-[#1a1a2e] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#2d2d44]"
              >
                Start 1-day free trial
              </a>
            )}
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
