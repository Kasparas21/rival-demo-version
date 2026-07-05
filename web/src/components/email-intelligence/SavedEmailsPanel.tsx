"use client";

import { useCallback, useEffect, useState } from "react";
import { Bookmark } from "lucide-react";

import { EmailDetailDrawer } from "./EmailDetailDrawer";
import { EmailSaveButton } from "./EmailSaveButton";
import {
  emailTypeBadgeClass,
  formatEmailType,
  formatRelativeTime,
} from "./email-intelligence-ui";
import type { SavedEmailRow } from "@/lib/saved-emails/snapshot";
import { cn } from "@/lib/utils";

type SavedEmailsApiResponse = {
  ok?: boolean;
  savedEmails?: SavedEmailRow[];
  error?: string;
};

export function SavedEmailsPanel({
  competitorId,
  competitorName,
}: {
  competitorId: string;
  competitorName: string;
}) {
  const [savedEmails, setSavedEmails] = useState<SavedEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [drawerEmailId, setDrawerEmailId] = useState<string | null>(null);
  const [drawerSavedId, setDrawerSavedId] = useState<string | null>(null);

  const loadSaved = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/saved-emails?competitorId=${encodeURIComponent(competitorId)}`, {
        credentials: "include",
      });
      const json = (await res.json()) as SavedEmailsApiResponse;
      if (!json.ok) {
        throw new Error(json.error ?? "Failed to load saved emails");
      }
      setSavedEmails(json.savedEmails ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saved emails");
    } finally {
      setLoading(false);
    }
  }, [competitorId]);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved, revision]);

  const handleUnsave = useCallback(
    async (savedId: string) => {
      const res = await fetch(`/api/saved-emails/${savedId}`, { method: "DELETE", credentials: "include" });
      const json = (await res.json()) as { ok?: boolean };
      if (json.ok) {
        setSavedEmails((prev) => prev.filter((row) => row.id !== savedId));
        if (drawerSavedId === savedId) {
          setDrawerEmailId(null);
          setDrawerSavedId(null);
        }
        setRevision((n) => n + 1);
      }
    },
    [drawerSavedId],
  );

  const openSaved = useCallback((row: SavedEmailRow) => {
    setDrawerSavedId(row.id);
    setDrawerEmailId(row.source_competitor_email_id ?? row.id);
  }, []);

  if (loading && savedEmails.length === 0 && !error) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
        {error}
        <button type="button" className="mt-2 block text-[12px] font-semibold underline" onClick={() => void loadSaved()}>
          Retry
        </button>
      </div>
    );
  }

  if (savedEmails.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-6 py-14 text-center shadow-sm">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
          <Bookmark className="h-7 w-7 text-slate-300" />
        </div>
        <p className="text-[15px] font-semibold text-slate-800">No saved emails yet</p>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-slate-600">
          Save emails from the inbox to keep copies of standout campaigns from {competitorName}.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 p-2">
        {savedEmails.map((row) => (
          <div
            key={row.id}
            className="flex items-start gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-sm"
          >
            <button
              type="button"
              onClick={() => openSaved(row)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-[13px] font-semibold text-slate-900">
                {row.subject?.trim() || "(no subject)"}
              </p>
              <p className="truncate text-[12px] text-slate-500">
                {row.from_name || row.from_email || "Unknown"}
              </p>
              {row.ai_summary ? (
                <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-slate-600">
                  {row.ai_summary}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {row.email_type ? (
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                      emailTypeBadgeClass(row.email_type),
                    )}
                  >
                    {formatEmailType(row.email_type)}
                  </span>
                ) : null}
                {row.received_at ? (
                  <span className="text-[11px] text-slate-400">
                    {formatRelativeTime(row.received_at)}
                  </span>
                ) : null}
                <span className="text-[11px] text-slate-400">
                  {row.received_at ? "· " : ""}
                  Saved {formatRelativeTime(row.saved_at)}
                </span>
              </div>
            </button>
            <EmailSaveButton
              compact
              isSaved
              onToggle={() => void handleUnsave(row.id)}
            />
          </div>
        ))}
      </div>

      <EmailDetailDrawer
        competitorId={competitorId}
        emailId={drawerEmailId}
        savedEmailId={drawerSavedId}
        isSaved={Boolean(drawerSavedId)}
        onToggleSave={
          drawerSavedId ? () => void handleUnsave(drawerSavedId) : undefined
        }
        onClose={() => {
          setDrawerEmailId(null);
          setDrawerSavedId(null);
        }}
        onEmailUpdated={() => {}}
        onUnsaved={() => setRevision((n) => n + 1)}
      />
    </>
  );
}
