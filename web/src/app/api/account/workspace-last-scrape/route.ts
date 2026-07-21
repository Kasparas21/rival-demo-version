import { NextResponse, type NextRequest } from "next/server";

import { ensureWorkspaceBrandSavedCompetitor } from "@/lib/account/ensure-workspace-brand-competitor";
import { friendlySavedCompetitorsSchemaError } from "@/lib/account/saved-competitors-schema";
import {
  pickSavedCompetitorForDomainHint,
  savedCompetitorDomainOrFilter,
} from "@/lib/ad-library/competitor-cache-domain";
import { probeSavedCompetitorsColumns } from "@/lib/account/saved-competitors-schema";
import { getRequestWorkspace } from "@/lib/team/session-workspace";
import { workspaceReadClient } from "@/lib/team/workspace-read-client";
import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";

/** Primary brand Ads Library scrape time — sidebar API omits workspace rows. Optional `brandId` = active dashboard brand. */
export async function GET(req: NextRequest) {
    const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  const db = workspaceReadClient(workspace);

  const brandId = req.nextUrl.searchParams.get("brandId")?.trim();
  const domainParam = req.nextUrl.searchParams.get("domain")?.trim();
  let primary:
    | {
        domain: string | null;
        name: string | null;
      }
    | null = null;

  if (brandId && brandId !== "default" && brandId !== "_workspace") {
    const scoped = await db
      .from("brands")
      .select("domain, name")
      .eq("user_id", dataUserId)
      .eq("id", brandId)
      .maybeSingle();
    if (scoped.error) {
      return NextResponse.json({ error: scoped.error.message }, { status: 500 });
    }
    primary = scoped.data ?? null;
  }

  if (!primary?.domain?.trim()) {
    const fb = await db
      .from("brands")
      .select("domain, name")
      .eq("user_id", dataUserId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (fb.error) {
      return NextResponse.json({ error: fb.error.message }, { status: 500 });
    }
    primary = fb.data ?? null;
  }

  let workspaceDomainGuess =
    primary?.domain
      ?.trim()
      .toLowerCase()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0] ?? "";

  if (!workspaceDomainGuess && domainParam) {
    workspaceDomainGuess =
      domainParam
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .split("/")[0] ?? "";
  }

  if (!workspaceDomainGuess) {
    return NextResponse.json({
      lastScrapedAt: null,
      competitorId: null,
      libraryContext: null,
      error: "no_brand_domain",
      hint: "Set your brand domain in Settings or complete onboarding to link analytics and ad detail.",
    });
  }

  if (!ctx.isViewer) {
    try {
      const ensured = await ensureWorkspaceBrandSavedCompetitor(
        supabase,
        dataUserId,
        workspaceDomainGuess,
        primary?.name,
        { persistAds: false, brandId },
      );
      return NextResponse.json({
        lastScrapedAt: ensured?.lastScrapedAt ?? null,
        competitorId: ensured?.id ?? null,
        libraryContext: ensured?.libraryContext ?? null,
        persistOk: ensured?.persistOk ?? null,
        persistErrors: ensured?.persistErrors ?? null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "workspace_brand_ensure_failed";
      console.error("[workspace-last-scrape]", message);
    }
  }

  const slug = normalizeCompetitorSlug(workspaceDomainGuess).toLowerCase();
  const orFilter = savedCompetitorDomainOrFilter(workspaceDomainGuess);
  const columnProbe = await probeSavedCompetitorsColumns(db, dataUserId);
  const savedSelect = [
    "id",
    "last_scraped_at",
    "brand_domain",
    "slug",
    ...(columnProbe.adsLibraryContext ? (["ads_library_context"] as const) : []),
  ].join(", ");

  const fallback = orFilter
    ? await db
        .from("saved_competitors")
        .select(savedSelect)
        .eq("user_id", dataUserId)
        .or(orFilter)
        .order("last_scraped_at", { ascending: false, nullsFirst: false })
        .limit(8)
    : await db
        .from("saved_competitors")
        .select(savedSelect)
        .eq("user_id", dataUserId)
        .eq("slug", slug)
        .order("last_scraped_at", { ascending: false, nullsFirst: false })
        .limit(1);

  if (fallback.error) {
    return NextResponse.json(
      { error: friendlySavedCompetitorsSchemaError(fallback.error.message) },
      { status: 500 },
    );
  }

  type FallbackSavedRow = {
    id: string;
    last_scraped_at: string | null;
    brand_domain: string | null;
    slug: string;
    ads_library_context?: unknown;
  };
  const fallbackRows = (fallback.data ?? []) as unknown as FallbackSavedRow[];

  const row = (() => {
    const picked = pickSavedCompetitorForDomainHint(fallbackRows, slug);
    if (picked?.id) return fallbackRows.find((r) => r.id === picked.id) ?? null;
    return fallbackRows[0] ?? null;
  })();

  return NextResponse.json({
    lastScrapedAt: row?.last_scraped_at ? String(row.last_scraped_at) : null,
    competitorId: row?.id ?? null,
    libraryContext: columnProbe.adsLibraryContext
      ? parseAdsLibraryContext(row?.ads_library_context)
      : null,
    persistOk: null,
    persistErrors: null,
  });
}

function parseAdsLibraryContext(raw: unknown): { channels?: string[]; ids?: Record<string, string> } | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const channelsRaw = row.channels;
  const channels = Array.isArray(channelsRaw)
    ? channelsRaw.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    : undefined;
  const idsRaw = row.ids;
  const ids: Record<string, string> = {};
  if (idsRaw && typeof idsRaw === "object" && !Array.isArray(idsRaw)) {
    for (const [key, value] of Object.entries(idsRaw as Record<string, unknown>)) {
      if (typeof value === "string" && value.trim()) ids[key] = value.trim();
    }
  }
  if (!channels?.length && Object.keys(ids).length === 0) return null;
  return {
    ...(channels?.length ? { channels } : {}),
    ...(Object.keys(ids).length > 0 ? { ids } : {}),
  };
}
