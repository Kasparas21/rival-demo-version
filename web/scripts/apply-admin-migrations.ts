/**
 * Applies custom pricing + admin dashboard migrations to the linked Supabase project.
 *
 * Requires DATABASE_URL in .env.local (Supabase → Project Settings → Database →
 * Connection string → URI, with your database password).
 *
 * Usage: npm run db:apply-admin
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });

const MIGRATIONS = [
  "supabase/migrations/20260713120000_custom_quotes_admin.sql",
  "supabase/migrations/20260713130000_seed_admin_users.sql",
  "supabase/migrations/20260713140000_complimentary_quotes_zero_price.sql",
];

function projectSqlEditorUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname;
    const ref = host.split(".")[0];
    if (!ref) return null;
    return `https://supabase.com/dashboard/project/${ref}/sql/new`;
  } catch {
    return null;
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
  const editorUrl = projectSqlEditorUrl();

  if (!databaseUrl) {
    console.error("DATABASE_URL is not set in .env.local.\n");
    console.error("Option A — SQL Editor (fastest):");
    if (editorUrl) console.error(`  1. Open ${editorUrl}`);
    else console.error("  1. Open your Supabase project → SQL Editor");
    console.error("  2. Paste and run the SQL from these files:");
    for (const file of MIGRATIONS) console.error(`     - ${file}`);
    console.error("\nOption B — CLI:");
    console.error("  Add DATABASE_URL to .env.local, then run: npm run db:apply-admin");
    process.exit(1);
  }

  let postgres: typeof import("postgres").default;
  try {
    ({ default: postgres } = await import("postgres"));
  } catch {
    console.error("Install dependencies first: npm install");
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { ssl: "require", max: 1 });

  try {
    for (const relativePath of MIGRATIONS) {
      const fullPath = resolve(process.cwd(), relativePath);
      const contents = readFileSync(fullPath, "utf8");
      console.log(`Applying ${relativePath}…`);
      await sql.unsafe(contents);
      console.log(`✓ ${relativePath}`);
    }
    console.log("\nDone. Wait ~10s for PostgREST schema cache, then retry Send & copy checkout link.");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("\nMigration failed:", message);
    if (editorUrl) console.error(`\nYou can also run the SQL manually: ${editorUrl}`);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

void main();
