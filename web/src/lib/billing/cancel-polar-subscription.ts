import { createPolarClient } from "@/lib/billing/polar";

export type CancelPolarSubscriptionParams = {
  polarSubscriptionId?: string | null;
};

function isPolarNotFoundError(error: unknown): boolean {
  if (error && typeof error === "object" && "statusCode" in error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404) return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /\b404\b|not found/i.test(message);
}

/**
 * Immediately revoke an active Polar subscription (admin suspend flow).
 * Missing subscription ids are treated as already canceled.
 */
export async function cancelPolarSubscriptionImmediately(
  params: CancelPolarSubscriptionParams,
): Promise<{ ok: true; revoked: boolean } | { ok: false; error: string }> {
  const subscriptionId = params.polarSubscriptionId?.trim() || null;
  if (!subscriptionId) {
    return { ok: true, revoked: false };
  }

  const polar = createPolarClient();
  try {
    await polar.subscriptions.revoke({ id: subscriptionId });
    return { ok: true, revoked: true };
  } catch (error) {
    if (isPolarNotFoundError(error)) {
      return { ok: true, revoked: false };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not revoke Polar subscription.",
    };
  }
}
