"use client";

import { ExternalLink } from "lucide-react";

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
  if (t === "watch_alert") return "watch";
  if (t === "monthly_report") return "report";
  if (t === "weekly_brief") return "brief";
  return t;
}

export function AutopilotHistoryList(props: { items: AutopilotHistoryItem[]; loading?: boolean }) {
  const { items, loading } = props;
  if (loading) {
    return <p className="text-sm text-[#6B7280]">loading history…</p>;
  }
  if (items.length === 0) {
    return <p className="text-sm text-[#6B7280]">no autopilot outputs yet</p>;
  }
  return (
    <ul className="divide-y divide-[#E5E7EB] rounded-xl border border-[#E5E7EB] bg-white">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-[#111827] truncate">{item.title}</div>
            <div className="text-xs text-[#6B7280] mt-0.5">
              {typeLabel(item.outputType)} · {item.status} · {formatDate(item.sentAt ?? item.createdAt)}
            </div>
          </div>
          {item.reopenUrl ? (
            <a
              href={item.reopenUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline"
            >
              open
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
