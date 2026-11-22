// Hintergrundmusik: ruhig und komplett im Spiel erzeugt (WebAudio) – keine Dateien, keine Samples.
// Weiche Akkord-Flächen mit langsamen Wechseln (ein Akkord ≈ 9 s), leiser Bass, ab und zu ein paar Töne wie von einem E-Piano,
// Hall aus einem selbst gerechneten Nachklang. Nach einer Runde (vier Akkorde) manchmal eine kurze Pause, dann eine andere Folge.
// Zufall nur im Klang (Auswahl der Folge, Melodietöne) – eigener Zufallsgenerator, die Simulation bleibt unberührt.
// Läuft auf der Zeitachse des AudioContext: hält der Kontext an (Hintergrund-Tab), wird nichts nachgeholt.

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Akkorde in C-Dur/a-Moll mit Septimen und Nonen: b = Bass, p = Fläche, m = Töne für die Melodie (MIDI-Nummern)
const CH = {
  Fmaj9: { b: 41, p: [57, 60, 64, 67], m: [69, 72, 74, 76, 79] },
  Em7: { b: 40, p: [55, 59, 62, 64], m: [67, 71, 74, 76] },
  Dm9: { b: 38, p: [53, 57, 60, 64], m: [69, 72, 74, 76] },
  Cmaj9: { b: 36, p: [52, 55, 59, 62], m: [67, 71, 74, 76, 79] },
  G9sus: { b: 43, p: [53, 57, 60, 62], m: [67, 69, 72, 74] },
  Am9: { b: 45, p: [55, 59, 60, 64], m: [69, 71, 72, 76] },
  G69: { b: 43, p: [59, 62, 64, 69], m: [67, 71, 74, 76] },
};
const PROGS = [['Fmaj9', 'Em7', 'Dm9', 'Cmaj9'], ['Dm9', 'G9sus', 'Cmaj9', 'Am9'], ['Fmaj9', 'G69', 'Em7', 'Am9'], ['Am9', 'Fmaj9', 'Cmaj9', 'G9sus']];
export const CHORD_SEC = 9;
const AHEAD = 1.5; // so weit im Voraus planen (Sekunden)
const LEVEL = 2; // Grundpegel (danach Musik-Regler und Gesamt): bei 50 % etwa −35 dBFS, deutlich unter Effekten und Lüftern

