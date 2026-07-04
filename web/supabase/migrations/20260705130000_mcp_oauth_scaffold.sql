-- Phase 2 scaffold only (tables + comments). Routes stay dark until MCP_OAUTH_ENABLED=true.

DO $$
BEGIN
  IF to_regclass('public.mcp_api_keys') IS NULL THEN
    RAISE EXCEPTION 'run 20260705120000_mcp_api_keys.sql first';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.mcp_oauth_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL UNIQUE,
  client_name text,
  redirect_uris jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mcp_oauth_refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  client_id text NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mcp_oauth_refresh_tokens_hash_active_idx
  ON public.mcp_oauth_refresh_tokens (token_hash)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE public.mcp_oauth_clients IS
  'Phase 2: Dynamic Client Registration for MCP OAuth 2.1 (not wired in Phase 1).';
COMMENT ON TABLE public.mcp_oauth_refresh_tokens IS
  'Phase 2: hashed refresh tokens — TTL scaffold 30d; access tokens stateless HMAC 15min; auth codes 5min single-use.';

DO $$
BEGIN
  IF to_regclass('public.mcp_oauth_clients') IS NULL THEN
    RAISE EXCEPTION 'mcp_oauth_clients table not created';
  END IF;
  IF to_regclass('public.mcp_oauth_refresh_tokens') IS NULL THEN
    RAISE EXCEPTION 'mcp_oauth_refresh_tokens table not created';
  END IF;
END $$;
