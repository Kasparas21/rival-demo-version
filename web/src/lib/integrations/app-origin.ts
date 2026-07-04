export function getAppOrigin(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!url) {
    throw new Error("NEXT_PUBLIC_APP_URL is required for OAuth integrations");
  }
  return url.replace(/\/$/, "");
}
