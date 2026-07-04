import type { McpErrorCode, McpToolErrorBody } from "@/lib/mcp/types";

export class McpToolError extends Error {
  readonly code: McpErrorCode;
  readonly dashboardUrl?: string;

  constructor(code: McpErrorCode, message: string, dashboardUrl?: string) {
    super(message);
    this.name = "McpToolError";
    this.code = code;
    this.dashboardUrl = dashboardUrl;
  }

  toBody(): McpToolErrorBody {
    return {
      ok: false,
      code: this.code,
      message: this.message,
      ...(this.dashboardUrl ? { dashboard_url: this.dashboardUrl } : {}),
    };
  }
}

export function mcpSuccess<T extends Record<string, unknown>>(data: T): { ok: true } & T {
  return { ok: true, ...data };
}

export function formatToolResult(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
  };
}

export function formatToolError(err: unknown): { content: Array<{ type: "text"; text: string }>; isError?: true } {
  if (err instanceof McpToolError) {
    return {
      content: [{ type: "text", text: JSON.stringify(err.toBody()) }],
      isError: true,
    };
  }
  const message = err instanceof Error ? err.message : "internal_error";
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          ok: false,
          code: "invalid_input",
          message,
        } satisfies McpToolErrorBody),
      },
    ],
    isError: true,
  };
}
