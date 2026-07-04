import { createHash, timingSafeEqual } from "crypto";

export function verifyPkceS256(codeVerifier: string, codeChallenge: string): boolean {
  const verifier = codeVerifier.trim();
  const challenge = codeChallenge.trim();
  if (!verifier || !challenge) return false;
  const digest = createHash("sha256").update(verifier).digest("base64url");
  try {
    const a = Buffer.from(digest);
    const b = Buffer.from(challenge);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
