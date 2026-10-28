import { useTranslation } from "react-i18next";
import { useAppStore } from "../store";
import { GAME_META, GAME_IDS } from "../gameMeta";
import { GameIcon } from "../components/GameIcon";

const STEP_ICONS = ["🪑", "🔗", "🎉"];
const FAQ_COUNT = 4;

export function LandingScreen() {
  const { t } = useTranslation();
  const { goHome, openGame } = useAppStore();

  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="landing-hero-text">
          <p className="landing-eyebrow">{t("landing.heroEyebrow")}</p>
          <h2 className="landing-title">{t("landing.heroTitle")}</h2>
          <p className="landing-desc">{t("landing.heroDesc")}</p>
          <div className="landing-pills">
            <span className="landing-pill">{t("landing.pillNoAccount")}</span>
            <span className="landing-pill">{t("landing.pillFree")}</span>
            <span className="landing-pill">{t("landing.pillGameCount")}</span>
          </div>
          <button className="primary-button landing-cta" onClick={goHome}>
            ▶ {t("landing.ctaPlay")}
          </button>
        </div>
      </section>

      <section className="landing-section">
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
      </section>

      <section className="landing-section">
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
      </section>

      <section className="landing-section">
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
      </section>

      <footer className="landing-footer">
        <p className="landing-footer-tagline">{t("landing.footerTagline")}</p>
        <button className="primary-button landing-cta" onClick={goHome}>
          ▶ {t("landing.ctaPlay")}
        </button>
      </footer>
    </div>
  );
}
