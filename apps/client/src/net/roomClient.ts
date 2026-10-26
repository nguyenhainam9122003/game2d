import type { ClientMessage, GameId, MoveRecord, RoomConfig, ServerMessage, Slot, TimeoutEnding } from "@game/protocol";
import { SERVER_HTTP_URL, SERVER_WS_URL } from "./config";

export interface RoomClientHandlers {
  onJoined?(info: {
    slot: Slot;
    gameId: GameId;
    code: string;
    opponentConnected: boolean;
    gameConfig?: RoomConfig;
    endedBy?: TimeoutEnding;
    sudokuPuzzle?: { givens: (number | null)[]; solution: number[] };
    sudokuGrid?: (number | null)[];
    sudokuWinner?: Slot;
    sudokuDoneAt?: Partial<Record<Slot, number>>;
  }): void;
  onSync?(moves: MoveRecord[]): void;
  onMove?(move: MoveRecord): void;
  onOpponentJoined?(): void;
  onOpponentLeft?(): void;
  onOpponentReconnected?(): void;
  onChat?(text: string, from: Slot): void;
  onRestart?(): void;
  onRoomFull?(): void;
  onError?(message: string): void;
  onClose?(): void;
  onTimeout?(loser: Slot): void;
  onSudokuPuzzle?(givens: (number | null)[], solution: number[]): void;
  onSudokuCell?(index: number, value: number | null, from: Slot): void;
  onSudokuDone?(elapsedMs: number, from: Slot, winner: boolean): void;
}

export class RoomClient {
  private ws: WebSocket | null = null;

  constructor(
    private code: string,
    private playerId: string,
    private gameId: GameId,
    private handlers: RoomClientHandlers,
    private gameConfig?: RoomConfig,
  ) {}

  connect() {
    const ws = new WebSocket(`${SERVER_WS_URL}/room/${this.code}/ws`);
    this.ws = ws;
    ws.addEventListener("open", () => {
      this.sendRaw({ type: "join", playerId: this.playerId, gameId: this.gameId, gameConfig: this.gameConfig });
    });
    ws.addEventListener("message", (event) => this.handleMessage(event.data as string));
    ws.addEventListener("close", () => this.handlers.onClose?.());
  }

  private handleMessage(raw: string) {
    const msg: ServerMessage = JSON.parse(raw);
    switch (msg.type) {
      case "joined":
        this.handlers.onJoined?.(msg);
        break;
      case "sync":
        this.handlers.onSync?.(msg.moves);
        break;
      case "move":
        this.handlers.onMove?.({ seq: msg.seq, move: msg.move, player: msg.player });
        break;
      case "opponent-joined":
        this.handlers.onOpponentJoined?.();
        break;
      case "opponent-left":
        this.handlers.onOpponentLeft?.();
        break;
      case "opponent-reconnected":
        this.handlers.onOpponentReconnected?.();
        break;
      case "chat":
        this.handlers.onChat?.(msg.text, msg.from);
        break;
      case "restart":
        this.handlers.onRestart?.();
        break;
      case "room-full":
        this.handlers.onRoomFull?.();
        break;
      case "error":
        this.handlers.onError?.(msg.message);
        break;
      case "timeout":
        this.handlers.onTimeout?.(msg.loser);
        break;
      case "sudokuPuzzle":
        this.handlers.onSudokuPuzzle?.(msg.givens, msg.solution);
        break;
      case "sudokuCell":
        this.handlers.onSudokuCell?.(msg.index, msg.value, msg.from);
        break;
      case "sudokuDone":
        this.handlers.onSudokuDone?.(msg.elapsedMs, msg.from, msg.winner);
        break;
    }
  }

  private sendRaw(msg: ClientMessage) {
    this.ws?.send(JSON.stringify(msg));
  }

  sendMove(move: number) {
    this.sendRaw({ type: "move", move });
  }

  sendChat(text: string) {
    this.sendRaw({ type: "chat", text });
  }

  sendRestart() {
    this.sendRaw({ type: "restart" });
  }

  sendTimeout() {
    this.sendRaw({ type: "timeout" });
  }

  sendSudokuPuzzle(givens: (number | null)[], solution: number[]) {
    this.sendRaw({ type: "sudokuPuzzle", givens, solution });
  }

  sendSudokuCell(index: number, value: number | null) {
    this.sendRaw({ type: "sudokuCell", index, value });
  }

  sendSudokuDone(elapsedMs: number) {
    this.sendRaw({ type: "sudokuDone", elapsedMs });
  }

  close() {
    this.ws?.close();
    this.ws = null;
  }
}

export async function createRoom(gameId: GameId): Promise<{ code: string }> {
  const res = await fetch(`${SERVER_HTTP_URL}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId }),
  });
  if (!res.ok) throw new Error(`createRoom failed: ${res.status}`);
  return res.json();
}
