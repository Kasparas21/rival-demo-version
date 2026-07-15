/** `launch_date|platform` keys for Adidas sales demo — only these creative tests are frozen/shown. */
export type CreativeTestAllowKey = `${string}|${string}`;

export const ADIDAS_DEMO_CREATIVE_TEST_ALLOWLIST: readonly CreativeTestAllowKey[] = [
  "2026-06-22|meta",
  "2026-06-01|meta",
] as const;

export function creativeTestAllowKey(launchDate: string, platform: string): CreativeTestAllowKey {
  const date = launchDate.trim().slice(0, 10);
  const plat = platform.trim().toLowerCase();
  return `${date}|${plat}`;
}

export function isAdidasDemoCreativeTestAllowed(launchDate: string, platform: string): boolean {
  return ADIDAS_DEMO_CREATIVE_TEST_ALLOWLIST.includes(creativeTestAllowKey(launchDate, platform));
}

export function filterToAdidasDemoCreativeTests<T extends { launch_date: string; platform: string }>(
  tests: T[],
): T[] {
  return tests.filter((t) => isAdidasDemoCreativeTestAllowed(t.launch_date, t.platform));
}
