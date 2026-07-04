import { llmSmart } from "@/lib/llm/anthropic";
import { isBrandBidAngle } from "@/lib/comparison/move-brand-bid";
import type { CompetitorStrategyOverviewPayload, StrategyPlatform } from "@/lib/strategy-overview/payload-types";

export type MoveEventType =
  | "new_platform"
  | "dropped_platform"
  | "new_angle"
  | "angle_migration"
  | "budget_shift"
  | "voice_shift";

export type MoveSignificance = "low" | "medium" | "high";

export type DetectedMove = {
  event_type: MoveEventType;
  significance: MoveSignificance;
  platform?: StrategyPlatform;
  before_state: Record<string, unknown>;
  after_state: Record<string, unknown>;
  narrative?: string;
};

function angleEvidenceHook(after: CompetitorStrategyOverviewPayload, angle: string): string | null {
  const row = after.insights.angle_clustering.angles.find((x) => x.angle === angle);
  const snip = row?.exampleSnippet?.trim();
  return snip || null;
}

export function detectMoves(
  before: CompetitorStrategyOverviewPayload,
  after: CompetitorStrategyOverviewPayload
): DetectedMove[] {
  const moves: DetectedMove[] = [];
  const brandName = after.map?.competitor?.name?.trim() || before.map?.competitor?.name?.trim() || "";

  const beforePlatforms = new Set(
    before.insights.platform_footprint.platforms.map((p) => p.platform as StrategyPlatform)
  );
  const afterPlatforms = new Set(
    after.insights.platform_footprint.platforms.map((p) => p.platform as StrategyPlatform)
  );

  for (const p of afterPlatforms) {
    if (!beforePlatforms.has(p)) {
      const row = after.insights.platform_footprint.platforms.find((x) => x.platform === p);
      moves.push({
        event_type: "new_platform",
        significance: "high",
        platform: p,
        before_state: { platforms: [...beforePlatforms] },
        after_state: { platform: p, activeAds: row?.activeAds ?? 0 },
      });
    }
  }
  for (const p of beforePlatforms) {
    if (!afterPlatforms.has(p)) {
      const row = before.insights.platform_footprint.platforms.find((x) => x.platform === p);
      moves.push({
        event_type: "dropped_platform",
        significance: "high",
        platform: p,
        before_state: { platform: p, activeAds: row?.activeAds ?? 0 },
        after_state: { platforms: [...afterPlatforms] },
      });
    }
  }

  const beforeAngles = new Set((before.insights.angles_by_platform ?? []).map((a) => a.angle));
  const afterAngles = new Set((after.insights.angles_by_platform ?? []).map((a) => a.angle));

  for (const ang of afterAngles) {
    if (!beforeAngles.has(ang)) {
      if (brandName && isBrandBidAngle(ang, brandName)) continue;

      const angleData = after.insights.angles_by_platform?.find((x) => x.angle === ang);
      if (angleData && angleData.totalCount >= 2) {
        const evidenceHook = angleEvidenceHook(after, ang);
        moves.push({
          event_type: "new_angle",
          significance: angleData.totalCount >= 5 ? "high" : "medium",
          before_state: { angle: ang, count: 0 },
          after_state: {
            angle: ang,
            count: angleData.totalCount,
            platforms: angleData.platforms,
            evidenceHook,
          },
        });
      }
    }
  }

  for (const angleAfter of after.insights.angles_by_platform ?? []) {
    if (brandName && isBrandBidAngle(angleAfter.angle, brandName)) continue;

    const angleBefore = before.insights.angles_by_platform?.find((x) => x.angle === angleAfter.angle);
    if (angleBefore && angleAfter.platforms.length > angleBefore.platforms.length) {
      const newPlats = angleAfter.platforms.filter((p) => !angleBefore.platforms.includes(p));
      if (newPlats.length > 0) {
        moves.push({
          event_type: "angle_migration",
          significance: "medium",
          before_state: { angle: angleAfter.angle, platforms: angleBefore.platforms },
          after_state: {
            angle: angleAfter.angle,
            platforms: angleAfter.platforms,
            newPlatforms: newPlats,
            evidenceHook: angleEvidenceHook(after, angleAfter.angle),
          },
        });
      }
    }
  }

  const beforeBudget = new Map(
    before.insights.budget_allocation.segments.map((s) => [s.platform, s.pct] as const)
  );
  const afterBudget = new Map(after.insights.budget_allocation.segments.map((s) => [s.platform, s.pct] as const));

  for (const [platform, afterPct] of afterBudget) {
    const beforePct = beforeBudget.get(platform as StrategyPlatform) ?? 0;
    const delta = afterPct - beforePct;
    if (Math.abs(delta) >= 20) {
      moves.push({
        event_type: "budget_shift",
        significance: Math.abs(delta) > 30 ? "high" : "medium",
        platform: platform as StrategyPlatform,
        before_state: { pct: beforePct },
        after_state: { pct: afterPct, delta },
      });
    }
  }

  const beforeVoice = new Map(
    (before.insights.voice_tone_by_platform ?? []).map((v) => [v.platform, v] as const)
  );
  for (const afterVoice of after.insights.voice_tone_by_platform ?? []) {
    const prev = beforeVoice.get(afterVoice.platform);
    if (!prev) continue;
    const dFormal = afterVoice.formal - prev.formal;
    const dEmotional = afterVoice.emotional - prev.emotional;
    if (Math.abs(dFormal) >= 0.25 || Math.abs(dEmotional) >= 0.25) {
      const mag = Math.max(Math.abs(dFormal), Math.abs(dEmotional));
      moves.push({
        event_type: "voice_shift",
        significance: mag > 0.3 ? "high" : "medium",
        platform: afterVoice.platform,
        before_state: { formal: prev.formal, emotional: prev.emotional },
        after_state: {
          formal: afterVoice.formal,
          emotional: afterVoice.emotional,
          deltaFormal: dFormal,
          deltaEmotional: dEmotional,
        },
      });
    }
  }

  return moves;
}

