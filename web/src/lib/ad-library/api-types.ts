import type {
  GoogleAdRow,
  LinkedInAdCard,
  MetaAdCard,
  MicrosoftAdCard,
  PinterestAdCard,
  SnapchatAdCard,
  TikTokAdCard,
} from "./normalize";

export type AdsLibraryPlatform =
  | "meta"
  | "google"
  | "linkedin"
  | "tiktok"
  | "microsoft"
  | "pinterest"
  | "snapchat";

export type AdsLibraryResponse = {
  ok: boolean;
  configured: boolean;
  error?: string;
  partial?: boolean;
  meta: { ads: MetaAdCard[]; error: string | null };
  google: { rows: GoogleAdRow[]; error: string | null };
  linkedin: { ads: LinkedInAdCard[]; error: string | null };
  tiktok: { ads: TikTokAdCard[]; error: string | null };
  microsoft: { ads: MicrosoftAdCard[]; error: string | null };
  pinterest: { ads: PinterestAdCard[]; error: string | null };
  snapchat: { ads: SnapchatAdCard[]; error: string | null };
};

/** Server returns this when `platforms` is a subset — client merges into existing state. */
export type AdsLibraryPartialJson = Pick<
  AdsLibraryResponse,
  "ok" | "configured" | "error"
> & {
  partial: true;
  meta?: AdsLibraryResponse["meta"];
  google?: AdsLibraryResponse["google"];
  linkedin?: AdsLibraryResponse["linkedin"];
  tiktok?: AdsLibraryResponse["tiktok"];
  microsoft?: AdsLibraryResponse["microsoft"];
  pinterest?: AdsLibraryResponse["pinterest"];
  snapchat?: AdsLibraryResponse["snapchat"];
};

export function emptyAdsLibraryShell(
  error?: string,
  configured = true
): AdsLibraryResponse {
  const msg = error ?? null;
  return {
    ok: !error,
    configured,
    error,
    meta: { ads: [], error: msg },
    google: { rows: [], error: msg },
    linkedin: { ads: [], error: msg },
    tiktok: { ads: [], error: msg },
    microsoft: { ads: [], error: msg },
    pinterest: { ads: [], error: msg },
    snapchat: { ads: [], error: msg },
  };
}

/**
 * Ensures all platform keys exist (cached or malformed payloads may omit keys).
 */
export function coerceAdsLibraryResponse(
  input: AdsLibraryResponse | AdsLibraryPartialJson | null | undefined
): AdsLibraryResponse {
  const shell = emptyAdsLibraryShell();
  if (!input || typeof input !== "object") return shell;
  return {
    ok: typeof input.ok === "boolean" ? input.ok : shell.ok,
    configured: typeof input.configured === "boolean" ? input.configured : shell.configured,
    error: typeof input.error === "string" ? input.error : shell.error,
    meta: input.meta ?? shell.meta,
    google: input.google ?? shell.google,
    linkedin: input.linkedin ?? shell.linkedin,
    tiktok: input.tiktok ?? shell.tiktok,
    microsoft: input.microsoft ?? shell.microsoft,
    pinterest: input.pinterest ?? shell.pinterest,
    snapchat: input.snapchat ?? shell.snapchat,
  };
}

function preferAdsLibrarySlot<T extends { error: string | null }>(
  previous: T,
  next: T,
  itemCount: (slot: T) => number,
  trustIncomingEmpty: boolean
): T {
  if (trustIncomingEmpty) return next;
  if (next.error != null) return next;
  if (itemCount(next) > 0) return next;
  if (itemCount(previous) > 0) return previous;
  return next;
}

/** Richness score so a stale cache merge cannot replace fresh Meta rows that have real creatives. */
function metaCreativeHydrationScore(m: AdsLibraryResponse["meta"]): number {
  if (m.error != null) return -1;
  let s = (m.ads?.length ?? 0) * 3;
  for (const a of m.ads ?? []) {
    if (a.img?.trim()) s += 100;
    if (a.pageProfilePic?.trim()) s += 25;
    if (a.videoUrl?.trim()) s += 2;
  }
  return s;
}

