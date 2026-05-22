"use client";

import { createContext, useContext } from "react";

export type RecomputePollState = {
  recomputeRunning: boolean;
  recomputeStatus: "idle" | "running" | "failed" | "unknown";
  recomputeError: string | null;
};

const defaultState: RecomputePollState = {
  recomputeRunning: false,
  recomputeStatus: "unknown",
  recomputeError: null,
};

const RecomputePollContext = createContext<RecomputePollState>(defaultState);

export function useRecomputePoll(): RecomputePollState {
  return useContext(RecomputePollContext);
}

export const RecomputePollProvider = RecomputePollContext.Provider;
