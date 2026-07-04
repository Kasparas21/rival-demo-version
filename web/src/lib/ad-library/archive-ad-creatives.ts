/**
 * Archives ad creative images into Supabase Storage (`ad-creatives` bucket) so previews
 * survive platform CDN expiry — Meta links die within weeks, killing previews for ended
 * ads. Runs best-effort after each scrape persist; only rows without an archived copy
 * are fetched, so steady-state work per scrape is just the new ads.
 */
import { createHash } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "ad-creatives";
/** Per-run budget: keeps the post-scrape hook bounded (cron time-boxes at ~230s). */
const MAX_ARCHIVES_PER_RUN = 120;
const CONCURRENCY = 6;
const FETCH_TIMEOUT_MS = 10_000;
/** Skip anything larger — cards only need a preview, not a 4K original. */
const MAX_BYTES = 4 * 1024 * 1024;

const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

type ArchiveCandidate = {
  id: string;
  ad_creative_url: string | null;
  raw_payload: unknown;
};

function isHttpUrl(v: unknown): v is string {
  return typeof v === "string" && /^https?:\/\//i.test(v.trim());
}

/** Best raster preview URL for a row — creative column first, then common payload fields. */
export function pickArchivableImageUrl(row: ArchiveCandidate): string | null {
  const direct = row.ad_creative_url?.trim();
  if (direct && /^https?:\/\//i.test(direct) && !/\.(mp4|mov|webm)(\?|$)/i.test(direct)) {
    return direct;
  }
  const p = row.raw_payload;
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  const o = p as Record<string, unknown>;
  for (const key of ["img", "image", "imageUrl", "image_url", "thumbnail", "thumbnailUrl", "poster"]) {
    const v = o[key];
    if (isHttpUrl(v)) return (v as string).trim();
  }
  const snapshot = o.snapshot;
  if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) {
    const s = snapshot as Record<string, unknown>;
    for (const key of ["image_url", "picture", "full_picture", "preview_url", "thumbnail_url"]) {
      const v = s[key];
      if (isHttpUrl(v)) return (v as string).trim();
    }
  }
  return null;
}

async function downloadImage(url: string): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "image/*" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
    if (!CONTENT_TYPE_EXT[contentType]) return null;
    const len = Number(res.headers.get("content-length") ?? "0");
    if (len > MAX_BYTES) return null;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return null;
    return { bytes, contentType };
  } catch {
    return null;
  }
}

async function archiveOne(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  params: { userId: string; competitorId: string; row: ArchiveCandidate },
): Promise<boolean> {
  const { userId, competitorId, row } = params;
  const url = pickArchivableImageUrl(row);
  if (!url) return false;

  const media = await downloadImage(url);
  if (!media) return false;

  const ext = CONTENT_TYPE_EXT[media.contentType] ?? "jpg";
  const hash = createHash("sha1").update(row.id).digest("hex").slice(0, 12);
  const path = `${userId}/${competitorId}/${row.id}-${hash}.${ext}`;

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, media.bytes, { contentType: media.contentType, upsert: true });
  if (uploadErr) {
    console.error("[archiveAdCreatives] upload", uploadErr.message);
    return false;
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = pub?.publicUrl;
  if (!publicUrl) return false;

  const { error: updateErr } = await admin
    .from("scraped_ads")
    .update({ archived_creative_url: publicUrl })
    .eq("id", row.id);
  if (updateErr) {
    console.error("[archiveAdCreatives] row update", updateErr.message);
    return false;
  }
  return true;
}

/**
 * Archive creatives for rows of a competitor that don't have a stored copy yet.
 * Best-effort and bounded; safe to fire-and-forget after persist.
 */
export async function archiveAdCreativesForCompetitor(params: {
  userId: string;
  competitorId: string;
  platforms?: string[];
}): Promise<{ archived: number; candidates: number }> {
  const { userId, competitorId } = params;
  const admin = createSupabaseAdminClient();

  let query = admin
    .from("scraped_ads")
    .select("id, ad_creative_url, raw_payload")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .is("archived_creative_url", null)
    .order("last_seen_at", { ascending: false })
    .limit(MAX_ARCHIVES_PER_RUN);
  if (params.platforms?.length) {
    query = query.in("platform", params.platforms);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error("[archiveAdCreatives] load candidates", error.message);
    return { archived: 0, candidates: 0 };
  }

  const candidates = (rows ?? []) as ArchiveCandidate[];
  let archived = 0;

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((row) => archiveOne(admin, { userId, competitorId, row })),
    );
    archived += results.filter(Boolean).length;
  }

  if (archived > 0) {
    console.info("[archiveAdCreatives]", { competitorId, archived, candidates: candidates.length });
  }
  return { archived, candidates: candidates.length };
}
