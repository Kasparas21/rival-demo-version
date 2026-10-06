import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveAdsCacheDomainForUser } from "@/lib/ad-library/competitor-cache-domain";
import { countWatchedCompetitorSlotsForUser } from "@/lib/billing/brand-competitor-slots";
import { getBillingEntitlement } from "@/lib/billing/entitlements";
import type { Database } from "@/lib/supabase/types";
import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";

function brandLabelFromDomain(domainHint: string): string {
  const host = normalizeCompetitorSlug(domainHint.trim()).toLowerCase();
  const first = host.split(".")[0] ?? host;
  if (!first) return domainHint.trim() || "Competitor";
  return first.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Creates a minimal `saved_competitors` row when a scrape runs for a domain the user hasn't saved yet
 * (the search flow scrapes before the client saves). Only write paths may call this — GET routes reply
 * "not found" instead — and it never creates past the plan's competitor limit.
 */
export async function ensureSavedCompetitorForStrategyOverview(
  supabase: SupabaseClient<Database>,
  userId: string,
  domainHint: string
): Promise<void> {
  const cleaned = normalizeCompetitorSlug(domainHint.trim()).toLowerCase();
  if (!cleaned) return;

  const { competitorId } = await resolveAdsCacheDomainForUser(supabase, userId, domainHint);
  if (competitorId) return;

  const billing = await getBillingEntitlement(supabase, userId);
  if (!billing.isUnlimited) {
    const { count } = await countWatchedCompetitorSlotsForUser(supabase, userId);
    if (count >= billing.limits.maxWatchedCompetitors) {
      console.warn("[ensure-saved-competitor] competitor limit reached, not creating", userId, cleaned);
      return;
    }
  }

  const slug = cleaned;
  const name = brandLabelFromDomain(domainHint);

  const { error } = await supabase.from("saved_competitors").upsert(
    {
      user_id: userId,
      slug,
      name,
      brand_name: name,
      brand_domain: cleaned,
      pending: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,slug" }
  );
  if (error) {
    console.error("[ensure-saved-competitor]", error.message);
  }
}