import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveAdsCacheDomainForUser } from "@/lib/ad-library/competitor-cache-domain";
import type { Database } from "@/lib/supabase/types";
import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";

function brandLabelFromDomain(domainHint: string): string {
  const host = normalizeCompetitorSlug(domainHint.trim()).toLowerCase();
  const first = host.split(".")[0] ?? host;
  if (!first) return domainHint.trim() || "Competitor";
  return first.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Dashboard competitors usually sync here via the client, but direct loads / race conditions can
 * leave no `saved_competitors` row. Strategy routes require it for FK + RLS — upsert a minimal record.
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