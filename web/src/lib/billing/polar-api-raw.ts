import { getPolarEnv, isKnownPolarProductId } from "@/lib/billing/config";
import { isStarterProductId } from "@/lib/billing/upgrade-plan";

export type PolarRawSubscription = {
  id: string;
  status: string;
  product_id: string;
  productId?: string;
  customer_id?: string | null;
  cancel_at_period_end?: boolean;
  trial_end?: string | null;
  current_period_end?: string | null;
};

function polarApiBaseUrl(server: "production" | "sandbox"): string {
  return server === "sandbox" ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";
}

function readProductId(sub: PolarRawSubscription | null | undefined): string | null {
  if (!sub) return null;
  return sub.product_id?.trim() || sub.productId?.trim() || null;
}

export function isProProductId(productId: string | null | undefined): boolean {
  if (!productId?.trim()) return false;
  if (!isKnownPolarProductId(productId)) return false;
  return !isStarterProductId(productId);
}

type PolarApiResult = {
  ok: boolean;
  status: number;
  json: unknown;
  text: string;
};

async function polarApiRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<PolarApiResult> {
  const { accessToken, server } = getPolarEnv();
  const res = await fetch(`${polarApiBaseUrl(server)}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { ok: res.ok, status: res.status, json, text };
}

export async function getPolarSubscriptionRaw(
  subscriptionId: string,
): Promise<PolarRawSubscription | null> {
  const result = await polarApiRequest("GET", `/v1/subscriptions/${subscriptionId}`);
  if (!result.ok || !result.json || typeof result.json !== "object") {
    return null;
  }
  return result.json as PolarRawSubscription;
}

export async function updatePolarSubscriptionProductRaw(params: {
  subscriptionId: string;
  productId: string;
  prorationBehavior?: "prorate" | "invoice" | "next_period" | "reset";
}): Promise<PolarApiResult> {
  return polarApiRequest("PATCH", `/v1/subscriptions/${params.subscriptionId}`, {
    product_id: params.productId,
    proration_behavior: params.prorationBehavior ?? "prorate",
  });
}

export function polarApiErrorMessage(result: PolarApiResult): string {
  if (result.json && typeof result.json === "object") {
    const obj = result.json as Record<string, unknown>;
    const detail = obj.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string; message?: string } | undefined;
      if (first?.msg) return first.msg;
      if (first?.message) return first.message;
    }
    if (typeof obj.error === "string" && obj.error.trim()) return obj.error;
    if (typeof obj.message === "string" && obj.message.trim()) return obj.message;
  }
  if (result.text.trim()) {
    return result.text.length > 200 ? `${result.text.slice(0, 200)}…` : result.text;
  }
  return `Polar request failed (${result.status}).`;
}

export { readProductId };
