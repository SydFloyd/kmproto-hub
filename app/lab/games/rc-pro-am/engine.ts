import courseData from "./courses.json" with { type: "json" };

export const WIDTH = 256, HEIGHT = 240, STEP = 1 / 120, ROAD = 43;
export type Point = { x: number; y: number };
export type Controls = { left: boolean; right: boolean; throttle: boolean; fire: boolean };
export const IDLE: Controls = { left: false, right: false, throttle: false, fire: false };
export type Mode = "ready" | "countdown" | "playing" | "paused" | "result" | "over";
export type ItemKind = "turbo" | "engine" | "tires" | "letter" | "missile" | "bomb" | "star" | "cage" | "skull";
export type HazardKind = "oil" | "water" | "rain" | "barrier" | "zip";
export type Item = Point & { kind: ItemKind; active: boolean };
export type Hazard = Point & { kind: HazardKind; phase: number; angle: number };
export type Car = Point & { id: number; angle: number; momentum: number; speed: number; s: number; progress: number; spin: number; crash: number; shield: number; boost: number; wet: number; cooldown: number; horn: number; turbo: number; engine: number; tires: number; place: number; hitGuard: number };
export type Shot = Point & { kind: "missile" | "bomb"; angle: number; age: number; owner: number };
export type Particle = Point & { vx: number; vy: number; life: number; color: string };
export type SoundEvent = "pickup" | "shot" | "boom" | "horn" | "beep" | "go" | "win" | "spin" | "boost";
export type Snapshot = { mode: Mode; race: number; score: number; best: number; place: number; lap: number; laps: number; mph: number; ammo: number; weapon: string; letters: number; vehicle: number; continues: number; turbo: number; engine: number; tires: number };
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const modulo = (n: number, d: number) => (n % d + d) % d;
export const project = (p: Point): Point => ({ x: p.x - p.y, y: (p.x + p.y) / 2 });

export class Course {
  points: Point[];
  lengths: number[] = [];
  starts: number[] = [];
  length = 0;
  laps: number;
  constructor(index: number) {
    const data = courseData[modulo(index, courseData.length)];
    this.points = data.points.map(([x, y]) => ({ x, y })); this.laps = data.laps;
    for (let i = 0; i < this.points.length; i++) {
      const a = this.points[i], b = this.points[(i + 1) % this.points.length];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      this.starts.push(this.length); this.lengths.push(length); this.length += length;
    }
  }
  at(distance: number, lane = 0) {
    const s = modulo(distance, this.length);
    let i = this.starts.length - 1;
    while (i > 0 && this.starts[i] > s) i--;
    const a = this.points[i], b = this.points[(i + 1) % this.points.length], t = (s - this.starts[i]) / this.lengths[i];
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    return { x: a.x + (b.x - a.x) * t - Math.sin(angle) * lane, y: a.y + (b.y - a.y) * t + Math.cos(angle) * lane, angle, s };
  }
  nearest(p: Point) {
    let best = { x: 0, y: 0, distance: Infinity, s: 0, angle: 0 };
    for (let i = 0; i < this.points.length; i++) {
      const a = this.points[i], b = this.points[(i + 1) % this.points.length], dx = b.x - a.x, dy = b.y - a.y;
      const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
      const x = a.x + dx * t, y = a.y + dy * t, distance = Math.hypot(p.x - x, p.y - y);
      if (distance < best.distance) best = { x, y, distance, s: this.starts[i] + this.lengths[i] * t, angle: Math.atan2(dy, dx) };
    }
    return best;
  }
}
export const COURSE_COUNT = courseData.length;

