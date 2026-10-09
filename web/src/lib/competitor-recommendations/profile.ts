import { llmJson, type CostTracker } from "@/lib/competitor-recommendations/llm-json";
import type { SiteText } from "@/lib/competitor-recommendations/site-text";
import type { BrandProfile } from "@/lib/competitor-recommendations/types";

const SYSTEM = `You profile a business from its own website so its direct competitors can be found. Answer only with JSON. Use only what the page shows; when something isn't clear, use "unknown" or null rather than guessing.`;

const PRICE_TIERS = ["budget", "mid", "premium", "luxury", "unknown"] as const;
const TYPES = ["local", "ecommerce", "saas", "service", "other"] as const;

function userPrompt(site: SiteText, domain: string, hints: { brandContext?: string | null; markets?: string[] }): string {
  return `Website: ${domain}
Title: ${site.title}
Meta description: ${site.description}
Page language attribute: ${site.lang ?? "none"}
${hints.brandContext ? `What the owner wrote about the brand: ${hints.brandContext.slice(0, 600)}\n` : ""}${hints.markets?.length ? `Countries they advertise in: ${hints.markets.join(", ")}\n` : ""}
Page text:
${site.text}

Return:
{
  "brandName": string,
  "offering": one sentence in English on what they sell and to whom,
  "category": 2-5 words naming the product or service category, in English,
  "customer": who buys, one short phrase in English,
  "priceTier": one of ${PRICE_TIERS.join(", ")},
  "businessType": "local" if customers must come to (or be served in) one area — clinics, salons, restaurants, gyms, local trades; "ecommerce" for online shops and DTC brands; "saas" for software; "service" for agencies and online services; else "other",
  "country": ISO-2 country they mainly sell in (from address, phone, currency, domain or language), or null,
  "city": for local businesses ONE city: the one in their address, or for a chain with several locations the city where most of them are; else null,
  "language": ISO 639-1 of the site's main language,
  "searchQueries": 4 web searches that would surface their DIRECT competitors (same offering, same customers, same country or area). Write them in the site's language. Don't include the brand's own name except at most one "alternatives to <brand>" query. For local businesses include the city in every query,
  "localSearchTerm": for local businesses, the Google Maps search for this kind of business in the site's language (e.g. "odontologijos klinika", "dental clinic"), else null
}`;
}

/** Turn the model's answer into a profile, with safe defaults for anything missing or malformed. Pure. */
export function normalizeProfile(raw: unknown, domain: string): BrandProfile {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  const businessType = pick(r.businessType, TYPES, "other");
  const country = str(r.country)?.toUpperCase();
  return {
    domain,
    brandName: str(r.brandName) ?? domain,
    offering: str(r.offering) ?? "",
    category: str(r.category) ?? "",
    customer: str(r.customer) ?? "",
    priceTier: pick(r.priceTier, PRICE_TIERS, "unknown"),
    businessType,
    country: country && /^[A-Z]{2}$/.test(country) ? country : null,
    // One city, even when the model lists a chain's every location.
    city: businessType === "local" ? (str(r.city)?.split(/[,;/]| and /)[0]?.trim() || null) : null,
    language: (str(r.language) ?? "en").slice(0, 2).toLowerCase(),
    searchQueries: (Array.isArray(r.searchQueries) ? r.searchQueries : [])
      .map(str)
      .filter((q): q is string => q != null)
      .slice(0, 4),
    localSearchTerm: businessType === "local" ? str(r.localSearchTerm) : null,
  };
}

export async function buildBrandProfile(
  domain: string,
  site: SiteText,
  hints: { brandContext?: string | null; markets?: string[] },
  cost: CostTracker,
): Promise<BrandProfile> {
  const raw = await llmJson({ system: SYSTEM, user: userPrompt(site, domain, hints), maxTokens: 900, cost });
  return normalizeProfile(raw, domain);
}
