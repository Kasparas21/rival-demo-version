import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export type AdminRole = "admin" | "viewer";

export type AdminUser = {
  userId: string;
  email: string;
  role: AdminRole;
};

export function parseAdminEmailsFromEnv(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
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
    const { data: profile } = await admin
      .from("profiles")
      .select("id, email")
      .ilike("email", email)
      .maybeSingle();
    if (!profile?.id) continue;

    await admin.from("admin_users").upsert(
      {
        user_id: profile.id,
        email: profile.email ?? email,
        role: "admin",
      },
      { onConflict: "user_id" },
    );
  }
}

/** Bearer ADMIN_SECRET or session admin_users row. */
export async function authorizeAdminRequest(
  req: Request,
  supabase: SupabaseClient<Database>,
  userId: string | null,
): Promise<{ ok: true; admin: AdminUser } | { ok: false }> {
  const adminSecret = process.env.ADMIN_SECRET?.trim();
  if (adminSecret && req.headers.get("authorization") === `Bearer ${adminSecret}`) {
    return {
      ok: true,
      admin: { userId: userId ?? "service", email: "service", role: "admin" },
    };
  }

  if (!userId) return { ok: false };
  const admin = await getAdminUser(supabase, userId);
  if (!admin) return { ok: false };
  return { ok: true, admin };
}

export function adminCanWrite(role: AdminRole): boolean {
  return role === "admin";
}
