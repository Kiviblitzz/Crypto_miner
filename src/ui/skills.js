// Fähigkeiten-Seite (Taste T, J geht auch): EIN Stern-Baum, aufgebaut wie die Upgrade-Bäume von Moon Sweepers und Find the Needle.
// Start in der Mitte, sechs Äste wachsen sternförmig nach außen (je eine Farbe und Richtung) – kein Zeitstrahl, keine Jahreszahlen.
// Nebel: sichtbar sind gelernte Knoten und ihre direkten Nachbarn (dunkler Umriss mit Symbol) – wer lernt, deckt auf. Was erst mit neuer Hardware,
// einem größeren Standort oder später Sinn ergibt (z. B. ASIC-Firmware), bleibt im Nebel, bis der Vorgänger gelernt ist UND es so weit ist.
// Gelernt wird nur mit Punkten (Paket 18): ein Topf, oben „N Punkte frei“; jeder Knoten hat genau einen Knopf „Freischalten · N Punkte“.
// Knoten: runde Symbole ohne Textkasten; Hover, Fokus oder erstes Tippen zeigt einen kurzen Tooltip (Name, ein Satz, Knopf).
// Robi (USB-Stick → Greifarm → Lötkopf) ist ein Knoten mit Stufen 1/3–3/3. Im Baum stehen nur gebaute Fähigkeiten (TREE, needsOf).
// Dazu die Handgriffe im Inspektor (Betriebssystem-Installer, BIOS-Profile, Leistungsziel, Firmware, BIOS-Mod, Netzteil-Mod, Wartung, Wasserkühlung, Bitstream, Robi)
// und die Reparatur-Knöpfe je Defekt (selbst = Mini-Spiel Löten / Fehlersuche / Chip-Kette, Routine, reparieren lassen). Esc: erst Tooltip/Installer zu, dann der Baum, dann Pause.
import { TREE, needsOf, SKILL, SKILL_CAT, PROFILES, OS, REPAIR, PLIMIT, PSUMOD } from '../data/skills.js';
import { PLACEABLE } from '../data/hardware.js';
import { FACILITY } from '../data/world.js';
import { fmtUSD, fmtHash, fmtWatt, fmtDate } from '../sim/game.js';
import { playMinigame } from './minigame.js';
import { keyLabel as K, kbd } from '../keys.js';

const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (v) => `${Math.round(v).toLocaleString('de-DE')} $`;
const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, a = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); return e; };
// Äste: Richtung in Grad (0 = rechts, im Uhrzeigersinn) und Farbe. Software und Reparatur liegen nebeneinander, dazwischen Robi.
const BRANCH = { sof: { a: -90, c: '#38c8ff' }, tun: { a: -30, c: '#ff8a3d' }, kst: { a: 30, c: '#4fd6c8' }, sch: { a: 90, c: '#8fd16b' }, ges: { a: 150, c: '#c58cff' }, rep: { a: 210, c: '#ffb000' } };
const CAT_COLOR = Object.fromEntries(Object.entries(BRANCH).map(([k, v]) => [k, v.c]));
// Knoten mit Stufen: ein Symbol, unten „1/3“; liegt zwischen zwei Ästen (Winkel a)
const GROUPS = { robo: { ids: ['robo_usb', 'robo_steck', 'robo_loet'], name: 'Robi', cat: 'rep', a: -120 } };
const GROUP_OF = Object.fromEntries(Object.entries(GROUPS).flatMap(([g, G]) => G.ids.map((id) => [id, g])));
const SYM = { start: '⭐', bauen: '🔧', riser: '🔌', cpustart: '🖥️', gpuminer: '🎮', windows: '🪟', linux: '🐧', image: '💾', fpga: '🧩', asic: '⛏️', firmware: '📟', fernwartung: '📡', skript: '📜', takt: '⏱️', biosmod: '🧬', autotuning: '🎛️', luefter: '🌀', asictakt: '⚙️', wasser: '💧', immersion: '🛢️', lastman: '⚡', abwaerme: '♨️', wartung: '🧹', loeten: '🔥', stecken: '🔍', hashboard: '💠', psumod: '🔋', boerse: '💱', limit: '📈', cold: '🧊', robo: '🤖' };
const ORDER = { robo_usb: '2015-09-01', robo_steck: '2016-06-01', robo_loet: '2017-03-01', windows: '2010-11-01', wartung: '2010-10-20', loeten: '2010-11-15', stecken: '2011-03-01', gpuminer: '2010-10-25', boerse: '2010-11-01' }; // nur die Reihenfolge am Ast (nicht sichtbar)
const ICON = {
  check: '<path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  lock: '<rect x="6" y="11" width="12" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" fill="none" stroke="currentColor" stroke-width="2"/>',
};
const order = (iso) => { const d = new Date(iso); return d.getUTCFullYear() + d.getUTCMonth() / 12 + (d.getUTCDate() - 1) / 365; };
const R0 = 100, STEP = 74, NR = 24, RAD = Math.PI / 180;

// ---------- Graph und Layout: Knoten (gebaute Fähigkeiten, Stufen-Gruppen, Start), Eltern = Voraussetzungen; ohne Voraussetzung hängt ein Knoten am Vorgänger seines Astes ----------
// Abstand vom Start = Tiefe im Ast (kein Zeitstrahl); Winkel nahe den Eltern im eigenen Ast, ohne Überlappung
function layout() {
  const N = {}, nodeOf = (id) => GROUP_OF[id] || id;
  N.start = { id: 'start', cat: null, ids: [], par: [], kids: [], t: 0, x: 0, y: 0, r: 0, a: 0 };
  for (const k of TREE) {
    const id = nodeOf(k.id), G = GROUPS[id]; N[id] ||= { id, cat: G?.cat || k.cat, ids: G?.ids || [k.id], par: [], kids: [], t: Infinity, group: !!G };
    const n = N[id]; n.t = Math.min(n.t, order(k.from || ORDER[k.id] || '2010-10-15'));
    for (const p of needsOf(k)) { const pid = nodeOf(p); if (pid !== id && !n.par.includes(pid)) n.par.push(pid); }
  }
  for (const cat of Object.keys(BRANCH)) { let prev = null; const br = Object.values(N).filter((x) => x.cat === cat && !x.group); for (const n of br.filter((x) => !x.par.length).sort((a, b) => a.t - b.t)) { const up = (x, seen = new Set()) => !seen.has(x.id) && (seen.add(x.id), x.par.some((p) => p === n.id || (N[p] && up(N[p], seen)))), before = br.filter((x) => x !== n && x.par.length && x.t < n.t && !up(x)).sort((a, b) => b.t - a.t)[0]; n.par = [prev || (before ? before.id : 'start')]; n.trunk = true; prev = n.id; } }
  for (const n of Object.values(N)) for (const p of n.par) N[p].kids.push(n.id);
  const placed = [N.start], done = new Set(['start']), todo = Object.values(N).filter((n) => n.id !== 'start').sort((a, b) => a.t - b.t);
  while (todo.length) {
    const i = todo.findIndex((n) => n.par.every((p) => done.has(p))); const n = todo.splice(i < 0 ? 0 : i, 1)[0];
    const B = n.group ? { a: GROUPS[n.id].a, w: 12 } : { a: BRANCH[n.cat].a, w: 26 }, ps = n.par.map((p) => N[p]).filter((p) => p.id !== 'start'), own = ps.filter((p) => p.cat === n.cat || n.group), rel = (a) => ((a - B.a + 540) % 360) - 180;
    let pref = B.a + (own.length ? own : ps).reduce((s, p) => s + rel(p.a), 0) / Math.max(1, (own.length ? own : ps).length); pref = ps.length ? Math.max(B.a - B.w, Math.min(B.a + B.w, pref)) : B.a; // Eltern in anderen Ästen: an den Rand zu ihnen hin
    let r = Math.max(R0, ...n.par.map((p) => (N[p].r || 0) + STEP)), ok = false;
    for (let tries = 0; tries < 30 && !ok; tries++, r += 24) {
      const cands = [0]; for (let d = 5; d <= 2 * B.w; d += 5) cands.push(d, -d);
      for (const d of cands) { const a = pref + d; if (a < B.a - B.w || a > B.a + B.w) continue; const x = Math.cos(a * RAD) * r, y = Math.sin(a * RAD) * r; if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= (p.id === 'start' ? 84 : 2 * NR + 18))) { Object.assign(n, { x, y, r, a }); ok = true; break; } }
    }
    if (!ok) Object.assign(n, { r, a: pref, x: Math.cos(pref * RAD) * r, y: Math.sin(pref * RAD) * r });
    placed.push(n); done.add(n.id);
  }
  const all = Object.values(N);
  return { N, minX: Math.min(...all.map((n) => n.x)) - 140, maxX: Math.max(...all.map((n) => n.x)) + 140, minY: Math.min(...all.map((n) => n.y)) - 140, maxY: Math.max(...all.map((n) => n.y)) + 140 };
}
let LAYOUT = null;
export const skLayout = () => (LAYOUT ||= layout()); // für Tests

