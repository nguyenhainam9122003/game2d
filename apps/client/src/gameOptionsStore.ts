import { create } from "zustand";
import type { GameId } from "@game/protocol";
import type { HuntRule } from "@game/engine";
import type { DrawRule } from "@game/engine";
import type { PlaneVariant } from "@game/engine";

/** The games rachoi.app lets you configure before starting — see each game's waiting-room options. */
export const GAMES_WITH_OPTIONS: GameId[] = ["go", "battleship", "plane-battle", "domino", "sudoku", "number-match"];

export type GoBoardSize = 9 | 13 | 19;
export type SudokuMistakeLimit = 1 | 3 | 5;

/**
 * Per-game pre-match settings — rachoi.app exposes these on each game's own
 * waiting-room screen (board size, hunt rule, draw rule, etc.), separate from
 * the clock/match-length options in `playOptionsStore` which apply to every
 * game the same way.
 */
interface GameOptionsData {
  goBoardSize: GoBoardSize;
  planeBattleVariant: PlaneVariant;
  battleshipHuntRule: HuntRule;
  dominoDrawRule: DrawRule;
  sudokuMistakeLimit: SudokuMistakeLimit;
  numberMatchHintsVisible: boolean;
}

interface GameOptionsState extends GameOptionsData {
  setGoBoardSize(v: GoBoardSize): void;
  setPlaneBattleVariant(v: PlaneVariant): void;
  setBattleshipHuntRule(v: HuntRule): void;
  setDominoDrawRule(v: DrawRule): void;
  setSudokuMistakeLimit(v: SudokuMistakeLimit): void;
  setNumberMatchHintsVisible(v: boolean): void;
  reset(): void;
}

const DEFAULTS: GameOptionsData = {
  goBoardSize: 9,
  planeBattleVariant: "small",
  battleshipHuntRule: "again-on-hit",
  dominoDrawRule: "one",
  sudokuMistakeLimit: 3,
  numberMatchHintsVisible: true,
};

const STORAGE_KEY = "ra-choi:game-options";

function loadInitial(): GameOptionsData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // corrupt/blocked storage — fall back to defaults
  }
  return DEFAULTS;
}

function persist(data: GameOptionsData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const useGameOptionsStore = create<GameOptionsState>((set, get) => ({
  ...loadInitial(),
  setGoBoardSize: (goBoardSize) => {
    set({ goBoardSize });
    persist({ ...get(), goBoardSize });
  },
  setPlaneBattleVariant: (planeBattleVariant) => {
    set({ planeBattleVariant });
    persist({ ...get(), planeBattleVariant });
  },
  setBattleshipHuntRule: (battleshipHuntRule) => {
    set({ battleshipHuntRule });
    persist({ ...get(), battleshipHuntRule });
  },
  setDominoDrawRule: (dominoDrawRule) => {
    set({ dominoDrawRule });
    persist({ ...get(), dominoDrawRule });
  },
  setSudokuMistakeLimit: (sudokuMistakeLimit) => {
    set({ sudokuMistakeLimit });
    persist({ ...get(), sudokuMistakeLimit });
  },
  setNumberMatchHintsVisible: (numberMatchHintsVisible) => {
    set({ numberMatchHintsVisible });
    persist({ ...get(), numberMatchHintsVisible });
  },
  reset: () => {
    set(DEFAULTS);
    persist(DEFAULTS);
  },
}));

type TFunction = (key: string, options?: Record<string, unknown>) => string;

export function formatGameOptionSummary(gameId: GameId, options: GameOptionsData, t: TFunction): string | null {
  switch (gameId) {
    case "go":
      return t(`gameOptions.goBoardSize${options.goBoardSize}`);
    case "battleship":
      return options.battleshipHuntRule === "again-on-hit"
        ? t("gameOptions.battleshipHuntAgain")
        : t("gameOptions.battleshipHuntOnePerTurn");
    case "plane-battle":
      return options.planeBattleVariant === "small" ? t("gameOptions.planeBattleSmall") : t("gameOptions.planeBattleLarge");
    case "domino":
      if (options.dominoDrawRule === "one") return t("gameOptions.dominoDrawOne");
      if (options.dominoDrawRule === "until-playable") return t("gameOptions.dominoDrawUntilPlayable");
      return t("gameOptions.dominoDrawNone");
    case "sudoku":
      return t("gameOptions.sudokuMistakeLimit", { count: options.sudokuMistakeLimit });
    case "number-match":
      return options.numberMatchHintsVisible ? t("gameOptions.numberMatchHintsShown") : t("gameOptions.numberMatchHintsHidden");
    default:
      return null;
  }
}
