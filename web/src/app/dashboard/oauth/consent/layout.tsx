import { notFound } from "next/navigation";

import { isMcpOAuthEnabled } from "@/lib/mcp/oauth-enabled";

export default function OAuthConsentLayout({ children }: { children: React.ReactNode }) {
  if (!isMcpOAuthEnabled()) notFound();
  return children;
}
