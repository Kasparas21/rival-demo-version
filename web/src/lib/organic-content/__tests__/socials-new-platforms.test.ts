import { describe, expect, it } from "vitest";

import { findNewlyAddedPlatforms } from "../socials";

describe("findNewlyAddedPlatforms", () => {
  it("detects first platform added", () => {
    expect(findNewlyAddedPlatforms({}, { instagram: "adidas" })).toEqual(["instagram"]);
  });

  it("detects newly added platform when others already exist", () => {
    expect(
      findNewlyAddedPlatforms({ instagram: "adidas" }, { instagram: "adidas", tiktok: "adidas" }),
    ).toEqual(["tiktok"]);
  });

  it("returns empty when no new platforms", () => {
    expect(
      findNewlyAddedPlatforms(
        { instagram: "adidas", tiktok: "adidas" },
        { instagram: "adidas", tiktok: "nike" },
      ),
    ).toEqual([]);
  });

  it("detects multiple newly added platforms at once", () => {
    expect(findNewlyAddedPlatforms({}, { instagram: "adidas", tiktok: "adidas" })).toEqual([
      "instagram",
      "tiktok",
    ]);
  });
});
