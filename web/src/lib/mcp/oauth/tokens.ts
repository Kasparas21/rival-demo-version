import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const TOKEN_VERSION = "mcp1";
const ACCESS_TTL_SEC = 15 * 60;

export type McpAccessTokenPayload = {
  v: typeof TOKEN_VERSION;
  user_id: string;
  client_id: string;
  scope: string;
  exp: number;
};

function signingSecret(): string {
  const s =
    process.env.MCP_OAUTH_SIGNING_SECRET?.trim() ||
    process.env.INTEGRATIONS_OAUTH_STATE_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim();
  if (!s || s.length < 32) {
    throw new Error("MCP_OAUTH_SIGNING_SECRET (32+ bytes) is required for OAuth access tokens");
  }
  return s;
}

function sign(encoded: string): string {
  return createHmac("sha256", signingSecret()).update(encoded).digest("base64url");
}

export function createMcpAccessToken(params: {
  userId: string;
  clientId: string;
  scope?: string;
}): string {
  const payload: McpAccessTokenPayload = {
    v: TOKEN_VERSION,
    user_id: params.userId,
    client_id: params.clientId,
    scope: params.scope ?? "mcp:read",
    exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SEC,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyMcpAccessToken(token: string): McpAccessTokenPayload | null {
  const raw = token.trim();
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const encoded = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!encoded || !sig) return null;

  let expected: string;
  try {
    expected = sign(encoded);
  } catch {
    return null;
  }

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  let payload: McpAccessTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as McpAccessTokenPayload;
  } catch {
    return null;
  }

  if (payload.v !== TOKEN_VERSION || !payload.user_id || !payload.client_id) return null;
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (payload.scope !== "mcp:read") return null;

  return payload;
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string): string {
  return createHmac("sha256", signingSecret()).update(token).digest("hex");
}

export const MCP_ACCESS_TOKEN_TTL_SEC = ACCESS_TTL_SEC;
export const MCP_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
