"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, Settings2, X } from "lucide-react";

import {
  AlertCard,
  alertDeepLinkPath,
  type AlertFeedRow,
} from "@/components/competitor/alerts/alert-card";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { COMPETITOR_PAGE_SHELL } from "@/components/dashboard/competitor/competitor-page-layout";
import { SkListRows, SkPillRow, SkSectionHeader } from "@/components/ui/feature-skeleton";
import {
  ALERT_TYPE_CONFIG,
  ALL_ALERT_TYPES,
  DEFAULT_THRESHOLDS,
  isAlertType,
  parseThresholds,
  type AlertType,
} from "@/lib/alerts/alert-types";
import type { AlertRuleRow } from "@/lib/alerts/seed-default-rules";
import { cn } from "@/lib/utils";

type Props = {
  competitorId?: string;
  competitorLabel?: string;
  allowAlertRules?: boolean;
  allowAlertEmail?: boolean;
  onUnreadChange?: (count: number) => void;
};

type FeedResponse = {
  ok?: boolean;
  alerts?: AlertFeedRow[];
  error?: string;
};

type RulesResponse = {
  ok?: boolean;
  rules?: AlertRuleRow[];
  allowAlertRules?: boolean;
  allowAlertEmail?: boolean;
  error?: string;
};

const TYPE_FILTER_ALL = "all";

