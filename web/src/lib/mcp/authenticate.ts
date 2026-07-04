import type { McpAuthContext } from "@/lib/mcp/types";
import { isValidMcpApiKeyFormat, hashMcpApiKey } from "@/lib/mcp/api-key";
import { getMcpAppOrigin } from "@/lib/mcp/oauth/app-origin";
import { verifyMcpAccessToken } from "@/lib/mcp/oauth/tokens";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function authenticateApiKey(token: string): Promise<McpAuthContext | null> {
  const keyHash = hashMcpApiKey(token);
  const admin = createSupabaseAdminClient();

  const { data: row, error } = await admin
    .from("mcp_api_keys")
    .select("id, user_id")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !row?.user_id || !row.id) return null;

  void admin
    .from("mcp_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  return {
    userId: row.user_id,
    keyId: row.id,
    appOrigin: getMcpAppOrigin(),
    authMethod: "api_key",
  };
}

function authenticateOAuthAccessToken(token: string): McpAuthContext | null {
  const payload = verifyMcpAccessToken(token);
  if (!payload) return null;
  return {
    userId: payload.user_id,
    oauthClientId: payload.client_id,
    appOrigin: getMcpAppOrigin(),
    authMethod: "oauth",
  };
}

export function parseBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.trim()) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!m?.[1]) return null;
  return m[1].trim();
}

export function rejectNonBearerScheme(authHeader: string | null): boolean {
  if (!authHeader?.trim()) return false;
  return !/^Bearer\s+/i.test(authHeader.trim());
}

export async function authenticateMcpRequest(
  authHeader: string | null,
): Promise<McpAuthContext | null> {
  const token = parseBearerToken(authHeader);
  if (!token) return null;

  if (isValidMcpApiKeyFormat(token)) {
    return authenticateApiKey(token);
  }

  return authenticateOAuthAccessToken(token);
}

export function mcpRateLimitKey(auth: McpAuthContext): string {
  if (auth.authMethod === "api_key" && auth.keyId) return `key:${auth.keyId}`;
  return `oauth:${auth.userId}:${auth.oauthClientId ?? "unknown"}`;
}
