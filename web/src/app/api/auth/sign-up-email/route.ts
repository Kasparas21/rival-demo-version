import { Resend } from "resend";
import { NextResponse, type NextRequest } from "next/server";
import { buildEmailTokenCallbackUrl } from "@/lib/auth/build-email-token-callback-url";
import { getResendApiKey, getResendFromEmail } from "@/lib/email/resend-config";
import { authLinkOriginForRequest } from "@/lib/auth/auth-link-origin";
import { pickHashedTokenFromGenerateLinkProperties } from "@/lib/auth/pick-hashed-token-from-generate-link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Resend is not configured (RESEND_API_KEY)" }, { status: 503 });
  }

  let body: { email?: string; password?: string; next?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string; next?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !emailRe.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const nextRaw = typeof body.next === "string" ? body.next : "/dashboard/spy";
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard/spy";

  const origin = authLinkOriginForRequest(request);
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const admin = createSupabaseAdminClient();

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { redirectTo },
  });

  const hashedToken = pickHashedTokenFromGenerateLinkProperties(linkData?.properties);
  if (linkError || !hashedToken) {
    return NextResponse.json(
      { error: linkError?.message ?? "Could not create account or confirmation link" },
      { status: 400 }
    );
  }

  const confirmUrl = buildEmailTokenCallbackUrl({
    origin,
    hashedToken,
    otpType: "signup",
    nextPath: next,
  });

  const resend = new Resend(apiKey);
  const from = getResendFromEmail();

  const { data, error: sendErr } = await resend.emails.send({
    from,
    to: email,
    subject: "Confirm your Rival signup",
    text: `Confirm your email to finish creating your account (link expires soon):\n\n${confirmUrl}\n`,
    html: `
      <p style="font-family: system-ui, sans-serif; font-size: 15px; color: #111;">
        Confirm your email to finish creating your Spy Rival account. This link expires shortly.
      </p>
      <p style="font-family: system-ui, sans-serif;">
        <a
          href="${confirmUrl}"
          style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;"
        >Confirm your email</a>
      </p>
      <p style="font-family: system-ui, sans-serif; font-size: 12px; color: #64748b;">
        If you did not sign up for Rival, you can ignore this email.
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
