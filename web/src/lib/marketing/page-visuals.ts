import type { BulletVisualSpec } from "@/components/landing/bullet-visuals";
import type { AdspyPlatformSlug } from "@/lib/marketing/site-nav";

/**
 * Example data for the illustration on each bullet card of the feature and AdSpy pages, in
 * the same order as the page's bullets. Brands are made up; ad photos are the landing's own.
 */
export const FEATURE_VISUALS: Record<string, BulletVisualSpec[]> = {
  "ad-library": [
    { kind: "chips", items: ["Meta", "Google", "TikTok", "Active", "Video", "Carousel"], active: [0, 3, 4] },
    {
      kind: "lifespan",
      rows: [
        { label: "Summer sale video", start: 0.06, end: 0.92, note: "41 days", live: true },
        { label: "UGC review", start: 0.34, end: 0.98, note: "28 days", live: true },
        { label: "Spring promo", start: 0, end: 0.46, note: "Ended", live: false },
      ],
    },
    { kind: "source", logo: "meta", label: "Open in Meta Ad Library", image: "/landing/ads/gymshark-training.webp" },
  ],
  "strategy-map": [
    { kind: "grid" },
    {
      kind: "summary",
      title: "Strategy summary",
      lines: ["Northwind wins attention on TikTok.", "Meta does the retargeting.", "Google only catches brand searches."],
    },
    {
      kind: "bars",
      rows: [
        { label: "Meta", logo: "meta", value: 38, was: 62, note: "62% → 38%" },
        { label: "TikTok", logo: "tiktok", value: 46, was: 20, note: "20% → 46%" },
        { label: "Google", logo: "google", value: 16, was: 18, note: "18% → 16%" },
      ],
    },
  ],
  "stealable-angles": [
    {
      kind: "versus",
      left: "You",
      right: "Northwind",
      rows: [
        { label: "Free returns", left: false, right: true },
        { label: "Bundles", left: true, right: true },
        { label: "UGC reviews", left: false, right: true },
        { label: "Discount codes", left: true, right: false },
      ],
    },
    {
      kind: "bars",
      rows: [
        { label: "Free returns", value: 92, note: "12 ads" },
        { label: "UGC reviews", value: 74, note: "8 ads" },
        { label: "Bundles", value: 41, note: "5 ads" },
      ],
    },
    { kind: "save", toast: "Saved to Q3 brief", image: "/landing/ads/nike-sneaker.webp" },
  ],
  "copy-vault": [
    {
      kind: "sorted",
      head: "Longest running",
      rows: [
        { text: "“Free returns, forever.”", note: "94 days" },
        { text: "“12,000 people reordered.”", note: "61 days" },
        { text: "“Built for the last mile.”", note: "33 days" },
        { text: "“Summer drop is live.”", note: "6 days" },
      ],
    },
    { kind: "chips", items: ["Meta", "TikTok", "Google", "Top", "Middle", "Bottom"], active: [0, 4] },
    { kind: "save", toast: "12 hooks exported", logo: "tiktok", image: "/landing/ads/gymshark-essentials.webp" },
  ],
  timeline: [
    {
      kind: "lifespan",
      rows: [
        { label: "Hook A · video", start: 0.02, end: 0.7, note: "Mar 4 → May 20", live: false },
        { label: "Hook B · carousel", start: 0.28, end: 1, note: "Apr 2 → today", live: true },
        { label: "Hook C · image", start: 0.55, end: 1, note: "May 9 → today", live: true },
      ],
    },
    {
      kind: "lifespan",
      rows: [
        { label: "UGC unboxing", start: 0.1, end: 1, note: "Live", live: true },
        { label: "Static promo", start: 0, end: 0.38, note: "Killed", live: false },
        { label: "Founder story", start: 0.45, end: 1, note: "Live", live: true },
        { label: "Carousel sale", start: 0.2, end: 0.6, note: "Killed", live: false },
      ],
    },
    {
      kind: "columns",
      labels: ["M", "T", "W", "T", "F", "S", "S"],
      a: [3, 5, 2, 6, 4, 1, 2],
      b: [1, 0, 2, 1, 3, 0, 1],
      legend: ["Launched", "Killed"],
    },
  ],
  "activity-score": [
    { kind: "score", value: 82, tier: "Growth mode", note: "High confidence" },
    {
      kind: "bars",
      rows: [
        { label: "UGC video", value: 48 },
        { label: "Static image", value: 31 },
        { label: "Carousel", value: 21 },
      ],
    },
    {
      kind: "bars",
      rows: [
        { label: "Northwind", value: 82, note: "82" },
        { label: "Glow Labs", value: 64, note: "64" },
        { label: "Peak Gear", value: 37, note: "37" },
      ],
    },
  ],
  "audience-inference": [
    {
      kind: "tags",
      items: [
        { label: "Playful", size: 3 },
        { label: "Gen Z", size: 2 },
        { label: "Urgent", size: 1 },
        { label: "Premium", size: 2 },
        { label: "Eco-minded", size: 1 },
        { label: "Witty", size: 2 },
        { label: "Direct", size: 1 },
      ],
    },
    {
      kind: "bars",
      rows: [
        { label: "TikTok", logo: "tiktok", value: 52 },
        { label: "Meta", logo: "meta", value: 33 },
        { label: "Pinterest", logo: "pinterest", value: 15 },
      ],
    },
    {
      kind: "versus",
      left: "You",
      right: "Glow Labs",
      rows: [
        { label: "Age 18–24", left: false, right: true },
        { label: "Age 25–34", left: true, right: true },
        { label: "Eco-minded", left: true, right: false },
        { label: "Deal seekers", left: false, right: true },
      ],
    },
  ],
  "monday-digest": [
    {
      kind: "summary",
      title: "Monday digest",
      lines: ["Northwind launched 12 ads, 8 share one hook.", "Peak Gear ended its spring promo.", "Glow Labs moved budget to TikTok."],
    },
    { kind: "source", logo: "tiktok", label: "See the 12 ads", image: "/landing/ads/nike-sale.webp" },
    { kind: "calendar", title: "Every Monday morning", hits: [0, 7, 14, 21] },
  ],
  "platform-prioritization": [
    {
      kind: "classify",
      rows: [
        { logo: "meta", tag: "PRIMARY" },
        { logo: "tiktok", label: "TikTok", tag: "SECONDARY" },
        { logo: "google", tag: "MINIMAL" },
        { logo: "snapchat", tag: "INACTIVE" },
      ],
    },
    {
      kind: "classify",
      rows: [
        { logo: "meta", label: "Northwind", tag: "PRIMARY" },
        { logo: "tiktok", label: "Glow Labs", tag: "PRIMARY" },
        { logo: "google", label: "Peak Gear", tag: "PRIMARY" },
      ],
    },
    { kind: "alerts", items: ["Peak Gear started testing Pinterest", "3 new Snapchat ads from Northwind"] },
  ],
  "email-marketing": [
    { kind: "inbox", address: "northwind-7k2@inbox.rival", from: "Northwind", subject: "40% off ends tonight" },
    {
      kind: "summary",
      title: "Email summary",
      lines: ["Offer: 40% off, ends tonight", "Angle: urgency and free shipping", "Code: SUMMER40"],
    },
    { kind: "calendar", title: "About 3 emails a week", hits: [1, 3, 5, 8, 10, 12, 15, 17, 19, 22, 24, 26] },
  ],
};

