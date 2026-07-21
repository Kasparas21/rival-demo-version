import { NextResponse } from "next/server";

import { getRequestWorkspace } from "@/lib/team/session-workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  const { data, error } = await supabase
    .from("autopilot_outputs")
    .select("id, output_type, status, channels_sent, created_at, sent_at, payload, dedupe_key")
    .eq("user_id", dataUserId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://spy-rival.com";

  const items = (data ?? []).map((row) => {
    const payload = row.payload as Record<string, unknown> | null;
    let reopenUrl: string | null = null;
    let title =
      row.output_type === "monthly_report"
        ? String((payload as { brandName?: string } | null)?.brandName ?? "Monthly report")
        : row.output_type === "watch_alert"
          ? "Watch alert"
          : "Weekly brief";

    if (row.output_type === "monthly_report") {
      reopenUrl = `${appOrigin.replace(/\/$/, "")}/reports/${row.id}`;
    } else if (row.output_type === "watch_alert" && payload?.blocks) {
      const blocks = payload.blocks as { investigateUrl?: string; competitorName?: string }[];
      const first = Array.isArray(blocks) ? blocks[0] : null;
      reopenUrl = first?.investigateUrl ?? null;
      if (first?.competitorName) title = `Watch alert — ${first.competitorName}`;
    }

    return {
      id: row.id,
      outputType: row.output_type,
      status: row.status,
      channelsSent: row.channels_sent,
      createdAt: row.created_at,
      sentAt: row.sent_at,
      title,
      reopenUrl,
    };
  });

  return NextResponse.json({ ok: true, items });
}
