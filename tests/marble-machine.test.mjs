import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BASE_RAIL, MARBLE_RADIUS, MarbleMachine, NODE_COUNT } from '../app/components/marble-machine/model.ts';

const settle = machine => { for (let i = 0; i < 180; i++) machine.advance(1 / 60, false); };
const distanceToRail = (machine, point) => {
  let minimum = Infinity;
  for (let i = 0; i < NODE_COUNT; i++) {
    const a = machine.points[i], b = machine.points[(i + 1) % NODE_COUNT], dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
    minimum = Math.min(minimum, Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t));
  }
  return minimum;
};

test('one marble completes a continuous, mechanically paced closed loop', () => {
  const machine = new MarbleMachine(); let previous = machine.marble();
  for (let i = 0; i < 60 * 80; i++) {
    machine.advance(1 / 60); const marble = machine.marble();
    assert.ok(Math.hypot(marble.x - previous.x, marble.y - previous.y) < 3.5, 'no teleport at the return transfer');
    assert.ok(machine.phase >= 0 && machine.phase < 1); previous = marble;
  }
  assert.ok(machine.laps >= 3); assert.ok(machine.rotation > 100);
  assert.equal(machine.points.length, NODE_COUNT);
});

test('upper, lower, passage and lift rails make room around an obstruction', () => {
  for (const clearance of [48, 58, 76]) for (const index of [12, 24, 40, 61, 73, 91, 111, 137, 159, 171]) {
    for (const side of [-22, 0, 22]) {
      const machine = new MarbleMachine(), base = BASE_RAIL[index]; machine.clearance = clearance;
      const point = { x: base.x + base.nx * side, y: base.y + base.ny * side };
      machine.setPointer(point); settle(machine);
      const gap = distanceToRail(machine, point);
      assert.ok(gap >= clearance - 4, `node ${index}, side ${side}, clearance ${clearance}: gap ${gap}`);
      assert.ok(machine.offsets.some(n => n > 10));
      assert.equal(machine.settling, false);
      assert.ok(machine.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
    }
  }
});

test('moving away folds the exact original rail back without overshoot', () => {
  const machine = new MarbleMachine(); machine.setPointer(BASE_RAIL[38]); settle(machine);
  machine.setPointer(null);
  let previous = Math.max(...machine.offsets);
  for (let i = 0; i < 180; i++) {
    machine.advance(1 / 60, false); const current = Math.max(...machine.offsets);
    assert.ok(current <= previous + .00001 && Math.min(...machine.offsets) >= -1e-8); previous = current;
  }
  assert.deepEqual(machine.points, BASE_RAIL.map(p => ({ x: p.x, y: p.y })));
  assert.equal(machine.bridge, 0); assert.equal(machine.platform, 0); assert.equal(machine.gate, 0);
});

test('the marble waits for the rail to make room, then carries on safely', () => {
  const machine = new MarbleMachine(), point = machine.marble(), start = machine.phase;
  machine.setPointer(point); machine.advance(1 / 60);
  assert.equal(machine.waiting, true); assert.equal(machine.phase, start);
  let moved = false;
  for (let i = 0; i < 180; i++) {
    machine.advance(1 / 60);
    if (i > 50) {
      const ball = machine.marble();
      assert.ok(Math.hypot(ball.x - point.x, ball.y - point.y) >= machine.clearance - 5);
    }
    moved ||= machine.phase !== start;
  }
  assert.equal(moved, true);
  machine.setPointer(null); for (let i = 0; i < 60 * 28; i++) machine.advance(1 / 60);
  assert.ok(machine.laps >= 1);
});

test('each mechanism follows its own rail, with immediate reduced-motion poses', () => {
  const machine = new MarbleMachine(); const phase = machine.phase;
  machine.setPointer(BASE_RAIL[29], true); assert.ok(machine.bridge > .4);
  machine.setPointer(BASE_RAIL[111], true); assert.ok(machine.platform > .4);
  machine.setPointer(BASE_RAIL[73], true); assert.ok(machine.gate > .4);
  assert.equal(machine.settling, false); assert.equal(machine.phase, phase); assert.equal(machine.time, 0);
  machine.setPointer(null, true); assert.ok(machine.offsets.every(n => n === 0));
  assert.ok(machine.clearance > MARBLE_RADIUS);
});

test('rapid input, frame stalls and paused interaction keep the mechanism finite', () => {
  const machine = new MarbleMachine(), phase = machine.phase;
  for (let i = 0; i < 800; i++) {
    machine.setPointer(i % 5 ? BASE_RAIL[(i * 37) % NODE_COUNT] : null);
    machine.advance(i % 3 ? 1 / 30 : 5, false);
  }
  assert.equal(machine.phase, phase); assert.equal(machine.time, 0);
  assert.ok(machine.offsets.every(Number.isFinite)); assert.ok(machine.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
  machine.setPointer(null); settle(machine); assert.ok(machine.offsets.every(n => n === 0));
});

test('a stationary visitor anywhere along the loop cannot permanently strand the marble', () => {
  for (const index of [0, 12, 24, 40, 61, 73, 91, 111, 137, 159, 171]) {
    const machine = new MarbleMachine(); machine.clearance = 76;
    machine.phase = index / NODE_COUNT;
    machine.setPointer(BASE_RAIL[index]);
    for (let i = 0; i < 30 * 90; i++) machine.advance(1 / 30);
    assert.ok(machine.laps >= 1, `no full lap around obstruction at ${index}`);
  }
});

test('the visible marble stays at least eleven screen pixels across on phone and desktop views', async () => {
  const { visibleRadius } = await import('../app/components/marble-machine/model.ts');
  for (const [scale, viewport] of [[.32, 1], [.53, .38], [.6, 1], [1.3, 1]]) {
    assert.ok(visibleRadius(scale, viewport) * scale * viewport * 2 >= 10.999);
  }
});
