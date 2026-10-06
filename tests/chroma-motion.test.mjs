import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng, hasMoves, previewMove, resolveMove } from '../public/lab/chroma-loop/engine.js';

const solid = color => Array(36).fill(color);
const deadBoard = () => Array.from({ length: 36 }, (_, index) => (Math.floor(index / 6) + index % 6) % 5);
const columnOf = index => (index % 6 + 6) % 6;

function assertPieceIdentity(board, move) {
  assert.equal(move.origins.length, 36);
  assert.equal(new Set(move.origins).size, 36, 'two destinations cannot animate the same piece');
  assert.ok(move.origins.every(Number.isInteger));
  const survivingSources = board.map((_, index) => index).filter(index => !move.cleared.includes(index));
  assert.deepEqual(move.origins.filter(index => index >= 0).sort((a, b) => a - b), survivingSources);
  assert.equal(move.origins.filter(index => index < 0).length, move.cleared.length);
  for (let destination = 0; destination < 36; destination++) {
    const source = move.origins[destination];
    if (source >= 0) assert.equal(move.board[destination], board[source], `color follows source ${source}`);
  }
}

test('gravity exposes exact survivor identities even when neighboring dots have identical colors', () => {
  const board = solid(4);
  [0, 1, 2, 2, 3, 4].forEach((color, row) => { board[row * 6] = color; });
  const move = resolveMove(board, [12, 18], () => .99);
  assert.equal(move.reshuffled, false);
  assert.deepEqual(Array.from({ length: 6 }, (_, row) => move.origins[row * 6]), [-12, -6, 0, 6, 24, 30]);
  assert.deepEqual(Array.from({ length: 6 }, (_, row) => move.board[row * 6]), [4, 4, 0, 1, 3, 4]);
  for (let index = 0; index < 36; index++) {
    if (index % 6 !== 0) assert.equal(move.origins[index], index, 'unaffected columns stay stationary');
  }
  assertPieceIdentity(board, move);
});

test('refill pieces start above their own column and keep distinct identities across columns', () => {
  const board = solid(4);
  board[12] = board[13] = 2;
  const move = resolveMove(board, [12, 13], () => .99);
  assert.equal(move.reshuffled, false);
  assert.equal(move.origins[0], -6);
  assert.equal(move.origins[1], -5);
  assert.equal(move.origins[6], 0);
  assert.equal(move.origins[7], 1);
  for (let destination = 0; destination < 36; destination++) {
    assert.equal(columnOf(move.origins[destination]), columnOf(destination));
    assert.ok(Math.floor(move.origins[destination] / 6) <= Math.floor(destination / 6));
  }
  assertPieceIdentity(board, move);
});

test('a full color loop refills all six columns from six orderly off-board rows', () => {
  const board = solid(0);
  const move = resolveMove(board, [0, 1, 7, 6, 0], () => .99);
  assert.equal(move.cleared.length, 36);
  assert.equal(move.reshuffled, false);
  assert.deepEqual(move.origins.slice(0, 6), [-36, -35, -34, -33, -32, -31]);
  assert.deepEqual(move.origins.slice(30), [-6, -5, -4, -3, -2, -1]);
  assertPieceIdentity(board, move);
});

test('surviving Nova identity follows gravity while new refill pieces remain ordinary dots', () => {
  const board = solid(4);
  [0, 1, 2, 2, 3, 4].forEach((color, row) => { board[row * 6] = color; });
  const move = resolveMove(board, [12, 18], () => .99, { novas: [0, 6, 24, 5] });
  assert.deepEqual(move.novas, [5, 12, 18, 24]);
  assert.deepEqual(move.novas.map(index => move.origins[index]), [5, 0, 6, 24]);
  assert.ok(move.novas.every(index => move.origins[index] >= 0));
  assertPieceIdentity(board, move);
});

test('cascading Nova blasts remove every detonated source and retain unrelated power-dot identity', () => {
  const board = solid(4);
  board[7] = board[8] = 0;
  const move = resolveMove(board, [7, 8], () => .99, { novas: [7, 14, 35] });
  assert.deepEqual(move.detonated, [7, 14]);
  assert.deepEqual(move.novas, [35]);
  assert.equal(move.origins[35], 35);
  assert.equal(move.origins.includes(7), false);
  assert.equal(move.origins.includes(14), false);
  assertPieceIdentity(board, move);
});

