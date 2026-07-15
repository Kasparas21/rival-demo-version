/** Adidas sales demo — only these timeline ads are shown (screenshot allowlist, Jul 8 2026 Google). */
export const ADIDAS_DEMO_TIMELINE_AD_IDS = [
  "722a2218-8662-443f-8d27-18995208ea0c", // FIFA World Cup 26 jersey banner
  "3f000293-b8de-4e88-831b-d9a8b8fd9499", // Factory outlet — square creative
  "bea8ebee-4e35-4427-9705-41f185c4ce77", // Factory outlet — horizontal banner
  "8fc2818b-9416-4f8e-94a1-c6d93b3b2b5b", // Factory outlet — horizontal with athlete bg
  "e1a57570-6cbd-4f6c-8ad1-061dc051b7bf", // Factory outlet — vertical
  "eed8280f-6999-419f-ad7a-75a8b7522105", // Mexico jersey (MEX crop)
  "78acf948-1a0d-4ffb-8829-b339c905509a", // Mexico jersey (MEXICO full)
  "b42761a8-4616-4a08-9d01-c4525bc672a7", // Adidas logo on grainy background
  "2b647ce5-080d-412b-b95b-6a68bfe23528", // Argentina / Spain jerseys lifestyle
  "657e3604-275b-4384-b187-9d943342f7fb", // Green sneaker product shot
  "6821cc5c-764a-49c0-aa35-b753a39a2846", // Red Adidas top lifestyle
  "0888bf90-667c-4a44-a1c1-c31796e94da5", // Dark abstract B&W creative
  "b2048f73-bf15-4d7c-8c72-259c5a56e195", // B&W factory outlet lifestyle
] as const;

const ALLOWED = new Set<string>(ADIDAS_DEMO_TIMELINE_AD_IDS);

export function isAdidasDemoTimelineAdAllowed(adId: string): boolean {
  return ALLOWED.has(adId.trim());
}

export function filterToAdidasDemoTimelineAds<T extends { id: string }>(ads: T[]): T[] {
  return ads.filter((ad) => isAdidasDemoTimelineAdAllowed(ad.id));
}
