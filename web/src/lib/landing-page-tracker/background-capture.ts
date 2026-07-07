import type { SupabaseClient } from "@supabase/supabase-js";

import { isHostBlockedForCompetitor } from "@/lib/landing-pages/blocked-inheritance";
import type { Database } from "@/lib/supabase/types";

import {
  runAnimationCalibrationFromFirstShot,
  ANIMATION_CALIBRATION_GAP_MS,
  SCREENSHOT_DUAL_CAPTURE_GAP_MS,
} from "./animation-calibration";
import { cropHeroPng } from "./image-processing";
import { runDualCaptureImprovement } from "./screenshot-one";
import { uploadScreenshot } from "./upload-screenshot";

type LandingPageRow = Database["public"]["Tables"]["landing_pages"]["Row"];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isTrackingStillAllowed(
  admin: SupabaseClient<Database>,
  page: LandingPageRow,
): Promise<boolean> {
  const { data: fresh } = await admin
    .from("landing_pages")
    .select("is_active, url, competitor_id, user_id")
    .eq("id", page.id)
    .maybeSingle();

  if (!fresh?.is_active) return false;
  if (await isHostBlockedForCompetitor(admin, fresh.competitor_id, fresh.user_id, fresh.url)) {
    return false;
  }
  return true;
}

async function tryImproveSnapshot(params: {
  admin: SupabaseClient<Database>;
  page: LandingPageRow;
  snapshotId: string;
  firstFullPng: Buffer;
  referenceHeight?: number;
  fullPath: string;
  heroPath: string;
  canReplaceSnapshot: boolean;
  firstCapturedAt: number;
}): Promise<void> {
  const {
    admin,
    page,
    snapshotId,
    firstFullPng,
    referenceHeight,
    fullPath,
    heroPath,
    canReplaceSnapshot,
    firstCapturedAt,
  } = params;

  if (!canReplaceSnapshot) return;

  const elapsed = Date.now() - firstCapturedAt;
  const waitMs = Math.max(0, SCREENSHOT_DUAL_CAPTURE_GAP_MS - elapsed);
  if (waitMs > 0) await sleep(waitMs);

  if (!(await isTrackingStillAllowed(admin, page))) return;

  const improved = await runDualCaptureImprovement({
    url: page.url,
    firstBytes: firstFullPng,
    referenceHeight,
    waitMs: 0,
  });

  if (!improved) return;

  const heroPng = await cropHeroPng(improved);
  const [fullUrl, heroUrl] = await Promise.all([
    uploadScreenshot(improved, fullPath),
    uploadScreenshot(heroPng, heroPath),
  ]);

  await admin
    .from("landing_page_snapshots")
    .update({
      screenshot_url: fullUrl,
      hero_screenshot_url: heroUrl,
    })
    .eq("id", snapshotId);
}

async function tryCalibrateAnimations(params: {
  admin: SupabaseClient<Database>;
  page: LandingPageRow;
  firstFullPng: Buffer;
  firstCapturedAt: number;
}): Promise<void> {
  const { admin, page, firstFullPng, firstCapturedAt } = params;

  const { data: fresh } = await admin
    .from("landing_pages")
    .select("animation_calibration_status, is_active")
    .eq("id", page.id)
    .maybeSingle();

  if (!fresh?.is_active || fresh.animation_calibration_status === "done") return;

  const elapsed = Date.now() - firstCapturedAt;
  const waitMs = Math.max(0, ANIMATION_CALIBRATION_GAP_MS - elapsed);
  await runAnimationCalibrationFromFirstShot(admin, page.id, firstFullPng, waitMs);
}

export async function runBackgroundCaptureJobs(params: {
  admin: SupabaseClient<Database>;
  page: LandingPageRow;
  snapshotId: string;
  firstFullPng: Buffer;
  firstCapturedAt: number;
  referenceHeight?: number;
  fullPath: string;
  heroPath: string;
  canReplaceSnapshot: boolean;
}): Promise<void> {
  const { admin, page } = params;

  if (!page.is_active) return;
  if (await isHostBlockedForCompetitor(admin, page.competitor_id, page.user_id, page.url)) {
    return;
  }

  await Promise.all([
    tryImproveSnapshot(params),
    tryCalibrateAnimations(params),
  ]);
}

export function scheduleBackgroundCaptureJobs(
  params: Parameters<typeof runBackgroundCaptureJobs>[0],
): void {
  void runBackgroundCaptureJobs(params).catch((error) => {
    console.error("[background-capture] job failed", error);
  });
}
