import { NextResponse } from "next/server";

import { verifyAutopilotUnsubscribeToken } from "@/lib/autopilot/unsubscribe-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function disableAutopilot(userId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("autopilot_settings")
    .update({ enabled: false, watch_enabled: false })
    .eq("user_id", userId);
  return !error;
}

function confirmationHtml(message: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;max-width:480px;margin:0 auto;">
<h1 style="font-size:20px;">Autopilot</h1>
<p>${message}</p>
<p><a href="/dashboard/settings/autopilot">Manage autopilot settings</a></p>
</body></html>`;
}

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  const userId = verifyAutopilotUnsubscribeToken(token);
  if (!userId) {
    return new NextResponse(confirmationHtml("This link is invalid or expired."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const ok = await disableAutopilot(userId);
  return new NextResponse(
    confirmationHtml(
      ok
        ? "Autopilot is turned off. You will not receive autopilot emails until you turn it back on."
        : "We could not update your settings. Try again from the app.",
    ),
    { status: ok ? 200 : 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  let token = "";
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      token = new URLSearchParams(text).get("token")?.trim() ?? "";
    } else {
      const url = new URL(req.url);
      token = url.searchParams.get("token")?.trim() ?? "";
    }
  } catch {
    token = "";
  }

  const userId = verifyAutopilotUnsubscribeToken(token);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 400 });
  }

  const ok = await disableAutopilot(userId);
  return NextResponse.json({ ok });
}
