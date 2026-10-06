import { createRng, makeBoard, spawnNova } from './engine.js';

/** Fixed boards and move targets make every retry a chance to improve a route. */
export const LEVELS = Object.freeze([
  { id: 1, name: 'First spark', constellation: 'Aurora', seed: 1007, goal: 'dots', target: 12, budget: 3, par: 2, expert: 1 },
  { id: 2, name: 'Color current', constellation: 'Aurora', seed: 11003, goal: 'dots', target: 20, budget: 4, par: 3, expert: 2 },
  { id: 3, name: 'Little orbit', constellation: 'Aurora', seed: 21000, goal: 'loops', target: 1, budget: 3, par: 2, expert: 1 },
  { id: 4, name: 'Nova bloom', constellation: 'Aurora', seed: 31000, goal: 'novas', target: 1, budget: 3, par: 2, expert: 1 },
  { id: 5, name: 'Ripple river', constellation: 'Orbit', seed: 41005, goal: 'dots', target: 32, budget: 5, par: 4, expert: 3 },
  { id: 6, name: 'Twin rings', constellation: 'Orbit', seed: 51003, goal: 'loops', target: 2, budget: 5, par: 4, expert: 3 },
  { id: 7, name: 'Color tide', constellation: 'Orbit', seed: 61056, goal: 'dots', target: 40, budget: 6, par: 5, expert: 4 },
  { id: 8, name: 'Star relay', constellation: 'Orbit', seed: 71000, goal: 'novas', target: 2, budget: 7, par: 6, expert: 5 },
  { id: 9, name: 'Spectrum surge', constellation: 'Supernova', seed: 81000, goal: 'dots', target: 50, budget: 7, par: 6, expert: 5 },
  { id: 10, name: 'Triple orbit', constellation: 'Supernova', seed: 91041, goal: 'loops', target: 3, budget: 7, par: 6, expert: 5 },
  { id: 11, name: 'Nova cascade', constellation: 'Supernova', seed: 101000, goal: 'novas', target: 3, budget: 12, par: 10, expert: 9 },
  { id: 12, name: 'Full constellation', constellation: 'Supernova', seed: 111049, goal: 'dots', target: 65, budget: 8, par: 7, expert: 6 },
].map(Object.freeze));

function levelFor(id) {
  if (typeof id !== 'number' && typeof id !== 'string') return null;
  const number = Number(id);
  return Number.isInteger(number) && number >= 1 && number <= LEVELS.length ? LEVELS[number - 1] : null;
}

function validRun(run) {
  if (!run || typeof run !== 'object' || Array.isArray(run)) return false;
  const level = levelFor(run.levelId);
  if (!level || !Number.isInteger(run.levelId)) return false;
  if (!['dots', 'novas', 'loops', 'moves'].every(key => Number.isInteger(run[key]) && run[key] >= 0)) return false;
  if (run.moves > level.budget || run.dots < 2 * run.moves || run.dots > 36 * run.moves) return false;
  if (run.novas > 2 * run.moves || run.loops > run.moves) return false;
  if (typeof run.finished !== 'boolean' || typeof run.won !== 'boolean') return false;
  if (run.won && (!run.finished || run.moves === 0 || run[level.goal] < level.target)) return false;
  if (!run.won && run[level.goal] >= level.target) return false;
  if (run.finished && !run.won && run.moves !== level.budget) return false;
  return true;
}

function validMove(move) {
  const validIndex = index => Number.isInteger(index) && index >= 0 && index < 36;
  if (!move || !Array.isArray(move.cleared) || move.cleared.length < 2 || move.cleared.length > 36) return false;
  if (!Array.from(move.cleared).every(validIndex) || new Set(move.cleared).size !== move.cleared.length) return false;
  if (!Array.isArray(move.detonated) || move.detonated.length > 2) return false;
  if (!Array.from(move.detonated).every(index => validIndex(index) && move.cleared.includes(index))) return false;
  if (new Set(move.detonated).size !== move.detonated.length) return false;
  if (!Number.isInteger(move.longest) || move.longest < 2 || move.longest > move.cleared.length) return false;
  return Number.isFinite(move.points) && move.points >= 0 && typeof move.loop === 'boolean' && (!move.loop || move.longest >= 4);
}

export function createAtlas(levelId) {
  const level = levelFor(levelId);
  return level ? { levelId: level.id, dots: 0, novas: 0, loops: 0, moves: 0, finished: false, won: false } : null;
}

