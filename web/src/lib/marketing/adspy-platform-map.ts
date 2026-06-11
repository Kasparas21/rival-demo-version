import type { DemoPlatform } from "@/lib/landing/hero-variant-b-demo-data";
import type { AdspyPlatformSlug } from "@/lib/marketing/site-nav";

export const ADSPY_SLUG_TO_DEMO_PLATFORM: Record<AdspyPlatformSlug, DemoPlatform> = {
  meta: "meta",
  google: "google",
  tiktok: "tiktok",
  linkedin: "linkedin",
  pinterest: "pinterest",
  snapchat: "snapchat",
};
