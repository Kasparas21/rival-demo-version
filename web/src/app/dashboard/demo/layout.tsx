import { redirect } from "next/navigation";

import { isDemoWorkspaceEnabled } from "@/lib/demo/dashboard-demo-config";

export default function DashboardDemoLayout({ children }: { children: React.ReactNode }) {
  if (!isDemoWorkspaceEnabled()) {
    redirect("/dashboard/spy");
  }
  return children;
}
