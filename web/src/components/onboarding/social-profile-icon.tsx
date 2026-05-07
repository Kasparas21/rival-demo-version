import type { SVGProps } from "react";
import { Link2 } from "lucide-react";

import { FacebookLogo } from "@/components/icons/facebook-logo";
import { InstagramMark } from "@/components/icons/instagram-mark";
import { LinkedInMark } from "@/components/icons/linkedin-mark";
import { TikTokMark } from "@/components/icons/tiktok-mark";

/** Deterministic ids for SVG defs (`clipPath`, gradients) — safe with multiple pills */
function svgDefSuffix(href: string): string {
  let h = 0;
  for (let i = 0; i < href.length; i++) h = ((h << 5) - h + href.charCodeAt(i)) >>> 0;
  return Math.abs(h).toString(36).slice(0, 14);
}

/** Compact brand marks for onboarding social chips (href-based) */
export function SocialProfileIcon({ href, className }: { href: string; className?: string }) {
  const h = href.toLowerCase();
  const suf = svgDefSuffix(href);
  const cn = `shrink-0 ${className ?? "size-4"}`;

  if (h.includes("facebook.") || h.includes("fb.com") || h.includes("fb.me")) {
    return <FacebookLogo idSuffix={suf} className={cn} />;
  }

  if (h.includes("instagram.com")) {
    return <InstagramMark className={cn} />;
  }

  if (h.includes("tiktok.com")) {
    return <TikTokMark className={`${cn} text-gray-900`} />;
  }

  if (h.includes("linkedin.com")) {
    return <LinkedInMark className={cn} />;
  }

  if (h.includes("youtube.com") || h.includes("youtu.be")) {
    return (
      <svg viewBox="0 0 24 24" className={cn} aria-hidden fill="#ff0033">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.4 3.5 12 3.5 12 3.5s-7.4 0-9.4.6A3 3 0 0 0 .5 6.2 30.3 30.3 0 0 0 0 12a30.3 30.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c2 .6 9.4.6 9.4.6s7.4 0 9.4-.6a3 3 0 0 0 2.1-2.1 30.3 30.3 0 0 0 .5-5.8 30.3 30.3 0 0 0-.5-5.8ZM9.75 15.5v-7l6 3.5Z" />
      </svg>
    );
  }

  if (h.includes("pinterest.com")) {
    return (
      <svg viewBox="0 0 24 24" className={cn} aria-hidden fill="#e60023">
        <path d="M12 2a10 10 0 0 0-3.75 19.3 0-2.68-.6-4.62-1.93-5.75.4 1.73.6 2.48.6 2.48a3.5 3.5 0 0 1-2.9 1.7c-1.73 0-2.73-1.6-2.73-3.6 0-2.06 1.4-3.8 3.5-3.8 1.53 0 2.6.86 2.6 2.1 0 1.06-.45 1.9-1.2 1.9-.5 0-.8-.4-.8-1 0-1.73 1.06-3.3 1.06-4.7a4.4 4.4 0 0 1 4.53-4.6 4.53 4.53 0 0 1 4.7 4.4c0 2.5-1.5 4.2-3.7 4.2-.9 0-1.73-.5-2-1 0 0-.54 2.1-.64 2.5l-.9 3.2A10 10 0 1 0 12 2z" />
      </svg>
    );
  }

  if (h.includes("snapchat.com")) {
    return (
      <svg viewBox="0 0 24 24" className={cn} aria-hidden fill="#fffc00">
        <path
          d="M12.21 3.5c1.6 0 2.9 1.06 3.3 2.6 1.73.16 3.1 1.62 3.1 3.4 0 .8-.3 1.5-.8 2.1 0 2.4-1.7 4.4-4 4.8v.2c0 1.1-1.2 2-2.76 2-.5 0-.9-.1-1.28-.3l-.4.3c-.4.3-.9.5-1.4.5-.7 0-1.34-.4-1.72-1-.5.2-1.04.3-1.62.3-.8 0-1.53-.2-2.1-.6C2.72 16.4 2 15.06 2 13.62c0-.3.04-.6.1-.9A3.6 3.6 0 0 1 2.5 10c0-1.9 1.5-3.5 3.4-3.8C6.3 4.6 7.7 3.5 9.46 3.5h2.74z"
          stroke="#000"
          strokeWidth={0.4}
        />
      </svg>
    );
  }

  if (h.includes("twitter.com") || h.includes("x.com")) {
    return <XBirdIcon className={cn} />;
  }

  return <Link2 className={cn} strokeWidth={2} aria-hidden />;
}

function XBirdIcon({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M18.24 3H21l-7.3 8.37L22 21h-6.93l-5.43-6.82L6.52 21H3.78l7.82-9L3 3h7.06l5.04 6.43L18.24 3Z" />
    </svg>
  );
}

