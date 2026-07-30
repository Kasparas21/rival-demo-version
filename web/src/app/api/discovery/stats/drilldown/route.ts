import { NextResponse } from "next/server";

import { loadStatsDrilldown } from "@/lib/discovery/load-stats-drilldown";
import type { DiscoveryDatePreset, DiscoveryStatsDrilldownKind } from "@/lib/discovery/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseDatePreset(raw: string | null): DiscoveryDatePreset {
  const v = (raw ?? "7d").trim().toLowerCase();
  if (
    v === "today" ||
    v === "3d" ||
    v === "4d" ||
    v === "7d" ||
    v === "30d" ||
    v === "90d" ||
    v === "all"
  ) {
    return v;
  }
  return "7d";
}

function parseKind(raw: string | null): DiscoveryStatsDrilldownKind | null {
  const v = (raw ?? "").trim();
  const kinds: DiscoveryStatsDrilldownKind[] = [
    "launched",
    "killed",
    "active",
    "ultimate_winners",
    "longest_running",
    "fast_kills",
    "competitor_launched",
    "competitor_killed",
    "competitor_active",
    "competitor_winners",
    "single_ad",
  ];
  return kinds.includes(v as DiscoveryStatsDrilldownKind) ? (v as DiscoveryStatsDrilldownKind) : null;
}

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
    const kind = parseKind(url.searchParams.get("kind"));

    if (!brandId) {
      return NextResponse.json({ ok: false, error: "brandId required" }, { status: 400 });
    }
    if (!kind) {
      return NextResponse.json({ ok: false, error: "kind required" }, { status: 400 });
    }

    const clientBrandIds = url.searchParams
      .getAll("clientBrand")
      .flatMap((value) => value.split(","))
      .map((id) => id.trim())
      .filter(Boolean);

    const competitorIds = url.searchParams
      .getAll("competitorId")
      .flatMap((value) => value.split(","))
      .map((id) => id.trim())
      .filter(Boolean);

    const adIdsParam = (url.searchParams.get("adIds") ?? "").trim();
    const adIds = adIdsParam
      ? adIdsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;

    const scopeCompetitorId = (url.searchParams.get("scopeCompetitorId") ?? "").trim() || undefined;
    const title = (url.searchParams.get("title") ?? "").trim() || undefined;
    const statsDateFrom = (url.searchParams.get("statsDateFrom") ?? "").trim() || null;
    const statsDateTo = (url.searchParams.get("statsDateTo") ?? "").trim() || null;

    const loaded = await loadStatsDrilldown(supabase, user.id, {
      brandId,
      clientBrandIds,
      competitorFilterIds: competitorIds,
      datePreset: parseDatePreset(url.searchParams.get("datePreset")),
      statsDateFrom,
      statsDateTo,
      kind,
      competitorId: scopeCompetitorId,
      adIds,
      title,
    });

    if (!loaded.ok) {
      return NextResponse.json({ ok: false, error: loaded.error }, { status: 400 });
    }

    return NextResponse.json(
      { ok: true, ...loaded.result },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "stats drilldown failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
