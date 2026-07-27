"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  account_suspended?: boolean;
  funnel_stage: string | null;
  last_active_date: string | null;
};

type UsersListResponse = {
  rows?: SnapshotRow[];
  count?: number;
  currentAdminUserId?: string | null;
};

type IdsOnlyResponse = {
  userIds?: string[];
  count?: number;
};

type BulkDeleteFailed = { userId: string; error: string };

const PAGE_SIZE = 100;
const BULK_DELETE_BATCH = 25;

function formatMrr(cents: number): string {
  if (!cents) return "—";
  return `£${(cents / 100).toFixed(0)}/mo`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentAdminUserId, setCurrentAdminUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSummary, setDeleteSummary] = useState<{
    deleted: number;
    failed: BulkDeleteFailed[];
  } | null>(null);
  const [selectAllLoading, setSelectAllLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (filter) params.set("filter", filter);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));
    const res = await fetch(`/api/admin/users?${params.toString()}`);
    const json = (await res.json()) as UsersListResponse;
    setRows(json.rows ?? []);
    setTotalCount(json.count ?? json.rows?.length ?? 0);
    setCurrentAdminUserId(json.currentAdminUserId ?? null);
    setLoading(false);
  }, [q, filter, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setOffset(0);
    setSelectedIds(new Set());
    setSelectAllMatching(false);
  }, [q, filter]);

  const visibleSelectableIds = useMemo(
    () =>
      rows
        .filter((row) => row.user_id !== currentAdminUserId)
        .map((row) => row.user_id),
    [rows, currentAdminUserId],
  );

  const allVisibleSelected =
    visibleSelectableIds.length > 0 &&
    visibleSelectableIds.every((id) => selectedIds.has(id));

  const someVisibleSelected =
    visibleSelectableIds.some((id) => selectedIds.has(id)) && !allVisibleSelected;

  const selectedCount = selectedIds.size;
  const expectedConfirmPhrase = `DELETE ${selectedCount}`;

  const selectedPreview = useMemo(() => {
    const fromRows = rows.filter((row) => selectedIds.has(row.user_id));
    const preview = fromRows.slice(0, 10).map((row) => row.email ?? row.user_id);
    const remaining = selectedCount - preview.length;
    return { preview, remaining };
  }, [rows, selectedIds, selectedCount]);

  function toggleRow(userId: string) {
    setSelectAllMatching(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectAllMatching(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of visibleSelectableIds) next.delete(id);
      } else {
        for (const id of visibleSelectableIds) next.add(id);
      }
      return next;
    });
  }

  async function selectAllMatchingFilter() {
    setSelectAllLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (filter) params.set("filter", filter);
      params.set("idsOnly", "1");
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = (await res.json()) as IdsOnlyResponse;
      const ids = (json.userIds ?? []).filter((id) => id !== currentAdminUserId);
      setSelectedIds(new Set(ids));
      setSelectAllMatching(true);
    } finally {
      setSelectAllLoading(false);
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setSelectAllMatching(false);
  }

  function openDeleteModal() {
    setConfirmPhrase("");
    setDeleteError(null);
    setDeleteSummary(null);
    setDeleteProgress(null);
    setShowDeleteModal(true);
  }

  async function runBulkDelete() {
    if (confirmPhrase.trim() !== expectedConfirmPhrase) {
      setDeleteError(`Type exactly "${expectedConfirmPhrase}" to confirm.`);
      return;
    }

    const userIds = [...selectedIds];
    const batches = chunk(userIds, BULK_DELETE_BATCH);
    setDeleteBusy(true);
    setDeleteError(null);
    setDeleteSummary(null);

    const allDeleted: string[] = [];
    const allFailed: BulkDeleteFailed[] = [];

    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]!;
        const start = i * BULK_DELETE_BATCH + 1;
        const end = Math.min((i + 1) * BULK_DELETE_BATCH, userIds.length);
        setDeleteProgress(`Deleting ${start}–${end} of ${userIds.length}…`);

        const res = await fetch("/api/admin/users/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userIds: batch,
            confirmPhrase: `DELETE ${batch.length}`,
          }),
        });

        const json = (await res.json()) as {
          error?: string;
          deleted?: string[];
          failed?: BulkDeleteFailed[];
        };

        if (!res.ok) {
          setDeleteError(json.error ?? `Delete failed (${res.status})`);
          return;
        }

        allDeleted.push(...(json.deleted ?? []));
        allFailed.push(...(json.failed ?? []));
      }

      setDeleteSummary({ deleted: allDeleted.length, failed: allFailed });
      clearSelection();
      await load();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Bulk delete failed");
    } finally {
      setDeleteBusy(false);
      setDeleteProgress(null);
    }
  }

  const pageStart = totalCount === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + rows.length, totalCount);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < totalCount;

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
            <option value="suspended">Suspended</option>
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

      {selectedCount > 0 ? (
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="text-sm text-red-900">
            <span className="font-semibold">{selectedCount} selected</span>
            {selectAllMatching ? " (all matching filter)" : null}
            {" · "}
            <button type="button" onClick={clearSelection} className="text-red-700 underline hover:text-red-900">
              Clear selection
            </button>
          </div>
          <button
            type="button"
            onClick={openDeleteModal}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-800"
          >
            Delete selected
          </button>
        </div>
      ) : null}

      {!loading && totalCount > rows.length ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-600">
          Showing {rows.length} of {totalCount} users.{" "}
          <button
            type="button"
            onClick={() => void selectAllMatchingFilter()}
            disabled={selectAllLoading}
            className="font-medium text-sky-600 hover:underline disabled:opacity-50"
          >
            {selectAllLoading ? "Loading…" : `Select all ${totalCount} matching this filter`}
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected;
                  }}
                  onChange={toggleAllVisible}
                  disabled={visibleSelectableIds.length === 0}
                  aria-label="Select all on page"
                />
              </th>
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
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                  No users found. Run the admin snapshot cron or open a user to refresh.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isSelf = row.user_id === currentAdminUserId;
                const isSelected = selectedIds.has(row.user_id);
                return (
                  <tr
                    key={row.user_id}
                    className={`border-b border-zinc-50 hover:bg-zinc-50/80 ${isSelected ? "bg-sky-50/50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isSelf}
                        onChange={() => toggleRow(row.user_id)}
                        aria-label={isSelf ? "Your admin account" : `Select ${row.email ?? row.user_id}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {row.email ?? row.user_id}
                        {isSelf ? <span className="ml-2 text-xs text-zinc-500">(you)</span> : null}
                      </div>
                      <div className="text-xs text-zinc-500">{row.company_name ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{row.plan_tier ?? "—"}</div>
                      <div className="text-xs text-zinc-500">
                        {row.account_suspended ? (
                          <span className="text-red-700">suspended</span>
                        ) : (
                          row.billing_status ?? "none"
                        )}
                      </div>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && totalCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600">
          <span>
            Showing {pageStart}–{pageEnd} of {totalCount}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {showDeleteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-red-900">Delete {selectedCount} accounts</h2>
            <p className="mt-2 text-sm text-zinc-600">
              This permanently removes Polar billing, Supabase auth, and all workspace data for each selected user.
              This cannot be undone.
            </p>

            <ul className="mt-4 space-y-1 text-sm text-zinc-700">
              {selectedPreview.preview.map((label) => (
                <li key={label} className="truncate">
                  {label}
                </li>
              ))}
              {selectedPreview.remaining > 0 ? (
                <li className="text-zinc-500">and {selectedPreview.remaining} more…</li>
              ) : null}
            </ul>

            <label className="mt-4 block text-sm font-medium text-zinc-700">
              Type <code className="rounded bg-zinc-100 px-1">{expectedConfirmPhrase}</code> to confirm
              <input
                type="text"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder={expectedConfirmPhrase}
                className="mt-2 w-full rounded-lg border border-red-300 px-3 py-2 text-sm"
              />
            </label>

            {deleteProgress ? <p className="mt-3 text-sm text-zinc-600">{deleteProgress}</p> : null}
            {deleteError ? <p className="mt-3 text-sm text-red-700">{deleteError}</p> : null}
            {deleteSummary ? (
              <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
                <p className="font-medium text-emerald-700">Deleted {deleteSummary.deleted} accounts.</p>
                {deleteSummary.failed.length > 0 ? (
                  <div className="mt-2 text-red-700">
                    <p>{deleteSummary.failed.length} failed:</p>
                    <ul className="mt-1 list-inside list-disc">
                      {deleteSummary.failed.map((f) => (
                        <li key={f.userId}>
                          {f.userId}: {f.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50"
              >
                {deleteSummary ? "Close" : "Cancel"}
              </button>
              {!deleteSummary ? (
                <button
                  type="button"
                  disabled={deleteBusy}
                  onClick={() => void runBulkDelete()}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {deleteBusy ? "Deleting…" : "Confirm delete"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
