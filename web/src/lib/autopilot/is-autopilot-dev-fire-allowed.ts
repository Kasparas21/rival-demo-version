/** Accounts allowed to manually fire real autopilot watch deliveries (dev QA). */
const AUTOPILOT_DEV_FIRE_EMAILS = new Set(["attributo@yahoo.com"]);

export function isAutopilotDevFireAllowed(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  return AUTOPILOT_DEV_FIRE_EMAILS.has(email.trim().toLowerCase());
}
