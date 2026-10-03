export const WIDTH = 1024;
export const HEIGHT = 768;
export const STEP = 1 / 120;

export type Mode = "ready" | "playing" | "paused" | "over";
export type Controls = { left: boolean; right: boolean; thrust: boolean; fire: boolean; hyperspace: boolean };
export const NO_CONTROLS: Controls = { left: false, right: false, thrust: false, fire: false, hyperspace: false };
type Body = { x: number; y: number; vx: number; vy: number };
export type Rock = Body & { size: 1 | 2 | 3; radius: number; outline: number[] };
export type Bullet = Body & { life: number; enemy: boolean };
export type Spark = Body & { life: number; duration: number; angle: number; length: number };
export type Saucer = Body & { small: boolean; travel: number; turn: number; shot: number };
export type Ship = Body & { angle: number; alive: boolean; respawn: number; warp: number };
export type SoundEvent = { type: "fire" | "explosion" | "beat" | "extra"; value: number };
export type Snapshot = { mode: Mode; score: number; best: number; lives: number; wave: number };

const TAU = Math.PI * 2;
const radii = { 1: 13, 2: 26, 3: 48 };
const points = { 1: 100, 2: 50, 3: 20 };
const outlines = [
  [1, .78, 1, .6, .95, .85, 1, .65, .9, 1, .7, .92],
  [.85, 1, .7, .95, 1, .55, .9, 1, .85, .65, 1, .8],
  [1, .7, .95, 1, .68, .92, .75, 1, .6, .9, 1, .82],
  [.75, 1, .95, .65, 1, .8, .92, .6, 1, .85, .7, 1],
];

export const wrap = (value: number, span: number) => ((value % span) + span) % span;
export const delta = (to: number, from: number, span: number) => wrap(to - from + span / 2, span) - span / 2;
export const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(delta(a.x, b.x, WIDTH), delta(a.y, b.y, HEIGHT));

// Check a shot's entire movement, including across a screen edge.
export function shotHits(bullet: Bullet, target: { x: number; y: number }, radius: number, dt: number) {
  const x = delta(target.x, bullet.x, WIDTH);
  const y = delta(target.y, bullet.y, HEIGHT);
  const dx = bullet.vx * dt;
  const dy = bullet.vy * dt;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, (x * dx + y * dy) / length)) : 0;
  return Math.hypot(x - dx * t, y - dy * t) < radius;
}

export class Asteroids {
  mode: Mode = "ready";
  score = 0;
  best: number;
  lives = 3;
  wave = 1;
  ship: Ship = this.newShip();
  rocks: Rock[] = [];
  bullets: Bullet[] = [];
  sparks: Spark[] = [];
  saucer: Saucer | null = null;
  events: SoundEvent[] = [];
  private nextLife = 10000;
  private fireTimer = 0;
  private saucerTimer = 18;
  private waveTimer = 0;
  private beatTimer = .8;
  private beat = 0;
  private jumpHeld = false;
  private random: () => number;

  constructor(best = 0, random = Math.random) {
    this.best = Number.isSafeInteger(best) && best >= 0 ? best : 0;
    this.random = random;
    this.spawnWave();
  }

  snapshot(): Snapshot {
    return { mode: this.mode, score: this.score, best: this.best, lives: this.lives, wave: this.wave };
  }

  start() {
    this.mode = "playing";
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.nextLife = 10000;
    this.fireTimer = 0;
    this.saucerTimer = 18;
    this.waveTimer = 0;
    this.beatTimer = .8;
    this.jumpHeld = false;
    this.ship = this.newShip();
    this.bullets = [];
    this.sparks = [];
    this.saucer = null;
    this.events = [];
    this.spawnWave();
  }

  pause() { if (this.mode === "playing") this.mode = "paused"; }
  resume() { if (this.mode === "paused") this.mode = "playing"; }
  drainSounds() { const events = this.events; this.events = []; return events; }

  private newShip(): Ship {
    return { x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0, angle: -Math.PI / 2, alive: true, respawn: 0, warp: 0 };
  }

  private between(min: number, max: number) { return min + this.random() * (max - min); }

  private rock(size: Rock["size"], x: number, y: number, vx?: number, vy?: number): Rock {
    const angle = this.between(0, TAU);
    const speed = this.between(35, 65) + (3 - size) * 28 + Math.min(this.wave, 12) * 4;
    return {
      x: wrap(x, WIDTH), y: wrap(y, HEIGHT), vx: vx ?? Math.cos(angle) * speed, vy: vy ?? Math.sin(angle) * speed,
      size, radius: radii[size], outline: outlines[Math.floor(this.random() * outlines.length)],
    };
  }

