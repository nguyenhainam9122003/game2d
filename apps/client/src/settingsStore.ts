import { create } from "zustand";

export type ColorScheme = "light" | "dark" | "auto";
export type AccentId = "orange" | "blue" | "pink" | "green" | "purple";
export type BgPattern = "plain" | "dots" | "stripes" | "grid";
export type FontSize = "normal" | "large";

export const ACCENT_IDS: AccentId[] = ["orange", "blue", "pink", "green", "purple"];

export const ACCENTS: Record<AccentId, string> = {
  orange: "#ff7a18",
  blue: "#2f8fe0",
  pink: "#f0609a",
  green: "#4caf6e",
  purple: "#c7b3f3",
};

interface SettingsData {
  colorScheme: ColorScheme;
  accent: AccentId;
  bgPattern: BgPattern;
  fontSize: FontSize;
  soundEnabled: boolean;
  musicEnabled: boolean;
  effectsEnabled: boolean;
  vibrationEnabled: boolean;
  hintsEnabled: boolean;
  chatEnabled: boolean;
  stickersEnabled: boolean;
  analyticsEnabled: boolean;
}

interface SettingsState extends SettingsData {
  setColorScheme(v: ColorScheme): void;
  setAccent(v: AccentId): void;
  setBgPattern(v: BgPattern): void;
  setFontSize(v: FontSize): void;
  setSoundEnabled(v: boolean): void;
  setMusicEnabled(v: boolean): void;
  setEffectsEnabled(v: boolean): void;
  setVibrationEnabled(v: boolean): void;
  setHintsEnabled(v: boolean): void;
  setChatEnabled(v: boolean): void;
  setStickersEnabled(v: boolean): void;
  setAnalyticsEnabled(v: boolean): void;
  reset(): void;
}

const DEFAULTS: SettingsData = {
  colorScheme: "auto",
  accent: "purple",
  bgPattern: "dots",
  fontSize: "normal",
  soundEnabled: true,
  musicEnabled: true,
  effectsEnabled: true,
  vibrationEnabled: true,
  hintsEnabled: true,
  chatEnabled: true,
  stickersEnabled: true,
  // Off by default and explicit, per rachoi.app's own privacy toggle convention.
  analyticsEnabled: false,
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

export const useSettingsStore = create<SettingsState>((set, get) => {
  function update<K extends keyof SettingsData>(key: K, value: SettingsData[K]) {
    set({ [key]: value } as Pick<SettingsState, K>);
    persist({ ...get(), [key]: value });
  }

  return {
    ...loadInitial(),
    setColorScheme: (v) => update("colorScheme", v),
    setAccent: (v) => update("accent", v),
    setBgPattern: (v) => update("bgPattern", v),
    setFontSize: (v) => update("fontSize", v),
    setSoundEnabled: (v) => update("soundEnabled", v),
    setMusicEnabled: (v) => update("musicEnabled", v),
    setEffectsEnabled: (v) => update("effectsEnabled", v),
    setVibrationEnabled: (v) => update("vibrationEnabled", v),
    setHintsEnabled: (v) => update("hintsEnabled", v),
    setChatEnabled: (v) => update("chatEnabled", v),
    setStickersEnabled: (v) => update("stickersEnabled", v),
    setAnalyticsEnabled: (v) => update("analyticsEnabled", v),
    reset: () => {
      set(DEFAULTS);
      persist(DEFAULTS);
    },
  };
});
