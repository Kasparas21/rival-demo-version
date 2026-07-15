/**
 * Freeze scraped ad creatives for the sales demo (ad library, creative tests, timeline).
 *
 * Usage:
 *   npx tsx scripts/freeze-demo-ad-creatives.ts --user-email=attributo@yahoo.com --slug=adidas.com --max-library=10
 *   npx tsx scripts/freeze-demo-ad-creatives.ts --user-email=attributo@yahoo.com --slug=nike.com --max-library=10
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { ADIDAS_DEMO_CREATIVE_TEST_ALLOWLIST, creativeTestAllowKey } from "../src/lib/demo/adidas-creative-test-allowlist";
import { ADIDAS_DEMO_TIMELINE_AD_IDS } from "../src/lib/demo/adidas-timeline-ad-allowlist";
import { resolveCreativeTestPreviewUrl } from "../src/lib/creative-tests/resolve-creative-test-preview";
import { createSupabaseAdminClient } from "../src/lib/supabase/admin";

const WEB_ROOT = process.cwd();
const FROZEN_PUBLIC = path.join(WEB_ROOT, "public", "demo", "frozen");
const FROZEN_LIB = path.join(WEB_ROOT, "src", "lib", "demo", "frozen");

const LIBRARY_PLATFORMS = ["meta", "google", "linkedin", "pinterest", "snapchat"] as const;
const ADIDAS_LIBRARY_PLATFORMS = ["meta", "google", "pinterest", "snapchat"] as const;
const NIKE_LIBRARY_PLATFORMS = ["meta", "google", "pinterest"] as const;

async function resolveUserId(admin: ReturnType<typeof createSupabaseAdminClient>, email: string) {
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 500 });
  const match = users?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!match) throw new Error(`No user found for email: ${email}`);
  return match.id;
}

type ScrapedAdRow = {
  id: string;
  platform: string;
  ad_creative_url: string | null;
  archived_creative_url: string | null;
  ad_text: string;
  ai_extracted_angle: string | null;
  first_seen_at: string;
  last_seen_at: string;
  format: string;
  raw_payload: unknown;
  is_active: boolean;
};

type CreativeTestRow = {
  id: string;
  launch_date: string;
  platform: string;
  ad_ids: string[] | null;
  winner_ad_id: string | null;
  test_status: string;
  median_lifespan_days: number | null;
  max_lifespan_days: number | null;
  winner_lifespan_days: number | null;
  ad_count: number;
};

type FrozenScrapedAd = {
  id: string;
  platform: string;
  format: string;
  ad_text: string;
  ai_extracted_angle: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
  frozen_creative_url: string;
};

function slugToModuleBase(slug: string): string {
  return slug.replace(/\./g, "-");
}

function extFromContentType(ct: string | null, url: string): string {
  const lower = (ct ?? "").toLowerCase();
  if (lower.includes("webp")) return ".webp";
  if (lower.includes("png")) return ".png";
  if (lower.includes("jpeg") || lower.includes("jpg")) return ".jpg";
  if (url.includes(".webp")) return ".webp";
  if (url.includes(".png")) return ".png";
  if (url.includes(".jpg") || url.includes(".jpeg")) return ".jpg";
  return ".jpg";
}

function resolveDownloadUrl(ad: ScrapedAdRow): string | null {
  const archived = ad.archived_creative_url?.trim();
  if (archived) return archived;
  const preview = resolveCreativeTestPreviewUrl(ad);
  if (!preview) return null;
  if (/content\.js/i.test(preview)) return null;
  return preview;
}

function truncateAdText(raw: string, platform: string): string {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const deduped: string[] = [];
  for (const line of lines) {
    if (deduped.some((d) => d === line || d.startsWith(line.slice(0, 40)))) continue;
    deduped.push(line);
  }
  let text = deduped.join("\n").trim() || raw.trim();
  const cap = platform === "linkedin" ? 220 : 280;
  if (text.length > cap) {
    const slice = text.slice(0, cap - 1).trimEnd();
    text = `${slice}…`;
  }
  return text;
}

async function downloadCreative(remoteUrl: string, destBase: string): Promise<string | null> {
  try {
    const res = await fetch(remoteUrl, { redirect: "follow" });
    if (!res.ok) {
      console.warn(`  skip (${res.status}): ${remoteUrl.slice(0, 80)}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = extFromContentType(res.headers.get("content-type"), remoteUrl);
    const finalPath = `${destBase}${ext}`;
    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    await fs.writeFile(finalPath, buf);
    return `/demo/frozen/${path.relative(FROZEN_PUBLIC, finalPath).split(path.sep).join("/")}`;
  } catch (e) {
    console.warn(`  download failed: ${remoteUrl.slice(0, 80)}`, e);
    return null;
  }
}

function tsLiteral(value: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((v) => `${pad}  ${tsLiteral(v, indent + 1)}`).join(",\n")}\n${pad}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return `{\n${entries
      .map(([k, v]) => `${pad}  ${JSON.stringify(k)}: ${tsLiteral(v, indent + 1)}`)
      .join(",\n")}\n${pad}}`;
  }
  return JSON.stringify(value);
}

async function pickLibraryExtras(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  competitorId: string,
  exclude: Set<string>,
  perPlatform: number,
  platforms: readonly string[] = LIBRARY_PLATFORMS,
): Promise<string[]> {
  const picked: string[] = [];
  for (const platform of platforms) {
    const { data } = await admin
      .from("scraped_ads")
      .select(
        "id, platform, ad_creative_url, archived_creative_url, ad_text, ai_extracted_angle, first_seen_at, last_seen_at, format, raw_payload, is_active",
      )
      .eq("competitor_id", competitorId)
      .eq("platform", platform)
      .eq("is_active", true)
      .order("last_seen_at", { ascending: false })
      .limit(50);
    const candidates = ((data ?? []) as ScrapedAdRow[])
      .filter((row) => !exclude.has(row.id) && resolveDownloadUrl(row))
      .sort((a, b) => {
        if (platform === "linkedin") return a.ad_text.length - b.ad_text.length;
        return 0;
      });
    let count = 0;
    for (const row of candidates) {
      picked.push(row.id);
      exclude.add(row.id);
      count += 1;
      if (count >= perPlatform) break;
    }
  }
  return picked;
}

function pickLibraryDisplayIds(
  frozenById: Record<string, FrozenScrapedAd>,
  maxLibrary: number,
  priorityIds: string[],
): string[] {
  const result: string[] = [];
  const used = new Set<string>();
  for (const id of priorityIds) {
    if (result.length >= maxLibrary) break;
    if (frozenById[id] && !used.has(id)) {
      result.push(id);
      used.add(id);
    }
  }
  const byPlatform = new Map<string, string[]>();
  for (const ad of Object.values(frozenById)) {
    if (used.has(ad.id)) continue;
    const list = byPlatform.get(ad.platform) ?? [];
    list.push(ad.id);
    byPlatform.set(ad.platform, list);
  }
  for (const platform of LIBRARY_PLATFORMS) {
    for (const id of byPlatform.get(platform) ?? []) {
      if (result.length >= maxLibrary) return result;
      if (!used.has(id)) {
        result.push(id);
        used.add(id);
      }
    }
  }
  for (const ad of Object.values(frozenById)) {
    if (result.length >= maxLibrary) break;
    if (!used.has(ad.id)) {
      result.push(ad.id);
      used.add(ad.id);
    }
  }
  return result;
}

async function main() {
  const userEmail =
    process.argv.find((a) => a.startsWith("--user-email="))?.slice("--user-email=".length).trim() ??
    "attributo@yahoo.com";
  const slug =
    process.argv.find((a) => a.startsWith("--slug="))?.slice("--slug=".length).trim() ?? "adidas.com";
  const maxLibraryArg = process.argv.find((a) => a.startsWith("--max-library="))?.slice("--max-library=".length);
  const maxLibrary = maxLibraryArg ? Math.max(1, Number.parseInt(maxLibraryArg, 10) || 10) : 10;
  const isAdidas = slug === "adidas.com";

  const admin = createSupabaseAdminClient();
  const userId = await resolveUserId(admin, userEmail);

  const { data: competitor, error: compErr } = await admin
    .from("saved_competitors")
    .select("id, name, slug")
    .eq("slug", slug)
    .eq("user_id", userId)
    .maybeSingle();
  if (compErr) throw compErr;
  if (!competitor) throw new Error(`No competitor for slug=${slug}`);

  const idSet = new Set<string>();
  let creativeTests: CreativeTestRow[] = [];

  if (isAdidas) {
    for (const id of ADIDAS_DEMO_TIMELINE_AD_IDS) idSet.add(id);
    const { data: testsRaw } = await admin
      .from("creative_tests")
      .select("*")
      .eq("competitor_id", competitor.id);
    creativeTests = (testsRaw ?? []).filter((t) =>
      ADIDAS_DEMO_CREATIVE_TEST_ALLOWLIST.includes(
        creativeTestAllowKey(t.launch_date, t.platform) as (typeof ADIDAS_DEMO_CREATIVE_TEST_ALLOWLIST)[number],
      ),
    ) as CreativeTestRow[];
    for (const test of creativeTests) {
      for (const id of test.ad_ids ?? []) idSet.add(id);
    }
  }

  const perPlatform = 3;
  const libraryPlatforms = isAdidas ? ADIDAS_LIBRARY_PLATFORMS : slug.includes("nike") ? NIKE_LIBRARY_PLATFORMS : LIBRARY_PLATFORMS;
  const libraryExtras = await pickLibraryExtras(admin, competitor.id, idSet, perPlatform, libraryPlatforms);
  for (const id of libraryExtras) idSet.add(id);

  const ids = [...idSet];
  console.log(`Freezing ${ids.length} ads for ${slug} (library cap ${maxLibrary})`);

  const { data: adsRaw, error: adsErr } = await admin
    .from("scraped_ads")
    .select(
      "id, platform, ad_creative_url, archived_creative_url, ad_text, ai_extracted_angle, first_seen_at, last_seen_at, format, raw_payload, is_active",
    )
    .in("id", ids);
  if (adsErr) throw adsErr;

  const adsById = new Map<string, ScrapedAdRow>();
  for (const ad of (adsRaw ?? []) as ScrapedAdRow[]) {
    adsById.set(ad.id, ad);
  }

  const frozenById: Record<string, FrozenScrapedAd> = {};

  for (const id of ids) {
    const ad = adsById.get(id);
    if (!ad) {
      console.warn(`  missing ad ${id}`);
      continue;
    }
    const remote = resolveDownloadUrl(ad);
    if (!remote) {
      console.warn(`  no downloadable creative for ${id.slice(0, 8)} (${ad.platform})`);
      continue;
    }
    const localPath = await downloadCreative(remote, path.join(FROZEN_PUBLIC, slug, "ads", id));
    if (!localPath) continue;

    frozenById[id] = {
      id: ad.id,
      platform: ad.platform,
      format: ad.format,
      ad_text: truncateAdText(ad.ad_text, ad.platform),
      ai_extracted_angle: ad.ai_extracted_angle,
      first_seen_at: ad.first_seen_at,
      last_seen_at: ad.last_seen_at,
      is_active: ad.is_active,
      frozen_creative_url: localPath,
    };
  }

  const frozenTimelineIds = isAdidas
    ? ADIDAS_DEMO_TIMELINE_AD_IDS.filter((id) => frozenById[id])
    : libraryExtras.slice(0, Math.min(5, libraryExtras.length)).filter((id) => frozenById[id]);

  const frozenLibraryIds = pickLibraryDisplayIds(
    frozenById,
    maxLibrary,
    isAdidas ? [...libraryExtras] : libraryExtras,
  );

  const frozenCreativeTests = creativeTests
    .map((test) => {
      const ads = (test.ad_ids ?? [])
        .map((adId) => {
          const frozen = frozenById[adId];
          if (!frozen) return null;
          return {
            id: frozen.id,
            platform: frozen.platform,
            format: frozen.format,
            ad_text: frozen.ad_text,
            ai_extracted_angle: frozen.ai_extracted_angle,
            first_seen_at: frozen.first_seen_at,
            last_seen_at: frozen.last_seen_at,
            ad_creative_url: frozen.frozen_creative_url,
            archived_creative_url: frozen.frozen_creative_url,
          };
        })
        .filter((ad): ad is NonNullable<typeof ad> => ad != null);
      if (ads.length < 2) return null;
      return {
        id: test.id,
        launch_date: test.launch_date,
        platform: test.platform,
        ad_ids: ads.map((a) => a.id),
        winner_ad_id: test.winner_ad_id,
        test_status: test.test_status,
        median_lifespan_days: test.median_lifespan_days ?? 0,
        max_lifespan_days: test.max_lifespan_days ?? 0,
        winner_lifespan_days: test.winner_lifespan_days,
        ad_count: ads.length,
        ads,
      };
    })
    .filter(Boolean);

  const frozenTimelineAds = frozenTimelineIds.map((id) => {
    const ad = frozenById[id]!;
    return {
      id: ad.id,
      platform: ad.platform,
      ad_creative_url: ad.frozen_creative_url,
      archived_creative_url: ad.frozen_creative_url,
      ad_text: ad.ad_text,
      ai_extracted_angle: ad.ai_extracted_angle,
      first_seen_at: ad.first_seen_at,
      last_seen_at: ad.last_seen_at,
      format: ad.format,
      is_winner: false,
      is_killed: false,
    };
  });

  const moduleBase = slugToModuleBase(slug);
  const outPath = path.join(FROZEN_LIB, `frozen-${moduleBase}-ads.ts`);
  const exportPrefix = moduleBase.replace(/-/g, "_").toUpperCase();

  const content = `/* eslint-disable */
