"use client";

import { useState } from "react";
import Image from "next/image";
import {
  GoogleLogo,
  LinkedInLogo,
  MetaLogo,
  PinterestLogo,
  SnapchatLogo,
  TikTokLogo,
} from "@/components/platform-logos";
import styles from "./hero-ad-carousel.module.css";

// Locally saved ad creatives, not a live feed or customer endorsements.
// Original library IDs and capture provenance: public/landing/ads/sources.json.
// The platform labels are spread across all six platforms Rival covers; they are illustrative and
// don't say where each creative was captured (sources.json does).
const ads = [
  { id: "nike-sale", brand: "Nike", logo: "nike", platform: "Meta", width: 338, height: 600, alt: "Nike festive sale ad with a green running portrait", tone: "#057664" },
  { id: "adidas-outlet", brand: "adidas", logo: "adidas", platform: "Google", width: 600, height: 500, alt: "adidas factory outlet sale display ad", tone: "#101010" },
  { id: "gymshark-training", brand: "Gymshark", logo: "gymshark", platform: "TikTok", width: 338, height: 600, alt: "Gymshark training ad featuring Victor Sanchez in black workout apparel", tone: "#15191a" },
  { id: "nike-sneaker", brand: "Nike", logo: "nike", platform: "Pinterest", width: 600, height: 600, alt: "Nike ad featuring a white platform sneaker", tone: "#f4f4f4" },
  { id: "adidas-adilette", brand: "adidas", logo: "adidas", platform: "Snapchat", width: 1080, height: 1080, alt: "adidas ad featuring black Adilette slides", tone: "#eceeef" },
  { id: "gymshark-essentials", brand: "Gymshark", logo: "gymshark", platform: "LinkedIn", width: 338, height: 600, alt: "Gymshark essentials ad featuring Victor Sanchez in the gym", tone: "#353532" },
] as const;

const PLATFORM_LOGOS = {
  Meta: MetaLogo,
  Google: GoogleLogo,
  TikTok: TikTokLogo,
  LinkedIn: LinkedInLogo,
  Pinterest: PinterestLogo,
  Snapchat: SnapchatLogo,
};

function AdCard({ ad }: { ad: (typeof ads)[number] }) {
  const PlatformLogo = PLATFORM_LOGOS[ad.platform];
  return (
    <span className={styles.card}>
      <span className={styles.cardHeader}>
        <Image className={styles.brandLogo} src={`/landing/ads/${ad.logo}-logo.webp`} alt="" width={28} height={28} />
        <span className={styles.brandName}>{ad.brand}</span>
        <span className={styles.platform}>
          <PlatformLogo />
          <span>{ad.platform}</span>
        </span>
      </span>
      <span className={styles.creative} style={{ backgroundColor: ad.tone }}>
        <Image
          src={`/landing/ads/${ad.id}.webp`}
          alt={ad.alt}
          width={ad.width}
          height={ad.height}
          sizes="(max-width: 600px) 194px, (max-width: 1000px) 180px, 240px"
          unoptimized
          loading="eager"
          draggable={false}
        />
      </span>
    </span>
  );
}

export function HeroAdCarousel() {
  const [paused, setPaused] = useState(false);

  return (
    <button
      type="button"
      className={styles.scene}
      data-motion-loop
      data-paused={paused}
      aria-label={`${paused ? "Resume" : "Pause"} carousel of example Nike, Gymshark, and adidas ads across ad platforms`}
      aria-pressed={paused}
      onClick={() => setPaused((value) => !value)}
    >
      <span className={styles.wall} aria-hidden="true">
        {[0, 1].map((lane) => (
          <span className={styles.lane} key={lane}>
            <span className={styles.track}>
              {[0, 1].map((copy) => (
                <span className={styles.group} key={copy}>
                  {ads.filter((_, index) => lane === 0 || index % 2 === 1).map((ad) => <AdCard key={ad.id} ad={ad} />)}
                </span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </button>
  );
}
