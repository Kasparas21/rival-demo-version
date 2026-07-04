import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  generateOpaqueToken,
  hashOpaqueToken,
  MCP_REFRESH_TOKEN_TTL_MS,
} from "@/lib/mcp/oauth/tokens";

export async function issueRefreshToken(userId: string, clientId: string): Promise<string> {
  const plaintext = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(plaintext);
  const expiresAt = new Date(Date.now() + MCP_REFRESH_TOKEN_TTL_MS).toISOString();

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("mcp_oauth_refresh_tokens").insert({
    user_id: userId,
    client_id: clientId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) throw new Error(error.message);
  return plaintext;
}

export type RotatedRefresh = {
  userId: string;
  clientId: string;
};

export async function rotateRefreshToken(refreshPlaintext: string): Promise<RotatedRefresh | null> {
  const tokenHash = hashOpaqueToken(refreshPlaintext.trim());
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: row, error: findErr } = await admin
    .from("mcp_oauth_refresh_tokens")
    .select("id, user_id, client_id")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .maybeSingle();

  if (findErr || !row) return null;

  const { error: revokeErr } = await admin
    .from("mcp_oauth_refresh_tokens")
    .update({ revoked_at: now })
    .eq("id", row.id)
    .is("revoked_at", null);

  if (revokeErr) return null;

  return { userId: row.user_id, clientId: row.client_id };
}

export async function revokeRefreshTokensForUserClient(userId: string, clientId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  await admin
    .from("mcp_oauth_refresh_tokens")
    .update({ revoked_at: now })
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .is("revoked_at", null);
}

export async function listActiveOAuthConnections(userId: string) {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: tokens, error } = await admin
    .from("mcp_oauth_refresh_tokens")
    .select("client_id, created_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const byClient = new Map<string, string>();
  for (const t of tokens ?? []) {
    if (!byClient.has(t.client_id)) byClient.set(t.client_id, t.created_at);
  }

  const clientIds = [...byClient.keys()];
  if (!clientIds.length) return [];

  const { data: clients } = await admin
    .from("mcp_oauth_clients")
    .select("client_id, client_name")
    .in("client_id", clientIds);

  const nameById = new Map((clients ?? []).map((c) => [c.client_id, c.client_name ?? "AI app"]));

  return clientIds.map((clientId) => ({
    client_id: clientId,
    client_name: nameById.get(clientId) ?? "AI app",
    connected_at: byClient.get(clientId)!,
  }));
}
