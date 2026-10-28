export type GameId =
  | "tic-tac-toe"
  | "gomoku"
  | "o-an-quan"
  | "chess"
  | "xiangqi"
  | "go"
  | "battleship"
  | "plane-battle"
  | "domino"
  | "sudoku"
  | "number-match"
  | "number-hunt";
export type Slot = 1 | 2;

export interface MoveRecord {
  seq: number;
  move: number;
  player: Slot;
}

/**
 * Pre-match settings the room creator picked locally (clock, match length,
 * and the per-game board/rule options from `gameOptionsStore`) — sent once
 * when a brand-new room is created so the server can persist it and hand
 * the same values to whoever joins, instead of each side silently using
 * their own local defaults. Only covers games that support online play;
 * solo-only puzzle games don't need a shared config.
 */
export type SudokuTwoPlayerMode = "race" | "co-op";

export interface RoomConfig {
  clockMode: "none" | "clock" | "per-move";
  clockInitialSeconds: number;
  clockIncrementSeconds: number;
  perMoveSeconds: number;
  matchLength: number;
  goBoardSize: number;
  goDeadStoneMode: "auto" | "manual";
  planeBattleVariant: "small" | "large";
  battleshipHuntRule: "again-on-hit" | "one-per-turn";
  dominoDrawRule: "one" | "until-playable" | "none";
  sudokuTwoPlayerMode: SudokuTwoPlayerMode;
}

/** A player's full-match ("Đồng hồ cờ") clock ran out — see `GameRoom.handleTimeout`. */
export interface TimeoutEnding {
  type: "timeout";
  loser: Slot;
}

/** Sent from a client to the room's WebSocket. */
export type ClientMessage =
  | { type: "join"; playerId: string; gameId: GameId; name?: string; gameConfig?: RoomConfig }
  | { type: "move"; move: number }
  | { type: "chat"; text: string }
  | { type: "restart" }
  /** Either client may report this — whichever notices its local clock, driven by the same
   *  synced game state, reach zero first for the player currently on the move. */
  | { type: "timeout" }
  /** Sudoku has no `Game<S,M>` engine (not turn-based), so its online sync is these 3 ad-hoc
   *  messages instead of "move" — see `GameRoom`'s `handleSudoku*` methods. Sent once by whoever
   *  is slot 1, right after joining, to seed the room with a puzzle both sides then share. */
  | { type: "sudokuPuzzle"; givens: (number | null)[]; solution: number[] }
  /** "Cùng giải" (co-op) only — broadcasts one cell edit to the shared grid. */
  | { type: "sudokuCell"; index: number; value: number | null }
  /** "Đua" (race) only — sent once by each side's own independent board when it's solved;
   *  the server marks whichever one it receives first as the winner. */
  | { type: "sudokuDone"; elapsedMs: number }
  /** Ask the opponent's permission to take back the sender's last turn (plus whatever the
   *  opponent played in reply, if anything) — see `GameRoom.handleUndoRequest`. */
  | { type: "undoRequest" }
  /** The opponent's answer to a pending `undoRequest`. */
  | { type: "undoResponse"; accept: boolean };

/** Sent from the room's WebSocket to a client. */
export type ServerMessage =
  | {
      type: "joined";
      slot: Slot;
      gameId: GameId;
      code: string;
      opponentConnected: boolean;
      gameConfig?: RoomConfig;
      endedBy?: TimeoutEnding;
      /** Sudoku-only reconnect/late-join sync — see the `ClientMessage` sudoku* variants. */
      sudokuPuzzle?: { givens: (number | null)[]; solution: number[] };
      sudokuGrid?: (number | null)[];
      sudokuWinner?: Slot;
      sudokuDoneAt?: Partial<Record<Slot, number>>;
    }
  | { type: "sync"; moves: MoveRecord[] }
  | { type: "opponent-joined" }
  | { type: "opponent-left" }
  | { type: "opponent-reconnected" }
  | { type: "move"; seq: number; move: number; player: Slot }
  | { type: "chat"; text: string; from: Slot }
  | { type: "restart" }
  | { type: "room-full" }
  | { type: "error"; message: string }
  | { type: "sudokuPuzzle"; givens: (number | null)[]; solution: number[] }
  | { type: "sudokuCell"; index: number; value: number | null; from: Slot }
  | { type: "sudokuDone"; elapsedMs: number; from: Slot; winner: boolean }
  /** Sent only to the non-requesting player, asking them to accept/decline. */
  | { type: "undoRequest"; by: Slot }
  /** Broadcast to both sides whenever a pending request is cleared WITHOUT being applied
   *  (declined by the opponent, or silently cancelled because a new move came in while it
   *  was pending) — a successful undo instead arrives as the "undo" message below. */
  | { type: "undoResponse"; accept: false }
  /** The pending request was accepted — authoritative move log after the rollback, same
   *  shape/handling as "sync". */
  | { type: "undo"; moves: MoveRecord[] }
  | TimeoutEnding;
