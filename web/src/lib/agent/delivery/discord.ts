export function buildDiscordEmbed(bodyMarkdown: string, screenshotUrls: string[]) {
  return {
    title: "Rival Intel",
    description: bodyMarkdown.slice(0, 4096),
    color: 0xf4a836,
    timestamp: new Date().toISOString(),
    ...(screenshotUrls[0] ? { image: { url: screenshotUrls[0] } } : {}),
  };
}

export async function deliverDiscord(
  webhookUrl: string,
  bodyMarkdown: string,
  screenshotUrls: string[],
): Promise<boolean> {
  if (!webhookUrl.trim()) return false;

  const url = webhookUrl.trim();
  const embed = buildDiscordEmbed(bodyMarkdown, screenshotUrls);

  const mainRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!mainRes.ok) return false;

  for (const extraUrl of screenshotUrls.slice(1, 3)) {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: extraUrl }),
    });
  }

  return true;
}

export async function deliverDiscordTest(webhookUrl: string): Promise<boolean> {
  return deliverDiscord(
    webhookUrl,
    "**Rival Agent test**\n\nYour Discord webhook is connected. You'll receive competitive intelligence alerts here when high-signal moves are detected.",
    [],
  );
}