test('a protected Forge tip keeps its original identity through normal and giant Nova gravity', () => {
  const board = solid(4);
  const path = [6, 7, 8, 2, 1];
  path.forEach(index => { board[index] = 0; });
  for (const [novaRadius, landing] of [[1, 13], [2, 19]]) {
    const move = resolveMove(board, path, () => .99, { forge: true, novas: [7, 35], novaRadius });
    assert.deepEqual(move.forged, { from: 1, index: landing, color: 0 });
    assert.equal(move.origins[landing], 1);
    assert.deepEqual(move.novas.map(index => move.origins[index]), [1, 35]);
    assertPieceIdentity(board, move);
  }
});

test('ordinary safety reshuffles move source identity and Nova markers together without extra randomness', () => {
  const dead = deadBoard();
  const board = dead.slice();
  board[0] = board[1] = 4;
  const refills = [(dead[0] + .1) / 5, (dead[1] + .1) / 5];
  let draws = 0;
  const move = resolveMove(board, [0, 1], () => refills[draws++] ?? 0, { novas: [5, 35] });
  assert.equal(move.reshuffled, true);
  assert.equal(draws, 2 + 35);
  assert.deepEqual(move.board, [...dead.slice(1), dead[0]]);
  assert.deepEqual(move.origins, [-5, ...Array.from({ length: 34 }, (_, index) => index + 2), -6]);
  assert.deepEqual(move.novas.map(index => move.origins[index]), [5, 35]);
  assertPieceIdentity(board, move);
});

test('guaranteed-playable fallback swaps the exact piece origins after identity shuffles', () => {
  const dead = deadBoard();
  const board = dead.slice();
  board[0] = board[1] = 4;
  const refills = [(dead[0] + .1) / 5, (dead[1] + .1) / 5];
  let draws = 0;
  const move = resolveMove(board, [0, 1], () => refills[draws++] ?? .999999, { novas: [5, 35] });
  assert.equal(move.reshuffled, true);
  assert.equal(hasMoves(move.board), true);
  assert.equal(draws, 2 + 16 * 35);
  assert.equal(move.origins[0], -6);
  assert.equal(move.origins[1], 5);
  assert.equal(move.origins[5], -5);
  assert.deepEqual(move.novas.map(index => move.origins[index]), [5, 35]);
  assertPieceIdentity(board, move);
});

test('a forged Nova retains its source identity through both safety reshuffle paths', () => {
  for (const [path, color, random, from, landing, expectedDraws] of [
    [[0, 1, 2, 3, 4], 4, 0, 4, 3, 4 + 35],
    [[1, 2, 3, 4, 5], 0, .999999, 5, 1, 4 + 16 * 35],
  ]) {
    const dead = deadBoard();
    const board = dead.slice();
    path.forEach(index => { board[index] = color; });
    const refills = path.slice(0, -1).map(index => (dead[index] + .1) / 5);
    let draws = 0;
    const move = resolveMove(board, path, () => refills[draws++] ?? random, { forge: true, novas: [35] });
    assert.equal(move.reshuffled, true);
    assert.equal(draws, expectedDraws);
    assert.equal(move.forged.index, landing);
    assert.equal(move.origins[landing], from);
    assertPieceIdentity(board, move);
  }
});

test('origin tracking preserves immutable inputs, seeded output, scores, and preview purity', () => {
  const board = Object.freeze(solid(0));
  const path = Object.freeze([0, 1, 2, 3, 4]);
  const novas = Object.freeze([35]);
  const options = Object.freeze({ forge: true, novas, multiplier: 3, fever: true });
  const previousRandom = Math.random;
  let preview;
  try {
    Math.random = () => assert.fail('preview must remain independent of randomness');
    preview = previewMove(board, path, options);
  } finally {
    Math.random = previousRandom;
  }
  let draws = 0;
  const rng = createRng(42);
  const move = resolveMove(board, path, () => { draws++; return rng(); }, options);
  assert.deepEqual(move, resolveMove(board, path, createRng(42), options));
  assert.equal(draws, preview.cleared.length);
  for (const key of ['cleared', 'points', 'loop', 'color', 'longest', 'detonated', 'forged']) {
    assert.deepEqual(move[key], preview[key]);
  }
  assertPieceIdentity(board, move);
});
