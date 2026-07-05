"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Mail, X } from "lucide-react";

import type { CompetitorEmailRow } from "@/lib/email-intelligence/types";
import { CHANNEL_EMAIL_THEME } from "@/lib/strategy-overview/map-node-sizing";
import type { EmailChannelNodePayload } from "@/lib/strategy-overview/payload-types";
import {
  emailFromLabel,
  emailListPreview,
  emailTypeBadgeClass,
  formatEmailType,
  formatRelativeTime,
  parseOffers,
} from "@/components/email-intelligence/email-intelligence-ui";

type InboxListResponse = {
  emails?: CompetitorEmailRow[];
  nextCursor?: string | null;
  emailCount?: number;
  error?: string;
};

type Props = {
  open: boolean;
  competitorId: string;
  nodeSummary: EmailChannelNodePayload | null;
  onClose: () => void;
};

export function EmailChannelSheet({ open, competitorId, nodeSummary, onClose }: Props) {
  const [emails, setEmails] = useState<CompetitorEmailRow[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<CompetitorEmailRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const resetAndFetch = useCallback(async () => {
    if (!competitorId.trim()) {
      setErr("Open this competitor from your dashboard to load captured emails.");
      setEmails([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setErr(null);
    setEmails([]);
    setNextCursor(null);
    setSelectedId(null);
    setSelectedEmail(null);
    try {
      const res = await fetch(`/api/email-trackers/${competitorId.trim()}`);
      const data = (await res.json()) as InboxListResponse;
      if (!res.ok) throw new Error(data.error ?? "Failed to load emails");
      const list = data.emails ?? [];
      setEmails(list);
      setTotal(data.emailCount ?? list.length);
      setNextCursor(data.nextCursor ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load emails");
    } finally {
      setLoading(false);
    }
  }, [competitorId]);

  useEffect(() => {
    if (!open) return;
    void resetAndFetch();
  }, [open, resetAndFetch]);

  const loadEmailDetail = useCallback(
    async (emailId: string) => {
      setDetailLoading(true);
      try {
        const res = await fetch(
          `/api/email-trackers/${competitorId}?email_id=${encodeURIComponent(emailId)}`,
        );
        const data = (await res.json()) as { email?: CompetitorEmailRow; error?: string };
        if (!res.ok || !data.email) throw new Error(data.error ?? "Failed to load email");
        setSelectedEmail(data.email);
        setEmails((prev) => prev.map((row) => (row.id === data.email!.id ? { ...row, ...data.email! } : row)));
      } catch {
        setSelectedEmail((prev) => (prev?.id === emailId ? prev : null));
      } finally {
        setDetailLoading(false);
      }
    },
    [competitorId],
  );

  const openEmail = useCallback(
    (emailId: string) => {
      setSelectedId(emailId);
      const cached = emails.find((e) => e.id === emailId) ?? null;
      setSelectedEmail(cached);
      void loadEmailDetail(emailId);
    },
    [emails, loadEmailDetail],
  );

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/email-trackers/${competitorId}?before=${encodeURIComponent(nextCursor)}`,
      );
      const data = (await res.json()) as InboxListResponse;
      if (!res.ok) return;
      const older = data.emails ?? [];
      setEmails((prev) => {
        const ids = new Set(prev.map((e) => e.id));
        return [...prev, ...older.filter((e) => !ids.has(e.id))];
      });
      setNextCursor(data.nextCursor ?? null);
    } finally {
      setLoadingMore(false);
    }
  }, [competitorId, nextCursor, loadingMore]);

  if (!open) return null;

  const summary = nodeSummary;
  const theme = CHANNEL_EMAIL_THEME;
  const showDetail = selectedId != null && selectedEmail != null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal aria-labelledby="email-channel-sheet-title">
      <button type="button" className="absolute inset-0 bg-black/30" aria-label="Close" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-[#f8fafc] shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="border-b border-slate-200 bg-white px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {showDetail ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    setSelectedEmail(null);
                  }}
                  className="mb-2 inline-flex items-center gap-1 text-[12px] font-semibold text-amber-800 hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  All emails
                </button>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Mail className="h-4 w-4" />
                </span>
                <h2 id="email-channel-sheet-title" className="truncate text-[16px] font-semibold text-[#0f172a]">
                  {showDetail
                    ? selectedEmail.subject?.trim() || "(no subject)"
                    : "Email Marketing"}
                </h2>
                {!showDetail ? (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${theme.badge}`}
                  >
                    Capture
                  </span>
                ) : null}
              </div>
              {!showDetail && summary ? (
                <p className="mt-1.5 text-[12px] text-slate-600">
                  {summary.emailCount} emails · ~{summary.emailsPerWeek}/wk
                  {summary.dominantType ? ` · ${summary.dominantType.replace(/_/g, " ")}` : ""}
                </p>
              ) : null}
              {showDetail && selectedEmail ? (
                <p className="mt-1.5 text-[12px] text-slate-600">
                  {emailFromLabel(selectedEmail)}
                  {selectedEmail.received_at
                    ? ` · ${formatRelativeTime(selectedEmail.received_at)}`
                    : null}
                </p>
              ) : null}
            </div>
            <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-50">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {err ? <p className="text-[13px] text-red-600">{err}</p> : null}

          {showDetail && selectedEmail ? (
            <EmailDetailBody email={selectedEmail} loading={detailLoading} />
          ) : loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white animate-pulse">
                  <div className="aspect-[4/5] bg-amber-50/80" />
                  <div className="space-y-2 p-3">
                    <div className="h-3 rounded bg-slate-100" />
                    <div className="h-3 w-2/3 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {emails.map((email) => (
                <EmailSheetCard key={email.id} email={email} onOpen={() => openEmail(email.id)} />
              ))}
            </div>
          )}
        </div>

        {!showDetail && !loading && total > emails.length && nextCursor ? (
          <div className="border-t border-slate-200 bg-white p-4 text-center">
            <p className="mb-2 text-[11px] text-slate-600">
              Showing {emails.length} of {total} captured emails.
            </p>
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void loadMore()}
              className="text-[12px] font-medium text-amber-800 hover:underline"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmailSheetCard({
  email,
  onOpen,
}: {
  email: CompetitorEmailRow;
  onOpen: () => void;
}) {
  const preview = emailListPreview(email);
  const offers = parseOffers(email.ai_offers);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <div className="relative flex aspect-[4/5] flex-col justify-between border-b border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-3">
        <span className="inline-flex w-fit rounded-full bg-amber-600/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm">
          Email
        </span>
        <div className="min-h-0 flex-1 py-2">
          <p className="line-clamp-4 text-[12px] font-semibold leading-snug text-slate-900">
            {email.subject?.trim() || "(no subject)"}
          </p>
          <p className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-slate-600">{preview}</p>
        </div>
        {email.email_type ? (
          <span
            className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[9px] font-semibold capitalize ${emailTypeBadgeClass(email.email_type)}`}
          >
            {formatEmailType(email.email_type)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-[10px] font-medium text-slate-500">
          {emailFromLabel(email)}
          {email.received_at ? ` · ${formatRelativeTime(email.received_at)}` : ""}
        </p>
        {offers.length > 0 ? (
          <p className="line-clamp-2 text-[10px] text-amber-900/80">{offers.join(" · ")}</p>
        ) : null}
        <button
          type="button"
          onClick={onOpen}
          className="mt-auto rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-800 hover:bg-slate-50"
        >
          Open email
        </button>
      </div>
    </article>
  );
}

function EmailDetailBody({
  email,
  loading,
}: {
  email: CompetitorEmailRow;
  loading: boolean;
}) {
  const offers = parseOffers(email.ai_offers);

  return (
    <div className="space-y-4">
      {email.ai_summary ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">AI summary</p>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-800">{email.ai_summary}</p>
        </div>
      ) : null}

      {(email.ai_angle || offers.length > 0 || email.ai_cta) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {email.ai_angle ? (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Angle</p>
              <p className="mt-1 text-[12px] font-medium text-slate-800">{email.ai_angle}</p>
            </div>
          ) : null}
          {offers.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Offers</p>
              <p className="mt-1 text-[12px] font-medium text-slate-800">{offers.join(" · ")}</p>
            </div>
          ) : null}
        </div>
      )}

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Email preview</p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading && !email.html_body ? (
            <div className="flex h-48 items-center justify-center text-[13px] text-slate-500">Loading preview…</div>
          ) : email.html_body ? (
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
  );
}
