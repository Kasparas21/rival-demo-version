import createImageUrlBuilder, { type SanityImageSource } from "@sanity/image-url";

import { sanityDataset, sanityProjectId } from "@/lib/sanity/client";

const builder = createImageUrlBuilder({
  projectId: sanityProjectId,
  dataset: sanityDataset,
});

export function urlForImage(source: SanityImageSource) {
  return builder.image(source);
}
