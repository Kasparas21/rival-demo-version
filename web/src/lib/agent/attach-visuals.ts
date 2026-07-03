import type { SupabaseClient } from "@supabase/supabase-js";

import type { DetectedAgentSignal } from "@/lib/agent/types";
import type { Database } from "@/lib/supabase/types";

export function extractVisualUrlsFromSignal(signal: DetectedAgentSignal): string[] {
  const payload = signal.payload as Record<string, unknown>;
  const urls: string[] = [];

  if (signal.signal_type === "new_winning_ad" || signal.signal_type === "new_cta" || signal.signal_type === "platform_expansion") {
    const ad = payload.ad as Record<string, unknown> | undefined;
    const creative = (payload.creative_url as string | undefined) ?? (ad?.ad_creative_url as string | undefined);
    if (typeof creative === "string" && creative.startsWith("http")) urls.push(creative);
  }

  if (signal.signal_type === "new_email_campaign") {
    const email = payload.email as Record<string, unknown> | undefined;
    const screenshot = payload.screenshot_url as string | undefined;
    if (typeof screenshot === "string" && screenshot.startsWith("http")) urls.push(screenshot);
    else if (typeof email?.html_body === "string" && email.html_body.startsWith("http")) urls.push(email.html_body);
  }

  if (signal.signal_type === "organic_spike") {
    const media = payload.media_urls as string[] | undefined;
    if (Array.isArray(media)) {
      for (const url of media.slice(0, 2)) {
        if (typeof url === "string" && url.startsWith("http")) urls.push(url);
      }
    }
    const post = payload.post as Record<string, unknown> | undefined;
    const postMedia = post?.media_urls as string[] | undefined;
    if (Array.isArray(postMedia)) {
      for (const url of postMedia.slice(0, 2)) {
        if (typeof url === "string" && url.startsWith("http")) urls.push(url);
      }
    }
  }

  return [...new Set(urls)].slice(0, 3);
}

export async function attachVisualsToSignals(
  admin: SupabaseClient<Database>,
  signals: Array<DetectedAgentSignal & { id: string }>,
): Promise<string[]> {
  const allUrls: string[] = [];

  for (const signal of signals) {
    const urls = extractVisualUrlsFromSignal(signal);
    allUrls.push(...urls);

    if (signal.id && urls.length > 0) {
      await admin.from("agent_signals").update({ screenshot_urls: urls }).eq("id", signal.id);
    }
  }

  return [...new Set(allUrls)].slice(0, 3);
}
