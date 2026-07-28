"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";

import type { AdminUserUsageDetail } from "@/lib/admin/load-user-usage-detail";
import { formatQuotePrice } from "@/lib/billing/custom-quotes";

type UserDetail = {
  profile: {
    email: string | null;
    full_name: string | null;
    company_name: string | null;
    company_url: string | null;
    company_role: string | null;
    onboarding_completed: boolean;
    last_active_date: string | null;
    app_streak_days: number;
    created_at: string;
  };
  billing: {
    planName: string;
    planTier: string;
    status: string;
    adminPlanOverride: string | null;
    isUnlimited: boolean;
    customPriceLabel: string | null;
  };
  usage: {
    month: string;
    adsScraped: number;
    scrapeOperations: number;
    swapCount: number;
    csvExportCount: number;
    adPreviewAnalyses: number;
    lifetimeScrapeOperations: number;
  };
  competitors: { brand_domain: string | null; name: string | null }[];
  quotes: {
    id: string;
    status: string;
    price_cents: number;
    currency: string;
    billing_period: string;
    sent_at: string | null;
    checkout_token: string;
  }[];
  brands: { id: string; name: string; domain: string; is_primary: boolean; created_at: string }[];
  snapshot: {
    funnel_stage: string | null;
    scrape_paused: boolean | null;
    days_inactive: number | null;
    email_ai_analyses_month: number | null;
  } | null;
  usageDetail: AdminUserUsageDetail;
};

const PLAN_OVERRIDE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "No override (Polar-managed)" },
  { value: "free_trial", label: "Free trial" },
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "agency", label: "Agency" },
  { value: "admin", label: "Admin (unlimited)" },
];

type EditForm = {
  email: string;
  full_name: string;
  company_name: string;
  company_url: string;
  company_role: string;
  onboarding_completed: boolean;
  planTier: string;
};

