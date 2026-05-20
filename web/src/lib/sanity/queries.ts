export const postsQuery = `
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    mainImage,
    "categories": categories[]->{ title },
    "excerpt": pt::text(body)
  }
`;

export const postSlugsQuery = `
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
    "slug": slug.current,
    publishedAt
  }
`;

export const postBySlugQuery = `
  *[_type == "post" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    mainImage,
    body,
    "categories": categories[]->{ title },
    "author": author->{ name, image },
    "excerpt": pt::text(body)
  }
`;
