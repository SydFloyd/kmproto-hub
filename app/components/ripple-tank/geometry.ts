import { createMonogram } from "./field.ts";
import { WAVE_BUDGETS } from "./budget.ts";
import type { WaveTier } from "./budget.ts";

export type Rect = { x: number; y: number; width: number; height: number };
export type PoolLayout = {
  width: number; height: number; columns: number; rows: number;
  placement: { x: number; y: number; size: number };
  points: Float32Array; copy: Rect | null; ratio: number;
};

// Each vertex: position, physics UV, glyph size, letter coverage (0 = water).
export function poolLayout(width: number, height: number, zone: Rect, copy: Rect | null, tier: WaveTier, density: number): PoolLayout {
  const budget = WAVE_BUDGETS[tier], physicsCell = Math.sqrt(width * height / budget.physics);
  const columns = Math.max(3, Math.floor(width / physicsCell)), rows = Math.max(3, Math.floor(height / physicsCell));
  const centerX = zone.x + zone.width / 2, centerY = zone.y + zone.height / 2;
  const size = Math.min(zone.width * 0.56, zone.height * 1.02);
  const placement = { x: centerX / width * (columns - 1), y: centerY / height * (rows - 1), size: size / physicsCell };
  const vertices: number[] = [];
  const cell = Math.max(10, Math.sqrt(width * height / budget.water));
  const nx = Math.floor(width / cell), ny = Math.floor(height / cell);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const px = (x + 0.5) * cell + (width - nx * cell) / 2, py = (y + 0.5) * cell + (height - ny * cell) / 2;
    vertices.push(px, py, px / width, py / height, Math.min(23, cell * 1.55), 0);
  }
  // Independent fine geometry keeps the square K and even stroke weights
  // when the fluid lattice is deliberately small on a phone.
  let letterCell = Math.max(2.5, size / Math.sqrt(budget.letters / 0.27));
  let letters: ReturnType<typeof createMonogram>;
  for (;;) {
    const units = size / letterCell;
    letters = createMonogram(Math.ceil(units * 1.15), Math.ceil(units * 0.74), units);
    const count = letters.coverage.reduce((sum, value) => sum + Number(value > 0.01), 0);
    if (count <= budget.letters) break;
    letterCell *= Math.max(1.04, Math.sqrt(count / budget.letters));
  }
  for (let y = 0; y < letters.rows; y++) for (let x = 0; x < letters.columns; x++) {
    const coverage = letters.coverage[y * letters.columns + x];
    if (coverage <= 0.01) continue;
    const px = centerX + (x - letters.columns / 2) * letterCell;
    const py = centerY + (y - letters.rows / 2) * letterCell;
    vertices.push(px, py, px / width, py / height, letterCell * 1.7, coverage);
  }
  return { width, height, columns, rows, placement, points: new Float32Array(vertices), copy,
    ratio: Math.min(density, 1.25, Math.sqrt(budget.pixels / (width * height))) };
}

export function copyOpacity(x: number, y: number, copy: Rect | null, width: number) {
  if (!copy) return 1;
  const dx = Math.max(copy.x - x, 0, x - copy.x - copy.width);
  const dy = Math.max(copy.y - y, 0, y - copy.y - copy.height);
  const t = Math.min(1, Math.hypot(dx, dy) / Math.min(100, width * 0.16));
  return 0.1 + 0.9 * t * t * (3 - 2 * t);
}
