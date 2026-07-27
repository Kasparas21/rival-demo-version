import { NextResponse } from "next/server";

import { performAdminUserDelete } from "@/lib/admin/perform-admin-user-delete";
import { authorizeAdminWriteRequest, logAdminEvent } from "@/lib/admin/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BULK_DELETE_BATCH = 25;

type BulkDeleteBody = {
  userIds?: string[];
  confirmPhrase?: string;
};

export async function POST(req: Request) {
  const auth = await authorizeAdminWriteRequest(req);
  if (!auth.ok) return auth.response;

  const { adminClient, actorUserId } = auth.ctx;

  let body: BulkDeleteBody;
  try {
    body = (await req.json()) as BulkDeleteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawIds = Array.isArray(body.userIds) ? body.userIds : [];
  const userIds = [...new Set(rawIds.map((id) => id.trim()).filter(Boolean))];

  if (userIds.length === 0) {
    return NextResponse.json({ error: "userIds is required" }, { status: 400 });
  }

  if (userIds.length > MAX_BULK_DELETE_BATCH) {
    return NextResponse.json(
      { error: `Maximum ${MAX_BULK_DELETE_BATCH} users per request` },
      { status: 400 },
    );
  }

  const confirmPhrase = body.confirmPhrase?.trim() ?? "";
  const expectedPhrase = `DELETE ${userIds.length}`;
  if (confirmPhrase !== expectedPhrase) {
    return NextResponse.json(
      { error: `Confirmation must be exactly "${expectedPhrase}"` },
      { status: 400 },
    );
  }

  if (actorUserId && userIds.includes(actorUserId)) {
    return NextResponse.json(
      { error: "You cannot delete your own admin account in a bulk delete." },
      { status: 400 },
    );
  }

  const deleted: string[] = [];
  const failed: { userId: string; error: string }[] = [];

  for (const userId of userIds) {
    const result = await performAdminUserDelete({
      adminClient,
      actorUserId,
      targetUserId: userId,
    });

    if (result.ok) {
      deleted.push(userId);
    } else {
      failed.push({ userId, error: result.error });
    }
  }

  await logAdminEvent(adminClient, {
    actorUserId,
    targetUserId: deleted[0] ?? userIds[0]!,
    eventType: "admin_users_bulk_deleted",
    payload: {
      requested: userIds.length,
      deleted: deleted.length,
      failed: failed.length,
      deletedUserIds: deleted,
      failedUserIds: failed.map((f) => f.userId),
    },
  });

  return NextResponse.json({ ok: true, deleted, failed });
}
