/**
 * One-time export: freeze Neptunas website + Adidas emails into static demo assets.
 *
 * Usage:
 *   npx tsx scripts/freeze-demo-assets.ts \
 *     --user-email=attributo@yahoo.com \
 *     --website-slug=neptunas.lt \
 *     --email-slug=adidas.com
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { createSupabaseAdminClient } from "../src/lib/supabase/admin";

const WEB_ROOT = process.cwd();
const FROZEN_PUBLIC = path.join(WEB_ROOT, "public", "demo", "frozen");
const FROZEN_LIB = path.join(WEB_ROOT, "src", "lib", "demo", "frozen");

const MAX_SNAPSHOTS_PER_PAGE = 6;
const MAX_EMAILS = 20;

type CliArgs = {
  userEmail: string;
  websiteSlug: string;
  emailSlug: string;
};

function parseArgs(): CliArgs {
  const userEmail =
    process.argv.find((a) => a.startsWith("--user-email="))?.slice("--user-email=".length).trim() ??
    "attributo@yahoo.com";
  const websiteSlug =
    process.argv.find((a) => a.startsWith("--website-slug="))?.slice("--website-slug=".length).trim() ??
    "neptunas.lt";
  const emailSlug =
    process.argv.find((a) => a.startsWith("--email-slug="))?.slice("--email-slug=".length).trim() ??
    "adidas.com";
  return { userEmail, websiteSlug, emailSlug };
}

async function resolveUserId(admin: ReturnType<typeof createSupabaseAdminClient>, email: string) {
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 500 });
  const match = users?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!match) throw new Error(`No user found for email: ${email}`);
  return match.id;
}

async function resolveCompetitor(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  slug: string,
  userId: string,
) {
  const { data, error } = await admin
    .from("saved_competitors")
    .select("id, user_id, name, slug, brand_domain")
    .eq("slug", slug)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`No competitor found for slug=${slug} user=${userId}`);
  return data;
}

function extFromContentType(ct: string | null, url: string): string {
  const lower = (ct ?? "").toLowerCase();
  if (lower.includes("webp")) return ".webp";
  if (lower.includes("png")) return ".png";
  if (lower.includes("jpeg") || lower.includes("jpg")) return ".jpg";
  if (url.includes(".webp")) return ".webp";
  if (url.includes(".png")) return ".png";
  if (url.includes(".jpg") || url.includes(".jpeg")) return ".jpg";
  return ".webp";
}

async function downloadAsset(remoteUrl: string, destPath: string): Promise<string> {
  if (!remoteUrl?.trim()) return "";
  try {
    const res = await fetch(remoteUrl, { redirect: "follow" });
    if (!res.ok) {
      console.warn(`  skip download (${res.status}): ${remoteUrl.slice(0, 80)}`);
      return remoteUrl;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = extFromContentType(res.headers.get("content-type"), remoteUrl);
    const finalPath = destPath.endsWith(ext) ? destPath : `${destPath}${ext}`;
    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    await fs.writeFile(finalPath, buf);
    return `/demo/frozen/${path.relative(FROZEN_PUBLIC, finalPath).split(path.sep).join("/")}`;
  } catch (e) {
    console.warn(`  download failed: ${remoteUrl.slice(0, 80)}`, e);
    return remoteUrl;
  }
}

function demoPageId(dbId: string): string {
  return `fp-${dbId.replace(/-/g, "").slice(0, 12)}`;
}

function displayUrl(raw: string): string {
  return raw.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function isAdTrackingPage(url: string): boolean {
  const u = url.toLowerCase();
  return u.includes("ad.doubleclick.net") || u.includes("trackclk");
}

function isRivalPage(label: string, url: string): boolean {
  const l = label.toLowerCase();
  const u = url.toLowerCase();
  return l.includes("rival") || u.includes("spyrival");
}

function readablePageLabel(label: string, url: string): string {
  if (isRivalPage(label, url)) return "Rival";
  if (isAdTrackingPage(url)) return "From ads";
  if (label.length > 80) return displayUrl(url).split("/")[0] ?? "Landing page";
  return label;
}

function fmtRelative(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function pageStatus(page: { label: string; url: string }, snapshots: { has_meaningful_change: boolean }[]): string {
  if (snapshots.some((s) => s.has_meaningful_change)) return "Changed";
  if (isRivalPage(page.label, page.url)) return "Possible A/B";
  return "No change";
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

async function exportWebsite(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  slug: string,
  userId: string,
) {
  const competitor = await resolveCompetitor(admin, slug, userId);
  const { data: pages, error: pagesErr } = await admin
    .from("landing_pages")
    .select("*")
    .eq("competitor_id", competitor.id)
    .eq("user_id", userId)
    .order("added_at", { ascending: true });
  if (pagesErr) throw pagesErr;

  const pageRows = (pages ?? []).filter((page) => !isAdTrackingPage(page.url));
  if (!pageRows.length) throw new Error(`No landing pages for ${slug}`);

  const trackedPages: unknown[] = [];
  const pageDetails: Record<string, unknown> = {};
  const changeRows: unknown[] = [];

  for (const page of pageRows) {
    const pid = demoPageId(page.id);
    const { data: snapshots, error: snapErr } = await admin
      .from("landing_page_snapshots")
      .select("*")
      .eq("landing_page_id", page.id)
      .order("taken_at", { ascending: false })
      .limit(MAX_SNAPSHOTS_PER_PAGE);
    if (snapErr) throw snapErr;

    const snapRows = snapshots ?? [];
    const frozenSnaps = [];

    for (const snap of snapRows) {
      const base = path.join(FROZEN_PUBLIC, slug, "pages", pid, snap.id);
      const screenshot_url = await downloadAsset(snap.screenshot_url, `${base}-full`);
      const hero_screenshot_url = snap.hero_screenshot_url
        ? await downloadAsset(snap.hero_screenshot_url, `${base}-hero`)
        : null;

      frozenSnaps.push({
        id: snap.id,
        screenshot_url,
        hero_screenshot_url,
        page_text: snap.page_text ?? {},
        pixel_diff_pct: snap.pixel_diff_pct,
        has_meaningful_change: Boolean(snap.has_meaningful_change),
        change_analysis: snap.change_analysis ?? {},
        taken_at: snap.taken_at,
        status: snap.status,
      });
    }

    const label = readablePageLabel(page.label, page.url);
    const urlDisplay = isRivalPage(page.label, page.url)
      ? displayUrl(page.url.includes("spyrival") ? page.url : "spyrival.com")
      : isAdTrackingPage(page.url)
        ? displayUrl(page.url).slice(0, 48)
        : displayUrl(page.url);

    const latest = frozenSnaps[0];
    trackedPages.push({
      id: pid,
      label,
      url: urlDisplay,
      status: pageStatus({ label, url: page.url }, snapRows),
      lastChecked: latest ? fmtRelative(latest.taken_at as string) : "—",
      thumbnailUrl: latest?.hero_screenshot_url ?? latest?.screenshot_url ?? null,
    });

    const changeCount = frozenSnaps.filter((s) => s.has_meaningful_change).length;
    pageDetails[pid] = {
      page: {
        id: pid,
        url: page.url.startsWith("http") ? page.url : `https://${page.url}`,
        label,
        page_type: page.page_type,
        is_active: page.is_active,
        auto_detected_from: page.auto_detected_from,
        last_screenshotted_at: page.last_screenshotted_at,
        next_screenshot_at: page.next_screenshot_at,
        animation_calibration_status: page.animation_calibration_status,
        animation_calibrated_at: page.animation_calibrated_at,
        latestSnapshot: frozenSnaps[0] ?? null,
      },
      stats: {
        totalSnapshots: frozenSnaps.length,
        changeCount,
        firstSnapshotAt: frozenSnaps[frozenSnaps.length - 1]?.taken_at ?? null,
        lastSnapshotAt: frozenSnaps[0]?.taken_at ?? null,
      },
      snapshots: frozenSnaps,
    };

    const changeIdx = frozenSnaps.findIndex((s) => s.has_meaningful_change);
    if (changeIdx >= 0 && frozenSnaps[changeIdx + 1]) {
      const current = frozenSnaps[changeIdx]!;
      const prev = frozenSnaps[changeIdx + 1]!;
      changeRows.push({
        ...current,
        landing_pages: {
          id: pid,
          label,
          url: urlDisplay,
          page_type: page.page_type,
        },
        prev_screenshot_url: prev.screenshot_url,
        prev_hero_screenshot_url: prev.hero_screenshot_url ?? prev.screenshot_url,
        prev_page_text: prev.page_text,
        prev_taken_at: prev.taken_at,
      });
    }
  }

  // Prefer Rival page change first
  changeRows.sort((a, b) => {
    const aRival = (a as { landing_pages?: { label?: string } }).landing_pages?.label === "Rival" ? 0 : 1;
    const bRival = (b as { landing_pages?: { label?: string } }).landing_pages?.label === "Rival" ? 0 : 1;
    return aRival - bRival;
  });

  return {
    competitor,
    trackedPages,
    pageDetails,
    changeRows,
  };
}

async function exportEmails(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  slug: string,
  userId: string,
) {
  const competitor = await resolveCompetitor(admin, slug, userId);
  const { data: emails, error } = await admin
    .from("competitor_emails")
    .select("*")
    .eq("competitor_id", competitor.id)
    .eq("user_id", userId)
    .not("html_body", "is", null)
    .order("received_at", { ascending: false })
    .limit(MAX_EMAILS);
  if (error) throw error;

  const rows = emails ?? [];
  if (!rows.length) throw new Error(`No emails with html_body for ${slug}`);

  const inboxRows: unknown[] = [];
  const insightRows: unknown[] = [];
  const detailRows: Record<string, unknown> = {};
  const htmlBodies: Record<string, string> = {};

  for (const row of rows) {
    const html = row.html_body ?? "";
    const htmlDir = path.join(FROZEN_PUBLIC, slug, "emails");
    const htmlFile = path.join(htmlDir, `${row.id}.html`);
    await fs.mkdir(htmlDir, { recursive: true });
    await fs.writeFile(htmlFile, html, "utf8");
    htmlBodies[row.id] = html;

    const receivedAt = fmtRelative(row.received_at);
    inboxRows.push({
      id: row.id,
      subject: row.subject ?? "(No subject)",
      fromName: row.from_name ?? "Adidas",
      fromEmail: row.from_email ?? "",
      type: row.email_type ?? "other",
      preview: row.preview_text ?? "",
      receivedAt,
      unread: false,
    });

    insightRows.push({
      id: row.id,
      received_at: row.received_at,
      subject: row.subject,
      email_type: row.email_type,
      ai_offers: row.ai_offers ?? [],
      ai_angle: row.ai_angle,
      esp_detected: row.esp_detected,
    });

    detailRows[row.id] = {
      id: row.id,
      tracker_id: row.tracker_id,
      user_id: "demo-frozen-user",
      competitor_id: "demo-frozen-adidas",
      from_email: row.from_email,
      from_name: row.from_name,
      subject: row.subject,
      preview_text: row.preview_text,
      plain_text: row.plain_text,
      received_at: row.received_at,
      esp_detected: row.esp_detected,
      email_type: row.email_type,
      ai_summary: row.ai_summary,
      ai_offers: row.ai_offers ?? [],
      ai_cta: row.ai_cta,
      ai_angle: row.ai_angle,
      ai_processed_at: row.ai_processed_at,
      ai_analysis_error: row.ai_analysis_error,
      ai_analysis_attempts: row.ai_analysis_attempts ?? 0,
      ai_deep_analysis: row.ai_deep_analysis,
      ai_analysis_version: row.ai_analysis_version,
      created_at: row.created_at,
    };
  }

  return {
    competitor,
    brandName: competitor.name ?? "Adidas",
    inboxRows,
    insightRows,
    detailRows,
    htmlBodies,
  };
}

async function writeWebsiteModule(data: Awaited<ReturnType<typeof exportWebsite>>) {
  const outPath = path.join(FROZEN_LIB, "frozen-neptunas-website.ts");
  const content = `/* eslint-disable */
