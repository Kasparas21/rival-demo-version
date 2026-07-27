import { NextResponse } from "next/server";

import { performAdminUserDelete } from "@/lib/admin/perform-admin-user-delete";
import { authorizeAdminWriteRequest } from "@/lib/admin/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

type DeleteBody = { confirmEmail?: string };

export async function POST(req: Request, context: RouteContext) {
  const auth = await authorizeAdminWriteRequest(req);
  if (!auth.ok) return auth.response;

  const { id: userId } = await context.params;
  const { adminClient, actorUserId } = auth.ctx;

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

  const result = await performAdminUserDelete({
    adminClient,
    actorUserId,
    targetUserId: userId,
  });

  if (!result.ok) {
    if (result.selfDelete) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (result.notFound) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json(
      { error: result.error, stage: result.stage },
      { status: result.stage === "polar" ? 502 : 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
