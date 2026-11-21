// Browser „Shop | Börse“ – als Fenster (B/M) und auf dem PC-Monitor in der Wohnung (E: die Kamera fährt heran, World.focusMonitor).
// Börse: eine schlichte Seite – großer Kurs, Bestand, echter Kurs-Chart, Verkaufen/Kaufen mit 25 % / 50 % / Alles.
import { COINS, COIN } from '../data/coins.js';
import { START_DAY } from '../data/world.js';
import { toDay } from '../data/history.js';
import { fmtUSD, fmtCoin, fmtDate } from '../sim/game.js';
import './market.css';

const DATA0 = toDay('2010-07-17'); // erste echte Bitcoin-Tageskurse
const MONTH = 30, YEAR = 365, ALL = 99999;
const LINE = '#f0b54a'; // Chart: ruhiges Gold, keine grelle Linie
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MON = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
const dDate = (d) => new Date(d * 86400000);
const axisDate = (d, long) => { const t = dDate(d); return long ? `${MON[t.getUTCMonth()]} ${t.getUTCFullYear()}` : `${t.getUTCDate()}. ${MON[t.getUTCMonth()]}`; };
const pct = (x) => `${x >= 0 ? '▲' : '▼'} ${Math.abs(x).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
const SYM = { BTC: '₿' };
const ICON = {
  sell: '<svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v13M6.5 11.5 12 17l5.5-5.5"/><path d="M5 20.5h14"/></svg>',
  buy: '<svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V7M6.5 12.5 12 7l5.5 5.5"/><path d="M5 3.5h14"/></svg>',
  limit: '<svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 17.5 9 12l4 3.5 7.5-8"/><path d="M3.5 6.5h17" stroke-dasharray="2.2 2.6"/></svg>',
  shop: '<svg viewBox="0 0 24 24" width="1.15em" height="1.15em" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2.4l2.3 10.6a1.6 1.6 0 0 0 1.6 1.3h7.6a1.6 1.6 0 0 0 1.6-1.2L20.4 8H6.4"/><circle cx="10" cy="19.6" r="1.4" fill="currentColor"/><circle cx="17" cy="19.6" r="1.4" fill="currentColor"/></svg>',
  chart: '<svg viewBox="0 0 24 24" width="1.15em" height="1.15em" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 19.5h17"/><path d="M5 15.5 9.5 10l3.5 3 6-7.5"/><path d="M15.5 5.5H19v3.5"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  wait: '<svg viewBox="0 0 24 24" width="1.4em" height="1.4em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
};

// Geldbeträge auf der Börse: keine Mikro-Cent-Zahlen („≈ 0,0000506 $“)
export function money(v) {
  if (!(v > 0)) return '0 $';
  if (v < 100) return `${v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
  return fmtUSD(v);
}
export const approx = (v) => (v > 0 && v < 0.005 ? 'weniger als 1 Cent' : `≈ ${money(v)}`);
// Was schürfen alle laufenden Geräte von diesem Coin am Tag (in Coins)? devices: wie viele Geräte daran rechnen
export function coinRate(g, id) {
  const s = g.s, p = g.price(id) || 1; let perDay = 0, devices = 0;
  for (const fid of s.unlocked || []) {
    const sm = g.summary?.[fid]; if (!sm || sm.tripped) continue;
    for (const a of sm.per.values()) { let hit = false; for (const u of a.units || []) if (u.coin === id && u.rev > 0) { perDay += (u.rev * sm.throttle) / p; hit = true; } if (hit) devices++; }
  }
  return { perDay, devices };
}

// Browser mit Reitern „Shop | Börse“: als Fenster (B → Shop, M → Börse) oder auf dem PC-Monitor in der Wohnung (E).
// Der Shop-Reiter hängt den vorhandenen Katalog (#build, UI.build) ein – nichts doppelt, nur woanders und anders gestaltet.
export class Market {
  constructor(ui) {
    this.ui = ui; this.g = ui.g; this.w = ui.w;
    this.where = null; // 'win' (Fenster) | 'pc' (auf dem Monitor in der Wohnung)
    this.tab = 'market'; this.pcTab = null;
    this.el = null; this.pg = null; // Browser bzw. Börsen-Seite darin
    this.k = { sell: 1, buy: 0.25, limit: 1 }; this.up = 0.1; this.hov = null;
    window.addEventListener('resize', () => { if (this.where === 'pc') this.relayout(); else if (this.where === 'win') this.place(); });
    this.w.liveBtc = () => this.hold('BTC').total; // Mini-Ansicht auf dem Monitor zeigt denselben Bestand wie HUD und Börse
  }
  get atMonitor() { return this.where === 'pc'; }
  get open() { return !!this.where && this.tab === 'market'; } // Börsen-Reiter ist zu sehen
  // Reiter nur mit Freischaltung (sonst ausgeblendet); der Shop am Monitor nur am PC in der Wohnung (UI.monitorUse)
  tabs() { const g = this.g; return [['shop', g.has('build') && (this.where !== 'pc' || this.ui.monitorUse(this.prop) !== 'market')], ['market', g.has('market')]].filter(([, ok]) => ok).map(([t]) => t); }

