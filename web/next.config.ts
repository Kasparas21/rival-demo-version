import bundleAnalyzer from "@next/bundle-analyzer";
import path from "node:path";
import type { NextConfig } from "next";

import { POSTHOG_EU_API_HOST } from "./src/lib/analytics/posthog-config";

/** Repo root (parent of `web/`). Matches Vercel workspace root when deploy root is the Git repo. */
const repoRoot = path.join(__dirname, "..");

const posthogApiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || POSTHOG_EU_API_HOST;
const posthogAssetsHost = posthogApiHost
  .replace("https://eu.i.posthog.com", "https://eu-assets.i.posthog.com")
  .replace("https://us.i.posthog.com", "https://us-assets.i.posthog.com");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
  skipTrailingSlashRedirect: true,
  webpack: (config, { dev }) => {
    if (dev) {
      config.output = { ...config.output, chunkLoadTimeout: 300_000 };
    }
    return config;
  },
  turbopack: {
    root: repoRoot,
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${posthogAssetsHost}/static/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `${posthogApiHost}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "scontent.cdninstagram.com", pathname: "/**" },
      { protocol: "https", hostname: "video.xx.fbcdn.net", pathname: "/**" },
      { protocol: "https", hostname: "scontent.xx.fbcdn.net", pathname: "/**" },
      { protocol: "https", hostname: "8g55zxgme2.ufs.sh", pathname: "/f/**" },
      { protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Home varies by locale + hero A/B cookies — short edge cache, revalidate in background.
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "private, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
          { key: "Vary", value: "Cookie, x-vercel-ip-country" },
        ],
      },
      {
        source: "/reports/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/((?!dashboard|checkout|api).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },
};

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

export default withBundleAnalyzer(nextConfig);
