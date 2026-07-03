"use client";

import dynamic from "next/dynamic";

import CompetitorLoading from "./loading";

/** Lazy-load the heavy competitor dashboard so the route chunk compiles/serves faster in dev. */
export const CompetitorContent = dynamic(
  () => import("./competitor-client").then((mod) => mod.CompetitorContent),
  { loading: () => <CompetitorLoading /> },
);
