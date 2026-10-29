import { useTranslation } from "react-i18next";
import type { GameId } from "@game/protocol";
import { useAppStore } from "../store";
import { GAME_META, GAME_IDS } from "../gameMeta";
import { GameIcon } from "../components/GameIcon";

interface RulesScreenProps {
  gameId: GameId;
}

/** A public, no-login-needed page explaining one game's rules at `/rules/<gameId>` — shareable
 *  and bookmarkable on its own, separate from both the marketing landing page ("/") and the app
 *  itself ("/play"). Reuses the landing page's visual language (`.landing-*` classes) instead of
 *  the app's 560px-wide chrome, since this is meant to stand on its own like the landing page. */
export function RulesScreen({ gameId }: RulesScreenProps) {
  const { t, i18n } = useTranslation();
  const { goToLanding, openGame, openRules } = useAppStore();
  const meta = GAME_META[gameId];
  // `titleKey` is always "game.<camelCaseId>" — reusing it here avoids keeping a second
  // id-to-key lookup table in sync just for the "rules.<camelCaseId>" i18n namespace.
  const rulesKey = meta.titleKey.replace(/^game\./, "");
  const points = t(`rules.${rulesKey}.points`, { returnObjects: true }) as string[];
  const otherGameIds = GAME_IDS.filter((id) => id !== gameId);

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <button className="landing-brand landing-brand-button" onClick={goToLanding}>
            <span className="app-logo">🎲</span>
            <span className="landing-brand-name">{t("app.title")}</span>
          </button>
          <div className="lang-switch">
            <button className={i18n.language === "vi" ? "active" : ""} onClick={() => i18n.changeLanguage("vi")}>
              VI
            </button>
            <button className={i18n.language === "en" ? "active" : ""} onClick={() => i18n.changeLanguage("en")}>
              EN
            </button>
          </div>
        </div>
      </header>

      <section className="landing-section">
        <div className="landing-section-inner landing-section-inner-narrow">
          <button className="landing-note rules-back-link" onClick={goToLanding}>
            {t("rules.backToLanding")}
          </button>
          <div className="rules-heading">
            <span className="game-option-icon-tile rules-heading-icon" style={{ background: meta.color }}>
              <GameIcon gameId={gameId} />
            </span>
            <div>
              <p className="landing-eyebrow">{t("rules.summaryHeading")}</p>
              <h2 className="landing-title rules-title">{t(meta.titleKey)}</h2>
              <p className="landing-desc">{t(meta.descKey)}</p>
            </div>
          </div>
          <ul className="rules-points">
            {points.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
          <button className="landing-cta" onClick={() => openGame(gameId)}>
            {t("rules.playNow")}
          </button>
        </div>
      </section>

      <section className="landing-section landing-section-alt">
        <div className="landing-section-inner">
          <h3 className="landing-section-title">{t("rules.otherGamesTitle")}</h3>
          <div className="game-grid">
            {otherGameIds.map((id) => {
              const m = GAME_META[id];
              return (
                <div
                  key={id}
                  className="game-option"
                  role="button"
                  tabIndex={0}
                  onClick={() => openRules(id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openRules(id);
                    }
                  }}
                >
                  <span className="game-option-icon-tile" style={{ background: m.color }}>
                    <GameIcon gameId={id} />
                  </span>
                  <span className="game-option-label">{t(m.titleKey)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <button className="landing-cta" onClick={() => openGame(gameId)}>
            {t("rules.playNow")}
          </button>
        </div>
      </footer>
    </div>
  );
}
