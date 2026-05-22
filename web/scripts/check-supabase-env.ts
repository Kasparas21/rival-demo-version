/**
 * Validates Supabase env keys against the live project (no secrets printed).
 * Usage: npm run check:supabase-env
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
const publishable =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const secret =
  process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

function keyKind(value: string | undefined): string {
  if (!value) return "missing";
  if (value.startsWith("sb_publishable_")) return "publishable";
  if (value.startsWith("sb_secret_")) return "secret";
  if (value.startsWith("eyJ")) return "jwt";
  return "unknown";
}

async function probe(label: string, apikey: string | undefined): Promise<boolean> {
  if (!url || !apikey) {
    console.log(`✗ ${label}: not configured`);
    return false;
  }
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey } });
    if (res.ok) {
      console.log(`✓ ${label}: OK (${keyKind(apikey)})`);
      return true;
    }
    const body = await res.text();
    console.log(`✗ ${label}: HTTP ${res.status} — ${body.slice(0, 120)}`);
    return false;
  } catch (e) {
    console.log(`✗ ${label}: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

async function main() {
  console.log("Supabase env check\n");
  if (!url) {
    console.log("✗ NEXT_PUBLIC_SUPABASE_URL is missing");
    process.exit(1);
  }
  console.log(`Project URL: ${url}\n`);

  const clientOk = await probe("Client key (publishable/anon)", publishable);
  const serverOk = await probe("Server key (secret/service_role)", secret);

  if (!clientOk) {
    console.log(`
Fix client auth (browser login, middleware, /auth/callback):
  1. Open Supabase Dashboard → your project → Project Settings → API Keys
  2. Copy the **Publishable** key (sb_publishable_…) OR legacy **anon** JWT
  3. Set in web/.env.local:
       NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<paste here>
     — or —
       NEXT_PUBLIC_SUPABASE_ANON_KEY=<legacy anon JWT>
  4. Restart \`npm run dev\`
`);
  }

  process.exit(clientOk && serverOk ? 0 : 1);
}

void main();
