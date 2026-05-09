"use client";

import React, { createContext, useContext } from "react";
import type { AdsProfileSetup } from "@/lib/onboarding/workspace-ads-setup";

export type Brand = {
  id: string;
  name: string;
  badge: string;
  logoUrl?: string;
  color?: string;
  /** Workspace brand domain from account (when set). */
  domain?: string;
  /** Positioning / “about” copy from onboarding or settings — consumed by AI-style surfaces. */
  brandContext?: string;
  /** Onboarding/workspace Ads Library identifiers (persisted on `brands.ads_profile_setup`). */
  adsSetup?: AdsProfileSetup | null;
};

const BrandContext = createContext<Brand | null>(null);

export function useActiveBrand(): Brand {
  const brand = useContext(BrandContext);
  return brand ?? { id: "default", name: "Your workspace", badge: "?", color: "#343434" };
}

export function BrandProvider({
  brand,
  children,
}: {
  brand: Brand;
  children: React.ReactNode;
}) {
  return (
    <BrandContext.Provider value={brand}>
      {children}
    </BrandContext.Provider>
  );
}
