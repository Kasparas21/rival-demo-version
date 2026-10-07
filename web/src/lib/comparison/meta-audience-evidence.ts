/**
 * What Meta publishes about who an advertiser's EU ads reached and targeted: people reached by age band,
 * gender and country (`age_country_gender_reach_breakdown`), plus the targeting settings (`age_audience`,
 * `gender_audience`, `location_audience`). The audience step used to infer segments from platform mix and
 * angle names alone; this is the observed data it now starts from.
 */

export type MetaAudienceEvidence = {
  /** Ads with a published reach breakdown, out of the active Meta ads looked at. */
  adsWithReach: number;
  metaAds: number;
  peopleReached: number;
  genderPct: { female: number; male: number; unknown: number };
  /** In age order. */
  agePct: { range: string; pct: number }[];
  /** Top 5 by reach. */
  countryPct: { country: string; pct: number }[];
  targeting: {
    /** Most common targeted age ranges ("25-65+"), with how many ads use each. */
    ageRanges: { label: string; ads: number }[];
    genders: { label: string; ads: number }[];
    locations: { label: string; ads: number }[];
  };
};

type Row = { platform: string; raw_payload?: unknown };

/**
 * Reach published for fewer ads than this doesn't describe an advertiser: Rothy's had one (a reseller's ad
 * that reached women 35-44 in Spain), and the audience read became "women 35-44 in Spain".
 */
export const MIN_ADS_WITH_REACH = 5;

export function hasRepresentativeReach(e: MetaAudienceEvidence | null | undefined): boolean {
  return (e?.adsWithReach ?? 0) >= MIN_ADS_WITH_REACH;
}

type Breakdown = {
  country?: string;
  age_gender_breakdowns?: { age_range?: string; male?: number | null; female?: number | null; unknown?: number | null }[];
};

const AGE_ORDER = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

function asArray<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === "string") {
    try {
      const parsed: unknown = JSON.parse(v);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

function topCounts(counts: Map<string, number>, limit: number): { label: string; ads: number }[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, ads]) => ({ label, ads }));
}

export function metaAudienceEvidence(ads: Row[]): MetaAudienceEvidence | null {
  const meta = ads.filter((a) => a.platform.trim().toLowerCase() === "meta");
  if (meta.length === 0) return null;

  let adsWithReach = 0;
  const gender = { female: 0, male: 0, unknown: 0 };
  const byAge = new Map<string, number>();
  const byCountry = new Map<string, number>();
  const ageTargets = new Map<string, number>();
  const genderTargets = new Map<string, number>();
  const locationTargets = new Map<string, number>();

  for (const ad of meta) {
    const p = (ad.raw_payload ?? {}) as Record<string, unknown>;
    const breakdowns = asArray<Breakdown>(p.age_country_gender_reach_breakdown);
    let counted = false;
    for (const b of breakdowns) {
      for (const row of b.age_gender_breakdowns ?? []) {
        const f = row.female ?? 0;
        const m = row.male ?? 0;
        const u = row.unknown ?? 0;
        const total = f + m + u;
        if (total <= 0) continue;
        counted = true;
        gender.female += f;
        gender.male += m;
        gender.unknown += u;
        const range = (row.age_range ?? "").trim();
        if (range) byAge.set(range, (byAge.get(range) ?? 0) + total);
        const country = (b.country ?? "").trim().toUpperCase();
        if (country) byCountry.set(country, (byCountry.get(country) ?? 0) + total);
      }
    }
    if (counted) adsWithReach += 1;

    const age = p.age_audience as { min?: number; max?: number } | undefined;
    if (age && typeof age.min === "number" && typeof age.max === "number") {
      const label = `${age.min}-${age.max >= 65 ? "65+" : age.max}`;
      ageTargets.set(label, (ageTargets.get(label) ?? 0) + 1);
    }
    if (typeof p.gender_audience === "string" && p.gender_audience.trim()) {
      const g = p.gender_audience.trim();
      genderTargets.set(g, (genderTargets.get(g) ?? 0) + 1);
    }
    for (const loc of asArray<{ name?: string; excluded?: boolean }>(p.location_audience)) {
      if (loc.excluded || !loc.name?.trim()) continue;
      locationTargets.set(loc.name.trim(), (locationTargets.get(loc.name.trim()) ?? 0) + 1);
    }
  }

  const people = gender.female + gender.male + gender.unknown;
  if (adsWithReach === 0 && ageTargets.size === 0 && genderTargets.size === 0 && locationTargets.size === 0) {
    return null;
  }

  return {
    adsWithReach,
    metaAds: meta.length,
    peopleReached: people,
    genderPct: { female: pct(gender.female, people), male: pct(gender.male, people), unknown: pct(gender.unknown, people) },
    agePct: [...byAge.entries()]
      .sort((a, b) => AGE_ORDER.indexOf(a[0]) - AGE_ORDER.indexOf(b[0]))
      .map(([range, n]) => ({ range, pct: pct(n, people) })),
    countryPct: [...byCountry.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, n]) => ({ country, pct: pct(n, people) })),
    targeting: {
      ageRanges: topCounts(ageTargets, 3),
      genders: topCounts(genderTargets, 3),
      locations: topCounts(locationTargets, 5),
    },
  };
}

/** Plain-text block for the audience prompt. */
export function describeMetaAudienceEvidence(e: MetaAudienceEvidence): string {
  const lines: string[] = [];
  if (e.adsWithReach > 0 && !hasRepresentativeReach(e)) {
    lines.push(
      `Meta published reach for only ${e.adsWithReach} of ${e.metaAds} active ads: too few to describe this advertiser's audience. Do not base ages, genders or places on it.`,
    );
  } else if (e.adsWithReach > 0) {
    lines.push(
      `Published EU reach for ${e.adsWithReach} of ${e.metaAds} active Meta ads (${e.peopleReached.toLocaleString("en-US")} people reached):`,
      `- Gender: ${e.genderPct.female}% women, ${e.genderPct.male}% men${e.genderPct.unknown ? `, ${e.genderPct.unknown}% unknown` : ""}`,
      `- Age: ${e.agePct.map((a) => `${a.range} ${a.pct}%`).join(", ")}`,
      `- Countries: ${e.countryPct.map((c) => `${c.country} ${c.pct}%`).join(", ")}`,
    );
  }
  const t = e.targeting;
  if (t.ageRanges.length || t.genders.length || t.locations.length) {
    lines.push(`Meta targeting settings (number of ads):`);
    if (t.ageRanges.length) lines.push(`- Age: ${t.ageRanges.map((x) => `${x.label} (${x.ads})`).join(", ")}`);
    if (t.genders.length) lines.push(`- Gender: ${t.genders.map((x) => `${x.label} (${x.ads})`).join(", ")}`);
    if (t.locations.length) lines.push(`- Locations: ${t.locations.map((x) => `${x.label} (${x.ads})`).join(", ")}`);
  }
  return lines.join("\n");
}