// Zustand eines Knotens: Einzel-Fähigkeit wie skillState; Stufen-Gruppe nach der nächsten offenen Stufe (n = gelernte Stufen)
function nodeState(g, n) {
  if (n.id === 'start') return { st: 'known', n: 0, of: 0, cur: null };
  const kn = n.ids.filter((id) => g.knows(id)).length, cur = n.ids.find((id) => !g.knows(id)) || n.ids[n.ids.length - 1], s0 = g.skillState(cur);
  if (!n.group) return { ...s0, n: kn, of: 1, cur };
  return { st: kn === n.ids.length ? 'known' : kn && s0.st !== 'open' ? 'known' : s0.st, why: s0.why, hw: s0.hw, n: kn, of: n.ids.length, cur, part: kn > 0 && kn < n.ids.length };
}
// Nebel: gelernte Knoten, ihre Nachbarn (wenn es sie schon gibt), alles Lernbare und der gerade gezeigte Knoten
function fog(g, L, v) {
  const S = {}, known = new Set(['start']), vis = new Set(['start']);
  for (const n of Object.values(L.N)) { S[n.id] = nodeState(g, n); if (n.id !== 'start' && (S[n.id].st === 'known' || S[n.id].n > 0)) known.add(n.id); }
  for (const n of Object.values(L.N)) {
    const S0 = S[n.id], near = n.par.some((p) => known.has(p)) || n.kids.some((c) => known.has(c));
    if (known.has(n.id) || S0.st === 'open' || v.reveal === n.id || (near && !S0.hw && S0.st !== 'wip')) vis.add(n.id);
  }
  return { S, known, vis };
}

export function skillsMenu(ui, sel = undefined) {
  const g = ui.g; g.learned?.('skills');
  const L = (LAYOUT ||= layout());
  const v = (ui.skView ||= { k: 1, tx: null, ty: 0, tip: null, pin: false });
  v.tip = null; v.pin = false; v.reveal = sel ? GROUP_OF[sel] || sel : null; v.seen = null;
  const body = h(`<div class="skt"><div class="skt-head"></div><div class="skt-view" tabindex="0"><div class="skt-tip hidden" role="dialog"></div><div class="skt-foot">Ziehen = verschieben · Rad oder zwei Finger = zoomen · Symbol antippen = Details</div></div></div>`);
  ui.openModal(body, 'skt-card', 'skills');
  const view = body.querySelector('.skt-view');
  const svg = sv('svg', { class: 'skt-svg', width: '100%', height: '100%' }), root = sv('g'); svg.append(root); view.prepend(svg);
  const vw = () => view.clientWidth || 900, vh = () => view.clientHeight || 500;
  const clamp = () => { const k = v.k; v.tx = Math.min(vw() / 2 - L.minX * k, Math.max(vw() / 2 - L.maxX * k, v.tx)); v.ty = Math.min(vh() / 2 - L.minY * k, Math.max(vh() / 2 - L.maxY * k, v.ty)); };
  const apply = () => { clamp(); root.setAttribute('transform', `translate(${v.tx.toFixed(1)},${v.ty.toFixed(1)}) scale(${v.k.toFixed(3)})`); placeTip(ui); };
  const zoomAt = (px, py, f) => { const k1 = Math.max(0.35, Math.min(2.2, v.k * f)); v.tx = px - ((px - v.tx) * k1) / v.k; v.ty = py - ((py - v.ty) * k1) / v.k; v.k = k1; apply(); };
  ui.skTree = { body, root, view, apply, L };
  renderHead(ui); drawTree(ui);
  // Beim Öffnen: auf den gezeigten, sonst einen lernbaren, sonst den zuletzt gelernten Knoten zentrieren
  const F = v.fog, known = g.s.sk?.known || {};
  const last = Object.keys(known).filter((id) => L.N[GROUP_OF[id] || id]).sort((a, b) => known[b] - known[a])[0], lastN = last ? GROUP_OF[last] || last : 'start';
  const open = Object.values(L.N).filter((n) => F.S[n.id].st === 'open' && F.vis.has(n.id)).sort((a, b) => Math.hypot(a.x - L.N[lastN].x, a.y - L.N[lastN].y) - Math.hypot(b.x - L.N[lastN].x, b.y - L.N[lastN].y))[0];
  const tgt = L.N[v.reveal] || (last && g.s.day - known[last] <= 3 ? L.N[lastN] : open || L.N[lastN]);
  const ext = Math.max(...[...F.vis].map((id) => L.N[id].r)) + 90; v.k = Math.max(vw() < 600 ? 0.62 : 0.74, Math.min(1.05, Math.min(vw(), vh()) / (2 * ext))); // aufgedeckten Teil zeigen, Symbole lesbar
  v.tx = vw() / 2 - tgt.x * v.k; v.ty = vh() / 2 - tgt.y * v.k; apply();
  if (L.N[v.reveal]) showTip(ui, v.reveal, true);
  // Ziehen, Pinch, Rad, Tippen (Maus, Touch, Stift); Hover zeigt den Tooltip nur mit der Maus
  const pts = new Map(); let moved = 0, pinch = null;
  view.addEventListener('pointerdown', (e) => { if (e.target.closest('.skt-tip')) return; view.setPointerCapture?.(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: v.k }; } });
  view.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    if (pts.size === 1) { v.tx += dx; v.ty += dy; apply(); }
    else if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()], r = view.getBoundingClientRect(), d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, (pinch.k * (d / pinch.d)) / v.k); }
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return; const wasTap = pts.size === 1 && moved < 8; pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!wasTap) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-sk]'); if (el) { showTip(ui, el.dataset.sk, true); ui.audio?.click?.(); } else hideTip(ui, true);
  };
  view.addEventListener('pointerup', up); view.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); pinch = null; });
  view.addEventListener('wheel', (e) => { if (e.target.closest('.skt-tip')) return; e.preventDefault(); const r = view.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
  view.addEventListener('keydown', (e) => { if (e.target.closest?.('.skt-tip')) return; const st = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60] }[e.key]; if (st) { v.tx += st[0]; v.ty += st[1]; apply(); e.preventDefault(); } if (e.key === '+' || e.key === '-') zoomAt(vw() / 2, vh() / 2, e.key === '+' ? 1.15 : 1 / 1.15); const n = e.target.closest?.('[data-sk]'); if (n && (e.key === 'Enter' || e.key === ' ')) { showTip(ui, n.dataset.sk, true); e.preventDefault(); } });
  const tipEl = view.querySelector('.skt-tip'); tipEl.addEventListener('pointerenter', () => clearTimeout(v.hideT)); tipEl.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hideTip(ui); });
}
// Tooltip: Esc schließt zuerst ihn (main.js über ui.escLocal)
export function skCloseDetail(ui) { if (ui.modalKind !== 'skills' || !ui.skTree) return false; if (ui.skView?.tip) { hideTip(ui, true); return true; } return false; }
export function skRefresh(ui) { if (ui.modalKind !== 'skills' || !ui.skTree) return; renderHead(ui); drawTree(ui); if (ui.skView.tip) showTip(ui, ui.skView.tip, ui.skView.pin); }

