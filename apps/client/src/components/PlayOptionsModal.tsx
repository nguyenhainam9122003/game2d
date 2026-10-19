import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  usePlayOptionsStore,
  CLOCK_PRESETS,
  PER_MOVE_PRESETS,
  MATCH_LENGTH_PRESETS,
  type ClockMode,
} from "../playOptionsStore";

interface Props {
  onClose(): void;
}

export function PlayOptionsModal({ onClose }: Props) {
  const { t } = useTranslation();
  const options = usePlayOptionsStore();
  const [activeTab, setActiveTab] = useState<ClockMode>(options.clockMode);
  const [customMatchLength, setCustomMatchLength] = useState("");

  function selectMatchLength(length: number) {
    options.setMatchLength(length);
    setCustomMatchLength("");
  }

  function handleCustomMatchLength(value: string) {
    setCustomMatchLength(value);
    const n = parseInt(value, 10);
    if (n >= 1 && n <= 99) options.setMatchLength(n);
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

        <button className="secondary-button" onClick={options.reset}>
          {t("playOptions.reset")}
        </button>

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

        <button className="primary-button" onClick={onClose}>
          {t("playOptions.done")}
        </button>
      </div>
    </div>
  );
}
