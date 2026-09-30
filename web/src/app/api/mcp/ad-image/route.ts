import { NextResponse } from "next/server";

import { resolveMcpAdCreativeRefs } from "@/lib/mcp/ad-creative-media";
import { verifyAdImageToken } from "@/lib/mcp/ad-image-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

const SELECT =
  "id, platform, format, ad_creative_url, archived_creative_url, raw_payload";

function sniffImageMime(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 6 && bytes.subarray(0, 3).toString("ascii") === "GIF") return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

async function loadCreative(userId: string, adId: string) {
  const admin = createSupabaseAdminClient();
  const scraped = await admin
    .from("scraped_ads")
    .select(SELECT)
    .eq("user_id", userId)
    .eq("id", adId)
    .maybeSingle();
  if (scraped.data) return scraped.data;

  const saved = await admin
    .from("saved_ads")
    .select(SELECT)
    .eq("user_id", userId)
    .eq("id", adId)
    .maybeSingle();
  if (saved.data) return saved.data;

  const savedBySource = await admin
    .from("saved_ads")
    .select(SELECT)
    .eq("user_id", userId)
    .eq("source_scraped_ad_id", adId)
    .limit(1)
    .maybeSingle();
  return savedBySource.data;
}

/** Signed preview for the in-chat ad gallery. Auth is the token, not a browser session. */
export async function GET(req: Request): Promise<NextResponse> {
  const claims = verifyAdImageToken(new URL(req.url).searchParams.get("token"));
  if (!claims) {
    return NextResponse.json({ ok: false, error: "Invalid preview token" }, { status: 401 });
  }

  const row = await loadCreative(claims.u, claims.a);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Ad not found" }, { status: 404 });
  }

  const refs = resolveMcpAdCreativeRefs({
    id: row.id,
    platform: row.platform,
    format: row.format,
    ad_creative_url: row.ad_creative_url,
    archived_creative_url: row.archived_creative_url,
    raw_payload: row.raw_payload,
  });
  const source = refs.image_url;
  if (!source) {
    return NextResponse.json({ ok: false, error: "No creative image" }, { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(source, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
      headers: {
        Accept: "image/*,*/*",
        "User-Agent":
          "Mozilla/5.0 (compatible; Rival/1.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Upstream fetch failed" }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json({ ok: false, error: "Upstream unavailable" }, { status: 502 });
  }

  const buf = Buffer.from(await upstream.arrayBuffer());
  if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Image too large" }, { status: 413 });
  }
  const mime = sniffImageMime(buf);
  if (!mime) {
    return NextResponse.json({ ok: false, error: "Not an image" }, { status: 415 });
  }

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
