import { createRng, makeBoard, extendPath, resolveMove, previewMove, spawnNova, seedFromText, FORGE_CHAIN } from './engine.js';
import { Sound } from './audio.js';
import { ACHIEVEMENTS, currentMission, advanceMission, findNewAchievements, rankForScore } from './progression.js';
import { PERKS, createExpedition, stageInfo, expeditionEffects, expeditionBonus, advanceExpedition, choosePerk, offerPerks } from './expedition.js';
import { LEVELS as ATLAS_LEVELS, createAtlas, levelInfo, advanceAtlas, starsForRun, normalizeAtlasRecords, recordAtlasResult, isLevelUnlocked, atlasSummary, makeAtlasBoard } from './atlas.js';
import { rhythmState, feverExtension, RHYTHM_WINDOW } from './flow.js';

const $ = id => document.getElementById(id);
const format = value => Math.round(value).toLocaleString();
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const PALETTES = [
  { id: 'moonlight', name: 'Moonlight', dots: 0, colors: ['#b59aff', '#ff8bb6', '#74dbb5', '#ffc879', '#83baff'] },
  { id: 'sundown', name: 'Sundown', dots: 100, colors: ['#e5a6ff', '#ff8d88', '#9edabc', '#ffd878', '#b3b5ff'] },
  { id: 'tidal', name: 'Tidal', dots: 300, colors: ['#aaadff', '#ffa9b7', '#72dfd3', '#e2e490', '#72bfff'] },
  { id: 'candy', name: 'Candy shop', dots: 600, colors: ['#cf91ff', '#ff7faf', '#98efab', '#ffe08b', '#95c7ff'] },
  { id: 'aurora', name: 'Aurora', dots: 1200, colors: ['#ccb3ff', '#f29ecb', '#6aefbd', '#f6e692', '#76d4ec'] },
  { id: 'solar', name: 'Solar flare', dots: 2200, colors: ['#c99dff', '#ff8d98', '#a9e6a4', '#ffb979', '#a6c4ff'] },
];
const COLOR_NAMES = ['Violet ring', 'Rose square', 'Mint diamond', 'Gold triangle', 'Blue cross'];
const MODE_COPY = {
  rush: { name: 'Rush', summary: '60 seconds. Beat your best.', kicker: 'SCORE ATTACK', title: 'Find your next spark.', copy: 'Connect colors. Forge Novas.<br>Set off a chain reaction.', button: 'Play Rush', hint: '60 seconds · Loops earn extra time' },
  daily: { name: 'Daily', summary: 'Same board. A better route.', kicker: 'DAILY CHALLENGE', title: "Today's challenge.", copy: 'A fixed board for today.<br>Replay it to find your best route.', button: 'Play today', hint: '60 seconds · The same seed on every retry' },
  zen: { name: 'Zen', summary: 'No clock. Just connections.', kicker: 'FREE PLAY', title: 'Play at your pace.', copy: 'Find a color. Follow a possibility.<br>Every connection is yours to make.', button: 'Play Zen', hint: 'No timer · Finish whenever you like' },
  expedition: { name: 'Expedition', summary: 'Five stages. Build your run.', kicker: 'BUILD AN ADVENTURE', title: 'Make the run yours.', copy: 'Clear each stage. Choose upgrades.<br>Carry your build through all five.', button: 'Start Expedition', hint: 'Five stages · Moves count, the clock waits' },
};
const LEVELS = [{ dots: 0, name: 'Color curious' }, { dots: 100, name: 'Loop explorer' }, { dots: 300, name: 'Rhythm finder' }, { dots: 600, name: 'Color conductor' }, { dots: 1000, name: 'Flow state' }, { dots: 2000, name: 'Loop legend' }];
const sound = new Sound();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const storageKey = 'chroma-loop-v1';
let canSave = true;
let storageToastShown = false;

function loadProgress() {
  const defaults = { totalDots: 0, totalLoops: 0, bests: { rush: 0, zen: 0, expedition: 0 }, daily: {}, runs: [], skin: 'moonlight', stats: {}, achievements: {}, atlas: {} };
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!value || typeof value !== 'object') return defaults;
    const safeNumber = number => Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
    return {
      totalDots: safeNumber(value.totalDots), totalLoops: safeNumber(value.totalLoops),
      bests: { rush: safeNumber(value.bests?.rush), zen: safeNumber(value.bests?.zen), expedition: safeNumber(value.bests?.expedition) },
      daily: Object.fromEntries(Object.entries(value.daily || {}).filter(([date, score]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(score) && score >= 0).slice(-30)),
      runs: Array.isArray(value.runs) ? value.runs.filter(run => run && ['rush', 'daily', 'zen', 'expedition', 'atlas'].includes(run.mode) && Number.isFinite(run.score) && run.score >= 0 && Number.isFinite(run.dots) && run.dots >= 0).slice(0, 5) : [],
      skin: PALETTES.some(palette => palette.id === value.skin && safeNumber(value.totalDots) >= palette.dots) ? value.skin : 'moonlight',
      stats: Object.fromEntries(['novas', 'forges', 'fevers', 'maxChain', 'maxCombo', 'maxCascade', 'maxRunLoops', 'maxMissions', 'maxScore', 'maxExpeditionStage', 'maxBuild', 'expeditionWins'].map(key => [key, safeNumber(value.stats?.[key])])),
      achievements: Object.fromEntries(ACHIEVEMENTS.filter(item => typeof value.achievements?.[item.id] === 'string').map(item => [item.id, value.achievements[item.id]])),
      atlas: normalizeAtlasRecords(value.atlas),
    };
  } catch { canSave = false; return defaults; }
}

const progress = loadProgress();
let selectedAtlasLevel = atlasSummary(progress.atlas).nextLevel || 1;
let roundId = 0;
let state = { mode: 'rush', phase: 'idle', board: [], novas: [], novaCountdown: 4, path: [], rng: null, score: 0, time: 60, elapsed: 0, combo: 0, lastMove: -Infinity, maxCombo: 1, charge: 0, feverUntil: 0, feverDuration: 10, dots: 0, loops: 0, moves: 0, shuffles: 3, bonusTime: 0, locked: false, startTotalDots: progress.totalDots, date: localDate(), mission: { stage: 0, progress: 0, completed: 0 }, novaBlasts: 0, badgesEarned: [], bestPassed: false };
let dragging = false;
let activePointer = null;
let lastPointer = null;
let modalResume = false;
let noticeTimer;
let toastTimer;
let forgeReleaseTimer;
let pendingPointer = null;
let layoutSignature = '';
let fitQueued = false;
let lastFrame = performance.now();

function saveProgress() {
  if (canSave) {
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); }
    catch { canSave = false; }
  }
  if (!canSave && !storageToastShown) {
    storageToastShown = true;
    toast('This browser is not saving progress. Your session still works.');
    document.querySelector('.recent-heading > span:last-child').textContent = 'This session only';
  }
  renderSaveStatus();
}

function renderSaveStatus() {
  $('save-status').textContent = canSave ? 'Saved on this device' : 'Session only';
  $('save-status').classList.toggle('session-only', !canSave);
  $('save-status').title = canSave ? 'Scores, stars, badges, and palettes stay in this browser. Active runs start fresh after a reload.' : 'Browser storage is unavailable. Progress lasts for this session.';
}

function getBest() { return state.mode === 'atlas' ? progress.atlas[selectedAtlasLevel]?.bestScore || 0 : state.mode === 'daily' ? progress.daily[state.date] || 0 : progress.bests[state.mode] || 0; }
function timed() { return state.mode === 'rush' || state.mode === 'daily'; }
function forgeEnabled() { return state.mode !== 'atlas'; }
function effects() { return expeditionEffects(state.expedition); }
function novaInterval() { return effects().novaInterval; }
function buildSize() { return Object.values(state.expedition?.perks || {}).reduce((total, level) => total + level, 0); }
function palette() { return PALETTES.find(p => p.id === progress.skin) || PALETTES[0]; }
function applyPalette() {
  palette().colors.forEach((color, index) => document.documentElement.style.setProperty(`--c${index}`, color));
  document.documentElement.style.setProperty('--accent', palette().colors[0]);
  updatePath();
}
function announce(message) { $('sr-status').textContent = message; }
function toast(message) {
  if (['playing', 'paused', 'draft'].includes(state.phase)) { notice(message, 2400); return; }
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('show');
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3300);
}
function notice(message, duration = 1900) {
  clearTimeout(noticeTimer); $('board-notice').textContent = message; $('board-notice').classList.add('show');
  noticeTimer = setTimeout(() => $('board-notice').classList.remove('show'), duration);
  announce(message);
}

