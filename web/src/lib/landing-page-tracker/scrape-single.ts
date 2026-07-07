import type { SupabaseClient } from "@supabase/supabase-js";

import { runAgentForUserCompetitor } from "@/lib/agent/run-agent";
import { HOST_BLOCKED_MESSAGE, isHostBlockedForCompetitor } from "@/lib/landing-pages/blocked-inheritance";
import type { Database, Json } from "@/lib/supabase/types";

import { analyzeLandingPageChange } from "./analyze-change";
import { selectChangedSectionTiles } from "./analyze-page-sections";
import { scheduleBackgroundCaptureJobs } from "./background-capture";
import {
  classifyLandingPageChange,
  detectLandingPageTextChanges,
  shouldSkipAiAnalysis,
} from "./classify-change";
import {
  LANDING_PAGE_SCRAPE_INTERVAL_DAYS,
  MEANINGFUL_THREAT_THRESHOLD,
  PIXEL_DIFF_THRESHOLD,
  type LandingPageChangeAnalysis,
  type LandingPageText,
} from "./constants";
import { extractPageText, isPageTextNearEmpty } from "./extract-page-text";
import { calculateMaskedPixelDiff, cropHeroPng, parseAnimationMask } from "./image-processing";
import { normalizePageText } from "./normalize-page-text";
import { captureScreenshot } from "./screenshot-one";
import { buildScreenshotPath, uploadScreenshot } from "./upload-screenshot";
import { buildVisualChangeRegions } from "./visual-change-regions";

export type LandingPageRow = Database["public"]["Tables"]["landing_pages"]["Row"];

export type ScrapeSingleOptions = {
  /** One-off capture for From ads preview — does not schedule recurring tracking. */
  previewOnly?: boolean;
};

const BOT_BLOCK_PHRASES = [
  "403",
  "forbidden",
  "access denied",
  "not a robot",
  "security check",
  "unusual traffic",
  "captcha",
  "blocked",
  "enable javascript",
  "just a moment",
] as const;

function isBotBlockedPage(pageText: LandingPageText): boolean {
  const fullText = pageText.full_text?.trim() ?? "";
  if (fullText.length < 100) return true;

  const searchable = [
    fullText,
    pageText.headline,
    pageText.subheadline,
    pageText.cta_text,
    ...(pageText.pricing_tiers ?? []),
  ]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
    .toLowerCase();

  return BOT_BLOCK_PHRASES.some((phrase) => searchable.includes(phrase));
}

