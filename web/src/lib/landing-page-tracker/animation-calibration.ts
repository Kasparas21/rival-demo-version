import type { SupabaseClient } from "@supabase/supabase-js";

import { isHostBlockedForCompetitor } from "@/lib/landing-pages/blocked-inheritance";
import type { Database, Json } from "@/lib/supabase/types";

import {
  ANIMATION_CALIBRATION_GAP_MS,
  SCREENSHOT_DUAL_CAPTURE_GAP_MS,
} from "./constants";
import { buildAnimationMaskFromPair } from "./image-processing";
import { captureScreenshot } from "./screenshot-one";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadPage(
  admin: SupabaseClient<Database>,
  landingPageId: string,
): Promise<Database["public"]["Tables"]["landing_pages"]["Row"] | null> {
  const { data } = await admin.from("landing_pages").select("*").eq("id", landingPageId).maybeSingle();
  return data ?? null;
}

export async function finishAnimationCalibrationWithShots(
  admin: SupabaseClient<Database>,
  landingPageId: string,
  shotA: Buffer,
  shotB: Buffer,
): Promise<void> {
  const page = await loadPage(admin, landingPageId);
  if (!page) return;

  if (page.animation_calibration_status === "done") return;

  try {
    const mask = await buildAnimationMaskFromPair(shotA, shotB);
    await admin
      .from("landing_pages")
      .update({
        animation_calibration_status: "done",
        animation_mask_json: mask as unknown as Json,
        animation_calibrated_at: new Date().toISOString(),
      })
      .eq("id", landingPageId);

    console.info(
      `[animation-calibration] done for ${page.url} — ${mask.length} volatile region(s)`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[animation-calibration] failed for ${page?.url}:`, message);
    await admin
      .from("landing_pages")
      .update({ animation_calibration_status: "failed" })
      .eq("id", landingPageId);
  }
}

/** Uses an existing first screenshot as shot A; waits then captures shot B. */
export async function runAnimationCalibrationFromFirstShot(
  admin: SupabaseClient<Database>,
  landingPageId: string,
  firstShotBytes: Buffer,
  waitMs: number = ANIMATION_CALIBRATION_GAP_MS,
): Promise<void> {
  const page = await loadPage(admin, landingPageId);
  if (!page) return;

  if (page.animation_calibration_status === "done") return;

  if (await isHostBlockedForCompetitor(admin, page.competitor_id, page.user_id, page.url)) {
    await admin
      .from("landing_pages")
      .update({ animation_calibration_status: "failed" })
      .eq("id", landingPageId);
    return;
  }

  if (!page.is_active) return;

  await admin
    .from("landing_pages")
    .update({ animation_calibration_status: "running" })
    .eq("id", landingPageId);

  try {
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    const refreshed = await loadPage(admin, landingPageId);
    if (!refreshed?.is_active) return;
    if (await isHostBlockedForCompetitor(admin, refreshed.competitor_id, refreshed.user_id, refreshed.url)) {
      await admin
        .from("landing_pages")
        .update({ animation_calibration_status: "failed" })
        .eq("id", landingPageId);
      return;
    }

    const shotB = await captureScreenshot(refreshed.url);
    await finishAnimationCalibrationWithShots(admin, landingPageId, firstShotBytes, shotB);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[animation-calibration] failed for ${page.url}:`, message);
    await admin
      .from("landing_pages")
      .update({ animation_calibration_status: "failed" })
      .eq("id", landingPageId);
  }
}

/** Fallback when tracking starts on an existing snapshot — download shot A and calibrate in background. */
export async function scheduleCalibrationFromSnapshotUrl(
  admin: SupabaseClient<Database>,
  landingPageId: string,
  screenshotUrl: string,
): Promise<void> {
  const page = await loadPage(admin, landingPageId);
  if (!page || page.animation_calibration_status === "done" || page.animation_calibration_status === "running") {
    return;
  }

  if (!page.is_active) return;
  if (await isHostBlockedForCompetitor(admin, page.competitor_id, page.user_id, page.url)) {
    return;
  }

  try {
    const response = await fetch(screenshotUrl);
    if (!response.ok) return;
    const firstShotBytes = Buffer.from(await response.arrayBuffer());
    void runAnimationCalibrationFromFirstShot(admin, landingPageId, firstShotBytes);
  } catch (error) {
    console.error("[animation-calibration] failed to load existing snapshot", error);
  }
}

export { ANIMATION_CALIBRATION_GAP_MS, SCREENSHOT_DUAL_CAPTURE_GAP_MS };
