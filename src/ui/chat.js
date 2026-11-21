// Nachrichten als Chats: eine Zeile pro Person (neueste oben), darin der Verlauf als Sprechblasen (älteste oben).
// Ein Modul für beide Stellen: am PC im Browser-Reiter „Nachrichten“ (market.js) und im Handy (UI.phone, Taste H).
import { MESSAGES } from '../data/world.js';
import { CONTACTS } from '../data/contacts.js';
import { EVENT } from '../data/events.js';
import { fmtDate } from '../sim/game.js';
import './chat.css';

const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SYSTEM = new Set(['Paketdienst']); // keine Person: kein Chat (Lieferungen kommen als kurzer Hinweis)
const FACE = { Deniz: 'deniz', Papa: 'papa', Mama: 'mama', 'Opa Heinz': 'opa' }; // gezeichnete Gesichter (UI.face)
const BACK = '<svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
const ABBR = /(\d|\b(?:z\. ?B|d\. ?h|u\. ?a|bzw|ca|Nr|Dr|St|usw|etc|inkl|evtl|ggf|vgl))\.$/;

// Text → Sprechblasen: höchstens zwei kurze Sätze pro Blase, längere Nachrichten auf mehrere Blasen verteilt
export function bubbles(text) {
  const raw = String(text || '').trim(); if (!raw) return [];
  const parts = raw.split(/(?<=[.!?…][“”"»)]?)\s+(?=[A-ZÄÖÜ„"(])/), sents = [];
  for (const p of parts) { if (sents.length && ABBR.test(sents[sents.length - 1])) sents[sents.length - 1] += ' ' + p; else sents.push(p); }
  const out = []; let cur = '', n = 0;
  for (const t of sents) { if (cur && (n >= 2 || cur.length + t.length > 120)) { out.push(cur); cur = ''; n = 0; } cur = cur ? `${cur} ${t}` : t; n++; }
  if (cur) out.push(cur);
  return out;
}

// Alle Chats: je Person die Nachrichten (älteste zuerst), Ungelesene, letzte Nachricht. Offene Entscheidung: Chat der Person steht oben
export function chatThreads(s) {
  const map = new Map(), at = (who) => { let t = map.get(who); if (!t) map.set(who, (t = { who, msgs: [], unread: 0, day: -1, i: -1, ev: null })); return t; };
  (s.messages || []).forEach((m, i) => {
    if (m.old || !m.from || SYSTEM.has(m.from)) return;
    const t = at(m.from); t.msgs.push(m); if (!m.read && !m.me) t.unread++;
    if (m.day > t.day || (m.day === t.day && i > t.i)) { t.day = m.day; t.i = i; }
  });
  const e = s.ev?.open && EVENT[s.ev.open.id]; if (e?.from) { const t = at(e.from); t.ev = e; if (t.day < 0) { t.day = s.ev.open.day; t.i = 1e9; } }
  for (const t of map.values()) t.msgs.sort((a, b) => a.day - b.day); // stabil: gleiche Tage in der Reihenfolge, in der sie kamen
  return [...map.values()].sort((a, b) => (b.ev ? 1 : 0) - (a.ev ? 1 : 0) || b.day - a.day || b.i - a.i);
}
export const unreadChats = (s) => (s.messages || []).filter((m) => !m.read && !m.me && !m.old && !SYSTEM.has(m.from)).length;

// Ansicht: Liste oder Verlauf. opt: face(key) → SVG, onEvent() (Entscheidung öffnen), onBank() (offene Rechnung), onCall(id), onRead() (Zähler auffrischen)
export class ChatView {
  constructor(game, opt = {}) { this.g = game; this.opt = opt; this.who = null; this.el = h('<div class="chat"></div>'); }
  open(who) { this.who = who; this.render(); }
  back() { if (!this.who) return false; this.who = null; this.render(); return true; }
  avatar(who) {
    const f = FACE[who], c = CONTACTS.find((x) => x.name === who);
    if (f && this.opt.face) return `<span class="ch-av">${this.opt.face(f)}</span>`;
    if (c && this.opt.face && ['kemal', 'jonas'].includes(c.id)) return `<span class="ch-av">${this.opt.face(c.id)}</span>`;
    return `<span class="ch-av ch-ini" style="--c:${c?.color || '#6c7a96'}">${esc((who || '?').slice(0, 1))}</span>`;
  }
  render() {
    const el = this.el, s = this.g.s; el.innerHTML = '';
    const ts = chatThreads(s); if (this.who && !ts.some((t) => t.who === this.who)) this.who = null;
    el.className = `chat ${this.who ? 'chat-thread' : 'chat-list'}`;
    if (this.who) this.thread(ts.find((t) => t.who === this.who)); else this.list(ts);
  }
  list(ts) {
    const g = this.g, s = g.s, el = this.el, ob = s.bills?.open;
    if (ob && this.opt.onBank) { const b = h(`<button class="ch-bill"><b>Rechnung offen</b><span>${esc(this.opt.money?.(g.owed()) || '')} · ${ob.stage >= 3 ? 'Strom abgestellt' : `Frist bis ${fmtDate(ob.due)}`}</span></button>`); b.onclick = () => this.opt.onBank(); el.append(b); }
    if (!ts.length) { el.append(h('<div class="ch-empty">Noch keine Nachrichten.</div>')); return; }
    for (const t of ts) {
      const last = t.msgs[t.msgs.length - 1], prev = t.ev && !t.unread ? `Entscheidung offen: ${g.evText(t.ev, 'title')}` : last ? `${last.me ? 'Du: ' : ''}${last.text}` : '';
      const row = h(`<button class="ch-row ${t.unread ? 'unread' : ''} ${t.ev ? 'ev' : ''}">${this.avatar(t.who)}<span class="ch-mid"><b class="ch-name">${esc(t.who)}</b><span class="ch-prev">${esc(prev)}</span></span><span class="ch-side"><span class="ch-date">${t.day >= 0 ? esc(fmtDate(t.day)) : ''}</span>${t.unread ? `<span class="ch-n">${t.unread}</span>` : t.ev ? '<span class="ch-n ch-warn">!</span>' : ''}</span></button>`);
      row.onclick = () => this.open(t.who); el.append(row);
    }
  }
  thread(t) {
    const g = this.g, s = g.s, el = this.el;
    const head = h(`<div class="ch-head"><button class="ch-back" title="Zurück (Esc)">${BACK}</button>${this.avatar(t.who)}<b>${esc(t.who)}</b></div>`);
    head.querySelector('.ch-back').onclick = () => this.back(); el.append(head);
    const log = h('<div class="ch-log"></div>'); let day = null;
    for (const m of t.msgs) {
      if (m.day !== day) { day = m.day; log.append(h(`<div class="ch-day"><span>${esc(fmtDate(m.day))}</span></div>`)); }
      const tip = !m.me && MESSAGES.find((x) => x.id === m.id)?.tip, bs = bubbles(m.text);
      bs.forEach((b, i) => log.append(h(`<div class="ch-b ${m.me ? 'me' : 'them'} ${m.read || m.me ? '' : 'new'}">${tip && i === 0 ? '<em class="ch-tip">Tipp</em>' : ''}${esc(b)}</div>`)));
    }
    if (!t.msgs.length) log.append(h('<div class="ch-empty">Noch keine Nachrichten.</div>'));
    el.append(log);
    const foot = h('<div class="ch-foot"></div>');
    if (t.ev && s.ev?.open) { const left = Math.max(0, s.ev.open.until - s.day), c = h(`<div class="ch-dec"><div><b>${esc(g.evText(t.ev, 'title'))}</b><span>Entscheidung offen · noch ${left} ${left === 1 ? 'Tag' : 'Tage'}</span></div><button class="ch-go">Antworten</button></div>`); c.querySelector('button').onclick = () => this.opt.onEvent?.(); foot.append(c); }
    const ct = CONTACTS.find((x) => x.name === t.who); if (ct && this.opt.onCall && g.contactMet?.(ct.id) && !g.contactOn?.(ct.id)) { const b = h(`<button class="ch-go">${esc(ct.name)} anrufen</button>`); b.onclick = () => { this.opt.onCall(ct.id); this.render(); }; foot.append(b); }
    if (foot.childElementCount) el.append(foot);
    let fresh = false; for (const m of t.msgs) if (!m.read) { m.read = true; fresh = true; }
    if (fresh) this.opt.onRead?.();
    const down = () => { log.scrollTop = log.scrollHeight; }; down(); requestAnimationFrame(down); // neueste unten im Blick
  }
}
