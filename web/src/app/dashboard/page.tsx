import { redirect } from "next/navigation";
import { DASHBOARD_HOME_PATH } from "@/lib/dashboard/default-home";

/** Prefer Spy — the `/dashboard` segment is layout-only. */
export default function DashboardHomePage() {
  redirect(DASHBOARD_HOME_PATH);
}
