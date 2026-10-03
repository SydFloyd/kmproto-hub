import type { SoundEvent } from "./engine";

// Original three-voice chiptune and synthesized effects; no sampled soundtrack.
export class ContraSound {
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
    if (event.type === "shot") this.tone(event.value ? 1400 : 900, 100, .06, .18);
    else if (event.type === "hit") this.burst(.08, .25, 1800);
    else if (event.type === "boom") { this.burst(.35, .7, 650); this.tone(85, 28, .25, .3, "triangle"); }
    else if (event.type === "death") this.tone(600, 60, .45, .2, "triangle");
    else if (event.type === "pickup") this.tone(500, 1400, .18, .22);
    else { this.tone(330, 660, .5, .22, "triangle"); this.tone(495, 990, .7, .12); }
  }
  tick(dt: number, active: boolean, zone: number) {
    if (!active) { if (this.playing) this.pause(); return; }
    this.playing = true;
    if (!this.available) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer += .145;
    const melody = [0, 7, 10, 7, 12, 10, 7, 3, 0, 3, 5, 7, 10, 5, 3, 7, 12, 7, 10, 14, 12, 10, 7, 5, 3, 5, 7, 10, 7, 3, 5, 0];
    const root = zone % 2 ? 220 : 196;
    const frequency = root * Math.pow(2, melody[this.beat % melody.length] / 12);
    this.tone(frequency, frequency, .115, .1);
    if (this.beat % 2 === 0) {
      const bass = root / 4 * Math.pow(2, [0, 0, 3, 5][Math.floor(this.beat / 8) % 4] / 12);
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