function moveDescriptionForNarrative(move: DetectedMove): string {
  const after = move.after_state as Record<string, unknown>;
  const before = move.before_state as Record<string, unknown>;
  switch (move.event_type) {
    case "new_angle":
      return `New creative angle "${after.angle}" with ${after.count} ads on ${JSON.stringify(after.platforms)}`;
    case "angle_migration":
      return `Angle "${after.angle}" expanded to platforms: ${JSON.stringify(after.newPlatforms)}`;
    case "new_platform":
      return `Started advertising on ${move.platform ?? after.platform}`;
    case "dropped_platform":
      return `Stopped advertising on ${move.platform ?? before.platform}`;
    case "budget_shift":
      return `Modeled budget share on ${move.platform} moved from ${before.pct}% to ${after.pct}%`;
    case "voice_shift":
      return `Voice on ${move.platform}: formal ${before.formal}→${after.formal}, emotional ${before.emotional}→${after.emotional}`;
    default:
      return JSON.stringify({ before: move.before_state, after: move.after_state });
  }
}

export async function generateMoveNarrative(move: DetectedMove): Promise<string | null> {
  if (move.significance === "low") return null;
  if (!process.env.OPENROUTER_API_KEY?.trim()) return null;
  if (move.narrative?.trim()) return move.narrative.trim();

  const after = move.after_state as { evidenceHook?: string | null };
  const evidence = (after?.evidenceHook ?? "").trim();

  const systemPrompt = `You analyze competitive intelligence moves detected from ad library diffs.
In one sentence (max 30 words), explain what this move suggests about the competitor's strategy. Be specific and actionable.
Avoid vague phrases like "strategic shift" or "key change." Output only the sentence, no preamble.`;

  const userPrompt = `Move type: ${move.event_type}
Change: ${moveDescriptionForNarrative(move)}
${evidence ? `Evidence (ad hook): ${evidence}` : ""}`;

  const result = await llmSmart({
    task: "move_detector",
    systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 200,
  });

  return result.ok ? result.text.trim() : null;
}
