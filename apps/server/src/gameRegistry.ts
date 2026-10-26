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
  numberMatchMatch,
  initNumberMatchMatch,
  type Game,
} from "@game/engine";
import type { GameId, RoomConfig } from "@game/protocol";

/**
 * `config` is the room's shared `RoomConfig` (see protocol/messages.ts) —
 * when present, each game's board-affecting option is applied; when absent
 * (e.g. solo-only games, or a message that arrived before "joined"), every
 * game falls back to the same defaults it always used.
 */
export function getGame(gameId: GameId, config?: RoomConfig): { game: Game<any, number>; init: () => any } {
  if (gameId === "gomoku") return { game: gomoku, init: () => initGomoku() };
  if (gameId === "o-an-quan") return { game: oAnQuan, init: initOAnQuan };
  if (gameId === "chess") return { game: chess, init: initChess };
  if (gameId === "xiangqi") return { game: xiangqi, init: initXiangqi };
  if (gameId === "go") {
    return { game: go, init: () => initGo(config?.goBoardSize ?? 9, config?.goDeadStoneMode ?? "auto") };
  }
  if (gameId === "battleship") {
    return { game: battleship, init: () => initBattleship(undefined, config?.battleshipHuntRule ?? "again-on-hit") };
  }
  if (gameId === "plane-battle") {
    return { game: planeBattle, init: () => initPlaneBattle(config?.planeBattleVariant ?? "large") };
  }
  if (gameId === "domino") return { game: domino, init: () => initDomino(config?.dominoDrawRule ?? "one") };
  if (gameId === "number-match") return { game: numberMatchMatch, init: () => initNumberMatchMatch("medium") };
  return { game: ticTacToe, init: initTicTacToe };
}
