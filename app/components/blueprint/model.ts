export type BlueprintKind = "circuit" | "city" | "machine";
export type Point = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };
export type Layout = Box[];
export type Part = Box & { id: number; seed: number; aperture: Box; gates: Point[]; layout: Layout; variant: number };
export type Route = { points: Point[]; length: number; phase: number };
export type World = { seed: number; kind: BlueprintKind; width: number; height: number; gates: Point[]; parts: Part[]; routes: Route[] };
export type Camera = { x: number; y: number; scale: number };
export type Dive = { mode: "in" | "out" | "surface"; from: World; to: World; part: Part | null; path: number[]; elapsed: number; duration: number };

export const ROOT_SEED = 0x4b4d2026;
const kinds: BlueprintKind[] = ["circuit", "city", "machine"];
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const hash = (value: number) => {
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
};
const random = (seed: number) => () => { seed = hash(seed + 0x9e3779b9); return seed / 0x100000000; };

function makeLayout(seed: number, aspect: number): Layout {
  const next = random(seed);
  return Array.from({ length: 9 }, (_, i) => {
    const w = i === 4 ? 0.235 : 0.18 + next() * 0.028;
    const partAspect = clamp(aspect * (0.93 + next() * 0.14), 0.86, 1.45);
    const h = w * aspect / partAspect;
    return { x: 0.2 + (i % 3) * 0.3 + (next() - 0.5) * 0.018 - w / 2,
      y: 0.2 + Math.floor(i / 3) * 0.3 + (next() - 0.5) * 0.018 - h / 2, w, h };
  });
}

const makeRoute = (points: Point[], phase: number): Route => ({ points, phase,
  length: points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.y - points[i].y), 0) });

export function createWorld(seed = ROOT_SEED, kind: BlueprintKind = "circuit", aspect = 1 / 0.9,
  gates: Point[] = [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }, { x: 0.5, y: 0 }, { x: 0.5, y: 1 }],
  layout = makeLayout(seed, aspect)): World {
  const width = 1000, height = width / aspect;
  const parts = layout.map((box, id): Part => {
    const partSeed = hash(seed ^ Math.imul(id + 1, 0x9e3779b9));
    const next = random(partSeed);
    const bounds = { x: box.x * width, y: box.y * height, w: box.w * width, h: box.h * height };
    const margin = Math.min(bounds.w, bounds.h) * (kind === "machine" ? 0.24 : 0.12);
    const aperture = { x: bounds.x + margin, y: bounds.y + margin, w: bounds.w - margin * 2, h: bounds.h - margin * 2 };
    const partGates = [{ x: 0, y: 0.35 + next() * 0.25 }, { x: 1, y: 0.35 + next() * 0.25 },
      { x: 0.35 + next() * 0.25, y: 0 }, { x: 0.35 + next() * 0.25, y: 1 }];
    return { ...bounds, id, seed: partSeed, aperture, gates: partGates,
      layout: makeLayout(partSeed, aperture.w / aperture.h), variant: Math.floor(next() * 3) };
  });
  const routes: Route[] = [];
  const connect = (a: Part, b: Part) => {
    const horizontal = Math.abs(a.x - b.x) > Math.abs(a.y - b.y);
    const start = horizontal ? { x: a.x + a.w, y: a.y + a.h * a.gates[1].y } : { x: a.x + a.w * a.gates[3].x, y: a.y + a.h };
    const end = horizontal ? { x: b.x, y: b.y + b.h * b.gates[0].y } : { x: b.x + b.w * b.gates[2].x, y: b.y };
    const mid = horizontal ? (start.x + end.x) / 2 : (start.y + end.y) / 2;
    routes.push(makeRoute(horizontal ? [start, { x: mid, y: start.y }, { x: mid, y: end.y }, end]
      : [start, { x: start.x, y: mid }, { x: end.x, y: mid }, end], routes.length * 0.173));
  };
  for (let i = 0; i < 9; i++) { if (i % 3 < 2) connect(parts[i], parts[i + 1]); if (i < 6) connect(parts[i], parts[i + 3]); }
  gates.forEach((gate, i) => {
    const part = parts[[3, 5, 1, 7][i % 4]];
    const entry = { x: gate.x * width, y: gate.y * height };
    const end = i === 0 ? { x: part.x, y: part.y + part.h * part.gates[0].y }
      : i === 1 ? { x: part.x + part.w, y: part.y + part.h * part.gates[1].y }
      : i === 2 ? { x: part.x + part.w * part.gates[2].x, y: part.y }
      : { x: part.x + part.w * part.gates[3].x, y: part.y + part.h };
    routes.push(makeRoute(i < 2 ? [entry, { x: entry.x + (end.x - entry.x) * 0.55, y: entry.y },
      { x: entry.x + (end.x - entry.x) * 0.55, y: end.y }, end]
      : [entry, { x: entry.x, y: entry.y + (end.y - entry.y) * 0.55 },
        { x: end.x, y: entry.y + (end.y - entry.y) * 0.55 }, end], i * 0.23));
  });
  return { seed, kind, width, height, gates: gates.map(p => ({ ...p })), parts, routes };
}

