/**
 * Seeds `scraped_ads` (+ `scrape_batches`) with 150 realistic NordVPN rows for the Strategy Overview pipeline.
 *
 * Prerequisites:
 *   1. Apply migration `supabase/migrations/20260505140000_scraped_ads.sql` (local `supabase db push` or dashboard SQL).
 *   2. Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (service role bypasses RLS for bulk seed).
 *   3. `SEED_USER_ID` or `--user-id=<uuid>` must reference a real `auth.users.id` that will own the rows.
 *
 * Run from `rival-main/web`:
 *   npx tsx scripts/seed-strategy-overview.ts --user-id=<uuid>
 *   npm run seed:strategy-overview -- --user-id=<uuid>
 *
 * Flags:
 *   --clean   Remove existing scrape_batches + scraped_ads for this competitor before inserting.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

import type { Database, Json } from "../src/lib/supabase/types";

type Platform = "meta" | "google" | "tiktok" | "linkedin" | "snapchat";
type FunnelStage = "TOF" | "MOF" | "BOF";
type Angle =
  | "discount"
  | "social_proof"
  | "urgency"
  | "quality"
  | "price"
  | "speed"
  | "transformation"
  | "fear"
  | "curiosity"
  | "identity";

const BRAND_NAME = "NordVPN";
const BRAND_DOMAIN = "nordvpn.com";

const DISTRIBUTION: Record<Platform, number> = {
  meta: 60,
  google: 45,
  tiktok: 25,
  linkedin: 15,
  snapchat: 5,
};

const ANGLES: Angle[] = [
  "discount",
  "social_proof",
  "urgency",
  "quality",
  "price",
  "speed",
  "transformation",
  "fear",
  "curiosity",
  "identity",
];

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

function parseArgs(argv: string[]): { userId: string | null; clean: boolean } {
  let userId: string | null = process.env.SEED_USER_ID?.trim() || null;
  let clean = false;
  for (const a of argv) {
    if (a === "--clean") clean = true;
    else if (a.startsWith("--user-id=")) userId = a.slice("--user-id=".length).trim() || null;
  }
  return { userId, clean };
}

/** Matches sidebar slug derivation from domain (`normalizeCompetitorSlug`). */
function competitorSlugFromDomain(domain: string): string {
  const t = domain.trim().toLowerCase();
  return t.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || t;
}

function hashMix(seed: number): number {
  let x = seed | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return Math.abs(x);
}

function stageFor(platform: Platform, i: number): FunnelStage {
  const h = hashMix(i * 31 + platform.length * 97);
  if (platform === "tiktok" || platform === "snapchat") {
    const r = h % 10;
    return r < 7 ? "TOF" : r < 9 ? "MOF" : "BOF";
  }
  if (platform === "google") {
    const r = h % 10;
    return r < 5 ? "BOF" : r < 8 ? "MOF" : "TOF";
  }
  if (platform === "linkedin") {
    const r = h % 10;
    return r < 4 ? "TOF" : r < 8 ? "MOF" : "BOF";
  }
  /* meta */
  const r = h % 10;
  return r < 3 ? "TOF" : r < 7 ? "MOF" : "BOF";
}

function angleFor(globalIndex: number): Angle {
  return ANGLES[globalIndex % ANGLES.length];
}

function isActiveFor(globalIndex: number): boolean {
  return hashMix(globalIndex * 17 + 3) % 10 !== 0;
}

function isoRange(globalIndex: number): { first: string; last: string } {
  const now = Date.now();
  const spanMs = 180 * 24 * 60 * 60 * 1000;
  const firstOffset = hashMix(globalIndex * 104729 + 7919) % spanMs;
  const runMs = (5 + (hashMix(globalIndex + 999) % 50)) * 24 * 60 * 60 * 1000;
  const first = new Date(now - firstOffset);
  const last = new Date(Math.min(now, first.getTime() + runMs));
  return { first: first.toISOString(), last: last.toISOString() };
}

function formatsFor(platform: Platform, i: number): string {
  const pools: Record<Platform, string[]> = {
    meta: ["Video (Vertical)", "Carousel", "Single Image", "Collection", "Reels"],
    google: ["Search", "Performance Max", "Display", "Discovery", "YouTube In-Stream"],
    tiktok: ["In-Feed Video", "Spark Ads", "TopView", "Collection"],
    linkedin: ["Sponsored Content", "Message Ad", "Document Ad", "Carousel"],
    snapchat: ["Story Ad", "Collection Ad", "Commercial"],
  };
  const pool = pools[platform];
  return pool[hashMix(i + platform.charCodeAt(0)) % pool.length];
}

