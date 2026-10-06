const MISSIONS = [
  { metric: 'dots', target: 12, title: 'Clear 12 dots', reward: 200 },
  { metric: 'moves', target: 3, title: 'Make 3 connections', reward: 300 },
  { metric: 'novas', target: 1, title: 'Detonate a Nova', reward: 400 },
  { metric: 'loops', target: 1, title: 'Close a loop', reward: 600 },
  { metric: 'combo', target: 5, title: 'Find your ×5 rhythm', reward: 700 },
  { metric: 'dots', target: 30, title: 'Clear 30 dots', reward: 800 },
  { metric: 'chain', target: 6, title: 'Make a 6-dot chain', reward: 1000 },
  { metric: 'fevers', target: 1, title: 'Light up Fever', reward: 1200 },
];

export const ACHIEVEMENTS = [
  { id: 'first-loop', title: 'Full circle', hint: 'Close your first loop', key: 'loops', target: 1, icon: 'retry' },
  { id: 'first-nova', title: 'Little supernova', hint: 'Detonate your first Nova', key: 'novas', target: 1, icon: 'star' },
  { id: 'first-forge', title: 'Star smith', hint: 'Forge a Nova with a 5-dot chain', key: 'forges', target: 1, icon: 'star' },
  { id: 'first-spectrum', title: 'Prism pilot', hint: 'Release your first Spectrum sweep', key: 'spectrums', target: 1, icon: 'star' },
  { id: 'spectrum-trio', title: 'Prism conductor', hint: 'Release 3 Spectrum sweeps in one run', key: 'maxSpectrums', target: 3, icon: 'check' },
  { id: 'long-chain', title: 'Long way round', hint: 'Connect 6 dots in one chain', key: 'maxChain', target: 6, icon: 'arrow' },
  { id: 'rhythm', title: 'In the zone', hint: 'Reach a ×5 multiplier', key: 'maxCombo', target: 5, icon: 'sound' },
  { id: 'fever', title: 'On fire', hint: 'Trigger your first Fever', key: 'fevers', target: 1, icon: 'flame' },
  { id: 'cascade', title: 'Chain reaction', hint: 'Detonate 2 Novas in one move', key: 'maxCascade', target: 2, icon: 'star' },
  { id: 'loop-trio', title: 'Triple infinity', hint: 'Close 3 loops in one run', key: 'maxRunLoops', target: 3, icon: 'retry' },
  { id: 'missions', title: 'Mission possible', hint: 'Complete 5 missions in one run', key: 'maxMissions', target: 5, icon: 'check' },
  { id: 'score', title: 'Five figures', hint: 'Score 10,000 in one run', key: 'maxScore', target: 10000, icon: 'star' },
  { id: 'dots', title: 'Color collector', hint: 'Clear 1,000 lifetime dots', key: 'dots', target: 1000, icon: 'check' },
  { id: 'exp-pathfinder', title: 'Off the beaten path', hint: 'Clear 3 Expedition stages', key: 'maxExpeditionStage', target: 3, icon: 'arrow' },
  { id: 'exp-build', title: 'Made to measure', hint: 'Choose 4 upgrades in one Expedition', key: 'maxBuild', target: 4, icon: 'check' },
  { id: 'exp-spectrum', title: 'The whole spectrum', hint: 'Complete all 5 Expedition stages', key: 'expeditionWins', target: 1, icon: 'star' },
];

const whole = value => Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;

export function currentMission(mission = {}) {
  const stage = whole(mission.stage);
  const cycle = Math.floor(stage / MISSIONS.length);
  const definition = MISSIONS[stage % MISSIONS.length];
  const target = definition.metric === 'dots' ? Math.min(60, definition.target + cycle * 4)
    : definition.metric === 'moves' ? Math.min(6, definition.target + cycle) : definition.target;
  const title = definition.metric === 'dots' ? `Clear ${target} dots`
    : definition.metric === 'moves' ? `Make ${target} connections` : definition.title;
  return { ...definition, title, target, reward: Math.min(2000, definition.reward + cycle * 100), progress: Math.min(target, whole(mission.progress)), number: stage + 1 };
}

/** Each move can complete one objective; rewards never spill into the next. */
export function advanceMission(mission, event) {
  const current = currentMission(mission);
  const amount = whole(event?.[current.metric]);
  const accumulated = ['chain', 'combo'].includes(current.metric)
    ? Math.max(current.progress, amount) : current.progress + amount;
  if (accumulated < current.target) {
    return { mission: { stage: whole(mission?.stage), progress: accumulated, completed: whole(mission?.completed) }, completion: null };
  }
  return {
    mission: { stage: whole(mission?.stage) + 1, progress: 0, completed: whole(mission?.completed) + 1 },
    completion: { title: current.title, reward: current.reward, number: current.number },
  };
}

export function findNewAchievements(stats, earned = {}) {
  return ACHIEVEMENTS.filter(item => !Object.hasOwn(earned, item.id) && whole(stats?.[item.key]) >= item.target);
}

export function rankForScore(score) {
  if (score >= 30000) return { title: 'Supernova', color: '#ffbbec' };
  if (score >= 15000) return { title: 'Prismatic', color: '#baa6ff' };
  if (score >= 5000) return { title: 'Golden loop', color: '#ffd08b' };
  if (score >= 1000) return { title: 'Silver rhythm', color: '#b9d4ec' };
  return { title: 'Bronze flow', color: '#d6ac94' };
}
