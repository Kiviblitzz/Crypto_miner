// Spielstände: drei Plätze (slot1–3, je mit Kopie slotN_bak), Autosaves mit Rotation (auto1–3), Notfall-Sicherung (rescue),
// Prüfsumme, Übernahme des alten Spielstands aus localStorage ('hashwerk-save-v1'). Gespeichert wird über die Plattform-Brücke
// (src/platform.js: Desktop = Dateien im Benutzerordner, Browser = localStorage). Ohne DOM – läuft auch in Node (Tests).
//
// Datei = Umschlag { format: 'hashwerk', fv, savedAt, day, cash, site, chapter, label, slot, gid, diff, ng, sum, size, state }
//   sum/size: Prüfsumme und Länge von JSON(state). Kaputt = unlesbar, falsche Summe, Pflichtfelder fehlen oder Game.load scheitert.
// Ein Platz ist ein Spiel: Autosaves schreiben die Rotation UND den Platz des laufenden Spiels (gid = Spiel-Kennung).
// So geht beim Wechsel auf ein anderes Spiel oder bei „Neues Spiel“ auf einem anderen Platz nichts verloren.
// „Speichern“ auf einen anderen Platz legt eine Kopie an; das laufende Spiel bleibt an seinem Platz.
import { platform as P0 } from '../platform.js';

export const SLOTS = ['slot1', 'slot2', 'slot3'];
export const AUTOS = ['auto1', 'auto2', 'auto3'];
export const RESCUE = 'rescue';
export const LEGACY_KEY = 'hashwerk-save-v1'; // alter Einzel-Spielstand (Game.save vor den Plätzen)
const META = 'saves_meta'; // { legacy: Prüfsumme des übernommenen alten Stands }
export const FV = 1;
export const ROT_GAP = 60e3; // jüngster Autosave jünger als 1 Min. (dasselbe Spiel): den auffrischen statt rotieren – beim Schließen kommen mehrere Ereignisse kurz hintereinander
export const SOFT_GAP = 60e3; // Monatswechsel (Game.advanceDay): höchstens einmal pro Minute – auf Tempo 6 kommt der alle paar Sekunden

let gidN = 0;
const newGid = (now) => `${Math.floor(now).toString(36)}${(++gidN).toString(36)}`;
export const kindOf = (n) => (/^slot\d$/.test(n) ? 'slot' : /_bak$/.test(n) ? 'bak' : /^auto\d$/.test(n) ? 'auto' : n === RESCUE ? 'rescue' : 'other');

// Prüfsumme: FNV-1a (32 Bit) über die UTF-16-Zeichen – schnell, reicht gegen abgeschnittene oder veränderte Dateien
export function checksum(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16).padStart(8, '0');
}
// Pflichtfelder eines Spielzustands (Game.newGame)
export const okState = (s) => !!s && typeof s === 'object' && s.version === 1 && Number.isFinite(s.day) && !!s.fac && typeof s.fac === 'object' && Array.isArray(s.unlocked);

