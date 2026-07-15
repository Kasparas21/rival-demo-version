/**
 * Audit which scraped_ads have reliable vs expired previews (demo filter logic).
 *
 * Usage:
 *   npx tsx scripts/audit-creative-test-previews.ts adidas.com
 *   npx tsx scripts/audit-creative-test-previews.ts adidas.com --user-email=you@example.com
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { creativeTestAdHasExpiredPreview } from "../src/lib/creative-tests/filter-creative-tests-previews";
import { resolveCreativeTestPreviewUrl } from "../src/lib/creative-tests/resolve-creative-test-preview";
import { libraryPreviewUrlFromScrapedRow } from "../src/lib/saved-ads/library-preview-url";
import { createSupabaseAdminClient } from "../src/lib/supabase/admin";

type AdRow = {
  id: string;
  platform: string;
  ad_creative_url: string | null;
  archived_creative_url: string | null;
  last_seen_at: string;
  raw_payload: unknown;
};

function previewKind(ad: AdRow): "archived" | "payload" | "live_cdn_only" | "none" {
  if (ad.archived_creative_url?.trim()) return "archived";
  const fromPayload = libraryPreviewUrlFromScrapedRow({
    platform: ad.platform,
    ad_creative_url: null,
    raw_payload: ad.raw_payload ?? null,
  });
  if (fromPayload?.trim()) return "payload";
  if (ad.ad_creative_url?.trim()) return "live_cdn_only";
  return "none";
}

async function main() {
  const slug = process.argv[2]?.trim() || "adidas.com";
  const emailArg = process.argv.find((a) => a.startsWith("--user-email="));
  const userEmail = emailArg?.slice("--user-email=".length).trim();

  const admin = createSupabaseAdminClient();

  let userId: string | null = null;
  if (userEmail) {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
    const match = users?.users?.find((u) => u.email?.toLowerCase() === userEmail.toLowerCase());
    if (!match) {
      console.error(`No user found for email: ${userEmail}`);
      process.exit(1);
    }
    userId = match.id;
  }

  let competitorQuery = admin
    .from("saved_competitors")
    .select("id, user_id, name, slug, brand_domain")
    .eq("slug", slug);

  if (userId) competitorQuery = competitorQuery.eq("user_id", userId);

  const { data: competitors } = await competitorQuery;
  if (!competitors?.length) {
    console.error(`No competitor found for slug: ${slug}`);
    process.exit(1);
  }

  for (const competitor of competitors) {
    const { data: ads } = await admin
      .from("scraped_ads")
      .select("id, platform, ad_creative_url, archived_creative_url, last_seen_at, raw_payload")
      .eq("competitor_id", competitor.id)
      .eq("is_active", true)
      .limit(2000);

    const rows = (ads ?? []) as AdRow[];
    const byPlatform = new Map<string, { ok: number; expired: number; kinds: Record<string, number> }>();

    for (const ad of rows) {
      const p = ad.platform.trim().toLowerCase();
      if (!byPlatform.has(p)) {
        byPlatform.set(p, { ok: 0, expired: 0, kinds: {} });
      }
      const bucket = byPlatform.get(p)!;
      const kind = previewKind(ad);
      bucket.kinds[kind] = (bucket.kinds[kind] ?? 0) + 1;
      const expired = creativeTestAdHasExpiredPreview({
        id: ad.id,
        platform: ad.platform,
        ad_creative_url: ad.ad_creative_url,
        archived_creative_url: ad.archived_creative_url,
        last_seen_at: ad.last_seen_at,
        raw_payload: ad.raw_payload,
      });
      if (expired) bucket.expired += 1;
      else bucket.ok += 1;
    }

    console.log(`\n=== ${competitor.name} (${competitor.slug}) ===`);
    console.log(`competitor_id: ${competitor.id}`);
    console.log(`active scraped_ads: ${rows.length}\n`);

    console.log("Platform breakdown (demo filter: archived + payload = OK, live_cdn_only + none = hidden):");
    for (const [platform, stats] of [...byPlatform.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(
        `  ${platform.padEnd(10)} OK: ${String(stats.ok).padStart(4)}  expired/hidden: ${String(stats.expired).padStart(4)}  ` +
          `(archived=${stats.kinds.archived ?? 0}, payload=${stats.kinds.payload ?? 0}, live_cdn_only=${stats.kinds.live_cdn_only ?? 0}, none=${stats.kinds.none ?? 0})`,
      );
    }

    const { data: tests } = await admin
      .from("creative_tests")
      .select("id, launch_date, platform, ad_count, test_status")
      .eq("competitor_id", competitor.id)
      .order("launch_date", { ascending: false })
      .limit(30);

    if (tests?.length) {
      console.log(`\nRecent creative tests (${tests.length} shown):`);
      for (const test of tests) {
        const { data: testAds } = await admin
          .from("scraped_ads")
          .select("id, platform, ad_creative_url, archived_creative_url, last_seen_at, raw_payload")
          .eq("competitor_id", competitor.id)
          .in("id", test.ad_ids ?? []);

        const hydrated = (testAds ?? []) as AdRow[];
        const expiredCount = hydrated.filter((ad) =>
          creativeTestAdHasExpiredPreview({
            id: ad.id,
            platform: ad.platform,
            ad_creative_url: ad.ad_creative_url,
            archived_creative_url: ad.archived_creative_url,
            last_seen_at: ad.last_seen_at,
            raw_payload: ad.raw_payload,
          }),
        ).length;
        const visibleInDemo = hydrated.length >= 2 && expiredCount === 0;
        console.log(
          `  ${test.launch_date} ${test.platform.padEnd(8)} ${test.test_status.padEnd(20)} ` +
            `ads=${test.ad_count} expired_ads=${expiredCount} demo_visible=${visibleInDemo ? "YES" : "NO"}`,
        );
      }
    }

    const sampleExpired = rows
      .filter((ad) =>
        creativeTestAdHasExpiredPreview({
          id: ad.id,
          platform: ad.platform,
          ad_creative_url: ad.ad_creative_url,
          archived_creative_url: ad.archived_creative_url,
          last_seen_at: ad.last_seen_at,
          raw_payload: ad.raw_payload,
        }),
      )
      .slice(0, 3);
    const sampleOk = rows
      .filter(
        (ad) =>
          !creativeTestAdHasExpiredPreview({
            id: ad.id,
            platform: ad.platform,
            ad_creative_url: ad.ad_creative_url,
            archived_creative_url: ad.archived_creative_url,
            last_seen_at: ad.last_seen_at,
            raw_payload: ad.raw_payload,
          }),
      )
      .slice(0, 3);

    if (sampleOk.length) {
      console.log("\nSample OK previews:");
      for (const ad of sampleOk) {
        console.log(
          `  [${ad.platform}] ${ad.id.slice(0, 8)}… kind=${previewKind(ad)} url=${resolveCreativeTestPreviewUrl(ad)?.slice(0, 72) ?? "—"}`,
        );
      }
    }
    if (sampleExpired.length) {
      console.log("\nSample expired/hidden previews:");
      for (const ad of sampleExpired) {
        console.log(
          `  [${ad.platform}] ${ad.id.slice(0, 8)}… kind=${previewKind(ad)} live=${ad.ad_creative_url?.slice(0, 60) ?? "null"}`,
        );
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