// Leiste oben (schmal): freie Punkte mit Balken bis zum nächsten, Geld
function renderHead(ui) {
  const g = ui.g, s = g.s, el = ui.skTree.body.querySelector('.skt-head'), e = g.epProgress(), free = g.fpFree();
  el.innerHTML = `<h2>Fähigkeiten</h2><div class="skh-pts ${free ? 'has' : ''}" title="${esc(`${e.cur.toLocaleString('de-DE')} / ${e.need.toLocaleString('de-DE')} Erfahrung bis zum nächsten Punkt – Erfahrung gibt es fürs Selbermachen: bauen, einrichten, reparieren, verkaufen`)}"><b>★ ${free} ${free === 1 ? 'Punkt' : 'Punkte'} frei</b><span class="skh-bar"><i style="width:${e.pc}%"></i></span><em>nächster Punkt</em></div><div class="skh-cash">${fmtUSD(s.cash)}</div><button class="modal-x skh-x" title="Schließen (T oder Esc)">✕</button>`;
  el.querySelector('.skh-x').onclick = () => ui.resume();
}

function drawTree(ui) {
  const g = ui.g, { root, L } = ui.skTree, v = ui.skView, { N } = L, F = fog(g, L, v);
  const seen = v.seen || { known: new Set(F.known), vis: new Set(F.vis) }, newK = [...F.known].filter((id) => !seen.known.has(id)), newV = [...F.vis].filter((id) => !seen.vis.has(id));
  v.seen = { known: new Set(F.known), vis: new Set(F.vis) }; v.fog = F;
  root.innerHTML = '';
  const defs = sv('defs'); defs.innerHTML = '<filter id="skglow" filterUnits="userSpaceOnUse" x="-3000" y="-3000" width="6000" height="6000"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><radialGradient id="skstart"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#b87a12"/></radialGradient>'; root.append(defs);
  // Äste als schwache Sektoren, so weit wie aufgedeckt, mit Namen an der Spitze
  const vr = {}; for (const cat of Object.keys(BRANCH)) vr[cat] = Math.max(R0 - 10, ...Object.values(N).filter((n) => n.cat === cat && !n.group && F.vis.has(n.id)).map((n) => n.r)) + 46;
  for (const [cat, B] of Object.entries(BRANCH)) { const r = vr[cat] + 40, a0 = (B.a - 30) * RAD, a1 = (B.a + 30) * RAD; root.append(sv('path', { d: `M0,0 L${Math.cos(a0) * r},${Math.sin(a0) * r} A${r},${r} 0 0 1 ${Math.cos(a1) * r},${Math.sin(a1) * r} Z`, fill: B.c, 'fill-opacity': 0.035, class: 'skt-sec' })); }
  for (const [cat, B] of Object.entries(BRANCH)) { const r = vr[cat] + 18, cx = Math.cos(B.a * RAD), t = sv('text', { x: cx * r, y: Math.sin(B.a * RAD) * r + 4, class: 'skt-lane', fill: B.c, 'text-anchor': cx > 0.3 ? 'start' : cx < -0.3 ? 'end' : 'middle' }); t.textContent = SKILL_CAT[cat].name; root.append(t); }
  // Linien: leuchten in der Astfarbe, wenn der Weg frei ist (gelernt → gelernt/lernbar), sonst gedimmt und gestrichelt
  const eg = sv('g', { class: 'skt-edges' }); root.append(eg);
  for (const n of Object.values(N)) for (const p of n.par) {
    if (!F.vis.has(n.id) || !F.vis.has(p)) continue; const a = N[p], st = F.S[n.id].st, free = F.known.has(p) && (F.known.has(n.id) || st === 'open'), col = CAT_COLOR[n.cat] || '#ffd25c';
    const e = sv('line', { x1: a.x, y1: a.y, x2: n.x, y2: n.y, class: `skt-e ${free ? (F.known.has(n.id) ? 'on' : 'free') : 'lock'}`, stroke: free ? col : '#3a414e' });
    if (newK.includes(n.id) || (newV.includes(n.id) && F.known.has(p))) { e.classList.add('draw'); e.setAttribute('pathLength', 1); } // Linie zeichnet sich zum neuen Nachbarn
    eg.append(e);
  }
  // Knoten: großes Symbol, Farbe/Rahmen nach Zustand; Stufen unten „1/3“
  for (const n of Object.values(N)) {
    if (!F.vis.has(n.id)) continue;
    const S = F.S[n.id], st = n.id === 'start' ? 'start' : S.st, col = CAT_COLOR[n.cat] || '#ffd25c', R = n.id === 'start' ? 30 : NR;
    const grp = sv('g', { class: `skn st-${st}${S.part ? ' part' : ''}${v.tip === n.id ? ' sel' : ''}`, 'data-sk': n.id, transform: `translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`, tabindex: 0, role: 'button', 'aria-label': n.id === 'start' ? 'Start' : n.group ? `${GROUPS[n.id].name} ${S.n}/${S.of}` : SKILL[n.id]?.name || n.id });
    const inner = sv('g', { class: 'skn-in' }); grp.append(inner);
    if (st === 'open') inner.append(sv('circle', { r: R + 6, fill: 'none', stroke: col, 'stroke-width': 2, class: 'skn-pulse' }));
    inner.append(sv('circle', { r: R, class: 'skn-c', fill: n.id === 'start' ? 'url(#skstart)' : st === 'known' ? col : '#121722', 'fill-opacity': st === 'known' ? 0.3 : 1, stroke: st === 'known' || st === 'open' ? col : '#353c49', 'stroke-width': st === 'open' ? 2.6 : 2 }));
    const t = sv('text', { class: 'skn-sym', 'text-anchor': 'middle', 'dominant-baseline': 'central', y: 1, 'font-size': n.id === 'start' ? 26 : 22 }); t.textContent = SYM[n.id] || '•'; inner.append(t);
    if (n.group) { const tt = sv('text', { class: 'skn-stage', 'text-anchor': 'middle', y: R + 15 }); tt.textContent = `${S.n}/${S.of}`; inner.append(tt); }
    if (n.id === 'start') { const tt = sv('text', { class: 'skn-stage', 'text-anchor': 'middle', y: R + 16 }); tt.textContent = 'Start'; inner.append(tt); }
    if (newK.includes(n.id)) { grp.classList.add('pop'); grp.append(sv('circle', { r: R, fill: 'none', stroke: col, 'stroke-width': 3, class: 'skn-burst' })); }
    else if (newV.includes(n.id)) grp.classList.add('reveal');
    grp.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !v.pin) { clearTimeout(v.hideT); v.showT = setTimeout(() => showTip(ui, n.id, false), 110); } });
    grp.addEventListener('pointerleave', (e) => { clearTimeout(v.showT); if (e.pointerType === 'mouse') hideTip(ui); });
    grp.addEventListener('focus', () => { if (!v.pin) showTip(ui, n.id, false); });
    root.append(grp);
  }
  if (newK.length) ui.audio?.fanfare?.(); else if (newV.length) ui.audio?.install?.();
  setTimeout(() => root.querySelectorAll('.draw, .pop, .reveal').forEach((x) => { x.classList.remove('draw', 'pop', 'reveal'); x.removeAttribute('pathLength'); }), 1600);
}

