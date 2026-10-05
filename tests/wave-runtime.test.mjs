import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WAVE_BUDGETS, WaveBudget } from '../app/components/ripple-tank/budget.ts';
import { poolLayout, copyOpacity } from '../app/components/ripple-tank/geometry.ts';
import { WaveSimulation } from '../app/components/ripple-tank/simulation.ts';

const config = { generation: 1, columns: 44, rows: 25, placement: { x: 30, y: 13, size: 15 } };
test('startup is exactly still, with no monogram revealed', () => {
  const simulation = new WaveSimulation();
  let frame = simulation.configure(config);
  for (let i = 0; i < 240; i++) frame = simulation.tick(4, null, frame.buffer);
  assert.equal(frame.active, false);
  const pixels = new Uint8Array(frame.buffer);
  for (let i = 0; i < pixels.length; i += 4) assert.deepEqual([...pixels.slice(i, i + 4)], [128, 0, 0, 255]);
});
test('phone, desktop, desktop-on-phone and full screen all obey node and pixel budgets', () => {
  for (const [width, height, density] of [[390, 850, 3], [1024, 560, 1.2], [1440, 709, 2], [3840, 2160, 2], [320, 1000, 4]]) {
    for (const tier of [0, 1, 2]) {
      const budget = WAVE_BUDGETS[tier], zone = { x: width * .5, y: 0, width: width * .5, height };
      const layout = poolLayout(width, height, zone, null, tier, density);
      let water = 0, letters = 0;
      for (let i = 5; i < layout.points.length; i += 6) { if (layout.points[i]) letters++; else water++; }
      assert.ok(water <= budget.water, `${water} water nodes > ${budget.water}`);
      assert.ok(letters <= budget.letters);
      assert.ok(layout.columns * layout.rows <= budget.physics);
      assert.ok(width * height * layout.ratio ** 2 <= budget.pixels + 1);
      assert.ok(letters > 100, 'letter detail remains independent of solver size');
    }
  }
});
test('a pebble has signed coherent waves, reveals the offset logo, and reuses the transfer buffer', () => {
  const simulation = new WaveSimulation(); let frame = simulation.configure(config);
  const buffer = frame.buffer;
  frame = simulation.tick(4, { x: .5, y: .5, drop: true }, buffer);
  let peak = 0;
  for (let i = 0; i < 250; i++) {
    frame = simulation.tick(4, null, frame.buffer);
    assert.equal(frame.buffer, buffer);
    peak = Math.max(peak, ...simulation.water.reveal);
  }
  assert.ok(peak > .015);
  assert.ok(simulation.water.height.every(Number.isFinite));
  for (let i = 0; i < 600; i++) frame = simulation.tick(12, null, frame.buffer);
  assert.equal(frame.active, false);
  assert.ok(simulation.water.height.every(value => value === 0));
});
test('a stalled frame and enormous pointer jump have bounded catch-up', () => {
  const simulation = new WaveSimulation(); let frame = simulation.configure(config);
  let steps = 0, wakes = 0;
  const original = simulation.water.step.bind(simulation.water);
  simulation.water.step = () => { steps++; original(); };
  const wake = simulation.water.wake.bind(simulation.water);
  simulation.water.wake = (...args) => { wakes++; wake(...args); };
  frame = simulation.tick(1e9, { x: 1, y: 1, fromX: 0, fromY: 0 }, frame.buffer);
  assert.equal(steps, 12); assert.equal(wakes, 16);
  assert.equal(frame.buffer.byteLength, config.columns * config.rows * 4);
});
test('quality reduction requires sustained pressure, and ultimately stops continuous motion', () => {
  const budget = new WaveBudget(2); budget.reset(0);
  assert.equal(budget.observe(100, 100, 40, 33), 'keep');
  let now = 1000;
  const sample = (slow, count) => { let decision; for (let i = 0; i < count; i++) { now += 35; decision = budget.observe(now, slow ? 80 : 33, slow ? 12 : 1, 33); if (decision !== 'keep') return decision; } return decision; };
  assert.equal(sample(false, 18), 'keep'); assert.equal(budget.tier, 2);
  now += 1000;
  assert.equal(sample(true, 18), 'reduce'); assert.equal(budget.tier, 1);
  now += 1000;
  assert.equal(sample(true, 18), 'reduce'); assert.equal(budget.tier, 0);
  now += 1000;
  assert.equal(sample(true, 18), 'rest'); assert.equal(budget.tier, 0);
});
test('text protection attenuates only the copy and feathers continuously into the pool', () => {
  const copy = { x: 30, y: 20, width: 450, height: 300 };
  assert.equal(copyOpacity(100, 100, copy, 1440), .1);
  assert.equal(copyOpacity(800, 100, copy, 1440), 1);
  const edge = copyOpacity(481, 100, copy, 1440);
  assert.ok(edge > .1 && edge < .101);
});
