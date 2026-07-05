import type { WatchAlertBlock } from "./types";

export async function sendWatchSlackWebhook(params: {
  webhookUrl: string;
  blocks: WatchAlertBlock[];
  overflowCount: number;
  settingsUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const url = params.webhookUrl.trim();
  if (!url) return { ok: false, error: "no webhook" };

  const sections = params.blocks.map((b) => {
    const brandTag = b.clientBrandName ? ` · for ${b.clientBrandName}` : "";
    return {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${b.competitorName}*${brandTag}\n${b.headline}\n\n_${b.context}_\n\n*Your move:* ${b.recommendation}`,
      },
      accessory: {
        type: "button",
        text: { type: "plain_text", text: "Investigate in Rival" },
        url: b.investigateUrl,
      },
    };
  });

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
    text: "Autopilot watch - competitor moves need your attention",
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
    context:
      "Sample competitor increased paid output sharply on Meta over the past week - typical of scaling a winning creative or launching a promo.",
    recommendation:
      "Review their newest Meta ads in Rival this week. If the spike is offer-driven, run a time-boxed counter-promo test; if creative-driven, brief a hook-variant test on the same placements.",
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
