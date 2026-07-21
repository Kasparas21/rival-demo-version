import { NextResponse } from "next/server";

import { normalizeLandingPageUrl } from "@/lib/landing-pages/normalize-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestWorkspace } from "@/lib/team/session-workspace";
import { workspaceReadClient } from "@/lib/team/workspace-read-client";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authorizePage(competitorId: string, pageId: string) {
  const workspace = await getRequestWorkspace();
  if (!workspace) {
    return { error: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }) };
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  const db = workspaceReadClient(workspace);

  const { data: page, error } = await db
    .from("landing_pages")
    .select("*")
    .eq("id", pageId)
    .eq("competitor_id", competitorId)
    .eq("user_id", dataUserId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return { error: NextResponse.json({ ok: false, error: error.message }, { status: 500 }) };
  }
  if (!page) {
    return { error: NextResponse.json({ ok: false, error: "Page not found" }, { status: 404 }) };
  }

  return { supabase, db, user, page, dataUserId, ctx };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ competitor_id: string; pageId: string }> },
) {
  const { competitor_id: competitorIdRaw, pageId: pageIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";
  const pageId = pageIdRaw?.trim() ?? "";

  if (!competitorId || !UUID_RE.test(competitorId) || !pageId || !UUID_RE.test(pageId)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const auth = await authorizePage(competitorId, pageId);
  if ("error" in auth && auth.error) return auth.error;
  const { db, page } = auth as NonNullable<Awaited<ReturnType<typeof authorizePage>>> & {
    page: NonNullable<Awaited<ReturnType<typeof authorizePage>>["page"]>;
  };

  const { data: snapshots, error: snapErr } = await db
    .from("landing_page_snapshots")
    .select("*")
    .eq("landing_page_id", pageId)
    .order("taken_at", { ascending: false })
    .limit(40);

  if (snapErr) {
    return NextResponse.json({ ok: false, error: snapErr.message }, { status: 500 });
  }

  const list = snapshots ?? [];
  const changeCount = list.filter((s) => s.has_meaningful_change).length;

  return NextResponse.json({
    ok: true,
    page,
    stats: {
      totalSnapshots: list.length,
      changeCount,
      firstSnapshotAt: list.length > 0 ? list[list.length - 1]!.taken_at : null,
      lastSnapshotAt: list.length > 0 ? list[0]!.taken_at : null,
    },
    snapshots: list,
  });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ competitor_id: string; pageId: string }> },
) {
  const { competitor_id: competitorIdRaw, pageId: pageIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";
  const pageId = pageIdRaw?.trim() ?? "";

  if (!competitorId || !UUID_RE.test(competitorId) || !pageId || !UUID_RE.test(pageId)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const auth = await authorizePage(competitorId, pageId);
  if ("error" in auth && auth.error) return auth.error;
  const { supabase, page, dataUserId } = auth as {
    supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
    user: { id: string };
    page: { url: string; label: string };
    dataUserId: string;
  };

  let body: { url?: string; label?: string };
  try {
    body = (await req.json()) as { url?: string; label?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Database["public"]["Tables"]["landing_pages"]["Update"] = {};
  const label = body.label?.trim();
  if (label) updates.label = label;

  let urlChanged = false;
  if (body.url !== undefined) {
    const normalized = normalizeLandingPageUrl(body.url.trim());
    if (!normalized) {
      return NextResponse.json({ ok: false, error: "Invalid URL" }, { status: 400 });
    }
    urlChanged = normalized !== page.url;
    updates.url = normalized;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
  }

  if (urlChanged) {
    updates.next_screenshot_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("landing_pages")
    .update(updates)
    .eq("id", pageId)
    .eq("competitor_id", competitorId)
    .eq("user_id", dataUserId)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, page: data, urlChanged });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ competitor_id: string; pageId: string }> },
) {
  const { competitor_id: competitorIdRaw, pageId: pageIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";
  const pageId = pageIdRaw?.trim() ?? "";

  if (!competitorId || !UUID_RE.test(competitorId) || !pageId || !UUID_RE.test(pageId)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

    const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;

  const { data, error } = await supabase
    .from("landing_pages")
    .delete()
    .eq("id", pageId)
    .eq("competitor_id", competitorId)
    .eq("user_id", dataUserId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Page not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