// Tooltip (Paket 18, ganz kurz): Name, ein Satz, was man danach tun kann, ein Knopf
function showTip(ui, id, pin = false) {
  const g = ui.g, s = g.s, v = ui.skView, T = ui.skTree, n = T?.L.N[id]; if (!n) return;
  const el = T.view.querySelector('.skt-tip'); clearTimeout(v.hideT); v.tip = id; v.pin = pin || (v.pin && v.tip === id);
  for (const x of T.root.querySelectorAll('.skn')) x.classList.toggle('sel', x.dataset.sk === id);
  if (id === 'start') { el.innerHTML = '<div class="tp-h"><span class="tp-sym">⭐</span><b>Start</b></div><p>Dein erster PC in der Einzimmerwohnung. Was du lernst, deckt den Baum auf.</p>'; el.classList.remove('hidden'); placeTip(ui); return; }
  const S = v.fog?.S[id] || nodeState(g, n), k = SKILL[S.cur], col = CAT_COLOR[n.cat], G = n.group ? GROUPS[id] : null;
  const name = G ? `${G.name} · Stufe ${S.st === 'known' && !S.part ? S.of : Math.min(S.n + 1, S.of)}/${S.of}` : k.name;
  el.innerHTML = `<div class="tp-h" style="--c:${col}"><span class="tp-sym">${SYM[id] || '•'}</span><b>${esc(name)}</b><button class="tp-x" title="Schließen (Esc)">✕</button></div><p>${esc(k.can)}</p><div class="tp-act"></div>`;
  el.querySelector('.tp-x').onclick = () => hideTip(ui, true);
  const act = el.querySelector('.tp-act');
  if (S.st === 'known' && !S.part) { act.append(h('<span class="tp-done">✓ Gelernt</span>')); if (k.where) { const b = h('<button class="btn small tp-where">Zeig mir wo</button>'); b.onclick = () => showWhere(ui, k); act.append(b); } }
  else if (S.st === 'auto') act.append(h('<span class="tp-done dim">Kommt von selbst, sobald du es brauchst</span>'));
  else {
    const w = g.skillWays(S.cur)[0], need = S.st === 'soon' && /^braucht /.test(S.why || '') ? `Erst ${S.why.replace(/^braucht /, '').replace(/ und /g, ' und ')} lernen` : '';
    const b = h(`<button class="btn primary tp-buy" ${w?.ok ? '' : 'disabled'}>${esc(need || w?.label || 'Freischalten')}</button>`); act.append(b);
    if (w && !w.ok && !need && S.st === 'open') act.append(h(`<small class="tp-why">${esc(w.why)}</small>`));
    b.onclick = (e) => { e.stopPropagation(); const r = g.startLearn(S.cur); if (r) { ui.toast(esc(r), 'bad', 3000); return; } ui.toast(`<b>Gelernt:</b> ${esc(k.name)}`, 'good', 3000); skRefresh(ui); ui.dock?.(); };
  }
  el.classList.remove('hidden'); placeTip(ui);
}
function hideTip(ui, now = false) {
  const v = ui.skView, T = ui.skTree; if (!T || !v) return; clearTimeout(v.hideT);
  const go = () => { if (!ui.skTree) return; v.tip = null; v.pin = false; T.view.querySelector('.skt-tip')?.classList.add('hidden'); T.root.querySelectorAll('.skn.sel').forEach((x) => x.classList.remove('sel')); };
  if (now) go(); else if (!v.pin) v.hideT = setTimeout(go, 260);
}
// Tooltip neben den Knoten (rechts, sonst links), in der Ansicht gehalten; schmal (Handy): unten angedockt
function placeTip(ui) {
  const v = ui.skView, T = ui.skTree; if (!v?.tip || !T) return; const el = T.view.querySelector('.skt-tip'), n = T.L.N[v.tip]; if (!n || el.classList.contains('hidden')) return;
  const W = T.view.clientWidth, H = T.view.clientHeight; if (W < 600) { el.style.left = el.style.top = ''; el.classList.add('dock'); return; } el.classList.remove('dock');
  const x = v.tx + n.x * v.k, y = v.ty + n.y * v.k, w = el.offsetWidth || 280, hh = el.offsetHeight || 140, off = (NR + 14) * v.k;
  const left = x + off + w < W - 8 ? x + off : Math.max(8, x - off - w), top = Math.max(8, Math.min(H - hh - 8, y - hh / 2));
  el.style.left = `${Math.round(left)}px`; el.style.top = `${Math.round(top)}px`;
}

// „Zeig mir wo“: Baum zu, dann das passende Fenster (nie zwei übereinander)
function showWhere(ui, k) {
  const g = ui.g, s = g.s, fac = s.current, objs = g.facObjects(fac);
  const pick = { rig: (o) => PLACEABLE[o.type].kind === 'rig' && o.parts, gpuRig: (o) => g.profKind(o) === 'gpu', rigNoOs: (o) => g.osNeed(o), asic: (o) => g.profKind(o) === 'asic', fpga: (o) => PLACEABLE[o.type].look === 'fpga', broken: (o) => o.broken || (o.items || []).some((i) => i.b), robi: (o) => o.type === 'robi' }[k.where];
  ui.resume();
  if (k.where === 'market') { ui.market(); return; }
  if (k.where === 'company') { ui.company(); return; }
  if (k.where === 'phone') { ui.phone('contacts'); return; }
  if (k.where?.startsWith('shop:')) { ui.cat = k.where.slice(5); ui.toggleBuild(); return; }
  const o = pick && (objs.find(pick) || (k.where === 'rigNoOs' ? objs.find((x) => PLACEABLE[x.type].kind === 'rig') : null));
  if (o) { ui.openInspector(o.uid); return; }
  ui.toast(k.where === 'asic' ? `Hier steht noch kein ASIC-Miner – stell einen auf und schau ihn an (${esc(K('use'))}).` : k.where === 'gpuRig' ? 'Hier steht noch kein Rig mit Grafikkarte.' : k.where === 'broken' ? `Gerade ist nichts kaputt. Bei einem Defekt: Gerät anschauen (${esc(K('use'))}) → Selbst reparieren.` : k.where === 'robi' ? 'Hier steht noch kein Robi – Shop → Roboter.' : 'Hier gibt es dafür gerade kein Gerät.', 'info', 4500);
}

