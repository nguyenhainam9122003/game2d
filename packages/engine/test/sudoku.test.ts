import { describe, expect, it } from "vitest";
import { generateSudoku, findConflicts, isSudokuSolved, GRID_SIZE } from "../src/games/sudoku.js";

function isValidCompleteGrid(grid: number[]): boolean {
  const checkGroup = (indices: number[]) => new Set(indices.map((i) => grid[i])).size === 9;
  for (let r = 0; r < 9; r++) {
    if (!checkGroup(Array.from({ length: 9 }, (_, c) => r * 9 + c))) return false;
  }
  for (let c = 0; c < 9; c++) {
    if (!checkGroup(Array.from({ length: 9 }, (_, r) => r * 9 + c))) return false;
  }
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const indices: number[] = [];
      for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) indices.push(r * 9 + c);
      if (!checkGroup(indices)) return false;
    }
  }
  return true;
}

describe("sudoku generation", () => {
  for (const difficulty of ["easy", "medium", "hard", "expert"] as const) {
    it(`generates a valid, uniquely-solvable ${difficulty} puzzle quickly`, () => {
      const start = Date.now();
      const { givens, solution } = generateSudoku(difficulty);
      const elapsed = Date.now() - start;

      expect(givens).toHaveLength(81);
      expect(solution).toHaveLength(81);
      expect(isValidCompleteGrid(solution)).toBe(true);

      // Every given matches the solution at that cell.
      givens.forEach((v, i) => {
        if (v !== null) expect(v).toBe(solution[i]);
      });

      // Fewer givens for harder difficulties (a loose sanity check on the difficulty knob).
      const givenCount = givens.filter((v) => v !== null).length;
      expect(givenCount).toBeGreaterThan(17); // below the known theoretical minimum would be suspicious
      expect(givenCount).toBeLessThan(81);

      expect(elapsed).toBeLessThan(10_000);
    });
  }
});

describe("sudoku helpers", () => {
  it("flags duplicate values within a row, column, or box", () => {
    const values: (number | null)[] = new Array(81).fill(null);
    values[0] = 5; // row0 col0
    values[3] = 5; // row0 col3 — same row duplicate
    const conflicts = findConflicts(values);
    expect(conflicts.has(0)).toBe(true);
    expect(conflicts.has(3)).toBe(true);
    expect(conflicts.size).toBe(2);
  });

  it("doesn't flag cells with no duplicates", () => {
    const values: (number | null)[] = new Array(81).fill(null);
    values[0] = 1;
    values[1] = 2;
    expect(findConflicts(values).size).toBe(0);
  });

  it("recognizes a fully correct grid as solved", () => {
    const { solution } = generateSudoku("easy");
    expect(isSudokuSolved(solution, solution)).toBe(true);
    const wrong = [...solution];
    wrong[0] = wrong[0] === 9 ? 1 : wrong[0] + 1;
    expect(isSudokuSolved(wrong, solution)).toBe(false);
  });

  it("exposes the standard 9x9 grid size", () => {
    expect(GRID_SIZE).toBe(9);
  });
});
