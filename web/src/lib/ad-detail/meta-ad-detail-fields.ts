/** Meta Ads Library fields for the competitor ad detail drawer (payload → labels). */

const PUBLISH_ORDER = [
  "FACEBOOK",
  "INSTAGRAM",
  "THREADS",
  "MESSENGER",
  "AUDIENCE_NETWORK",
  "WHATSAPP",
  "OCULUS",
] as const;

const PUBLISH_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  THREADS: "Threads",
  MESSENGER: "Messenger",
  AUDIENCE_NETWORK: "Audience Network",
  WHATSAPP: "WhatsApp",
  OCULUS: "Oculus",
};

function metaPayloadRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function normPublisherKey(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, "_");
}

function publisherDisplayLabel(rawToken: string): string {
  const k = normPublisherKey(rawToken);
  if (PUBLISH_LABELS[k]) return PUBLISH_LABELS[k];
  return rawToken
    .trim()
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export type MetaPublisherDetailRow = { key: string; label: string };

export function metaPublisherDetailRows(rawPayload: unknown): MetaPublisherDetailRow[] | null {
  const p = metaPayloadRecord(rawPayload);
  if (!p) return null;

  const arr = p.publisher_platform;
  if (!Array.isArray(arr) || arr.length === 0) return null;

  const keyed = [...new Set(arr.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean))]
    .map((raw) => ({
      raw,
      key: normPublisherKey(raw),
    }))
    .map((row) => ({ ...row, label: publisherDisplayLabel(row.raw) }))
    .filter((row) => row.label.length > 0);

  const orderRank = (key: string) => {
    const i = (PUBLISH_ORDER as readonly string[]).indexOf(key);
    return i >= 0 ? i : 100;
  };

  keyed.sort((a, b) => {
    const ia = orderRank(a.key);
    const ib = orderRank(b.key);
    if (ia !== ib) return ia - ib;
    return a.label.localeCompare(b.label, "en");
  });

  const seenKeys = new Set<string>();
  const ordered: MetaPublisherDetailRow[] = [];
  for (const row of keyed) {
    if (seenKeys.has(row.key)) continue;
    seenKeys.add(row.key);
    ordered.push({ key: row.key, label: row.label });
  }

  return ordered.length ? ordered : null;
}

export function formatMetaPublisherPlatformsLine(rawPayload: unknown): string | null {
  const rows = metaPublisherDetailRows(rawPayload);
  return rows?.length ? rows.map((r) => r.label).join(" · ") : null;
}

export function metaEuRegionDetailLabel(rawPayload: unknown): string | null {
  const p = metaPayloadRecord(rawPayload);
  if (!p) return null;
  if (p.targets_eu !== true && p.targetsEu !== true) return null;
  return "EU";
}

export function metaBroadAudienceDetailLabel(rawPayload: unknown): string | null {
  const p = metaPayloadRecord(rawPayload);
  if (!p) return null;
  const g =
    typeof p.gender_audience === "string" ? p.gender_audience.trim()
    : typeof p.genderAudience === "string" ? p.genderAudience.trim()
    : "";
  if (!g || !/^all$/i.test(g)) return null;
  return "All ages · All genders";
}

/** Link-card headline (“Samba Classic Boots”) — not primary body text */
export function metaTitleFromPayload(rawPayload: unknown): string | null {
  const p = metaPayloadRecord(rawPayload);
  if (!p) return null;
  const linkH = typeof p.linkHeadline === "string" ? p.linkHeadline.trim() : "";
  const h = typeof p.headline === "string" ? p.headline.trim() : "";
  const t = linkH || h;
  return t || null;
}

/** Primary copy above the creative (`desc` / body text in Ad Library snapshot). */
export function metaPrimaryDescriptionFromPayload(rawPayload: unknown): string | null {
  const p = metaPayloadRecord(rawPayload);
  if (!p) return null;
  const d = typeof p.desc === "string" ? p.desc.trim() : "";
  return d || null;
}
