import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";

import { TeamAcceptInviteClient } from "@/components/team/team-accept-invite-client";
import { parseInviteToken } from "@/lib/team/team-invite-by-token";

function AcceptInviteFallback() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-gray-600">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      <p className="text-[15px] font-medium">Loading invite…</p>
    </div>
  );
}

export default async function TeamAcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: tokenRaw } = await params;
  const token = parseInviteToken(tokenRaw);
  if (!token) notFound();

  return (
    <Suspense fallback={<AcceptInviteFallback />}>
      <TeamAcceptInviteClient token={token} />
    </Suspense>
  );
}
