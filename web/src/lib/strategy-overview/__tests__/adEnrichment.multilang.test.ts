import { describe, expect, it } from "vitest";

import { normalizeFunnel, prepareAdTextForEnrichment, resolveAngle } from "@/lib/strategy-overview/adEnrichment";

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

describe("resolveAngle headline fallback", () => {
  it("uses headline_guess when angles empty", () => {
    const r = {
      id: "x",
      funnel_stage: "BOF",
      angle: "",
      angle_free_text: "",
      headline_guess: "Implantai nuo 999€",
      body_theme: "",
    };
    expect(resolveAngle(r)).toBe("Implantai nuo 999€");
  });
});
