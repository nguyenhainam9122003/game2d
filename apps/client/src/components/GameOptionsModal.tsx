import { useTranslation } from "react-i18next";
import type { GameId } from "@game/protocol";
import { useGameOptionsStore, type GoBoardSize, type SudokuMistakeLimit } from "../gameOptionsStore";

interface Props {
  gameId: GameId;
  onClose(): void;
}

const GO_SIZES: GoBoardSize[] = [9, 13, 19];
const MISTAKE_LIMITS: SudokuMistakeLimit[] = [1, 3, 5];

export function GameOptionsModal({ gameId, onClose }: Props) {
  const { t } = useTranslation();
  const options = useGameOptionsStore();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <p className="section-title" style={{ margin: 0 }}>
            {t("gameOptions.title")}
          </p>
          <button className="secondary-button" onClick={onClose}>
            {t("playOptions.close")}
          </button>
        </div>

        {gameId === "go" && (
          <>
            <p className="group-label">{t("gameOptions.goBoardSizeLabel")}</p>
            <div className="po-preset-list">
              {GO_SIZES.map((size) => (
                <button
                  key={size}
                  className={`secondary-button ${options.goBoardSize === size ? "active" : ""}`}
                  onClick={() => options.setGoBoardSize(size)}
                >
                  {t(`gameOptions.goBoardSize${size}`)}
                </button>
              ))}
            </div>
          </>
        )}

        {gameId === "battleship" && (
          <>
            <p className="group-label">{t("gameOptions.battleshipHuntRuleLabel")}</p>
            <div className="po-preset-list">
              <button
                className={`secondary-button ${options.battleshipHuntRule === "again-on-hit" ? "active" : ""}`}
                onClick={() => options.setBattleshipHuntRule("again-on-hit")}
              >
                {t("gameOptions.battleshipHuntAgain")}
              </button>
              <button
                className={`secondary-button ${options.battleshipHuntRule === "one-per-turn" ? "active" : ""}`}
                onClick={() => options.setBattleshipHuntRule("one-per-turn")}
              >
                {t("gameOptions.battleshipHuntOnePerTurn")}
              </button>
            </div>
          </>
        )}

        {gameId === "plane-battle" && (
          <>
            <p className="group-label">{t("gameOptions.planeBattleVariantLabel")}</p>
            <div className="po-preset-list">
              <button
                className={`secondary-button ${options.planeBattleVariant === "small" ? "active" : ""}`}
                onClick={() => options.setPlaneBattleVariant("small")}
              >
                {t("gameOptions.planeBattleSmall")}
              </button>
              <button
                className={`secondary-button ${options.planeBattleVariant === "large" ? "active" : ""}`}
                onClick={() => options.setPlaneBattleVariant("large")}
              >
                {t("gameOptions.planeBattleLarge")}
              </button>
            </div>
          </>
        )}

        {gameId === "domino" && (
          <>
            <p className="group-label">{t("gameOptions.dominoDrawRuleLabel")}</p>
            <div className="po-preset-list">
              <button
                className={`secondary-button ${options.dominoDrawRule === "one" ? "active" : ""}`}
                onClick={() => options.setDominoDrawRule("one")}
              >
                {t("gameOptions.dominoDrawOne")}
              </button>
              <button
                className={`secondary-button ${options.dominoDrawRule === "until-playable" ? "active" : ""}`}
                onClick={() => options.setDominoDrawRule("until-playable")}
              >
                {t("gameOptions.dominoDrawUntilPlayable")}
              </button>
              <button
                className={`secondary-button ${options.dominoDrawRule === "none" ? "active" : ""}`}
                onClick={() => options.setDominoDrawRule("none")}
              >
                {t("gameOptions.dominoDrawNone")}
              </button>
            </div>
          </>
        )}

        {gameId === "sudoku" && (
          <>
            <p className="group-label">{t("gameOptions.sudokuMistakeLimitLabel")}</p>
            <div className="po-preset-list">
              {MISTAKE_LIMITS.map((limit) => (
                <button
                  key={limit}
                  className={`secondary-button ${options.sudokuMistakeLimit === limit ? "active" : ""}`}
                  onClick={() => options.setSudokuMistakeLimit(limit)}
                >
                  {t("gameOptions.sudokuMistakeLimit", { count: limit })}
                </button>
              ))}
            </div>
          </>
        )}

        {gameId === "number-match" && (
          <>
            <p className="group-label">{t("gameOptions.numberMatchHintsLabel")}</p>
            <div className="po-preset-list">
              <button
                className={`secondary-button ${options.numberMatchHintsVisible ? "active" : ""}`}
                onClick={() => options.setNumberMatchHintsVisible(true)}
              >
                {t("gameOptions.numberMatchHintsShown")}
              </button>
              <button
                className={`secondary-button ${!options.numberMatchHintsVisible ? "active" : ""}`}
                onClick={() => options.setNumberMatchHintsVisible(false)}
              >
                {t("gameOptions.numberMatchHintsHidden")}
              </button>
            </div>
          </>
        )}

        <button className="primary-button" onClick={onClose}>
          {t("playOptions.done")}
        </button>
      </div>
    </div>
  );
}
