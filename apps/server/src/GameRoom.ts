import type { ClientMessage, GameId, MoveRecord, RoomConfig, ServerMessage, Slot, TimeoutEnding } from "@game/protocol";
import { getGame } from "./gameRegistry.js";

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
}

interface StoredRoom {
  code: string;
  gameId: GameId;
  gameConfig?: RoomConfig;
  moves: MoveRecord[];
  players: Partial<Record<Slot, string>>; // slot -> playerId
  /** Set when a full-match clock ran out — the move log alone can't express this,
   *  so it's tracked out of band and must be checked anywhere `moves` is replayed. */
  endedBy?: TimeoutEnding;
  /** Sudoku has no `Game<S,M>`/move-log, so its state lives in these ad-hoc fields instead —
   *  see `GameRoom`'s `handleSudoku*` methods. `sudokuGrid` is the shared board (co-op only);
   *  `sudokuWinner`/`sudokuDoneAt` track race-mode finishers. */
  sudokuPuzzle?: { givens: (number | null)[]; solution: number[] };
  sudokuGrid?: (number | null)[];
  sudokuWinner?: Slot;
  sudokuDoneAt?: Partial<Record<Slot, number>>;
}

interface ConnMeta {
  slot: Slot;
  playerId: string;
}

const SLOTS: Slot[] = [1, 2];

/** Games a room may switch to mid-session via "changeGame" — every `GameId` except the two
 *  with a structurally different online setup: Sudoku is a wholly separate ad-hoc-message
 *  protocol/component (`SudokuOnlineRoom`, ignores `gameRegistry`/move-log entirely), and
 *  "number-hunt" has no online mode at all yet (real-time race, not turn-based) — see
 *  `GAMES_WITHOUT_ONLINE` client-side. A room that started as Sudoku never offers this switcher
 *  in the first place (see `OnlineScreen.tsx`), so this list only needs to reject it server-side
 *  as a safety net against a stale/hand-crafted client message. */
const SWITCHABLE_GAMES: GameId[] = [
  "tic-tac-toe",
  "gomoku",
  "o-an-quan",
  "chess",
  "xiangqi",
  "go",
  "battleship",
  "plane-battle",
  "domino",
  "number-match",
];

function otherSlot(slot: Slot): Slot {
  return slot === 1 ? 2 : 1;
}

/**
 * One Durable Object instance = one game room, addressed by room code
 * (`idFromName(code)`). Keeps the authoritative game state server-side
 * (rebuilt from the persisted move list) so it can validate every move
 * and replay history for a reconnecting player.
 */
/** Scans backward for the last move the given player made — mirrors the client's
 *  `useMoveHistory.undoToTurn`: since `handleMove` only ever accepts a move from whoever
 *  `game.currentPlayer(state)` says is on the move, a `MoveRecord.player` value already IS
 *  "whose turn it was before this move", so no engine replay is needed to find the cut
 *  point. Returns the index to slice up to (exclusive) — i.e. the start of that player's
 *  last turn — or null if that player hasn't moved at all yet. */
function findUndoCutIndex(moves: MoveRecord[], player: Slot): number | null {
  for (let i = moves.length - 1; i >= 0; i--) {
    if (moves[i].player === player) return i;
  }
  return null;
}

