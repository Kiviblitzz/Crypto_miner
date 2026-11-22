// Tastenbelegung: EINE Tabelle Aktion → Tasten. Gespeichert werden physische Tasten (KeyboardEvent.code, z. B. „KeyE“),
// höchstens zwei pro Aktion (zweite Taste z. B. Pfeiltasten beim Laufen). Esc ist fest (Menü/Pause), Mini-Spiele haben eigene Tasten.
// Reine Logik ohne DOM: läuft auch in Node (Tests). Geladen/gespeichert wird über prefs.js, das Menü sitzt in ui/settings.js.

// Gruppen in der Reihenfolge des Menüs
export const GROUPS = [['move', 'Laufen'], ['act', 'Im Raum'], ['place', 'Aufstellen'], ['win', 'Fenster'], ['time', 'Zeit']];
export const ACTIONS = [
  { id: 'fwd', name: 'Vorwärts', group: 'move', def: ['KeyW', 'ArrowUp'] },
  { id: 'back', name: 'Rückwärts', group: 'move', def: ['KeyS', 'ArrowDown'] },
  { id: 'left', name: 'Links', group: 'move', def: ['KeyA', 'ArrowLeft'] },
  { id: 'right', name: 'Rechts', group: 'move', def: ['KeyD', 'ArrowRight'] },
  { id: 'sprint', name: 'Rennen (halten)', group: 'move', def: ['ShiftLeft', 'ShiftRight'] },
  { id: 'use', name: 'Benutzen', group: 'act', def: ['KeyE'] },
  { id: 'lamp', name: 'Taschenlampe', group: 'act', def: ['KeyF'] },
  { id: 'heat', name: 'Wärmebild', group: 'act', def: ['KeyI'] },
  { id: 'goal', name: 'Ziel bezahlen', group: 'act', def: ['KeyG'] },
  { id: 'rotate', name: 'Drehen', group: 'place', def: ['KeyR'] },
  { id: 'cancel', name: 'Abbrechen', group: 'place', def: ['KeyX', 'Backspace'] },
  { id: 'sell', name: 'Ausgewähltes verkaufen', group: 'place', def: ['Delete'] },
  { id: 'phone', name: 'Handy', group: 'win', def: ['KeyH', 'KeyP'] },
  { id: 'build', name: 'Shop', group: 'win', def: ['KeyB'] },
  { id: 'market', name: 'Börse', group: 'win', def: ['KeyM'] },
  { id: 'skills', name: 'Fähigkeiten', group: 'win', def: ['KeyT', 'KeyJ'] },
  { id: 'company', name: 'Meine Bude', group: 'win', def: ['KeyC'] },
  { id: 'ranking', name: 'Logbuch', group: 'win', def: ['KeyL'] },
  { id: 'map', name: 'Karte', group: 'win', def: ['KeyK'] },
  { id: 'speed', name: 'Schneller (der Reihe nach)', group: 'time', def: ['Space'] },
  { id: 'halt', name: 'Zeit anhalten', group: 'time', def: ['Digit0', 'Numpad0'] },
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ id: 'sp' + n, name: `Tempo ${n}`, group: 'time', def: ['Digit' + n, 'Numpad' + n] })),
];
export const ACTION = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));
export const FIXED = ['Escape']; // nicht belegbar

const okCode = (c) => typeof c === 'string' && /^[A-Za-z0-9]{1,24}$/.test(c) && !FIXED.includes(c);
export function defaults() { return Object.fromEntries(ACTIONS.map((a) => [a.id, [a.def[0] || null, a.def[1] || null]])); }

let map = defaults();
let names = {}; // Beschriftung je Taste nach Tastatur-Layout (gelernt beim Belegen bzw. aus navigator.keyboard)

// Gespeicherte Belegung prüfen: unbekannte Aktionen weg, ungültige Tasten weg, jede Taste nur einmal (die erste gewinnt).
// Neue Aktionen (später dazugekommen) bekommen ihre Standardtasten, soweit die noch frei sind.
export function normalize(m) {
  const out = {}, used = new Set(), src = m && typeof m === 'object' ? m : null;
  for (const a of ACTIONS) {
    const v = src && Array.isArray(src[a.id]) ? src[a.id] : null; if (!v) continue;
    out[a.id] = [0, 1].map((i) => { const c = v[i]; if (!okCode(c) || used.has(c)) return null; used.add(c); return c; });
  }
  for (const a of ACTIONS) {
    if (out[a.id]) continue;
    out[a.id] = [0, 1].map((i) => { const c = a.def[i]; if (!c || used.has(c)) return null; used.add(c); return c; });
  }
  return out;
}
export function setBindings(m, nm) { map = normalize(m); if (nm !== undefined) names = cleanNames(nm); }
export function bindings() { return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]])); }
export function keyNames() { return { ...names }; }
export function cleanNames(nm) { const o = {}; if (nm && typeof nm === 'object') for (const [c, l] of Object.entries(nm)) if (okCode(c) && typeof l === 'string' && l.length && l.length <= 12) o[c] = l; return o; }
export function reset() { map = defaults(); }
export function isDefault() { const d = defaults(); return ACTIONS.every((a) => map[a.id][0] === d[a.id][0] && map[a.id][1] === d[a.id][1]); }

