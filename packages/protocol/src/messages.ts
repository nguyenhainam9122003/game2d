export type GameId = "tic-tac-toe" | "gomoku" | "o-an-quan" | "chess";
export type Slot = 1 | 2;

export interface MoveRecord {
  seq: number;
  move: number;
  player: Slot;
}

/** Sent from a client to the room's WebSocket. */
export type ClientMessage =
  | { type: "join"; playerId: string; gameId: GameId; name?: string }
  | { type: "move"; move: number }
  | { type: "chat"; text: string }
  | { type: "restart" };

/** Sent from the room's WebSocket to a client. */
export type ServerMessage =
  | { type: "joined"; slot: Slot; gameId: GameId; code: string; opponentConnected: boolean }
  | { type: "sync"; moves: MoveRecord[] }
  | { type: "opponent-joined" }
  | { type: "opponent-left" }
  | { type: "opponent-reconnected" }
  | { type: "move"; seq: number; move: number; player: Slot }
  | { type: "chat"; text: string; from: Slot }
  | { type: "restart" }
  | { type: "room-full" }
  | { type: "error"; message: string };