export class GameRoom {
  state: DurableObjectState;
  sockets: Map<WebSocket, ConnMeta> = new Map();
  room: StoredRoom | null = null;
  gameState: unknown = null;
  /** Slot of whoever has an outstanding `undoRequest` awaiting the opponent's answer.
   *  Deliberately not persisted (like `gameState`) — a dropped request just needs re-asking. */
  pendingUndo: Slot | null = null;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const code = url.searchParams.get("code") ?? "";

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    await this.handleSession(server, code);
    return new Response(null, { status: 101, webSocket: client });
  }

  private async loadRoom(code: string): Promise<StoredRoom> {
    if (this.room) return this.room;
    const stored = await this.state.storage.get<StoredRoom>("room");
    this.room = stored ?? { code, gameId: "tic-tac-toe", moves: [], players: {} };
    return this.room;
  }

  private async saveRoom() {
    if (this.room) await this.state.storage.put("room", this.room);
  }

  private rebuildGameState(room: StoredRoom) {
    const { game, init } = getGame(room.gameId, room.gameConfig);
    let s = init();
    for (const m of room.moves) s = game.applyMove(s, m.move);
    this.gameState = s;
    return s;
  }

  private send(ws: WebSocket, msg: ServerMessage) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // socket already closed; ignore
    }
  }

  private broadcast(msg: ServerMessage, exclude?: WebSocket) {
    for (const ws of this.sockets.keys()) {
      if (ws !== exclude) this.send(ws, msg);
    }
  }

  private async handleSession(ws: WebSocket, code: string) {
    ws.accept();

    ws.addEventListener("message", (event) => {
      this.onMessage(ws, event.data as string, code).catch((err) => {
        this.send(ws, { type: "error", message: String((err as Error)?.message ?? err) });
      });
    });
    ws.addEventListener("close", () => this.onClose(ws));
    ws.addEventListener("error", () => this.onClose(ws));
  }

  private onClose(ws: WebSocket) {
    const meta = this.sockets.get(ws);
    this.sockets.delete(ws);
    if (meta) {
      // Either side leaving mid-request makes it unanswerable either way; drop it so a
      // reconnect doesn't walk back into a stuck "waiting"/"incoming" undo UI.
      this.pendingUndo = null;
      this.broadcast({ type: "undoResponse", accept: false });
      this.broadcast({ type: "opponent-left" }, ws);
    }
  }

  private async onMessage(ws: WebSocket, raw: string, code: string) {
    const msg: ClientMessage = JSON.parse(raw);
    const room = await this.loadRoom(code);

    // Must run after handleJoin (not before): a brand-new room's real gameId/
    // gameConfig are only set there, and rebuilding here first would lock in
    // the StoredRoom default ("tic-tac-toe") for the rest of this DO's life.
    // handleMove/handleRestart already rebuild lazily if gameState is unset.
    if (msg.type === "join") return this.handleJoin(ws, room, msg);

    const meta = this.sockets.get(ws);
    if (!meta) {
      this.send(ws, { type: "error", message: "Chưa tham gia phòng (not joined yet)" });
      return;
    }

    if (msg.type === "move") return this.handleMove(ws, meta, room, msg.move);
    if (msg.type === "chat") {
      this.broadcast({ type: "chat", text: msg.text.slice(0, 500), from: meta.slot });
      return;
    }
    if (msg.type === "restart") return this.handleRestart(room);
    if (msg.type === "timeout") return this.handleTimeout(room);
    if (msg.type === "undoRequest") return this.handleUndoRequest(ws, meta, room);
    if (msg.type === "undoResponse") return this.handleUndoResponse(meta, room, msg.accept);
    if (msg.type === "changeGame") return this.handleChangeGame(ws, room, msg.gameId, msg.gameConfig);
    if (msg.type === "sudokuPuzzle") return this.handleSudokuPuzzle(room, msg);
    if (msg.type === "sudokuCell") return this.handleSudokuCell(meta, room, msg);
    if (msg.type === "sudokuDone") return this.handleSudokuDone(meta, room, msg);
  }

  private async handleJoin(
    ws: WebSocket,
    room: StoredRoom,
    msg: Extract<ClientMessage, { type: "join" }>,
  ) {
    const isBrandNewRoom = room.moves.length === 0 && Object.keys(room.players).length === 0;
    if (isBrandNewRoom) {
      room.gameId = msg.gameId;
      room.gameConfig = msg.gameConfig;
    }

    let slot: Slot | undefined = SLOTS.find((s) => room.players[s] === msg.playerId);
    const isNewPlayer = slot === undefined;

    if (isNewPlayer) {
      slot = SLOTS.find((s) => !room.players[s]);
      if (!slot) {
        this.send(ws, { type: "room-full" });
        ws.close();
        return;
      }
      room.players[slot] = msg.playerId;
      await this.saveRoom();
    }

    // A refreshed/second tab for the same player replaces the old socket.
    for (const [existingWs, existingMeta] of this.sockets) {
      if (existingMeta.slot === slot) {
        this.sockets.delete(existingWs);
        try {
          existingWs.close();
        } catch {
          // ignore
        }
      }
    }
    this.sockets.set(ws, { slot: slot as Slot, playerId: msg.playerId });

    const opponent = otherSlot(slot as Slot);
    const opponentConnected = Array.from(this.sockets.values()).some((m) => m.slot === opponent);

    this.send(ws, {
      type: "joined",
      slot: slot as Slot,
      gameId: room.gameId,
      code: room.code,
      opponentConnected,
      gameConfig: room.gameConfig,
      endedBy: room.endedBy,
      sudokuPuzzle: room.sudokuPuzzle,
      sudokuGrid: room.sudokuGrid,
      sudokuWinner: room.sudokuWinner,
      sudokuDoneAt: room.sudokuDoneAt,
    });
    if (room.moves.length > 0) this.send(ws, { type: "sync", moves: room.moves });

    if (opponentConnected) {
      const opponentWs = Array.from(this.sockets.entries()).find(([, m]) => m.slot === opponent)?.[0];
      if (opponentWs) {
        this.send(opponentWs, { type: isNewPlayer ? "opponent-joined" : "opponent-reconnected" });
      }
    }
  }

  private async handleMove(ws: WebSocket, meta: ConnMeta, room: StoredRoom, move: number) {
    if (room.endedBy) {
      this.send(ws, { type: "error", message: "Ván đấu đã kết thúc" });
      return;
    }
    const { game } = getGame(room.gameId, room.gameConfig);
    const state = this.gameState ?? this.rebuildGameState(room);

    const result = game.result(state);
    if (result.status !== "ongoing") {
      this.send(ws, { type: "error", message: "Ván đấu đã kết thúc" });
      return;
    }
    if (game.currentPlayer(state) !== meta.slot) {
      this.send(ws, { type: "error", message: "Chưa đến lượt bạn" });
      return;
    }
    if (!game.legalMoves(state).includes(move)) {
      this.send(ws, { type: "error", message: "Nước đi không hợp lệ" });
      return;
    }

    this.gameState = game.applyMove(state, move);
    const record: MoveRecord = { seq: room.moves.length, move, player: meta.slot };
    room.moves.push(record);
    await this.saveRoom();
    this.broadcast({ type: "move", seq: record.seq, move, player: meta.slot });
    // A new move landed, so any outstanding undo request no longer matches "the most recent
    // turn" it was asking to roll back — drop it rather than let it apply to the wrong moves.
    if (this.pendingUndo) {
      this.pendingUndo = null;
      this.broadcast({ type: "undoResponse", accept: false });
    }
  }

  private async handleRestart(room: StoredRoom) {
    room.moves = [];
    room.endedBy = undefined;
    room.sudokuPuzzle = undefined;
    room.sudokuGrid = undefined;
    room.sudokuWinner = undefined;
    room.sudokuDoneAt = undefined;
    await this.saveRoom();
    this.rebuildGameState(room);
    this.pendingUndo = null;
    this.broadcast({ type: "restart" });
  }

  /** Either player may switch the room to a different game unilaterally — no approval needed,
   *  same as "restart" (which this is effectively a variant of: wipes the move log/ad-hoc state
   *  just like a restart, but also swaps `gameId`/`gameConfig` before rebuilding). */
  private async handleChangeGame(ws: WebSocket, room: StoredRoom, gameId: GameId, gameConfig?: RoomConfig) {
    if (!SWITCHABLE_GAMES.includes(gameId)) {
      this.send(ws, { type: "error", message: "Không thể đổi sang game này giữa ván" });
      return;
    }
    room.gameId = gameId;
    room.gameConfig = gameConfig;
    room.moves = [];
    room.endedBy = undefined;
    room.sudokuPuzzle = undefined;
    room.sudokuGrid = undefined;
    room.sudokuWinner = undefined;
    room.sudokuDoneAt = undefined;
    this.pendingUndo = null;
    await this.saveRoom();
    this.rebuildGameState(room);
    this.broadcast({ type: "gameChanged", gameId, gameConfig });
  }

  /** Relays an undo request to the OTHER connected player only — the requester just waits. */
  private handleUndoRequest(ws: WebSocket, meta: ConnMeta, room: StoredRoom) {
    if (this.pendingUndo) return; // a request is already in flight; ignore duplicate clicks
    if (room.endedBy) {
      this.send(ws, { type: "error", message: "Ván đấu đã kết thúc" });
      return;
    }
    const { game } = getGame(room.gameId, room.gameConfig);
    const state = this.gameState ?? this.rebuildGameState(room);
    if (game.result(state).status !== "ongoing") {
      this.send(ws, { type: "error", message: "Ván đấu đã kết thúc" });
      return;
    }
    if (findUndoCutIndex(room.moves, meta.slot) === null) {
      this.send(ws, { type: "error", message: "Chưa có nước nào để đi lại" });
      return;
    }
    const opponent = otherSlot(meta.slot);
    const opponentWs = Array.from(this.sockets.entries()).find(([, m]) => m.slot === opponent)?.[0];
    if (!opponentWs) {
      this.send(ws, { type: "error", message: "Đối thủ chưa vào bàn" });
      return;
    }
    this.pendingUndo = meta.slot;
    this.send(opponentWs, { type: "undoRequest", by: meta.slot });
  }

  /** Only the player who did NOT request the undo should be answering one — anything else
   *  (no pending request, or the requester's own socket replying) is ignored. */
  private async handleUndoResponse(meta: ConnMeta, room: StoredRoom, accept: boolean) {
    const requester = this.pendingUndo;
    if (!requester || meta.slot === requester) return;
    this.pendingUndo = null;
    if (!accept) {
      this.broadcast({ type: "undoResponse", accept: false });
      return;
    }
    const cut = findUndoCutIndex(room.moves, requester);
    if (cut === null) {
      this.broadcast({ type: "undoResponse", accept: false });
      return;
    }
    room.moves = room.moves.slice(0, cut);
    await this.saveRoom();
    this.rebuildGameState(room);
    this.broadcast({ type: "undo", moves: room.moves });
  }

  /**
   * Either client may report this once its own locally-ticking "Đồng hồ cờ"
   * clock reaches zero for whoever currently has the move — both clients run
   * the same clock off the same synced state, so either noticing first and
   * reporting is fine. The loser is whoever `currentPlayer` says is on the
   * move right now, not necessarily the reporting socket's own player.
   */
  private async handleTimeout(room: StoredRoom) {
    if (room.endedBy) return; // already ended (e.g. the other client reported it first)
    const { game } = getGame(room.gameId, room.gameConfig);
    const state = this.gameState ?? this.rebuildGameState(room);
    if (game.result(state).status !== "ongoing") return;

    const loser = game.currentPlayer(state);
    room.endedBy = { type: "timeout", loser };
    await this.saveRoom();
    this.broadcast({ type: "timeout", loser });
  }

  /** Whoever is slot 1 generates and sends the puzzle right after joining — first one wins if
   *  both somehow race (shouldn't happen since only slot 1's client ever sends this). */
  private async handleSudokuPuzzle(
    room: StoredRoom,
    msg: Extract<ClientMessage, { type: "sudokuPuzzle" }>,
  ) {
    if (room.sudokuPuzzle) return;
    room.sudokuPuzzle = { givens: msg.givens, solution: msg.solution };
    if (room.gameConfig?.sudokuTwoPlayerMode === "co-op") room.sudokuGrid = [...msg.givens];
    await this.saveRoom();
    this.broadcast({ type: "sudokuPuzzle", givens: msg.givens, solution: msg.solution });
  }

  /** "Cùng giải" (co-op) — relay one cell edit to the shared grid, no validation (same as local
   *  play: mistakes are informational, not server-enforced). */
  private async handleSudokuCell(
    meta: ConnMeta,
    room: StoredRoom,
    msg: Extract<ClientMessage, { type: "sudokuCell" }>,
  ) {
    if (!room.sudokuGrid) return;
    room.sudokuGrid[msg.index] = msg.value;
    await this.saveRoom();
    this.broadcast({ type: "sudokuCell", index: msg.index, value: msg.value, from: meta.slot });
  }

  /** "Đua" (race) — each side solves its own independent board from the same puzzle; whichever
   *  report reaches the server first is the winner. */
  private async handleSudokuDone(
    meta: ConnMeta,
    room: StoredRoom,
    msg: Extract<ClientMessage, { type: "sudokuDone" }>,
  ) {
    room.sudokuDoneAt = { ...room.sudokuDoneAt, [meta.slot]: msg.elapsedMs };
    if (!room.sudokuWinner) room.sudokuWinner = meta.slot;
    await this.saveRoom();
    this.broadcast({ type: "sudokuDone", elapsedMs: msg.elapsedMs, from: meta.slot, winner: room.sudokuWinner === meta.slot });
  }
}
