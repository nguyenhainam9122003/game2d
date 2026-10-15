import { useEffect, useRef, useState } from "react";
import type { GameId, MoveRecord, Slot } from "@game/protocol";
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
  opponentConnected: boolean;
  state: unknown;
  chat: ChatEntry[];
  errorMessage: string | null;
  sendMove(move: number): void;
  sendChat(text: string): void;
  restart(): void;
}

/**
 * Owns one WebSocket connection to a room for the lifetime of the
 * component that calls this hook. The confirmed game id comes back from
 * the server's "joined" message (a joiner doesn't know it up front), so
 * engine lookups go through a ref updated synchronously in that handler —
 * messages on one WebSocket are always delivered in order, so "joined"
 * is guaranteed to land before any "move"/"sync" that depends on it.
 */
export function useNetworkGame(code: string, requestedGameId: GameId): NetworkGame {
  const [activeGameId, setActiveGameId] = useState<GameId>(requestedGameId);
  const [phase, setPhase] = useState<ConnectionPhase>("connecting");
  const [mySlot, setMySlot] = useState<Slot | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [state, setState] = useState<unknown>(() => getGame(requestedGameId).init());
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const gameRef = useRef(getGame(requestedGameId));
  const clientRef = useRef<RoomClient | null>(null);

  useEffect(() => {
    const client = new RoomClient(code, getPlayerId(), requestedGameId, {
      onJoined: ({ slot, gameId, opponentConnected }) => {
        gameRef.current = getGame(gameId);
        setActiveGameId(gameId);
        setMySlot(slot);
        setOpponentConnected(opponentConnected);
        setPhase(opponentConnected ? "playing" : "waiting");
        setState(gameRef.current.init());
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
        setPhase((p) => (p === "room-full" ? p : "waiting"));
      },
      onChat: (text, from) => setChat((c) => [...c, { text, from }]),
      onRestart: () => setState(gameRef.current.init()),
      onRoomFull: () => setPhase("room-full"),
      onError: (message) => setErrorMessage(message),
      onClose: () => setPhase((p) => (p === "room-full" ? p : "closed")),
    });
    clientRef.current = client;
    client.connect();
    return () => client.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return {
    phase,
    activeGameId,
    mySlot,
    opponentConnected,
    state,
    chat,
    errorMessage,
    sendMove: (move) => clientRef.current?.sendMove(move),
    sendChat: (text) => clientRef.current?.sendChat(text),
    restart: () => clientRef.current?.sendRestart(),
  };
}
