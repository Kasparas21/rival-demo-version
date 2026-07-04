import type { SupabaseClient } from "@supabase/supabase-js";

import { getBillingEntitlement } from "@/lib/billing/entitlements";
import { countWatchedCompetitorSlotsForUser } from "@/lib/billing/brand-competitor-slots";
import { PLAN_DISPLAY_NAMES } from "@/lib/billing/plan-limits";
import { McpToolError } from "@/lib/mcp/errors";
import type { McpBillingContext } from "@/lib/mcp/types";
import type { Database } from "@/lib/supabase/types";

export async function loadMcpBillingContext(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<McpBillingContext> {
  const [billing, slotInfo] = await Promise.all([
    getBillingEntitlement(supabase, userId),
    countWatchedCompetitorSlotsForUser(supabase, userId),
  ]);

  return {
    planTier: billing.planTier,
    planName: billing.planName,
    hasAccess: billing.hasAccess,
    maxWatchedCompetitors: billing.limits.maxWatchedCompetitors,
    trackedCount: slotInfo.count,
  };
}

/** Copy Vault + proven-winner longevity views: same gate as /api/comparison/vault-ads (hasAccess, not tier-specific). */
export function assertCopyVaultAccess(billing: McpBillingContext): void {
  if (billing.hasAccess) return;
  throw new McpToolError(
    "plan_gated",
    "Copy Vault requires an active subscription — upgrade to continue.",
    "/checkout",
  );
}

export function assertCompetitorTracked(
  billing: McpBillingContext,
  found: boolean,
  competitorLabel?: string,
): void {
  if (found) return;
  const label = competitorLabel ? ` "${competitorLabel}"` : "";
  throw new McpToolError(
    "not_tracked",
    `competitor${label} is not on your watch list — you track ${billing.trackedCount} of ${billing.maxWatchedCompetitors} on your ${billing.planName} plan.`,
    "/dashboard",
  );
}

export function planGatedMessage(feature: string, requiredTier: keyof typeof PLAN_DISPLAY_NAMES): string {
  return `${feature} is available on the ${PLAN_DISPLAY_NAMES[requiredTier]} plan.`;
}
