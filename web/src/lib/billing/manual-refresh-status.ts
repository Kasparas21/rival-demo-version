import type { BillingEntitlement } from "@/lib/billing/entitlements";

export type ManualRefreshBlockReason = "monthly_cap" | "cooldown" | "not_allowed" | null;

export type ManualRefreshStatus = {
  workspaceRefreshCount: number;
  workspaceLimit: number;
  lastRefreshAt: string | null;
  canRefreshNow: boolean;
  nextRefreshAt: string | null;
  blockReason: ManualRefreshBlockReason;
};

export function computeManualRefreshStatus(
  billing: BillingEntitlement,
  usage: {
    workspaceRefreshCount: number;
    lastRefreshAtForCompetitor: string | null;
  },
): ManualRefreshStatus {
  const workspaceLimit = billing.limits.manualRefreshPerMonth;
  const lastRefreshAt = usage.lastRefreshAtForCompetitor;

  if (billing.isUnlimited) {
    return {
      workspaceRefreshCount: usage.workspaceRefreshCount,
      workspaceLimit,
      lastRefreshAt,
      canRefreshNow: true,
      nextRefreshAt: null,
      blockReason: null,
    };
  }

  if (!billing.limits.allowManualRefresh) {
    return {
      workspaceRefreshCount: usage.workspaceRefreshCount,
      workspaceLimit,
      lastRefreshAt,
      canRefreshNow: false,
      nextRefreshAt: null,
      blockReason: "not_allowed",
    };
  }

  if (usage.workspaceRefreshCount >= workspaceLimit) {
    return {
      workspaceRefreshCount: usage.workspaceRefreshCount,
      workspaceLimit,
      lastRefreshAt,
      canRefreshNow: false,
      nextRefreshAt: null,
      blockReason: "monthly_cap",
    };
  }

  const intervalMs = billing.limits.manualRefreshMinIntervalMs;
  if (lastRefreshAt && intervalMs > 0) {
    const lastMs = Date.parse(lastRefreshAt);
    if (!Number.isNaN(lastMs)) {
      const nextMs = lastMs + intervalMs;
      if (Date.now() < nextMs) {
        return {
          workspaceRefreshCount: usage.workspaceRefreshCount,
          workspaceLimit,
          lastRefreshAt,
          canRefreshNow: false,
          nextRefreshAt: new Date(nextMs).toISOString(),
          blockReason: "cooldown",
        };
      }
    }
  }

  return {
    workspaceRefreshCount: usage.workspaceRefreshCount,
    workspaceLimit,
    lastRefreshAt,
    canRefreshNow: true,
    nextRefreshAt: null,
    blockReason: null,
  };
}
