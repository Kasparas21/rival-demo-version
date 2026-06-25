"use client";

import {
  AlertCircle,
  Download,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Target,
  MousePointerClick,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  angleBadgeClass,
  buildEmailTypeFilterOptions,
  EMAIL_TYPE_FILTER_ALL,
  emailFromLabel,
  emailListPreview,
  emailMatchesTypeFilter,
  emailTypeBadgeClass,
  type EmailTypeFilter,
  formatEmailType,
  formatRelativeTime,
  parseOffers,
} from "./email-intelligence-ui";
import { EmailInboxSkeleton } from "./EmailMarketingSkeleton";

type InboxListResponse = {
  emails?: CompetitorEmailRow[];
  nextCursor?: string | null;
  emailCount?: number;
  searchQuery?: string | null;
  error?: string;
};

type EmailDetailResponse = {
  email?: CompetitorEmailRow;
  error?: string;
};

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

function listItemStatusClass(email: CompetitorEmailRow): string {
  if (email.ai_processed_at) return "bg-emerald-500";
  if (emailAnalysisFailed(email)) return "bg-red-500";
  return "bg-amber-400";
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
  selected,
  onSelect,
}: {
  email: CompetitorEmailRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const preview = emailListPreview(email);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full border-b border-slate-100/90 px-4 py-3.5 text-left transition-colors",
        selected
          ? "bg-indigo-50/80 ring-1 ring-inset ring-indigo-200/50"
          : "hover:bg-white/70",
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", listItemStatusClass(email))}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[13px] font-semibold text-slate-900">
              {email.subject?.trim() || "(no subject)"}
            </p>
            <span className="shrink-0 text-[11px] text-slate-400 tabular-nums">
              {email.received_at ? formatRelativeTime(email.received_at) : ""}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[12px] text-slate-500">
            {email.from_name || email.from_email || "Unknown"}
          </p>
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-slate-600">
            {preview}
          </p>
          {email.email_type ? (
            <span
              className={cn(
                "mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                emailTypeBadgeClass(email.email_type),
              )}
            >
              {formatEmailType(email.email_type)}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function AiInsightPanel({
  email,
  competitorId,
  onRetryComplete,
}: {
  email: CompetitorEmailRow;
  competitorId: string;
  onRetryComplete: (updated: CompetitorEmailRow) => void;
}) {
  const offers = parseOffers(email.ai_offers);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const failed = emailAnalysisFailed(email);
  const pending = emailAnalysisPending(email);

  const retryAnalysis = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      const res = await fetch(`/api/email-trackers/${competitorId}/retry-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_id: email.id }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; quotaExceeded?: boolean };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Retry failed");
      }
      const detailRes = await fetch(
        `/api/email-trackers/${competitorId}?email_id=${encodeURIComponent(email.id)}`,
      );
      const detail = (await detailRes.json()) as EmailDetailResponse;
      if (detail.email) {
        onRetryComplete(detail.email);
      }
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetrying(false);
    }
  };

  if (failed) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4">
        <div className="flex items-center gap-2 text-[13px] font-medium text-red-800">
          <AlertCircle className="h-4 w-4" />
          Analysis failed
        </div>
        <p className="mt-2 text-[12px] text-red-700/90">
          {email.ai_analysis_error ?? "Could not analyze this email after several attempts."}
        </p>
        {retryError ? (
          <p className="mt-2 text-[12px] font-medium text-red-800">{retryError}</p>
        ) : null}
        <button
          type="button"
          onClick={() => void retryAnalysis()}
          disabled={retrying}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-900 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-red-950 disabled:opacity-60"
        >
          {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Retry analysis
        </button>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/50 p-4">
        <div className="flex items-center gap-2 text-[13px] font-medium text-indigo-800">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing email with AI…
        </div>
        <p className="mt-2 text-[12px] text-indigo-700/80">
          Summary, offers, and marketing angle will appear shortly. This usually takes under a
          minute.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/40 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-indigo-700">
            AI analysis
          </p>
          <p className="text-[12px] text-slate-500">Competitive intelligence summary</p>
        </div>
      </div>

      {email.ai_summary ? (
        <p className="mt-3 text-[13px] leading-relaxed text-slate-800">{email.ai_summary}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {email.email_type ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize",
              emailTypeBadgeClass(email.email_type),
            )}
          >
            <Tag className="h-3 w-3" />
            {formatEmailType(email.email_type)}
          </span>
        ) : null}
        {email.ai_angle ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ring-1",
              angleBadgeClass(email.ai_angle),
            )}
          >
            <Target className="h-3 w-3" />
            {email.ai_angle.replace(/_/g, " ")}
          </span>
        ) : null}
        {email.esp_detected && email.esp_detected !== "Unknown" ? (
          <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
            {email.esp_detected}
          </span>
        ) : null}
      </div>

      {offers.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Offers</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {offers.map((offer, i) => (
              <span
                key={`${offer.type}-${offer.value}-${i}`}
                className={cn(
                  alertGlassChipBaseClass,
                  "border-emerald-200/80 bg-emerald-50/95 text-emerald-900",
                )}
              >
                {offer.value}
                {offer.code ? ` · ${offer.code}` : ""}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {email.ai_cta ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5">
          <MousePointerClick className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
              Main CTA
            </p>
            <p className="text-[13px] font-medium text-slate-800">{email.ai_cta}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmailDetailPane({
  email,
  competitorId,
  onEmailUpdated,
}: {
  email: CompetitorEmailRow;
  competitorId: string;
  onEmailUpdated: (updated: CompetitorEmailRow) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-[17px] font-semibold leading-snug text-slate-900">
          {email.subject?.trim() || "(no subject)"}
        </h3>
        <p className="mt-1 text-[12px] text-slate-500">
          {emailFromLabel(email)}
          {email.received_at ? ` · ${formatRelativeTime(email.received_at)}` : null}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <AiInsightPanel
          email={email}
          competitorId={competitorId}
          onRetryComplete={onEmailUpdated}
        />

        <div className="mt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
            Email preview
          </p>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {email.html_body ? (
              <iframe
                title={email.subject ?? "Email preview"}
                sandbox=""
                srcDoc={email.html_body}
                className="h-[min(520px,55vh)] w-full border-0 bg-white"
              />
            ) : (
              <pre className="max-h-[min(520px,55vh)] overflow-auto whitespace-pre-wrap p-4 text-[12px] leading-relaxed text-slate-700">
                {email.plain_text || "No body content"}
              </pre>
            )}
          </div>
        </div>
      </div>
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
  const [emails, setEmails] = useState<CompetitorEmailRow[]>([]);
  const [emailCount, setEmailCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialEmailId);
  const [selectedEmail, setSelectedEmail] = useState<CompetitorEmailRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mobileShowDetail, setMobileShowDetail] = useState(Boolean(initialEmailId));
  const [typeFilter, setTypeFilter] = useState<EmailTypeFilter>(EMAIL_TYPE_FILTER_ALL);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const initialSyncDone = useRef(false);

  const mergeEmailInList = useCallback((updated: CompetitorEmailRow) => {
    setEmails((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
    setSelectedEmail(updated);
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
        setEmails(next);
        setNextCursor(data.nextCursor ?? null);
        setEmailCount(data.emailCount ?? next.length);
        setSelectedId((prev) => {
          if (prev && next.some((e) => e.id === prev)) return prev;
          if (initialEmailId && next.some((e) => e.id === initialEmailId)) return initialEmailId;
          return next[0]?.id ?? null;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load emails");
      } finally {
        if (!opts?.background) {
          setLoading(false);
        }
        setSyncing(false);
      }
    },
    [competitorId, searchQuery, initialEmailId],
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

  const loadEmailDetail = useCallback(
    async (emailId: string) => {
      setDetailLoading(true);
      try {
        const res = await fetch(
          `/api/email-trackers/${competitorId}?email_id=${encodeURIComponent(emailId)}`,
        );
        const data = (await res.json()) as EmailDetailResponse;
        if (!res.ok || !data.email) {
          throw new Error(data.error ?? "Failed to load email");
        }
        setSelectedEmail(data.email);
        mergeEmailInList(data.email);
      } catch {
        setSelectedEmail((prev) => (prev?.id === emailId ? prev : null));
      } finally {
        setDetailLoading(false);
      }
    },
    [competitorId, mergeEmailInList],
  );

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
    setSelectedId(initialEmailId);
    setMobileShowDetail(true);
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

  useEffect(() => {
    if (!selectedId) {
      setSelectedEmail(null);
      return;
    }
    void loadEmailDetail(selectedId);
  }, [selectedId, loadEmailDetail]);

  const typeFilterOptions = useMemo(() => buildEmailTypeFilterOptions(emails), [emails]);

  const filteredEmails = useMemo(
    () => emails.filter((email) => emailMatchesTypeFilter(email, typeFilter)),
    [emails, typeFilter],
  );

  useEffect(() => {
    if (typeFilter === EMAIL_TYPE_FILTER_ALL) return;
    const stillValid = typeFilterOptions.some((option) => option.id === typeFilter);
    if (!stillValid) {
      setTypeFilter(EMAIL_TYPE_FILTER_ALL);
    }
  }, [typeFilter, typeFilterOptions]);

  useEffect(() => {
    setSelectedId((prev) => {
      if (prev && filteredEmails.some((email) => email.id === prev)) return prev;
      return filteredEmails[0]?.id ?? null;
    });
  }, [filteredEmails, typeFilter]);

  const isFiltered = typeFilter !== EMAIL_TYPE_FILTER_ALL;
  const isSearching = searchQuery.length > 0;
  const activeFilterLabel =
    typeFilterOptions.find((option) => option.id === typeFilter)?.label ?? "All";
  const totalCount = emailCount || emails.length;

  if (loading) {
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
            {isSearching
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

      <div className="grid min-h-[min(640px,72vh)] grid-cols-1 lg:grid-cols-[minmax(260px,320px)_1fr]">
        <div
          className={cn(
            "max-h-[min(640px,72vh)] overflow-y-auto border-b border-slate-100 bg-slate-50/40 lg:border-b-0 lg:border-r",
            mobileShowDetail ? "hidden lg:block" : "block",
          )}
        >
          {filteredEmails.length === 0 ? (
            <div className="px-4 py-10 text-center">
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
            <>
              {filteredEmails.map((email) => (
                <EmailListItem
                  key={email.id}
                  email={email}
                  selected={email.id === selectedId}
                  onSelect={() => {
                    setSelectedId(email.id);
                    setMobileShowDetail(true);
                  }}
                />
              ))}
              {nextCursor && !isFiltered && !isSearching ? (
                <div className="border-t border-slate-100 p-3">
                  <button
                    type="button"
                    onClick={() => void loadOlderEmails()}
                    disabled={loadingOlder}
                    className="w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-[12px] font-semibold text-slate-700 transition hover:bg-white disabled:opacity-60"
                  >
                    {loadingOlder ? "Loading…" : "Load older emails"}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div
          className={cn(
            "min-h-[360px] bg-white/50",
            mobileShowDetail ? "block" : "hidden lg:block",
          )}
        >
          {selectedEmail ? (
            <>
              <button
                type="button"
                className="border-b border-slate-100 px-4 py-2 text-[12px] font-semibold text-indigo-700 lg:hidden"
                onClick={() => setMobileShowDetail(false)}
              >
                ← Back to inbox
              </button>
              {detailLoading && !selectedEmail.html_body ? (
                <div className="flex h-full items-center justify-center p-8 text-[13px] text-slate-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading preview…
                </div>
              ) : (
                <EmailDetailPane
                  email={selectedEmail}
                  competitorId={competitorId}
                  onEmailUpdated={mergeEmailInList}
                />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-[13px] text-slate-500">
              Select an email to view analysis and preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
