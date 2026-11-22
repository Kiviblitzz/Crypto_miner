// Spielstände in der Oberfläche: Titelbild (Weiterspielen = jüngster heiler Stand, „Laden“, „Neues Spiel“ fragt nach dem Platz),
// Pause (Speichern, Laden), Liste mit Rückfragen, Speicher-Symbol, Autosave-Anlässe (alle 3 Minuten, morgens nach dem Schlafen, Standortwechsel).
// Esc schließt zuerst die Rückfrage, dann die Liste – erst danach greift main.js (Pause). Speicherlogik: src/sim/saves.js
import './saves.css';
import { fmtDate, fmtUSD } from '../sim/game.js';
import { FACILITY } from '../data/world.js';
import { SLOTS } from '../sim/saves.js';

const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const AUTO_MS = 180000; // Autosave alle 3 Minuten Echtzeit (geschrieben wird nur, wenn sich etwas geändert hat)
const BOOT_KEY = 'hw-boot'; // sessionStorage: nach dem Neuladen gleich diesen Stand laden ('*' = jüngster heiler ohne Notfall-Sicherung)
const WHY = { json: 'unlesbar', summe: 'Prüfsumme falsch', felder: 'unvollständig', format: 'fremde Datei', version: 'aus neuerer Version', laden: 'lässt sich nicht laden', leer: 'leer' };
const svg = (p, s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  load: '<path d="M3.5 7.5a2 2 0 0 1 2-2h3.8l2 2h7.2a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" fill="currentColor" stroke="none"/>',
  save: '<path d="M5 4.5h11.5l3 3V18a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 5 4.5z"/><path d="M8.5 4.5v4.5h6V4.5"/><circle cx="12" cy="14.5" r="2"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
};
const when = (t) => (t ? new Date(t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr' : '');

export class SavesUI {
  // o: game, world, ui, store, splash, enter(msg) (ins Spiel nach dem Laden), inGame(), crash
  constructor(o) {
    Object.assign(this, o); this.stack = []; this.failAt = 0;
    const st = this.store;
    st.onSaved = (why, ok) => { if (ok && this.inGame() && why !== 'exit') this.flash(); };
    st.onFail = () => { if (!this.inGame() || performance.now() - this.failAt < 300000) return; this.failAt = performance.now(); this.ui.toast('Speichern ging gerade nicht.', 'bad', 5000); };
    // Esc und alle anderen Tasten gehören dem offenen Fenster (vor main.js und der Welt registriert)
    window.addEventListener('keydown', (e) => {
      if (!this.stack.length || this.crash?.open) return;
      e.stopImmediatePropagation();
      if (e.key === 'Escape') { e.preventDefault(); this.closeTop(); }
    }, true);
    setInterval(() => { if (this.inGame() && !this.crash?.stop) this.game.save('zeit'); }, AUTO_MS);
    this.watch = { s: null, site: null, sleep: false };
  }
  get open() { return this.stack.length > 0; }

  // ---------- Titelbild ----------
  initTitle() {
    const cont = document.getElementById('btn-continue');
    if (!document.getElementById('btn-load')) { // „Laden“ zwischen Weiterspielen und Neues Spiel
      const b = h(`<button id="btn-load" class="btn big hidden"><span class="bi">${svg(IC.load)}</span><span class="bt">Laden</span></button>`);
      b.onclick = () => this.list('load'); cont.after(b);
    }
    const name = this.bootTarget();
    if (name) { // Neuladen mit Ladeauftrag (Pause → Laden, Fehlerfenster → Letzten Stand laden)
      const r = name === '*' ? this.store.loadLatest(this.game, { rescue: false }) : this.store.loadInto(this.game, name);
      if (r.ok) { this.world.syncObjects(); this.world.syncLoose(); this.world.syncParcels?.(); this.enter(name === '*' ? 'Letzter Stand geladen.' : `Geladen: ${this.label(r.name)}.`); this.bound(); return; }
    }
    const r = this.store.loadLatest(this.game); // Hintergrund im Titel: das eigene Zimmer aus dem jüngsten Stand
    if (r.ok) { this.world.syncObjects(); this.world.syncLoose(); this.world.syncParcels?.(); }
    this.refreshTitle();
    if (name) this.list('load', 'Der Stand ließ sich nicht laden.');
  }
  refreshTitle() {
    const cont = document.getElementById('btn-continue'), load = document.getElementById('btn-load'), nw = document.getElementById('btn-new');
    const e = this.store.latest(), any = this.store.hasAny();
    cont.classList.toggle('hidden', !e); cont.classList.toggle('primary', !!e); nw.classList.toggle('primary', !e); load?.classList.toggle('hidden', !any);
    if (e) cont.innerHTML = `<span class="bi"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></span><span class="bt">Weiterspielen<small>${fmtDate(e.day)} · ${fmtUSD(e.cash ?? 0)}</small></span>`;
  }
  // Titelbild „Weiterspielen“: jüngster heiler Stand, kaputte werden übersprungen
  continue() {
    const r = this.store.loadLatest(this.game);
    if (!r.ok) { this.refreshTitle(); this.list('load', 'Kein Stand ließ sich laden.'); return; }
    this.enter(r.skipped.length ? `Neuester Stand war beschädigt – geladen: ${this.label(r.name)}.` : null); this.bound();
  }
  // Neues Spiel: mit vorhandenen Ständen erst den Platz wählen (belegt: Rückfrage), sonst Platz 1
  newGame(cb) {
    if (!this.store.hasAny()) { cb(this.store.freeSlot() || SLOTS[0]); return; }
    this.list('new', null, cb);
  }
  // Ungebundener Stand (sein Platz hat jetzt ein anderes Spiel) und kein Platz frei: Hinweis
  bound() { if (!this.store.cur && !this.store.freeSlot()) setTimeout(() => this.ui.toast('Dieser Stand hat keinen Platz. Sichern: Esc → Speichern.', 'info', 7000), 1500); }

  // ---------- Pause ----------
  initPause() {
    if (document.getElementById('pause-save')) return;
    const row = h(`<div class="pause-sv"><button id="pause-save" class="btn"><span class="bi">${svg(IC.save, 18)}</span><span class="bt">Speichern</span></button><button id="pause-load" class="btn"><span class="bi">${svg(IC.load, 18)}</span><span class="bt">Laden</span></button></div>`);
    row.querySelector('#pause-save').onclick = () => this.list('save');
    row.querySelector('#pause-load').onclick = () => this.list('load');
    document.getElementById('pause-resume')?.after(row);
  }

  // ---------- Autosave-Anlässe (jedes Bild aus main.js) ----------
  tick() {
    const s = this.game.s, w = this.watch;
    if (w.s !== s) { w.s = s; w.site = s.current; w.sleep = !!this.ui.sleeping; return; } // neuer/geladener Stand: nur merken
    if (s.current !== w.site) { w.site = s.current; this.game.save('standort'); }
    const sl = !!this.ui.sleeping; if (w.sleep && !sl) this.game.save('morgen'); w.sleep = sl; // Schlafszene vorbei: Morgen
  }
  // kleines Speicher-Symbol in der Ecke
  flash() {
    let el = document.getElementById('svicon');
    if (!el) { el = h(`<div id="svicon" aria-hidden="true">${svg(IC.save, 18)}</div>`); document.body.append(el); }
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(this.iconT); this.iconT = setTimeout(() => el.classList.remove('on'), 1400);
  }

  // ---------- Laden im Spiel: über Neuladen (frischer Zustand von Welt und Oberfläche) ----------
  bootTarget() { try { const n = sessionStorage.getItem(BOOT_KEY); if (n) sessionStorage.removeItem(BOOT_KEY); return n; } catch (e) { return null; } }
  reloadInto(name) {
    const st = this.store, e = st.entry(name);
    if (name !== '*' && !e.ok) return false;
    if (name !== '*' && e.gid !== st.gid && !this.crash?.open) st.save(this.game, 'wechsel', { exclude: name }); // anderes Spiel: das laufende vorher sichern (ohne das Ziel zu überschreiben)
    try { sessionStorage.setItem(BOOT_KEY, name); } catch (err) { return false; }
    st.blocked = true; // kein Autosave mehr beim Verlassen der Seite
    location.reload(); return true;
  }
  load(name) {
    if (this.inGame()) { if (!this.reloadInto(name)) this.render('Lässt sich nicht laden.'); return; }
    const r = this.store.loadInto(this.game, name);
    if (!r.ok) { this.render('Lässt sich nicht laden – als beschädigt markiert.'); this.refreshTitle(); return; }
    this.closeAll(); this.world.syncObjects(); this.world.syncLoose(); this.world.syncParcels?.(); this.enter(`Geladen: ${this.label(name)}.`); this.bound();
  }

  // ---------- Liste ----------
  label(n) { const m = /^slot(\d)(_bak)?$/.exec(n); if (m) return m[2] ? `Sicherung von Platz ${m[1]}` : `Platz ${m[1]}`; return n === 'rescue' ? 'Notfall-Sicherung' : /^auto/.test(n) ? 'Autosave' : n; }
  info(e) { const site = FACILITY[e.site]?.short; return [Number.isFinite(e.day) ? fmtDate(e.day) : null, Number.isFinite(e.cash) ? fmtUSD(e.cash) : null, site].filter(Boolean).join(' · '); }
  // mode: load | save | new; cb (new): Platz gewählt
  list(mode, msg = null, cb = null) {
    this.mode = mode; this.cb = cb;
    if (!this.win) {
      this.win = h(`<div id="svwin" class="sv-back" role="dialog" aria-modal="true"><div class="sv-card"><div class="sv-h"><h3></h3><button class="sv-x" title="Schließen (Esc)" aria-label="Schließen">${svg(IC.x, 18)}</button></div><div class="sv-body"></div></div></div>`);
      this.win.querySelector('.sv-x').onclick = () => this.closeTop();
      this.win.addEventListener('pointerdown', (ev) => { if (ev.target === this.win) this.closeTop(); });
    }
    if (!this.stack.includes(this.win)) { document.body.append(this.win); this.stack.push(this.win); }
    this.render(msg);
  }
  render(msg = null) {
    const st = this.store, mode = this.mode, inGame = this.inGame(), w = this.win; if (!w) return;
    w.querySelector('h3').textContent = { load: 'Laden', save: 'Speichern', new: 'Neues Spiel – welcher Platz?' }[mode];
    w.setAttribute('aria-label', w.querySelector('h3').textContent);
    const L = st.list(), body = w.querySelector('.sv-body'); body.innerHTML = '';
    const sec = (t) => body.append(h(`<div class="sv-sec">${esc(t)}</div>`));
    if (mode === 'load') sec('Spielstände');
    for (const e of L.slots) body.append(this.row(e, mode, inGame));
    if (mode === 'load' && L.autos.length) { sec('Autosaves'); for (const e of L.autos) body.append(this.row(e, mode, inGame)); }
    if (mode === 'load' && L.rescue) { sec('Nach einem Fehler'); body.append(this.row(L.rescue, mode, inGame)); }
    if (mode === 'save') body.append(h('<div class="sv-foot">Autosave: alle 3 Minuten, morgens und beim Standortwechsel.</div>'));
    if (msg) body.prepend(h(`<div class="sv-msg">${esc(msg)}</div>`));
  }
  row(e, mode, inGame) {
    const st = this.store, cur = e.name === st.cur && inGame, name = this.label(e.name);
    const r = h(`<div class="sv-row" data-name="${e.name}"><div class="sv-main"><div class="sv-t"><b>${esc(name)}</b></div><div class="sv-i"></div><div class="sv-d"></div></div><div class="sv-act"></div></div>`);
    const t = r.querySelector('.sv-t'), i = r.querySelector('.sv-i'), d = r.querySelector('.sv-d'), act = r.querySelector('.sv-act');
    const tag = (txt, cls = '') => t.append(h(`<span class="sv-tag ${cls}">${esc(txt)}</span>`));
    if (cur) { r.classList.add('cur'); tag('dieses Spiel'); }
    if (!e.exists) { r.classList.add('sv-free'); i.textContent = 'Frei'; }
    else {
      i.textContent = this.info(e) || '–'; d.textContent = when(e.savedAt);
      if (e.label && e.kind !== 'rescue') tag(e.label, 'dim');
      if (!e.ok) { r.classList.add('bad'); tag(`Beschädigt – ${WHY[e.why] || e.why}`, 'bad'); }
    }
    const btn = (txt, cls, fn, icon) => { const b = h(`<button class="btn small ${cls}">${icon ? svg(icon, 15) : ''}<span>${esc(txt)}</span></button>`); b.onclick = (ev) => { ev.stopPropagation(); fn(); }; act.append(b); return b; };
    if (mode === 'load') {
      if (e.exists && e.ok) { r.classList.add('pick'); r.onclick = () => this.load(e.name); }
      if (e.exists && !e.ok) { const bk = st.backupFor(e.name); if (bk) btn(bk.kind === 'bak' ? 'Sicherung laden' : 'Autosave laden', 'good', () => this.load(bk.name)).title = `${this.label(bk.name)} · ${this.info(bk)} · ${when(bk.savedAt)}`; }
      if (e.exists && !cur) btn('Löschen', 'del', () => this.ask(`${name} löschen?`, e.exists && e.ok ? `${this.info(e)}\n${when(e.savedAt)}` : 'Beschädigter Stand', 'Löschen', () => { st.remove(e.name); this.render(); if (!this.inGame()) this.refreshTitle(); }), IC.trash).setAttribute('aria-label', `${name} löschen`);
    } else {
      r.classList.add('pick');
      r.onclick = () => (mode === 'save' ? this.saveTo(e) : this.pickNew(e));
    }
    return r;
  }
  saveTo(e) {
    const st = this.store, own = e.name === st.cur;
    const go = (overwrite) => { const r = st.saveTo(this.game, e.name, { overwrite }); if (!r.ok) { this.render(r.why === 'gesperrt' ? 'Speichern ist nach dem Fehler gesperrt.' : 'Speichern ging nicht.'); return; } this.closeAll(); this.ui.toast(`Gespeichert: ${this.label(e.name)}.`, 'good', 2400); };
    if (!e.exists || own) { go(false); return; }
    this.ask(`${this.label(e.name)} überschreiben?`, e.ok ? `${this.info(e)}\n${when(e.savedAt)}` : 'Beschädigter Stand', 'Überschreiben', () => go(true));
  }
  pickNew(e) {
    const cb = this.cb, go = () => { this.closeAll(); cb?.(e.name); };
    if (!e.exists) { go(); return; }
    this.ask(`${this.label(e.name)} überschreiben?`, e.ok ? `${this.info(e)}\n${when(e.savedAt)}` : 'Beschädigter Stand', 'Überschreiben', go);
  }
  // Rückfrage über der Liste
  ask(title, sub, yes, onYes) {
    const a = h(`<div class="sv-back sv-ask" role="alertdialog" aria-modal="true" aria-label="${esc(title)}"><div class="sv-card"><h3>${esc(title)}</h3><p>${esc(sub || '')}</p><div class="sv-btns"><button class="btn danger sv-yes">${esc(yes)}</button><button class="btn sv-no">Abbrechen</button></div></div></div>`);
    a.querySelector('.sv-yes').onclick = () => { this.pop(a); onYes(); };
    a.querySelector('.sv-no').onclick = () => this.pop(a);
    a.addEventListener('pointerdown', (ev) => { if (ev.target === a) this.pop(a); });
    document.body.append(a); this.stack.push(a); a.querySelector('.sv-no').focus();
  }
  pop(el) { const i = this.stack.indexOf(el); if (i >= 0) this.stack.splice(i, 1); el.remove(); }
  closeTop() { const el = this.stack[this.stack.length - 1]; if (el) this.pop(el); }
  closeAll() { while (this.stack.length) this.closeTop(); }
}
