import type { SoundEvent } from "./engine";

export class ArcadeSound {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private thrust: AudioBufferSourceNode | null = null;
  private saucer: OscillatorNode | null = null;
  private saucerSmall: boolean | null = null;
  private enabled = false;

  async enable(value: boolean) {
    this.enabled = value;
    if (!value) { this.stopLoops(); if (this.output) this.output.gain.value = 0; return; }
    try {
      if (!this.context) {
        const Constructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Constructor) { this.enabled = false; return; }
        this.context = new Constructor();
        this.output = this.context.createGain();
        this.output.gain.value = .35;
        this.output.connect(this.context.destination);
        this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      await this.context.resume();
      if (this.output) this.output.gain.value = this.enabled ? .35 : 0;
    } catch { this.enabled = false; }
  }

  get available() { return this.enabled && this.context?.state === "running"; }

  private tone(start: number, end: number, duration: number, volume: number, type: OscillatorType = "square") {
    if (!this.available || !this.context || !this.output) return;
    const ctx = this.context, now = ctx.currentTime;
    const source = ctx.createOscillator(), gain = ctx.createGain();
    source.type = type;
    source.frequency.setValueAtTime(start, now);
    source.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    source.connect(gain); gain.connect(this.output);
    source.start(now); source.stop(now + duration);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
  }

  play(event: SoundEvent) {
    if (!this.available || !this.context || !this.output) return;
    if (event.type === "fire") this.tone(1600, 130, .12, .13);
    else if (event.type === "beat") this.tone(event.value ? 65 : 80, event.value ? 60 : 75, .09, .25, "sine");
    else if (event.type === "extra") this.tone(700, 1200, .35, .13, "triangle");
    else if (this.noise) {
      const ctx = this.context, now = ctx.currentTime;
      const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      const duration = .15 + event.value / 120;
      source.buffer = this.noise;
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1200, now); filter.frequency.exponentialRampToValueAtTime(90, now + duration);
      gain.gain.setValueAtTime(.65, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
      source.connect(filter); filter.connect(gain); gain.connect(this.output);
      source.start(now); source.stop(now + duration);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    }
  }

  setThrust(active: boolean) {
    if (!active || !this.available) { this.thrust?.stop(); this.thrust = null; return; }
    if (this.thrust || !this.context || !this.output || !this.noise) return;
    const source = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), gain = this.context.createGain();
    source.buffer = this.noise; source.loop = true;
    filter.type = "lowpass"; filter.frequency.value = 450;
    gain.gain.value = .2;
    source.connect(filter); filter.connect(gain); gain.connect(this.output); source.start();
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    this.thrust = source;
  }

  setSaucer(small: boolean | null) {
    if (small === this.saucerSmall && (small === null || this.saucer)) return;
    this.saucer?.stop(); this.saucer = null; this.saucerSmall = null;
    if (small === null || !this.available || !this.context || !this.output) return;
    const source = this.context.createOscillator(), wobble = this.context.createOscillator();
    const amount = this.context.createGain(), gain = this.context.createGain();
    source.type = "sawtooth"; source.frequency.value = small ? 260 : 150;
    wobble.frequency.value = small ? 12 : 8; amount.gain.value = 45; gain.gain.value = .07;
    wobble.connect(amount); amount.connect(source.frequency); source.connect(gain); gain.connect(this.output);
    source.start(); wobble.start();
    source.onended = () => { wobble.stop(); source.disconnect(); wobble.disconnect(); amount.disconnect(); gain.disconnect(); };
    this.saucer = source; this.saucerSmall = small;
  }

  stopLoops() { this.setThrust(false); this.setSaucer(null); }
  dispose() { this.enabled = false; this.stopLoops(); void this.context?.close().catch(() => {}); }
}
