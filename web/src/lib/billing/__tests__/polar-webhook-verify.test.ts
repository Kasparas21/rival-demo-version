import { randomUUID } from "crypto";
import { Webhook } from "standardwebhooks";
import { describe, expect, it } from "vitest";

import {
  PolarWebhookSignatureError,
  verifyPolarWebhookPayload,
} from "../polar-webhook-verify";

const WEBHOOK_SECRET = "test_polar_webhook_secret";

function signedHeaders(body: string): Headers {
  const webhookId = randomUUID();
  const timestamp = new Date();
  const webhook = new Webhook(Buffer.from(WEBHOOK_SECRET, "utf-8").toString("base64"));
  const signature = webhook.sign(webhookId, timestamp, body);
  return new Headers({
    "webhook-id": webhookId,
    "webhook-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
    "webhook-signature": signature,
  });
}

describe("verifyPolarWebhookPayload", () => {
  it("accepts signed payloads for event types the app ignores", () => {
    const body = JSON.stringify({
      type: "checkout.updated",
      data: { id: "chk_1" },
    });
    const payload = verifyPolarWebhookPayload(body, signedHeaders(body), WEBHOOK_SECRET);
    expect(payload.type).toBe("checkout.updated");
  });

  it("rejects invalid signatures", () => {
    const body = JSON.stringify({ type: "subscription.updated", data: {} });
    expect(() =>
      verifyPolarWebhookPayload(body, new Headers(), WEBHOOK_SECRET),
    ).toThrow(PolarWebhookSignatureError);
  });
});
