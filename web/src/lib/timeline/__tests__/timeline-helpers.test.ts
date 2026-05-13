import { describe, it, expect } from "vitest";

describe("Timeline tab", () => {
  it("module loads without error", async () => {
    const mod = await import("@/components/competitor/tests-timeline/timeline-tab");
    expect(mod.TimelineTab).toBeDefined();
  });
});
