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
import { NumberMatchMatchGame } from "./NumberMatchMatchGame";
import { NumberHuntGame } from "./NumberHuntGame";
import { NumberHuntMatchGame } from "./NumberHuntMatchGame";

export function GameScreen() {
  const gameId = useAppStore((s) => s.gameId);
  const mode = useAppStore((s) => s.mode);
  if (gameId === "number-match") return mode === "solo" ? <NumberMatchGame /> : <NumberMatchMatchGame />;
  if (gameId === "number-hunt") return mode === "solo" ? <NumberHuntGame /> : <NumberHuntMatchGame />;
  if (gameId === "gomoku") return <GomokuGame />;
  if (gameId === "o-an-quan") return <OAnQuanGame />;
  if (gameId === "chess") return <ChessGame />;
  if (gameId === "xiangqi") return <XiangqiGame />;
  if (gameId === "go") return <GoGame />;
  if (gameId === "battleship") return <BattleshipGame />;
  if (gameId === "plane-battle") return <PlaneBattleGame />;
  if (gameId === "domino") return <DominoGame />;
  if (gameId === "sudoku") return <SudokuGame />;
  return <TicTacToeGame />;
}
