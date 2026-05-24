import { NextResponse } from "next/server";

import {
  buildWeeklyDigestEmailHtml,
  buildWeeklyDigestEmailText,
  WEEKLY_DIGEST_EMAIL_SAMPLE,
} from "@/lib/digest/weekly-digest-email";

export const runtime = "nodejs";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

/** GET — render sample weekly digest HTML for preview (requires CRON_SECRET in prod). */
export async function GET(req: Request): Promise<Response> {
  console.log("[preview-debug]", {
    nodeEnv: process.env.NODE_ENV,
    secretLoaded: Boolean(process.env.CRON_SECRET),
    secretLen: (process.env.CRON_SECRET || "").trim().length,
  });
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const html = buildWeeklyDigestEmailHtml(WEEKLY_DIGEST_EMAIL_SAMPLE);
  const text = buildWeeklyDigestEmailText(WEEKLY_DIGEST_EMAIL_SAMPLE);

  const url = new URL(req.url);
  if (url.searchParams.get("format") === "json") {
    return NextResponse.json({
      ok: true,
      html,
      text,
      sample: WEEKLY_DIGEST_EMAIL_SAMPLE,
      htmlBytes: Buffer.byteLength(html, "utf8"),
    });
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
