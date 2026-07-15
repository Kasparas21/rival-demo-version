"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  competitorPageTabsForView,
  findCompetitorTab,
  resolveSubTabFromParams,
  type CompetitorPageTabId,
  type CompetitorSubTabId,
} from "@/components/dashboard/competitor/competitor-tabs-data";
import { DemoAdLibraryView } from "@/components/landing/hero-variant-b-demo/ad-library-view";
import {
  DemoAlertsView,
  DemoAudienceCopyView,
  DemoComparisonView,
  DemoInsightsView,
  DemoTestsTimelineView,
} from "@/components/landing/hero-variant-b-demo/other-views";
import { DashboardDemoShell } from "@/components/demo/dashboard-demo-shell";
import {
  DemoEmailInboxView,
  DemoEmailInsightsView,
  DemoEmailSavedView,
  DemoPaidMediaSettingsView,
} from "@/components/demo/views/demo-email-views";
import {
  DemoOrganicFeedView,
  DemoOrganicInsightsView,
  DemoOrganicSettingsView,
} from "@/components/demo/views/demo-organic-views";
import {
  DemoWebsiteFromAdsView,
  DemoWebsiteLatestChangesView,
  DemoWebsiteTrackedView,
} from "@/components/demo/views/demo-website-views";
import {
  buildDashboardDemoCompetitorPath,
  DEMO_COMPETITOR,
  DEMO_OWN_BRAND,
  demoBrandForDomain,
} from "@/lib/demo/dashboard-demo-config";

export function DashboardDemoClient({ domain }: { domain: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brand = demoBrandForDomain(domain);
  const isOwnWorkspace = brand.isOwnWorkspace;

  const pageTabs = useMemo(
    () => competitorPageTabsForView({ isOwnWorkspace, showDebugTabs: true }),
    [isOwnWorkspace],
  );

  const initialTab = (searchParams.get("tab") ?? "ads library").trim() as CompetitorPageTabId;
  const validTab = pageTabs.some((t) => t.id === initialTab) ? initialTab : "ads library";
  const [mainTab, setMainTab] = useState<CompetitorPageTabId>(validTab);
  const [subTab, setSubTab] = useState<CompetitorSubTabId>(() => {
    const resolved = resolveSubTabFromParams(searchParams, validTab, {
      isOwnWorkspace,
      showDebugTabs: true,
    });
    return resolved ?? findCompetitorTab(validTab)?.defaultSubTab ?? "all";
  });
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());

  const syncUrl = useCallback(
    (tab: CompetitorPageTabId, sub: CompetitorSubTabId) => {
      const q = new URLSearchParams();
      q.set("tab", tab);
      q.set("sub", sub);
      router.replace(`${buildDashboardDemoCompetitorPath(domain)}?${q.toString()}`, { scroll: false });
    },
    [domain, router],
  );

  const handleMainTab = useCallback(
    (tab: CompetitorPageTabId) => {
      setMainTab(tab);
      const def = findCompetitorTab(tab);
      const nextSub = (def?.defaultSubTab ?? "all") as CompetitorSubTabId;
      setSubTab(nextSub);
      syncUrl(tab, nextSub);
    },
    [syncUrl],
  );

  const handleSubTab = useCallback(
    (sub: CompetitorSubTabId) => {
      setSubTab(sub);
      syncUrl(mainTab, sub);
    },
    [mainTab, syncUrl],
  );

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const renderView = () => {
    switch (mainTab) {
      case "ads library":
        if (subTab === "paid-media-settings") {
          return <DemoPaidMediaSettingsView />;
        }
        if (subTab === "creative-tests" || subTab === "timeline" || subTab === "landing-pages") {
          return (
            <DemoTestsTimelineView
              domain={domain}
              subTab={
                subTab === "timeline"
                  ? "timeline"
                  : subTab === "landing-pages"
                    ? "landing-pages"
                    : "creative-tests"
              }
            />
          );
        }
        if (subTab === "audience" || subTab === "copy-vault") {
          return (
            <DemoAudienceCopyView
              domain={domain}
              subTab={subTab === "copy-vault" ? "copy-vault" : "audience"}
            />
          );
        }
        return (
          <DemoAdLibraryView
            domain={domain}
            subTab={subTab === "saved" ? "saved" : "all"}
            savedIds={savedIds}
            onToggleSave={toggleSave}
          />
        );
      case "organic":
        if (subTab === "insights") return <DemoOrganicInsightsView domain={domain} competitorName={brand.name} />;
        if (subTab === "organic-settings") return <DemoOrganicSettingsView domain={domain} />;
        return <DemoOrganicFeedView domain={domain} competitorName={brand.name} />;
      case "website":
        if (subTab === "from-ads") return <DemoWebsiteFromAdsView />;
        if (subTab === "latest-changes") return <DemoWebsiteLatestChangesView />;
        return <DemoWebsiteTrackedView />;
      case "email-marketing":
        if (subTab === "saved") return <DemoEmailSavedView competitorName={brand.name} />;
        if (subTab === "insights") return <DemoEmailInsightsView competitorName={brand.name} />;
        return <DemoEmailInboxView competitorName={brand.name} />;
      case "insights":
        return (
          <DemoInsightsView
            domain={domain}
            subTab={subTab === "activity-feed" ? "activity-feed" : "strategy-map"}
            competitorName={brand.name}
          />
        );
      case "comparison":
        return (
          <DemoComparisonView
            workspaceName={DEMO_OWN_BRAND.name}
            competitorName={brand.isOwnWorkspace ? DEMO_COMPETITOR.name : brand.name}
          />
        );
      case "alerts":
        return <DemoAlertsView />;
      default:
        return null;
    }
  };

  return (
    <DashboardDemoShell
      domain={domain}
      mainTab={mainTab}
      subTab={subTab}
      pageTabs={pageTabs}
      onMainTab={handleMainTab}
      onSubTab={handleSubTab}
    >
      {renderView()}
    </DashboardDemoShell>
  );
}