  // ---------- Öffnen, Reiter, Schließen ----------
  // UI.market(update): M, Dock, Fähigkeiten-Baum; update = true: nur auffrischen, falls die Börse zu sehen ist
  show(update = false) { if (update) { if (this.open) this.render(); return; } this.openTab('market'); }
  // B (UI.toggleBuild) bzw. M: Fenster mit diesem Reiter – ist es schon offen, schaltet es um bzw. geht zu
  openTab(tab) {
    if (this.where) { if (this.where === 'win' && this.tab === tab) this.ui.resume(); else this.setTab(tab); return; }
    if (this.w.fc?.page && this.w.focusK > 0) return; // die Kamera fährt gerade vom Monitor zurück: nichts doppelt öffnen
    this.openWindow(tab);
  }
  // Tasten B/M bei offenem Browser (main.js): am PC nur den Reiter umschalten, im Fenster wie ein Schalter
  key(k) {
    if (!this.where) return false;
    const tab = k === 'b' ? 'shop' : 'market'; if (!this.tabs().includes(tab)) return false;
    if (this.where === 'win' && this.tab === tab) this.ui.resume(); else this.setTab(tab);
    return true;
  }
  openWindow(tab) {
    const ui = this.ui, m = document.getElementById('modal');
    // nie zwei Fenster übereinander: Shop, Inspektor und andere Fenster gehen vorher zu
    if (document.body.classList.contains('show-build') || ui.inspUid || this.w.focus || (m && !m.classList.contains('hidden'))) ui.resume();
    this.where = 'win'; this.browser('win');
    const win = this.winEl(); win.querySelector('.mkw-card').replaceChildren(this.el); win.classList.remove('hidden');
    document.body.classList.add('mk-win'); this.place();
    ui.openUI(); this.loop(); this.setTab(this.tabs().includes(tab) ? tab : this.tabs()[0]);
  }
  // E am Monitor (UI.useProp, mon: 'both' | 'shop' | 'market'): am PC in der Wohnung fährt die Kamera an den Bildschirm, sonst das Fenster
  atPc(prop, mon) {
    if (this.where === 'pc') return;
    this.prop = prop; // Shop-Reiter nur am PC-Monitor in der Wohnung (UI.monitorUse), auch wenn er erst während des Besuchs freigeschaltet wird
    const P = this.canZoom() ? this.w.focusMonitor?.({ page: true, top: this.topEdge() }) : null;
    if (!P) { this.openTab(mon === 'shop' ? 'shop' : 'market'); return; }
    this.ui.openUI();
    this.where = 'pc'; this.openedAt = performance.now();
    this.browser('pc'); this.size(P);
    this.w.monitorPage?.(this.el, () => this.tick());
    document.body.classList.add('at-monitor'); this.ui.prompt?.(null);
    this.loop();
    const s = this.g.s, les = this.g.lesson?.(); // erster Reiter: was gerade dran ist (Anlernen), sonst der zuletzt benutzte
    this.setTab(les === 'market' ? 'market' : les === 'build' || (s.flags.cpuStart && !s.flags.gpuOrdered && !s.flags.boughtGpu) ? 'shop' : this.pcTab || 'market');
  }
  browser(where) {
    this.el = h(`<div class="mkb mkb-${where}"><div class="mkb-bar"><div class="mkb-tabs"></div><button class="mkb-x" title="Zurück (Esc)">${ICON.back}</button></div><div class="mkb-body"><div class="mkb-pane mkb-shop"></div><div class="mkb-pane mkb-mk"></div></div></div>`);
    this.el.querySelector('.mkb-x').onclick = () => this.ui.resume();
    this.pg = this.page(where); this.el.querySelector('.mkb-mk').append(this.pg);
    this.hov = null; if (this.ui.trade) this.ui.trade.open = false;
    { const mc = COIN[this.ui.marketCoin]; if (!mc || !this.coins().includes(mc)) this.ui.marketCoin = 'BTC'; }
  }
  setTab(tab) {
    const tabs = this.tabs(); if (!tabs.includes(tab)) tab = tabs[0]; if (!tab || !this.el) return;
    const ui = this.ui, g = this.g, was = this.el.dataset.tab;
    this.tab = tab; if (this.where === 'pc') this.pcTab = tab; this.el.dataset.tab = tab;
    this.renderTabs();
    if (tab === 'shop') {
      this.closePicker(true); this.hostShop();
      if (was !== 'shop') { const s = g.s; if (s.flags.cpuStart && !s.goals.gpuorder) { ui.cat = 'parts'; ui.partTab = 'gpu'; } } // erste Grafikkarte: gleich bei den Grafikkarten
      document.body.classList.add('show-build'); ui.build(true); g.learned?.('build');
    } else { document.body.classList.remove('show-build'); g.learned?.('market'); this.render(); requestAnimationFrame(() => this.chart()); }
    ui.dock?.(); this.renderTabs(); // benutzt → evtl. kommt gerade der nächste Reiter dazu (Anlernen: erst Börse, dann Shop)
  }
  renderTabs() {
    const bar = this.el?.querySelector('.mkb-tabs'); if (!bar) return; const tabs = this.tabs(); this.tabKey = tabs.join() + this.tab; bar.innerHTML = '';
    for (const t of tabs) { const b = h(`<button class="mkb-tab ${t === this.tab ? 'on' : ''}">${t === 'shop' ? ICON.shop : ICON.chart}<span>${t === 'shop' ? 'Shop' : 'Börse'}</span><kbd>${t === 'shop' ? 'B' : 'M'}</kbd></button>`); b.onclick = () => this.setTab(t); bar.append(b); }
  }
  // Der Katalog (#build) wandert in den Shop-Reiter und beim Schließen zurück an seinen Platz im HUD
  hostShop() { const b = document.getElementById('build'), pane = this.el?.querySelector('.mkb-shop'); if (!b || !pane || b.parentNode === pane) return; if (!this.home) this.home = { p: b.parentNode, n: b.nextSibling }; pane.append(b); }
  homeShop() { const b = document.getElementById('build'); if (b && this.home && b.parentNode !== this.home.p) this.home.p.insertBefore(b, this.home.n); }
  winEl() {
    if (!this.win) { this.win = h('<div id="mkwin" class="hidden"><div class="mkw-card"></div></div>'); this.win.addEventListener('pointerdown', (e) => { if (e.target === this.win) this.ui.resume(); }); document.body.append(this.win); }
    return this.win;
  }
  place() { this.win?.style.setProperty('--mk-top', `${Math.round(Math.max(56, Math.min(this.topEdge() + 12, innerHeight * 0.3)))}px`); } // Fenster unter Kontostand und Datum
  canZoom() { return !!this.w.focusMonitor && innerWidth >= 700 && innerHeight >= 420; }
  // Unterkante der HUD-Anzeigen oben (Kontostand links, Datum rechts): die Seite beginnt darunter, damit nichts überlappt
  topEdge() { let b = 0; for (const e of document.querySelectorAll('#top, #top > *, #top .stat, #rbox > *')) { const r = e.getBoundingClientRect(); if (r.width && r.height && r.top < innerHeight * 0.25 && r.bottom > b && getComputedStyle(e).visibility !== 'hidden') b = r.bottom; } return Math.min(b, innerHeight * 0.2); }
  // Browser genau so groß wie der Bildschirm nach der Kamerafahrt (dann ist er gestochen scharf, Maßstab 1)
  size(P) { const el = this.el; el.style.width = `${P.W}px`; el.style.height = `${P.H}px`; el.style.fontSize = `${Math.max(11, Math.min(24, P.H / 41)).toFixed(2)}px`; }
  relayout() { const P = this.w.focusMonitor?.({ page: true, top: this.topEdge(), keep: true }); if (P && this.el) { this.size(P); this.chart(); } }
  loop() { if (this.looping) return; this.looping = true; const f = () => { if (!this.where) { this.looping = false; return; } this.tick(); requestAnimationFrame(f); }; requestAnimationFrame(f); }
  // jeden Frame, solange der Browser offen ist: zu, sobald etwas anderes aufgeht (nur der PC-Konfigurator darf darüber)
  tick() {
    if (!this.where) return;
    const ui = this.ui, w = this.w, m = document.getElementById('modal'), modal = m && !m.classList.contains('hidden'), cfg = modal && ui.modalKind === 'config';
    if (w.mode !== 'ui' || (modal && !cfg) || ui.inspUid || ui.paused || (this.where === 'pc' && !w.focus?.page)) { this.left(); return; }
    if (cfg && !ui.onModalClose) ui.onModalClose = () => this.backToShop(); // Konfigurator zu: zurück in den Shop-Reiter (UI.closeModal ruft das vor dem Moduswechsel)
    if (this.tabs().join() + this.tab !== this.tabKey) this.renderTabs(); // neu freigeschaltet: Reiter erscheint
  }
  backToShop() { if (this.where && this.tab === 'shop') { this.hostShop(); document.body.classList.add('show-build'); this.ui.build(true); } }
  left() {
    const was = this.where; this.where = null; this.closePicker(true);
    document.body.classList.remove('at-monitor', 'mk-win', 'show-build'); this.homeShop();
    if (was === 'win') this.win?.classList.add('hidden');
    if (this.w.focus?.page) this.w.focusObject?.(null); // Kamera fährt zurück
    this.ui.dock?.();
  }
  // Esc (main.js): erst der Konfigurator bzw. die Betragsauswahl (true = erledigt), dann wie gewohnt der Browser, dann die Pause
  esc() {
    if (!this.where) return false;
    const m = document.getElementById('modal');
    if (m && !m.classList.contains('hidden') && this.ui.modalKind === 'config') { this.ui.closeModal(); return true; }
    if (this.tab === 'market' && this.ui.trade?.open) { this.closePicker(); return true; }
    return false;
  }
  // ---------- Daten ----------
  coins() {
    const g = this.g, s = g.s; if (!g.has('coins')) return [COIN.BTC];
    const has = (c) => { const w = s.wallet[c.id]; return (w ? w.ex + w.cold : 0) > 0 || (s.stats.coins?.[c.id] || 0) > 0 || coinRate(g, c.id).perDay > 0; };
    return COINS.filter((c) => c.id === 'BTC' || (s.day >= c.start && (g.has('buycoins') || has(c))));
  }
  coin() { return COIN[this.ui.marketCoin] || COIN.BTC; }
  fee(limit = false) { return this.g.tradeFee(limit); } // Sofortverkauf 1,5 %, Limit-Order 0,5 % (sim/skills.js)
  // Bestand: Börse + Cold-Wallet + heute schon Geschürftes (wie im HUD)
  hold(id) {
    const s = this.g.s, w = s.wallet[id] || { ex: 0, cold: 0 }, pend = id === 'BTC' ? this.ui.pendingBtc?.() || 0 : 0, cold = !!s.payoutCold;
    return { ex: w.ex + (cold ? 0 : pend), cold: w.cold + (cold ? pend : 0), pend, total: w.ex + w.cold + pend };
  }

