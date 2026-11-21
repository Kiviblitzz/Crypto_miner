// Fähigkeiten-Seite (Taste T, J geht auch): EIN großer Baum – Knoten mit Verbindungslinien, zeitlich von links (2010) nach rechts,
// Äste je Kategorie als Farbe, ziehen = verschieben, Rad/Pinch = zoomen, Klick auf einen Knoten öffnet rechts die Details.
// Dazu die Handgriffe im Inspektor (Betriebssystem-Installer, BIOS-Profile, Firmware, Wartung, Wasserkühlung, Bitstream, Roboter)
// und die Reparatur-Knöpfe (selbst = Mini-Spiel, Routine, reparieren lassen). Esc: erst Details/Installer zu, dann der Baum, dann Pause.
import { SKILLS, SKILL, SKILL_CAT, POTS, PROFILES, OS, TEACHERS } from '../data/skills.js';
import { PLACEABLE } from '../data/hardware.js';
import { FACILITY } from '../data/world.js';
import { fmtUSD, fmtHash, fmtWatt, fmtDate } from '../sim/game.js';
import { playMinigame } from './minigame.js';

const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (v) => `${Math.round(v).toLocaleString('de-DE')} $`;
const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, a = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); return e; };
// Äste: Reihenfolge von oben nach unten (Lieblinge oben: OS & Firmware, Tuning, Löten & Reparatur) und Farbe
const LANES = [['sof', '#38c8ff'], ['tun', '#ff8a3d'], ['rep', '#ffb000'], ['sch', '#8fd16b'], ['kst', '#4fd6c8'], ['ges', '#c58cff']];
const CAT_COLOR = Object.fromEntries(LANES);
const AT = { grosshandel: '2014-03-01', einarbeiten: '2014-03-01', robo_usb: '2015-09-01', robo_steck: '2016-06-01', robo_loet: '2017-03-01', windows: '2010-11-01', wartung: '2010-10-20', loeten: '2010-11-15', serie: '2012-06-01', lager: '2011-06-01', elektrik: '2011-03-01', stecken: '2011-03-01', abluft: '2010-11-20', gpuminer: '2010-10-25', boerse: '2010-11-01' }; // Platz im Zeitstrahl für Knoten ohne Datum
const NW = 150, NH = 46, ROWH = 58, PADL = 96, PADT = 46;
// Zeitachse: die ersten Jahre breiter (dort liegen die meisten Fähigkeiten), später enger
const SEG = [[2010.6, 2013, 250], [2013, 2017, 150], [2017, 2031, 105]];
const xs = (t) => { let x = 0; for (const [a, b, w] of SEG) { if (t <= a) break; x += (Math.min(t, b) - a) * w; } return PADL + x; };
const yearOf = (iso) => { const d = new Date(iso + (iso.length <= 7 ? '-01' : '')); return d.getUTCFullYear() + d.getUTCMonth() / 12 + (d.getUTCDate() - 1) / 365; };
const dayYear = (day) => { const d = new Date(day * 864e5); return d.getUTCFullYear() + d.getUTCMonth() / 12 + (d.getUTCDate() - 1) / 365; };
const lines2 = (t) => { if (t.length <= 20) return [t]; const w = t.split(' '); let a = ''; while (w.length && (a + ' ' + w[0]).trim().length <= 20) a = (a + ' ' + w.shift()).trim(); let b = w.join(' '); if (b.length > 21) b = b.slice(0, 20) + '…'; return a ? [a, b] : [t.slice(0, 20), t.slice(20, 40)]; };
const ICON = {
  check: '<path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  lock: '<rect x="6" y="11" width="12" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" fill="none" stroke="currentColor" stroke-width="2"/>',
  phone: '<rect x="8" y="3.5" width="8" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>',
  wip: '<path d="M4 20l6-6M14 4l6 6-8 8-6-6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
};

