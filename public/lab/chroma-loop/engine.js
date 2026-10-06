const WIDTH = 6;
const CELLS = WIDTH * WIDTH;
const COLORS = 5;
export const FORGE_CHAIN = 5;
export const FORGE_BONUS = 150;

/** Stable 32-bit hash for daily challenges and shareable seeds. */
export function seedFromText(text) {
  let hash = 2166136261;
  for (const character of String(text)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Mulberry32: the same seed always produces the same sequence. */
export function createRng(seed) {
  let state = Number(seed) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function validIndex(index) {
  return Number.isInteger(index) && index >= 0 && index < CELLS;
}

function validBoard(board) {
  return Array.isArray(board) && board.length === CELLS
    && Array.from(board).every(color => Number.isInteger(color) && color >= 0 && color < COLORS);
}

function randomIndex(rng, limit) {
  const value = rng();
  const bounded = Number.isFinite(value) ? Math.min(1 - Number.EPSILON, Math.max(0, value)) : 0;
  return Math.floor(bounded * limit);
}

/** Orthogonal adjacency only; row boundaries never wrap around. */
export function neighbors(a, b) {
  if (!validIndex(a) || !validIndex(b)) return false;
  return Math.abs(Math.floor(a / WIDTH) - Math.floor(b / WIDTH))
    + Math.abs((a % WIDTH) - (b % WIDTH)) === 1;
}

export function hasMoves(board) {
  if (!validBoard(board)) return false;
  for (let index = 0; index < CELLS; index++) {
    if (index % WIDTH < WIDTH - 1 && board[index] === board[index + 1]) return true;
    if (index < CELLS - WIDTH && board[index] === board[index + WIDTH]) return true;
  }
  return false;
}

export function countColor(board, color) {
  if (!validBoard(board) || !Number.isInteger(color) || color < 0 || color >= COLORS) return 0;
  return board.reduce((total, value) => total + Number(value === color), 0);
}

function sanitizeNovas(novas) {
  return Array.isArray(novas) ? [...new Set(novas.filter(validIndex))].sort((a, b) => a - b) : [];
}

function ensureMoves(board, rng, novas = [], trackedIndex = null, origins = null) {
  const markers = new Set(novas);
  const swap = (index, other) => {
    [board[index], board[other]] = [board[other], board[index]];
    if (origins) [origins[index], origins[other]] = [origins[other], origins[index]];
    if (trackedIndex === index) trackedIndex = other;
    else if (trackedIndex === other) trackedIndex = index;
    const marked = markers.has(index);
    const otherMarked = markers.has(other);
    if (marked === otherMarked) return;
    markers.delete(marked ? index : other);
    markers.add(marked ? other : index);
  };
  const result = reshuffled => ({ board, reshuffled, novas: [...markers].sort((a, b) => a - b), trackedIndex, origins });
  if (hasMoves(board)) return result(false);
  // Keep the color counts intact while trying ordinary shuffles first.
  for (let attempt = 0; attempt < 16; attempt++) {
    for (let index = CELLS - 1; index > 0; index--) {
      const other = randomIndex(rng, index + 1);
      swap(index, other);
    }
    if (hasMoves(board)) return result(true);
  }
  // Even a constant/adversarial random source cannot leave a dead board.
  // Thirty-six cells and five colors guarantee a duplicated color.
  const color = board.find(value => countColor(board, value) >= 2);
  const first = board.indexOf(color);
  swap(0, first);
  const second = board.findIndex((value, index) => index > 0 && value === color);
  swap(1, second);
  return result(true);
}

export function makeBoard(rng = Math.random) {
  const board = Array.from({ length: CELLS }, () => randomIndex(rng, COLORS));
  return ensureMoves(board, rng).board;
}

function inspectPath(board, path) {
  if (!validBoard(board) || !Array.isArray(path) || path.length === 0) return null;
  if (!validIndex(path[0])) return null;
  const color = board[path[0]];
  const visited = new Map();
  let loop = false;
  for (let position = 0; position < path.length; position++) {
    const index = path[position];
    if (!validIndex(index) || board[index] !== color) return null;
    if (position > 0 && !neighbors(path[position - 1], index)) return null;
    if (visited.has(index)) {
      if (position !== path.length - 1 || position - visited.get(index) < 4) return null;
      loop = true;
    } else {
      visited.set(index, position);
    }
  }
  return { color, loop, longest: visited.size };
}

/** Invalid additions are ignored; every returned path is a fresh array. */
export function extendPath(board, path, index) {
  const current = Array.isArray(path) ? path.slice() : [];
  if (!validBoard(board) || !validIndex(index)) return current;
  if (current.length === 0) return [index];
  const info = inspectPath(board, current);
  if (!info) return current;
  if (current.length >= 2 && index === current[current.length - 2]) return current.slice(0, -1);
  if (info.loop || !neighbors(current[current.length - 1], index) || board[index] !== info.color) return current;
  const previous = current.indexOf(index);
  if (previous >= 0 && current.length - previous < 4) return current;
  return [...current, index];
}

/** Inspect a move and its cascading blasts without drawing randomness or mutating inputs. */
export function previewMove(board, path, { multiplier = 1, fever = false, novas = [], novaRadius = 1, forge = false } = {}) {
  const info = inspectPath(board, path);
  if (!info || info.longest < 2) return null;
  const selected = info.loop
    ? board.reduce((indexes, color, index) => {
      if (color === info.color) indexes.push(index);
      return indexes;
    }, [])
    : path.slice();
  const markers = new Set(sanitizeNovas(novas));
  const radius = Number.isFinite(novaRadius) ? Math.min(2, Math.max(1, Math.floor(novaRadius))) : 1;
  const clear = protectedIndex => {
    const cleared = selected.filter(index => index !== protectedIndex);
    const removed = new Set(cleared);
    const detonated = [];
    // Appending newly hit dots visits secondary NOVAs exactly once. A forging tip
    // survives every blast in this move, then becomes a power dot after gravity.
    for (let position = 0; position < cleared.length; position++) {
      const index = cleared[position];
      if (!markers.has(index)) continue;
      detonated.push(index);
      const centerRow = Math.floor(index / WIDTH);
      const centerColumn = index % WIDTH;
      for (let row = Math.max(0, centerRow - radius); row <= Math.min(WIDTH - 1, centerRow + radius); row++) {
        for (let column = Math.max(0, centerColumn - radius); column <= Math.min(WIDTH - 1, centerColumn + radius); column++) {
          const target = row * WIDTH + column;
          if (target !== protectedIndex && !removed.has(target)) {
            removed.add(target);
            cleared.push(target);
          }
        }
      }
    }
    return { cleared, removed, detonated };
  };
  const endpoint = path[path.length - 1];
  const candidate = forge === true && !info.loop && info.longest >= FORGE_CHAIN && !markers.has(endpoint);
  let blast = clear(candidate ? endpoint : null);
  let forged = null;
  if (candidate) {
    const remaining = [...markers].filter(index => !blast.removed.has(index)).length;
    if (remaining < 2) {
      const droppedRows = blast.cleared.filter(index => index % WIDTH === endpoint % WIDTH && index > endpoint).length;
      forged = { from: endpoint, index: endpoint + droppedRows * WIDTH, color: board[endpoint] };
    } else {
      blast = clear(null);
    }
  }
  const { cleared, detonated } = blast;
  const amount = cleared.length;
  const factor = Number.isFinite(multiplier) && multiplier >= 0 ? multiplier : 1;
  const points = (10 * amount + 5 * amount * (amount - 1) + (info.loop ? 150 : 0) + 100 * detonated.length + (forged ? FORGE_BONUS : 0))
    * factor * (fever ? 2 : 1);
  return { cleared, points, loop: info.loop, color: info.color, longest: info.longest, detonated, forged };
}

/** Choose a playable power dot using only the supplied random source. */
export function spawnNova(board, rng, existingNovas = []) {
  if (!validBoard(board) || typeof rng !== 'function') return null;
  const markers = new Set(sanitizeNovas(existingNovas));
  const candidates = [];
  for (let index = 0; index < CELLS; index++) {
    if (markers.has(index)) continue;
    const adjacent = [index - WIDTH, index + WIDTH, index - 1, index + 1];
    if (adjacent.some(other => neighbors(index, other) && board[index] === board[other])) candidates.push(index);
  }
  return candidates.length ? candidates[randomIndex(rng, candidates.length)] : null;
}

/**
 * Resolve an entire move without mutating the caller's board, path, or power dots.
 * `origins[destination]` identifies each piece's source in the old board. Refill
 * pieces use unique negative indices in the same six-column grid above it:
 * source row = Math.floor(origin / WIDTH), source column = (origin % WIDTH + WIDTH) % WIDTH.
 * These identities follow the pieces through gravity and any safety reshuffle.
 */
export function resolveMove(board, path, rng = Math.random, { multiplier = 1, fever = false, novas = [], novaRadius = 1, forge = false } = {}) {
  const move = previewMove(board, path, { multiplier, fever, novas, novaRadius, forge });
  if (!move) return null;
  const removed = new Set(move.cleared);
  const markers = new Set(sanitizeNovas(novas));
  const next = new Array(CELLS);
  const origins = new Array(CELLS);
  const nextNovas = [];
  for (let column = 0; column < WIDTH; column++) {
    const survivors = [];
    for (let row = 0; row < WIDTH; row++) {
      const index = row * WIDTH + column;
      if (!removed.has(index)) survivors.push({ index, color: board[index], nova: markers.has(index) || index === move.forged?.from });
    }
    const empty = WIDTH - survivors.length;
    for (let row = 0; row < WIDTH; row++) {
      const index = row * WIDTH + column;
      if (row < empty) {
        next[index] = randomIndex(rng, COLORS);
        origins[index] = (row - empty) * WIDTH + column;
      } else {
        const survivor = survivors[row - empty];
        next[index] = survivor.color;
        origins[index] = survivor.index;
        if (survivor.nova) nextNovas.push(index);
      }
    }
  }
  const playable = ensureMoves(next, rng, nextNovas, move.forged?.index ?? null, origins);
  return {
    ...move,
    forged: move.forged ? { ...move.forged, index: playable.trackedIndex } : null,
    board: playable.board,
    reshuffled: playable.reshuffled,
    novas: playable.novas,
    origins: playable.origins,
  };
}