// ---------- Handgriffe im Inspektor ----------
// Betriebssystem-Installer: ersetzt den Inspektor-Inhalt, bis er fertig ist (Esc bricht nur den Installer ab)
export function osWizard(ui, o, c) {
  const g = ui.g, w = ui.osWiz, lic = g.osPrice('win'), lin = g.knows('linux');
  const box = h(`<div class="oswiz"><div class="os-scr"><div class="os-bar"><span>Setup</span><span>${esc(o.type === 'tower' ? 'Mining-PC' : PLACEABLE[o.type].name)}</span></div><div class="os-in"></div></div><div class="os-foot"><span>Esc bricht nur den Installer ab</span><button class="btn small os-ab">Abbrechen</button></div></div>`);
  const inn = box.querySelector('.os-in'); box.querySelector('.os-ab').onclick = () => osAbort(ui);
  if (w.step === 0) {
    inn.innerHTML = `<div class="os-t">Willkommen beim Setup</div><div class="os-kv"><span>Sprache</span><b>Deutsch</b><span>Festplatte</span><b>${o.parts?.gpus?.length ? '120' : '80'} GB · leer</b><span>Arbeitsspeicher</span><b>4 GB</b></div><button class="btn primary os-go">Weiter ›</button>`;
    inn.querySelector('.os-go').onclick = () => { w.step = 1; ui.audio?.click?.(); ui.inspect(o.uid); };
  } else if (w.step === 1) {
    inn.innerHTML = `<div class="os-t">Welches System?</div><button class="os-pick" data-k="win"><b>Windows 7</b><small>Lizenz ${money(lic)} · läuft sofort</small></button><button class="os-pick ${lin ? '' : 'no'}" data-k="linux" ${lin ? '' : 'disabled'}><b>Linux (Mining-Distribution)</b><small>${lin ? 'gratis · schlank, läuft stabil' : `Erst lernen: „Linux-Mining-System“ (${esc(K('skills'))})`}</small></button>${g.canAfford(lic) ? '' : `<div class="os-warn">Für die Lizenz fehlen ${money(lic - g.s.cash)}.</div>`}`;
    inn.querySelectorAll('.os-pick').forEach((b) => (b.onclick = () => { const kd = b.dataset.k, why = g.osWhy(o, kd); if (why) { ui.toast(esc(why), 'bad', 3000); return; } w.kind = kd; w.step = 2; w.t0 = performance.now(); ui.audio?.click?.(); ui.inspect(o.uid); }));
  } else {
    const dur = 6000, name = w.kind === 'win' ? 'Windows 7' : 'Linux';
    inn.innerHTML = `<div class="os-t">${name} wird installiert …</div><div class="os-prog"><i></i></div><div class="os-step">Dateien kopieren …</div>`;
    const bar = inn.querySelector('.os-prog i'), stp = inn.querySelector('.os-step'), steps = ['Dateien kopieren …', 'Treiber für die Grafikkarten …', 'Miner einrichten …', 'Neustart …'];
    const tick = () => { if (ui.osWiz !== w || !bar.isConnected) return; const p = Math.min(1, (performance.now() - w.t0) / dur); bar.style.width = `${Math.round(p * 100)}%`; stp.textContent = steps[Math.min(steps.length - 1, Math.floor(p * steps.length))]; if (p < 1) { requestAnimationFrame(tick); return; }
      ui.osWiz = null; if (!g.osInstall(o.uid, w.kind)) { ui.toast('Installation ging nicht.', 'bad'); ui.inspect(o.uid); return; } ui.audio?.powerOn?.(); ui.w.pulse?.(o.uid); ui.toast(`<b>${name}</b> läuft – der Miner startet.${w.kind === 'win' ? ` Lizenz ${money(lic)}.` : ''}`, 'good', 4500); ui.inspect(o.uid); };
    requestAnimationFrame(tick);
  }
  c.append(box);
}
export function osAbort(ui) { if (!ui.osWiz) return false; const uid = ui.osWiz.uid; ui.osWiz = null; ui.toast('Installer abgebrochen.', 'info', 2000); if (ui.inspUid === uid) ui.inspect(uid); return true; }

// Kurzer Fortschrittsbalken für Handgriffe (Flashen, Bitstream, USB-Stick) – dann die Aktion
function handBar(ui, sec, label, ms, act) {
  if (sec.querySelector('.hb')) return; sec.querySelectorAll('button').forEach((b) => (b.disabled = true));
  const bar = h(`<div class="hb"><span>${esc(label)}</span><div class="os-prog"><i></i></div></div>`); sec.append(bar); const i = bar.querySelector('i'), t0 = performance.now();
  const tick = () => { if (!bar.isConnected) return; const p = Math.min(1, (performance.now() - t0) / ms); i.style.width = `${Math.round(p * 100)}%`; if (p < 1) requestAnimationFrame(tick); else act(); };
  requestAnimationFrame(tick);
}
const lockLine = (txt) => `<div class="sk-lock"><svg viewBox="0 0 24 24" width="14" height="14">${ICON.lock}</svg><span>${esc(txt)}</span>${kbd('skills')}</div>`;

