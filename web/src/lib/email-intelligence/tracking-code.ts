import { customAlphabet } from "nanoid";

import { getInboundEmailDomain } from "@/lib/email/resend-config";

const TRACKING_NANOID = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

export function sanitizeSlugForTracking(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildTrackingCode(slug: string): string {
  const safeSlug = sanitizeSlugForTracking(slug) || "competitor";
  return `rival-${TRACKING_NANOID()}-${safeSlug}`;
}

export function buildTrackingAddress(trackingCode: string): string {
  return `${trackingCode}@${getInboundEmailDomain()}`;
}

/** Extract local-part tracking code from Resend `to` recipients. */
export function parseTrackingCodeFromAddress(to: string[] | undefined): string | null {
  if (!to?.length) return null;
  const first = to[0]?.trim().toLowerCase();
  if (!first) return null;
  const at = first.indexOf("@");
  const local = at >= 0 ? first.slice(0, at) : first;
  return local || null;
}
