import { redirect } from "next/navigation";

import { PAYWALL_AFTER_TRIAL_PATH } from "@/lib/auth/trial-flow";

/** Legacy URL — trial setup now runs on the plan picker in the background. */
export default function TrialCompletePage() {
  redirect(PAYWALL_AFTER_TRIAL_PATH);
}