export function deviceSecs(ui, o) {
  const g = ui.g, s = g.s, def = PLACEABLE[o.type], fac = g.facOf(o.uid), out = document.createDocumentFragment(); if (!def) return out;
  const re = () => ui.inspect(o.uid);
  // Betriebssystem
  if (def.kind === 'rig' && o.parts) {
    if (g.osNeed(o)) {
      const n = g.facObjects(fac).filter((x) => g.osNeed(x)).length;
      const sec = h(`<div class="sec os-need"><h4>System</h4><div class="os-mini"><b>Kein Betriebssystem</b><span>Ohne System schürft der Rig nicht.</span></div><div class="row"></div></div>`), row = sec.querySelector('.row');
      const b = h('<button class="btn primary">Installer starten</button>'); b.onclick = () => { ui.osWiz = { uid: o.uid, step: 0 }; ui.audio?.click?.(); re(); }; row.append(b);
      if (g.knows('image')) { const u = h('<button class="btn">USB-Stick: Image · 1 Klick</button>'); u.onclick = () => handBar(ui, sec, 'Image wird aufgespielt …', 1400, () => { g.osInstall(o.uid, 'linux', true); ui.toast('Linux-Image drauf – der Miner läuft.', 'good', 3000); re(); }); row.append(u); if (n > 1) { const a = h(`<button class="btn small">Alle ${n} hier per USB-Stick</button>`); a.onclick = () => handBar(ui, sec, `${n} Images werden aufgespielt …`, 1800, () => { const k = g.osImageAll(fac); ui.toast(`${k} Rigs mit Linux-Image`, 'good', 3000); re(); }); row.append(a); } }
      out.append(sec);
    } else if (o.os && g.skOn()) out.append(h(`<div class="sec os-ok"><span class="os-chip">${esc(OS[o.os]?.name || o.os)}</span><span class="os-ln">${o.os === 'linux' ? 'Mining-Linux läuft' : o.os === 'xp' ? 'Papas altes XP – läuft' : 'Windows mit Lizenz'}</span></div>`));
  }
  // FPGA: Bitstream laden
  if (g.bitNeed(o)) {
    const sec = h(`<div class="sec"><h4>Bitstream</h4><div class="os-mini"><b>Kein Bitstream geladen</b><span>Ohne Bitstream rechnet das Board nicht.</span></div></div>`);
    if (g.knows('fpga')) { const b = h('<button class="btn primary">USB-JTAG anstecken · Bitstream laden</button>'); b.onclick = () => handBar(ui, sec, 'Bitstream wird geladen …', 2200, () => { g.bitLoad(o.uid); ui.toast('Bitstream geladen – die LEDs blinken grün.', 'good', 3000); re(); }); sec.append(b); }
    else sec.insertAdjacentHTML('beforeend', lockLine('Erst „FPGA-Boards bedienen“ lernen'));
    out.append(sec);
  }
  // Tuning (BIOS-Look): Profile, Lüfterkurve, Skript, Firmware, Autotuning
  const pk = g.profKind(o);
  if (pk) {
    const sec = h(`<div class="sec bios"><h4>Tuning <span class="bios-tag">${pk === 'gpu' ? 'BIOS' : o.fw ? 'Hashwerk-FW' : 'Web-Interface'}</span></h4></div>`);
    const why = g.profOk(o), cur = o.prof || 'std';
    if (!why) {
      const seg = h('<div class="bios-seg"></div>');
      for (const [p, P] of Object.entries(PROFILES)) { const b = h(`<button class="bios-b ${cur === p ? 'on' : ''}" title="${esc(P.desc)}">${P.name}</button>`); b.onclick = () => { g.setProfile(o.uid, p); ui.audio?.click?.(); re(); }; seg.append(b); }
      sec.append(seg);
      const a = g.analyze(o, s.day, null, fac), u = a.units[0], sm = g.summary[fac];
      if (u) { const net = u.rev - (a.watt / 1000) * 24 * (sm?.elec || 0); sec.append(h(`<div class="bios-kv"><span>Hash</span><b>${u.h ? fmtHash(u.h, u.algo) : '–'}</b><span>Strom</span><b>${fmtWatt(a.watt)}</b><span>Netto/Tag</span><b class="${net >= 0 ? 'pos' : 'neg'}">${fmtUSD(net)}</b><span>Profil</span><b>${esc(PROFILES[cur].desc)}</b></div>`)); }
      const same = g.facObjects(fac).filter((x) => x !== o && x.type === o.type && g.profKind(x) === pk && (x.prof || 'std') !== cur && !g.profOk(x)).length;
      if (same) { const b = h(`<button class="btn small">Auf alle ${same + 1} gleichen hier übernehmen</button>`); b.onclick = () => { let n = 0; for (const x of g.facObjects(fac)) if (x.type === o.type && g.profKind(x) === pk && !g.profOk(x) && (x.prof || 'std') !== cur) { if (cur === 'std') delete x.prof; else x.prof = cur; n++; } g.dayUpdate(true); ui.toast(`${PROFILES[cur].name} auf ${n} weiteren Geräten`, 'good', 2500); re(); }; sec.append(b); }
      if (pk === 'gpu' && g.knows('luefter')) { const fs = h(`<div class="bios-row"><span>Lüfterkurve</span><div class="bios-seg sm"></div></div>`); for (const [f, l] of [['quiet', 'Leise'], ['', 'Normal'], ['cool', 'Kühl']]) { const b = h(`<button class="bios-b ${(o.fan || '') === f ? 'on' : ''}">${l}</button>`); b.onclick = () => { g.setFan(o.uid, f); re(); }; fs.querySelector('.bios-seg').append(b); } sec.append(fs); }
      if (pk === 'gpu' && g.knows('skript')) { const on = !!s.fac[fac]?.skript; const b = h(`<label class="bios-row chk"><input type="checkbox" ${on ? 'checked' : ''}/> <span>Miner-Skript für ${esc(FACILITY[fac].short)}: Profile täglich selbst wählen (nur Linux-Rigs)</span></label>`); b.querySelector('input').onchange = (e) => { g.setSkript(fac, e.target.checked); re(); }; sec.append(b); }
    } // noch nicht gelernt: kein Sperrkasten – Tuning erscheint erst mit der Fähigkeit (Fenster zeigen nur, was man gerade kann)
    if (!g.plWhy(o)) { // Leistungsziel (Nr. 33): sichtbar an Watt und Hash
      const pl = o.pl || 100, a = g.analyze(o, s.day, null, fac), u = a.units.reduce((m, x) => { for (const [al, v] of Object.entries(x.hash)) if (v > (m.v || 0)) { m.v = v; m.al = al; } return m; }, {});
      const r = h(`<div class="bios-row pl"><span>Leistungsziel</span><input type="range" min="${PLIMIT.min}" max="${PLIMIT.max}" step="5" value="${pl}" aria-label="Leistungsziel in Prozent"/><b class="pl-v">${pl} %</b></div>`);
      const r2 = h(`<div class="pl-fx">${fmtWatt(a.watt)}${u.v ? ` · ${fmtHash(u.v, u.al)}` : ''}${pl > 100 ? ' · mehr Verschleiß' : pl < 100 ? ' · spart Strom' : ''}</div>`);
      const inp = r.querySelector('input'), lab = r.querySelector('.pl-v');
      inp.oninput = () => { lab.textContent = `${inp.value} %`; }; inp.onchange = () => { g.setPl(o.uid, +inp.value); ui.audio?.click?.(); re(); };
      sec.append(r, r2);
      const row2 = h('<div class="row"></div>'), same = g.facObjects(fac).filter((x) => x !== o && x.type === o.type && !g.plWhy(x) && (x.pl || 100) !== pl).length;
      if (same) { const b = h(`<button class="btn small">${pl} % auf alle ${same + 1} gleichen hier</button>`); b.onclick = () => { const n = g.plAll(fac, pl, o.type); ui.toast(`Leistungsziel ${pl} % auf ${n} weiteren Geräten`, 'good', 2500); re(); }; row2.append(b); }
      const fit = h(`<button class="btn small" title="Ein Ziel für alle einstellbaren Geräte hier, sodass 95 % des Anschlusses genutzt werden">${esc(FACILITY[fac].short)} genau auf den Anschluss fahren</button>`); fit.onclick = () => { const pc = g.plFit(fac); ui.toast(`Leistungsziel ${pc} % für alle hier – ${esc(FACILITY[fac].short)} nutzt jetzt bis zu 95 % des Anschlusses.`, 'good', 4000); re(); }; row2.append(fit);
      sec.append(row2);
    }
    if (pk === 'gpu' && g.knows('biosmod') && g.biosCards(o)) { // BIOS-Mod (Nr. 28): Polaris-Straps
      const n = g.biosCards(o);
      if (o.bios) sec.append(h(`<div class="bios-row"><span>BIOS</span><b>Polaris-Straps · +18 % Ethash auf ${n} ${n === 1 ? 'Karte' : 'Karten'}</b></div>`));
      else { const r = h('<div class="row"></div>'), b = h(`<button class="btn" ${g.biosWhy(o) ? 'disabled' : ''} title="${esc(g.biosWhy(o) || '+18 % Ethash bei gleichem Strom, 3 % Risiko')}">BIOS flashen: Polaris-Straps (${n} ${n === 1 ? 'Karte' : 'Karten'})</button>`); b.onclick = () => handBar(ui, sec, 'Nicht ausschalten! BIOS wird geschrieben …', 3200, () => { const x = g.biosFlash(o.uid); ui.toast(x?.brick ? 'Flash hängengeblieben – der Rig startet nicht mehr. Mit dem BIOS-Clip selbst löten oder reparieren lassen.' : '<b>Polaris-Straps</b> drauf: +18 % Ethash bei gleichem Strom.', x?.brick ? 'bad' : 'good', 5000); re(); }); r.append(b); const m = g.facObjects(fac).filter((x) => !g.biosWhy(x)).length; if (m > 1) { const a = h(`<button class="btn small">Alle ${m} Rigs hier flashen</button>`); a.onclick = () => handBar(ui, sec, `${m} Rigs werden geflasht …`, 4200, () => { const x = g.biosAll(fac); ui.toast(`${x.n} Rigs mit Polaris-Straps${x.b ? ` · ${x.b} hängengeblieben (defekt)` : ''}`, x.b ? 'info' : 'good', 4500); re(); }); r.append(a); } sec.append(r); }
    }
    if (pk === 'asic') {
      if (o.fw) { sec.append(h('<div class="bios-row"><span>Firmware</span><b>Hashwerk-FW · −10 % Strom, +8 % Hash</b></div>')); if (g.knows('autotuning')) { const b = h(`<label class="bios-row chk"><input type="checkbox" ${o.at ? 'checked' : ''}/> <span>Autotuning (Spannung je Chip, −10 % Strom)</span></label>`); b.querySelector('input').onchange = (e) => { g.setAt(o.uid, e.target.checked); re(); }; sec.append(b); } }
      else if (g.knows('firmware')) { const n = g.facObjects(fac).filter((x) => !g.flashOk(x)).length; const r = h('<div class="row"></div>'); const b = h('<button class="btn">Firmware flashen</button>'); b.onclick = () => handBar(ui, sec, 'Nicht ausschalten! Firmware wird geschrieben …', 3200, () => { const x = g.flash(o.uid); ui.toast(x?.brick ? 'Flash hängengeblieben – ein Gerät ist jetzt defekt. Reparieren lassen.' : 'Hashwerk-Firmware drauf: −10 % Strom, +8 % Hash.', x?.brick ? 'bad' : 'good', 4500); re(); }); r.append(b); if (n > 1) { const a = h(`<button class="btn small">Alle ${n} hier flashen</button>`); a.onclick = () => handBar(ui, sec, `${n} Geräte werden geflasht …`, 4200, () => { const x = g.flashAll(fac); ui.toast(`${x.n} geflasht${x.b ? ` · ${x.b} hängengeblieben (defekt)` : ''}`, x.b ? 'info' : 'good', 4500); re(); }); r.append(a); } sec.append(r); }
    }
    if (sec.childElementCount > 1) out.append(sec);
  }
  // Wasserkühlung (GPU-Rigs)
  if (pk === 'gpu' && g.knows('wasser')) { if (o.wk) out.append(h('<div class="sec os-ok"><span class="os-chip wk">Wasser</span><span class="os-ln">Wasserkühlung drin – 70 % der Wärme gehen nach draußen</span></div>')); else { const sec = h(`<div class="sec"><h4>Wasserkühlung</h4></div>`), why = g.wkWhy(o); const b = h(`<button class="btn" ${why ? 'disabled' : ''} title="${esc(why)}">Kühler und Schläuche einbauen · ${money(g.wkCost(o))}</button>`); b.onclick = () => handBar(ui, sec, 'Kühler drauf, Schläuche stecken, befüllen …', 2600, () => { if (g.wkInstall(o.uid)) ui.toast('Dicht! Die Wasserkühlung läuft.', 'good', 3000); re(); }); sec.append(b); out.append(sec); } }
  // Netzteil-Mod (Nr. 44)
  if (def.kind === 'rig' && o.parts?.psu && g.knows('psumod')) {
    const cap = g.psuCap(o), w = g.rigWatt(o), sec = h(`<div class="sec"><h4>Netzteil</h4><div class="sv-ln">${o.psuMod ? `Umgelötet: ${fmtWatt(cap)} statt ${fmtWatt(Math.round(cap / PSUMOD.cap))}` : `${fmtWatt(cap)}`} · der Rig braucht ${fmtWatt(w)}${o.psuMod ? ' · fällt etwas öfter aus' : ''}</div><div class="row"></div></div>`), row = sec.querySelector('.row');
    if (!o.psuMod) { const why = g.psuModWhy(o), b = h(`<button class="btn small" ${why ? 'disabled' : ''} title="${esc(why || 'Mini-Spiel: Spannung einstellen, Shunt brücken')}">Umlöten (+15 %) · ${money(PSUMOD.cost)}</button>`); b.onclick = () => psuGame(ui, o); row.append(b); if (g.psuRoutineOk(o)) { const r = h('<button class="btn small">Routine · 1 Klick</button>'); r.onclick = () => { if (g.psuMod(o.uid, { ok: true, routine: true })) ui.toast('Routine: umgelötet.', 'good', 2200); re(); }; row.append(r); } }
    out.append(sec);
  }
  // Wartung
  if (g.knows('wartung') && g.serviceCost(o)) {
    const left = o.serv ? Math.max(0, 180 - (s.day - o.serv)) : 0, why = g.serviceWhy(o);
    const sec = h(`<div class="sec"><h4>Wartung</h4><div class="sv-ln">${left ? `Gewartet am ${fmtDate(o.serv)} · noch ${left} Tage seltener Ausfälle` : 'Staub und alte Wärmeleitpaste – Zeit zum Warten'}</div><div class="row"></div></div>`), row = sec.querySelector('.row');
    const b = h(`<button class="btn small" ${why ? 'disabled' : ''} title="${esc(why)}">Warten · ${money(g.serviceCost(o))}</button>`); b.onclick = () => { if (g.service(o.uid)) { ui.audio?.install?.(); ui.toast('Gewartet: 180 Tage seltener Ausfälle.', 'good', 2500); } re(); }; row.append(b);
    const due = g.facObjects(fac).filter((x) => !g.serviceWhy(x)).length; if (due > 1) { const a = h(`<button class="btn small">Alle ${due} hier warten</button>`); a.onclick = () => { const n = g.serviceAll(fac); ui.toast(`${n} Geräte gewartet`, 'good', 2500); re(); }; row.append(a); }
    out.append(sec);
  }
  // Robi: Stufe, Fahrten, Module der Reihe nach (USB-Stick → Greifarm → Lötkopf)
  if (o.type === 'robi') {
    const n = g.robiIn(fac).length, can = ['USB-Stick an neue Rigs', o.mods?.steck && 'Riser und Karten tauschen, Bausätze einbauen', o.mods?.loet && `löten${g.knows('hashboard') ? ', Hashboards' : ''}${g.knows('psumod') ? ', Netzteile umlöten' : ''}`].filter(Boolean);
    const sec = h(`<div class="sec"><h4>Robi · Stufe ${g.roboStage(o)}</h4><div class="sv-ln">${esc(can.join(' · '))}. ${g.roboJobs(o)} Fahrten am Tag${n > 1 ? ` · ${n} Robis teilen sich ${esc(FACILITY[fac].short)}` : ''} · nur Material, kein Gehalt.</div></div>`);
    for (const [m, M] of Object.entries(g.roboMods)) { if (o.mods?.[m]) { sec.append(h(`<div class="bios-row"><span>${esc(M.name)}</span><b>eingebaut</b></div>`)); continue; } const why = g.roboModWhy(o, m), lk = !g.knows(M.skill); const b = h(`<button class="btn small" ${why ? 'disabled' : ''} title="${esc(why)}">${esc(M.name)} nachrüsten · ${money(M.price)}</button>`); b.onclick = () => { if (g.roboMod(o.uid, m)) ui.toast(`${M.name} eingebaut – Robi ist jetzt Stufe ${g.roboStage(o)}.`, 'good', 2500); re(); }; sec.append(b); if (lk) sec.insertAdjacentHTML('beforeend', lockLine(`Erst „${SKILL[M.skill].name}“ lernen`)); }
    if (o.mods?.loet && !g.knows('hashboard')) sec.insertAdjacentHTML('beforeend', lockLine('Für kaputte Miner: „Hashboard-Reparatur“ lernen'));
    out.append(sec);
  }
  return out;
}