function renderProgress() {
  const level = Math.max(0, LEVELS.findLastIndex(item => progress.totalDots >= item.dots));
  const next = LEVELS[level + 1];
  $('level-number').textContent = `LVL ${level + 1}`;
  $('level-name').textContent = LEVELS[level].name;
  $('total-dots').textContent = `${format(progress.totalDots)} dots connected`;
  $('next-level').textContent = next ? `${format(next.dots - progress.totalDots)} to next level` : 'Every color. Every possibility.';
  $('level-progress').style.width = `${next ? Math.min(100, (progress.totalDots - LEVELS[level].dots) / (next.dots - LEVELS[level].dots) * 100) : 100}%`;
  $('daily-date').textContent = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  $('daily-best').textContent = progress.daily[localDate()] ? format(progress.daily[localDate()]) : '—';
  $('best').textContent = format(getBest());
  $('achievement-count').textContent = `${Object.keys(progress.achievements).length} / ${ACHIEVEMENTS.length}`;
  $('atlas-star-count').textContent = `${atlasSummary(progress.atlas).stars} / 36 stars`;
  renderRecent();
}
function renderRecent() {
  const parent = $('recent-runs');
  if (!progress.runs.length) return;
  parent.replaceChildren(...progress.runs.map(run => {
    const chip = document.createElement('div'); chip.className = 'run-chip';
    const label = document.createElement('span'); label.textContent = `${run.mode === 'atlas' ? `Atlas ${run.levelId || 1}` : run.mode === 'expedition' ? 'Expedition' : run.mode === 'zen' ? 'Zen flow' : run.mode === 'daily' ? 'Daily loop' : 'Rush run'} · ${run.mode === 'atlas' ? `${run.stars || 0} stars` : run.mode === 'expedition' ? `${Math.min(5, run.stages || 0)}/5 stages` : `${format(run.dots)} dots`}`;
    const score = document.createElement('strong'); score.textContent = format(run.score);
    const text = document.createElement('div'); text.append(label, score);
    chip.append(text); chip.insertAdjacentHTML('beforeend', '<svg aria-hidden="true"><use href="#i-star"/></svg>');
    return chip;
  }));
}

function renderBoard(animate = false, cleared = []) {
  const cells = state.board.map((color, index) => {
    const button = document.createElement('button');
    button.className = 'dot'; button.dataset.index = index; button.dataset.color = color;
    const nova = state.novas.includes(index);
    button.classList.toggle('nova', nova); button.dataset.nova = String(nova);
    const favored = state.expedition && stageInfo(state.expedition)?.rule === 'color' && color === stageInfo(state.expedition).favorColor;
    button.classList.toggle('favored', !!favored); button.dataset.favored = String(!!favored);
    button.style.setProperty('--row', Math.floor(index / 6));
    button.setAttribute('aria-label', `${nova ? 'Nova, ' : ''}${COLOR_NAMES[color]}, row ${Math.floor(index / 6) + 1}, column ${index % 6 + 1}`);
    button.setAttribute('aria-pressed', 'false');
    button.tabIndex = index === 0 ? 0 : -1;
    const gem = document.createElement('span'); gem.className = 'gem'; button.append(gem);
    if (animate && (cleared.length === 0 || cleared.some(i => i % 6 === index % 6))) button.classList.add('falling');
    return button;
  });
  $('board').replaceChildren(...cells);
  updatePath();
}

function rhythm() { return rhythmState(state.combo, state.elapsed, state.rhythmReadyAt); }
function nextMultiplier() { return state.mode === 'atlas' ? 1 : state.mode === 'expedition' ? Math.min(5, state.combo + 1) : rhythm().next; }
function isLoop() { return state.path.length >= 5 && state.path.slice(0, -1).includes(state.path.at(-1)); }
function chargeForMove(move) { return (move.cleared.length * 2.5 + (move.loop ? 18 : 0) + move.detonated.length * 8) * effects().chargeFactor; }
function missionEvent(move, multiplier, feverStarted) {
  return { dots: move.cleared.length, moves: 1, novas: move.detonated.length, loops: Number(move.loop), combo: multiplier, chain: move.longest, fevers: Number(feverStarted) };
}
function updatePath() {
  const wasForgeReady = $('connection-tip').classList.contains('forge-ready');
  const previousLanding = $('connection-tip').dataset.forgeLanding;
  const loop = isLoop(); const color = state.board[state.path[0]];
  const preview = previewMove(state.board, state.path, { multiplier: nextMultiplier(), fever: state.feverUntil > state.elapsed, novas: state.novas, novaRadius: effects().novaRadius, forge: forgeEnabled() });
  const last = state.path.at(-1);
  const forgePriming = forgeEnabled() && !loop && state.path.length >= 3 && state.path.length < FORGE_CHAIN && !state.novas.includes(last) && state.novas.length - (preview?.detonated.length || 0) < 2;
  for (const dot of $('board').children) {
    const index = Number(dot.dataset.index);
    const selected = state.path.includes(index);
    dot.classList.toggle('selected', selected);
    dot.classList.toggle('loop-color', loop && Number(dot.dataset.color) === color);
    dot.classList.toggle('blast-preview', !!preview?.detonated.length && preview.cleared.includes(Number(dot.dataset.index)) && !selected);
    dot.classList.toggle('forge-tip', preview?.forged?.from === index);
    dot.classList.toggle('forge-landing', !!preview?.forged && preview.forged.index !== preview.forged.from && preview.forged.index === index);
    dot.classList.toggle('forge-priming', forgePriming && last === index);
    dot.setAttribute('aria-pressed', String(selected));
  }
  $('connection-path').setAttribute('d', state.path.map((index, i) => `${i ? 'L' : 'M'}${(index % 6) * 100 + 50},${Math.floor(index / 6) * 100 + 50}`).join(' '));
  document.querySelector('.connection-layer').style.color = palette().colors[color] || palette().colors[0];
  $('connection-tip').classList.toggle('forge-ready', !!preview?.forged);
  $('connection-tip').dataset.forgeLanding = preview?.forged ? String(preview.forged.index) : '';
  if (preview?.forged && (!wasForgeReady || previousLanding !== String(preview.forged.index)) && state.phase === 'playing') announce(`${preview.cleared.length} dots will clear. Release or press Enter on the endpoint to forge a Nova. After gravity it lands at row ${Math.floor(preview.forged.index / 6) + 1}, column ${preview.forged.index % 6 + 1}.`);
  $('connection-tip').style.display = last === undefined ? 'none' : '';
  $('connection-tip').setAttribute('cx', last === undefined ? -50 : (last % 6) * 100 + 50);
  $('connection-tip').setAttribute('cy', last === undefined ? -50 : Math.floor(last / 6) * 100 + 50);
  $('chain-status').classList.toggle('selecting', state.path.length >= 2);
  if (state.path.length >= 2) {
    const n = preview?.cleared.length || state.path.length;
    const startsFever = preview && state.feverUntil <= state.elapsed && state.charge + chargeForMove(preview) >= 100;
    const missionBonus = preview && !state.expedition && !state.atlas ? advanceMission(state.mission, missionEvent(preview, nextMultiplier(), startsFever)).completion?.reward || 0 : 0;
    const extra = preview ? expeditionBonus(state.expedition, preview, { board: state.board }) : 0;
    const feverExtra = preview ? feverExtension(preview, state.feverUntil > state.elapsed, state.feverBonus) : 0;
    $('chain-label').textContent = `${preview?.detonated.length ? 'NOVA! ' : loop ? 'LOOP! ' : ''}${n} dots · +${format((preview?.points || 0) + missionBonus + extra)} points${preview?.forged ? ' · Forge a Nova' : forgePriming ? ` · ${FORGE_CHAIN - state.path.length} more to forge` : missionBonus ? ' · mission!' : loop && timed() && state.bonusTime < 10 ? ' · +2s' : ''}${feverExtra ? ' · +1s Fever' : ''}`;
  } else if (state.phase === 'playing') $('chain-label').textContent = state.path.length ? 'Follow this color…' : forgeEnabled() ? 'Connect 2+ dots · Forge at 5' : 'Drag to connect matching colors';
}

