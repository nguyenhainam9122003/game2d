import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { GameId } from "@game/protocol";
import {
  usePlayOptionsStore,
  CLOCK_PRESETS,
  PER_MOVE_PRESETS,
  MATCH_LENGTH_PRESETS,
  GAMES_WITH_CLOCK,
  GAMES_WITH_MATCH_LENGTH,
  type ClockMode,
} from "../playOptionsStore";
import {
  useGameOptionsStore,
  type GoBoardSize,
  type SudokuHintBudget,
  type SudokuErrorMode,
  type NumberMatchCopyLimit,
  type PerTurnSeconds,
  type NumberHuntSheetSize,
} from "../gameOptionsStore";

interface Props {
  gameId: GameId;
  onClose(): void;
}

const GO_SIZES: GoBoardSize[] = [9, 13, 19];
const HINT_BUDGETS: SudokuHintBudget[] = [0, 1, 3, 5];
const ERROR_MODES: SudokuErrorMode[] = ["off", "indicate", "limit-1", "limit-3", "limit-5"];
const COPY_LIMITS: NumberMatchCopyLimit[] = [3, 5, 8];
const PER_TURN_OPTIONS: PerTurnSeconds[] = [0, 12, 30];
const SHEET_SIZES: NumberHuntSheetSize[] = [25, 50, 100, 200, 500, 1000];

