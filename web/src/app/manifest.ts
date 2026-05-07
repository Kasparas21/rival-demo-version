import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Spy Rival",
    short_name: "Spy Rival",
    description: "AI competitor ad intelligence for tracking ads, creatives, and full-funnel strategy.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8fb",
    theme_color: "#1a1a2e",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
