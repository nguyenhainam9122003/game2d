import { useEffect, useRef, useState } from "react";
import type { GameId, MoveRecord, RoomConfig, Slot } from "@game/protocol";
import { getGame } from "../gameRegistry";
import { getPlayerId } from "./playerId";
import { RoomClient } from "./roomClient";

export type ConnectionPhase = "connecting" | "waiting" | "playing" | "room-full" | "closed";

export interface ChatEntry {
  text: string;
  from: Slot;
}

export interface NetworkGame {
  phase: ConnectionPhase;
  activeGameId: GameId;
  mySlot: Slot | null;
  /** True for a read-only "Người xem" of a Sudoku "Cùng giải" room — see `GameRoom.handleJoin`. */
  isSpectator: boolean;
  opponentConnected: boolean;
  state: unknown;
  chat: ChatEntry[];
  errorMessage: string | null;
  /** The room's actual config, once known (echoed back in "joined") — may differ from the
   *  locally-proposed one passed in if this client joined rather than created the room. */
  effectiveConfig: RoomConfig | undefined;
  /** Whoever's full-match clock ran out, once reported — see `reportTimeout`. */
  timedOutLoser: Slot | null;
  /** Bumped on every restart (mine or the opponent's) so callers can reset their own local
   *  per-round UI state (e.g. a clock hook, scratch notes) without a server round-trip. */
  roundVersion: number;
  /** Sudoku-only (not a `Game<S,M>` game, so it doesn't use `state`/`sendMove` at all) — see
   *  `GameRoom`'s `handleSudoku*` and the `ClientMessage` sudoku* variants. */
  sudokuPuzzle: { givens: (number | null)[]; solution: number[] } | null;
  /** The shared board, "Cùng giải" (co-op) mode only. */
  sudokuGrid: (number | null)[] | null;
  /** "Đua" (race) mode only — whoever's `sudokuDone` report the server received first. */
  sudokuWinner: Slot | null;
  sudokuDoneAt: Partial<Record<Slot, number>>;
  /** True while waiting for the opponent to answer this client's own `requestUndo()`. */
  undoRequestedByMe: boolean;
  /** True while the opponent has an undo request awaiting this client's `respondUndo()`. */
  incomingUndoRequest: boolean;
  sendMove(move: number): void;
  sendChat(text: string): void;
  restart(): void;
  /** Ask the opponent's permission to take back this client's last turn. */
  requestUndo(): void;
  /** Answer the opponent's pending undo request. */
  respondUndo(accept: boolean): void;
  /** Switch the room to a different game mid-session — unilateral, like `restart()`. */
  changeGame(gameId: GameId, gameConfig?: RoomConfig): void;
  /** Call when this client's own locally-ticking "Đồng hồ cờ" clock hits zero for whoever
   *  currently has the move — either side reporting it ends the game the same way. */
  reportTimeout(): void;
  sendSudokuPuzzle(givens: (number | null)[], solution: number[]): void;
  sendSudokuCell(index: number, value: number | null): void;
  sendSudokuDone(elapsedMs: number): void;
}

/**
 * Owns one WebSocket connection to a room for the lifetime of the
 * component that calls this hook. The confirmed game id comes back from
 * the server's "joined" message (a joiner doesn't know it up front), so
 * engine lookups go through a ref updated synchronously in that handler —
 * messages on one WebSocket are always delivered in order, so "joined"
 * is guaranteed to land before any "move"/"sync" that depends on it.
 */
