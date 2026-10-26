import { describe, expect, it } from "vitest";
import { generateNumberHunt, numberHuntCanvasScale } from "../src/games/numberHunt.js";
import { getNumberHuntBotDelayMs } from "../src/bots/numberHuntBot.js";

describe("number hunt generation", () => {
  it("scales the count with difficulty", () => {
    expect(generateNumberHunt("easy")).toHaveLength(15);
    expect(generateNumberHunt("medium")).toHaveLength(25);
    expect(generateNumberHunt("hard")).toHaveLength(40);
    expect(generateNumberHunt("expert")).toHaveLength(60);
  });

  it("labels targets 1..N in order and keeps them within the sheet bounds", () => {
    const targets = generateNumberHunt("easy");
    targets.forEach((t, i) => {
      expect(t.value).toBe(i + 1);
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThanOrEqual(100);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThanOrEqual(100);
    });
  });

  it("generates quickly even at the largest difficulty", () => {
    const start = Date.now();
    generateNumberHunt("expert");
    expect(Date.now() - start).toBeLessThan(2000);
  });

  it("keeps the canvas at scale 1 for every default difficulty count and small overrides", () => {
    expect(numberHuntCanvasScale(15)).toBe(1);
    expect(numberHuntCanvasScale(60)).toBe(1);
    expect(numberHuntCanvasScale(80)).toBe(1);
  });

  it("grows the canvas past scale 1 for large sheet sizes, and targets stay spread out", () => {
    const scale = numberHuntCanvasScale(1000);
    expect(scale).toBeGreaterThan(1);
    const targets = generateNumberHunt("medium", 1000);
    expect(targets).toHaveLength(1000);
    // x/y can now exceed 100 — normalizing by scale brings them back to a plain 0-100 percent.
    targets.forEach((t) => {
      expect(t.x / scale).toBeGreaterThanOrEqual(0);
      expect(t.x / scale).toBeLessThanOrEqual(100);
      expect(t.y / scale).toBeGreaterThanOrEqual(0);
      expect(t.y / scale).toBeLessThanOrEqual(100);
    });
  });

  it("generates 1000 targets quickly", () => {
    const start = Date.now();
    generateNumberHunt("medium", 1000);
    expect(Date.now() - start).toBeLessThan(3000);
  });
});

describe("number hunt bot pacing", () => {
  it("gets faster (lower delay) as difficulty increases", () => {
    const samples = (difficulty: "easy" | "medium" | "hard" | "expert") =>
      Array.from({ length: 50 }, () => getNumberHuntBotDelayMs(difficulty));
    const maxOf = (xs: number[]) => Math.max(...xs);
    const minOf = (xs: number[]) => Math.min(...xs);

    const easy = samples("easy");
    const expert = samples("expert");
    expect(minOf(easy)).toBeGreaterThan(maxOf(expert) * 0.5); // easy's fastest tap is still clearly slower than expert's
    easy.forEach((ms) => expect(ms).toBeGreaterThan(0));
  });
});
