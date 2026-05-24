"use client";

import { useEffect, useMemo } from "react";

import { COMPETITOR_PAGE_SHELL } from "@/components/dashboard/competitor/competitor-page-layout";
import { AudienceInferencePanel } from "@/components/comparison/panels/audience-inference-panel";
import { AudienceSkeleton } from "@/components/ui/feature-skeleton";
import type { AudienceSnapshotHistoryRow } from "@/lib/comparison/comparison-payload-types";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";
import { googleFaviconUrlForDomain } from "@/lib/discovery";
import { ADS_LIBRARY_UPDATED_EVENT } from "@/lib/strategy-overview/ads-library-strategy-bridge";

type AudienceSummaryJson = {
  ok?: boolean;
  error?: string;
  workspace?: {
    name: string;
    domain: string | null;
    logoUrl: string | null;
    payload: CompetitorStrategyOverviewPayload | null;
  };
  competitor?: {
    name: string;
    domain: string;
    logoUrl: string | null;
    lastScrapedAt: string | null;
    payload: CompetitorStrategyOverviewPayload | null;
    audienceHistory: AudienceSnapshotHistoryRow[];
    recomputing: boolean;
  };
};

type Props = {
  competitorDomain: string;
  workspaceName: string;
  workspaceLogoUrl: string | null;
  workspaceDomain: string | null;
  workspaceColor?: string;
  workspaceBadge?: string;
  competitorLabel: string;
  competitorLogoUrl: string | null;
  cacheDomainNorm: string;
  lastScrapedAt?: string | null;
  fetchEnabled?: boolean;
  externalRecomputeRunning?: boolean;
};

export function AudienceTab({
  competitorDomain,
  workspaceName,
  workspaceLogoUrl,
  workspaceDomain,
  workspaceColor,
  workspaceBadge,
  competitorLabel,
  competitorLogoUrl,
  cacheDomainNorm,
  lastScrapedAt = null,
  fetchEnabled = true,
  externalRecomputeRunning = false,
}: Props) {
  const stamp = lastScrapedAt ?? "none";
  const dom = cacheDomainNorm.trim().toLowerCase();
  const cacheKey = `${dom}:audience-summary:v1:${stamp}`;

  const { data, loading, error, refetch } = useScrapeKeyedCache<AudienceSummaryJson>({
    cacheKey,
    enabled: Boolean(dom && competitorDomain.trim() && fetchEnabled),
    validateCached: (c) => c.ok === true && Boolean(c.competitor),
    fetcher: async () => {
      const res = await fetch(
        `/api/competitor/audience-summary?competitorDomain=${encodeURIComponent(competitorDomain)}`,
        { credentials: "include" }
      );
      const json = (await res.json()) as AudienceSummaryJson;
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `audience-summary failed (${res.status})`);
      }
      return json;
    },
  });

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const handler: EventListener = (ev) => {
      const detail = (ev as CustomEvent<{ domain?: string }>).detail;
      const d = detail?.domain?.trim().toLowerCase() ?? "";
      if (!d || d !== dom) return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        debounce = null;
        void refetch({ force: true });
      }, 350);
    };
    window.addEventListener(ADS_LIBRARY_UPDATED_EVENT, handler);
    return () => {
      if (debounce) clearTimeout(debounce);
      window.removeEventListener(ADS_LIBRARY_UPDATED_EVENT, handler);
    };
  }, [dom, refetch]);

  const recomputing = externalRecomputeRunning || data?.competitor?.recomputing === true;
  const compPayload = data?.competitor?.payload ?? null;
  const activeAdCount = useMemo(() => {
    if (!compPayload) return 0;
    if (typeof compPayload.totalAdCount === "number") return compPayload.totalAdCount;
    if (typeof compPayload.enrichedAdCount === "number") return compPayload.enrichedAdCount;
    return compPayload.map?.activeAdCount ?? 0;
  }, [compPayload]);

  if (loading && !compPayload) {
    return <AudienceSkeleton className={`${COMPETITOR_PAGE_SHELL} py-16 sm:py-20`} />;
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-[13px] text-red-700">{error.message}</p>
      </div>
    );
  }

  if (!data?.ok || !compPayload) {
    if (recomputing) {
      return <AudienceSkeleton className={`${COMPETITOR_PAGE_SHELL} py-16`} />;
    }
    return (
      <div className="py-12 text-center">
        <p className="text-[13px] text-slate-500">
          {data?.error ?? "Could not load audience data. Confirm workspace and competitor are set up."}
        </p>
      </div>
    );
  }

  const wsPayload = data.workspace?.payload ?? null;
  const audienceHistory = data.competitor?.audienceHistory ?? [];
  const lastScrapedAtComp = data.competitor?.lastScrapedAt ?? null;
  const wsLogo =
    workspaceLogoUrl?.trim() ||
    (workspaceDomain?.trim() ? googleFaviconUrlForDomain(workspaceDomain.trim()) : null);
  const compLogo = competitorLogoUrl?.trim() || googleFaviconUrlForDomain(competitorDomain);

  return (
    <div className={COMPETITOR_PAGE_SHELL}>
      <AudienceInferencePanel
        workspace={{
          name: workspaceName,
          color: workspaceColor,
          badge: workspaceBadge,
          logoUrl: wsLogo,
          domain: workspaceDomain,
          audience: wsPayload?.audience_inference,
        }}
        competitor={{
          name: competitorLabel,
          logoUrl: compLogo,
          domain: competitorDomain,
          audience: compPayload.audience_inference,
        }}
        audienceComparisonNarrative={null}
        standaloneMode
        competitorAudienceHistory={audienceHistory}
        competitorLastScrapedAt={lastScrapedAtComp}
        competitorActiveAdCount={activeAdCount}
        competitorRecomputing={recomputing}
      />
    </div>
  );
}
