// Einstellungen (pro Gerät): Grafik, Ton, Steuerung, Tasten, Sprache. Gespeichert über die Plattform-Brücke als Datei „settings“
// (Desktop: im Benutzerordner, Browser: localStorage). Beim ersten Start werden die alten Schalter einmalig übernommen
// (hashwerk_prefs: Ton, Maus, Jahresrückblick · hashwerk_gfx: Grafikstufe). Reine Logik ohne DOM – das Menü sitzt in ui/settings.js.
import { platform } from './platform.js';
import { normalize, setBindings, bindings, keyNames, cleanNames } from './keys.js';

export const SETTINGS_FILE = 'settings';
export const FPS_STEPS = [30, 60, 120, 0]; // 0 = ohne Grenze
export const SCALE_STEPS = [1, 0.85, 0.7, 0.5];
export const FOV = { min: 50, max: 100, def: 60 };
export const SENS = { min: 0.5, max: 2, def: 1 };
export const LANGS = [['de', 'Deutsch', true], ['en', 'English (bald)', false]];
export const VOL_KEYS = ['master', 'music', 'sfx', 'amb'];

export function defaults() {
  return {
    v: 1,
    gfx: { mode: 'auto' }, fps: 0, scale: 1, fullscreen: null, win: null,
    vol: { master: 1, music: 0.5, sfx: 1, amb: 1 }, mute: false,
    sens: SENS.def, invertY: false, fov: FOV.def,
    keys: normalize(null), keyNames: {},
    lang: 'de', year: true,
  };
}

const num = (v, lo, hi, d) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const QUAL = ['high', 'medium', 'low'];
// Alles prüfen und auf erlaubte Werte bringen (kaputte oder alte Dateien)
export function sanitize(o) {
  const d = defaults(), s = o && typeof o === 'object' ? o : {};
  const g = s.gfx && typeof s.gfx === 'object' ? s.gfx : {};
  const out = {
    v: 1,
    gfx: { mode: ['auto', ...QUAL].includes(g.mode) ? g.mode : 'auto' },
    fps: FPS_STEPS.includes(s.fps) ? s.fps : d.fps,
    scale: SCALE_STEPS.includes(s.scale) ? s.scale : d.scale,
    fullscreen: typeof s.fullscreen === 'boolean' ? s.fullscreen : null,
    win: Array.isArray(s.win) && s.win.length === 2 && s.win.every((x) => Number.isInteger(x)) && s.win[0] >= 640 && s.win[0] <= 7680 && s.win[1] >= 360 && s.win[1] <= 4320 ? [s.win[0], s.win[1]] : null,
    vol: Object.fromEntries(VOL_KEYS.map((k) => [k, Math.round(num(s.vol?.[k], 0, 1, d.vol[k]) * 100) / 100])),
    mute: s.mute === true,
    sens: Math.round(num(s.sens, SENS.min, SENS.max, d.sens) * 10) / 10,
    invertY: s.invertY === true,
    fov: Math.round(num(s.fov, FOV.min, FOV.max, d.fov)),
    keys: normalize(s.keys), keyNames: cleanNames(s.keyNames),
    lang: LANGS.some(([id, , ok]) => ok && id === s.lang) ? s.lang : 'de',
    year: s.year !== false,
  };
  if (QUAL.includes(g.auto)) out.gfx.auto = g.auto;
  return out;
}

// Alte Schalter (vor den Einstellungen): einmalig übernehmen
export function migrate() {
  const read = (k) => { try { const v = JSON.parse(globalThis.localStorage?.getItem(k) || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } };
  const p = read('hashwerk_prefs'), g = read('hashwerk_gfx'), s = defaults();
  if (p) { if (p.sound === false) s.mute = true; if (typeof p.sens === 'number') s.sens = p.sens; if (p.year === false) s.year = false; }
  if (g) s.gfx = { mode: g.mode, auto: g.auto };
  return { s: sanitize(s), from: [p && 'hashwerk_prefs', g && 'hashwerk_gfx'].filter(Boolean) };
}

let cur = null;
export let migratedFrom = [];
// Laden (beim Start): Datei lesen; fehlt sie, alte Schalter übernehmen und gleich speichern. Setzt auch die Tastenbelegung.
export function load() {
  let raw = null; try { raw = JSON.parse(platform.read(SETTINGS_FILE) || 'null'); } catch (e) { raw = null; }
  if (raw && typeof raw === 'object') { cur = sanitize(raw); migratedFrom = []; }
  else { const m = migrate(); cur = m.s; migratedFrom = m.from; save(); }
  setBindings(cur.keys, cur.keyNames);
  return cur;
}
export function get() { return cur || load(); }
export function save() { if (!cur) return false; cur.keys = bindings(); cur.keyNames = keyNames(); return platform.write(SETTINGS_FILE, JSON.stringify(cur)); }
// Teil ändern (flach, vol/gfx werden zusammengeführt), prüfen, speichern
export function set(patch) {
  const s = get(), p = patch || {};
  const next = { ...s, ...p, vol: { ...s.vol, ...(p.vol || {}) }, gfx: { ...s.gfx, ...(p.gfx || {}) } };
  if (p.keys === undefined) next.keys = bindings();
  if (p.keyNames === undefined) next.keyNames = keyNames();
  cur = sanitize(next);
  if (p.keys !== undefined || p.keyNames !== undefined) setBindings(cur.keys, cur.keyNames);
  save(); return cur;
}
// Nur für Tests: Zustand vergessen (nächstes get() lädt neu)
export function forget() { cur = null; }
