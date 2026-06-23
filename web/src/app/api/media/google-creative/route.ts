import { NextResponse } from "next/server";

import { isGoogleCreativeCdnHost } from "@/lib/ad-library/google-creative-display-url";
import { isGoogleFaviconUrl, isUsableGoogleStillImagePreviewUrl } from "@/lib/ad-library/normalize";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BYTES = 6 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 12_000;

function isAllowedSourceUrl(raw: string): boolean {
  if (!isUsableGoogleStillImagePreviewUrl(raw)) return false;
  if (isGoogleFaviconUrl(raw)) return false;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return false;
    return isGoogleCreativeCdnHost(parsed.hostname);
  } catch {
    return false;
  }
}

/** Proxy Google Transparency creative stills (simgad, ytimg, etc.) for dashboard `<img>` tags. */
export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const sourceUrl = new URL(req.url).searchParams.get("url")?.trim() ?? "";
  if (!sourceUrl || !isAllowedSourceUrl(sourceUrl)) {
    return NextResponse.json({ ok: false, error: "Invalid image URL" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(sourceUrl, {
      headers: {
        Accept: "image/*,*/*",
        "User-Agent":
          "Mozilla/5.0 (compatible; Rival/1.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "follow",
      cache: "force-cache",
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json({ ok: false, error: "Upstream fetch failed" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ ok: false, error: "Upstream unavailable" }, { status: upstream.status || 502 });
  }

  const contentLength = Number.parseInt(upstream.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Image too large" }, { status: 413 });
  }

  const contentType = upstream.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