  // ---------- Seite ----------
  page(where) {
    const el = h(`<div class="mkp mkp-in mkp-${where}">
      <div class="mkp-bar"><div class="mkp-coins"></div></div>
      <div class="mkp-top"><div class="mkp-head"><div class="mkp-px"></div><div class="mkp-ch"></div></div><div class="mkp-facts"></div></div>
      <div class="mkp-chart"><div class="mkp-rng"></div><canvas></canvas><div class="mkp-tip hidden"></div></div>
      <div class="mkp-act"></div>
      <div class="mkp-more"></div>
    </div>`);
    const cv = el.querySelector('canvas');
    const hover = (e) => { const r = cv.getBoundingClientRect(), L = this.layout; if (!L || !r.width) return; const x = (e.clientX - r.left) * (L.W / r.width); this.hov = Math.max(0, Math.min(L.n, Math.round((x - L.padL) / (L.W - L.padL - L.padR) * L.n))); this.chart(); };
    cv.addEventListener('pointermove', hover); cv.addEventListener('pointerdown', hover);
    cv.addEventListener('pointerleave', () => { this.hov = null; this.chart(); });
    cv.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') { clearTimeout(this.tipT); this.tipT = setTimeout(() => { this.hov = null; this.chart(); }, 2600); } }); // Touch: Datum und Kurs kurz stehen lassen
    if (window.ResizeObserver) new ResizeObserver(() => this.chart()).observe(cv);
    return el;
  }
  render() {
    const el = this.pg; if (!el) return;
    const g = this.g, s = g.s, ui = this.ui, c = this.coin(), p = g.price(c.id), p7 = g.price(c.id, s.day - 7);
    // Coins: nur, wenn es mehr als Bitcoin gibt – dann als Reiter-Pillen
    const list = this.coins(), cbox = el.querySelector('.mkp-coins'); cbox.innerHTML = '';
    if (list.length > 1) for (const k of list) { const b = h(`<button class="mkp-pill ${k.id === c.id ? 'on' : ''}"><i style="--c:${k.color}">${SYM[k.id] || k.id.slice(0, 1)}</i>${esc(k.id)}</button>`); b.onclick = () => { ui.marketCoin = k.id; if (ui.trade) ui.trade.open = false; this.hov = null; this.render(); this.chart(); }; cbox.append(b); }
    else cbox.append(h(`<div class="mkp-name"><i style="--c:${c.color}">${SYM[c.id] || c.id.slice(0, 1)}</i>${esc(c.name)}</div>`));
    // Kurs
    el.querySelector('.mkp-px').textContent = fmtUSD(p);
    const ch = p7 > 0 ? (p / p7 - 1) * 100 : null, che = el.querySelector('.mkp-ch');
    che.className = `mkp-ch ${ch == null ? '' : ch >= 0 ? 'up' : 'down'}`; che.innerHTML = ch == null ? '' : `${pct(ch)}<span>in 7 Tagen</span>`;
    // Bestand und Ertrag (immer als Coins gekennzeichnet)
    const hd = this.hold(c.id), r = coinRate(g, c.id), who = r.devices > 1 ? 'Deine Rechner schürfen' : 'Dein PC schürft';
    const coldTxt = hd.cold > 0 && g.has('cold') ? ` · ${fmtCoin(hd.cold)} in der Cold-Wallet` : '';
    el.querySelector('.mkp-facts').innerHTML = `<div class="mkp-fact"><span>Du hast</span><b>${fmtCoin(hd.total)} ${c.id}</b><small>${approx(hd.total * p)}${coldTxt}</small></div>`
      + `<div class="mkp-fact"><span>${who}</span><b>${r.perDay > 0 ? `≈ ${fmtCoin(r.perDay)} ${c.id}/Tag` : 'gerade nichts'}</b><small>${r.perDay > 0 ? `(${approx(r.perDay * p)})` : c.id === 'BTC' ? 'Läuft er? Schau mal nach.' : `Kein Gerät rechnet an ${esc(c.id)}`}</small></div>`;
    this.renderAct(); this.renderMore();
    // Zeiträume: 30 Tage, Alles – ab einem Jahr Spielzeit auch 1 Jahr
    const rng = el.querySelector('.mkp-rng'), opts = [[MONTH, '30 Tage'], ...(s.day - START_DAY > YEAR ? [[YEAR, '1 Jahr']] : []), [ALL, 'Alles']];
    if (!opts.some(([d]) => d === ui.range)) ui.range = MONTH;
    rng.innerHTML = ''; for (const [d, l] of opts) { const b = h(`<button class="${ui.range === d ? 'on' : ''}">${l}</button>`); b.onclick = () => { ui.range = d; this.hov = null; this.render(); this.chart(); }; rng.append(b); }
    this.chart();
  }
  // Knöpfe, Betragsauswahl oder Hinweis – alles im selben Kasten (gleiche Höhe, nichts springt)
  renderAct() {
    const el = this.pg; if (!el) return;
    const g = this.g, s = g.s, ui = this.ui, c = this.coin(), p = g.price(c.id), box = el.querySelector('.mkp-act');
    const hd = this.hold(c.id), sellV = hd.ex * p * (1 - this.fee()), canSell = sellV >= 0.01, canBuy = g.has('buycoins') && s.cash >= 0.01 && p > 0, canLim = canSell && this.limitOk();
    const ok = { sell: canSell, buy: canBuy, limit: canLim }, T = ui.trade && ui.trade.open && ok[ui.trade.mode] ? ui.trade : null;
    box.innerHTML = ''; box.className = 'mkp-act';
    if (T) { // Betragsauswahl: 25 % · 50 % · Alles (bei Limit-Orders dazu der Kurs), Vorschau nach Gebühr, Bestätigen
      const mode = T.mode, k = this.k[mode], chips = (key, list, cur) => `<div class="mkp-chips" data-g="${key}">${list.map(([v, l]) => `<button data-v="${v}" class="${v === cur ? 'on' : ''}">${l}</button>`).join('')}</div>`;
      const AM = [[0.25, '25 %'], [0.5, '50 %'], [1, 'Alles']];
      let q, prev, go;
      if (mode === 'buy') { const usd = Math.max(0, s.cash) * k, got = (usd * (1 - this.fee())) / p; q = `<span>Wie viel kaufen?</span>${chips('k', AM, k)}`; prev = `<b>≈ ${fmtCoin(got)} ${c.id}</b><small>nach Gebühr · für ${money(usd)}</small>`; go = 'Kaufen'; }
      else if (mode === 'limit') { const lp = this.limitPrice(p), n = hd.ex * k, usd = n * lp * (1 - this.fee(true)); q = `<span>Wie viel?</span>${chips('k', AM, k)}<span>ab Kurs</span>${chips('up', [[0.05, '+5 %'], [0.1, '+10 %'], [0.25, '+25 %']], this.up)}`; prev = `<b>${approx(usd)} <i>nach Gebühr</i></b><small>${fmtCoin(n)} ${c.id}, sobald ${c.id} ${fmtUSD(lp)} erreicht</small>`; go = 'Auftrag setzen'; }
      else { const n = hd.ex * k, usd = n * p * (1 - this.fee()); q = `<span>Wie viel verkaufen?</span>${chips('k', AM, k)}`; prev = `<b>${approx(usd)} <i>nach Gebühr</i></b><small>für ${fmtCoin(n)} ${c.id}</small>`; go = 'Verkaufen'; }
      box.classList.add('mkp-pick'); if (mode === 'limit') box.classList.add('mkp-lim');
      box.innerHTML = `<div class="mkp-q">${q}</div><div class="mkp-prev">${prev}</div><div class="mkp-go"><button class="mkp-ok ${mode === 'buy' ? 'buy' : 'sell'}">${go}</button><button class="mkp-no">Zurück</button></div>`;
      box.querySelectorAll('.mkp-chips button').forEach((b) => (b.onclick = () => { if (b.parentNode.dataset.g === 'up') this.up = +b.dataset.v; else this.k[mode] = +b.dataset.v; this.renderAct(); }));
      box.querySelector('.mkp-ok').onclick = () => this.confirm();
      box.querySelector('.mkp-no').onclick = () => this.closePicker();
      return;
    }
    if (!canSell && !canBuy) { // nichts zu verkaufen: Hinweis statt grauer Knöpfe
      const r = coinRate(g, c.id).perDay, cold = hd.cold * p >= 0.01;
      const t = cold ? 'Deine Coins liegen in der Cold-Wallet. Hol sie auf die Börse, dann kannst du verkaufen.'
        : r > 0 ? (s.stats.sold > 0 ? 'Alles verkauft. Dein PC schürft schon weiter – komm in ein paar Tagen wieder.' : 'Dein PC schürft gerade. Komm in ein paar Tagen wieder, dann lohnt sich das Verkaufen.')
          : c.id === 'BTC' ? 'Noch keine Bitcoin da. Sobald dein PC schürft, landen sie hier.' : `Noch kein ${esc(c.name)} da.`;
      box.classList.add('mkp-msg'); box.innerHTML = `${ICON.wait}<p>${t}</p>`; return;
    }
    if (canSell) { const b = h(`<button class="mkp-big sell">${ICON.sell}<span>Verkaufen</span></button>`); b.onclick = () => this.openPicker('sell'); box.append(b); }
    if (canLim) { const b = h(`<button class="mkp-big lim">${ICON.limit}<span>Limit-Order</span></button>`); b.onclick = () => this.openPicker('limit'); box.append(b); } // nur mit der Fähigkeit „Limit-Orders“
    if (canBuy) { const b = h(`<button class="mkp-big buy">${ICON.buy}<span>Kaufen</span></button>`); b.onclick = () => this.openPicker('buy'); box.append(b); }
  }
  // Freigeschaltete Extras: Cold-Wallet und Auto-Verkauf, klein unten
  renderMore() {
    const el = this.pg, g = this.g, s = g.s, ui = this.ui, c = this.coin(), box = el.querySelector('.mkp-more'); box.innerHTML = '';
    if (g.has('cold')) {
      const w = s.wallet[c.id], toEx = w.cold > 0 && w.ex <= 0;
      const row = h(`<div class="mkp-opt"><span>Cold-Wallet <b>${fmtCoin(w.cold)} ${c.id}</b></span><button>${toEx ? 'Auf die Börse holen' : 'Einlagern'}</button><label><input type="checkbox" ${s.payoutCold ? 'checked' : ''}/>Neue Coins gleich dorthin</label></div>`);
      row.querySelector('button').onclick = () => { if (c.id === 'BTC' && !toEx) { const pd = this.hold('BTC').pend; if (pd > 0 && !s.payoutCold) g.creditPending('BTC', pd); } g.transfer(c.id, !toEx); this.render(); };
      row.querySelector('input').onchange = (e) => { s.payoutCold = e.target.checked; this.render(); };
      box.append(row);
    }
    if (g.has('autosell')) {
      const v = Math.round((s.autoSell[c.id] || 0) * 100);
      const row = h(`<div class="mkp-opt"><span>Auto-Verkauf <b class="v">${v} %</b></span><input type="range" min="0" max="100" step="5" value="${v}"/>${this.coins().length > 1 ? '<button>Für alle Coins</button>' : ''}</div>`);
      row.querySelector('input').oninput = (e) => { s.autoSell[c.id] = e.target.value / 100; row.querySelector('.v').textContent = `${e.target.value} %`; ui.rate = 0; };
      const all = row.querySelector('button'); if (all) all.onclick = () => { for (const k of COINS) s.autoSell[k.id] = s.autoSell[c.id]; ui.toast('Für alle Coins übernommen', 'good', 1500); };
      if (this.limitOk()) { const lc = h(`<label><input type="checkbox" ${s.autoLimit ? 'checked' : ''}/>nur über dem 7-Tage-Schnitt</label>`); lc.querySelector('input').onchange = (e) => { s.autoLimit = e.target.checked; ui.toast(s.autoLimit ? 'Auto-Verkauf wartet jetzt auf gute Kurse.' : 'Auto-Verkauf verkauft wieder sofort.', 'info', 2500); }; row.append(lc); }
      box.append(row);
    }
    // offene Limit-Orders (Fähigkeit „Limit-Orders“): reservierte Coins, jederzeit streichbar
    for (const l of this.limitOk() ? (s.limits || []).filter((x) => x.coin === c.id) : []) {
      const row = h(`<div class="mkp-opt"><span>Limit-Order <b>${fmtCoin(l.n)} ${c.id} ab ${fmtUSD(l.p)}</b></span><button>Streichen</button></div>`);
      row.querySelector('button').onclick = () => { g.limitCancel(l.id); this.render(); }; box.append(row);
    }
    box.classList.toggle('hidden', !box.children.length);
  }
  // Limit-Orders gibt es nur mit der Fähigkeit (sim/skills.js); Zielkurs = heutiger Kurs + 5/10/25 %, gerundet
  limitOk() { return !!this.g.knows?.('limit') && typeof this.g.limitAdd === 'function'; }
  limitPrice(p) { const v = p * (1 + (this.up || 0.1)), e = Math.pow(10, Math.floor(Math.log10(v)) - 2); return Math.ceil(v / e) * e; }
  openPicker(mode) { this.ui.trade = { mode, open: true }; this.renderAct(); }
  closePicker(silent = false) { if (this.ui.trade) this.ui.trade.open = false; if (!silent) this.renderAct(); }
  confirm() {
    const g = this.g, s = g.s, ui = this.ui, T = ui.trade, c = this.coin(); if (!T) return;
    const k = this.k[T.mode];
    if (T.mode === 'sell' || T.mode === 'limit') {
      const pd = this.hold(c.id).pend; if (c.id === 'BTC' && pd > 0 && !s.payoutCold) g.creditPending('BTC', pd); // heute Geschürftes mitverkaufen
      const n = s.wallet[c.id].ex * k;
      if (T.mode === 'limit') { const lp = this.limitPrice(g.price(c.id)); if (!g.limitAdd(c.id, n, lp)) { ui.toast('Der Auftrag ging nicht durch.', 'bad', 2500); return; } ui.toast(`Limit-Order: ${fmtCoin(n)} ${c.id}, sobald der Kurs ${fmtUSD(lp)} erreicht`, 'good', 3600); }
      else { const u = g.sell(c.id, k); if (!u) return; ui.audio?.cash?.(); ui.flashCash?.(u); ui.toast(`${fmtCoin(n)} ${c.id} verkauft · +${money(u)}`, 'good', 3200); }
    } else {
      const fee = this.fee(), usd = Math.max(0, s.cash) * k, u = g.buy(c.id, k >= 1 ? s.cash : usd); if (!u) { ui.toast('Kauf ging nicht.', 'bad'); return; }
      ui.audio?.cash?.(); ui.toast(`${fmtCoin((u * (1 - fee)) / g.price(c.id))} ${c.id} gekauft · −${money(u)}`, 'good', 3200);
    }
    T.open = false; ui.top?.(); ui.liveWallet?.(); this.render();
    const f = this.pg?.querySelector('.mkp-facts'); if (f) { f.classList.remove('flash'); void f.offsetWidth; f.classList.add('flash'); }
  }