export function levelInfo(run) {
  if (!validRun(run)) return null;
  const level = levelFor(run.levelId);
  return { ...level, progress: run[level.goal], movesLeft: level.budget - run.moves };
}

/** The returned stream has already consumed board generation and the initial Nova. */
export function makeAtlasBoard(levelId) {
  const level = levelFor(levelId);
  if (!level) return null;
  const rng = createRng(level.seed);
  const board = makeBoard(rng);
  const nova = spawnNova(board, rng);
  return { board, novas: nova === null ? [] : [nova], rng };
}

/** The objective wins on the final move before the budget can end the puzzle. */
export function advanceAtlas(run, move) {
  if (!validRun(run)) return { run, status: 'invalid' };
  if (run.finished) return { run, status: run.won ? 'won' : 'lost' };
  if (!validMove(move)) return { run, status: 'invalid' };
  const level = levelFor(run.levelId);
  if (run.moves === level.budget) return { run: { ...run, finished: true }, status: 'lost' };
  const next = {
    ...run,
    dots: run.dots + move.cleared.length,
    novas: run.novas + move.detonated.length,
    loops: run.loops + Number(move.loop),
    moves: run.moves + 1,
  };
  if (next[level.goal] >= level.target) {
    next.finished = true; next.won = true;
    return { run: next, status: 'won' };
  }
  if (next.moves === level.budget) {
    next.finished = true;
    return { run: next, status: 'lost' };
  }
  return { run: next, status: 'playing' };
}

export function starsForRun(run) {
  if (!validRun(run) || !run.won) return 0;
  const level = levelFor(run.levelId);
  return run.moves <= level.expert ? 3 : run.moves <= level.par ? 2 : 1;
}

const safeScore = value => Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;

/** Accept old star-only records and discard unknown levels or malformed data. */
export function normalizeAtlasRecords(value) {
  if (!value || typeof value !== 'object') return {};
  const entries = Array.isArray(value)
    ? value.filter(item => item && typeof item === 'object').map(item => [item.levelId ?? item.id, item])
    : Object.entries(value);
  const records = {};
  for (const [id, raw] of entries) {
    const level = levelFor(id);
    if (!level || (typeof raw !== 'number' && (!raw || typeof raw !== 'object' || Array.isArray(raw)))) continue;
    const value = typeof raw === 'number' ? raw : raw.stars;
    const stars = Number.isFinite(value) ? Math.min(3, Math.max(0, Math.floor(value))) : 0;
    if (!stars) continue;
    const moves = typeof raw === 'object' ? raw.bestMoves ?? raw.moves : null;
    const record = {
      stars,
      bestScore: typeof raw === 'object' ? safeScore(raw.bestScore ?? raw.score) : 0,
      bestMoves: Number.isInteger(moves) && moves >= 1 && moves <= level.budget ? moves : level.budget,
    };
    const previous = records[level.id];
    records[level.id] = previous ? {
      stars: Math.max(previous.stars, record.stars),
      bestScore: Math.max(previous.bestScore, record.bestScore),
      bestMoves: Math.min(previous.bestMoves, record.bestMoves),
    } : record;
  }
  return records;
}

export function recordAtlasResult(records, run, score) {
  const next = normalizeAtlasRecords(records);
  const stars = starsForRun(run);
  if (!stars) return next;
  const previous = next[run.levelId];
  next[run.levelId] = {
    stars: Math.max(previous?.stars || 0, stars),
    bestScore: Math.max(previous?.bestScore || 0, safeScore(score)),
    bestMoves: Math.min(previous?.bestMoves ?? Infinity, run.moves),
  };
  return next;
}

export function isLevelUnlocked(records, id) {
  const level = levelFor(id);
  return !!level && (level.id === 1 || (normalizeAtlasRecords(records)[level.id - 1]?.stars || 0) > 0);
}

export function atlasSummary(records) {
  const safe = normalizeAtlasRecords(records);
  const next = LEVELS.find(level => !safe[level.id] && isLevelUnlocked(safe, level.id));
  return {
    stars: Object.values(safe).reduce((sum, record) => sum + record.stars, 0),
    totalStars: LEVELS.length * 3,
    completed: Object.keys(safe).length,
    totalLevels: LEVELS.length,
    nextLevel: next?.id ?? null,
  };
}
