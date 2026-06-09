"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

import { DemoAdLibraryView } from "@/components/landing/hero-variant-b-demo/ad-library-view";
import { HeroVariantBDemoShell } from "@/components/landing/hero-variant-b-demo/chrome";
import { HeroVariantBDemoFeatureSwitch } from "@/components/landing/hero-variant-b-demo/feature-switch";
import {
  COMPETITOR_PAGE_TABS,
  type CompetitorPageTabId,
  type CompetitorSubTabId,
} from "@/components/dashboard/competitor/competitor-tabs-data";

const DemoInsightsView = dynamic(
  () =>
    import("@/components/landing/hero-variant-b-demo/other-views").then((m) => ({
      default: m.DemoInsightsView,
    })),
  { ssr: false },
);

const DemoTestsTimelineView = dynamic(
  () =>
    import("@/components/landing/hero-variant-b-demo/other-views").then((m) => ({
      default: m.DemoTestsTimelineView,
    })),
  { ssr: false },
);

const DemoAudienceCopyView = dynamic(
  () =>
    import("@/components/landing/hero-variant-b-demo/other-views").then((m) => ({
      default: m.DemoAudienceCopyView,
    })),
  { ssr: false },
);

const DemoComparisonView = dynamic(
  () =>
    import("@/components/landing/hero-variant-b-demo/other-views").then((m) => ({
      default: m.DemoComparisonView,
    })),
  { ssr: false },
);

const DemoAlertsView = dynamic(
  () =>
    import("@/components/landing/hero-variant-b-demo/other-views").then((m) => ({
      default: m.DemoAlertsView,
    })),
  { ssr: false },
);

function DemoViewFallback() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-[#e5e7eb] bg-white/80">
      <p className="text-[12px] text-[#94a3b8]">Loading preview…</p>
    </div>
  );
}

/** Full interactive product preview for hero variant B. */
export function HeroVariantBProductDemo() {
  const [mainTab, setMainTab] = useState<CompetitorPageTabId>("ads library");
  const [subTab, setSubTab] = useState<CompetitorSubTabId>("all");
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [visitedTabs, setVisitedTabs] = useState<Set<CompetitorPageTabId>>(
    () => new Set(["ads library"]),
  );

  const handleMainTab = useCallback((tab: CompetitorPageTabId) => {
    setMainTab(tab);
    setVisitedTabs((prev) => new Set(prev).add(tab));
    const def = COMPETITOR_PAGE_TABS.find((t) => t.id === tab);
    setSubTab(def?.defaultSubTab ?? "all");
  }, []);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const renderView = () => {
    if (!visitedTabs.has(mainTab)) {
      return <DemoViewFallback />;
    }

    switch (mainTab) {
      case "ads library":
        return (
          <DemoAdLibraryView
            subTab={subTab === "saved" ? "saved" : "all"}
            savedIds={savedIds}
            onToggleSave={toggleSave}
          />
        );
      case "insights":
        return (
          <DemoInsightsView
            subTab={subTab === "activity-feed" ? "activity-feed" : "strategy-map"}
          />
        );
      case "tests":
        return (
          <DemoTestsTimelineView
            subTab={
              subTab === "timeline"
                ? "timeline"
                : subTab === "landing-pages"
                  ? "landing-pages"
                  : "creative-tests"
            }
          />
        );
      case "audience-copy":
        return (
          <DemoAudienceCopyView subTab={subTab === "copy-vault" ? "copy-vault" : "audience"} />
        );
      case "comparison":
        return <DemoComparisonView />;
      case "alerts":
        return <DemoAlertsView />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      <HeroVariantBDemoFeatureSwitch activeTab={mainTab} onTabChange={handleMainTab} />
      <HeroVariantBDemoShell
        mainTab={mainTab}
        subTab={subTab}
        onMainTab={handleMainTab}
        onSubTab={setSubTab}
      >
        {renderView()}
      </HeroVariantBDemoShell>
    </div>
  );
}
