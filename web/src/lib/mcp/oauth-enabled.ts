export function isMcpOAuthEnabled(): boolean {
  return process.env.MCP_OAUTH_ENABLED?.trim() === "true";
}