// ---------- Layout: x nach Zeit, y nach Ast (mehrere Reihen je Ast, ohne Überlappung) ----------
function layout() {
  const pos = {}, X = {};
  const base = (k) => yearOf(k.from || AT[k.id] || '2010-10-15');
  const order = [...SKILLS].sort((a, b) => base(a) - base(b));
  const xOf = (k) => { if (X[k.id] != null) return X[k.id]; let x = xs(base(k)); for (const n of k.needs || []) if (SKILL[n]) x = Math.max(x, xOf(SKILL[n]) + NW + 26); return (X[k.id] = x); }; // rechts von allen Voraussetzungen
  const lanes = []; let y = PADT;
  for (const [cat, color] of LANES) {
    const rows = []; const list = order.filter((k) => k.cat === cat).map((k) => ({ k, x: xOf(k) })).sort((a, b) => a.x - b.x);
    for (const it of list) { let r = rows.findIndex((last) => last + NW + 18 <= it.x); if (r < 0) { rows.push(0); r = rows.length - 1; } rows[r] = it.x; pos[it.k.id] = { x: it.x, y: y + r * ROWH, cat }; }
    const hgt = Math.max(1, rows.length) * ROWH + 18; lanes.push({ cat, color, y, h: hgt }); y += hgt;
  }
  const maxX = Math.max(...Object.values(pos).map((p) => p.x)) + NW + 60;
  return { pos, lanes, W: maxX, H: y + 10 };
}
let LAYOUT = null;
export const skLayout = () => (LAYOUT ||= layout()); // für Tests

export function skillsMenu(ui, sel = undefined) {
  const g = ui.g; g.learned?.('skills');
  LAYOUT ||= layout();
  const v = (ui.skView ||= { k: 1, tx: null, ty: 0, sel: null });
  if (sel !== undefined) v.sel = sel;
  const body = h(`<div class="skt"><div class="skt-head"></div><div class="skt-body"><div class="skt-view" tabindex="0"></div><div class="skt-det hidden"></div></div><div class="skt-foot">Ziehen = verschieben · Mausrad oder zwei Finger = zoomen · Knoten antippen = Details</div></div>`);
  ui.openModal(body, 'skt-card', 'skills');
  renderHead(ui, body.querySelector('.skt-head'));
  const view = body.querySelector('.skt-view');
  const svg = sv('svg', { class: 'skt-svg', width: '100%', height: '100%' }), root = sv('g'); svg.append(root); view.append(svg);
  drawTree(ui, root);
  const vw = () => view.clientWidth || 900, vh = () => view.clientHeight || 500;
  if (v.tx == null) { const tx0 = xs(dayYear(g.s.day)); v.k = 0.82; v.tx = Math.min(0, vw() * 0.22 - tx0 * v.k); v.ty = 0; } // lesbar starten, „Heute“ links; herauszoomen geht mit Rad/Pinch
  const clamp = () => { const k = v.k; v.tx = Math.min(80, Math.max(vw() - LAYOUT.W * k - 80, v.tx)); v.ty = Math.min(60, Math.max(Math.min(0, vh() - LAYOUT.H * k - 60), v.ty)); };
  const apply = () => { clamp(); root.setAttribute('transform', `translate(${v.tx.toFixed(1)},${v.ty.toFixed(1)}) scale(${v.k.toFixed(3)})`); };
  const zoomAt = (px, py, f) => { const k1 = Math.max(0.35, Math.min(1.8, v.k * f)); v.tx = px - ((px - v.tx) * k1) / v.k; v.ty = py - ((py - v.ty) * k1) / v.k; v.k = k1; apply(); };
  apply();
  // Ziehen, Pinch, Rad, Tippen (Maus, Touch, Stift)
  const pts = new Map(); let moved = 0, pinch = null;
  view.addEventListener('pointerdown', (e) => { view.setPointerCapture?.(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: v.k }; } });
  view.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    if (pts.size === 1) { v.tx += dx; v.ty += dy; apply(); }
    else if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()], r = view.getBoundingClientRect(), d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, (pinch.k * (d / pinch.d)) / v.k); }
  });
  const up = (e) => {
    const wasTap = pts.size === 1 && moved < 8; pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
    if (!wasTap) return; const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-sk]'); if (el) select(ui, el.dataset.sk); else if (v.sel) select(ui, null);
  };
  view.addEventListener('pointerup', up); view.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); pinch = null; });
  view.addEventListener('wheel', (e) => { e.preventDefault(); const r = view.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
  view.addEventListener('keydown', (e) => { const st = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60] }[e.key]; if (st) { v.tx += st[0]; v.ty += st[1]; apply(); e.preventDefault(); } if (e.key === '+' || e.key === '-') zoomAt(vw() / 2, vh() / 2, e.key === '+' ? 1.15 : 1 / 1.15); });
  ui.skTree = { body, root, apply };
  if (v.sel) showDetail(ui, v.sel); else ui.skTree.body.querySelector('.skt-det').classList.add('hidden');
}
// Details auf/zu (Esc schließt zuerst die Details – main.js über ui.escLocal)
function select(ui, id) { ui.skView.sel = id; if (!ui.skTree) return; for (const n of ui.skTree.root.querySelectorAll('.skn')) n.classList.toggle('sel', n.dataset.sk === id); if (id) showDetail(ui, id); else ui.skTree.body.querySelector('.skt-det').classList.add('hidden'); }
export function skCloseDetail(ui) { if (ui.modalKind !== 'skills' || !ui.skView?.sel) return false; select(ui, null); return true; }
export function skRefresh(ui) { if (ui.modalKind !== 'skills' || !ui.skTree) return; renderHead(ui, ui.skTree.body.querySelector('.skt-head')); ui.skTree.root.innerHTML = ''; drawTree(ui, ui.skTree.root); ui.skTree.apply(); if (ui.skView.sel) showDetail(ui, ui.skView.sel); }

