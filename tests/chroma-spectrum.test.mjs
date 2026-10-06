import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng, previewMove, resolveMove, SPECTRUM_BONUS } from '../public/lab/chroma-loop/engine.js';
import { createSpectrum, advanceSpectrum, SPECTRUM_COLORS } from '../public/lab/chroma-loop/spectrum.js';

const solid = color => Array(36).fill(color);
const moveFor = color => previewMove(solid(color), [0, 1]);
const sweepBoard = () => {
  const board = solid(4);
  for (const index of [0, 1, 6, 7, 20, 35]) board[index] = 2;
  return board;
};

test('new Spectrum cycles have independent empty state', () => {
  assert.equal(SPECTRUM_COLORS, 3);
  assert.equal(SPECTRUM_BONUS, 100);
  const a = createSpectrum();
  const b = createSpectrum();
  assert.deepEqual(a, { colors: [], ready: false, bursts: 0 });
  assert.notEqual(a, b);
  assert.notEqual(a.colors, b.colors);
});

test('three different connection colors charge once; repeated colors do not advance', () => {
  let state = createSpectrum();
  state = advanceSpectrum(state, moveFor(2));
  assert.deepEqual(state, { colors: [2], ready: false, bursts: 0 });
  state = advanceSpectrum(state, moveFor(2));
  assert.deepEqual(state.colors, [2]);
  state = advanceSpectrum(state, moveFor(0));
  assert.equal(state.ready, false);
  state = advanceSpectrum(state, moveFor(4));
  assert.deepEqual(state, { colors: [2, 0, 4], ready: true, bursts: 0 });
  assert.deepEqual(advanceSpectrum(state, moveFor(1)), state, 'a held charge cannot collect a second charge');
});

test('the powered move consumes its charge and begins an empty next cycle', () => {
  const charged = { colors: [0, 1, 2], ready: true, bursts: 3 };
  const powered = previewMove(solid(4), [0, 1], { spectrum: true });
  const next = advanceSpectrum(charged, powered);
  assert.deepEqual(next, { colors: [], ready: false, bursts: 4 });
  assert.deepEqual(advanceSpectrum(next, moveFor(4)), { colors: [4], ready: false, bursts: 4 });
  assert.deepEqual(charged, { colors: [0, 1, 2], ready: true, bursts: 3 });
});

test('a powered signal cannot spend an unready charge or fabricate a burst', () => {
  const powered = previewMove(solid(4), [0, 1], { spectrum: true });
  for (const colors of [[], [0], [0, 1]]) {
    const unready = Object.freeze({ colors: Object.freeze(colors), ready: false, bursts: 2 });
    const next = advanceSpectrum(unready, powered);
    assert.deepEqual(next, unready);
    assert.notEqual(next, unready);
    assert.notEqual(next.colors, unready.colors);
  }
});

test('invalid moves never charge or consume Spectrum', () => {
  const state = Object.freeze({ colors: Object.freeze([1]), ready: false, bursts: 2 });
  const valid = moveFor(2);
  for (const invalid of [null, undefined, [], {}, { ...valid, color: -1 }, { ...valid, color: 5 },
    { ...valid, color: 1.5 }, { ...valid, longest: 1 }, { ...valid, cleared: [0] },
    { ...valid, cleared: [0, 0] }, { ...valid, cleared: [0, 36] },
    { color: 2, spectrum: true }]) {
    const next = advanceSpectrum(state, invalid);
    assert.deepEqual(next, state);
    assert.notEqual(next, state);
    assert.notEqual(next.colors, state.colors);
  }
});

test('drawing previews and collecting colors remain pure without RNG or clocks', () => {
  const state = Object.freeze({ colors: Object.freeze([1, 3]), ready: false, bursts: 0 });
  const move = Object.freeze({ ...moveFor(2), cleared: Object.freeze([0, 1]) });
  const next = advanceSpectrum(state, move);
  assert.deepEqual(next, { colors: [1, 3, 2], ready: true, bursts: 0 });
  assert.deepEqual(state.colors, [1, 3]);
  assert.deepEqual(move.cleared, [0, 1]);
  assert.deepEqual(advanceSpectrum(state, move), next);
});

test('a charged open connection sweeps disconnected dots of its color without claiming a loop', () => {
  const board = sweepBoard();
  const ordinary = previewMove(board, [0, 1]);
  const powered = previewMove(board, [0, 1], { spectrum: true });
  assert.deepEqual(ordinary.cleared, [0, 1]);
  assert.deepEqual(powered.cleared, [0, 1, 6, 7, 20, 35]);
  assert.equal(powered.spectrum, true);
  assert.equal(powered.loop, false);
  assert.equal(powered.longest, 2);
  assert.equal(powered.color, 2);
  assert.equal(powered.points, 60 + 150 + 100);
  assert.equal(powered.forged, null);
});

test('a genuine closed loop still earns its loop bonus and reports the real gesture', () => {
  const board = sweepBoard();
  const path = [0, 1, 7, 6, 0];
  const ordinary = previewMove(board, path);
  const powered = previewMove(board, path, { spectrum: true });
  assert.deepEqual(powered.cleared, ordinary.cleared);
  assert.equal(powered.loop, true);
  assert.equal(powered.longest, 4);
  assert.equal(powered.points, ordinary.points + SPECTRUM_BONUS);
});

