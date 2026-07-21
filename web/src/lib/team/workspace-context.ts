import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

export type WorkspaceRole = "owner" | "viewer";

export type WorkspaceOwnerInfo = {
  ownerUserId: string;
  ownerEmail: string | null;
  ownerName: string | null;
};

export type WorkspaceContext = {
  sessionUserId: string;
  dataUserId: string;
  role: WorkspaceRole;
  isViewer: boolean;
  owner?: WorkspaceOwnerInfo;
  sharedWorkspaces: WorkspaceOwnerInfo[];
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function listActiveSharedWorkspaces(
  supabase: SupabaseClient<Database>,
  sessionUserId: string,
): Promise<WorkspaceOwnerInfo[]> {
  const { data: memberships } = await supabase
    .from("team_memberships")
    .select("owner_user_id")
    .eq("member_user_id", sessionUserId)
    .eq("status", "active");

  const ownerIds = [...new Set((memberships ?? []).map((m) => m.owner_user_id))];
  if (!ownerIds.length) return [];

  const { data: owners } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", ownerIds);

  const byId = new Map((owners ?? []).map((o) => [o.id, o]));
  return ownerIds.map((ownerUserId) => {
    const o = byId.get(ownerUserId);
    return {
      ownerUserId,
      ownerEmail: o?.email ?? null,
      ownerName: o?.full_name ?? null,
    };
  });
}

export async function resolveWorkspaceContext(
  supabase: SupabaseClient<Database>,
  sessionUserId: string,
): Promise<WorkspaceContext> {
  const sharedWorkspaces = await listActiveSharedWorkspaces(supabase, sessionUserId);

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_workspace_owner_id")
    .eq("id", sessionUserId)
    .maybeSingle();

  const activeOwnerId = profile?.active_workspace_owner_id ?? null;
  const shared = activeOwnerId
    ? sharedWorkspaces.find((w) => w.ownerUserId === activeOwnerId)
    : null;

  if (activeOwnerId && shared) {
    return {
      sessionUserId,
      dataUserId: activeOwnerId,
      role: "viewer",
      isViewer: true,
      owner: shared,
      sharedWorkspaces,
    };
  }

  return {
    sessionUserId,
    dataUserId: sessionUserId,
    role: "owner",
    isViewer: false,
    sharedWorkspaces,
  };
}

export async function setActiveWorkspaceOwner(
  supabase: SupabaseClient<Database>,
  sessionUserId: string,
  ownerUserId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      active_workspace_owner_id: ownerUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionUserId);

  if (error) {
    throw error;
  }
}

export async function acceptPendingTeamInvites(
  supabase: SupabaseClient<Database>,
  sessionUserId: string,
  email: string | null | undefined,
): Promise<{ accepted: number; ownerUserIds: string[] }> {
  const normalized = email ? normalizeEmail(email) : "";
  if (!normalized) return { accepted: 0, ownerUserIds: [] };

  const admin = createSupabaseAdminClient();
  const { data: pending, error } = await admin
    .from("team_memberships")
    .select("id, owner_user_id")
    .ilike("invited_email", normalized)
    .eq("status", "pending")
    .is("member_user_id", null);

  if (error || !pending?.length) return { accepted: 0, ownerUserIds: [] };

  const now = new Date().toISOString();
  let accepted = 0;
  const ownerUserIds: string[] = [];

  for (const row of pending) {
    const { error: upErr } = await supabase
      .from("team_memberships")
      .update({
        member_user_id: sessionUserId,
        status: "active",
        accepted_at: now,
      })
      .eq("id", row.id)
      .eq("status", "pending");

    if (!upErr) {
      accepted += 1;
      ownerUserIds.push(row.owner_user_id);
    }
  }

  if (ownerUserIds.length > 0) {
    await setActiveWorkspaceOwner(supabase, sessionUserId, ownerUserIds[ownerUserIds.length - 1]!);
  }

  return { accepted, ownerUserIds };
}

export function ownerDisplayLabel(owner: WorkspaceOwnerInfo | undefined): string {
  if (!owner) return "Shared workspace";
  return owner.ownerName?.trim() || owner.ownerEmail?.trim() || "Team workspace";
}
