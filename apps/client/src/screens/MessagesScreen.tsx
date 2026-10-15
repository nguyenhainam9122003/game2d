import { useTranslation } from "react-i18next";

export function MessagesScreen() {
  const { t } = useTranslation();

  return (
    <div className="card" style={{ textAlign: "center" }}>
      <p className="section-title">{t("nav.messages")}</p>
      <p style={{ color: "var(--color-muted)" }}>{t("messages.comingSoon")}</p>
    </div>
  );
}
