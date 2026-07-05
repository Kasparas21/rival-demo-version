import type { AlertType } from "@/lib/alerts/alert-types";

import type { UserBrandContext } from "./user-brand-context";
import type { WatchRecommendation } from "./types";

function clientLabel(brand: UserBrandContext | null | undefined): string {
  return brand?.brandName?.trim() || "your brand";
}

const FALLBACKS: Record<AlertType, (competitorName: string, brand: UserBrandContext | null | undefined) => WatchRecommendation> = {
  new_platform: (name, brand) => ({
    headline: `${name} launched ads on a new platform`,
    context: `${name} expanded paid presence to a channel they were not active on before. Early creatives often reveal positioning tests before they scale spend - worth reviewing within 24 hours.`,
    recommendation: `Pull their first ads on the new platform in Rival, note hooks and offers, then decide if ${clientLabel(brand)} should (a) launch a defensive test on the same channel within 48h or (b) double down where you already have share while they experiment elsewhere.`,
    confidence: "high",
  }),
  platform_exit: (name, brand) => ({
    headline: `${name} pulled back from a paid channel`,
    context: `${name} reduced or exited ads on a platform where you may overlap. That can mean budget reallocation, creative fatigue, or a strategic pivot - check whether spend moved to another channel.`,
    recommendation: `Compare their platform mix before vs after in Rival. If they abandoned a channel ${clientLabel(brand)} competes on, consider increasing share there this week; if they shifted budget, mirror the channel they moved to with a small test campaign.`,
    confidence: "medium",
  }),
  new_angle: (name, brand) => ({
    headline: `${name} is testing new ad messaging`,
    context: `${name} introduced a fresh creative angle or value prop in paid ads. New angles are often A/B tests before scaling - the first batch usually signals where they want to differentiate.`,
    recommendation: `Screenshot their new angle in Copy Vault, map it against ${clientLabel(brand)}'s top hooks, and launch a counter-message test on the same platform within 7 days - same audience tier, one variable changed (hook or offer).`,
    confidence: "medium",
  }),
  activity_spike: (name, brand) => ({
    headline: `${name} ad activity jumped sharply`,
    context: `${name}'s paid activity score spiked versus their recent baseline - often a launch, promo push, or scaling a winning creative. Spikes on Meta/TikTok usually precede visible spend increases within days.`,
    recommendation: `Prioritize their newest ads this week in Rival. If the spike is offer-driven, ${clientLabel(brand)} should run a time-boxed response promo or creative refresh on the same platform; if creative-driven, clone the structural hook (not the copy) into your next test batch.`,
    confidence: "high",
  }),
  activity_drop: (name, brand) => ({
    headline: `${name} ad activity dropped`,
    context: `${name}'s paid output fell meaningfully vs recent weeks - could be budget cuts, seasonal pause, or creative fatigue after a push.`,
    recommendation: `Check if they exited platforms or paused campaigns. If ${clientLabel(brand)} competes on the same placements, this may be a window to increase impression share with existing winners before they return.`,
    confidence: "medium",
  }),
  proven_winner: (name, brand) => ({
    headline: `${name} has a long-running winning ad`,
    context: `${name} is running a creative that has stayed active for an extended period - a strong signal it is converting for them. Longevity usually means proven hook, offer, or audience fit.`,
    recommendation: `Deconstruct the ad in Copy Vault (hook, proof, CTA, format). Build ${clientLabel(brand)}'s next test around the same psychological trigger with your own brand voice - run 2-3 variants on the platform where their winner lives.`,
    confidence: "high",
  }),
  creative_push: (name, brand) => ({
    headline: `${name} launched many new ads at once`,
    context: `${name} dropped a batch of new creatives simultaneously - typical of a campaign launch, seasonal push, or repositioning sprint. Batch launches often share a central offer or narrative thread.`,
    recommendation: `Audit the batch for a common offer or angle. If it's a new promo, ${clientLabel(brand)} should respond with a counter-offer or urgency play on the same platform within 5 days; if it's messaging-led, brief your creative team with the dominant hooks from the batch.`,
    confidence: "high",
  }),
  competitor_email: (name, brand) => ({
    headline: `${name} sent a new marketing email`,
    context: `${name} pushed a new email campaign - often aligned with paid promos or lifecycle offers. Email + paid together usually signals a coordinated GTM moment.`,
    recommendation: `Read the email summary in Rival and check if paid ads mirror the same offer. If yes, ${clientLabel(brand)} should align email and paid within the week; if the email introduces a new angle, test it in paid before they scale.`,
    confidence: "medium",
  }),
};

export function watchFallbackRecommendation(
  alertType: AlertType,
  competitorName: string,
  userBrand?: UserBrandContext | null,
): WatchRecommendation {
  const fn = FALLBACKS[alertType];
  const name = competitorName.trim() || "Competitor";
  if (!fn) {
    return {
      headline: `${name} had a notable change`,
      context: `${name} triggered a competitive alert based on recent ad or marketing activity. Open their profile in Rival for full creative and platform context.`,
      recommendation: `Review their latest ads and strategy shifts in Rival, then decide if ${clientLabel(userBrand)} needs a defensive test on the affected platform this week.`,
      confidence: "low",
    };
  }
  return fn(name, userBrand);
}
