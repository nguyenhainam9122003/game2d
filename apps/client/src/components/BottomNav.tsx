import { useTranslation } from "react-i18next";
import { useAppStore } from "../store";

function ControllerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" x2="10" y1="12" y2="12" />
      <line x1="8" x2="8" y1="10" y2="14" />
      <line x1="15" x2="15.01" y1="13" y2="13" />
      <line x1="18" x2="18.01" y1="11" y2="11" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.152A4 4 0 0 0 17.32 5Z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function BottomNav() {
  const { t } = useTranslation();
  const { screen, goHome, goToMessages, goToSettings } = useAppStore();

  const isPlay =
    screen === "home" || screen === "gameDetail" || screen === "game" || screen === "online";
  const isMessages = screen === "messages";
  const isMe = screen === "settings";

  return (
    <nav className="bottom-nav">
      <button className={`bottom-nav-item ${isPlay ? "active" : ""}`} onClick={goHome}>
        <span className="bottom-nav-icon-wrap">
          <ControllerIcon />
        </span>
        <span className="bottom-nav-label">{t("nav.play")}</span>
      </button>
      <button className={`bottom-nav-item ${isMessages ? "active" : ""}`} onClick={goToMessages}>
        <span className="bottom-nav-icon-wrap">
          <ChatIcon />
        </span>
        <span className="bottom-nav-label">{t("nav.messages")}</span>
      </button>
      <button className={`bottom-nav-item ${isMe ? "active" : ""}`} onClick={goToSettings}>
        <span className="bottom-nav-icon-wrap">
          <PersonIcon />
        </span>
        <span className="bottom-nav-label">{t("nav.me")}</span>
      </button>
    </nav>
  );
}