function copyParts(platform: Platform, i: number, stage: FunnelStage): { headline: string; body: string; cta: string } {
  const headlines: Record<Platform, string[]> = {
    meta: [
      "Stay private on every network.",
      "Your Wi‑Fi isn’t as safe as you think.",
      "Encrypt traffic in one tap.",
      "Streaming blocked abroad? Not anymore.",
      "Block trackers before they follow you.",
      "Passwords exposed on public Wi‑Fi — fix it.",
      "Browse without leaving footprints.",
      "Work remotely without risking client data.",
      "Malware-heavy sites? Route through NordVPN.",
      "Split tunneling for apps that need local access.",
    ],
    google: [
      "NordVPN — secure browsing from €3/month.",
      "VPN for PC, Mac & mobile — try risk‑free.",
      "Compare NordVPN plans — limited‑time offer.",
      "Stop ISP tracking — NordVPN encrypted tunnel.",
      "Unblock content securely with NordVPN.",
      "Business VPN — teams pricing available.",
      "Download NordVPN — 30‑day money‑back guarantee.",
      "NordVPN Threat Protection — fewer risky downloads.",
      "Dedicated IP add‑on for remote access.",
      "Meshnet — connect devices privately.",
    ],
    tiktok: [
      "POV: airport Wi‑Fi tries to steal your session 👀",
      "This VPN saved my remote job abroad",
      "Stop doom‑scrolling your data to trackers",
      "3 signs you need a VPN today",
      "Gamers: lower ping myths vs real privacy wins",
      "Study abroad hack nobody talks about",
      "Creator kit: film overseas without geo‑locks",
      "Coffee shop laptop guy era — secured",
      "VPN ≠ slower phone (when it’s built right)",
      "Travel creators: edit & upload without leaks",
    ],
    linkedin: [
      "Reduce breach risk for distributed teams.",
      "Secure contractor access without legacy VPN pain.",
      "Compliance‑friendly encryption for hybrid work.",
      "Protect client data on unmanaged networks.",
      "Replace DIY proxies with audited infrastructure.",
      "SOC 2 minded teams choose NordLayer.",
      "Zero‑trust lane for sensitive research workflows.",
      "Remote sales teams on hotel Wi‑Fi — close safely.",
      "Engineering VPN that scales with headcount.",
      "Finance analysts: isolate research traffic.",
    ],
    snapchat: [
      "Swipe up — safer snaps & stories abroad.",
      "Spring break Wi‑Fi survival kit.",
      "Night‑out apps, morning‑after privacy.",
      "Limited drop: student pricing inside.",
      "Festival season — protect your logins.",
    ],
  };
  const bodies: Record<Platform, string[]> = {
    meta: [
      "NordVPN routes your connection through encrypted servers so ISPs and hotspots see gibberish — not sites, not passwords.",
      "Thousands of servers, kill switch, and Threat Protection Lite on supported platforms help close common leak vectors tourists and commuters hit daily.",
      "Whether you’re splitting tunnels for banking apps or going full‑tunnel for sketchy hotel networks, setup stays under two minutes.",
    ],
    google: [
      "Choose a plan with Threat Protection where available, Meshnet for device‑to‑device links, and Dark Web Monitor alerts for leaked credentials.",
      "Independent audits and a published no‑logs policy back the promise — not just marketing language.",
      "Switch regions responsibly; speeds vary by server load and your baseline ISP.",
    ],
    tiktok: [
      "Skits are exaggerated — credential stuffing isn’t. Encrypt first, flex later.",
      "If you live out of Airbnbs and coworking spaces, treat VPN like sunscreen: invisible until you need it.",
      "No brand voice nonsense: fewer handshake leaks, more peace of mind before you board.",
    ],
    linkedin: [
      "Roll out NordLayer seats with SSO, enforce device posture checks, and segment contractor VLANs without shipping hardware VPN concentrators.",
      "Finance and legal teams get predictable egress IPs for vendor portals while product keeps split tunneling for internal tooling.",
      "Audit trails and admin APIs reduce helpdesk tickets versus legacy OpenVPN configs taped together during COVID.",
    ],
    snapchat: [
      "Short‑form attention, same long‑tail risk: captive portals love harvesting OAuth cookies.",
      "Tap through for regional pricing — students verify through partner flows where eligible.",
    ],
  };
  const ctas: Record<FunnelStage, string[]> = {
    TOF: ["Learn more", "See how it works", "Watch the breakdown", "Try NordVPN today"],
    MOF: ["Start trial", "Compare plans", "See features", "Get protected"],
    BOF: ["Get NordVPN", "Claim offer", "Buy now", "Download app"],
  };

  const hl = headlines[platform][i % headlines[platform].length];
  const body = bodies[platform][hashMix(i + stage.charCodeAt(0)) % bodies[platform].length];
  const ctaPool = ctas[stage];
  const cta = ctaPool[hashMix(i * 13) % ctaPool.length];
  return { headline: hl, body, cta };
}

