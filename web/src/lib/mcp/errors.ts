import { MCP_VISUALS_KEY, type McpImageContentBlock } from "@/lib/mcp/ad-creative-media";
import { MCP_STRUCTURED_KEY } from "@/lib/mcp/ad-gallery-app";
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
  structuredContent?: Record<string, unknown>;
} {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { json: data, visuals: [] };
  }
  const record = data as Record<string, unknown>;
  const rawStructured = record[MCP_STRUCTURED_KEY];
  const structuredContent =
    rawStructured && typeof rawStructured === "object" && !Array.isArray(rawStructured)
      ? (rawStructured as Record<string, unknown>)
      : undefined;
  const rawVisuals = record[MCP_VISUALS_KEY];
  const visuals = Array.isArray(rawVisuals)
    ? rawVisuals.filter((block): block is McpImageContentBlock => {
        return (
          Boolean(block) &&
          typeof block === "object" &&
          (block as McpImageContentBlock).type === "image" &&
          typeof (block as McpImageContentBlock).data === "string" &&
          typeof (block as McpImageContentBlock).mimeType === "string"
        );
      })
    : [];
  if (!visuals.length && !structuredContent) {
    return { json: data, visuals: [] };
  }
  const rest = { ...record };
  delete rest[MCP_VISUALS_KEY];
  delete rest[MCP_STRUCTURED_KEY];
  return { json: rest, visuals, structuredContent };
}

export function formatToolResult(data: unknown): {
  content: McpToolContent[];
  structuredContent?: Record<string, unknown>;
} {
  const { json, visuals, structuredContent } = stripMcpVisuals(data);
  return {
    content: [{ type: "text", text: JSON.stringify(json) }, ...visuals],
    ...(structuredContent ? { structuredContent } : {}),
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
