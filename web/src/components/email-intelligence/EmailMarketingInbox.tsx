"use client";

import {
  Download,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Search,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  alertGlassChipActiveClass,
  alertGlassChipBaseClass,
  alertGlassChipInactiveClass,
  alertGlassPanelClass,
  alertGlassShellClass,
} from "@/components/competitor/alerts/alert-ui-styles";
import { MAX_AI_ANALYSIS_ATTEMPTS } from "@/lib/email-intelligence/constants";
import type { CompetitorEmailRow } from "@/lib/email-intelligence/types";
import { cn } from "@/lib/utils";

import {
  buildEmailTypeFilterOptions,
  EMAIL_TYPE_FILTER_ALL,
  emailListPreview,
  emailMatchesTypeFilter,
  emailTypeBadgeClass,
  type EmailTypeFilter,
  formatEmailType,
  formatRelativeTime,
  mergeEmailRowUpdate,
} from "./email-intelligence-ui";
import { EmailDetailDrawer } from "./EmailDetailDrawer";
import { EmailInboxListSkeleton, EmailInboxSkeleton } from "./EmailMarketingSkeleton";
import { EmailSaveButton } from "./EmailSaveButton";
import { useSavedEmailsStatus } from "@/lib/saved-emails/use-saved-emails";

type InboxListResponse = {
  emails?: CompetitorEmailRow[];
  nextCursor?: string | null;
  emailCount?: number;
  searchQuery?: string | null;
  error?: string;
};

/** Inbox list: show this many emails before "Show more". */
const EMAIL_INBOX_LIST_INITIAL = 5;

function isTabVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

function emailAnalysisFailed(email: CompetitorEmailRow): boolean {
  return Boolean(
    email.ai_analysis_error ||
      (!email.ai_processed_at && (email.ai_analysis_attempts ?? 0) >= MAX_AI_ANALYSIS_ATTEMPTS),
  );
}

function emailAnalysisPending(email: CompetitorEmailRow): boolean {
  return !email.ai_processed_at && !emailAnalysisFailed(email);
}

function TypeFilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        alertGlassChipBaseClass,
        "shrink-0 capitalize",
        active ? alertGlassChipActiveClass : alertGlassChipInactiveClass,
      )}
    >
      {children}
    </button>
  );
}

function EmailListItem({
  email,
  onSelect,
  isSaved,
  onToggleSave,
  saveDisabled,
}: {
  email: CompetitorEmailRow;
  onSelect: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
  saveDisabled?: boolean;
}) {
  const preview = emailListPreview(email);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-sm transition-all hover:border-slate-300 hover:shadow">
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <p className="truncate text-[13px] font-semibold text-slate-900">
          {email.subject?.trim() || "(no subject)"}
        </p>
        <p className="truncate text-[12px] text-slate-500">
          {email.from_name || email.from_email || "Unknown"}
        </p>
        {preview ? (
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-slate-600">{preview}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {email.email_type ? (
            <span
              className={cn(
                "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                emailTypeBadgeClass(email.email_type),
              )}
            >
              {formatEmailType(email.email_type)}
            </span>
          ) : null}
          {email.received_at ? (
            <span className="text-[11px] text-slate-400">{formatRelativeTime(email.received_at)}</span>
          ) : null}
        </div>
      </button>
      <EmailSaveButton
        compact
        isSaved={isSaved}
        onToggle={onToggleSave}
        disabled={saveDisabled}
        saving={saveDisabled}
      />
    </div>
  );
}

