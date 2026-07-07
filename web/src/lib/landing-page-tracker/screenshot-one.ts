import {
  SCREENSHOT_CAPTURE_DELAY_SEC,
  SCREENSHOT_DUAL_CAPTURE_GAP_MS,
  SCREENSHOT_VIEWPORT_HEIGHT,
  SCREENSHOT_VIEWPORT_WIDTH,
} from "./constants";
import { scoreScreenshotQuality } from "./image-processing";

const SCREENSHOTONE_BASE = "https://api.screenshotone.com/take";

function friendlyScreenshotError(status: number, rawMessage: string): string {
  const lower = rawMessage.toLowerCase();
  if (
    lower.includes("200-299") ||
    lower.includes("ignore_host_errors") ||
    lower.includes("returned_status_code") ||
    lower.includes("host doesn't respond")
  ) {
    return "This page blocked our screenshot request or returned an error status.";
  }
  if (status === 401 || status === 403) {
    return "Screenshot service authentication failed.";
  }
  if (rawMessage.length > 100) {
    return rawMessage.slice(0, 100).trim() + "…";
  }
  return rawMessage || `Screenshot request failed (${status})`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchScreenshot(url: string, delaySec: number): Promise<Buffer> {
  const accessKey = process.env.SCREENSHOTONE_ACCESS_KEY?.trim();
  if (!accessKey) {
    throw new Error("SCREENSHOTONE_ACCESS_KEY not configured");
  }

  const params = new URLSearchParams({
    access_key: accessKey,
    url,
    full_page: "true",
    format: "png",
    viewport_width: String(SCREENSHOT_VIEWPORT_WIDTH),
    viewport_height: String(SCREENSHOT_VIEWPORT_HEIGHT),
    block_cookie_banners: "true",
    block_chats: "true",
    block_ads: "true",
    ignore_host_errors: "true",
    delay: String(delaySec),
    timeout: "60",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(`${SCREENSHOTONE_BASE}?${params.toString()}`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      let message = body.slice(0, 200);
      try {
        const parsed = JSON.parse(body) as { error_message?: string; error_code?: string };
        if (parsed.error_message) {
          message = parsed.error_message;
        } else if (parsed.error_code) {
          message = parsed.error_code;
        }
      } catch {
        /* use raw body */
      }
      throw new Error(friendlyScreenshotError(response.status, message));
    }
    const contentType = response.headers.get("content-type") ?? "";
    const arrayBuffer = await response.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);
    const isPng =
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    if (!isPng && !contentType.includes("image")) {
      const hint = bytes.toString("utf8", 0, Math.min(bytes.length, 200));
      throw new Error(
        `ScreenshotOne returned non-image response: ${hint || contentType || "unknown"}`,
      );
    }
    return bytes;
  } finally {
    clearTimeout(timeout);
  }
}

/** Single synchronous capture — the only path the user waits on. */
export async function captureScreenshot(url: string): Promise<Buffer> {
  return fetchScreenshot(url, SCREENSHOT_CAPTURE_DELAY_SEC);
}

/**
 * Background helper: waits, captures a second frame, returns it only if better than the first.
 * Returns null if the first frame should be kept or the second capture failed.
 */
export async function runDualCaptureImprovement(params: {
  url: string;
  firstBytes: Buffer;
  referenceHeight?: number;
  waitMs?: number;
}): Promise<Buffer | null> {
  const { url, firstBytes, referenceHeight, waitMs = SCREENSHOT_DUAL_CAPTURE_GAP_MS } = params;
  if (waitMs > 0) {
    await sleep(waitMs);
  }

  try {
    const second = await fetchScreenshot(url, SCREENSHOT_CAPTURE_DELAY_SEC);
    const [scoreA, scoreB] = await Promise.all([
      scoreScreenshotQuality(firstBytes, referenceHeight),
      scoreScreenshotQuality(second, referenceHeight),
    ]);
    return scoreB > scoreA ? second : null;
  } catch (error) {
    console.error("[screenshot] dual capture improvement failed", error);
    return null;
  }
}
