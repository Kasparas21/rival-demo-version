"use client";

import { CopyVaultPanel } from "@/components/comparison/panels/copy-vault-panel";

type Props = {
  competitorId: string;
  competitorLabel: string;
  onOpenAd: (adId: string) => void;
  cacheDomainNorm?: string | null;
  lastScrapedAt?: string | null;
  fetchEnabled?: boolean;
};

export function CopyVaultTab({
  competitorId,
  competitorLabel,
  onOpenAd,
  cacheDomainNorm,
  lastScrapedAt,
  fetchEnabled = true,
}: Props) {
  if (!competitorId) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12 text-center text-[13px] text-slate-500">
        Save this competitor to your spy list to load Copy Vault (requires a stored competitor id).
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <CopyVaultPanel
        competitorId={competitorId}
        competitorLabel={competitorLabel}
        standaloneMode
        onOpenAd={onOpenAd}
        cacheDomainNorm={cacheDomainNorm}
        lastScrapedAt={lastScrapedAt}
        fetchEnabled={fetchEnabled}
      />
    </div>
  );
}
