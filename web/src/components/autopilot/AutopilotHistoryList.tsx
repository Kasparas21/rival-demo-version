"use client";

import { ExternalLink } from "lucide-react";

import { autopilotGlassCardClass } from "@/components/autopilot/autopilot-glass-ui";
import { cn } from "@/lib/utils";

export type AutopilotHistoryItem = {
  id: string;
  outputType: string;
  status: string;
  channelsSent: unknown;
  createdAt: string;
  sentAt: string | null;
  title: string;
  reopenUrl: string | null;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function typeLabel(t: string): string {
  if (t === "watch_alert") return "Alert";
  if (t === "monthly_report") return "Report";
  if (t === "weekly_brief") return "Brief";
  return t;
}

function statusTone(status: string): string {
  if (status === "sent" || status === "delivered") return "text-emerald-700 bg-emerald-50/80";
  if (status === "failed") return "text-red-700 bg-red-50/80";
  return "text-[#52525b] bg-white/60";
}

export function AutopilotHistoryList({
  items,
  loading,
  variant = "modal",
}: {
  items: AutopilotHistoryItem[];
  loading?: boolean;
  variant?: "modal" | "page";
}) {
  if (loading) {
    return <p className="text-[13px] text-[#71717a]">Loading history…</p>;
  }
  if (items.length === 0) {
    return (
      <div className={cn("rounded-2xl px-4 py-8 text-center", variant === "modal" && autopilotGlassCardClass)}>
        <p className="text-[14px] font-medium text-[#52525b]">No autopilot outputs yet</p>
        <p className="mt-1 text-[12px] text-[#71717a]">
          Alerts and reports will appear here once Autopilot sends them.
        </p>
      </div>
    );
  }

  if (variant === "page") {
    return (
      <ul className="divide-y divide-[#E5E7EB] rounded-xl border border-[#E5E7EB] bg-white">
        {items.map((item) => (
          <HistoryRow key={item.id} item={item} variant="page" />
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <HistoryRow key={item.id} item={item} variant="modal" />
      ))}
    </ul>
  );
}

function HistoryRow({ item, variant }: { item: AutopilotHistoryItem; variant: "modal" | "page" }) {
  if (variant === "page") {
    return (
      <li className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-[#111827]">{item.title}</div>
          <div className="mt-0.5 text-xs text-[#6B7280]">
            {typeLabel(item.outputType)} · {item.status} · {formatDate(item.sentAt ?? item.createdAt)}
          </div>
        </div>
        {item.reopenUrl ? (
          <a
            href={item.reopenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline"
          >
            open
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : null}
      </li>
    );
  }

  return (
    <li className={cn("flex items-center justify-between gap-3 px-4 py-3.5", autopilotGlassCardClass)}>
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-[#1a1a2e]">{item.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6366f1]">
            {typeLabel(item.outputType)}
          </span>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-semibold capitalize",
              statusTone(item.status),
            )}
          >
            {item.status}
          </span>
          <span className="text-[11px] text-[#71717a]">{formatDate(item.sentAt ?? item.createdAt)}</span>
        </div>
      </div>
      {item.reopenUrl ? (
        <a
          href={item.reopenUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1 rounded-xl border border-white/70 bg-white/60 px-3 py-2 text-[12px] font-semibold text-[#4f46e5] shadow-sm backdrop-blur-sm transition hover:bg-white/85 active:scale-[0.98]"
        >
          Open
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      ) : null}
    </li>
  );
}
