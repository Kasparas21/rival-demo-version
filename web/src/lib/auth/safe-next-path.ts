/** Only used to resolve relative paths; never contacted. */
const RESOLVE_BASE = "https://next-path.invalid";

/**
 * A `next=` value that is safe to redirect to: a path on this site (query and hash kept), never another host.
 * Rejects `//host`, backslashes (browsers read `/\host` as `//host`), control characters, and anything that
 * resolves outside our own origin. Returns the normalised path, or null.
 */
export function safeNextPath(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(trimmed)) return null;

  let resolved: URL;
  try {
    resolved = new URL(trimmed, RESOLVE_BASE);
  } catch {
    return null;
  }
  if (resolved.origin !== RESOLVE_BASE) return null;
  const path = `${resolved.pathname}${resolved.search}${resolved.hash}`;
  /** Dot segments can normalise into a new `//host` (e.g. `/..//evil.com`), so check the result too. */
  return path.startsWith("//") ? null : path;
}

/** Same as {@link safeNextPath}, for values that may arrive percent-encoded once more (cookies, nested `next`). */
export function safeDecodedNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  return safeNextPath(decoded);
}
