import type { OrganicPostCardData } from "@/components/organic/OrganicPostCard";
import type { OrganicPostSort } from "@/lib/organic-content/types";

export type OrganicPostsApiResponse = {
  ok?: boolean;
  error?: string;
  posts?: OrganicPostCardData[];
  total?: number;
  page?: number;
  pageSize?: number;
  last_scraped_at?: string | null;
  platformsWithPosts?: string[];
};

export async function fetchOrganicPosts(
  competitorId: string,
  opts: {
    platform: string;
    sort: OrganicPostSort;
    page: number;
    pageSize: number;
  },
): Promise<OrganicPostsApiResponse> {
  const params = new URLSearchParams({
    platform: opts.platform,
    sort: opts.sort,
    page: String(opts.page),
    pageSize: String(opts.pageSize),
  });
  const res = await fetch(`/api/competitor/${competitorId}/organic/posts?${params.toString()}`);
  const data = (await res.json()) as OrganicPostsApiResponse;
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? "Failed to load posts");
  }
  return data;
}
