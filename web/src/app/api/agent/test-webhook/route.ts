import { NextResponse } from "next/server";

import { deliverDiscordTest } from "@/lib/agent/delivery/discord";
import { deliverSlackTest } from "@/lib/agent/delivery/slack";
import { isValidWebhookUrl } from "@/lib/agent/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TestBody = {
  channel?: "slack" | "discord";
  webhook_url?: string;
};

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: TestBody = {};
  try {
    body = (await req.json()) as TestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const channel = body.channel;
  const webhookUrl = body.webhook_url?.trim() ?? "";

  if (channel !== "slack" && channel !== "discord") {
    return NextResponse.json({ ok: false, error: "channel must be slack or discord" }, { status: 400 });
  }

  if (!isValidWebhookUrl(webhookUrl)) {
    return NextResponse.json({ ok: false, error: "Invalid webhook URL (must be https)" }, { status: 400 });
  }

  const delivered =
    channel === "slack" ? await deliverSlackTest(webhookUrl) : await deliverDiscordTest(webhookUrl);

  if (!delivered) {
    return NextResponse.json({ ok: false, error: "Webhook delivery failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
