import { useAppStore } from "../store";
import { TicTacToeGame } from "./TicTacToeGame";
import { GomokuGame } from "./GomokuGame";
import { OAnQuanGame } from "./OAnQuanGame";
import { ChessGame } from "./ChessGame";
import { XiangqiGame } from "./XiangqiGame";
import { GoGame } from "./GoGame";
import { BattleshipGame } from "./BattleshipGame";
import { PlaneBattleGame } from "./PlaneBattleGame";
import { DominoGame } from "./DominoGame";
import { SudokuGame } from "./SudokuGame";
import { NumberMatchGame } from "./NumberMatchGame";
import { NumberHuntGame } from "./NumberHuntGame";

export function GameScreen() {
  const gameId = useAppStore((s) => s.gameId);
  if (gameId === "gomoku") return <GomokuGame />;
  if (gameId === "o-an-quan") return <OAnQuanGame />;
  if (gameId === "chess") return <ChessGame />;
  if (gameId === "xiangqi") return <XiangqiGame />;
  if (gameId === "go") return <GoGame />;
  if (gameId === "battleship") return <BattleshipGame />;
  if (gameId === "plane-battle") return <PlaneBattleGame />;
  if (gameId === "domino") return <DominoGame />;
  if (gameId === "sudoku") return <SudokuGame />;
  if (gameId === "number-match") return <NumberMatchGame />;
  if (gameId === "number-hunt") return <NumberHuntGame />;
  return <TicTacToeGame />;
}
