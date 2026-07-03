export type SlackBlock = Record<string, unknown>;

export function buildSlackBlocks(bodyMarkdown: string, screenshotUrls: string[]): { blocks: SlackBlock[] } {
  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "Rival Intel", emoji: true },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: bodyMarkdown.slice(0, 3000) },
    },
  ];

  for (const url of screenshotUrls.slice(0, 3)) {
    blocks.push({
      type: "image",
      image_url: url,
      alt_text: "Competitor creative",
    });
  }

  return { blocks };
}

export async function deliverSlack(webhookUrl: string, bodyMarkdown: string, screenshotUrls: string[]): Promise<boolean> {
  if (!webhookUrl.trim()) return false;

  const payload = buildSlackBlocks(bodyMarkdown, screenshotUrls);
  const response = await fetch(webhookUrl.trim(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return response.ok;
}

export async function deliverSlackTest(webhookUrl: string): Promise<boolean> {
  return deliverSlack(
    webhookUrl,
    "*Rival Agent test*\n\nYour Slack webhook is connected. You'll receive competitive intelligence alerts here when high-signal moves are detected.",
    [],
  );
}
