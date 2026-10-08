/** Codes `/auth/callback` puts in `?error=` on the login page; the message shown is chosen here, never the URL. */
export const AUTH_CALLBACK_ERROR_MESSAGES = {
  oauth_cancelled: "Google sign-in was cancelled.",
  oauth_failed: "Google sign-in didn't complete. Please try again.",
  link_invalid: "That sign-in link has expired or was already used. Request a new one.",
  sign_in_failed: "We couldn't sign you in. Please try again.",
} as const;

export type AuthCallbackErrorCode = keyof typeof AUTH_CALLBACK_ERROR_MESSAGES;

/**
 * The message for a `?error=` value: a known code's text, or a generic line for anything else (old links
 * carried raw internal messages, and a crafted link shouldn't be able to put its own text on the page).
 */
export function authCallbackErrorMessage(raw: string | null | undefined): string | null {
  const code = raw?.trim();
  if (!code) return null;
  return code in AUTH_CALLBACK_ERROR_MESSAGES
    ? AUTH_CALLBACK_ERROR_MESSAGES[code as AuthCallbackErrorCode]
    : AUTH_CALLBACK_ERROR_MESSAGES.sign_in_failed;
}
