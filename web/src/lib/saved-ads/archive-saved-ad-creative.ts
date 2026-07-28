/**
 * Archives saved ad creatives into Supabase Storage so previews survive Meta CDN expiry.
 * Runs at save time — once archived, the creative stays visible forever in the Saved library.
 */
import { createHash } from "node:crypto";

import { pickArchivableImageUrl } from "@/lib/ad-library/archive-ad-creatives";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

const BUCKET = "ad-creatives";
const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 6 * 1024 * 1024;

const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

type ArchiveRow = {
  id: string;
  ad_creative_url: string | null;
  raw_payload: unknown;
  archived_creative_url?: string | null;
};

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

function injectArchivedIntoPayload(rawPayload: unknown, archivedUrl: string): Json {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return rawPayload as Json;
  }
  const o = { ...(rawPayload as Record<string, unknown>) };
  if (!String(o.img ?? "").trim()) {
    o.img = archivedUrl;
  }
  return o as Json;
}

/**
 * Archive the creative for a saved ad row. Reuses scraped archive if provided.
 * Returns the public Storage URL, or null if no archivable image was found.
 */
export async function archiveSavedAdCreative(params: {
  userId: string;
  savedAdId: string;
  row: ArchiveRow;
  scrapedArchivedUrl?: string | null;
}): Promise<string | null> {
  const { userId, savedAdId, row } = params;
  const existing = row.archived_creative_url?.trim() || params.scrapedArchivedUrl?.trim() || "";
  if (existing) return existing;

  const url = pickArchivableImageUrl(row);
  if (!url) return null;

  const admin = createSupabaseAdminClient();
  const media = await downloadImage(url);
  if (!media) return null;

  const ext = CONTENT_TYPE_EXT[media.contentType] ?? "jpg";
  const hash = createHash("sha1").update(savedAdId).digest("hex").slice(0, 12);
  const path = `${userId}/saved/${savedAdId}-${hash}.${ext}`;

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, media.bytes, { contentType: media.contentType, upsert: true });
  if (uploadErr) {
    console.error("[archiveSavedAdCreative] upload", uploadErr.message);
    return null;
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = pub?.publicUrl?.trim() || "";
  if (!publicUrl) return null;

  const patchedPayload = injectArchivedIntoPayload(row.raw_payload, publicUrl);
  const { error: updateErr } = await admin
    .from("saved_ads")
    .update({
      archived_creative_url: publicUrl,
      raw_payload: patchedPayload,
    })
    .eq("id", savedAdId)
    .eq("user_id", userId);
  if (updateErr) {
    console.error("[archiveSavedAdCreative] row update", updateErr.message);
    return null;
  }

  return publicUrl;
}
