/** Dashboard shell at `/dashboard` has no primary UI — ship users to Spy first. */
export const DASHBOARD_HOME_PATH = "/dashboard/spy" as const;

/** Routes that mean “generic dashboard landing” when deciding onboarding `next`. */
export function isGenericDashboardLanding(path: string): boolean {
  const p = path.trim();
  return p === "/dashboard" || p === DASHBOARD_HOME_PATH;
}
