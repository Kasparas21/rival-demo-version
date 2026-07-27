import { NextResponse } from "next/server";

import {
  clearAdminSuspensionFromPayload,
  loadBillingRawPayload,
  upsertBillingSuspensionPayload,
} from "@/lib/admin/account-lifecycle";
import { logAdminEvent, authorizeAdminWriteRequest } from "@/lib/admin/route-auth";
import { rebuildAdminUserSnapshot } from "@/lib/admin/rebuild-snapshots";
import { getBillingEntitlement } from "@/lib/billing/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  const auth = await authorizeAdminWriteRequest(req);
  if (!auth.ok) return auth.response;

  const { id: userId } = await context.params;
  const { adminClient, actorUserId } = auth.ctx;

  const { data: profile } = await adminClient.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existingPayload = await loadBillingRawPayload(adminClient, userId);
  const rawPayload = clearAdminSuspensionFromPayload(existingPayload);

  const upsertErr = await upsertBillingSuspensionPayload(adminClient, userId, rawPayload);
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr }, { status: 500 });
  }

  await logAdminEvent(adminClient, {
    actorUserId,
    targetUserId: userId,
    eventType: "admin_user_unsuspended",
    payload: {},
  });

  try {
    await rebuildAdminUserSnapshot(adminClient, userId);
  } catch (e) {
    console.warn("[admin] snapshot rebuild after unsuspend", e);
  }

  const billing = await getBillingEntitlement(adminClient, userId);
  return NextResponse.json({ ok: true, billing });
}
