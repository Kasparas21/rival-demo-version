import { userAllowsScheduledAdsScrape } from "@/lib/billing/scrape-eligibility";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_CANDIDATES = 500;
const IN_CHUNK = 100;

function cleanDomain(d: string): string {
  return d.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || d;
}

export type StaleStrategyMap = { userId: string; competitorId: string; domain: string; lastScrapedAt: string };

/**
 * Strategy maps older than their competitor's latest scrape, oldest first. The weekly scrape used to start
 * these rebuilds from `after()` once its own 285s loop had finished, without waiting for them: 39 of 49 maps
 * were behind their scrape (median 40 days) and 30 rebuild locks had died mid-classification.
 */
export async function loadStaleStrategyMaps(admin: ReturnType<typeof createSupabaseAdminClient>): Promise<StaleStrategyMap[]> {
  const { data: competitors } = await admin
    .from("saved_competitors")
    .select("id, user_id, brand_domain, slug, last_scraped_at")
    .not("last_scraped_at", "is", null)
    .order("last_scraped_at", { ascending: true })
    .limit(MAX_CANDIDATES);
  if (!competitors?.length) return [];

  const computedAt = new Map<string, number>();
  for (let i = 0; i < competitors.length; i += IN_CHUNK) {
    const { data: maps } = await admin
      .from("competitor_strategy_overview")
      .select("competitor_id, computed_at")
      .in(
        "competitor_id",
        competitors.slice(i, i + IN_CHUNK).map((c) => c.id),
      );
    for (const m of maps ?? []) computedAt.set(m.competitor_id, Date.parse(m.computed_at ?? ""));
  }

  const stale = competitors.filter((c) => {
    const scraped = Date.parse(c.last_scraped_at ?? "");
    const built = computedAt.get(c.id);
    return Number.isFinite(scraped) && (built == null || !Number.isFinite(built) || built < scraped);
  });

  const allowed = new Map<string, boolean>();
  const out: StaleStrategyMap[] = [];
  for (const c of stale) {
    if (!allowed.has(c.user_id)) allowed.set(c.user_id, await userAllowsScheduledAdsScrape(admin, c.user_id));
    if (!allowed.get(c.user_id)) continue;
    const domain = cleanDomain(c.brand_domain || c.slug || "").toLowerCase();
    if (!domain) continue;
    out.push({ userId: c.user_id, competitorId: c.id, domain, lastScrapedAt: c.last_scraped_at! });
  }
  return out;
}
