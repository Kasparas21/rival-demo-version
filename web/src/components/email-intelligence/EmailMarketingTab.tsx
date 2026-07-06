"use client";

import { Lock, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { COMPETITOR_PAGE_SHELL, COMPETITOR_PAGE_X } from "@/components/dashboard/competitor/competitor-page-layout";
import type { CompetitorSubTabId } from "@/components/dashboard/competitor/competitor-tabs-data";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { alertGlassPanelClass } from "@/components/competitor/alerts/alert-ui-styles";
import { EMAIL_INSIGHTS_MIN_COUNT } from "@/lib/email-intelligence/constants";
import { cn } from "@/lib/utils";

import { EmailMarketingInbox } from "./EmailMarketingInbox";
import { EmailMarketingInsights } from "./EmailMarketingInsights";
import { EmailInboxSkeleton } from "./EmailMarketingSkeleton";
import { SavedEmailsPanel } from "./SavedEmailsPanel";
import { EmailTrackerBar } from "./EmailTrackerBar";

function isTabVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

export function EmailMarketingTab({
  competitorId,
  competitorName,
  activeSubTab,
  onSubTabChange,
  isOwnWorkspace = false,
  fetchEnabled = true,
}: {
  competitorId?: string;
  competitorName: string;
  activeSubTab: CompetitorSubTabId | null;
  onSubTabChange: (sub: CompetitorSubTabId) => void;
  isOwnWorkspace?: boolean;
  /** When false (tab hidden), the 60s email-count polling is paused. */
  fetchEnabled?: boolean;
}) {
  const searchParams = useSearchParams();
  const initialEmailId = searchParams.get("email_id")?.trim() || null;
  const subTab =
    activeSubTab === "saved" || activeSubTab === "insights" ? activeSubTab : "inbox";

  const [trackerReady, setTrackerReady] = useState(false);
  const [trackerChecking, setTrackerChecking] = useState(true);
  const [emailCount, setEmailCount] = useState(0);
  const [insightsUnlocked, setInsightsUnlocked] = useState(false);
  const [allowCsvExport, setAllowCsvExport] = useState(false);

  useEffect(() => {
    if (initialEmailId) {
      onSubTabChange("inbox");
    }
  }, [initialEmailId, onSubTabChange]);

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
    if (!trackerReady || !competitorId || !fetchEnabled) return;
    void refreshEmailCount();
    const interval = window.setInterval(() => {
      if (!isTabVisible()) return;
      void refreshEmailCount();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [trackerReady, competitorId, refreshEmailCount, fetchEnabled]);

  if (!competitorId) {
    return (
      <div className={`flex flex-col items-center justify-center ${COMPETITOR_PAGE_X} py-24 text-center`}>
        <Mail className="mb-4 h-12 w-12 text-slate-300" />
        <p className="max-w-md text-[14px] leading-relaxed text-slate-600">
          {isOwnWorkspace
            ? "Link your workspace brand first to track your email marketing."
            : "Save this competitor first to track their email marketing."}
        </p>
      </div>
    );
  }

  return (
    <div className={COMPETITOR_PAGE_SHELL}>
      <FeatureSectionHeader
        overline="Email Marketing"
        title={`Email · ${competitorName}`}
        description={
          isOwnWorkspace
            ? "Track emails you send by subscribing your newsletter to the address below — plus AI summaries and competitor comparison."
            : "Captured newsletters and promos with AI summaries, offers, and marketing angles."
        }
      />

      <div className="mt-5 space-y-4">
        <EmailTrackerBar
          competitorId={competitorId}
          competitorName={competitorName}
          onTrackerReady={setTrackerReady}
          onCheckingChange={setTrackerChecking}
          isOwnWorkspace={isOwnWorkspace}
        />

        {trackerChecking ? (
          <EmailInboxSkeleton />
        ) : trackerReady ? (
          <>
            {subTab === "inbox" ? (
              <EmailMarketingInbox
                competitorId={competitorId}
                initialEmailId={initialEmailId}
                allowCsvExport={allowCsvExport}
              />
            ) : subTab === "saved" ? (
              <SavedEmailsPanel competitorId={competitorId} competitorName={competitorName} />
            ) : insightsUnlocked ? (
              <EmailMarketingInsights
                competitorId={competitorId}
                competitorName={competitorName}
                isOwnWorkspace={isOwnWorkspace}
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