// Reparatur je Defekt: selbst (Mini-Spiel, Material), Routine (1 Klick), reparieren lassen (Händler-Service, voller Preis)
const DEFECT = { loet: 'Brandgeruch – ein Kondensator ist durch.', steck: 'Startet nicht – Riser, Kabel oder eine Karte?', chip: 'Ein Hashboard meldet keine Chips mehr.' };
const RGAME = { loet: { kind: 'loeten', btn: 'Selbst löten', title: 'Löten' }, steck: { kind: 'stecken', btn: 'Fehler suchen', title: 'Fehlersuche' }, chip: { kind: 'chips', btn: 'Hashboard reparieren', title: 'Chip-Kette' } };
export function repairRow(ui, o, row) {
  const g = ui.g, broken = o.broken || (o.items && o.items.some((i) => i.b)); if (!broken) return;
  const rc = g.repairCost(o), re = () => ui.inspect(o.uid), k = g.repairKind(o), ok = g.repairSelfOk(o), nb = g.repairBrokenN(o);
  if (k) row.append(h(`<div class="rp-d">${esc(DEFECT[k])}${o.items ? ` · ${nb} von ${o.items.length} Plätzen` : ''}</div>`));
  if (ok) {
    const G = RGAME[ok], R = REPAIR[ok], mc = g.repairSelfCost(o), b = h(`<button class="btn good">${G.btn}${o.items && nb > 1 ? ' (1 Platz)' : ''} · ${money(mc)}</button>`);
    b.title = g.knows(R.sk) ? `Mini-Spiel ${G.title} (mit Übung) – nur Material` : `Mini-Spiel ${G.title} – mit der Fähigkeit „${SKILL[R.sk].name}“ leichter und billiger`;
    b.onclick = () => repairGame(ui, o, ok); row.append(b);
    if (g.repairRoutineOk(o)) { const all = !!o.items && nb > 1, r = h(`<button class="btn">Routine · ${all ? `alle ${nb} · ${money(g.repairSelfCost(o, true))}` : '1 Klick'}</button>`); r.title = 'Fünfmal geschafft – jetzt geht das im Schlaf'; r.onclick = () => { if (!g.repairSelf(o.uid, { ok: true, routine: true })) ui.toast('Nicht genug Geld.', 'bad'); else { ui.audio?.install?.(); ui.toast(all ? `Routine: ${nb} Plätze repariert.` : 'Routine: repariert.', 'good', 2200); } re(); }; row.append(r); }
  } else if (k === 'chip') row.insertAdjacentHTML('beforeend', lockLine('Selbst reparieren: erst „Hashboard-Reparatur“ lernen'));
  const b = h(`<button class="btn">Reparieren lassen · ${money(rc)}</button>`); b.title = 'Händler-Service: holt ab, bringt es repariert zurück – voller Preis'; b.onclick = () => { if (!g.repair(o.uid)) ui.toast('Nicht genug Geld.', 'bad'); else re(); }; row.append(b);
}
async function repairGame(ui, o, k) {
  const g = ui.g; if (!g.canAfford(g.repairSelfCost(o))) { ui.toast('Fürs Material reicht das Geld nicht.', 'bad'); return; }
  const R = REPAIR[k], G = RGAME[k], easy = g.knows(R.sk), uid = o.uid;
  const r = await playMinigame(ui, { kind: G.kind, easy, title: easy ? `${G.title} (mit Übung)` : G.title, n: o.parts?.gpus?.length || 0 });
  if (r.skipped) ui.toast('Abgebrochen – nichts passiert.', 'info', 2200);
  else if (!r.ok) ui.toast(k === 'steck' ? 'Den Fehler nicht gefunden – noch mal suchen oder reparieren lassen.' : k === 'chip' ? 'Die Kette läuft noch nicht – noch mal messen oder reparieren lassen.' : 'Lötstellen nicht sauber – noch mal versuchen oder reparieren lassen.', 'bad', 4000);
  else if (g.repairSelf(uid, r)) { ui.audio?.powerOn?.(); ui.toast(`<b>Repariert!</b>${r.clean ? ' Ohne einen Fehlgriff.' : ''} Nur das Material bezahlt.${!easy ? ` Mit der Fähigkeit „${esc(SKILL[R.sk].name)}“ (${esc(K('skills'))}) geht es leichter.` : ''}`, 'good', 4500); }
  if (ui.inspUid === uid) ui.inspect(uid);
}
async function psuGame(ui, o) {
  const g = ui.g, uid = o.uid, why = g.psuModWhy(o); if (why) { ui.toast(esc(why), 'bad', 3000); return; }
  const r = await playMinigame(ui, { kind: 'psu', easy: g.knows('loeten'), title: 'Netzteil-Mod' });
  if (r.skipped) ui.toast('Abgebrochen – das Netzteil ist wie vorher.', 'info', 2200);
  else if (!r.ok) ui.toast('Nicht geschafft – nichts kaputt, das Netzteil ist wie vorher. Noch mal versuchen?', 'bad', 4000);
  else if (g.psuMod(uid, r)) { ui.audio?.powerOn?.(); ui.toast(`<b>Umgelötet!</b> Das Netzteil schafft jetzt ${fmtWatt(g.psuCap(g.findObj(uid)))}.`, 'good', 4000); }
  if (ui.inspUid === uid) ui.inspect(uid);
}