/** AUTO-GENERATED by scripts/freeze-demo-ad-creatives.ts — do not edit by hand. */

import type { DemoCreativeTest } from "@/lib/demo/dashboard-demo-data";
import type { TimelineAd } from "@/components/competitor/tests-timeline/timeline-types";

export type FrozenScrapedAd = {
  id: string;
  platform: string;
  format: string;
  ad_text: string;
  ai_extracted_angle: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
  frozen_creative_url: string;
};

export const FROZEN_ADS_SOURCE_SLUG = ${JSON.stringify(slug)};
export const FROZEN_ADS_BRAND_NAME = ${JSON.stringify(competitor.name)};

export const FROZEN_AD_BY_ID: Record<string, FrozenScrapedAd> = ${tsLiteral(frozenById)} as Record<string, FrozenScrapedAd>;

export const FROZEN_LIBRARY_AD_IDS: string[] = ${tsLiteral(frozenLibraryIds)};

export const FROZEN_TIMELINE_AD_IDS: string[] = ${tsLiteral(frozenTimelineIds)};

export const FROZEN_TIMELINE_ADS: TimelineAd[] = ${tsLiteral(frozenTimelineAds)} as TimelineAd[];

export const FROZEN_CREATIVE_TESTS: DemoCreativeTest[] = ${tsLiteral(frozenCreativeTests)} as DemoCreativeTest[];

