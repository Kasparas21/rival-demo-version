import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyWeeklyDigestUnsubscribeToken } from "@/lib/digest/unsubscribe-token";

export const runtime = "nodejs";

const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function confirmationHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Unsubscribed</title></head>
<body style="margin:0;padding:40px 16px;background:#FAFAFA;font-family:${FONT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;border:1px solid #E5E7EB;border-radius:12px;background:#FFFFFF;">
        <tr><td style="padding:28px 24px;font-size:15px;line-height:22px;color:#0A0A0A;">${message}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function unsubscribeUser(token: string): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const userId = verifyWeeklyDigestUnsubscribeToken(token);
  if (!userId) {
    return { ok: false, status: 400, message: "This unsubscribe link is invalid or expired." };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ weekly_digest_opted_out: true, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    console.error("[digest/unsubscribe]", error.message);
    return { ok: false, status: 500, message: "We could not save your preference. Please try again later." };
  }

  return { ok: true };
}

/** GET — one-click unsubscribe from email link. */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = (url.searchParams.get("token") ?? "").trim();
  if (!token) {
    return new Response(confirmationHtml("Missing unsubscribe token."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const result = await unsubscribeUser(token);
  if (!result.ok) {
    return new Response(confirmationHtml(result.message), {
      status: result.status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new Response(
    confirmationHtml(
      "You&apos;ve been unsubscribed from the weekly competitor digest. You&apos;ll still receive important account emails (billing, security, password reset)."
    ),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

/** POST — RFC 8058 one-click unsubscribe (List-Unsubscribe-Post). */
export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  let token = (url.searchParams.get("token") ?? "").trim();

  if (!token) {
    try {
      const body = await req.text();
      const params = new URLSearchParams(body);
      token = (params.get("token") ?? "").trim();
    } catch {
      /* ignore */
    }
  }

  if (!token) {
    return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
  }

  const result = await unsubscribeUser(token);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
