import { create } from "zustand";
import type { GameId } from "@game/protocol";
import { GAME_IDS } from "./gameMeta";

interface GameOrderState {
  order: GameId[];
  moveUp(id: GameId): void;
  moveDown(id: GameId): void;
  reset(): void;
}

const STORAGE_KEY = "ra-choi:game-order";

function loadInitial(): GameId[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved: GameId[] = JSON.parse(raw);
      const known = new Set<GameId>(GAME_IDS);
      const kept = saved.filter((id) => known.has(id));
      const missing = GAME_IDS.filter((id) => !kept.includes(id));
      return [...kept, ...missing];
    }
  } catch {
    // corrupt/blocked storage — fall back to the default order
  }
  return [...GAME_IDS];
}

function persist(order: GameId[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

export const useGameOrderStore = create<GameOrderState>((set, get) => ({
  order: loadInitial(),
  moveUp: (id) => {
    const order = [...get().order];
    const i = order.indexOf(id);
    if (i <= 0) return;
    [order[i - 1], order[i]] = [order[i], order[i - 1]];
    set({ order });
    persist(order);
  },
  moveDown: (id) => {
    const order = [...get().order];
    const i = order.indexOf(id);
    if (i === -1 || i >= order.length - 1) return;
    [order[i + 1], order[i]] = [order[i], order[i + 1]];
    set({ order });
    persist(order);
  },
  reset: () => {
    set({ order: [...GAME_IDS] });
    persist([...GAME_IDS]);
  },
}));
