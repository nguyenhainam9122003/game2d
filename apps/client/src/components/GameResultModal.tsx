import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  message: string;
  /** Replaces the plain title text with a game-specific visual (e.g. tic-tac-toe's ribbon reveal). */
  banner?: ReactNode;
  scoreLine?: string;
  primaryLabel: string;
  onPrimary(): void;
  onDismiss(): void;
  onLeave(): void;
}

/** Popup shown over the board when a round ends (win/draw), instead of just the small status banner. */
export function GameResultModal({ message, banner, scoreLine, primaryLabel, onPrimary, onDismiss, onLeave }: Props) {
  const { t } = useTranslation();
  return (
    <div className="modal-overlay modal-overlay-center" onClick={onDismiss}>
      <div className="modal-card game-result-modal" onClick={(e) => e.stopPropagation()}>
        {banner ?? <p className="game-result-title">{message}</p>}
        {scoreLine && <p className="game-result-score">{scoreLine}</p>}
        <button className="primary-button" onClick={onPrimary}>
          {primaryLabel}
        </button>
        <button className="secondary-button" onClick={onLeave}>
          {t("pauseMenu.leave")}
        </button>
      </div>
    </div>
  );
}
