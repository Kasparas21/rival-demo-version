import { createHash } from "crypto";

import type { Order } from "@polar-sh/sdk/models/components/order";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { getMetaPixelIdForCapi } from "@/lib/analytics/meta-pixel";
import { SITE_URL } from "@/lib/seo/site";

const META_CAPI_VERSION = "v23.0";

const PURCHASE_EVENT_SOURCE_URL = `${SITE_URL}/checkout`;

type MetaCapiEnv = {
  pixelId: string;
  accessToken: string;
};

type MetaPurchaseUserData = {
  em?: string[];
  fbp?: string;
  fbc?: string;
  client_ip_address?: string;
  client_user_agent?: string;
};

export type MetaPurchaseEventPayload = {
  event_name: "Purchase";
  event_time: number;
  event_id: string;
  action_source: "website";
  event_source_url: string;
  user_data: MetaPurchaseUserData;
  custom_data: {
    currency: string;
    value: number;
  };
};

function getMetaCapiEnv(): MetaCapiEnv | null {
  const pixelId = getMetaPixelIdForCapi();
  const accessToken = process.env.META_CAPI_TOKEN?.trim();
  if (!accessToken) return null;
  return { pixelId, accessToken };
}

/** SHA-256 hash for Meta CAPI PII (lowercase + trimmed email). */
export function hashMetaEmailForCapi(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase(), "utf8").digest("hex");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function readString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
  return "";
}

function readOrderId(order: Order): string {
  const record = asRecord(order);
  return readString(record.id);
}

/** Paid amount in cents — `totalAmount` after discounts and taxes. */
export function readOrderPaidAmountCents(order: Order): number | null {
  const record = asRecord(order);
  const amount = record.totalAmount ?? record.total_amount;
  if (typeof amount === "number" && Number.isFinite(amount)) return amount;
  return null;
}

function readOrderCurrency(order: Order): string {
  const currency = readString(asRecord(order).currency);
  return currency ? currency.toUpperCase() : "USD";
}

function readCustomerEmail(order: Order): string | null {
  const customer = asRecord(asRecord(order).customer);
  const email = readString(customer.email);
  return email || null;
}

function readOrderMetadata(order: Order): Record<string, unknown> {
  return asRecord(asRecord(order).metadata);
}

function readMetadataString(metadata: Record<string, unknown>, key: string): string | undefined {
  const value = readString(metadata[key]);
  return value || undefined;
}

export function buildMetaPurchaseEventFromOrder(order: Order): MetaPurchaseEventPayload | null {
  const orderId = readOrderId(order);
  const paidAmountCents = readOrderPaidAmountCents(order);
  if (!orderId || paidAmountCents == null) return null;

  const metadata = readOrderMetadata(order);
  const userData: MetaPurchaseUserData = {};

  const email = readCustomerEmail(order);
  if (email) {
    userData.em = [hashMetaEmailForCapi(email)];
  }

  const fbp = readMetadataString(metadata, "fbp");
  if (fbp) userData.fbp = fbp;

  const fbc = readMetadataString(metadata, "fbc");
  if (fbc) userData.fbc = fbc;

  const clientIp = readMetadataString(metadata, "client_ip");
  if (clientIp) userData.client_ip_address = clientIp;

  const userAgent = readMetadataString(metadata, "user_agent");
  if (userAgent) userData.client_user_agent = userAgent;

  return {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: orderId,
    action_source: "website",
    event_source_url: PURCHASE_EVENT_SOURCE_URL,
    user_data: userData,
    custom_data: {
      currency: readOrderCurrency(order),
      value: paidAmountCents / 100,
    },
  };
}

async function claimMetaPurchaseOrder(orderId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("meta_event").insert({
    order_id: orderId,
    event_name: "Purchase",
  });

  if (error?.code === "23505") {
    return false;
  }

  if (error) {
    console.error("[meta-purchase] meta_event insert failed", error.message);
    return false;
  }

  return true;
}

async function storeMetaPurchaseResponse(orderId: string, metaResponse: Json): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("meta_event")
    .update({ meta_response: metaResponse })
    .eq("order_id", orderId);

  if (error) {
    console.error("[meta-purchase] meta_event response update failed", error.message);
  }
}

/** Send a Polar `order.paid` event to Meta Conversions API. Never throws. */
export async function sendPurchaseToMeta(order: Order): Promise<void> {
  try {
    const orderId = readOrderId(order);
    if (!orderId) {
      console.error("[meta-purchase] missing order id");
      return;
    }

    const env = getMetaCapiEnv();
    if (!env) {
      console.error("[meta-purchase] missing META_CAPI_TOKEN");
      return;
    }

    const claimed = await claimMetaPurchaseOrder(orderId);
    if (!claimed) {
      return;
    }

    const event = buildMetaPurchaseEventFromOrder(order);
    if (!event) {
      console.error("[meta-purchase] unable to build Purchase payload", { orderId });
      return;
    }

    const url = `https://graph.facebook.com/${META_CAPI_VERSION}/${env.pixelId}/events?access_token=${encodeURIComponent(env.accessToken)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [event] }),
    });

    const responseText = await response.text();
    let parsedResponse: Json;
    try {
      parsedResponse = JSON.parse(responseText) as Json;
    } catch {
      parsedResponse = responseText;
    }

    await storeMetaPurchaseResponse(orderId, parsedResponse);

    if (!response.ok) {
      console.error("[meta-purchase] Meta CAPI error", response.status, responseText);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[meta-purchase] unhandled", message);
  }
}
