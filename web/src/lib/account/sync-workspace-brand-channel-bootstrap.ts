import type { SupabaseClient } from "@supabase/supabase-js";

import { createDefaultLandingPages } from "@/lib/landing-page-tracker/create-defaults";
import { parseOrganicSocials, hasAnyOrganicSocial } from "@/lib/organic-content/socials";
import { ORGANIC_PLATFORMS, type OrganicSocials } from "@/lib/organic-content/types";
import type { WorkspaceAdsScrapeHints } from "@/lib/onboarding/workspace-ads-setup";
import type { Database } from "@/lib/supabase/types";

/** Map workspace ads scrape hints into organic social handles (prefill only). */
export function organicSocialsFromAdsScrape(scrape: WorkspaceAdsScrapeHints): OrganicSocials {
  const out: OrganicSocials = {};
  const put = (key: keyof OrganicSocials, value: string | undefined) => {
    const v = value?.trim();
    if (v) out[key] = v;
  };
  put("facebook", scrape.facebookUrl);
  put("instagram", scrape.instagramUrl);
  put("youtube", scrape.youTubeUrl);
  put("tiktok", scrape.tikTokUrl);
  put("linkedin", scrape.linkedInUrl);
  return out;
}

function mergeOrganicSocialsPrefill(existing: OrganicSocials, prefill: OrganicSocials): OrganicSocials {
  const merged: OrganicSocials = { ...existing };
  for (const [platform, handle] of Object.entries(prefill) as [keyof OrganicSocials, string][]) {
    if (!merged[platform]?.trim() && handle?.trim()) {
      merged[platform] = handle.trim();
    }
  }
  return merged;
}

/** Prefill `saved_competitors.socials` from workspace ads setup when empty. */
export async function syncWorkspaceBrandOrganicSocials(
  admin: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
  scrape: WorkspaceAdsScrapeHints,
): Promise<void> {
  const prefill = organicSocialsFromAdsScrape(scrape);
  if (!hasAnyOrganicSocial(prefill)) return;

  const { data: row } = await admin
    .from("saved_competitors")
    .select("socials")
    .eq("id", competitorId)
    .eq("user_id", userId)
    .maybeSingle();

  const existing = parseOrganicSocials(row?.socials);
  const merged = mergeOrganicSocialsPrefill(existing, prefill);
  if (!hasAnyOrganicSocial(merged)) return;

  const changed = ORGANIC_PLATFORMS.some((p) => (existing[p] ?? "") !== (merged[p] ?? ""));
  if (!changed) return;

  const now = new Date().toISOString();
  await admin
    .from("saved_competitors")
    .update({
      socials: merged,
      updated_at: now,
      ...(row?.socials == null || !hasAnyOrganicSocial(existing)
        ? { organic_next_scrape_at: now }
        : {}),
    })
    .eq("id", competitorId)
    .eq("user_id", userId);
}

/** Seed homepage tracked page for workspace brand when domain is known. */
export async function seedWorkspaceBrandHomepage(
  admin: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
  website: string,
): Promise<void> {
  const site = website.trim();
  if (!site) return;
  await createDefaultLandingPages(admin, competitorId, userId, site);
}

export async function bootstrapWorkspaceBrandChannels(params: {
  admin: SupabaseClient<Database>;
  userId: string;
  competitorId: string;
  scrape: WorkspaceAdsScrapeHints;
  website: string;
}): Promise<void> {
  const { admin, userId, competitorId, scrape, website } = params;
  await syncWorkspaceBrandOrganicSocials(admin, userId, competitorId, scrape);
  await seedWorkspaceBrandHomepage(admin, userId, competitorId, scrape.websiteUrl || website);
}
