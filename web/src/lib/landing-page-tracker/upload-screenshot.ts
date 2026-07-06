import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { LANDING_PAGE_BUCKET } from "./constants";

export async function uploadScreenshot(pngBytes: Buffer, path: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(LANDING_PAGE_BUCKET).upload(path, pngBytes, {
    contentType: "image/png",
    upsert: true,
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = admin.storage.from(LANDING_PAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function buildScreenshotPath(params: {
  userId: string;
  competitorId: string;
  label: string;
  timestamp: string;
  variant: "full" | "hero";
}): string {
  const safeLabel = params.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "page";
  return `${params.userId}/${params.competitorId}/${safeLabel}/${params.timestamp}_${params.variant}.png`;
}
