import { describe, expect, it } from "vitest";

import { adHostMatchesCompetitor } from "@/lib/landing-page-tracker/sync-landing-pages-from-ads";

describe("adHostMatchesCompetitor", () => {
  it("matches apex and subdomains of the competitor root host", () => {
    expect(adHostMatchesCompetitor("sypsenosakademija.lt", "sypsenosakademija.lt")).toBe(true);
    expect(adHostMatchesCompetitor("offer.sypsenosakademija.lt", "sypsenosakademija.lt")).toBe(true);
  });

  it("rejects unrelated hosts", () => {
    expect(adHostMatchesCompetitor("evil-sypsenosakademija.lt", "sypsenosakademija.lt")).toBe(false);
    expect(adHostMatchesCompetitor("example.com", "sypsenosakademija.lt")).toBe(false);
  });
});
