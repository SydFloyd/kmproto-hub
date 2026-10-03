import test from "node:test";
import assert from "node:assert/strict";
import { Asteroids, WIDTH, HEIGHT, STEP, NO_CONTROLS, shotHits } from "../app/lab/games/asteroids/engine.ts";

const rock = (size = 3, x = 100, y = 100) => ({ size, x, y, vx: 0, vy: 0, radius: { 1: 13, 2: 26, 3: 48 }[size], outline: Array(12).fill(1) });
const bullet = (x, y, enemy = false) => ({ x, y, vx: 0, vy: 0, life: 1, enemy });
const game = (random = () => .5) => { const result = new Asteroids(0, random); result.start(); result.rocks = [rock()]; return result; };
const advance = (game, seconds, input = NO_CONTROLS) => { for (let i = 0; i < Math.ceil(seconds / STEP); i++) { game.step(STEP, input); game.drainSounds(); } };
const hit = (game, target, enemy = false) => { game.bullets = [bullet(target.x, target.y, enemy)]; game.step(STEP); };

test("thrust builds momentum, which persists after release; rotation does not steer existing velocity", () => {
  const g = game();
  advance(g, 1, { ...NO_CONTROLS, thrust: true });
  const { vx, vy, y } = g.ship;
  assert.ok(vy < -190);
  advance(g, .5, { ...NO_CONTROLS, right: true });
  assert.ok(g.ship.y < y - 90);
  assert.ok(Math.abs(g.ship.vx - vx) < .01);
  assert.ok(Math.abs(g.ship.vy - vy) < 6);
  assert.ok(g.ship.angle > 0);
});

test("ships, rocks and shots wrap; swept shots hit across a screen edge", () => {
  const g = game();
  g.ship.x = WIDTH - 1; g.ship.vx = 120;
  g.rocks = [{ ...rock(1, 200, HEIGHT - 1), vy: 120 }];
  g.bullets = [{ ...bullet(WIDTH - 1, 100), vx: 120 }];
  g.step(STEP * 2);
  assert.ok(g.ship.x < 2);
  assert.ok(g.rocks[0].y < 2);
  assert.ok(g.bullets[0].x < 2);
  const fast = { ...bullet(WIDTH - 3, 100), vx: 1200 };
  assert.equal(shotHits(fast, { x: 6, y: 100 }, 3, STEP), true);
  assert.equal(shotHits(fast, { x: 6, y: 130 }, 3, STEP), false);
});

test("at most four player shots; expired shots free slots for held fire", () => {
  const g = game();
  let shots = 0;
  for (let i = 0; i < 240; i++) {
    g.step(STEP, { ...NO_CONTROLS, fire: true });
    assert.ok(g.bullets.filter(b => !b.enemy).length <= 4);
    shots += g.drainSounds().filter(event => event.type === "fire").length;
  }
  assert.ok(shots > 4);
});

test("large and medium rocks split in two; scoring is 20, 50, then 100", () => {
  const g = game();
  hit(g, g.rocks[0]);
  assert.equal(g.score, 20);
  assert.deepEqual(g.rocks.map(r => r.size), [2, 2]);
  hit(g, g.rocks[0]);
  assert.equal(g.score, 70);
  assert.deepEqual(g.rocks.map(r => r.size), [2, 1, 1]);
  g.rocks[1].x = 300; // Aim at a small fragment after it separates from the others.
  hit(g, g.rocks[1]);
  assert.equal(g.score, 170);
  assert.equal(g.rocks.length, 2);
});

test("saucer fire and ship crashes break rocks without awarding points", () => {
  const g = game();
  hit(g, g.rocks[0], true);
  assert.equal(g.score, 0);
  g.rocks = [rock(1, g.ship.x, g.ship.y)];
  g.step(STEP);
  assert.equal(g.score, 0);
  assert.equal(g.lives, 2);
  assert.equal(g.ship.alive, false);
});