export function childWorld(world: World, part: Part) {
  return createWorld(part.seed, kinds[(kinds.indexOf(world.kind) + 1) % 3],
    part.aperture.w / part.aperture.h, part.gates, part.layout);
}

export function resolveWorld(path: number[], seed = ROOT_SEED) {
  let world = createWorld(seed);
  for (const id of path) { const part = world.parts[id]; if (!part) break; world = childWorld(world, part); }
  return world;
}

export const ease = (t: number) => { t = clamp(t, 0, 1); return t * t * t * (10 + t * (-15 + t * 6)); };
export const fitCamera = (world: World, width: number, height: number): Camera => ({
  x: world.width / 2, y: world.height / 2, scale: Math.min(width / world.width, height / world.height) * 0.88,
});
export const focusCamera = (box: Box, width: number, height: number): Camera => ({
  x: box.x + box.w / 2, y: box.y + box.h / 2, scale: Math.min(width / box.w, height / box.h) * 0.88,
});
export function mixCamera(from: Camera, to: Camera, progress: number): Camera {
  const t = ease(progress);
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t,
    scale: Math.exp(Math.log(from.scale) + (Math.log(to.scale) - Math.log(from.scale)) * t) };
}
export const project = (point: Point, camera: Camera, width: number, height: number): Point => ({
  x: width / 2 + (point.x - camera.x) * camera.scale, y: height / 2 + (point.y - camera.y) * camera.scale,
});
export function pointAlong(route: Route, progress: number): Point {
  let remaining = ((progress % 1 + 1) % 1) * route.length;
  for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1], b = route.points[i], length = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= length && length > 0) return { x: a.x + (b.x - a.x) * remaining / length, y: a.y + (b.y - a.y) * remaining / length };
    remaining -= length;
  }
  return route.points[0];
}

export class BlueprintNavigator {
  world = createWorld();
  path: number[] = [];
  transition: Dive | null = null;
  selected = -1;
  time = 0;

  dive(id: number, immediate = false) {
    const part = this.world.parts[id];
    if (this.transition || !part) return false;
    this.transition = { mode: "in", from: this.world, to: childWorld(this.world, part), part,
      path: [...this.path, id], elapsed: 0, duration: 0.95 };
    if (immediate) this.finish();
    return true;
  }
  back(immediate = false) {
    if (this.transition || !this.path.length) return false;
    const path = this.path.slice(0, -1), parent = resolveWorld(path);
    this.transition = { mode: "out", from: this.world, to: parent,
      part: parent.parts[this.path[this.path.length - 1]], path, elapsed: 0, duration: 0.8 };
    if (immediate) this.finish();
    return true;
  }
  surface(immediate = false) {
    if (this.path.length === 1) return this.back(immediate);
    if (this.transition || !this.path.length) return false;
    this.transition = { mode: "surface", from: this.world, to: createWorld(), part: null,
      path: [], elapsed: 0, duration: 0.7 };
    if (immediate) this.finish();
    return true;
  }
  advance(seconds: number) {
    this.time += seconds;
    if (!this.transition) return false;
    this.transition.elapsed += seconds;
    if (this.transition.elapsed < this.transition.duration) return false;
    this.finish(); return true;
  }
  private finish() {
    if (!this.transition) return;
    this.world = this.transition.to; this.path = this.transition.path;
    this.transition = null; this.selected = -1;
  }
}