function updateStats() {
  const inRound = ['playing', 'paused', 'draft'].includes(state.phase);
  document.body.classList.add('play-focused');
  document.body.classList.toggle('in-round', inRound);
  document.body.dataset.mode = state.mode;
  document.body.dataset.phase = state.phase;
  $('overlay-rules').hidden = !!state.atlas || state.phase !== 'idle';
  $('overlay-kicker').textContent = state.phase === 'paused' ? 'PAUSED' : state.phase === 'draft' ? 'UPGRADE READY' : state.phase === 'finished' ? 'PLAY AGAIN' : state.atlas ? `ATLAS · PUZZLE ${selectedAtlasLevel} OF 12` : MODE_COPY[state.mode].kicker;
  $('board').inert = state.phase !== 'playing';
  $('board').dataset.forgeEnabled = String(forgeEnabled());
  $('score').textContent = format(state.score);
  $('time-label').textContent = state.expedition || state.atlas ? 'MOVES LEFT' : state.mode === 'zen' ? 'PURE FLOW' : 'TIME LEFT';
  if (state.atlas) $('time').innerHTML = `${levelInfo(state.atlas).movesLeft}<span class="unit">moves</span>`;
  else if (state.expedition) $('time').innerHTML = `${state.expedition.movesLeft}<span class="unit">moves</span>`;
  else if (state.mode === 'zen') $('time').textContent = '∞';
  else $('time').innerHTML = `${Math.max(0, Math.ceil(state.time))}<span class="unit">s</span>`;
  document.querySelector('.time-stat').classList.toggle('low', state.phase === 'playing' && (state.atlas ? levelInfo(state.atlas).movesLeft <= 2 : state.expedition ? state.expedition.movesLeft <= 2 : timed() && state.time <= 10));
  document.querySelector('.fever-section').hidden = !!state.atlas;
  document.querySelector('.mode-bar').hidden = !!state.atlas;
  document.querySelector('.best-stat > span').textContent = state.atlas ? 'LEVEL BEST' : 'PERSONAL BEST';
  $('atlas-button').hidden = !!state.atlas;
  $('atlas-run-header').hidden = !state.atlas;
  const fever = state.feverUntil > state.elapsed;
  $('game-card').classList.toggle('fever', fever);
  $('fever-label').textContent = fever ? `Fever! Double points · ${Math.ceil(state.feverUntil - state.elapsed)}s` : 'Find your fire';
  $('fever-fill').style.width = `${fever ? Math.min(100, (state.feverUntil - state.elapsed) / state.feverDuration * 100) : state.charge}%`;
  const rhythmInfo = rhythm();
  const multiplier = state.atlas ? 1 : state.expedition ? Math.max(1, state.combo) : rhythmInfo.current;
  $('multiplier').textContent = `×${multiplier}${fever ? ' · ×2 fire' : ''}`;
  $('rhythm-section').hidden = !!state.atlas || !!state.expedition;
  $('rhythm-section').classList.toggle('cooling', rhythmInfo.next <= rhythmInfo.current && rhythmInfo.current < 5 && state.combo > 1);
  $('rhythm-fill').style.width = `${rhythmInfo.fill * 100}%`;
  $('rhythm-label').textContent = state.combo ? `Next clear ×${rhythmInfo.next}` : 'Connect to build rhythm';
  $('rhythm-section').setAttribute('aria-label', state.combo ? `Next clear multiplier ${rhythmInfo.next}. Rhythm loses one step per missed ${RHYTHM_WINDOW}-second window.` : 'Connect colors to build your rhythm multiplier.');
  $('shuffle-count').textContent = state.shuffles;
  $('shuffle-button').setAttribute('aria-label', state.atlas ? 'Shuffling is unavailable in Atlas. Every retry uses the same board.' : 'Shuffle board. Three shuffles per run.');
  $('shuffle-button').disabled = state.phase !== 'playing' || state.shuffles === 0 || state.locked;
  $('pause-button').disabled = !['playing', 'paused'].includes(state.phase);
  $('pause-button').setAttribute('aria-label', state.phase === 'paused' ? 'Resume game' : 'Pause game');
  $('pause-button').querySelector('use').setAttribute('href', state.phase === 'paused' ? '#i-play' : '#i-pause');
  $('finish-zen').hidden = !['zen', 'expedition', 'atlas'].includes(state.mode) || !['playing', 'paused', 'draft'].includes(state.phase);
  $('finish-zen').firstChild.textContent = state.atlas ? 'End puzzle ' : state.expedition ? 'End expedition ' : 'Finish session ';
  $('mode-description').hidden = !$('finish-zen').hidden;
  renderMission();
  renderExpedition();
  renderAtlas();
  const nextLayout = `${inRound}/${state.mode}/${buildSize()}`;
  if (nextLayout !== layoutSignature) { layoutSignature = nextLayout; schedulePlayfieldFit(); }
}

function schedulePlayfieldFit() {
  if (fitQueued) return;
  fitQueued = true;
  requestAnimationFrame(() => { fitQueued = false; fitPlayfield(); });
}
function fitPlayfield() {
  const column = document.querySelector('.game-column');
  if (!document.body.classList.contains('play-focused')) { column.style.removeProperty('--play-width'); return; }
  const shell = document.querySelector('.site-shell');
  const shellStyle = getComputedStyle(shell);
  const maxWidth = Math.min(600, shell.clientWidth - parseFloat(shellStyle.paddingLeft) - parseFloat(shellStyle.paddingRight));
  column.style.setProperty('--play-width', `${maxWidth}px`);
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  for (let pass = 0; pass < 3; pass++) {
    const columnRect = column.getBoundingClientRect();
    const boardWidth = $('board-wrap').getBoundingClientRect().width;
    const overhead = columnRect.height - boardWidth;
    const available = viewportHeight - columnRect.top - overhead - 10;
    const target = Math.min(boardWidth, Math.max(252, available));
    const width = Math.min(maxWidth, columnRect.width - boardWidth + target);
    column.style.setProperty('--play-width', `${width}px`);
  }
}

function renderMission() {
  $('mission-strip').hidden = !!state.expedition || !!state.atlas;
  const mission = currentMission(state.mission);
  $('mission-title').textContent = mission.title;
  $('mission-bonus').textContent = `+${format(mission.reward)}`;
  $('mission-progress').textContent = `${mission.progress} / ${mission.target}`;
  $('mission-fill').style.width = `${mission.progress / mission.target * 100}%`;
  $('mission-strip').setAttribute('aria-label', `Mission ${mission.number}: ${mission.title}. ${mission.progress} of ${mission.target}. Reward ${mission.reward} points.`);
  $('nova-countdown').textContent = state.novas.length >= 2 ? '2 Novas ready' : `Nova in ${state.novaCountdown} clears`;
}

function renderExpedition() {
  const strip = $('expedition-strip'); const tray = $('build-tray');
  strip.hidden = !state.expedition; tray.hidden = !state.expedition;
  if (!state.expedition) return;
  const run = state.expedition; const stage = stageInfo(run);
  strip.dataset.stage = String(run.stage + 1); strip.dataset.target = String(stage.target);
  strip.dataset.cleared = String(run.cleared); strip.dataset.moves = String(run.movesLeft);
  strip.dataset.rule = stage.rule;
  $('stage-title').textContent = `${String(run.stage + 1).padStart(2, '0')} · ${stage.name}`;
  $('stage-number').textContent = run.stage + 1;
  $('stage-progress').textContent = `${Math.min(stage.target, run.cleared)} / ${stage.target} dots`;
  $('stage-moves').textContent = `${run.movesLeft} ${run.movesLeft === 1 ? 'move' : 'moves'}`;
  $('stage-rule').textContent = stage.rule === 'color' ? `${COLOR_NAMES[stage.favorColor].split(' ')[0]} dots: +25 each` : stage.bonusDescription;
  $('stage-fill').style.width = `${Math.min(100, run.cleared / stage.target * 100)}%`;
  $('stage-nova').textContent = state.novas.length >= 2 ? '2 Novas ready' : `Nova in ${state.novaCountdown} clears`;
  const signature = JSON.stringify(run.perks);
  if (tray.dataset.build !== signature) {
    tray.dataset.build = signature;
    const chosen = PERKS.filter(perk => run.perks[perk.id] > 0);
    if (!chosen.length) {
      const hint = document.createElement('span'); hint.className = 'build-empty'; hint.textContent = 'Clear a stage. Choose an upgrade. Make the run your own.';
      tray.replaceChildren(hint);
    } else {
      tray.replaceChildren(...chosen.map(perk => {
        const chip = document.createElement('span'); chip.className = 'build-chip'; chip.dataset.perk = perk.id; chip.dataset.level = run.perks[perk.id];
        chip.textContent = `${perk.name}${run.perks[perk.id] > 1 ? ` ×${run.perks[perk.id]}` : ''}`; chip.title = perk.description;
        return chip;
      }));
    }
  }
}

function atlasGoal(info, includeVerb = true) {
  const noun = info.goal === 'novas' ? `Nova${info.target === 1 ? '' : 's'}` : info.goal === 'loops' ? `loop${info.target === 1 ? '' : 's'}` : 'dots';
  return `${includeVerb ? info.goal === 'novas' ? 'Detonate ' : info.goal === 'loops' ? 'Close ' : 'Clear ' : ''}${info.target} ${noun}`;
}
function movesLabel(moves) { return `${moves} ${moves === 1 ? 'move' : 'moves'}`; }

