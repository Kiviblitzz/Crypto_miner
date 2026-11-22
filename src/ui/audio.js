// Prozeduraler Sound: Lüfter-Brummen (abhängig von der Last), Klicks, Kasse, Meilenstein-Fanfare, ruhige Hintergrundmusik (music.js).
// Busse: Gesamt (master) ← Musik · Effekte (Klicks, Kasse, Nachrichten, Schritte, Türen) · Umgebung (Rauschen/Brummen der Geräte)
import { Music } from './music.js';

const curve = (v) => Math.max(0, Math.min(1, v)) ** 2; // Regler 0–1 → Lautstärke (gehörrichtig)
export class Audio {
  constructor() { this.ctx = null; this.muted = false; this.level = 0; this.vol = { master: 1, music: 0.5, sfx: 1, amb: 1 }; }
  init() {
    if (this.ctx) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      const ctx = (this.ctx = new C());
      this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
      this.bus = {}; for (const k of ['music', 'sfx', 'amb']) { const g = ctx.createGain(); g.gain.value = 0; g.connect(this.master); this.bus[k] = g; }
      this.sfx = this.bus.sfx;
      // Rauschen (Lüfter)
      const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      this.noiseFilter = ctx.createBiquadFilter(); this.noiseFilter.type = 'lowpass'; this.noiseFilter.frequency.value = 600;
      this.noiseGain = ctx.createGain(); this.noiseGain.gain.value = 0;
      src.connect(this.noiseFilter).connect(this.noiseGain).connect(this.bus.amb); src.start();
      // Netzbrummen / Trafo
      const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 50;
      const of = ctx.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 180;
      this.humGain = ctx.createGain(); this.humGain.gain.value = 0;
      osc.connect(of).connect(this.humGain).connect(this.bus.amb); osc.start();
      this.music = new Music(ctx, this.bus.music);
      this.applyVol(true);
    } catch (e) { this.ctx = null; this.initError = String(e?.message || e); } // ohne Ton weiter (Grund für die Fehlersuche)
  }
  // Lautstärken (0–1) und Stumm: sofort, mit kurzem Übergang; Musik-Regler auf 0 = Musik aus
  setVolumes(v) { Object.assign(this.vol, v || {}); this.applyVol(); }
  setVolume(k, v) { this.vol[k] = v; this.applyVol(); }
  setMuted(m) { this.muted = !!m; this.applyVol(); }
  gainOf(k) { return k === 'master' ? (this.muted ? 0 : 0.5 * curve(this.vol.master)) : curve(this.vol[k]); }
  applyVol(now = false) {
    if (!this.ctx) return;
    // kurze lineare Rampe (ohne Knacken); nur Busse, deren Ziel sich ändert
    const t = this.ctx.currentTime, tg = (this.tg ||= {}), set = (k, p, v) => {
      if (!now && tg[k] === v) return; tg[k] = v;
      if (now) { p.cancelScheduledValues(t); p.value = v; return; }
      p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(v, t + 0.06);
    };
    set('master', this.master.gain, this.gainOf('master'));
    for (const k of ['music', 'sfx', 'amb']) set(k, this.bus[k].gain, this.gainOf(k));
    const play = !this.muted && this.vol.music > 0 && this.vol.master > 0;
    if (play) this.music?.start(); else this.music?.stop();
  }
  fxOn() { return !!this.ctx && !this.muted && this.vol.sfx > 0 && this.vol.master > 0; }
  // watt: Last im aktuellen Raum, scale: Raumgröße
  setLoad(watt, running) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const lvl = running ? Math.min(1, Math.log10(1 + watt / 50) / 5) : 0;
    this.noiseGain.gain.setTargetAtTime(lvl * 0.35, t, 0.5);
    this.noiseFilter.frequency.setTargetAtTime(400 + lvl * 1400, t, 0.5);
    this.humGain.gain.setTargetAtTime(lvl > 0.5 ? (lvl - 0.5) * 0.08 : 0, t, 0.8);
  }
  blip(freq = 880, dur = 0.08, type = 'square', vol = 0.12) {
    if (!this.fxOn()) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfx); o.start(t); o.stop(t + dur + 0.02);
  }
  click() { this.blip(1400, 0.03, 'square', 0.05); }
  buy() { this.blip(660, 0.06, 'triangle', 0.15); setTimeout(() => this.blip(990, 0.09, 'triangle', 0.15), 60); }
  powerOn() { if (!this.fxOn()) return; const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(520, t + 0.45); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.65); setTimeout(() => this.blip(1046, 0.08, 'triangle', 0.1), 420); }
  install() { if (!this.fxOn()) return; this.blip(170, 0.09, 'triangle', 0.14); setTimeout(() => this.blip(880, 0.035, 'square', 0.035), 80); setTimeout(() => this.blip(1320, 0.05, 'sine', 0.04), 150); }
  tick() { if (!this.fxOn()) return; const now = performance.now(); if (this.lastTick && now - this.lastTick < 900) return; this.lastTick = now; this.blip(2400 * (0.95 + Math.random() * 0.1), 0.025, 'sine', 0.03); }
  clockTick() { this.blip(2300, 0.012, 'sine', 0.035); }
  alarm() { [0, 150, 300, 640, 790, 940].forEach((d) => setTimeout(() => this.blip(1760, 0.07, 'square', 0.06), d)); }
  papaBeep() { [0, 170, 340].forEach((d) => setTimeout(() => this.blip(2350, 0.07, 'square', 0.045), d)); } // Papas Miner: Netzteil-Alarm
  cash() { [1320, 1760, 2640].forEach((f, i) => setTimeout(() => this.blip(f, 0.12, 'triangle', 0.12), i * 70)); }
  bad() { this.blip(180, 0.25, 'sawtooth', 0.12); }
  fanfare() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, i === 3 ? 0.5 : 0.15, 'triangle', 0.16), i * 130)); }
  step(run) {
    if (!this.fxOn()) return;
    const ctx = this.ctx, t = ctx.currentTime, n = Math.floor(ctx.sampleRate * 0.06), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const src = ctx.createBufferSource(); src.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500 + Math.random() * 300;
    const g = ctx.createGain(); g.gain.value = run ? 0.22 : 0.15;
    src.connect(f).connect(g).connect(this.sfx); src.start(t);
  }
  // Tür: Klinke + leises Knarzen (auf) bzw. dumpfes Zufallen (zu)
  door(open) {
    if (!this.fxOn()) return;
    const ctx = this.ctx, t = ctx.currentTime;
    if (open) {
      this.blip(1900, 0.02, 'square', 0.03);
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(95, t + 0.05); o.frequency.linearRampToValueAtTime(140, t + 0.4);
      f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 6; g.gain.setValueAtTime(0.0001, t + 0.04); g.gain.exponentialRampToValueAtTime(0.025, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(f).connect(g).connect(this.sfx); o.start(t + 0.04); o.stop(t + 0.5);
    } else {
      const n = Math.floor(ctx.sampleRate * 0.12), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
      const src = ctx.createBufferSource(); src.buffer = b; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; const g = ctx.createGain(); g.gain.value = 0.35;
      src.connect(f).connect(g).connect(this.sfx); src.start(t); setTimeout(() => this.blip(1500, 0.02, 'square', 0.025), 90);
    }
  }
  message() { this.blip(1046, 0.06, 'sine', 0.15); setTimeout(() => this.blip(1568, 0.1, 'sine', 0.12), 90); }
  // Neue Nachricht am PC (ohne Handy): das „Uh-oh“ der alten Messenger – kurz hoch, dann tiefer
  uhoh() {
    if (!this.fxOn()) return; const ctx = this.ctx, t = ctx.currentTime;
    for (const [d, f0, f1, len] of [[0, 640, 700, 0.12], [0.16, 520, 440, 0.2]]) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle';
      o.frequency.setValueAtTime(f0, t + d); o.frequency.exponentialRampToValueAtTime(f1, t + d + len);
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.17, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + len);
      o.connect(g).connect(this.sfx); o.start(t + d); o.stop(t + d + len + 0.03);
    }
  }
}
