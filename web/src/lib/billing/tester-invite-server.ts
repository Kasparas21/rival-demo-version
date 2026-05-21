import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getTesterInviteCodeFromRequest,
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
