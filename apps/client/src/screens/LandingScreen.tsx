import { useTranslation } from "react-i18next";
import type { GameId } from "@game/protocol";
import { useAppStore } from "../store";
import { useSettingsStore } from "../settingsStore";
import { GAME_META, GAME_IDS } from "../gameMeta";
import { GameIcon } from "../components/GameIcon";

const STEP_ICONS = ["🪑", "🔗", "🎉"];
const FAQ_COUNT = 4;

const SCHEMES = [
  { id: "auto" as const, labelKey: "settings.auto", icon: "🔄" },
  { id: "light" as const, labelKey: "settings.light", icon: "☀️" },
  { id: "dark" as const, labelKey: "settings.dark", icon: "🌙" },
];

/** A handful of games for the hero's decorative preview tiles — picked for visual variety
 *  (board game / grid game / coordinate game), not meant to be exhaustive. */
const PREVIEW_GAME_IDS: GameId[] = ["chess", "go", "tic-tac-toe", "o-an-quan", "battleship", "sudoku"];

export function LandingScreen() {
  const { t, i18n } = useTranslation();
  const { goHome, openGame } = useAppStore();
  const { colorScheme, setColorScheme } = useSettingsStore();

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-brand">
            <span className="app-logo">🎲</span>
            <span className="landing-brand-name">{t("app.title")}</span>
          </div>
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

      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-text">
            <p className="landing-eyebrow">{t("landing.heroEyebrow")}</p>
            <h2 className="landing-title">{t("landing.heroTitle")}</h2>
            <p className="landing-desc">{t("landing.heroDesc")}</p>
            <div className="landing-pills">
              <span className="landing-pill">{t("landing.pillNoAccount")}</span>
              <span className="landing-pill">{t("landing.pillFree")}</span>
              <span className="landing-pill">{t("landing.pillGameCount")}</span>
            </div>
            <button className="landing-cta" onClick={goHome}>
              ▶ {t("landing.ctaPlay")}
            </button>
          </div>
          <div className="landing-hero-visual" aria-hidden="true">
            <span className="landing-sticker landing-sticker-1">🎉</span>
            <span className="landing-sticker landing-sticker-2">♟️</span>
            <span className="landing-sticker landing-sticker-3">🎲</span>
            <div className="landing-preview-grid">
              {PREVIEW_GAME_IDS.map((id) => {
                const meta = GAME_META[id];
                return (
                  <span key={id} className="landing-preview-tile" style={{ background: meta.color }}>
                    <GameIcon gameId={id} />
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-inner">
          <p className="landing-eyebrow">{t("landing.gamesEyebrow")}</p>
          <h3 className="landing-section-title">{t("landing.gamesTitle")}</h3>
          <p className="landing-section-desc">{t("landing.gamesDesc")}</p>
          <div className="game-grid">
            {GAME_IDS.map((id) => {
              const meta = GAME_META[id];
              return (
                <div
                  key={id}
                  className="game-option"
                  role="button"
                  tabIndex={0}
                  onClick={() => openGame(id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openGame(id);
                    }
                  }}
                >
                  <span className="game-option-icon-tile" style={{ background: meta.color }}>
                    <GameIcon gameId={id} />
                  </span>
                  <span className="game-option-label">{t(meta.titleKey)}</span>
                </div>
              );
            })}
          </div>
          <p className="landing-note">{t("landing.gamesMore")}</p>
        </div>
      </section>

      <section className="landing-section landing-section-alt">
        <div className="landing-section-inner">
          <p className="landing-eyebrow">{t("landing.howEyebrow")}</p>
          <h3 className="landing-section-title">{t("landing.howTitle")}</h3>
          <p className="landing-section-desc">{t("landing.howDesc")}</p>
          <div className="landing-steps">
            {STEP_ICONS.map((icon, i) => (
              <div key={i} className="landing-step">
                <span className="landing-step-icon">{icon}</span>
                <p className="landing-step-title">{t(`landing.step${i + 1}Title`)}</p>
                <p className="landing-step-desc">{t(`landing.step${i + 1}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-inner landing-section-inner-narrow">
          <p className="landing-eyebrow">{t("landing.faqEyebrow")}</p>
          <h3 className="landing-section-title">{t("landing.faqTitle")}</h3>
          <div className="landing-faq">
            {Array.from({ length: FAQ_COUNT }, (_, i) => (
              <div key={i} className="landing-faq-item">
                <p className="landing-faq-q">{t(`landing.faq${i + 1}Q`)}</p>
                <p className="landing-faq-a">{t(`landing.faq${i + 1}A`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <p className="landing-footer-tagline">{t("landing.footerTagline")}</p>
          <button className="landing-cta" onClick={goHome}>
            ▶ {t("landing.ctaPlay")}
          </button>
          <div className="segmented landing-theme-toggle">
            {SCHEMES.map((s) => (
              <button key={s.id} className={colorScheme === s.id ? "selected" : ""} onClick={() => setColorScheme(s.id)}>
                {s.icon} {t(s.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