// Karte „Gelernt …“ (ersetzt „Neue Stufe“), Einblendung „+n Erfahrung“
export function skillCard(ui, id) {
  const k = SKILL[id]; if (!k) return;
  if (ui.modalKind === 'skills') { skRefresh(ui); return; }
  document.getElementById('lvup')?.remove(); ui.audio?.fanfare?.(); ui.lvBusy = true; clearTimeout(ui.lvBT); ui.lvBT = setTimeout(() => { ui.lvBusy = false; }, 3900);
  const el = h(`<div id="lvup" class="sklv"><div class="lv-ic" style="background:${CAT_COLOR[k.cat]}"><svg viewBox="0 0 24 24" width="30" height="30">${ICON.check}</svg></div><div class="lv-t1">Gelernt</div><div class="lv-t2">${esc(k.name)}</div><div class="lv-t3">${esc(k.use ? 'Neu: ' + k.use : k.desc)}</div><div class="lv-t4">${kbd('skills')} Fähigkeiten</div></div>`);
  document.body.append(el); setTimeout(() => el.classList.add('out'), 3600); setTimeout(() => el.remove(), 4100);
}
export function pointCard(ui) {
  if (ui.modalKind === 'skills') { skRefresh(ui); return; }
  document.getElementById('lvup')?.remove(); ui.audio?.fanfare?.(); ui.lvBusy = true; clearTimeout(ui.lvBT); ui.lvBT = setTimeout(() => { ui.lvBusy = false; }, 3900);
  const free = ui.g.fpFree?.() || 1;
  const el = h(`<div id="lvup"><div class="lv-ic">★</div><div class="lv-t1">Fähigkeitspunkt frei</div><div class="lv-t2">${free} ${free === 1 ? 'Punkt' : 'Punkte'} zum Freischalten</div><div class="lv-t3">Einlösen im Fähigkeiten-Baum</div><div class="lv-t4">${kbd('skills')} Fähigkeiten</div></div>`);
  document.body.append(el); setTimeout(() => el.classList.add('out'), 3400); setTimeout(() => el.remove(), 3900);
}
export const POT_SVG = { w: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>', r: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>', g: '<circle cx="9" cy="9" r="5.5"/><path d="M14.6 8.8a5.5 5.5 0 1 1-5.8 5.8"/>' };
