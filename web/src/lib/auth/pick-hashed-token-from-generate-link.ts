/**
 * Prefer `properties.hashed_token`; some GoTrue responses only expose the verifier as `token` on `action_link`.
 */
export function pickHashedTokenFromGenerateLinkProperties(properties: {
  hashed_token?: string | null | undefined;
  action_link?: string | null | undefined;
} | null | undefined): string | null {
  const direct = properties?.hashed_token?.trim();
  if (direct) return direct;

  const link = properties?.action_link?.trim();
  if (!link) return null;

  const idx = link.indexOf("?");
  const query = idx === -1 ? "" : link.slice(idx + 1);
  if (!query) return null;

  try {
    const sp = new URLSearchParams(query);
    const raw = sp.get("token_hash") ?? sp.get("token");
    const trimmed = raw?.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}
