import type { DiscoveryPatternInsights } from "./pattern-types";

/**
 * Checks the figures the weekly-report model writes against the input it was given. The prompt says
 * "never invent numbers", yet reports still carried figures that exist nowhere in the data ("avg ~2.2 vs
 * ~1.5", "kill rate surges 6x" from 6 vs 0, "22%" from 2 of 9).
 */

export type UnsupportedFigure = { figure: string; field: string; text: string };

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
/** Dates, ranges of dates and ad ids carry digits that aren't claims. */
const NOT_FIGURES: RegExp[] = [
  /\b\d{4}-\d{2}-\d{2}\b/g,
  new RegExp(`\\b${MONTH}\\s+\\d{1,2}(?:st|nd|rd|th)?(?:\\s*[-–]\\s*(?:${MONTH}\\s+)?\\d{1,2}(?:st|nd|rd|th)?)?\\b`, "gi"),
  new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}\\b`, "gi"),
  /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g,
  /\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{8}(?:-[0-9a-f]{4}){0,3}(?:-[0-9a-f]{12})?\b/gi,
  /\b(?:19|20)\d{2}\b/g,
];
/** Quoted ad copy may hold its own numbers ("Save 30%"); those come from the ads, not the model. */
const QUOTED: RegExp[] = [/"[^"]*"/g, /“[^”]*”/g, /‘[^’]*’/g, /(^|[\s(])'[^']{2,}'(?=[\s.,;:)!?]|$)/g];

const FIGURE = /[~≈]?(?<![\w.])(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?\s*(%|x\b|×)?/gi;

/** Figures every report may use: the week has 7 days, "1 ad", "0 new". */
const ALWAYS_ALLOWED = [0, 1, 7];

function stripNonFigures(text: string): string {
  let out = text;
  for (const re of [...QUOTED, ...NOT_FIGURES]) out = out.replace(re, " ");
  return out;
}

function numbersInText(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g)) {
    const n = Number(m[0].replace(/,/g, ""));
    if (Number.isFinite(n)) out.push(n);
  }
  // Prices in ad copy group thousands with a space or dot ("2 929 €", "1.299 €"); the model writes "2,929".
  for (const m of text.matchAll(/\d{1,3}(?:[ \u00a0\u202f.]\d{3})+(?!\d)/g)) {
    out.push(Number(m[0].replace(/[ \u00a0\u202f.]/g, "")));
  }
  return out;
}

export type InputFigures = { all: Set<number>; percents: Set<number> };

const PERCENT_KEY = /(_pct|percent|share)$/i;

/**
 * Every number in the model's input, including those inside ad copy and names, and separately the ones
 * that are percentages (a `*_pct` field or "30%" in text): a count of 10 doesn't back "10%".
 */
export function figuresInInput(input: unknown): InputFigures {
  const all = new Set<number>(ALWAYS_ALLOWED);
  const percents = new Set<number>([0, 100]);
  const walk = (v: unknown, key = "") => {
    if (typeof v === "number" && Number.isFinite(v)) {
      all.add(Math.abs(v));
      if (PERCENT_KEY.test(key)) percents.add(Math.abs(v));
    } else if (typeof v === "string") {
      for (const n of numbersInText(v)) all.add(n);
      for (const m of v.matchAll(/(\d+(?:\.\d+)?)\s*%/g)) percents.add(Number(m[1]));
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(input);
  return { all, percents };
}

function isSupported(value: number, decimals: number, allowed: Set<number>): boolean {
  if (allowed.has(value)) return true;
  for (const a of allowed) {
    // "42.5 days" written as "43"; "2.24" written as "2.2".
    if (decimals === 0 && Math.round(a) === value) return true;
    if (decimals > 0 && Math.abs(a - value) < 0.5 * 10 ** -decimals + 1e-9) return true;
  }
  return false;
}

/** Figures in `text` that the input doesn't contain. Multiples ("6x") are never supported. */
export function unsupportedFiguresIn(text: string, allowed: InputFigures): string[] {
  const bad: string[] = [];
  for (const m of stripNonFigures(text).matchAll(FIGURE)) {
    const whole = m[1]!.replace(/,/g, "");
    const frac = m[2] ?? "";
    const suffix = (m[3] ?? "").toLowerCase();
    const value = Number(frac ? `${whole}.${frac}` : whole);
    if (!Number.isFinite(value)) continue;
    const pool = suffix === "%" ? allowed.percents : allowed.all;
    if (suffix === "x" || suffix === "×" || !isSupported(value, frac.length, pool)) bad.push(m[0].trim());
  }
  return bad;
}

type TextField = { field: string; text: string };

function textFields(insights: DiscoveryPatternInsights): TextField[] {
  const fields: TextField[] = [
    { field: "headline", text: insights.headline },
    { field: "temperature_reason", text: insights.temperature_reason },
  ];
  insights.patterns.forEach((p, i) => {
    fields.push({ field: `patterns[${i}].title`, text: p.title });
    fields.push({ field: `patterns[${i}].description`, text: p.description });
  });
  insights.winners_playbook.forEach((t, i) => fields.push({ field: `winners_playbook[${i}]`, text: t }));
  insights.graveyard_lessons.forEach((t, i) => fields.push({ field: `graveyard_lessons[${i}]`, text: t }));
  insights.recommended_tests.forEach((t, i) => {
    fields.push({ field: `recommended_tests[${i}].idea`, text: t.idea });
    fields.push({ field: `recommended_tests[${i}].rationale`, text: t.rationale });
  });
  if (insights.competitor_spotlight) {
    fields.push({ field: "competitor_spotlight.observation", text: insights.competitor_spotlight.observation });
  }
  return fields;
}

export function findUnsupportedFigures(insights: DiscoveryPatternInsights, input: unknown): UnsupportedFigure[] {
  const allowed = figuresInInput(input);
  return textFields(insights).flatMap(({ field, text }) =>
    unsupportedFiguresIn(text, allowed).map((figure) => ({ figure, field, text })),
  );
}

/** What the model is told on its retry. */
export function unsupportedFiguresFeedback(issues: UnsupportedFigure[]): string {
  const lines = issues.slice(0, 20).map((i) => `- "${i.figure}" in ${i.field}: ${i.text}`);
  return [
    "These figures are not in the data you were given:",
    ...lines,
    'Rewrite those statements using only figures that appear in the input, or say them without numbers. Do not compute averages, percentages, ratios or multiples ("6x") yourself. Return the full JSON again, matching the schema.',
  ].join("\n");
}

/** Splits after . ! ? followed by a space, so decimals ("2.6") and ids stay inside their sentence. */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** `text` without the sentences that state unsupported figures; "" when none survive. */
function withoutUnsupported(text: string, allowed: InputFigures): string {
  return splitSentences(text)
    .filter((s) => unsupportedFiguresIn(s, allowed).length === 0)
    .join(" ")
    .trim();
}

/**
 * Last resort after the retry: drop sentences that still state figures the input doesn't hold, and items
 * left empty by that. A headline that can't be cleaned falls back to the first clean pattern title.
 */
export function removeUnsupportedFigures(
  insights: DiscoveryPatternInsights,
  input: unknown,
): DiscoveryPatternInsights {
  const allowed = figuresInInput(input);
  const clean = (t: string) => withoutUnsupported(t, allowed);
  const patterns = insights.patterns
    .filter((p) => clean(p.title) === p.title.trim())
    .map((p) => ({ ...p, description: clean(p.description) }))
    .filter((p) => p.description);
  const headline =
    unsupportedFiguresIn(insights.headline, allowed).length === 0
      ? insights.headline
      : (patterns[0]?.title ?? clean(insights.headline));
  const spotlight = insights.competitor_spotlight
    ? { ...insights.competitor_spotlight, observation: clean(insights.competitor_spotlight.observation) }
    : null;
  return {
    ...insights,
    headline,
    temperature_reason: clean(insights.temperature_reason),
    patterns,
    winners_playbook: insights.winners_playbook.map(clean).filter(Boolean),
    graveyard_lessons: insights.graveyard_lessons.map(clean).filter(Boolean),
    recommended_tests: insights.recommended_tests
      .filter((t) => clean(t.idea) === t.idea.trim())
      .map((t) => ({ ...t, rationale: clean(t.rationale) })),
    competitor_spotlight: spotlight?.observation ? spotlight : null,
  };
}
