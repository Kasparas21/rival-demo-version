import { NextResponse } from "next/server";

import {
  adDetailDownloadFilename,
  resolveAdDetailDownloadTargets,
  type AdDetailDownloadKind,
} from "@/lib/ad-detail/resolve-creative-media";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveWorkspaceContext } from "@/lib/team/workspace-context";

export const runtime = "nodejs";

const KINDS: AdDetailDownloadKind[] = ["thumbnail", "video", "image"];

function contentTypeForKind(kind: AdDetailDownloadKind, upstream: string | null): string {
  if (upstream) {
    const lower = upstream.toLowerCase();
    if (lower.includes("video/mp4") || kind === "video") return "video/mp4";
    if (lower.includes("image/png")) return "image/png";
    if (lower.includes("image/webp")) return "image/webp";
    if (lower.includes("image/gif")) return "image/gif";
  }
  return kind === "video" ? "video/mp4" : "image/jpeg";
}

function pickSourceUrl(
  kind: AdDetailDownloadKind,
  targets: ReturnType<typeof resolveAdDetailDownloadTargets>,
): string | null {
  if (kind === "video") return targets.video;
  if (kind === "thumbnail") return targets.thumbnail;
  return targets.image;
}

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  const dataUserId = ctx.dataUserId;

  const url = new URL(req.url);
  const adId = url.searchParams.get("adId")?.trim() ?? "";
  const kindRaw = url.searchParams.get("kind")?.trim() ?? "";
  const kind = KINDS.includes(kindRaw as AdDetailDownloadKind) ? (kindRaw as AdDetailDownloadKind) : null;

  if (!adId || !kind) {
    return NextResponse.json({ ok: false, error: "adId and kind required" }, { status: 400 });
  }

  const { data: ad, error: adErr } = await supabase
    .from("scraped_ads")
    .select("id, platform, format, ad_creative_url, raw_payload, user_id")
    .eq("id", adId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (adErr || !ad) {
    return NextResponse.json({ ok: false, error: "Ad not found" }, { status: 404 });
  }

  const targets = resolveAdDetailDownloadTargets(ad);
  const sourceUrl = pickSourceUrl(kind, targets);

  if (!sourceUrl) {
    return NextResponse.json({ ok: false, error: "No downloadable asset for this ad" }, { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RivalBot/1.0; +https://rival.app) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
      redirect: "follow",
      cache: "no-store",
    });
  } catch (err) {
    console.warn("[ad-detail/download] fetch failed", err);
    return NextResponse.json({ ok: false, error: "Could not fetch creative asset" }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ ok: false, error: "Creative asset unavailable" }, { status: 502 });
  }

  const contentType =
    upstream.headers.get("content-type")?.split(";")[0]?.trim() ||
    contentTypeForKind(kind, upstream.headers.get("content-type"));
  const filename = adDetailDownloadFilename(kind, ad.platform, ad.id);

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
