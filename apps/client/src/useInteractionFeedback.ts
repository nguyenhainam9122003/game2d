import { useEffect } from "react";
import { playSound, startMusic, stopMusic, unlockAudio } from "./audio";
import { vibrate } from "./haptics";
import { useSettingsStore } from "./settingsStore";

/**
 * App-wide "real" sound/haptics behavior, mounted once near the root. Previously
 * `soundEnabled`/`musicEnabled`/`vibrationEnabled` only saved a preference (see PLAN.md's
 * "chưa có hành vi thật" notes) — this wires them up without touching every one of the ~20
 * game screens individually: every `<button>` press across the whole app (menus AND board
 * cells, since every board renders cells as buttons) gets a soft click + light tap.
 */
export function useInteractionFeedback() {
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      unlockAudio();
      const target = (e.target as HTMLElement | null)?.closest("button, [role='button']") as
        | HTMLButtonElement
        | null;
      if (!target || target.disabled) return;
      playSound("click");
      vibrate(8);
    }
    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, []);

  const musicEnabled = useSettingsStore((s) => s.musicEnabled);
  useEffect(() => {
    if (musicEnabled) startMusic();
    else stopMusic();
  }, [musicEnabled]);
}
