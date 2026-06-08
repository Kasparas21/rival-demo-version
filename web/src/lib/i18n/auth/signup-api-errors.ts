import type { SignupCopy } from "@/lib/i18n/auth/types";

/** Map known English API errors to localized signup copy. */
export function localizeSignupApiError(message: string | undefined, errors: SignupCopy["errors"]): string {
  if (!message) return errors.signupFailed;
  const m = message.trim();
  if (m === "Valid email required") return errors.validEmailRequired;
  if (m === "Password required") return errors.passwordRequiredApi;
  if (m === "Email send failed" || m.includes("Email send failed")) return errors.emailSendFailed;
  return m;
}
