import type { AgentLandingPageChangeInput, DetectedAgentSignal } from "@/lib/agent/types";
import { MEANINGFUL_THREAT_THRESHOLD } from "@/lib/landing-page-tracker/constants";

export function detectLandingPageSignals(
  landingPageChange: AgentLandingPageChangeInput | undefined,
): DetectedAgentSignal[] {
  if (!landingPageChange) return [];

  const analysis = landingPageChange.changeAnalysis;
  const threatScore = analysis.threat_score ?? 0;
  if (threatScore < MEANINGFUL_THREAT_THRESHOLD) return [];

  const screenshotUrls: string[] = [];
  if (landingPageChange.prevScreenshotUrl) screenshotUrls.push(landingPageChange.prevScreenshotUrl);
  if (landingPageChange.snapshot.hero_screenshot_url) {
    screenshotUrls.push(landingPageChange.snapshot.hero_screenshot_url);
  } else if (landingPageChange.newScreenshotUrl) {
    screenshotUrls.push(landingPageChange.newScreenshotUrl);
  }

  return [
    {
      signal_type: "landing_page_change",
      source: "landing_pages",
      threat_score: threatScore,
      payload: {
        page_label: landingPageChange.page.label,
        page_url: landingPageChange.page.url,
        what_changed: analysis.what_changed,
        strategic_interpretation: analysis.strategic_interpretation,
        what_to_do: analysis.what_to_do,
        urgency: analysis.urgency,
        prev_screenshot_url: landingPageChange.prevScreenshotUrl,
        new_screenshot_url: landingPageChange.newScreenshotUrl,
        hero_screenshot_url: landingPageChange.snapshot.hero_screenshot_url,
      },
      screenshot_urls: screenshotUrls,
    },
  ];
}
