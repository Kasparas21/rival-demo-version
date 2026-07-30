import { NextResponse } from "next/server";

import { buildDiscoveryLandingPagesFeed } from "@/lib/discovery/build-discovery-landing-pages-feed";
import type {
  DiscoveryDatePreset,
  DiscoveryLandingPageChangeFilter,
  DiscoveryLandingPageSort,
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

function parseSort(raw: string | null): DiscoveryLandingPageSort {
  const v = (raw ?? "newest").trim().toLowerCase();
  if (v === "oldest" || v === "threat" || v === "newest") return v;
  return "newest";
}

function parseChangeFilter(raw: string | null): DiscoveryLandingPageChangeFilter {
  const v = (raw ?? "all").trim().toLowerCase();
  if (v === "permanent" || v === "ab_test" || v === "unknown" || v === "all") return v;
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

    let offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
    if (!Number.isFinite(offset) || offset < 0) offset = 0;

    let limit = Number.parseInt(url.searchParams.get("limit") ?? "12", 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 12;
    limit = Math.min(limit, 24);

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

    const result = await buildDiscoveryLandingPagesFeed(supabase, user.id, {
      brandId,
      clientBrandIds,
      offset,
      limit,
      sort: parseSort(url.searchParams.get("sort")),
      query: url.searchParams.get("q") ?? "",
      competitorFilterIds: competitorIds,
      datePreset: parseDatePreset(url.searchParams.get("datePreset")),
      changeFilter: parseChangeFilter(url.searchParams.get("changeFilter")),
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "discovery landing pages failed";
    console.error("[discovery/landing-pages]", message, err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