// Zustand → Dateitext (null, wenn er sich nicht serialisieren lässt oder Pflichtfelder fehlen)
export function pack(state, meta = {}) {
  let js;
  try { js = JSON.stringify(state); } catch (e) { return null; }
  if (typeof js !== 'string' || !okState(state)) return null;
  const head = {
    format: 'hashwerk', fv: FV, savedAt: meta.savedAt ?? Date.now(), day: state.day, cash: Number.isFinite(state.cash) ? Math.round(state.cash) : 0,
    site: state.current || null, chapter: state.chapter | 0, label: meta.label || '', slot: meta.slot || null, gid: meta.gid || null,
    diff: state.diff || null, ng: state.ngPlus || 0, sum: checksum(js), size: js.length,
  };
  return { text: JSON.stringify(head).slice(0, -1) + ',"state":' + js + '}', sum: head.sum, head };
}
// Kopf einer (auch abgeschnittenen) Datei lesen, ohne den Zustand zu parsen – state steht immer zuletzt
export function peek(text) {
  if (typeof text !== 'string') return null;
  const i = text.indexOf(',"state":'); if (i < 0) return null;
  try { const h = JSON.parse(text.slice(0, i) + '}'); return h && h.format === 'hashwerk' ? h : null; } catch (e) { return null; }
}
// Dateitext → { ok, why, head, state }. why: leer | json | format | version | felder | summe
export function unpack(text) {
  if (typeof text !== 'string' || !text) return { ok: false, why: 'leer', head: null };
  let env;
  try { env = JSON.parse(text); } catch (e) { return { ok: false, why: 'json', head: peek(text) }; }
  if (env && env.format === undefined && okState(env)) return { ok: true, legacy: true, head: headOf(env), state: env }; // roher alter Stand ohne Umschlag
  if (!env || env.format !== 'hashwerk') return { ok: false, why: 'format', head: null };
  const head = { ...env }; delete head.state;
  if (!(env.fv <= FV)) return { ok: false, why: 'version', head };
  if (!okState(env.state)) return { ok: false, why: 'felder', head };
  const js = JSON.stringify(env.state);
  if (js.length !== env.size || checksum(js) !== env.sum) return { ok: false, why: 'summe', head };
  return { ok: true, head, state: env.state };
}
const headOf = (s) => ({ format: 'hashwerk', fv: 0, savedAt: 0, day: s.day, cash: Number.isFinite(s.cash) ? Math.round(s.cash) : 0, site: s.current || null, chapter: s.chapter | 0, label: '', slot: null, gid: null });

export class SaveStore {
  // opt: platform (read/write/list/remove/log), now() (ms), ls() → localStorage für den alten Spielstand
  constructor(opt = {}) {
    this.p = opt.platform || P0;
    this.now = opt.now || (() => Date.now());
    this.ls = opt.ls || (() => { try { return globalThis.localStorage || null; } catch (e) { return null; } });
    this.cur = null; this.gid = null; this.boundS = null; // laufendes Spiel: sein Platz, seine Kennung, sein Zustand (Game.s)
    this.lastSum = null; this.lastAt = 0; this.lastText = {}; // zuletzt geschrieben (geprüft): Prüfsumme, Zeit, Text je Datei
    this.blocked = false; // Absturz: keine Autosaves über gute Stände (nur noch rescue)
    this.bad = {}; // Dateien, bei denen Game.load gescheitert ist (bis sie neu geschrieben werden)
    this.stats = { n: 0, ms: 0, size: 0, at: 0 };
    this.onSaved = null; this.onFail = null;
  }
  log(t) { try { this.p.log?.(`Spielstand: ${t}`); } catch (e) { /* egal */ } }

  // ---------- Lesen ----------
  entry(name) {
    const text = this.p.read(name), kind = kindOf(name);
    if (text == null) return { name, kind, exists: false, ok: false };
    const u = unpack(text), h = u.head || {};
    return {
      name, kind, exists: true, ok: u.ok && !this.bad[name], why: this.bad[name] || u.why || null, legacy: !!u.legacy, size: text.length,
      savedAt: h.savedAt || 0, day: h.day, cash: h.cash, site: h.site, chapter: h.chapter, label: h.label || '', slot: h.slot || null, gid: h.gid || null, diff: h.diff || null,
    };
  }
  list() {
    const slots = SLOTS.map((n) => this.entry(n));
    const autos = AUTOS.map((n) => this.entry(n)).filter((e) => e.exists).sort((a, b) => b.savedAt - a.savedAt);
    const rescue = this.entry(RESCUE);
    return { slots, autos, rescue: rescue.exists ? rescue : null };
  }
  hasAny() { return [...SLOTS, ...AUTOS, RESCUE].some((n) => this.p.read(n) != null); }
  freeSlot() { return SLOTS.find((n) => this.p.read(n) == null) || null; }
  // Reihenfolge für „Weiterspielen“: Plätze und Autosaves (jüngster zuerst, bei Gleichstand der Platz), dann Kopien, zuletzt die Notfall-Sicherung
  candidates(opt = {}) {
    const by = (a, b) => b.savedAt - a.savedAt || (a.kind === 'slot' ? -1 : b.kind === 'slot' ? 1 : 0);
    const main = [...SLOTS, ...AUTOS].map((n) => this.entry(n)).filter((e) => e.ok).sort(by);
    const more = [...SLOTS.map((n) => n + '_bak'), ...(opt.rescue === false ? [] : [RESCUE])].map((n) => this.entry(n)).filter((e) => e.ok).sort(by);
    return [...main, ...more];
  }
  latest(opt) { return this.candidates(opt)[0] || null; }
  // Sicherung für einen kaputten Stand: slotN_bak, sonst der jüngste heile Autosave
  backupFor(name) {
    if (kindOf(name) === 'slot') { const b = this.entry(name + '_bak'); if (b.ok) return b; }
    return AUTOS.filter((n) => n !== name).map((n) => this.entry(n)).filter((e) => e.ok).sort((a, b) => b.savedAt - a.savedAt)[0] || null;
  }
  meta() { try { return JSON.parse(this.p.read(META) || '{}') || {}; } catch (e) { return {}; } }

