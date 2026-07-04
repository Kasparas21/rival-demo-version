import { NextResponse } from "next/server";

import { generateMcpApiKeyPlaintext, hashMcpApiKey } from "@/lib/mcp/api-key";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("mcp_api_keys")
    .select("id, label, key_hint, created_at, last_used_at, revoked_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    keys: (data ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      created_at: row.created_at,
      last_used_at: row.last_used_at,
      masked: `rvl_...${row.key_hint}`,
    })),
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let label = "Default";
  try {
    const body = (await req.json()) as { label?: string };
    if (typeof body.label === "string" && body.label.trim()) {
      label = body.label.trim().slice(0, 80);
    }
  } catch {
    // optional body
  }

  const plaintext = generateMcpApiKeyPlaintext();
  const keyHash = hashMcpApiKey(plaintext);

  const { data: inserted, error } = await supabase
    .from("mcp_api_keys")
    .insert({
      user_id: user.id,
      key_hash: keyHash,
      key_hint: plaintext.slice(-4),
      label,
    })
    .select("id, label, created_at")
    .single();

  if (error || !inserted) {
    return NextResponse.json({ ok: false, error: error?.message ?? "create_failed" }, { status: 500 });
  }

  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "https://spy-rival.com";

  return NextResponse.json({
    ok: true,
    key: {
      id: inserted.id,
      label: inserted.label,
      created_at: inserted.created_at,
      plaintext,
      claude_mcp_add: `claude mcp add rival --transport http ${appOrigin}/api/mcp/mcp --header "Authorization: Bearer ${plaintext}"`,
      cursor_config_snippet: {
        mcpServers: {
          rival: {
            url: `${appOrigin}/api/mcp/mcp`,
            headers: { Authorization: `Bearer ${plaintext}` },
          },
        },
      },
    },
  });
}