  // ---------- Chart: echte Tageskurse bis heute ----------
  chart() {
    const cv = this.pg?.querySelector('canvas'); if (!cv || !cv.isConnected) return;
    const W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
    const g = this.g, s = g.s, c = this.coin(), range = this.ui.range || MONTH, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const fs = parseFloat(getComputedStyle(cv).fontSize) || 16, small = Math.round(fs * 0.78);
    const d1 = s.day, d0 = Math.max(c.start, DATA0, range >= ALL ? 0 : d1 - range);
    const tip = this.pg.querySelector('.mkp-tip');
    if (d1 - d0 < 2) { this.layout = null; tip.classList.add('hidden'); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.font = `600 ${fs}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('Noch keine Kursdaten', W / 2, H / 2); return; }
    const n = Math.max(2, Math.min(d1 - d0, Math.round(W / 2))), pts = [];
    for (let i = 0; i <= n; i++) { const d = Math.round(d0 + ((d1 - d0) * i) / n); pts.push([d, Math.max(0, g.price(c.id, d))]); }
    const vals = pts.map((q) => q[1]).filter((v) => v > 0); if (!vals.length) return;
    const vmin = Math.min(...vals), vmax = Math.max(...vals), log = vmax / vmin > 30;
    const tf = (v) => (log ? Math.log10(Math.max(v, vmin)) : v);
    let lo = tf(vmin), hi = tf(vmax); const ticks = [];
    if (log) { for (let e = Math.ceil(lo - 1e-9); e <= Math.floor(hi + 1e-9); e++) ticks.push(e); if (ticks.length < 3) for (let e = Math.floor(lo); e <= Math.ceil(hi); e++) for (const m of [2, 5]) { const t = e + Math.log10(m); if (t > lo && t < hi) ticks.push(t); } ticks.sort((a, b) => a - b); const pad = (hi - lo) * 0.08 || 0.1; lo -= pad; hi += pad; }
    else { const span = hi - lo || hi * 0.1 || 1, raw = span / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 2.5, 5, 10].map((q) => q * mag).find((q) => q >= raw); lo = Math.max(0, lo - span * 0.08); hi += span * 0.08; for (let i = Math.ceil(lo / st); i * st <= hi; i++) ticks.push(+(i * st).toPrecision(12)); this.step = st; }
    ctx.font = `600 ${small}px Nunito, sans-serif`;
    // Achsenbeschriftung: so viele Nachkommastellen, wie der Abstand der Linien braucht (log: wie der Wert)
    const decOf = (x) => { const e = Math.floor(Math.log10(x) + 1e-9), m = x / Math.pow(10, e); return Math.max(0, -e + (Math.abs(m - 2.5) < 1e-6 ? 1 : 0)); };
    const lab = (t) => { const v = log ? Math.pow(10, t) : t; if (v >= 1e6) return fmtUSD(v); const dec = Math.min(6, log ? (v >= 1 ? 0 : decOf(v)) : decOf(this.step)); return `${v.toLocaleString('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec })} $`; };
    const padT = Math.round(fs * 2.9), padB = Math.round(fs * 1.9), padL = 2, padR = Math.round(Math.max(...ticks.map((t) => ctx.measureText(lab(t)).width), 30) + fs * 1.1);
    const X = (i) => padL + (i / n) * (W - padL - padR), Y = (v) => padT + (1 - (tf(v) - lo) / (hi - lo || 1)) * (H - padT - padB);
    this.layout = { n, W, padL, padR, pts };
    // Raster und Achsen
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.055)'; ctx.fillStyle = 'rgba(232,224,214,.55)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (const t of ticks) { const y = Math.round(padT + (1 - (t - lo) / (hi - lo || 1)) * (H - padT - padB)) + 0.5; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR + fs * 0.3, y); ctx.stroke(); ctx.fillText(lab(t), W - padR + fs * 0.6, y); }
    ctx.textBaseline = 'alphabetic'; const longAx = d1 - d0 > 200;
    ctx.fillText(axisDate(d0, longAx), padL, H - fs * 0.45); ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(240,181,74,.85)'; ctx.fillText('heute', X(n), H - fs * 0.45);
    if (log) { ctx.fillStyle = 'rgba(232,224,214,.35)'; ctx.textAlign = 'right'; ctx.fillText('log. Skala', W - padR - fs * 0.4, padT - fs * 0.5); }
    // Fläche und Linie
    const path = () => { ctx.beginPath(); let st = false; pts.forEach(([, v], i) => { if (!(v > 0)) return; const x = X(i), y = Y(v); if (st) ctx.lineTo(x, y); else { ctx.moveTo(x, y); st = true; } }); };
    const first = pts.findIndex(([, v]) => v > 0);
    const grad = ctx.createLinearGradient(0, padT, 0, H - padB); grad.addColorStop(0, 'rgba(240,181,74,.20)'); grad.addColorStop(1, 'rgba(240,181,74,0)');
    path(); ctx.lineTo(X(n), H - padB); ctx.lineTo(X(first), H - padB); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    path(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.5, fs * 0.11); ctx.strokeStyle = LINE; ctx.stroke();
    // Marke „heute“
    const [, lv] = pts[n]; ctx.beginPath(); ctx.arc(X(n), Y(lv), fs * 0.62, 0, 7); ctx.fillStyle = 'rgba(240,181,74,.18)'; ctx.fill();
    ctx.beginPath(); ctx.arc(X(n), Y(lv), fs * 0.28, 0, 7); ctx.fillStyle = LINE; ctx.fill();
    // Hover / Touch: Datum und Kurs
    const i = this.hov;
    if (i == null || !(pts[i]?.[1] > 0)) { tip.classList.add('hidden'); return; }
    const [d, v] = pts[i], x = X(i), y = Y(v);
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, padT - fs * 0.4); ctx.lineTo(Math.round(x) + 0.5, H - padB); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x, y, fs * 0.34, 0, 7); ctx.fillStyle = '#16130f'; ctx.fill(); ctx.lineWidth = Math.max(1.5, fs * 0.12); ctx.strokeStyle = LINE; ctx.stroke();
    tip.innerHTML = `<b>${fmtUSD(v)}</b><span>${d === s.day ? 'heute' : fmtDate(d)}</span>`; tip.classList.remove('hidden');
    const tw = tip.offsetWidth, th = tip.offsetHeight, sx = cv.offsetLeft + x * (cv.offsetWidth / W), sy = cv.offsetTop + y * (cv.offsetHeight / H);
    tip.style.left = `${Math.round(Math.max(cv.offsetLeft, Math.min(cv.offsetLeft + cv.offsetWidth - padR * (cv.offsetWidth / W) - tw, sx - tw / 2)))}px`;
    tip.style.top = `${Math.round(sy - th - fs * 0.8 < cv.offsetTop ? sy + fs * 0.9 : sy - th - fs * 0.8)}px`;
  }
}
