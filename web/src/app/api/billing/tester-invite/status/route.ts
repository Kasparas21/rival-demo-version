import { NextResponse, type NextRequest } from "next/server";

import {
  validateTesterInviteAccess,
} from "@/lib/billing/tester-invite";
import { resolveTesterInviteCodeForUser } from "@/lib/billing/tester-invite-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const inviteCode = user
    ? await resolveTesterInviteCodeForUser(user.id, request)
    : null;
  const admin = createSupabaseAdminClient();
  const status = await validateTesterInviteAccess(admin, {
    inviteCode,
    userId: user?.id ?? null,
  });

  return NextResponse.json({
    ok: true,
    active: status.valid,
    remaining: status.remaining,
    reason: status.reason,
  });
}
