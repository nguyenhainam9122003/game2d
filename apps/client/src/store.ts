import { create } from "zustand";
import type { Difficulty } from "@game/engine";
import type { GameId } from "@game/protocol";

export type { GameId };
export type Mode = "vs-bot" | "two-players" | "online";
export type Screen = "home" | "gameDetail" | "game" | "online" | "settings" | "messages";

interface AppState {
  screen: Screen;
  gameId: GameId;
  mode: Mode;
  difficulty: Difficulty;
  /** Room code from the header's "Vào bàn" quick-join, consumed once by OnlineScreen. */
  pendingRoomCode: string | null;
  openGame(gameId: GameId): void;
  startVsBot(difficulty: Difficulty): void;
  startTwoPlayers(): void;
  startOnline(): void;
  joinRoomByCode(code: string): void;
  clearPendingRoomCode(): void;
  goHome(): void;
  goToGameDetail(): void;
  goToSettings(): void;
  goToMessages(): void;
}

export const useAppStore = create<AppState>((set) => ({
  screen: "home",
  gameId: "tic-tac-toe",
  mode: "vs-bot",
  difficulty: "medium",
  pendingRoomCode: null,
  openGame: (gameId) => set({ gameId, screen: "gameDetail" }),
  startVsBot: (difficulty) => set({ mode: "vs-bot", difficulty, screen: "game" }),
  startTwoPlayers: () => set({ mode: "two-players", screen: "game" }),
  startOnline: () => set({ mode: "online", screen: "online" }),
  joinRoomByCode: (code) => set({ mode: "online", screen: "online", pendingRoomCode: code }),
  clearPendingRoomCode: () => set({ pendingRoomCode: null }),
  goHome: () => set({ screen: "home" }),
  goToGameDetail: () => set({ screen: "gameDetail" }),
  goToSettings: () => set({ screen: "settings" }),
  goToMessages: () => set({ screen: "messages" }),
}));