function renderHead(ui, el) {
  const g = ui.g, s = g.s, L = s.sk?.learning, T = s.sk?.teach;
  const pot = (p) => { const e = g.epProgress(p), free = g.fpFree(p); return `<div class="skh-pot ${free ? 'has' : ''}"><div class="skh-pn"><b>${POTS[p].name}</b><span>${free ? `${free} ${free === 1 ? 'Punkt' : 'Punkte'} frei` : 'kein Punkt frei'}</span></div><div class="skh-bar"><i style="width:${e.pc}%"></i></div><div class="skh-ep">${e.cur.toLocaleString('de-DE')} / ${e.need.toLocaleString('de-DE')} Erfahrung bis zum nächsten Punkt</div></div>`; };
  const now = L ? (() => { const k = SKILL[L.id], tot = Math.max(1, L.until - L.d0), pc = Math.round(Math.min(1, (s.day - L.d0) / tot) * 100), left = Math.max(0, L.until - s.day); return `<div class="skh-now"><span class="skh-k">${{ forum: 'Im Forum', book: 'Buch', course: 'Kurs' }[L.via] || 'Gerade'}</span><b>${esc(k?.name || L.id)}</b><div class="skh-bar"><i style="width:${pc}%"></i></div><span class="skh-left">noch ${left} ${left === 1 ? 'Tag' : 'Tage'}${s.sk.queue.length ? ` · danach: ${esc(s.sk.queue.map((q) => SKILL[q.id]?.name || q.id).join(', '))}` : ''}</span><button class="btn small skh-stop">Abbrechen</button></div>`; })() : `<div class="skh-now idle"><span class="skh-k">Gerade</span><b>Nichts in Arbeit</b><span class="skh-left">Wähl unten einen leuchtenden Knoten und fang an.</span></div>`;
  const teach = T ? `<div class="skh-teach">${esc(TEACHERS[T.who]?.name || T.who)} bringt dir „${esc(SKILL[T.id]?.name || T.id)}“ bei – morgen kannst du es.</div>` : '';
  el.innerHTML = `<div class="skh-t"><h2>Fähigkeiten</h2><span class="skh-sub">Was du kannst, schaltet Handgriffe frei – nichts wirkt von allein.</span><button class="modal-x skh-x" title="Schließen (T oder Esc)">✕</button></div><div class="skh-row">${['w', 'r', 'g'].map(pot).join('')}${now}</div>${teach}`;
  el.querySelector('.skh-x').onclick = () => ui.resume();
  const st = el.querySelector('.skh-stop'); if (st) st.onclick = () => { g.stopLearn(); ui.toast('Abgebrochen. Ein Buch bleibt, im Forum fängst du neu an.', 'info', 3500); skRefresh(ui); };
}

