import { useEffect, useState } from "react";
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
  const { goHome, openGame, openRules } = useAppStore();
  const { colorScheme, setColorScheme } = useSettingsStore();

  // The hero's signature move: the preview tiles tilt toward the cursor like a physical
  // object on a desk, and the three stickers drift at slightly different rates — depth from
  // differential movement, driven by the pointer rather than the scroll. Mouse only (checked
  // via `pointerType`, not a CSS `hover` guard, because the handler is JS-attached either way)
  // and skipped entirely under reduced motion.
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const handleHeroPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -10, y: px * 12 });
  };
  const resetHeroTilt = () => setTilt({ x: 0, y: 0 });

  // Scroll parallax: the hero visual drifts upward slower than the page scrolls past it —
  // felt the instant the visitor nudges the wheel, unlike the once-only entrance fade below.
  // Lives on its own inner wrapper (not `.landing-hero-visual` itself) because that outer
  // element already owns a CSS-class-driven `transform` for its entrance; an inline style on
  // the same element would silently win the cascade and kill that transition.
  const [heroParallax, setHeroParallax] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setHeroParallax(Math.min(window.scrollY * 0.12, 60));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Single-open FAQ accordion — a real interaction for this section rather than a static list,
  // so the page has more than one way of responding to the visitor.
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Scroll-entrance for the marketing sections below the hero. Guarded behind actual
  // `IntersectionObserver` support (checked once on mount) so the CSS that hides `.reveal`
  // elements only ever applies once something is guaranteed to reveal them again — no JS/no
  // observer support means the page simply renders fully visible from the start.
  const [revealReady, setRevealReady] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    setRevealReady(true);
  }, []);

  useEffect(() => {
    if (!revealReady) return;
    // The hero is already inside the viewport at mount, so an intersection observer fires on
    // it within a frame or two — too fast to read as "an entrance" rather than just how the
    // page always looked. It gets a deliberate, fixed delay instead of observer-driven timing,
    // so the very first thing a visitor sees visibly arrives rather than being there already.
    const heroEls = document.querySelectorAll<HTMLElement>(".landing-hero .reveal");
    const heroTimer = window.setTimeout(() => {
      heroEls.forEach((el) => el.classList.add("is-visible"));
    }, 300);

    // Everything below the fold still earns its reveal by actually scrolling into view.
    const els = document.querySelectorAll<HTMLElement>(".landing-section .reveal, .landing-footer .reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    // Failsafe: force every `.reveal` element visible after a couple of seconds no matter
    // what, so a tab that never reports visibility (prerendering, some embedders, an observer
    // an extension interferes with) can't leave the page's own marketing copy permanently
    // invisible — a stuck animation is a far smaller problem than a stuck blank hero.
    const fallback = window.setTimeout(() => {
      els.forEach((el) => el.classList.add("is-visible"));
      io.disconnect();
    }, 2000);
    return () => {
      io.disconnect();
      window.clearTimeout(heroTimer);
      window.clearTimeout(fallback);
    };
  }, [revealReady]);

  return (
    <div className={revealReady ? "landing-page reveal-ready" : "landing-page"}>
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
          <div className="landing-hero-text reveal">
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
          <div
            className="landing-hero-visual reveal"
            style={{ transitionDelay: "90ms" }}
            aria-hidden="true"
            onPointerMove={handleHeroPointerMove}
            onPointerLeave={resetHeroTilt}
          >
            <div className="landing-hero-visual-inner" style={{ transform: `translateY(${-heroParallax}px)` }}>
              <span
                className="landing-sticker landing-sticker-1"
                style={{ transform: `translate(${tilt.y * 1.6}px, ${tilt.x * -1.6}px)` }}
              >
                <span className="landing-sticker-float">🎉</span>
              </span>
              <span
                className="landing-sticker landing-sticker-2"
                style={{ transform: `translate(${tilt.y * 1}px, ${tilt.x * -1}px)` }}
              >
                <span className="landing-sticker-float">♟️</span>
              </span>
              <span
                className="landing-sticker landing-sticker-3"
                style={{ transform: `translate(${tilt.y * 2.2}px, ${tilt.x * -2.2}px)` }}
              >
                <span className="landing-sticker-float">🎲</span>
              </span>
              <div
                className="landing-preview-grid"
                style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
              >
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
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-inner reveal">
          <div className="landing-split-header">
            <h3 className="landing-section-title">{t("landing.gamesTitle")}</h3>
            <p className="landing-section-desc landing-split-desc">{t("landing.gamesDesc")}</p>
          </div>
          <div className="game-grid">
            {GAME_IDS.map((id, i) => {
              const meta = GAME_META[id];
              return (
                <div
                  key={id}
                  className="game-option reveal"
                  style={{ transitionDelay: `${Math.min(i, 10) * 35}ms` }}
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
                    <button
                      className="rules-link-toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        openRules(id);
                      }}
                      aria-label={t("rules.summaryHeading") + ": " + t(meta.titleKey)}
                    >
                      📖
                    </button>
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
        <div className="landing-section-inner reveal">
          <h3 className="landing-section-title">{t("landing.howTitle")}</h3>
          <p className="landing-section-desc">{t("landing.howDesc")}</p>
          <div className="landing-rail">
            {STEP_ICONS.map((icon, i) => (
              <div key={i} className="landing-rail-step reveal" style={{ transitionDelay: `${i * 70}ms` }}>
                <span className="landing-rail-node">{icon}</span>
                <p className="landing-step-title">{t(`landing.step${i + 1}Title`)}</p>
                <p className="landing-step-desc">{t(`landing.step${i + 1}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-inner landing-section-inner-narrow reveal">
          <h3 className="landing-section-title">{t("landing.faqTitle")}</h3>
          <div className="landing-faq">
            {Array.from({ length: FAQ_COUNT }, (_, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className={isOpen ? "landing-faq-item reveal open" : "landing-faq-item reveal"}
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <button
                    className="landing-faq-q"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    <span>{t(`landing.faq${i + 1}Q`)}</span>
                    <span className="landing-faq-chevron" aria-hidden="true">
                      ⌄
                    </span>
                  </button>
                  <div className="landing-faq-a-wrap">
                    <p className="landing-faq-a">{t(`landing.faq${i + 1}A`)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner reveal">
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
