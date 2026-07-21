import { describe, expect, it } from "vitest";

import { parseInviteToken, parseTeamInviteTokenFromPath } from "@/lib/team/team-invite-by-token";

const SAMPLE_TOKEN = "792d8bd1-6197-4631-8ef0-ea937f266a46";

describe("parseTeamInviteTokenFromPath", () => {
  it("extracts token from accept path", () => {
    expect(parseTeamInviteTokenFromPath(`/team/accept/${SAMPLE_TOKEN}`)).toBe(SAMPLE_TOKEN);
  });

  it("handles encoded accept path", () => {
    const encoded = encodeURIComponent(`/team/accept/${SAMPLE_TOKEN}`);
    expect(parseTeamInviteTokenFromPath(encoded)).toBe(SAMPLE_TOKEN);
  });

  it("returns null for unrelated paths", () => {
    expect(parseTeamInviteTokenFromPath("/dashboard/spy")).toBeNull();
    expect(parseTeamInviteTokenFromPath(null)).toBeNull();
  });
});

describe("parseInviteToken", () => {
  it("validates uuid shape", () => {
    expect(parseInviteToken(SAMPLE_TOKEN)).toBe(SAMPLE_TOKEN);
    expect(parseInviteToken("not-a-uuid")).toBeNull();
  });
});
