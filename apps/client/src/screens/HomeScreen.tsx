import { useTranslation } from "react-i18next";
import type { Difficulty } from "@game/engine";
import { useAppStore, type GameId, type Mode } from "../store";

const GAMES: { id: GameId; labelKey: string; icon: string }[] = [
  { id: "tic-tac-toe", labelKey: "game.ticTacToe", icon: "⭕" },
  { id: "gomoku", labelKey: "game.gomoku", icon: "⚫" },
  { id: "o-an-quan", labelKey: "game.oAnQuan", icon: "🌾" },
  { id: "chess", labelKey: "game.chess", icon: "♟️" },
];

const MODES: { id: Mode; labelKey: string; icon: string }[] = [
  { id: "vs-bot", labelKey: "mode.vsBot", icon: "🤖" },
  { id: "two-players", labelKey: "mode.twoPlayers", icon: "👥" },
  { id: "online", labelKey: "mode.online", icon: "🌐" },
];

const DIFFICULTY_ICONS: Record<Difficulty, string> = {
  easy: "🌱",
  medium: "⚡",
  hard: "🔥",
};
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export function HomeScreen() {
  const { t } = useTranslation();
  const { gameId, mode, difficulty, setGameId, setMode, setDifficulty, goToGame } =
    useAppStore();

  return (
    <>
      <p style={{ color: "var(--color-muted)", margin: 0 }}>{t("home.subtitle")}</p>

      <div className="card">
        <div className="game-grid">
          {GAMES.map((g) => (
            <button
              key={g.id}
              data-game={g.id}
              className={`game-option ${gameId === g.id ? "selected" : ""}`}
              onClick={() => setGameId(g.id)}
            >
              <span className="game-option-icon-tile" data-game={g.id}>
                {g.icon}
                <span className="game-option-players">👤2</span>
              </span>
              <span className="game-option-label">{t(g.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <p className="section-title">{t("home.selectMode")}</p>
        <div className="pill-group">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`pill ${mode === m.id ? "selected" : ""}`}
              onClick={() => setMode(m.id)}
            >
              <span className="pill-icon">{m.icon}</span>
              {t(m.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {mode === "vs-bot" && (
        <div className="card">
          <p className="section-title">{t("home.difficulty")}</p>
          <div className="pill-group">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                className={`pill ${difficulty === d ? "selected" : ""}`}
                onClick={() => setDifficulty(d)}
              >
                <span className="pill-icon">{DIFFICULTY_ICONS[d]}</span>
                {t(`difficulty.${d}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      <button className="primary-button" onClick={goToGame}>
        {t("home.start")}
      </button>
    </>
  );
}
