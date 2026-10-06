/** Each stage keeps its own move budget and awards a bonus after ordinary scoring. */
export const STAGES = Object.freeze([
  { name: 'First light', target: 18, moves: 6, rule: 'chains', hint: '+75 points for every chain of 4 or more dots.' },
  { name: 'Color current', target: 24, moves: 7, rule: 'color', hint: '+25 points for every favored-color dot you clear.' },
  { name: 'Nova bloom', target: 28, moves: 7, rule: 'novas', hint: '+150 points for every Nova you detonate.' },
  { name: 'Orbit', target: 32, moves: 8, rule: 'loops', hint: '+200 points for every loop you close.' },
  { name: 'Full spectrum', target: 36, moves: 8, rule: 'all', hint: '+100 points for every connection.' },
].map(Object.freeze));

export const PERKS = Object.freeze([
  { id: 'breath', name: 'Deep breath', max: 2, description: '+1 move in every future stage.', unlockAfter: 0 },
  { id: 'nursery', name: 'Nova nursery', max: 2, description: 'Novas arrive one connection sooner.', unlockAfter: 0 },
  { id: 'chain', name: 'Long play', max: 3, description: '+20% connection points for chains of 4 or more dots.', unlockAfter: 0 },
  { id: 'orbit', name: 'Orbit engine', max: 2, description: 'Loops earn +150 points and plant a Nova.', unlockAfter: 0 },
  { id: 'spark', name: 'Fever spark', max: 2, description: '+25% Fever charge and +2 seconds of Fever.', unlockAfter: 0 },
  { id: 'giant', name: 'Star giant', max: 1, description: 'Novas blast a 5 × 5 area.', unlockAfter: 3 },
].map(Object.freeze));

const PERK_BY_ID = new Map(PERKS.map(perk => [perk.id, perk]));
const validIndex = index => Number.isInteger(index) && index >= 0 && index < 36;
const levelOf = (run, id) => run?.perks && Object.hasOwn(run.perks, id) ? run.perks[id] : 0;

function validRun(run) {
  if (!run || typeof run !== 'object' || Array.isArray(run)) return false;
  if (!Number.isInteger(run.stage) || run.stage < 0 || run.stage >= STAGES.length) return false;
  if (!Number.isInteger(run.cleared) || run.cleared < 0) return false;
  if (!Number.isInteger(run.movesLeft) || run.movesLeft < 0) return false;
  if (!Number.isInteger(run.completedStages) || run.completedStages < 0 || run.completedStages > STAGES.length) return false;
  if (typeof run.finished !== 'boolean' || typeof run.won !== 'boolean') return false;
  if (run.won && !run.finished) return false;
  if (run.awaitingUpgrade !== undefined && typeof run.awaitingUpgrade !== 'boolean') return false;
  if (run.awaitingUpgrade && (run.finished || run.stage === STAGES.length - 1)) return false;
  if (run.won && run.stage !== STAGES.length - 1) return false;
  if (run.completedStages !== run.stage + Number(Boolean(run.awaitingUpgrade || run.won))) return false;
  if (!run.perks || typeof run.perks !== 'object' || Array.isArray(run.perks)) return false;
  const validPerks = Object.entries(run.perks).every(([id, level]) => {
    const perk = PERK_BY_ID.get(id);
    return perk && Number.isInteger(level) && level >= 0 && level <= perk.max;
  });
  return validPerks && run.movesLeft <= STAGES[run.stage].moves + levelOf(run, 'breath');
}

function validMove(move) {
  const forged = move?.forged;
  const validForge = forged && typeof forged === 'object' && !Array.isArray(forged)
    && validIndex(forged.from) && validIndex(forged.index)
    && Number.isInteger(forged.color) && forged.color >= 0 && forged.color < 5
    && forged.color === move.color
    && move.loop === false && move.longest >= 5
    && Array.isArray(move.cleared) && !move.cleared.includes(forged.from);
  return move && Array.isArray(move.cleared) && move.cleared.length >= 2 && move.cleared.length <= 36
    && Array.from(move.cleared).every(validIndex) && new Set(move.cleared).size === move.cleared.length
    && Number.isFinite(move.points) && move.points >= 0
    && Number.isInteger(move.longest) && move.longest >= 2 && move.longest <= move.cleared.length + Number(Boolean(validForge))
    && typeof move.loop === 'boolean' && (!move.loop || move.longest >= 4);
}

function validBoard(board) {
  return Array.isArray(board) && board.length === 36
    && Array.from(board).every(color => Number.isInteger(color) && color >= 0 && color < 5);
}

