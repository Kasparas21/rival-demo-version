import { NextResponse } from "next/server";

import { deleteUserAccount } from "@/lib/admin/delete-user-account";
import { logAdminEvent, authorizeAdminWriteRequest } from "@/lib/admin/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

type DeleteBody = { confirmEmail?: string };

export async function POST(req: Request, context: RouteContext) {
  const auth = await authorizeAdminWriteRequest(req);
  if (!auth.ok) return auth.response;

  const { id: userId } = await context.params;
  const { adminClient, actorUserId } = auth.ctx;

  if (actorUserId && actorUserId === userId) {
    return NextResponse.json({ error: "You cannot delete your own admin account from here." }, { status: 400 });
  }

  let body: DeleteBody;
  try {
    body = (await req.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const confirmEmail = body.confirmEmail?.trim().toLowerCase() ?? "";
  if (!confirmEmail) {
    return NextResponse.json({ error: "confirmEmail is required" }, { status: 400 });
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const profileEmail = profile.email?.trim().toLowerCase() ?? "";
  if (!profileEmail || confirmEmail !== profileEmail) {
    return NextResponse.json({ error: "Email confirmation does not match this user." }, { status: 400 });
  }

  const { data: billingRow } = await adminClient
    .from("billing_subscriptions")
    .select("polar_customer_id, polar_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  await logAdminEvent(adminClient, {
    actorUserId,
    targetUserId: userId,
    eventType: "admin_user_deleted",
    payload: { email: profileEmail },
  });

  const result = await deleteUserAccount({
    admin: adminClient,
    userId,
    polarCustomerId: billingRow?.polar_customer_id,
    polarSubscriptionId: billingRow?.polar_subscription_id,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, stage: result.stage },
      { status: result.stage === "polar" ? 502 : 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
