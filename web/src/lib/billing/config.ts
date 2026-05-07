export const POLAR_PRODUCT_ID_FALLBACK = "a105e33c-ab82-4649-8740-c7a799f654bc";

export function getAppUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL?.trim() ? `https://${process.env.VERCEL_URL.trim()}` : "http://localhost:3000");
  return raw.replace(/\/+$/, "");
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
