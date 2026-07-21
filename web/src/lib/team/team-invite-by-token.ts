import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { normalizeInviteEmail } from "@/lib/team/invite-limits";
import {
  ownerDisplayLabel,
  setActiveWorkspaceOwner,
  type WorkspaceOwnerInfo,
} from "@/lib/team/workspace-context";

export type TeamInviteMembershipRow = Database["public"]["Tables"]["team_memberships"]["Row"];

export type TeamInvitePreview = {
  ok: true;
  inviteToken: string;
  status: string;
  invitedEmail: string;
  invitedEmailMasked: string;
  expired: boolean;
  owner: WorkspaceOwnerInfo & { displayLabel: string };
};

export type AcceptTeamInviteResult = {
  accepted: boolean;
  alreadyActive: boolean;
  ownerUserId: string;
  ownerLabel: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.length <= 2 ? local[0] ?? "*" : `${local.slice(0, 2)}…`;
  return `${visible}@${domain}`;
}

export function parseInviteToken(raw: string | undefined | null): string | null {
  const token = raw?.trim() ?? "";
  if (!token || !UUID_RE.test(token)) return null;
  return token;
}

/** Extract invite UUID from `/team/accept/{token}` paths (OAuth `next` bridge). */
export function parseTeamInviteTokenFromPath(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;
  let decoded = path.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    decoded = path.trim();
  }
  const match = decoded.match(/^\/team\/accept\/([0-9a-f-]{36})$/i);
  return parseInviteToken(match?.[1] ?? null);
}

export function isInviteExpired(row: Pick<TeamInviteMembershipRow, "invite_token_expires_at" | "status">): boolean {
  if (row.status !== "pending") return false;
  const expires = row.invite_token_expires_at;
  if (!expires) return false;
  return Date.parse(expires) < Date.now();
}

/** Token is the secret — use service role so unauthenticated invitees can preview before sign-in. */
export async function loadTeamInviteByToken(inviteToken: string): Promise<TeamInviteMembershipRow | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("team_memberships")
    .select("*")
    .eq("invite_token", inviteToken)
    .maybeSingle();

  return data ?? null;
}

async function loadOwnerInfo(ownerUserId: string): Promise<WorkspaceOwnerInfo> {
  const admin = createSupabaseAdminClient();
  const { data: owner } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", ownerUserId)
    .maybeSingle();

  return {
    ownerUserId,
    ownerEmail: owner?.email ?? null,
    ownerName: owner?.full_name ?? null,
  };
}

export async function getTeamInvitePreview(
  inviteToken: string,
): Promise<TeamInvitePreview | { ok: false; error: string; status: number }> {
  const row = await loadTeamInviteByToken(inviteToken);
  if (!row) {
    return { ok: false, error: "Invite not found.", status: 404 };
  }

  if (row.status === "revoked") {
    return { ok: false, error: "This invite was revoked.", status: 410 };
  }

  const expired = isInviteExpired(row);
  if (row.status === "pending" && expired) {
    return { ok: false, error: "This invite has expired.", status: 410 };
  }

  const owner = await loadOwnerInfo(row.owner_user_id);

  return {
    ok: true,
    inviteToken,
    status: row.status,
    invitedEmail: row.invited_email,
    invitedEmailMasked: maskEmail(row.invited_email),
    expired,
    owner: {
      ...owner,
      displayLabel: ownerDisplayLabel(owner),
    },
  };
}

export async function acceptTeamInviteByToken(
  supabase: SupabaseClient<Database>,
  inviteToken: string,
  sessionUserId: string,
  sessionEmail: string | null | undefined,
): Promise<AcceptTeamInviteResult | { ok: false; error: string; status: number }> {
  const row = await loadTeamInviteByToken(inviteToken);
  if (!row) {
    return { ok: false, error: "Invite not found.", status: 404 };
  }

  if (row.status === "revoked") {
    return { ok: false, error: "This invite was revoked.", status: 410 };
  }

  if (row.status === "pending" && isInviteExpired(row)) {
    return { ok: false, error: "This invite has expired.", status: 410 };
  }

  const normalizedSessionEmail = sessionEmail ? normalizeInviteEmail(sessionEmail) : "";
  const normalizedInvitedEmail = normalizeInviteEmail(row.invited_email);

  if (!normalizedSessionEmail || normalizedSessionEmail !== normalizedInvitedEmail) {
    return {
      ok: false,
      error: `Sign in as ${row.invited_email} to accept this invite.`,
      status: 403,
    };
  }

  const owner = await loadOwnerInfo(row.owner_user_id);

  if (row.status === "active" && row.member_user_id === sessionUserId) {
    await setActiveWorkspaceOwner(supabase, sessionUserId, row.owner_user_id);
    return {
      accepted: false,
      alreadyActive: true,
      ownerUserId: row.owner_user_id,
      ownerLabel: ownerDisplayLabel(owner),
    };
  }

  if (row.status === "active" && row.member_user_id && row.member_user_id !== sessionUserId) {
    return { ok: false, error: "This invite was already accepted by another account.", status: 409 };
  }

  if (row.status !== "pending" && row.status !== "active") {
    return { ok: false, error: "This invite is no longer valid.", status: 410 };
  }

  const now = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("team_memberships")
    .update({
      member_user_id: sessionUserId,
      status: "active",
      accepted_at: row.accepted_at ?? now,
    })
    .eq("id", row.id)
    .in("status", ["pending", "active"]);

  if (upErr) {
    return { ok: false, error: upErr.message, status: 500 };
  }

  await setActiveWorkspaceOwner(supabase, sessionUserId, row.owner_user_id);

  return {
    accepted: true,
    alreadyActive: false,
    ownerUserId: row.owner_user_id,
    ownerLabel: ownerDisplayLabel(owner),
  };
}
