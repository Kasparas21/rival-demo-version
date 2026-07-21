import { NextResponse } from "next/server";

import { isAlertType } from "@/lib/alerts/alert-types";
import { getRequestWorkspace } from "@/lib/team/session-workspace";
import { workspaceReadClient } from "@/lib/team/workspace-read-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
    const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { dataUserId } = workspace;
  const db = workspaceReadClient(workspace);

  const url = new URL(req.url);
  const competitorId = (url.searchParams.get("competitorId") ?? "").trim();
  const alertType = (url.searchParams.get("type") ?? "").trim();
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "40") || 40));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0") || 0);

  let query = db
    .from("competitor_alerts")
    .select(
      "id, user_id, competitor_id, alert_type, severity, title, body, metadata, detected_at, source_scrape_batch_id, is_read, notified_at, dedupe_key, created_at",
      { count: "exact" }
    )
    .eq("user_id", dataUserId)
    .order("detected_at", { ascending: false });

  if (competitorId) query = query.eq("competitor_id", competitorId);
  if (alertType && isAlertType(alertType)) query = query.eq("alert_type", alertType);
  if (unreadOnly) query = query.eq("is_read", false);

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const competitorIds = [...new Set((data ?? []).map((r) => r.competitor_id))];
  const nameById = new Map<string, string>();

  if (competitorIds.length > 0) {
    const { data: comps } = await db
      .from("saved_competitors")
      .select("id, name, brand_name")
      .eq("user_id", dataUserId)
      .in("id", competitorIds);

    for (const c of comps ?? []) {
      nameById.set(c.id, c.brand_name?.trim() || c.name?.trim() || "Competitor");
    }
  }

  const alerts = (data ?? []).map((row) => ({
    ...row,
    competitorName: nameById.get(row.competitor_id) ?? "Competitor",
  }));

  return NextResponse.json({
    ok: true,
    alerts,
    total: count ?? alerts.length,
    limit,
    offset,
  });
}
