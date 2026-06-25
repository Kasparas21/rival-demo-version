"use client";

import { Lock, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { COMPETITOR_PAGE_SHELL, COMPETITOR_PAGE_X } from "@/components/dashboard/competitor/competitor-page-layout";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { alertGlassPanelClass } from "@/components/competitor/alerts/alert-ui-styles";
import { EMAIL_INSIGHTS_MIN_COUNT } from "@/lib/email-intelligence/constants";
import { cn } from "@/lib/utils";

import { EmailMarketingInbox } from "./EmailMarketingInbox";
import { EmailMarketingInsights } from "./EmailMarketingInsights";
import { EmailInboxSkeleton, EmailSubTabsSkeleton } from "./EmailMarketingSkeleton";
import { EmailTrackerBar } from "./EmailTrackerBar";

type SubTab = "inbox" | "insights";

function isTabVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

export function EmailMarketingTab({
  competitorId,
  competitorName,
}: {
  competitorId?: string;
  competitorName: string;
}) {
  const searchParams = useSearchParams();
  const initialEmailId = searchParams.get("email_id")?.trim() || null;

  const [trackerReady, setTrackerReady] = useState(false);
  const [trackerChecking, setTrackerChecking] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(initialEmailId ? "inbox" : "inbox");
  const [emailCount, setEmailCount] = useState(0);
  const [insightsUnlocked, setInsightsUnlocked] = useState(false);
  const [allowCsvExport, setAllowCsvExport] = useState(false);

  useEffect(() => {
    if (initialEmailId) {
      setActiveSubTab("inbox");
    }
  }, [initialEmailId]);

  const refreshEmailCount = useCallback(async () => {
    if (!competitorId) return;
    try {
      const [countRes, usageRes] = await Promise.all([
        fetch(`/api/email-trackers/${competitorId}?count=1`),
        fetch("/api/account/usage"),
      ]);
      if (countRes.ok) {
        const data = (await countRes.json()) as {
          emailCount?: number;
          insightsUnlocked?: boolean;
        };
        setEmailCount(data.emailCount ?? 0);
        setInsightsUnlocked(Boolean(data.insightsUnlocked));
      }
      if (usageRes.ok) {
        const usage = (await usageRes.json()) as {
          billing?: { limits?: { allowCsvExport?: boolean } };
        };
        setAllowCsvExport(Boolean(usage.billing?.limits?.allowCsvExport));
      }
    } catch {
      // ignore
    }
  }, [competitorId]);

  useEffect(() => {
    if (!trackerReady || !competitorId) return;
    void refreshEmailCount();
    const interval = window.setInterval(() => {
      if (!isTabVisible()) return;
      void refreshEmailCount();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [trackerReady, competitorId, refreshEmailCount]);

  if (!competitorId) {
    return (
      <div className={`flex flex-col items-center justify-center ${COMPETITOR_PAGE_X} py-24 text-center`}>
        <Mail className="mb-4 h-12 w-12 text-slate-300" />
        <p className="max-w-md text-[14px] leading-relaxed text-slate-600">
          Save this competitor first to track their email marketing.
        </p>
      </div>
    );
  }

  return (
    <div className={COMPETITOR_PAGE_SHELL}>
      <FeatureSectionHeader
        overline="Email Marketing"
        title={`Email · ${competitorName}`}
        description="Captured newsletters and promos with AI summaries, offers, and marketing angles."
      />

      <div className="mt-5 space-y-4">
        <EmailTrackerBar
          competitorId={competitorId}
          competitorName={competitorName}
          onTrackerReady={setTrackerReady}
          onCheckingChange={setTrackerChecking}
        />

        {trackerChecking ? (
          <div className="space-y-4">
            <EmailSubTabsSkeleton />
            <EmailInboxSkeleton />
          </div>
        ) : trackerReady ? (
          <>
            <nav className="-mb-px flex gap-0 border-b border-slate-200/80">
              {(["inbox", "insights"] as const).map((tab) => {
                const isActive = activeSubTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveSubTab(tab)}
                    className={cn(
                      "px-4 py-2.5 text-[13px] font-medium capitalize transition-colors border-b-2 -mb-px",
                      isActive
                        ? "border-slate-900 text-slate-900"
                        : "border-transparent text-slate-500 hover:text-slate-800",
                    )}
                  >
                    {tab}
                  </button>
                );
              })}
            </nav>

            {activeSubTab === "inbox" ? (
              <EmailMarketingInbox
                competitorId={competitorId}
                initialEmailId={initialEmailId}
                allowCsvExport={allowCsvExport}
              />
            ) : insightsUnlocked ? (
              <EmailMarketingInsights
                competitorId={competitorId}
                competitorName={competitorName}
              />
            ) : (
              <div
                className={cn(
                  alertGlassPanelClass,
                  "flex min-h-[240px] flex-col items-center justify-center px-6 py-12 text-center",
                )}
              >
                <Lock className="mb-3 h-8 w-8 text-slate-300" />
                <p className="text-[14px] font-medium text-slate-700">
                  Insights unlock after {EMAIL_INSIGHTS_MIN_COUNT} captured emails ({emailCount}/
                  {EMAIL_INSIGHTS_MIN_COUNT})
                </p>
                <p className="mt-2 max-w-sm text-[13px] text-slate-500">
                  Keep subscribing with your tracking address — cadence, offers, and subject patterns
                  appear here automatically.
                </p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
