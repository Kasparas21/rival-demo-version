import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseAdminEmailsFromEnv, resolveAdminUser, verifiedAuthEmail } from "@/lib/admin/auth";
import type { Database } from "@/lib/supabase/types";

type AdminRow = { user_id: string; email: string; role: string };

/** Minimal stand-in for the service-role client: only `admin_users` exists. */
function fakeAdminClient(rows: AdminRow[]) {
  const tablesRead: string[] = [];
  const upserts: AdminRow[] = [];
  const client = {
    from(table: string) {
      tablesRead.push(table);
      return {
        select() {
          return {
            eq(_column: string, userId: string) {
              return {
                maybeSingle: async () => {
                  const row = table === "admin_users" ? rows.find((r) => r.user_id === userId) : undefined;
                  return { data: row ?? null, error: null };
                },
              };
            },
          };
        },
        upsert: async (row: AdminRow) => {
          upserts.push(row);
          rows.push(row);
          return { error: null };
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient<Database>, tablesRead, upserts };
}

const CONFIRMED = "2026-01-01T00:00:00Z";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("parseAdminEmailsFromEnv", () => {
  it("has no built-in admins", () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(parseAdminEmailsFromEnv()).toEqual([]);
  });

  it("reads and normalises ADMIN_EMAILS", () => {
    vi.stubEnv("ADMIN_EMAILS", " Owner@Example.com, ops@example.com ,owner@example.com");
    expect(parseAdminEmailsFromEnv()).toEqual(["owner@example.com", "ops@example.com"]);
  });
});

describe("verifiedAuthEmail", () => {
  it("ignores an email Supabase has not verified", () => {
    expect(verifiedAuthEmail({ id: "u", email: "owner@example.com", email_confirmed_at: null })).toBeNull();
    expect(verifiedAuthEmail({ id: "u", email: "Owner@Example.com", email_confirmed_at: CONFIRMED })).toBe(
      "owner@example.com",
    );
  });
});

describe("resolveAdminUser", () => {
  it("keeps admins that have an admin_users row", async () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    const { client } = fakeAdminClient([{ user_id: "u1", email: "a@example.com", role: "admin" }]);
    await expect(resolveAdminUser(client, { id: "u1", email: "a@example.com", email_confirmed_at: CONFIRMED })).resolves.toEqual({
      userId: "u1",
      email: "a@example.com",
      role: "admin",
    });
  });

  it("refuses everyone else without reading billing or profile data", async () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    const { client, tablesRead, upserts } = fakeAdminClient([]);
    await expect(resolveAdminUser(client, { id: "tester", email: "t@example.com", email_confirmed_at: CONFIRMED })).resolves.toBeNull();
    expect(tablesRead).toEqual(["admin_users"]);
    expect(upserts).toEqual([]);
  });

  it("promotes a listed email only once it is verified", async () => {
    vi.stubEnv("ADMIN_EMAILS", "owner@example.com");
    const unverified = fakeAdminClient([]);
    await expect(
      resolveAdminUser(unverified.client, { id: "u2", email: "owner@example.com", email_confirmed_at: null }),
    ).resolves.toBeNull();
    expect(unverified.upserts).toEqual([]);

    const verified = fakeAdminClient([]);
    await expect(
      resolveAdminUser(verified.client, { id: "u2", email: "Owner@example.com", email_confirmed_at: CONFIRMED }),
    ).resolves.toMatchObject({ userId: "u2", email: "owner@example.com", role: "admin" });
    expect(verified.upserts).toEqual([{ user_id: "u2", email: "owner@example.com", role: "admin" }]);
  });
});
