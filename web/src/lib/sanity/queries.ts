const postFields = `
  _id,
  title,
  "slug": slug.current,
  publishedAt,
  _updatedAt,
  mainImage,
  "categories": categories[]->{ _id, title },
  "excerpt": coalesce(excerpt, pt::text(body))
`;

export const postsQuery = `
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
    ${postFields}
  }
`;

export const postSlugsQuery = `
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
    "slug": slug.current,
    publishedAt,
    _updatedAt
  }
`;

export const postBySlugQuery = `
  *[_type == "post" && slug.current == $slug][0] {
    ${postFields},
    body,
    isListicle,
    listicleItems,
    faq,
    "author": author->{ name, image }
  }
`;

export const relatedPostsQuery = `
  *[_type == "post" && defined(slug.current) && slug.current != $slug && count((categories[]._ref)[@ in $categoryIds]) > 0]
    | order(publishedAt desc) [0...$limit] {
    ${postFields}
  }
`;
