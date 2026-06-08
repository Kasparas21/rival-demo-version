import { redirect } from "next/navigation";

import { CHOOSE_PLAN_AFTER_TRIAL_PATH } from "@/lib/auth/trial-flow";

/** Legacy URL — trial setup now runs on the plan picker in the background. */
export default function TrialCompletePage() {
  redirect(CHOOSE_PLAN_AFTER_TRIAL_PATH);
}
