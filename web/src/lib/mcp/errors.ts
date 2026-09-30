import { MCP_VISUALS_KEY, type McpImageContentBlock } from "@/lib/mcp/ad-creative-media";
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

type McpTextContent = { type: "text"; text: string };
type McpToolContent = McpTextContent | McpImageContentBlock;

function stripMcpVisuals(data: unknown): {
  json: unknown;
  visuals: McpImageContentBlock[];
} {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { json: data, visuals: [] };
  }
  const record = data as Record<string, unknown>;
  const rawVisuals = record[MCP_VISUALS_KEY];
  if (!Array.isArray(rawVisuals) || rawVisuals.length === 0) {
    return { json: data, visuals: [] };
  }
  const visuals = rawVisuals.filter((block): block is McpImageContentBlock => {
    return (
      Boolean(block) &&
      typeof block === "object" &&
      (block as McpImageContentBlock).type === "image" &&
      typeof (block as McpImageContentBlock).data === "string" &&
      typeof (block as McpImageContentBlock).mimeType === "string"
    );
  });
  const { [MCP_VISUALS_KEY]: _omitted, ...rest } = record;
  void _omitted;
  return { json: rest, visuals };
}

export function formatToolResult(data: unknown): { content: McpToolContent[] } {
  const { json, visuals } = stripMcpVisuals(data);
  return {
    content: [{ type: "text", text: JSON.stringify(json) }, ...visuals],
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
