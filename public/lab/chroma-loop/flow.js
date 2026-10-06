/** The time available on each playable board to build the next rhythm step. */
export const RHYTHM_WINDOW = 3.5;
export const FEVER_EXTENSION_CAP = 3;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const idle = () => ({ current: 1, next: 1, fill: 0, active: false });

/**
 * A timely move builds rhythm; each missed window gives up only one step.
 * readyAt=Infinity holds the window while a move's animation settles. Invalid
 * clocks or an unset readyAt cannot create a multiplier.
 */
export function rhythmState(combo, elapsed, readyAt) {
  const level = Number.isFinite(combo) ? clamp(Math.floor(combo), 0, 5) : 0;
  if (level === 0 || !Number.isFinite(elapsed)
    || !(Number.isFinite(readyAt) || readyAt === Infinity)) return idle();

  const age = readyAt === Infinity ? 0
    : Math.max(0, Math.max(0, elapsed) - Math.max(0, readyAt));
  if (age <= RHYTHM_WINDOW) {
    return {
      current: level,
      next: Math.min(5, level + 1),
      fill: clamp(1 - age / RHYTHM_WINDOW, 0, 1),
      active: true,
    };
  }

  const lost = Math.max(0, Math.ceil(age / RHYTHM_WINDOW) - 1);
  const current = Math.max(1, level - lost);
  return {
    current,
    next: current,
    fill: current > 1 ? clamp(((lost + 1) * RHYTHM_WINDOW - age) / RHYTHM_WINDOW, 0, 1) : 0,
    active: current > 1,
  };
}

/** Each deliberate special move can earn one second, at most three per Fever. */
export function feverExtension(move, active, used) {
  if (active !== true || !Number.isFinite(used) || used < 0 || used >= FEVER_EXTENSION_CAP
    || !move || typeof move !== 'object' || Array.isArray(move)) return 0;
  const special = move.loop === true || Boolean(move.forged)
    || (Array.isArray(move.detonated) && move.detonated.length > 0);
  return special ? 1 : 0;
}
