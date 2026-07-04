import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashOpaqueToken, generateOpaqueToken } from "@/lib/mcp/oauth/tokens";

const CODE_TTL_MS = 5 * 60 * 1000;

export async function createAuthorizationCode(params: {
  userId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope?: string;
}): Promise<string> {
  const plaintext = generateOpaqueToken();
  const codeHash = hashOpaqueToken(plaintext);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("mcp_oauth_authorization_codes").insert({
    code_hash: codeHash,
    user_id: params.userId,
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code_challenge: params.codeChallenge,
    code_challenge_method: params.codeChallengeMethod,
    scope: params.scope ?? "mcp:read",
    expires_at: expiresAt,
  });

  if (error) throw new Error(error.message);
  return plaintext;
}

export type ConsumedAuthorizationCode = {
  userId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
};

export async function consumeAuthorizationCode(
  codePlaintext: string,
  clientId: string,
  redirectUri: string,
): Promise<ConsumedAuthorizationCode | null> {
  const codeHash = hashOpaqueToken(codePlaintext.trim());
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("mcp_oauth_authorization_codes")
    .update({ used_at: now })
    .eq("code_hash", codeHash)
    .eq("client_id", clientId)
    .eq("redirect_uri", redirectUri)
    .is("used_at", null)
    .gt("expires_at", now)
    .select("user_id, client_id, redirect_uri, code_challenge, code_challenge_method, scope")
    .maybeSingle();

  if (error || !data) return null;

  return {
    userId: data.user_id,
    clientId: data.client_id,
    redirectUri: data.redirect_uri,
    codeChallenge: data.code_challenge,
    codeChallengeMethod: data.code_challenge_method,
    scope: data.scope,
  };
}