/** AUTO-GENERATED by scripts/freeze-demo-assets.ts — do not edit by hand. */

import type { PageDetailStaticPayload } from "@/components/website-tracker/PageDetailDrawer";
import type { DemoLandingPageChangeRow } from "@/lib/demo/demo-landing-page-changes-payload";

export type FrozenTrackedPageCard = {
  id: string;
  label: string;
  url: string;
  status: string;
  lastChecked: string;
  thumbnailUrl: string | null;
};

export const FROZEN_WEBSITE_SOURCE_SLUG = ${JSON.stringify(data.competitor.slug)};
export const FROZEN_WEBSITE_COMPETITOR_NAME = ${JSON.stringify(data.competitor.name)};

export const FROZEN_TRACKED_PAGES: FrozenTrackedPageCard[] = ${tsLiteral(data.trackedPages)};

export const FROZEN_PAGE_DETAILS: Record<string, PageDetailStaticPayload> = ${tsLiteral(data.pageDetails)} as Record<string, PageDetailStaticPayload>;

export const FROZEN_LANDING_PAGE_CHANGES: DemoLandingPageChangeRow[] = ${tsLiteral(data.changeRows)} as DemoLandingPageChangeRow[];
`;
  await fs.mkdir(FROZEN_LIB, { recursive: true });
  await fs.writeFile(outPath, content, "utf8");
  console.log(`Wrote ${outPath}`);
}

async function writeEmailModules(data: Awaited<ReturnType<typeof exportEmails>>) {
  const bodiesPath = path.join(FROZEN_LIB, "frozen-adidas-email-bodies.ts");
  const bodyEntries = Object.entries(data.htmlBodies)
    .map(([id, html]) => `  ${JSON.stringify(id)}: ${JSON.stringify(html)},`)
    .join("\n");

  await fs.writeFile(
    bodiesPath,
    `/* eslint-disable */
