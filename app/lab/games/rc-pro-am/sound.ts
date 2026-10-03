import type { SoundEvent } from "./engine";

// Authored chip effects, with a continuous motor tone instead of sampled audio.
export class RacingSound {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private motor: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;
  private notes = new Set<OscillatorNode>();
  private enabled = false;
  async enable(on: boolean) {
    this.enabled = on;
    if (!on) { this.pause(); return false; }
    try {
      if (!this.ctx) {
        const Constructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Constructor) { this.enabled = false; return false; }
        this.ctx = new Constructor(); this.out = this.ctx.createGain(); this.out.gain.value = .18; this.out.connect(this.ctx.destination);
        this.motor = this.ctx.createOscillator(); this.motor.type = "sawtooth"; this.motorGain = this.ctx.createGain(); this.motorGain.gain.value = 0;
        this.motor.connect(this.motorGain); this.motorGain.connect(this.out); this.motor.start();
      }
      await this.ctx.resume();
    } catch { this.enabled = false; }
    return this.enabled && this.ctx?.state === "running";
  }
  private tone(start: number, end: number, length: number, volume: number, type: OscillatorType = "square") {
    if (!this.enabled || this.ctx?.state !== "running" || !this.out) return;
    const c=this.ctx,now=c.currentTime,o=c.createOscillator(),gain=c.createGain();o.type=type;
    o.frequency.setValueAtTime(start,now);o.frequency.exponentialRampToValueAtTime(end,now+length);gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+length);
    o.connect(gain);gain.connect(this.out);this.notes.add(o);o.start();o.stop(now+length);o.onended=()=>{this.notes.delete(o);o.disconnect();gain.disconnect();};
  }
  play(event: SoundEvent) {
    if(event==="horn")this.tone(220,220,.16,.25);
    else if(event==="shot")this.tone(960,180,.12,.18);
    else if(event==="boom")this.tone(140,25,.45,.35,"sawtooth");
    else if(event==="pickup"){this.tone(660,1320,.14,.18,"triangle");this.tone(990,1980,.16,.1);}
    else if(event==="beep")this.tone(440,440,.11,.25);
    else if(event==="go")this.tone(880,880,.35,.2);
    else if(event==="spin")this.tone(620,110,.5,.2,"sawtooth");
    else if(event==="boost")this.tone(220,1100,.2,.18,"triangle");
    else{this.tone(523,1046,.45,.2,"triangle");this.tone(659,1318,.45,.15,"triangle");}
  }
  tick(active: boolean, speed: number) {
    if (!this.ctx || !this.motor || !this.motorGain) return;
    this.motor.frequency.setTargetAtTime(38+speed*.75,this.ctx.currentTime,.03);
    this.motorGain.gain.setTargetAtTime(this.enabled&&active ? .04+Math.min(speed,300)/300*.07 : 0,this.ctx.currentTime,.02);
  }
  pause(){if(this.ctx&&this.motorGain)this.motorGain.gain.setValueAtTime(0,this.ctx.currentTime);for(const o of this.notes){try{o.stop();}catch{/* Already ended. */}}this.notes.clear();}
  dispose(){this.enabled=false;this.pause();try{this.motor?.stop();}catch{/* Already disposed. */}void this.ctx?.close().catch(()=>{});}
}
