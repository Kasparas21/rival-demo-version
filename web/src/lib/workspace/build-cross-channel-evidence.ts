import type { SupabaseClient } from "@supabase/supabase-js";

import { buildAdEvidenceText } from "@/lib/brand-comparison/build-ad-evidence";
import { fetchLatestAdsLibraryFromUserCache } from "@/lib/ad-library/load-ads-library-from-user-cache";
import { parseOrganicSocials } from "@/lib/organic-content/socials";
import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";
import type { Database } from "@/lib/supabase/types";

type RivalRow = {
  id: string;
  slug: string;
  name: string | null;
  brand_name: string | null;
  brand_domain: string | null;
};

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

async function organicEvidenceBlock(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
  maxChars: number,
): Promise<string> {
  const lines: string[] = [];

  const { data: insights } = await supabase
    .from("organic_insights")
    .select("whats_working, whats_flopping, hot_right_now, metrics_overview")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (insights) {
    const working = Array.isArray(insights.whats_working) ? insights.whats_working : [];
    for (const item of working.slice(0, 3)) {
      const row = item as { summary?: string };
      if (row.summary?.trim()) lines.push(`Working: ${row.summary.trim()}`);
    }
    const hot = Array.isArray(insights.hot_right_now) ? insights.hot_right_now : [];
    for (const item of hot.slice(0, 2)) {
      const row = item as { summary?: string };
      if (row.summary?.trim()) lines.push(`Hot: ${row.summary.trim()}`);
    }
  }

  const { data: posts } = await supabase
    .from("organic_posts")
    .select("platform, content, likes, comments, posted_at")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .order("posted_at", { ascending: false })
    .limit(8);

  for (const p of posts ?? []) {
    const snippet = clip(String(p.content ?? ""), 180);
    if (!snippet) continue;
    lines.push(
      `[${p.platform}] ${snippet} (likes ${p.likes ?? 0}, comments ${p.comments ?? 0})`,
    );
  }

  const { data: socialRow } = await supabase
    .from("saved_competitors")
    .select("socials")
    .eq("id", competitorId)
    .maybeSingle();
  const socials = parseOrganicSocials(socialRow?.socials);
  const platforms = Object.keys(socials).join(", ");
  if (platforms) lines.unshift(`Organic platforms tracked: ${platforms}`);

  return lines.join("\n").slice(0, maxChars);
}

async function websiteEvidenceBlock(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
  maxChars: number,
): Promise<string> {
  const { data: pages } = await supabase
    .from("landing_pages")
    .select("id, url, label, page_type")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .eq("is_active", true)
    .limit(6);

  if (!pages?.length) return "";

  const lines: string[] = [`Tracked pages: ${pages.length}`];
  for (const page of pages) {
    lines.push(`- ${page.label || page.page_type || "page"}: ${page.url}`);
  }

  const pageIds = pages.map((p) => p.id);
  const { data: snaps } = await supabase
    .from("landing_page_snapshots")
    .select("landing_page_id, has_meaningful_change, change_analysis, taken_at")
    .eq("user_id", userId)
    .in("landing_page_id", pageIds)
    .order("taken_at", { ascending: false })
    .limit(12);

  for (const s of snaps ?? []) {
    if (!s.has_meaningful_change) continue;
    const analysis = s.change_analysis as { summary?: string } | null;
    const summary = analysis?.summary?.trim();
    if (summary) lines.push(`Recent change: ${clip(summary, 200)}`);
  }

  return lines.join("\n").slice(0, maxChars);
}

async function emailEvidenceBlock(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
  maxChars: number,
): Promise<string> {
  const { data: emails } = await supabase
    .from("competitor_emails")
    .select("subject, received_at, ai_summary, ai_angle, ai_cta, ai_offers")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .order("received_at", { ascending: false })
    .limit(10);

  if (!emails?.length) return "";

  const lines: string[] = [`Captured emails (recent): ${emails.length}`];
  for (const e of emails) {
    const bits = [
      e.subject?.trim() ? `Subject: ${e.subject.trim()}` : null,
      e.ai_angle?.trim() ? `Angle: ${e.ai_angle.trim()}` : null,
      e.ai_cta?.trim() ? `CTA: ${e.ai_cta.trim()}` : null,
      e.ai_summary?.trim() ? clip(e.ai_summary.trim(), 160) : null,
    ].filter(Boolean);
    if (bits.length) lines.push(bits.join(" | "));
  }

  return lines.join("\n").slice(0, maxChars);
}

