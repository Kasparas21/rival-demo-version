/** TikTok-only tail rows for the Detail drawer (targeting, sponsor, TikTok account, …). */

import { mergeTikTokStructuredTargeting } from "@/lib/ad-library/normalize";

export type TikTokDetailRow = { label: string; value: string };

function readStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function buildTikTokAdLibraryDetailRows(rawPayload: unknown): TikTokDetailRow[] {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return [];
  const p = rawPayload as Record<string, unknown>;
  const structured = mergeTikTokStructuredTargeting(p);

  const rows: TikTokDetailRow[] = [];
  const push = (label: string, v: unknown) => {
    const s = readStr(v);
    if (s) rows.push({ label, value: s });
  };

  push("Estimated audience", p.targetAudienceSize ?? p.adEstimatedAudience ?? p.adAudienceLine);
  push("Paid for by", p.paidForBy ?? p.advertiserPaidForBy);
  push("Advertiser location", p.advertiserLocation);

  const age = structured.targetAge || p.targetAge;
  const gender = structured.targetGender || p.targetGender;
  push("Age", age);
  push("Gender", gender);

  const ttUser = p.advertiserTtUser;
  if (ttUser && typeof ttUser === "object" && !Array.isArray(ttUser)) {
    const u = ttUser as Record<string, unknown>;
    const display = readStr(u.display_name) || readStr(u.displayName);
    const username = readStr(u.username);
    if (display) push("TikTok account", display);
    else if (username) push("TikTok account", `@${username.replace(/^@+/, "")}`);
    const followers = readStr(u.follower_count);
    if (followers) push("TikTok followers", followers);
  } else {
    push("TikTok account", p.tiktokDisplayName);
    const un = readStr(p.tiktokUsername);
    if (un && !rows.some((r) => r.label === "TikTok account")) {
      push("TikTok account", un.startsWith("@") ? un : `@${un}`);
    }
  }

  return rows;
}
