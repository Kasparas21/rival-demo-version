import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { syncLandingPagesFromAds } from "./sync-landing-pages-from-ads";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export async function autoDetectAdLandingPagesFromAds(
  admin: AdminClient,
  competitorId: string,
  userId: string,
  competitorWebsite: string,
  ads: Array<{ platform?: string; raw_payload: unknown }>,
): Promise<void> {
  const rows = ads
    .filter((ad) => ad.raw_payload != null)
    .map((ad) => ({
      platform: typeof ad.platform === "string" ? ad.platform : "meta",
      raw_payload: ad.raw_payload as import("@/lib/supabase/types").Json,
    }));

  await syncLandingPagesFromAds(admin, competitorId, userId, competitorWebsite, rows);
}