function renderAtlas() {
  $('atlas-strip').hidden = !state.atlas;
  if (!state.atlas) return;
  const info = levelInfo(state.atlas);
  const strip = $('atlas-strip');
  strip.dataset.level = info.id; strip.dataset.goal = info.goal; strip.dataset.target = info.target;
  strip.dataset.progress = info.progress; strip.dataset.moves = info.movesLeft;
  $('atlas-level-title').textContent = `${String(info.id).padStart(2, '0')} · ${info.name}`;
  $('atlas-run-name').textContent = `${info.constellation} · ${info.name}`;
  $('atlas-moves').textContent = `${info.movesLeft} ${info.movesLeft === 1 ? 'move' : 'moves'} left`;
  $('atlas-goal').textContent = atlasGoal(info);
  $('atlas-progress').textContent = `${Math.min(info.target, info.progress)} / ${info.target}`;
  $('atlas-fill').style.width = `${Math.min(100, info.progress / info.target * 100)}%`;
  $('atlas-par-text').textContent = `★★ ${movesLabel(info.par)} · ★★★ ${movesLabel(info.expert)}`;
  $('atlas-nova').textContent = state.novas.length >= 2 ? '2 Novas ready' : `Nova in ${state.novaCountdown} clears`;
  strip.setAttribute('aria-label', `${info.name}. ${atlasGoal(info)}. ${info.progress} of ${info.target}, ${info.movesLeft} moves left.`);
}

function starElements(stars) {
  return Array.from({ length: 3 }, (_, index) => {
    const star = document.createElement('span'); star.textContent = '★';
    star.classList.toggle('earned', index < stars); star.setAttribute('aria-hidden', 'true'); return star;
  });
}

function renderAtlasMap() {
  const summary = atlasSummary(progress.atlas);
  $('atlas-summary').textContent = `${summary.stars} / 36 stars · ${summary.completed} / 12 puzzles connected`;
  const chapters = [...new Set(ATLAS_LEVELS.map(level => level.constellation))];
  $('atlas-map').replaceChildren(...chapters.map(chapter => {
    const levels = ATLAS_LEVELS.filter(level => level.constellation === chapter);
    const section = document.createElement('section'); section.className = 'atlas-chapter';
    const heading = document.createElement('div'); heading.className = 'atlas-chapter-header';
    const title = document.createElement('h3'); title.textContent = chapter;
    const count = document.createElement('span'); count.className = 'atlas-chapter-total';
    count.textContent = `${levels.reduce((total, level) => total + (progress.atlas[level.id]?.stars || 0), 0)} / 12 stars`;
    heading.append(title, count);
    const nodes = document.createElement('div'); nodes.className = 'atlas-nodes';
    nodes.append(...levels.map(level => {
      const saved = progress.atlas[level.id]; const unlocked = isLevelUnlocked(progress.atlas, level.id);
      const button = document.createElement('button'); button.className = 'atlas-node';
      button.dataset.level = level.id; button.dataset.locked = String(!unlocked);
      button.dataset.current = String(summary.nextLevel === level.id);
      button.classList.toggle('completed', !!saved?.stars); button.disabled = !unlocked;
      const number = document.createElement('span'); number.className = 'atlas-node-number'; number.textContent = String(level.id).padStart(2, '0');
      const name = document.createElement('strong'); name.textContent = level.name;
      const goal = document.createElement('span'); goal.className = 'atlas-node-goal'; goal.textContent = atlasGoal(level);
      const stars = document.createElement('span'); stars.className = 'atlas-node-stars'; stars.append(...starElements(saved?.stars || 0));
      const best = document.createElement('span'); best.className = 'atlas-node-best';
      best.textContent = unlocked ? saved ? `Best: ${movesLabel(saved.bestMoves)}` : `Expert: ${movesLabel(level.expert)}` : `Clear puzzle ${level.id - 1} to unlock`;
      button.setAttribute('aria-label', `${level.id}. ${level.name}. ${atlasGoal(level)}. ${saved?.stars || 0} of 3 stars. ${unlocked ? `${level.budget} moves, expert ${level.expert}.` : 'Locked.'}`);
      button.append(number, name, goal, stars, best);
      button.addEventListener('click', () => launchAtlas(level.id));
      return button;
    }));
    section.append(heading, nodes); return section;
  }));
}

function launchAtlas(id) {
  if (!isLevelUnlocked(progress.atlas, id)) return;
  selectedAtlasLevel = Number(id); modalResume = false;
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  prepare('atlas'); start();
  $('game-card').scrollIntoView({ behavior: 'auto', block: 'center' });
}

function showPerkDraft() {
  if (state.phase !== 'draft' || !state.expedition?.awaitingUpgrade) return;
  if (document.querySelector('dialog[open]')) { showDraftOverlay(); return; }
  if (!state.perkOffers.length) state.perkOffers = offerPerks(state.expedition, state.perkRng);
  $('perk-stage').textContent = `STAGE ${state.expedition.stage + 1} COMPLETE`;
  $('perk-options').replaceChildren(...state.perkOffers.map(perk => {
    const button = document.createElement('button'); button.className = 'perk-option'; button.dataset.perk = perk.id;
    const icons = { breath: 'arrow', nursery: 'star', chain: 'arrow', orbit: 'retry', spark: 'flame', giant: 'star' };
    button.insertAdjacentHTML('afterbegin', `<span class="perk-icon"><svg aria-hidden="true"><use href="#i-${icons[perk.id]}"/></svg></span>`);
    const name = document.createElement('strong'); name.textContent = perk.name;
    const level = document.createElement('span'); level.className = 'perk-level'; level.textContent = `LEVEL ${(state.expedition.perks[perk.id] || 0) + 1} / ${perk.max}`;
    const description = document.createElement('p'); description.textContent = perk.description;
    const select = document.createElement('span'); select.className = 'perk-select'; select.textContent = 'Make it yours →';
    button.append(level, name, description, select);
    button.addEventListener('click', () => {
      const next = choosePerk(state.expedition, perk.id); if (!next || state.phase !== 'draft') return;
      const previousEffects = effects();
      state.expedition = next; state.perkOffers = []; state.phase = 'playing';
      state.novaCountdown = Math.max(1, state.novaCountdown + effects().novaInterval - previousEffects.novaInterval);
      if (state.feverUntil > state.elapsed) {
        state.feverUntil += effects().feverDuration - previousEffects.feverDuration;
        state.feverDuration = effects().feverDuration;
      }
      progress.stats.maxBuild = Math.max(progress.stats.maxBuild || 0, buildSize());
      checkAchievements(); saveProgress(); renderProgress();
      modalResume = false; $('perk-dialog').close(); $('board-overlay').hidden = true;
      lastFrame = performance.now(); renderBoard(); updateStats(); sound.reward();
      notice(`Stage ${next.stage + 1}. ${perk.name} joins your build.`, 1800);
    });
    return button;
  }));
  $('board-overlay').hidden = true;
  modalResume = false; $('perk-dialog').showModal(); sound.reward();
}

function showDraftOverlay() {
  $('board-overlay').hidden = false; $('overlay-title').textContent = 'A pause for possibilities.';
  $('overlay-copy').innerHTML = 'Your next stage is ready.<br>Choose an upgrade to continue.';
  $('start-button').innerHTML = 'Choose your upgrade <svg><use href="#i-star"/></svg>';
  $('overlay-hint').textContent = 'Your board and build are waiting.';
}

function addNova() {
  if (state.novas.length >= 2) return false;
  const index = spawnNova(state.board, state.rng, state.novas);
  if (index === null) return false;
  state.novas.push(index); return true;
}

function checkAchievements(silent = false) {
  const stats = { ...progress.stats, dots: progress.totalDots, loops: progress.totalLoops };
  const earned = findNewAchievements(stats, progress.achievements);
  for (const item of earned) progress.achievements[item.id] = new Date().toISOString();
  if (earned.length && !silent) {
    state.badgesEarned.push(...earned.map(item => item.id));
    toast(`Badge earned: ${earned[0].title}${earned.length > 1 ? ` + ${earned.length - 1} more` : ''}. Yours to keep.`);
  }
  return earned;
}