test('Spectrum reaches remote Novas and follows exact ordinary Nova cascades', () => {
  const board = sweepBoard();
  const options = { novas: [35, 28, 21], novaRadius: 1 };
  const loop = previewMove(board, [0, 1, 7, 6, 0], options);
  const powered = previewMove(board, [0, 1], { ...options, spectrum: true });
  assert.deepEqual(powered.cleared, loop.cleared);
  assert.deepEqual(powered.detonated, [35, 28, 21]);
  assert.equal(new Set(powered.cleared).size, powered.cleared.length);
  assert.equal(powered.points, loop.points - 150 + SPECTRUM_BONUS);
  assert.equal(powered.loop, false);
});

test('Spectrum clears the Forge endpoint instead of protecting or forging it', () => {
  const board = solid(0);
  const path = [0, 1, 2, 3, 4];
  const ordinary = previewMove(board, path, { forge: true });
  assert.deepEqual(ordinary.forged, { from: 4, index: 4, color: 0 });
  const powered = previewMove(board, path, { forge: true, spectrum: true });
  assert.equal(powered.forged, null);
  assert.equal(powered.cleared.length, 36);
  assert.ok(powered.cleared.includes(4));
  assert.equal(powered.loop, false);
  const novaEndpoint = previewMove(board, path, { forge: true, spectrum: true, novas: [4] });
  assert.deepEqual(novaEndpoint.detonated, [4]);
  assert.equal(novaEndpoint.forged, null);
});

test('Spectrum bonus receives the same multiplier and Fever as the rest of the move', () => {
  const board = sweepBoard();
  const base = previewMove(board, [0, 1], { spectrum: true });
  assert.equal(previewMove(board, [0, 1], { spectrum: true, multiplier: 2.5, fever: true }).points, base.points * 5);
  assert.equal(previewMove(board, [0, 1], { spectrum: true, multiplier: 0, fever: true }).points, 0);
});

test('Spectrum resolution matches its preview and keeps exact gravity origins with only refill draws', () => {
  const board = Object.freeze(sweepBoard());
  const path = Object.freeze([0, 1]);
  const options = Object.freeze({ spectrum: true, forge: true, multiplier: 3, fever: true });
  const oldRandom = Math.random;
  let preview;
  try {
    Math.random = () => assert.fail('preview must never draw randomness');
    preview = previewMove(board, path, options);
  } finally {
    Math.random = oldRandom;
  }
  let draws = 0;
  const result = resolveMove(board, path, () => { draws++; return .99; }, options);
  for (const key of Object.keys(preview)) assert.deepEqual(result[key], preview[key]);
  assert.equal(draws, preview.cleared.length);
  assert.equal(result.reshuffled, false);
  assert.equal(new Set(result.origins).size, 36);
  assert.deepEqual(result.origins.filter(index => index >= 0).sort((a, b) => a - b),
    Array.from({ length: 36 }, (_, index) => index).filter(index => !preview.cleared.includes(index)));
  assert.deepEqual(result.origins.filter(index => index < 0).sort((a, b) => a - b), [-12, -11, -6, -5, -4, -1]);
  for (let destination = 0; destination < 36; destination++) {
    const source = result.origins[destination];
    if (source >= 0) assert.equal(result.board[destination], board[source]);
  }
  assert.deepEqual(board, sweepBoard());
  assert.deepEqual(path, [0, 1]);
});

test('invalid Spectrum connections do not resolve, draw randomness, or consume state', () => {
  const board = sweepBoard();
  const charged = { colors: [0, 1, 2], ready: true, bursts: 0 };
  const noDraw = () => assert.fail('an invalid connection must not draw randomness');
  for (const path of [[], [0], [0, 7], [5, 6], [0, 1, 0], [0, 99]]) {
    assert.equal(previewMove(board, path, { spectrum: true }), null);
    const result = resolveMove(board, path, noDraw, { spectrum: true });
    assert.equal(result, null);
    assert.deepEqual(advanceSpectrum(charged, result), charged);
  }
});

test('disabled or nonboolean Spectrum keeps existing results and seeded randomness unchanged', () => {
  const board = sweepBoard();
  const path = [0, 1, 7, 6, 0];
  const options = { forge: true, novas: [35], multiplier: 3, fever: true };
  const control = resolveMove(board, path, createRng(81), options);
  for (const spectrum of [false, undefined, null, 1, 'true']) {
    assert.deepEqual(previewMove(board, path, { ...options, spectrum }), previewMove(board, path, options));
    assert.deepEqual(resolveMove(board, path, createRng(81), { ...options, spectrum }), control);
  }
  assert.equal(Object.hasOwn(control, 'spectrum'), false);
});

test('resolved game moves charge, power one sweep, and start the next three-color cycle', () => {
  let state = createSpectrum();
  for (const color of [0, 3, 1]) {
    state = advanceSpectrum(state, resolveMove(solid(color), [0, 1], () => .99));
  }
  assert.equal(state.ready, true);
  const result = resolveMove(sweepBoard(), [0, 1], () => .99, { spectrum: state.ready });
  state = advanceSpectrum(state, result);
  assert.deepEqual(state, { colors: [], ready: false, bursts: 1 });
  state = advanceSpectrum(state, resolveMove(solid(2), [0, 1], () => .99));
  assert.deepEqual(state, { colors: [2], ready: false, bursts: 1 });
});
