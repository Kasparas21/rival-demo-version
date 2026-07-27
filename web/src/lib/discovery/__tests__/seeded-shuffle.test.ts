import { describe, expect, it } from "vitest";

import { seededShuffle } from "@/lib/discovery/build-discovery-feed";

function isPermutation<T>(input: T[], output: T[]): boolean {
  if (input.length !== output.length) return false;
  const counts = new Map<T, number>();
  for (const item of input) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  for (const item of output) {
    const next = (counts.get(item) ?? 0) - 1;
    if (next < 0) return false;
    counts.set(item, next);
  }
  return [...counts.values()].every((n) => n === 0);
}

describe("seededShuffle", () => {
  const sizes = [0, 1, 2, 5, 50, 127, 200];
  const seeds = [
    "brand:2026-07-27",
    "brand:2026-07-27:abc",
    "x",
    "negative-modulo-regression",
    "Odontologijos Klinika:2026-07-27:seed123",
    ...Array.from({ length: 20 }, (_, i) => `seed-${i}`),
  ];

  for (const size of sizes) {
    for (const seed of seeds) {
      it(`preserves permutation for size=${size} seed=${seed}`, () => {
        const input = Array.from({ length: size }, (_, i) => `ad-${i}`);
        const output = seededShuffle(input, seed);

        expect(output).toHaveLength(size);
        expect(output.every((item) => item != null)).toBe(true);
        expect(isPermutation(input, output)).toBe(true);
      });
    }
  }

  it("is deterministic for the same seed", () => {
    const input = Array.from({ length: 120 }, (_, i) => i);
    const seed = "deterministic-seed";
    expect(seededShuffle(input, seed)).toEqual(seededShuffle(input, seed));
  });

  it("changes order for different seeds", () => {
    const input = Array.from({ length: 120 }, (_, i) => i);
    const a = seededShuffle(input, "seed-a");
    const b = seededShuffle(input, "seed-b");
    expect(a).not.toEqual(b);
  });
});
