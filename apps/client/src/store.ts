import { create } from "zustand";
import type { Difficulty } from "@game/engine";
import { isValidRoomCode, normalizeRoomCode, type GameId } from "@game/protocol";
import { GAME_IDS } from "./gameMeta";

export type { GameId };
/** "solo" is the old single-player puzzle screen for games that also now offer real
 *  opponents (e.g. Ghép số's separate "Chơi một mình" row) — see `GAMES_WITH_SOLO_MODE`. */
export type Mode = "vs-bot" | "two-players" | "online" | "solo";
export type Screen = "landing" | "rules" | "home" | "gameDetail" | "game" | "online" | "settings" | "messages";

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

/** The landing page ("/") and the app itself ("/play") are separate routes — see `App.tsx`'s
 *  history sync effect. A direct/bookmarked visit to "/play" (or any sub-path of it) should
 *  skip the landing page even without a room code. */
function startsInApp(): boolean {
  return window.location.pathname.startsWith("/play");
}

/** A direct/bookmarked/shared visit to `/rules/<gameId>` — a public, no-login-needed page
 *  explaining one game's rules (linked from the landing page's game grid). Read once here at
 *  module init, same pattern as `initialRoomCodeFromUrl`, so the very first render already shows
 *  the right rules page instead of flashing the landing page first. */
function initialRulesGameIdFromUrl(): GameId | null {
  const match = window.location.pathname.match(/^\/rules\/([a-z0-9-]+)\/?$/);
  if (!match) return null;
  const id = match[1] as GameId;
  return (GAME_IDS as string[]).includes(id) ? id : null;
}

const initialRulesGameId = initialRulesGameIdFromUrl();

interface AppState {
  screen: Screen;
  gameId: GameId;
  /** Which game's public rules page (`/rules/<gameId>`) is showing — only meaningful while
   *  `screen === "rules"`, kept separate from `gameId` so opening a rules page never disturbs
   *  whatever game the app itself was mid-navigating to. */
  rulesGameId: GameId | null;
  mode: Mode;
  difficulty: Difficulty;
  /** Room code from the header's "Vào bàn" quick-join, consumed once by OnlineScreen. */
  pendingRoomCode: string | null;
  openGame(gameId: GameId): void;
  openRules(gameId: GameId): void;
  startVsBot(difficulty: Difficulty): void;
  startTwoPlayers(): void;
  startOnline(): void;
  startSolo(): void;
  joinRoomByCode(code: string): void;
  clearPendingRoomCode(): void;
  goHome(): void;
  goToLanding(): void;
  goToGameDetail(): void;
  goToSettings(): void;
  goToMessages(): void;
}

export const useAppStore = create<AppState>((set) => ({
  screen: initialRoomCode ? "online" : initialRulesGameId ? "rules" : startsInApp() ? "home" : "landing",
  gameId: "tic-tac-toe",
  rulesGameId: initialRulesGameId,
  mode: initialRoomCode ? "online" : "vs-bot",
  difficulty: "medium",
  pendingRoomCode: initialRoomCode,
  openGame: (gameId) => set({ gameId, screen: "gameDetail" }),
  openRules: (gameId) => set({ rulesGameId: gameId, screen: "rules" }),
  startVsBot: (difficulty) => set({ mode: "vs-bot", difficulty, screen: "game" }),
  startTwoPlayers: () => set({ mode: "two-players", screen: "game" }),
  startOnline: () => set({ mode: "online", screen: "online" }),
  startSolo: () => set({ mode: "solo", screen: "game" }),
  joinRoomByCode: (code) => set({ mode: "online", screen: "online", pendingRoomCode: code }),
  clearPendingRoomCode: () => set({ pendingRoomCode: null }),
  goHome: () => set({ screen: "home" }),
  goToLanding: () => set({ screen: "landing" }),
  goToGameDetail: () => set({ screen: "gameDetail" }),
  goToSettings: () => set({ screen: "settings" }),
  goToMessages: () => set({ screen: "messages" }),
}));
