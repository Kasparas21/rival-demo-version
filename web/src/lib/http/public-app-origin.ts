const PUBLIC_APP_ORIGIN_FALLBACK = "https://spy-rival.com";

function normalizeOrigin(url: string): string {
  const cleaned = url.trim().replace(/\/+$/, "");
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }
  const isLocal =
    cleaned.startsWith("localhost") ||
    cleaned.startsWith("127.0.0.1") ||
    cleaned.startsWith("[::1]");
  return isLocal ? `http://${cleaned}` : `https://${cleaned}`;
}

function isLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

/**
 * Public origin for user-facing connector URLs (MCP, OAuth, email links).
 * Never uses `window.location.origin` — local dev UI may run on localhost while
 * connectors must point at the deployed public domain.
 */
export function getPublicConnectorOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) {
    try {
      const origin = normalizeOrigin(raw);
      const hostname = new URL(origin).hostname;
      if (!isLocalHostname(hostname)) {
        return origin;
      }
    } catch {
      /* fall through */
    }
  }
  return PUBLIC_APP_ORIGIN_FALLBACK;
}

export function publicMcpEndpointUrl(): string {
  return `${getPublicConnectorOrigin()}/api/mcp/mcp`;
}
