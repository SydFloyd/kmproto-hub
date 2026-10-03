import test from "node:test";
import assert from "node:assert/strict";
import { Contra, IDLE, STEP, STAGES, GRAVITY, segmentBox, aimFor } from "../app/lab/games/contra/engine.ts";

const create = (count = 1) => { const game = new Contra(0, () => .5); game.start(count); return game; };
const advance = (game, seconds, one = IDLE, two = IDLE) => { for (let i = 0; i < Math.ceil(seconds / STEP); i++) { game.step(STEP, [one, two]); game.drainSounds(); } };
const empty = game => { game.enemies = []; game.crates = []; game.boss.active = false; };
const shot = (x, y, owner = 0, weapon = "N", vx = 0, vy = 0) => ({ x, y, owner, weapon, vx, vy, age: 0, life: 2, damage: weapon === "L" ? 3 : 1, hits: new Set() });
const hurt = (game, player = game.players[0]) => { player.invincible = player.shield = 0; game.shots = [shot(player.x, player.y - 14, -1, "enemy")]; game.step(STEP); };

test("eight complete zones include both base stages and a climbable waterfall", () => {
  assert.equal(STAGES.length, 8);
  assert.deepEqual(STAGES.map(stage => stage.kind), ["side", "base", "vertical", "base", "side", "side", "side", "side"]);
  const game = create(); game.stageIndex = 2; game.continueGame();
  game.mode = "over"; game.continueGame();
  const ys = [...new Set(game.platforms.map(p => p.y))].sort((a, b) => b - a);
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i - 1] - ys[i] <= 260 ** 2 / (2 * GRAVITY), `Unreachable platform: ${ys[i - 1]} to ${ys[i]}`);
});

test("running, somersault jumping, landing and edge-triggered jump work", () => {
  const g = create(); empty(g);
  advance(g, .4, { ...IDLE, right: true });
  assert.ok(g.players[0].x > 70);
  assert.equal(g.players[0].grounded, true);
  const start = g.players[0].y;
  advance(g, .3, { ...IDLE, jump: true });
  assert.ok(g.players[0].y < start - 40);
  advance(g, .8, { ...IDLE, jump: true });
  assert.equal(g.players[0].grounded, true);
  assert.equal(g.players[0].y, start);
  advance(g, .1);
  g.step(STEP, [{ ...IDLE, jump: true }]);
  assert.ok(g.players[0].vy < 0);
});

test("Down crouches; Down + Jump drops through a one-way platform", () => {
  const g = create(); empty(g);
  advance(g, .1, { ...IDLE, down: true, fire: true });
  assert.equal(g.players[0].prone, true);
  assert.equal(g.shots[0].vy, 0);
  const p = g.players[0]; p.x = 330; p.y = 174; p.grounded = true; p.vy = 0; p.jumpHeld = false;
  advance(g, .4, { ...IDLE, down: true, jump: true });
  assert.ok(p.y > 174);
  assert.equal(p.grounded, true);
  assert.equal(p.y, 216);
});

test("aiming covers eight directions; downward fire is available in the air", () => {
  const p = create().players[0]; p.grounded = false;
  assert.equal(aimFor(p, { ...IDLE, up: true }), -Math.PI / 2);
  assert.equal(aimFor(p, { ...IDLE, down: true }), Math.PI / 2);
  assert.equal(aimFor(p, { ...IDLE, up: true, right: true }), -Math.PI / 4);
  assert.equal(aimFor(p, { ...IDLE, up: true, left: true }), -Math.PI * 3 / 4);
  assert.equal(aimFor(p, { ...IDLE, down: true, right: true }), Math.PI / 4);
  p.grounded = true; p.prone = true; p.facing = -1;
  assert.equal(aimFor(p, { ...IDLE, down: true }), Math.PI);
  assert.equal(aimFor(p, { ...IDLE, right: true }, true), -Math.PI / 2);
});

test("five-shot spread, piercing laser and machine gun behave differently", () => {
  const g = create(); empty(g);
  g.players[0].weapon = "S";
  g.step(STEP, [{ ...IDLE, fire: true }]);
  assert.equal(g.shots.length, 5);
  assert.ok(g.shots.some(b => b.vy < 0) && g.shots.some(b => b.vy > 0));
  advance(g, .5, { ...IDLE, fire: true });
  assert.ok(g.shots.length <= 20);
  g.players[0].weapon = "L"; g.players[0].cooldown = 0; g.shots = [];
  g.enemies = [110, 117].map((x, id) => ({ id: 1000 + id, type: "runner", x, y: 216, vx: 0, vy: 0, hp: 1, maxHp: 1, shot: 100, grounded: true, active: true, facing: -1 }));
  g.shots = [shot(105, 199, 0, "L", 2000)];
  g.step(STEP);
  assert.equal(g.enemies.filter(e => e.hp > 0).length, 0);
  assert.equal(g.players[0].score, 200);
  const normal = create(), machine = create(); empty(normal); empty(machine); machine.players[0].weapon = "M";
  advance(normal, .6, { ...IDLE, fire: true }); advance(machine, .6, { ...IDLE, fire: true });
  assert.ok(machine.shots.length > normal.shots.length);
});

