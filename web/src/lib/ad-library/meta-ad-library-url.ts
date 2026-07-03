import { metaArchiveIdFromAdLibraryUrl } from "./stable-ad-keys";

/** Meta Ad Library `?id=` values are numeric strings (typically 15–20 digits). */
export function isMetaAdArchiveId(id: string): boolean {
  return /^\d{10,22}$/.test(id.trim());
}

export function buildMetaAdLibraryDetailUrl(archiveId: string): string {
  const id = archiveId.replace(/\D/g, "");
  if (!isMetaAdArchiveId(id)) {
    return "https://www.facebook.com/ads/library/";
  }
  return `https://www.facebook.com/ads/library/?id=${encodeURIComponent(id)}`;
}

function stringField(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/**
 * Resolve the official Meta Ad Library archive id from a scraped card payload.
 * Never treats collation ids or synthetic `fb-N` ids as archive ids unless they
 * are corroborated by `ad_archive_id` or a library URL.
 */
export function resolveMetaArchiveIdFromPayload(p: Record<string, unknown>): string | null {
  const fromField = stringField(p, ["ad_archive_id", "adArchiveId", "adArchiveID"]);
  if (fromField && isMetaAdArchiveId(fromField)) return fromField;

  const adArchiveOnCard = stringField(p, ["adArchiveId"]);
  if (adArchiveOnCard && isMetaAdArchiveId(adArchiveOnCard)) return adArchiveOnCard;

  for (const key of ["adLibraryUrl", "ad_library_url", "facebook_ad_library_url"]) {
    const raw = typeof p[key] === "string" ? (p[key] as string).trim() : "";
    if (!raw) continue;
    const fromUrl = metaArchiveIdFromAdLibraryUrl(raw);
    if (fromUrl && isMetaAdArchiveId(fromUrl)) return fromUrl;
  }

  const id = typeof p.id === "string" ? p.id.trim() : "";
  if (!id || /^fb-\d+$/i.test(id) || !isMetaAdArchiveId(id)) return null;

  if (fromField === id || adArchiveOnCard === id) return id;

  for (const key of ["adLibraryUrl", "ad_library_url", "facebook_ad_library_url"]) {
    const raw = typeof p[key] === "string" ? (p[key] as string).trim() : "";
    if (!raw) continue;
    if (metaArchiveIdFromAdLibraryUrl(raw) === id) return id;
  }

  return null;
}

/** Canonical per-ad Meta Ad Library detail URL, or null when no trustworthy archive id exists. */
export function resolveMetaAdLibraryUrlFromPayload(p: Record<string, unknown>): string | null {
  const archive = resolveMetaArchiveIdFromPayload(p);
  if (!archive) return null;
  return buildMetaAdLibraryDetailUrl(archive);
}
