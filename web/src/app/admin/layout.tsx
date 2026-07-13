import { redirect } from "next/navigation";
import Link from "next/link";

import { ensureAdminUsersFromEnv, getAdminUser } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/admin")}`);
  }

  const adminClient = createSupabaseAdminClient();
  await ensureAdminUsersFromEnv(adminClient);

  const admin = await getAdminUser(supabase, user.id);
  if (!admin) {
    redirect("/dashboard/spy");
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-sm font-semibold tracking-tight">
              Rival Admin
            </Link>
            <nav className="flex items-center gap-4 text-sm text-zinc-600">
              <Link href="/admin" className="hover:text-zinc-900">
                Users
              </Link>
              <Link href="/admin/quotes" className="hover:text-zinc-900">
                Quotes
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <span>{admin.email}</span>
            <Link href="/dashboard/spy" className="text-sky-600 hover:text-sky-700">
              App
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