function buildAdRow(params: {
  userId: string;
  competitorId: string;
  batchId: string;
  platform: Platform;
  platformIndex: number;
  globalIndex: number;
}): Database["public"]["Tables"]["scraped_ads"]["Insert"] {
  const { userId, competitorId, batchId, platform, platformIndex, globalIndex } = params;
  const stage = stageFor(platform, platformIndex);
  const angle = angleFor(globalIndex);
  const { headline, body, cta } = copyParts(platform, platformIndex, stage);
  const { first, last } = isoRange(globalIndex);
  const format = formatsFor(platform, platformIndex);
  const adText = `${headline}\n\n${body}\n\n${cta}`;
  const creativeSeed = hashMix(globalIndex + 90210);
  const adCreativeUrl = `https://picsum.photos/seed/nordvpn-${creativeSeed}/640/360`;

  const rawPayload = {
    headline,
    body,
    cta,
    brand: BRAND_NAME,
    domain: BRAND_DOMAIN,
    seed_index: globalIndex,
    platform_variant: platformIndex,
  } satisfies Record<string, unknown>;

  return {
    user_id: userId,
    competitor_id: competitorId,
    platform,
    ad_text: adText,
    ad_creative_url: adCreativeUrl,
    format,
    first_seen_at: first,
    last_seen_at: last,
    is_active: isActiveFor(globalIndex),
    scrape_batch_id: batchId,
    raw_payload: rawPayload as Json,
    ai_extracted_angle: angle,
    funnel_stage: stage,
  };
}

async function main(): Promise<void> {
  loadEnvLocal();
  const { userId, clean } = parseArgs(process.argv.slice(2));

  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    console.error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (add to .env.local or export in shell)."
    );
    process.exit(1);
  }
  if (!userId) {
    console.error("Provide SEED_USER_ID env or --user-id=<uuid> for an existing auth user.");
    process.exit(1);
  }

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const slug = competitorSlugFromDomain(BRAND_DOMAIN);

  const { data: competitor, error: compErr } = await supabase
    .from("saved_competitors")
    .upsert(
      {
        user_id: userId,
        slug,
        name: BRAND_NAME,
        logo_url: `https://www.google.com/s2/favicons?domain=${BRAND_DOMAIN}&sz=128`,
        brand_name: BRAND_NAME,
        brand_domain: BRAND_DOMAIN,
        brand_logo_url: `https://www.google.com/s2/favicons?domain=${BRAND_DOMAIN}&sz=128`,
        pending: false,
        updated_at: new Date().toISOString(),
        last_scraped_at: new Date().toISOString(),
      },
      { onConflict: "user_id,slug" }
    )
    .select("id")
    .single();

  if (compErr || !competitor?.id) {
    console.error("saved_competitors upsert failed:", compErr?.message ?? "no row returned");
    process.exit(1);
  }

  const competitorId = competitor.id;

  if (clean) {
    await supabase.from("scraped_ads").delete().eq("competitor_id", competitorId);
    await supabase.from("scrape_batches").delete().eq("competitor_id", competitorId);
    console.log("Cleaned existing scraped_ads + scrape_batches for competitor", competitorId);
  }

  const { data: batchRow, error: batchErr } = await supabase
    .from("scrape_batches")
    .insert({
      user_id: userId,
      competitor_id: competitorId,
      label: `strategy-overview-seed:${BRAND_DOMAIN}`,
    })
    .select("id")
    .single();

  if (batchErr || !batchRow?.id) {
    console.error(
      "scrape_batches insert failed — did you apply migration 20260505140000_scraped_ads.sql?",
      batchErr?.message
    );
    process.exit(1);
  }

  const batchId = batchRow.id;

  const rows: Database["public"]["Tables"]["scraped_ads"]["Insert"][] = [];
  let globalIndex = 0;

  (Object.keys(DISTRIBUTION) as Platform[]).forEach((platform) => {
    const n = DISTRIBUTION[platform];
    for (let i = 0; i < n; i++) {
      rows.push(
        buildAdRow({
          userId,
          competitorId,
          batchId,
          platform,
          platformIndex: i,
          globalIndex,
        })
      );
      globalIndex++;
    }
  });

  const chunkSize = 75;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const slice = rows.slice(offset, offset + chunkSize);
    const { error: insErr } = await supabase.from("scraped_ads").insert(slice);
    if (insErr) {
      console.error(`scraped_ads insert failed at offset ${offset}:`, insErr.message);
      process.exit(1);
    }
  }

  console.log(
    `Seeded ${rows.length} scraped_ads for ${BRAND_NAME} (${BRAND_DOMAIN}), competitor_id=${competitorId}, batch_id=${batchId}, user_id=${userId}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
