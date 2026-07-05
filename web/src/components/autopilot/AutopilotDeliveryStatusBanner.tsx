"use client";

import { Clock, Radio } from "lucide-react";

import { autopilotGlassCardClass } from "@/components/autopilot/autopilot-glass-ui";
import type { AutopilotDeliveryStatus } from "@/lib/autopilot/autopilot-delivery-status";
import { cn } from "@/lib/utils";

function formatWhen(iso: string | null): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function AutopilotDeliveryStatusBanner({
  status,
  loading,
}: {
  status: AutopilotDeliveryStatus | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className={cn("rounded-2xl px-4 py-3 text-[12px] text-[#71717a]", autopilotGlassCardClass)}>
        Checking automatic delivery status…
      </div>
    );
  }
  if (!status) return null;

  const armed = status.isArmed;
  const waitingOnly =
    armed &&
    status.blockers.length === 1 &&
    status.blockers[0]?.startsWith("Armed and waiting");

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        armed
          ? "border-emerald-200/80 bg-emerald-50/50"
          : "border-amber-200/80 bg-amber-50/40",
        autopilotGlassCardClass,
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
            armed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800",
          )}
        >
          <Radio className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#1a1a2e]">
            {armed ? "Automatic watch is armed" : "Automatic watch is not fully armed"}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#52525b]">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden />
              {status.scheduleLabel}
            </span>
            <span>Next run: {formatWhen(status.nextRunAt)}</span>
          </p>
          <p className="mt-1 text-[11px] text-[#71717a]">
            Last autopilot alert: {formatWhen(status.lastWatchSentAt)}
            {status.pendingDeliveries > 0 ? ` · ${status.pendingDeliveries} queued (quiet hours)` : ""}
            {status.backlogAlerts > 0 ? ` · ${status.backlogAlerts} alert(s) in backlog` : ""}
          </p>
          {!waitingOnly && status.blockers.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {status.blockers.map((b) => (
                <li key={b} className="text-[11px] leading-snug text-[#52525b]">
                  • {b}
                </li>
              ))}
            </ul>
          ) : null}
          {waitingOnly ? (
            <p className="mt-2 text-[11px] leading-snug text-emerald-800">
              Competitor alerts are processed automatically once per day. Manual “Fire watch” in dev only tests Slack — it is not the production scheduler.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
