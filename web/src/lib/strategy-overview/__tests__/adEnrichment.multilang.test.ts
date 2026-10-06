import { describe, expect, it } from "vitest";

import {
  enrichmentTextForAd,
  normalizeFunnel,
  prepareAdTextForEnrichment,
  resolveAngle,
} from "@/lib/strategy-overview/adEnrichment";

describe("prepareAdTextForEnrichment", () => {
  it("strips leading emoji and slash before letters", () => {
    expect(prepareAdTextForEnrichment("/ 🙂 Valote dantis du kartus per dieną?")).toBe(
      "Valote dantis du kartus per dieną?"
    );
  });

  it("keeps string when already starts with letter", () => {
    expect(prepareAdTextForEnrichment("Pasirinkus šį unikalų metodą")).toBe("Pasirinkus šį unikalų metodą");
  });
});

describe("normalizeFunnel", () => {
  it("accepts exact TOF/MOF/BOF", () => {
    expect(normalizeFunnel("TOF")).toBe("TOF");
    expect(normalizeFunnel("bof")).toBe("BOF");
  });

  it("maps English synonyms", () => {
    expect(normalizeFunnel("Awareness campaign")).toBe("TOF");
    expect(normalizeFunnel("Consideration stage")).toBe("MOF");
    expect(normalizeFunnel("Buy now limited offer")).toBe("BOF");
  });

  it("maps Lithuanian BOF cues", () => {
    expect(normalizeFunnel("Nemokama konsultacija")).toBe("BOF");
    expect(normalizeFunnel("pasiūlymu 50%")).toBe("BOF");
  });
});

describe("resolveAngle", () => {
  const base = { id: "x", funnel_stage: "BOF", headline_guess: "Implantai nuo 999€", body_theme: "" };

  it("keeps a listed category", () => {
    expect(resolveAngle({ ...base, angle: "Social proof" })).toBe("social_proof");
  });

  it("never turns the headline into a category", () => {
    expect(resolveAngle({ ...base, angle: "", angle_free_text: "" })).toBe("other");
  });

  it("maps old free-text labels onto the list", () => {
    expect(resolveAngle({ ...base, angle: "", angle_free_text: "Brand awareness" })).toBe("brand");
    expect(resolveAngle({ ...base, angle: "nemokama konsultacija" })).toBe("other");
  });
});

describe("enrichmentTextForAd", () => {
  it("drops Google rows that only carry generated metadata", () => {
    const text = "Allbirds Inc — allbirds.com\nSearch / text · Shown 2026-02-12 → 2026-10-06\n2026-02-12 – 2026-10-06";
    expect(enrichmentTextForAd(text, "google")).toBe("");
  });

  it("drops the repeated advertiser name too (real Allbirds image row)", () => {
    const text =
      "Allbirds Inc — allbirds.com\n\nImage · Shown 2026-01-01 → 2026-10-06\n\n2026-01-01 – 2026-10-06\n\nAllbirds Inc";
    expect(enrichmentTextForAd(text, "google")).toBe("");
  });

  it("drops YouTube rows that only carry the advertiser and an update date", () => {
    expect(enrichmentTextForAd("Implantera, UAB — implantera.lt\n\nImplantera, UAB\n\nUpdated 2026-07-28", "youtube")).toBe("");
  });

  it("keeps the real copy of a Google search ad, once", () => {
    const text =
      "Visit Estonia\n\nWild nature, medieval cities and Nordic cuisine.\n\nSearch / text · Wild nature, medieval cities and Nordic cuisine. · Shown 2025-11-07 → 2026-05-19\n\n2025-11-07 – 2026-05-19";
    expect(enrichmentTextForAd(text, "google")).toBe("Visit Estonia\nWild nature, medieval cities and Nordic cuisine.");
  });

  it("leaves other platforms' text alone", () => {
    expect(enrichmentTextForAd("Nike — nike.com", "meta")).toBe("Nike — nike.com");
  });
});
