import { parseOffers } from "@/components/email-intelligence/email-intelligence-ui";
import { extractLandingPageUrl } from "@/lib/landing-pages/extract-lp-url";
import { displayUrlShort } from "@/lib/landing-pages/normalize-url";
import type { Json } from "@/lib/supabase/types";
import type {
  JourneyGoalDeal,
  JourneyGoalEvidence,
  JourneyGoalKind,
  StrategyJourneyGoal,
} from "@/lib/strategy-overview/payload-types";

type EvidenceAdRow = {
  id: string;
  platform: string;
  ad_text: string;
  ai_extracted_angle: string | null;
  funnel_stage: string | null;
  ad_creative_url: string | null;
  raw_payload: Json;
};

type EvidenceEmailRow = {
  email_type: string | null;
  subject: string | null;
  ai_angle: string | null;
  ai_cta: string | null;
  ai_summary: string | null;
  ai_offers: Json | null;
};

const CATEGORY_PATH_KEYS = new Set([
  "collections",
  "collection",
  "category",
  "categories",
  "shop",
  "c",
  "products",
  "product",
  "p",
]);

const OFFER_PATTERNS: RegExp[] = [
  /\b(\d{1,2}%)\s*off\b/gi,
  /\bsave\s+(\d{1,2}%)\b/gi,
  /\bup\s+to\s+(\d{1,2}%)\s*off\b/gi,
  /\bfree\s+shipping\b/gi,
  /\b(bogo|buy\s+one\s+get\s+one)\b/gi,
  /\bcode[:\s]+([A-Z0-9]{4,16})\b/gi,
];

function humanizeSlug(slug: string): string {
  const cleaned = slug
    .replace(/\.(html?|php|aspx)$/i, "")
    .replace(/[_+]/g, "-")
    .trim();
  if (!cleaned) return slug;
  return cleaned
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function categoryLabelFromUrl(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const parts = u.pathname.split("/").filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      const key = parts[i]!.toLowerCase();
      if (CATEGORY_PATH_KEYS.has(key) && parts[i + 1]) {
        const label = humanizeSlug(parts[i + 1]!);
        if (label.length >= 2 && label.length <= 48) return label;
      }
    }
    const last = parts[parts.length - 1];
    if (last && parts.length <= 2 && !/^(index|home|en|us|uk)$/i.test(last)) {
      const label = humanizeSlug(last);
      if (label.length >= 3 && label.length <= 40) return label;
    }
    return null;
  } catch {
    return null;
  }
}

function posterFromPayload(raw: Json): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  for (const k of ["img", "thumbnail", "image_url", "poster_url"]) {
    if (typeof o[k] === "string" && o[k]) return o[k] as string;
  }
  return null;
}

function headlineFromPayload(raw: Json): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  for (const k of ["headline", "title", "link_title"]) {
    if (typeof o[k] === "string" && (o[k] as string).trim()) return (o[k] as string).trim();
  }
  return null;
}

function extractLp(ad: EvidenceAdRow): string | null {
  return extractLandingPageUrl(ad.platform, ad.raw_payload);
}

function extractOffersFromText(text: string, platform: string): JourneyGoalDeal[] {
  const deals: JourneyGoalDeal[] = [];
  const seen = new Set<string>();
  for (const re of OFFER_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const label = m[0].trim();
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const codeMatch = /code[:\s]+([A-Z0-9]{4,16})/i.exec(label);
      deals.push({
        label,
        source: "ad",
        code: codeMatch?.[1] ?? null,
        channel: platform,
      });
    }
  }
  return deals;
}

