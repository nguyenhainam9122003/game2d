import { create } from "zustand";
import type { GameId } from "@game/protocol";
import type { HuntRule } from "@game/engine";
import type { DrawRule } from "@game/engine";
import type { PlaneVariant } from "@game/engine";

/** The games rachoi.app lets you configure before starting — see each game's waiting-room options. */
export const GAMES_WITH_OPTIONS: GameId[] = [
  "go",
  "battleship",
  "plane-battle",
  "domino",
  "sudoku",
  "number-match",
  "number-hunt",
];

export type GoBoardSize = 9 | 13 | 19;
export type SudokuHintBudget = 0 | 1 | 3 | 5;
export type SudokuErrorMode = "off" | "indicate" | "limit-1" | "limit-3" | "limit-5";
export type NumberMatchCopyLimit = 3 | 5 | 8;
/** 0 = off, matching rachoi's "Tắt" — the per-turn clock Domino/Number Match use is simpler than the chess-style clock. */
export type PerTurnSeconds = 0 | 12 | 30;
export type NumberHuntSheetMode = "shared" | "separate";
export type NumberHuntSheetSize = 25 | 50 | 100 | 200 | 500 | 1000;

export function sudokuMistakeLimitOf(mode: SudokuErrorMode): number | null {
  if (mode === "limit-1") return 1;
  if (mode === "limit-3") return 3;
  if (mode === "limit-5") return 5;
  return null; // "off" and "indicate" never end the game on mistakes
}

/**
 * Per-game pre-match settings — rachoi.app exposes these on each game's own
 * waiting-room screen (board size, hunt rule, draw rule, etc.), separate from
 * the clock/match-length options in `playOptionsStore` which apply the same
 * way to every competitive game. Domino and Number Match additionally have
 * their own simple "Giờ mỗi lượt" per-turn timer here rather than using the
 * shared chess-style clock, matching rachoi's actual waiting rooms.
 */
interface GameOptionsData {
  goBoardSize: GoBoardSize;
  planeBattleVariant: PlaneVariant;
  battleshipHuntRule: HuntRule;
  dominoDrawRule: DrawRule;
  dominoPerTurnSeconds: PerTurnSeconds;
  dominoHintsEnabled: boolean;
  sudokuHintBudget: SudokuHintBudget;
  sudokuErrorMode: SudokuErrorMode;
  numberMatchHintsVisible: boolean;
  numberMatchCopyLimit: NumberMatchCopyLimit;
  numberMatchPerTurnSeconds: PerTurnSeconds;
  numberHuntSheetMode: NumberHuntSheetMode;
  numberHuntSheetSize: NumberHuntSheetSize;
}

interface GameOptionsState extends GameOptionsData {
  setGoBoardSize(v: GoBoardSize): void;
  setPlaneBattleVariant(v: PlaneVariant): void;
  setBattleshipHuntRule(v: HuntRule): void;
  setDominoDrawRule(v: DrawRule): void;
  setDominoPerTurnSeconds(v: PerTurnSeconds): void;
  setDominoHintsEnabled(v: boolean): void;
  setSudokuHintBudget(v: SudokuHintBudget): void;
  setSudokuErrorMode(v: SudokuErrorMode): void;
  setNumberMatchHintsVisible(v: boolean): void;
  setNumberMatchCopyLimit(v: NumberMatchCopyLimit): void;
  setNumberMatchPerTurnSeconds(v: PerTurnSeconds): void;
  setNumberHuntSheetMode(v: NumberHuntSheetMode): void;
  setNumberHuntSheetSize(v: NumberHuntSheetSize): void;
  reset(): void;
}