test("a bonus ship is awarded on crossing 10,000, and restart retains the high score", () => {
  const g = game();
  g.score = 9980;
  hit(g, g.rocks[0]);
  assert.equal(g.score, 10000);
  assert.equal(g.best, 10000);
  assert.equal(g.lives, 4);
  hit(g, g.rocks[0]);
  assert.equal(g.lives, 4);
  g.start();
  assert.equal(g.score, 0);
  assert.equal(g.best, 10050);
  assert.equal(g.lives, 3);
});

test("clear waves progress from four rocks to six, eight and ten", () => {
  const g = new Asteroids(0, () => .5); g.start();
  assert.equal(g.rocks.length, 4);
  for (const count of [6, 8, 10, 10]) {
    g.rocks = [];
    advance(g, 2.01);
    assert.equal(g.rocks.length, count);
  }
  assert.equal(g.wave, 5);
});

test("respawn waits for a clear center", () => {
  const g = game();
  hit(g, g.ship, true);
  assert.equal(g.lives, 2);
  g.rocks = [rock(3, WIDTH / 2, HEIGHT / 2)];
  advance(g, 2);
  assert.equal(g.ship.alive, false);
  g.rocks = [rock()];
  g.step(STEP);
  assert.equal(g.ship.alive, true);
  assert.equal(g.ship.x, WIDTH / 2);
});

test("the last destroyed ship ends the game after its explosion", () => {
  const g = game(); g.lives = 1;
  hit(g, g.ship, true);
  assert.equal(g.mode, "playing");
  assert.equal(g.lives, 0);
  advance(g, 2);
  assert.equal(g.mode, "over");
  g.start();
  assert.equal(g.mode, "playing");
  assert.equal(g.ship.alive, true);
  assert.equal(g.lives, 3);
});

test("hyperspace relocates once per press and has a reentry risk", () => {
  const g = game(); g.ship.x = 700; g.ship.vx = 100;
  const input = { ...NO_CONTROLS, hyperspace: true };
  g.step(STEP, input);
  assert.equal(g.ship.alive, false);
  advance(g, .7, input);
  assert.equal(g.ship.alive, true);
  assert.equal(g.ship.x, WIDTH / 2);
  assert.equal(g.ship.vx, 0);
  assert.equal(g.lives, 3);
  const risky = game(() => .01);
  risky.step(STEP, input);
  advance(risky, .7, input);
  assert.equal(risky.lives, 2);
  assert.equal(risky.ship.alive, false);
});

test("small saucers aim at the ship; both saucer sizes award their original scores", () => {
  for (const [small, points] of [[false, 200], [true, 1000]]) {
    const g = game();
    g.saucer = { x: 200, y: 200, vx: 0, vy: 0, small, travel: 0, turn: 10, shot: 10 };
    hit(g, g.saucer);
    assert.equal(g.score, points);
    assert.equal(g.saucer, null);
  }
  const g = game(); g.ship.x = 600; g.ship.y = 300;
  g.saucer = { x: 200, y: 300, vx: 0, vy: 0, small: true, travel: 0, turn: 10, shot: 0 };
  g.step(STEP);
  assert.equal(g.bullets[0].enemy, true);
  assert.equal(g.bullets[0].vx, 400);
  assert.equal(g.bullets[0].vy, 0);
});

test("saucers enter on their timer and leave after crossing the playfield", () => {
  const g = game(); advance(g, 18.1);
  assert.ok(g.saucer);
  g.saucer.travel = WIDTH + 59;
  g.step(.1);
  assert.equal(g.saucer, null);
});

test("ready and paused games do not advance physics or consume lives", () => {
  const g = new Asteroids();
  const before = JSON.stringify(g.snapshot());
  advance(g, 30, { ...NO_CONTROLS, fire: true, thrust: true });
  assert.equal(JSON.stringify(g.snapshot()), before);
  g.start(); g.pause();
  const paused = JSON.stringify([g.ship, g.rocks, g.bullets, g.snapshot()]);
  advance(g, 30, { ...NO_CONTROLS, fire: true, thrust: true });
  assert.equal(JSON.stringify([g.ship, g.rocks, g.bullets, g.snapshot()]), paused);
  g.resume();
  g.step(STEP, { ...NO_CONTROLS, thrust: true });
  assert.notEqual(g.ship.vy, 0);
});
