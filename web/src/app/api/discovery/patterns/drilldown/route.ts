import { NextResponse } from "next/server";

import { loadPatternDrilldown } from "@/lib/discovery/load-pattern-drilldown";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const brandId = (url.searchParams.get("brandId") ?? "").trim();
    const weekStart = (url.searchParams.get("weekStart") ?? "").trim();
    const angle = (url.searchParams.get("angle") ?? "").trim() || undefined;
    const competitorId = (url.searchParams.get("competitorId") ?? "").trim() || undefined;
    const title = (url.searchParams.get("title") ?? "").trim() || undefined;
    const launchedOnly = url.searchParams.get("launchedOnly") === "1";
    const killedOnly = url.searchParams.get("killedOnly") === "1";
    const adIdsParam = (url.searchParams.get("adIds") ?? "").trim();
    const adIds = adIdsParam
      ? adIdsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;

    if (!brandId) {
      return NextResponse.json({ ok: false, error: "brandId required" }, { status: 400 });
    }
    if (!weekStart) {
      return NextResponse.json({ ok: false, error: "weekStart required" }, { status: 400 });
    }
    if (!angle && !adIds?.length && !competitorId) {
      return NextResponse.json(
        { ok: false, error: "angle, adIds, or competitorId required" },
        { status: 400 },
      );
    }

    const loaded = await loadPatternDrilldown(supabase, user.id, {
      brandId,
      weekStart,
      angle,
      adIds,
      competitorId,
      title,
      launchedOnly,
      killedOnly,
    });

    if (!loaded.ok) {
      return NextResponse.json({ ok: false, error: loaded.error }, { status: 400 });
    }

    return NextResponse.json(
      { ok: true, ...loaded.result },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load pattern drilldown";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
