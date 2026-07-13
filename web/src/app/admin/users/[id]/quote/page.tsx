"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { PlanLimits } from "@/lib/billing/plan-limits";
import { defaultCustomQuoteLimits } from "@/lib/billing/custom-quotes";

type UserUsage = {
  usage: {
    adsScraped: number;
    swapCount: number;
    competitorCount?: number;
  };
  competitors: unknown[];
};

export default function AdminCreateQuotePage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const router = useRouter();
  const defaults = defaultCustomQuoteLimits();

  const [priceGbp, setPriceGbp] = useState("85");
  const [trialDays, setTrialDays] = useState("7");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [salesNotes, setSalesNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [limits, setLimits] = useState<PlanLimits>(defaults);
  const [usageHint, setUsageHint] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const loadUsage = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${userId}`);
    const json = (await res.json()) as UserUsage & {
      competitors?: { length: number };
      usage?: { adsScraped: number; swapCount: number };
    };
    const compCount = Array.isArray(json.competitors) ? json.competitors.length : 0;
    setUsageHint(
      `Current usage: ${compCount} competitors, ${json.usage?.adsScraped ?? 0} ads scraped this month, ${json.usage?.swapCount ?? 0} swaps.`,
    );
    setLimits((prev) => ({
      ...prev,
      maxWatchedCompetitors: Math.max(prev.maxWatchedCompetitors, compCount || defaults.maxWatchedCompetitors),
    }));
  }, [userId, defaults.maxWatchedCompetitors]);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  function updateLimit<K extends keyof PlanLimits>(key: K, value: PlanLimits[K]) {
    setLimits((prev) => ({ ...prev, [key]: value }));
  }

  async function saveDraft(send: boolean) {
    setSaving(true);
    setError(null);
    const priceCents = Math.round(parseFloat(priceGbp) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 50) {
      setError("Enter a valid price (minimum £0.50).");
      setSaving(false);
      return;
    }

    const createRes = await fetch("/api/admin/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        priceCents,
        currency: "gbp",
        billingPeriod,
        trialDays: Number(trialDays) || 0,
        limits,
        salesNotes,
        internalNotes,
      }),
    });
    const created = (await createRes.json()) as { quote?: { id: string }; error?: string };
    if (!createRes.ok || !created.quote?.id) {
      setError(created.error ?? "Failed to create quote");
      setSaving(false);
      return;
    }

    if (send) {
      const sendRes = await fetch(`/api/admin/quotes/${created.quote.id}/send`, { method: "POST" });
      const sent = (await sendRes.json()) as { checkoutUrl?: string; error?: string };
      if (!sendRes.ok) {
        setError(sent.error ?? "Failed to send quote");
        setSaving(false);
        return;
      }
      if (sent.checkoutUrl) {
        setCheckoutUrl(sent.checkoutUrl);
        await navigator.clipboard.writeText(sent.checkoutUrl);
      }
    }

    setSaving(false);
    router.push(`/admin/users/${userId}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/admin/users/${userId}`} className="text-sm text-zinc-500 hover:text-zinc-700">
          ← User
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Create custom quote</h1>
        <p className="mt-1 text-sm text-zinc-500">{usageHint}</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {checkoutUrl ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Checkout link copied: {checkoutUrl}
        </p>
      ) : null}

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Pricing</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="text-zinc-500">Monthly price (£)</span>
            <input
              value={priceGbp}
              onChange={(e) => setPriceGbp(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-zinc-500">Billing period</span>
            <select
              value={billingPeriod}
              onChange={(e) => setBillingPeriod(e.target.value as "monthly" | "annual")}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            >
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="text-zinc-500">Trial days</span>
            <input
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Limits</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <LimitField
            label="Max competitors"
            value={limits.maxWatchedCompetitors}
            onChange={(v) => updateLimit("maxWatchedCompetitors", v)}
          />
          <LimitField
            label="Ads processed / month"
            value={limits.maxAdsProcessedPerMonth}
            onChange={(v) => updateLimit("maxAdsProcessedPerMonth", v)}
          />
          <LimitField
            label="Swaps / month"
            value={limits.maxSwapsPerMonth}
            onChange={(v) => updateLimit("maxSwapsPerMonth", v)}
          />
          <LimitField
            label="CSV exports / month"
            value={limits.csvExportsPerMonth}
            onChange={(v) => updateLimit("csvExportsPerMonth", v)}
          />
          <LimitField
            label="Manual refreshes / month"
            value={limits.manualRefreshPerMonth}
            onChange={(v) => updateLimit("manualRefreshPerMonth", v)}
          />
          <LimitField
            label="Ad preview AI / month"
            value={limits.maxAdPreviewAnalysesPerMonth ?? 0}
            onChange={(v) => updateLimit("maxAdPreviewAnalysesPerMonth", v)}
          />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <Toggle
            label="CSV export"
            checked={limits.allowCsvExport}
            onChange={(v) => updateLimit("allowCsvExport", v)}
          />
          <Toggle
            label="Manual refresh"
            checked={limits.allowManualRefresh}
            onChange={(v) => updateLimit("allowManualRefresh", v)}
          />
          <Toggle
            label="Auto refresh"
            checked={limits.allowAutoRefresh}
            onChange={(v) => updateLimit("allowAutoRefresh", v)}
          />
          <Toggle
            label="Alert rules"
            checked={limits.allowAlertRules}
            onChange={(v) => updateLimit("allowAlertRules", v)}
          />
          <Toggle
            label="Email marketing"
            checked={limits.allowEmailMarketing}
            onChange={(v) => updateLimit("allowEmailMarketing", v)}
          />
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Notes</h2>
        <textarea
          value={salesNotes}
          onChange={(e) => setSalesNotes(e.target.value)}
          placeholder="Sales call notes"
          rows={3}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <textarea
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          placeholder="Internal notes"
          rows={2}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveDraft(false)}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
        >
          Save draft
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveDraft(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white"
        >
          Send & copy checkout link
        </button>
      </div>
    </div>
  );
}

function LimitField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="text-sm">
      <span className="text-zinc-500">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
