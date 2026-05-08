/**
 * Builds an in-app `/auth/callback` URL for `verifyOtp({ token_hash, type })`.
 * Use `otpType` `"email"` for magic-link hashes; `"signup"` for signup confirmation hashes.
 */
export function buildEmailTokenCallbackUrl(args: {
  origin: string;
  hashedToken: string;
  otpType: "email" | "signup";
  nextPath: string;
}): string {
  const callback = new URL("/auth/callback", args.origin);
  callback.searchParams.set("token_hash", args.hashedToken);
  callback.searchParams.set("type", args.otpType);
  callback.searchParams.set("next", args.nextPath);
  return callback.toString();
}
