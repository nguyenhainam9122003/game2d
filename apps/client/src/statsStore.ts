import { create } from "zustand";

interface StatsData {
  gamesPlayed: number;
}

interface StatsState extends StatsData {
  incrementGamesPlayed(): void;
}

const STORAGE_KEY = "ra-choi:stats";

function loadInitial(): StatsData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...{ gamesPlayed: 0 }, ...JSON.parse(raw) };
  } catch {
    // corrupt/blocked storage — fall back to zero
  }
  return { gamesPlayed: 0 };
}

function persist(data: StatsData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** "Ván đã chơi" in the profile screen — one finished round of any game, counted once. */
export const useStatsStore = create<StatsState>((set, get) => ({
  ...loadInitial(),
  incrementGamesPlayed: () => {
    const next = { gamesPlayed: get().gamesPlayed + 1 };
    set(next);
    persist(next);
  },
}));
