import { GoogleAnalytics } from "@next/third-parties/google";

const gaId = process.env.NEXT_PUBLIC_GA_ID ?? "G-K7G7LYSV2J";

export function SiteGoogleAnalytics() {
  if (!gaId) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
