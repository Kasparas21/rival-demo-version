import { NextResponse } from "next/server";

import { buildDiscoveryStats } from "@/lib/discovery/build-discovery-stats";
import type {
  DiscoveryDatePreset,
  DiscoveryFormatFilter,
  DiscoveryStatusFilter,
} from "@/lib/discovery/types";
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

function parseFormat(raw: string | null): DiscoveryFormatFilter {
  const v = (raw ?? "all").trim().toLowerCase();
  if (v === "video" || v === "image" || v === "all") return v;
  return "all";
}

function parseStatus(raw: string | null): DiscoveryStatusFilter {
  const v = (raw ?? "all").trim().toLowerCase();
  if (v === "active" || v === "retired" || v === "all") return v;
  return "all";
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
    if (!brandId) {
      return NextResponse.json({ ok: false, error: "brandId required" }, { status: 400 });
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

    const statsDateFrom = (url.searchParams.get("statsDateFrom") ?? "").trim() || null;
    const statsDateTo = (url.searchParams.get("statsDateTo") ?? "").trim() || null;

    const result = await buildDiscoveryStats(supabase, user.id, {
      brandId,
      clientBrandIds,
      competitorFilterIds: competitorIds,
      datePreset: parseDatePreset(url.searchParams.get("datePreset")),
      statsDateFrom,
      statsDateTo,
      format: parseFormat(url.searchParams.get("format")),
      status: parseStatus(url.searchParams.get("status")),
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "discovery stats failed";
    console.error("[discovery/stats]", message, err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
