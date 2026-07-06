import type { SupabaseClient } from "@supabase/supabase-js";

import { ensureWorkspaceBrandSavedCompetitor } from "@/lib/account/ensure-workspace-brand-competitor";
import { bootstrapWorkspaceBrandChannels } from "@/lib/account/sync-workspace-brand-channel-bootstrap";
import type { AdsProfileSetup } from "@/lib/onboarding/workspace-ads-setup";
import { scrapeHintsToPlatformIds } from "@/lib/onboarding/workspace-ads-setup";
import { isMissingDbColumnError } from "@/lib/supabase/postgrest-schema-error";
import type { Database, Json } from "@/lib/supabase/types";

/** Mirror `brands.ads_profile_setup` into workspace `saved_competitors.ads_library_context` for scrapes. */
export async function syncWorkspaceBrandLibraryContextFromSetup(
  supabase: SupabaseClient<Database>,
  userId: string,
  domainHint: string,
  setup: AdsProfileSetup,
  brandNameHint?: string | null,
  brandId?: string | null,
): Promise<string | null> {
  const ensured = await ensureWorkspaceBrandSavedCompetitor(
    supabase,
    userId,
    domainHint,
    brandNameHint,
    { brandId },
  );
  if (!ensured?.id) return null;

  const ids = scrapeHintsToPlatformIds({
    scrape: setup.scrape,
    workspaceDomain: domainHint,
    channels: setup.channels,
  });

  const adsLibraryContext = {
    channels: setup.channels,
    ids,
    confirmed: true,
  };

  const { error } = await supabase
    .from("saved_competitors")
    .update({
      ads_library_context: adsLibraryContext as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ensured.id)
    .eq("user_id", userId);

  if (error && !isMissingDbColumnError(error.message, "ads_library_context")) {
    throw error;
  }

  try {
    await bootstrapWorkspaceBrandChannels({
      admin: supabase,
      userId,
      competitorId: ensured.id,
      scrape: setup.scrape,
      website: domainHint,
    });
  } catch (bootstrapErr) {
    console.error("[syncWorkspaceBrandLibraryContext] channel bootstrap", bootstrapErr);
  }

  return ensured.id;
}
