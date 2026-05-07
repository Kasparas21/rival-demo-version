import bundleAnalyzer from "@next/bundle-analyzer";
import path from "node:path";
import type { NextConfig } from "next";

/** Repo root (parent of `web/`). Matches Vercel workspace root when deploy root is the Git repo. */
const repoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "scontent.cdninstagram.com", pathname: "/**" },
      { protocol: "https", hostname: "video.xx.fbcdn.net", pathname: "/**" },
      { protocol: "https", hostname: "scontent.xx.fbcdn.net", pathname: "/**" },
    ],
  },
};

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

export default withBundleAnalyzer(nextConfig);
