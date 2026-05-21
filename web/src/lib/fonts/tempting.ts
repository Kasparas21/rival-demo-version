import localFont from "next/font/local";

export const fontTempting = localFont({
  src: [
    {
      path: "../../assets/fonts/TemptingPersonalUse.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../assets/fonts/TemptingPersonalUse.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-tempting",
  display: "swap",
});
