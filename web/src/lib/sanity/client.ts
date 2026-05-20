import { createClient } from "next-sanity";

/** Public Sanity project — safe to default so Vercel builds without extra env vars. */
export const sanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "n1nyntv9";
export const sanityDataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
export const sanityApiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2024-01-01";

export const sanityConfigured = Boolean(sanityProjectId && sanityDataset);

export const sanityClient = createClient({
  projectId: sanityProjectId,
  dataset: sanityDataset,
  apiVersion: sanityApiVersion,
  useCdn: true,
});

export async function fetchSanity<T>(query: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!sanityConfigured) return [] as T;
  try {
    return await sanityClient.fetch<T>(query, params);
  } catch {
    return [] as T;
  }
}