/** AUTO-GENERATED by scripts/freeze-demo-assets.ts — do not edit by hand. */
export const FROZEN_ADIDAS_EMAIL_HTML: Record<string, string> = {\n${bodyEntries}\n};\n`,
    "utf8",
  );
  console.log(`Wrote ${bodiesPath}`);

  const outPath = path.join(FROZEN_LIB, "frozen-adidas-emails.ts");
  const content = `/* eslint-disable */
/** AUTO-GENERATED by scripts/freeze-demo-assets.ts — do not edit by hand. */

import type { CompetitorEmailRow, EmailRowForInsights } from "@/lib/email-intelligence/types";
import { FROZEN_ADIDAS_EMAIL_HTML } from "@/lib/demo/frozen/frozen-adidas-email-bodies";

export const FROZEN_EMAIL_BRAND_NAME = ${JSON.stringify(data.brandName)};
export const FROZEN_EMAIL_SOURCE_SLUG = ${JSON.stringify(data.competitor.slug)};
export const FROZEN_EMAIL_DETAIL_COMPETITOR_ID = "demo-frozen-adidas";

export type FrozenEmailInboxRow = {
  id: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  type: string;
  preview: string;
  receivedAt: string;
  unread: boolean;
};

export const FROZEN_EMAIL_INBOX_ROWS: FrozenEmailInboxRow[] = ${tsLiteral(data.inboxRows)};

