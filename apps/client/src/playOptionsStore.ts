import { create } from "zustand";

export type ClockMode = "none" | "clock" | "per-move";

export interface ClockPreset {
  initialSeconds: number;
  incrementSeconds: number;
}

export interface PerMovePreset {
  seconds: number;
}

export const CLOCK_PRESETS: ClockPreset[] = [
  { initialSeconds: 600, incrementSeconds: 5 },
  { initialSeconds: 900, incrementSeconds: 0 },
  { initialSeconds: 900, incrementSeconds: 10 },
  { initialSeconds: 1800, incrementSeconds: 10 },
  { initialSeconds: 3600, incrementSeconds: 30 },
];

export const PER_MOVE_PRESETS: PerMovePreset[] = [{ seconds: 30 }, { seconds: 60 }, { seconds: 120 }];

export const MATCH_LENGTH_PRESETS = [1, 3, 5, 7];

interface PlayOptionsData {
  clockMode: ClockMode;
  clockInitialSeconds: number;
  clockIncrementSeconds: number;
  perMoveSeconds: number;
  matchLength: number;
}

interface PlayOptionsState extends PlayOptionsData {
  setClockMode(mode: ClockMode): void;
  setClockPreset(preset: ClockPreset): void;
  setPerMoveSeconds(seconds: number): void;
  setMatchLength(length: number): void;
  reset(): void;
}

const DEFAULTS: PlayOptionsData = {
  clockMode: "none",
  clockInitialSeconds: CLOCK_PRESETS[0].initialSeconds,
  clockIncrementSeconds: CLOCK_PRESETS[0].incrementSeconds,
  perMoveSeconds: PER_MOVE_PRESETS[0].seconds,
  matchLength: 1,
};

const STORAGE_KEY = "ra-choi:play-options";

function loadInitial(): PlayOptionsData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // corrupt/blocked storage — fall back to defaults
  }
  return DEFAULTS;
}

function persist(data: PlayOptionsData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const usePlayOptionsStore = create<PlayOptionsState>((set, get) => ({
  ...loadInitial(),
  setClockMode: (clockMode) => {
    set({ clockMode });
    persist({ ...get(), clockMode });
  },
  setClockPreset: (preset) => {
    const next = { clockMode: "clock" as const, clockInitialSeconds: preset.initialSeconds, clockIncrementSeconds: preset.incrementSeconds };
    set(next);
    persist({ ...get(), ...next });
  },
  setPerMoveSeconds: (perMoveSeconds) => {
    set({ clockMode: "per-move", perMoveSeconds });
    persist({ ...get(), clockMode: "per-move", perMoveSeconds });
  },
  setMatchLength: (matchLength) => {
    set({ matchLength });
    persist({ ...get(), matchLength });
  },
  reset: () => {
    set(DEFAULTS);
    persist(DEFAULTS);
  },
}));

type TFunction = (key: string, options?: Record<string, unknown>) => string;

export function formatClockSummary(state: PlayOptionsData, t: TFunction): string {
  if (state.clockMode === "none") return t("playOptions.noClock");
  if (state.clockMode === "per-move") {
    return t("playOptions.perMove", { seconds: state.perMoveSeconds });
  }
  const minutes = Math.round(state.clockInitialSeconds / 60);
  return state.clockIncrementSeconds > 0
    ? t("playOptions.clockWithIncrement", { minutes, increment: state.clockIncrementSeconds })
    : t("playOptions.clockMinutes", { minutes });
}
