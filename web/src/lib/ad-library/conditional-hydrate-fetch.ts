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

type HydrateHttpResult = { status: number; ok: boolean; text: string };

/** Identical hydrate requests already on the wire (the hook asks again while the first is pending). */
const inFlight = new Map<string, Promise<HydrateHttpResult>>();

function postHydrateShared(bodyJson: string): Promise<HydrateHttpResult> {
  const hit = inFlight.get(bodyJson);
  if (hit) return hit;
  const promise = fetch("/api/competitor/ads-library/hydrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: bodyJson,
  })
    .then(async (res) => ({ status: res.status, ok: res.ok, text: await res.text() }))
    .finally(() => inFlight.delete(bodyJson));
  inFlight.set(bodyJson, promise);
  return promise;
}

/** Rejects with AbortError when this caller's signal fires; the shared request keeps going for the others. */
function untilAborted<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

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
    const res = await untilAborted(postHydrateShared(JSON.stringify(body)), options.signal);

    if (res.status === 404) return { kind: "miss" };
    if (!res.ok) return { kind: "miss" };

    const json = JSON.parse(res.text) as {
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
