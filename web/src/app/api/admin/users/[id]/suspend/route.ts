import { NextResponse } from "next/server";

import {
  applyAdminSuspensionToPayload,
  loadBillingRawPayload,
  upsertBillingSuspensionPayload,
} from "@/lib/admin/account-lifecycle";
import { logAdminEvent, authorizeAdminWriteRequest } from "@/lib/admin/route-auth";
import { rebuildAdminUserSnapshot } from "@/lib/admin/rebuild-snapshots";
import { cancelPolarSubscriptionImmediately } from "@/lib/billing/cancel-polar-subscription";
import { getBillingEntitlement } from "@/lib/billing/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

type SuspendBody = { reason?: string | null };

export async function POST(req: Request, context: RouteContext) {
  const auth = await authorizeAdminWriteRequest(req);
  if (!auth.ok) return auth.response;

  const { id: userId } = await context.params;
  const { adminClient, actorUserId } = auth.ctx;

  const { data: profile } = await adminClient.from("profiles").select("id, email").eq("id", userId).maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let body: SuspendBody = {};
  try {
    body = (await req.json()) as SuspendBody;
  } catch {
    /* optional body */
  }

  const { data: billingRow } = await adminClient
    .from("billing_subscriptions")
    .select("polar_subscription_id, raw_payload")
    .eq("user_id", userId)
    .maybeSingle();

  const polarResult = await cancelPolarSubscriptionImmediately({
    polarSubscriptionId: billingRow?.polar_subscription_id,
  });
  if (!polarResult.ok) {
    return NextResponse.json({ error: polarResult.error }, { status: 502 });
  }

  const nowIso = new Date().toISOString();
  const rawPayload = applyAdminSuspensionToPayload(billingRow?.raw_payload ?? {}, {
    adminUserId: actorUserId ?? "admin",
    reason: body.reason,
  });

  const upsertErr = await upsertBillingSuspensionPayload(adminClient, userId, rawPayload, {
    status: "canceled",
    cancel_at_period_end: false,
    canceled_at: nowIso,
    ended_at: nowIso,
  });
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr }, { status: 500 });
  }

  await logAdminEvent(adminClient, {
    actorUserId,
    targetUserId: userId,
    eventType: "admin_user_suspended",
    payload: {
      reason: body.reason?.trim() || null,
      polarRevoked: polarResult.revoked,
    },
  });

  try {
    await rebuildAdminUserSnapshot(adminClient, userId);
  } catch (e) {
    console.warn("[admin] snapshot rebuild after suspend", e);
  }

  const billing = await getBillingEntitlement(adminClient, userId);
  return NextResponse.json({
    ok: true,
    billing,
    polarRevoked: polarResult.revoked,
  });
}
