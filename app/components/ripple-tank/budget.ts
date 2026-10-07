export type WaveTier = 0 | 1 | 2;
// Drawing detail is independent of solver quality and the available GPU.
// The ceiling covers a 4K full-screen pool at nine CSS pixels per character.
const WATER_NODES = 128_000;
const LETTER_NODES = 32_000;
export const WAVE_BUDGETS = [
  { water: WATER_NODES, letters: LETTER_NODES, physics: 360, pixels: 160_000, fps: 30, idleFps: 15 },
  { water: WATER_NODES, letters: LETTER_NODES, physics: 1100, pixels: 650_000, fps: 30, idleFps: 20 },
  { water: WATER_NODES, letters: LETTER_NODES, physics: 1800, pixels: 1_000_000, fps: 30, idleFps: 20 },
] as const;

export function wavePixelBudget(width: number, height: number, tier: WaveTier) {
  // Keep the phone's small software surface. Larger displays need enough
  // backing pixels to avoid magnifying one-pixel stamps into large symbols.
  return tier === 0 ? Math.max(WAVE_BUDGETS[0].pixels, Math.min(650_000, width * height / 4)) : WAVE_BUDGETS[tier].pixels;
}

// Measure presentation cadence as well as JS time: an overloaded GPU can
// stall presentation while draw submission itself still looks inexpensive.
export class WaveBudget {
  tier: WaveTier;
  private slow = 0;
  private samples = 0;
  private settleUntil = 0;
  constructor(tier: WaveTier) { this.tier = tier; }
  reset(now: number) { this.slow = 0; this.samples = 0; this.settleUntil = now + 600; }
  observe(now: number, interval: number, work: number, target: number): "keep" | "reduce" | "rest" {
    if (now < this.settleUntil) return "keep";
    this.samples++;
    // A 30 Hz paint can use half its frame interval while leaving the other
    // half for page input. Require repeated severe stalls; a single resize or
    // compilation hiccup must not strand an otherwise smooth renderer at rest.
    if (interval > target * 3 || work > 40) this.slow += 3;
    else if (interval > target * 1.6 || work > Math.min(16, target / 2)) this.slow++;
    if (this.samples < 18 && this.slow < 6) return "keep";
    const overloaded = this.slow >= 6;
    this.reset(now);
    if (!overloaded) return "keep";
    if (this.tier > 0) { this.tier = (this.tier - 1) as WaveTier; return "reduce"; }
    return "rest";
  }
}
