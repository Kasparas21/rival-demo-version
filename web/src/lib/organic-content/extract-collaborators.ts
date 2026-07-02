import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import type { NormalizedOrganicPost } from "./types";

const MENTION_RE = /@[\w.]+/g;

type CollabAccumulator = {
  handle: string;
  display_name?: string;
  profile_url?: string;
  avatar_url?: string;
  collab_types: string[];
  post_count: number;
};

function normalizeMentionHandle(raw: string): string {
  return raw.startsWith("@") ? raw : `@${raw}`;
}

function mergeCollabTypes(existing: string[], incoming: string[]): string[] {
  return [...new Set([...existing, ...incoming])];
}

export async function extractAndUpsertCollaborators(
  admin: SupabaseClient<Database>,
  params: {
    competitorId: string;
    userId: string;
    posts: NormalizedOrganicPost[];
  },
): Promise<void> {
  const { competitorId, userId, posts } = params;

  for (const post of posts) {
    const platform = post.platform;
    const collaborators = new Map<string, CollabAccumulator>();

    const mentions = post.content?.match(MENTION_RE) ?? [];
    for (const mention of mentions) {
      const handle = normalizeMentionHandle(mention);
      const existing = collaborators.get(handle) ?? {
        handle,
        collab_types: [],
        post_count: 0,
      };
      existing.collab_types = mergeCollabTypes(existing.collab_types, ["mentioned"]);
      existing.post_count += 1;
      collaborators.set(handle, existing);
    }

    for (const account of post.tagged_accounts) {
      const h = account.handle ?? account.username;
      if (!h) continue;
      const handle = normalizeMentionHandle(h.replace(/^@/, ""));
      const existing = collaborators.get(handle) ?? {
        handle,
        collab_types: [],
        post_count: 0,
      };
      existing.display_name = account.name ?? existing.display_name;
      existing.profile_url = account.url ?? existing.profile_url;
      existing.collab_types = mergeCollabTypes(existing.collab_types, ["tagged"]);
      existing.post_count += 1;
      collaborators.set(handle, existing);
    }

    for (const author of post.co_authors) {
      const h = author.handle ?? author.username;
      if (!h) continue;
      const handle = normalizeMentionHandle(h.replace(/^@/, ""));
      const existing = collaborators.get(handle) ?? {
        handle,
        collab_types: [],
        post_count: 0,
      };
      existing.display_name = author.name ?? existing.display_name;
      existing.profile_url = author.url ?? existing.profile_url;
      existing.collab_types = mergeCollabTypes(existing.collab_types, ["co_author"]);
      existing.post_count += 1;
      collaborators.set(handle, existing);
    }

    for (const data of collaborators.values()) {
      const { error } = await admin.rpc("upsert_organic_collaborator", {
        p_competitor_id: competitorId,
        p_user_id: userId,
        p_platform: platform,
        p_handle: data.handle,
        p_display_name: data.display_name ?? null,
        p_profile_url: data.profile_url ?? null,
        p_avatar_url: data.avatar_url ?? null,
        p_collab_types: data.collab_types,
        p_post_count_delta: data.post_count,
      });
      if (error) {
        console.error("[organic] collaborator upsert failed:", error.message);
      }
    }
  }
}
