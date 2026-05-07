import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Local-only instant email sign-in (uses service role). Off when DEV_INSTANT_EMAIL_LOGIN=false.
 * - `next dev`: enabled
 * - `next start` on localhost: enabled (NODE_ENV is production but host is local)
 * - Deployed production: disabled (hostname is not localhost)
 */
function isDevInstantLoginEnabled(request: NextRequest): boolean {
  if (process.env.DEV_INSTANT_EMAIL_LOGIN === "false") return false;
  if (process.env.NODE_ENV !== "production") return true;
  const hn = request.nextUrl.hostname.toLowerCase();
  return hn === "localhost" || hn === "127.0.0.1" || hn === "[::1]";
}

function siteOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  if (!isDevInstantLoginEnabled(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { email?: string; next?: string };
  try {
    body = (await request.json()) as { email?: string; next?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const nextRaw = typeof body.next === "string" ? body.next : "/dashboard";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";

  const admin = createSupabaseAdminClient();

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (
    createError &&
    !createError.message.toLowerCase().includes("already") &&
    !createError.message.toLowerCase().includes("registered")
  ) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  const redirectTo = `${siteOrigin(request)}/auth/callback?next=${encodeURIComponent(next)}`;

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json(
      { error: linkError?.message ?? "Could not generate sign-in link" },
      { status: 500 }
    );
  }

  const callback = new URL("/auth/callback", siteOrigin(request));
  callback.searchParams.set("token_hash", linkData.properties.hashed_token);
  callback.searchParams.set("type", "email");
  callback.searchParams.set("next", next);

  return NextResponse.json({ actionLink: callback.toString() });
}
