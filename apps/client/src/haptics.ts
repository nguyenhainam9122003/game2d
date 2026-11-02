import { useSettingsStore } from "./settingsStore";

/** `vibrationEnabled` previously only saved a preference — this is its real behavior. */
export function vibrate(pattern: number | number[]) {
  if (!useSettingsStore.getState().vibrationEnabled) return;
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw when called outside a user gesture or when blocked — safe to ignore.
  }
}
