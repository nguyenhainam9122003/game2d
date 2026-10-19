import type { Difficulty } from "../bots/common.js";

/**
 * Sudoku is a single-player puzzle, not a two-player game, so unlike every
 * other game in this package it does NOT implement the shared `Game<S, M>`
 * interface (there's no opponent, no move-by-move log to replay, and no
 * online sync yet — see PLAN.md for that gap). This module is just the
 * puzzle generator and a couple of pure validation helpers; the client owns
 * the actual solving state (entered values, notes, mistakes, hints).
 */
export const GRID_SIZE = 9;
const BOX_SIZE = 3;

export type SudokuGrid = (number | null)[]; // length 81, row-major, null = blank

export interface SudokuPuzzle {
  givens: SudokuGrid;
  solution: number[]; // length 81, the unique solution, each cell 1-9
}

function shuffledRange(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isValidPlacement(grid: number[], index: number, value: number): boolean {
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  for (let i = 0; i < GRID_SIZE; i++) {
    if (grid[row * GRID_SIZE + i] === value) return false;
    if (grid[i * GRID_SIZE + col] === value) return false;
  }
  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
      if (grid[r * GRID_SIZE + c] === value) return false;
    }
  }
  return true;
}

function fillGrid(grid: number[]): boolean {
  const index = grid.indexOf(0);
  if (index === -1) return true;
  for (const value of shuffledRange(9).map((v) => v + 1)) {
    if (isValidPlacement(grid, index, value)) {
      grid[index] = value;
      if (fillGrid(grid)) return true;
      grid[index] = 0;
    }
  }
  return false;
}

/** Counts solutions up to 2 (stopping early) — all that's needed to confirm uniqueness. */
function hasUniqueSolution(grid: number[]): boolean {
  let solutions = 0;
  function solve(): boolean {
    const index = grid.indexOf(0);
    if (index === -1) {
      solutions++;
      return solutions >= 2;
    }
    for (let value = 1; value <= 9; value++) {
      if (isValidPlacement(grid, index, value)) {
        grid[index] = value;
        const stop = solve();
        grid[index] = 0;
        if (stop) return true;
      }
    }
    return false;
  }
  solve();
  return solutions === 1;
}

/**
 * Target number of givens per difficulty — a simplified stand-in for a real
 * logical-technique difficulty rating (which would need a constraint solver
 * that mimics human solving strategies). Fewer givens generally means a
 * harder puzzle, which is good enough for a casual game.
 */
const TARGET_GIVENS: Record<Difficulty, number> = { easy: 42, medium: 34, hard: 28, expert: 24 };

export function generateSudoku(difficulty: Difficulty = "medium"): SudokuPuzzle {
  const solved = new Array(81).fill(0);
  fillGrid(solved);
  const solution = [...solved];
  const puzzle = [...solved];
  const target = TARGET_GIVENS[difficulty];
  let givensCount = 81;

  for (const pos of shuffledRange(81)) {
    if (givensCount <= target) break;
    const backup = puzzle[pos];
    puzzle[pos] = 0;
    if (hasUniqueSolution([...puzzle])) {
      givensCount--;
    } else {
      puzzle[pos] = backup;
    }
  }

  return { givens: puzzle.map((v) => (v === 0 ? null : v)), solution };
}

/** Cell indices holding a value that duplicates another in the same row, column, or box. */
export function findConflicts(values: SudokuGrid): Set<number> {
  const conflicts = new Set<number>();

  function mark(indices: number[]) {
    const seen = new Map<number, number[]>();
    for (const i of indices) {
      const v = values[i];
      if (v === null) continue;
      const group = seen.get(v);
      if (group) group.push(i);
      else seen.set(v, [i]);
    }
    for (const group of seen.values()) {
      if (group.length > 1) group.forEach((i) => conflicts.add(i));
    }
  }

  for (let r = 0; r < GRID_SIZE; r++) {
    mark(Array.from({ length: GRID_SIZE }, (_, c) => r * GRID_SIZE + c));
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    mark(Array.from({ length: GRID_SIZE }, (_, r) => r * GRID_SIZE + c));
  }
  for (let boxRow = 0; boxRow < GRID_SIZE; boxRow += BOX_SIZE) {
    for (let boxCol = 0; boxCol < GRID_SIZE; boxCol += BOX_SIZE) {
      const indices: number[] = [];
      for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
        for (let c = boxCol; c < boxCol + BOX_SIZE; c++) indices.push(r * GRID_SIZE + c);
      }
      mark(indices);
    }
  }

  return conflicts;
}

export function isSudokuSolved(values: SudokuGrid, solution: number[]): boolean {
  return values.every((v, i) => v === solution[i]);
}
