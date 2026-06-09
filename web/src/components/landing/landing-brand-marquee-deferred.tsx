"use client";

import dynamic from "next/dynamic";

const LandingBrandMarquee = dynamic(
  () =>
    import("@/components/landing/landing-brand-marquee").then((mod) => mod.LandingBrandMarquee),
  {
    ssr: false,
    loading: () => <div aria-hidden className="h-14 bg-white sm:h-16" />,
  },
);

type Props = {
  embedded?: boolean;
  ariaLabel: string;
  label: string;
};

export function LandingBrandMarqueeDeferred(props: Props) {
  return <LandingBrandMarquee {...props} />;
}