export function AlertsTab({
  competitorId,
  competitorLabel,
  allowAlertRules = false,
  allowAlertEmail = false,
  onUnreadChange,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [alerts, setAlerts] = useState<AlertFeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>(TYPE_FILTER_ALL);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rules, setRules] = useState<AlertRuleRow[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesSaving, setRulesSaving] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (competitorId) params.set("competitorId", competitorId);
      if (unreadOnly) params.set("unreadOnly", "true");
      if (typeFilter !== TYPE_FILTER_ALL && isAlertType(typeFilter)) params.set("type", typeFilter);
      params.set("limit", "50");

      const res = await fetch(`/api/alerts/feed?${params.toString()}`, { credentials: "include" });
      const json = (await res.json()) as FeedResponse;
      if (!json.ok) {
        setError(json.error ?? "Failed to load alerts");
        setAlerts([]);
        return;
      }
      setAlerts(json.alerts ?? []);
    } catch {
      setError("Failed to load alerts");
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [competitorId, typeFilter, unreadOnly]);

  const fetchUnread = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (competitorId) params.set("competitorId", competitorId);
      const res = await fetch(`/api/alerts/unread-count?${params.toString()}`, { credentials: "include" });
      const json = (await res.json()) as { ok?: boolean; count?: number };
      if (json.ok) onUnreadChange?.(json.count ?? 0);
    } catch {
      /* ignore */
    }
  }, [competitorId, onUnreadChange]);

  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const res = await fetch("/api/alerts/rules", { credentials: "include" });
      const json = (await res.json()) as RulesResponse;
      if (json.ok) setRules(json.rules ?? []);
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    void fetchUnread();
  }, [fetchUnread, alerts]);

  useEffect(() => {
    if (settingsOpen) void fetchRules();
  }, [settingsOpen, fetchRules]);

  const markRead = useCallback(
    async (ids: string[]) => {
      await fetch("/api/alerts/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        credentials: "include",
      });
      setAlerts((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, is_read: true } : a)));
      void fetchUnread();
    },
    [fetchUnread]
  );

  const markAllRead = useCallback(async () => {
    await fetch("/api/alerts/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
      credentials: "include",
    });
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    void fetchUnread();
  }, [fetchUnread]);

  const handleAlertClick = useCallback(
    (alert: AlertFeedRow) => {
      if (!alert.is_read) void markRead([alert.id]);
      const link = alertDeepLinkPath(alert);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", link.tab);
      if (link.sub) params.set("sub", link.sub);
      if (link.extra) {
        for (const [k, v] of Object.entries(link.extra)) {
          params.set(k, v);
        }
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [markRead, pathname, router, searchParams]
  );

  const globalRules = useMemo(
    () => rules.filter((r) => r.competitor_id == null),
    [rules]
  );

  const saveRule = useCallback(
    async (alertType: AlertType, patch: Partial<Pick<AlertRuleRow, "enabled" | "notify_email" | "threshold">>) => {
      if (!allowAlertRules) return;
      setRulesSaving(alertType);
      try {
        const res = await fetch("/api/alerts/rules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alert_type: alertType,
            competitor_id: null,
            ...patch,
          }),
          credentials: "include",
        });
        const json = (await res.json()) as { ok?: boolean; rule?: AlertRuleRow };
        if (json.ok && json.rule) {
          setRules((prev) => {
            const rest = prev.filter(
              (r) => !(r.alert_type === alertType && r.competitor_id == null)
            );
            return [...rest, json.rule!];
          });
        }
      } finally {
        setRulesSaving(null);
      }
    },
    [allowAlertRules]
  );

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return (
    <div className={COMPETITOR_PAGE_SHELL}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <FeatureSectionHeader
          overline="Alerts"
          title="Alerts"
          description="Significant competitor activity, flagged as soon as we detect it."
        />
        <div className="flex items-center gap-2">
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
            >
              Mark all read
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Manage alerts
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <FilterChip active={!unreadOnly} onClick={() => setUnreadOnly(false)}>
          All
        </FilterChip>
        <FilterChip active={unreadOnly} onClick={() => setUnreadOnly(true)}>
          Unread
        </FilterChip>
        <FilterChip active={typeFilter === TYPE_FILTER_ALL} onClick={() => setTypeFilter(TYPE_FILTER_ALL)}>
          Every type
        </FilterChip>
        {ALL_ALERT_TYPES.map((t) => (
          <FilterChip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
            {ALERT_TYPE_CONFIG[t].label}
          </FilterChip>
        ))}
      </div>

      {competitorId && competitorLabel ? (
        <p className="mb-4 text-[12px] text-slate-500">
          Showing alerts for <span className="font-medium text-slate-700">{competitorLabel}</span>. Switch competitors
          from the sidebar to see others.
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <SkSectionHeader />
          <SkPillRow count={4} />
          <SkListRows count={6} />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <Bell className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="text-[15px] font-semibold text-slate-900">No alerts yet</h3>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-slate-600">
            Alerts appear after your next scrape detects a meaningful change — new platforms, angles, activity spikes,
            and more. We flag them as soon as we detect them on the next refresh.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onClick={() => handleAlertClick(alert)} />
          ))}
        </div>
      )}

      {settingsOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <div>
                <h2 className="text-[16px] font-semibold text-slate-900">Alert settings</h2>
                <p className="mt-1 text-[12px] text-slate-500">
                  Every detected event appears in your feed. Email me only sends for events you switch on here.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Close settings"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!allowAlertRules ? (
              <div className="border-b border-slate-100 bg-amber-50 px-5 py-3 text-[12px] text-amber-900">
                Starter includes default alerts in your feed.{" "}
                <Link href="/checkout" className="font-semibold underline">
                  Upgrade to Pro
                </Link>{" "}
                to customize rules, thresholds, and email notifications.
              </div>
            ) : null}

            <div className="space-y-4 px-5 py-4">
              {rulesLoading ? (
                <SkListRows count={5} />
              ) : (
                ALL_ALERT_TYPES.map((alertType) => {
                  const rule = globalRules.find((r) => r.alert_type === alertType);
                  const cfg = ALERT_TYPE_CONFIG[alertType];
                  const thresholds = parseThresholds(rule?.threshold);
                  const disabled = !allowAlertRules;
                  const emailDisabled = !allowAlertEmail || disabled;

                  return (
                    <div key={alertType} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[14px] font-semibold text-slate-900">{cfg.label}</div>
                          <p className="mt-1 text-[12px] text-slate-500">{cfg.description}</p>
                        </div>
                        <label className="flex items-center gap-2 text-[12px] text-slate-700">
                          <input
                            type="checkbox"
                            checked={rule?.enabled ?? false}
                            disabled={disabled || rulesSaving === alertType}
                            onChange={(e) =>
                              void saveRule(alertType, { enabled: e.target.checked })
                            }
                          />
                          Feed
                        </label>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 text-[12px] text-slate-700">
                          <input
                            type="checkbox"
                            checked={rule?.notify_email ?? false}
                            disabled={emailDisabled || rulesSaving === alertType}
                            onChange={(e) =>
                              void saveRule(alertType, { notify_email: e.target.checked })
                            }
                          />
                          Email me
                        </label>

                        {cfg.hasThreshold && cfg.thresholdKey ? (
                          <label className="flex items-center gap-2 text-[12px] text-slate-700">
                            <span>{cfg.thresholdLabel}</span>
                            <input
                              type="number"
                              min={cfg.thresholdMin}
                              max={cfg.thresholdMax}
                              disabled={disabled || rulesSaving === alertType}
                              value={thresholds[cfg.thresholdKey]}
                              onChange={(e) => {
                                const n = Number(e.target.value);
                                if (!Number.isFinite(n)) return;
                                void saveRule(alertType, {
                                  threshold: {
                                    ...thresholds,
                                    [cfg.thresholdKey!]: n,
                                  },
                                });
                              }}
                              className="w-16 rounded border border-slate-200 px-2 py-1 text-[12px]"
                            />
                          </label>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}

              {!allowAlertRules ? (
                <p className="text-[11px] text-slate-500">
                  Default thresholds: activity delta {DEFAULT_THRESHOLDS.activityScoreDelta}, creative push{" "}
                  {DEFAULT_THRESHOLDS.creativePushCount} ads, proven winner {DEFAULT_THRESHOLDS.lifespanDays} days.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-[11px] font-medium border transition-all duration-150",
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  );
}
