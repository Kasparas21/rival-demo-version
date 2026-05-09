/**
 * LinkedIn Ad Library URLs that narrow results to a company/advertiser:
 * - `companyIds[0]=…` (numeric company ID from the URL bar)
 * - `accountOwner=…` (slug from the "Company or advertiser" search field — same as pasting that UI state)
 *
 * Free-text **Keyword** search uses other params; those are higher false-positive risk for unrelated brands.
 */
export function linkedInAdLibraryUrlHasAdvertiserTargeting(value: string): boolean {
  const low = value.toLowerCase().trim();
  if (!low.includes("linkedin.com")) return false;
  if (low.includes("/ad-library/detail")) return true;
  if (low.includes("companyids")) return true;
  // "Company or advertiser" field in the Ad Library UI maps to accountOwner=slug
  if (low.includes("accountowner=")) return true;
  return false;
}