// Taste aus dem Ereignis: code (physische Taste); fehlt er (synthetische Ereignisse), aus key ableiten
export function codeOf(e) {
  const c = e?.code; if (c && c !== 'Unidentified') return c;
  const k = e?.key; if (!k) return '';
  if (k.length === 1) { if (/[a-z]/i.test(k)) return 'Key' + k.toUpperCase(); if (/[0-9]/.test(k)) return 'Digit' + k; return k === ' ' ? 'Space' : ''; }
  return { Shift: 'ShiftLeft', Control: 'ControlLeft', Alt: 'AltLeft', Meta: 'MetaLeft', Spacebar: 'Space' }[k] || k;
}
export function is(act, e) { const c = codeOf(e); return !!c && !!map[act]?.includes(c); }
export function actionOf(e) { const c = typeof e === 'string' ? e : codeOf(e); if (!c) return null; for (const a of ACTIONS) if (map[a.id].includes(c)) return a.id; return null; }
// gehalten? down: { code: true } (Spieler-Tasten)
export function held(act, down) { const m = map[act]; return !!m && ((!!m[0] && !!down[m[0]]) || (!!m[1] && !!down[m[1]])); }

// Belegen: Aktion act, Platz slot (0/1) bekommt code. Hatte eine andere Aktion die Taste, bekommt sie die alte Taste dieses Platzes (Tausch).
// Ergebnis: { ok, moved: [{ act, slot, code }] } – code null: die andere Aktion hat dort jetzt keine Taste mehr
export function assign(act, slot, code) {
  if (!map[act] || (slot !== 0 && slot !== 1) || !okCode(code)) return { ok: false, moved: [] };
  const old = map[act][slot], moved = [];
  if (old === code) return { ok: true, moved };
  for (const a of ACTIONS) for (const s of [0, 1]) {
    if ((a.id === act && s === slot) || map[a.id][s] !== code) continue;
    map[a.id][s] = old || null; moved.push({ act: a.id, slot: s, code: old || null });
  }
  map[act][slot] = code;
  return { ok: true, moved };
}
export function clear(act, slot) { if (map[act] && (slot === 0 || slot === 1)) map[act][slot] = null; }
// Aktionen ganz ohne Taste
export function unbound() { return ACTIONS.filter((a) => !map[a.id][0] && !map[a.id][1]).map((a) => a.id); }
export function owner(code) { return actionOf(code); }

// ---------- Beschriftungen ----------
const NAMED = {
  Space: 'Leertaste', Enter: 'Enter', Tab: 'Tab', Backspace: 'Rücktaste', Delete: 'Entf', Insert: 'Einfg', Home: 'Pos1', End: 'Ende',
  PageUp: 'Bild ↑', PageDown: 'Bild ↓', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  ShiftLeft: 'Umschalt', ShiftRight: 'Umschalt rechts', ControlLeft: 'Strg', ControlRight: 'Strg rechts', AltLeft: 'Alt', AltRight: 'Alt Gr',
  MetaLeft: 'Win', MetaRight: 'Win rechts', CapsLock: 'Feststell', ContextMenu: 'Menütaste', Pause: 'Pause', ScrollLock: 'Rollen', PrintScreen: 'Druck',
  NumpadAdd: 'Num +', NumpadSubtract: 'Num −', NumpadMultiply: 'Num ×', NumpadDivide: 'Num ÷', NumpadEnter: 'Num Enter', NumpadDecimal: 'Num ,', NumLock: 'Num',
  // Satzzeichen: deutsche Tastatur (QWERTZ), solange das Layout nichts anderes sagt
  Minus: 'ß', Equal: '´', BracketLeft: 'Ü', BracketRight: '+', Semicolon: 'Ö', Quote: 'Ä', Backquote: '^', Backslash: '#', Comma: ',', Period: '.', Slash: '-', IntlBackslash: '<',
};
export function codeLabel(code) {
  if (!code) return '–';
  if (names[code]) return names[code];
  let m = /^Key([A-Z])$/.exec(code); if (m) return m[1];
  m = /^Digit(\d)$/.exec(code); if (m) return m[1];
  m = /^Numpad(\d)$/.exec(code); if (m) return 'Num ' + m[1];
  if (/^F\d{1,2}$/.test(code)) return code;
  return NAMED[code] || code;
}
// Beschriftung beim Belegen lernen (e.key zeigt, was auf der Taste steht)
export function learn(code, key) {
  if (!okCode(code) || typeof key !== 'string' || key.length !== 1 || key === ' ') return false;
  if (/^(Key[A-Z]|Digit\d|Minus|Equal|Bracket(Left|Right)|Semicolon|Quote|Backquote|Backslash|Comma|Period|Slash|IntlBackslash)$/.test(code)) { names[code] = key.toUpperCase(); return true; }
  return false;
}
// Tastatur-Layout (navigator.keyboard.getLayoutMap): Beschriftungen für Buchstaben/Satzzeichen
export function setLayout(entries) { let n = 0; for (const [c, k] of entries || []) if (learn(c, k)) n++; return n; }
// Für Hinweise: erste Taste der Aktion
export function keyLabel(act) { const m = map[act]; return m ? codeLabel(m[0] || m[1]) : '–'; }
const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export function keyHtml(act) { return escHtml(keyLabel(act)); }
export function kbd(act, cls = '') { return `<kbd${cls ? ` class="${cls}"` : ''}>${keyHtml(act)}</kbd>`; }
// Anlern-Karten (data/world.js FEATURES.key): Standard-Beschriftung → Aktion; unbekannt: so lassen
const BY_DEF = { E: 'use', H: 'phone', B: 'build', M: 'market', T: 'skills', C: 'company', L: 'ranking', K: 'map', I: 'heat', G: 'goal', F: 'lamp', Leertaste: 'speed' };
export function keyFor(defLabel) { const a = BY_DEF[defLabel]; return a ? keyLabel(a) : defLabel; }
