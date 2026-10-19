import {
  ticTacToe,
  initTicTacToe,
  gomoku,
  initGomoku,
  oAnQuan,
  initOAnQuan,
  chess,
  initChess,
  xiangqi,
  initXiangqi,
  go,
  initGo,
  battleship,
  initBattleship,
  planeBattle,
  initPlaneBattle,
  domino,
  initDomino,
  type Game,
} from "@game/engine";
import type { GameId } from "@game/protocol";

export function getGame(gameId: GameId): { game: Game<any, number>; init: () => any } {
  if (gameId === "gomoku") return { game: gomoku, init: () => initGomoku() };
  if (gameId === "o-an-quan") return { game: oAnQuan, init: initOAnQuan };
  if (gameId === "chess") return { game: chess, init: initChess };
  if (gameId === "xiangqi") return { game: xiangqi, init: initXiangqi };
  if (gameId === "go") return { game: go, init: () => initGo() };
  if (gameId === "battleship") return { game: battleship, init: () => initBattleship() };
  if (gameId === "plane-battle") return { game: planeBattle, init: () => initPlaneBattle() };
  if (gameId === "domino") return { game: domino, init: initDomino };
  return { game: ticTacToe, init: initTicTacToe };
}