  private spawnWave() {
    this.rocks = [];
    const count = Math.min(4 + (this.wave - 1) * 2, 10);
    for (let i = 0; i < count; i++) {
      const side = Math.floor(this.random() * 4);
      this.rocks.push(this.rock(3, side < 2 ? this.between(0, WIDTH) : side === 2 ? 40 : WIDTH - 40, side >= 2 ? this.between(0, HEIGHT) : side === 0 ? 40 : HEIGHT - 40));
    }
  }

  private addScore(value: number) {
    this.score += value;
    this.best = Math.max(this.best, this.score);
    while (this.score >= this.nextLife) {
      this.lives++;
      this.nextLife += 10000;
      this.events.push({ type: "extra", value: 0 });
    }
  }

  private burst(x: number, y: number, radius: number) {
    for (let i = 0; i < 12; i++) {
      const angle = this.between(0, TAU);
      const speed = this.between(35, 130);
      const duration = this.between(.3, .9);
      this.sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, angle, length: this.between(2, radius / 3 + 3), life: duration, duration });
    }
    this.events.push({ type: "explosion", value: radius });
  }

  private breakRock(index: number, credit: boolean) {
    const rock = this.rocks.splice(index, 1)[0];
    if (credit) this.addScore(points[rock.size]);
    this.burst(rock.x, rock.y, rock.radius);
    if (rock.size > 1) {
      for (const direction of [-1, 1]) {
        const angle = Math.atan2(rock.vy, rock.vx) + direction * this.between(.65, 1.2);
        const speed = Math.hypot(rock.vx, rock.vy) * 1.45;
        this.rocks.push(this.rock((rock.size - 1) as Rock["size"], rock.x, rock.y, Math.cos(angle) * speed, Math.sin(angle) * speed));
      }
    }
  }

  private killShip() {
    if (!this.ship.alive) return;
    this.burst(this.ship.x, this.ship.y, 24);
    this.ship.alive = false;
    this.ship.respawn = 1.8;
    this.ship.warp = 0;
    this.lives--;
  }

  private safeAt(x: number, y: number) {
    const point = { x, y };
    return this.rocks.every(rock => distance(point, rock) > rock.radius + 90)
      && (!this.saucer || distance(point, this.saucer) > 110)
      && this.bullets.every(bullet => !bullet.enemy || distance(point, bullet) > 90);
  }

  private updateShip(dt: number, input: Controls) {
    const ship = this.ship;
    if (ship.warp > 0) {
      ship.warp = Math.max(0, ship.warp - dt);
      if (!ship.warp) {
        ship.x = this.between(0, WIDTH);
        ship.y = this.between(0, HEIGHT);
        ship.vx = ship.vy = 0;
        ship.alive = true;
        if (this.random() < .15) this.killShip();
      }
      return;
    }
    if (!ship.alive) {
      ship.respawn -= dt;
      if (ship.respawn <= 0) {
        if (this.lives <= 0) { this.mode = "over"; return; }
        // The original waits for a clear center rather than adding a shield.
        if (this.safeAt(WIDTH / 2, HEIGHT / 2)) this.ship = this.newShip();
      }
      return;
    }
    ship.angle += (Number(input.right) - Number(input.left)) * 4.2 * dt;
    if (input.thrust) {
      ship.vx += Math.cos(ship.angle) * 210 * dt;
      ship.vy += Math.sin(ship.angle) * 210 * dt;
    }
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > 420) { ship.vx *= 420 / speed; ship.vy *= 420 / speed; }
    ship.vx *= Math.exp(-.045 * dt);
    ship.vy *= Math.exp(-.045 * dt);
    ship.x = wrap(ship.x + ship.vx * dt, WIDTH);
    ship.y = wrap(ship.y + ship.vy * dt, HEIGHT);
    this.fireTimer -= dt;
    if (input.fire && this.fireTimer <= 0 && this.bullets.filter(bullet => !bullet.enemy).length < 4) {
      const dx = Math.cos(ship.angle), dy = Math.sin(ship.angle);
      this.bullets.push({ x: wrap(ship.x + dx * 18, WIDTH), y: wrap(ship.y + dy * 18, HEIGHT), vx: dx * 650 + ship.vx, vy: dy * 650 + ship.vy, life: 1.05, enemy: false });
      this.fireTimer = .14;
      this.events.push({ type: "fire", value: 0 });
    }
    if (input.hyperspace && !this.jumpHeld) {
      ship.alive = false;
      ship.warp = .65;
    }
  }

  private updateSaucer(dt: number) {
    this.saucerTimer -= dt;
    if (!this.saucer && this.saucerTimer <= 0 && this.rocks.length) {
      const direction = this.random() < .5 ? 1 : -1;
      const small = this.random() < Math.min(.85, .15 + this.score / 18000);
      this.saucer = { x: direction > 0 ? -25 : WIDTH + 25, y: this.between(100, HEIGHT - 80), vx: direction * 125, vy: 0, small, travel: 0, turn: 1, shot: 1 };
    }
    const saucer = this.saucer;
    if (!saucer) return;
    saucer.travel += Math.abs(saucer.vx) * dt;
    saucer.x += saucer.vx * dt;
    saucer.y = wrap(saucer.y + saucer.vy * dt, HEIGHT);
    saucer.turn -= dt;
    if (saucer.turn <= 0) { saucer.vy = [-65, 0, 65][Math.floor(this.random() * 3)]; saucer.turn = this.between(.6, 1.8); }
    saucer.shot -= dt;
    if (saucer.shot <= 0) {
      let angle = this.between(0, TAU);
      if (saucer.small && this.ship.alive) {
        angle = Math.atan2(delta(this.ship.y, saucer.y, HEIGHT), delta(this.ship.x, saucer.x, WIDTH));
        angle += this.between(-1, 1) * Math.max(.025, .5 - this.score / 40000);
      }
      this.bullets.push({ x: wrap(saucer.x, WIDTH), y: saucer.y, vx: Math.cos(angle) * 400, vy: Math.sin(angle) * 400, life: 1.8, enemy: true });
      saucer.shot = saucer.small ? .85 : 1.2;
    }
    if (saucer.travel > WIDTH + 60) this.removeSaucer(false);
  }

  private removeSaucer(explode: boolean) {
    if (explode && this.saucer) this.burst(this.saucer.x, this.saucer.y, this.saucer.small ? 15 : 28);
    this.saucer = null;
    this.saucerTimer = this.between(10, 20);
  }

  step(dt: number, input: Controls = NO_CONTROLS) {
    if (this.mode !== "playing") return;
    this.updateShip(dt, input);
    this.jumpHeld = input.hyperspace;
    if (this.mode !== "playing") return;
    for (const rock of this.rocks) { rock.x = wrap(rock.x + rock.vx * dt, WIDTH); rock.y = wrap(rock.y + rock.vy * dt, HEIGHT); }
    this.updateSaucer(dt);
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.life -= dt;
      let hit = bullet.life <= 0;
      if (!hit) {
        const rockIndex = this.rocks.findIndex(rock => shotHits(bullet, rock, rock.radius * .85, dt));
        if (rockIndex !== -1) { this.breakRock(rockIndex, !bullet.enemy); hit = true; }
        else if (!bullet.enemy && this.saucer && shotHits(bullet, this.saucer, this.saucer.small ? 14 : 26, dt)) {
          this.addScore(this.saucer.small ? 1000 : 200);
          this.removeSaucer(true);
          hit = true;
        } else if (bullet.enemy && this.ship.alive && shotHits(bullet, this.ship, 10, dt)) {
          this.killShip(); hit = true;
        }
      }
      if (hit) this.bullets.splice(i, 1);
      else { bullet.x = wrap(bullet.x + bullet.vx * dt, WIDTH); bullet.y = wrap(bullet.y + bullet.vy * dt, HEIGHT); }
    }
    if (this.saucer) {
      const index = this.rocks.findIndex(rock => distance(rock, this.saucer!) < rock.radius * .8 + (this.saucer!.small ? 10 : 20));
      if (index !== -1) { this.breakRock(index, false); this.removeSaucer(true); }
    }
    if (this.ship.alive) {
      const index = this.rocks.findIndex(rock => distance(rock, this.ship) < rock.radius * .8 + 9);
      if (index !== -1) { this.breakRock(index, false); this.killShip(); }
      else if (this.saucer && distance(this.saucer, this.ship) < (this.saucer.small ? 12 : 24) + 9) { this.removeSaucer(true); this.killShip(); }
    }
    this.sparks = this.sparks.filter(spark => {
      spark.life -= dt;
      spark.x = wrap(spark.x + spark.vx * dt, WIDTH);
      spark.y = wrap(spark.y + spark.vy * dt, HEIGHT);
      return spark.life > 0;
    });
    if (!this.rocks.length) {
      this.waveTimer += dt;
      if (this.waveTimer >= 2) { this.wave++; this.waveTimer = 0; this.spawnWave(); }
    } else this.waveTimer = 0;
    this.beatTimer -= dt;
    if (this.beatTimer <= 0 && this.ship.alive) {
      this.events.push({ type: "beat", value: this.beat++ % 2 });
      const mass = this.rocks.reduce((total, rock) => total + (rock.size === 3 ? 4 : rock.size === 2 ? 2 : 1), 0);
      this.beatTimer = .15 + .65 * Math.min(1, mass / (Math.min(4 + (this.wave - 1) * 2, 10) * 4));
    }
  }
}
