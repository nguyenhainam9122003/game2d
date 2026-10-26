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
  getTicTacToeBotMove,
  getGomokuBotMove,
  getOAnQuanBotMove,
  getChessBotMove,
  getXiangqiBotMove,
  getGoBotMove,
  getBattleshipBotMove,
  getPlaneBattleBotMove,
  getDominoBotMove,
  getNumberMatchBotMove,
  type Game,
  type Difficulty,
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
  if (gameId === "number-match") {
    // No pre-match difficulty selector exists for online yet (2 real players, no bot to size
    // against) — fixed at "medium" for now, same simplification as other not-yet-configurable
    // online defaults. Local vs-bot/2-player modes size it from the chosen bot difficulty instead.
    return { game: numberMatchMatch, init: () => initNumberMatchMatch("medium") };
  }
  return { game: ticTacToe, init: initTicTacToe };
}

/**
 * Used online for the "Theo nước" (per-move) clock: unlike "chơi với máy", there's no bot
 * already driving the opponent, so when a real player's own per-move timer expires, their own
 * client auto-plays an easy move for them — mirroring what "2 người chung máy" already does
 * locally. Always "easy" difficulty since this is a timeout bailout, not a real bot turn.
 */
export function getBotMove(gameId: GameId, state: any, difficulty: Difficulty = "easy"): number {
  if (gameId === "gomoku") return getGomokuBotMove(state, difficulty);
  if (gameId === "o-an-quan") return getOAnQuanBotMove(state, difficulty);
  if (gameId === "chess") return getChessBotMove(state, difficulty);
  if (gameId === "xiangqi") return getXiangqiBotMove(state, difficulty);
  if (gameId === "go") return getGoBotMove(state, difficulty);
  if (gameId === "battleship") return getBattleshipBotMove(state, difficulty);
  if (gameId === "plane-battle") return getPlaneBattleBotMove(state, difficulty);
  if (gameId === "domino") return getDominoBotMove(state, difficulty);
  if (gameId === "number-match") return getNumberMatchBotMove(state, difficulty);
  return getTicTacToeBotMove(state, difficulty);
}
