/**
 * Builds an in-app `/auth/callback` URL for `verifyOtp({ token_hash, type })`.
 * `"email"` magic-link, `"signup"` confirmation, `"recovery"` password reset.
 */
export function buildEmailTokenCallbackUrl(args: {
  origin: string;
  hashedToken: string;
  otpType: "email" | "signup" | "recovery";
  nextPath: string;
}): string {
  const callback = new URL("/auth/callback", args.origin);
  callback.searchParams.set("token_hash", args.hashedToken);
  callback.searchParams.set("type", args.otpType);
  callback.searchParams.set("next", args.nextPath);
  return callback.toString();
}
