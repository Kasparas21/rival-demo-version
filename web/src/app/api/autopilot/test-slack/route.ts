import { NextResponse } from "next/server";

import { buildAutopilotSettingsUrl } from "@/lib/autopilot/watch-deep-links";
import { sendTestSlackWebhook } from "@/lib/autopilot/watch-slack";
import { ensureAutopilotSettings } from "@/lib/autopilot/settings-db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const settings = await ensureAutopilotSettings(supabase, user.id);
  const webhook = settings.slack_webhook_url?.trim();
  if (!webhook) {
    return NextResponse.json({ ok: false, error: "Save a Slack webhook URL first" }, { status: 400 });
  }

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://spy-rival.com";
  const result = await sendTestSlackWebhook(webhook, buildAutopilotSettingsUrl(appOrigin));

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error ?? "slack_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
