/**
 * Load scraped_ads for a competitor, build BrandFootprint + v2 spend estimate, log intermediates.
 *
 * From `web/`:
 *   npx tsx scripts/debug-spend-footprint.ts
 *
 * Env (or flags): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
 * `DEBUG_COMPETITOR_ID` / `--competitor=<uuid>`, `DEBUG_USER_ID` / `--user=<uuid>`.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

import { deriveBrandScale, normalizePlatform } from "../src/lib/strategy-overview/brand-scale-score";
import type { ScrapedAdInput } from "../src/lib/strategy-overview/strategyDerivation";
import {
  buildBrandFootprintFromAds,
  estimateBrandMonthlySpendDebug,
  loadEstimatorConfigFromEnv,
} from "../src/lib/spend-estimator";

type SavedRow = {
  id: string;
  name: string;
  brand_domain: string | null;
  brand_name: string | null;
  last_scraped_at: string | null;
};

type ScrapedRow = {
  id: string;
  platform: string;
  ad_text: string;
  format: string;
  first_seen_at: string;
  last_seen_at: string;
  ai_extracted_angle: string | null;
  funnel_stage: string | null;
  ai_enrichment_status: string | null;
  is_active: boolean;
  raw_payload: unknown;
};

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function argValue(flag: string, short?: string): string | undefined {
  const args = process.argv.slice(2);
  for (const a of args) {
    if (a.startsWith(`${flag}=`)) return a.slice(flag.length + 1).trim();
    if (short && a === short) {
      const idx = args.indexOf(a);
      return args[idx + 1];
    }
  }
  return undefined;
}

loadEnvLocal();

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const competitorId =
  argValue("--competitor", "-c") ?? process.env.DEBUG_COMPETITOR_ID?.trim() ?? "";
const userId = argValue("--user", "-u") ?? process.env.DEBUG_USER_ID?.trim() ?? "";

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!competitorId || !userId) {
  console.error("Set DEBUG_COMPETITOR_ID + DEBUG_USER_ID or pass --competitor= --user=");
  process.exit(1);
}

async function main(): Promise<void> {
  const supUrl = url!;
  const supKey = key!;
  const supabase = createClient(supUrl, supKey);

  const { data: saved, error: savedErr } = await supabase
    .from("saved_competitors")
    .select("id,name,brand_domain,brand_name,last_scraped_at")
    .eq("id", competitorId)
    .eq("user_id", userId)
    .maybeSingle();

  if (savedErr) {
    console.error("saved_competitors:", savedErr.message);
    process.exit(1);
  }
  if (!saved) {
    console.error("No saved_competitors row for this competitor_id + user_id");
    process.exit(1);
  }

  const savedRow = saved as SavedRow;

  const { data: rows, error: adsErr } = await supabase
    .from("scraped_ads")
    .select("*")
    .eq("competitor_id", competitorId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (adsErr) {
    console.error("scraped_ads:", adsErr.message);
    process.exit(1);
  }

  const scraped = (rows ?? []) as ScrapedRow[];
  const inputs: ScrapedAdInput[] = scraped.map((r) => ({
    id: r.id,
    platform: r.platform,
    ad_text: r.ad_text,
    format: r.format,
    first_seen_at: r.first_seen_at,
    last_seen_at: r.last_seen_at,
    ai_extracted_angle: r.ai_extracted_angle,
    funnel_stage: r.funnel_stage,
    ai_enrichment_status: r.ai_enrichment_status ?? null,
    is_active: r.is_active,
    raw_payload: r.raw_payload,
  }));

  const byPlatform = new Map<string, ScrapedAdInput[]>();
  for (const a of inputs) {
    const pl = normalizePlatform(a.platform);
    if (!byPlatform.has(pl)) byPlatform.set(pl, []);
    byPlatform.get(pl)!.push(a);
  }

  const brandScaleScore = deriveBrandScale(inputs, byPlatform as never);
  const footprintRows = scraped.map((r) => ({
    id: r.id,
    platform: r.platform,
    first_seen_at: r.first_seen_at,
    last_seen_at: r.last_seen_at,
    is_active: r.is_active,
    raw_payload: r.raw_payload,
  }));

  const fp = buildBrandFootprintFromAds(
    footprintRows,
    {
      competitorId,
      userId,
      brandName: savedRow.brand_name ?? savedRow.name,
      brandDomain: savedRow.brand_domain,
      lastScrapedAt: savedRow.last_scraped_at,
    },
    brandScaleScore
  );

  const baseConfig = loadEstimatorConfigFromEnv();
  if (!fp) {
    console.log(JSON.stringify({ competitorId, brandScaleScore, footprint: null, rowCount: scraped.length }, null, 2));
    return;
  }

  const { estimate, platformDebug } = estimateBrandMonthlySpendDebug(fp, baseConfig);
  const metaNode = estimate.perPlatform.find((p) => p.platform === "meta");
  const metaDbg = platformDebug.find((p) => p.platform === "meta");

  console.log(
    JSON.stringify(
      {
        competitorId,
        brand: savedRow.name,
        brandScaleScore,
        rowCount: scraped.length,
        platform_stats: fp.platform_stats,
        assumptions: estimate.assumptions,
        meta: metaNode,
        metaDebug: metaDbg,
        total: estimate.total,
        platformDebug,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
