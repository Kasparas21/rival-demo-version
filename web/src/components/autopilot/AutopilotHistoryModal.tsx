"use client";

import { ArrowLeft, Bell, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import {
  AutopilotHistoryList,
  type AutopilotHistoryItem,
} from "@/components/autopilot/AutopilotHistoryList";
import { glassModalShellClass } from "@/components/ui/glass-styles";

type AutopilotHistoryModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AutopilotHistoryModal({ open, onClose }: AutopilotHistoryModalProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<AutopilotHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch("/api/autopilot/history", { credentials: "include", cache: "no-store" });
        const json = (await res.json()) as { ok?: boolean; items?: AutopilotHistoryItem[]; error?: string };
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? "Could not load history");
        }
        setItems(json.items ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load history");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e]/55 via-indigo-950/35 to-emerald-950/25 backdrop-blur-md motion-reduce:backdrop-blur-none"
        aria-label="Close alert history"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 flex max-h-[min(88vh,620px)] w-full max-w-[440px] flex-col overflow-hidden ${glassModalShellClass} shadow-[0_32px_80px_-20px_rgba(15,23,42,0.4)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300 sm:max-w-lg`}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-emerald-400/12 blur-3xl" aria-hidden />

        <div className="relative flex items-start justify-between gap-3 border-b border-white/50 bg-white/30 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onClose}
              className="mt-0.5 rounded-xl border border-white/60 bg-white/50 p-2 text-[#71717a] shadow-sm backdrop-blur-sm transition hover:bg-white/80 hover:text-[#1a1a2e]"
              aria-label="Back to autopilot settings"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-indigo-900 text-white shadow-[0_8px_24px_-8px_rgba(26,26,46,0.6)] ring-1 ring-white/20">
                <Bell className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 id={titleId} className="text-[17px] font-semibold tracking-tight text-[#1a1a2e]">
                  Alert history
                </h2>
                <p className="mt-0.5 text-[12px] leading-snug text-[#71717a]">
                  Recent alerts, reports, and briefs sent by Autopilot
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/60 bg-white/50 p-2 text-[#71717a] shadow-sm backdrop-blur-sm transition hover:bg-white/80 hover:text-[#1a1a2e]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {error ? (
            <div className="rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-2 text-[12px] text-red-700 backdrop-blur-sm">
              {error}
            </div>
          ) : (
            <AutopilotHistoryList items={items} loading={loading} variant="modal" />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
