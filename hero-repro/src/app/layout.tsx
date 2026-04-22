import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: "AdSpy — Dominate Your Market with AI Ad Intelligence",
  description: "The ultimate competitor ad-spying tool with AI-powered strategy recommendations.",
  icons: {
    icon: "/rival-logo.svg",
    apple: "/rival-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${instrumentSerif.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