  // ---------- Laden ----------
  // Stand in das Spiel laden (Game.load mit Migrationen); scheitert das, gilt die Datei als kaputt
  loadInto(game, name) {
    const u = unpack(this.p.read(name));
    if (!u.ok) return { ok: false, name, why: u.why };
    let ok = false;
    try { ok = game.load(u.state); } catch (e) { ok = false; }
    if (!ok) { this.bad[name] = 'laden'; this.log(`${name} lässt sich nicht laden`); return { ok: false, name, why: 'laden' }; }
    this.bind(game, name, u.head || {});
    return { ok: true, name, head: u.head || {} };
  }
  // jüngsten heilen Stand laden; kaputte werden übersprungen (skipped)
  loadLatest(game, opt = {}) {
    const skipped = [];
    for (const e of this.candidates(opt)) { const r = this.loadInto(game, e.name); if (r.ok) return { ...r, skipped }; skipped.push(e.name); }
    return { ok: false, skipped };
  }
  // Das geladene Spiel an seinen Platz binden: ein Platz selbst; Autosave/Kopie/Notfall an ihren Platz, wenn dort dasselbe Spiel liegt (oder nichts)
  bind(game, name, head) {
    this.boundS = game.s; this.lastSum = null; this.gid = head.gid || newGid(this.now());
    const kind = kindOf(name);
    if (kind === 'slot') { this.cur = name; return; }
    const slot = kind === 'bak' ? name.replace(/_bak$/, '') : head.slot;
    this.cur = null;
    if (!SLOTS.includes(slot)) return;
    const t = this.p.read(slot);
    if (t == null) { this.cur = slot; return; }
    const g = unpack(t).head?.gid; // kaputte Datei: Kopf über peek
    if (g && g === head.gid) this.cur = slot; // anderes Spiel dort: ungebunden – der nächste Autosave nimmt einen freien Platz
  }

