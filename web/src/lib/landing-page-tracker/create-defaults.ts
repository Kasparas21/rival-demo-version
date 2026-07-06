import { normalizeLandingPageUrl } from "@/lib/landing-pages/normalize-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

import type { LandingPageType } from "./constants";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

function rootFromWebsite(website: string): string | null {
  const trimmed = website.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    return `${parsed.protocol}//${parsed.hostname.replace(/^www\./i, "").toLowerCase()}`;
  } catch {
    return null;
  }
}

export async function createDefaultLandingPages(
  admin: AdminClient,
  competitorId: string,
  userId: string,
  competitorWebsite: string,
): Promise<void> {
  const root = rootFromWebsite(competitorWebsite);
  if (!root) return;

  const now = new Date().toISOString();
  const defaults: Array<{ url: string; label: string; page_type: LandingPageType }> = [
    { url: root, label: "Homepage", page_type: "homepage" },
  ];

  for (const page of defaults) {
    const normalized = normalizeLandingPageUrl(page.url);
    if (!normalized) continue;
    const row: Database["public"]["Tables"]["landing_pages"]["Insert"] = {
      competitor_id: competitorId,
      user_id: userId,
      url: normalized,
      label: page.label,
      page_type: page.page_type,
      next_screenshot_at: now,
    };
    await admin.from("landing_pages").upsert(row, { onConflict: "competitor_id,url" });
  }
}

export async function ensureDefaultLandingPagesForCompetitor(
  admin: AdminClient,
  competitorId: string,
  userId: string,
): Promise<void> {
  const { count } = await admin
    .from("landing_pages")
    .select("id", { count: "exact", head: true })
    .eq("competitor_id", competitorId)
    .eq("user_id", userId);

  if ((count ?? 0) > 0) return;

  const { data: competitor } = await admin
    .from("saved_competitors")
    .select("brand_domain, slug")
    .eq("id", competitorId)
    .eq("user_id", userId)
    .maybeSingle();

  const website = competitor?.brand_domain?.trim() || competitor?.slug?.trim();
  if (!website) return;

  await createDefaultLandingPages(admin, competitorId, userId, website);
}
