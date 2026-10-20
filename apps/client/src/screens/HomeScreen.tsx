import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { GameId } from "@game/protocol";
import { useAppStore } from "../store";
import { GAME_META, SOLO_ONLY_GAMES } from "../gameMeta";
import { useFavoritesStore } from "../favoritesStore";
import { useGameOrderStore } from "../gameOrderStore";
import { GameIcon } from "../components/GameIcon";

export function HomeScreen() {
  const { t } = useTranslation();
  const { openGame } = useAppStore();
  const { favorites, toggle, isFavorite } = useFavoritesStore();
  const { order, moveUp, moveDown } = useGameOrderStore();
  const [sorting, setSorting] = useState(false);

  const favoriteIds = order.filter((id) => favorites.includes(id));
  const otherIds = order.filter((id) => !favorites.includes(id));

  if (sorting) {
    return (
      <>
        <div className="sort-header">
          <p style={{ color: "var(--color-muted)", margin: 0 }}>{t("home.sort")}</p>
          <button className="primary-button" onClick={() => setSorting(false)}>
            {t("home.sortDone")}
          </button>
        </div>
        <div className="sort-list">
          {order.map((id, i) => {
            const meta = GAME_META[id];
            return (
              <div key={id} className="sort-row">
                <span className="game-option-icon-tile sort-row-icon" style={{ background: meta.color }}>
                  <GameIcon gameId={id} />
                </span>
                <span className="sort-row-label">{t(meta.titleKey)}</span>
                <button
                  className="secondary-button"
                  onClick={() => moveUp(id)}
                  disabled={i === 0}
                  aria-label={t("home.moveUp")}
                >
                  ▲
                </button>
                <button
                  className="secondary-button"
                  onClick={() => moveDown(id)}
                  disabled={i === order.length - 1}
                  aria-label={t("home.moveDown")}
                >
                  ▼
                </button>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  function renderGrid(ids: GameId[]) {
    return (
      <div className="game-grid">
        {ids.map((id) => {
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
                <button
                  className="game-favorite-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(id);
                  }}
                  aria-label={t("home.favorite")}
                >
                  {isFavorite(id) ? "★" : "☆"}
                </button>
                <span className="game-option-players">👤{SOLO_ONLY_GAMES.includes(id) ? 1 : 2}</span>
              </span>
              <span className="game-option-label">{t(meta.titleKey)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className="sort-header">
        <p style={{ color: "var(--color-muted)", margin: 0 }}>{t("home.subtitle")}</p>
        <button className="secondary-button" onClick={() => setSorting(true)}>
          {t("home.sort")}
        </button>
      </div>

      {favoriteIds.length > 0 && (
        <>
          <p className="group-label">{t("home.favorites")}</p>
          {renderGrid(favoriteIds)}
        </>
      )}

      {favoriteIds.length > 0 && <p className="group-label">{t("home.otherGames")}</p>}
      {renderGrid(otherIds)}
    </>
  );
}
