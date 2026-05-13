import { describe, expect, it } from "vitest";
import { z } from "zod";

/** Mirrors check route body — documents expected shape for client callers. */
const checkBodySchema = z.object({
  competitorId: z.string().uuid(),
  scrapedAdIds: z.array(z.string().uuid()).optional(),
  libraryItems: z
    .array(
      z.object({
        platform: z.string().min(1),
        libraryItemId: z.string().min(1),
      }),
    )
    .optional(),
});

describe("saved-ads check body schema", () => {
  it("accepts competitorId + scrapedAdIds", () => {
    const parsed = checkBodySchema.parse({
      competitorId: "00000000-0000-4000-8000-000000000001",
      scrapedAdIds: ["00000000-0000-4000-8000-000000000002"],
    });
    expect(parsed.scrapedAdIds?.length).toBe(1);
  });

  it("accepts empty optional arrays", () => {
    const parsed = checkBodySchema.parse({
      competitorId: "00000000-0000-4000-8000-000000000001",
    });
    expect(parsed.libraryItems).toBeUndefined();
  });
});
