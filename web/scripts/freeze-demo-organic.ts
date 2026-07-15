/**
 * Freeze organic post previews for the sales demo.
 *
 * Usage:
 *   npx tsx scripts/freeze-demo-organic.ts --user-email=attributo@yahoo.com --slug=adidas.com
 *   npx tsx scripts/freeze-demo-organic.ts --user-email=attributo@yahoo.com --slug=nike.com
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

const MAX_POSTS = 10;

type OrganicRow = {
  id: string;
  platform: string;
  content: string | null;
  media_urls: string[];
  likes: number;
  comments: number;
  views: number;
  posted_at: string | null;
  archived_preview_url: string | null;
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

function isRasterUrl(url: string): boolean {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) && !/\.(mp4|mov|webm|m3u8)(\?|$)/i.test(trimmed);
}

function truncateContent(raw: string | null): string {
  const text = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "Organic post";
  if (text.length <= 140) return text;
  return `${text.slice(0, 139).trimEnd()}…`;
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 86400) return `${Math.max(1, Math.floor(s / 3600))}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

async function resolveUserId(admin: ReturnType<typeof createSupabaseAdminClient>, email: string) {
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 500 });
  const match = users?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!match) throw new Error(`No user found for email: ${email}`);
  return match.id;
}

async function downloadPreview(remoteUrl: string, destBase: string): Promise<string | null> {
  if (!isRasterUrl(remoteUrl)) return null;
  try {
    const res = await fetch(remoteUrl, { redirect: "follow" });
    if (!res.ok) {
      console.warn(`  skip preview (${res.status}): ${remoteUrl.slice(0, 80)}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = extFromContentType(res.headers.get("content-type"), remoteUrl);
    const finalPath = `${destBase}${ext}`;
    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    await fs.writeFile(finalPath, buf);
    return `/demo/frozen/${path.relative(FROZEN_PUBLIC, finalPath).split(path.sep).join("/")}`;
  } catch (e) {
    console.warn(`  preview download failed: ${remoteUrl.slice(0, 80)}`, e);
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

const PLATFORM_GRADIENTS: Record<string, string> = {
  instagram: "linear-gradient(135deg, #fdf2f8 0%, #f472b6 50%, #7c3aed 100%)",
  tiktok: "linear-gradient(160deg, #0f172a 0%, #334155 45%, #64748b 100%)",
  youtube: "linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #f87171 100%)",
  linkedin: "linear-gradient(135deg, #0a2540 0%, #0a66c2 55%, #70b5f9 100%)",
  facebook: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
  x: "linear-gradient(135deg, #0f172a 0%, #334155 100%)",
};

async function main() {
  const userEmail =
    process.argv.find((a) => a.startsWith("--user-email="))?.slice("--user-email=".length).trim() ??
    "attributo@yahoo.com";
  const slug =
    process.argv.find((a) => a.startsWith("--slug="))?.slice("--slug=".length).trim() ?? "adidas.com";
  const maxPostsArg = process.argv.find((a) => a.startsWith("--max-posts="))?.slice("--max-posts=".length);
  const maxPosts = maxPostsArg ? Math.max(1, Number.parseInt(maxPostsArg, 10) || MAX_POSTS) : MAX_POSTS;

  const admin = createSupabaseAdminClient();
  const userId = await resolveUserId(admin, userEmail);

  const { data: competitor, error: compErr } = await admin
    .from("saved_competitors")
    .select("id, name, slug, socials")
    .eq("slug", slug)
    .eq("user_id", userId)
    .maybeSingle();
  if (compErr) throw compErr;
  if (!competitor) throw new Error(`No competitor for slug=${slug}`);

  const { data: rows, error } = await admin
    .from("organic_posts")
    .select("id, platform, content, media_urls, likes, comments, views, posted_at, archived_preview_url")
    .eq("competitor_id", competitor.id)
    .eq("user_id", userId)
    .order("posted_at", { ascending: false })
    .limit(40);
  if (error) throw error;

  const candidates = (rows ?? []) as OrganicRow[];
  const frozenPosts: unknown[] = [];
  const usedPlatforms = new Set<string>();

  for (const row of candidates) {
    if (frozenPosts.length >= maxPosts) break;
    const previewSource = row.archived_preview_url?.trim() || row.media_urls.find(isRasterUrl) || "";
    const localPreview = previewSource
      ? await downloadPreview(previewSource, path.join(FROZEN_PUBLIC, slug, "organic", row.id))
      : null;
    const platform = row.platform.toLowerCase();
    const views = row.views > 0 ? row.views : undefined;
    frozenPosts.push({
      id: row.id,
      platform,
      content: truncateContent(row.content),
      likes: row.likes,
      comments: row.comments,
      ...(views != null ? { views } : {}),
      postedAt: fmtRelative(row.posted_at),
      previewUrl: localPreview,
      gradient: PLATFORM_GRADIENTS[platform] ?? "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      isVideo: Boolean(
        row.media_urls.some((u) => /\.(mp4|mov|webm)(\?|$)/i.test(u)) || platform === "tiktok",
      ),
    });
    usedPlatforms.add(platform);
  }

  const socials = (competitor.socials ?? {}) as Record<string, string | null | undefined>;
  const brandHandle = competitor.name?.toLowerCase().replace(/\s+/g, "") ?? slug.split(".")[0];
  const handles = {
    instagram: socials.instagram ?? `@${brandHandle}`,
    tiktok: socials.tiktok ?? `@${brandHandle}`,
    youtube: socials.youtube ?? `@${brandHandle}`,
    linkedin: socials.linkedin ?? brandHandle,
    x: socials.x ?? `@${brandHandle}`,
    facebook: socials.facebook ?? brandHandle,
  };

  const moduleBase = slugToModuleBase(slug);
  const outPath = path.join(FROZEN_LIB, `frozen-${moduleBase}-organic.ts`);
  const content = `/* eslint-disable */
/** AUTO-GENERATED by scripts/freeze-demo-organic.ts — do not edit by hand. */

export type FrozenOrganicPost = {
  id: string;
  platform: string;
  content: string;
  likes: number;
  comments: number;
  views?: number;
  postedAt: string;
  previewUrl: string | null;
  gradient: string;
  isVideo?: boolean;
};

export const FROZEN_ORGANIC_SOURCE_SLUG = ${JSON.stringify(slug)};
export const FROZEN_ORGANIC_BRAND_NAME = ${JSON.stringify(competitor.name)};

export const FROZEN_ORGANIC_POSTS: FrozenOrganicPost[] = ${tsLiteral(frozenPosts)};

export const FROZEN_ORGANIC_HANDLES = ${tsLiteral(handles)};
`;
  await fs.mkdir(FROZEN_LIB, { recursive: true });
  await fs.writeFile(outPath, content, "utf8");
  console.log(`Wrote ${outPath} (${frozenPosts.length} posts, platforms: ${[...usedPlatforms].join(", ")})`);

  const manifestPath = path.join(FROZEN_PUBLIC, "manifest.json");
  let manifest: Record<string, unknown> = {};
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as Record<string, unknown>;
  } catch {
    /* fresh */
  }
  const key = slug === "adidas.com" ? "organic" : slug === "nike.com" ? "nikeOrganic" : `organic_${slug}`;
  manifest[key] = {
    slug,
    competitorId: competitor.id,
    frozenAt: new Date().toISOString(),
    postCount: frozenPosts.length,
    checksum: createHash("sha256").update(JSON.stringify(frozenPosts)).digest("hex").slice(0, 16),
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
