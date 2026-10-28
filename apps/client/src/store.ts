import { create } from "zustand";
import type { Difficulty } from "@game/engine";
import { isValidRoomCode, normalizeRoomCode, type GameId } from "@game/protocol";

export type { GameId };
/** "solo" is the old single-player puzzle screen for games that also now offer real
 *  opponents (e.g. Ghép số's separate "Chơi một mình" row) — see `GAMES_WITH_SOLO_MODE`. */
export type Mode = "vs-bot" | "two-players" | "online" | "solo";
export type Screen = "landing" | "home" | "gameDetail" | "game" | "online" | "settings" | "messages";

/** A room code from an invite link (`?room=CODE`) present on the very first page load — read
 *  once here, at module init, rather than in `OnlineScreen`'s own effect (which only runs once
 *  that screen is already mounted). Without this, a cold visit to an invite link would show the
 *  new landing screen instead of joining the room — `OnlineScreen` already knows how to consume
 *  `pendingRoomCode` once set (same code path as the header's "Vào bàn" quick-join), so seeding
 *  it here is enough; no other wiring needed. */
function initialRoomCodeFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("room");
  if (!raw) return null;
  const normalized = normalizeRoomCode(raw);
  return isValidRoomCode(normalized) ? normalized : null;
}

const initialRoomCode = initialRoomCodeFromUrl();

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
  startSolo(): void;
  joinRoomByCode(code: string): void;
  clearPendingRoomCode(): void;
  goHome(): void;
  goToGameDetail(): void;
  goToSettings(): void;
  goToMessages(): void;
}

export const useAppStore = create<AppState>((set) => ({
  screen: initialRoomCode ? "online" : "landing",
  gameId: "tic-tac-toe",
  mode: initialRoomCode ? "online" : "vs-bot",
  difficulty: "medium",
  pendingRoomCode: initialRoomCode,
  openGame: (gameId) => set({ gameId, screen: "gameDetail" }),
  startVsBot: (difficulty) => set({ mode: "vs-bot", difficulty, screen: "game" }),
  startTwoPlayers: () => set({ mode: "two-players", screen: "game" }),
  startOnline: () => set({ mode: "online", screen: "online" }),
  startSolo: () => set({ mode: "solo", screen: "game" }),
  joinRoomByCode: (code) => set({ mode: "online", screen: "online", pendingRoomCode: code }),
  clearPendingRoomCode: () => set({ pendingRoomCode: null }),
  goHome: () => set({ screen: "home" }),
  goToGameDetail: () => set({ screen: "gameDetail" }),
  goToSettings: () => set({ screen: "settings" }),
  goToMessages: () => set({ screen: "messages" }),
}));
