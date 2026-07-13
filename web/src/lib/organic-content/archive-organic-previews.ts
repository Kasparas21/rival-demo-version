/**
 * Archives organic post preview images into Supabase Storage (`organic-media` bucket)
 * so platform CDN thumbnails survive after signed URLs expire.
 */
import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import { dedupeOrganicMediaUrls, filterFacebookPageLogoFromPostMedia, repairOrganicMediaFromRaw } from "./normalize";
import type { OrganicPlatform } from "./types";

const BUCKET = "organic-media";
const MAX_ARCHIVES_PER_RUN = 60;
const MAX_IMAGES_PER_POST = 10;
const CONCURRENCY = 6;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 2 * 1024 * 1024;

const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

type ArchiveCandidate = {
  id: string;
  platform: string;
  media_urls: string[];
  raw_data: unknown;
  archived_preview_url?: string | null;
};

export function isRasterPreviewUrl(url: string): boolean {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) && !/\.(mp4|mov|webm|m3u8)(\?|$)/i.test(trimmed);
}

export function isPersistedOrganicMediaUrl(url: string): boolean {
  const trimmed = url.trim();
  return /\/organic-media\//i.test(trimmed) || /\/storage\/v1\/object\/public\/organic-media\//i.test(trimmed);
}

function firstRasterUrl(urls: string[]): string | null {
  for (const url of urls) {
    if (isRasterPreviewUrl(url)) return url.trim();
  }
  return null;
}

function extractRasterUrlsFromRaw(platform: OrganicPlatform, raw: unknown): string[] {
  const urls = repairOrganicMediaFromRaw(platform, raw).filter(isRasterPreviewUrl);
  const row = raw as Record<string, unknown>;
  if (platform === "facebook" && row && typeof row === "object") {
    return filterFacebookPageLogoFromPostMedia(urls, row);
  }
  return urls;
}

/** Raster preview URLs to archive for an organic post (stored column + raw_data fallback). */
export function pickOrganicArchivableRasterUrls(row: ArchiveCandidate): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (list: string[]) => {
    for (const url of list) {
      const trimmed = url?.trim();
      if (trimmed && isRasterPreviewUrl(trimmed) && !seen.has(trimmed)) {
        seen.add(trimmed);
        out.push(trimmed);
      }
    }
  };

  add(row.media_urls ?? []);
  add(extractRasterUrlsFromRaw(row.platform as OrganicPlatform, row.raw_data));
  return dedupeOrganicMediaUrls(out, row.platform as OrganicPlatform).slice(0, MAX_IMAGES_PER_POST);
}

/** Best raster preview URL for an organic post row at archive time. */
export function pickOrganicArchivablePreviewUrl(row: ArchiveCandidate): string | null {
  return firstRasterUrl(pickOrganicArchivableRasterUrls(row));
}

/** Whether a post still has external CDN raster URLs that should be copied to storage. */
export function organicPostNeedsArchiving(row: ArchiveCandidate): boolean {
  const rasterTargets = pickOrganicArchivableRasterUrls(row);
  if (rasterTargets.length === 0) return false;

  const stored = row.media_urls ?? [];
  const hasExternalRaster = stored.some((url) => isRasterPreviewUrl(url) && !isPersistedOrganicMediaUrl(url));
  if (hasExternalRaster) return true;

  const archived = row.archived_preview_url?.trim();
  if (!archived) return true;
  return !isPersistedOrganicMediaUrl(archived);
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

async function uploadArchivedImage(
  admin: SupabaseClient<Database>,
  params: { userId: string; competitorId: string; rowId: string; platform: string; sourceUrl: string; bytes: ArrayBuffer; contentType: string },
): Promise<string | null> {
  const ext = CONTENT_TYPE_EXT[params.contentType] ?? "jpg";
  const hash = createHash("sha1").update(`${params.rowId}:${params.sourceUrl}`).digest("hex").slice(0, 12);
  const path = `${params.userId}/${params.competitorId}/${params.platform}/${params.rowId}-${hash}.${ext}`;

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, params.bytes, { contentType: params.contentType, upsert: true });
  if (uploadErr) {
    console.error("[archiveOrganicPreviews] upload", uploadErr.message);
    return null;
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return pub?.publicUrl ?? null;
}

async function archiveOne(
  admin: SupabaseClient<Database>,
  params: { userId: string; competitorId: string; row: ArchiveCandidate },
): Promise<boolean> {
  const { userId, competitorId, row } = params;
  const rasterUrls = pickOrganicArchivableRasterUrls(row);
  if (rasterUrls.length === 0) return false;

  const archivedBySource = new Map<string, string>();
  for (const sourceUrl of rasterUrls) {
    if (isPersistedOrganicMediaUrl(sourceUrl)) {
      archivedBySource.set(sourceUrl, sourceUrl);
      continue;
    }
    const media = await downloadImage(sourceUrl);
    if (!media) continue;
    const publicUrl = await uploadArchivedImage(admin, {
      userId,
      competitorId,
      rowId: row.id,
      platform: row.platform,
      sourceUrl,
      bytes: media.bytes,
      contentType: media.contentType,
    });
    if (publicUrl) archivedBySource.set(sourceUrl, publicUrl);
  }

  if (archivedBySource.size === 0) return false;

  const baseUrls = row.media_urls?.length ? row.media_urls : rasterUrls;
  const media_urls = dedupeOrganicMediaUrls(
    baseUrls.map((url) => archivedBySource.get(url.trim()) ?? url),
    row.platform as OrganicPlatform,
  );

  const archived_preview_url = media_urls[0] ?? archivedBySource.get(rasterUrls[0]!) ?? null;
  if (!archived_preview_url) return false;

  const { error: updateErr } = await admin
    .from("organic_posts")
    .update({ archived_preview_url, media_urls })
    .eq("id", row.id);
  if (updateErr) {
    console.error("[archiveOrganicPreviews] row update", updateErr.message);
    return false;
  }
  return true;
}

/**
 * Archive preview thumbnails for organic posts that don't have a stored copy yet.
 * Best-effort and bounded; safe to await after each organic scrape persist.
 */
export async function archiveOrganicPreviewsForCompetitor(
  admin: SupabaseClient<Database>,
  params: {
    userId: string;
    competitorId: string;
    platforms?: OrganicPlatform[];
  },
): Promise<{ archived: number; candidates: number }> {
  const { userId, competitorId } = params;

  let query = admin
    .from("organic_posts")
    .select("id, platform, media_urls, raw_data, archived_preview_url")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .order("scraped_at", { ascending: false })
    .limit(MAX_ARCHIVES_PER_RUN * 3);

  if (params.platforms?.length) {
    query = query.in("platform", params.platforms);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error("[archiveOrganicPreviews] load candidates", error.message);
    return { archived: 0, candidates: 0 };
  }

  const candidates = ((rows ?? []) as ArchiveCandidate[])
    .filter(organicPostNeedsArchiving)
    .slice(0, MAX_ARCHIVES_PER_RUN);
  let archived = 0;

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((row) => archiveOne(admin, { userId, competitorId, row })),
    );
    archived += results.filter(Boolean).length;
  }

  if (archived > 0) {
    console.info("[archiveOrganicPreviews]", { competitorId, archived, candidates: candidates.length });
  }
  return { archived, candidates: candidates.length };
}
