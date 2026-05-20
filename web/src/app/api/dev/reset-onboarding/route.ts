import { NextResponse, type NextRequest } from "next/server";
import { isDevToolsRouteEnabled } from "@/lib/auth/local-dev";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Local-only: set `onboarding_completed` false so you can run the full onboarding flow again. */
export async function POST(request: NextRequest) {
  if (!isDevToolsRouteEnabled(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: false, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
