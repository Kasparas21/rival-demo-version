import type { SidebarCompetitor } from "./sidebar-competitors";

/** Demo rows merged into the sidebar when you have no saved competitors yet */
const DEMO_RAW = [
  {
    name: "MyFitnessPal",
    slug: "myfitnesspal.com",
    logoUrl:
      "https://play-lh.googleusercontent.com/iGPZDsKZoF58BABAEIebIQk_X1sdYHviEJAwUyoYyJO4L-bN8XA6yWiXuBJcVJwIEc4wHSvxWjbFU23Y7cn1sMo",
  },
  {
    name: "Noom",
    slug: "noom.com",
    logoUrl:
      "https://play-lh.googleusercontent.com/OIS4yB7YGr2bFhyWOnQIgX5wy4LrE5bn3DfP6pCxl6fj9PCRPXEtS2A8ZTDAx9ps8r0",
  },
  {
    name: "Cronometer",
    slug: "cronometer.com",
    logoUrl:
      "https://cdn.sanity.io/images/4xxn1k6d/production/df6b72ebb5f3ece3476ba823c53e0ac2e012f5ac-2160x2160.jpg",
  },
  {
    name: "Fitbit",
    slug: "fitbit.com",
    logoUrl: "https://www.pngall.com/wp-content/uploads/13/Fitbit-Logo.png",
  },
] as const;

export function getDashboardDemoCompetitors(): SidebarCompetitor[] {
  return DEMO_RAW.map((m) => ({
    slug: m.slug,
    name: m.name,
    logoUrl: m.logoUrl,
    brand: { name: m.name, domain: m.slug, logoUrl: m.logoUrl },
  }));
}