test("all weapon badges, rapid fire and timed barrier can be collected", () => {
  const g = create(); empty(g); const p = g.players[0];
  for (const power of ["M", "S", "L", "F", "R", "B"]) {
    g.pickups = [{ x: p.x, y: p.y - 12, vy: 0, power, life: 10 }];
    g.step(STEP);
    if (power === "R") assert.equal(p.rapid, true);
    else if (power === "B") assert.equal(p.shield, 10);
    else assert.equal(p.weapon, power);
    assert.equal(g.pickups.length, 0);
  }
  assert.equal(p.score, 600);
  advance(g, 10.1);
  assert.equal(p.shield, 0);
});

test("shooting a capsule releases its badge without giving the weapon early", () => {
  const g = create(); empty(g);
  g.crates = [{ id: 400, x: 120, y: 200, originY: 200, power: "S", hp: 1, flying: false }];
  g.shots = [shot(120, 200)]; g.step(STEP);
  assert.equal(g.crates[0].hp, 0);
  assert.equal(g.pickups[0].power, "S");
  assert.equal(g.players[0].weapon, "N");
});

test("one hit loses a life and weapon, followed by a protected respawn", () => {
  const g = create(); empty(g); const p = g.players[0]; p.weapon = "S"; p.rapid = true;
  hurt(g);
  assert.equal(p.alive, false); assert.equal(p.lives, 2); assert.equal(p.weapon, "N"); assert.equal(p.rapid, false);
  advance(g, 1.2);
  assert.equal(p.alive, true); assert.ok(p.invincible > 2);
  g.shots = [shot(p.x, p.y - 14, -1, "enemy")]; g.step(STEP);
  assert.equal(p.lives, 2);
});

test("river swimming stops at the bank and a jump clears it", () => {
  const g = create(); empty(g); const p = g.players[0]; p.x = 700; p.y = 233; p.swimming = true; p.grounded = true;
  advance(g, .6, { ...IDLE, right: true });
  assert.equal(p.x, 723);
  advance(g, .85, { ...IDLE, right: true, jump: true });
  assert.ok(p.x > 728); assert.equal(p.y, 216); assert.equal(p.swimming, false);
});

test("swept collision catches fast bullets and rejects near misses", () => {
  assert.equal(segmentBox(20, 100, 200, 0, 110, 95, 10, 10), true);
  assert.equal(segmentBox(20, 100, 200, 0, 110, 110, 10, 10), false);
  assert.equal(segmentBox(110, 70, 0, 70, 105, 95, 10, 10), true);
});

test("gun pods shield the core; destroying them permits a zone clear and bonus life", () => {
  const g = create(); empty(g); g.players[0].x = 2300; g.cameraX = 2080;
  const core = g.boss.nodes.find(n => n.core), initial = core.hp;
  g.shots = [shot(core.x, core.y)]; g.step(STEP);
  assert.equal(core.hp, initial);
  for (const pod of g.boss.nodes.filter(n => !n.core)) {
    pod.hp = 1; g.shots = [shot(pod.x, pod.y)]; g.step(STEP);
    assert.equal(pod.hp, 0);
  }
  core.hp = 1; g.shots = [shot(core.x, core.y)]; g.step(STEP);
  assert.equal(g.mode, "clear"); assert.equal(g.players[0].lives, 4);
  advance(g, 2.5);
  assert.equal(g.stageIndex, 1); assert.equal(g.mode, "playing");
});

test("base rooms require cleared sensors and Up to advance", () => {
  const g = create(); g.stageIndex = 1; g.mode = "over"; g.continueGame();
  advance(g, .1, { ...IDLE, up: true }); assert.equal(g.room, 0);
  for (const node of g.boss.nodes) node.hp = node.core ? 1 : 0;
  const core = g.boss.nodes.find(n => n.core);
  g.shots = [shot(core.x, core.y)]; g.step(STEP);
  assert.equal(g.boss.roomClear, true); assert.equal(g.mode, "playing");
  advance(g, .7); assert.equal(g.room, 0);
  g.step(STEP, [{ ...IDLE, up: true }]); assert.equal(g.room, 1); assert.equal(g.boss.roomClear, false);
});

test("the full campaign clears all rooms, awards lives, and ends in victory", () => {
  const g = create(2);
  for (let zone = 0; zone < STAGES.length; zone++) {
    assert.equal(g.stageIndex, zone);
    for (let room = 0; room < Math.max(1, g.stage.rooms); room++) {
      g.enemies = []; g.crates = []; g.shots = [];
      if (g.stage.kind === "side") { g.cameraX = g.stage.width - 320; for (const p of g.players) p.x = g.boss.x - 50 - p.id * 20; }
      else if (g.stage.kind === "vertical") { g.cameraY = 0; for (const p of g.players) { p.x = 80 + p.id * 80; p.y = 116; p.vy = 0; } }
      for (const node of g.boss.nodes) node.hp = node.core ? 1 : 0;
      const core = g.boss.nodes.find(n => n.core); g.shots = [shot(core.x, core.y)]; g.step(STEP);
      if (room < g.stage.rooms - 1) { advance(g, .6); g.step(STEP, [{ ...IDLE, up: true }]); assert.equal(g.room, room + 1); }
    }
    assert.equal(g.mode, "clear");
    advance(g, 2.5);
  }
  assert.equal(g.mode, "won");
  assert.equal(g.players[0].lives, 11); assert.equal(g.players[1].lives, 11);
  assert.ok(g.best > 0);
});

