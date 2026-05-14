import type { Json } from "@/lib/supabase/types";

/**
 * Postgres json/jsonb rejects some strings that JavaScript allows (e.g. lone surrogates).
 * Strip unpaired UTF-16 surrogates before upserting user/scraper JSON.
 */
export function sanitizeJsonValue(v: unknown): unknown {
  if (typeof v === "string") {
    return v
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
      .replace(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "$1");
  }
  if (Array.isArray(v)) return v.map(sanitizeJsonValue);
  if (v != null && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = sanitizeJsonValue(val);
    }
    return out;
  }
  return v;
}

export function sanitizeJsonForPostgres(v: unknown): Json {
  return sanitizeJsonValue(v) as Json;
}