function formatLimit(value: number | null | undefined): string {
  if (value == null) return "∞";
  return String(value);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function formatChannels(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (typeof value === "string" && value.trim()) return value;
  return "—";
}

function platformLabel(platform: string): string {
  const labels: Record<string, string> = {
    meta: "Meta",
    google: "Google",
    tiktok: "TikTok",
    linkedin: "LinkedIn",
    pinterest: "Pinterest",
    snapchat: "Snapchat",
    youtube: "YouTube",
    microsoft: "Microsoft",
  };
  return labels[platform] ?? platform;
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params.id;
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [revokingUnlimited, setRevokingUnlimited] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [expandedCompetitorId, setExpandedCompetitorId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${userId}`);
    const json = (await res.json()) as UserDetail & { ok?: boolean };
    if (json.profile) setData(json);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  function formFromData(d: UserDetail): EditForm {
    return {
      email: d.profile.email ?? "",
      full_name: d.profile.full_name ?? "",
      company_name: d.profile.company_name ?? "",
      company_url: d.profile.company_url ?? "",
      company_role: d.profile.company_role ?? "",
      onboarding_completed: d.profile.onboarding_completed,
      planTier: d.billing.adminPlanOverride ?? "",
    };
  }

  function startEditing() {
    if (!data) return;
    setForm(formFromData(data));
    setSaveError(null);
    setSaveSuccess(false);
    setEditing(true);
  }

  function updateForm<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function saveEdits() {
    if (!data || !form) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const initial = formFromData(data);
    const profile: Record<string, string | boolean | null> = {};
    if (form.email.trim() !== initial.email) profile.email = form.email.trim();
    if (form.full_name.trim() !== initial.full_name) profile.full_name = form.full_name.trim() || null;
    if (form.company_name.trim() !== initial.company_name) profile.company_name = form.company_name.trim() || null;
    if (form.company_url.trim() !== initial.company_url) profile.company_url = form.company_url.trim() || null;
    if (form.company_role.trim() !== initial.company_role) profile.company_role = form.company_role.trim() || null;
    if (form.onboarding_completed !== initial.onboarding_completed) {
      profile.onboarding_completed = form.onboarding_completed;
    }

    const body: Record<string, unknown> = {};
    if (Object.keys(profile).length > 0) body.profile = profile;
    if (form.planTier !== initial.planTier) body.planTier = form.planTier || null;

    if (Object.keys(body).length === 0) {
      setSaving(false);
      setEditing(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setSaveError(json.error ?? `Update failed (${res.status})`);
        return;
      }
      setSaveSuccess(true);
      setEditing(false);
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function revokeComplimentaryUnlimited() {
    setRevokingUnlimited(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier: null }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setSaveError(json.error ?? `Revoke failed (${res.status})`);
        return;
      }
      setSaveSuccess(true);
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setRevokingUnlimited(false);
    }
  }

  async function deleteUser() {
    if (deleteConfirmText !== "DELETE") return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setDeleteError(json.error ?? `Delete failed (${res.status})`);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function sendQuote(quoteId: string) {
    const res = await fetch(`/api/admin/quotes/${quoteId}/send`, { method: "POST" });
    const json = (await res.json()) as { checkoutUrl?: string };
    if (json.checkoutUrl) {
      setCheckoutUrl(json.checkoutUrl);
      await navigator.clipboard.writeText(json.checkoutUrl);
    }
    await load();
  }

  if (loading) {
    return <p className="text-zinc-500">Loading user…</p>;
  }

  if (!data) {
    return <p className="text-red-600">User not found.</p>;
  }

  const detail = data.usageDetail;
  const competitorNameById = new Map(
    detail.competitors.map((c) => [c.id, c.name ?? c.brand_domain ?? "—"]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-700">
            ← Users
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{data.profile.email}</h1>
          <p className="text-sm text-zinc-500">{data.profile.company_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startEditing}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
          >
            Edit user
          </button>
          <Link
            href={`/admin/users/${userId}/quote`}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white"
          >
            Create quote
          </Link>
        </div>
      </div>

      {saveSuccess ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          User updated.
        </div>
      ) : null}

      {editing && form ? (
        <section className="rounded-xl border border-zinc-300 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-700">Edit user</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-zinc-500">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-500">Full name</span>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => updateForm("full_name", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-500">Company name</span>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => updateForm("company_name", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-500">Company URL</span>
              <input
                type="text"
                value={form.company_url}
                onChange={(e) => updateForm("company_url", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-500">Role</span>
              <input
                type="text"
                value={form.company_role}
                onChange={(e) => updateForm("company_role", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-500">Plan</span>
              <select
                value={form.planTier}
                onChange={(e) => updateForm("planTier", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
              >
                {PLAN_OVERRIDE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {data.billing.isUnlimited && !data.billing.adminPlanOverride ? (
                <p className="mt-1 text-xs text-amber-700">
                  This account has hidden complimentary unlimited access (e.g. tester invite). Saving any
                  plan change here removes it and applies Polar billing rules.
                </p>
              ) : null}
            </label>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={form.onboarding_completed}
                onChange={(e) => updateForm("onboarding_completed", e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <span>Onboarding completed</span>
            </label>
          </div>

          {saveError ? <p className="mt-3 text-sm text-red-600">{saveError}</p> : null}

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void saveEdits()}
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      {checkoutUrl ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Checkout link copied:{" "}
          <a href={checkoutUrl} className="underline">
            {checkoutUrl}
          </a>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-700">Identity</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">Company URL</dt>
              <dd>{data.profile.company_url ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Role</dt>
              <dd>{data.profile.company_role ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Signed up</dt>
              <dd>{new Date(data.profile.created_at).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Last active</dt>
              <dd>
                {data.profile.last_active_date ?? "—"} (streak {data.profile.app_streak_days})
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Funnel stage</dt>
              <dd>{data.snapshot?.funnel_stage ?? "—"}</dd>
            </div>
            {data.snapshot?.scrape_paused ? (
              <div>
                <dt className="text-zinc-500">Scrape status</dt>
                <dd>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    Paused ({data.snapshot.days_inactive ?? "?"}d inactive)
                  </span>
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-700">Billing</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">Plan</dt>
              <dd>
                {data.billing.planName}
                {data.billing.adminPlanOverride ? (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    admin override
                  </span>
                ) : null}
                {data.billing.isUnlimited && !data.billing.adminPlanOverride ? (
                  <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">
                    complimentary unlimited (hidden)
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Status</dt>
              <dd>{data.billing.status}</dd>
            </div>
            {data.billing.isUnlimited && !data.billing.adminPlanOverride ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm text-amber-900">
                  Scraping still runs because this account has hidden complimentary unlimited access
                  (usually from a tester invite), even though the plan override is empty.
                </p>
                <button
                  type="button"
                  disabled={revokingUnlimited}
                  onClick={() => void revokeComplimentaryUnlimited()}
                  className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  {revokingUnlimited ? "Revoking…" : "Revoke unlimited & pause scraping"}
                </button>
              </div>
            ) : null}
            <div>
              <dt className="text-zinc-500">Custom price</dt>
              <dd>{data.billing.customPriceLabel ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-700">Usage ({detail.month})</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">Ads scraped</dt>
              <dd>
                {detail.usage.adsScraped} / {formatLimit(detail.limits.maxAdsProcessedPerMonth)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Scrape ops</dt>
              <dd>
                {detail.usage.scrapeOperations} (lifetime {detail.usage.lifetimeScrapeOperations})
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Swaps / CSV exports</dt>
              <dd>
                {detail.usage.swapCount} / {detail.usage.csvExportCount}
                {detail.usage.csvAdsExported > 0 ? ` (${detail.usage.csvAdsExported} ads exported)` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">AI preview analyses</dt>
              <dd>
                {detail.usage.adPreviewAnalyses} / {formatLimit(detail.limits.maxAdPreviewAnalysesPerMonth)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Email AI analyses</dt>
              <dd>
                {detail.usage.emailAiAnalyses} / {formatLimit(detail.limits.maxEmailAiAnalysesPerMonth)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Manual refreshes</dt>
              <dd>{detail.usage.manualRefreshes}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Competitors</dt>
              <dd>
                {detail.competitors.length} / {formatLimit(detail.limits.maxWatchedCompetitors)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-700">Inventory totals</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-zinc-500">Active scraped ads</dt>
            <dd className="font-medium">{detail.inventory.activeScrapedAds}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Organic posts</dt>
            <dd className="font-medium">{detail.inventory.organicPosts}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Strategy overviews</dt>
            <dd className="font-medium">{detail.inventory.strategyOverviews}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Ad library cache rows</dt>
            <dd className="font-medium">{detail.inventory.adLibraryRefreshes}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Ad AI cache rows</dt>
            <dd className="font-medium">{detail.inventory.adPreviewCacheCount}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Organic AI cache rows</dt>
            <dd className="font-medium">{detail.inventory.organicPreviewCacheCount}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Organic insights</dt>
            <dd className="font-medium">{detail.inventory.organicInsightsCount}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-zinc-400">
          OpenRouter token/cost is not logged — only metered feature quotas are shown above.
        </p>
      </section>

      {data.brands.length > 0 ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-700">Brands</h2>
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {data.brands.map((brand) => (
              <li key={brand.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {brand.name}{" "}
                  <span className="text-zinc-500">({brand.domain})</span>
                  {brand.is_primary ? (
                    <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs">primary</span>
                  ) : null}
                </span>
                <span className="text-zinc-400">{formatDate(brand.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-700">Competitors</h2>
        {detail.competitors.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No competitors.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-500">
                  <th className="py-2 pr-3 font-medium">Competitor</th>
                  <th className="py-2 pr-3 font-medium">Paid platforms</th>
                  <th className="py-2 pr-3 font-medium">Active ads</th>
                  <th className="py-2 pr-3 font-medium">Organic</th>
                  <th className="py-2 pr-3 font-medium">Landing pages</th>
                  <th className="py-2 font-medium">Last scrape</th>
                </tr>
              </thead>
              <tbody>
                {detail.competitors.map((c) => (
                  <Fragment key={c.id}>
                    <tr
                      className="cursor-pointer border-b border-zinc-50 hover:bg-zinc-50"
                      onClick={() =>
                        setExpandedCompetitorId((prev) => (prev === c.id ? null : c.id))
                      }
                    >
                      <td className="py-3 pr-3">
                        <div className="font-medium">{c.name ?? c.brand_domain ?? "—"}</div>
                        {c.brand_domain ? (
                          <div className="text-xs text-zinc-500">{c.brand_domain}</div>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {c.platforms.length === 0 ? (
                            <span className="text-zinc-400">—</span>
                          ) : (
                            c.platforms.map((p) => (
                              <span
                                key={`${c.id}-${p.platform}`}
                                className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800"
                              >
                                {platformLabel(p.platform)} ({p.active_ad_count})
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-3">{c.totalActiveAds}</td>
                      <td className="py-3 pr-3">
                        {c.organicPlatforms.length > 0 ? (
                          <div>
                            <div className="flex flex-wrap gap-1">
                              {c.organicPlatforms.map((p) => (
                                <span
                                  key={`${c.id}-org-${p}`}
                                  className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-800"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">{c.organicPostCount} posts</div>
                          </div>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        {c.landingPages.length > 0 ? (
                          <span>
                            {c.landingPages.length} page{c.landingPages.length === 1 ? "" : "s"} ·{" "}
                            {c.landingPages.reduce((sum, p) => sum + p.snapshotCount, 0)} shots
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="text-xs">
                          <div>Paid: {formatDate(c.last_scraped_at)}</div>
                          <div className="text-zinc-500">
                            Organic: {formatDate(c.organic_last_scraped_at)}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {expandedCompetitorId === c.id ? (
                      <tr className="border-b border-zinc-100 bg-zinc-50/50">
                        <td colSpan={6} className="px-3 py-3 text-xs text-zinc-600">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <p className="font-medium text-zinc-700">Ads by platform</p>
                              {Object.keys(c.adsByPlatform).length === 0 ? (
                                <p className="mt-1">No active ads stored.</p>
                              ) : (
                                <ul className="mt-1 space-y-1">
                                  {Object.entries(c.adsByPlatform).map(([platform, count]) => (
                                    <li key={platform}>
                                      {platformLabel(platform)}: {count}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-zinc-700">Landing pages</p>
                              {c.landingPages.length === 0 ? (
                                <p className="mt-1">None tracked.</p>
                              ) : (
                                <ul className="mt-1 space-y-1">
                                  {c.landingPages.map((p) => (
                                    <li key={p.id}>
                                      {p.label || p.url}{" "}
                                      {p.is_active ? "" : "(inactive)"} · {p.snapshotCount} shots
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-zinc-400">Click a row to expand platform and landing page detail.</p>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-700">Landing page screenshots</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Includes active and inactive pages, including auto-detected URLs the user may not have opened.
        </p>
        {detail.landingPages.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No landing pages tracked.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {detail.landingPages.map((page) => (
              <div key={page.id} className="rounded-lg border border-zinc-100 p-3">
                <div className="flex gap-3">
                  {page.latestScreenshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={page.latestScreenshotUrl}
                      alt=""
                      className="h-16 w-24 shrink-0 rounded border border-zinc-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded border border-dashed border-zinc-200 text-xs text-zinc-400">
                      No shot
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-medium">{page.label || page.url}</p>
                    <p className="truncate text-xs text-zinc-500">{page.competitor_name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {page.is_active ? "Active" : "Inactive"} · {page.snapshotCount} shots
                    </p>
                    <p className="text-xs text-zinc-400">{formatDate(page.latestTakenAt)}</p>
                    {page.auto_detected_from ? (
                      <p className="text-xs text-zinc-400">Auto: {page.auto_detected_from}</p>
                    ) : null}
                  </div>
                </div>
                <a
                  href={page.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block truncate text-xs text-sky-600 hover:underline"
                >
                  {page.url}
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-700">AI usage</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">Ad + organic preview AI (this month)</dt>
              <dd>
                {detail.usage.adPreviewAnalyses} / {formatLimit(detail.limits.maxAdPreviewAnalysesPerMonth)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Email intelligence AI (this month)</dt>
              <dd>
                {detail.usage.emailAiAnalyses} / {formatLimit(detail.limits.maxEmailAiAnalysesPerMonth)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Cached ad analyses</dt>
              <dd>{detail.inventory.adPreviewCacheCount}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Cached organic post analyses</dt>
              <dd>{detail.inventory.organicPreviewCacheCount}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Organic insights generated</dt>
              <dd>{detail.inventory.organicInsightsCount}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Strategy overviews</dt>
              <dd>{detail.inventory.strategyOverviews}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-700">Email activity</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">Active trackers</dt>
              <dd>
                {detail.email.activeTrackers} / {formatLimit(detail.email.trackerLimit)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Inbound competitor emails</dt>
              <dd>
                {detail.email.inboundCount} received · {detail.email.analyzedCount} AI-analyzed
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Saved emails</dt>
              <dd>{detail.email.savedCount}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Last inbound</dt>
              <dd>{formatDate(detail.email.lastReceivedAt)}</dd>
            </div>
          </dl>
          {detail.email.trackers.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-zinc-600">
              {detail.email.trackers.map((t) => (
                <li key={t.id}>
                  {t.tracking_address} · {competitorNameById.get(t.competitor_id) ?? t.competitor_id}
                  {t.is_active ? "" : " (inactive)"}
                </li>
              ))}
            </ul>
          ) : null}
          {detail.email.recentInbound.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-medium text-zinc-500">Recent inbound</p>
              <ul className="mt-1 space-y-1 text-xs">
                {detail.email.recentInbound.map((e, i) => (
                  <li key={`${e.received_at}-${i}`}>
                    <span className="text-zinc-700">{e.subject ?? "(no subject)"}</span>
                    <span className="text-zinc-400"> · {formatDate(e.received_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-700">Intelligence delivery</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          <div className="text-sm">
            <h3 className="font-medium text-zinc-700">Autopilot</h3>
            {detail.intelligence.autopilot.configured ? (
              <dl className="mt-2 space-y-1 text-xs">
                <div>
                  <dt className="text-zinc-500">Enabled</dt>
                  <dd>{detail.intelligence.autopilot.enabled ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Watch / Report / Brief</dt>
                  <dd>
                    {detail.intelligence.autopilot.watch_enabled ? "Watch" : "—"} /{" "}
                    {detail.intelligence.autopilot.report_enabled ? "Report" : "—"} /{" "}
                    {detail.intelligence.autopilot.brief_enabled ? "Brief" : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Slack</dt>
                  <dd>{detail.intelligence.autopilot.slackConnected ? "Connected" : "Not connected"}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">Not configured.</p>
            )}
            {detail.intelligence.autopilot.recentOutputs.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs">
                {detail.intelligence.autopilot.recentOutputs.map((o, i) => (
                  <li key={`ap-${i}`}>
                    {o.output_type} · {o.status} · {formatDate(o.sent_at)}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="text-sm">
            <h3 className="font-medium text-zinc-700">Rival Agent</h3>
            {detail.intelligence.agent.configured ? (
              <dl className="mt-2 space-y-1 text-xs">
                <div>
                  <dt className="text-zinc-500">Enabled</dt>
                  <dd>{detail.intelligence.agent.enabled ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Weekly brief</dt>
                  <dd>{detail.intelligence.agent.weekly_brief_enabled ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Channels</dt>
                  <dd>{formatChannels(detail.intelligence.agent.channels)}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">Not configured.</p>
            )}
            {detail.intelligence.agent.recentMessages.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs">
                {detail.intelligence.agent.recentMessages.map((m, i) => (
                  <li key={`ag-${i}`}>
                    {m.subject ?? "(no subject)"} · {m.status} · {formatDate(m.sent_at)}
                    {m.channels_delivered.length > 0 ? ` · ${m.channels_delivered.join(", ")}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="text-sm">
            <h3 className="font-medium text-zinc-700">MCP (Claude / ChatGPT)</h3>
            <dl className="mt-2 space-y-1 text-xs">
              <div>
                <dt className="text-zinc-500">Active API keys</dt>
                <dd>{detail.intelligence.mcp.activeKeys}</dd>
              </div>
            </dl>
            {detail.intelligence.mcp.keys.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs">
                {detail.intelligence.mcp.keys.map((k, i) => (
                  <li key={`mcp-${i}`}>
                    {k.label || "Key"} ({k.key_hint}) · last used {formatDate(k.last_used_at)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">No active MCP keys.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-700">Quotes</h2>
        {data.quotes.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No quotes yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100">
            {data.quotes.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <span className="font-medium">{q.status}</span>
                  <span className="ml-2 text-zinc-500">
                    {formatQuotePrice(q.price_cents, q.currency)} / {q.billing_period}
                  </span>
                </div>
                {q.status === "draft" ? (
                  <button
                    type="button"
                    onClick={() => void sendQuote(q.id)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
                  >
                    Send & copy link
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-red-200 bg-red-50/50 p-4">
        <h2 className="text-sm font-semibold text-red-900">Danger zone</h2>
        <p className="mt-2 text-sm text-red-800">
          Permanently delete this user, their Polar billing profile, and all workspace data. This cannot be
          undone.
        </p>
        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => {
              setShowDeleteConfirm(true);
              setDeleteConfirmText("");
              setDeleteError(null);
            }}
            className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-100"
          >
            Delete user
          </button>
        ) : (
          <div className="mt-3 max-w-md space-y-3">
            <label className="block text-sm text-red-900">
              Type <span className="font-mono font-semibold">DELETE</span> to confirm
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="mt-1 w-full rounded-lg border border-red-300 bg-white px-3 py-2 font-mono text-sm"
                autoComplete="off"
              />
            </label>
            {deleteError ? <p className="text-sm text-red-700">{deleteError}</p> : null}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={deleting || deleteConfirmText !== "DELETE"}
                onClick={() => void deleteUser()}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Permanently delete"}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                  setDeleteError(null);
                }}
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
