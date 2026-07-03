import { anthropicSonnet } from "@/lib/llm/anthropic";

import type { ReportWorkspaceData } from "./report-aggregate";

export type ReportExecutiveSummary = {
  executiveSummary: string;
  focusNextMonth: string[];
};

function parseSummaryJson(text: string): ReportExecutiveSummary | null {
  const match = text.trim().match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const o = JSON.parse(match[0]) as Record<string, unknown>;
    const executiveSummary =
      typeof o.executiveSummary === "string" ? o.executiveSummary.trim() : "";
    const focusRaw = o.focusNextMonth;
    const focusNextMonth = Array.isArray(focusRaw)
      ? focusRaw.filter((x): x is string => typeof x === "string").slice(0, 5)
      : [];
    if (!executiveSummary) return null;
    return { executiveSummary, focusNextMonth };
  } catch {
    return null;
  }
}

function dataOnlyFallback(data: ReportWorkspaceData): ReportExecutiveSummary {
  const active = data.competitors.filter((c) => (c.activityScore ?? 0) > 0).length;
  return {
    executiveSummary: `Over ${data.periodLabel}, ${active} of ${data.competitors.length} tracked competitors showed meaningful ad activity. Review platform entries, new angles, and proven winners in the tables below.`,
    focusNextMonth: data.competitors
      .filter((c) => c.alertCount > 0)
      .slice(0, 3)
      .map((c) => `Monitor ${c.name} — ${c.alertCount} notable changes this period`),
  };
}

export async function generateReportExecutiveSummary(
  data: ReportWorkspaceData,
): Promise<ReportExecutiveSummary> {
  const compact = data.competitors.map((c) => ({
    name: c.name,
    activityScore: c.activityScore,
    activityScoreDelta: c.activityScoreDelta,
    newAdsCount: c.newAdsCount,
    newAngles: c.newAngles,
    platformEntries: c.platformEntries,
    platformExits: c.platformExits,
    provenWinners: c.provenWinners.length,
    alertCount: c.alertCount,
  }));

  const systemPrompt = `You write client-ready competitive intelligence summaries. Respond with ONLY valid JSON: {"executiveSummary": string (2-4 sentences), "focusNextMonth": string[] (3 concrete recommendations, imperative voice)}.`;

  const result = await anthropicSonnet({
    systemPrompt,
    messages: [
      {
        role: "user",
        content: `Workspace: ${data.brandName}\nPeriod: ${data.periodLabel}\nCompetitors JSON:\n${JSON.stringify(compact)}`,
      },
    ],
    maxTokens: 1024,
  });

  if (!result.ok) return dataOnlyFallback(data);
  const parsed = parseSummaryJson(result.text);
  if (!parsed) return dataOnlyFallback(data);
  return parsed;
}
