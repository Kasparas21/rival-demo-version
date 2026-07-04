export function buildSlackAuthorizeUrl(state: string, redirectUri: string): string {
  const clientId = process.env.SLACK_CLIENT_ID?.trim();
  if (!clientId) throw new Error("SLACK_CLIENT_ID is not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "incoming-webhook",
    redirect_uri: redirectUri,
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export type SlackOAuthExchangeResult =
  | {
      ok: true;
      webhookUrl: string;
      channel?: string;
      configurationUrl?: string;
      teamName?: string;
    }
  | { ok: false };

export async function exchangeSlackOAuthCode(
  code: string,
  redirectUri: string,
): Promise<SlackOAuthExchangeResult> {
  const clientId = process.env.SLACK_CLIENT_ID?.trim();
  const clientSecret = process.env.SLACK_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return { ok: false };

  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) return { ok: false };

  const data = (await res.json()) as {
    ok?: boolean;
    incoming_webhook?: {
      url?: string;
      channel?: string;
      configuration_url?: string;
    };
    team?: { name?: string };
  };

  if (!data.ok || !data.incoming_webhook?.url) return { ok: false };

  return {
    ok: true,
    webhookUrl: data.incoming_webhook.url,
    channel: data.incoming_webhook.channel,
    configurationUrl: data.incoming_webhook.configuration_url,
    teamName: data.team?.name,
  };
}
