"use client";

import { Sprout } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { COMPETITOR_PAGE_SHELL, COMPETITOR_PAGE_X } from "@/components/dashboard/competitor/competitor-page-layout";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import type { CompetitorSubTabId } from "@/components/dashboard/competitor/competitor-tabs-data";
import {
  buildOrganicPostDetailSeed,
  type OrganicPostDetailOpenSeed,
} from "@/lib/organic-content/organic-post-detail-cache";
import { parseOrganicSocials } from "@/lib/organic-content/socials";
import type { OrganicSocials } from "@/lib/organic-content/types";
import { useOrganicPostDetailState } from "@/lib/organic-content/use-organic-post-detail-state";

import { OrganicFeedPanel } from "./OrganicFeedPanel";
import { OrganicInsightsPanel } from "./OrganicInsightsPanel";
import { OrganicPostDetailDrawer } from "./OrganicPostDetailDrawer";
import type { OrganicPostCardData } from "./OrganicPostCard";
import { OrganicSettingsPanel } from "./OrganicSettingsPanel";

type OrganicTabProps = {
  competitorId?: string;
  competitorName: string;
  activeSubTab: CompetitorSubTabId | null;
  onSubTabChange: (sub: CompetitorSubTabId) => void;
  isOwnWorkspace?: boolean;
};

export function OrganicTab({
  competitorId,
  competitorName,
  activeSubTab,
  onSubTabChange,
  isOwnWorkspace = false,
}: OrganicTabProps) {
  const [socials, setSocials] = useState<OrganicSocials>({});
  const [loadingSocials, setLoadingSocials] = useState(true);
  const [feedRefreshTrigger, setFeedRefreshTrigger] = useState(0);
  const [pendingOpenSeed, setPendingOpenSeed] = useState<OrganicPostDetailOpenSeed | null>(null);

  const { activePostId, openPost, closePost } = useOrganicPostDetailState(competitorId);
  const subTab = activeSubTab === "insights" || activeSubTab === "organic-settings" ? activeSubTab : "feed";

  const closePostDetail = useCallback(() => {
    setPendingOpenSeed(null);
    closePost();
  }, [closePost]);

  useEffect(() => {
    if (activePostId) setPendingOpenSeed(null);
  }, [activePostId]);

  const handlePostClick = useCallback(
    (post: OrganicPostCardData) => {
      if (!competitorId) return;
      const seed = buildOrganicPostDetailSeed(post, { id: competitorId, name: competitorName });
      openPost(post.id, seed);
    },
    [competitorId, competitorName, openPost],
  );

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
          {isOwnWorkspace
            ? "Link your workspace brand first to track your organic social content."
            : "Save this competitor first to track their organic social content."}
        </p>
      </div>
    );
  }

  return (
    <div className={COMPETITOR_PAGE_SHELL}>
      <FeatureSectionHeader
        overline="Organic"
        title={`Organic · ${competitorName}`}
        description={
          isOwnWorkspace
            ? "Track your brand's social posts, engagement, and AI-generated content insights."
            : "Track competitor social posts, engagement, and AI-generated content insights."
        }
      />

      <div className="mt-5">
        {loadingSocials && subTab === "feed" ? (
          <div className="py-12 text-center text-[14px] text-slate-500">Loading…</div>
        ) : subTab === "feed" ? (
          <OrganicFeedPanel
            competitorId={competitorId}
            socials={socials}
            refreshTrigger={feedRefreshTrigger}
            onGoToSettings={() => onSubTabChange("organic-settings")}
            onPostClick={handlePostClick}
          />
        ) : subTab === "insights" ? (
          <OrganicInsightsPanel
            competitorId={competitorId}
            socials={socials}
            socialsLoading={loadingSocials}
            onGoToSettings={() => onSubTabChange("organic-settings")}
            onPostClick={handlePostClick}
          />
        ) : (
          <OrganicSettingsPanel
            competitorId={competitorId}
            initialSocials={socials}
            onSaved={(next) => setSocials(next)}
            onScrapeComplete={() => setFeedRefreshTrigger((n) => n + 1)}
            isOwnWorkspace={isOwnWorkspace}
          />
        )}
      </div>

      <OrganicPostDetailDrawer
        competitorId={competitorId}
        postId={activePostId}
        openSeed={pendingOpenSeed}
        socials={socials}
        onClose={closePostDetail}
      />
    </div>
  );
}
