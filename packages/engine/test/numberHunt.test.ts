import { describe, expect, it } from "vitest";
import { generateNumberHunt } from "../src/games/numberHunt.js";

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
});
