import type { WatchAlertBlock } from "./types";

export async function sendWatchSlackWebhook(params: {
  webhookUrl: string;
  blocks: WatchAlertBlock[];
  overflowCount: number;
  settingsUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const url = params.webhookUrl.trim();
  if (!url) return { ok: false, error: "no webhook" };

  const sections = params.blocks.map((b) => ({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*${b.competitorName}*\n${b.headline}\n\n*Suggested move:* ${b.recommendation}`,
    },
    accessory: {
      type: "button",
      text: { type: "plain_text", text: "Investigate in Rival" },
      url: b.investigateUrl,
    },
  }));

  if (params.overflowCount > 0) {
    sections.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `+${params.overflowCount} more in Rival`,
      },
      accessory: {
        type: "button",
        text: { type: "plain_text", text: "Open Rival" },
        url: params.settingsUrl,
      },
    });
  }

  const body = {
    text: "Autopilot watch — competitor moves need your attention",
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "Autopilot watch" },
      },
      ...sections,
    ],
  };

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 5000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    if (!res.ok) {
      return { ok: false, error: `slack_http_${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "slack_failed";
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendTestSlackWebhook(webhookUrl: string, settingsUrl: string): Promise<{ ok: boolean; error?: string }> {
  const sample: WatchAlertBlock = {
    id: "sample",
    user_id: "",
    competitor_id: "",
    alert_type: "activity_spike",
    severity: "high",
    title: "Sample alert",
    body: "This is a test message from Rival Autopilot.",
    metadata: {},
    detected_at: new Date().toISOString(),
    competitorName: "Sample competitor",
    competitorHost: "example.com",
    headline: "Sample competitor activity spiked",
    recommendation: "Review their newest ads this week and note any offer or angle shifts.",
    confidence: "medium",
    investigateUrl: settingsUrl,
  };
  return sendWatchSlackWebhook({
    webhookUrl,
    blocks: [sample],
    overflowCount: 0,
    settingsUrl,
  });
}
