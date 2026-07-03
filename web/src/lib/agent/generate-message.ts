import { openRouterChatText } from "@/lib/llm/openrouter";

import type { DetectedAgentSignal } from "./types";
import { markdownToHtml } from "./delivery/markdown-to-html";

export async function generateAgentMessage(params: {
  competitorName: string;
  brandContext: string | null;
  signals: DetectedAgentSignal[];
  isCrossCompetitor?: boolean;
}): Promise<{ subject: string; body_markdown: string; body_html: string } | null> {
  const { competitorName, brandContext, signals, isCrossCompetitor } = params;
  const sorted = [...signals].sort((a, b) => b.threat_score - a.threat_score);
  const topSignals = sorted.slice(0, 3);

  const productDesc = brandContext?.trim() || "a SaaS product";
  const competitorLabel = isCrossCompetitor ? "Multiple competitors" : competitorName;

  const bodyPrompt = `You are Rival's competitive intelligence agent. Your job is to write a clear, detailed, actionable intelligence message for a founder or marketer about what their competitor is doing.

Competitor: ${competitorLabel}
User's product: ${productDesc}

Signals detected (ordered by importance):
${JSON.stringify(topSignals, null, 2)}

Write a complete intelligence message with this exact structure. Use plain English. Be direct and specific. No fluff. No generic advice. Write like a sharp analyst sending a voice note to their boss — confident, clear, opinionated.

Structure:

## ${isCrossCompetitor ? "Your competitors are converging" : `${competitorName} is making a move`} — here's what you need to do

### What happened
[1-2 paragraphs. What the competitor did, in plain English. Be specific — name the platform, the hook, the format, how long it's been running. Reference the actual data from the signals.]

### The data behind it
[Bullet points of the raw proof. Days running, platforms, engagement numbers, frequency, comparison to their own historical baseline. Make it feel like real evidence, not estimates.]

### Why this matters for you
[1 paragraph. Strategic interpretation. What this tells you about where the competitor is heading. Is this a new direction for them or doubling down on something? What does it mean for your market position?]

### What you need to do
[1 clear directive. Not a list of options — one move. Be specific about what to test, what to change, what to watch. Include urgency context — do they have a window or is it already late?]

### Urgency
[One line: High / Medium / Watch. And why.]

Do not include any CTAs to visit the Rival dashboard.
Do not suggest creating content — only advise on what to do strategically.
Write in second person (you/your).`;

  const bodyResult = await openRouterChatText({
    messages: [{ role: "user", content: bodyPrompt }],
    maxCompletionTokens: 1500,
  });

  if (!bodyResult.ok) {
    console.error("[rival-agent] message generation failed", bodyResult.error);
    return null;
  }

  const bodyMarkdown = bodyResult.text;

  const subjectPrompt = `Write a short email subject line (max 8 words) for this competitive intelligence alert about ${competitorLabel}.
It should feel urgent and specific, not generic. No emoji. No clickbait.
Examples: "Notion is running their best ad of Q3", "Webflow just shifted strategy — watch this"
Return only the subject line, nothing else.
Message summary: ${bodyMarkdown.slice(0, 300)}`;

  const subjectResult = await openRouterChatText({
    messages: [{ role: "user", content: subjectPrompt }],
    maxCompletionTokens: 50,
  });

  const subject = subjectResult.ok
    ? subjectResult.text.replace(/^["']|["']$/g, "").trim()
    : `${competitorLabel}: competitive move detected`;

  return {
    subject,
    body_markdown: bodyMarkdown,
    body_html: markdownToHtml(bodyMarkdown),
  };
}

export async function generateWeeklyBriefMessage(params: {
  signals: Array<Record<string, unknown>>;
}): Promise<{ subject: string; body_markdown: string; body_html: string } | null> {
  const weekLabel = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });

  const prompt = `You are Rival's competitive intelligence agent writing a weekly brief.

Here are all the competitive signals detected this week across the user's tracked competitors:
${JSON.stringify(params.signals, null, 2)}

Write a weekly intelligence brief with this structure:

## Your competitors this week — here's what mattered

### The 3 most important things that happened
[For each: what happened, which competitor, why it matters, what to do. Be specific. Reference real data. No generic observations.]

### One thing to watch next week
[The signal that hasn't fully developed yet but is worth monitoring. What to look for and when to act.]

### What your competitors want you to miss
[The subtle move that's easy to overlook but strategically important. Could be a slow burn — a format they're testing quietly, a platform shift, a messaging change. Something a lazy analyst would skip.]

Write in plain English. Opinionated. Direct. Like a trusted advisor, not a report generator.
Do not pad with generic marketing advice. Every sentence should reference real signals.
Do not include CTAs to visit the Rival dashboard.`;

  const result = await openRouterChatText({
    messages: [{ role: "user", content: prompt }],
    maxCompletionTokens: 2000,
  });

  if (!result.ok) {
    console.error("[rival-agent] weekly brief generation failed", result.error);
    return null;
  }

  const bodyMarkdown = result.text;
  return {
    subject: `Your competitive brief — week of ${weekLabel}`,
    body_markdown: bodyMarkdown,
    body_html: markdownToHtml(bodyMarkdown),
  };
}
