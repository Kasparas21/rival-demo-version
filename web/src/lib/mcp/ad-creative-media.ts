import { pickArchivableImageUrl } from "@/lib/ad-library/archive-ad-creatives";
import { resolveAdDetailCreativeMedia } from "@/lib/ad-detail/resolve-creative-media";

export const MCP_MAX_INLINE_VISUALS = 4;
export const MCP_VISUALS_KEY = "_mcpVisuals";

export type McpAdCreativeSource = {
  id: string;
  platform: string;
  format?: string | null;
  ad_creative_url: string | null;
  archived_creative_url?: string | null;
  raw_payload: unknown;
};

export type McpAdCreativeRefs = {
  visual_kind: "image" | "video" | "none";
  image_url: string | null;
  video_url: string | null;
};

export type McpImageContentBlock = {
  type: "image";
  data: string;
  mimeType: string;
  annotations?: { audience: Array<"user" | "assistant"> };
};

const FETCH_TIMEOUT_MS = 10_000;
const MAX_DOWNLOAD_BYTES = 4 * 1024 * 1024;
const MAX_INLINE_BYTES = 1_500_000;
const IMAGE_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

export function toFetchableHttpUrl(url: string | null | undefined, appOrigin = ""): string | null {
  const raw = url?.trim() ?? "";
  if (!raw) return null;

  if (raw.startsWith("/api/media/google-creative")) {
    try {
      const parsed = new URL(raw, appOrigin || "https://spy-rival.com");
      const original = parsed.searchParams.get("url")?.trim() ?? "";
      return /^https?:\/\//i.test(original) ? original : null;
    } catch {
      return null;
    }
  }

  if (/^https?:\/\//i.test(raw)) return raw;
  return null;
}

export function resolveMcpAdCreativeRefs(
  row: McpAdCreativeSource,
  appOrigin = "",
): McpAdCreativeRefs {
  const archived = toFetchableHttpUrl(row.archived_creative_url, appOrigin);
  const resolved = resolveAdDetailCreativeMedia({
    platform: row.platform,
    format: row.format ?? "image",
    ad_creative_url: row.ad_creative_url,
    raw_payload: row.raw_payload,
  });
  const fallbackStill = toFetchableHttpUrl(
    pickArchivableImageUrl({
      id: row.id,
      ad_creative_url: row.ad_creative_url,
      raw_payload: row.raw_payload,
    }),
    appOrigin,
  );

  if (resolved.kind === "video") {
    const poster =
      toFetchableHttpUrl(resolved.poster, appOrigin) ?? archived ?? fallbackStill;
    const videoUrl = toFetchableHttpUrl(resolved.src, appOrigin) ?? (resolved.src.trim() || null);
    return {
      visual_kind: "video",
      image_url: poster,
      video_url: videoUrl,
    };
  }

  if (resolved.kind === "image") {
    return {
      visual_kind: "image",
      image_url: archived ?? toFetchableHttpUrl(resolved.src, appOrigin) ?? fallbackStill,
      video_url: null,
    };
  }

  if (archived || fallbackStill) {
    return { visual_kind: "image", image_url: archived ?? fallbackStill, video_url: null };
  }

  return { visual_kind: "none", image_url: null, video_url: null };
}

export function mcpCreativeFields(row: McpAdCreativeSource, appOrigin = ""): McpAdCreativeRefs {
  return resolveMcpAdCreativeRefs(row, appOrigin);
}

function sniffImageMime(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 6 && bytes.subarray(0, 3).toString("ascii") === "GIF") {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

async function downscaleIfNeeded(
  buf: Buffer,
  mimeType: string,
): Promise<{ data: Buffer; mimeType: string } | null> {
  if (buf.byteLength <= MAX_INLINE_BYTES) {
    return { data: buf, mimeType };
  }
  try {
    const sharp = (await import("sharp")).default;
    const data = await sharp(buf)
      .rotate()
      .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
    if (data.byteLength === 0 || data.byteLength > MAX_INLINE_BYTES) return null;
    return { data, mimeType: "image/jpeg" };
  } catch {
    return buf.byteLength <= MAX_DOWNLOAD_BYTES ? { data: buf, mimeType } : null;
  }
}

async function downloadImage(url: string): Promise<{ data: Buffer; mimeType: string } | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
      headers: {
        Accept: "image/*,*/*",
        "User-Agent":
          "Mozilla/5.0 (compatible; Rival/1.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) return null;
    const headerMime = res.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
    if (headerMime.startsWith("video/") || headerMime === "image/svg+xml") return null;
    const len = Number(res.headers.get("content-length") ?? "0");
    if (len > MAX_DOWNLOAD_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_DOWNLOAD_BYTES) return null;
    const sniffed = sniffImageMime(buf);
    const mimeType = sniffed ?? (IMAGE_MIME.has(headerMime) ? headerMime.replace("image/jpg", "image/jpeg") : null);
    if (!mimeType) return null;
    return downscaleIfNeeded(buf, mimeType);
  } catch {
    return null;
  }
}

async function encodeJpeg(buf: Buffer, width: number, quality: number): Promise<Buffer | null> {
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(buf)
      .rotate()
      .resize({
        width,
        height: Math.round(width * 1.4),
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    return out.byteLength > 0 ? out : null;
  } catch {
    return null;
  }
}

async function jpegUnder(buf: Buffer, maxBytes: number, widths: number[]): Promise<Buffer | null> {
  for (const width of widths) {
    for (const quality of [76, 66, 56, 46]) {
      const out = await encodeJpeg(buf, width, quality);
      if (out && out.byteLength <= maxBytes) return out;
    }
  }
  return null;
}

export type GalleryJpeg = {
  /** Sharper JPEG the chat gallery draws, expands, copies, and downloads. */
  data: string;
  /** JPEG the model should look at. Empty when this card is display-only. */
  vision: string;
  mime: "image/jpeg";
};

/**
 * Embedded JPEGs for the in-chat gallery. Display bytes stay in the widget.
 * Vision bytes are a separate, smaller encode so Claude can see the creative
 * without doubling a large file into the tool result.
 */
export async function fetchGalleryThumbnail(
  urls: Array<string | null | undefined>,
  options?: { displayMaxBytes?: number; includeVision?: boolean },
): Promise<GalleryJpeg | null> {
  const displayMax = options?.displayMaxBytes ?? 48_000;
  const includeVision = options?.includeVision !== false;
  const displayWidths = displayMax > 30_000 ? [960, 760, 560] : displayMax > 16_000 ? [720, 520, 400] : [480, 360, 280];
  const seen = new Set<string>();
  for (const raw of urls) {
    const url = toFetchableHttpUrl(raw) ?? (raw?.trim().startsWith("http") ? raw.trim() : null);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const media = await downloadImage(url);
    if (!media) continue;
    const display = await jpegUnder(media.data, displayMax, displayWidths);
    if (!display) continue;
    let vision = "";
    if (includeVision) {
      const visionBuf =
        display.byteLength <= 32_000
          ? display
          : ((await jpegUnder(media.data, 32_000, [800, 640, 480])) ?? null);
      if (visionBuf) vision = visionBuf.toString("base64");
    }
    return { data: display.toString("base64"), vision, mime: "image/jpeg" };
  }
  return null;
}

export async function fetchMcpImageContent(
  urls: Array<string | null | undefined>,
): Promise<McpImageContentBlock | null> {
  const seen = new Set<string>();
  for (const raw of urls) {
    const url = raw?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const media = await downloadImage(url);
    if (!media) continue;
    return {
      type: "image",
      data: media.data.toString("base64"),
      mimeType: media.mimeType,
      annotations: { audience: ["user", "assistant"] },
    };
  }
  return null;
}

export async function fetchAdCreativeVisual(
  row: McpAdCreativeSource,
  appOrigin = "",
): Promise<{ refs: McpAdCreativeRefs; image: McpImageContentBlock | null }> {
  const refs = resolveMcpAdCreativeRefs(row, appOrigin);
  const image = await fetchMcpImageContent([
    refs.image_url,
    row.archived_creative_url,
    row.ad_creative_url,
  ]);
  return { refs, image };
}

export async function withFetchedAdVisuals<T extends Record<string, unknown>>(
  payload: T,
  sources: McpAdCreativeSource[],
  appOrigin = "",
  max = MCP_MAX_INLINE_VISUALS,
): Promise<T & { [MCP_VISUALS_KEY]?: McpImageContentBlock[] }> {
  const slice = sources.slice(0, Math.max(0, max));
  if (!slice.length) return payload;
  const fetched = await Promise.all(slice.map((row) => fetchAdCreativeVisual(row, appOrigin)));
  const visuals = fetched
    .map((item) => item.image)
    .filter((block): block is McpImageContentBlock => Boolean(block));
  if (!visuals.length) return payload;
  return { ...payload, [MCP_VISUALS_KEY]: visuals };
}

export async function withFetchedImageUrlVisuals<T extends Record<string, unknown>>(
  payload: T,
  imageUrls: Array<string | null | undefined>,
  max = MCP_MAX_INLINE_VISUALS,
): Promise<T & { [MCP_VISUALS_KEY]?: McpImageContentBlock[] }> {
  const slice = imageUrls.filter((url): url is string => Boolean(url?.trim())).slice(0, max);
  if (!slice.length) return payload;
  const fetched = await Promise.all(slice.map((url) => fetchMcpImageContent([url])));
  const visuals = fetched.filter((block): block is McpImageContentBlock => Boolean(block));
  if (!visuals.length) return payload;
  return { ...payload, [MCP_VISUALS_KEY]: visuals };
}