export const FROZEN_EMAIL_INSIGHT_ROWS: EmailRowForInsights[] = ${tsLiteral(data.insightRows)} as EmailRowForInsights[];

const FROZEN_EMAIL_DETAIL_META: Record<string, Omit<CompetitorEmailRow, "html_body">> = ${tsLiteral(data.detailRows)} as Record<string, Omit<CompetitorEmailRow, "html_body">>;

export function getFrozenEmailDetail(emailId: string): CompetitorEmailRow | null {
  const meta = FROZEN_EMAIL_DETAIL_META[emailId];
  if (!meta) return null;
  return {
    ...meta,
    html_body: FROZEN_ADIDAS_EMAIL_HTML[emailId] ?? null,
  };
}
`;
  await fs.writeFile(outPath, content, "utf8");
  console.log(`Wrote ${outPath}`);
}

async function main() {
  const args = parseArgs();
  const admin = createSupabaseAdminClient();
  const userId = await resolveUserId(admin, args.userEmail);

  console.log(`Freezing demo assets for user ${args.userEmail}`);
  await fs.mkdir(FROZEN_PUBLIC, { recursive: true });

  console.log(`\n=== Website: ${args.websiteSlug} ===`);
  const website = await exportWebsite(admin, args.websiteSlug, userId);
  console.log(`  pages: ${website.trackedPages.length}, changes: ${website.changeRows.length}`);

  console.log(`\n=== Emails: ${args.emailSlug} ===`);
  const emails = await exportEmails(admin, args.emailSlug, userId);
  console.log(`  emails: ${emails.inboxRows.length}`);

  await writeWebsiteModule(website);
  await writeEmailModules(emails);

  const manifest = {
    frozenAt: new Date().toISOString(),
    userEmail: args.userEmail,
    website: {
      slug: args.websiteSlug,
      competitorId: website.competitor.id,
      pageCount: website.trackedPages.length,
    },
    email: {
      slug: args.emailSlug,
      competitorId: emails.competitor.id,
      emailCount: emails.inboxRows.length,
    },
    checksum: createHash("sha256")
      .update(JSON.stringify({ website: website.trackedPages, email: emails.inboxRows }))
      .digest("hex")
      .slice(0, 16),
  };
  await fs.writeFile(path.join(FROZEN_PUBLIC, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log("\nDone. Commit public/demo/frozen/ and src/lib/demo/frozen/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
