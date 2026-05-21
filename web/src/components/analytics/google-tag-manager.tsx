import { GoogleTagManager } from "@next/third-parties/google";

const gtmId = process.env.NEXT_PUBLIC_GTM_ID ?? "GTM-T73R87QP";

export function SiteGoogleTagManager() {
  if (!gtmId) return null;
  return <GoogleTagManager gtmId={gtmId} />;
}
