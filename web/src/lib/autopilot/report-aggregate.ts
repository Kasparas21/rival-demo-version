import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";
import type { Database } from "@/lib/supabase/types";

export type ReportCompetitorRow = {
  competitorId: string;
  name: string;
  host: string;
  activityScore: number | null;
  activityScoreDelta: number | null;
  newAdsCount: number;
  newAdsByPlatform: Record<string, number>;
  provenWinners: { platform: string; lifespanDays: number; preview: string }[];
  newAngles: string[];
  platformEntries: string[];
  platformExits: string[];
  alertCount: number;
};

export type ReportWorkspaceData = {
  brandId: string;
  brandName: string;
  periodLabel: string;
  startIso: string;
  endIso: string;
  competitors: ReportCompetitorRow[];
};

function hostFromCompetitor(row: { brand_domain: string | null; slug: string }): string {
  const domain = row.brand_domain?.trim();
  if (domain) {
    return normalizeCompetitorSlug(domain.replace(/^https?:\/\//i, "").split("/")[0] ?? domain);
  }
  return normalizeCompetitorSlug(row.slug);
}

export async function aggregateWorkspaceReport(
  admin: SupabaseClient<Database>,
  userId: string,
  brandId: string,
  now = new Date(),
): Promise<ReportWorkspaceData | null> {
  const { data: brand } = await admin
    .from("brands")
    .select("id, name")
    .eq("id", brandId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!brand) return null;

  const endIso = now.toISOString();
  const start = new Date(now.getTime() - 30 * 86_400_000);
  const startIso = start.toISOString();

  const periodLabel = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const { data: mappings } = await admin
    .from("brand_competitors")
    .select("competitor_id")
    .eq("brand_id", brandId)
    .eq("user_id", userId);

  const competitorIds = (mappings ?? []).map((m) => m.competitor_id);
  if (competitorIds.length === 0) {
    return {
      brandId,
      brandName: brand.name,
      periodLabel,
      startIso,
      endIso,
      competitors: [],
    };
  }

  const { data: comps } = await admin
    .from("saved_competitors")
    .select("id, name, brand_name, brand_domain, slug")
    .in("id", competitorIds)
    .eq("user_id", userId);

  const { data: scores } = await admin
    .from("competitor_activity_scores")
    .select("competitor_id, score, raw_metrics")
    .eq("user_id", userId)
    .in("competitor_id", competitorIds);

  const scoreByComp = new Map(
    (scores ?? []).map((s) => {
      const raw = s.raw_metrics as Record<string, unknown> | null;
      const prev =
        typeof raw?.previous_score === "number"
          ? raw.previous_score
          : typeof raw?.score_before === "number"
            ? raw.score_before
            : null;
      return [
        s.competitor_id,
        {
          score: s.score,
          delta: prev != null && s.score != null ? s.score - prev : null,
        },
      ];
    }),
  );

  const { data: alerts } = await admin
    .from("competitor_alerts")
    .select("competitor_id, alert_type, title, metadata, detected_at")
    .eq("user_id", userId)
    .in("competitor_id", competitorIds)
    .gte("detected_at", startIso)
    .lte("detected_at", endIso);

  const { data: scraped } = await admin
    .from("scraped_ads")
    .select("competitor_id, platform, first_seen_at, is_active, ad_text")
    .eq("user_id", userId)
    .in("competitor_id", competitorIds)
    .gte("first_seen_at", startIso);

  const competitors: ReportCompetitorRow[] = (comps ?? []).map((c) => {
    const compAlerts = (alerts ?? []).filter((a) => a.competitor_id === c.id);
    const compAds = (scraped ?? []).filter((a) => a.competitor_id === c.id);
    const newAdsByPlatform: Record<string, number> = {};
    for (const ad of compAds) {
      const p = ad.platform ?? "unknown";
      newAdsByPlatform[p] = (newAdsByPlatform[p] ?? 0) + 1;
    }

    const newAngles = compAlerts
      .filter((a) => a.alert_type === "new_angle")
      .map((a) => a.title)
      .slice(0, 5);

    const platformEntries = compAlerts
      .filter((a) => a.alert_type === "new_platform")
      .map((a) => a.title);

    const platformExits = compAlerts
      .filter((a) => a.alert_type === "platform_exit")
      .map((a) => a.title);

    const provenWinners = compAlerts
      .filter((a) => a.alert_type === "proven_winner")
      .map((a) => ({
        platform: String((a.metadata as Record<string, unknown>)?.platform ?? "meta"),
        lifespanDays: Number((a.metadata as Record<string, unknown>)?.lifespanDays ?? 30),
        preview: a.title,
      }))
      .slice(0, 5);

    const sc = scoreByComp.get(c.id);

    return {
      competitorId: c.id,
      name: c.brand_name?.trim() || c.name?.trim() || "Competitor",
      host: hostFromCompetitor(c),
      activityScore: sc?.score ?? null,
      activityScoreDelta: sc?.delta ?? null,
      newAdsCount: compAds.length,
      newAdsByPlatform,
      provenWinners,
      newAngles,
      platformEntries,
      platformExits,
      alertCount: compAlerts.length,
    };
  });

  competitors.sort((a, b) => (b.activityScore ?? 0) - (a.activityScore ?? 0));

  return {
    brandId,
    brandName: brand.name,
    periodLabel,
    startIso,
    endIso,
    competitors,
  };
}