test("co-op has independent inputs and lives; game over requires both to be out", () => {
  const g = create(2); empty(g);
  advance(g, .2, { ...IDLE, right: true }, { ...IDLE, left: true });
  assert.ok(g.players[0].x > 36); assert.ok(g.players[1].x < 66);
  g.players[0].lives = 1; hurt(g, g.players[0]); advance(g, 1.2);
  assert.equal(g.mode, "playing"); assert.equal(g.players[1].lives, 3);
  g.players[1].lives = 1; hurt(g, g.players[1]); advance(g, 1.2);
  assert.equal(g.mode, "over");
});

test("three continues restart the current zone, then are exhausted", () => {
  const g = create(); g.stageIndex = 4; g.players[0].score = 500; g.best = 500;
  for (let i = 2; i >= 0; i--) {
    g.mode = "over"; g.players[0].lives = 0; g.continueGame();
    assert.equal(g.mode, "playing"); assert.equal(g.continues, i); assert.equal(g.stageIndex, 4); assert.equal(g.players[0].lives, 3); assert.equal(g.players[0].score, 500);
  }
  g.mode = "over"; g.continueGame(); assert.equal(g.mode, "over");
  g.start(); assert.equal(g.continues, 3); assert.equal(g.stageIndex, 0); assert.equal(g.best, 500);
});

test("the optional 30-life code affects both players", () => {
  const g = new Contra(); g.thirtyLives = true; g.start(2);
  assert.deepEqual(g.players.map(p => p.lives), [30, 30]);
});

test("pause freezes action and stage transitions", () => {
  const g = create(); g.pause();
  const before = JSON.stringify([g.players, g.enemies, g.time, g.cameraX]);
  advance(g, 5, { ...IDLE, right: true, fire: true, jump: true });
  assert.equal(JSON.stringify([g.players, g.enemies, g.time, g.cameraX]), before);
  g.resume(); empty(g); g.players[0].x = 2300; g.cameraX = 2080;
  for (const node of g.boss.nodes) node.hp = node.core ? 1 : 0;
  const core = g.boss.nodes.find(n => n.core); g.shots = [shot(core.x, core.y)]; g.step(STEP);
  assert.equal(g.mode, "clear");
  g.pause(); advance(g, 5); assert.equal(g.stageIndex, 0);
  g.resume(); assert.equal(g.mode, "clear");
  advance(g, 2.5); assert.equal(g.stageIndex, 1);
});

test("control inputs traverse all eight zones and defeat full-health bosses", () => {
  const g = create(), cleared = new Set();
  let lastStage = -1;
  for (let i = 0; i < 120 * 300 && g.mode !== "won"; i++) {
    const p = g.players[0], controls = { ...IDLE, fire: true };
    if (g.stageIndex !== lastStage) {
      lastStage = g.stageIndex; cleared.add(lastStage);
      // Isolate navigation and offensive mechanics from enemy-dodging skill.
      p.invincible = 100000;
    }
    if (g.stage.kind === "base") {
      if (g.boss.roomClear) controls.up = true;
      else {
        const target = g.boss.nodes.find(n => !n.core && n.hp > 0) ?? g.boss.nodes.find(n => n.core);
        controls.right = p.x < target.x - 2; controls.left = p.x > target.x + 2;
      }
    } else if (g.stage.kind === "vertical") {
      const target = g.boss.active ? g.boss.nodes.find(n => !n.core && n.hp > 0) ?? g.boss.nodes.find(n => n.core) : { x: 155 };
      controls.right = p.x < target.x - 2; controls.left = p.x > target.x + 2;
      controls.jump = p.grounded && !p.jumpHeld && (!g.boss.active || p.y > 116);
      controls.up = true;
    } else {
      const nearBoss = p.x >= g.boss.x - 75;
      controls.right = !nearBoss;
      const gap = g.stage.gaps.some(([left, right]) => p.x < right && p.x > left - 5);
      controls.jump = p.grounded && !p.jumpHeld && (gap || p.swimming || (nearBoss && g.boss.nodes.some(n => !n.core && n.hp > 0 && n.y < 170)));
    }
    g.step(STEP, [controls]); g.drainSounds();
    assert.equal(p.alive, true, `Fall in zone ${g.stageIndex + 1}`);
  }
  assert.equal(cleared.size, 8);
  assert.equal(g.mode, "won");
  assert.equal(g.players[0].lives, 11);
  assert.ok(g.score > 80000);
});
