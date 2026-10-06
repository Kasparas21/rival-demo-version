import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

export type AdminRole = "admin" | "viewer";

export type AdminUser = {
  userId: string;
  email: string;
  role: AdminRole;
};

/**
 * Optional bootstrap list (`ADMIN_EMAILS`, comma-separated). Existing admins live in `admin_users`;
 * this only promotes an account whose verified sign-in email is listed.
 */
export function parseAdminEmailsFromEnv(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim();
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function isAllowlistedAdminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  const normalized = email.trim().toLowerCase();
  return parseAdminEmailsFromEnv().includes(normalized);
}

/** Session user from `supabase.auth.getUser()` — never `profiles`, which users can edit. */
export type AdminCandidate = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
};

/** The sign-in email, only once Supabase Auth has verified it. */
export function verifiedAuthEmail(user: AdminCandidate): string | null {
  if (!user.email_confirmed_at) return null;
  return user.email?.trim().toLowerCase() || null;
}

function syntheticAdminUser(userId: string, email: string): AdminUser {
  return { userId, email, role: "admin" };
}

export async function getAdminUserById(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<AdminUser | null> {
  const { data, error } = await admin
    .from("admin_users")
    .select("user_id, email, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    userId: data.user_id,
    email: data.email,
    role: data.role === "viewer" ? "viewer" : "admin",
  };
}

export async function getAdminUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AdminUser | null> {
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id, email, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    userId: data.user_id,
    email: data.email,
    role: data.role === "viewer" ? "viewer" : "admin",
  };
}

export async function ensureAdminUserForAccount(
  admin: SupabaseClient<Database>,
  userId: string,
  email: string | null | undefined,
): Promise<AdminUser | null> {
  if (!email?.trim()) return null;
  if (!isAllowlistedAdminEmail(email)) return null;

  const normalizedEmail = email.trim().toLowerCase();
  try {
    const { error } = await admin.from("admin_users").upsert(
      {
        user_id: userId,
        email: normalizedEmail,
        role: "admin",
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.warn("[admin] ensureAdminUserForAccount", error.message);
      return syntheticAdminUser(userId, normalizedEmail);
    }

    return (await getAdminUserById(admin, userId)) ?? syntheticAdminUser(userId, normalizedEmail);
  } catch (e) {
    console.warn("[admin] ensureAdminUserForAccount", e);
    return syntheticAdminUser(userId, normalizedEmail);
  }
}

/**
 * Admin access comes only from an `admin_users` row, or from `ADMIN_EMAILS` matching the verified
 * sign-in email. Billing flags such as `admin_unlimited` (also set for tester invites) grant usage, not the panel.
 */
export async function resolveAdminUser(
  admin: SupabaseClient<Database>,
  user: AdminCandidate,
): Promise<AdminUser | null> {
  try {
    const existing = await getAdminUserById(admin, user.id);
    if (existing) return existing;
  } catch (e) {
    console.warn("[admin] admin_users lookup", e);
  }

  const email = verifiedAuthEmail(user);
  if (!email || !isAllowlistedAdminEmail(email)) return null;

  return ensureAdminUserForAccount(admin, user.id, email);
}

export async function requireAdminUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AdminUser | null> {
  return getAdminUser(supabase, userId);
}

/** Bearer ADMIN_SECRET or session admin_users row / allowlisted verified email. */
export async function authorizeAdminRequest(
  req: Request,
  supabase: SupabaseClient<Database>,
  user: AdminCandidate | null,
): Promise<{ ok: true; admin: AdminUser } | { ok: false }> {
  const adminSecret = process.env.ADMIN_SECRET?.trim();
  if (adminSecret && req.headers.get("authorization") === `Bearer ${adminSecret}`) {
    return {
      ok: true,
      admin: { userId: user?.id ?? "service", email: "service", role: "admin" },
    };
  }

  if (!user?.id) return { ok: false };

  try {
    const adminClient = createSupabaseAdminClient();
    const adminUser = await resolveAdminUser(adminClient, user);
    if (!adminUser) return { ok: false };
    return { ok: true, admin: adminUser };
  } catch {
    const fallback = await getAdminUser(supabase, user.id);
    if (!fallback) return { ok: false };
    return { ok: true, admin: fallback };
  }
}

export function adminCanWrite(role: AdminRole): boolean {
  return role === "admin";
}
