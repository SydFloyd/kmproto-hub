// A fixed-step shallow-water wave field. The submerged letters are reflecting
// boundaries, not an image composited over the water.
export const STEP = 1 / 120;

const distanceToSegment = (x: number, y: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
};

export type Monogram = { columns: number; rows: number; mask: Uint8Array; coverage: Float32Array };
export type MonogramPlacement = { x: number; y: number; size: number };

export function createMonogram(columns: number, rows: number, size = Math.min(columns * 0.56, rows * 1.02), center = { x: columns / 2, y: rows / 2 }): Monogram {
  const mask = new Uint8Array(columns * rows);
  const coverage = new Float32Array(columns * rows);
  const strokeRadius = 0.038;
  const strokes = [
    [-0.50, 0.02, -0.23, -0.28], [-0.42, -0.06, -0.20, 0.28],
    [0.02, 0.28, 0.02, -0.28], [0.02, -0.28, 0.24, 0.03],
    [0.24, 0.03, 0.46, -0.28], [0.46, -0.28, 0.46, 0.28],
  ];
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < columns - 1; x++) {
    const nx = (x - center.x) / size, ny = (y - center.y) / size;
    // Signed distance preserves the square K stem and gives partial edge
    // nodes proportional brightness instead of rounding each stroke's width.
    const kx = Math.abs(nx + 0.51) - strokeRadius;
    const ky = Math.abs(ny) - (0.28 + strokeRadius);
    let distance = Math.hypot(Math.max(kx, 0), Math.max(ky, 0)) + Math.min(Math.max(kx, ky), 0);
    for (const [ax, ay, bx, by] of strokes) {
      distance = Math.min(distance, distanceToSegment(nx, ny, ax, ay, bx, by) - strokeRadius);
    }
    const i = y * columns + x;
    if (distance < 0) mask[i] = 1;
    coverage[i] = Math.max(0, Math.min(1, 0.5 - distance * size));
  }
  return { columns, rows, mask, coverage };
}

export class RippleField {
  readonly columns: number;
  readonly rows: number;
  readonly mask: Uint8Array;
  readonly coverage: Float32Array;
  readonly reveal: Float32Array;
  height: Float32Array;
  previous: Float32Array;
  private next: Float32Array;
  private readonly contacts: number[][];
  time = 0;
  active = false;

