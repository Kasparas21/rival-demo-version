import type { AlertType } from "@/lib/alerts/alert-types";

import type { WatchRecommendation } from "./types";

const FALLBACKS: Record<AlertType, (competitorName: string) => WatchRecommendation> = {
  new_platform: (name) => ({
    headline: `${name} entered a new ad platform`,
    recommendation: `Review their first ads on the new channel and compare messaging to your active campaigns.`,
    confidence: "high",
  }),
  platform_exit: (name) => ({
    headline: `${name} pulled back from a platform`,
    recommendation: `Check whether they shifted budget elsewhere — adjust your channel mix if they abandoned a space you compete on.`,
    confidence: "medium",
  }),
  new_angle: (name) => ({
    headline: `${name} is testing new messaging`,
    recommendation: `Open their ads and note the new angle — consider a counter-message or landing page test within two weeks.`,
    confidence: "medium",
  }),
  activity_spike: (name) => ({
    headline: `${name} ad activity jumped sharply`,
    recommendation: `Prioritize reviewing their newest creatives this week — they may be scaling a winner or launching a push.`,
    confidence: "high",
  }),
  activity_drop: (name) => ({
    headline: `${name} ad activity dropped`,
    recommendation: `See if they paused campaigns or exited platforms — there may be room to capture share while they pull back.`,
    confidence: "medium",
  }),
  proven_winner: (name) => ({
    headline: `${name} has a long-running winning ad`,
    recommendation: `Study the creative and offer in Copy Vault — adapt the hook or proof points for your next test.`,
    confidence: "high",
  }),
  creative_push: (name) => ({
    headline: `${name} launched many new ads at once`,
    recommendation: `Audit the batch for a new offer or angle — respond with a creative test before they gain traction.`,
    confidence: "high",
  }),
  competitor_email: (name) => ({
    headline: `${name} sent a new marketing email`,
    recommendation: `Read the email summary and check if their offer or positioning shifted — update your nurture or promo calendar if needed.`,
    confidence: "medium",
  }),
};

export function watchFallbackRecommendation(
  alertType: AlertType,
  competitorName: string,
): WatchRecommendation {
  const fn = FALLBACKS[alertType];
  if (!fn) {
    return {
      headline: `${competitorName} had a notable change`,
      recommendation: `Open their competitor page in Rival and review recent ads and strategy shifts.`,
      confidence: "low",
    };
  }
  return fn(competitorName.trim() || "Competitor");
}
