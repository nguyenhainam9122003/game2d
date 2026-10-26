import type { GameId } from "@game/protocol";

export interface GameMeta {
  color: string;
  titleKey: string;
  descKey: string;
}

export const GAME_META: Record<GameId, GameMeta> = {
  "tic-tac-toe": { color: "#f8aed0", titleKey: "game.ticTacToe", descKey: "game.ticTacToeDesc" },
  gomoku: { color: "#2fb7a3", titleKey: "game.gomoku", descKey: "game.gomokuDesc" },
  "o-an-quan": { color: "#8cc563", titleKey: "game.oAnQuan", descKey: "game.oAnQuanDesc" },
  chess: { color: "#cfa876", titleKey: "game.chess", descKey: "game.chessDesc" },
  xiangqi: { color: "#d98c4a", titleKey: "game.xiangqi", descKey: "game.xiangqiDesc" },
  go: { color: "#e0c08c", titleKey: "game.go", descKey: "game.goDesc" },
  battleship: { color: "#7fb3d5", titleKey: "game.battleship", descKey: "game.battleshipDesc" },
  "plane-battle": { color: "#9fc6e0", titleKey: "game.planeBattle", descKey: "game.planeBattleDesc" },
  // Lighter than the original dark-navy pick so the dark line-art icon stays readable on top.
  domino: { color: "#cbd2d9", titleKey: "game.domino", descKey: "game.dominoDesc" },
  sudoku: { color: "#a7c4e0", titleKey: "game.sudoku", descKey: "game.sudokuDesc" },
  "number-match": { color: "#f0b86e", titleKey: "game.numberMatch", descKey: "game.numberMatchDesc" },
  "number-hunt": { color: "#b7d49a", titleKey: "game.numberHunt", descKey: "game.numberHuntDesc" },
};

export const GAME_IDS: GameId[] = [
  "tic-tac-toe",
  "gomoku",
  "o-an-quan",
  "chess",
  "xiangqi",
  "go",
  "battleship",
  "plane-battle",
  "domino",
  "sudoku",
  "number-match",
  "number-hunt",
];

/** Games with no opponent at all (puzzle games) — these hide the vs-bot/local-2-player/online
 *  rows entirely in the detail screen. Empty for now — every puzzle game ended up with some
 *  form of multiplayer (Sudoku's is online-only, see `GAMES_WITHOUT_TWO_PLAYER_LOCAL` below). */
export const SOLO_ONLY_GAMES: GameId[] = [];

/** Games that offer BOTH a real opponent AND a genuine solo mode (no bot at all). Sudoku's solo
 *  mode is just its 4 difficulty buttons (no separate button needed, see
 *  `GAMES_WHERE_DIFFICULTY_IS_SOLO`) — Ghép số/Tìm số instead repurposed their difficulty
 *  buttons for a real bot opponent, so they need a dedicated "🧍 Chơi một mình" row. */
export const GAMES_WITH_SOLO_MODE: GameId[] = ["number-match", "number-hunt", "sudoku"];

/** Of the games above, these have no bot at all — the difficulty buttons already launch solo
 *  play directly, so the detail screen skips the redundant dedicated "🧍 Chơi một mình" row. */
export const GAMES_WHERE_DIFFICULTY_IS_SOLO: GameId[] = ["sudoku"];

/** Games without "Chơi online" — Tìm số's "Chơi với máy" on rachoi.app is a real-time
 *  simultaneous race (no turns, no pass/undo), a different architecture from every other game's
 *  turn-based `Game<S,M>`; an online protocol that isn't turn-locked is an open design question,
 *  deferred — see PLAN.md / lm dở.md. */
export const GAMES_WITHOUT_ONLINE: GameId[] = ["number-hunt"];

/** Games without "2 người chung máy" (local hot-seat on one device) — doesn't make sense for
 *  Sudoku (both would need their own screen at once) and Tìm số (needs split-screen UX, not
 *  built). Online play is unaffected by this list. */
export const GAMES_WITHOUT_TWO_PLAYER_LOCAL: GameId[] = ["sudoku", "number-hunt"];
