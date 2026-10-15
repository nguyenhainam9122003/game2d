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
};

export const GAME_IDS: GameId[] = ["tic-tac-toe", "gomoku", "o-an-quan", "chess"];
