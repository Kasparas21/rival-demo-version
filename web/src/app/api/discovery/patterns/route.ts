import { NextResponse } from "next/server";

import {
  generatePatternReport,
  isPatternReportRefreshBlocked,
  loadPatternReportHistory,
} from "@/lib/discovery/generate-pattern-report";
import { resolvePatternWeekStartYmd } from "@/lib/discovery/compute-pattern-metrics";
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
    if (!brandId) {
      return NextResponse.json({ ok: false, error: "brandId required" }, { status: 400 });
    }

    const { latest, history } = await loadPatternReportHistory(supabase, user.id, brandId, 12);

    return NextResponse.json(
      { ok: true, latest, history },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load pattern report";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      brandId?: string;
      force?: boolean;
      brandName?: string;
    };

    const brandId = (body.brandId ?? "").trim();
    if (!brandId) {
      return NextResponse.json({ ok: false, error: "brandId required" }, { status: 400 });
    }

    const force = Boolean(body.force);
    const weekStart = resolvePatternWeekStartYmd();
    const blocked = await isPatternReportRefreshBlocked(supabase, user.id, brandId, weekStart, force);
    if (blocked.blocked) {
      return NextResponse.json({ ok: false, error: blocked.reason }, { status: 429 });
    }

    const result = await generatePatternReport({
      supabase,
      userId: user.id,
      brandId,
      brandName: body.brandName?.trim(),
      force,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, report: result.report, skipped: result.skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate pattern report";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