function prepare(mode = state.mode) {
  roundId++;
  clearPendingPointer();
  clearTimeout(toastTimer); clearTimeout(noticeTimer);
  clearTimeout(forgeReleaseTimer); $('board-wrap').classList.remove('forge-release');
  $('connection-tip').classList.remove('forge-ready');
  $('toast').classList.remove('show'); $('mission-strip').classList.remove('completed');
  dragging = false; lastPointer = null; activePointer = null;
  state = { mode, phase: 'idle', board: [], novas: [], novaCountdown: 4, path: [], rng: createRng(seedFromText(mode === 'daily' ? `chroma-v3-${localDate()}` : 'chroma-welcome-v2')), score: 0, time: 60, elapsed: 0, combo: 0, lastMove: -Infinity, maxCombo: 1, charge: 0, feverUntil: 0, feverDuration: 10, dots: 0, loops: 0, moves: 0, shuffles: 3, bonusTime: 0, locked: false, startTotalDots: progress.totalDots, date: localDate(), mission: { stage: 0, progress: 0, completed: 0 }, novaBlasts: 0, forges: 0, badgesEarned: [], bestPassed: false, expedition: mode === 'expedition' ? createExpedition() : null, perkRng: createRng(12345), perkOffers: [] };
  state.rhythmReadyAt = -Infinity; state.feverBonus = 0; state.rhythmPeakAnnounced = false;
  state.atlas = mode === 'atlas' ? createAtlas(selectedAtlasLevel) : null;
  state.atlasStartRecord = state.atlas ? { ...progress.atlas[selectedAtlasLevel] } : null;
  if (state.atlas) {
    const puzzle = makeAtlasBoard(selectedAtlasLevel);
    state.board = puzzle.board; state.novas = puzzle.novas; state.rng = puzzle.rng; state.shuffles = 0;
  } else {
    state.board = makeBoard(state.rng); addNova();
  }
  $('particles').replaceChildren();
  $('reward-score').replaceChildren();
  $('board-notice').classList.remove('show');
  document.querySelectorAll('.mode-button').forEach(button => { const active = button.dataset.mode === mode; button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); });
  $('board-overlay').hidden = false;
  const copy = MODE_COPY[mode] || MODE_COPY.rush;
  $('mode-name').textContent = copy.name; $('mode-summary').textContent = copy.summary;
  $('overlay-title').textContent = copy.title; $('overlay-copy').innerHTML = copy.copy;
  $('start-button').innerHTML = `${copy.button} <svg><use href="#i-play"/></svg>`;
  $('overlay-hint').textContent = copy.hint;
  $('chain-label').textContent = forgeEnabled() ? 'Connect 2+ dots · Forge at 5' : 'Drag to connect matching colors';
  $('mode-description').textContent = copy.summary;
  if (state.atlas) {
    const info = levelInfo(state.atlas);
    $('overlay-title').textContent = info.name;
    $('overlay-copy').textContent = `${atlasGoal(info)} in ${info.budget} moves. Same board, every attempt.`;
    $('start-button').innerHTML = 'Connect this constellation <svg><use href="#i-star"/></svg>';
    $('overlay-hint').textContent = `★★ ${movesLabel(info.par)} · ★★★ ${movesLabel(info.expert)} · No timer`;
    $('mode-description').textContent = 'The same sky. A better route.';
    $('mode-name').textContent = 'Atlas'; $('mode-summary').textContent = `Puzzle ${info.id} · ${atlasGoal(info)}`;
  }
  renderBoard(); updateStats(); renderProgress(); renderSaveStatus();
}

function start() {
  if (state.phase === 'draft') { showPerkDraft(); return; }
  if (state.phase === 'paused') { resume(); return; }
  if (state.phase === 'playing') return;
  const mode = state.mode; prepare(mode);
  if (!['daily', 'atlas'].includes(mode)) {
    const seed = seedFromText(`${Date.now()}-${Math.random()}`);
    state.rng = createRng(seed); state.perkRng = createRng(seed ^ 0x9e3779b9);
    state.board = makeBoard(state.rng);
    state.novas = []; addNova();
  }
  state.phase = 'playing'; lastFrame = performance.now();
  renderBoard(true); updateStats(); $('board-overlay').hidden = true;
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  schedulePlayfieldFit();
  sound.unlock(); sound.click();
  announce(`${mode} game started. Connect matching colors. ${mode === 'atlas' ? `${atlasGoal(levelInfo(state.atlas))}. ${levelInfo(state.atlas).budget} moves. No timer or shuffles.` : mode === 'expedition' ? 'Five untimed stages. Clear the dot targets within your move budget.' : mode === 'zen' ? 'No timer.' : '60 seconds.'}`);
}

function pause(showOverlay = true) {
  if (state.phase !== 'playing') return;
  state.phase = 'paused'; cancelPath();
  if (showOverlay) {
    $('board-overlay').hidden = false; $('overlay-title').textContent = 'Right where you left it.';
    $('overlay-copy').innerHTML = 'Your board, build, and rhythm are safe.<br>Continue when you\'re ready.';
    $('start-button').innerHTML = 'Back to the flow <svg><use href="#i-play"/></svg>';
    $('overlay-hint').textContent = 'The clock is paused.';
  }
  $('chain-label').textContent = 'Paused · Your progress is held';
  updateStats(); announce('Game paused. The clock is stopped.');
}
function resume() {
  if (state.phase !== 'paused') return;
  state.phase = 'playing'; lastFrame = performance.now(); $('board-overlay').hidden = true;
  $('chain-label').textContent = forgeEnabled() ? 'Connect 2+ dots · Forge at 5' : 'Drag to connect matching colors'; updateStats(); sound.unlock();
  announce('Game resumed.');
}
function clearPendingPointer() {
  const pending = pendingPointer; pendingPointer = null;
  if (pending) { try { $('board').releasePointerCapture(pending.id); } catch {} }
}
function cancelPath() { clearPendingPointer(); state.path = []; dragging = false; lastPointer = null; activePointer = null; updatePath(); }
function beginHeldPointer() {
  const pending = pendingPointer;
  if (!pending) return;
  if (pending.round !== roundId || state.phase !== 'playing' || state.locked) { clearPendingPointer(); return; }
  const index = hitAt(pending.x, pending.y);
  if (index === null) { clearPendingPointer(); return; }
  pendingPointer = null; state.path = []; dragging = true; activePointer = pending.id;
  lastPointer = { x: pending.x, y: pending.y }; addToPath(index); focusDot(index);
}

function addToPath(index) {
  if (state.phase !== 'playing' || state.locked) return;
  const old = state.path; const next = extendPath(state.board, old, index);
  if (next.length === old.length && next.every((value, i) => value === old[i])) return;
  state.path = next;
  if (next.length > old.length) sound.select(new Set(next).size, state.board[next[0]]);
  updatePath();
}

function burst(indexes, color) {
  if (reducedMotion) return;
  const parent = $('particles');
  for (const index of indexes.slice(0, 12)) {
    for (let i = 0; i < 3; i++) {
      const particle = document.createElement('i'); particle.className = 'particle';
      const angle = Math.PI * 2 * i / 3 + Math.random(); const radius = 16 + Math.random() * 18;
      particle.style.cssText = `left:${(index % 6 + .5) / 6 * 100}%;top:${(Math.floor(index / 6) + .5) / 6 * 100}%;--dx:${Math.cos(angle) * radius}px;--dy:${Math.sin(angle) * radius}px;--particle-color:${palette().colors[color]}`;
      parent.append(particle); particle.addEventListener('animationend', () => particle.remove(), { once: true });
    }
  }
}
function floatScore(points, label, color) {
  const dock = $('reward-score');
  const item = document.createElement('div'); item.className = 'score-float';
  item.style.color = palette().colors[color]; item.textContent = `+${format(points)}`;
  const sub = document.createElement('small'); sub.textContent = label; item.append(sub);
  dock.replaceChildren(item);
  item.title = `${format(points)} points${label ? `. ${label}` : ''}`;
}

function novaWaves(indexes) {
  if (reducedMotion) return;
  for (const [order, index] of indexes.entries()) {
    const wave = document.createElement('i'); wave.className = 'nova-wave';
    wave.classList.toggle('giant-wave', effects().novaRadius === 2);
    wave.style.left = `${(index % 6 + .5) / 6 * 100}%`;
    wave.style.top = `${(Math.floor(index / 6) + .5) / 6 * 100}%`;
    wave.style.animationDelay = `${order * 60}ms`;
    $('particles').append(wave); wave.addEventListener('animationend', () => wave.remove(), { once: true });
  }
}

