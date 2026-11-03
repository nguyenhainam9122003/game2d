import { useTranslation } from "react-i18next";

interface Props {
  firstPlayerLabel: string;
}

/** Brief "Bắt đầu!" announcement shown over the board when a round starts, naming who moves
 *  first — fades itself out via CSS, remount (give it a fresh `key` per round) replays it. */
export function RoundStartBanner({ firstPlayerLabel }: Props) {
  const { t } = useTranslation();
  return (
    <div className="ttt-start-banner">
      <p className="ttt-start-title">{t("game.startRound")}</p>
      <p className="ttt-start-pill">🎲 {t("game.goesFirst", { player: firstPlayerLabel })}</p>
    </div>
  );
}
