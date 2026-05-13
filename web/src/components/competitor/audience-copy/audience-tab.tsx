"use client";

import { useEffect, useState } from "react";

import { AudienceInferencePanel } from "@/components/comparison/panels/audience-inference-panel";
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
}: Props) {
  const [data, setData] = useState<ComparisonPayloadJson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/comparison/payload?competitorDomain=${encodeURIComponent(competitorDomain)}`,
          { credentials: "include" },
        );
        const json = (await res.json()) as ComparisonPayloadJson;
        if (!cancelled) setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [competitorDomain]);

  if (loading) {
    return <div className="py-12 text-center text-[13px] text-slate-500">Loading audience…</div>;
  }

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
  const compLogo =
    competitorLogoUrl?.trim() || googleFaviconUrlForDomain(competitorDomain);

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
      />
    </div>
  );
}