const DEFAULTS: GameOptionsData = {
  goBoardSize: 9,
  planeBattleVariant: "large",
  battleshipHuntRule: "again-on-hit",
  dominoDrawRule: "one",
  dominoPerTurnSeconds: 0,
  dominoHintsEnabled: false,
  sudokuHintBudget: 3,
  sudokuErrorMode: "off",
  numberMatchHintsVisible: false,
  numberMatchCopyLimit: 5,
  numberMatchPerTurnSeconds: 0,
  numberHuntSheetMode: "shared",
  numberHuntSheetSize: 25,
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
  setDominoPerTurnSeconds: (dominoPerTurnSeconds) => {
    set({ dominoPerTurnSeconds });
    persist({ ...get(), dominoPerTurnSeconds });
  },
  setDominoHintsEnabled: (dominoHintsEnabled) => {
    set({ dominoHintsEnabled });
    persist({ ...get(), dominoHintsEnabled });
  },
  setSudokuHintBudget: (sudokuHintBudget) => {
    set({ sudokuHintBudget });
    persist({ ...get(), sudokuHintBudget });
  },
  setSudokuErrorMode: (sudokuErrorMode) => {
    set({ sudokuErrorMode });
    persist({ ...get(), sudokuErrorMode });
  },
  setNumberMatchHintsVisible: (numberMatchHintsVisible) => {
    set({ numberMatchHintsVisible });
    persist({ ...get(), numberMatchHintsVisible });
  },
  setNumberMatchCopyLimit: (numberMatchCopyLimit) => {
    set({ numberMatchCopyLimit });
    persist({ ...get(), numberMatchCopyLimit });
  },
  setNumberMatchPerTurnSeconds: (numberMatchPerTurnSeconds) => {
    set({ numberMatchPerTurnSeconds });
    persist({ ...get(), numberMatchPerTurnSeconds });
  },
  setNumberHuntSheetMode: (numberHuntSheetMode) => {
    set({ numberHuntSheetMode });
    persist({ ...get(), numberHuntSheetMode });
  },
  setNumberHuntSheetSize: (numberHuntSheetSize) => {
    set({ numberHuntSheetSize });
    persist({ ...get(), numberHuntSheetSize });
  },
  reset: () => {
    set(DEFAULTS);
    persist(DEFAULTS);
  },
}));

type TFunction = (key: string, options?: Record<string, unknown>) => string;

function formatPerTurn(seconds: PerTurnSeconds, t: TFunction): string {
  return seconds === 0 ? t("gameOptions.perTurnOff") : t("gameOptions.perTurnSeconds", { seconds });
}

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
    case "domino": {
      const draw =
        options.dominoDrawRule === "one"
          ? t("gameOptions.dominoDrawOne")
          : options.dominoDrawRule === "until-playable"
            ? t("gameOptions.dominoDrawUntilPlayable")
            : t("gameOptions.dominoDrawNone");
      const hints = options.dominoHintsEnabled ? t("gameOptions.hintsOn") : t("gameOptions.hintsOff");
      return `${formatPerTurn(options.dominoPerTurnSeconds, t)}, ${draw}, ${hints}`;
    }
    case "sudoku": {
      const hint = t(`gameOptions.sudokuHintBudget${options.sudokuHintBudget}`);
      const error = t(`gameOptions.sudokuErrorMode-${options.sudokuErrorMode}`);
      return `${hint}, ${error}`;
    }
    case "number-match": {
      const hints = options.numberMatchHintsVisible ? t("gameOptions.numberMatchHintsShown") : t("gameOptions.numberMatchHintsHidden");
      return `${formatPerTurn(options.numberMatchPerTurnSeconds, t)}, ${t("gameOptions.numberMatchCopyLimit", { count: options.numberMatchCopyLimit })}, ${hints}`;
    }
    case "number-hunt": {
      const mode =
        options.numberHuntSheetMode === "shared" ? t("gameOptions.numberHuntShared") : t("gameOptions.numberHuntSeparate");
      return `${mode}, ${t("gameOptions.numberHuntSheetSize", { count: options.numberHuntSheetSize })}`;
    }
    default:
      return null;
  }
}
