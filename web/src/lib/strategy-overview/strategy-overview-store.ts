import { create } from "zustand";

import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";

export type StrategyViewMode = "map" | "insight";

type Store = {
  view: StrategyViewMode;
  selectedPlatform: StrategyPlatform | null;
  selectedAngle: string | null;
  setView: (v: StrategyViewMode) => void;
  setSelectedPlatform: (p: StrategyPlatform | null) => void;
  setSelectedAngle: (a: string | null) => void;
};

export const useStrategyOverviewUi = create<Store>((set) => ({
  view: "map",
  selectedPlatform: null,
  selectedAngle: null,
  setView: (view) => set({ view }),
  setSelectedPlatform: (selectedPlatform) => set({ selectedPlatform }),
  setSelectedAngle: (selectedAngle) => set({ selectedAngle }),
}));
