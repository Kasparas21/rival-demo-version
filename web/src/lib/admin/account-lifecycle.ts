import type { SupabaseClient } from "@supabase/supabase-js";

import type { BillingEntitlement } from "@/lib/billing/entitlements";
import { getBillingEntitlement } from "@/lib/billing/entitlements";
import type { Database, Json } from "@/lib/supabase/types";

export const ADMIN_ACCOUNT_STATUS_SUSPENDED = "suspended";

export type AdminSuspensionMeta = {
  admin_account_status: typeof ADMIN_ACCOUNT_STATUS_SUSPENDED;
  admin_suspended_at: string;
  admin_suspended_by: string;
  admin_suspension_reason?: string;
};

function readPayloadRecord(rawPayload: unknown): Record<string, unknown> {
  if (typeof rawPayload === "object" && rawPayload !== null && !Array.isArray(rawPayload)) {
    return rawPayload as Record<string, unknown>;
  }
  return {};
}

export function isAdminSuspendedAccount(rawPayload: unknown): boolean {
  const status = readPayloadRecord(rawPayload).admin_account_status;
  return status === ADMIN_ACCOUNT_STATUS_SUSPENDED;
}

export function readAdminSuspensionMeta(rawPayload: unknown): AdminSuspensionMeta | null {
  const payload = readPayloadRecord(rawPayload);
  if (payload.admin_account_status !== ADMIN_ACCOUNT_STATUS_SUSPENDED) return null;
  const suspendedAt = typeof payload.admin_suspended_at === "string" ? payload.admin_suspended_at : null;
  const suspendedBy = typeof payload.admin_suspended_by === "string" ? payload.admin_suspended_by : null;
  if (!suspendedAt || !suspendedBy) return null;
  const reason =
    typeof payload.admin_suspension_reason === "string" && payload.admin_suspension_reason.trim()
      ? payload.admin_suspension_reason.trim()
      : undefined;
  return {
    admin_account_status: ADMIN_ACCOUNT_STATUS_SUSPENDED,
    admin_suspended_at: suspendedAt,
    admin_suspended_by: suspendedBy,
    ...(reason ? { admin_suspension_reason: reason } : {}),
  };
}

export function applyAdminSuspensionToPayload(
  rawPayload: unknown,
  params: { adminUserId: string; reason?: string | null },
): Record<string, unknown> {
  const payload = { ...readPayloadRecord(rawPayload) };
  payload.admin_account_status = ADMIN_ACCOUNT_STATUS_SUSPENDED;
  payload.admin_suspended_at = new Date().toISOString();
  payload.admin_suspended_by = params.adminUserId;
  const reason = params.reason?.trim();
  if (reason) payload.admin_suspension_reason = reason;
  else delete payload.admin_suspension_reason;
  return payload;
}

export function clearAdminSuspensionFromPayload(rawPayload: unknown): Record<string, unknown> {
  const payload = { ...readPayloadRecord(rawPayload) };
  delete payload.admin_account_status;
  delete payload.admin_suspended_at;
  delete payload.admin_suspended_by;
  delete payload.admin_suspension_reason;
  return payload;
}

export function hasReadOnlyRetentionAccess(
  billing: Pick<BillingEntitlement, "isAdminSuspended">,
): boolean {
  return billing.isAdminSuspended;
}

export function adminSuspendedResponseBody(
  message = "This account is suspended. You can view existing data but cannot run new scrapes or AI analysis.",
) {
  return {
    ok: false,
    code: "admin_suspended",
    error: message,
  };
}

export async function userIsAdminSuspended(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const billing = await getBillingEntitlement(supabase, userId);
  return billing.isAdminSuspended;
}

export async function loadBillingRawPayload(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<Record<string, unknown>> {
  const { data } = await admin
    .from("billing_subscriptions")
    .select("raw_payload")
    .eq("user_id", userId)
    .maybeSingle();
  return readPayloadRecord(data?.raw_payload);
}

export async function upsertBillingSuspensionPayload(
  admin: SupabaseClient<Database>,
  userId: string,
  rawPayload: Record<string, unknown>,
  billingPatch?: {
    status?: string;
    cancel_at_period_end?: boolean;
    canceled_at?: string | null;
    ended_at?: string | null;
  },
): Promise<string | null> {
  const { data: existing } = await admin
    .from("billing_subscriptions")
    .select("polar_product_id, polar_subscription_id, status")
    .eq("user_id", userId)
    .maybeSingle();

  const nowIso = new Date().toISOString();
  const { error } = await admin.from("billing_subscriptions").upsert(
    {
      user_id: userId,
      polar_product_id: existing?.polar_product_id ?? "admin-override",
      status: billingPatch?.status ?? existing?.status ?? "canceled",
      raw_payload: rawPayload as Json,
      updated_at: nowIso,
      ...(billingPatch?.cancel_at_period_end !== undefined
        ? { cancel_at_period_end: billingPatch.cancel_at_period_end }
        : {}),
      ...(billingPatch?.canceled_at !== undefined ? { canceled_at: billingPatch.canceled_at } : {}),
      ...(billingPatch?.ended_at !== undefined ? { ended_at: billingPatch.ended_at } : {}),
    },
    { onConflict: "user_id" },
  );

  return error?.message ?? null;
}
