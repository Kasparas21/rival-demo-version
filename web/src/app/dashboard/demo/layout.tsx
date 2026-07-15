import { redirect } from "next/navigation";

import { isDebugPlatformClassificationEnabled } from "@/lib/debug/platform-classification";
import { DASHBOARD_DEMO_DEFAULT_PATH } from "@/lib/demo/dashboard-demo-config";

export default function DashboardDemoLayout({ children }: { children: React.ReactNode }) {
  if (!isDebugPlatformClassificationEnabled()) {
    redirect("/dashboard/spy");
  }
  return children;
}
