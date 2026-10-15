import { create } from "zustand";

export type ColorScheme = "light" | "dark" | "auto";
export type AccentId = "orange" | "blue" | "pink" | "green" | "purple";
export type BgPattern = "plain" | "dots" | "stripes" | "grid";

export const ACCENT_IDS: AccentId[] = ["orange", "blue", "pink", "green", "purple"];

export const ACCENTS: Record<AccentId, string> = {
  orange: "#ff7a18",
  blue: "#2f8fe0",
  pink: "#f0609a",
  green: "#4caf6e",
  purple: "#8b6cf0",
};

interface SettingsData {
  colorScheme: ColorScheme;
  accent: AccentId;
  bgPattern: BgPattern;
}

interface SettingsState extends SettingsData {
  setColorScheme(v: ColorScheme): void;
  setAccent(v: AccentId): void;
  setBgPattern(v: BgPattern): void;
  reset(): void;
}

const DEFAULTS: SettingsData = {
  colorScheme: "auto",
  accent: "orange",
  bgPattern: "dots",
};

const STORAGE_KEY = "ra-choi:settings";

function loadInitial(): SettingsData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // corrupt/blocked storage — fall back to defaults
  }
  return DEFAULTS;
}

function persist(data: SettingsData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...loadInitial(),
  setColorScheme: (colorScheme) => {
    set({ colorScheme });
    persist({ ...get(), colorScheme });
  },
  setAccent: (accent) => {
    set({ accent });
    persist({ ...get(), accent });
  },
  setBgPattern: (bgPattern) => {
    set({ bgPattern });
    persist({ ...get(), bgPattern });
  },
  reset: () => {
    set(DEFAULTS);
    persist(DEFAULTS);
  },
}));
