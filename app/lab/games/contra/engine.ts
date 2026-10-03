export const WIDTH = 320;
export const HEIGHT = 240;
export const STEP = 1 / 120;
export const GRAVITY = 650;
export type Mode = "ready" | "playing" | "paused" | "clear" | "over" | "won";
export type Weapon = "N" | "M" | "S" | "L" | "F";
export type Power = Exclude<Weapon, "N"> | "R" | "B";
export type Controls = { left: boolean; right: boolean; up: boolean; down: boolean; jump: boolean; fire: boolean };
export const IDLE: Controls = { left: false, right: false, up: false, down: false, jump: false, fire: false };
export type Platform = { x: number; y: number; width: number; solid?: boolean };
export type Stage = { name: string; kind: "side" | "vertical" | "base"; skin: "jungle" | "base" | "waterfall" | "snow" | "energy" | "hangar" | "alien"; width: number; height: number; rooms: number; gaps: [number, number][] };
export const STAGES: Stage[] = [
  { name: "JUNGLE", kind: "side", skin: "jungle", width: 2400, height: HEIGHT, rooms: 0, gaps: [[660, 728], [1310, 1378], [1800, 1860]] },
  { name: "BASE 1", kind: "base", skin: "base", width: WIDTH, height: HEIGHT, rooms: 3, gaps: [] },
  { name: "WATERFALL", kind: "vertical", skin: "waterfall", width: WIDTH, height: 1060, rooms: 0, gaps: [] },
  { name: "BASE 2", kind: "base", skin: "base", width: WIDTH, height: HEIGHT, rooms: 4, gaps: [] },
  { name: "SNOW FIELD", kind: "side", skin: "snow", width: 2480, height: HEIGHT, rooms: 0, gaps: [[740, 802], [1430, 1492], [1960, 2020]] },
  { name: "ENERGY ZONE", kind: "side", skin: "energy", width: 2300, height: HEIGHT, rooms: 0, gaps: [[1100, 1158], [1640, 1702]] },
  { name: "HANGAR", kind: "side", skin: "hangar", width: 2400, height: HEIGHT, rooms: 0, gaps: [[720, 780], [1360, 1420], [1870, 1930]] },
  { name: "ALIEN LAIR", kind: "side", skin: "alien", width: 2100, height: HEIGHT, rooms: 0, gaps: [[680, 738], [1240, 1300]] },
];
export type Player = { id: number; x: number; y: number; vx: number; vy: number; facing: number; grounded: boolean; prone: boolean; swimming: boolean; alive: boolean; lives: number; score: number; weapon: Weapon; rapid: boolean; shield: number; invincible: number; respawn: number; cooldown: number; drop: number; jumpHeld: boolean; aim: number };
export type Enemy = { id: number; type: "runner" | "turret" | "hopper"; x: number; y: number; vx: number; vy: number; hp: number; maxHp: number; shot: number; grounded: boolean; active: boolean; facing: number };
export type Shot = { x: number; y: number; vx: number; vy: number; age: number; life: number; owner: number; weapon: Weapon | "enemy"; damage: number; hits: Set<number> };
export type Crate = { id: number; x: number; y: number; power: Power; hp: number; flying: boolean; originY: number };
export type Pickup = { x: number; y: number; vy: number; power: Power; life: number };
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
export type Node = { id: number; x: number; y: number; hp: number; maxHp: number; core: boolean; radius: number };
export type Boss = { x: number; y: number; nodes: Node[]; timer: number; active: boolean; roomClear: boolean };
export type SoundEvent = { type: "shot" | "hit" | "boom" | "pickup" | "death" | "clear"; value: number };
export type Snapshot = { mode: Mode; stage: number; room: number; score: number; best: number; players: { lives: number; weapon: Weapon; rapid: boolean; score: number }[]; continues: number; thirtyLives: boolean; boss: number };

