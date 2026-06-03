import { Resend } from "resend";
import { NextResponse, type NextRequest } from "next/server";
import { buildEmailTokenCallbackUrl } from "@/lib/auth/build-email-token-callback-url";
import { getResendApiKey, getResendFromEmail } from "@/lib/email/resend-config";
import { authLinkOriginForRequest } from "@/lib/auth/auth-link-origin";
import { pickHashedTokenFromGenerateLinkProperties } from "@/lib/auth/pick-hashed-token-from-generate-link";
import {
  matchesTesterInviteCode,
  normalizeInviteCode,
} from "@/lib/billing/tester-invite";
import { persistTesterInviteToUserMetadata } from "@/lib/billing/tester-invite-user";
import { fillCopyTemplate } from "@/lib/i18n/fill-copy-template";
import { getSignupCopy } from "@/lib/i18n/auth";
import { LOCALE_COOKIE, LOCALE_HEADER, parseLocale } from "@/lib/i18n/locale";
import { getPostHogServerClient } from "@/lib/analytics/posthog-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resolveSignupTesterInvite(_request: NextRequest, bodyTester?: string): string | null {
  if (typeof bodyTester !== "string" || !bodyTester.trim()) return null;
  return matchesTesterInviteCode(bodyTester) ? normalizeInviteCode(bodyTester) : null;
}

export async function POST(request: NextRequest) {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Resend is not configured (RESEND_API_KEY)" }, { status: 503 });
  }

  let body: { email?: string; password?: string; next?: string; testerInvite?: string; locale?: string };
  try {
    body = (await request.json()) as {
      email?: string;
      password?: string;
      next?: string;
      testerInvite?: string;
      locale?: string;
    };
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

  const testerInvite = resolveSignupTesterInvite(request, body.testerInvite);

  const locale = parseLocale(
    body.locale ?? request.cookies.get(LOCALE_COOKIE)?.value ?? request.headers.get(LOCALE_HEADER),
  );
  const emailCopy = getSignupCopy(locale).confirmationEmail;

  const origin = authLinkOriginForRequest(request);
  const redirectParams = new URLSearchParams({ next });
  if (testerInvite) redirectParams.set("tester", testerInvite);
  const redirectTo = `${origin}/auth/callback?${redirectParams.toString()}`;

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
      { status: 400 },
    );
  }

  const userId = linkData.user?.id;
  if (userId && testerInvite) {
    try {
      await persistTesterInviteToUserMetadata(admin, userId, testerInvite);
    } catch (err) {
      console.error("[sign-up-email] persist tester invite metadata", err);
    }
  }

  const confirmUrl = buildEmailTokenCallbackUrl({
    origin,
    hashedToken,
    otpType: "signup",
    nextPath: next,
    testerCode: testerInvite,
  });

  const resend = new Resend(apiKey);
  const from = getResendFromEmail();

  const { data, error: sendErr } = await resend.emails.send({
    from,
    to: email,
    subject: emailCopy.subject,
    text: fillCopyTemplate(emailCopy.text, { url: confirmUrl }),
    html: `
      <p style="font-family: system-ui, sans-serif; font-size: 15px; color: #111;">
        ${emailCopy.htmlIntro}
      </p>
      <p style="font-family: system-ui, sans-serif;">
        <a
          href="${confirmUrl}"
          style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;"
        >${emailCopy.htmlButton}</a>
      </p>
      <p style="font-family: system-ui, sans-serif; font-size: 12px; color: #64748b;">
        ${emailCopy.htmlIgnore}
      </p>
    `,
  });

  if (sendErr) {
    return NextResponse.json({ error: sendErr.message || "Email send failed" }, { status: 502 });
  }

  if (!data?.id) {
    return NextResponse.json({ error: "Email send failed" }, { status: 502 });
  }

  const posthog = getPostHogServerClient();
  if (posthog && userId) {
    posthog.capture({
      distinctId: userId,
      event: "user_signed_up",
      properties: {
        email,
        locale,
        has_tester_invite: Boolean(testerInvite),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
