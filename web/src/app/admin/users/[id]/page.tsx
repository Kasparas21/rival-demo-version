"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { formatQuotePrice } from "@/lib/billing/custom-quotes";

type UserDetail = {
  profile: {
    email: string | null;
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

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

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
        <Link
          href={`/admin/users/${userId}/quote`}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white"
        >
          Create quote
        </Link>
      </div>

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
              <dd>{data.billing.planName}</dd>
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
