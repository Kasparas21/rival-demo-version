import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getCompetitorBaseline,
  incrementScrapeCycle,
  recalculateBaseline,
  shouldSkipDetection,
} from "@/lib/agent/baseline";
import { deliverAgentMessage } from "@/lib/agent/deliver-agent-message";
import { isAutopilotDeliveryActive } from "@/lib/autopilot/is-autopilot-delivery-active";
import { detectAdsSignals } from "@/lib/agent/detectors/ads";
import { detectCrossCompetitorTrends } from "@/lib/agent/detectors/cross-competitor";
import { detectEmailSignals } from "@/lib/agent/detectors/email";
import { detectLandingPageSignals } from "@/lib/agent/detectors/landing-pages";
import { detectOrganicSignals } from "@/lib/agent/detectors/organic";
import type { AgentScrapeResults, AgentSignalSource, DetectedAgentSignal } from "@/lib/agent/types";
import type { Database, Json } from "@/lib/supabase/types";

async function loadUserContext(admin: SupabaseClient<Database>, userId: string) {
  const { data: profile } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();

  const { data: brand } = await admin
    .from("brands")
    .select("brand_context")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();

  return {
    email: profile?.email ?? null,
    brandContext: brand?.brand_context ?? null,
  };
}

async function loadCompetitorName(
  admin: SupabaseClient<Database>,
  competitorId: string,
): Promise<string> {
  const { data } = await admin
    .from("saved_competitors")
    .select("name, brand_name")
    .eq("id", competitorId)
    .maybeSingle();

  return data?.brand_name?.trim() || data?.name?.trim() || "Competitor";
}

async function insertSignals(
  admin: SupabaseClient<Database>,
  userId: string,
  competitorId: string | null,
  signals: DetectedAgentSignal[],
): Promise<Array<DetectedAgentSignal & { id: string }>> {
  const inserted: Array<DetectedAgentSignal & { id: string }> = [];

  for (const signal of signals) {
    const { data, error } = await admin
      .from("agent_signals")
      .insert({
        user_id: userId,
        competitor_id: competitorId,
        signal_type: signal.signal_type,
        source: signal.source,
        threat_score: signal.threat_score,
        payload: signal.payload as Json,
        screenshot_urls: signal.screenshot_urls ?? [],
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[rival-agent] signal insert failed", error?.message);
      continue;
    }

    inserted.push({ ...signal, id: data.id });
  }

  return inserted;
}

/**
 * @deprecated Agent signal delivery superseded by autopilot watch; detection paths remain for migration.
 */
export async function runAgentForUserCompetitor(
  admin: SupabaseClient<Database>,
  params: {
    userId: string;
    competitorId: string;
    scrapeResults: AgentScrapeResults;
    skipColdStart?: boolean;
    skipDuplicateCheck?: boolean;
  },
): Promise<{ signalsDetected: number; delivered: boolean; skippedReason?: string }> {
  const { userId, competitorId, scrapeResults, skipColdStart = false, skipDuplicateCheck = false } = params;

  try {
    const { baseline, cycles } = await getCompetitorBaseline(admin, competitorId);
    const allSignals: DetectedAgentSignal[] = [];
    const sourcesRun: AgentSignalSource[] = [];

    if (scrapeResults.newAds?.length) {
      sourcesRun.push("ads");
      if (skipColdStart || !shouldSkipDetection(cycles, "ads")) {
        const adsSignals = await detectAdsSignals({
          admin,
          competitorId,
          newAds: scrapeResults.newAds,
          baseline,
        });
        allSignals.push(...adsSignals);
      } else {
        console.log("[rival-agent] cold start skip ads", competitorId);
      }
    }

    if (scrapeResults.newEmails?.length) {
      sourcesRun.push("email");
      if (skipColdStart || !shouldSkipDetection(cycles, "email")) {
        const emailSignals = await detectEmailSignals({
          admin,
          competitorId,
          newEmails: scrapeResults.newEmails,
          baseline,
        });
        allSignals.push(...emailSignals);
      } else {
        console.log("[rival-agent] cold start skip email", competitorId);
      }
    }

    if (scrapeResults.newOrganicPosts?.length) {
      sourcesRun.push("organic");
      if (skipColdStart || !shouldSkipDetection(cycles, "organic")) {
        const organicSignals = await detectOrganicSignals({
          admin,
          competitorId,
          newPosts: scrapeResults.newOrganicPosts,
          baseline,
        });
        allSignals.push(...organicSignals);
      } else {
        console.log("[rival-agent] cold start skip organic", competitorId);
      }
    }

    if (scrapeResults.landingPageChange) {
      allSignals.push(...detectLandingPageSignals(scrapeResults.landingPageChange));
    }

    if (!skipColdStart) {
      for (const source of sourcesRun) {
        await incrementScrapeCycle(admin, competitorId, source);
      }
    }

    await recalculateBaseline(admin, competitorId, userId);

    if (allSignals.length === 0) {
      return { signalsDetected: 0, delivered: false };
    }

    const inserted = await insertSignals(admin, userId, competitorId, allSignals);

    if (await isAutopilotDeliveryActive(admin, userId)) {
      console.info("[agent] delivery skipped (autopilot active) user=%s", userId);
      return { signalsDetected: inserted.length, delivered: false, skippedReason: "Autopilot watch is active." };
    }

    const { email, brandContext } = await loadUserContext(admin, userId);
    const competitorName = await loadCompetitorName(admin, competitorId);

    const delivered = await deliverAgentMessage({
      admin,
      userId,
      competitorId,
      competitorName,
      brandContext,
      userEmail: email,
      signals: inserted,
      skipDuplicateCheck,
    });

    if (!delivered) {
      const settings = await import("@/lib/agent/settings").then((m) =>
        m.getOrCreateAgentSettings(admin, userId),
      );
      const filtered = inserted.filter((s) => s.threat_score >= settings.min_threat_score);
      let skippedReason = "No message sent.";
      if (filtered.length === 0) {
        skippedReason = `Signals found but all below your threshold (score ${settings.min_threat_score}+ required).`;
      }
      return { signalsDetected: inserted.length, delivered: false, skippedReason };
    }

    return { signalsDetected: inserted.length, delivered: true };
  } catch (err) {
    console.error("[rival-agent] runAgentForUserCompetitor failed", userId, competitorId, err);
    return { signalsDetected: 0, delivered: false, skippedReason: "Agent run failed." };
  }
}

export async function runCrossCompetitorCheck(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  try {
    const trendSignals = await detectCrossCompetitorTrends(admin, userId);
    if (trendSignals.length === 0) return;

    const inserted = await insertSignals(admin, userId, null, trendSignals);

    if (await isAutopilotDeliveryActive(admin, userId)) {
      console.info("[agent] delivery skipped (autopilot active) user=%s", userId);
      return;
    }

    const { email, brandContext } = await loadUserContext(admin, userId);

    await deliverAgentMessage({
      admin,
      userId,
      competitorId: null,
      competitorName: "Your competitors",
      brandContext,
      userEmail: email,
      signals: inserted,
      isCrossCompetitor: true,
    });
  } catch (err) {
    console.error("[rival-agent] runCrossCompetitorCheck failed", userId, err);
  }
}
