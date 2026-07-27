import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { adminCanWrite, authorizeAdminRequest } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminWriteContext = {
  adminClient: SupabaseClient<Database>;
  actorUserId: string | null;
};

export async function authorizeAdminWriteRequest(
  req: Request,
): Promise<{ ok: true; ctx: AdminWriteContext } | { ok: false; response: NextResponse }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const auth = await authorizeAdminRequest(req, supabase, user);
  if (!auth.ok) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!adminCanWrite(auth.admin.role)) {
    return { ok: false, response: NextResponse.json({ error: "Read-only admin access" }, { status: 403 }) };
  }

  return {
    ok: true,
    ctx: {
      adminClient: createSupabaseAdminClient(),
      actorUserId: user?.id ?? null,
    },
  };
}

export async function logAdminEvent(
  admin: SupabaseClient<Database>,
  params: {
    actorUserId: string | null;
    targetUserId: string;
    eventType: string;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await admin.from("admin_event_log").insert({
      actor_user_id: params.actorUserId,
      target_user_id: params.targetUserId,
      event_type: params.eventType,
      payload: params.payload as Json,
    });
  } catch (e) {
    console.warn("[admin] event log insert", e);
  }
}
