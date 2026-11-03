interface Props {
  message: string;
  /** Undefined for a draw — ribbon shows both players' colors split down the middle. */
  winner?: 1 | 2;
  player1Emoji: string;
  player2Emoji: string;
}

/** The ribbon-crossing win/draw reveal rachoi.app shows over its own tic-tac-toe board — two
 *  diagonal banners (split by color for a draw, one solid color for a win) with the result text
 *  peeking out from behind, and both players' avatar chips sitting on the crossing. */
export function TicTacToeResultRibbon({ message, winner, player1Emoji, player2Emoji }: Props) {
  return (
    <div className="ttt-ribbon-wrap">
      <div className="ttt-ribbon-stage">
        <p className="ttt-ribbon-text">{message}</p>
        <div className={`ttt-ribbon ${winner ? `ttt-ribbon-win-${winner}` : "ttt-ribbon-draw"}`} />
      </div>
      <div className="ttt-ribbon-avatars">
        <span className="ttt-ribbon-avatar">{player1Emoji}</span>
        <span className="ttt-ribbon-avatar">{player2Emoji}</span>
      </div>
    </div>
  );
}
