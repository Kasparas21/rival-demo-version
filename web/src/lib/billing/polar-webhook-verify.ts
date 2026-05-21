import { Webhook, WebhookVerificationError as StdWebhookVerificationError } from "standardwebhooks";

export class PolarWebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PolarWebhookSignatureError";
  }
}

export type VerifiedPolarWebhookPayload = {
  type: string;
  timestamp?: string;
  data?: unknown;
};

/**
 * Verify Polar/Standard Webhooks signature only — do not run SDK schema parsing.
 * `validateEvent()` rejects unknown event types with 400, which disables the endpoint in Polar.
 */
export function verifyPolarWebhookPayload(
  rawBody: string,
  headers: Headers,
  secret: string,
): VerifiedPolarWebhookPayload {
  const base64Secret = Buffer.from(secret, "utf-8").toString("base64");
  const webhook = new Webhook(base64Secret);
  try {
    const parsed = webhook.verify(rawBody, Object.fromEntries(headers.entries()));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new PolarWebhookSignatureError("Invalid webhook payload shape.");
    }
    const obj = parsed as Record<string, unknown>;
    const type = typeof obj.type === "string" ? obj.type.trim() : "";
    if (!type) {
      throw new PolarWebhookSignatureError("Webhook payload missing type.");
    }
    return {
      type,
      timestamp: typeof obj.timestamp === "string" ? obj.timestamp : undefined,
      data: obj.data,
    };
  } catch (e) {
    if (e instanceof PolarWebhookSignatureError) throw e;
    if (e instanceof StdWebhookVerificationError) {
      throw new PolarWebhookSignatureError(e.message);
    }
    throw e;
  }
}
