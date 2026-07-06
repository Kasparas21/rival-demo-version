import { after } from "next/server";

/** Fire-and-forget another cron invocation so long queues drain within the refresh window. */
export function chainCronInvocation(
  req: Request,
  cronPath: string,
  opts?: { searchParams?: Record<string, string> },
): void {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.warn("[cron-chain] CRON_SECRET missing — cannot chain", cronPath);
    return;
  }

  const origin = new URL(req.url).origin;
  const url = new URL(cronPath, origin);
  for (const [key, value] of Object.entries(opts?.searchParams ?? {})) {
    if (value.trim()) url.searchParams.set(key, value);
  }

  const target = url.toString();
  after(() => {
    void fetch(target, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    }).catch((err) => {
      console.error("[cron-chain] continuation failed", cronPath, err);
    });
  });
}
