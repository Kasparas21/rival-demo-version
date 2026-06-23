import { isGoogleFaviconUrl, isUsableGoogleStillImagePreviewUrl } from "@/lib/ad-library/normalize";

const GOOGLE_CREATIVE_HOST_PATTERNS = [
  /(^|\.)googlesyndication\.com$/i,
  /(^|\.)googleusercontent\.com$/i,
  /(^|\.)ggpht\.com$/i,
  /(^|\.)gstatic\.com$/i,
  /(^|\.)ytimg\.com$/i,
  /(^|\.)youtube\.com$/i,
];

export function isGoogleCreativeCdnHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return false;
  return GOOGLE_CREATIVE_HOST_PATTERNS.some((re) => re.test(host));
}

/** Same-origin proxy so simgad / ytimg previews survive ad blockers in the browser. */
export function googleCreativeDisplayUrl(externalUrl: string | null | undefined): string | null {
  const raw = externalUrl?.trim();
  if (!raw || !/^https:\/\//i.test(raw)) return null;
  if (!isUsableGoogleStillImagePreviewUrl(raw)) return null;
  if (isGoogleFaviconUrl(raw)) return raw;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (!isGoogleCreativeCdnHost(parsed.hostname)) return raw;
  return `/api/media/google-creative?url=${encodeURIComponent(raw)}`;
}

export function resolveGoogleStillPreviewDisplayUrl(
  previewUrl?: string | null,
  img?: string | null,
): string {
  const rawPreview = (previewUrl?.trim() || "").trim();
  const rawImg = (img || "").trim();
  const external =
    (isUsableGoogleStillImagePreviewUrl(rawPreview) ? rawPreview : "") ||
    (isUsableGoogleStillImagePreviewUrl(rawImg) ? rawImg : "");
  if (!external) return "";
  return googleCreativeDisplayUrl(external) ?? external;
}
