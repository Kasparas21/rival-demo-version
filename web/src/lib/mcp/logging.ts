export function logMcpCall(params: {
  userId: string;
  tool: string;
  durationMs: number;
  keyId?: string;
}): void {
  console.log(
    `[mcp] user=${params.userId} tool=${params.tool} duration_ms=${params.durationMs} key=${params.keyId ?? "—"}`,
  );
}
