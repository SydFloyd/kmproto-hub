export type Point = { x: number; y: number };
export type RailNode = Point & { nx: number; ny: number; arc: number };
export const WIDTH = 960, HEIGHT = 700, NODE_COUNT = 180, MARBLE_RADIUS = 8;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const smooth = (n: number) => { n = clamp(n, 0, 1); return n * n * (3 - 2 * n); };
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const controls: Point[] = [
  { x: 215, y: 174 }, { x: 378, y: 188 }, { x: 579, y: 217 }, { x: 742, y: 261 },
  { x: 802, y: 326 }, { x: 747, y: 414 }, { x: 598, y: 456 }, { x: 362, y: 484 },
  { x: 205, y: 505 }, { x: 139, y: 469 }, { x: 132, y: 329 }, { x: 147, y: 211 },
];

function makeRail(): RailNode[] {
  const dense: Point[] = [];
  for (let i = 0; i < controls.length; i++) for (let j = 0; j < 32; j++) {
    const p0 = controls[(i + controls.length - 1) % controls.length], p1 = controls[i],
      p2 = controls[(i + 1) % controls.length], p3 = controls[(i + 2) % controls.length], t = j / 32;
    const coordinate = (key: "x" | "y") => 0.5 * (2 * p1[key] + (-p0[key] + p2[key]) * t
      + (2 * p0[key] - 5 * p1[key] + 4 * p2[key] - p3[key]) * t * t
      + (-p0[key] + 3 * p1[key] - 3 * p2[key] + p3[key]) * t * t * t);
    dense.push({ x: coordinate("x"), y: coordinate("y") });
  }
  const arcs = [0];
  for (let i = 1; i <= dense.length; i++) arcs.push(arcs[i - 1] + distance(dense[i - 1], dense[i % dense.length]));
  const length = arcs[arcs.length - 1], points: Point[] = [];
  let segment = 0;
  for (let i = 0; i < NODE_COUNT; i++) {
    const arc = i / NODE_COUNT * length;
    while (arcs[segment + 1] < arc) segment++;
    const a = dense[segment], b = dense[(segment + 1) % dense.length], mix = (arc - arcs[segment]) / (arcs[segment + 1] - arcs[segment]);
    points.push({ x: a.x + (b.x - a.x) * mix, y: a.y + (b.y - a.y) * mix });
  }
  return points.map((p, i) => {
    const a = points[(i + NODE_COUNT - 1) % NODE_COUNT], b = points[(i + 1) % NODE_COUNT], size = distance(a, b);
    return { ...p, nx: (b.y - a.y) / size, ny: -(b.x - a.x) / size, arc: i / NODE_COUNT * length };
  });
}

export const BASE_RAIL = makeRail();
export const BASE_LENGTH = BASE_RAIL[NODE_COUNT - 1].arc + distance(BASE_RAIL[NODE_COUNT - 1], BASE_RAIL[0]);

export class MarbleMachine {
  readonly base = BASE_RAIL;
  readonly points = BASE_RAIL.map(p => ({ x: p.x, y: p.y }));
  readonly offsets = new Float64Array(NODE_COUNT);
  private readonly velocity = new Float64Array(NODE_COUNT);
  private readonly targets = new Float64Array(NODE_COUNT);
  private readonly arcs = new Float64Array(NODE_COUNT + 1);
  pointer: Point | null = null;
  clearance = 58;
  phase = 0.075;
  time = 0;
  laps = 0;
  rotation = 0;
  waiting = false;
  settling = false;
  private dwell = 0;
  bridge = 0;
  platform = 0;
  gate = 0;

  constructor() { this.updateRail(); }

