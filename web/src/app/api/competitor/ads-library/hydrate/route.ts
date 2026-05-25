import { NextResponse } from "next/server";

import {
  buildAdsCacheHydrateClientMetaFromRows,
  isAdsCacheHydrateClientMetaFresh,
  type AdsCacheHydrateClientMeta,
} from "@/lib/ad-library/ads-cache-hydrate-meta";
import { fetchAdsCacheMetadataForUser } from "@/lib/ad-library/fetch-ads-cache-metadata-for-user";
import { fetchLatestAdsLibraryBundleFromUserCache } from "@/lib/ad-library/load-ads-library-from-user-cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function parseClientMeta(raw: unknown): AdsCacheHydrateClientMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const platforms = (raw as AdsCacheHydrateClientMeta).platforms;
  if (!Array.isArray(platforms) || platforms.length === 0) return null;
  const cleaned = platforms.filter(
    (p): p is { platform: string; id: string; scraped_at: string } =>
      Boolean(
        p &&
          typeof p === "object" &&
          typeof (p as { platform?: string }).platform === "string" &&
          typeof (p as { id?: string }).id === "string" &&
          typeof (p as { scraped_at?: string }).scraped_at === "string",
      ),
  );
  if (cleaned.length === 0) return null;
  return { platforms: cleaned };
}

/** POST — load latest `ads_cache` rows for a domain (ignores client payload key mismatches). */
export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { domain?: string; clientMeta?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const domain = body.domain?.trim() ?? "";
  if (!domain) {
    return NextResponse.json({ ok: false, error: "domain required" }, { status: 400 });
  }

  const clientMeta = parseClientMeta(body.clientMeta);
  const nowIso = new Date().toISOString();

  if (clientMeta) {
    const metaBundle = await fetchAdsCacheMetadataForUser(supabase, user.id, domain);
    if (
      metaBundle &&
      isAdsCacheHydrateClientMetaFresh(clientMeta, metaBundle.rows, metaBundle.cacheDomain, nowIso)
    ) {
      return NextResponse.json({ ok: true, status: "fresh" });
    }
  }

  const bundle = await fetchLatestAdsLibraryBundleFromUserCache(supabase, user.id, domain);
  if (!bundle) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const cacheMeta = buildAdsCacheHydrateClientMetaFromRows(bundle.pickedRows);

  return NextResponse.json({
    ok: true,
    response: bundle.response,
    ...(cacheMeta ? { cacheMeta } : {}),
  });
}