export function intersects(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function segmentBox(x: number, y: number, dx: number, dy: number, left: number, top: number, width: number, height: number) {
  let near = 0, far = 1;
  for (const [origin, movement, min, max] of [[x, dx, left, left + width], [y, dy, top, top + height]]) {
    if (Math.abs(movement) < .00001) { if (origin < min || origin > max) return false; }
    else {
      const a = (min - origin) / movement, b = (max - origin) / movement;
      near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
      if (near > far) return false;
    }
  }
  return true;
}

export function aimFor(player: Player, input: Controls, base = false) {
  if (base) return -Math.PI / 2;
  const horizontal = Number(input.right) - Number(input.left);
  const vertical = Number(input.down) - Number(input.up);
  if (player.prone) return player.facing > 0 ? 0 : Math.PI;
  if (vertical && (horizontal || !player.grounded || input.up)) return Math.atan2(vertical, horizontal);
  return player.facing > 0 ? 0 : Math.PI;
}

export class Contra {
  mode: Mode = "ready";
  stageIndex = 0;
  room = 0;
  players: Player[] = [];
  enemies: Enemy[] = [];
  shots: Shot[] = [];
  platforms: Platform[] = [];
  crates: Crate[] = [];
  pickups: Pickup[] = [];
  particles: Particle[] = [];
  boss: Boss = { x: 0, y: 0, nodes: [], timer: 1, active: false, roomClear: false };
  cameraX = 0;
  cameraY = 0;
  time = 0;
  best: number;
  continues = 3;
  thirtyLives = false;
  events: SoundEvent[] = [];
  private id = 0;
  private clearTimer = 0;
  private advanceTimer = 0;
  private endTimer = 0;
  private random: () => number;

  constructor(best = 0, random = Math.random) {
    this.best = Number.isSafeInteger(best) && best >= 0 ? best : 0;
    this.random = random;
    this.loadStage();
  }

  get stage() { return STAGES[this.stageIndex]; }
  get score() { return this.players.reduce((total, player) => total + player.score, 0); }
  snapshot(): Snapshot {
    const health = this.boss.nodes.reduce((sum, node) => sum + node.hp, 0), max = this.boss.nodes.reduce((sum, node) => sum + node.maxHp, 0);
    return { mode: this.mode, stage: this.stageIndex, room: this.room, score: this.score, best: this.best, players: this.players.map(({ lives, weapon, rapid, score }) => ({ lives, weapon, rapid, score })), continues: this.continues, thirtyLives: this.thirtyLives, boss: max ? Math.ceil(health / max * 100) : 0 };
  }
  start(count = 1) {
    this.mode = "playing"; this.stageIndex = 0; this.room = 0; this.continues = 3; this.time = 0;
    this.players = Array.from({ length: Math.max(1, Math.min(2, count)) }, (_, id) => this.newPlayer(id));
    this.loadStage();
  }
  private newPlayer(id: number): Player {
    return { id, x: 36 + id * 30, y: 216, vx: 0, vy: 0, facing: 1, grounded: true, prone: false, swimming: false, alive: true, lives: this.thirtyLives ? 30 : 3, score: 0, weapon: "N", rapid: false, shield: 0, invincible: 1.2, respawn: 0, cooldown: 0, drop: 0, jumpHeld: false, aim: 0 };
  }
  pause() { if (this.mode === "playing" || this.mode === "clear") this.mode = "paused"; }
  resume() { if (this.mode === "paused") this.mode = this.clearTimer > 0 ? "clear" : "playing"; }
  drainSounds() { const events = this.events; this.events = []; return events; }
  continueGame() {
    if (this.mode !== "over" || this.continues <= 0) return;
    this.continues--;
    for (const player of this.players) { player.lives = this.thirtyLives ? 30 : 3; player.weapon = "N"; player.rapid = false; }
    this.mode = "playing"; this.room = 0; this.loadStage();
  }

  private loadStage() {
    const stage = this.stage;
    this.id = 0; this.enemies = []; this.shots = []; this.crates = []; this.pickups = []; this.particles = []; this.platforms = [];
    this.clearTimer = 0; this.advanceTimer = 0; this.endTimer = 0;
    this.cameraX = 0; this.cameraY = Math.max(0, stage.height - HEIGHT);
    if (stage.kind === "side") {
      let edge = 0;
      for (const [left, right] of [...stage.gaps, [stage.width, stage.width]]) {
        this.platforms.push({ x: edge, y: 216, width: left - edge, solid: true }); edge = right;
      }
      for (let x = 290; x < stage.width - 240; x += 260) {
        this.platforms.push({ x, y: x % 520 < 300 ? 174 : 150, width: 98 });
        this.enemies.push(this.enemy("runner", x + 30, 216));
        this.enemies.push(this.enemy(x % 520 < 300 ? "turret" : "hopper", x + 95, 216));
      }
      const powers: Power[] = ["S", "R", "M", "B", "F", "L"];
      for (let x = 200, i = 0; x < stage.width - 220; x += 330, i++) this.crates.push({ id: this.id++, x, y: i % 2 ? 126 : 201, originY: i % 2 ? 126 : 201, power: powers[(i + this.stageIndex) % powers.length], hp: 1, flying: Boolean(i % 2) });
    } else if (stage.kind === "vertical") {
      this.platforms.push({ x: 0, y: stage.height - 12, width: WIDTH, solid: true });
      for (let y = stage.height - 60, i = 0; y >= 132; y -= 46, i++) {
        const x = i % 2 ? 126 : 10;
        this.platforms.push({ x, y, width: 175 });
        if (i % 3 === 1) this.enemies.push(this.enemy("turret", x + 140, y));
        if (i % 4 === 2) this.crates.push({ id: this.id++, x: x + 65, y: y - 16, originY: y - 16, hp: 1, power: i % 8 ? "S" : "B", flying: false });
      }
      this.platforms.push({ x: 10, y: 132, width: 300 });
      this.platforms.push({ x: 10, y: 116, width: 300 });
    } else this.platforms.push({ x: 0, y: 216, width: WIDTH, solid: true });
    this.makeBoss();
    for (const player of this.players) {
      player.x = stage.kind === "base" ? 80 + player.id * 120 : 36 + player.id * 30;
      player.y = stage.height - 24; player.vx = player.vy = 0; player.alive = player.lives > 0;
      player.grounded = stage.kind !== "vertical"; player.prone = player.swimming = false; player.invincible = 1.5; player.respawn = 0; player.drop = 0; player.shield = 0; player.cooldown = 0; player.jumpHeld = false;
    }
  }

  private enemy(type: Enemy["type"], x: number, y: number): Enemy {
    return { id: this.id++, type, x, y, vx: type === "runner" ? -28 : 0, vy: 0, hp: type === "turret" ? 6 : type === "hopper" ? 2 : 1, maxHp: type === "turret" ? 6 : type === "hopper" ? 2 : 1, shot: 1.1 + this.random() * .7, grounded: true, active: false, facing: -1 };
  }

  private makeBoss() {
    const stage = this.stage;
    const x = stage.kind === "side" ? stage.width - 62 : WIDTH / 2;
    const y = stage.kind === "vertical" ? 76 : stage.kind === "base" ? 88 : 190;
    let positions: [number, number, boolean][];
    if (stage.kind === "base") {
      const last = this.room === stage.rooms - 1;
      positions = last ? [[x - 62, y - 15, false], [x + 62, y - 15, false], [x, y + 22, true]] : [[x - 82, y + 16, false], [x + 82, y + 16, false], [x, y + 16, true]];
      if (last && this.stageIndex === 3) positions.push([x - 110, y + 20, false], [x + 110, y + 20, false]);
    } else positions = [[x - 20, y - 38, false], [x + (stage.kind === "vertical" ? 68 : -20), y + (stage.kind === "vertical" ? -38 : 17), false], [x, y, true]];
    if (stage.kind === "vertical") positions[0][0] = x - 68;
    this.boss = { x, y, nodes: positions.map(([x, y, core]) => ({ id: this.id++, x, y, core, radius: core ? 12 : 9, hp: core ? 20 + this.stageIndex * 3 : 5 + Math.floor(this.stageIndex / 2), maxHp: core ? 20 + this.stageIndex * 3 : 5 + Math.floor(this.stageIndex / 2) })), timer: 1.3, active: stage.kind === "base", roomClear: false };
  }

  private award(playerId: number, points: number) {
    const player = this.players[playerId];
    if (player) player.score += points;
    this.best = Math.max(this.best, this.score);
  }
  private burst(x: number, y: number, big = false) {
    for (let i = 0; i < (big ? 20 : 8); i++) {
      const angle = this.random() * Math.PI * 2, speed = 20 + this.random() * (big ? 120 : 65);
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .2 + this.random() * .5, color: ["#fff0a0", "#f08028", "#e84038"][i % 3] });
    }
    this.events.push({ type: big ? "boom" : "hit", value: 0 });
  }
  private kill(player: Player, fall = false) {
    if (!player.alive || (!fall && (player.invincible > 0 || player.shield > 0))) return;
    this.burst(player.x, player.y - 12, true);
    player.alive = false; player.lives--; player.respawn = 1.1; player.weapon = "N"; player.rapid = false; player.shield = 0;
    this.events.push({ type: "death", value: player.id });
  }
  private respawn(player: Player) {
    const leader = this.players.find(other => other.id !== player.id && other.alive);
    if (this.stage.kind === "base") { player.x = 80 + player.id * 120; player.y = 216; }
    else if (this.stage.kind === "vertical") {
      const visible = this.platforms.filter(p => p.y >= this.cameraY + 60 && p.y <= this.cameraY + HEIGHT - 12);
      const platform = visible.sort((a, b) => b.y - a.y)[0] ?? this.platforms[0];
      player.x = platform.x + Math.min(platform.width / 2, 80); player.y = platform.y;
    } else {
      player.x = leader ? leader.x - 20 : this.cameraX + 44;
      const floor = this.platforms.find(platform => platform.solid && player.x >= platform.x && player.x <= platform.x + platform.width);
      if (!floor) player.x = this.platforms.find(p => p.solid && p.x + p.width > this.cameraX + 10)?.x ?? this.cameraX + 10;
      player.x = Math.max(this.cameraX + 8, player.x); player.y = 180;
    }
    player.vx = player.vy = 0; player.alive = true; player.grounded = false; player.invincible = 2.5; player.prone = player.swimming = false; player.drop = 0;
  }

  private movePlayer(player: Player, input: Controls, dt: number) {
    if (!player.alive) {
      player.respawn -= dt;
      if (player.respawn <= 0 && player.lives > 0) this.respawn(player);
      player.jumpHeld = input.jump;
      return;
    }
    player.invincible = Math.max(0, player.invincible - dt); player.shield = Math.max(0, player.shield - dt); player.cooldown -= dt; player.drop = Math.max(0, player.drop - dt);
    const move = Number(input.right) - Number(input.left);
    if (move) player.facing = move;
    player.prone = input.down && !move && player.grounded && !player.swimming;
    if (input.jump && !player.jumpHeld && player.grounded) {
      const oneWay = this.platforms.some(p => !p.solid && Math.abs(player.y - p.y) < 1 && player.x >= p.x && player.x <= p.x + p.width);
      if (input.down && oneWay) { player.drop = .25; player.y += 2; player.vy = 30; }
      else player.vy = -260;
      player.grounded = false; player.swimming = false; player.prone = false;
    }
    player.jumpHeld = input.jump;
    player.vx = player.prone ? 0 : move * (player.swimming ? 64 : 96);
    const oldX = player.x;
    player.x += player.vx * dt;
    // A river bank is a wall until your feet clear it during a jump.
    for (const platform of this.platforms) if (platform.solid && player.y > platform.y + 1) {
      if (player.vx > 0 && oldX <= platform.x - 5 + .01 && player.x >= platform.x - 5) player.x = platform.x - 5;
      else if (player.vx < 0 && oldX >= platform.x + platform.width + 5 - .01 && player.x <= platform.x + platform.width + 5) player.x = platform.x + platform.width + 5;
    }
    player.x = Math.max(this.cameraX + 7, Math.min(this.stage.width - 12, player.x));
    if (this.stage.kind === "side" && this.boss.active && !this.boss.roomClear) player.x = Math.min(player.x, this.boss.x - 35);
    const oldY = player.y;
    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;
    player.grounded = false;
    if (player.vy >= 0) {
      const landing = this.platforms.filter(p => !(player.drop > 0 && !p.solid) && player.x + 5 > p.x && player.x - 5 < p.x + p.width && oldY <= p.y + .5 && player.y >= p.y).sort((a, b) => a.y - b.y)[0];
      if (landing) { player.y = landing.y; player.vy = 0; player.grounded = true; player.swimming = false; }
      else if (this.stage.skin === "jungle" && player.y >= 233) { player.y = 233; player.vy = 0; player.grounded = true; player.swimming = true; }
    }
    if (player.y > this.cameraY + HEIGHT + 18 || player.y > this.stage.height + 18) this.kill(player, true);
    if (!player.alive) return;
    player.aim = aimFor(player, input, this.stage.kind === "base");
    if (input.fire && player.cooldown <= 0) this.fire(player);
  }

  private fire(player: Player) {
    const count = this.shots.filter(shot => shot.owner === player.id).length;
    const limit = player.weapon === "S" ? 20 : player.weapon === "M" ? 9 : player.weapon === "L" ? 3 : 4;
    if (count >= limit || (player.weapon === "S" && count > limit - 5)) return;
    const offsets = player.weapon === "S" ? [-.3, -.15, 0, .15, .3] : [0];
    const speed = (player.weapon === "L" ? 490 : 285) * (player.rapid ? 1.25 : 1);
    const muzzleY = player.y - (player.prone || player.swimming ? 6 : 17);
    for (const offset of offsets) {
      const angle = player.aim + offset, dx = Math.cos(angle), dy = Math.sin(angle);
      this.shots.push({ x: player.x + dx * 13, y: muzzleY + dy * 8, vx: dx * speed, vy: dy * speed, age: 0, life: player.weapon === "L" ? .7 : 1.35, owner: player.id, weapon: player.weapon, damage: player.weapon === "L" ? 3 : player.weapon === "F" ? 2 : 1, hits: new Set() });
    }
    player.cooldown = (player.weapon === "M" ? .1 : player.weapon === "L" ? .28 : .2) * (player.rapid ? .75 : 1);
    this.events.push({ type: "shot", value: player.weapon === "L" ? 1 : 0 });
  }

  private enemyShot(x: number, y: number, target: Player, speed = 112, offset = 0) {
    const angle = Math.atan2(target.y - 16 - y, target.x - x) + offset;
    this.shots.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, life: 4, owner: -1, weapon: "enemy", damage: 1, hits: new Set() });
  }
  private updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      enemy.active = enemy.x >= this.cameraX - 20 && enemy.x < this.cameraX + WIDTH + 20 && enemy.y > this.cameraY - 10 && enemy.y < this.cameraY + HEIGHT + 30;
      if (!enemy.active) continue;
      const target = this.players.filter(player => player.alive).sort((a, b) => Math.abs(a.x - enemy.x) - Math.abs(b.x - enemy.x))[0];
      if (!target) continue;
      enemy.facing = target.x > enemy.x ? 1 : -1;
      enemy.shot -= dt;
      if (enemy.type === "runner") enemy.vx = enemy.facing * 25;
      if (enemy.type === "hopper" && enemy.grounded && enemy.shot < .8) { enemy.vy = -225; enemy.vx = enemy.facing * 55; enemy.grounded = false; }
      enemy.x += enemy.vx * dt;
      const oldY = enemy.y; enemy.vy += GRAVITY * dt; enemy.y += enemy.vy * dt; enemy.grounded = false;
      const platform = this.platforms.find(p => enemy.x >= p.x && enemy.x <= p.x + p.width && oldY <= p.y + .5 && enemy.y >= p.y && enemy.vy >= 0);
      if (platform) { enemy.y = platform.y; enemy.vy = 0; enemy.grounded = true; }
      if (enemy.y > this.stage.height + 16) enemy.hp = 0;
      if (enemy.shot <= 0 && Math.abs(target.x - enemy.x) > 70) {
        this.enemyShot(enemy.x, enemy.y - 15, target);
        enemy.shot = Math.max(.8, 2.2 - this.stageIndex * .1) + this.random() * .5;
      }
      if (enemy.hp > 0) for (const player of this.players) {
        const width = player.prone ? 22 : 10;
        if (player.alive && intersects(player.x - width / 2, player.y - (player.prone ? 7 : 23), width, player.prone ? 7 : 23, enemy.x - 7, enemy.y - (enemy.type === "turret" ? 15 : 23), 14, enemy.type === "turret" ? 15 : 23)) this.kill(player);
      }
    }
  }
  private updateBoss(dt: number) {
    const boss = this.boss;
    boss.active = this.stage.kind === "base" || (this.stage.kind === "side" ? this.cameraX + WIDTH >= boss.x - 70 : this.cameraY < 130);
    if (!boss.active || boss.roomClear) return;
    boss.timer -= dt;
    if (boss.timer <= 0) {
      const target = this.players.find(player => player.alive);
      if (target) for (const node of boss.nodes.filter(node => node.hp > 0 && !node.core)) {
        this.enemyShot(node.x, node.y, target, 105 + this.stageIndex * 5);
        if (this.stageIndex > 3) this.enemyShot(node.x, node.y, target, 105, .18);
      }
      // The exposed core keeps firing after its gun pods are destroyed.
      if (target && boss.nodes.every(node => node.core || node.hp <= 0)) {
        const core = boss.nodes.find(node => node.core)!;
        for (const angle of [-.18, 0, .18]) this.enemyShot(core.x, core.y, target, 115, angle);
      }
      boss.timer = Math.max(.7, 1.6 - this.stageIndex * .08);
    }
  }

  private updateShots(dt: number) {
    const surviving = this.shots.filter(shot => {
      shot.life -= dt; shot.age += dt;
      let dx = shot.vx * dt, dy = shot.vy * dt;
      if (shot.weapon === "F") { const speed = Math.hypot(shot.vx, shot.vy), wave = Math.cos(shot.age * 18) * 45 * dt; dx -= shot.vy / speed * wave; dy += shot.vx / speed * wave; }
      let removed = false;
      if (shot.owner === -1) {
        for (const player of this.players) {
          const height = player.prone || player.swimming ? 7 : 23, width = player.prone ? 22 : 10;
          if (player.alive && segmentBox(shot.x, shot.y, dx, dy, player.x - width / 2, player.y - height, width, height)) { this.kill(player); removed = true; break; }
        }
      } else {
        for (const enemy of this.enemies) {
          if (enemy.hp <= 0 || !enemy.active || shot.hits.has(enemy.id)) continue;
          if (segmentBox(shot.x, shot.y, dx, dy, enemy.x - 8, enemy.y - 24, 16, 24)) {
            shot.hits.add(enemy.id); enemy.hp = Math.max(0, enemy.hp - shot.damage);
            if (!enemy.hp) { this.award(shot.owner, enemy.type === "turret" ? 500 : enemy.type === "hopper" ? 200 : 100); this.burst(enemy.x, enemy.y - 12); }
            removed = shot.weapon !== "L"; if (removed) break;
          }
        }
        if (!removed) for (const crate of this.crates) {
          if (crate.hp > 0 && segmentBox(shot.x, shot.y, dx, dy, crate.x - 10, crate.y - 9, 20, 18)) {
            crate.hp = 0; this.pickups.push({ x: crate.x, y: crate.y, vy: -85, power: crate.power, life: 18 }); this.burst(crate.x, crate.y); removed = true; break;
          }
        }
        if (!removed && this.boss.active && !this.boss.roomClear) for (const node of this.boss.nodes) {
          if (node.hp <= 0 || shot.hits.has(node.id)) continue;
          if (segmentBox(shot.x, shot.y, dx, dy, node.x - node.radius, node.y - node.radius, node.radius * 2, node.radius * 2)) {
            shot.hits.add(node.id);
            if (!node.core || this.boss.nodes.every(other => other.core || other.hp <= 0)) {
              node.hp = Math.max(0, node.hp - shot.damage);
              this.events.push({ type: "hit", value: 0 });
              if (!node.hp) { this.award(shot.owner, node.core ? 3000 : 500); this.burst(node.x, node.y, true); }
              if (!node.hp && node.core) this.completeRoom();
            }
            removed = true; break;
          }
        }
      }
      shot.x += dx; shot.y += dy;
      return !removed && shot.life > 0 && shot.x > this.cameraX - 35 && shot.x < this.cameraX + WIDTH + 40 && shot.y > this.cameraY - 35 && shot.y < this.cameraY + HEIGHT + 40;
    });
    this.shots = this.boss.roomClear ? surviving.filter(shot => shot.owner !== -1) : surviving;
  }
  private completeRoom() {
    this.boss.roomClear = true;
    this.events.push({ type: "clear", value: 0 });
    if (this.stage.kind === "base" && this.room < this.stage.rooms - 1) this.advanceTimer = .5;
    else {
      for (const player of this.players) { player.lives++; player.score += 1000; }
      this.best = Math.max(this.best, this.score);
      this.mode = "clear"; this.clearTimer = 2.4;
    }
  }
  private updatePickups(dt: number) {
    for (const crate of this.crates) if (crate.hp > 0 && crate.flying) crate.y = crate.originY + Math.sin(this.time * 2 + crate.x) * 12;
    this.pickups = this.pickups.filter(pickup => {
      pickup.life -= dt;
      const oldY = pickup.y; pickup.vy += GRAVITY * dt; pickup.y += pickup.vy * dt;
      const floor = this.platforms.find(p => pickup.x >= p.x && pickup.x <= p.x + p.width && oldY <= p.y - 9 && pickup.y >= p.y - 9 && pickup.vy >= 0);
      if (floor) { pickup.y = floor.y - 9; pickup.vy = 0; }
      for (const player of this.players) if (player.alive && Math.abs(player.x - pickup.x) < 16 && Math.abs(player.y - 12 - pickup.y) < 23) {
        if (pickup.power === "R") player.rapid = true;
        else if (pickup.power === "B") player.shield = 10;
        else player.weapon = pickup.power;
        this.award(player.id, 100); this.events.push({ type: "pickup", value: 0 }); return false;
      }
      return pickup.life > 0 && pickup.y < this.stage.height + 20;
    });
  }
  hazardAt(x: number) { return (this.stage.skin === "energy" || this.stage.skin === "hangar") && x > 400 && x < this.stage.width - 210 && x % 420 > 200 && x % 420 < 220 && this.time % 3.6 < 1.8; }

  step(dt: number, inputs: Controls[] = [IDLE, IDLE]) {
    if (this.mode !== "playing" && this.mode !== "clear") return;
    this.time += dt;
    for (const particle of this.particles) { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 100 * dt; particle.life -= dt; }
    this.particles = this.particles.filter(particle => particle.life > 0).slice(-180);
    if (this.mode === "clear") {
      this.clearTimer -= dt;
      if (this.clearTimer <= 0) {
        if (this.stageIndex === STAGES.length - 1) { this.mode = "won"; this.clearTimer = 0; }
        else { this.stageIndex++; this.room = 0; this.mode = "playing"; this.loadStage(); }
      }
      return;
    }
    for (const player of this.players) this.movePlayer(player, inputs[player.id] ?? IDLE, dt);
    const alive = this.players.filter(player => player.alive);
    if (this.stage.kind === "side" && alive.length) this.cameraX = Math.max(this.cameraX, Math.min(this.stage.width - WIDTH, Math.max(...alive.map(p => p.x)) - WIDTH * .43));
    if (this.stage.kind === "vertical" && alive.length) this.cameraY = Math.max(0, Math.min(this.cameraY, Math.min(...alive.map(p => p.y)) - HEIGHT * .66));
    this.updateEnemies(dt); this.updateBoss(dt); this.updateShots(dt); this.updatePickups(dt);
    for (const player of this.players) if (player.alive && this.hazardAt(player.x) && player.y > 169) this.kill(player);
    if (this.stage.kind === "base" && this.boss.roomClear) {
      this.advanceTimer -= dt;
      if (this.advanceTimer <= 0 && inputs.some(input => input.up)) {
        this.room++; this.shots = []; this.makeBoss();
        this.crates.push({ id: this.id++, x: 160, y: 196, originY: 196, power: this.room % 2 ? "S" : "L", hp: 1, flying: false });
      }
    }
    if (this.mode === "playing" && this.players.length && this.players.every(player => player.lives <= 0)) {
      this.endTimer += dt;
      if (this.endTimer >= 1) this.mode = "over";
    } else this.endTimer = 0;
  }
}