function commitMove(focusAfter = null) {
  dragging = false; lastPointer = null; activePointer = null;
  if (state.phase !== 'playing' || state.locked) { cancelPath(); return; }
  const multiplier = nextMultiplier(); const fever = !state.atlas && state.feverUntil > state.elapsed;
  const beforeBoard = state.board;
  const result = resolveMove(state.board, state.path, state.rng, { multiplier, fever, novas: state.novas, novaRadius: effects().novaRadius, forge: forgeEnabled() });
  if (!result) { cancelPath(); return; }
  const feverExtra = feverExtension(result, fever, state.feverBonus);
  const expeditionPoints = expeditionBonus(state.expedition, result, { board: beforeBoard });
  const expeditionStep = state.expedition ? advanceExpedition(state.expedition, result) : null;
  const atlasStep = state.atlas ? advanceAtlas(state.atlas, result) : null;
  const thisRound = roundId;
  state.locked = true; state.board = result.board; state.novas = result.novas;
  state.combo = multiplier; state.maxCombo = Math.max(state.maxCombo, multiplier); state.lastMove = state.elapsed;
  state.rhythmReadyAt = Infinity;
  state.score += result.points + expeditionPoints; state.dots += result.cleared.length; state.moves++;
  state.novaBlasts += result.detonated.length;
  state.forges += Number(!!result.forged);
  const dotsBefore = progress.totalDots;
  progress.totalDots += result.cleared.length;
  if (result.loop) progress.totalLoops++;
  if (result.loop) {
    state.loops++;
    const bonus = timed() ? Math.min(2, 10 - state.bonusTime) : 0;
    state.time += bonus; state.bonusTime += bonus;
    notice(bonus ? `Beautiful loop. +${bonus}s of possibilities.` : 'Beautiful loop. Every dot, gone.');
  } else if (multiplier === 5 && !state.rhythmPeakAnnounced) { state.rhythmPeakAnnounced = true; notice('In the zone. ×5 multiplier.', 1000); }
  let feverStarted = false;
  if (!fever && !state.atlas) {
    state.charge = Math.min(100, state.charge + chargeForMove(result));
    if (state.charge >= 100) {
      const duration = effects().feverDuration;
      state.charge = 0; state.feverUntil = state.elapsed + duration; state.feverDuration = duration;
      state.feverBonus = 0;
      feverStarted = true;
      sound.fever(); setTimeout(() => { if (roundId === thisRound && state.phase === 'playing') notice(`FEVER! ${duration} seconds of double points.`, 2000); }, result.loop ? 1200 : 200);
    }
  }
  if (feverExtra) {
    state.feverUntil += feverExtra; state.feverDuration += feverExtra; state.feverBonus += feverExtra;
  }
  const mission = state.expedition || state.atlas ? { mission: state.mission, completion: null } : advanceMission(state.mission, missionEvent(result, multiplier, feverStarted));
  state.mission = mission.mission;
  const bonus = mission.completion?.reward || 0;
  state.score += bonus;
  if (mission.completion) {
    sound.reward();
    $('mission-strip').classList.remove('completed');
    void $('mission-strip').offsetWidth;
    $('mission-strip').classList.add('completed');
    toast(`Mission ${mission.completion.number} complete. +${format(bonus)} points. Next little win ready.`);
  }
  const orbitNova = result.loop && effects().loopNova && addNova();
  state.novaCountdown--;
  let novaSpawned = false;
  if (state.novaCountdown <= 0) {
    novaSpawned = addNova();
    state.novaCountdown = novaInterval();
  }
  if (expeditionStep) {
    state.expedition = expeditionStep.run;
    if (expeditionStep.status === 'upgrade') state.phase = 'draft';
  }
  if (atlasStep) {
    state.atlas = atlasStep.run;
    if (state.atlas.won) progress.atlas = recordAtlasResult(progress.atlas, state.atlas, state.score);
  }
  if (result.detonated.length) {
    sound.nova(result.detonated.length);
    notice(result.detonated.length > 1 ? `CHAIN REACTION! ${result.cleared.length} dots, one move.` : `SUPERNOVA! ${result.cleared.length} dots cleared.`);
    novaWaves(result.detonated);
    result.detonated.forEach((index, order) => {
      const dot = $('board').children[index];
      dot?.classList.add('nova-detonating'); dot?.style.setProperty('--blast-order', order);
    });
  }
  if (result.forged) {
    sound.forge();
    if (!result.detonated.length) notice('Nova forged. Your next blast, your choice.', 1600);
    clearTimeout(forgeReleaseTimer); $('board-wrap').classList.remove('forge-release');
    void $('board-wrap').offsetWidth;
    $('board-wrap').classList.add('forge-release');
    forgeReleaseTimer = setTimeout(() => { if (roundId === thisRound) $('board-wrap').classList.remove('forge-release'); }, 450);
  }
  const stats = progress.stats;
  stats.novas = (stats.novas || 0) + result.detonated.length;
  stats.forges = (stats.forges || 0) + Number(!!result.forged);
  stats.fevers = (stats.fevers || 0) + Number(feverStarted);
  stats.maxChain = Math.max(stats.maxChain || 0, result.longest);
  stats.maxCombo = Math.max(stats.maxCombo || 0, multiplier);
  stats.maxCascade = Math.max(stats.maxCascade || 0, result.detonated.length);
  stats.maxRunLoops = Math.max(stats.maxRunLoops || 0, state.loops);
  stats.maxMissions = Math.max(stats.maxMissions || 0, state.mission.completed);
  stats.maxScore = Math.max(stats.maxScore || 0, state.score);
  if (state.expedition) stats.maxExpeditionStage = Math.max(stats.maxExpeditionStage || 0, state.expedition.completedStages);
  const discovered = PALETTES.find(item => item.dots > dotsBefore && item.dots <= progress.totalDots);
  if (discovered) toast(`A new color mood: ${discovered.name} is yours.`);
  checkAchievements(); saveProgress(); renderProgress();
  if (!state.bestPassed && getBest() > 0 && state.score > getBest()) {
    state.bestPassed = true;
    if (!result.detonated.length && !result.forged && !mission.completion) notice('Past your personal best. Keep your rhythm.');
  }
  sound.clear(result.cleared.length, result.loop, multiplier);
  result.cleared.forEach(index => $('board').children[index]?.classList.add('clearing'));
  burst(result.cleared, result.color);
  const rewardLabel = result.forged ? 'NOVA FORGED' : expeditionPoints ? `YOUR BUILD · +${format(expeditionPoints)} BONUS` : mission.completion ? `MISSION COMPLETE · +${format(bonus)} BONUS` : result.detonated.length > 1 ? 'CHAIN REACTION' : result.detonated.length ? 'SUPERNOVA' : result.loop ? 'FULL COLOR CLEAR' : multiplier > 1 ? `×${multiplier} RHYTHM${fever ? ' · DOUBLE POINTS' : ''}` : result.cleared.length > 4 ? 'NICE CONNECTION' : '';
  floatScore(result.points + bonus + expeditionPoints, `${rewardLabel}${feverExtra ? ' · +1s FEVER' : ''}`, result.color);
  state.path = []; $('connection-path').setAttribute('d', ''); $('connection-tip').style.display = 'none';
  $('connection-tip').classList.remove('forge-ready');
  $('chain-status').classList.remove('selecting'); $('chain-label').textContent = result.forged ? 'A star you shaped. Set up your next blast.' : result.detonated.length ? 'A little star. A beautiful ripple.' : result.loop ? 'That felt good. Find your next color.' : 'Keep the rhythm. Find your next connection.';
  updateStats(); announce(`${result.cleared.length} dots cleared. ${result.points + bonus + expeditionPoints} points. Score ${state.score}.${result.forged ? ' Nova forged at your chain endpoint.' : ''}${feverExtra ? ' One second of Fever earned.' : ''}${mission.completion ? ' Mission complete.' : ''}`);
  setTimeout(() => {
    if (roundId !== thisRound) return;
    state.locked = false; state.rhythmReadyAt = state.elapsed; renderBoard(true, result.cleared); updateStats();
    if (result.forged) {
      const dot = $('board').children[result.forged.index]; dot?.classList.add('forged-new');
      dot?.addEventListener('animationend', event => { if (event.animationName === 'forge-birth') dot.classList.remove('forged-new'); });
      if (reducedMotion) dot?.classList.remove('forged-new');
    }
    if (expeditionStep?.status === 'upgrade' && state.phase === 'draft') { showPerkDraft(); return; }
    if (['won', 'lost'].includes(expeditionStep?.status) && ['playing', 'paused'].includes(state.phase)) { finish(); return; }
    if (['won', 'lost'].includes(atlasStep?.status) && ['playing', 'paused'].includes(state.phase)) { finish(); return; }
    if (Number.isInteger(focusAfter) && state.phase === 'playing') focusDot(focusAfter);
    beginHeldPointer();
    if (result.reshuffled) notice('Fresh connections. Board automatically shuffled.');
    else if ((novaSpawned || orbitNova) && !result.detonated.length && !result.forged && !mission.completion) notice('A fresh Nova. Follow the star.', 1300);
  }, reducedMotion ? 35 : result.detonated.length > 1 ? 310 : result.forged ? 270 : result.detonated.length ? 240 : 210);
}

function shuffle() {
  if (state.phase !== 'playing' || state.locked || state.shuffles <= 0) return;
  cancelPath(); state.shuffles--;
  // A fresh seeded board ensures a legal next move, including in Daily.
  const novaCount = Math.max(1, state.novas.length);
  state.board = makeBoard(state.rng); state.novas = [];
  for (let i = 0; i < novaCount; i++) addNova();
  renderBoard(true); updateStats(); sound.click();
  notice('A fresh perspective. Find your next loop.', 1400);
}

