import type { MergePlatformAdsOptions } from "./merge-library-platform-ads";
import {
  mergeGoogleAdRows,
  mergeLinkedInAdCards,
  mergeMetaAdCards,
  mergeMicrosoftAdCards,
  mergePinterestAdCards,
  mergeSnapchatAdCards,
  mergeTikTokAdCards,
} from "./merge-library-platform-ads";
import type {
  GoogleAdRow,
  LinkedInAdCard,
  MetaAdCard,
  MicrosoftAdCard,
  PinterestAdCard,
  SnapchatAdCard,
  TikTokAdCard,
} from "./normalize";

export type { AdsLibraryPlatform } from "./ads-library-platform";

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

function mergeMetaSlot(
  previous: AdsLibraryResponse["meta"],
  incoming: AdsLibraryResponse["meta"],
  options?: MergePlatformAdsOptions
): AdsLibraryResponse["meta"] {
  if (incoming.error != null) return incoming;
  const prevAds = previous.error != null ? [] : [...(previous.ads ?? [])];
  const incAds = incoming.ads ?? [];
  if (incAds.length === 0) return { error: null, ads: prevAds };
  return { error: null, ads: mergeMetaAdCards(prevAds, incAds, options) };
}

function mergeGoogleSlot(
  previous: AdsLibraryResponse["google"],
  incoming: AdsLibraryResponse["google"],
  options?: MergePlatformAdsOptions
): AdsLibraryResponse["google"] {
  if (incoming.error != null) return incoming;
  const prevRows = previous.error != null ? [] : [...(previous.rows ?? [])];
  const incRows = incoming.rows ?? [];
  if (incRows.length === 0) return { error: null, rows: prevRows };
  return { error: null, rows: mergeGoogleAdRows(prevRows, incRows, options) };
}

function mergeCardSlot<T extends { ads: unknown[]; error: string | null }>(
  previous: T,
  incoming: T,
  options: MergePlatformAdsOptions | undefined,
  mergeFn: (e: unknown[], i: unknown[], o?: MergePlatformAdsOptions) => unknown[]
): T {
  if (incoming.error != null) return incoming;
  const prevAds = previous.error != null ? [] : [...(previous.ads ?? [])];
  const incAds = incoming.ads ?? [];
  if (incAds.length === 0) return { ...incoming, ads: prevAds } as T;
  const merged = mergeFn(prevAds, incAds, options);
  return { ...incoming, ads: merged } as T;
}

/**
 * Combines incremental `/api/ads/library` responses with UI state.
 * Successful empty platform payloads no longer wipe prior creatives; arrays union by stable id.
 * @param _options.trustIncomingEmpty Ignored (kept for call-site compatibility).
 */
export function mergeAdsLibraryState(
  prev: AdsLibraryResponse | null,
  incoming: AdsLibraryResponse | AdsLibraryPartialJson,
  _options?: { trustIncomingEmpty?: boolean }
): AdsLibraryResponse {
  void _options?.trustIncomingEmpty;
  const base = prev ? coerceAdsLibraryResponse(prev) : emptyAdsLibraryShell();
  const isPartial = "partial" in incoming && incoming.partial === true;

  if (!isPartial) {
    const inc = coerceAdsLibraryResponse(incoming as AdsLibraryResponse);
    return coerceAdsLibraryResponse({
      ...inc,
      meta: mergeMetaSlot(base.meta, inc.meta),
      google: mergeGoogleSlot(base.google, inc.google),
      linkedin: mergeCardSlot(base.linkedin, inc.linkedin, undefined, (e, i, o) =>
        mergeLinkedInAdCards(e as LinkedInAdCard[], i as LinkedInAdCard[], o)
      ),
      tiktok: mergeCardSlot(base.tiktok, inc.tiktok, undefined, (e, i, o) =>
        mergeTikTokAdCards(e as TikTokAdCard[], i as TikTokAdCard[], o)
      ),
      microsoft: mergeCardSlot(base.microsoft, inc.microsoft, undefined, (e, i, o) =>
        mergeMicrosoftAdCards(e as MicrosoftAdCard[], i as MicrosoftAdCard[], o)
      ),
      pinterest: mergeCardSlot(base.pinterest, inc.pinterest, undefined, (e, i, o) =>
        mergePinterestAdCards(e as PinterestAdCard[], i as PinterestAdCard[], o)
      ),
      snapchat: mergeCardSlot(base.snapchat, inc.snapchat, undefined, (e, i, o) =>
        mergeSnapchatAdCards(e as SnapchatAdCard[], i as SnapchatAdCard[], o)
      ),
    });
  }

  return coerceAdsLibraryResponse({
    ok: incoming.ok ?? base.ok,
    configured: incoming.configured ?? base.configured,
    error: incoming.error ?? base.error,
    meta: incoming.meta !== undefined ? mergeMetaSlot(base.meta, incoming.meta) : base.meta,
    google: incoming.google !== undefined ? mergeGoogleSlot(base.google, incoming.google) : base.google,
    linkedin:
      incoming.linkedin !== undefined
        ? mergeCardSlot(base.linkedin, incoming.linkedin, undefined, (e, i, o) =>
            mergeLinkedInAdCards(e as LinkedInAdCard[], i as LinkedInAdCard[], o)
          )
        : base.linkedin,
    tiktok:
      incoming.tiktok !== undefined
        ? mergeCardSlot(base.tiktok, incoming.tiktok, undefined, (e, i, o) =>
            mergeTikTokAdCards(e as TikTokAdCard[], i as TikTokAdCard[], o)
          )
        : base.tiktok,
    microsoft:
      incoming.microsoft !== undefined
        ? mergeCardSlot(base.microsoft, incoming.microsoft, undefined, (e, i, o) =>
            mergeMicrosoftAdCards(e as MicrosoftAdCard[], i as MicrosoftAdCard[], o)
          )
        : base.microsoft,
    pinterest:
      incoming.pinterest !== undefined
        ? mergeCardSlot(base.pinterest, incoming.pinterest, undefined, (e, i, o) =>
            mergePinterestAdCards(e as PinterestAdCard[], i as PinterestAdCard[], o)
          )
        : base.pinterest,
    snapchat:
      incoming.snapchat !== undefined
        ? mergeCardSlot(base.snapchat, incoming.snapchat, undefined, (e, i, o) =>
            mergeSnapchatAdCards(e as SnapchatAdCard[], i as SnapchatAdCard[], o)
          )
        : base.snapchat,
  });
}
