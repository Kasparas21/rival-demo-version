"use client";

import { Sprout } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { COMPETITOR_PAGE_SHELL, COMPETITOR_PAGE_X } from "@/components/dashboard/competitor/competitor-page-layout";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import type { CompetitorSubTabId } from "@/components/dashboard/competitor/competitor-tabs-data";
import { parseOrganicSocials } from "@/lib/organic-content/socials";
import type { OrganicSocials } from "@/lib/organic-content/types";

import { OrganicFeedPanel } from "./OrganicFeedPanel";
import { OrganicInsightsPanel } from "./OrganicInsightsPanel";
import { OrganicSettingsPanel } from "./OrganicSettingsPanel";

type OrganicTabProps = {
  competitorId?: string;
  competitorName: string;
  activeSubTab: CompetitorSubTabId | null;
  onSubTabChange: (sub: CompetitorSubTabId) => void;
};

export function OrganicTab({
  competitorId,
  competitorName,
  activeSubTab,
  onSubTabChange,
}: OrganicTabProps) {
  const [socials, setSocials] = useState<OrganicSocials>({});
  const [loadingSocials, setLoadingSocials] = useState(true);

  const subTab = activeSubTab === "insights" || activeSubTab === "organic-settings" ? activeSubTab : "feed";

  const loadSocials = useCallback(async () => {
    if (!competitorId) {
      setLoadingSocials(false);
      return;
    }
    setLoadingSocials(true);
    try {
      const res = await fetch(`/api/competitor/${competitorId}/organic/socials`);
      if (res.ok) {
        const data = (await res.json()) as { socials?: OrganicSocials };
        setSocials(parseOrganicSocials(data.socials));
      }
    } catch {
      // ignore
    } finally {
      setLoadingSocials(false);
    }
  }, [competitorId]);

  useEffect(() => {
    void loadSocials();
  }, [loadSocials]);

  if (!competitorId) {
    return (
      <div className={`flex flex-col items-center justify-center ${COMPETITOR_PAGE_X} py-24 text-center`}>
        <Sprout className="mb-4 h-12 w-12 text-slate-300" />
        <p className="max-w-md text-[14px] leading-relaxed text-slate-600">
          Save this competitor first to track their organic social content.
        </p>
      </div>
    );
  }

  return (
    <div className={COMPETITOR_PAGE_SHELL}>
      <FeatureSectionHeader
        overline="Organic"
        title={`Organic · ${competitorName}`}
        description="Track competitor social posts, engagement, and AI-generated content insights."
      />

      <div className="mt-5">
        {loadingSocials && subTab !== "organic-settings" ? (
          <div className="py-12 text-center text-[14px] text-slate-500">Loading…</div>
        ) : subTab === "feed" ? (
          <OrganicFeedPanel
            competitorId={competitorId}
            socials={socials}
            onGoToSettings={() => onSubTabChange("organic-settings")}
          />
        ) : subTab === "insights" ? (
          <OrganicInsightsPanel
            competitorId={competitorId}
            socials={socials}
            onGoToSettings={() => onSubTabChange("organic-settings")}
          />
        ) : (
          <OrganicSettingsPanel
            competitorId={competitorId}
            initialSocials={socials}
            onSaved={(next) => setSocials(next)}
          />
        )}
      </div>
    </div>
  );
}