function finish() {
  if (!['playing', 'paused', 'draft'].includes(state.phase)) return;
  state.phase = 'finished'; cancelPath();
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  const previousBest = state.atlas ? state.atlasStartRecord.bestScore || 0 : getBest();
  const record = state.score > previousBest && (!state.atlas || state.atlas.won);
  const previousDots = state.startTotalDots;
  if (state.mode === 'daily') progress.daily[state.date] = Math.max(previousBest, state.score);
  else if (!state.atlas) progress.bests[state.mode] = Math.max(previousBest, state.score);
  const run = { mode: state.mode, score: state.score, dots: state.dots, loops: state.loops, forges: state.forges, date: state.date };
  if (state.expedition) {
    run.stages = state.expedition.completedStages; run.perks = { ...state.expedition.perks }; run.won = state.expedition.won;
    if (state.expedition.won) progress.stats.expeditionWins = (progress.stats.expeditionWins || 0) + 1;
    checkAchievements();
  }
  const atlasStars = state.atlas ? starsForRun(state.atlas) : 0;
  const oldAtlasStars = state.atlas ? state.atlasStartRecord.stars || 0 : 0;
  if (state.atlas) {
    run.levelId = selectedAtlasLevel; run.stars = atlasStars;
    progress.atlas = recordAtlasResult(progress.atlas, state.atlas, state.score);
  }
  progress.runs.unshift(run);
  progress.runs = progress.runs.slice(0, 5); saveProgress(); renderProgress(); updateStats(); sound.finish();
  $('result-mode').textContent = state.atlas ? `Atlas · ${levelInfo(state.atlas).name}` : MODE_COPY[state.mode].name;
  $('result-kicker').textContent = record ? 'NEW PERSONAL BEST' : state.mode === 'zen' ? 'SESSION COMPLETE' : state.mode === 'daily' ? 'DAILY SCORE' : 'ROUND COMPLETE';
  $('result-title').textContent = record ? 'Your new high score.' : state.mode === 'zen' ? 'A good place to return.' : 'Every connection counted.';
  if (state.expedition) {
    $('result-kicker').textContent = state.expedition.won ? 'ALL FIVE STAGES CLEARED' : `${state.expedition.completedStages} OF 5 STAGES CLEARED`;
    $('result-title').textContent = state.expedition.won ? 'Expedition complete.' : 'Your expedition.';
  }
  $('result-atlas').hidden = !state.atlas;
  $('atlas-result-map').hidden = !state.atlas;
  $('atlas-next').hidden = !state.atlas?.won || selectedAtlasLevel >= ATLAS_LEVELS.length;
  $('result-dialog').classList.toggle('atlas-result', !!state.atlas);
  $('play-again').firstChild.textContent = state.atlas ? atlasStars === 3 ? 'Replay this puzzle ' : 'Find a better route ' : 'One more round ';
  if (state.atlas) {
    const info = levelInfo(state.atlas);
    $('result-kicker').textContent = `${info.constellation.toUpperCase()} · PUZZLE ${info.id} OF 12`;
    $('result-title').textContent = atlasStars === 3 ? 'A perfect constellation.' : state.atlas.won ? 'Constellation complete.' : 'Find another route.';
    const stars = $('result-atlas-stars'); stars.replaceChildren(...starElements(atlasStars));
    stars.dataset.stars = atlasStars; stars.setAttribute('role', 'img'); stars.setAttribute('aria-label', `${atlasStars} of 3 stars earned`);
    $('result-atlas-detail').textContent = state.atlas.won
      ? `${movesLabel(state.atlas.moves)} · ${atlasStars > oldAtlasStars ? `+${atlasStars - oldAtlasStars} new ${atlasStars - oldAtlasStars === 1 ? 'star' : 'stars'}` : 'Your best stars stay yours'}${atlasStars < 3 ? ` · ${movesLabel(atlasStars === 1 ? info.par : info.expert)} for the next star` : ' · Perfect route'}`
      : `${Math.min(info.target, info.progress)} / ${info.target} toward your goal · ${info.budget} moves available on retry`;
    if (!$('atlas-next').hidden) $('atlas-next').firstChild.textContent = `Next: ${ATLAS_LEVELS.find(level => level.id === selectedAtlasLevel + 1).name} `;
  }
  $('result-score').textContent = format(state.score);
  $('result-best').textContent = record ? `✧ New ${state.mode === 'daily' ? 'daily ' : ''}best · ${previousBest ? `+${format(state.score - previousBest)} points` : 'Your first mark on the board'}` : previousBest ? `Personal best: ${format(previousBest)}` : 'Your next connection is waiting';
  $('result-best').classList.toggle('record', record);
  $('result-dots').textContent = format(state.dots); $('result-loops').textContent = state.loops; $('result-combo').textContent = `×${state.maxCombo}`;
  $('result-novas').textContent = state.novaBlasts; $('result-missions').textContent = state.mission.completed;
  $('result-forges').textContent = state.forges; $('result-forges').parentElement.hidden = !!state.atlas;
  $('result-missions').nextSibling.textContent = state.expedition ? ' stages complete' : ' missions complete';
  if (state.expedition) $('result-missions').textContent = state.expedition.completedStages;
  const rank = rankForScore(state.score); $('result-rank').textContent = rank.title; $('result-rank').style.setProperty('--rank-color', rank.color);
  $('result-rank').hidden = !!state.atlas;
  $('result-missions').parentElement.hidden = !!state.atlas;
  const unlocked = PALETTES.find(item => item.dots > previousDots && item.dots <= progress.totalDots);
  const next = PALETTES.find(item => item.dots > progress.totalDots);
  $('result-progress').textContent = unlocked ? `A little discovery: the ${unlocked.name} palette is now yours.` : next ? `${format(progress.totalDots)} lifetime dots · ${format(next.dots - progress.totalDots)} to the ${next.name} palette` : `${format(progress.totalDots)} lifetime dots. A whole world of color.`;
  if (state.badgesEarned.length) $('result-progress').textContent += ` ${state.badgesEarned.length} new skill ${state.badgesEarned.length === 1 ? 'badge' : 'badges'} collected.`;
  if (state.atlas) {
    const summary = atlasSummary(progress.atlas);
    $('result-progress').textContent = `${summary.stars} / 36 permanent stars · ${summary.completed} / 12 puzzles connected. ${summary.completed === 12 ? summary.stars === 36 ? 'Your atlas is complete.' : 'Explore earlier routes for the stars you missed.' : state.atlas.won ? 'The next constellation is waiting.' : 'Each retry begins with the same board.'}`;
  }
  $('board-overlay').hidden = false; $('overlay-title').textContent = 'Another possibility.';
  $('overlay-copy').innerHTML = 'Every board has a new rhythm.<br>Find yours, one dot at a time.';
  $('start-button').innerHTML = 'One more round <svg><use href="#i-retry"/></svg>';
  $('overlay-hint').textContent = state.atlas ? 'Same board · A new possibility' : state.expedition ? 'Five stages · A new build awaits' : state.mode === 'zen' ? 'No timer · Just a little color' : 'A fresh start · 60 seconds';
  modalResume = false; $('result-dialog').showModal();
  announce(`Run finished. Score ${state.score}, ${state.dots} dots, ${state.loops} loops. ${state.atlas ? `${atlasStars} of 3 stars earned.` : ''} ${record ? 'New personal best.' : ''}`);
}

function showDialog(id) {
  modalResume = state.phase === 'playing';
  if (modalResume) pause(false);
  if (id === 'palette-dialog') renderPalettes();
  if (id === 'collection-dialog') renderCollection();
  if (id === 'atlas-dialog') renderAtlasMap();
  $(id).showModal(); sound.click();
}
function renderPalettes() {
  $('palette-list').replaceChildren(...PALETTES.map(item => {
    const unlocked = progress.totalDots >= item.dots;
    const button = document.createElement('button'); button.className = `palette-option${progress.skin === item.id ? ' selected' : ''}`;
    button.setAttribute('aria-pressed', String(progress.skin === item.id)); button.disabled = !unlocked;
    const info = document.createElement('div'); const name = document.createElement('strong'); name.textContent = item.name;
    const colors = document.createElement('span'); colors.className = 'palette-samples';
    item.colors.forEach(color => { const swatch = document.createElement('i'); swatch.style.setProperty('--swatch', color); colors.append(swatch); });
    info.append(name, colors); const meta = document.createElement('span'); meta.className = 'palette-meta';
    meta.textContent = progress.skin === item.id ? 'In your orbit' : unlocked ? 'Make it yours' : `${format(item.dots)} dots`;
    meta.insertAdjacentHTML('beforeend', `<svg aria-hidden="true"><use href="#i-${unlocked ? progress.skin === item.id ? 'check' : 'arrow' : 'lock'}"/></svg>`);
    button.append(info, meta); button.addEventListener('click', () => { progress.skin = item.id; applyPalette(); saveProgress(); renderPalettes(); sound.click(); toast(`${item.name}. A fresh little mood.`); });
    return button;
  }));
}

