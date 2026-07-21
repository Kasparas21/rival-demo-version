import { redirect } from "next/navigation";

import { TeamChooseWorkspaceClient } from "@/components/team/team-choose-workspace-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function TeamChooseWorkspacePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/team/choose-workspace");
  }

  return <TeamChooseWorkspaceClient />;
}
