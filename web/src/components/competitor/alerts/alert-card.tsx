"use client";

import { platformLabel } from "@/components/competitor/tests-timeline/timeline-helpers";
import { cn } from "@/lib/utils";

export type AlertFeedRow = {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  detected_at: string;
  is_read: boolean;
  competitor_id: string;
  competitorName: string;
};

function severityDotClass(severity: string): string {
  if (severity === "high") return "bg-red-500";
  if (severity === "notable") return "bg-amber-500";
  return "bg-slate-300";
}

function fmtRelative(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return `${Math.floor(s / (86400 * 7))}w ago`;
}

type Props = {
  alert: AlertFeedRow;
  onClick: () => void;
};

export function AlertCard({ alert, onClick }: Props) {
  const platform =
    typeof alert.metadata?.platform === "string" ? alert.metadata.platform : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border px-4 py-3 text-left transition-colors hover:bg-slate-50/80",
        alert.is_read ? "border-slate-200 bg-white" : "border-indigo-100 bg-indigo-50/40"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", severityDotClass(alert.severity))}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold text-slate-900">{alert.title}</span>
            {!alert.is_read ? (
              <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                New
              </span>
            ) : null}
          </div>
          {alert.body ? (
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{alert.body}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span>{alert.competitorName}</span>
            {platform ? (
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-600">
                {platformLabel(platform)}
              </span>
            ) : null}
            <span>{fmtRelative(alert.detected_at)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export function alertDeepLinkPath(alert: AlertFeedRow): { tab: string; sub?: string; extra?: Record<string, string> } {
  const meta = alert.metadata ?? {};
  switch (alert.alert_type) {
    case "new_platform":
      return { tab: "ads library", sub: "all", extra: typeof meta.platform === "string" ? { platform: meta.platform } : undefined };
    case "proven_winner":
      return {
        tab: "audience-copy",
        sub: "copy-vault",
        extra:
          typeof meta.scrapedAdId === "string"
            ? { adId: meta.scrapedAdId }
            : typeof meta.angle === "string"
              ? { angle: meta.angle }
              : undefined,
      };
    case "new_angle":
      return {
        tab: "audience-copy",
        sub: "copy-vault",
        extra: typeof meta.angle === "string" ? { angle: meta.angle } : undefined,
      };
    case "activity_spike":
    case "activity_drop":
      return { tab: "insights", sub: "strategy-map" };
    default:
      return { tab: "insights", sub: "activity-feed" };
  }
}
