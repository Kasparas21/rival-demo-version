export function getMcpAppOrigin(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL is required");
  return url.replace(/\/$/, "");
}

export function mcpResourceUrl(): string {
  return `${getMcpAppOrigin()}/api/mcp/mcp`;
}