  setPointer(point: Point | null, immediate = false) {
    this.pointer = point ? { ...point } : null;
    this.targets.fill(0);
    if (point) {
      let closest = 0, best = Infinity, mix = 0;
      for (let i = 0; i < NODE_COUNT; i++) {
        const a = this.base[i], b = this.base[(i + 1) % NODE_COUNT], dx = b.x - a.x, dy = b.y - a.y;
        const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
        const gap = Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t);
        if (gap < best) { best = gap; closest = i; mix = t; }
      }
      const a = this.base[closest], b = this.base[(closest + 1) % NODE_COUNT],
        cx = a.x + (b.x - a.x) * mix, cy = a.y + (b.y - a.y) * mix,
        normalSize = Math.hypot(a.nx + (b.nx - a.nx) * mix, a.ny + (b.ny - a.ny) * mix),
        nx = (a.nx + (b.nx - a.nx) * mix) / normalSize, ny = (a.ny + (b.ny - a.ny) * mix) / normalSize,
        side = (point.x - cx) * nx + (point.y - cy) * ny,
        activation = smooth((this.clearance + 65 - best) / 65),
        amplitude = clamp(this.clearance + side + 7, 0, 155) * activation,
        center = a.arc + distance(a, b) * mix, span = 225;
      for (let i = 0; i < NODE_COUNT; i++) {
        const delta = Math.abs(this.base[i].arc - center), arc = Math.min(delta, BASE_LENGTH - delta);
        this.targets[i] = arc < span ? amplitude * Math.cos(arc / span * Math.PI / 2) ** 2 : 0;
      }
    }
    if (immediate) {
      this.offsets.set(this.targets); this.velocity.fill(0); this.settling = false; this.updateRail();
    } else this.settling = true;
  }

  advance(seconds: number, moving = true) {
    const dt = clamp(seconds, 0, 0.1), steps = Math.max(1, Math.ceil(dt * 120)), step = dt / steps;
    if (this.settling) {
      let remaining = 0;
      for (let j = 0; j < steps; j++) for (let i = 0; i < NODE_COUNT; i++) {
        // Critically damped joints unfold without overshoot or random motion.
        this.velocity[i] += ((this.targets[i] - this.offsets[i]) * 144 - this.velocity[i] * 24) * step;
        this.offsets[i] += this.velocity[i] * step;
      }
      for (let i = 0; i < NODE_COUNT; i++) remaining = Math.max(remaining, Math.abs(this.targets[i] - this.offsets[i]), Math.abs(this.velocity[i]) * 0.08);
      if (remaining < 0.025) { this.offsets.set(this.targets); this.velocity.fill(0); this.settling = false; }
      this.updateRail();
    }
    if (!moving) return;
    this.time += dt;
    if (this.dwell > 0) { this.dwell = Math.max(0, this.dwell - dt); return; }
    const marble = this.marble(), lift = marble.x < 205 && marble.ty < -0.3;
    const speed = lift ? 67 : 91 + Math.max(0, marble.ty) * 64;
    const index = this.phase * NODE_COUNT, i = Math.floor(index),
      arc = this.arcs[i] + (this.arcs[i + 1] - this.arcs[i]) * (index - i);
    let courtesy = 1;
    if (this.pointer) {
      let gap = Infinity;
      for (const ahead of [0, 18, 36, 58]) gap = Math.min(gap, distance(this.atArc(arc + ahead), this.pointer));
      courtesy = smooth((gap - this.clearance + 4) / 27);
    }
    this.waiting = courtesy < 0.08;
    const travel = speed * dt * courtesy, next = arc + travel, total = this.arcs[NODE_COUNT];
    if (travel < 1e-9) return;
    if (next >= total) { this.laps++; this.phase = 0; this.dwell = 0.38; }
    else this.phase = this.phaseAtArc(next);
    this.rotation += travel / MARBLE_RADIUS;
  }

  private updateRail() {
    this.bridge = 0; this.platform = 0; this.gate = 0;
    for (let i = 0; i < NODE_COUNT; i++) {
      const base = this.base[i], offset = this.offsets[i];
      this.points[i].x = base.x + base.nx * offset; this.points[i].y = base.y + base.ny * offset;
      const amount = clamp(offset / 105, 0, 1);
      if (base.y < 290 && base.x > 205) this.bridge = Math.max(this.bridge, amount);
      if (base.y > 440 && base.x > 215) this.platform = Math.max(this.platform, amount);
      if (base.x > 715 || base.x < 190) this.gate = Math.max(this.gate, amount);
    }
    this.arcs[0] = 0;
    for (let i = 0; i < NODE_COUNT; i++) this.arcs[i + 1] = this.arcs[i] + distance(this.points[i], this.points[(i + 1) % NODE_COUNT]);
  }
  private phaseAtArc(value: number) {
    const total = this.arcs[NODE_COUNT], arc = ((value % total) + total) % total;
    let low = 0, high = NODE_COUNT;
    while (high - low > 1) { const mid = (low + high) >>> 1; if (this.arcs[mid] > arc) high = mid; else low = mid; }
    return (low + (arc - this.arcs[low]) / (this.arcs[low + 1] - this.arcs[low])) / NODE_COUNT;
  }
  private atArc(arc: number) { return this.at(this.phaseAtArc(arc)); }
  at(phase: number) {
    const index = (((phase % 1) + 1) % 1) * NODE_COUNT, i = Math.floor(index), t = index - i,
      a = this.points[i], b = this.points[(i + 1) % NODE_COUNT], length = distance(a, b);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, tx: (b.x - a.x) / length, ty: (b.y - a.y) / length };
  }
  marble() { return this.at(this.phase); }
}
