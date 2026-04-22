import path from "node:path";
import type { NextConfig } from "next";

/** Repo root (parent of `hero-repro/`). Matches Vercel’s workspace root when deploy root is the Git repo. */
const repoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  // Monorepo: trace files against the Git repo root so bundled serverless deps resolve consistently.
  outputFileTracingRoot: repoRoot,
  // Align with Vercel’s workspace root; avoids turbopack / tracing mismatch warnings.
  turbopack: {
    root: repoRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
