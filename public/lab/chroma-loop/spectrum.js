/** Three distinct connection colors charge one deliberate full-color sweep. */
export const SPECTRUM_COLORS = 3;

const validColor = color => Number.isInteger(color) && color >= 0 && color < 5;
const validIndex = index => Number.isInteger(index) && index >= 0 && index < 36;

export function createSpectrum() {
  return { colors: [], ready: false, bursts: 0 };
}

/**
 * Advance only after a legal preview/resolved move, never while drawing a path.
 * A powered move consumes the charge without contributing to the next cycle.
 * Inputs stay immutable; a fresh state and color array are returned each time.
 */
export function advanceSpectrum(state, move) {
  const colors = [...new Set(Array.isArray(state?.colors) ? state.colors.filter(validColor) : [])].slice(0, SPECTRUM_COLORS);
  const current = {
    colors,
    ready: state?.ready === true || colors.length === SPECTRUM_COLORS,
    bursts: Number.isInteger(state?.bursts) && state.bursts >= 0 ? state.bursts : 0,
  };
  if (!move || typeof move !== 'object' || Array.isArray(move) || !validColor(move.color)
    || !Number.isInteger(move.longest) || move.longest < 2
    || !Array.isArray(move.cleared) || move.cleared.length < 2
    || !move.cleared.every(validIndex) || new Set(move.cleared).size !== move.cleared.length) return current;
  if (move.spectrum === true) return current.ready
    ? { colors: [], ready: false, bursts: current.bursts + 1 }
    : current;
  if (!current.ready && !colors.includes(move.color)) colors.push(move.color);
  current.ready = current.ready || colors.length === SPECTRUM_COLORS;
  return current;
}