export class RCProAm {
  mode: Mode = "ready";
  race = 1; score = 0; best: number; vehicle = 0; letters = 0; ammo = 0;
  weapon: "missile" | "bomb" = "missile";
  continues = 3; trophies = [0, 0, 0]; hits = 0; time = 0; countdown = 3;
  cars: Car[] = []; items: Item[] = []; hazards: Hazard[] = []; shots: Shot[] = []; particles: Particle[] = [];
  course = new Course(0); events: SoundEvent[] = [];
  private pausedMode: "playing" | "countdown" = "playing";
  private fireHeld = false;
  constructor(best = 0) { this.best = Number.isSafeInteger(best) && best >= 0 && best <= 1e9 ? best : 0; this.loadRace(); }
  get player() { return this.cars[0]; }
  get place() { return this.cars.filter(c => c.progress > this.player.progress).length + 1; }
  get lap() { return clamp(Math.floor(Math.max(0, this.player.progress) / this.course.length) + 1, 1, this.course.laps); }
  maxSpeed(car: Car) { return car.id ? Math.min(340, 140 + car.id * 6 + this.vehicle * 34 + car.engine * 14 + Math.min(this.race - 1, 24) * 1.3) : 190 + this.vehicle * 38 + car.engine * 14; }
  snapshot(): Snapshot { const p = this.player; return { mode: this.mode, race: this.race, score: this.score, best: this.best, place: this.mode === "result" || this.mode === "over" ? p.place : this.place, lap: this.lap, laps: this.course.laps, mph: Math.round(p.speed / 3), ammo: this.ammo, weapon: this.weapon, letters: this.letters, vehicle: this.vehicle, continues: this.continues, turbo: p.turbo, engine: p.engine, tires: p.tires }; }
  start() {
    this.race = 1; this.score = 0; this.vehicle = 0; this.letters = 0; this.ammo = 0; this.weapon = "missile";
    this.continues = 3; this.hits = 0; this.trophies = [0, 0, 0]; this.cars = []; this.loadRace(); this.mode = "countdown";
  }
  nextRace() { if (this.mode !== "result") return; this.race++; this.loadRace(); this.mode = "countdown"; }
  continueGame() { if (this.mode !== "over" || this.continues <= 0) return; this.continues--; this.loadRace(); this.mode = "countdown"; }
  pause() { if (this.mode === "playing" || this.mode === "countdown") { this.pausedMode = this.mode; this.mode = "paused"; this.fireHeld = false; } }
  resume() { if (this.mode === "paused") this.mode = this.pausedMode; }
  drainSounds() { const events = this.events; this.events = []; return events; }
  private addScore(points: number) { this.score = Math.min(1e9, this.score + points); this.best = Math.max(this.best, this.score); }
  private loadRace() {
    const upgrades = this.cars[0] ? [this.player.turbo, this.player.engine, this.player.tires] : [0, 0, 0];
    this.course = new Course(this.race - 1); this.time = 0; this.countdown = 3; this.fireHeld = false;
    this.shots = []; this.particles = []; this.events = [];
    this.cars = Array.from({ length: 4 }, (_, id) => {
      const distance = -(id < 2 ? 30 : 60), p = this.course.at(distance, id % 2 ? -16 : 16);
      return { id, x: p.x, y: p.y, angle: p.angle, momentum: p.angle, speed: 0, s: p.s, progress: distance, spin: 0, crash: 0, shield: 0, boost: 0, wet: 0, cooldown: 0, horn: 0, turbo: id ? 0 : upgrades[0], engine: id ? 0 : upgrades[1], tires: id ? 0 : upgrades[2], place: 0, hitGuard: 0 };
    });
    const kinds: ItemKind[] = ["turbo", "engine", "tires", "letter", this.race % 2 ? "missile" : "bomb", "star", "cage", "star"];
    this.items = kinds.map((kind, i) => { const p = this.course.at(this.course.length * (.1 + i * .105), i % 2 ? -13 : 13); return { x: p.x, y: p.y, kind, active: true }; });
    const hazards: HazardKind[] = this.race === 1 ? ["water", "water", "zip"] : this.race < 5 ? ["oil", "water", "zip", "zip"] : ["oil", "water", "rain", "barrier", "zip", "zip"];
    this.hazards = hazards.map((kind, i) => { const p = this.course.at(this.course.length * (.16 + i * .12), i % 2 ? -20 : 21); return { x: p.x, y: p.y, kind, angle: p.angle, phase: i * 1.7 }; });
    if (this.race >= 3) { const p = this.course.at(this.course.length * .94); this.items.push({ x: p.x, y: p.y, kind: "skull", active: true }); }
  }
  collect(car: Car, item: Item) {
    if (!item.active) return;
    // Drone cars can steal upgrades and the roll cage, but not letters/ammo.
    if (car.id && !["turbo", "engine", "tires", "cage"].includes(item.kind)) return;
    item.active = false;
    if (item.kind === "turbo" || item.kind === "engine" || item.kind === "tires") { car[item.kind] = Math.min(4, car[item.kind] + 1); }
    else if (item.kind === "cage") car.shield = 10;
    else if (item.kind === "letter") this.letters = Math.min(8, this.letters + 1);
    else if (item.kind === "star") { this.ammo = Math.min(99, this.ammo + 1); this.addScore(100); }
    else if (item.kind === "skull") this.ammo = Math.max(0, this.ammo - 1);
    else { this.weapon = item.kind; this.ammo = Math.min(99, this.ammo + 5); }
    if (!car.id) { this.events.push("pickup"); if (item.kind !== "star" && item.kind !== "skull") this.addScore(200); }
  }
  fire() {
    const p = this.player;
    if (p.cooldown > 0 || p.crash > 0) return;
    p.cooldown = .25;
    if (!this.ammo) {
      p.horn = .4; this.events.push("horn");
      for (const car of this.cars.slice(1)) if (Math.hypot(car.x - p.x, car.y - p.y) < 100) car.horn = 1.2;
      return;
    }
    this.ammo--; const direction = this.weapon === "bomb" ? -1 : 1;
    this.shots.push({ x: p.x + Math.cos(p.angle) * 16 * direction, y: p.y + Math.sin(p.angle) * 16 * direction, angle: p.angle, kind: this.weapon, age: 0, owner: 0 }); this.events.push("shot");
  }
  private crash(car: Car, weapon = false) {
    if (car.crash > 0 || car.hitGuard > 0 || (car.shield > 0 && !weapon)) return;
    car.crash = 1.1; car.speed = 0; car.spin = 0; car.hitGuard = 1.5;
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; this.particles.push({ x: car.x, y: car.y, vx: Math.cos(a) * 45, vy: Math.sin(a) * 45, life: .5, color: i % 2 ? "#ffb737" : "#fff0b2" }); }
    if (!car.id || weapon) this.events.push("boom");
    if (weapon && car.id) { this.addScore(100); this.hits++; if (this.hits % 10 === 0) this.cars[3].boost = 999; }
  }
  private finish() {
    const order = [...this.cars].sort((a, b) => b.progress - a.progress || a.id - b.id);
    order.forEach((car, i) => { car.place = i + 1; car.speed = 0; });
    const place = this.player.place;
    this.mode = place === 4 ? "over" : "result"; this.events.push(place === 4 ? "boom" : "win");
    if (place < 4) {
      this.trophies[place - 1]++; this.addScore([4000, 2000, 1000][place - 1]);
      if (this.letters === 8) { this.addScore(40000); this.letters = 0; this.vehicle = Math.min(2, this.vehicle + 1); this.player.turbo = this.player.engine = this.player.tires = 0; }
    }
  }
  step(dt: number, input: Controls = IDLE) {
    if (this.mode !== "playing" && this.mode !== "countdown") return;
    dt = clamp(dt, 0, .05); this.time += dt;
    if (this.mode === "countdown") {
      const before = Math.ceil(this.countdown); this.countdown -= dt;
      if (this.countdown <= 0) { this.mode = "playing"; this.events.push("go"); }
      else if (Math.ceil(this.countdown) !== before) this.events.push("beep");
      return;
    }
    if (input.fire && !this.fireHeld) this.fire(); this.fireHeld = input.fire;
    for (const car of this.cars) {
      const wasCrash = car.crash > 0;
      for (const key of ["crash", "shield", "boost", "wet", "cooldown", "horn", "hitGuard"] as const) car[key] = Math.max(0, car[key] - dt);
      if (wasCrash) { if (!car.crash) { const p = this.course.at(car.s, car.id % 2 ? -12 : 12); car.x = p.x; car.y = p.y; car.angle = car.momentum = p.angle; } continue; }
      let turn = Number(input.right) - Number(input.left), throttle = input.throttle;
      if (car.id) {
        const target = this.course.at(car.s + 48, car.horn ? 25 : (car.id - 2) * 9);
        const difference = angleDiff(Math.atan2(target.y - car.y, target.x - car.x), car.angle);
        turn = clamp(difference * 3, -1, 1); throttle = true;
      }
      if (car.spin > 0) { car.spin = Math.max(0, car.spin - dt); car.angle += 11 * dt; }
      else {
        car.angle += turn * 3.8 * dt;
        const difference = angleDiff(car.angle, car.momentum), grip = (car.id ? 3.6 : 1.95 + car.tires * .36 + this.vehicle * .2) * dt;
        car.momentum += clamp(difference, -grip, grip);
        const max = car.boost > 0 ? 380 : this.maxSpeed(car);
        car.speed = clamp(car.speed + (throttle ? 140 + car.turbo * 32 : -115) * dt, 0, max);
        if (car.wet > 0) car.speed = Math.min(car.speed, 65);
      }
      car.x += Math.cos(car.momentum) * car.speed * dt; car.y += Math.sin(car.momentum) * car.speed * dt;
      const near = this.course.nearest(car), limit = ROAD - 7;
      if (near.distance > limit) {
        const scale = limit / near.distance; car.x = near.x + (car.x - near.x) * scale; car.y = near.y + (car.y - near.y) * scale;
        car.speed *= Math.pow(.12, dt); if (car.id) car.momentum = near.angle;
      }
      let delta = near.s - car.s;
      if (delta > this.course.length / 2) delta -= this.course.length;
      if (delta < -this.course.length / 2) delta += this.course.length;
      if (Math.abs(delta) < 24 && near.distance < ROAD + 10) { car.progress = Math.max(-80, car.progress + delta); car.s = near.s; }
      for (const item of this.items) if (item.active && Math.hypot(car.x - item.x, car.y - item.y) < 14) this.collect(car, item);
      for (const hazard of this.hazards) {
        const rain = hazard.kind === "rain" ? Math.sin(this.time * 1.2 + hazard.phase) * 22 : 0;
        const hx = hazard.x - Math.sin(hazard.angle) * rain, hy = hazard.y + Math.cos(hazard.angle) * rain;
        if (Math.hypot(car.x - hx, car.y - hy) > (hazard.kind === "zip" ? 17 : 15) || (car.shield > 0 && hazard.kind !== "zip")) continue;
        if (hazard.kind === "water" || hazard.kind === "rain") car.wet = .25;
        else if (hazard.kind === "oil" && !car.spin && !car.hitGuard) { car.spin = .8; car.hitGuard = 1.2; if (!car.id) this.events.push("spin"); }
        else if (hazard.kind === "barrier" && Math.sin(this.time * 1.7 + hazard.phase) > .1) this.crash(car);
        else if (hazard.kind === "zip" && car.boost < .3) { car.boost = .65; car.speed = 370; if (!car.id) this.events.push("boost"); }
      }
    }
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
      const c = this.cars[a], d = this.cars[b], dx = d.x - c.x, dy = d.y - c.y, distance = Math.hypot(dx, dy);
      if (c.crash || d.crash || distance >= 16) continue;
      if (c.shield > 0 && !d.shield) { this.crash(d); continue; }
      if (d.shield > 0 && !c.shield) { this.crash(c); continue; }
      const nx = distance ? dx / distance : 1, ny = distance ? dy / distance : 0, overlap = (16 - distance) / 2;
      c.x -= nx * overlap; c.y -= ny * overlap; d.x += nx * overlap; d.y += ny * overlap;
    }
    for (const shot of this.shots) {
      shot.age += dt;
      if (shot.kind === "missile") { shot.x += Math.cos(shot.angle) * 470 * dt; shot.y += Math.sin(shot.angle) * 470 * dt; if (this.course.nearest(shot).distance > ROAD) shot.age = 9; }
      for (const car of this.cars) if (car.id !== shot.owner && !car.crash && Math.hypot(car.x - shot.x, car.y - shot.y) < 14 && (shot.kind === "missile" || shot.age > .18)) { this.crash(car, true); shot.age = 9; break; }
    }
    this.shots = this.shots.filter(s => s.age < (s.kind === "bomb" ? 5 : 1.7));
    for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; } this.particles = this.particles.filter(p => p.life > 0);
    // R.C. Pro-Am ends a race as soon as the leader completes the last lap.
    if (this.cars.some(c => c.progress >= this.course.length * this.course.laps)) this.finish();
  }
}
