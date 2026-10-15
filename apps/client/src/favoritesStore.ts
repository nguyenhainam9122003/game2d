import { create } from "zustand";
import type { GameId } from "@game/protocol";

interface FavoritesState {
  favorites: GameId[];
  toggle(id: GameId): void;
  isFavorite(id: GameId): boolean;
}

const STORAGE_KEY = "ra-choi:favorites";

function loadInitial(): GameId[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupt/blocked storage — fall back to no favorites
  }
  return [];
}

function persist(favorites: GameId[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: loadInitial(),
  toggle: (id) => {
    const current = get().favorites;
    const next = current.includes(id) ? current.filter((f) => f !== id) : [...current, id];
    set({ favorites: next });
    persist(next);
  },
  isFavorite: (id) => get().favorites.includes(id),
}));
