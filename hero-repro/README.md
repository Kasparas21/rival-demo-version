This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Apify (ads)

Set `APIFY_TOKEN` in `.env.local`. Optional actor overrides: see [`.env.local.example`](./.env.local.example).

**Server**: `import { runApifyActor } from "@/lib/apify/client"` — used by [`/api/ads/library`](./src/app/api/ads/library/route.ts) for Meta, Google Ads Transparency, LinkedIn Ad Library, and TikTok Ads Library (see `src/lib/apify/*.ts`).

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/api/apify/run` | `{ "actorId", "input", "maxItems?" }` — **lock down in production** (auth / allowlist) |

### Competitor Ads Library (`POST /api/ads/library`)

The dashboard uses `useAdLibrary`, which deduplicates requests and caches successful responses (see `src/lib/ad-library/deduped-fetch.ts`). Use **Refresh** to bypass the cache.

- **`platforms`** (optional): `"meta"`, `"google"`, `"linkedin"`, `"tiktok"`. If omitted, all four run. Subset responses include `"partial": true` and merge on the client.
- **Cap**: `ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM` per platform.

- **`NEXT_PUBLIC_GOOGLE_AD_DETAILS`**: when `true`, the Google Apify actor runs with `skipDetails: false` (richer fields, slower). When unset/false, `skipDetails: true`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
