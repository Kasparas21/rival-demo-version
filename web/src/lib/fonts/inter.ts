import { Inter } from "next/font/google";

/** Inter (latin) — used for hero accent and UI. */
export const fontInter = Inter({
  subsets: ["latin"],
  weight: ["500", "600", "800"],
  preload: true,
  variable: "--font-inter",
  display: "swap",
});