function drawTree(ui, root) {
  const g = ui.g, { pos, lanes, W, H } = LAYOUT, defs = sv('defs');
  defs.innerHTML = '<filter id="skglow" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
  root.append(defs);
  // Äste als Bänder, Jahre als Raster, „Heute“
  for (const l of lanes) { root.append(sv('rect', { x: 0, y: l.y - 8, width: W, height: l.h - 6, rx: 14, fill: l.color, 'fill-opacity': 0.045 })); const t = sv('text', { x: 14, y: l.y + 12, class: 'skt-lane', fill: l.color }); t.textContent = SKILL_CAT[l.cat].name; root.append(t); }
  for (let y = 2011; y <= 2026; y++) { const x = xs(y); if (x > W) break; root.append(sv('line', { x1: x, y1: 24, x2: x, y2: H, class: 'skt-yl' })); const t = sv('text', { x: x + 4, y: 18, class: 'skt-year' }); t.textContent = y; root.append(t); }
  const tx = xs(dayYear(g.s.day)); root.append(sv('line', { x1: tx, y1: 22, x2: tx, y2: H, class: 'skt-now' })); const nt = sv('text', { x: tx + 5, y: 34, class: 'skt-nowt' }); nt.textContent = 'Heute'; root.append(nt);
  // Kanten (Voraussetzungen, auch quer zwischen den Ästen)
  const st = {}; for (const k of SKILLS) st[k.id] = g.skillState(k.id).st;
  const eg = sv('g', { class: 'skt-edges' }); root.append(eg);
  for (const k of SKILLS) for (const n of k.needs || []) {
    const a = pos[n], b = pos[k.id]; if (!a || !b) continue;
    const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2, dx = Math.max(30, (x2 - x1) * 0.5);
    const on = st[n] === 'known', both = on && st[k.id] === 'known';
    eg.append(sv('path', { d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`, class: `skt-e ${both ? 'on' : on ? 'half' : ''}`, stroke: both || on ? CAT_COLOR[k.cat] : '#3a414e' }));
  }
  // Knoten
  const L = g.s.sk?.learning;
  for (const k of SKILLS) {
    const p = pos[k.id], s0 = st[k.id], col = CAT_COLOR[k.cat], later = s0 === 'later', grp = sv('g', { class: `skn st-${s0} ${ui.skView?.sel === k.id ? 'sel' : ''}`, 'data-sk': k.id, transform: `translate(${p.x},${p.y})` });
    const fill = s0 === 'known' ? col : '#151922', fo = s0 === 'known' ? 0.22 : 1;
    if (s0 === 'open') grp.append(sv('rect', { x: -3, y: -3, width: NW + 6, height: NH + 6, rx: 14, fill: 'none', stroke: col, 'stroke-opacity': 0.55, filter: 'url(#skglow)', class: 'skn-glow' }));
    grp.append(sv('rect', { width: NW, height: NH, rx: 11, fill, 'fill-opacity': fo, stroke: s0 === 'known' || s0 === 'open' || s0 === 'learning' ? col : '#3b4252', 'stroke-width': s0 === 'open' ? 2 : 1.4, 'stroke-dasharray': s0 === 'wip' ? '5 4' : s0 === 'learning' ? '7 3' : 'none', class: 'skn-box' }));
    if (s0 === 'learning' && L?.id === k.id) { const pc = Math.min(1, (g.s.day - L.d0) / Math.max(1, L.until - L.d0)); grp.append(sv('rect', { x: 8, y: NH - 6, width: (NW - 16) * pc, height: 3, rx: 1.5, fill: col })); }
    const name = later ? ['???'] : lines2(k.name);
    name.forEach((ln, i) => { const t = sv('text', { x: 12, y: name.length === 1 ? 28 : 19 + i * 15, class: 'skn-t' }); t.textContent = ln; grp.append(t); });
    if (later) { const t = sv('text', { x: 12, y: 40, class: 'skn-d' }); t.textContent = k.from ? 'ab ' + k.from.slice(0, 4) : 'später'; grp.append(t); }
    const ic = { known: 'check', soon: 'lock', later: 'lock', wip: 'wip', auto: 'phone' }[s0];
    if (ic) { const gi = sv('g', { transform: `translate(${NW - 24},${NH / 2 - 9}) scale(0.75)`, class: 'skn-i', color: s0 === 'known' ? col : '#6c7586' }); gi.innerHTML = ICON[ic]; grp.append(gi); }
    else if (s0 === 'open') grp.append(sv('circle', { cx: NW - 15, cy: NH / 2, r: 5, fill: col, class: 'skn-dot' }));
    root.append(grp);
  }
}

const STATE_TXT = { known: ['Gelernt', 'ok'], open: ['Jetzt lernbar', 'warn'], learning: ['Wird gelernt', 'warn'], soon: ['Bald', 'idle'], later: ['Später', 'idle'], wip: ['Bald im Spiel', 'idle'], auto: ['Kommt per Handy', 'idle'] };
function showDetail(ui, id) {
  const g = ui.g, s = g.s, k = SKILL[id], el = ui.skTree?.body.querySelector('.skt-det'); if (!k || !el) return;
  const st = g.skillState(id), [stl, stc] = STATE_TXT[st.st] || ['', 'idle'], col = CAT_COLOR[k.cat], later = st.st === 'later';
  const needs = (k.needs || []).map((n) => `<span class="skd-need ${g.knows(n) ? 'ok' : ''}" data-go="${n}">${esc(SKILL[n]?.name || n)}</span>`).join('');
  el.innerHTML = `<div class="skd-h"><span class="skd-cat" style="--c:${col}">${esc(SKILL_CAT[k.cat].name)} · ${esc(k.feel)}</span><button class="modal-x skd-x" title="Details schließen (Esc)">✕</button></div>
    <h3>${later ? '???' : esc(k.name)}</h3><span class="badge ${stc}"><i></i>${stl}${st.why ? ' · ' + esc(st.why) : ''}</span>
    ${later ? `<p class="skd-p">Noch zu weit weg${k.from ? ` – frühestens ${k.from.slice(0, 4)}` : ''}. Je weiter du kommst, desto mehr siehst du.</p>` : `<p class="skd-p">${esc(k.desc)}</p>${k.use ? `<div class="skd-kv"><span>Wo</span><b>${esc(k.use)}</b></div>` : ''}${k.hint ? `<div class="skd-kv"><span>Lohnt sich</span><b>${esc(k.hint)}</b></div>` : ''}`}
    ${needs ? `<div class="skd-needs"><span>Braucht</span>${needs}</div>` : ''}
    ${k.soon && !later ? `<div class="skd-soon">${esc(k.soon)} – kommt mit einem späteren Update. Lernen kannst du es dann.</div>` : ''}
    <div class="skd-ways"></div>`;
  el.classList.remove('hidden');
  el.querySelector('.skd-x').onclick = () => select(ui, null);
  el.querySelectorAll('[data-go]').forEach((n) => (n.onclick = () => select(ui, n.dataset.go)));
  const ways = el.querySelector('.skd-ways');
  if (st.st === 'known') { const how = s.sk.src[id] || ''; ways.append(h(`<div class="skd-done">Gelernt am ${fmtDate(s.sk.known[id])}${how ? ` · ${esc({ pts: 'mit Punkten', forum: 'im Forum', book: 'aus dem Buch', course: 'im Kurs', msg: 'per Handy', migr: 'schon früher' }[how] || (how.startsWith('person:') ? 'bei ' + (TEACHERS[how.slice(7)]?.name || how.slice(7)) : ''))}` : ''}</div>`)); if (k.where) { const b = h('<button class="btn primary wide">Zeig mir wo</button>'); b.onclick = () => showWhere(ui, k); ways.append(b); } return; }
  if (later || st.st === 'auto') return;
  const L = s.sk.learning;
  if (st.st === 'learning' && L?.id === id) { const left = Math.max(0, L.until - s.day); ways.append(h(`<div class="skd-done">${{ forum: 'Du liest im Forum mit', book: 'Du liest das Buch', course: 'Du bist im Kurs' }[L.via] || 'Wird gelernt'} – noch ${left} ${left === 1 ? 'Tag' : 'Tage'}.</div>`)); return; }
  if (st.st === 'learning') { ways.append(h(`<div class="skd-done">${s.sk.teach?.id === id ? 'Die Lehrstunde ist morgen fertig.' : 'Steht in der Warteschlange.'}</div>`)); return; }
  ways.append(h('<div class="skd-wh">So lernst du es</div>'));
  for (const w of g.skillWays(id)) {
    const b = h(`<button class="skd-way ${w.ok ? '' : 'no'}" ${w.ok ? '' : 'disabled'}><span class="skd-wi">${WAY_IC[w.via] || ''}</span><span class="skd-wt"><b>${esc(w.label)}</b><small>${esc(w.ok || st.st !== 'open' ? w.sub : w.why)}</small></span></button>`);
    b.onclick = () => { const r = g.startLearn(id, w.i); if (r) { ui.toast(esc(r), 'bad', 3000); return; } ui.audio?.click?.(); const via = w.via; ui.toast(via === 'pts' ? `<b>Gelernt:</b> ${esc(k.name)}` : via === 'book' && g.parcelMode() && !s.sk.books[k.learn[w.i].id] ? `<b>Bestellt:</b> Buch „${esc(k.learn[w.i].title)}“ – kommt morgen früh als Paket. Aufheben, dann liest du es.` : via === 'person' ? `${esc(w.label.replace(' fragen', ''))} nimmt sich morgen Zeit für dich.` : `Los geht’s: ${esc(k.name)}`, 'good', 4500); skRefresh(ui); ui.dock(); };
    ways.append(b);
  }
}
const WAY_IC = { pts: '★', forum: '#', book: '▤', course: '✎', person: '☺' };

// „Zeig mir wo“: Baum zu, dann das passende Fenster (nie zwei übereinander)
function showWhere(ui, k) {
  const g = ui.g, s = g.s, fac = s.current, objs = g.facObjects(fac);
  const pick = { rig: (o) => PLACEABLE[o.type].kind === 'rig' && o.parts, gpuRig: (o) => g.profKind(o) === 'gpu', rigNoOs: (o) => g.osNeed(o), asic: (o) => g.profKind(o) === 'asic', fpga: (o) => PLACEABLE[o.type].look === 'fpga', broken: (o) => o.broken }[k.where];
  ui.resume();
  if (k.where === 'market') { ui.market(); return; }
  if (k.where === 'company') { ui.company(); return; }
  if (k.where?.startsWith('shop:')) { ui.cat = k.where.slice(5); ui.toggleBuild(); return; }
  const o = pick && (objs.find(pick) || (k.where === 'rigNoOs' ? objs.find((x) => PLACEABLE[x.type].kind === 'rig') : null));
  if (o) { ui.openInspector(o.uid); return; }
  ui.toast(k.where === 'asic' ? 'Hier steht noch kein ASIC-Miner – stell einen auf und schau ihn an (E).' : k.where === 'gpuRig' ? 'Hier steht noch kein Rig mit Grafikkarte.' : k.where === 'broken' ? 'Gerade ist nichts kaputt. Bei einem Defekt: Gerät anschauen (E) → Selbst reparieren.' : 'Hier gibt es dafür gerade kein Gerät.', 'info', 4500);
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
    inn.innerHTML = `<div class="os-t">Welches System?</div><button class="os-pick" data-k="win"><b>Windows 7</b><small>Lizenz ${money(lic)} · läuft sofort</small></button><button class="os-pick ${lin ? '' : 'no'}" data-k="linux" ${lin ? '' : 'disabled'}><b>Linux (Mining-Distribution)</b><small>${lin ? 'gratis · schlank, läuft stabil' : 'Erst lernen: „Linux-Mining-System“ (T)'}</small></button>${g.canAfford(lic) ? '' : `<div class="os-warn">Für die Lizenz fehlen ${money(lic - g.s.cash)}.</div>`}`;
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
const lockLine = (txt) => `<div class="sk-lock"><svg viewBox="0 0 24 24" width="14" height="14">${ICON.lock}</svg><span>${esc(txt)}</span><kbd>T</kbd></div>`;

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
    } else sec.insertAdjacentHTML('beforeend', lockLine(why.replace(/ \(T\)$/, '')));
    if (pk === 'asic') {
      if (o.fw) { sec.append(h('<div class="bios-row"><span>Firmware</span><b>Hashwerk-FW · −10 % Strom, +8 % Hash</b></div>')); if (g.knows('autotuning')) { const b = h(`<label class="bios-row chk"><input type="checkbox" ${o.at ? 'checked' : ''}/> <span>Autotuning (Spannung je Chip, −10 % Strom)</span></label>`); b.querySelector('input').onchange = (e) => { g.setAt(o.uid, e.target.checked); re(); }; sec.append(b); } }
      else if (g.knows('firmware')) { const n = g.facObjects(fac).filter((x) => !g.flashOk(x)).length; const r = h('<div class="row"></div>'); const b = h('<button class="btn">Firmware flashen</button>'); b.onclick = () => handBar(ui, sec, 'Nicht ausschalten! Firmware wird geschrieben …', 3200, () => { const x = g.flash(o.uid); ui.toast(x?.brick ? 'Flash hängengeblieben – ein Gerät ist jetzt defekt. Reparieren lassen.' : 'Hashwerk-Firmware drauf: −10 % Strom, +8 % Hash.', x?.brick ? 'bad' : 'good', 4500); re(); }); r.append(b); if (n > 1) { const a = h(`<button class="btn small">Alle ${n} hier flashen</button>`); a.onclick = () => handBar(ui, sec, `${n} Geräte werden geflasht …`, 4200, () => { const x = g.flashAll(fac); ui.toast(`${x.n} geflasht${x.b ? ` · ${x.b} hängengeblieben (defekt)` : ''}`, x.b ? 'info' : 'good', 4500); re(); }); r.append(a); } sec.append(r); }
    }
    out.append(sec);
  }
  // Wasserkühlung (GPU-Rigs)
  if (pk === 'gpu' && g.knows('wasser')) { if (o.wk) out.append(h('<div class="sec os-ok"><span class="os-chip wk">Wasser</span><span class="os-ln">Wasserkühlung drin – 70 % der Wärme gehen nach draußen</span></div>')); else { const sec = h(`<div class="sec"><h4>Wasserkühlung</h4></div>`), why = g.wkWhy(o); const b = h(`<button class="btn" ${why ? 'disabled' : ''} title="${esc(why)}">Kühler und Schläuche einbauen · ${money(g.wkCost(o))}</button>`); b.onclick = () => handBar(ui, sec, 'Kühler drauf, Schläuche stecken, befüllen …', 2600, () => { if (g.wkInstall(o.uid)) ui.toast('Dicht! Die Wasserkühlung läuft.', 'good', 3000); re(); }); sec.append(b); out.append(sec); } }
  // Wartung
  if (g.knows('wartung') && g.serviceCost(o)) {
    const left = o.serv ? Math.max(0, 180 - (s.day - o.serv)) : 0, why = g.serviceWhy(o);
    const sec = h(`<div class="sec"><h4>Wartung</h4><div class="sv-ln">${left ? `Gewartet am ${fmtDate(o.serv)} · noch ${left} Tage seltener Ausfälle` : 'Staub und alte Wärmeleitpaste – Zeit zum Warten'}</div><div class="row"></div></div>`), row = sec.querySelector('.row');
    const b = h(`<button class="btn small" ${why ? 'disabled' : ''} title="${esc(why)}">Warten · ${money(g.serviceCost(o))}</button>`); b.onclick = () => { if (g.service(o.uid)) { ui.audio?.install?.(); ui.toast('Gewartet: 180 Tage seltener Ausfälle.', 'good', 2500); } re(); }; row.append(b);
    const due = g.facObjects(fac).filter((x) => !g.serviceWhy(x)).length; if (due > 1) { const a = h(`<button class="btn small">Alle ${due} hier warten</button>`); a.onclick = () => { const n = g.serviceAll(fac); ui.toast(`${n} Geräte gewartet`, 'good', 2500); re(); }; row.append(a); }
    out.append(sec);
  }
  // Robi: Module
  if (o.type === 'robi') {
    const sec = h(`<div class="sec"><h4>Robi</h4><div class="sv-ln">Fährt zu neuen Rigs und steckt den USB-Stick ein${o.mods?.steck ? ', baut Bausätze ein' : ''}${o.mods?.loet ? ', lötet kaputte Rigs' : ''}.</div></div>`);
    for (const [m, M] of Object.entries(g.roboMods)) { if (o.mods?.[m]) { sec.append(h(`<div class="bios-row"><span>${esc(M.name)}</span><b>eingebaut</b></div>`)); continue; } const why = g.roboModWhy(o, m), lk = !g.knows(M.skill); const b = h(`<button class="btn small" ${why ? 'disabled' : ''} title="${esc(why)}">${esc(M.name)} nachrüsten · ${money(M.price)}</button>`); b.onclick = () => { if (g.roboMod(o.uid, m)) ui.toast(`${M.name} eingebaut.`, 'good', 2500); re(); }; sec.append(b); if (lk) sec.insertAdjacentHTML('beforeend', lockLine(`Erst „${SKILL[M.skill].name}“ lernen`)); }
    out.append(sec);
  }
  return out;
}

// Reparatur: selbst (Mini-Spiel, Material), Routine (1 Klick), reparieren lassen (voller Preis)
export function repairRow(ui, o, row) {
  const g = ui.g, broken = o.broken || (o.items && o.items.some((i) => i.b)); if (!broken) return;
  const rc = g.repairCost(o), re = () => ui.inspect(o.uid);
  if (g.repairSelfOk(o)) {
    const mc = g.repairSelfCost(o), b = h(`<button class="btn good">Selbst reparieren · ${money(mc)}</button>`);
    b.title = g.knows('loeten') ? 'Mini-Spiel Löten (leicht) – nur Material' : 'Mini-Spiel Löten – mit der Fähigkeit „Löten“ wird es leichter und billiger';
    b.onclick = () => repairGame(ui, o); row.append(b);
    if (g.repairRoutineOk(o)) { const r = h(`<button class="btn">Routine · 1 Klick</button>`); r.title = 'Fünf Reparaturen geschafft – jetzt geht das im Schlaf'; r.onclick = () => { if (!g.repairSelf(o.uid, { ok: true, routine: true })) ui.toast('Nicht genug Geld.', 'bad'); else { ui.audio?.install?.(); ui.toast('Routine: repariert.', 'good', 2200); } re(); }; row.append(r); }
  }
  const b = h(`<button class="btn">Reparieren lassen · ${money(rc)}</button>`); b.onclick = () => { if (!g.repair(o.uid)) ui.toast('Nicht genug Geld.', 'bad'); else re(); }; row.append(b);
}
async function repairGame(ui, o) {
  const g = ui.g; if (!g.canAfford(g.repairSelfCost(o))) { ui.toast('Fürs Material reicht das Geld nicht.', 'bad'); return; }
  const easy = g.knows('loeten'), uid = o.uid;
  const r = await playMinigame(ui, { kind: 'loeten', easy, title: easy ? 'Löten (mit Übung)' : 'Löten' });
  if (r.skipped) { ui.toast('Abgebrochen – nichts passiert.', 'info', 2200); }
  else if (!r.ok) ui.toast('Lötstellen nicht sauber – noch mal versuchen oder reparieren lassen.', 'bad', 4000);
  else if (g.repairSelf(uid, r)) { ui.audio?.powerOn?.(); ui.toast(`<b>Repariert!</b>${r.clean ? ' Alle Lötstellen sauber.' : ''} Nur das Material bezahlt.${!easy ? ' Mit der Fähigkeit „Löten“ (T) geht es leichter.' : ''}`, 'good', 4500); }
  if (ui.inspUid === uid) ui.inspect(uid);
}

// Karte „Gelernt …“ (ersetzt „Neue Stufe“), Einblendung „+n Erfahrung“
export function skillCard(ui, id) {
  const k = SKILL[id]; if (!k) return;
  if (ui.modalKind === 'skills') { skRefresh(ui); return; }
  document.getElementById('lvup')?.remove(); ui.audio?.fanfare?.(); ui.lvBusy = true; clearTimeout(ui.lvBT); ui.lvBT = setTimeout(() => { ui.lvBusy = false; }, 3900);
  const el = h(`<div id="lvup" class="sklv"><div class="lv-ic" style="background:${CAT_COLOR[k.cat]}"><svg viewBox="0 0 24 24" width="30" height="30">${ICON.check}</svg></div><div class="lv-t1">Gelernt</div><div class="lv-t2">${esc(k.name)}</div><div class="lv-t3">${esc(k.use ? 'Neu: ' + k.use : k.desc)}</div><div class="lv-t4"><kbd>T</kbd> Fähigkeiten</div></div>`);
  document.body.append(el); setTimeout(() => el.classList.add('out'), 3600); setTimeout(() => el.remove(), 4100);
}
export function pointCard(ui, pot) {
  if (ui.modalKind === 'skills') { skRefresh(ui); return; }
  document.getElementById('lvup')?.remove(); ui.audio?.fanfare?.(); ui.lvBusy = true; clearTimeout(ui.lvBT); ui.lvBT = setTimeout(() => { ui.lvBusy = false; }, 3900);
  const el = h(`<div id="lvup"><div class="lv-ic">★</div><div class="lv-t1">Fähigkeitspunkt frei</div><div class="lv-t2">${esc(POTS[pot].name)}</div><div class="lv-t3">Einlösen im Fähigkeiten-Baum</div><div class="lv-t4"><kbd>T</kbd> Fähigkeiten</div></div>`);
  document.body.append(el); setTimeout(() => el.classList.add('out'), 3400); setTimeout(() => el.remove(), 3900);
}
export const POT_SVG = { w: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>', r: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>', g: '<circle cx="9" cy="9" r="5.5"/><path d="M14.6 8.8a5.5 5.5 0 1 1-5.8 5.8"/>' };
