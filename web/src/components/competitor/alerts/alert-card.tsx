"use client";

import { platformLabel } from "@/components/competitor/tests-timeline/timeline-helpers";
import {
  AlertAccentBadge,
  alertGlassCardClass,
  alertGlassCardUnreadClass,
} from "@/components/competitor/alerts/alert-ui-styles";
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
        "w-full px-4 py-3.5 text-left",
        alert.is_read ? alertGlassCardClass : alertGlassCardUnreadClass
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full shadow-sm", severityDotClass(alert.severity))}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold text-slate-900">{alert.title}</span>
            {!alert.is_read ? <AlertAccentBadge>NEW</AlertAccentBadge> : null}
          </div>
          {alert.body ? (
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600/95">{alert.body}</p>
          ) : null}
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="font-medium text-slate-600">{alert.competitorName}</span>
            {platform ? (
              <span className="rounded-full border border-white/75 bg-white/55 px-2 py-0.5 font-semibold text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-sm">
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
    case "competitor_email":
      return {
        tab: "email-marketing",
        extra: typeof meta.emailId === "string" ? { email_id: meta.emailId } : undefined,
      };
    default:
      return { tab: "insights", sub: "activity-feed" };
  }
}
