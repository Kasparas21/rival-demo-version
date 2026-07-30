import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

export type AdminRole = "admin" | "viewer";

/** Always allowed admin emails (also merged with ADMIN_EMAILS env). */
export const DEFAULT_ADMIN_EMAILS = [
  "attributo@yahoo.com",
  "freecardsbf2@gmail.com",
  "margentura@gmail.com",
] as const;

export type AdminUser = {
  userId: string;
  email: string;
  role: AdminRole;
};

export function parseAdminEmailsFromEnv(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim();
  const fromEnv = raw
    ? raw
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    : [];
  return [...new Set([...DEFAULT_ADMIN_EMAILS, ...fromEnv])];
}

export function isAllowlistedAdminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  const normalized = email.trim().toLowerCase();
  return parseAdminEmailsFromEnv().includes(normalized);
}

async function resolveAccountEmail(
  admin: SupabaseClient<Database>,
  userId: string,
  authEmail: string | null | undefined,
): Promise<string | null> {
  if (authEmail?.trim()) return authEmail.trim().toLowerCase();

  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  return profile?.email?.trim().toLowerCase() ?? null;
}

async function hasAdminUnlimitedBilling(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("billing_subscriptions")
    .select("raw_payload")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.raw_payload || typeof data.raw_payload !== "object" || Array.isArray(data.raw_payload)) {
    return false;
  }
  return (data.raw_payload as Record<string, unknown>).admin_unlimited === true;
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

export async function resolveAdminUser(
  admin: SupabaseClient<Database>,
  user: { id: string; email?: string | null },
): Promise<AdminUser | null> {
  const email = await resolveAccountEmail(admin, user.id, user.email);

  try {
    const existing = await getAdminUserById(admin, user.id);
    if (existing) return existing;
  } catch (e) {
    console.warn("[admin] admin_users lookup", e);
  }

  const allowlisted = isAllowlistedAdminEmail(email);
  const billingAdmin = await hasAdminUnlimitedBilling(admin, user.id);

  if (!allowlisted && !billingAdmin) {
    return null;
  }

  const displayEmail = email ?? user.email?.trim().toLowerCase() ?? "admin";

  try {
    await ensureAdminUsersFromEnv(admin);
  } catch (e) {
    console.warn("[admin] ensureAdminUsersFromEnv", e);
  }

  try {
    if (allowlisted && email) {
      const ensured = await ensureAdminUserForAccount(admin, user.id, email);
      if (ensured) return ensured;
    }
  } catch (e) {
    console.warn("[admin] ensureAdminUserForAccount", e);
  }

  // Allowlisted email or complimentary admin billing — even if admin_users table is not migrated yet.
  return syntheticAdminUser(user.id, displayEmail);
}

export async function requireAdminUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AdminUser | null> {
  return getAdminUser(supabase, userId);
}

export async function ensureAdminUsersFromEnv(
  admin: SupabaseClient<Database>,
): Promise<void> {
  const emails = parseAdminEmailsFromEnv();
  if (emails.length === 0) return;

  for (const email of emails) {
    try {
      const { data: profile } = await admin
        .from("profiles")
        .select("id, email")
        .ilike("email", email)
        .maybeSingle();
      if (!profile?.id) continue;

      const { error } = await admin.from("admin_users").upsert(
        {
          user_id: profile.id,
          email: profile.email ?? email,
          role: "admin",
        },
        { onConflict: "user_id" },
      );
      if (error) {
        console.warn("[admin] ensureAdminUsersFromEnv upsert", email, error.message);
      }
    } catch (e) {
      console.warn("[admin] ensureAdminUsersFromEnv", email, e);
    }
  }
}

/** Bearer ADMIN_SECRET or session admin_users row / allowlisted email. */
export async function authorizeAdminRequest(
  req: Request,
  supabase: SupabaseClient<Database>,
  user: { id: string; email?: string | null } | null,
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