export async function buildCrossChannelEvidenceText(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  rivals: RivalRow[];
  userBrandDomain?: string;
  perCompetitorCap?: number;
  workspaceCap?: number;
  totalCap?: number;
}): Promise<{ text: string; hasCompetitorEvidence: boolean; hasWorkspaceEvidence: boolean }> {
  const {
    supabase,
    userId,
    rivals,
    userBrandDomain,
    perCompetitorCap = 2_800,
    workspaceCap = 3_200,
    totalCap = 48_000,
  } = params;

  const blocks: string[] = [];
  let totalChars = 0;
  let hasCompetitorEvidence = false;
  let hasWorkspaceEvidence = false;

  for (const row of rivals) {
    const label = row.brand_name?.trim() || row.name?.trim() || row.slug;
    const hint = row.brand_domain?.trim() || row.slug?.trim();
    if (!hint) continue;

    const sections: string[] = [];
    const lib = await fetchLatestAdsLibraryFromUserCache(supabase, userId, hint);
    const adsDigest = buildAdEvidenceText(lib, Math.floor(perCompetitorCap * 0.45)).trim();
    if (adsDigest.length > 80) {
      sections.push(`[PAID ADS]\n${adsDigest}`);
      hasCompetitorEvidence = true;
    }

    const organic = await organicEvidenceBlock(supabase, userId, row.id, 900);
    if (organic.length > 40) {
      sections.push(`[ORGANIC]\n${organic}`);
      hasCompetitorEvidence = true;
    }

    const website = await websiteEvidenceBlock(supabase, userId, row.id, 700);
    if (website.length > 30) {
      sections.push(`[WEBSITE]\n${website}`);
      hasCompetitorEvidence = true;
    }
    const email = await emailEvidenceBlock(supabase, userId, row.id, 700);
    if (email.length > 30) {
      sections.push(`[EMAIL]\n${email}`);
      hasCompetitorEvidence = true;
    }

    const header = `### Competitor: ${label} (${hint})`;
    const chunk = sections.length
      ? `${header}\n${sections.join("\n\n")}`
      : `${header}\n(no channel evidence yet)`;
    if (totalChars + chunk.length > totalCap) break;
    blocks.push(chunk);
    totalChars += chunk.length;
  }

  if (userBrandDomain?.trim()) {
    const domain = normalizeCompetitorSlug(userBrandDomain);
    const wsSections: string[] = [];

    const wsLib = await fetchLatestAdsLibraryFromUserCache(supabase, userId, domain);
    const adsDigest = buildAdEvidenceText(wsLib, Math.floor(workspaceCap * 0.4)).trim();
    if (adsDigest.length > 60) {
      wsSections.push(`[PAID ADS]\n${adsDigest}`);
      hasWorkspaceEvidence = true;
    }

    const { data: ownRow } = await supabase
      .from("saved_competitors")
      .select("id")
      .eq("user_id", userId)
      .eq("is_workspace_brand", true)
      .maybeSingle();

    if (ownRow?.id) {
      const organic = await organicEvidenceBlock(supabase, userId, ownRow.id, 900);
      if (organic.length > 40) {
        wsSections.push(`[ORGANIC]\n${organic}`);
        hasWorkspaceEvidence = true;
      }
      const website = await websiteEvidenceBlock(supabase, userId, ownRow.id, 700);
      if (website.length > 30) {
        wsSections.push(`[WEBSITE]\n${website}`);
        hasWorkspaceEvidence = true;
      }
      const email = await emailEvidenceBlock(supabase, userId, ownRow.id, 700);
      if (email.length > 30) {
        wsSections.push(`[EMAIL]\n${email}`);
        hasWorkspaceEvidence = true;
      }
    }

    const chunk = wsSections.length
      ? `### Your workspace brand (${domain})\n${wsSections.join("\n\n")}`
      : `### Your workspace brand (${domain})\n(no channel evidence yet)`;
    if (totalChars + chunk.length <= totalCap) {
      blocks.push(chunk);
    }
  }

  return {
    text: blocks.join("\n\n---\n\n"),
    hasCompetitorEvidence,
    hasWorkspaceEvidence,
  };
}