function preferMetaAdsLibrarySlot(
  previous: AdsLibraryResponse["meta"],
  next: AdsLibraryResponse["meta"],
  trustIncomingEmpty: boolean
): AdsLibraryResponse["meta"] {
  if (trustIncomingEmpty) return next;
  if (next.error != null) return next;

  const pn = previous.ads?.length ?? 0;
  const nn = next.ads?.length ?? 0;
  if (nn === 0 && pn > 0) return previous;
  if (nn > 0 && pn === 0) return next;

  const sp = metaCreativeHydrationScore(previous);
  const sn = metaCreativeHydrationScore(next);
  if (sn > sp) return next;
  if (sp > sn) return previous;
  return next;
}

/**
 * Combines incremental `/api/ads/library` responses with UI state.
 * @param trustIncomingEmpty When true (e.g. `skipCache` refresh), empty platform payloads replace prior data.
 *   When false, a successful-but-empty payload does not wipe a previously non-empty slot (fixes refresh/cache races).
 */
export function mergeAdsLibraryState(
  prev: AdsLibraryResponse | null,
  incoming: AdsLibraryResponse | AdsLibraryPartialJson,
  options?: { trustIncomingEmpty?: boolean }
): AdsLibraryResponse {
  const trustIncomingEmpty = options?.trustIncomingEmpty === true;
  const base = prev ? coerceAdsLibraryResponse(prev) : emptyAdsLibraryShell();
  const isPartial = "partial" in incoming && incoming.partial === true;

  if (!isPartial) {
    const inc = coerceAdsLibraryResponse(incoming as AdsLibraryResponse);
    if (trustIncomingEmpty) return inc;
    return coerceAdsLibraryResponse({
      ...inc,
      meta: preferMetaAdsLibrarySlot(base.meta, inc.meta, false),
      google: preferAdsLibrarySlot(base.google, inc.google, (g) => g.rows?.length ?? 0, false),
      linkedin: preferAdsLibrarySlot(base.linkedin, inc.linkedin, (l) => l.ads?.length ?? 0, false),
      tiktok: preferAdsLibrarySlot(base.tiktok, inc.tiktok, (t) => t.ads?.length ?? 0, false),
      microsoft: preferAdsLibrarySlot(base.microsoft, inc.microsoft, (m) => m.ads?.length ?? 0, false),
      pinterest: preferAdsLibrarySlot(base.pinterest, inc.pinterest, (p) => p.ads?.length ?? 0, false),
      snapchat: preferAdsLibrarySlot(base.snapchat, inc.snapchat, (s) => s.ads?.length ?? 0, false),
    });
  }

  return coerceAdsLibraryResponse({
    ok: incoming.ok ?? base.ok,
    configured: incoming.configured ?? base.configured,
    error: incoming.error ?? base.error,
    meta:
      incoming.meta !== undefined
        ? preferMetaAdsLibrarySlot(base.meta, incoming.meta, trustIncomingEmpty)
        : base.meta,
    google:
      incoming.google !== undefined
        ? preferAdsLibrarySlot(base.google, incoming.google, (g) => g.rows?.length ?? 0, trustIncomingEmpty)
        : base.google,
    linkedin:
      incoming.linkedin !== undefined
        ? preferAdsLibrarySlot(base.linkedin, incoming.linkedin, (l) => l.ads?.length ?? 0, trustIncomingEmpty)
        : base.linkedin,
    tiktok:
      incoming.tiktok !== undefined
        ? preferAdsLibrarySlot(base.tiktok, incoming.tiktok, (t) => t.ads?.length ?? 0, trustIncomingEmpty)
        : base.tiktok,
    microsoft:
      incoming.microsoft !== undefined
        ? preferAdsLibrarySlot(
            base.microsoft,
            incoming.microsoft,
            (m) => m.ads?.length ?? 0,
            trustIncomingEmpty
          )
        : base.microsoft,
    pinterest:
      incoming.pinterest !== undefined
        ? preferAdsLibrarySlot(
            base.pinterest,
            incoming.pinterest,
            (p) => p.ads?.length ?? 0,
            trustIncomingEmpty
          )
        : base.pinterest,
    snapchat:
      incoming.snapchat !== undefined
        ? preferAdsLibrarySlot(
            base.snapchat,
            incoming.snapchat,
            (s) => s.ads?.length ?? 0,
            trustIncomingEmpty
          )
        : base.snapchat,
  });
}
