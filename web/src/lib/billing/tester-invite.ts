import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/supabase/types";
import { OAUTH_TESTER_INVITE_COOKIE } from "@/lib/auth/oauth-bridge-cookies";

export const TESTER_INVITE_COOKIE = "rival_tester_invite";
export { OAUTH_TESTER_INVITE_COOKIE };
const TESTER_INVITE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export type TesterInviteConfig = {
  code: string;
  maxUses: number;
  expiresAtMs: number | null;
};

export type TesterInviteValidation = {
  valid: boolean;
  inviteCode: string | null;
  remaining: number;
  reason: string | null;
};

export function getTesterInviteConfig(): TesterInviteConfig | null {
  const code = process.env.TESTER_INVITE_CODE?.trim().toLowerCase();
  if (!code) return null;

  const maxUsesRaw = process.env.TESTER_INVITE_MAX_USES?.trim();
  const maxUses = maxUsesRaw ? Number.parseInt(maxUsesRaw, 10) : 10;
  if (!Number.isFinite(maxUses) || maxUses < 1) return null;

  const expiresRaw = process.env.TESTER_INVITE_EXPIRES_AT?.trim();
  let expiresAtMs: number | null = null;
  if (expiresRaw) {
    const parsed = Date.parse(expiresRaw);
    if (Number.isFinite(parsed)) expiresAtMs = parsed;
  }

  return { code, maxUses, expiresAtMs };
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toLowerCase();
}

export function matchesTesterInviteCode(raw: string): boolean {
  const config = getTesterInviteConfig();
  if (!config) return false;
  return normalizeInviteCode(raw) === config.code;
}

export function isTesterInviteExpired(config: TesterInviteConfig, nowMs = Date.now()): boolean {
  return config.expiresAtMs != null && nowMs >= config.expiresAtMs;
}

export function getTesterInviteCodeFromRequest(request: NextRequest): string | null {
  const fromQuery = request.nextUrl.searchParams.get("tester");
  if (fromQuery && matchesTesterInviteCode(fromQuery)) {
    return normalizeInviteCode(fromQuery);
  }
  const fromCookie = request.cookies.get(TESTER_INVITE_COOKIE)?.value;
  if (fromCookie && matchesTesterInviteCode(fromCookie)) {
    return normalizeInviteCode(fromCookie);
  }
  const fromOAuthBridge = request.cookies.get(OAUTH_TESTER_INVITE_COOKIE)?.value;
  if (fromOAuthBridge && matchesTesterInviteCode(fromOAuthBridge)) {
    return normalizeInviteCode(fromOAuthBridge);
  }
  return null;
}

export function setTesterInviteCookie(response: NextResponse, inviteCode: string): void {
  response.cookies.set(TESTER_INVITE_COOKIE, normalizeInviteCode(inviteCode), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TESTER_INVITE_COOKIE_MAX_AGE_SEC,
  });
}

function redirectWithoutTesterParam(request: NextRequest, response: NextResponse): NextResponse {
  if (!request.nextUrl.searchParams.has("tester")) return response;
  const url = request.nextUrl.clone();
  url.searchParams.delete("tester");
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value);
  });
  return redirect;
}

export async function countTesterInviteRedemptions(
  admin: SupabaseClient<Database>,
  inviteCode: string,
): Promise<number> {
  const { count, error } = await admin
    .from("tester_invite_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("invite_code", normalizeInviteCode(inviteCode));
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function hasUserRedeemedTesterInvite(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("tester_invite_redemptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.id);
}

export async function validateTesterInviteAccess(
  admin: SupabaseClient<Database>,
  params: { inviteCode: string | null; userId?: string | null },
): Promise<TesterInviteValidation> {
  const config = getTesterInviteConfig();
  if (!config) {
    return { valid: false, inviteCode: null, remaining: 0, reason: "not_configured" };
  }

  const inviteCode = params.inviteCode ? normalizeInviteCode(params.inviteCode) : null;
  if (!inviteCode || inviteCode !== config.code) {
    return { valid: false, inviteCode, remaining: 0, reason: "invalid_code" };
  }

  if (isTesterInviteExpired(config)) {
    return { valid: false, inviteCode, remaining: 0, reason: "expired" };
  }

  const redeemedCount = await countTesterInviteRedemptions(admin, inviteCode);
  const remaining = Math.max(0, config.maxUses - redeemedCount);

  if (params.userId) {
    const alreadyRedeemed = await hasUserRedeemedTesterInvite(admin, params.userId);
    if (alreadyRedeemed) {
      return { valid: true, inviteCode, remaining, reason: null };
    }
  }

  if (remaining <= 0) {
    return { valid: false, inviteCode, remaining: 0, reason: "full" };
  }

  return { valid: true, inviteCode, remaining, reason: null };
}

export async function recordTesterInviteRedemption(
  admin: SupabaseClient<Database>,
  params: { inviteCode: string; userId: string; polarSubscriptionId?: string | null },
): Promise<void> {
  const { error } = await admin.from("tester_invite_redemptions").upsert(
    {
      invite_code: normalizeInviteCode(params.inviteCode),
      user_id: params.userId,
      polar_subscription_id: params.polarSubscriptionId ?? null,
      redeemed_at: new Date().toISOString(),
    },
    { onConflict: "user_id", ignoreDuplicates: false },
  );
  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
}

export function isTesterInviteCheckoutRequest(request: NextRequest): boolean {
  return request.nextUrl.searchParams.get("tester") === "1";
}

export async function applyTesterInviteCookieFromRequest(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const testerParam = request.nextUrl.searchParams.get("tester")?.trim();
  if (!testerParam || testerParam === "1") return response;

  const config = getTesterInviteConfig();
  if (!config) return redirectWithoutTesterParam(request, response);

  const normalized = normalizeInviteCode(testerParam);
  if (normalized !== config.code || isTesterInviteExpired(config)) {
    return redirectWithoutTesterParam(request, response);
  }

  const nextResponse = redirectWithoutTesterParam(request, response);
  setTesterInviteCookie(nextResponse, normalized);
  return nextResponse;
}

export function testerInviteUnavailableMessage(reason: string | null): string {
  switch (reason) {
    case "expired":
      return "This tester invite has expired.";
    case "full":
      return "This tester invite has reached its signup limit.";
    case "invalid_code":
      return "This tester invite link is not valid.";
    case "not_configured":
      return "Tester invites are not available right now.";
    default:
      return "This tester invite is not available.";
  }
}
