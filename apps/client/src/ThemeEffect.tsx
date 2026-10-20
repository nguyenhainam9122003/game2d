import { useEffect } from "react";
import { ACCENTS, useSettingsStore } from "./settingsStore";

/** Applies the persisted appearance settings to the document. Renders nothing. */
export function ThemeEffect() {
  const { colorScheme, accent, bgPattern, fontSize, effectsEnabled } = useSettingsStore();

  useEffect(() => {
    const root = document.documentElement;
    if (colorScheme === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", colorScheme);
  }, [colorScheme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--color-primary", ACCENTS[accent]);
  }, [accent]);

  useEffect(() => {
    document.body.setAttribute("data-bg-pattern", bgPattern);
  }, [bgPattern]);

  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", fontSize);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.setAttribute("data-effects", effectsEnabled ? "on" : "off");
  }, [effectsEnabled]);

  return null;
}
