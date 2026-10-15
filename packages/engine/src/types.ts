export type Player = 1 | 2;

export type GameResult =
  | { status: "ongoing" }
  | { status: "draw" }
  | { status: "win"; winner: Player; line?: number[] };

export interface Game<S, M> {
  id: string;
  currentPlayer(state: S): Player;
  legalMoves(state: S): M[];
  applyMove(state: S, move: M): S;
  result(state: S): GameResult;
}

export function otherPlayer(p: Player): Player {
  return p === 1 ? 2 : 1;
}
