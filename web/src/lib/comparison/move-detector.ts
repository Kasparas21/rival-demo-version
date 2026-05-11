import { anthropicSonnet } from "@/lib/llm/anthropic";
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

export function detectMoves(
  before: CompetitorStrategyOverviewPayload,
  after: CompetitorStrategyOverviewPayload
): DetectedMove[] {
  const moves: DetectedMove[] = [];

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
      const angleData = after.insights.angles_by_platform?.find((x) => x.angle === ang);
      if (angleData && angleData.totalCount >= 2) {
        moves.push({
          event_type: "new_angle",
          significance: angleData.totalCount >= 5 ? "high" : "medium",
          before_state: { angle: ang, count: 0 },
          after_state: {
            angle: ang,
            count: angleData.totalCount,
            platforms: angleData.platforms,
          },
        });
      }
    }
  }

  for (const angleAfter of after.insights.angles_by_platform ?? []) {
    const angleBefore = before.insights.angles_by_platform?.find((x) => x.angle === angleAfter.angle);
    if (angleBefore && angleAfter.platforms.length > angleBefore.platforms.length) {
      const newPlats = angleAfter.platforms.filter((p) => !angleBefore.platforms.includes(p));
      if (newPlats.length > 0) {
        moves.push({
          event_type: "angle_migration",
          significance: "medium",
          before_state: { angle: angleAfter.angle, platforms: angleBefore.platforms },
          after_state: { angle: angleAfter.angle, platforms: angleAfter.platforms, newPlatforms: newPlats },
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
        significance: Math.abs(delta) >= 35 ? "high" : "medium",
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
      moves.push({
        event_type: "voice_shift",
        significance: "medium",
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

export async function generateMoveNarrative(move: DetectedMove): Promise<string | null> {
  if (move.significance !== "high") return null;
  if (!process.env.ANTHROPIC_API_KEY?.trim()) return null;

  const systemPrompt =
    "You are a marketing strategist. Given a competitor's strategic move, write ONE sentence explaining why it matters. Be specific, observant, non-speculative. No more than 25 words.";

  const userPrompt = `Move: ${move.event_type}
Platform: ${move.platform ?? "n/a"}
Before: ${JSON.stringify(move.before_state)}
After: ${JSON.stringify(move.after_state)}

Why does this matter for someone watching this competitor?`;

  const result = await anthropicSonnet({
    systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 200,
  });

  return result.ok ? result.text.trim() : null;
}
