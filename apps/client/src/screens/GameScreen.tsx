import { useAppStore } from "../store";
import { TicTacToeGame } from "./TicTacToeGame";
import { GomokuGame } from "./GomokuGame";
import { OAnQuanGame } from "./OAnQuanGame";
import { ChessGame } from "./ChessGame";

export function GameScreen() {
  const gameId = useAppStore((s) => s.gameId);
  if (gameId === "gomoku") return <GomokuGame />;
  if (gameId === "o-an-quan") return <OAnQuanGame />;
  if (gameId === "chess") return <ChessGame />;
  return <TicTacToeGame />;
}
