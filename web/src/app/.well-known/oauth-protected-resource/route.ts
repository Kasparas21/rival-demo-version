import { notFound } from "next/navigation";

import { isMcpOAuthEnabled } from "@/lib/mcp/oauth-enabled";
import { oauthJsonResponse, oauthOptionsResponse } from "@/lib/mcp/oauth/cors";
import { protectedResourceMetadata } from "@/lib/mcp/oauth/metadata";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isMcpOAuthEnabled()) notFound();
  return oauthJsonResponse(protectedResourceMetadata());
}

export async function OPTIONS() {
  if (!isMcpOAuthEnabled()) notFound();
  return oauthOptionsResponse();
}