export function EmailMarketingInbox({
  competitorId,
  initialEmailId = null,
  allowCsvExport = false,
}: {
  competitorId: string;
  initialEmailId?: string | null;
  allowCsvExport?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [emails, setEmails] = useState<CompetitorEmailRow[]>([]);
  const [emailCount, setEmailCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerEmailId, setDrawerEmailId] = useState<string | null>(initialEmailId ?? null);
  const [typeFilter, setTypeFilter] = useState<EmailTypeFilter>(EMAIL_TYPE_FILTER_ALL);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [savingEmailId, setSavingEmailId] = useState<string | null>(null);
  const [listExpanded, setListExpanded] = useState(false);
  const initialSyncDone = useRef(false);
  const hasLoadedOnce = useRef(false);

  const setEmailInUrl = useCallback(
    (emailId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (emailId) {
        params.set("email_id", emailId);
      } else {
        params.delete("email_id");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openEmail = useCallback(
    (emailId: string) => {
      setDrawerEmailId(emailId);
      setEmailInUrl(emailId);
    },
    [setEmailInUrl],
  );

  const closeEmail = useCallback(() => {
    setDrawerEmailId(null);
    setEmailInUrl(null);
  }, [setEmailInUrl]);

  const mergeEmailInList = useCallback((updated: CompetitorEmailRow) => {
    setEmails((prev) =>
      prev.map((row) => (row.id === updated.id ? mergeEmailRowUpdate(row, updated) : row)),
    );
  }, []);

  const loadEmails = useCallback(
    async (opts?: { sync?: boolean; analyze?: boolean; background?: boolean; q?: string }) => {
      if (!opts?.background) {
        setLoading(true);
      } else if (opts.sync) {
        setSyncing(true);
      }
      setError(null);
      try {
        const params = new URLSearchParams();
        if (opts?.sync) params.set("sync", "1");
        if (opts?.analyze) params.set("analyze", "1");
        const q = opts?.q ?? searchQuery;
        if (q.trim()) params.set("q", q.trim());
        const qs = params.toString() ? `?${params.toString()}` : "";
        const res = await fetch(`/api/email-trackers/${competitorId}${qs}`);
        const data = (await res.json()) as InboxListResponse;
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load emails");
        }
        const next = data.emails ?? [];
        setEmails((prev) => {
          const prevById = new Map(prev.map((row) => [row.id, row]));
          return next.map((row) => {
            const existing = prevById.get(row.id);
            return existing ? mergeEmailRowUpdate(existing, row) : row;
          });
        });
        setNextCursor(data.nextCursor ?? null);
        setEmailCount(data.emailCount ?? next.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load emails");
      } finally {
        if (!opts?.background) {
          setLoading(false);
          hasLoadedOnce.current = true;
        }
        setSyncing(false);
      }
    },
    [competitorId, searchQuery],
  );

  const loadOlderEmails = useCallback(async () => {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const params = new URLSearchParams({ before: nextCursor });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const res = await fetch(`/api/email-trackers/${competitorId}?${params.toString()}`);
      const data = (await res.json()) as InboxListResponse;
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load older emails");
      }
      const older = data.emails ?? [];
      setEmails((prev) => {
        const ids = new Set(prev.map((e) => e.id));
        return [...prev, ...older.filter((e) => !ids.has(e.id))];
      });
      setNextCursor(data.nextCursor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load older emails");
    } finally {
      setLoadingOlder(false);
    }
  }, [competitorId, nextCursor, loadingOlder, searchQuery]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    if (!initialSyncDone.current) {
      initialSyncDone.current = true;
      void loadEmails({ sync: true, q: searchQuery });
      return;
    }
    void loadEmails({ q: searchQuery });
  }, [searchQuery, loadEmails]);

  const exportCsv = async () => {
    if (!allowCsvExport) return;
    setExporting(true);
    try {
      const res = await fetch("/api/exports/email-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorId }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Export failed");
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/i.exec(cd);
      const filename = match?.[1] ?? `rival-email-export-${Date.now()}.csv`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!initialEmailId) return;
    setDrawerEmailId(initialEmailId);
  }, [initialEmailId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!isTabVisible()) return;
      void loadEmails({ background: true });
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [loadEmails]);

  const hasPendingAnalysis = emails.some((e) => emailAnalysisPending(e));

  useEffect(() => {
    if (!hasPendingAnalysis) return;
    void loadEmails({ analyze: true, background: true });
    const interval = window.setInterval(() => {
      if (!isTabVisible()) return;
      void loadEmails({ analyze: true, background: true });
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [hasPendingAnalysis, loadEmails]);

  const typeFilterOptions = useMemo(() => buildEmailTypeFilterOptions(emails), [emails]);

  const filteredEmails = useMemo(
    () => emails.filter((email) => emailMatchesTypeFilter(email, typeFilter)),
    [emails, typeFilter],
  );

  useEffect(() => {
    setListExpanded(false);
  }, [searchQuery, typeFilter]);

  const visibleEmails = useMemo(() => {
    if (listExpanded) return filteredEmails;
    const slice = filteredEmails.slice(0, EMAIL_INBOX_LIST_INITIAL);
    if (!drawerEmailId || slice.some((email) => email.id === drawerEmailId)) return slice;
    const selected = filteredEmails.find((email) => email.id === drawerEmailId);
    return selected ? [...slice, selected] : slice;
  }, [filteredEmails, listExpanded, drawerEmailId]);

  const hiddenEmailCount = Math.max(0, filteredEmails.length - EMAIL_INBOX_LIST_INITIAL);
  const showListMoreControl = hiddenEmailCount > 0 && !listExpanded;

  const emailIds = useMemo(() => emails.map((row) => row.id), [emails]);
  const { isSaved, toggleSave } = useSavedEmailsStatus(competitorId, emailIds);

  const handleToggleSave = useCallback(
    async (emailId: string) => {
      setSavingEmailId(emailId);
      try {
        await toggleSave(emailId);
      } finally {
        setSavingEmailId(null);
      }
    },
    [toggleSave],
  );

  useEffect(() => {
    if (typeFilter === EMAIL_TYPE_FILTER_ALL) return;
    const stillValid = typeFilterOptions.some((option) => option.id === typeFilter);
    if (!stillValid) {
      setTypeFilter(EMAIL_TYPE_FILTER_ALL);
    }
  }, [typeFilter, typeFilterOptions]);

  useEffect(() => {
    if (!drawerEmailId) return;
    if (!filteredEmails.some((email) => email.id === drawerEmailId)) {
      closeEmail();
    }
  }, [filteredEmails, drawerEmailId, closeEmail]);

  const drawerListEmail = useMemo(
    () => emails.find((email) => email.id === drawerEmailId) ?? null,
    [emails, drawerEmailId],
  );

  const isFiltered = typeFilter !== EMAIL_TYPE_FILTER_ALL;
  const isSearching = searchQuery.length > 0;
  const activeFilterLabel =
    typeFilterOptions.find((option) => option.id === typeFilter)?.label ?? "All";
  const totalCount = emailCount || emails.length;
  const isInitialLoad = loading && !hasLoadedOnce.current;
  const isSearchRefreshing = loading && hasLoadedOnce.current;

  if (isInitialLoad) {
    return <EmailInboxSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
        {error}
        <button
          type="button"
          className="mt-2 block text-[12px] font-semibold underline"
          onClick={() => void loadEmails({ sync: true })}
        >
          Retry
        </button>
      </div>
    );
  }

  if (totalCount === 0 && emails.length === 0) {
    return (
      <div
        className={cn(
          alertGlassPanelClass,
          "flex min-h-[320px] flex-col items-center justify-center px-6 py-14 text-center",
        )}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Inbox className="h-7 w-7 text-slate-300" />
        </div>
        <p className="text-[15px] font-semibold text-slate-800">Inbox is empty</p>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-slate-600">
          Subscribe on the competitor&apos;s site with your tracking address, then use Sync to
          pull in messages.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(alertGlassShellClass, "overflow-hidden")}>
      <div className="flex items-center justify-between border-b border-white/60 bg-white/40 px-4 py-2.5">
        <div className="flex items-center gap-2 text-[12px] font-medium text-slate-600">
          <Mail className="h-3.5 w-3.5" />
          <span>
            {isSearchRefreshing && isSearching ? (
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Searching…
              </span>
            ) : isSearching
              ? `${totalCount} match${totalCount === 1 ? "" : "es"} · “${searchQuery}”`
              : isFiltered
                ? `${filteredEmails.length} of ${totalCount} · ${activeFilterLabel}`
                : `${totalCount} captured email${totalCount === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {allowCsvExport ? (
            <button
              type="button"
              onClick={() => void exportCsv()}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-white/70 hover:text-slate-900 disabled:opacity-50"
            >
              <Download className={cn("h-3.5 w-3.5", exporting && "animate-pulse")} />
              Export
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void loadEmails({ sync: true, background: true })}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-white/70 hover:text-slate-900 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
            Sync
          </button>
        </div>
      </div>

      <div className="border-b border-white/50 bg-white/25 px-4 py-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search subject, sender, offer code…"
            className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2 pl-9 pr-3 text-[12px] text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {typeFilterOptions.length > 1 && !isSearching ? (
        <div className="border-b border-white/50 bg-white/25 px-4 py-2.5">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {typeFilterOptions.map((option) => (
              <TypeFilterChip
                key={option.id}
                active={typeFilter === option.id}
                onClick={() => setTypeFilter(option.id)}
              >
                {option.label}
                <span
                  className={cn(
                    "ml-1.5 tabular-nums",
                    typeFilter === option.id ? "text-white/75" : "text-slate-400",
                  )}
                >
                  {option.count}
                </span>
              </TypeFilterChip>
            ))}
          </div>
        </div>
      ) : null}

      <div className="bg-slate-100/60 p-2">
          {isSearchRefreshing ? (
            <div className="space-y-2">
              <EmailInboxListSkeleton rows={Math.min(Math.max(filteredEmails.length, 3), 6)} />
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-10 text-center shadow-sm">
              <p className="text-[13px] font-medium text-slate-700">
                {isSearching
                  ? `No emails match “${searchQuery}”`
                  : `No ${activeFilterLabel.toLowerCase()} emails`}
              </p>
              <p className="mt-1 text-[12px] text-slate-500">
                Try another type or view all captured emails.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (isSearching) {
                    setSearchInput("");
                    setSearchQuery("");
                  } else {
                    setTypeFilter(EMAIL_TYPE_FILTER_ALL);
                  }
                }}
                className="mt-3 text-[12px] font-semibold text-indigo-700 hover:underline"
              >
                {isSearching ? "Clear search" : "Show all emails"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleEmails.map((email) => (
                <EmailListItem
                  key={email.id}
                  email={email}
                  onSelect={() => openEmail(email.id)}
                  isSaved={isSaved(email.id)}
                  onToggleSave={() => void handleToggleSave(email.id)}
                  saveDisabled={savingEmailId === email.id}
                />
              ))}
              {showListMoreControl ? (
                <button
                  type="button"
                  onClick={() => setListExpanded(true)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-semibold text-indigo-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Show more ({hiddenEmailCount})
                </button>
              ) : null}
              {listExpanded && nextCursor && !isFiltered && !isSearching ? (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => void loadOlderEmails()}
                    disabled={loadingOlder}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {loadingOlder ? "Loading…" : "Load older emails"}
                  </button>
                </div>
              ) : null}
            </div>
          )}
      </div>

      <EmailDetailDrawer
        competitorId={competitorId}
        emailId={drawerEmailId}
        listEmail={drawerListEmail}
        isSaved={drawerEmailId ? isSaved(drawerEmailId) : false}
        saveInFlight={Boolean(drawerEmailId && savingEmailId === drawerEmailId)}
        onToggleSave={
          drawerEmailId ? () => void handleToggleSave(drawerEmailId) : undefined
        }
        onClose={closeEmail}
        onEmailUpdated={mergeEmailInList}
      />
    </div>
  );
}
