import { isGoogleFaviconUrl, isUsableGoogleStillImagePreviewUrl, pickGoogleStillPreviewExternalUrl } from "@/lib/ad-library/normalize";

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

export function buildGoogleStillPreviewDisplayCandidates(externalUrl: string): string[] {
  const t = externalUrl.trim();
  if (!t) return [];
  const out: string[] = [];
  const proxied = googleCreativeDisplayUrl(t);
  if (proxied) out.push(proxied);
  if (!out.includes(t)) out.push(t);
  return out;
}

/** Proxied + direct `<img src>` candidates for one or more external still URLs. */
export function resolveGoogleStillPreviewDisplayCandidates(
  ...externalCandidates: (string | null | undefined)[]
): string[] {
  const externals: string[] = [];
  for (const c of externalCandidates) {
    const hit = pickGoogleStillPreviewExternalUrl(c);
    if (hit && !externals.includes(hit)) externals.push(hit);
  }
  const displays: string[] = [];
  for (const ext of externals) {
    for (const d of buildGoogleStillPreviewDisplayCandidates(ext)) {
      if (!displays.includes(d)) displays.push(d);
    }
  }
  return displays;
}

export function resolveGoogleStillPreviewDisplayUrl(
  previewUrl?: string | null,
  img?: string | null,
): string {
  return resolveGoogleStillPreviewDisplayCandidates(previewUrl, img)[0] ?? "";
}
