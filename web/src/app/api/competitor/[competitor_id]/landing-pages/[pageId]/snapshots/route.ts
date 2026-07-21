import { NextResponse } from "next/server";

import { getRequestWorkspace } from "@/lib/team/session-workspace";
import { workspaceReadClient } from "@/lib/team/workspace-read-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parsePage(raw: string | null): number {
  const n = raw ? Number.parseInt(raw, 10) : 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ competitor_id: string; pageId: string }> },
) {
  const { competitor_id: competitorIdRaw, pageId: pageIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";
  const pageId = pageIdRaw?.trim() ?? "";
  const searchParams = new URL(req.url).searchParams;
  const page = parsePage(searchParams.get("page"));
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  if (!competitorId || !UUID_RE.test(competitorId) || !pageId || !UUID_RE.test(pageId)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

    const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { dataUserId } = workspace;
  const db = workspaceReadClient(workspace);

  const { data: landingPage } = await db
    .from("landing_pages")
    .select("id")
    .eq("id", pageId)
    .eq("competitor_id", competitorId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (!landingPage) {
    return NextResponse.json({ ok: false, error: "Page not found" }, { status: 404 });
  }

  const { data, error, count } = await db
    .from("landing_page_snapshots")
    .select("*", { count: "exact" })
    .eq("landing_page_id", pageId)
    .eq("user_id", dataUserId)
    .order("taken_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    snapshots: data ?? [],
    page,
    pageSize,
    total: count ?? 0,
  });
}
