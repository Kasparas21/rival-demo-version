export function isAllowedOAuthRedirectUri(uri: string): boolean {
  const raw = uri.trim();
  if (!raw) return false;
  try {
    const u = new URL(raw);
    if (u.protocol === "https:") return true;
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function redirectUriMatchesRegistered(registered: string[], requested: string): boolean {
  const req = requested.trim();
  return registered.some((r) => r.trim() === req);
}
