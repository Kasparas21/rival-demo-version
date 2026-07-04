-- Authorization codes for MCP OAuth 2.1 (single-use, PKCE-bound, 5 min TTL).

DO $$
BEGIN
  IF to_regclass('public.mcp_oauth_clients') IS NULL THEN
    RAISE EXCEPTION 'run 20260705130000_mcp_oauth_scaffold.sql first';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.mcp_oauth_authorization_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  client_id text NOT NULL REFERENCES public.mcp_oauth_clients (client_id) ON DELETE CASCADE,
  redirect_uri text NOT NULL,
  code_challenge text NOT NULL,
  code_challenge_method text NOT NULL DEFAULT 'S256',
  scope text NOT NULL DEFAULT 'mcp:read',
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mcp_oauth_authorization_codes_hash_active_idx
  ON public.mcp_oauth_authorization_codes (code_hash)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS mcp_oauth_authorization_codes_expires_idx
  ON public.mcp_oauth_authorization_codes (expires_at)
  WHERE used_at IS NULL;

COMMENT ON TABLE public.mcp_oauth_authorization_codes IS
  'Hashed OAuth authorization codes — consumed atomically at token exchange.';

DO $$
BEGIN
  IF to_regclass('public.mcp_oauth_authorization_codes') IS NULL THEN
    RAISE EXCEPTION 'mcp_oauth_authorization_codes table not created';
  END IF;
END $$;