export function PlayOptionsModal({ gameId, onClose }: Props) {
  const { t } = useTranslation();
  const options = usePlayOptionsStore();
  const gameOptions = useGameOptionsStore();
  const [activeTab, setActiveTab] = useState<ClockMode>(options.clockMode);
  const [customMatchLength, setCustomMatchLength] = useState("");

  const hasClock = GAMES_WITH_CLOCK.includes(gameId);
  const hasMatchLength = GAMES_WITH_MATCH_LENGTH.includes(gameId);

  function selectMatchLength(length: number) {
    options.setMatchLength(length);
    setCustomMatchLength("");
  }

  function handleCustomMatchLength(value: string) {
    setCustomMatchLength(value);
    const n = parseInt(value, 10);
    if (n >= 1 && n <= 99) options.setMatchLength(n);
  }

  function perTurnLabel(seconds: PerTurnSeconds): string {
    return seconds === 0 ? t("gameOptions.perTurnOff") : t("gameOptions.perTurnSeconds", { seconds });
  }

  function resetAll() {
    options.reset();
    gameOptions.reset();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <p className="section-title" style={{ margin: 0 }}>
            {t("playOptions.title")}
          </p>
          <button className="secondary-button" onClick={onClose}>
            {t("playOptions.close")}
          </button>
        </div>

        <button className="secondary-button" onClick={resetAll}>
          {t("playOptions.reset")}
        </button>

        {hasClock && (
          <>
            <p className="group-label">{t("playOptions.clockLabel")}</p>
            <div className="po-tabs" role="tablist">
              <button
                role="tab"
                className={`po-tab ${activeTab === "clock" ? "active" : ""}`}
                onClick={() => setActiveTab("clock")}
              >
                {t("playOptions.tabClock")}
              </button>
              <button
                role="tab"
                className={`po-tab ${activeTab === "none" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("none");
                  options.setClockMode("none");
                }}
              >
                {t("playOptions.tabNone")}
              </button>
              <button
                role="tab"
                className={`po-tab ${activeTab === "per-move" ? "active" : ""}`}
                onClick={() => setActiveTab("per-move")}
              >
                {t("playOptions.tabPerMove")}
              </button>
            </div>

            {activeTab === "clock" && (
              <>
                <div className="po-preset-list">
                  {CLOCK_PRESETS.map((preset) => {
                    const isSelected =
                      options.clockMode === "clock" &&
                      options.clockInitialSeconds === preset.initialSeconds &&
                      options.clockIncrementSeconds === preset.incrementSeconds;
                    const label =
                      preset.incrementSeconds > 0
                        ? t("playOptions.clockWithIncrement", { minutes: preset.initialSeconds / 60, increment: preset.incrementSeconds })
                        : t("playOptions.clockMinutes", { minutes: preset.initialSeconds / 60 });
                    return (
                      <button
                        key={label}
                        className={`secondary-button ${isSelected ? "active" : ""}`}
                        onClick={() => options.setClockPreset(preset)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="po-hint">{t("playOptions.clockHint")}</p>
              </>
            )}

            {activeTab === "per-move" && (
              <>
                <div className="po-preset-list">
                  {PER_MOVE_PRESETS.map((preset) => {
                    const isSelected = options.clockMode === "per-move" && options.perMoveSeconds === preset.seconds;
                    return (
                      <button
                        key={preset.seconds}
                        className={`secondary-button ${isSelected ? "active" : ""}`}
                        onClick={() => options.setPerMoveSeconds(preset.seconds)}
                      >
                        {t("playOptions.perMove", { seconds: preset.seconds })}
                      </button>
                    );
                  })}
                </div>
                <p className="po-hint">{t("playOptions.perMoveHint")}</p>
              </>
            )}
          </>
        )}

        {gameId === "go" && (
          <>
            <p className="group-label">{t("gameOptions.goBoardSizeLabel")}</p>
            <div className="po-preset-list">
              {GO_SIZES.map((size) => (
                <button
                  key={size}
                  className={`secondary-button ${gameOptions.goBoardSize === size ? "active" : ""}`}
                  onClick={() => gameOptions.setGoBoardSize(size)}
                >
                  {t(`gameOptions.goBoardSize${size}`)}
                </button>
              ))}
            </div>

            <p className="group-label">{t("gameOptions.goDeadStoneLabel")}</p>
            <div className="po-preset-list">
              <button
                className={`secondary-button ${gameOptions.goDeadStoneMode === "auto" ? "active" : ""}`}
                onClick={() => gameOptions.setGoDeadStoneMode("auto")}
              >
                {t("gameOptions.goDeadStoneAuto")}
              </button>
              <button
                className={`secondary-button ${gameOptions.goDeadStoneMode === "manual" ? "active" : ""}`}
                onClick={() => gameOptions.setGoDeadStoneMode("manual")}
              >
                {t("gameOptions.goDeadStoneManual")}
              </button>
            </div>
          </>
        )}

        {gameId === "battleship" && (
          <>
            <p className="group-label">{t("gameOptions.battleshipHuntRuleLabel")}</p>
            <div className="po-preset-list">
              <button
                className={`secondary-button ${gameOptions.battleshipHuntRule === "again-on-hit" ? "active" : ""}`}
                onClick={() => gameOptions.setBattleshipHuntRule("again-on-hit")}
              >
                {t("gameOptions.battleshipHuntAgain")}
              </button>
              <button
                className={`secondary-button ${gameOptions.battleshipHuntRule === "one-per-turn" ? "active" : ""}`}
                onClick={() => gameOptions.setBattleshipHuntRule("one-per-turn")}
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
                className={`secondary-button ${gameOptions.planeBattleVariant === "large" ? "active" : ""}`}
                onClick={() => gameOptions.setPlaneBattleVariant("large")}
              >
                {t("gameOptions.planeBattleLarge")}
              </button>
              <button
                className={`secondary-button ${gameOptions.planeBattleVariant === "small" ? "active" : ""}`}
                onClick={() => gameOptions.setPlaneBattleVariant("small")}
              >
                {t("gameOptions.planeBattleSmall")}
              </button>
            </div>
          </>
        )}

        {gameId === "domino" && (
          <>
            <p className="group-label">{t("gameOptions.perTurnLabel")}</p>
            <div className="po-preset-list">
              {PER_TURN_OPTIONS.map((seconds) => (
                <button
                  key={seconds}
                  className={`secondary-button ${gameOptions.dominoPerTurnSeconds === seconds ? "active" : ""}`}
                  onClick={() => gameOptions.setDominoPerTurnSeconds(seconds)}
                >
                  {perTurnLabel(seconds)}
                </button>
              ))}
            </div>

            <p className="group-label">{t("gameOptions.dominoDrawRuleLabel")}</p>
            <div className="po-preset-list">
              <button
                className={`secondary-button ${gameOptions.dominoDrawRule === "one" ? "active" : ""}`}
                onClick={() => gameOptions.setDominoDrawRule("one")}
              >
                {t("gameOptions.dominoDrawOne")}
              </button>
              <button
                className={`secondary-button ${gameOptions.dominoDrawRule === "until-playable" ? "active" : ""}`}
                onClick={() => gameOptions.setDominoDrawRule("until-playable")}
              >
                {t("gameOptions.dominoDrawUntilPlayable")}
              </button>
              <button
                className={`secondary-button ${gameOptions.dominoDrawRule === "none" ? "active" : ""}`}
                onClick={() => gameOptions.setDominoDrawRule("none")}
              >
                {t("gameOptions.dominoDrawNone")}
              </button>
            </div>

            <p className="group-label">{t("gameOptions.dominoHintsLabel")}</p>
            <div className="po-preset-list">
              <button
                className={`secondary-button ${!gameOptions.dominoHintsEnabled ? "active" : ""}`}
                onClick={() => gameOptions.setDominoHintsEnabled(false)}
              >
                {t("gameOptions.hintsOff")}
              </button>
              <button
                className={`secondary-button ${gameOptions.dominoHintsEnabled ? "active" : ""}`}
                onClick={() => gameOptions.setDominoHintsEnabled(true)}
              >
                {t("gameOptions.hintsOn")}
              </button>
            </div>
          </>
        )}

        {gameId === "sudoku" && (
          <>
            <p className="group-label">{t("gameOptions.sudokuTwoPlayerModeLabel")}</p>
            <div className="po-preset-list">
              <button
                className={`secondary-button ${gameOptions.sudokuTwoPlayerMode === "race" ? "active" : ""}`}
                onClick={() => gameOptions.setSudokuTwoPlayerMode("race")}
              >
                {t("gameOptions.sudokuTwoPlayerMode-race")}
              </button>
              <button
                className={`secondary-button ${gameOptions.sudokuTwoPlayerMode === "co-op" ? "active" : ""}`}
                onClick={() => gameOptions.setSudokuTwoPlayerMode("co-op")}
              >
                {t("gameOptions.sudokuTwoPlayerMode-co-op")}
              </button>
            </div>

            <p className="group-label">{t("gameOptions.sudokuHintLabel")}</p>
            <div className="po-preset-list">
              {HINT_BUDGETS.map((budget) => (
                <button
                  key={budget}
                  className={`secondary-button ${gameOptions.sudokuHintBudget === budget ? "active" : ""}`}
                  onClick={() => gameOptions.setSudokuHintBudget(budget)}
                >
                  {t(`gameOptions.sudokuHintBudget${budget}`)}
                </button>
              ))}
            </div>

            <p className="group-label">{t("gameOptions.sudokuErrorLabel")}</p>
            <div className="po-preset-list">
              {ERROR_MODES.map((mode) => (
                <button
                  key={mode}
                  className={`secondary-button ${gameOptions.sudokuErrorMode === mode ? "active" : ""}`}
                  onClick={() => gameOptions.setSudokuErrorMode(mode)}
                >
                  {t(`gameOptions.sudokuErrorMode-${mode}`)}
                </button>
              ))}
            </div>
          </>
        )}

        {gameId === "number-match" && (
          <>
            <p className="group-label">{t("gameOptions.perTurnLabel")}</p>
            <div className="po-preset-list">
              {PER_TURN_OPTIONS.map((seconds) => (
                <button
                  key={seconds}
                  className={`secondary-button ${gameOptions.numberMatchPerTurnSeconds === seconds ? "active" : ""}`}
                  onClick={() => gameOptions.setNumberMatchPerTurnSeconds(seconds)}
                >
                  {perTurnLabel(seconds)}
                </button>
              ))}
            </div>

            <p className="group-label">{t("gameOptions.numberMatchCopyLimitLabel")}</p>
            <div className="po-preset-list">
              {COPY_LIMITS.map((limit) => (
                <button
                  key={limit}
                  className={`secondary-button ${gameOptions.numberMatchCopyLimit === limit ? "active" : ""}`}
                  onClick={() => gameOptions.setNumberMatchCopyLimit(limit)}
                >
                  {t("gameOptions.numberMatchCopyLimit", { count: limit })}
                </button>
              ))}
            </div>

            <p className="group-label">{t("gameOptions.numberMatchHintsLabel")}</p>
            <div className="po-preset-list">
              <button
                className={`secondary-button ${!gameOptions.numberMatchHintsVisible ? "active" : ""}`}
                onClick={() => gameOptions.setNumberMatchHintsVisible(false)}
              >
                {t("gameOptions.numberMatchHintsHidden")}
              </button>
              <button
                className={`secondary-button ${gameOptions.numberMatchHintsVisible ? "active" : ""}`}
                onClick={() => gameOptions.setNumberMatchHintsVisible(true)}
              >
                {t("gameOptions.numberMatchHintsShown")}
              </button>
            </div>
          </>
        )}

        {gameId === "number-hunt" && (
          <>
            <p className="group-label">{t("gameOptions.numberHuntSheetModeLabel")}</p>
            <div className="po-preset-list">
              <button
                className={`secondary-button ${gameOptions.numberHuntSheetMode === "shared" ? "active" : ""}`}
                onClick={() => gameOptions.setNumberHuntSheetMode("shared")}
              >
                {t("gameOptions.numberHuntShared")}
              </button>
              <button
                className={`secondary-button ${gameOptions.numberHuntSheetMode === "separate" ? "active" : ""}`}
                onClick={() => gameOptions.setNumberHuntSheetMode("separate")}
              >
                {t("gameOptions.numberHuntSeparate")}
              </button>
            </div>

            <p className="group-label">{t("gameOptions.numberHuntSheetSizeLabel")}</p>
            <div className="po-preset-list">
              {SHEET_SIZES.map((size) => (
                <button
                  key={size}
                  className={`secondary-button ${gameOptions.numberHuntSheetSize === size ? "active" : ""}`}
                  onClick={() => gameOptions.setNumberHuntSheetSize(size)}
                >
                  {t("gameOptions.numberHuntSheetSize", { count: size })}
                </button>
              ))}
            </div>
          </>
        )}

        {hasMatchLength && (
          <>
            <p className="group-label">{t("playOptions.matchLengthLabel")}</p>
            <div className="po-preset-list">
              {MATCH_LENGTH_PRESETS.map((n) => (
                <button
                  key={n}
                  className={`secondary-button ${options.matchLength === n && customMatchLength === "" ? "active" : ""}`}
                  onClick={() => selectMatchLength(n)}
                >
                  {n}
                </button>
              ))}
              <input
                className="text-input po-custom-input"
                type="number"
                min={1}
                max={99}
                placeholder={t("playOptions.customMatchLength")}
                value={customMatchLength}
                onChange={(e) => handleCustomMatchLength(e.target.value)}
              />
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