export function getFrozenCreativeUrl(adId: string): string | null {
  return FROZEN_AD_BY_ID[adId]?.frozen_creative_url ?? null;
}
`;
  await fs.mkdir(FROZEN_LIB, { recursive: true });
  await fs.writeFile(outPath, content, "utf8");
  console.log(`Wrote ${outPath}`);
  console.log(`  frozen ads: ${Object.keys(frozenById).length}`);
  console.log(`  timeline: ${frozenTimelineIds.length}`);
  console.log(`  creative tests: ${frozenCreativeTests.length}`);
  console.log(`  library ids: ${frozenLibraryIds.length}`);

  const manifestPath = path.join(FROZEN_PUBLIC, "manifest.json");
  let manifest: Record<string, unknown> = {};
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as Record<string, unknown>;
  } catch {
    /* fresh */
  }
  const adsKey = slug === "adidas.com" ? "ads" : slug === "nike.com" ? "nikeAds" : `ads_${slug}`;
  manifest[adsKey] = {
    slug,
    competitorId: competitor.id,
    frozenAt: new Date().toISOString(),
    adCount: Object.keys(frozenById).length,
    libraryCount: frozenLibraryIds.length,
    checksum: createHash("sha256").update(JSON.stringify(frozenById)).digest("hex").slice(0, 16),
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
