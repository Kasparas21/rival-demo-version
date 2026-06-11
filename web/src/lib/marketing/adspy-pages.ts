import type { PlatformName } from "@/components/feature-previews/platform-utils";
import type { AdspyPlatformSlug } from "@/lib/marketing/site-nav";

export type AdspyPageDefinition = {
  slug: AdspyPlatformSlug;
  platform: PlatformName;
  name: string;
  headline: string;
  summary: string;
  why: string;
  bullets: string[];
  metaTitle: string;
  metaDescription: string;
};

export const ADSPY_PAGE_DEFINITIONS: AdspyPageDefinition[] = [
  {
    slug: "meta",
    platform: "Meta",
    name: "Meta AdSpy",
    headline: "Meta AdSpy, every Facebook & Instagram ad in one place",
    summary:
      "Track competitor Meta ads across Facebook and Instagram, creative, copy, launch dates, and lifespan, without opening Ads Library in six tabs.",
    why: "Meta is where most DTC and SaaS brands test angles first. Rival pulls every live ad into your dashboard automatically.",
    bullets: [
      "Search by competitor domain, no Page ID hunting",
      "See image, video, and carousel formats side by side",
      "Jump to the official Meta Ad Library source on any creative",
      "Compare Meta volume vs Google, TikTok, and more in one view",
    ],
    metaTitle: "Meta AdSpy, Free Facebook & Instagram Competitor Ads",
    metaDescription:
      "Spy on competitor Meta ads with Rival, track Facebook and Instagram creatives, hooks, and launch dates in one adspy dashboard.",
  },
  {
    slug: "google",
    platform: "Google",
    name: "Google AdSpy",
    headline: "Google AdSpy, Search, Display & YouTube competitor ads",
    summary:
      "Monitor competitor Google ads from Transparency Center, search text, display banners, and YouTube creatives, alongside every other platform.",
    why: "Google shows intent-heavy copy your competitors bet on. Rival surfaces it next to social creative so you see the full funnel.",
    bullets: [
      "Pull ads from Google Ads Transparency Center by advertiser",
      "See Search, Display, and YouTube formats in one library",
      "Track how long each Google creative has been running",
      "Spot brand vs non-brand messaging patterns instantly",
    ],
    metaTitle: "Google AdSpy, Competitor Search, Display & YouTube Ads",
    metaDescription:
      "Track competitor Google ads with Rival, Search, Display, and YouTube creatives from Transparency Center in one free adspy tool.",
  },
  {
    slug: "tiktok",
    platform: "TikTok",
    name: "TikTok AdSpy",
    headline: "TikTok AdSpy, competitor video ads & hooks",
    summary:
      "See every TikTok ad your competitors run, hooks, formats, and run length, without scrolling the TikTok Creative Center for hours.",
    why: "TikTok creative turns over fast. Rival captures what's live now and what they killed last week.",
    bullets: [
      "Video and spark-ad formats in a searchable grid",
      "Launch dates and lifespan on every TikTok creative",
      "Filter TikTok-only or compare against Meta and Google",
      "Save winning hooks to brief your creative team",
    ],
    metaTitle: "TikTok AdSpy, Track Competitor TikTok Video Ads",
    metaDescription:
      "Spy on competitor TikTok ads with Rival, video hooks, formats, and run length in one dashboard. Free 7-day trial.",
  },
  {
    slug: "linkedin",
    platform: "LinkedIn",
    name: "LinkedIn AdSpy",
    headline: "LinkedIn AdSpy, B2B competitor ad intelligence",
    summary:
      "Track competitor LinkedIn ads, sponsored content, message ads, and lead-gen creative, in the same dashboard as your social and search ads.",
    why: "B2B teams hide LinkedIn tests in a separate tool. Rival includes LinkedIn in every competitor scrape by default.",
    bullets: [
      "Company and keyword-based LinkedIn Ad Library coverage",
      "See B2B angles, offers, and social proof patterns",
      "Compare LinkedIn volume vs Meta and Google for the same rival",
      "Timeline view shows when they scale or kill LinkedIn tests",
    ],
    metaTitle: "LinkedIn AdSpy, Track Competitor B2B Ads",
    metaDescription:
      "Monitor competitor LinkedIn ads with Rival, sponsored content, lead-gen creative, and B2B angles in one adspy dashboard.",
  },
  {
    slug: "pinterest",
    platform: "Pinterest",
    name: "Pinterest AdSpy",
    headline: "Pinterest AdSpy, competitor pin ads & seasonal creative",
    summary:
      "See every Pinterest ad your competitors promote, product pins, seasonal campaigns, and lifestyle creative, without a separate Pinterest login.",
    why: "Pinterest peaks around seasons and drops. Rival shows what's live before you plan your next catalog push.",
    bullets: [
      "Pin ads with headlines and destination URLs",
      "Filter Pinterest-only within your competitor library",
      "Spot seasonal pushes vs always-on catalog ads",
      "Cross-reference Pinterest tests with Meta and Google spend proxies",
    ],
    metaTitle: "Pinterest AdSpy, Competitor Pin & Shopping Ads",
    metaDescription:
      "Track competitor Pinterest ads with Rival, pin creative, seasonal campaigns, and shopping angles in one free adspy tool.",
  },
  {
    slug: "snapchat",
    platform: "Snapchat",
    name: "Snapchat AdSpy",
    headline: "Snapchat AdSpy, competitor Snap ads & AR creative",
    summary:
      "Monitor competitor Snapchat ads, video, story, and collection formats, alongside Meta, TikTok, and the rest of your rival stack.",
    why: "Snapchat tests often stay invisible to teams focused on Meta. Rival includes Snap in every multi-platform scrape.",
    bullets: [
      "Snap ad formats with run status and lifespan",
      "See younger-audience creative angles competitors test",
      "Compare Snap volume vs TikTok for the same brand",
      "One login, no extra Snapchat-only subscription",
    ],
    metaTitle: "Snapchat AdSpy, Track Competitor Snap Ads",
    metaDescription:
      "Spy on competitor Snapchat ads with Rival, video, story, and collection creative in one multi-platform adspy dashboard.",
  },
];

const ADSPY_BY_SLUG = Object.fromEntries(ADSPY_PAGE_DEFINITIONS.map((p) => [p.slug, p])) as Record<
  AdspyPlatformSlug,
  AdspyPageDefinition
>;

export function getAdspyPage(slug: string): AdspyPageDefinition | undefined {
  return ADSPY_BY_SLUG[slug as AdspyPlatformSlug];
}
