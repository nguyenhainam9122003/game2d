import { useSettingsStore } from "./settingsStore";

/**
 * Synthesizes every sound effect and the ambient music bed with the Web Audio API — the app
 * has no sound/music assets, and this avoids needing to source, license, and ship any.
 * `soundEnabled`/`musicEnabled` (see settingsStore.ts) previously only saved a preference with
 * no real behavior behind them; this file is that behavior.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

/** Browsers suspend a fresh AudioContext until a user gesture — call from any click/pointerdown handler. */
export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

function tone(
  c: AudioContext,
  freq: number,
  start: number,
  duration: number,
  opts: { type?: OscillatorType; peak?: number } = {},
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, start);
  const peak = opts.peak ?? 0.12;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export type SoundKind = "click" | "win" | "draw" | "notify" | "timeout" | "error";

const RECIPES: Record<SoundKind, (c: AudioContext, t0: number) => void> = {
  click: (c, t0) => tone(c, 740, t0, 0.05, { peak: 0.05, type: "triangle" }),
  notify: (c, t0) => {
    tone(c, 660, t0, 0.08, { peak: 0.07 });
    tone(c, 880, t0 + 0.09, 0.1, { peak: 0.07 });
  },
  draw: (c, t0) => {
    tone(c, 440, t0, 0.14, { peak: 0.08, type: "triangle" });
    tone(c, 440, t0 + 0.16, 0.14, { peak: 0.08, type: "triangle" });
  },
  win: (c, t0) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, f, t0 + i * 0.09, 0.22, { peak: 0.09, type: "triangle" }));
  },
  timeout: (c, t0) => {
    tone(c, 880, t0, 0.12, { peak: 0.1, type: "square" });
    tone(c, 880, t0 + 0.16, 0.12, { peak: 0.1, type: "square" });
  },
  error: (c, t0) => tone(c, 180, t0, 0.15, { peak: 0.09, type: "sawtooth" }),
};

export function playSound(kind: SoundKind) {
  if (!useSettingsStore.getState().soundEnabled) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  RECIPES[kind](c, c.currentTime);
}

// --- Ambient background music (a slow, quiet drifting triad) ---

interface MusicHandle {
  stop(): void;
}

let music: MusicHandle | null = null;

const MUSIC_CHORD = [220, 277.18, 329.63]; // A minor-ish triad, kept deliberately soft/ambient

export function startMusic() {
  if (music) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});

  const master = c.createGain();
  master.gain.setValueAtTime(0, c.currentTime);
  master.gain.linearRampToValueAtTime(0.025, c.currentTime + 1.5);
  master.connect(c.destination);

  const voices = MUSIC_CHORD.map((freq, i) => {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;

    // A slow, slightly-detuned LFO per voice keeps the pad from sounding like a flat test tone.
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.04 + i * 0.015;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 3;
    lfo.connect(lfoGain).connect(osc.frequency);

    const voiceGain = c.createGain();
    voiceGain.gain.value = 0.5;
    osc.connect(voiceGain).connect(master);
    osc.start();
    lfo.start();
    return { osc, lfo };
  });

  music = {
    stop() {
      const now = c.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.4);
      setTimeout(() => {
        for (const { osc, lfo } of voices) {
          osc.stop();
          lfo.stop();
        }
      }, 450);
    },
  };
}

export function stopMusic() {
  music?.stop();
  music = null;
}
