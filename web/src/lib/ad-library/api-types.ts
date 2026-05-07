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

export function mergeAdsLibraryState(
  prev: AdsLibraryResponse | null,
  incoming: AdsLibraryResponse | AdsLibraryPartialJson
): AdsLibraryResponse {
  if (!("partial" in incoming) || !incoming.partial) {
    return coerceAdsLibraryResponse(incoming as AdsLibraryResponse);
  }
  const base = prev ? coerceAdsLibraryResponse(prev) : emptyAdsLibraryShell();
  return coerceAdsLibraryResponse({
    ok: incoming.ok ?? base.ok,
    configured: incoming.configured ?? base.configured,
    error: incoming.error ?? base.error,
    meta: incoming.meta ?? base.meta,
    google: incoming.google ?? base.google,
    linkedin: incoming.linkedin ?? base.linkedin,
    tiktok: incoming.tiktok ?? base.tiktok,
    microsoft: incoming.microsoft ?? base.microsoft,
    pinterest: incoming.pinterest ?? base.pinterest,
    snapchat: incoming.snapchat ?? base.snapchat,
  });
}
