-- Phase 1: per-user MCP API keys (hashed; never store plaintext).

DO $$
BEGIN
  IF to_regclass('public.autopilot_settings') IS NULL THEN
    RAISE EXCEPTION 'expected public schema tables — run prior migrations first';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.mcp_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  key_hint text NOT NULL DEFAULT '----',
  label text NOT NULL DEFAULT 'Default',
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS mcp_api_keys_key_hash_active_idx
  ON public.mcp_api_keys (key_hash)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS mcp_api_keys_user_id_idx
  ON public.mcp_api_keys (user_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.mcp_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mcp_api_keys_owner_select ON public.mcp_api_keys;
CREATE POLICY mcp_api_keys_owner_select ON public.mcp_api_keys
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS mcp_api_keys_owner_insert ON public.mcp_api_keys;
CREATE POLICY mcp_api_keys_owner_insert ON public.mcp_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS mcp_api_keys_owner_update ON public.mcp_api_keys;
CREATE POLICY mcp_api_keys_owner_update ON public.mcp_api_keys
  FOR UPDATE USING (auth.uid() = user_id);

COMMENT ON TABLE public.mcp_api_keys IS 'Hashed API keys for MCP read-only access (rvl_ prefix plaintext shown once at creation).';

DO $$
BEGIN
  IF to_regclass('public.mcp_api_keys') IS NULL THEN
    RAISE EXCEPTION 'mcp_api_keys table not created';
  END IF;
END $$;
