import { hostToBrandLabel } from "@/lib/onboarding/host";

/** Sidebar/workspace `brand.name` is often the account display name, not the company. */
export function junkUserBrandDisplayName(name: string | undefined): boolean {
  const n = name?.trim() || "";
  return !n || /^(admin|owner|user|test|competitor)$/i.test(n);
}

export function cleanDomainHost(domain: string | undefined): string {
  if (!domain?.trim()) return "";
  return domain.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "";
}

/** Prefer real company name from domain when display name is junk (e.g. “Admin” + nike.com → “Nike”). */
export function effectiveCompetitorBrandLabel(name: string | undefined, domain: string | undefined): string {
  const n = name?.trim() || "";
  const host = cleanDomainHost(domain);
  if (n && !junkUserBrandDisplayName(n)) return n;
  if (host) return hostToBrandLabel(host);
  return "";
}
