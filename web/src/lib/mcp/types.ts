import type { PlanTier } from "@/lib/billing/plan-limits";

export type McpErrorCode =
  | "not_tracked"
  | "no_cache"
  | "no_data"
  | "not_found"
  | "rate_limited"
  | "plan_gated"
  | "invalid_input"
  | "unauthorized";

export type McpToolErrorBody = {
  ok: false;
  code: McpErrorCode;
  message: string;
  dashboard_url?: string;
};

export type McpAuthContext = {
  userId: string;
  keyId?: string;
  oauthClientId?: string;
  appOrigin: string;
  authMethod: "api_key" | "oauth";
};

export type McpBillingContext = {
  planTier: PlanTier;
  planName: string;
  hasAccess: boolean;
  maxWatchedCompetitors: number;
  trackedCount: number;
};
