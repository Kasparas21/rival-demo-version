/**
 * Builds an in-app `/auth/callback` URL for `verifyOtp({ token_hash, type })`.
 * `"email"` magic-link, `"signup"` confirmation, `"recovery"` password reset.
 */
export function buildEmailTokenCallbackUrl(args: {
  origin: string;
  hashedToken: string;
  otpType: "email" | "signup" | "recovery";
  nextPath: string;
  testerCode?: string | null;
}): string {
  const callback = new URL("/auth/callback", args.origin);
  callback.searchParams.set("token_hash", args.hashedToken);
  callback.searchParams.set("type", args.otpType);
  callback.searchParams.set("next", args.nextPath);
  if (args.testerCode?.trim()) {
    callback.searchParams.set("tester", args.testerCode.trim().toLowerCase());
  }
  return callback.toString();
}

/** Relative `/auth/callback` path for OAuth redirectTo (includes optional tester invite). */
export function buildAuthCallbackPath(nextPath: string, testerCode?: string | null): string {
  const params = new URLSearchParams({ next: nextPath });
  if (testerCode?.trim()) {
    params.set("tester", testerCode.trim().toLowerCase());
  }
  return `/auth/callback?${params.toString()}`;
}
