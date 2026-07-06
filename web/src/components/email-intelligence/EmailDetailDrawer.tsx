"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { EmailPreviewLoading } from "@/lib/email-intelligence/email-preview-iframe";
import type { CompetitorEmailRow } from "@/lib/email-intelligence/types";

import { mergeEmailRowUpdate } from "./email-intelligence-ui";
import { EmailDetailPane } from "./EmailDetailPane";
import { EmailSaveButton } from "./EmailSaveButton";

type EmailDetailResponse = {
  email?: CompetitorEmailRow;
  error?: string;
};

type SavedEmailDetailResponse = {
  ok?: boolean;
  email?: CompetitorEmailRow;
  error?: string;
};

export function EmailDetailDrawer({
  competitorId,
  emailId,
  savedEmailId = null,
  listEmail,
  isSaved = false,
  saveInFlight = false,
  onToggleSave,
  onClose,
  onEmailUpdated,
  onUnsaved,
}: {
  competitorId: string;
  emailId: string | null;
  savedEmailId?: string | null;
  listEmail?: CompetitorEmailRow | null;
  isSaved?: boolean;
  saveInFlight?: boolean;
  onToggleSave?: () => void;
  onClose: () => void;
  onEmailUpdated: (updated: CompetitorEmailRow) => void;
  onUnsaved?: () => void;
}) {
  const [email, setEmail] = useState<CompetitorEmailRow | null>(listEmail ?? null);
  const [loading, setLoading] = useState(() => Boolean(emailId) && !listEmail?.html_body);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [entering, setEntering] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const dismissedRef = useRef(false);
  const onEmailUpdatedRef = useRef(onEmailUpdated);
  const previewLoadedForRef = useRef<string | null>(null);
  const isOpen = Boolean(emailId);
  const showDrawer = isOpen || closing;

  useLayoutEffect(() => {
    if (isOpen) {
      dismissedRef.current = false;
      if (!wasOpenRef.current) setEntering(true);
      wasOpenRef.current = true;
    } else if (!closing) {
      wasOpenRef.current = false;
      setEntering(false);
      setClosing(false);
    }
  }, [isOpen, closing]);

  const requestClose = useCallback(() => {
    if (closing || dismissedRef.current) return;
    dismissedRef.current = true;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setEntering(false);
    setClosing(true);
    onClose();
  }, [closing, onClose]);

  useEffect(() => {
    if (!closing) return;
    const panel = panelRef.current;
    if (!panel) {
      setClosing(false);
      return;
    }
    let finished = false;
    const finishClose = () => {
      if (finished) return;
      finished = true;
      setClosing(false);
    };
    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.target !== panel || event.animationName !== "ad-detail-slide-out") return;
      finishClose();
    };
    panel.addEventListener("animationend", onAnimationEnd);
    const fallback = window.setTimeout(finishClose, 380);
    return () => {
      panel.removeEventListener("animationend", onAnimationEnd);
      window.clearTimeout(fallback);
    };
  }, [closing]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (closing || dismissedRef.current) return;
    if (!emailId) {
      setEmail(null);
      setLoading(false);
      setError(null);
      return;
    }
    setError(null);
  }, [emailId, closing]);

  useEffect(() => {
    onEmailUpdatedRef.current = onEmailUpdated;
  }, [onEmailUpdated]);

  const loadSavedSnapshot = useCallback(async (savedId: string): Promise<CompetitorEmailRow | null> => {
    const res = await fetch(`/api/saved-emails/${savedId}`, { credentials: "include" });
    const data = (await res.json()) as SavedEmailDetailResponse;
    if (!res.ok || !data.email) return null;
    return data.email;
  }, []);

  useEffect(() => {
    if (!emailId || dismissedRef.current) return;
    if (previewLoadedForRef.current === emailId) return;

    const seed = listEmail?.id === emailId ? listEmail : null;
    setEmail((prev) => (prev?.id === emailId ? prev : seed));
    setLoading(true);
    setError(null);
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(
          `/api/email-trackers/${competitorId}?email_id=${encodeURIComponent(emailId)}`,
        );
        const data = (await res.json()) as EmailDetailResponse;
        if (cancelled || dismissedRef.current) return;

        if (res.ok && data.email) {
          setEmail(data.email);
          if (data.email.html_body?.trim()) {
            previewLoadedForRef.current = emailId;
          }
          onEmailUpdatedRef.current(data.email);
          setError(null);
          return;
        }

        if (savedEmailId) {
          const snapshot = await loadSavedSnapshot(savedEmailId);
          if (cancelled || dismissedRef.current) return;
          if (snapshot) {
            setEmail(snapshot);
            if (snapshot.html_body?.trim()) {
              previewLoadedForRef.current = emailId;
            }
            setError(null);
            return;
          }
        }

        throw new Error(data.error ?? "Failed to load email");
      } catch (err) {
        if (cancelled || dismissedRef.current) return;
        if (savedEmailId) {
          const snapshot = await loadSavedSnapshot(savedEmailId);
          if (!cancelled && snapshot) {
            setEmail(snapshot);
            if (snapshot.html_body?.trim()) {
              previewLoadedForRef.current = emailId;
            }
            setError(null);
            return;
          }
        }
        setError(err instanceof Error ? err.message : "Failed to load email");
      } finally {
        if (!cancelled && !dismissedRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [competitorId, emailId, savedEmailId, loadSavedSnapshot]);

  useEffect(() => {
    if (!emailId) {
      previewLoadedForRef.current = null;
      return;
    }
    if (!listEmail || listEmail.id !== emailId) return;
    setEmail((prev) => {
      if (!prev || prev.id !== emailId) return prev;
      return mergeEmailRowUpdate(prev, listEmail);
    });
  }, [emailId, listEmail]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, requestClose]);

  const handleToggleSave = useCallback(() => {
    if (!onToggleSave || saveInFlight) return;
    void onToggleSave();
    if (isSaved) {
      onUnsaved?.();
    }
  }, [isSaved, onToggleSave, onUnsaved, saveInFlight]);

  if (!showDrawer) return null;
  if (!mounted) return null;

  const title = email?.subject?.trim() || listEmail?.subject?.trim() || "Email preview";

  return createPortal(
    <div
      className={`fixed inset-0 z-[150] flex justify-end${closing ? " pointer-events-none" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className={`ad-detail-drawer-backdrop absolute inset-0 bg-black/40${entering ? " ad-detail-drawer-backdrop--entering" : ""}${closing ? " ad-detail-drawer-backdrop--closing" : ""}`}
        aria-label="Close"
        onClick={requestClose}
        disabled={closing}
      />

      <div
        ref={panelRef}
        className={`ad-detail-drawer-panel relative flex h-full w-full max-w-[1080px] border-l border-slate-200 bg-white shadow-2xl${entering ? " ad-detail-drawer-panel--entering" : ""}${closing ? " ad-detail-drawer-panel--closing" : ""}`}
      >
        <div className="flex min-h-0 w-full flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-slate-800">{title}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {onToggleSave ? (
                <EmailSaveButton
                  isSaved={isSaved}
                  onToggle={handleToggleSave}
                  disabled={saveInFlight}
                  saving={saveInFlight}
                />
              ) : null}
              <button
                type="button"
                onClick={requestClose}
                disabled={closing}
                className="rounded-md p-1.5 transition-colors hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>

          {loading && !listEmail && !email ? (
            <div className="flex flex-1 items-center justify-center">
              <EmailPreviewLoading />
            </div>
          ) : error && !email ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                {error}
              </div>
            </div>
          ) : (email || (loading && listEmail?.id === emailId)) ? (
            <div className="min-h-0 flex-1 overflow-hidden">
              <EmailDetailPane
                email={email ?? listEmail!}
                competitorId={competitorId}
                previewLoading={loading && !email?.html_body?.trim()}
                onEmailUpdated={(updated) => {
                  setEmail((prev) =>
                    prev
                      ? {
                          ...prev,
                          ...updated,
                          html_body: updated.html_body ?? prev.html_body,
                          plain_text: updated.plain_text ?? prev.plain_text,
                        }
                      : updated,
                  );
                  onEmailUpdated(updated);
                }}
                inDrawer
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
