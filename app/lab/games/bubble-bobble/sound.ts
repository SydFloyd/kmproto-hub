import type { SoundEvent } from "./engine";

// Synthesized arcade effects and an original, upbeat three-voice chiptune.
export class BubbleSound {
  private ctx: AudioContext | null = null;
  private output: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private sources = new Set<OscillatorNode | AudioBufferSourceNode>();
  private enabled = false;
  private playing = false;
  private beat = 0;
  private timer = 0;

  async enable(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) { this.pause(); return false; }
    try {
      if (!this.ctx) {
        const Constructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Constructor) { this.enabled = false; return false; }
        this.ctx = new Constructor(); this.output = this.ctx.createGain(); this.output.gain.value = .22; this.output.connect(this.ctx.destination);
        this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate / 2, this.ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      await this.ctx.resume();
    } catch { this.enabled = false; }
    return this.available;
  }
  get available() { return this.enabled && this.ctx?.state === "running"; }
  private tone(start: number, end: number, length: number, volume: number, type: OscillatorType = "square") {
    if (!this.available || !this.ctx || !this.output) return;
    const ctx = this.ctx, source = ctx.createOscillator(), gain = ctx.createGain(), now = ctx.currentTime;
    source.type = type; source.frequency.setValueAtTime(start, now); source.frequency.exponentialRampToValueAtTime(Math.max(1, end), now + length);
    gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + length);
    source.connect(gain); gain.connect(this.output); this.sources.add(source);
    source.start(now); source.stop(now + length);
    source.onended = () => { this.sources.delete(source); source.disconnect(); gain.disconnect(); };
  }
  private burst(length: number, volume: number, cutoff: number) {
    if (!this.available || !this.ctx || !this.output || !this.noise) return;
    const ctx = this.ctx, source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter(), now = ctx.currentTime;
    source.buffer = this.noise; filter.type = "lowpass"; filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + length);
    source.connect(filter); filter.connect(gain); gain.connect(this.output); this.sources.add(source);
    source.start(now); source.stop(now + length);
    source.onended = () => { this.sources.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  play(event: SoundEvent) {
    if (event.type === "bubble") this.tone(230, 1000, .1, .15, "sine");
    else if (event.type === "trap") this.tone(550, 320, .12, .17, "triangle");
    else if (event.type === "pop") { this.burst(.035, .18, 2200); this.tone(1050, 370, .07, .12, "sine"); }
    else if (event.type === "fruit") this.tone(1050, 1500, .06, .12, "triangle");
    else if (event.type === "power") { this.tone(520, 1040, .2, .16, "triangle"); this.tone(780,1560,.16,.08); }
    else if (event.type === "extra") { this.tone(660,1320,.3,.16,"triangle"); this.tone(990,1980,.3,.1); }
    else if (event.type === "death") this.tone(650, 60, .5, .15, "triangle");
    else if (event.type === "thunder") { this.burst(.16,.3,1400); this.tone(130,40,.12,.14); }
    else if (event.type === "hurry") this.tone(700,500,.3,.15);
    else { this.tone(523,1046,.4,.15,"triangle"); this.tone(659,1318,.4,.1,"triangle"); }
  }
  tick(dt: number, active: boolean, hurry: boolean) {
    if (!active) { if (this.playing) this.pause(); return; }
    this.playing = true;
    if (!this.available) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer += hurry ? .105 : .165;
    const melody = [7, 12, 16, 12, 19, 16, 12, 7, 9, 14, 17, 14, 21, 17, 14, 9, 5, 12, 17, 16, 14, 12, 9, 5, 7, 11, 14, 17, 16, 14, 11, 7];
    const root = 261.626;
    const frequency = root * Math.pow(2, melody[this.beat % melody.length] / 12);
    this.tone(frequency, frequency, .115, .1);
    if (this.beat % 2 === 0) {
      const bass = root / 4 * Math.pow(2, [0, 2, 5, 7][Math.floor(this.beat / 8) % 4] / 12);
      this.tone(bass, bass, .21, .25, "triangle");
    }
    this.burst(.025, this.beat % 4 === 2 ? .14 : .045, this.beat % 4 === 2 ? 1800 : 4200);
    this.beat++;
  }
  pause() {
    for (const source of this.sources) { try { source.stop(); } catch { /* A note may have just ended. */ } }
    this.sources.clear(); this.playing = false;
  }
  dispose() { this.enabled = false; this.pause(); void this.ctx?.close().catch(() => {}); }
}
