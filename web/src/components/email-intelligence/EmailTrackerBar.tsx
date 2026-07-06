"use client";

import { Check, Copy, Mail, MoreHorizontal, Radio, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { alertGlassButtonClass, alertGlassPanelClass } from "@/components/competitor/alerts/alert-ui-styles";
import { cn } from "@/lib/utils";

import { EmailTrackerBarSkeleton } from "./EmailMarketingSkeleton";

type TrackerState = {
  id: string;
  tracking_address: string;
  tracking_code: string;
  is_active?: boolean;
};

type SetupState = "checking" | "idle" | "loading" | "active" | "inactive" | "error";

export function EmailTrackerBar({
  competitorId,
  competitorName,
  onTrackerReady,
  onCheckingChange,
  isOwnWorkspace = false,
}: {
  competitorId: string;
  competitorName: string;
  onTrackerReady?: (ready: boolean) => void;
  onCheckingChange?: (checking: boolean) => void;
  isOwnWorkspace?: boolean;
}) {
  const [setupState, setSetupState] = useState<SetupState>("checking");
  const [tracker, setTracker] = useState<TrackerState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const restoreTracker = useCallback(async () => {
    setSetupState("checking");
    onCheckingChange?.(true);
    try {
      const res = await fetch(`/api/email-trackers/${competitorId}`);
      if (!res.ok) {
        setSetupState("idle");
        onTrackerReady?.(false);
        return;
      }
      const data = (await res.json()) as { tracker: TrackerState | null };
      if (data.tracker?.tracking_address) {
        setTracker(data.tracker);
        if (data.tracker.is_active === false) {
          setSetupState("inactive");
          onTrackerReady?.(false);
        } else {
          setSetupState("active");
          onTrackerReady?.(true);
        }
      } else {
        setSetupState("idle");
        onTrackerReady?.(false);
      }
    } catch {
      setSetupState("idle");
      onTrackerReady?.(false);
    } finally {
      onCheckingChange?.(false);
    }
  }, [competitorId, onTrackerReady, onCheckingChange]);

  useEffect(() => {
    void restoreTracker();
  }, [restoreTracker]);

  const generateTracker = async () => {
    setSetupState("loading");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/email-trackers/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitor_id: competitorId }),
      });
      const data = (await res.json()) as TrackerState & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate tracker");
      }
      setTracker({
        id: data.id,
        tracking_address: data.tracking_address,
        tracking_code: data.tracking_code,
        is_active: true,
      });
      setSetupState("active");
      onTrackerReady?.(true);
    } catch (err) {
      setSetupState("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
      onTrackerReady?.(false);
    }
  };

  const activateTracker = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/email-trackers/${competitorId}/activate`, { method: "POST" });
      const data = (await res.json()) as { tracker?: TrackerState; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to activate");
      if (data.tracker) setTracker(data.tracker);
      setSetupState("active");
      onTrackerReady?.(true);
      toast.success("Email tracking resumed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to activate");
    } finally {
      setActionLoading(false);
    }
  };

  const deactivateTracker = async () => {
    if (!window.confirm("Stop tracking emails for this competitor? Your inbox will stay, but new emails won't be captured.")) {
      return;
    }
    setActionLoading(true);
    setMenuOpen(false);
    try {
      const res = await fetch(`/api/email-trackers/${competitorId}/deactivate`, { method: "POST" });
      const data = (await res.json()) as { tracker?: TrackerState; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to stop tracking");
      if (data.tracker) setTracker(data.tracker);
      setSetupState("inactive");
      onTrackerReady?.(false);
      toast.success("Email tracking stopped");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to stop tracking");
    } finally {
      setActionLoading(false);
    }
  };

  const regenerateTracker = async () => {
    if (
      !window.confirm(
        "Generate a new tracking address? The old address will stop receiving emails. Update subscriptions on their site.",
      )
    ) {
      return;
    }
    setActionLoading(true);
    setMenuOpen(false);
    try {
      const res = await fetch(`/api/email-trackers/${competitorId}/regenerate`, { method: "POST" });
      const data = (await res.json()) as { tracker?: TrackerState; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to regenerate");
      if (data.tracker) setTracker(data.tracker);
      setSetupState("active");
      onTrackerReady?.(true);
      toast.success("New tracking address generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setActionLoading(false);
    }
  };

  const copyAddress = async () => {
    if (!tracker?.tracking_address) return;
    try {
      await navigator.clipboard.writeText(tracker.tracking_address);
      setCopied(true);
      toast.success("Tracking address copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy address");
    }
  };

  if (setupState === "checking") {
    return <EmailTrackerBarSkeleton />;
  }

  if (setupState === "idle" || setupState === "loading") {
    return (
      <div className={cn(alertGlassPanelClass, "p-5")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/70 shadow-sm">
              <Mail className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900">Start tracking emails</h3>
              <p className="mt-0.5 max-w-xl text-[13px] leading-relaxed text-slate-600">
                {isOwnWorkspace
                  ? `Generate a unique inbox for ${competitorName}, then subscribe your own newsletter to capture every send and compare against competitors.`
                  : `Generate a unique inbox for ${competitorName}, then subscribe on their site to capture every newsletter and promo.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void generateTracker()}
            disabled={setupState === "loading"}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-black disabled:opacity-60"
          >
            {setupState === "loading" ? "Generating…" : "Track Email Marketing"}
          </button>
        </div>
      </div>
    );
  }

  if (setupState === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
        {errorMessage ?? "Failed to set up email tracking."}
        <button
          type="button"
          className="mt-2 block text-[12px] font-semibold underline"
          onClick={() => {
            setSetupState("idle");
            setErrorMessage(null);
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (setupState === "inactive") {
    return (
      <div className={cn(alertGlassPanelClass, "p-5")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              Tracking paused
            </span>
            <p className="mt-2 text-[13px] text-slate-600">
              Email capture is off for {competitorName}. Past emails remain in your inbox.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void activateTracker()}
            disabled={actionLoading}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-black disabled:opacity-60"
          >
            {actionLoading ? "Resuming…" : "Resume tracking"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(alertGlassPanelClass, "px-4 py-3")}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
            <Radio className="h-3 w-3" />
            Tracking active
          </span>
          <p className="text-[12px] text-slate-600">
            {isOwnWorkspace
              ? "Subscribe your newsletter with this address"
              : `Subscribe on ${competitorName}'s site with this address`}
          </p>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 lg:max-w-xl lg:justify-end">
          <code className="min-w-0 flex-1 truncate rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 font-mono text-[11px] text-slate-800">
            {tracker?.tracking_address}
          </code>
          <button
            type="button"
            onClick={() => void copyAddress()}
            className={cn(
              alertGlassButtonClass,
              "inline-flex h-9 shrink-0 items-center gap-1.5 px-3 text-[12px] font-semibold",
            )}
            aria-label="Copy tracking address"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            Copy
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              disabled={actionLoading}
              className={cn(alertGlassButtonClass, "inline-flex h-9 w-9 items-center justify-center p-0")}
              aria-label="Tracker options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                  onClick={() => void regenerateTracker()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate address
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-red-700 hover:bg-red-50"
                  onClick={() => void deactivateTracker()}
                >
                  Stop tracking
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
