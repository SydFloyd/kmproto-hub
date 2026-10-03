import rounds from "./rounds.json" with { type: "json" };

export const WIDTH = 256, HEIGHT = 224, TILE = 8, STEP = 1 / 120, GRAVITY = 620;
export const ENEMY_NAMES = ["Zen-Chan", "Mighta", "Monsta", "Pulpul", "Banebou", "Hidegons", "Drunk", "Invader"];
export type Mode = "ready" | "playing" | "paused" | "clear" | "over" | "won";
export type Controls = { left: boolean; right: boolean; jump: boolean; fire: boolean };
export const IDLE: Controls = { left: false, right: false, jump: false, fire: false };
export type Actor = { x: number; y: number; vx: number; vy: number; grounded: boolean; facing: number };
export type Player = Actor & { id: number; alive: boolean; lives: number; score: number; invincible: number; respawn: number; cooldown: number; jumpHeld: boolean; shoe: boolean; fast: boolean; range: boolean; speed: boolean; thunder: boolean; extend: boolean[]; nextLife: number; shooting: number };
export type Enemy = Actor & { id: number; kind: number; state: "free" | "trapped" | "dead"; angry: boolean; timer: number };
export type BubbleKind = "plain" | "enemy" | "water" | "fire" | "thunder" | "letter" | "boss";
export type Bubble = { id: number; x: number; y: number; vx: number; vy: number; age: number; life: number; travel: number; owner: number; kind: BubbleKind; enemy: number; letter: number; radius: number };
export type ItemKind = "fruit" | "shoe" | "yellow" | "purple" | "blue" | "heart" | "bomb" | "clock" | "umbrella3" | "umbrella5" | "umbrella7" | "potion" | "door" | "diamond";
export type Item = { x: number; y: number; vy: number; vx: number; kind: ItemKind; value: number; fruit: number; life: number; settled: boolean };
export type Projectile = { x: number; y: number; vx: number; vy: number; kind: "rock" | "fire" | "bottle" | "laser" | "thunder" | "water" | "flame"; owner: number; life: number; age: number; hits: Set<number> };
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; text: string };
export type SoundEvent = { type: "bubble" | "pop" | "trap" | "fruit" | "power" | "extra" | "death" | "clear" | "hurry" | "thunder"; value: number };
export type Snapshot = { mode: Mode; round: number; score: number; best: number; players: { lives: number; score: number; extend: boolean[]; powers: string[] }[]; enemies: number; hurry: boolean; boss: number; superMode: boolean; ending: "solo" | "together" | "true"; bonus: boolean };
export type Round = { map: string; enemies: number[][]; colors: string[] };
export const ROUNDS = rounds as Round[];

export function chainPoints(index: number) { return 1000 * 2 ** Math.min(7, index); }
export function segmentBox(x: number, y: number, dx: number, dy: number, left: number, top: number, w: number, h: number) {
  let near = 0, far = 1;
  for (const [origin, movement, min, max] of [[x, dx, left, left + w], [y, dy, top, top + h]]) {
    if (Math.abs(movement) < .00001) { if (origin < min || origin > max) return false; }
    else { const a = (min - origin) / movement, b = (max - origin) / movement; near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b)); if (near > far) return false; }
  }
  return true;
}

export class BubbleBobble {
  mode: Mode = "ready";
  round = 0;
  superMode = false;
  powerMode = false;
  originalMode = false;
  ending: Snapshot["ending"] = "solo";
  players: Player[] = [];
  enemies: Enemy[] = [];
  bubbles: Bubble[] = [];
  items: Item[] = [];
  shots: Projectile[] = [];
  particles: Particle[] = [];
  skels: { x: number; y: number; target: number; timer: number }[] = [];
  platforms: { x: number; y: number; width: number }[] = [];
  tiles: boolean[][] = [];
  boss: { x: number; y: number; vx: number; vy: number; hp: number; maxHp: number; timer: number; state: "fighting" | "trapped" | "dead" } | null = null;
  time = 0;
  roundTime = 0;
  hurry = false;
  heart = 0;
  clock = 0;
  bonus = false;
  deaths = 0;
  best: number;
  events: SoundEvent[] = [];
  private nextId = 0;
  private clearTimer = 0;
  private endTimer = 0;
  private ambientTimer = 3;
  private specialSpawned = false;
  private foodSpawned = false;
  private letters: number[] = [];
  private earnedLetters = 0;
  private skipped = 1;
  private bonusRound = 0;
  private bubblesBlown = 0;
  private jumps = 0;
  private pops = 0;
  private distance = 0;
  private random: () => number;

