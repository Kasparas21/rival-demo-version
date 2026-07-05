/**
 * Archives organic post preview images into Supabase Storage (`organic-media` bucket)
 * so TikTok/Instagram CDN thumbnails survive after signed URLs expire.
 */
import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import {
  extractFacebookMediaFromRaw,
  extractLinkedInMediaFromRaw,
  extractTikTokMediaFromRaw,
} from "./normalize";
import type { OrganicPlatform } from "./types";

const BUCKET = "organic-media";
const MAX_ARCHIVES_PER_RUN = 60;
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
};

function isRasterPreviewUrl(url: string): boolean {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) && !/\.(mp4|mov|webm|m3u8)(\?|$)/i.test(trimmed);
}

function firstRasterUrl(urls: string[]): string | null {
  for (const url of urls) {
    if (isRasterPreviewUrl(url)) return url.trim();
  }
  return null;
}

/** Best raster preview URL for an organic post row at archive time. */
export function pickOrganicArchivablePreviewUrl(row: ArchiveCandidate): string | null {
  const fromColumn = firstRasterUrl(row.media_urls ?? []);
  if (fromColumn) return fromColumn;

  const platform = row.platform as OrganicPlatform;
  const raw = row.raw_data;
  let extracted: string[] = [];
  switch (platform) {
    case "tiktok":
      extracted = extractTikTokMediaFromRaw(raw);
      break;
    case "facebook":
      extracted = extractFacebookMediaFromRaw(raw);
      break;
    case "linkedin":
      extracted = extractLinkedInMediaFromRaw(raw);
      break;
    default:
      break;
  }
  return firstRasterUrl(extracted);
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
  admin: SupabaseClient<Database>,
  params: { userId: string; competitorId: string; row: ArchiveCandidate },
): Promise<boolean> {
  const { userId, competitorId, row } = params;
  const url = pickOrganicArchivablePreviewUrl(row);
  if (!url) return false;

  const media = await downloadImage(url);
  if (!media) return false;

  const ext = CONTENT_TYPE_EXT[media.contentType] ?? "jpg";
  const hash = createHash("sha1").update(row.id).digest("hex").slice(0, 12);
  const path = `${userId}/${competitorId}/${row.platform}/${row.id}-${hash}.${ext}`;

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, media.bytes, { contentType: media.contentType, upsert: true });
  if (uploadErr) {
    console.error("[archiveOrganicPreviews] upload", uploadErr.message);
    return false;
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = pub?.publicUrl;
  if (!publicUrl) return false;

  const { error: updateErr } = await admin
    .from("organic_posts")
    .update({ archived_preview_url: publicUrl })
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
    .select("id, platform, media_urls, raw_data")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .is("archived_preview_url", null)
    .order("scraped_at", { ascending: false })
    .limit(MAX_ARCHIVES_PER_RUN);

  if (params.platforms?.length) {
    query = query.in("platform", params.platforms);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error("[archiveOrganicPreviews] load candidates", error.message);
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
    console.info("[archiveOrganicPreviews]", { competitorId, archived, candidates: candidates.length });
  }
  return { archived, candidates: candidates.length };
}
