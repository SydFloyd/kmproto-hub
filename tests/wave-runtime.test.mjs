import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WAVE_BUDGETS, WaveBudget, wavePixelBudget } from '../app/components/ripple-tank/budget.ts';
import { poolLayout, copyOpacity } from '../app/components/ripple-tank/geometry.ts';
import { WaveSimulation } from '../app/components/ripple-tank/simulation.ts';
import { currentHeight } from '../app/components/ripple-tank/appearance.ts';
import { QuietWaterRenderer } from '../app/components/ripple-tank/renderer.ts';

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
      assert.ok(width * height * layout.ratio ** 2 <= wavePixelBudget(width, height, tier) + 1);
      assert.ok(letters > 100, 'letter detail remains independent of solver size');
    }
  }
});
test('small, dense water characters survive software fallback, quality reduction and 4K full screen', () => {
  for (const [width, height] of [[320, 1000], [390, 850], [1440, 709], [1920, 1080], [3840, 2160]]) {
    const zone = { x: width / 2, y: 0, width: width / 2, height };
    let reference;
    for (const tier of [2, 1, 0]) for (const density of [.75, 1, 2, 3]) {
      const layout = poolLayout(width, height, zone, null, tier, density);
      const water = [];
      for (let i = 0; i < layout.points.length; i += 6) {
        assert.ok(layout.points[i + 4] <= 12, 'water and KM glyphs stay small even in full screen');
        if (!layout.points[i + 5]) {
          water.push([...layout.points.slice(i, i + 6)]);
          assert.equal(layout.points[i + 4], 12, 'glyph size stays fixed in CSS pixels');
        }
      }
      assert.equal(water.length, Math.floor(width / 9) * Math.floor(height / 9), 'larger displays add detail');
      assert.ok(Math.abs(water[1][0] - water[0][0] - 9) < .001, 'nine-pixel character spacing');
      if (reference) assert.deepEqual(water, reference, 'GPU quality and pixel density cannot spread the characters out');
      else reference = water;
      assert.ok(Math.round(12 * layout.ratio) / layout.ratio <= 14, 'software stamps stay small after backing-pixel rounding');
    }
  }
  assert.equal(wavePixelBudget(390, 850, 0), 160_000, 'phone software pixels remain bounded');
  assert.equal(wavePixelBudget(3840, 2160, 0), 650_000, 'large software displays have a bounded sharper surface');
});
test('software painting before the first worker reply matches a configured flat field', () => {
  const originalCanvas = globalThis.OffscreenCanvas;
  // Only atlas rasterization is stubbed; layout, interpolation, stamp
  // composition and worker field encoding use their real implementations.
  globalThis.OffscreenCanvas = class {
    getContext() {
      return { fillText() {}, getImageData(x, y, width, height) {
        const data = new Uint8ClampedArray(width * height * 4);
        data[3] = 255;
        return { data };
      } };
    }
  };
  try {
    let painted;
    const context = {
      createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
      putImageData: frame => { painted = frame.data.slice(); },
    };
    const renderer = new QuietWaterRenderer({ width: 0, height: 0 }, context);
    const layout = poolLayout(320, 500, { x: 0, y: 0, width: 320, height: 500 }, null, 0, 1);
    renderer.resize(layout);
    assert.equal(renderer.draw(0, { x: .5, y: .5, visible: false }), true);
    const first = painted;
    assert.ok(first.some(value => value > 0), 'the early paint contains still-water punctuation');
    const simulation = new WaveSimulation();
    renderer.update(simulation.configure({ generation: 1, columns: layout.columns, rows: layout.rows, placement: layout.placement }));
    renderer.draw(0, { x: .5, y: .5, visible: false });
    assert.deepEqual(painted, first, 'initial interpolation is valid before any worker field arrives');
    renderer.dispose();
  } finally {
    if (originalCanvas === undefined) delete globalThis.OffscreenCanvas;
    else globalThis.OffscreenCanvas = originalCanvas;
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
test('quality reduction requires sustained pressure before switching to a quiet cadence', () => {
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

test('visible ambient currents keep moving without disturbing the field or revealing the KM', () => {
  const simulation = new WaveSimulation(); simulation.configure(config);
  let changes = 0, crests = 0;
  for (let y = 0; y < 40; y++) for (let x = 0; x < 60; x++) {
    const u = x / 60, v = y / 40;
    assert.equal(Math.abs(currentHeight(u, v, 0)), 0, 'flat first paint');
    const a = currentHeight(u, v, 25), b = currentHeight(u, v, 29);
    assert.ok(Math.abs(a) <= .047 && Math.abs(b) <= .047, 'quiet bounded currents');
    assert.ok(Math.abs(a - currentHeight(u + .001, v, 25)) < .001, 'neighbors follow the same current');
    if (Math.abs(a - b) > .008) changes++;
    if (Math.abs(a) > .025) crests++;
  }
  assert.ok(changes > 500 && crests > 200, 'the unattended pool has visible moving crests');
  assert.equal(simulation.water.active, false);
  assert.ok(simulation.water.height.every(n => n === 0));
  assert.ok(simulation.water.reveal.every(n => n === 0));
});
test('text protection attenuates only the copy and feathers continuously into the pool', () => {
  const copy = { x: 30, y: 20, width: 450, height: 300 };
  assert.equal(copyOpacity(100, 100, copy, 1440), .1);
  assert.equal(copyOpacity(800, 100, copy, 1440), 1);
  const edge = copyOpacity(481, 100, copy, 1440);
  assert.ok(edge > .1 && edge < .101);
});

test('a renderer meeting its frame budget survives isolated resize hitches', () => {
  const budget = new WaveBudget(0); budget.reset(0);
  let now = 1000;
  for (let i = 0; i < 120; i++) {
    now += 34;
    assert.equal(budget.observe(now, i === 40 ? 105 : 33, i === 40 ? 41 : 14, 33.34), 'keep');
  }
});
