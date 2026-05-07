import { Resend } from "resend";
import { NextResponse, type NextRequest } from "next/server";
import { getResendApiKey, getResendFromEmail } from "@/lib/email/resend-config";
import { siteOriginFromRequest } from "@/lib/http/site-origin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function buildMagicLinkCallbackUrl(args: {
  origin: string;
  hashedToken: string;
  nextPath: string;
}): string {
  const callback = new URL("/auth/callback", args.origin);
  callback.searchParams.set("token_hash", args.hashedToken);
  callback.searchParams.set("type", "email");
  callback.searchParams.set("next", args.nextPath);
  return callback.toString();
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Resend is not configured", fallback: true },
      { status: 503 }
    );
  }

  let body: { email?: string; next?: string };
  try {
    body = (await request.json()) as { email?: string; next?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !emailRe.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const nextRaw = typeof body.next === "string" ? body.next : "/dashboard";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";

  const origin = siteOriginFromRequest(request);
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const admin = createSupabaseAdminClient();

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: false,
  });

  if (
    createError &&
    !createError.message.toLowerCase().includes("already") &&
    !createError.message.toLowerCase().includes("registered") &&
    !createError.message.toLowerCase().includes("exists")
  ) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

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

  const signInUrl = buildMagicLinkCallbackUrl({
    origin,
    hashedToken: linkData.properties.hashed_token,
    nextPath: next,
  });

  const resend = new Resend(apiKey);
  const from = getResendFromEmail();

  const { data, error: sendErr } = await resend.emails.send({
    from,
    to: email,
    subject: "Your sign-in link",
    text: `Sign in to Rival (link expires soon):\n\n${signInUrl}\n`,
    html: `
      <p style="font-family: system-ui, sans-serif; font-size: 15px; color: #111;">
        Use the button below to sign in. This link expires shortly.
      </p>
      <p style="font-family: system-ui, sans-serif;">
        <a
          href="${signInUrl}"
          style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;"
        >Sign in to Rival</a>
      </p>
      <p style="font-family: system-ui, sans-serif; font-size: 12px; color: #64748b;">
        If you did not request this email, you can ignore it.
      </p>
    `,
  });

  if (sendErr) {
    return NextResponse.json(
      { error: sendErr.message || "Email send failed" },
      { status: 502 }
    );
  }

  if (!data?.id) {
    return NextResponse.json({ error: "Email send failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
