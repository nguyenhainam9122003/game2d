import { useTranslation } from "react-i18next";

export type ResultOutcome = "win" | "lose" | "draw";

export interface ResultPlayer {
  emoji: string;
  label: string;
  /** Rounds won so far in the series — shown as the big "2 – 1" scoreboard. */
  score: number;
}

interface Props {
  message: string;
  outcome: ResultOutcome;
  players: [ResultPlayer, ResultPlayer];
  /** Series progress line ("Ván 2/3 · Tỉ số 1-0"), omitted for a single-round game. */
  scoreLine?: string;
  primaryLabel: string;
  onPrimary(): void;
  onReview(): void;
  onLeave(): void;
}

/** The mascot peeking over the card, matched to rachoi.app's own round-end reveal. */
const MASCOT: Record<ResultOutcome, string> = {
  win: "🎉",
  lose: "😿",
  draw: "🤝",
};

/** Popup shown over the board when a round ends: mascot + result badge sitting on top of a card
 *  with the running scoreboard and the three things you can do next. */
export function GameResultModal({
  message,
  outcome,
  players,
  scoreLine,
  primaryLabel,
  onPrimary,
  onReview,
  onLeave,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="modal-overlay modal-overlay-center" onClick={onReview}>
      <div className="game-result-shell" onClick={(e) => e.stopPropagation()}>
        <span className="game-result-mascot" aria-hidden="true">
          {MASCOT[outcome]}
        </span>
        <p className={`game-result-badge game-result-badge-${outcome}`}>{message}</p>

        <div className="modal-card game-result-modal">
          <div className="game-result-scoreboard">
            <PlayerTile player={players[0]} />
            <p className="game-result-score">
              <span>{players[0].score}</span>
              <span className="game-result-score-dash">–</span>
              <span>{players[1].score}</span>
            </p>
            <PlayerTile player={players[1]} />
          </div>

          {scoreLine && <p className="game-result-round">{scoreLine}</p>}

          <button className="primary-button" onClick={onPrimary}>
            <span aria-hidden="true">↻</span> {primaryLabel}
          </button>

          <div className="game-result-actions">
            <button className="secondary-button" onClick={onLeave}>
              <span aria-hidden="true">⇆</span> {t("pauseMenu.leave")}
            </button>
            <button className="secondary-button" onClick={onReview}>
              <span aria-hidden="true">👁</span> {t("game.review")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerTile({ player }: { player: ResultPlayer }) {
  return (
    <div className="game-result-player">
      <span className="game-result-avatar" aria-hidden="true">
        {player.emoji}
      </span>
      <span className="game-result-name">{player.label}</span>
    </div>
  );
}
