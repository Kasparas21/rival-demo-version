/**
 * Richer Google Transparency fields via Apify `skipDetails: false`.
 * Default **on** unless `NEXT_PUBLIC_GOOGLE_AD_DETAILS=false`.
 */
export function readGoogleAdDetailsPublicFlag(): boolean {
  return process.env.NEXT_PUBLIC_GOOGLE_AD_DETAILS !== "false";
}
