import {
  coerceAdsLibraryResponse,
  type AdsLibraryResponse,
} from "@/lib/ad-library/api-types";
import {
  type AdsCacheHydrateClientMeta,
  writeAdsCacheHydrateClientMeta,
} from "@/lib/ad-library/ads-cache-hydrate-meta";

export type ConditionalHydrateResult =
  | { kind: "fresh" }
  | { kind: "full"; response: AdsLibraryResponse; cacheMeta: AdsCacheHydrateClientMeta | null }
  | { kind: "miss" };

type ConditionalHydrateOptions = {
  signal?: AbortSignal;
  /** When set, sent to the server for a metadata-only freshness check before full JSON. */
  clientMeta?: AdsCacheHydrateClientMeta | null;
};

/**
 * POST /api/competitor/ads-library/hydrate — metadata check first when `clientMeta` is present.
 */
export async function fetchHydratedAdsLibraryConditional(
  domain: string,
  options: ConditionalHydrateOptions = {},
): Promise<ConditionalHydrateResult> {
  const d = domain.trim();
  if (!d) return { kind: "miss" };

  const body: Record<string, unknown> = { domain: d };
  if (options.clientMeta?.platforms?.length) {
    body.clientMeta = options.clientMeta;
  }

  try {
    const res = await fetch("/api/competitor/ads-library/hydrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: options.signal,
    });

    if (res.status === 404) return { kind: "miss" };
    if (!res.ok) return { kind: "miss" };

    const json = (await res.json()) as {
      ok?: boolean;
      status?: string;
      response?: AdsLibraryResponse;
      cacheMeta?: AdsCacheHydrateClientMeta;
    };

    if (json.ok && json.status === "fresh") {
      return { kind: "fresh" };
    }

    if (json.ok && json.response) {
      const response = coerceAdsLibraryResponse(json.response);
      if (json.cacheMeta) {
        writeAdsCacheHydrateClientMeta(d, json.cacheMeta);
      }
      return { kind: "full", response, cacheMeta: json.cacheMeta ?? null };
    }

    return { kind: "miss" };
  } catch {
    return { kind: "miss" };
  }
}
