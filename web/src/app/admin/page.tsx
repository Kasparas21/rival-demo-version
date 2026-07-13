"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type SnapshotRow = {
  user_id: string;
  email: string | null;
  company_name: string | null;
  plan_tier: string | null;
  billing_status: string | null;
  custom_quote_status: string | null;
  competitor_count: number;
  ads_scraped_month: number;
  mrr_cents: number;
  days_inactive: number;
  scrape_paused: boolean;
  funnel_stage: string | null;
  last_active_date: string | null;
};

function formatMrr(cents: number): string {
  if (!cents) return "—";
  return `£${(cents / 100).toFixed(0)}/mo`;
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (filter) params.set("filter", filter);
    const res = await fetch(`/api/admin/users?${params.toString()}`);
    const json = (await res.json()) as { rows?: SnapshotRow[] };
    setRows(json.rows ?? []);
    setLoading(false);
  }, [q, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <div className="flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email or company"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="active">Active billing</option>
            <option value="quote_sent">Quote sent</option>
            <option value="inactive">Inactive 7+ days</option>
            <option value="scrape_paused">Scrape paused</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Quote</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">Activity</th>
              <th className="px-4 py-3">MRR</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  No users found. Run the admin snapshot cron or open a user to refresh.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.user_id} className="border-b border-zinc-50 hover:bg-zinc-50/80">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.email ?? row.user_id}</div>
                    <div className="text-xs text-zinc-500">{row.company_name ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{row.plan_tier ?? "—"}</div>
                    <div className="text-xs text-zinc-500">{row.billing_status ?? "none"}</div>
                  </td>
                  <td className="px-4 py-3">{row.custom_quote_status ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div>{row.competitor_count} competitors</div>
                    <div className="text-xs text-zinc-500">{row.ads_scraped_month} ads/mo</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{row.last_active_date ?? "—"}</div>
                    <div className="text-xs text-zinc-500">
                      {row.scrape_paused ? "scrape paused" : `${row.days_inactive}d inactive`}
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatMrr(row.mrr_cents)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/users/${row.user_id}`} className="text-sky-600 hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
