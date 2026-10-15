import type { ClientMessage, GameId, MoveRecord, ServerMessage, Slot } from "@game/protocol";
import { getGame } from "./gameRegistry.js";

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
}

interface StoredRoom {
  code: string;
  gameId: GameId;
  moves: MoveRecord[];
  players: Partial<Record<Slot, string>>; // slot -> playerId
}

interface ConnMeta {
  slot: Slot;
  playerId: string;
}

const SLOTS: Slot[] = [1, 2];

function otherSlot(slot: Slot): Slot {
  return slot === 1 ? 2 : 1;
}

/**
 * One Durable Object instance = one game room, addressed by room code
 * (`idFromName(code)`). Keeps the authoritative game state server-side
 * (rebuilt from the persisted move list) so it can validate every move
 * and replay history for a reconnecting player.
 */
export class GameRoom {
  state: DurableObjectState;
  sockets: Map<WebSocket, ConnMeta> = new Map();
  room: StoredRoom | null = null;
  gameState: unknown = null;

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
    const { game, init } = getGame(room.gameId);
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
    if (meta) this.broadcast({ type: "opponent-left" }, ws);
  }

  private async onMessage(ws: WebSocket, raw: string, code: string) {
    const msg: ClientMessage = JSON.parse(raw);
    const room = await this.loadRoom(code);
    if (!this.gameState) this.rebuildGameState(room);

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
  }

  private async handleJoin(
    ws: WebSocket,
    room: StoredRoom,
    msg: Extract<ClientMessage, { type: "join" }>,
  ) {
    const isBrandNewRoom = room.moves.length === 0 && Object.keys(room.players).length === 0;
    if (isBrandNewRoom) room.gameId = msg.gameId;

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
    const { game } = getGame(room.gameId);
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
  }

  private async handleRestart(room: StoredRoom) {
    room.moves = [];
    await this.saveRoom();
    this.rebuildGameState(room);
    this.broadcast({ type: "restart" });
  }
}
