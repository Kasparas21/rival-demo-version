import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { authLinkOriginForRequest } from "@/lib/auth/auth-link-origin";
import { pickHashedTokenFromGenerateLinkProperties } from "@/lib/auth/pick-hashed-token-from-generate-link";

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

  const nextRaw = typeof body.next === "string" ? body.next : "/dashboard/spy";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard/spy";

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

  const appUrl = authLinkOriginForRequest(request);
  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  const hashedToken = pickHashedTokenFromGenerateLinkProperties(linkData?.properties);
  if (linkError || !hashedToken) {
    return NextResponse.json(
      { error: linkError?.message ?? "Could not generate sign-in link" },
      { status: 500 }
    );
  }

  const callback = new URL("/auth/callback", appUrl);
  callback.searchParams.set("token_hash", hashedToken);
  callback.searchParams.set("type", "email");
  callback.searchParams.set("next", next);

  return NextResponse.json({ actionLink: callback.toString() });
}
