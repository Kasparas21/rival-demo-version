import { isMissingDbColumnError } from "@/lib/supabase/postgrest-schema-error";

const ADMIN_MIGRATION_FILES = [
  "supabase/migrations/20260713120000_custom_quotes_admin.sql",
  "supabase/migrations/20260713130000_seed_admin_users.sql",
] as const;

export function supabaseSqlEditorUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  if (!raw) return null;
  try {
    const ref = new URL(raw).hostname.split(".")[0];
    return ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : null;
  } catch {
    return null;
  }
}

export function isMissingCustomQuotesTableError(message: string | undefined): boolean {
  const m = String(message ?? "").toLowerCase();
  if (!m.includes("custom_quotes")) return false;
  return (
    m.includes("schema cache") ||
    m.includes("could not find") ||
    m.includes("does not exist") ||
    isMissingDbColumnError(message, "custom_quotes")
  );
}

export function customQuotesMigrationHelp(): string {
  const editor = supabaseSqlEditorUrl();
  const files = ADMIN_MIGRATION_FILES.join(", ");
  const editorLine = editor
    ? `Open Supabase SQL Editor (${editor}), paste and run the migrations, wait ~10 seconds, then retry.`
    : "Open your Supabase project SQL Editor, run the admin migrations, wait ~10 seconds, then retry.";
  return `Admin database tables are missing (${files}). ${editorLine} Or set DATABASE_URL in .env.local and run: npm run db:apply-admin`;
}
