"use client";

import { AudienceInferencePanel } from "@/components/comparison/panels/audience-inference-panel";
import { RivalLoadingBlock } from "@/components/ui/rival-loading";
import type { ComparisonPayloadJson } from "@/lib/comparison/comparison-payload-types";
import { googleFaviconUrlForDomain } from "@/lib/discovery";

type Props = {
  competitorDomain: string;
  workspaceName: string;
  workspaceLogoUrl: string | null;
  workspaceDomain: string | null;
  workspaceColor?: string;
  workspaceBadge?: string;
  competitorLabel: string;
  competitorLogoUrl: string | null;
  comparisonPayload: ComparisonPayloadJson | null;
  comparisonPayloadLoading: boolean;
  comparisonPayloadError: string | null;
  onRequestAudienceRefresh?: () => void;
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
  comparisonPayload,
  comparisonPayloadLoading,
  comparisonPayloadError,
  onRequestAudienceRefresh,
}: Props) {
  if (comparisonPayloadLoading) {
    return (
      <RivalLoadingBlock
        title="Loading audience inference…"
        description="Contrasting scraped copy and angles between your workspace and this competitor."
        padded
        className="mx-auto max-w-5xl py-16"
      />
    );
  }

  if (comparisonPayloadError) {
    return (
      <div className="py-12 text-center">
        <p className="text-[13px] text-red-700">{comparisonPayloadError}</p>
      </div>
    );
  }

  const data = comparisonPayload;

  if (!data?.ok || !data.workspace?.payload || !data.competitor?.payload) {
    return (
      <div className="py-12 text-center">
        <p className="text-[13px] text-slate-500">
          {data?.error ?? "Could not load audience data. Confirm workspace and competitor are set up."}
        </p>
      </div>
    );
  }

  const wsPayload = data.workspace.payload;
  const compPayload = data.competitor.payload;
  const wsLogo =
    workspaceLogoUrl?.trim() ||
    (workspaceDomain?.trim() ? googleFaviconUrlForDomain(workspaceDomain.trim()) : null);
  const compLogo = competitorLogoUrl?.trim() || googleFaviconUrlForDomain(competitorDomain);

  const audienceHistory = data.competitor?.audienceHistory ?? [];
  const lastScrapedAt = data.competitor?.meta?.lastScrapedAt ?? null;
  const activeAdCount =
    typeof compPayload.totalAdCount === "number"
      ? compPayload.totalAdCount
      : typeof compPayload.enrichedAdCount === "number"
        ? compPayload.enrichedAdCount
        : 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <AudienceInferencePanel
        workspace={{
          name: workspaceName,
          color: workspaceColor,
          badge: workspaceBadge,
          logoUrl: wsLogo,
          domain: workspaceDomain,
          audience: wsPayload.audience_inference,
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
        competitorLastScrapedAt={lastScrapedAt}
        competitorActiveAdCount={activeAdCount}
        onRequestAudienceRefresh={onRequestAudienceRefresh}
      />
    </div>
  );
}
