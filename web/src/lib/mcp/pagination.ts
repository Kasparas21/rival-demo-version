import { z } from "zod";

/** Default page size for most list tools. */
export const MCP_PAGE_DEFAULT = 50;

/** Standard max page size (ads, alerts, angles). */
export const MCP_PAGE_MAX = 200;

/** Copy vault / proven winners can return larger pages. */
export const MCP_PAGE_MAX_VAULT = 500;

export type McpPagination = {
  limit: number;
  offset: number;
  total: number;
  has_more: boolean;
  next_offset: number | null;
};

export function parseMcpPage(
  input: { limit?: number; offset?: number },
  opts?: { defaultLimit?: number; maxLimit?: number },
): { limit: number; offset: number } {
  const maxLimit = opts?.maxLimit ?? MCP_PAGE_MAX;
  const defaultLimit = opts?.defaultLimit ?? MCP_PAGE_DEFAULT;
  const limit = Math.min(maxLimit, Math.max(1, input.limit ?? defaultLimit));
  const offset = Math.max(0, input.offset ?? 0);
  return { limit, offset };
}

export function buildMcpPagination(total: number, limit: number, offset: number): McpPagination {
  const has_more = offset + limit < total;
  return {
    limit,
    offset,
    total,
    has_more,
    next_offset: has_more ? offset + limit : null,
  };
}

export function paginateInMemory<T>(
  items: T[],
  limit: number,
  offset: number,
): { items: T[]; pagination: McpPagination } {
  const pagination = buildMcpPagination(items.length, limit, offset);
  return {
    items: items.slice(offset, offset + limit),
    pagination,
  };
}

export const mcpOffsetSchema = () =>
  z.number().int().min(0).optional().describe("Skip N results for pagination (default 0)");

export const mcpLimitSchema = (max: number, defaultVal: number) =>
  z
    .number()
    .int()
    .min(1)
    .max(max)
    .optional()
    .describe(`Page size (default ${defaultVal}, max ${max}). Use with offset to fetch all results.`);

export const mcpIncludeFullCopySchema = () =>
  z
    .boolean()
    .optional()
    .describe("When true, return full ad copy instead of the default 300-character preview.");
