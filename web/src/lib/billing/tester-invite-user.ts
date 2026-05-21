import type { SupabaseClient } from "@supabase/supabase-js";

import {
  matchesTesterInviteCode,
  normalizeInviteCode,
} from "@/lib/billing/tester-invite";

export const TESTER_INVITE_METADATA_KEY = "tester_invite";

export function readTesterInviteFromUserMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as Record<string, unknown>)[TESTER_INVITE_METADATA_KEY];
  if (typeof raw !== "string" || !raw.trim()) return null;
  return matchesTesterInviteCode(raw) ? normalizeInviteCode(raw) : null;
}

export async function persistTesterInviteToUserMetadata(
  admin: SupabaseClient,
  userId: string,
  inviteCode: string,
): Promise<void> {
  const normalized = normalizeInviteCode(inviteCode);
  if (!matchesTesterInviteCode(normalized)) return;

  const { data, error: readErr } = await admin.auth.admin.getUserById(userId);
  if (readErr || !data.user) {
    throw new Error(readErr?.message ?? "user_not_found");
  }

  const existing =
    data.user.user_metadata && typeof data.user.user_metadata === "object" && !Array.isArray(data.user.user_metadata)
      ? (data.user.user_metadata as Record<string, unknown>)
      : {};

  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existing,
      [TESTER_INVITE_METADATA_KEY]: normalized,
    },
  });
  if (error) throw new Error(error.message);
}