  // ---------- Schreiben ----------
  // schreiben und zurücklesen; bei Platzmangel einmal aufräumen und neu versuchen
  put(name, text) {
    const w = () => { try { return this.p.write(name, text) && this.p.read(name) === text; } catch (e) { return false; } };
    let ok = w();
    if (!ok && this.freeSpace(name)) ok = w();
    if (ok) { delete this.bad[name]; this.lastText[name] = text; } else this.log(`${name} konnte nicht geschrieben werden (${text.length} Zeichen)`);
    return ok;
  }
  // Platz überschreiben: vorher den heilen alten Stand als slotN_bak behalten (ein kaputter ersetzt nie eine gute Kopie)
  putSlot(name, text) {
    const old = this.p.read(name);
    if (old && old !== text && (old === this.lastText[name] || unpack(old).ok)) this.put(name + '_bak', old);
    return this.put(name, text);
  }
  // Ziel der Rotation: fehlende Datei, sonst der jüngste (wenn dasselbe Spiel und jünger als ROT_GAP), sonst der älteste (kaputte zählen als älteste)
  rotTarget(now, exclude) {
    const hs = AUTOS.filter((n) => n !== exclude).map((n) => { const t = this.p.read(n); return { n, miss: t == null, h: t == null ? null : peek(t) || unpack(t).head }; });
    const miss = hs.find((x) => x.miss); if (miss) return miss.n;
    const at = (x) => x.h?.savedAt || 0;
    const newest = hs.reduce((a, b) => (at(b) > at(a) ? b : a));
    if (newest.h?.gid && newest.h.gid === this.gid && now - at(newest) >= 0 && now - at(newest) < ROT_GAP) return newest.n;
    return hs.reduce((a, b) => (at(b) < at(a) ? b : a)).n;
  }
  // Spiel wechselt außerhalb der Plätze (Game.newGame ohne startNew): neue Kennung, noch kein Platz. Neues Spiel+ bleibt an seinem Platz.
  follow(game, why) {
    if (game.s === this.boundS) return;
    const keep = why === 'ngplus' && this.boundS;
    this.boundS = game.s; this.lastSum = null;
    if (!keep) { this.cur = null; this.gid = newGid(this.now()); }
  }
  // Autosave (Game.save): Rotation + Platz des laufenden Spiels. why: month (gedrosselt) | zeit | morgen | standort | exit | neu | manuell | …
  save(game, why = 'auto', opt = {}) {
    if (this.blocked) return false;
    const t0 = this.now(), tp = globalThis.performance?.now?.() ?? t0;
    this.follow(game, why);
    if (why === 'month' && t0 - this.lastAt < SOFT_GAP) return true;
    if (!this.cur) this.cur = this.freeSlot(); // ungebunden: freier Platz, sonst nur die Rotation
    const pk = pack(game.s, { savedAt: t0, slot: this.cur, gid: this.gid, label: '' });
    if (!pk) { this.log('Zustand lässt sich nicht speichern'); this.onFail?.('pack'); return false; }
    if (pk.sum === this.lastSum && !opt.force) return true; // nichts geändert
    const a = this.put(this.rotTarget(t0, opt.exclude), pk.text);
    const b = this.cur ? this.putSlot(this.cur, pk.text) : a;
    if (a || b) { this.lastSum = pk.sum; this.lastAt = t0; }
    const ms = (globalThis.performance?.now?.() ?? this.now()) - tp;
    this.stats = { n: this.stats.n + 1, ms, size: pk.text.length, at: t0, why };
    if (!(a && b)) this.onFail?.('write');
    this.onSaved?.(why, a && b);
    return a || b;
  }
  // Neues Spiel auf einem Platz: belegter Platz nur mit overwrite (die Oberfläche fragt vorher)
  startNew(game, slot, opt = {}) {
    if (!SLOTS.includes(slot)) return { ok: false, why: 'platz' };
    if (this.p.read(slot) != null && !opt.overwrite) return { ok: false, why: 'belegt' };
    if (this.blocked) return { ok: false, why: 'gesperrt' };
    this.boundS = game.s; this.cur = slot; this.gid = newGid(this.now()); this.lastSum = null;
    const t0 = this.now(), pk = pack(game.s, { savedAt: t0, slot, gid: this.gid });
    if (!pk) return { ok: false, why: 'pack' };
    const ok = this.putSlot(slot, pk.text); if (ok) { this.lastSum = pk.sum; this.lastAt = t0; this.onSaved?.('neu', true); }
    return { ok, why: ok ? null : 'schreiben' };
  }
  // Speichern im Pause-Menü: auf den Platz des Spiels ohne Rückfrage, auf einen anderen belegten nur mit overwrite.
  // Anderer Platz = Kopie (eigene Kennung); das Spiel bleibt an seinem Platz und wird dort ebenfalls gesichert.
  saveTo(game, slot, opt = {}) {
    if (!SLOTS.includes(slot)) return { ok: false, why: 'platz' };
    if (this.blocked) return { ok: false, why: 'gesperrt' };
    this.follow(game);
    if (this.p.read(slot) != null && slot !== this.cur && !opt.overwrite) return { ok: false, why: 'belegt' };
    if (!this.cur) this.cur = slot;
    let ok = true;
    if (slot !== this.cur) {
      const pk = pack(game.s, { savedAt: this.now(), slot, gid: newGid(this.now()), label: 'Kopie' });
      if (!pk) return { ok: false, why: 'pack' };
      ok = this.putSlot(slot, pk.text);
    }
    ok = this.save(game, 'manuell', { force: true }) && ok;
    return { ok, why: ok ? null : 'schreiben' };
  }
  // Notfall-Sicherung nach einem Fehler: eigene Datei, Autosaves und Plätze bleiben unberührt (auch wenn blocked)
  rescue(game) {
    const pk = pack(game?.s, { savedAt: this.now(), slot: this.cur, gid: this.gid, label: 'Notfall' });
    if (!pk) { this.log('Notfall-Sicherung: Zustand lässt sich nicht serialisieren'); return false; }
    return this.put(RESCUE, pk.text);
  }

