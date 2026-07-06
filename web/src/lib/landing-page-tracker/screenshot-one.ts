import { SCREENSHOT_VIEWPORT_HEIGHT, SCREENSHOT_VIEWPORT_WIDTH } from "./constants";

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

export async function captureScreenshot(url: string): Promise<Buffer> {
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
    // Capture error/block pages (403, Cloudflare, etc.) instead of failing the request.
    ignore_host_errors: "true",
    // `wait_for_network` requires a paid ScreenshotOne plan — use delay instead.
    delay: "3",
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
