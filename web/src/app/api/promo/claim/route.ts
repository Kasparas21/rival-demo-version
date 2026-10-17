import { Resend } from "resend";
import { NextResponse, type NextRequest } from "next/server";
import { getResendApiKey, getResendFromEmail } from "@/lib/email/resend-config";
import { parseLocale } from "@/lib/i18n/locale";
import { FIRST_MONTH_OFFER, fillOffer, firstMonthOfferCopy } from "@/lib/promo/first-month-offer";
import { clientIp, hitRateLimit, PUBLIC_EMAIL_LIMITS } from "@/lib/rate-limit";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** Emails the landing's surprise discount code. Nothing is stored. */
export async function POST(request: NextRequest) {
  let body: { email?: unknown; locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !emailRe.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const [ipAllowed, emailAllowed] = await Promise.all([
    hitRateLimit(`promo-claim:ip:${clientIp(request)}`, PUBLIC_EMAIL_LIMITS.perIp),
    hitRateLimit(`promo-claim:email:${email}`, PUBLIC_EMAIL_LIMITS.perEmail),
  ]);
  if (!ipAllowed || !emailAllowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  const apiKey = getResendApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "email_unavailable" }, { status: 503 });
  }

  const locale = parseLocale(typeof body.locale === "string" ? body.locale : null);
  const copy = firstMonthOfferCopy(locale).email;
  const { code, percentOff } = FIRST_MONTH_OFFER;
  const signupUrl = `${new URL(request.url).origin}/signup`;
  const heading = fillOffer(copy.heading, { percent: percentOff });

  const { error } = await new Resend(apiKey).emails.send({
    from: getResendFromEmail(),
    to: email,
    subject: fillOffer(copy.subject, { percent: percentOff, code }),
    text: `${heading}\n\n${code}\n\n${copy.body}\n\n${copy.cta}: ${signupUrl}\n\n${copy.footer}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111827">
        <h1 style="font-size:24px;font-weight:600;letter-spacing:-0.03em;margin:0 0 16px">${escapeHtml(heading)}</h1>
        <div style="display:inline-block;padding:14px 22px;border-radius:14px;background:#ddf1fd;color:#16191d;font-size:26px;font-weight:700;letter-spacing:0.08em">${escapeHtml(code)}</div>
        <p style="font-size:15px;line-height:1.6;color:#4a5b6c;margin:18px 0 24px">${escapeHtml(copy.body)}</p>
        <a href="${escapeHtml(signupUrl)}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#16191d;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none">${escapeHtml(copy.cta)}</a>
        <p style="font-size:12px;color:#8695a5;margin:28px 0 0">${escapeHtml(copy.footer)}</p>
      </div>`,
  });
  if (error) {
    console.error("[promo-claim] resend send failed", error);
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, code });
}