function uniqueDeals(deals: JourneyGoalDeal[], max: number): JourneyGoalDeal[] {
  const out: JourneyGoalDeal[] = [];
  const seen = new Set<string>();
  for (const d of deals) {
    const key = `${d.source}:${d.label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
    if (out.length >= max) break;
  }
  return out;
}

function kindVerb(kind: JourneyGoalKind): string {
  switch (kind) {
    case "purchase":
      return "purchase on site";
    case "signup":
      return "sign up or start a trial";
    case "lead_gen":
      return "book a demo or submit a lead";
    case "install":
      return "install the app";
    case "subscribe":
      return "join the email list";
    default:
      return "visit the brand site";
  }
}

export function buildJourneyGoalEvidence(params: {
  goalKind: JourneyGoalKind;
  bofAds: EvidenceAdRow[];
  emails: EvidenceEmailRow[];
  topDestinations: StrategyJourneyGoal["topDestinations"];
  pathIntentBreakdown: StrategyJourneyGoal["pathIntentBreakdown"];
  angleCategories?: { label: string; count: number; sharePct: number }[];
  topAngles?: { angle: string; rank: number }[];
  brandDomain: string | null;
}): JourneyGoalEvidence {
  const {
    goalKind,
    bofAds,
    emails,
    topDestinations,
    pathIntentBreakdown,
    angleCategories = [],
    topAngles = [],
    brandDomain,
  } = params;

  const lpMeta = new Map<
    string,
    { adCount: number; platforms: Set<string>; creativeUrl: string | null; category: string | null }
  >();

  for (const ad of bofAds) {
    const lp = extractLp(ad);
    if (!lp) continue;
    let meta = lpMeta.get(lp);
    if (!meta) {
      meta = {
        adCount: 0,
        platforms: new Set(),
        creativeUrl: null,
        category: categoryLabelFromUrl(lp),
      };
      lpMeta.set(lp, meta);
    }
    meta.adCount += 1;
    meta.platforms.add(ad.platform);
    if (!meta.creativeUrl && ad.ad_creative_url) meta.creativeUrl = ad.ad_creative_url;
    if (!meta.creativeUrl) {
      const poster = posterFromPayload(ad.raw_payload);
      if (poster) meta.creativeUrl = poster;
    }
    if (!meta.category) meta.category = categoryLabelFromUrl(lp);
  }

  const categoryCounts = new Map<string, { adCount: number; url: string | null; label: string }>();
  for (const [url, meta] of lpMeta) {
    const label = meta.category ?? categoryLabelFromUrl(url);
    if (!label) continue;
    const key = label.toLowerCase();
    const prev = categoryCounts.get(key) ?? { adCount: 0, url, label };
    categoryCounts.set(key, {
      adCount: prev.adCount + meta.adCount,
      url: prev.url ?? url,
      label: prev.label,
    });
  }

  const totalBofLpAds = [...lpMeta.values()].reduce((s, m) => s + m.adCount, 0);
  const categories = [...categoryCounts.values()]
    .map((v) => ({
      label: v.label,
      url: v.url,
      adCount: v.adCount,
      sharePct: totalBofLpAds > 0 ? Math.round((v.adCount / totalBofLpAds) * 100) : 0,
    }))
    .sort((a, b) => b.adCount - a.adCount)
    .slice(0, 8);

  const landingPreviews = topDestinations.slice(0, 6).map((d) => {
    const meta = lpMeta.get(d.url);
    return {
      url: d.url,
      displayUrl: d.displayUrl,
      adCount: d.adCount,
      sharePct: d.sharePct,
      categoryLabel: meta?.category ?? categoryLabelFromUrl(d.url),
      previewImageUrl: meta?.creativeUrl ?? null,
      platforms: meta ? [...meta.platforms] : [],
    };
  });

  const topCreatives = bofAds
    .filter((a) => a.ad_creative_url || posterFromPayload(a.raw_payload))
    .slice(0, 12)
    .map((ad) => ({
      adId: ad.id,
      platform: ad.platform,
      imageUrl: ad.ad_creative_url ?? posterFromPayload(ad.raw_payload),
      headline:
        headlineFromPayload(ad.raw_payload) ??
        (ad.ad_text.slice(0, 80) || null),
      angle: ad.ai_extracted_angle,
      landingUrl: extractLp(ad),
    }))
    .filter((c) => c.imageUrl)
    .slice(0, 8);

  const adDeals = bofAds.flatMap((ad) =>
    extractOffersFromText(`${ad.ad_text} ${ad.ai_extracted_angle ?? ""}`, ad.platform),
  );
  const emailDeals = emails.flatMap((e) =>
    parseOffers(e.ai_offers).map((o) => ({
      label: o.code ? `${o.value} · code ${o.code}` : o.value,
      source: "email" as const,
      code: o.code,
      channel: "email",
    })),
  );
  const deals = uniqueDeals([...emailDeals, ...adDeals], 10);

  const angleHighlights = [
    ...angleCategories.slice(0, 4).map((c) => c.label),
    ...topAngles.slice(0, 3).map((a) => a.angle),
  ].filter((v, i, arr) => v && arr.indexOf(v) === i);

  const emailWithOffers = emails.filter((e) => parseOffers(e.ai_offers).length > 0).length;
  const emailOfferSummary =
    emailWithOffers > 0
      ? `${emailWithOffers} of ${emails.length} captured emails contain explicit offers`
      : null;

  const pathLine =
    pathIntentBreakdown.length > 0
      ? pathIntentBreakdown.map((p) => `${p.pathCount}× ${p.label.toLowerCase()}`).join(", ")
      : null;

  const categoryLine =
    categories.length > 0
      ? categories
          .slice(0, 4)
          .map((c) => `${c.label} (${c.sharePct}%)`)
          .join(", ")
      : null;

  const dealLine =
    deals.length > 0
      ? deals
          .slice(0, 3)
          .map((d) => d.label)
          .join(" · ")
      : null;

  const narrativeParts: string[] = [];
  const brand = brandDomain?.replace(/^https?:\/\//i, "").replace(/^www\./i, "") ?? "This competitor";
  narrativeParts.push(
    `${brand} is optimized for ${kindVerb(goalKind)} at the macro level.`,
  );
  if (categoryLine) {
    narrativeParts.push(`Conversion traffic clusters around ${categoryLine}.`);
  } else if (topDestinations[0]) {
    narrativeParts.push(
      `The dominant landing destination is ${topDestinations[0].displayUrl} (${topDestinations[0].sharePct}% of BOF LP ads).`,
    );
  }
  if (pathLine) {
    narrativeParts.push(`Channel paths split by role: ${pathLine} — not one identical journey.`);
  }
  if (dealLine) {
    narrativeParts.push(`Tracked promos include ${dealLine}.`);
  }
  if (emailOfferSummary) {
    narrativeParts.push(emailOfferSummary + ".");
  }
  if (angleHighlights.length > 0) {
    narrativeParts.push(`Dominant messaging angles: ${angleHighlights.slice(0, 3).join(", ")}.`);
  }

  return {
    narrative: narrativeParts.join(" "),
    deals,
    categories,
    topCreatives,
    landingPreviews,
    angleHighlights: angleHighlights.slice(0, 6),
    emailOfferSummary,
  };
}
