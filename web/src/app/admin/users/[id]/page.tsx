"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);

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
          <p className="mt-3 text-xs text-zinc-400">
            Changing the email updates the login email immediately (marked confirmed). Setting a plan overrides
            Polar billing until cleared here, even across Polar webhook syncs.
          </p>
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
              <dd>{data.profile.last_active_date ?? "—"} (streak {data.profile.app_streak_days})</dd>
            </div>
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
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Status</dt>
              <dd>{data.billing.status}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Custom price</dt>
              <dd>{data.billing.customPriceLabel ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-700">Usage ({data.usage.month})</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">Ads scraped</dt>
              <dd>{data.usage.adsScraped}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Scrape ops</dt>
              <dd>
                {data.usage.scrapeOperations} (lifetime {data.usage.lifetimeScrapeOperations})
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Swaps / CSV / AI</dt>
              <dd>
                {data.usage.swapCount} / {data.usage.csvExportCount} / {data.usage.adPreviewAnalyses}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Competitors</dt>
              <dd>{data.competitors.length}</dd>
            </div>
          </dl>
        </section>
      </div>

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

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-700">Competitors</h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {data.competitors.map((c, i) => (
            <li key={`${c.brand_domain}-${i}`} className="rounded-full bg-zinc-100 px-3 py-1">
              {c.name ?? c.brand_domain ?? "—"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
