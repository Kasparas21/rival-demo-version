import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getTesterInviteCodeFromRequest,
  hasUserRedeemedTesterInvite,
  matchesTesterInviteCode,
  normalizeInviteCode,
  setTesterInviteCookie,
  TESTER_INVITE_COOKIE,
  validateTesterInviteAccess,
  type TesterInviteValidation,
} from "@/lib/billing/tester-invite";
import { readTesterInviteFromUserMetadata } from "@/lib/billing/tester-invite-user";

export async function getTesterInviteCodeFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const code = cookieStore.get(TESTER_INVITE_COOKIE)?.value ?? null;
  if (code && matchesTesterInviteCode(code)) {
    return normalizeInviteCode(code);
  }
  return null;
}

export async function resolveTesterInviteCodeForUser(
  userId: string,
  request?: NextRequest,
  response?: NextResponse,
): Promise<string | null> {
  const fromRequest = request ? getTesterInviteCodeFromRequest(request) : null;
  if (fromRequest) return fromRequest;

  const fromCookie = await getTesterInviteCodeFromCookies();
  if (fromCookie) return fromCookie;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  const fromMetadata = readTesterInviteFromUserMetadata(data.user.user_metadata);
  if (fromMetadata && response) {
    setTesterInviteCookie(response, fromMetadata);
  }
  return fromMetadata;
}

export async function getTesterInviteStatusForUser(
  userId?: string | null,
  request?: NextRequest,
): Promise<TesterInviteValidation & { active: boolean }> {
  const admin = createSupabaseAdminClient();
  let inviteCode: string | null = null;

  if (request) {
    inviteCode = getTesterInviteCodeFromRequest(request);
  }
  if (!inviteCode) {
    inviteCode = await getTesterInviteCodeFromCookies();
  }
  if (!inviteCode && userId) {
    inviteCode = await resolveTesterInviteCodeForUser(userId);
  }

  if (inviteCode && !(await getTesterInviteCodeFromCookies())) {
    const cookieStore = await cookies();
    cookieStore.set(TESTER_INVITE_COOKIE, normalizeInviteCode(inviteCode), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  const status = await validateTesterInviteAccess(admin, {
    inviteCode,
    userId: userId ?? null,
  });
  return { ...status, active: status.valid };
}

/**
 * Whether the complimentary tester onboarding UI should show.
 * Requires an explicit invite attribution (metadata, redemption, or invite URL) — not a stale cookie alone.
 */
export async function isTesterInviteFlowEligibleForUser(userId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();

  if (await hasUserRedeemedTesterInvite(admin, userId)) {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) return false;
    const fromMetadata = readTesterInviteFromUserMetadata(data.user.user_metadata);
    const status = await validateTesterInviteAccess(admin, {
      inviteCode: fromMetadata,
      userId,
    });
    return status.valid;
  }

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return false;

  const fromMetadata = readTesterInviteFromUserMetadata(data.user.user_metadata);
  if (!fromMetadata) return false;

  const status = await validateTesterInviteAccess(admin, {
    inviteCode: fromMetadata,
    userId,
  });
  return status.valid;
}
