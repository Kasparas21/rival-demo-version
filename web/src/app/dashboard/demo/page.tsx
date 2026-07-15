import { redirect } from "next/navigation";

import { DASHBOARD_DEMO_DEFAULT_PATH } from "@/lib/demo/dashboard-demo-config";

export default function DashboardDemoIndexPage() {
  redirect(DASHBOARD_DEMO_DEFAULT_PATH);
}
