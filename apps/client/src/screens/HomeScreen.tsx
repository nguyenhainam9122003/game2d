import { useTranslation } from "react-i18next";
import type { GameId } from "@game/protocol";
import { useAppStore } from "../store";
import { GAME_IDS, GAME_META, SOLO_ONLY_GAMES } from "../gameMeta";
import { useFavoritesStore } from "../favoritesStore";

export function HomeScreen() {
  const { t } = useTranslation();
  const { openGame } = useAppStore();
  const { favorites, toggle, isFavorite } = useFavoritesStore();

  const favoriteIds = GAME_IDS.filter((id) => favorites.includes(id));
  const otherIds = GAME_IDS.filter((id) => !favorites.includes(id));

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
                {meta.icon}
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
      <p style={{ color: "var(--color-muted)", margin: 0 }}>{t("home.subtitle")}</p>

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
