import { getResendApiKey } from "@/lib/email/resend-config";

export type DigestBatchEmail = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

export type DigestBatchSendResult = {
  sent: number;
  failed: number;
  batchIds: string[];
  errors: string[];
  /** Indexes into the input array that were accepted by Resend. */
  sentIndexes: number[];
};

const BATCH_SIZE = 100;

/** Send up to 100 emails per Resend batch call; continue on individual failures. */
export async function sendWeeklyDigestBatch(emails: DigestBatchEmail[]): Promise<DigestBatchSendResult> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return {
      sent: 0,
      failed: emails.length,
      batchIds: [],
      errors: ["Resend not configured"],
      sentIndexes: [],
    };
  }

  let sent = 0;
  let failed = 0;
  const batchIds: string[] = [];
  const errors: string[] = [];
  const sentIndexes: number[] = [];

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const chunk = emails.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });

      const json = (await res.json()) as {
        data?: Array<{ id?: string }>;
        error?: { message?: string };
      };

      if (!res.ok) {
        failed += chunk.length;
        errors.push(json.error?.message ?? `Batch HTTP ${res.status}`);
        continue;
      }

      const ids = json.data ?? [];
      if (ids.length !== chunk.length) {
        failed += chunk.length;
        errors.push(`Batch size mismatch: expected ${chunk.length}, got ${ids.length}`);
        continue;
      }

      sent += chunk.length;
      for (let j = 0; j < chunk.length; j += 1) {
        sentIndexes.push(i + j);
        if (ids[j]?.id) batchIds.push(ids[j]!.id!);
      }
    } catch (err) {
      failed += chunk.length;
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return { sent, failed, batchIds, errors, sentIndexes };
}

/** Fallback: sequential single sends when batch endpoint unavailable. */
export async function sendWeeklyDigestSequential(
  emails: DigestBatchEmail[],
  resend: { emails: { send: (payload: DigestBatchEmail) => Promise<{ error?: { message?: string } | null }> } }
): Promise<DigestBatchSendResult> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const email of emails) {
    const { error } = await resend.emails.send(email);
    if (error) {
      failed += 1;
      errors.push(error.message ?? "send failed");
    } else {
      sent += 1;
    }
  }

  return { sent, failed, batchIds: [], errors, sentIndexes: [] };
}

export function digestListUnsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/** Skip if a digest was sent within the last N days (default 6 — avoids duplicate sends on cron retry). */
export function wasDigestSentRecently(lastSentAt: string | null | undefined, minDays = 6): boolean {
  if (!lastSentAt) return false;
  const t = Date.parse(lastSentAt);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < minDays * 86_400_000;
}
