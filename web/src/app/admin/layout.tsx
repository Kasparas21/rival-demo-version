import { redirect } from "next/navigation";
import Link from "next/link";

import { resolveAdminUser } from "@/lib/admin/auth";
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

  let admin = null;
  try {
    const adminClient = createSupabaseAdminClient();
    admin = await resolveAdminUser(adminClient, user);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Admin access check failed.";
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-sm text-zinc-700">
          <h1 className="text-lg font-semibold text-zinc-900">Admin unavailable</h1>
          <p className="mt-2">{message}</p>
          <p className="mt-3 text-zinc-500">
            If you just added custom pricing, run the Supabase migration{" "}
            <code className="rounded bg-zinc-100 px-1">20260713120000_custom_quotes_admin.sql</code> and ensure{" "}
            <code className="rounded bg-zinc-100 px-1">SUPABASE_SECRET_KEY</code> is set.
          </p>
          <Link href="/dashboard/spy" className="mt-4 inline-block text-sky-600 hover:underline">
            Back to app
          </Link>
        </div>
      </div>
    );
  }

  if (!admin) {
    const email = user.email ?? "unknown";
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="max-w-md rounded-xl border border-amber-200 bg-white p-6 text-sm text-zinc-700">
          <h1 className="text-lg font-semibold text-zinc-900">Admin access denied</h1>
          <p className="mt-2">
            Signed in as <strong>{email}</strong>. This account is not on the admin allowlist.
          </p>
          <p className="mt-3 text-zinc-500">
            Add your email to <code className="rounded bg-zinc-100 px-1">ADMIN_EMAILS</code> in{" "}
            <code className="rounded bg-zinc-100 px-1">.env.local</code>, or sign in with an allowed admin account.
          </p>
          <Link href="/dashboard/spy" className="mt-4 inline-block text-sky-600 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
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
