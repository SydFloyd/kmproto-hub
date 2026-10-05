import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RippleField } from '../app/components/ripple-tank/field.ts';

const maximum = values => values.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
const advance = (field, seconds) => { for (let i = 0; i < seconds * 120; i++) field.step(); };

test('the submerged KM is invisible in still water', () => {
  const water = new RippleField(100, 70);
  assert.ok(water.mask.some(Boolean));
  advance(water, 2);
  assert.equal(maximum(water.height), 0);
  assert.equal(maximum(water.reveal), 0);
});

test('startup is flat and ambient currents emerge gently without exposing the KM', () => {
  const water = new RippleField(120, 70);
  for (let y = 0; y < water.rows; y++) for (let x = 0; x < water.columns; x++) assert.equal(Math.abs(water.ambient(x, y)), 0);
  advance(water, 0.5);
  assert.ok(Math.abs(water.ambient(20, 30)) < 0.0006, 'the current starts gradually');
  advance(water, 20);
  for (let y = 1; y < water.rows; y++) for (let x = 1; x < water.columns; x++) {
    assert.ok(Math.abs(water.ambient(x, y)) < 0.009, 'idle water stays quiet');
    assert.ok(Math.abs(water.ambient(x, y) - water.ambient(x - 1, y)) < 0.002, 'neighboring currents stay coherent');
  }
  assert.equal(maximum(water.height), 0);
  assert.equal(maximum(water.reveal), 0);
});

test('a monogram placed beside the copy still reflects ripples and keeps square, equally weighted uprights', () => {
  const placement = { x: 112, y: 35, size: 42 };
  const water = new RippleField(160, 70, placement), open = new RippleField(160, 70, placement);
  assert.ok(water.mask.every((solid, i) => !solid || i % water.columns > 80), 'the obstacle stays in the clear side of the ribbon');
  const weights = [-0.51, 0.02, 0.46].map(position => {
    const center = Math.round(placement.x + position * placement.size);
    const y = Math.round(placement.y + placement.size * 0.17);
    let weight = 0;
    for (let x = center - 4; x <= center + 4; x++) weight += water.coverage[y * water.columns + x];
    return weight;
  });
  assert.ok(Math.max(...weights) - Math.min(...weights) < 0.02);
  const k = Math.round(placement.x - placement.size * 0.51);
  assert.equal(water.coverage[28 * water.columns + k], water.coverage[42 * water.columns + k], 'the K stem is straight');
  open.mask.fill(0);
  water.drop(0.5, 0.5); open.drop(0.5, 0.5);
  advance(water, 0.65); advance(open, 0.65);
  assert.ok(water.height.reduce((sum, value, i) => sum + Math.abs(value - open.height[i]), 0) > 1);
  assert.ok(maximum(water.reveal) > 0.05);
});

test('uprights keep equal visual weight across mobile and desktop grids', () => {
  for (const [columns, rows] of [[38, 40], [52, 44], [55, 44], [73, 75], [66, 59], [100, 70], [89, 62]]) {
    const water = new RippleField(columns, rows);
    const size = Math.min(columns * 0.56, rows * 1.02);
    const y = Math.round(rows / 2 + size * 0.17);
    const weights = [-0.51, 0.02, 0.46].map(position => {
      const center = Math.round(columns / 2 + position * size), radius = Math.ceil(size * 0.08);
      let weight = 0;
      for (let x = center - radius; x <= center + radius; x++) weight += water.coverage[y * columns + x];
      return weight;
    });
    assert.ok(Math.max(...weights) - Math.min(...weights) < 0.02,
      `${columns}×${rows}: upright weights ${weights.join(', ')}`);
  }
});

test('a pebble spreads across water and reflects from the monogram', () => {
  const tank = new RippleField(100, 70), open = new RippleField(100, 70);
  open.mask.fill(0);
  tank.drop(0.2, 0.46); open.drop(0.2, 0.46);
  advance(tank, 0.55); advance(open, 0.55);
  const difference = tank.height.reduce((sum, value, i) => sum + Math.abs(value - open.height[i]), 0);
  assert.ok(difference > 1, 'the obstacle scatters the wave');
  assert.ok(maximum(tank.reveal) > 0.05, 'wave contact briefly reveals the letters');
  assert.ok(tank.height.every((value, i) => !tank.mask[i] || value === 0), 'solid cells remain fixed');
});

test('ripples and the logo reveal decay back into stillness', () => {
  const water = new RippleField(100, 70);
  water.drop(0.5, 0.5);
  advance(water, 12);
  assert.ok(maximum(water.height) < 0.002, `remaining ripple: ${maximum(water.height)}`);
  assert.ok(maximum(water.reveal) < 0.002, 'the logo disappears');
});

test('the solver sleeps when flat, wakes on input, and sleeps after the ripples settle', () => {
  const water = new RippleField(100, 70);
  advance(water, 20);
  assert.equal(water.active, false);
  assert.ok(water.time > 19, 'gentle currents keep their clock while the solver sleeps');
  water.drop(.2, .5); assert.equal(water.active, true);
  advance(water, 24);
  assert.equal(water.active, false);
  assert.equal(maximum(water.height), 0); assert.equal(maximum(water.reveal), 0);
  water.wake(.2, .6, .02, 0); assert.equal(water.active, true);
  advance(water, .1); assert.ok(maximum(water.height) > .002);
});

test('a moving finger leaves a directional wave and repeated drops stay finite', () => {
  const water = new RippleField(80, 60);
  for (let i = 0; i < 20; i++) water.wake(0.1 + i * 0.01, 0.7, 0.01, 0);
  advance(water, 0.2);
  assert.ok(maximum(water.height) > 0.01);
  for (let i = 0; i < 40; i++) { water.drop((i % 9 + 0.5) / 10, 0.4); water.step(); }
  advance(water, 4);
  assert.ok(water.height.every(Number.isFinite));
  assert.ok(maximum(water.height) < 0.2);
  water.clear();
  assert.equal(maximum(water.height), 0);
  assert.equal(maximum(water.previous), 0);
  assert.equal(maximum(water.reveal), 0);
});
