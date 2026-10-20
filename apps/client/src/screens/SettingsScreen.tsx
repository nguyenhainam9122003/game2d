import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store";
import {
  ACCENT_IDS,
  ACCENTS,
  useSettingsStore,
  type AccentId,
  type BgPattern,
  type ColorScheme,
  type FontSize,
} from "../settingsStore";
import { AVATAR_EMOJIS, useProfileStore } from "../profileStore";
import { useStatsStore } from "../statsStore";

const SCHEMES: { id: ColorScheme; labelKey: string; icon: string }[] = [
  { id: "light", labelKey: "settings.light", icon: "☀️" },
  { id: "dark", labelKey: "settings.dark", icon: "🌙" },
  { id: "auto", labelKey: "settings.auto", icon: "🔄" },
];

const PATTERNS: { id: BgPattern; labelKey: string }[] = [
  { id: "plain", labelKey: "settings.patternPlain" },
  { id: "dots", labelKey: "settings.patternDots" },
  { id: "stripes", labelKey: "settings.patternStripes" },
  { id: "grid", labelKey: "settings.patternGrid" },
];

const FONT_SIZES: { id: FontSize; labelKey: string }[] = [
  { id: "normal", labelKey: "settings.fontSizeNormal" },
  { id: "large", labelKey: "settings.fontSizeLarge" },
];

function ToggleRow({
  icon,
  iconBg,
  label,
  checked,
  onChange,
}: {
  icon: string;
  iconBg: string;
  label: string;
  checked: boolean;
  onChange(v: boolean): void;
}) {
  return (
    <div className="settings-row">
      <span className="settings-row-icon" style={{ background: iconBg }}>
        {icon}
      </span>
      <div className="settings-row-text">
        <span className="settings-row-label">{label}</span>
      </div>
      <div className="settings-row-control">
        <label className="toggle-switch">
          <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
          <span className="toggle-track">
            <span className="toggle-thumb" />
          </span>
        </label>
      </div>
    </div>
  );
}

function LinkRow({
  icon,
  iconBg,
  label,
  sublabel,
  onClick,
  disabled,
}: {
  icon: string;
  iconBg: string;
  label: string;
  sublabel?: string;
  onClick?(): void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`settings-row ${onClick && !disabled ? "settings-row--link" : ""}`}
      onClick={disabled ? undefined : onClick}
      role={onClick && !disabled ? "button" : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
    >
      <span className="settings-row-icon" style={{ background: iconBg }}>
        {icon}
      </span>
      <div className="settings-row-text">
        <span className="settings-row-label">{label}</span>
        {sublabel && <span style={{ color: "var(--color-muted)", fontSize: "0.78rem" }}>{sublabel}</span>}
      </div>
      {onClick && !disabled && <span className="settings-row-chevron">›</span>}
    </div>
  );
}

