import {
  ticTacToe,
  initTicTacToe,
  gomoku,
  initGomoku,
  oAnQuan,
  initOAnQuan,
  chess,
  initChess,
  type Game,
} from "@game/engine";
import type { GameId } from "@game/protocol";

export function getGame(gameId: GameId): { game: Game<any, number>; init: () => any } {
  if (gameId === "gomoku") return { game: gomoku, init: () => initGomoku() };
  if (gameId === "o-an-quan") return { game: oAnQuan, init: initOAnQuan };
  if (gameId === "chess") return { game: chess, init: initChess };
  return { game: ticTacToe, init: initTicTacToe };
}
