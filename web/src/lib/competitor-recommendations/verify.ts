import { llmJson, type CostTracker } from "@/lib/competitor-recommendations/llm-json";
import { readSiteText, type SiteText } from "@/lib/competitor-recommendations/site-text";
import type { BrandProfile, Candidate, VerifiedCandidate } from "@/lib/competitor-recommendations/types";

const SYSTEM = `You check whether businesses are direct competitors of a given business, using only the text of their own homepages. Answer only with JSON. A direct competitor sells the same kind of product or service to the same kind of customer in the same market (for local businesses: the same area). Retailers, marketplaces, directories, media, suppliers, and businesses in a different category are not direct competitors. Every evidence line and "edge" must be something their page actually says. Pages may show another language or regional version because of where they were fetched from: never reject a candidate for its page language or region. Judge the market from what the page says about where they sell or ship; for online brands, assume they sell in the business's market unless the page says otherwise.`;

const MAX_PARALLEL_FETCHES = 6;
const BATCH = 6;

async function readAll(domains: string[]): Promise<Map<string, SiteText | null>> {
  const out = new Map<string, SiteText | null>();
  let i = 0;
  const worker = async () => {
    while (i < domains.length) {
      const d = domains[i++]!;
      // Free fetch first; Firecrawl (1 credit) when a site blocks plain fetches, as many big brands do.
      out.set(d, await readSiteText(d).catch(() => null));
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL_FETCHES, domains.length) }, worker));
  return out;
}

function describe(profile: BrandProfile): string {
  const where =
    profile.businessType === "local"
      ? `a local business in ${profile.city ?? "?"}, ${profile.country ?? "?"}`
      : `selling mainly in ${profile.country ?? "an unknown country"}`;
  return `${profile.brandName} (${profile.domain}): ${profile.offering} Category: ${profile.category}. Customers: ${profile.customer}. Price tier: ${profile.priceTier}. It is ${where}. Website language: ${profile.language}.`;
}

async function judgeBatch(
  profile: BrandProfile,
  batch: Candidate[],
  pages: Map<string, SiteText | null>,
  cost: CostTracker,
): Promise<Map<string, Omit<VerifiedCandidate, keyof Candidate>>> {
  const blocks = batch
    .map((c, i) => {
      const p = pages.get(c.domain);
      const body = p ? `Title: ${p.title}\nDescription: ${p.description}\nText: ${p.text.slice(0, 1600)}` : "(homepage could not be read)";
      return `### [${i}] ${c.name} (${c.domain})${c.address ? ` — ${c.address}` : ""}\n${body}`;
    })
    .join("\n\n");
  const raw = await llmJson({
    system: SYSTEM,
    maxTokens: 4000,
    cost,
    user: `The business: ${describe(profile)}

Candidates:
${blocks}

For each candidate return:
{"results": [{"index": number, "isDirect": boolean, "relevance": 0-100 (how closely they fight for the same customers; 80+ = same offering, same customers, same market), "evidence": [1-3 short lines from their page showing the overlap, translated into English], "edge": one short line, fully in English (translate any quoted terms), on something distinctive they offer or do that the business might learn from (e.g. "Free 365-day returns", "Online booking with price list", "Trade-in program for worn shoes"), or null when there's nothing distinctive. Never a generic line every shop has (newsletter discount, secure payment, standard free-shipping threshold), "rejectReason": null, or why it isn't a direct competitor}]}`,
  });
  const out = new Map<string, Omit<VerifiedCandidate, keyof Candidate>>();
  const arr = (raw as { results?: unknown })?.results;
  if (!Array.isArray(arr)) return out;
  for (const item of arr) {
    const r = item as Record<string, unknown>;
    const c = typeof r.index === "number" ? batch[r.index] : undefined;
    if (!c) continue;
    const relevance = typeof r.relevance === "number" ? Math.max(0, Math.min(100, Math.round(r.relevance))) : 0;
    out.set(c.domain, {
      isDirect: r.isDirect === true,
      relevance,
      evidence: (Array.isArray(r.evidence) ? r.evidence : [])
        .filter((e): e is string => typeof e === "string" && e.trim() !== "")
        .slice(0, 3)
        .map((e) => e.trim().slice(0, 160)),
      edge: typeof r.edge === "string" && r.edge.trim() ? r.edge.trim().slice(0, 140) : null,
      rejectReason: typeof r.rejectReason === "string" && r.rejectReason.trim() ? r.rejectReason.trim().slice(0, 160) : null,
    });
  }
  return out;
}

/** Judge a batch; when the model's answer is unusable (often cut off), judge each half separately. */
async function judgeWithSplit(
  profile: BrandProfile,
  batch: Candidate[],
  pages: Map<string, SiteText | null>,
  cost: CostTracker,
): Promise<Map<string, Omit<VerifiedCandidate, keyof Candidate>>> {
  const out = await judgeBatch(profile, batch, pages, cost).catch((e) => {
    console.warn("[competitor-recommendations] judge batch", e instanceof Error ? e.message : e);
    return new Map<string, Omit<VerifiedCandidate, keyof Candidate>>();
  });
  if (out.size > 0 || batch.length < 2) return out;
  const mid = Math.ceil(batch.length / 2);
  const halves = await Promise.all([
    judgeWithSplit(profile, batch.slice(0, mid), pages, cost),
    judgeWithSplit(profile, batch.slice(mid), pages, cost),
  ]);
  return new Map(halves.flatMap((m) => [...m.entries()]));
}

/** Read each candidate's homepage and have the model judge, with evidence, whether it's a direct competitor. */
export async function verifyCandidates(
  profile: BrandProfile,
  candidates: Candidate[],
  cost: CostTracker,
): Promise<VerifiedCandidate[]> {
  const pages = await readAll(candidates.map((c) => c.domain));
  // A brand suggested only from the model's knowledge must at least have a site that loads.
  const checkable = candidates.filter((c) => pages.get(c.domain) != null || !c.sources.every((s) => s === "knowledge"));
  const batches: Candidate[][] = [];
  for (let i = 0; i < checkable.length; i += BATCH) batches.push(checkable.slice(i, i + BATCH));
  const verdicts = await Promise.all(batches.map((b) => judgeWithSplit(profile, b, pages, cost)));
  const byDomain = new Map(verdicts.flatMap((m) => [...m.entries()]));
  return candidates.map((c) => {
    const v = byDomain.get(c.domain);
    if (v) return { ...c, ...v };
    return {
      ...c,
      isDirect: false,
      relevance: 0,
      evidence: [],
      edge: null,
      rejectReason: pages.get(c.domain) == null ? "Website didn't load" : "Not judged",
    };
  });
}
