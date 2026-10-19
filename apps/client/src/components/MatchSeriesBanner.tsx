import { useTranslation } from "react-i18next";
import type { MatchSeriesState } from "../useMatchSeries";

interface Props {
  series: MatchSeriesState;
  onNextRound(): void;
}

/** Shown between games of a multi-game match ("Số ván" in play options) — hidden entirely for single-game matches. */
export function MatchSeriesBanner({ series, onNextRound }: Props) {
  const { t } = useTranslation();
  if (series.matchLength <= 1) return null;

  if (series.seriesOver) {
    return <p className="match-series-banner">{t("playOptions.matchOver", { p1: series.wins[0], p2: series.wins[1] })}</p>;
  }

  return (
    <div className="match-series-banner">
      <p>{t("playOptions.roundOf", { round: series.round, total: series.matchLength, p1: series.wins[0], p2: series.wins[1] })}</p>
      <button className="primary-button" onClick={onNextRound}>
        {t("playOptions.nextRound")}
      </button>
    </div>
  );
}
