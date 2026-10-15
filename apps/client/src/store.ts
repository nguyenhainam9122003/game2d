import { create } from "zustand";
import type { Difficulty } from "@game/engine";
import type { GameId } from "@game/protocol";

export type { GameId };
export type Mode = "vs-bot" | "two-players" | "online";
export type Screen = "home" | "game" | "online";

interface AppState {
  screen: Screen;
  gameId: GameId;
  mode: Mode;
  difficulty: Difficulty;
  setGameId(gameId: GameId): void;
  setMode(mode: Mode): void;
  setDifficulty(difficulty: Difficulty): void;
  goToGame(): void;
  goHome(): void;
}

export const useAppStore = create<AppState>((set, get) => ({
  screen: "home",
  gameId: "tic-tac-toe",
  mode: "vs-bot",
  difficulty: "medium",
  setGameId: (gameId) => set({ gameId }),
  setMode: (mode) => set({ mode }),
  setDifficulty: (difficulty) => set({ difficulty }),
  goToGame: () => set({ screen: get().mode === "online" ? "online" : "game" }),
  goHome: () => set({ screen: "home" }),
}));
