import type { SupabaseClient } from "@supabase/supabase-js";

import type { McpAuthContext, McpBillingContext } from "@/lib/mcp/types";
import { loadMcpBillingContext } from "@/lib/mcp/plan-gates";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

export type McpToolContext = {
  auth: McpAuthContext;
  supabase: SupabaseClient<Database>;
  billing: McpBillingContext;
};

export async function createMcpToolContext(auth: McpAuthContext): Promise<McpToolContext> {
  const supabase = createSupabaseAdminClient();
  const billing = await loadMcpBillingContext(supabase, auth.userId);
  return { auth, supabase, billing };
}
