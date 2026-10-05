import { RippleField } from "./field.ts";
import type { MonogramPlacement } from "./field.ts";
import type { PoolLayout } from "./geometry.ts";

export type PoolInput = { x: number; y: number; fromX?: number; fromY?: number; drop?: boolean };
export type PoolConfig = { generation: number; columns: number; rows: number; placement: MonogramPlacement; layout?: PoolLayout };
export type PoolDraw = { time: number; cursor: { x: number; y: number; visible: boolean }; energy: number };
export type PoolRequest =
  | { type: "surface"; canvas: OffscreenCanvas }
  | { type: "configure"; config: PoolConfig; draw?: PoolDraw }
  | { type: "tick"; generation: number; steps: number; input: PoolInput | null; buffer: ArrayBuffer; reset?: boolean; draw?: PoolDraw };
export type PoolJob = Exclude<PoolRequest, { type: "surface" }>;
export type PoolFrame = { generation: number; columns: number; rows: number; active: boolean; time: number; buffer: ArrayBuffer; rendered?: boolean; workMs?: number };

export class WaveSimulation {
  water: RippleField | null = null;
  generation = 0;
  configure(config: PoolConfig) {
    const old = this.water;
    const water = new RippleField(config.columns, config.rows, config.placement, 0.25);
    if (old) {
      for (let y = 0; y < water.rows; y++) for (let x = 0; x < water.columns; x++) {
        const i = y * water.columns + x;
        const j = Math.min(old.rows - 1, Math.floor(y / water.rows * old.rows)) * old.columns + Math.min(old.columns - 1, Math.floor(x / water.columns * old.columns));
        if (!water.mask[i] && !old.mask[j]) { water.height[i] = old.height[j]; water.previous[i] = old.previous[j]; }
        if (water.coverage[i] && old.coverage[j]) water.reveal[i] = old.reveal[j];
      }
      water.time = old.time; water.active = old.active;
    }
    this.water = water; this.generation = config.generation;
    return this.frame(new ArrayBuffer(water.height.length * 4));
  }
  tick(steps: number, input: PoolInput | null, buffer: ArrayBuffer) {
    const water = this.water!;
    if (input) {
      const x = Math.max(0, Math.min(1, input.x)), y = Math.max(0, Math.min(1, input.y));
      if (input.drop) water.drop(x, y, 0.85);
      else if (input.fromX !== undefined && input.fromY !== undefined) {
        const dx = x - input.fromX, dy = y - input.fromY;
        const count = Math.min(16, Math.ceil(Math.hypot(dx * water.columns, dy * water.rows)));
        for (let i = 1; i <= count; i++) water.wake(input.fromX + dx * i / count, input.fromY + dy * i / count, dx / count, dy / count);
      }
    }
    // Never catch up an unbounded amount of work after a slow frame or tab wake.
    for (let i = 0; i < Math.max(0, Math.min(12, steps)); i++) water.step();
    return this.frame(buffer);
  }
  private frame(buffer: ArrayBuffer): PoolFrame {
    const water = this.water!;
    if (buffer.byteLength !== water.height.length * 4) buffer = new ArrayBuffer(water.height.length * 4);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < water.height.length; i++) {
      const value = Math.round(Math.max(-1, Math.min(1, water.height[i])) * 32767 + 32768);
      bytes[i * 4] = value >>> 8; bytes[i * 4 + 1] = value & 255;
      bytes[i * 4 + 2] = Math.round(Math.min(1, water.reveal[i]) * 255); bytes[i * 4 + 3] = 255;
    }
    return { generation: this.generation, columns: water.columns, rows: water.rows, active: water.active, time: water.time, buffer };
  }
}
