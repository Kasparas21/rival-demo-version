import { Resend } from "resend";
import { NextResponse, type NextRequest } from "next/server";
import { buildEmailTokenCallbackUrl } from "@/lib/auth/build-email-token-callback-url";
import { getResendApiKey, getResendFromEmail } from "@/lib/email/resend-config";
import { siteOriginFromRequest } from "@/lib/http/site-origin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_NEXT = "/reset-password";

export async function POST(request: NextRequest) {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Resend is not configured (RESEND_API_KEY)" }, { status: 503 });
  }

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !emailRe.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const origin = siteOriginFromRequest(request);
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(RESET_NEXT)}`;

  const admin = createSupabaseAdminClient();

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ ok: true });
  }

  const resetUrl = buildEmailTokenCallbackUrl({
    origin,
    hashedToken: linkData.properties.hashed_token,
    otpType: "recovery",
    nextPath: RESET_NEXT,
  });

  const resend = new Resend(apiKey);
  const from = getResendFromEmail();

  const { data, error: sendErr } = await resend.emails.send({
    from,
    to: email,
    subject: "Reset your Rival password",
    text: `Reset your password (link expires soon):\n\n${resetUrl}\n`,
    html: `
      <p style="font-family: system-ui, sans-serif; font-size: 15px; color: #111;">
        Someone requested a password reset for your Spy Rival account. Follow the link below. It expires shortly.
      </p>
      <p style="font-family: system-ui, sans-serif;">
        <a
          href="${resetUrl}"
          style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;"
        >Reset password</a>
      </p>
      <p style="font-family: system-ui, sans-serif; font-size: 12px; color: #64748b;">
        If you did not request this, you can ignore this email.
      </p>
    `,
  });

  if (sendErr) {
    return NextResponse.json({ error: sendErr.message || "Email send failed" }, { status: 502 });
  }

  if (!data?.id) {
    return NextResponse.json({ error: "Email send failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