function eligiblePerks(run) {
  return PERKS.filter(perk => levelOf(run, perk.id) < perk.max && run.completedStages >= perk.unlockAfter);
}

export function createExpedition() {
  return { stage: 0, cleared: 0, movesLeft: STAGES[0].moves, perks: {}, completedStages: 0, finished: false, won: false };
}

export function stageInfo(run) {
  if (!validRun(run)) return null;
  const stage = STAGES[run.stage];
  return {
    ...stage,
    index: run.stage,
    maxStage: STAGES.length,
    budget: stage.moves + levelOf(run, 'breath'),
    favorColor: run.stage % 5,
    bonusDescription: stage.hint,
  };
}

/** Classic defaults make these values safe for callers without an active expedition. */
export function expeditionEffects(run) {
  const current = validRun(run) ? run : null;
  return {
    novaInterval: 4 - levelOf(current, 'nursery'),
    novaRadius: levelOf(current, 'giant') ? 2 : 1,
    chargeFactor: 1 + .25 * levelOf(current, 'spark'),
    feverDuration: 10 + 2 * levelOf(current, 'spark'),
    loopNova: levelOf(current, 'orbit') > 0,
  };
}

/** move.points already contains the ordinary combo and Fever factors. */
export function expeditionBonus(run, move, { board } = {}) {
  if (!validRun(run) || !validMove(move)) return 0;
  const info = stageInfo(run);
  let bonus = 0;
  if (info.rule === 'chains' && move.longest >= 4) bonus += 75;
  if (info.rule === 'color' && validBoard(board)) {
    bonus += 25 * move.cleared.filter(index => board[index] === info.favorColor).length;
  }
  if (info.rule === 'novas' && Array.isArray(move.detonated)) {
    bonus += 150 * new Set(move.detonated.filter(index => validIndex(index) && move.cleared.includes(index))).size;
  }
  if (info.rule === 'loops' && move.loop) bonus += 200;
  if (info.rule === 'all') bonus += 100;
  if (move.longest >= 4) bonus += Math.round(move.points * .2 * levelOf(run, 'chain'));
  if (move.loop) bonus += 150 * levelOf(run, 'orbit');
  return bonus;
}

/** Clearing the goal on the last available move wins before exhaustion is checked. */
export function advanceExpedition(run, move) {
  if (!validRun(run)) return { run, status: 'invalid' };
  if (run.finished) return { run, status: run.won ? 'won' : 'lost' };
  if (run.awaitingUpgrade) return { run, status: 'upgrade' };
  if (!validMove(move)) return { run, status: 'invalid' };
  if (run.movesLeft === 0) return { run: { ...run, finished: true }, status: 'lost' };
  const next = { ...run, cleared: run.cleared + move.cleared.length, movesLeft: run.movesLeft - 1 };
  if (next.cleared >= STAGES[run.stage].target) {
    next.completedStages = run.completedStages + 1;
    if (run.stage === STAGES.length - 1) {
      next.finished = true;
      next.won = true;
      return { run: next, status: 'won' };
    }
    next.awaitingUpgrade = true;
    return { run: next, status: 'upgrade' };
  }
  if (next.movesLeft === 0) {
    next.finished = true;
    return { run: next, status: 'lost' };
  }
  return { run: next, status: 'playing' };
}

export function choosePerk(run, id) {
  if (!validRun(run) || run.finished || !run.awaitingUpgrade) return null;
  const perk = eligiblePerks(run).find(candidate => candidate.id === id);
  if (!perk) return null;
  const perks = { ...run.perks, [id]: levelOf(run, id) + 1 };
  const stage = run.stage + 1;
  return {
    ...run,
    stage,
    cleared: 0,
    movesLeft: STAGES[stage].moves + (perks.breath ?? 0),
    perks,
    awaitingUpgrade: false,
  };
}

/** Draw only from the supplied stream; drafts never consume board randomness. */
export function offerPerks(run, rng) {
  if (!validRun(run) || run.finished || !run.awaitingUpgrade || typeof rng !== 'function') return [];
  const remaining = eligiblePerks(run);
  const offers = [];
  while (offers.length < 3 && remaining.length) {
    const value = rng();
    const bounded = Number.isFinite(value) ? Math.min(1 - Number.EPSILON, Math.max(0, value)) : 0;
    const index = Math.floor(bounded * remaining.length);
    offers.push(remaining.splice(index, 1)[0]);
  }
  return offers;
}