  constructor(columns: number, rows: number, placement?: MonogramPlacement, solidCoverage = 0.5) {
    this.columns = columns;
    this.rows = rows;
    const count = columns * rows;
    this.height = new Float32Array(count);
    this.previous = new Float32Array(count);
    this.next = new Float32Array(count);
    const monogram = createMonogram(columns, rows, placement?.size, placement);
    this.mask = monogram.mask;
    this.coverage = monogram.coverage;
    if (solidCoverage < 0.5) for (let i = 0; i < count; i++) this.mask[i] = Number(this.coverage[i] >= solidCoverage);
    this.reveal = new Float32Array(count);
    this.contacts = Array.from({ length: count }, () => []);
    // Letter nodes sample adjacent water, including partial edges and the inner
    // part of thick strokes, so passing wave fronts reveal depth to the letters.
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < columns - 1; x++) {
        const i = y * columns + x;
        if (!this.coverage[i]) continue;
        for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) {
          const sx = x + ox, sy = y + oy;
          if (sx < 1 || sy < 1 || sx >= columns - 1 || sy >= rows - 1 || ox * ox + oy * oy > 10) continue;
          const j = sy * columns + sx;
          if (!this.mask[j]) this.contacts[i].push(j);
        }
      }
    }
  }

  clear() {
    this.height.fill(0); this.previous.fill(0); this.next.fill(0); this.reveal.fill(0);
    this.active = false;
  }

  drop(x: number, y: number, strength = 1) {
    this.inject(x * (this.columns - 1), y * (this.rows - 1), 2.4, strength * 0.33, true);
  }

  wake(x: number, y: number, dx: number, dy: number) {
    const length = Math.hypot(dx * this.columns, dy * this.rows);
    if (length < 0.06) return;
    const ux = dx * this.columns / length, uy = dy * this.rows / length;
    const cx = x * (this.columns - 1), cy = y * (this.rows - 1);
    const strength = Math.min(0.055, length * 0.014);
    this.inject(cx + ux, cy + uy, 1.35, strength, false);
    this.inject(cx - ux, cy - uy, 1.35, -strength, false);
  }

  private inject(cx: number, cy: number, sigma: number, strength: number, pebble: boolean) {
    const radius = Math.ceil(sigma * 3.5);
    for (let y = Math.max(1, Math.floor(cy) - radius); y < Math.min(this.rows - 1, cy + radius); y++) {
      for (let x = Math.max(1, Math.floor(cx) - radius); x < Math.min(this.columns - 1, cx + radius); x++) {
        const i = y * this.columns + x;
        if (this.mask[i]) continue;
        const r2 = ((x - cx) ** 2 + (y - cy) ** 2) / (sigma * sigma);
        const impulse = strength * Math.exp(-r2 / 2) * (pebble ? 1 - r2 / 2 : 1);
        this.previous[i] = Math.max(-2, Math.min(2, this.previous[i] - impulse));
        this.active = true;
      }
    }
  }

  step() {
    const { columns: w, rows: h, height: current, previous, next, mask, coverage, reveal } = this;
    const coefficient = 0.16; // c*dt/dx = 0.4, safely below the 2D CFL limit.
    const damping = 0.006;
    this.time += STEP;
    // Idle water needs only the slow current's clock, not a full PDE solve.
    if (!this.active) return;
    let motion = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (coverage[i]) {
        let energy = 0;
        for (const j of this.contacts[i]) {
          energy = Math.max(energy, Math.abs(current[j]) + 3 * Math.abs(current[j] - previous[j]));
        }
        // Reflections gather gently, then linger as the wave passes the letters.
        const target = Math.min(1, Math.max(0, energy - 0.045) * 1.7);
        reveal[i] = target > reveal[i]
          ? reveal[i] + (target - reveal[i]) * 0.14
          : reveal[i] * 0.989;
        motion = Math.max(motion, reveal[i]);
      }
      if (mask[i]) { next[i] = 0; continue; }
      const center = current[i];
      const l = x > 0 && !mask[i - 1] ? current[i - 1] : center;
      const r = x < w - 1 && !mask[i + 1] ? current[i + 1] : center;
      const t = y > 0 && !mask[i - w] ? current[i - w] : center;
      const b = y < h - 1 && !mask[i + w] ? current[i + w] : center;
      // A narrow absorbing rim avoids an endless rectangular standing wave.
      const edge = Math.min(x, y, w - x - 1, h - y - 1);
      const rim = edge < 5 ? 1 - (5 - edge) * 0.012 : 1;
      next[i] = Math.max(-2, Math.min(2, (2 * center - (1 - damping) * previous[i] + coefficient * (l + r + t + b - 4 * center)) / (1 + damping))) * rim;
      motion = Math.max(motion, Math.abs(next[i]), Math.abs(next[i] - center));
    }
    this.previous = current; this.height = next; this.next = previous;
    if (motion < 0.00002) this.clear();
  }

  ambient(x: number, y: number) {
    // Start as an undisturbed pool. A very slow current emerges without
    // injecting a wave or lighting any of the submerged lettering.
    const calm = 1 - Math.exp(-this.time / 8);
    const bend = Math.sin(x * 0.025 - y * 0.032 + this.time * 0.09) * 2.2;
    const radius = Math.hypot(x - this.columns * 0.67, (y - this.rows * 0.43) * 1.12);
    return calm * (0.006 * Math.sin(x * 0.082 + y * 0.12 + bend - this.time * 0.31)
      + 0.003 * Math.sin(radius * 0.15 - this.time * 0.24 + bend * 0.45));
  }
}