function renderCollection() {
  const stats = { ...progress.stats, dots: progress.totalDots, loops: progress.totalLoops };
  $('achievement-list').replaceChildren(...ACHIEVEMENTS.map(item => {
    const unlocked = Object.hasOwn(progress.achievements, item.id);
    const card = document.createElement('article'); card.className = `achievement${unlocked ? ' unlocked' : ''}`;
    card.dataset.achievement = item.id;
    card.insertAdjacentHTML('afterbegin', `<div class="achievement-icon"><svg aria-hidden="true"><use href="#i-${unlocked ? item.icon : 'lock'}"/></svg></div>`);
    const info = document.createElement('div'); info.className = 'achievement-info';
    const title = document.createElement('strong'); title.textContent = item.title;
    const hint = document.createElement('p'); hint.textContent = item.hint;
    const track = document.createElement('div'); track.className = 'achievement-track';
    const fill = document.createElement('span'); fill.style.width = `${Math.min(100, (stats[item.key] || 0) / item.target * 100)}%`; track.append(fill);
    const meta = document.createElement('span'); meta.className = 'achievement-meta';
    meta.textContent = unlocked ? 'COLLECTED' : `${format(Math.min(item.target, stats[item.key] || 0))} / ${format(item.target)}`;
    info.append(title, hint, track, meta); card.append(info);
    return card;
  }));
}

function hitAt(x, y) {
  const bounds = $('board').getBoundingClientRect();
  const col = Math.floor((x - bounds.left) / bounds.width * 6); const row = Math.floor((y - bounds.top) / bounds.height * 6);
  if (col < 0 || col > 5 || row < 0 || row > 5) return null;
  const cx = bounds.left + (col + .5) * bounds.width / 6; const cy = bounds.top + (row + .5) * bounds.height / 6;
  return Math.hypot(x - cx, y - cy) <= bounds.width / 6 * .43 ? row * 6 + col : null;
}
$('board').addEventListener('pointerdown', event => {
  if (event.button !== 0 || dragging || pendingPointer || state.phase !== 'playing') return;
  const index = hitAt(event.clientX, event.clientY); if (index === null) return;
  if (state.locked) {
    event.preventDefault();
    pendingPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, round: roundId };
    $('board').setPointerCapture(event.pointerId); return;
  }
  event.preventDefault(); state.path = []; dragging = true; activePointer = event.pointerId; lastPointer = { x: event.clientX, y: event.clientY };
  $('board').setPointerCapture(event.pointerId); addToPath(index);
  focusDot(index);
});
$('board').addEventListener('pointermove', event => {
  if (pendingPointer?.id === event.pointerId) {
    event.preventDefault(); pendingPointer.x = event.clientX; pendingPointer.y = event.clientY; return;
  }
  if (!dragging || event.pointerId !== activePointer || state.phase !== 'playing' || state.locked) return;
  event.preventDefault();
  const from = lastPointer || { x: event.clientX, y: event.clientY };
  const steps = Math.max(1, Math.ceil(Math.hypot(event.clientX - from.x, event.clientY - from.y) / 10));
  for (let step = 1; step <= steps; step++) {
    const index = hitAt(from.x + (event.clientX - from.x) * step / steps, from.y + (event.clientY - from.y) * step / steps);
    if (index !== null) addToPath(index);
  }
  lastPointer = { x: event.clientX, y: event.clientY };
});
$('board').addEventListener('pointerup', event => {
  if (pendingPointer?.id === event.pointerId) { clearPendingPointer(); return; }
  if (dragging && event.pointerId === activePointer) { commitMove(); try { $('board').releasePointerCapture(event.pointerId); } catch {} }
});
$('board').addEventListener('pointercancel', event => { if (event.pointerId === activePointer || event.pointerId === pendingPointer?.id) cancelPath(); });
$('board').addEventListener('lostpointercapture', event => { if (event.pointerId === pendingPointer?.id || dragging && event.pointerId === activePointer) cancelPath(); });

function focusDot(index) {
  for (const dot of $('board').children) dot.tabIndex = Number(dot.dataset.index) === index ? 0 : -1;
  $('board').children[index]?.focus({ preventScroll: true });
}
$('board').addEventListener('keydown', event => {
  const button = event.target.closest('.dot'); if (!button) return;
  const index = Number(button.dataset.index);
  const steps = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 6, ArrowUp: -6 };
  if (event.key in steps) {
    event.preventDefault(); let next = index + steps[event.key];
    if (event.key === 'ArrowRight' && index % 6 === 5) next = index - 5;
    if (event.key === 'ArrowLeft' && index % 6 === 0) next = index + 5;
    focusDot((next + 36) % 36);
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault(); event.stopPropagation();
    if (state.phase !== 'playing' || state.locked) return;
    if (state.path.length >= 2 && state.path.at(-1) === index) commitMove(index);
    else addToPath(index);
  } else if (event.key === 'Escape' && state.path.length) { event.preventDefault(); event.stopPropagation(); cancelPath(); }
});

document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]') || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key.toLowerCase() === 'r') { event.preventDefault(); startFresh(); }
  else if (event.key === 'Escape') { if (state.phase === 'playing') pause(); else if (state.phase === 'paused') resume(); }
  else if (event.key === ' ' && !event.target.closest('button,a')) { event.preventDefault(); if (state.phase === 'playing') pause(); else if (state.phase === 'paused') resume(); else start(); }
});
function startFresh() { const mode = state.mode; prepare(mode); start(); }

$('start-button').addEventListener('click', start);
$('pause-button').addEventListener('click', () => { if (state.phase === 'playing') pause(); else resume(); });
$('shuffle-button').addEventListener('click', shuffle);
$('finish-zen').addEventListener('click', finish);
$('help-button').addEventListener('click', () => showDialog('help-dialog'));
$('palette-button').addEventListener('click', () => showDialog('palette-dialog'));
$('collection-button').addEventListener('click', () => showDialog('collection-dialog'));
$('play-palette-button').addEventListener('click', () => showDialog('palette-dialog'));
$('play-collection-button').addEventListener('click', () => showDialog('collection-dialog'));
$('atlas-button').addEventListener('click', () => showDialog('atlas-dialog'));
$('atlas-header-button').addEventListener('click', () => showDialog('atlas-dialog'));
$('atlas-map-button').addEventListener('click', () => showDialog('atlas-dialog'));
$('atlas-result-map').addEventListener('click', () => { $('result-dialog').close(); showDialog('atlas-dialog'); });
$('atlas-next').addEventListener('click', () => launchAtlas(selectedAtlasLevel + 1));
$('atlas-exit').addEventListener('click', () => { modalResume = false; $('atlas-dialog').close(); prepare('rush'); });
$('sound-button').addEventListener('click', async () => {
  const enabled = !sound.enabled; await sound.setEnabled(enabled);
  $('sound-button').setAttribute('aria-pressed', String(sound.enabled));
  $('sound-button').setAttribute('aria-label', sound.enabled ? 'Turn sound off' : 'Turn sound on');
  $('sound-button').title = sound.enabled ? 'Sound on' : 'Sound off';
  $('sound-button').querySelector('use').setAttribute('href', sound.enabled ? '#i-sound' : '#i-muted');
  if (sound.enabled) sound.select(3); else if (enabled) toast('Sound is unavailable in this browser.');
});
document.querySelectorAll('.mode-button').forEach(button => button.addEventListener('click', () => { if (button.dataset.mode !== state.mode) { prepare(button.dataset.mode); sound.click(); } }));
$('daily-button').addEventListener('click', () => { prepare('daily'); $('game-card').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' }); start(); });
$('expedition-button').addEventListener('click', () => { prepare('expedition'); start(); $('game-card').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' }); });
$('perk-end-button').addEventListener('click', finish);
$('play-again').addEventListener('click', () => { $('result-dialog').close(); startFresh(); });
$('result-zen').addEventListener('click', () => { $('result-dialog').close(); prepare('zen'); start(); });
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => {
    if (modalResume && state.phase === 'paused') resume();
    modalResume = false;
    if (state.phase === 'draft') {
      if (dialog.id === 'perk-dialog') showDraftOverlay();
      else if (!document.querySelector('dialog[open]')) showPerkDraft();
    }
  });
});
document.addEventListener('visibilitychange', () => { if (document.hidden && state.phase === 'playing') pause(); });
function handleViewportResize() { if (dragging || pendingPointer) cancelPath(); schedulePlayfieldFit(); }
window.addEventListener('resize', handleViewportResize);
window.visualViewport?.addEventListener('resize', handleViewportResize);
document.fonts?.ready.then(handleViewportResize);

function frame(now) {
  const dt = Math.max(0, (now - lastFrame) / 1000); lastFrame = now;
  if (state.phase === 'playing') {
    state.elapsed += dt;
    if (timed()) state.time = Math.max(0, state.time - dt);
    updateStats();
    if (state.path.length >= 2) updatePath();
    if (timed() && state.time <= 0) finish();
  }
  requestAnimationFrame(frame);
}

if (checkAchievements(true).length) saveProgress();
applyPalette(); prepare();
if (!canSave) document.querySelector('.recent-heading > span:last-child').textContent = 'This session only';
requestAnimationFrame(frame);
