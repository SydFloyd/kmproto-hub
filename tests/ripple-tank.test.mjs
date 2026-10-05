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
