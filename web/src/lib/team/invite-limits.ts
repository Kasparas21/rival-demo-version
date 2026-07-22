import type { SupabaseClient } from "@supabase/supabase-js";

import { getBillingEntitlement } from "@/lib/billing/entitlements";
import type { Database } from "@/lib/supabase/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function countTeamViewerSlotsUsed(
  supabase: SupabaseClient<Database>,
  ownerUserId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("team_memberships")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", ownerUserId)
    .in("status", ["pending", "active"]);

  if (error) throw error;
  return count ?? 0;
}

export async function assertCanInviteTeamViewer(
  supabase: SupabaseClient<Database>,
  ownerUserId: string,
): Promise<{ maxTeamViewers: number; used: number }> {
  const billing = await getBillingEntitlement(supabase, ownerUserId);
  const maxTeamViewers = billing.limits.maxTeamViewers;
  if (maxTeamViewers <= 0) {
    throw new Error("Team viewers are not included on your current plan.");
  }
  const used = await countTeamViewerSlotsUsed(supabase, ownerUserId);
  if (used >= maxTeamViewers) {
    throw new Error(`Team viewer limit reached (${maxTeamViewers}). Revoke a member to invite someone new.`);
  }
  return { maxTeamViewers, used };
}

export function validateInviteEmail(email: string): string {
  const normalized = normalizeInviteEmail(email);
  if (!EMAIL_RE.test(normalized)) {
    throw new Error("Enter a valid email address.");
  }
  return normalized;
}
