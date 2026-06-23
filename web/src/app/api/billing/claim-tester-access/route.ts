import { NextResponse, type NextRequest } from "next/server";

import { claimTesterAccessForUser } from "@/lib/billing/claim-tester-access-core";
import { setTesterInviteCookie } from "@/lib/billing/tester-invite";
import { resolveTesterInviteCodeForUser } from "@/lib/billing/tester-invite-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Complimentary Pro for valid tester invites when Polar checkout still asks for a card. */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const inviteCode = await resolveTesterInviteCodeForUser(user.id, request);
  const admin = createSupabaseAdminClient();
  const result = await claimTesterAccessForUser(admin, user.id, inviteCode);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  const out = NextResponse.json({
    ok: true,
    planTier: "pro",
    startWorkspaceScrape: result.startWorkspaceScrape,
  });
  setTesterInviteCookie(out, result.inviteCode);
  return out;
}