  constructor(best = 0, random = Math.random) { this.best = Number.isSafeInteger(best) && best >= 0 ? best : 0; this.random = random; this.loadRound(); }
  get score() { return this.players.reduce((sum, p) => sum + p.score, 0); }
  get remaining() { return this.enemies.filter(e => e.state !== "dead").length + (this.boss && this.boss.state !== "dead" ? 1 : 0); }
  get colors() { return ROUNDS[this.round].colors; }
  snapshot(): Snapshot {
    return { mode: this.mode, round: this.round, score: this.score, best: this.best, players: this.players.map(p => ({ lives: p.lives, score: p.score, extend: [...p.extend], powers: [p.shoe && "SHOE", p.fast && "FAST", p.range && "RANGE", p.speed && "SPEED", p.thunder && "THUNDER"].filter(Boolean) as string[] })), enemies: this.remaining, hurry: this.hurry, boss: this.boss?.hp ?? 0, superMode: this.superMode, ending: this.ending, bonus: this.bonus };
  }
  private newPlayer(id: number): Player {
    return { id, x: id ? 224 : 32, y: 200, vx: 0, vy: 0, facing: id ? -1 : 1, grounded: true, alive: true, lives: 3, score: 0, invincible: 2, respawn: 0, cooldown: 0, jumpHeld: false, shoe: this.powerMode, fast: this.powerMode, range: this.powerMode, speed: this.powerMode, thunder: false, extend: Array(6).fill(false), nextLife: 30000, shooting: 0 };
  }
  start(count = 1) {
    this.mode = "playing"; this.round = 0; this.time = 0; this.deaths = 0; this.earnedLetters = 0; this.letters = []; this.bubblesBlown = this.jumps = this.pops = this.distance = 0;
    this.players = Array.from({ length: Math.max(1, Math.min(2, count)) }, (_, id) => this.newPlayer(id)); this.loadRound();
  }
  join() {
    if (this.mode !== "playing") return;
    if (this.players.length === 1) this.players.push(this.newPlayer(1));
    else if (!this.players[1].alive && this.players[1].lives <= 0) this.players[1] = this.newPlayer(1);
  }
  pause() { if (this.mode === "playing" || this.mode === "clear") this.mode = "paused"; }
  resume() { if (this.mode === "paused") this.mode = this.clearTimer > 0 ? "clear" : "playing"; }
  drainSounds() { const events = this.events; this.events = []; return events; }
  continueGame() {
    if (this.mode !== "over") return;
    this.players = this.players.map(p => this.newPlayer(p.id)); this.mode = "playing"; this.bonus = false; this.loadRound();
  }
  private loadRound() {
    this.bonus = false; this.roundTime = 0; this.clearTimer = this.endTimer = 0; this.hurry = false; this.heart = this.clock = 0; this.skipped = 1; this.specialSpawned = this.foodSpawned = false; this.ambientTimer = 4;
    this.bubbles = []; this.items = []; this.shots = []; this.particles = []; this.skels = []; this.nextId = 0;
    this.tiles = Array.from({ length: 28 }, (_, y) => { const row = Number.parseInt(ROUNDS[this.round].map.slice(y * 8, y * 8 + 8), 16); return Array.from({ length: 32 }, (_, x) => Boolean((row >>> (31 - x)) & 1)); });
    this.platforms = [];
    for (let y = 1; y < 28; y++) for (let x = 2; x < 30; x++) {
      if (!this.tiles[y][x] || this.tiles[y - 1][x]) continue;
      const start = x; while (x < 30 && this.tiles[y][x] && !this.tiles[y - 1][x]) x++;
      this.platforms.push({ x: start * TILE, y: y * TILE, width: (x - start) * TILE }); x--;
    }
    this.enemies = ROUNDS[this.round].enemies.map(([kind, x, y, facing]) => ({ id: this.nextId++, kind: this.superMode ? [6, 5, 7, 4, 3, 1, 0, 2][kind] : kind, x, y, facing, vx: facing * 28, vy: 0, grounded: false, state: "free", angry: false, timer: 1.2 + this.random() * 1.6 }));
    this.boss = this.round === 99 ? { x: 128, y: 110, vx: 34, vy: 27, hp: 60, maxHp: 60, timer: 1.5, state: "fighting" } : null;
    if (this.boss) this.items = [56, 200].map(x => ({ ...this.item(x, 40, "potion"), life: 10000 }));
    for (const p of this.players) {
      p.x = p.id ? 224 : 32; p.y = 200; p.vx = p.vy = 0; p.alive = p.lives > 0; p.grounded = false; p.invincible = 2; p.respawn = 0; p.jumpHeld = false; p.cooldown = 0; p.thunder = false;
    }
  }
  private item(x: number, y: number, kind: ItemKind, value = 500, fruit = 0): Item { return { x, y, vx: 0, vy: -65, kind, value, fruit, life: 15, settled: false }; }
  solid(x: number, y: number) { if (x < 16 || x >= 240) return true; if (y < 8 || y >= HEIGHT) return false; return this.tiles[Math.floor(y / TILE)]?.[Math.floor(x / TILE)] ?? false; }
  open(x: number) { return !this.tiles[0][Math.max(2, Math.min(29, Math.floor(x / TILE)))]; }
  private physics(actor: Actor, dt: number) {
    const oldX = actor.x, oldY = actor.y;
    actor.x += actor.vx * dt;
    const side = actor.x + Math.sign(actor.vx) * 6;
    if (actor.vx && [actor.y - 3, actor.y - 10].some(y => this.solid(side, y))) { actor.x = oldX; actor.vx = 0; }
    actor.x = Math.max(23, Math.min(233, actor.x));
    actor.vy += GRAVITY * dt; actor.y += actor.vy * dt; actor.grounded = false;
    if (actor.vy >= 0) {
      const floor = this.platforms.filter(p => actor.x + 5 > p.x && actor.x - 5 < p.x + p.width && oldY <= p.y + .5 && actor.y >= p.y).sort((a,b) => a.y - b.y)[0];
      if (floor) { actor.y = floor.y; actor.vy = 0; actor.grounded = true; }
    }
    if (actor.y - 14 < 8 && !this.open(actor.x)) { actor.y = 22; actor.vy = Math.max(0, actor.vy); }
    if (actor.y > HEIGHT + 14) { actor.y = 16; actor.vy = Math.min(actor.vy, 120); }
    if (actor.y < -5 && this.open(actor.x)) actor.y = HEIGHT + 8;
  }
  private award(p: Player, value: number) {
    p.score += value; this.best = Math.max(this.best, p.score);
    while (p.score >= p.nextLife) { p.lives++; p.nextLife = p.nextLife === 30000 ? 100000 : p.nextLife + 100000; this.events.push({ type: "extra", value: p.id }); }
  }
  private spark(x: number, y: number, color: string, text = "") {
    for (let i = 0; i < (text ? 1 : 8); i++) this.particles.push({ x, y, vx: text ? 0 : (this.random() - .5) * 95, vy: text ? -14 : (this.random() - .5) * 90, life: text ? 1 : .35, color, text });
  }
  private die(p: Player) {
    if (!p.alive || p.invincible > 0 || this.heart > 0) return;
    p.alive = false; p.lives--; p.respawn = 1.4; p.shoe = p.fast = p.range = p.speed = p.thunder = false; this.deaths++;
    this.spark(p.x, p.y - 8, p.id ? "#00aaff" : "#00ff00"); this.events.push({ type: "death", value: p.id });
  }
  private movePlayer(p: Player, input: Controls, dt: number) {
    if (!p.alive) {
      p.respawn -= dt;
      if (p.respawn <= 0 && p.lives > 0) { p.alive = true; p.x = p.id ? 224 : 32; p.y = 192; p.vy = 0; p.invincible = 2.5; p.grounded = false; }
      p.jumpHeld = input.jump; return;
    }
    p.invincible = Math.max(0, p.invincible - dt); p.cooldown -= dt; p.shooting = Math.max(0, p.shooting - dt);
    const move = Number(input.right) - Number(input.left); if (move) p.facing = move;
    p.vx = move * (p.shoe ? 112 : 76); this.distance += Math.abs(p.vx) * dt;
    if (input.jump && !p.jumpHeld && p.grounded) { p.vy = -248; p.grounded = false; this.jumps++; }
    p.jumpHeld = input.jump;
    const oldY = p.y; this.physics(p, dt);
    if (p.vy >= 0) for (const b of this.bubbles) {
      if (b.travel > 0 || b.age < .2 || Math.abs(p.x - b.x) > b.radius + 4) continue;
      const top = b.y - b.radius;
      if (oldY <= top + 1 && p.y >= top) {
        if (input.jump) { p.y = top; p.vy = -248; p.grounded = false; this.spark(p.x, p.y, "#aaffaa"); }
        else this.popBubble(b, p);
        break;
      }
    }
    if (input.fire && p.cooldown <= 0 && !this.bonus && this.mode === "playing") this.blow(p);
    for (const b of this.bubbles) {
      if (b.life <= 0 || b.travel > 0 || b.age < .3 || (input.jump && p.y <= b.y - b.radius + 5)) continue;
      if (Math.hypot(p.x - b.x, p.y - 8 - b.y) < b.radius + 7) {
        if (b.kind !== "plain" || (b.x - p.x) * p.facing < 3 || p.y - 12 < b.y - b.radius) this.popBubble(b, p);
        else { b.x = p.x + p.facing * (b.radius + 8); b.vx = p.facing * 18; }
      }
    }
  }
  private blow(p: Player) {
    if (this.bubbles.filter(b => b.owner === p.id && b.kind === "plain").length >= 16) return;
    const kind: BubbleKind = p.thunder ? "thunder" : "plain";
    this.bubbles.push({ id: this.nextId++, x: p.x + p.facing * 10, y: p.y - 8, vx: p.facing * (p.speed ? 210 : 145), vy: 0, age: 0, life: 10, travel: p.range ? .7 : .35, owner: p.id, kind, enemy: -1, letter: 0, radius: 8 });
    p.cooldown = p.fast ? .15 : .28; p.shooting = .12; this.bubblesBlown++; this.events.push({ type: "bubble", value: p.id });
  }
  private trap(b: Bubble, enemy: Enemy) {
    enemy.state = "trapped"; enemy.vx = enemy.vy = 0; b.kind = "enemy"; b.enemy = enemy.id; b.x = enemy.x; b.y = enemy.y - 8; b.travel = 0; b.vx *= .12; b.vy = -18; b.life = this.hurry ? 5 : 8; b.age = 0;
    this.events.push({ type: "trap", value: 0 });
  }
  private killEnemy(e: Enemy, p: Player, index = 0, diamond = false) {
    if (e.state === "dead") return;
    e.state = "dead";
    const value = chainPoints(index); this.award(p, value); this.spark(e.x, e.y - 12, "#ffff00", String(value));
    const food = this.item(e.x, e.y - 8, diamond ? "diamond" : "fruit", diamond ? 6000 : [500, 1000, 2000, 3000, 4000, 5000, 6000, 8000][Math.min(index, 7)], Math.min(index, 7));
    food.vx = p.facing * (55 + index * 5); food.vy = -165; this.items.push(food);
  }
  private popBubble(first: Bubble, p: Player) {
    if (first.life <= 0) return;
    const chain = [first], ids = new Set([first.id]);
    for (let i = 0; i < chain.length; i++) for (const other of this.bubbles) {
      if (other.life <= 0 || ids.has(other.id) || other.travel > 0) continue;
      if (Math.hypot(chain[i].x - other.x, chain[i].y - other.y) <= chain[i].radius + other.radius + 2) { chain.push(other); ids.add(other.id); }
    }
    let monsters = 0;
    for (const b of chain) {
      b.life = 0; this.pops++; this.spark(b.x, b.y, p.id ? "#66ccff" : "#99ff99");
      if (b.kind === "enemy") {
        const e = this.enemies.find(e => e.id === b.enemy); if (e && e.state === "trapped") { e.x = b.x; e.y = b.y + 8; this.killEnemy(e, p, monsters++); }
      } else if (b.kind === "letter") {
        p.extend[b.letter] = true; this.award(p, 100);
        if (p.extend.every(Boolean)) { p.lives++; p.extend.fill(false); this.events.push({ type: "extra", value: p.id }); this.spark(128, 104, "#ffff00", "EXTEND"); if (this.round < 99) this.clearRound(); }
      } else if (b.kind === "boss" && this.boss) { this.boss.state = "dead"; this.award(p, 100000); this.ending = this.players.length === 2 && this.players.every(p => p.lives > 0) ? (this.superMode ? "true" : "together") : "solo"; this.clearRound(); }
      else if (b.kind === "thunder") { this.shots.push(this.projectile(b.x, b.y, -p.facing * 230, 0, "thunder", p.id, 1.2)); this.events.push({ type: "thunder", value: 0 }); }
      else if (b.kind === "water") this.shots.push(this.projectile(b.x, b.y, p.facing * 90, 25, "water", p.id, 4));
      else if (b.kind === "fire") this.shots.push(this.projectile(b.x, b.y, 0, 55, "flame", p.id, 4));
      else this.award(p, 10);
    }
    if (monsters >= 3) {
      const count = Math.min(6, monsters - 2);
      for (let i = 0; i < count; i++) this.letters.push((this.earnedLetters + i) % 6);
      this.earnedLetters = (this.earnedLetters + count) % 6;
    }
    this.events.push({ type: "pop", value: monsters });
  }
  private clearRound() {
    if (this.mode !== "playing") return;
    this.mode = "clear"; this.clearTimer = 3; this.skels = []; this.shots = [];
    const match = this.players.some(p => Math.floor(p.score / 100) % 10 === Math.floor(p.score / 10) % 10);
    if (match && !this.bonus && !this.boss) for (const b of this.bubbles) if (b.life > 0 && b.kind === "plain") this.items.push(this.item(b.x, b.y, "fruit", 500 + this.round * 50, this.round % 8));
    this.bubbles = []; this.events.push({ type: "clear", value: 0 });
  }
  private projectile(x: number, y: number, vx: number, vy: number, kind: Projectile["kind"], owner = -1, life = 3): Projectile { return { x, y, vx, vy, kind, owner, life, age: 0, hits: new Set() }; }
  private updateEnemies(dt: number) {
    const free = this.enemies.filter(e => e.state === "free");
    for (const e of free) {
      if (this.heart > 0) {
        for (const p of this.players) if (p.alive && Math.hypot(p.x - e.x, p.y - e.y) < 14) this.killEnemy(e, p);
        continue;
      }
      const target = this.players.filter(p => p.alive).sort((a,b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x))[0];
      if (!target) continue;
      const rage = e.angry || this.hurry || free.length === 1;
      const factor = rage ? 1.65 : 1;
      e.timer -= dt;
      if (e.kind === 2 || e.kind === 3) {
        if (!e.vx) e.vx = e.facing * 32; if (!e.vy) e.vy = -26;
        const dx = e.vx * factor * dt, dy = (e.kind === 3 ? Math.sin(this.time * 2 + e.id) * 26 : e.vy * factor) * dt;
        if (this.solid(e.x + dx + Math.sign(dx) * 7, e.y - 8)) e.vx *= -1; else e.x += dx;
        if (this.solid(e.x, e.y + dy - (dy < 0 ? 14 : 1)) || e.y + dy < 30 || e.y + dy > 207) e.vy *= -1; else e.y += dy;
        e.facing = Math.sign(e.vx); e.x = Math.max(24, Math.min(232, e.x));
      } else {
        if (e.timer <= 0) {
          e.facing = target.x > e.x ? 1 : -1;
          if ((e.kind === 0 || e.kind === 4 || target.y < e.y - 20) && e.grounded) e.vy = e.kind === 4 ? -276 : -235;
          if ([1,5,6,7].includes(e.kind) && Math.abs(target.x - e.x) < 180) {
            const kind = e.kind === 1 ? "rock" : e.kind === 5 ? "fire" : e.kind === 6 ? "bottle" : "laser";
            this.shots.push(this.projectile(e.x, e.y - 8, e.kind === 7 ? 0 : e.facing * 92, e.kind === 7 ? 150 : e.kind === 1 ? -100 : 0, kind));
          }
          e.timer = e.kind === 4 ? .8 : 1.3 + this.random() * 1.1;
        }
        const speed = (e.kind === 0 ? 35 : e.kind === 4 ? 45 : 27) * factor;
        e.vx = e.facing * speed; const oldX = e.x; this.physics(e, dt);
        if (Math.abs(e.x - oldX) < .01) e.facing *= -1;
      }
      for (const p of this.players) if (p.alive && Math.abs(p.x - e.x) < 11 && Math.abs(p.y - e.y) < 13) this.die(p);
    }
  }
  private updateBubbles(dt: number) {
    for (const b of this.bubbles) {
      if (b.life <= 0) continue;
      b.age += dt; b.life -= dt;
      if (b.kind === "boss") { b.y = Math.max(42, b.y - 7 * dt); if (this.boss) { this.boss.x = b.x; this.boss.y = b.y; } continue; }
      if (b.travel > 0) {
        const dx = b.vx * dt;
        for (const e of this.enemies) if (b.kind === "plain" && e.state === "free" && segmentBox(b.x, b.y, dx, 0, e.x - 8, e.y - 15, 16, 15)) { this.trap(b, e); break; }
        if (b.travel > 0) { if (this.solid(b.x + dx, b.y)) b.travel = 0; else b.x += dx; b.travel -= dt; }
      } else {
        b.vx *= Math.pow(.12, dt);
        const drift = Math.sin(b.y / 28 + this.round * .7) * 10;
        const dx = (b.vx + drift) * dt, dy = -22 * dt;
        if (!this.solid(b.x + dx + Math.sign(dx) * b.radius, b.y)) b.x += dx;
        if ((b.y + dy > 22 || this.open(b.x)) && !this.solid(b.x, b.y + dy - b.radius)) b.y += dy;
        else b.y += Math.sin(this.time * 3 + b.id) * dt;
        if (b.y < -b.radius && this.open(b.x)) b.y = HEIGHT + b.radius;
        if (b.kind === "enemy") { const e = this.enemies.find(e => e.id === b.enemy); if (e) { e.x = b.x; e.y = b.y + 8; } }
        if (b.kind === "plain") for (const e of this.enemies) if (e.state === "free" && Math.hypot(e.x - b.x, e.y - 8 - b.y) < 11) { this.trap(b, e); break; }
      }
      b.x = Math.max(24, Math.min(232, b.x));
      if (b.life <= 0 && b.kind === "enemy") {
        const e = this.enemies.find(e => e.id === b.enemy);
        if (e && e.state === "trapped") { e.state = "free"; e.angry = true; e.vy = -90; e.timer = .5; this.spark(b.x,b.y,"#ff5555"); }
      }
    }
    this.bubbles = this.bubbles.filter(b => b.life > 0).slice(-80);
    // A touching group rises together and can be popped in one chain.
    const floating = this.bubbles.filter(b => b.travel <= 0);
    for (let i = 0; i < floating.length; i++) for (let j = i + 1; j < floating.length; j++) {
      const a = floating[i], b = floating[j], dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx,dy), min = a.radius + b.radius - 1;
      if (distance < min && distance > .01) { const push = Math.min(1, (min - distance) * .12); a.x -= dx / distance * push; b.x += dx / distance * push; a.y -= dy / distance * push; b.y += dy / distance * push; }
    }
  }
  private updateShots(dt: number) {
    this.shots = this.shots.filter(s => {
      s.life -= dt; s.age += dt;
      if (["rock","flame","water"].includes(s.kind)) s.vy += GRAVITY * dt * .65;
      if (s.kind === "bottle" && s.age > .6 && s.age - dt <= .6) s.vx *= -1;
      const dx = s.vx * dt, dy = s.vy * dt;
      if (s.owner < 0) {
        for (const p of this.players) if (p.alive && segmentBox(s.x,s.y,dx,dy,p.x-6,p.y-14,12,14)) { this.die(p); return false; }
      } else {
        const p = this.players[s.owner];
        if (p) for (const e of this.enemies) if (e.state === "free" && !s.hits.has(e.id) && segmentBox(s.x,s.y,dx,dy,e.x-8,e.y-15,16,15)) { s.hits.add(e.id); this.killEnemy(e,p,s.hits.size-1,true); }
        if (p && this.boss?.state === "fighting" && s.kind === "thunder" && segmentBox(s.x,s.y,dx,dy,this.boss.x-22,this.boss.y-28,44,48)) {
          this.boss.hp--; this.spark(this.boss.x,this.boss.y,"#ffffff");
          if (this.boss.hp <= 0) { this.boss.state = "trapped"; this.bubbles.push({ id: this.nextId++, x:this.boss.x,y:this.boss.y,vx:0,vy:-7,age:1,life:10000,travel:0,owner:p.id,kind:"boss",enemy:-1,letter:0,radius:26 }); }
          return false;
        }
        if (s.kind === "water") for (const player of this.players) if (player.alive && Math.hypot(player.x-s.x,player.y-6-s.y)<18) { player.x = Math.max(23,Math.min(233,player.x+dx)); player.invincible = Math.max(player.invincible,.15); }
      }
      if (this.solid(s.x+dx,s.y+dy)) {
        if (s.kind === "flame") { s.vy = 0; s.vx = Math.sin(s.age*3)*18; }
        else if (s.kind === "water") { s.vy = 0; if (this.solid(s.x+dx,s.y-2)) s.vx *= -1; }
        else return false;
      } else { s.x += dx; s.y += dy; }
      return s.life > 0 && s.x > 16 && s.x < 240 && s.y < HEIGHT+8 && s.y>12;
    });
    if (this.boss?.state === "trapped") this.shots = this.shots.filter(s => s.owner >= 0);
  }
  private updateBoss(dt: number) {
    const boss = this.boss; if (!boss || boss.state !== "fighting") return;
    const factor = boss.hp <= 20 ? 1.5 : 1; boss.x += boss.vx * dt * factor; boss.y += boss.vy * dt * factor;
    if (boss.x < 48 || boss.x > 208) { boss.x = Math.max(48,Math.min(208,boss.x)); boss.vx *= -1; }
    if (boss.y < 62 || boss.y > 162) { boss.y = Math.max(62,Math.min(162,boss.y)); boss.vy *= -1; }
    boss.timer -= dt;
    if (boss.timer <= 0) {
      for (const vx of [-115,-75,75,115]) this.shots.push(this.projectile(boss.x,boss.y,vx,-55,"bottle",-1,3));
      boss.timer = boss.hp <= 20 ? .9 : 1.7;
    }
    for (const p of this.players) if (p.alive && Math.abs(p.x-boss.x)<26 && p.y>boss.y-28 && p.y-14<boss.y+20) this.die(p);
  }
  private specialItem() {
    let kind: ItemKind = "yellow";
    if (this.distance >= 1800) { kind = "shoe"; this.distance = 0; }
    else if (this.bubblesBlown >= 35) { kind = "purple"; this.bubblesBlown = 0; }
    else if (this.jumps >= 35) { kind = "blue"; this.jumps = 0; }
    else if (this.pops >= 35) { kind = "yellow"; this.pops = 0; }
    else kind = (["yellow","shoe","purple","blue","heart","clock","bomb","umbrella3","umbrella5","umbrella7"] as ItemKind[])[this.round % 10];
    const platform = this.platforms.filter(p => p.y >= 72 && p.y < 184 && p.width >= 24)[this.round % Math.max(1,this.platforms.filter(p => p.y>=72&&p.y<184&&p.width>=24).length)];
    this.items.push(this.item(platform ? platform.x+platform.width/2 : 128,platform ? platform.y-8 : 160,kind));
    if ([19,29,39,49].includes(this.round) && (this.deaths === 0 || this.originalMode)) this.items.push(this.item(128,80,"door"));
  }
  private collect(item: Item, p: Player) {
    this.award(p,item.value); this.spark(item.x,item.y-8,"#ffffff",String(item.value));
    if (item.kind === "shoe") p.shoe = true;
    else if (item.kind === "yellow") p.fast = true;
    else if (item.kind === "purple") p.range = true;
    else if (item.kind === "blue") p.speed = true;
    else if (item.kind === "heart") this.heart = 8;
    else if (item.kind === "clock") this.clock = 20;
    else if (item.kind === "potion") p.thunder = true;
    else if (item.kind === "bomb") { for (const e of this.enemies) if (e.state !== "dead") this.killEnemy(e,p,0,true); }
    else if (item.kind.startsWith("umbrella")) { this.skipped = Number(item.kind.slice(8)); this.clearRound(); }
    else if (item.kind === "door") {
      if (this.round === 49) { this.skipped = 20; this.clearRound(); }
      else {
        this.bonusRound = this.round; this.bonus = true; this.enemies = []; this.bubbles = []; this.shots = []; this.skels = []; this.roundTime = 0;
        this.items = [];
        for (let y=56;y<177;y+=32) for(let x=40;x<224;x+=24) this.items.push({ ...this.item(x,y,"diamond",10000), life: 40 });
        for (const player of this.players) player.invincible = 40;
      }
    }
    this.events.push({ type: item.kind === "fruit" || item.kind === "diamond" ? "fruit" : "power", value: 0 });
  }
  private updateItems(dt: number) {
    const items = this.items;
    this.items = [];
    for (const item of items) {
      item.life -= dt; const oldY = item.y; item.vy += GRAVITY*dt; item.y += item.vy*dt; item.x += item.vx*dt; item.vx *= Math.pow(.6,dt);
      if (item.x<24||item.x>232) { item.x = Math.max(24,Math.min(232,item.x)); item.vx *= -.5; }
      const floor = this.platforms.filter(f => item.x>=f.x && item.x<=f.x+f.width && oldY<=f.y-6+.5 && item.y>=f.y-6 && item.vy>=0).sort((a,b)=>a.y-b.y)[0];
      if (floor) { item.y = floor.y-6; item.vy=0;item.settled=true; }
      if(item.y>HEIGHT+8) { item.y=16;item.vy=30; }
      const p = this.players.find(p => p.alive && Math.abs(p.x-item.x)<12 && Math.abs(p.y-8-item.y)<13);
      if(p) { this.collect(item,p); if(this.bonus && item.kind==="door") return; }
      else if(item.life>0) this.items.push(item);
    }
  }
  private ambient(dt: number) {
    const open = this.tiles[0].some((solid,x) => x>2&&x<29&&!solid);
    if (!open || this.boss || this.bonus) return;
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) return;
    this.ambientTimer = 3.5;
    const holes = this.tiles[27].map((solid,x) => !solid ? x : -1).filter(x=>x>=2&&x<30);
    const x = holes.length ? holes[Math.floor(this.random()*holes.length)]*8+4 : 128;
    const letter = this.letters.shift();
    const kind: BubbleKind = letter !== undefined ? "letter" : this.round>=5 ? (["water","thunder","fire"] as const)[Math.floor(this.round/3)%3] : "plain";
    this.bubbles.push({ id:this.nextId++,x,y:208,vx:0,vy:-22,age:1,life:13,travel:0,owner:-1,kind,enemy:-1,letter:letter??0,radius:8 });
  }
  step(dt: number, inputs: Controls[] = [IDLE,IDLE]) {
    if(this.mode!=="playing"&&this.mode!=="clear") return;
    this.time += dt;
    for(const v of this.particles){ v.x+=v.vx*dt;v.y+=v.vy*dt;v.life-=dt; }
    this.particles=this.particles.filter(v=>v.life>0).slice(-200);
    if(this.mode==="clear") {
      this.clearTimer -= dt;
      for(const p of this.players) this.movePlayer(p,inputs[p.id]??IDLE,dt);
      this.updateItems(dt);
      if(this.clearTimer<=0) {
        if(this.boss?.state==="dead")this.mode="won";
        else { this.round=Math.min(99,(this.bonus?this.bonusRound:this.round)+this.skipped);this.mode="playing";this.loadRound(); }
      }
      return;
    }
    this.heart=Math.max(0,this.heart-dt);this.clock=Math.max(0,this.clock-dt);
    if(this.clock===0) this.roundTime+=dt;
    for(const p of this.players)this.movePlayer(p,inputs[p.id]??IDLE,dt);
    this.updateBubbles(dt);if(this.clock===0)this.updateEnemies(dt);this.updateBoss(dt);if(this.clock===0)this.updateShots(dt);this.updateItems(dt);this.ambient(dt);
    if(this.boss?.state==="fighting"&&this.players.some(p=>p.lives>0&&!p.thunder)&&!this.items.some(i=>i.kind==="potion"))this.items.push(...[56,200].map(x=>({...this.item(x,40,"potion"),life:10000})));
    if(!this.bonus&&!this.boss) {
      if(this.roundTime>5&&!this.specialSpawned){this.specialSpawned=true;this.specialItem();}
      if(this.roundTime>8&&!this.foodSpawned){this.foodSpawned=true;this.items.push(this.item(96+(this.round%3)*32,70,"fruit",500,this.round%8));}
      if(this.roundTime>=35&&!this.hurry){this.hurry=true;this.events.push({type:"hurry",value:0});}
      if(this.roundTime>=50&&!this.skels.length)for(const p of this.players)if(p.lives>0)this.skels.push({x:p.id?224:32,y:30,target:p.id,timer:0});
      if(this.remaining===0)this.clearRound();
    } else if(this.bonus&&(this.roundTime>=30||!this.items.length)) { if(!this.items.length)for(const p of this.players)this.award(p,50000);this.clearRound(); }
    for(const s of this.skels){const p=this.players[s.target];if(!p?.alive)continue;s.timer+=dt;const dx=p.x-s.x,dy=p.y-8-s.y,d=Math.hypot(dx,dy);if(d>0){s.x+=dx/d*44*dt;s.y+=dy/d*44*dt;}if(d<12)this.die(p);}
    if(this.players.length&&this.players.every(p=>p.lives<=0)){this.endTimer+=dt;if(this.endTimer>1)this.mode="over";}else this.endTimer=0;
  }
}