export const ADSPY_VISUALS: Record<AdspyPlatformSlug, BulletVisualSpec[]> = {
  meta: [
    { kind: "search", query: "northwind.com", name: "Northwind", sub: "Facebook & Instagram ads found", logo: "meta" },
    {
      kind: "formats",
      items: [
        { label: "Image", shape: "image", image: "/landing/ads/nike-sneaker.webp" },
        { label: "Video", shape: "video", image: "/landing/ads/gymshark-training.webp" },
        { label: "Carousel", shape: "carousel", image: "/landing/ads/adidas-adilette.webp" },
      ],
    },
    { kind: "source", logo: "meta", label: "Open in Meta Ad Library", image: "/landing/ads/nike-sale.webp" },
    {
      kind: "bars",
      rows: [
        { label: "Meta", logo: "meta", value: 64, note: "64%" },
        { label: "TikTok", logo: "tiktok", value: 24, note: "24%" },
        { label: "Google", logo: "google", value: 12, note: "12%" },
      ],
    },
  ],
  google: [
    { kind: "search", query: "Northwind Ltd", name: "Northwind Ltd", sub: "Verified advertiser", logo: "google" },
    {
      kind: "formats",
      items: [
        { label: "Search", shape: "search" },
        { label: "Display", shape: "banner" },
        { label: "YouTube", shape: "video", image: "/landing/ads/adidas-outlet.webp" },
      ],
    },
    {
      kind: "lifespan",
      rows: [
        { label: "“Free returns” search ad", start: 0, end: 1, note: "96 days", live: true },
        { label: "Summer display set", start: 0.4, end: 1, note: "35 days", live: true },
        { label: "Spring YouTube spot", start: 0.1, end: 0.5, note: "Ended", live: false },
      ],
    },
    {
      kind: "bars",
      rows: [
        { label: "Non-brand terms", value: 65 },
        { label: "Brand terms", value: 35 },
      ],
    },
  ],
  tiktok: [
    {
      kind: "formats",
      items: [
        { label: "In-feed", shape: "story", image: "/landing/ads/gymshark-training.webp" },
        { label: "Spark ad", shape: "video", image: "/landing/ads/gymshark-essentials.webp" },
        { label: "Carousel", shape: "carousel", image: "/landing/ads/nike-sneaker.webp" },
      ],
    },
    {
      kind: "lifespan",
      rows: [
        { label: "Creator unboxing", start: 0.5, end: 1, note: "12 days", live: true },
        { label: "Trend remix", start: 0.7, end: 1, note: "5 days", live: true },
        { label: "Founder POV", start: 0.15, end: 0.55, note: "Ended", live: false },
      ],
    },
    { kind: "chips", items: ["TikTok", "Meta", "Google", "Active", "Spark ads"], active: [0, 3] },
    { kind: "save", toast: "Hook saved for the team", logo: "tiktok", image: "/landing/ads/gymshark-training.webp" },
  ],
  linkedin: [
    { kind: "search", query: "Peak Analytics", name: "Peak Analytics", sub: "Sponsored content and lead-gen ads", logo: "linkedin" },
    {
      kind: "tags",
      items: [
        { label: "Free demo", size: 3 },
        { label: "ROI calculator", size: 2 },
        { label: "Case study", size: 2 },
        { label: "G2 badge", size: 1 },
        { label: "Webinar", size: 1 },
        { label: "Free trial", size: 2 },
      ],
    },
    {
      kind: "bars",
      rows: [
        { label: "LinkedIn", logo: "linkedin", value: 58, note: "58%" },
        { label: "Google", logo: "google", value: 30, note: "30%" },
        { label: "Meta", logo: "meta", value: 12, note: "12%" },
      ],
    },
    {
      kind: "lifespan",
      rows: [
        { label: "ROI calculator ad", start: 0.05, end: 1, note: "Scaling", live: true },
        { label: "Webinar invite", start: 0.3, end: 0.7, note: "Killed", live: false },
        { label: "Case study carousel", start: 0.6, end: 1, note: "New", live: true },
      ],
    },
  ],
  pinterest: [
    { kind: "source", logo: "pinterest", label: "bloomandco.com/summer", image: "/landing/ads/adidas-adilette.webp" },
    { kind: "chips", items: ["Pinterest", "Meta", "TikTok", "Shopping", "Video"], active: [0, 3] },
    {
      kind: "columns",
      labels: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
      a: [2, 2, 5, 6, 3, 2, 2, 3, 4, 6, 9, 10],
      b: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      legend: ["Seasonal pushes", "Always-on catalog"],
    },
    {
      kind: "bars",
      rows: [
        { label: "Pinterest", logo: "pinterest", value: 41, note: "41%" },
        { label: "Meta", logo: "meta", value: 38, note: "38%" },
        { label: "Google", logo: "google", value: 21, note: "21%" },
      ],
    },
  ],
  snapchat: [
    {
      kind: "lifespan",
      rows: [
        { label: "Story ad · drop", start: 0.4, end: 1, note: "Live", live: true },
        { label: "AR lens test", start: 0.1, end: 0.45, note: "Ended", live: false },
        { label: "Collection ad", start: 0.65, end: 1, note: "Live", live: true },
      ],
    },
    {
      kind: "tags",
      items: [
        { label: "Creator-led", size: 3 },
        { label: "Gen Z humour", size: 2 },
        { label: "AR try-on", size: 2 },
        { label: "Fast cuts", size: 1 },
        { label: "Drops", size: 1 },
        { label: "Memes", size: 2 },
      ],
    },
    {
      kind: "bars",
      rows: [
        { label: "TikTok", logo: "tiktok", value: 71, note: "71%" },
        { label: "Snapchat", logo: "snapchat", value: 29, note: "29%" },
      ],
    },
    {
      kind: "checklist",
      title: "One Rival login",
      rows: [
        { logo: "snapchat", label: "Snapchat" },
        { logo: "tiktok", label: "TikTok" },
        { logo: "meta", label: "Meta" },
        { logo: "google", label: "Google" },
      ],
    },
  ],
};