export function useNetworkGame(code: string, requestedGameId: GameId, gameConfig?: RoomConfig): NetworkGame {
  const [activeGameId, setActiveGameId] = useState<GameId>(requestedGameId);
  const [phase, setPhase] = useState<ConnectionPhase>("connecting");
  const [mySlot, setMySlot] = useState<Slot | null>(null);
  const [isSpectator, setIsSpectator] = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [state, setState] = useState<unknown>(() => getGame(requestedGameId, gameConfig).init());
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [effectiveConfig, setEffectiveConfig] = useState<RoomConfig | undefined>(undefined);
  const [timedOutLoser, setTimedOutLoser] = useState<Slot | null>(null);
  const [roundVersion, setRoundVersion] = useState(0);
  const [sudokuPuzzle, setSudokuPuzzle] = useState<{ givens: (number | null)[]; solution: number[] } | null>(null);
  const [sudokuGrid, setSudokuGrid] = useState<(number | null)[] | null>(null);
  const [sudokuWinner, setSudokuWinner] = useState<Slot | null>(null);
  const [sudokuDoneAt, setSudokuDoneAt] = useState<Partial<Record<Slot, number>>>({});
  const [undoRequestedByMe, setUndoRequestedByMe] = useState(false);
  const [incomingUndoRequest, setIncomingUndoRequest] = useState(false);

  const gameRef = useRef(getGame(requestedGameId, gameConfig));
  const clientRef = useRef<RoomClient | null>(null);
  // Read inside the "onOpponentLeft" closure below, which is built once per `code` (before
  // "joined" ever arrives) — a plain variable would be stale, so this mirrors `gameRef`.
  const isSpectatorRef = useRef(false);

  useEffect(() => {
    const client = new RoomClient(
      code,
      getPlayerId(),
      requestedGameId,
      {
        onJoined: ({
          slot,
          spectator,
          gameId,
          opponentConnected,
          gameConfig: joinedConfig,
          endedBy,
          sudokuPuzzle: joinedPuzzle,
          sudokuGrid: joinedGrid,
          sudokuWinner: joinedWinner,
          sudokuDoneAt: joinedDoneAt,
        }) => {
          gameRef.current = getGame(gameId, joinedConfig ?? gameConfig);
          setActiveGameId(gameId);
          setMySlot(slot ?? null);
          setIsSpectator(!!spectator);
          isSpectatorRef.current = !!spectator;
          setOpponentConnected(opponentConnected);
          // A spectator only ever joins a room that's already full, so there's no "waiting".
          setPhase(spectator || opponentConnected ? "playing" : "waiting");
          setState(gameRef.current.init());
          setEffectiveConfig(joinedConfig ?? gameConfig);
          setTimedOutLoser(endedBy?.loser ?? null);
          setSudokuPuzzle(joinedPuzzle ?? null);
          setSudokuGrid(joinedGrid ?? null);
          setSudokuWinner(joinedWinner ?? null);
          setSudokuDoneAt(joinedDoneAt ?? {});
        },
        onSync: (moves: MoveRecord[]) => {
          let s = gameRef.current.init();
          for (const m of moves) s = gameRef.current.game.applyMove(s, m.move);
          setState(s);
        },
        onMove: ({ move }) => {
          setState((s: unknown) => gameRef.current.game.applyMove(s, move));
        },
        onOpponentJoined: () => {
          setOpponentConnected(true);
          setPhase("playing");
        },
        onOpponentReconnected: () => {
          setOpponentConnected(true);
          setPhase("playing");
        },
        onOpponentLeft: () => {
          setOpponentConnected(false);
          // A spectator has no "my own room" to wait in — keep watching the (now-stale) board
          // rather than being dropped into the "share this code" screen meant for the room owner.
          setPhase((p) => (isSpectatorRef.current || p === "room-full" ? p : "waiting"));
          setUndoRequestedByMe(false);
          setIncomingUndoRequest(false);
        },
        onChat: (text, from) => setChat((c) => [...c, { text, from }]),
        onRestart: () => {
          setState(gameRef.current.init());
          setTimedOutLoser(null);
          setRoundVersion((v) => v + 1);
          setSudokuPuzzle(null);
          setSudokuGrid(null);
          setSudokuWinner(null);
          setSudokuDoneAt({});
          setUndoRequestedByMe(false);
          setIncomingUndoRequest(false);
        },
        onGameChanged: (gameId, newConfig) => {
          gameRef.current = getGame(gameId, newConfig ?? gameConfig);
          setActiveGameId(gameId);
          setEffectiveConfig(newConfig ?? gameConfig);
          setState(gameRef.current.init());
          setTimedOutLoser(null);
          setRoundVersion((v) => v + 1);
          setSudokuPuzzle(null);
          setSudokuGrid(null);
          setSudokuWinner(null);
          setSudokuDoneAt({});
          setUndoRequestedByMe(false);
          setIncomingUndoRequest(false);
        },
        onRoomFull: () => setPhase("room-full"),
        onError: (message) => {
          setErrorMessage(message);
          // The server's rejection of a request this client just sent (e.g. "no move to undo
          // yet") arrives on this same generic channel, not a request-specific one — clear the
          // optimistic "waiting" flag so the button doesn't stay stuck disabled forever.
          setUndoRequestedByMe(false);
        },
        onClose: () => setPhase((p) => (p === "room-full" ? p : "closed")),
        onTimeout: (loser) => setTimedOutLoser(loser),
        onSudokuPuzzle: (givens, solution) => {
          setSudokuPuzzle({ givens, solution });
          setSudokuGrid((g) => g ?? (gameConfig?.sudokuTwoPlayerMode === "co-op" ? [...givens] : null));
        },
        onSudokuCell: (index, value) => {
          setSudokuGrid((g) => {
            if (!g) return g;
            const next = [...g];
            next[index] = value;
            return next;
          });
        },
        onSudokuDone: (elapsedMs, from, winner) => {
          setSudokuDoneAt((d) => ({ ...d, [from]: elapsedMs }));
          if (winner) setSudokuWinner(from);
        },
        onUndoRequest: () => setIncomingUndoRequest(true),
        onUndoResponseDeclined: () => {
          setUndoRequestedByMe(false);
          setIncomingUndoRequest(false);
        },
        onUndo: (moves: MoveRecord[]) => {
          let s = gameRef.current.init();
          for (const m of moves) s = gameRef.current.game.applyMove(s, m.move);
          setState(s);
          setUndoRequestedByMe(false);
          setIncomingUndoRequest(false);
        },
      },
      gameConfig,
    );
    clientRef.current = client;
    client.connect();
    return () => client.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return {
    phase,
    activeGameId,
    mySlot,
    isSpectator,
    opponentConnected,
    state,
    chat,
    errorMessage,
    effectiveConfig,
    timedOutLoser,
    roundVersion,
    sudokuPuzzle,
    sudokuGrid,
    sudokuWinner,
    sudokuDoneAt,
    undoRequestedByMe,
    incomingUndoRequest,
    sendMove: (move) => clientRef.current?.sendMove(move),
    sendChat: (text) => clientRef.current?.sendChat(text),
    restart: () => clientRef.current?.sendRestart(),
    requestUndo: () => {
      setUndoRequestedByMe(true);
      clientRef.current?.sendUndoRequest();
    },
    respondUndo: (accept) => {
      setIncomingUndoRequest(false);
      clientRef.current?.sendUndoResponse(accept);
    },
    changeGame: (newGameId, newConfig) => clientRef.current?.sendChangeGame(newGameId, newConfig),
    reportTimeout: () => clientRef.current?.sendTimeout(),
    sendSudokuPuzzle: (givens, solution) => clientRef.current?.sendSudokuPuzzle(givens, solution),
    sendSudokuCell: (index, value) => clientRef.current?.sendSudokuCell(index, value),
    sendSudokuDone: (elapsedMs) => clientRef.current?.sendSudokuDone(elapsedMs),
  };
}
