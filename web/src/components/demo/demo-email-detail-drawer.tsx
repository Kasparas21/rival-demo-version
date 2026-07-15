"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { EmailDetailPane } from "@/components/email-intelligence/EmailDetailPane";
import { EmailSaveButton } from "@/components/email-intelligence/EmailSaveButton";
import type { CompetitorEmailRow } from "@/lib/email-intelligence/types";
import {
  buildDemoEmailDetail,
  DEMO_EMAIL_DETAIL_COMPETITOR_ID,
} from "@/lib/demo/demo-email-detail-payload";

export function DemoEmailDetailDrawer({
  emailId,
  isSaved = false,
  saveInFlight = false,
  onToggleSave,
  onClose,
}: {
  emailId: string | null;
  isSaved?: boolean;
  saveInFlight?: boolean;
  onToggleSave?: () => void;
  onClose: () => void;
}) {
  const email = useMemo(
    () => (emailId ? buildDemoEmailDetail(emailId) : null),
    [emailId],
  );
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [entering, setEntering] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const dismissedRef = useRef(false);
  const isOpen = Boolean(emailId && email);
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
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, requestClose]);

  if (!showDrawer || !mounted || !email) return null;

  const title = email.subject?.trim() || "Email preview";

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
                  onToggle={onToggleSave}
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

          <div className="min-h-0 flex-1 overflow-hidden">
            <EmailDetailPane
              email={email}
              competitorId={DEMO_EMAIL_DETAIL_COMPETITOR_ID}
              previewLoading={false}
              onEmailUpdated={() => {}}
              inDrawer
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export type { CompetitorEmailRow };