async function loadCompetitorName(
  admin: SupabaseClient<Database>,
  competitorId: string,
): Promise<string> {
  const { data } = await admin
    .from("saved_competitors")
    .select("name, brand_name")
    .eq("id", competitorId)
    .maybeSingle();
  return data?.brand_name?.trim() || data?.name?.trim() || "Competitor";
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download screenshot (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function scrapeSingleLandingPage(
  admin: SupabaseClient<Database>,
  page: LandingPageRow,
  options?: ScrapeSingleOptions,
): Promise<{ ok: boolean; error?: string }> {
  const previewOnly = Boolean(options?.previewOnly);
  const scheduleTracking = page.is_active && !previewOnly;
  const landingPageId = page.id;
  const competitorId = page.competitor_id;
  const userId = page.user_id;
  const url = page.url;
  const label = page.label;
  const animationMask = parseAnimationMask(page.animation_mask_json);

  const competitorName = await loadCompetitorName(admin, competitorId);

  try {
    if (await isHostBlockedForCompetitor(admin, competitorId, userId, url)) {
      return { ok: false, error: HOST_BLOCKED_MESSAGE };
    }

    const { data: prevRows } = await admin
      .from("landing_page_snapshots")
      .select("*")
      .eq("landing_page_id", landingPageId)
      .order("taken_at", { ascending: false })
      .limit(1);

    const prevSnapshot = prevRows?.[0] ?? null;
    let referenceHeight: number | undefined;
    if (prevSnapshot?.screenshot_url) {
      try {
        const prevBytes = await downloadImage(prevSnapshot.screenshot_url);
        const sharp = (await import("sharp")).default;
        referenceHeight = (await sharp(prevBytes).metadata()).height ?? undefined;
      } catch {
        referenceHeight = undefined;
      }
    }

    const firstCapturedAt = Date.now();
    const fullPng = await captureScreenshot(url);
    const heroPng = await cropHeroPng(fullPng);

    const pageText = normalizePageText(await extractPageText(url));

    if (isBotBlockedPage(pageText)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const fullPath = buildScreenshotPath({
        userId,
        competitorId,
        label,
        timestamp,
        variant: "full",
      });
      const heroPath = buildScreenshotPath({
        userId,
        competitorId,
        label,
        timestamp,
        variant: "hero",
      });

      const fullUrl = await uploadScreenshot(fullPng, fullPath);
      const heroUrl = await uploadScreenshot(heroPng, heroPath);

      const { error: insertError } = await admin.from("landing_page_snapshots").insert({
        landing_page_id: landingPageId,
        competitor_id: competitorId,
        user_id: userId,
        screenshot_url: fullUrl,
        hero_screenshot_url: heroUrl,
        page_text: pageText as Json,
        pixel_diff_pct: null,
        has_meaningful_change: false,
        change_analysis: {} as Json,
        status: "blocked",
      });

      if (insertError) {
        throw new Error(insertError.message ?? "Failed to insert blocked snapshot");
      }

      const now = new Date();

      await admin
        .from("landing_pages")
        .update({
          last_screenshotted_at: now.toISOString(),
          ...(scheduleTracking ? { next_screenshot_at: null } : {}),
        })
        .eq("id", landingPageId);

      console.warn("[landing-page-scrape] bot/block page detected, snapshot saved as blocked", url);
      return { ok: true };
    }

    let normalizedPageText = pageText;
    if (isPageTextNearEmpty(pageText)) {
      console.warn("[landing-page-scrape] thin page text, keeping screenshot anyway", url);
      normalizedPageText = {
        ...pageText,
        full_text: pageText.full_text?.trim() || `${label} (${url})`,
      };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const fullPath = buildScreenshotPath({
      userId,
      competitorId,
      label,
      timestamp,
      variant: "full",
    });
    const heroPath = buildScreenshotPath({
      userId,
      competitorId,
      label,
      timestamp,
      variant: "hero",
    });

    const fullUrl = await uploadScreenshot(fullPng, fullPath);
    const heroUrl = await uploadScreenshot(heroPng, heroPath);

    let pixelDiffPct: number | null = null;
    let maskOverlapPct = 0;
    let hasMeaningfulChange = false;
    let changeAnalysis: LandingPageChangeAnalysis = {};
    let prevFullUrl: string | null = null;

    if (prevSnapshot) {
      prevFullUrl = prevSnapshot.screenshot_url;
      const prevBytes = await downloadImage(prevFullUrl);
      const diffResult = await calculateMaskedPixelDiff(prevBytes, fullPng, animationMask);
      pixelDiffPct = diffResult.pct;
      maskOverlapPct = diffResult.maskOverlapPct;

      const prevText = normalizePageText((prevSnapshot.page_text ?? {}) as LandingPageText);
      const textChanges = detectLandingPageTextChanges(prevText, normalizedPageText);

      let aiAnalysis: LandingPageChangeAnalysis = {};

      if (
        pixelDiffPct >= PIXEL_DIFF_THRESHOLD &&
        !shouldSkipAiAnalysis(pixelDiffPct, textChanges, maskOverlapPct)
      ) {
        const prevHeroUrl = prevSnapshot.hero_screenshot_url ?? prevFullUrl;
        const prevHeroBytes = await downloadImage(prevHeroUrl);

        const sectionTiles = await selectChangedSectionTiles({
          prevFullBytes: prevBytes,
          newFullBytes: fullPng,
          mask: animationMask,
          maxTiles: 2,
        });

        aiAnalysis = await analyzeLandingPageChange({
          url,
          label,
          competitorName,
          prevHeroBytes,
          newHeroBytes: heroPng,
          prevText,
          newText: normalizedPageText,
          pixelDiffPct,
          maskOverlapPct,
          animationMask,
          sectionTiles,
        });

        try {
          const visualChanges = await buildVisualChangeRegions({
            prevFullBytes: prevBytes,
            newFullBytes: fullPng,
            mask: animationMask,
            userId,
            competitorId,
            label,
            timestamp,
          });
          if (visualChanges.length > 0) {
            aiAnalysis.visual_changes = visualChanges;
          }
        } catch (visualErr) {
          console.error("[landing-page-scrape] visual region build failed", visualErr);
        }

        aiAnalysis.mask_overlap_pct = maskOverlapPct;
      }

      const classified = await classifyLandingPageChange({
        admin,
        landingPageId,
        pixelDiffPct,
        maskOverlapPct,
        textChanges,
        prevSnapshot,
        aiAnalysis,
      });
      hasMeaningfulChange = classified.hasMeaningfulChange;
      changeAnalysis = classified.changeAnalysis;
    }

    const { data: inserted, error: insertError } = await admin
      .from("landing_page_snapshots")
      .insert({
        landing_page_id: landingPageId,
        competitor_id: competitorId,
        user_id: userId,
        screenshot_url: fullUrl,
        hero_screenshot_url: heroUrl,
        page_text: normalizedPageText as Json,
        pixel_diff_pct: pixelDiffPct,
        has_meaningful_change: hasMeaningfulChange,
        change_analysis: changeAnalysis as Json,
        status: "ok",
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      throw new Error(insertError?.message ?? "Failed to insert snapshot");
    }

    if (scheduleTracking) {
      scheduleBackgroundCaptureJobs({
        admin,
        page,
        snapshotId: inserted.id,
        firstFullPng: fullPng,
        firstCapturedAt,
        referenceHeight,
        fullPath,
        heroPath,
        canReplaceSnapshot: !prevSnapshot || !hasMeaningfulChange,
      });
    }

    const threatScore = changeAnalysis.threat_score ?? 0;
    const confidence = changeAnalysis.change_confidence;
    if (
      scheduleTracking &&
      hasMeaningfulChange &&
      confidence === "confirmed" &&
      threatScore >= MEANINGFUL_THREAT_THRESHOLD
    ) {
      try {
        await runAgentForUserCompetitor(admin, {
          userId,
          competitorId,
          scrapeResults: {
            landingPageChange: {
              page,
              snapshot: inserted,
              changeAnalysis,
              prevScreenshotUrl: prevFullUrl,
              newScreenshotUrl: fullUrl,
            },
          },
          skipColdStart: true,
        });
      } catch (agentErr) {
        console.error("[landing-page-scrape] agent run failed", agentErr);
      }
    }

    const now = new Date();
    const pageUpdate: Database["public"]["Tables"]["landing_pages"]["Update"] = {
      last_screenshotted_at: now.toISOString(),
    };
    if (scheduleTracking) {
      const nextScrape = new Date(now);
      nextScrape.setDate(nextScrape.getDate() + LANDING_PAGE_SCRAPE_INTERVAL_DAYS);
      pageUpdate.next_screenshot_at = nextScrape.toISOString();
    }

    await admin.from("landing_pages").update(pageUpdate).eq("id", landingPageId);

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[landing-page-scrape] failed for ${url}:`, message);
    return { ok: false, error: message };
  }
}
