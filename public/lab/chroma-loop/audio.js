// A small, self-contained glass instrument. Audio is opt-in and starts only
// after setEnabled(true) / unlock() is called from a user gesture.
export class Sound {
  constructor() {
    this.enabled = false;
    this.context = null;
    this.master = null;
    this.voices = new Set();
    this._visibility = () => {
      if (!this.context) return;
      if (document.hidden) {
        this._stopVoices();
        this.context.suspend().catch(() => {});
      } else if (this.enabled) {
        this.context.resume().catch(() => {});
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this._visibility);
    }
  }

  async setEnabled(value) {
    this.enabled = Boolean(value);
    if (this.enabled) return this.unlock();
    this._stopVoices();
    try {
      if (this.context && this.context.state !== 'closed') await this.context.suspend();
    } catch (_) { /* Browsers may disallow a state change during teardown. */ }
    return false;
  }

  async unlock() {
    if (!this.enabled) return false;
    try {
      if (!this.context || this.context.state === 'closed') {
        const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Audio) {
          this.enabled = false;
          return false;
        }
        this.context = new Audio();
        this.master = this.context.createGain();
        this.master.gain.value = 0.4;
        const limiter = this.context.createDynamicsCompressor();
        limiter.threshold.value = -20;
        limiter.knee.value = 18;
        limiter.ratio.value = 5;
        limiter.attack.value = 0.004;
        limiter.release.value = 0.16;
        this.master.connect(limiter);
        limiter.connect(this.context.destination);
      }
      if (typeof document !== 'undefined' && document.hidden) return false;
      if (this.context.state !== 'running') await this.context.resume();
      return this.enabled && this.context.state === 'running';
    } catch (_) {
      return false;
    }
  }

  _stopVoices() {
    for (const voice of this.voices) {
      try { voice.stop(); } catch (_) {}
      try { voice.disconnect(); } catch (_) {}
    }
    this.voices.clear();
  }

  _tone(frequency, delay = 0, duration = 0.2, volume = 0.11, type = 'sine') {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    if (typeof document !== 'undefined' && document.hidden) return;
    // A hard voice cap prevents a very quick drag from building excessive gain.
    if (this.voices.size >= 36) return;
    try {
      const time = this.context.currentTime + Math.max(0, delay);
      const oscillator = this.context.createOscillator();
      const envelope = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      envelope.gain.setValueAtTime(0, time);
      envelope.gain.linearRampToValueAtTime(Math.min(0.14, volume), time + 0.008);
      envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      oscillator.connect(envelope);
      envelope.connect(this.master);
      this.voices.add(oscillator);
      oscillator.onended = () => {
        this.voices.delete(oscillator);
        oscillator.disconnect();
        envelope.disconnect();
      };
      oscillator.start(time);
      oscillator.stop(time + duration + 0.015);
    } catch (_) { /* Sound should never interrupt gameplay. */ }
  }

  select(chainLength, color = 0) {
    const scale = [0, 2, 4, 7, 9];
    const step = Math.max(0, Math.floor(Number(chainLength) || 1) - 1);
    const octave = Math.min(2, Math.floor(step / scale.length));
    const note = scale[step % scale.length] + octave * 12;
    const tint = ((Number(color) || 0) % 5 + 5) % 5;
    const frequency = 261.6256 * 2 ** ((note + tint * 0.12) / 12);
    this._tone(frequency, 0, 0.19, 0.105);
    this._tone(frequency * 2, 0, 0.115, 0.023);
  }

  clear(count, loop = false, multiplier = 1) {
    const amount = Math.max(0, Number(count) || 0);
    const bonus = Math.min(2, Math.max(1, Number(multiplier) || 1));
    if (loop) {
      // A softly rolled major ninth feels like the whole board opening up.
      [0, 4, 7, 14].forEach((note, index) => {
        this._tone(261.6256 * 2 ** (note / 12), index * 0.028, 0.62, 0.072);
        this._tone(523.2512 * 2 ** (note / 12), index * 0.028, 0.38, 0.018);
      });
    } else {
      const frequency = (amount >= 6 ? 392 : 329.6276) * (bonus > 1 ? 1.12246 : 1);
      this._tone(frequency, 0, 0.23, 0.09);
      this._tone(frequency * 1.5, 0.035, 0.29, 0.057);
    }
  }

  fever() {
    [0, 4, 7, 12, 16].forEach((note, index) => {
      this._tone(261.6256 * 2 ** (note / 12), index * 0.065, 0.35, 0.085);
    });
  }

  finish() {
    [0, 7, 12, 16].forEach((note, index) => {
      this._tone(261.6256 * 2 ** (note / 12), index * 0.09, 0.6, 0.075);
    });
  }

  click() {
    this._tone(523.2512, 0, 0.085, 0.065);
  }

  nova(count = 1) {
    const blasts = Math.min(2, Math.max(1, Math.floor(Number(count) || 1)));
    for (let blast = 0; blast < blasts; blast++) {
      // The second star answers the first, matching the visible ripple.
      const base = blast ? 246.9417 : 196;
      [0, 7, 12, 19].forEach((note, index) => {
        this._tone(base * 2 ** (note / 12), blast * 0.06 + index * 0.028, 0.4, blast ? 0.048 : 0.062);
      });
    }
    if (blasts > 1) this._tone(1046.5, 0.18, 0.4, 0.027);
  }

  forge() {
    // A distinct rising glass chord marks a power-up the player created.
    [0, 7, 12, 19].forEach((note, index) => {
      this._tone(392 * 2 ** (note / 12), index * 0.043, 0.38, 0.052);
    });
    this._tone(1567.9817, 0.14, 0.29, 0.018);
  }

  reward() {
    [0, 4, 7].forEach((note, index) => {
      this._tone(392 * 2 ** (note / 12), index * 0.06, 0.3, 0.065);
    });
  }
}
