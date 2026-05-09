export const POLAR_PRODUCT_ID_FALLBACK = "a105e33c-ab82-4649-8740-c7a799f654bc";

/** Hostnames from copy-paste env examples; outbound auth links must never use these. */
const TUTORIAL_PLACEHOLDER_HOSTNAMES = new Set(["your-domain.com", "www.your-domain.com"]);

/**
 * If `getAppUrl()` still points at a tutorial placeholder, confirmation emails embed a dead link.
 */
export function getAppUrlMisconfigurationReason(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (TUTORIAL_PLACEHOLDER_HOSTNAMES.has(hostname)) {
      return "NEXT_PUBLIC_APP_URL is still a tutorial placeholder (your-domain.com). Set it to your real public URL (e.g. https://your-site.com) in Vercel Environment Variables and redeploy; add that same origin/callback in Supabase → Authentication → URL Configuration.";
    }
  } catch {
    return null;
  }
  return null;
}

/** Public site origin (`https://…` / `http://localhost…`) for redirects and auth email links — must stay in sync with Supabase Auth redirect allowlist. */
export function getAppUrl(): string {
  const trimmedVercel = process.env.VERCEL_URL?.trim();

  const rawEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  let base: string;
  if (rawEnv) {
    const cleaned = rawEnv.replace(/\/+$/, "");
    if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
      base = cleaned;
    } else {
      const maybeLocalHost =
        cleaned.startsWith("localhost") ||
        cleaned.startsWith("127.0.0.1") ||
        cleaned.startsWith("[::1]");
      base = maybeLocalHost ? `http://${cleaned}` : `https://${cleaned}`;
    }
  } else if (trimmedVercel) {
    base = `https://${trimmedVercel}`;
  } else {
    base = "http://localhost:3000";
  }

  return base.replace(/\/+$/, "");
}

export function getPolarEnv() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN?.trim();
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET?.trim();
  const productId = process.env.POLAR_PRODUCT_ID?.trim() || POLAR_PRODUCT_ID_FALLBACK;
  const server: "production" | "sandbox" =
    process.env.POLAR_SERVER?.trim() === "sandbox" ? "sandbox" : "production";

  if (!accessToken) {
    throw new Error("Missing required environment variable: POLAR_ACCESS_TOKEN");
  }

  return {
    accessToken,
    webhookSecret,
    productId,
    server,
  };
}

export function getPolarWebhookSecret(): string {
  const secret = process.env.POLAR_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing required environment variable: POLAR_WEBHOOK_SECRET");
  }
  return secret;
}
