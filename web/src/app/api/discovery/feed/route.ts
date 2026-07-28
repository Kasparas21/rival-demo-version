import { NextResponse } from "next/server";

import { buildDiscoveryFeed } from "@/lib/discovery/build-discovery-feed";
import type {
  DiscoveryDatePreset,
  DiscoveryFormatFilter,
  DiscoverySort,
  DiscoveryStatusFilter,
} from "@/lib/discovery/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseSort(raw: string | null): DiscoverySort {
  const v = (raw ?? "shuffle").trim().toLowerCase();
  if (
    v === "shuffle" ||
    v === "newest" ||
    v === "oldest" ||
    v === "longest_running" ||
    v === "longest" ||
    v === "impressions" ||
    v === "ultimate_winner"
  ) {
    return v === "longest" ? "longest_running" : (v as DiscoverySort);
  }
  return "shuffle";
}

function parseDatePreset(raw: string | null): DiscoveryDatePreset {
  const v = (raw ?? "all").trim().toLowerCase();
  if (v === "7d" || v === "30d" || v === "90d" || v === "all") return v;
  return "all";
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

    let offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
    if (!Number.isFinite(offset) || offset < 0) offset = 0;

    let limit = Number.parseInt(url.searchParams.get("limit") ?? "24", 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 24;
    limit = Math.min(limit, 48);

    const platforms = url.searchParams
      .getAll("platform")
      .flatMap((p) => p.split(","))
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);

    const shuffleSeed =
      (url.searchParams.get("shuffleSeed") ?? "").trim() ||
      `${user.id}:${brandId}:${new Date().toISOString().slice(0, 10)}`;

    const result = await buildDiscoveryFeed(supabase, user.id, {
      brandId,
      clientScope: (url.searchParams.get("clientScope") ?? "active").trim() || "active",
      offset,
      limit,
      sort: parseSort(url.searchParams.get("sort")),
      shuffleSeed,
      platforms,
      format: parseFormat(url.searchParams.get("format")),
      status: parseStatus(url.searchParams.get("status")),
      ultimateOnly: url.searchParams.get("ultimateOnly") === "1",
      query: url.searchParams.get("q") ?? "",
      competitorId: (url.searchParams.get("competitorId") ?? "").trim() || null,
      datePreset: parseDatePreset(url.searchParams.get("datePreset")),
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "discovery feed failed";
    console.error("[discovery/feed]", message, err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