export class Music {
  constructor(ctx, out, seed = (Date.now() ^ 0x5eed) >>> 0) {
    this.ctx = ctx; this.out = out; this.r = rng(seed); this.offline = typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext;
    this.on = false; this.voices = 0; this.chords = 0; this.notes = 0; this.rounds = 0; this.prog = null; this.idx = 0; this.mix = null;
    // Klangkette (bleibt): sanfter Tiefpass → Ausgang; trocken + Hall
    const tone = (this.tone = ctx.createBiquadFilter()); tone.type = 'lowpass'; tone.frequency.value = 4200; tone.Q.value = 0.4; tone.connect(out);
    this.dry = ctx.createGain(); this.dry.gain.value = 0.8; this.dry.connect(tone);
    this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(3.4); const vg = ctx.createGain(); vg.gain.value = 0.5; this.verb.connect(vg).connect(tone);
    // Echo für die E-Piano-Töne
    this.dly = ctx.createDelay(2); this.dly.delayTime.value = 0.64; const fb = ctx.createGain(); fb.gain.value = 0.3; const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1700;
    this.dly.connect(fl).connect(fb).connect(this.dly); const dw = ctx.createGain(); dw.gain.value = 0.32; fl.connect(dw); dw.connect(this.dry); dw.connect(this.verb);
  }
  // Nachklang: abklingendes, nach hinten dunkler werdendes Rauschen (Stereo)
  impulse(sec) {
    const ctx = this.ctx, sr = ctx.sampleRate, n = Math.floor(sr * sec), b = ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { const t = i / n; lp += ((this.r() * 2 - 1) - lp) * (0.12 + 0.55 * (1 - t)); d[i] = lp * Math.pow(1 - t, 3) * Math.min(1, i / (sr * 0.02)); } }
    return b;
  }
  start() {
    if (this.on) return; this.on = true;
    const ctx = this.ctx, t = ctx.currentTime;
    this.mix = ctx.createGain(); this.mix.gain.setValueAtTime(0.0001, t); this.mix.gain.linearRampToValueAtTime(LEVEL, t + 4); this.mix.connect(this.dry); this.mix.connect(this.verb);
    this.keysIn = ctx.createGain(); this.keysIn.connect(this.mix); this.keysIn.connect(this.dly);
    this.lfo = ctx.createOscillator(); this.lfo.frequency.value = 0.17; this.lfoG = ctx.createGain(); this.lfoG.gain.value = 4; this.lfo.connect(this.lfoG); this.lfo.start(t); // leichtes Schweben (Cent)
    this.next = t + 0.3; this.prog = null; this.idx = 0; this.rounds = 0;
    if (typeof setInterval === 'function' && !this.offline) { clearInterval(this.timer); this.timer = setInterval(() => this.pump(), 400); }
    this.pump();
  }
  stop() {
    if (!this.on) return; this.on = false; clearInterval(this.timer); this.timer = null;
    const t = this.ctx.currentTime, m = this.mix, k = this.keysIn, l = this.lfo; this.mix = this.keysIn = this.lfo = null;
    for (const g of [m, k]) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.setTargetAtTime(0, t, 0.5); }
    try { l.stop(t + 4); } catch (e) { /* schon gestoppt */ }
    setTimeout(() => { try { m.disconnect(); k.disconnect(); } catch (e) { /* egal */ } }, 5000);
  }
  pump() { if (this.on) this.fill(this.ctx.currentTime + AHEAD); }
  // Bis zur Zeit `until` alles planen (auch für OfflineAudioContext in Tests)
  fill(until) {
    while (this.on && this.next < until) {
      if (!this.prog || this.idx >= this.prog.length) {
        const rest = this.prog && !this.rested && this.r() < 0.35; this.rested = rest;
        if (rest) { this.next += 5 + this.r() * 5; this.prog = null; continue; } // kurze Pause: nur der Hall klingt aus
        let p; do p = PROGS[Math.floor(this.r() * PROGS.length)]; while (p === this.last && PROGS.length > 1);
        this.prog = this.last = p; this.idx = 0; this.rounds++;
      }
      const ch = CH[this.prog[this.idx++]], t = this.next, len = CHORD_SEC;
      this.chord(t, len, ch); this.next += len;
    }
  }
  chord(t, len, ch) {
    this.chords++;
    const r = this.r, open = 650 + r() * 350;
    ch.p.forEach((m, i) => this.pad(t + i * 0.09, len, m, 0.032, (i - 1.5) * 0.28, open));
    this.bass(t, len, ch.b);
    if (this.chords > 1 && r() < 0.6) { // ein paar Töne darüber, meist schrittweise
      const pool = ch.m; let k = Math.floor(r() * pool.length), at = t + 1.6 + r() * 2;
      const n = 2 + Math.floor(r() * 3);
      for (let i = 0; i < n && at < t + len - 1; i++) { this.key(at, pool[k], 0.5 + r() * 0.3); k = Math.max(0, Math.min(pool.length - 1, k + (r() < 0.6 ? -1 : 1) * (r() < 0.8 ? 1 : 2))); at += 0.64 * (1 + Math.floor(r() * 3)); }
    }
  }
  track(o, done) { this.voices++; o.onended = () => { this.voices--; done?.(); }; }
  pad(t, len, m, vol, pan, open) {
    const ctx = this.ctx, f = mtof(m), A = 2.6, R = 4.5, end = t + len + R;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + A); g.gain.setValueAtTime(vol, t + len); g.gain.setTargetAtTime(0.0001, t + len, R / 4);
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = 0.6; flt.frequency.setValueAtTime(320, t); flt.frequency.linearRampToValueAtTime(open, t + A + 1.5); flt.frequency.linearRampToValueAtTime(420, end);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (p) p.pan.value = pan;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(); o1.type = 'sawtooth'; o2.type = 'triangle';
    o1.frequency.value = o2.frequency.value = f; o1.detune.value = -6; o2.detune.value = 5; const lg = this.lfoG; if (lg) { lg.connect(o1.detune); lg.connect(o2.detune); }
    o1.connect(flt); o2.connect(flt); flt.connect(g); (p ? g.connect(p) : g).connect(this.mix);
    o1.start(t); o2.start(t); o1.stop(end + 0.1); o2.stop(end + 0.1); this.track(o1, () => { try { lg?.disconnect(o1.detune); lg?.disconnect(o2.detune); } catch (e) { /* schon getrennt */ } });
  }
  bass(t, len, m) {
    const ctx = this.ctx, f = mtof(m), end = t + len + 2.5;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.13, t + 1.4); g.gain.setValueAtTime(0.13, t + len - 0.4); g.gain.setTargetAtTime(0.0001, t + len - 0.4, 0.7);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2; const g2 = ctx.createGain(); g2.gain.value = 0.22;
    o.connect(g); o2.connect(g2).connect(g); g.connect(this.mix);
    o.start(t); o2.start(t); o.stop(end); o2.stop(end); this.track(o);
  }
  // E-Piano: Grundton und Oktave klingen weich aus, dazu ein kurzer heller Anschlag
  key(t, m, vel) {
    const ctx = this.ctx, f = mtof(m), end = t + 3.4; this.notes++;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.075 * vel, t + 0.012); g.gain.setTargetAtTime(0.0001, t + 0.05, 0.75);
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 2400;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.001; const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.35, t); g2.gain.setTargetAtTime(0, t, 0.25);
    const o3 = ctx.createOscillator(); o3.type = 'triangle'; o3.frequency.value = f * 4; const g3 = ctx.createGain(); g3.gain.setValueAtTime(0.12, t); g3.gain.setTargetAtTime(0, t, 0.05);
    o.connect(g); o2.connect(g2).connect(g); o3.connect(g3).connect(g); g.connect(flt).connect(this.keysIn);
    for (const x of [o, o2, o3]) { x.start(t); x.stop(end); } this.track(o);
  }
}
