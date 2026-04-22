"use client";

import React, { createContext, useContext } from "react";

export type Brand = {
  id: string;
  name: string;
  badge: string;
  logoUrl?: string;
  color?: string;
};

const BrandContext = createContext<Brand | null>(null);

export function useActiveBrand(): Brand {
  const brand = useContext(BrandContext);
  return brand ?? { id: "default", name: "My Brand", badge: "M", color: "#343434" };
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
