import { useTranslation } from "react-i18next";

interface Props {
  canStepBack: boolean;
  canStepForward: boolean;
  onStepBack(): void;
  onStepForward(): void;
}

export function HistoryNav({ canStepBack, canStepForward, onStepBack, onStepForward }: Props) {
  const { t } = useTranslation();
  return (
    <div className="history-nav">
      <button className="secondary-button" onClick={onStepBack} disabled={!canStepBack} aria-label={t("history.prev")}>
        ◀
      </button>
      <button className="secondary-button" onClick={onStepForward} disabled={!canStepForward} aria-label={t("history.next")}>
        ▶
      </button>
    </div>
  );
}