function InfoModal({ title, body, closeLabel, onClose }: { title: string; body: string; closeLabel: string; onClose(): void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <p className="section-title" style={{ margin: 0 }}>
            {title}
          </p>
          <button className="secondary-button" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
        <p style={{ whiteSpace: "pre-wrap" }}>{body}</p>
      </div>
    </div>
  );
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const { goHome } = useAppStore();
  const {
    colorScheme,
    accent,
    bgPattern,
    fontSize,
    soundEnabled,
    musicEnabled,
    effectsEnabled,
    vibrationEnabled,
    hintsEnabled,
    chatEnabled,
    stickersEnabled,
    analyticsEnabled,
    setColorScheme,
    setAccent,
    setBgPattern,
    setFontSize,
    setSoundEnabled,
    setMusicEnabled,
    setEffectsEnabled,
    setVibrationEnabled,
    setHintsEnabled,
    setChatEnabled,
    setStickersEnabled,
    setAnalyticsEnabled,
    reset,
  } = useSettingsStore();
  const { avatar, nickname, setAvatar, setNickname } = useProfileStore();
  const { gamesPlayed } = useStatsStore();

  const [shareCopied, setShareCopied] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackCopied, setFeedbackCopied] = useState(false);
  const [modal, setModal] = useState<null | "blocked" | "whatIsSent" | "feedback" | "troubleshoot" | "credits">(null);

  async function handleShare() {
    const url = window.location.origin;
    const shareData = { title: t("app.title"), url };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // user cancelled or share failed — fall back to clipboard below
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // clipboard unavailable — nothing more we can do
    }
  }

  async function handleCopyFeedback() {
    if (!feedbackText.trim()) return;
    try {
      await navigator.clipboard.writeText(feedbackText);
      setFeedbackCopied(true);
      setTimeout(() => setFeedbackCopied(false), 2000);
    } catch {
      // clipboard unavailable — nothing more we can do
    }
  }

  return (
    <div className="game-screen" style={{ alignItems: "stretch", width: "100%" }}>
      <div className="game-toolbar">
        <button className="secondary-button" onClick={goHome}>
          {t("game.back")}
        </button>
        <h2 className="settings-heading">{t("settings.title")}</h2>
        <span style={{ width: 1 }} />
      </div>

      <p className="group-label">{t("settings.profileGroup")}</p>
      <div className="settings-card">
        <div className="profile-header">
          <span className="profile-avatar">{avatar}</span>
          <input
            className="profile-nickname-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t("settings.nicknamePlaceholder")}
            maxLength={24}
          />
        </div>
        <div className="settings-row">
          <div className="settings-row-control avatar-picker" style={{ justifyContent: "flex-start" }}>
            {AVATAR_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                className={`avatar-option ${avatar === emoji ? "selected" : ""}`}
                onClick={() => setAvatar(emoji)}
                aria-label={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
        <LinkRow icon="🏆" iconBg="#f6e4b0" label={t("settings.gamesPlayed")} sublabel={String(gamesPlayed)} />
        <LinkRow icon="🔗" iconBg="#cfe3f7" label={t("settings.shareApp")} onClick={handleShare} sublabel={shareCopied ? t("settings.shareAppCopied") : undefined} />
      </div>

      <p className="group-label">{t("settings.displayGroup")}</p>
      <div className="settings-card">
        <div className="settings-row">
          <span className="settings-row-icon" style={{ background: "#f6dfc4" }}>
            🌓
          </span>
          <div className="settings-row-text">
            <span className="settings-row-label">{t("settings.background")}</span>
          </div>
          <div className="settings-row-control">
            <div className="segmented">
              {SCHEMES.map((s) => (
                <button
                  key={s.id}
                  className={colorScheme === s.id ? "selected" : ""}
                  onClick={() => setColorScheme(s.id)}
                >
                  {s.icon} {t(s.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-row-icon" style={{ background: "#f6cdd9" }}>
            🎨
          </span>
          <div className="settings-row-text">
            <span className="settings-row-label">{t("settings.accent")}</span>
          </div>
          <div className="settings-row-control">
            {ACCENT_IDS.map((id: AccentId) => (
              <button
                key={id}
                className={`accent-swatch accent-swatch--sm ${accent === id ? "selected" : ""}`}
                style={{ background: ACCENTS[id] }}
                onClick={() => setAccent(id)}
                aria-label={id}
              />
            ))}
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-row-icon" style={{ background: "#cfe3f7" }}>
            🔲
          </span>
          <div className="settings-row-text">
            <span className="settings-row-label">{t("settings.bgPattern")}</span>
          </div>
          <div className="settings-row-control">
            <div className="segmented">
              {PATTERNS.map((p) => (
                <button
                  key={p.id}
                  className={bgPattern === p.id ? "selected" : ""}
                  onClick={() => setBgPattern(p.id)}
                >
                  {t(p.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-row-icon" style={{ background: "#d8f0cf" }}>
            🔤
          </span>
          <div className="settings-row-text">
            <span className="settings-row-label">{t("settings.fontSize")}</span>
          </div>
          <div className="settings-row-control">
            <div className="segmented">
              {FONT_SIZES.map((f) => (
                <button key={f.id} className={fontSize === f.id ? "selected" : ""} onClick={() => setFontSize(f.id)}>
                  {t(f.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="group-label">{t("settings.soundGroup")}</p>
      <div className="settings-card">
        <ToggleRow icon="🔊" iconBg="#cfe3f7" label={t("settings.soundEffects")} checked={soundEnabled} onChange={setSoundEnabled} />
        <ToggleRow icon="🎵" iconBg="#f0cfe3" label={t("settings.music")} checked={musicEnabled} onChange={setMusicEnabled} />
      </div>

      <p className="group-label">{t("settings.feelGroup")}</p>
      <div className="settings-card">
        <ToggleRow icon="✨" iconBg="#f6e4b0" label={t("settings.effects")} checked={effectsEnabled} onChange={setEffectsEnabled} />
        <ToggleRow icon="📳" iconBg="#d8f0cf" label={t("settings.vibration")} checked={vibrationEnabled} onChange={setVibrationEnabled} />
        <ToggleRow icon="💡" iconBg="#f6dfc4" label={t("settings.hints")} checked={hintsEnabled} onChange={setHintsEnabled} />
      </div>

      <p className="group-label">{t("settings.chatGroup")}</p>
      <div className="settings-card">
        <ToggleRow icon="💬" iconBg="#cfe3f7" label={t("settings.chatToggle")} checked={chatEnabled} onChange={setChatEnabled} />
        <ToggleRow icon="😀" iconBg="#f0cfe3" label={t("settings.stickers")} checked={stickersEnabled} onChange={setStickersEnabled} />
        <LinkRow icon="🚫" iconBg="#f6cdd9" label={t("settings.blockedUsers")} onClick={() => setModal("blocked")} />
      </div>

      <p className="group-label">{t("settings.privacyGroup")}</p>
      <div className="settings-card">
        <ToggleRow icon="📊" iconBg="#d8f0cf" label={t("settings.analytics")} checked={analyticsEnabled} onChange={setAnalyticsEnabled} />
        <LinkRow icon="📄" iconBg="#cfe3f7" label={t("settings.whatIsSent")} onClick={() => setModal("whatIsSent")} />
      </div>

      <p className="group-label">{t("settings.helpGroup")}</p>
      <div className="settings-card">
        <LinkRow icon="✉️" iconBg="#f6e4b0" label={t("settings.feedback")} onClick={() => setModal("feedback")} />
        <LinkRow icon="🔧" iconBg="#f6dfc4" label={t("settings.troubleshoot")} onClick={() => setModal("troubleshoot")} />
        <LinkRow icon="🌐" iconBg="#cfe3f7" label={t("settings.website")} disabled sublabel={t("settings.websiteComingSoon")} />
        <LinkRow icon="🎨" iconBg="#d8f0cf" label={t("settings.credits")} onClick={() => setModal("credits")} />
      </div>

      <button className="secondary-button" onClick={reset}>
        {t("settings.reset")}
      </button>

      {modal === "blocked" && (
        <InfoModal title={t("settings.blockedUsers")} body={t("settings.blockedUsersEmpty")} closeLabel={t("settings.close")} onClose={() => setModal(null)} />
      )}
      {modal === "whatIsSent" && (
        <InfoModal title={t("settings.whatIsSent")} body={t("settings.whatIsSentBody")} closeLabel={t("settings.close")} onClose={() => setModal(null)} />
      )}
      {modal === "troubleshoot" && (
        <InfoModal title={t("settings.troubleshoot")} body={t("settings.troubleshootBody")} closeLabel={t("settings.close")} onClose={() => setModal(null)} />
      )}
      {modal === "credits" && (
        <InfoModal title={t("settings.credits")} body={t("settings.creditsBody")} closeLabel={t("settings.close")} onClose={() => setModal(null)} />
      )}
      {modal === "feedback" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <p className="section-title" style={{ margin: 0 }}>
                {t("settings.feedback")}
              </p>
              <button className="secondary-button" onClick={() => setModal(null)}>
                {t("settings.close")}
              </button>
            </div>
            <p style={{ color: "var(--color-muted)", fontSize: "0.85rem", margin: 0 }}>{t("settings.feedbackNote")}</p>
            <textarea
              className="profile-nickname-input"
              style={{ minHeight: 100, fontWeight: 400, resize: "vertical" }}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={t("settings.feedbackPlaceholder")}
            />
            <button className="primary-button" onClick={handleCopyFeedback} disabled={!feedbackText.trim()}>
              {feedbackCopied ? t("settings.feedbackCopied") : t("settings.feedbackCopy")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
