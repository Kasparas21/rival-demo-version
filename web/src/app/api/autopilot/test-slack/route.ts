import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { buildAutopilotSettingsUrl } from "@/lib/autopilot/watch-deep-links";
import { sendTestSlackWebhook } from "@/lib/autopilot/watch-slack";
import { ensureAutopilotSettings } from "@/lib/autopilot/settings-db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SLACK_TESTS_PER_DAY = 5;

export async function POST(): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const prefix = `slack_test:${user.id}:${today}`;
  const admin = createSupabaseAdminClient();
  const { count } = await admin
    .from("autopilot_outputs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .like("dedupe_key", `${prefix}%`);

  if ((count ?? 0) >= MAX_SLACK_TESTS_PER_DAY) {
    return NextResponse.json({ ok: false, error: "Slack test limit: 5 per day" }, { status: 429 });
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

  await admin.from("autopilot_outputs").insert({
    user_id: user.id,
    output_type: "watch_alert",
    dedupe_key: `${prefix}:${randomUUID()}`,
    payload: { test: true },
    channels_sent: ["slack"],
    status: "sent",
    sent_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
