import { after } from "next/server";

/** Long enough for the request to reach the next invocation; it keeps running after we stop waiting. */
const DISPATCH_TIMEOUT_MS = 10_000;

/**
 * Start another cron invocation so long queues drain within the refresh window. The dispatch is handed to
 * `after()` as a promise: it used to be `void fetch(...)` inside the callback, so the platform could freeze
 * the function before the request went out. Awaiting it is optional; the response is not waited for.
 */
export function chainCronInvocation(
  req: Request,
  cronPath: string,
  opts?: { searchParams?: Record<string, string> },
): Promise<void> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.warn("[cron-chain] CRON_SECRET missing — cannot chain", cronPath);
    return Promise.resolve();
  }

  const origin = new URL(req.url).origin;
  const url = new URL(cronPath, origin);
  for (const [key, value] of Object.entries(opts?.searchParams ?? {})) {
    if (value.trim()) url.searchParams.set(key, value);
  }

  const dispatch = fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
  }).then(
    () => undefined,
    (err: unknown) => {
      if (err instanceof Error && err.name === "TimeoutError") return;
      console.error("[cron-chain] continuation failed", cronPath, err);
    },
  );
  after(() => dispatch);
  return dispatch;
}