  // ---------- Löschen ----------
  // Platz löschen: samt Kopie und den Autosaves desselben Spiels; Autosave/Notfall: nur die Datei
  remove(name) {
    const kind = kindOf(name);
    if (kind === 'slot') {
      const gid = unpack(this.p.read(name)).head?.gid;
      if (gid) for (const n of AUTOS) { const h = peek(this.p.read(n)); if (h?.gid === gid && h.slot === name) this.drop(n); }
      this.drop(name + '_bak');
      if (this.cur === name) this.cur = null;
    }
    return this.drop(name);
  }
  drop(name) { delete this.bad[name]; delete this.lastText[name]; return this.p.read(name) == null || this.p.remove(name); }

  // ---------- Platz schaffen / alter Spielstand ----------
  // Speicher voll (Browser): die Kopie des alten Spielstands (nach der Übernahme) und die Notfall-Sicherung weg
  freeSpace(writing) {
    let freed = false;
    const ls = this.ls(), m = this.meta();
    try { const raw = ls?.getItem(LEGACY_KEY); if (raw && m.legacy && m.legacy === checksum(raw)) { ls.removeItem(LEGACY_KEY); freed = true; this.log('alter Spielstand (schon übernommen) gelöscht, um Platz zu schaffen'); } } catch (e) { /* egal */ }
    if (writing !== RESCUE && this.p.read(RESCUE) != null) { this.drop(RESCUE); freed = true; }
    return freed;
  }
  // Beim ersten Start: alten Stand ('hashwerk-save-v1') auf einen freien Platz übernehmen (sonst in die Rotation).
  // Der alte Schlüssel bleibt als Sicherung liegen; die Prüfsumme in saves_meta verhindert eine zweite Übernahme.
  migrateLegacy() {
    const ls = this.ls(); if (!ls) return null;
    let raw; try { raw = ls.getItem(LEGACY_KEY); } catch (e) { return null; }
    if (!raw) return null;
    const sum = checksum(raw), m = this.meta();
    if (m.legacy === sum) return null; // schon übernommen
    let s; try { s = JSON.parse(raw); } catch (e) { this.log('alter Spielstand unlesbar – bleibt liegen'); return { ok: false, why: 'json' }; }
    if (!okState(s)) { this.log('alter Spielstand unvollständig – bleibt liegen'); return { ok: false, why: 'felder' }; }
    const t0 = this.now(), slot = this.freeSlot(), gid = newGid(t0);
    const pk = pack(s, { savedAt: t0, slot, gid, label: 'Alter Spielstand' });
    if (!pk) return { ok: false, why: 'pack' };
    const name = slot || this.rotTarget(t0);
    const ok = slot ? this.putSlot(slot, pk.text) : this.put(name, pk.text);
    if (!ok) return { ok: false, why: 'schreiben' };
    this.p.write(META, JSON.stringify({ ...m, legacy: sum, legacyAt: t0 }));
    this.log(`alter Spielstand übernommen → ${name}`);
    return { ok: true, name };
  }
}
