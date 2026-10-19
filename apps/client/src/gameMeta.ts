import type { GameId } from "@game/protocol";

export interface GameMeta {
  icon: string;
  color: string;
  titleKey: string;
  descKey: string;
}

export const GAME_META: Record<GameId, GameMeta> = {
  "tic-tac-toe": { icon: "⭕", color: "#f8aed0", titleKey: "game.ticTacToe", descKey: "game.ticTacToeDesc" },
  gomoku: { icon: "⚫", color: "#2fb7a3", titleKey: "game.gomoku", descKey: "game.gomokuDesc" },
  "o-an-quan": { icon: "🌾", color: "#8cc563", titleKey: "game.oAnQuan", descKey: "game.oAnQuanDesc" },
  chess: { icon: "♟️", color: "#cfa876", titleKey: "game.chess", descKey: "game.chessDesc" },
  xiangqi: { icon: "🀄", color: "#d98c4a", titleKey: "game.xiangqi", descKey: "game.xiangqiDesc" },
  go: { icon: "⚪", color: "#e0c08c", titleKey: "game.go", descKey: "game.goDesc" },
  battleship: { icon: "🚢", color: "#7fb3d5", titleKey: "game.battleship", descKey: "game.battleshipDesc" },
  "plane-battle": { icon: "✈️", color: "#9fc6e0", titleKey: "game.planeBattle", descKey: "game.planeBattleDesc" },
  domino: { icon: "🁣", color: "#444c5c", titleKey: "game.domino", descKey: "game.dominoDesc" },
  sudoku: { icon: "🔢", color: "#a7c4e0", titleKey: "game.sudoku", descKey: "game.sudokuDesc" },
  "number-match": { icon: "🔟", color: "#f0b86e", titleKey: "game.numberMatch", descKey: "game.numberMatchDesc" },
  "number-hunt": { icon: "🔍", color: "#b7d49a", titleKey: "game.numberHunt", descKey: "game.numberHuntDesc" },
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

/** Games with no opponent (puzzle games) — these hide the local-2-player / online rows in the detail screen. */
export const SOLO_ONLY_GAMES: GameId[] = ["sudoku", "number-match", "number-hunt"];
