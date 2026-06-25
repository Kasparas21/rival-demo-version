"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  alertGlassChipBaseClass,
  alertGlassPanelClass,
} from "@/components/competitor/alerts/alert-ui-styles";
import type { EmailMarketingInsights } from "@/lib/email-intelligence/types";
import { cn } from "@/lib/utils";

import {
  angleBadgeClass,
  angleBarFillClass,
  emailTypeBadgeClass,
  emailTypeBarFillClass,
  formatEmailType,
  formatRelativeTime,
} from "./email-intelligence-ui";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(alertGlassPanelClass, "px-4 py-3.5")}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-[22px] font-semibold leading-tight text-slate-900">{value}</p>
    </div>
  );
}

function StatSkeletonRow() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={cn(alertGlassPanelClass, "h-[76px] animate-pulse bg-slate-100/60")} />
      ))}
    </div>
  );
}

function SectionShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function DayOfWeekChart({ subjectLines }: { subjectLines: EmailMarketingInsights["subject_lines"] }) {
  const counts = useMemo(() => {
    const buckets = new Array(7).fill(0) as number[];
    for (const line of subjectLines) {
      const t = Date.parse(line.received_at);
      if (Number.isNaN(t)) continue;
      buckets[new Date(t).getUTCDay()]! += 1;
    }
    return buckets;
  }, [subjectLines]);

  const max = Math.max(...counts, 1);
  const tallest = counts.indexOf(Math.max(...counts));

  return (
    <div className={cn(alertGlassPanelClass, "px-4 py-4")}>
      <p className="mb-3 text-[12px] font-medium text-slate-600">Sends by day of week</p>
      <div className="flex items-end justify-between gap-2">
        {DAY_LABELS.map((label, idx) => {
          const count = counts[idx] ?? 0;
          const heightPct = max > 0 ? Math.max(8, (count / max) * 100) : 8;
          return (
            <div key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] font-medium tabular-nums text-slate-500">{count}</span>
              <div
                className={cn(
                  "w-full rounded-t-md bg-indigo-400/80 transition-all",
                  tallest === idx && "bg-indigo-600 ring-2 ring-indigo-300/60",
                )}
                style={{ height: `${heightPct}px`, minHeight: "8px", maxHeight: "96px" }}
              />
              <span className="text-[10px] font-semibold text-slate-600">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TypeMixBar({ breakdown }: { breakdown: Record<string, number> }) {
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (total === 0) {
    return <p className="text-[13px] text-slate-500">No type data yet.</p>;
  }

  return (
    <div className={cn(alertGlassPanelClass, "px-4 py-4")}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {entries.map(([type, count]) => (
          <div
            key={type}
            className={cn("h-full", emailTypeBarFillClass(type))}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${formatEmailType(type)}: ${count}`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {entries.map(([type, count]) => (
          <div key={type} className="flex items-center gap-2 text-[12px] text-slate-700">
            <span className={cn("h-2.5 w-2.5 rounded-sm", emailTypeBarFillClass(type))} />
            <span className="capitalize">{formatEmailType(type)}</span>
            <span className="font-semibold tabular-nums text-slate-900">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AngleMixBar({ breakdown }: { breakdown: Record<string, number> }) {
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (total === 0) {
    return <p className="text-[13px] text-slate-500">No angle data yet.</p>;
  }

  return (
    <div className={cn(alertGlassPanelClass, "px-4 py-4")}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {entries.map(([angle, count]) => (
          <div
            key={angle}
            className={cn("h-full", angleBarFillClass(angle))}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${angle.replace(/_/g, " ")}: ${count}`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {entries.map(([angle, count]) => (
          <div key={angle} className="flex items-center gap-2 text-[12px] text-slate-700">
            <span className={cn("h-2.5 w-2.5 rounded-sm", angleBarFillClass(angle))} />
            <span className="capitalize">{angle.replace(/_/g, " ")}</span>
            <span className="font-semibold tabular-nums text-slate-900">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmailMarketingInsights({
  competitorId,
}: {
  competitorId: string;
  competitorName: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [insights, setInsights] = useState<EmailMarketingInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [showAllOffers, setShowAllOffers] = useState(false);

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/email-trackers/${competitorId}?view=insights`);
      const data = (await res.json()) as {
        insights?: EmailMarketingInsights | null;
        insightsLocked?: boolean;
        emailCount?: number;
        unlockAt?: number;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load insights");
      }
      if (data.insightsLocked || !data.insights) {
        throw new Error(
          `Insights unlock after ${data.unlockAt ?? 5} captured emails (${data.emailCount ?? 0}/${data.unlockAt ?? 5}).`,
        );
      }
      setInsights(data.insights);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, [competitorId]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  const filteredSubjects = useMemo(() => {
    if (!insights) return [];
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return insights.subject_lines;
    return insights.subject_lines.filter((line) => line.subject.toLowerCase().includes(q));
  }, [insights, subjectSearch]);

  const visibleOffers = useMemo(() => {
    if (!insights) return [];
    return showAllOffers ? insights.all_offers : insights.all_offers.slice(0, 10);
  }, [insights, showAllOffers]);

  const openEmailInInbox = useCallback(
    (emailId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "email-marketing");
      params.set("email_id", emailId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <StatSkeletonRow />
        <StatSkeletonRow />
        <StatSkeletonRow />
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
        {error ?? "Failed to load insights"}
        <button
          type="button"
          className="mt-2 block text-[12px] font-semibold underline"
          onClick={() => void loadInsights()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionShell title="Send Cadence">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Emails / week" value={String(insights.emails_per_week)} />
          <StatCard label="Most active day" value={insights.most_active_day} />
          <StatCard
            label="Avg. gap between sends"
            value={`${insights.avg_days_between_emails} days`}
          />
        </div>
        <DayOfWeekChart subjectLines={insights.subject_lines} />
      </SectionShell>

      <SectionShell title="Offer Intelligence">
        {insights.total_emails_with_offers === 0 ? (
          <p className={cn(alertGlassPanelClass, "px-4 py-6 text-center text-[13px] text-slate-500")}>
            No offers detected in captured emails yet.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Emails with offers"
                value={`${insights.total_emails_with_offers} of ${insights.total_emails}`}
              />
              <StatCard
                label="Promo frequency"
                value={
                  insights.offer_frequency_days != null
                    ? `Every ~${insights.offer_frequency_days} days`
                    : "Not enough data"
                }
              />
              <StatCard
                label="Most common offer"
                value={insights.most_common_offer_type?.replace(/_/g, " ") ?? "—"}
              />
            </div>
            <div className={cn(alertGlassPanelClass, "divide-y divide-slate-100")}>
              {visibleOffers.map((offer, i) => (
                <button
                  key={`${offer.email_id}-${offer.received_at}-${offer.value}-${i}`}
                  type="button"
                  onClick={() => openEmailInInbox(offer.email_id)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-white/60"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        alertGlassChipBaseClass,
                        "border-emerald-200/80 bg-emerald-50 text-emerald-900",
                      )}
                    >
                      {offer.value}
                    </span>
                    {offer.code ? (
                      <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] text-slate-700">
                        {offer.code}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {formatRelativeTime(offer.received_at)}
                  </span>
                </button>
              ))}
            </div>
            {insights.all_offers.length > 10 ? (
              <button
                type="button"
                onClick={() => setShowAllOffers((v) => !v)}
                className="text-[12px] font-semibold text-slate-700 underline-offset-2 hover:underline"
              >
                {showAllOffers ? "Show less" : `Show all (${insights.all_offers.length})`}
              </button>
            ) : null}
          </>
        )}
      </SectionShell>

      <SectionShell title="Subject Line Patterns">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Avg. subject length" value={`${insights.avg_subject_length} chars`} />
          <StatCard label="Emoji usage" value={`${insights.emoji_usage_percent}%`} />
          <StatCard
            label="Top angle"
            value={insights.most_common_angle?.replace(/_/g, " ") ?? "—"}
          />
        </div>
        <div className={cn(alertGlassPanelClass, "overflow-hidden")}>
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                placeholder="Search subject lines…"
                className="w-full rounded-xl border border-slate-200 bg-white/80 py-2 pl-9 pr-3 text-[13px] text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
          <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
            {filteredSubjects.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-slate-500">No matching subjects.</p>
            ) : (
              filteredSubjects.map((line, i) => (
                <button
                  key={`${line.email_id}-${line.received_at}-${i}`}
                  type="button"
                  onClick={() => openEmailInInbox(line.email_id)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-white/60"
                >
                  <p className="min-w-0 flex-1 text-[13px] font-medium text-slate-800">{line.subject}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                        emailTypeBadgeClass(line.email_type),
                      )}
                    >
                      {formatEmailType(line.email_type)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formatRelativeTime(line.received_at)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </SectionShell>

      <SectionShell title="Email Type Mix">
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Most common type"
            value={formatEmailType(insights.most_common_type)}
          />
        </div>
        <TypeMixBar breakdown={insights.type_breakdown} />
      </SectionShell>

      <SectionShell title="Messaging Angles">
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Top angle"
            value={insights.most_common_angle?.replace(/_/g, " ") ?? "—"}
          />
        </div>
        <AngleMixBar breakdown={insights.angle_breakdown} />
      </SectionShell>

      <SectionShell title="Email Platform">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Detected ESP"
            value={insights.esp_detected ?? "Unknown"}
          />
        </div>
      </SectionShell>
    </div>
  );
}
