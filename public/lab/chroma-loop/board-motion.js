// Preserve each surviving button and move it from its actual source cell.
// The outer piece carries gravity; the inner gem carries the clear/reveal.
export function animateBoardMove({ board, result, createDot, updateDot, reducedMotion, onComplete }) {
  const previous = Array.from(board.children);
  const cell = board.getBoundingClientRect().width / 6;
  const animations = new Set();
  const destinations = result.origins.map((origin, index) => origin >= 0 ? previous[origin] : createDot(index));
  let stopped = false;
  let placed = false;
  let paused = false;

  function animate(element, frames, options) {
    const animation = element.animate(frames, { fill: 'both', ...options });
    animations.add(animation);
    if (paused) animation.pause();
    return animation.finished.catch(() => {});
  }
  function place() {
    if (placed) return;
    placed = true;
    destinations.forEach((dot, index) => {
      updateDot(dot, index);
      dot.dataset.origin = result.origins[index];
      dot.classList.add('motion-piece');
      if (result.origins[index] < 0) dot.classList.add('motion-new');
    });
    board.replaceChildren(...destinations);
  }
  function clean() {
    for (const animation of animations) animation.cancel();
    animations.clear();
    for (const dot of [...previous, ...destinations]) dot.classList.remove('motion-piece', 'motion-clearing', 'motion-new');
    board.dataset.motion = 'idle';
    board.setAttribute('aria-busy', 'false');
  }
  function complete(notify = true) {
    if (stopped) return;
    stopped = true;
    place();
    clean();
    if (notify) onComplete();
  }
  const controller = {
    pause() {
      paused = true;
      for (const animation of animations) if (animation.playState === 'running') animation.pause();
    },
    resume() {
      paused = false;
      for (const animation of animations) if (animation.playState === 'paused') animation.play();
    },
    finish: complete,
    cancel() {
      if (stopped) return;
      stopped = true;
      clean();
    },
  };

  board.setAttribute('aria-busy', 'true');
  board.dataset.motion = 'clearing';
  if (typeof previous[0]?.animate !== 'function') {
    queueMicrotask(() => complete());
    return controller;
  }
  async function run() {
    const clears = result.cleared.map((index, order) => {
      const dot = previous[index];
      dot.classList.add('motion-clearing');
      const cascade = result.detonated.indexOf(index);
      const delay = reducedMotion ? 0 : result.spectrum
        ? index % 6 * 30 + Math.floor(index / 6) * 6 + Math.max(0, cascade) * 35
        : cascade >= 0 ? cascade * 65 : Math.min(order, 7) * 9;
      return animate(dot.querySelector('.gem'), reducedMotion
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [{ transform: 'scale(1.12)', opacity: 1 }, { transform: 'scale(1.3)', opacity: 1, offset: .32 }, { transform: 'scale(.12)', opacity: 0 }],
      { duration: reducedMotion ? 55 : result.spectrum ? 190 : result.detonated.length ? 210 : 165, delay, easing: 'cubic-bezier(.3,.05,.6,1)' });
    });
    await Promise.all(clears);
    if (stopped) return;
    board.dataset.motion = 'falling';
    place();
    // Remove clear effects only after the cleared pieces leave the board.
    for (const animation of animations) animation.cancel();
    animations.clear();
    const falls = destinations.map((dot, index) => {
      const origin = result.origins[index];
      const sourceRow = Math.floor(origin / 6);
      const sourceColumn = ((origin % 6) + 6) % 6;
      const row = Math.floor(index / 6), column = index % 6;
      const dx = (sourceColumn - column) * cell, dy = (sourceRow - row) * cell;
      if (reducedMotion) return origin < 0
        ? animate(dot.querySelector('.gem'), [{ opacity: 0 }, { opacity: 1 }], { duration: 70 })
        : Promise.resolve();
      if (dx === 0 && dy === 0) return Promise.resolve();
      return animate(dot, [
        { transform: `translate3d(${dx}px,${dy}px,0)`, easing: 'cubic-bezier(.4,.04,.72,.4)' },
        { transform: 'translate3d(0,3px,0)', offset: .84, easing: 'ease-out' },
        { transform: 'translate3d(0,-1px,0)', offset: .94, easing: 'ease-in-out' },
        { transform: 'translate3d(0,0,0)' },
      ], { duration: 360 + Math.min(110, Math.abs(sourceRow - row) * 24), delay: column * 12, easing: 'linear' });
    });
    await Promise.all(falls);
    if (!stopped) complete();
  }
  // Cancellation is an ordinary pause/restart path, never an unhandled promise.
  run().catch(() => { if (!stopped) complete(); });
  return controller;
}
