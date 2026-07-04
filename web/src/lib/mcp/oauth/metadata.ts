import { getMcpAppOrigin, mcpResourceUrl } from "@/lib/mcp/oauth/app-origin";

export function protectedResourceMetadata() {
  const origin = getMcpAppOrigin();
  return {
    resource: mcpResourceUrl(),
    authorization_servers: [origin],
    scopes_supported: ["mcp:read"],
    bearer_methods_supported: ["header"],
  };
}

export function authorizationServerMetadata() {
  const origin = getMcpAppOrigin();
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/api/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    scopes_supported: ["mcp:read"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  };
}
