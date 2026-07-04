import type { WatchAlertBlock } from "./types";

function blockToEmbedDescription(block: WatchAlertBlock): string {
  return `**${block.competitorName}**\n${block.headline}\n\n**Suggested move:** ${block.recommendation}`;
}

export async function sendWatchDiscordWebhook(params: {
  webhookUrl: string;
  blocks: WatchAlertBlock[];
  overflowCount: number;
  settingsUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const url = params.webhookUrl.trim();
  if (!url) return { ok: false, error: "no webhook" };

  const embeds = params.blocks.slice(0, 5).map((b) => ({
    title: "Autopilot watch",
    description: blockToEmbedDescription(b).slice(0, 4096),
    color: 0xf4a836,
    url: b.investigateUrl,
    timestamp: new Date().toISOString(),
  }));

  const body: Record<string, unknown> = {
    content:
      params.blocks.length > 0
        ? "Autopilot watch — competitor moves need your attention"
        : undefined,
    embeds,
  };

  if (params.overflowCount > 0) {
    body.content = `${String(body.content ?? "")}\n\n+${params.overflowCount} more in Rival: ${params.settingsUrl}`.trim();
  }

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
      return { ok: false, error: `discord_http_${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "discord_failed";
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendTestDiscordWebhook(
  webhookUrl: string,
  settingsUrl: string,
): Promise<{ ok: boolean; error?: string }> {
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
  return sendWatchDiscordWebhook({
    webhookUrl,
    blocks: [sample],
    overflowCount: 0,
    settingsUrl,
  });
}
