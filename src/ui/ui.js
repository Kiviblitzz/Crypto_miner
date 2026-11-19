// DOM-Oberfläche: Topbar, Standorte, Baumenü, Inspektor, Ziele, Dock, Modals (Markt, Handy, Firma, Rangliste, Menü)
import { COINS, COIN, ALGO_LABEL } from '../data/coins.js';
import { PLACEABLE, PART, CATEGORIES, PLACEABLES, PARTS } from '../data/hardware.js';
import { FACILITIES, FACILITY, CHAPTERS, TECHS, FEATURES, MESSAGES } from '../data/world.js';
import { DIFFICULTY } from '../data/world.js';
import { fmtUSD, fmtNum, fmtCoin, fmtHash, fmtDate, fmtWatt, SKILL_XP } from '../sim/game.js';
import { toDay, BTC_HASH, inHeatwave, HALVINGS, BTC_REWARD } from '../data/history.js';
import { EVENT } from '../data/events.js';
import { ACH } from '../data/achievements.js';
import { ROLES, TRAITS, QUOTES } from '../data/staff.js';

const $ = (s) => document.querySelector(s);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SPEEDS = [{ l: 'II', v: 0, t: 'Pause (Leertaste)' }, { l: '1×', v: 1, t: '1 Tag = 4 Sekunden (Taste 1)' }, { l: '2×', v: 2, t: '1 Tag = 1,6 Sekunden (Taste 2)' }, { l: '3×', v: 3, t: '2 Tage pro Sekunde (Taste 3)' }, { l: '4×', v: 4, t: '8 Tage pro Sekunde (Taste 4)' }];
const pctDE = (x) => (x * 100).toPrecision(3).replace('.', ',');
const FACE = { Deniz: '', Mama: '', Papa: '‍', 'Opa Heinz': '', 'Viktor Kral': '' };

const PART_ICON = {
      mobo: '<rect x="3" y="3" width="18" height="18" rx="3"/><rect x="8" y="8" width="6" height="6" rx="1"/><path d="M17.5 7v4M17.5 14v3M6 17.5h4"/>',
      cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2.5v3M12 2.5v3M15 2.5v3M9 18.5v3M12 18.5v3M15 18.5v3M2.5 9h3M2.5 15h3M18.5 9h3M18.5 15h3"/>',
      gpu: '<rect x="2" y="6" width="20" height="11" rx="2.5"/><circle cx="9" cy="11.5" r="3"/><circle cx="16.5" cy="11.5" r="2"/><path d="M5 17v3M8.5 17v3"/>',
      psu: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="10" cy="12" r="4"/><path d="M10 9.5v5M7.5 12h5M17.5 9v6"/>' };
const PNAME = { mobo: 'Mainboard', cpu: 'Prozessor', gpu: 'Grafikkarte', psu: 'Netzteil' };
const SKILL = {
  hw: { name: 'Schrauben', learn: 'Teile einbauen, Geräte aufstellen', short: 'Einbauen', icon: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>', now: (lv) => (lv > 1 ? `−${4 * (lv - 1)} % auf Hardware` : 'Noch kein Bonus'), next: (lv) => `−${4 * lv} % auf Hardware` },
  mining: { name: 'Mining', learn: 'Jeder Tag, an dem dein PC schürft', short: 'Schürfen', icon: '<path d="M3.5 9.5C7.5 4.5 13.5 3.2 19.5 5.5" stroke-width="2.4"/><path d="M11.2 6.2 18.8 20" stroke-width="2.2"/><circle cx="11.2" cy="6.2" r="1.3" fill="currentColor"/>', now: (lv) => (lv > 1 ? `+${4 * (lv - 1)} % Mining-Ertrag` : 'Noch kein Bonus'), next: (lv) => `+${4 * lv} % Mining-Ertrag` },
  trade: { name: 'Handel', learn: 'Coins verkaufen', short: 'Verkaufen', icon: '<circle cx="9" cy="9" r="5.5"/><path d="M14.6 8.8a5.5 5.5 0 1 1-5.8 5.8"/><path d="M9 6.8v4.4M7.2 9h3.6"/>', now: (lv) => `${[4, 3, 2, 1, 0.5][lv - 1].toLocaleString('de-DE')} % Börsengebühr`, next: (lv) => `${[3, 2, 1, 0.5][lv - 1]?.toLocaleString('de-DE') ?? '–'} % Börsengebühr` },
};
const skillSvg = (k, size = 22) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${SKILL[k].icon}</svg>`;
const partSvg = (t, size = 22) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PART_ICON[t]}</svg>`;

export class UI {
  constructor(game, world) {
    this.g = game; this.w = world; this.cat = 'rigs'; this.marketCoin = 'BTC'; this.lastBuildDay = -1;
    this.dock(); this.speedBar();
    world.onSelect = (uid) => this.inspect(uid);
    world.onHeat = () => this.sites();
    world.onEmpire = (on) => { this.dock(); this.hint(on ? 'Ziehen = drehen · Rad = Zoom · K = zurück' : null); document.body.classList.toggle('empire', on); };
    world.onPlacing = (on) => { this.placingHint = on; this.prompt(null); this.hint(on ? 'Klick = setzen · R = drehen · Rechtsklick = abbrechen' : null); };
    world.onAim = (aim) => { document.body.classList.toggle('aiming', !!aim); this.prompt(aim); };
    world.onInteract = (uid) => this.openInspector(uid);
    world.onDoor = (door) => this.travel(door);
    world.onProp = (p) => this.useProp(p);
    world.onSnap = () => this.audio?.install?.();
    world.onNoAim = () => { // E ohne Ziel: das markierte Ziel in Reichweite benutzen
      const t = this.objTarget, g = this.g; if (!t) return;
      const lt = Object.keys(g.s.loose || {}).find((k) => t.label === PNAME[k]); if (lt) { world.onLoose(lt); return; }
      const pc = g.facObjects(g.s.current).find((o) => o.type === 'tower'); if (pc && t.label === 'Dein PC') { this.openInspector(pc.uid); return; }
      const pr = world.room?.props?.find((p) => p.action === 'market'); if (pr && (t.label === 'Börse' || t.label === 'Bitcoin verkaufen')) { this.useProp(pr); return; }
      if ((t.label === 'Keller' || t.label === 'Hoch in dein Zimmer') && world.room?.doors?.[0]) this.travel(world.room.doors[0]);
    };
    world.onInstalled = (uid) => { this.installing = false; this.flushXp(); if (this.inspUid === uid) this.inspect(uid); if (this.afterSnap) { this.toast(this.afterSnap, 'good', 2600); this.afterSnap = null; } };
    world.onLoose = (t) => { this.w.pickupFx(t); if (!this.g.s.loose?.[t]) return; this.toast(`${PNAME[t]} in der Tasche`, 'good', 2200); if (!this.g.pickUp(t)) return; this.lastPick = { t, at: performance.now() }; setTimeout(() => this.goals(), 1300); this.audio?.install?.(); this.goals(); };
    game.on('xp', (k, n, lv) => this.xpPop(k, n, lv));
    world.onIncome = () => { this.bumpWallet(); this.audio?.tick?.(); };
    world.onLamp = (on) => { if (on) this.lampHint?.remove(); this.toast(on ? 'Taschenlampe an' : 'Taschenlampe aus', 'info', 1500); this.keysHint(); };
    world.onPause = () => this.pause(true);
    world.onCanvasClickInUI = () => this.resume();
    world.onPlaced = (o) => { const d = PLACEABLE[o.type]; if (d.kind === 'rig' || d.kind === 'holder') this.toast(`Anschauen und <kbd>E</kbd>: bestücken`, 'good', 5000); };
    world.onModeChange = (m) => { document.body.dataset.mode = m; this.dock(); };
    world.onLockChange = (locked) => { $('#clickhint').classList.toggle('hidden', locked || this.w.mode !== 'play' || this.w.touchMode || !!this.paused); };
    $('#modal .modal-x').onclick = () => this.closeModal();
    $('#modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') this.closeModal(); });
    $('#pause-resume').onclick = () => this.resume();
    $('#pause-menu').onclick = () => { this.pause(false); this.menu(); };
    // Einstellungen in der Pause: Ton, Mausempfindlichkeit (pro Gerät gemerkt)
    const pref = (() => { try { return JSON.parse(localStorage.getItem('hashwerk_prefs') || '{}'); } catch (e) { return {}; } })();
    const savePref = () => { try { localStorage.setItem('hashwerk_prefs', JSON.stringify(pref)); } catch (e) { /* egal */ } };
    const snd = $('#ps-sound'), sens = $('#ps-sens');
    const applySnd = () => { const on = pref.sound !== false; snd.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/>${on ? '<path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>' : '<path d="M16 9.5l5 5M21 9.5l-5 5"/>'}</svg><span>${on ? 'Ton an' : 'Ton aus'}</span>`; snd.setAttribute('aria-pressed', on); snd.title = on ? 'Ton ist an – klicken zum Ausschalten' : 'Ton ist aus – klicken zum Einschalten'; snd.classList.toggle('off', !on); this.audio?.setMuted?.(!on); };
    snd.onclick = () => { pref.sound = pref.sound === false; savePref(); applySnd(); };
    sens.value = pref.sens || 1; const applySens = () => { this.w.player.sens = 0.0022 * (+sens.value || 1); const v = $('#ps-val'); if (v) v.textContent = (+sens.value).toLocaleString('de-DE', { minimumFractionDigits: 1 }) + '×'; };
    sens.oninput = () => { pref.sens = +sens.value; savePref(); applySens(); };
    setTimeout(() => { applySnd(); applySens(); }, 0);
    $('#clickhint').onclick = () => this.w.requestLock();
    game.on('toast', (t, k, ms) => this.toast(t, k, ms));
    const showMsg = (m) => { if (document.querySelector('#featcards .featcard') || document.getElementById('lvup') || this.lvBusy) { setTimeout(() => showMsg(m), 1200); return; } this.toast(`${FACE[m.from] || ''} <b>${esc(m.from)}:</b> ${esc(m.text)}`, 'msg', 7000); this.dock(); };
    this.flushMsgs = (base = 3000) => { const q = this.msgQ || []; this.msgQ = []; q.forEach((m, i) => setTimeout(() => showMsg(m), base + i * 2500)); };
    game.on('message', (m) => { if (this.inspUid || this.w.focus) { (this.msgQ ||= []).push(m); this.dock(); return; } showMsg(m); });
    game.on('news', () => this.ticker());
    game.on('feature', (f) => this.featureCard(f));
    game.on('milestone', (t, sub) => this.milestone(t, sub));
    game.on('won', () => this.ending());
    game.on('event', () => { this.evSnooze = null; this.tryEvent(); });
    game.on('achievement', (id) => { const a = ACH[id]; if (a) setTimeout(() => this.milestone('Erfolg', `${a.name} – ${a.desc}`), 600); });
    game.on('offer', (usd) => this.offer(usd));
    game.on('release', (it, text) => { if (it.type !== 'psu' && it.type !== 'mobo') this.toast(`${esc(text)}`, 'info', 6000); this.ticker(); this.lastBuildDay = -99; });
    game.on('update', () => this.onDay());
    game.on('refresh', () => this.refresh());
    game.on('goal', () => { this.audio?.cash(); });
    game.on('unlockable', (id) => { this.milestone('Kapitel geschafft', `${FACILITY[id].short} ist frei`); this.toast(`<b>${FACILITY[id].short}</b> ist frei`, 'good', 8000); this.goals(); this.sites(); });
    setInterval(() => { this.top(); this.buildAfford(); }, 200);
    this.refresh(); this.ticker();
  }

  // Geldbeträge im Katalog: ab 10 $ ganze Dollar, darunter mit Cent – überall gleich
  money(v) { return v >= 10 ? Math.ceil(v - 1e-9).toLocaleString('de-DE') + ' $' : fmtUSD(v); }
  buildAfford() {
    if (!document.body.classList.contains('show-build')) return;
    const cash = this.g.s.cash;
    for (const card of document.querySelectorAll('#build .item[data-price]')) {
      const p = +card.dataset.price, short = p > cash; const off = !!(card.dataset.hydro || card.dataset.sold); card.classList.toggle('dis', short || off); const pb = card.querySelector('.place'); if (pb) pb.disabled = short || off;
      const m = card.querySelector('.miss'); if (m) { const t = short ? `Dir fehlen ${this.money(p - cash)}` : ''; if (m.textContent !== t) m.textContent = t; }
    }
  }
  refresh() { this.top(); this.sites(); this.build(true); this.goals(); this.dock(); if (this.inspUid) this.inspect(this.inspUid, true); }
  onDay() {
    if (this.g.s.ev?.open) this.tryEvent();
    this.sites(); this.goals(); this.keysHint();
    for (const t of TECHS) if (toDay(t.date) === this.g.s.day) { this.toast(`Neue Technologie verfügbar: <b>${esc(t.name)}</b>`, 'good', 7000); this.dock(); }
    if (this.g.s.day % 7 === 0) this.dock();
    if (this.g.s.day - this.lastBuildDay >= 7) this.build(true);
    if (this.inspUid) this.inspectStats();
    if (this.modalKind === 'market') this.market(true);
    if (this.modalKind === 'ranking') this.ranking();
    if (this.modalKind === 'company') this.company();
  }

  // ---------- Topbar ----------
  speedBar() {
    const el = $('#speed'); el.innerHTML = '';
    SPEEDS.forEach((s) => { const b = h(`<button title="${s.t}">${s.l}</button>`); b.onclick = () => this.setSpeed(s.v); if (!this.speedOk(s.v)) b.style.display = 'none'; el.append(b); });
    this.setSpeed(this.g.s.speed ?? 0);
  }
  speedOk(v) { const g = this.g; return v <= 1 || (v === 2 && g.has('speed2')) || (v >= 3 && g.has('speed3')); }
  setSpeed(v) { if (!this.speedOk(v)) { this.toast('Noch nicht freigeschaltet.', 'info', 1800); return; } this.g.s.speed = v; this.g.s.paused = v === 0; [...$('#speed').children].forEach((b, i) => b.classList.toggle('on', SPEEDS[i].v === v)); }
  top() {
    const g = this.g, s = g.s;
    const vf = this.w.visFrac ?? s.frac, day = vf > 0.27 && vf < 0.79;
    const icon = day ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>' : '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z" fill="currentColor"/></svg>';
    $('#date').innerHTML = `${fmtDate(s.day, true)}<span class="tod" title="${day ? 'Tag' : 'Nacht'}">${icon}</span>${inHeatwave(s.day) ? '<span title="Hitzewelle: +6 °C Umgebung" style="margin-left:6px"></span>' : ''}`;
    const p = g.dailyProfit();
    const btc = g.price('BTC'), btc7 = g.price('BTC', s.day - 7) || btc;
    const ch = ((btc / btc7 - 1) * 100);
    let sh = g.algoHash('sha256'), shAlgo = 'sha256';
    if (!sh) { for (const a of ['scrypt', 'ethash', 'kawpow', 'kheavy', 'equihash', 'rx', 'cn']) { const v = g.algoHash(a); if (v) { sh = v; shAlgo = a; break; } } }
    const smc = g.summary[s.current]; $('#heat').classList.toggle('on', !!smc && smc.temp > 38 && !smc.tripped);
    const nw = g.netWorthFast();
    const now = performance.now(), k = 1 - Math.exp(-Math.min(2, (now - (this.lastTop || now - 200)) / 1000) / 0.22); this.lastTop = now;
    const ease = (cur, target) => (cur == null || Math.abs(target - cur) > Math.abs(target) * 0.5 + 1e4 || Math.abs(target - cur) < 0.005 ? target : cur + (target - cur) * k);
    this.dCash = ease(this.dCash, s.cash); this.dNw = ease(this.dNw, nw);
    const mOn = !s.feat || s.flags.miningStarted;
    for (const [id, ok] of [['#st-profit', mOn], ['#st-hash', mOn], ['#st-nw', g.has('rigs')]]) $(id).style.display = ok ? '' : 'none';
    $('#st-cash').title = 'Bargeld für Hardware, Strom, Miete und Löhne'; $('#st-nw').title = 'Kontostand + Coins + Wiederverkaufswert der Hardware − Kredit'; $('#st-profit').title = 'Mining-Ertrag minus Strom, Miete, Löhne und Zinsen pro Tag';
    $('#st-cash').innerHTML = `<div class="l">Kontostand</div><div class="v ${s.cash < 0 ? 'neg' : ''}">${fmtUSD(this.dCash)}</div>`;
    $('#st-nw').innerHTML = `<div class="l">Vermögen</div><div class="v">${fmtUSD(this.dNw)}</div>`;
    $('#st-profit').innerHTML = `<div class="l">Gewinn / Tag</div><div class="v ${p.net >= 0 ? 'pos' : 'neg'}">${p.net >= 0 ? '+' : ''}${fmtUSD(p.net)}</div>`;
    $('#st-btc').innerHTML = `<div class="l">Bitcoin</div><div class="v">${fmtUSD(btc)} <small class="${ch >= 0 ? 'pos' : 'neg'}">${ch >= 0 ? '▲' : '▼'} ${Math.abs(ch).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %</small></div>`;
    $('#st-hash').innerHTML = `<div class="l">${ALGO_LABEL[shAlgo]} Hashrate</div><div class="v">${fmtHash(sh, shAlgo)}</div>`;
  }

  // Bitcoin-Bestand im HUD: zählt zwischen den Tagesabrechnungen live mit
  btcRate() {
    const g = this.g, s = g.s, p = g.price('BTC') || 1; let r = 0;
    for (const id of s.unlocked) { const sm = g.summary[id]; if (!sm || sm.tripped) continue; for (const a of sm.per.values()) for (const u of a.units || []) if (u.coin === 'BTC' && u.rev > 0) r += (u.rev * sm.throttle) / p; }
    return r * (1 - (s.autoSell.BTC || 0));
  }
  // Zielhinweis direkt am Objekt: wo der nächste Handgriff wartet
  objMarker() {
    const el = $('#objmark'); if (!el) return;
    const g = this.g, s = g.s, w = this.w; let pos = null, label = '', aimed = false;
    const inKeller = w.facId === 'keller' && this.visiting, door = w.room?.doors?.[0];
    if (s.chapter === 0 && w.mode === 'play' && !this.paused && !s.flags.miningStarted && door && ((w.facId === 'kinder' && Object.keys(s.loose || {}).length) || (inKeller && !Object.keys(s.loose || {}).length))) { pos = inKeller ? [6.4, 0.9, 2.1] : [door.c[0] - 0.1, 1.55, door.c[2]]; label = inKeller ? 'Hoch in dein Zimmer' : 'Keller'; aimed = w.aim?.door === door; }
    else if (s.chapter === 0 && w.mode === 'play' && !this.paused && (w.facId === 'kinder' || inKeller)) {
      const pc = w.facId === 'kinder' ? g.facObjects('kinder').find((o) => o.type === 'tower') : { x: 0, z: 0, uid: -1 };
      const spots = w.room?.looseSpots || {}, lying = Object.keys(s.loose || {}).filter((t) => spots[t]);
      if (pc && !s.flags.miningStarted && lying.length) { const cp = w.camera.position, d = (t) => Math.hypot(spots[t][0] - cp.x, spots[t][2] - cp.z) + (w.toScreen(spots[t][0], spots[t][1] + 0.1, spots[t][2]).on ? 0 : 100); const keep = lying.includes(this.markLoose) && w.toScreen(spots[this.markLoose][0], spots[this.markLoose][1] + 0.1, spots[this.markLoose][2]).on; const t = keep ? this.markLoose : lying.sort((a, b) => d(a) - d(b))[0]; this.markLoose = w.markLoose = t; pos = [spots[t][0], spots[t][1] + 0.1, spots[t][2]]; label = PNAME[t]; aimed = w.aim?.loose === t; }
      else if (pc && pc.uid !== -1 && !s.flags.miningStarted) { pos = [pc.x, 0.78, pc.z]; label = 'Dein PC'; aimed = w.aim?.uid === pc.uid; }
      else if (g.has('market') && !(s.stats.sold > 0)) { const pr = w.room?.props?.find((p) => p.action === 'market'); if (pr) { pos = [pr.c[0], pr.c[1] + 0.16, pr.c[2]]; label = 'Bitcoin verkaufen'; aimed = w.aim?.prop === pr; } }
    }
    const sp = pos && w.toScreen(...pos);
    this.objTarget = sp && sp.dist < 2.0 ? { label, pos } : null;
    if (!sp || aimed || (w.aim && !aimed)) { el.classList.add('hidden'); return; }
    el.classList.toggle('far', sp.dist > 2.2);
    el.classList.remove('hidden'); el.classList.toggle('edge', !sp.on); el.classList.toggle('left', !sp.on && sp.side < 0);
    const ex = sp.side < 0 ? 150 : innerWidth - 150, ey = Math.min(innerHeight - 140, Math.max(200, sp.front ? sp.y : innerHeight * 0.55));
    el.style.transform = sp.on ? `translate(${Math.round(sp.x)}px, ${Math.round(Math.min(sp.y, innerHeight - 120))}px)` : `translate(${ex}px, ${Math.round(ey)}px)`;
    // nicht mit Meldungen überlappen
    const mr = el.querySelector('.om-in').getBoundingClientRect(); let hit = false; for (const t of document.querySelectorAll('#toasts .toast')) { const r = t.getBoundingClientRect(); if (mr.right > r.left - 12 && mr.left < r.right + 12 && mr.bottom > r.top - 12 && mr.top < r.bottom + 12) { hit = true; break; } } el.style.visibility = hit ? 'hidden' : '';
    const t = el.querySelector('.om-t'), full = label; if (t.textContent !== full) t.textContent = full;
  }
  // Heute schon geschürft, aber noch nicht gutgeschrieben
  pendingBtc() {
    const s = this.g.s; if (!s.flags.miningStarted) return 0;
    if (!this.rate || this.rateDay !== s.day) { this.rate = this.btcRate(); this.rateDay = s.day; }
    const f0 = s.mineDay0 === s.day ? s.mineFrac0 || 0 : 0, fa = s.accr?.day === s.day ? s.accr.f : 0;
    return (this.rate || 0) * Math.max(0, (s.frac || 0) - Math.max(f0, fa));
  }
  liveWallet() {
    const g = this.g, s = g.s, el = $('#st-wallet'); if (!el) return;
    const on = (!s.feat || s.flags.miningStarted) && !document.getElementById('splash')?.offsetParent;
    el.style.display = on ? '' : 'none'; document.body.classList.toggle('has-wallet', on); document.body.classList.toggle('showrun', !!this.showRun); if (!on) return;
    if (this.rateDay !== s.day || !this.rateT || performance.now() - this.rateT > 1000) { this.rate = this.btcRate(); this.rateDay = s.day; this.rateT = performance.now(); }
    const w = s.wallet.BTC, live = w.ex + w.cold + this.pendingBtc();
    const txt = `<div class="v"><span class="cn">₿</span> ${fmtCoin(live)}</div><div class="l">≈ ${fmtUSD(live * g.price('BTC'))}</div>`;
    const pl = document.getElementById('pcb-live'); if (pl) { const pb = this.pendingBtc() + (w.ex + w.cold - (this.btcAtStart ?? 0)); const t2 = pb < 0.01 ? 'Miner startet …' : '₿ ' + pb.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); if (pl.textContent !== t2) pl.textContent = t2; }
    if (txt !== this.walletTxt) { el.innerHTML = txt; this.walletTxt = txt; }
  }
  bumpWallet() { const el = $('#st-wallet'); if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

  // ---------- Standorte ----------
  sites() {
    const el = $('#sites'); el.innerHTML = '';
    const g = this.g;
    for (const f of FACILITIES) {
      const un = g.s.unlocked.includes(f.id);
      const sm = g.summary[f.id] || (un ? g.facSummary(f.id) : null);
      if (!un) {
        if (g.canUnlock(f.id)) { const b = h(`<div class="site" title="Freischalten"><div class="n">${f.short}</div><div class="m">${fmtUSD(f.cost)} · freischalten</div></div>`); b.onclick = () => this.company(); el.append(b); }
        else if (f.tier === g.s.unlocked.length) el.append(h(`<div class="site locked"><div class="n">${f.short}</div><div class="m">${esc(f.place.split(',')[0])}</div></div>`));
        continue;
      }
      const kw = sm.watt / 1000, cap = sm.capKw, pct = Math.min(100, (kw / cap) * 100);
      const b = h(`<div class="site ${g.s.current === f.id ? 'on' : ''}"><div class="n">${f.tier === 0 ? '' : f.tier === 1 ? '' : f.tier === 2 ? '' : f.tier === 3 ? '' : f.tier === 4 ? '' : ''} ${f.short} ${sm.tripped ? '<b class="neg">· Sicherung raus</b>' : ''}${g.s.fac[f.id].mothball ? '<b class="moth">· eingemottet</b>' : ''}</div>
        <div class="m" title="${kw < 10 ? kw.toFixed(2) : kw.toFixed(0)} / ${cap} kW"><span class="${sm.temp > 38 ? 'neg' : ''}">${sm.temp.toFixed(0)} °C</span></div>
        <div class="bar ${pct > 90 ? 'hot' : ''}"><div style="width:${pct}%"></div></div></div>`);
      b.onclick = () => { if (g.s.current !== f.id) this.switchSite(f.id); };
      el.append(b);
    }
    const hb = h(`<div class="site ${this.w.heatMode ? 'on' : ''}" title="Wärmebild ein/aus (Taste H)"><div class="n">Wärmebild</div><div class="m">Taste H</div></div>`);
    hb.onclick = () => { this.w.toggleHeat(); this.sites(); }; if (g.has('heat')) el.append(hb);
    const br = g.brokenIn(g.s.current);
    if (br.n) { const b = h(`<div class="site fix" title="Alle defekten Geräte hier reparieren"><div class="n">${br.n} defekt</div><div class="m">Alle reparieren: ${fmtUSD(br.c)}</div></div>`); b.onclick = () => { const n = g.repairAll(g.s.current); this.toast(n ? `${n} Gerät(e) repariert` : 'Nicht genug Geld.', n ? 'good' : 'bad'); this.sites(); }; el.append(b); }
  }
  switchSite(id) {
    this.fade();
    if (this.w.empire) this.w.hideEmpire();
    this.g.s.current = id; this.w.loadFacility(id);
    if (this.inspUid) { this.inspUid = null; $('#inspector').classList.add('hidden'); }
    this.refresh(); this.toast(`${esc(FACILITY[id].name)} – ${esc(FACILITY[id].place)}`, 'info', 3000);
  }
  fade() { const f = $('#fade'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }

  // ---------- Baumenü ----------
  build(force = false) {
    const el = $('#build'), g = this.g, fac = g.s.current;
    if (!force && el.childElementCount) return;
    this.lastBuildDay = g.s.day;
    el.innerHTML = '';
    const hwLv = g.skillLv ? g.skillLv('hw') : 1; const head = h(`<div class="bhead"><h2>Bauen${hwLv > 1 ? `<span class="disc">Schrauben −${4 * (hwLv - 1)} %</span>` : ''}</h2><button class="modal-x" title="Schließen (B)">✕</button></div>`); head.querySelector('button').onclick = () => this.resume(); el.append(head);
    const cats = h('<div class="cats"></div>');
    const catOk = (c) => (c.id !== 'rigs' || g.has('rigs')) && g.shopList(c.id, fac).length > 0;
    if (!CATEGORIES.some((c) => c.id === this.cat && catOk(c))) this.cat = (CATEGORIES.find(catOk) || CATEGORIES[0]).id;
    for (const c of CATEGORIES.filter(catOk)) { const b = h(`<button class="${this.cat === c.id ? 'on' : ''}"><span class="ic">${c.icon}</span>${c.name}</button>`); b.onclick = () => { this.cat = c.id; this.build(true); }; cats.append(b); }
    el.append(cats);
    const list = h('<div class="items"></div>');
    const items = g.shopList(this.cat, fac).sort((a, b) => b.releaseDay - a.releaseDay);
    el.style.setProperty('--cols', Math.max(1, Math.min(3, items.length)));
    if (!items.length) list.append(h('<div class="empty">Noch nichts da.</div>'));
    for (const it of items) {
      const price = g.itemPrice(it); const isNew = g.s.day - it.releaseDay < 120;
      let s = esc(it.desc || '');
      if (it.kind === 'device') { const r = g.revenueFor({ [it.algo]: it.hash }, g.bestCoin({ [it.algo]: it.hash }, it.vram || 99) || 'BTC', it.vram || 99); const cost = it.watt / 1000 * 24 * g.elecPrice(fac); s = `${fmtHash(it.hash, it.algo)} · ${fmtWatt(it.watt)} · ${ALGO_LABEL[it.algo]}<br/>≈ <b class="${r - cost >= 0 ? 'pos' : 'neg'}">${r - cost >= 0 ? '+' : ''}${fmtUSD(r - cost)}/Tag</b> hier${it.hydro ? ' · nur in Rack/Container' : ''}`; }
      if (it.kind === 'cooling') s = `Kühlt ${fmtWatt(it.cool)} · verbraucht ${fmtWatt(it.watt)}`;
      if (it.kind === 'holder') s = esc(it.desc);
      const left = g.stockLeft(it), sold = left === 0; if (left !== Infinity) s += `<br/><span class="stock ${sold ? 'neg' : ''}">${sold ? 'Kontingent: ' + esc(g.stockText(it)) : `Kontingent: noch ${left} Stück diesen Monat`}</span>`;
      const card = h(`<div class="item ${price > g.s.cash || it.hydro ? 'dis' : ''}" data-price="${price}" ${it.hydro ? 'data-hydro="1"' : ''}><div class="t"><span>${esc(it.name)}${isNew ? '<span class="new">NEU</span>' : ''}</span><span class="p">${this.money(price)}</span></div><div class="s">${s}</div><div class="miss">${price > g.s.cash ? `Dir fehlen ${this.money(price - g.s.cash)}` : ''}</div><button class="btn small primary place" ${price > g.s.cash || it.hydro ? 'disabled' : ''}>Platzieren · ${this.money(price)}</button></div>`);
      try { const url = this.w.thumbnail(it.id); if (url) card.prepend(h(`<div class="thumb"><img alt="" src="${url}"/></div>`)); } catch (e) { /* ohne Vorschau weiter */ }
      if (sold) { card.dataset.sold = '1'; card.classList.add('dis'); card.querySelector('.place').disabled = true; card.addEventListener('click', (e) => { e.stopImmediatePropagation(); this.toast(`${it.name}: ${g.stockText(it)}`, 'bad'); }); }
      card.onclick = () => {
        if (it.hydro) { this.toast('Hydro-Miner nur in Rack oder Container.', 'bad'); return; }
        if (price > g.s.cash) { this.toast('Nicht genug Geld.', 'bad'); return; }
        this.resume(); this.w.startPlacement(it.id);
      };
      list.append(card);
    }
    // Vorschau: was demnächst erscheint (echte Release-Daten)
    const soon = (this.cat === 'rigs' ? [...PLACEABLES.filter((p) => p.cat === 'rigs'), ...PARTS.filter((p) => p.type === 'gpu' || p.type === 'mobo')] : PLACEABLES.filter((p) => p.cat === this.cat))
      .filter((p) => p.releaseDay > g.s.day).sort((a, b) => a.releaseDay - b.releaseDay).slice(0, 3);
    if (soon.length) {
      list.append(h('<div style="font-size:11px;color:#7d8aa0;text-transform:uppercase;letter-spacing:.8px;margin:10px 4px 6px">Demnächst</div>'));
      for (const it of soon) {
        const spec = it.kind === 'device' ? `${fmtHash(it.hash, it.algo)} · ${fmtWatt(it.watt)}` : it.type === 'gpu' ? `${it.vram} GB · ${it.watt} W` : it.type === 'mobo' ? `${it.slots} GPU-Slots` : '';
        list.append(h(`<div class="item dis" style="cursor:default"><div class="t"><span>${esc(it.name)}</span><span class="p" style="color:#7d8aa0">${it.release.slice(5, 7)}/${it.release.slice(0, 4)}</span></div><div class="s">${spec}</div></div>`));
      }
    }
    el.append(list);
  }

  // ---------- Ego-Steuerung: Panels öffnen/schließen ----------
  anyPanelOpen() { return !$('#modal').classList.contains('hidden') || !!this.inspUid || document.body.classList.contains('show-build'); }
  openUI() { this.pause(false); if (this.w.mode === 'play') this.w.setMode('ui'); }
  resume() {
    this.pause(false);
    if (!$('#modal').classList.contains('hidden')) { this.modalKind = null; document.body.dataset.modal = ''; $('#modal').classList.add('hidden'); this.onModalClose?.(); this.onModalClose = null; }
    document.body.classList.remove('show-build', 'show-goals'); this.dock();
    if (this.inspUid) { this.inspUid = null; $('#inspector').classList.add('hidden'); this.w.select(null); }
    this.w.focusObject?.(null); this.pickType = null; this.showRun = false; this.w.ghostPart?.(null);
    const hadLv = !!this.lvQ;
    if (this.lvQ) { const [k, lv] = this.lvQ; this.lvQ = null; this.lvBusy = true; setTimeout(() => this.levelUp(k, lv), 2600); }
    this.flushMsgs?.(hadLv ? 7200 : 3000);
    if (this.w.mode === 'ui' || this.w.mode === 'play') this.w.setMode('play');
  }
  pause(on) {
    this.paused = on;
    $('#pause').classList.toggle('hidden', !on);
    if (on) { $('#clickhint').classList.add('hidden'); this.prompt(null); }
  }
  openInspector(uid) { this.openedAt = performance.now(); if (!this.g.s.flags.seenPc) { this.g.s.flags.seenPc = true; this.g.checkGoals?.(); } this.w.select(uid); this.openUI(); }
  flashCash(u) { const el = $('#st-cash'); if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); if (u > 0) { const f = h(`<div class="cashfly">+${fmtUSD(u)}</div>`); document.body.append(f); setTimeout(() => f.remove(), 1400); } }
  // „Neu freigeschaltet“-Karte mit kurzer Erklärung
  featureCard(f) {
    if (!FEATURES[f]) return;
    (this.featQ ||= []).push(f);
    clearTimeout(this.featT); this.featT = setTimeout(() => this.showFeatures(), 60);
  }
  showFeatures() {
    if (this.w.mode !== 'play' || this.paused || document.getElementById('lvup') || this.lvQ || this.lvBusy || document.querySelector('#toasts .toast.msg')) { clearTimeout(this.featT); this.featT = setTimeout(() => this.showFeatures(), 700); return; }
    const q = this.featQ || []; this.featQ = []; if (!q.length) return;
    this.audio?.message();
    const box = $('#featcards'); box.innerHTML = '';
    const PRIO = ['market', 'build', 'skills', 'speed2', 'autosell', 'rigs', 'company', 'coins', 'cold', 'heat', 'map', 'techs', 'ranking', 'loan', 'buycoins', 'speed3', 'phone'];
    const top = [...q].sort((a, b) => (PRIO.indexOf(a) + 99) % 99 - (PRIO.indexOf(b) + 99) % 99)[0], rest = q.filter((f) => f !== top);
    const el = h(`<div class="featcard"><div class="fc-t">Neu</div><div class="fc-h">${esc(FEATURES[top].title)}</div><div class="fc-b">${FEATURES[top].text}</div>${rest.length && top !== 'market' ? `<div class="fc-more">Außerdem: ${rest.map((f) => esc(FEATURES[f].title)).join(', ')}</div>` : ''}</div>`);
    box.append(el); clearTimeout(this.featHide);
    this.featHide = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 600); }, top === 'market' ? 4000 : 5200);
    this.speedBar(); this.dock(); this.keysHint(); this.sites(); this.goals();
  }
  // Tasten-Hinweise unten rechts: nur, was schon freigeschaltet ist
  keysHint() {
    const g = this.g, el = $('#keys'); if (!el) return;
    const unread = g.s.messages.filter((m) => !m.read).length;
    const ks = [['build', 'B', 'Bauen'], ['market', 'M', 'Börse']].filter(([f]) => g.has(f));
    if (unread) ks.unshift(['phone', 'P', `Handy (${unread})`]);
    if (this.w.facId === 'keller' && this.w.dusty) ks.unshift(['lamp', 'F', this.w.vm?.lampOn ? 'Lampe aus' : 'Taschenlampe']);
    el.innerHTML = ks.map(([, k, l]) => `<span><kbd>${k}</kbd>${l}</span>`).join('') + '<span><kbd>Esc</kbd>Menü</span>';
  }
  toggleBuild() {
    if (document.body.classList.contains('show-build')) { this.resume(); return; }
    this.resume(); document.body.classList.add('show-build'); this.build(true); this.openUI(); this.dock();
  }
  prompt(aim) {
    const el = $('#prompt');
    if (!aim || this.w.mode !== 'play') { el.classList.add('hidden'); return; }
    let html = '';
    if (aim.loose) {
      html = `<kbd>E</kbd>${PNAME[aim.loose]} aufheben`;
    } else if (aim.door) {
      const g0 = this.g, search = g0.s.feat && !g0.s.unlocked.includes('keller') && !g0.s.flags.miningStarted;
      html = `<kbd>E</kbd>${search && this.w.facId === 'keller' ? 'Hoch in dein Zimmer' : search && Object.keys(g0.s.loose || {}).length ? 'Runter in den Keller' : esc(aim.door.label)}`;
    } else if (aim.prop) {
      html = aim.prop.action === 'market' && !this.g.has('market') ? `Monitor · ${this.g.s.flags.miningStarted ? 'Miner läuft' : 'aus'}` : `<kbd>E</kbd>${esc(aim.prop.hint)}`;
    } else {
      const o = this.g.findObj(aim.uid); if (!o) { el.classList.add('hidden'); return; }
      const def = PLACEABLE[o.type], sm = this.g.summary[this.g.facOf(aim.uid)], a = sm?.per.get(aim.uid);
      let line = '';
      if (a && a.units.length) { const rev = a.units.reduce((x, u) => x + u.rev, 0) * sm.throttle; const cost = a.watt / 1000 * 24 * sm.elec; line = `${a.units.filter((u) => u.h).map((u) => fmtHash(u.h * sm.throttle, u.algo)).join(' · ') || 'pausiert'} · <span class="${rev - cost >= 0 ? 'pos' : 'neg'}">${rev - cost >= 0 ? '+' : ''}${fmtUSD(rev - cost)}/Tag</span>`; }
      else if (def.kind === 'cooling') line = `kühlt ${fmtWatt(def.cool)}`;
      const st = { broken: 'Defekt – reparieren', partial: 'Teilweise defekt', psu: 'Netzteil zu schwach', incomplete: 'Teile fehlen – bestücken', empty: '➕ Leer – Geräte einsetzen', idle: 'pausiert (unrentabel)', off: '⏻ aus' }[a?.status];
      const build = o.type === 'tower' && o.parts && !this.g.s.flags.miningStarted, miss = build ? this.g.pcMissing(o).length : 0;
      html = build ? `<kbd>E</kbd>${miss ? 'Teile einbauen' : 'PC einschalten'}<div class="st">${4 - miss} von 4 Teilen eingebaut</div>` : `<kbd>E</kbd>${esc(o.type === 'tower' ? 'Dein PC' : (def.short || def.name.replace(/[-‑]Gehäuse|\s*\(.*\)/g, '')))}${st ? `<div class="st">${st}</div>` : line ? `<div class="ln">${line}</div>` : ''}`;
    }
    el.innerHTML = html; el.classList.remove('hidden');
  }
  useProp(p) {
    if (p.action === 'market') { if (!this.g.has('market')) { this.toast(this.g.s.flags.miningStarted ? 'Noch nichts zu verkaufen – lass den PC arbeiten.' : 'Bau erst deinen PC zusammen.', 'info', 3000); return; } this.market(); }
    else if (p.action === 'company') this.company();
    else if (p.action === 'techs') this.techs();
    else if (p.action === 'ranking') this.ranking();
    else if (p.action === 'sleep') {
      const s = this.g.s;
      if (s.feat && !s.flags.miningStarted) { this.toast('Erst den PC bauen, dann schlafen.', 'info', 2500); return; }
      const vf = this.w.visFrac ?? s.frac;
      if (vf > 0.25 && vf < 0.8) { this.toast('Noch nicht müde – schlafen kannst du ab 19 Uhr.', 'info', 3000); return; }
      this.fade(); const steps = vf >= 0.8 ? 1 : 0; for (let i = 0; i < steps; i++) this.g.advanceDay(); s.frac = 0.29; this.w.visFrac = 0.29;
      this.toast('Guten Morgen!', 'good', 2500);
    }
  }
  // Am Anfang: runter in den verstaubten Keller zum Suchen und wieder hoch
  searchTrip(down) {
    this.fade(); this.resume();
    setTimeout(() => {
      this.w.loadFacility(down ? 'keller' : this.g.s.current); this.visiting = down ? 'keller' : null;
      document.body.classList.toggle('visiting', !!down); this.w.setMode('play'); this.goals(); this.sites(); this.keysHint();
      if (down) this.lampHint = this.toast(this.w.vm?.lampOn ? 'Ganz schön staubig hier unten …' : 'Ganz schön dunkel hier unten. <kbd>F</kbd> schaltet die Taschenlampe an.', 'info', 4500);
    }, 160);
  }
  travel(door) {
    const g = this.g;
    if (g.s.feat && !g.s.unlocked.includes('keller') && !g.s.flags.miningStarted) {
      if (this.w.facId === 'keller') { this.searchTrip(false); return; }
      if (Object.keys(g.s.loose || {}).length) { this.searchTrip(true); return; }
    }
    if (!FACILITIES.some((f) => f.id !== g.s.current && (g.s.unlocked.includes(f.id) || g.canUnlock(f.id)))) { this.toast('Die Tür bleibt erst mal zu.', 'info', 2200); return; }
    const body = h(`<div><h2>${esc(door.label)}</h2><p style="color:var(--dim);margin-top:-6px">Wohin willst du?</p><div class="cards"></div></div>`);
    const cards = body.querySelector('.cards');
    for (const f of FACILITIES) {
      const un = g.s.unlocked.includes(f.id), here = g.s.current === f.id, can = g.canUnlock(f.id);
      if (!un && !can) continue;
      const sm = g.summary[f.id];
      const c = h(`<div class="card"><h3>${here ? '' : ''}${esc(f.name)}</h3><div class="sub">${esc(f.place)}</div>${un && sm ? `<div style="font-size:12px;color:var(--dim)">${fmtWatt(sm.watt)} · ${sm.temp.toFixed(1)} °C · ${g.facObjects(f.id).length} Objekte</div>` : ''}</div>`);
      const b = h(`<button class="btn small ${here ? '' : 'primary'}" style="margin-top:6px">${here ? 'Hierbleiben' : un ? 'Hingehen' : f.cost ? `Übernehmen (${fmtUSD(f.cost)})` : 'Einziehen'}</button>`);
      b.onclick = () => { this.closeModal(); if (here) return; if (!un) { this.unlock(f.id); return; } this.switchSite(f.id); };
      c.append(b); cards.append(c);
    }
    this.openModal(body, 'narrow', 'travel');
  }

  // ---------- Inspektor ----------
  inspect(uid, keep = false) {
    const el = $('#inspector');
    if (uid !== this.inspUid) this.pickType = null;
    this.inspUid = uid;
    if (!uid) { el.classList.add('hidden'); this.pickType = null; this.showRun = false; this.w.focusObject?.(null); this.w.ghostPart?.(null); return; }
    const o = this.g.findObj(uid); if (!o) { el.classList.add('hidden'); this.inspUid = null; return; }
    el.classList.remove('hidden');
    const def = PLACEABLE[o.type], g = this.g;
    this.w.focusObject?.(o.type === 'tower' && o.parts && g.s.chapter === 0 ? uid : null);
    el.innerHTML = `<div class="insp-h"><h3>${esc(o.type === 'tower' ? 'Dein PC' : (def.short || def.name.replace(/[-‑]Gehäuse|\s*\(.*\)/g, '')))}</h3><span id="insp-badge"></span><button class="modal-x insp-x" title="Schließen (E/ESC)">✕</button></div><div id="insp-stats"></div><div id="insp-ctrl"></div>`;
    el.querySelector('.insp-x').onclick = () => this.resume();
    this.inspectStats();
    const c = $('#insp-ctrl');
    if (def.kind === 'rig' && o.parts && o.type === 'tower' && g.s.chapter === 0 && (!g.s.flags.miningStarted || this.showRun)) { c.append(this.pcBuild(o)); return; }
    if ((def.kind === 'rig' || def.kind === 'device' || def.kind === 'holder') && g.has('coins')) {
      const a = g.summary[g.facOf(uid)]?.per.get(uid);
      const sec = h(`<div class="sec"><h4>Coin</h4></div>`);
      const sel = h('<select></select>');
      const hashProf = this.hashProfile(o);
      sel.append(h(`<option value="auto">Auto (profitabelster Coin)</option>`));
      for (const cn of COINS) { if (!g.coinActive(cn.id)) continue; const r = hashProf ? g.revenueFor(hashProf.hash, cn.id, hashProf.vram) : 0; if (!r && cn.id !== o.coin) continue; sel.append(h(`<option value="${cn.id}">${cn.name} (${cn.id}) – ${fmtUSD(r)}/Tag</option>`)); }
      sel.value = o.coin; sel.onchange = () => { o.coin = sel.value; g.dayUpdate(true); };
      sec.append(sel);
      const ms = h(`<select style="margin-top:6px"><option value="auto">Betrieb: Auto (nur wenn profitabel)</option><option value="on">Betrieb: Immer an</option><option value="off">Betrieb: Aus</option></select>`);
      ms.value = o.mode || 'auto'; ms.onchange = () => { o.mode = ms.value; g.dayUpdate(true); this.w.updateStatus(); this.inspectStats(); };
      sec.append(ms); c.append(sec);
    }
    if (def.kind === 'rig') c.append(this.rigSlots(o));
    if (def.kind === 'holder') c.append(this.holderUI(o));
    const row = h('<div class="row sec"></div>');
    const st = g.summary[g.facOf(uid)]?.per.get(uid);
    if (o.broken || (o.items && o.items.some((i) => i.b))) { const rc = g.repairCost(o); const b = h(`<button class="btn good">Reparieren (${fmtUSD(rc)})</button>`); b.onclick = () => { if (!g.repair(uid)) this.toast('Nicht genug Geld.', 'bad'); else this.inspect(uid); }; row.append(b); }
    if (!g.has('build')) { if (row.childElementCount) c.append(row); return; }
    const mv = h('<button class="btn">✥ Verschieben</button>'); mv.onclick = () => { this.resume(); this.w.startPlacement(o.type, uid); }; row.append(mv);
    const rt = h('<button class="btn">⟳ Drehen</button>'); rt.onclick = () => { const r0 = o.rot; o.rot = (o.rot + 1) % 4; if (!this.w.canPlace(def, o.x, o.z, o.rot, uid)) { o.rot = r0; this.toast('Kein Platz zum Drehen.', 'bad'); } this.w.syncObjects(); }; row.append(rt);
    if (def.kind !== 'decor') { const dp = h(`<button class="btn" title="Gleiches Objekt inkl. Teilen noch mal kaufen">⧉ Duplizieren (${fmtUSD(this.g.cloneCost ? this.g.cloneCost(o) : 0)})</button>`); dp.onclick = () => { this.resume(); this.w.startPlacement(o.type, null, o); }; row.append(dp); }
    const sell = h(`<button class="btn danger">Verkaufen (+${fmtUSD(g.objectValue(o))})</button>`); sell.onclick = () => { g.removeObject(uid); this.resume(); }; row.append(sell);
    c.append(row);
  }
  hashProfile(o) {
    const def = PLACEABLE[o.type];
    if (def.kind === 'device') return { hash: { [def.algo]: def.hash }, vram: def.vram || 99 };
    if (def.kind === 'rig') { const a = this.g.analyze({ ...o, broken: false }); return a.units[0] ? { hash: a.units[0].hash, vram: a.units[0].vram } : null; }
    if (def.kind === 'holder') { const a = this.g.analyze({ ...o, items: (o.items || []).map((i) => ({ ...i, b: 0 })) }); return a.units[0] ? { hash: a.units[0].hash, vram: a.units[0].vram } : null; }
    return null;
  }
  inspectStats() {
    const uid = this.inspUid; if (!uid) return;
    const o = this.g.findObj(uid); if (!o) { this.inspect(null); return; }
    const g = this.g, def = PLACEABLE[o.type], facId = g.facOf(uid), sm = g.summary[facId]; if (!sm) return;
    const a = sm.per.get(uid) || g.analyze(o);
    const badge = $('#insp-badge');
    const st = sm.tripped ? ['bad', 'Kein Strom'] : a.status === 'broken' ? ['bad', 'Defekt'] : a.status === 'partial' ? ['warn', 'Teilweise defekt'] : a.status === 'psu' ? ['bad', 'Netzteil zu schwach'] : a.status === 'incomplete' ? ['warn', 'Unvollständig'] : a.status === 'empty' ? ['idle', 'Leer'] : a.status === 'idle' ? ['idle', 'Pausiert (unrentabel)'] : a.status === 'off' ? ['idle', 'Aus'] : def.kind === 'decor' ? ['idle', 'Deko'] : ['ok', sm.throttle < 1 ? 'Läuft (gedrosselt)' : 'Läuft'];
    if (this.showRun && g.s.flags.miningStarted && o.type === 'tower') { if (badge) badge.innerHTML = `<span class="badge ok"><i></i>Läuft</span>`; const se = $('#insp-stats'); if (se) se.innerHTML = ''; return; }
    if (!g.s.flags.miningStarted && def.kind === 'rig' && o.parts) { const n = 4 - g.pcMissing(o).length; if (badge) badge.innerHTML = `<span class="badge ${n === 4 ? 'ok' : 'idle'}"><i></i>${n} / 4 Teile</span>`; const se = $('#insp-stats'); if (se) se.innerHTML = ''; return; }
    if (badge) badge.innerHTML = `<span class="badge ${st[0]}"><i></i>${st[1]}</span>`;
    let rev = 0, hs = [];
    for (const u of a.units) { rev += u.rev * sm.throttle; if (u.idle) hs.push(`<span style="color:var(--dim)">pausiert – wäre ${fmtUSD(u.potential)}/Tag mit ${u.coin ? COIN[u.coin].name : '–'}</span>`); else if (u.coin) hs.push(`${fmtHash(u.h * sm.throttle, u.algo)} → ${COIN[u.coin].name}`); else if (Object.keys(u.hash).length) hs.push('kein lohnender Coin'); if (u.note) hs.push(`<span class="neg">${u.note}</span>`); }
    const cost = (a.watt / 1000) * 24 * sm.elec;
    const rows = [];
    if (a.status === 'off' && (def.kind === 'rig' || def.kind === 'device' || def.kind === 'holder')) {
      // Ausgeschaltet: zeigen, was das Gerät könnte
      const pa = g.analyze({ ...o, mode: 'on' }); let ph = 0, pr = 0, algo = null, coin = null; for (const u of pa.units) { ph += u.h || 0; pr += (u.rev || u.potential || 0); algo ||= u.algo; coin ||= u.coin; }
      if (ph) rows.push(['Rechenleistung', fmtHash(ph, algo)]);
      if (pa.watt) rows.push(['Verbrauch', fmtWatt(pa.watt)]);
      if (pr) { const px = g.price(coin || 'BTC') || 1, cn = pr / px; rows.push(['Ertrag / Tag', `<span class="pos">≈ ${cn >= 10 ? Math.round(cn).toLocaleString('de-DE') : fmtCoin(cn)} ${coin || 'BTC'}</span> <span style="color:var(--dim)">(${fmtUSD(pr)})</span>`]); }
      const el = $('#insp-stats'); if (el) el.innerHTML = `<div class="kv">${rows.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('')}</div>`;
      return;
    }
    if (a.note && a.status !== 'off') rows.push(['Hinweis', `<span class="neg">${esc(a.note)}</span>`]);
    if (hs.length) rows.push(['Leistung', hs.join('<br/>')]);
    if (def.kind !== 'decor' && a.watt > 0) rows.push(['Verbrauch', fmtWatt(a.watt)]);
    if (def.kind === 'cooling') { rows.push(['Kühlleistung', fmtWatt(def.cool)]); rows.push(['Auslastung', `${Math.round((a.util ?? 1) * 100)} %`]); }
    if (sm.elec === 0 && g.s.flags.miningStarted) rows.push(['Strom', '<span class="pos">zahlt Mama</span>']);
    if (a.units.length) { rows.push(['Ertrag / Tag', `<span class="pos">${fmtUSD(rev)}</span>`]); if (cost > 0.005) rows.push(['Strom / Tag', `<span class="neg">−${fmtUSD(cost)}</span>`]); if (cost > 0.005) rows.push(['Gewinn / Tag', `<b class="${rev - cost >= 0 ? 'pos' : 'neg'}">${fmtUSD(rev - cost)}</b>`]); }
    else if (def.kind === 'cooling') rows.push(['Strom / Tag', `<span class="neg">−${fmtUSD(cost)}</span>`]);
    const el = $('#insp-stats'); if (el) el.innerHTML = `<div class="kv">${rows.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('')}</div>`;
  }
  // Erster Mining-PC: Schritt für Schritt zusammenbauen
  pcBuild(o) {
    if (this.pickType) return this.pcPicker(o, this.pickType);
    const g = this.g, s = g.s, p = o.parts, spots = this.w.room?.looseSpots || {};
    const steps = [['mobo', 'Mainboard'], ['cpu', 'Prozessor'], ['gpu', 'Grafikkarte'], ['psu', 'Netzteil']];
    const cur = (t) => (t === 'gpu' ? p.gpus[0] : p[t]);
    const running = s.flags.miningStarted;
    const firstNext = running ? null : steps.map(([t]) => t).find((t) => !cur(t) && s.inv?.includes(t) && !((t === 'cpu' || t === 'gpu') && !p.mobo));
    setTimeout(() => this.w.ghostPart?.(o.uid, firstNext, s.invIds?.[firstNext]), 0);
    const sec = h(`<div class="pcb ${running ? 'running' : ''}"></div>`);
    if (running) sec.append(h(`<div class="pcb-live"><span class="lab">Schon geschürft</span><b id="pcb-live">Miner startet …</b><span class="sub">Dein PC arbeitet jetzt für dich.</span></div>`));
    const partsBox = running ? h('<details class="pcb-parts"><summary>Verbaute Teile (4)</summary></details>') : null; if (partsBox) sec.append(partsBox);
    steps.forEach(([t, lab]) => {
      const id = cur(t), snapping = this.installing && this.installingType === t, it = id ? PART[id] : null, carried = s.inv?.includes(t), lying = s.loose?.[t];
      const needMobo = !it && carried && (t === 'cpu' || t === 'gpu') && !p.mobo;
      const st = it ? 'done' : carried ? (needMobo ? 'wait' : t === firstNext ? 'next' : 'ready') : 'lying';
      const sub = snapping ? 'rastet ein …' : it ? esc(it.name) : carried ? (needMobo ? 'Erst das Mainboard einbauen' : 'In deiner Tasche') : lying ? `Liegt noch im Keller` : '–';
      const row = h(`<div class="pcb-step ${st === 'done' ? 'done' : st === 'next' ? 'next' : st === 'ready' ? 'ready' : 'locked'}"><span class="ic">${partSvg(t)}${it && !snapping ? '<i class="tick"></i>' : ''}</span><div class="tx"><b>${lab}</b><span>${sub}</span></div>${st === 'next' || st === 'ready' ? `<button class="btn small ${st === 'next' ? 'primary' : ''}" ${this.installing ? 'disabled' : ''}>Einbauen</button>` : ''}</div>`);
      const b = row.querySelector('button');
      if (b) { row.onmouseenter = b.onfocus = () => this.w.ghostPart?.(o.uid, t, s.invIds?.[t]); row.onmouseleave = b.onblur = () => this.w.ghostPart?.(o.uid, firstNext, s.invIds?.[firstNext]); }
      if (b) b.onclick = () => {
        if (this.installing) return; this.installing = true; this.installingType = t;
        if (!g.installLoose(o.uid, t)) { this.installing = false; this.flushXp(); return; }
        clearTimeout(this.instT); this.instT = setTimeout(() => { if (this.installing) { this.installing = false; this.flushXp(); if (this.inspUid) this.inspect(this.inspUid); if (this.afterSnap) { this.toast(this.afterSnap, 'good', 2600); this.afterSnap = null; } } }, 1600); this.w.ghostPart?.(null); this.inspect(o.uid); this.w.animateInstall?.(o.uid, t);
        this.afterSnap = g.pcReady(o) ? 'Alle Teile sind drin. Schalt deinen PC ein!' : `${lab} eingebaut`;
      };
      (partsBox || sec).append(row);
    });
    if (!running) {
      // Live-Vorschau: was der PC mit den eingebauten Teilen schafft
      const hs = [p.cpu, ...p.gpus].filter(Boolean).reduce((a, id) => a + (PART[id].hash.sha256 || 0), 0), watt = g.rigWatt(o);
      const rev = hs ? g.revenueFor({ sha256: hs }, 'BTC', 99) : 0, px = g.price('BTC') || 1;
      const rows = [['Rechenleistung', hs ? fmtHash(hs, 'sha256') : '–'], ['Verbrauch', !g.partIds(o).length ? '–' : p.psu ? `${watt} W von ${PART[p.psu].cap} W` : `${watt} W`], ['Ertrag / Tag', rev ? `<span class="pos">≈ ${Math.round(rev / px).toLocaleString('de-DE')} BTC</span> <span style="color:var(--dim)">(${fmtUSD(rev)})</span>` : '–']];
      if (g.pcReady(o) || s.flags.pcBuilt) sec.append(h(`<div class="kv pcb-sum">${rows.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('')}</div>`));
      const ready = g.pcReady(o), miss = g.pcMissing(o).length;
      const on = h(`<div class="sec start"><button class="btn primary big wide ${ready ? 'glow' : ''}" ${ready && !this.installing ? '' : 'disabled'}><span class="bi"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/></svg></span><span class="bt">PC einschalten</span></button>${ready ? '' : `<div class="pcb-left">Noch ${miss} ${miss === 1 ? 'Teil' : 'Teile'} bis zum Einschalten</div>`}</div>`);
      on.querySelector('button').onclick = () => this.powerOnSequence(o);
      sec.append(on);
    } else {
      const bp = this.w.bootPending; const done = h(`<div class="sec start two"><button class="btn big ${bp ? 'primary glow' : ''}">Zum Monitor</button><button class="btn big ${bp ? '' : 'primary'}">Ins Zimmer</button></div>`); const [bm, bw] = done.querySelectorAll('button'); bm.onclick = () => { bm.classList.remove('glow', 'primary'); bw.classList.add('primary'); const mon = this.w.focusUid == null; if (mon) { this.w.focusObject?.(o.uid); bm.textContent = 'Zum Monitor'; } else { this.w.focusMonitor?.(); bm.textContent = 'Zum PC'; } }; bw.onclick = () => this.resume(); sec.append(done);
    }
    return sec;
  }
  // Der große Moment: Lüfter laufen an, Monitor bootet, erste Coins
  powerOnSequence(o) {
    const g = this.g; if (!g.startMining(o.uid)) return;
    const w0 = g.s.wallet.BTC; this.btcAtStart = w0.ex + w0.cold; this.slowUntil = performance.now() + 9000;
    this.audio?.powerOn(); this.w.powerOn?.(o.uid); this.showRun = true; this.inspect(o.uid);
  }
  firstPicker(o, type) { this.pickType = type; this.inspect(o.uid); }
  // Teile-Auswahl direkt im Inspektor (das Gehäuse bleibt links sichtbar)
  pcPicker(o, type) {
    const g = this.g, p = o.parts;
    const names = { mobo: 'Mainboard', cpu: 'Prozessor', psu: 'Netzteil', gpu: 'Grafikkarte' };
    const hints = { mobo: 'Auf das Mainboard kommt alles drauf.', cpu: 'Steuert den PC. Fürs Mining reicht ein günstiger.', gpu: 'Rechnet beim Mining. Sie bestimmt, wie viel du schürfst.', psu: 'Muss genug Watt für alle Teile liefern.' };
    const tipWhy = { mobo: 'Passt', cpu: 'Günstig, reicht völlig', gpu: 'Beste Leistung pro $', psu: 'Reicht und ist günstig' };
    const cur = type === 'gpu' ? p.gpus[0] : p[type], refund = cur ? g.itemPrice(PART[cur]) : 0, reserve = g.buildReserve(o, type);
    const avail = g.s.cash + refund - reserve, need = g.rigWatt(o) - (cur && type !== 'psu' ? PART[cur].watt || 0 : 0), px = g.price('BTC') || 1;
    const list = g.partList(type).sort((a, b) => g.itemPrice(a) - g.itemPrice(b));
    const whyNot = (it) => (type === 'psu' && it.cap < need ? `Zu schwach (${need} W nötig)` : g.itemPrice(it) - refund > g.s.cash ? 'Zu teuer' : g.itemPrice(it) > avail ? 'Dann fehlt Geld für den Rest' : '');
    const ok = list.filter((it) => !whyNot(it) || it.id === cur), no = list.filter((it) => whyNot(it) && it.id !== cur);
    const tip = type === 'gpu' ? ok.filter((it) => it.id !== cur).sort((a, b) => (b.hash.sha256 || 0) / g.itemPrice(b) - (a.hash.sha256 || 0) / g.itemPrice(a))[0] : ok.find((it) => it.id !== cur);
    const body = h(`<div class="pick1"><button class="pk-back" title="Zurück">‹ Zurück</button><h3>${names[type]} wählen</h3><p class="pk-hint">${hints[type]}</p><div class="pk-budget"><span>Budget</span><b>${this.money(Math.max(0, avail))}</b>${reserve ? `<small>+ ${this.money(reserve)} für den Rest</small>` : ''}</div><div class="pk-list"></div></div>`);
    body.querySelector('.pk-back').onclick = () => { this.pickType = null; this.inspect(o.uid); };
    const box = body.querySelector('.pk-list');
    const card = (it, why) => {
      const price = g.itemPrice(it); let chips = [];
      if (type === 'gpu' || type === 'cpu') { const hs = it.hash.sha256 || 0, r = hs ? g.revenueFor({ sha256: hs }, 'BTC', 99) : 0; chips = [fmtHash(hs, 'sha256'), `${it.watt} W`, `≈ ${Math.round(r / px).toLocaleString('de-DE')} BTC / Tag`]; }
      if (type === 'mobo') chips = [`${it.slots} Grafikkarten-Plätze`];
      if (type === 'psu') chips = [`${it.cap} W`, it.cap >= need ? `reicht für ${need} W` : ''].filter(Boolean);
      const isCur = it.id === cur, isTip = it === tip;
      const c = h(`<div class="pk-card ${isCur ? 'cur' : ''} ${why ? 'dis' : ''} ${isTip ? 'tip' : ''}"><div class="pk-top"><b>${esc(it.name)}</b><span class="pk-price">${this.money(price)}</span></div><div class="chips">${chips.map((x) => `<span>${x}</span>`).join('')}</div><div class="pk-bot"><span class="${why ? 'why' : isTip ? 'tipw' : 'note'}">${why || (isCur ? 'Eingebaut' : isTip ? '★ ' + tipWhy[type] : '')}</span>${why || isCur ? '' : `<button class="btn small ${isTip ? 'primary' : ''}">${cur ? 'Tauschen' : 'Einbauen'}</button>`}</div></div>`);
      const b = c.querySelector('button');
      if (b) b.onclick = () => {
        if (!g.setPart(o.uid, type, it.id, 0)) { this.toast('Nicht genug Geld.', 'bad'); return; }
        this.pickType = null; this.inspect(o.uid); this.w.animateInstall?.(o.uid, type);
        this.toast(g.pcReady(o) ? 'Alle Teile sind drin. Schalt deinen PC ein!' : `${names[type]} eingebaut`, 'good', 3000);
      };
      return c;
    };
    for (const it of ok) box.append(card(it, ''));
    if (no.length) { const d = h(`<details class="pk-more"><summary>Nicht verfügbar (${no.length})</summary></details>`); for (const it of no) d.append(card(it, whyNot(it))); box.append(d); }
    return body;
  }
  rigSlots(o) {
    const g = this.g, p = o.parts;
    const sec = h('<div class="sec pcb"><h4>Komponenten</h4></div>');
    const slot = (t, lab, id, onClick) => { const it = id ? PART[id] : null; const e = h(`<div class="pcb-step ${it ? 'done' : 'free'}"><span class="ic">${partSvg(t)}</span><div class="tx"><b>${lab}</b><span>${it ? esc(it.name) : 'frei'}</span></div><button class="btn small ${it ? '' : 'primary'}">${it ? 'Tauschen' : 'Einbauen'}</button></div>`); e.querySelector('button').onclick = onClick; sec.append(e); };
    slot('mobo', 'Mainboard', p.mobo, () => this.partPicker(o, 'mobo'));
    slot('cpu', 'Prozessor', p.cpu, () => this.partPicker(o, 'cpu'));
    const cap = g.rigGpuCap(o);
    for (let i = 0; i < cap; i++) slot('gpu', `Grafikkarte ${i + 1}`, p.gpus[i], () => this.partPicker(o, 'gpu', Math.min(i, p.gpus.length)));
    slot('psu', 'Netzteil', p.psu, () => this.partPicker(o, 'psu'));
    if (p.psu) { const watt = g.rigWatt(o), capW = PART[p.psu].cap; sec.append(h(`<div class="pcb-load"><span>Netzteil-Last</span><div class="bar"><div style="width:${Math.min(100, watt / capW * 100)}%;background:${watt > capW ? '#ff8f84' : 'var(--acc)'}"></div></div><span>${watt} / ${capW} W</span></div>`)); }
    if (!p.mobo || !p.cpu || !p.psu) { const b = h(`<button class="btn primary small">Basis-Teile einbauen</button>`); b.onclick = () => { const r = g.quickBase(o.uid); if (!r) this.toast('Nicht genug Geld.', 'bad'); this.inspect(o.uid); }; sec.append(b); }
    return sec;
  }
  bestGpu() {
    const g = this.g; let best = null, bv = -Infinity; const elec = g.elecPrice(g.s.current);
    for (const it of g.partList('gpu')) { const c = g.bestCoin(it.hash, it.vram); const r = c ? g.revenueFor(it.hash, c, it.vram) : 0; const v = (r - it.watt / 1000 * 24 * elec) / Math.max(50, g.itemPrice(it)); if (v > bv) { bv = v; best = it; } }
    return best;
  }
  partPicker(o, type, idx = 0) {
    const g = this.g, elec = g.elecPrice(g.facOf(o.uid));
    const cur = type === 'gpu' ? o.parts.gpus[idx] : o.parts[type];
    const names = { mobo: 'Mainboard', cpu: 'Prozessor', psu: 'Netzteil', gpu: 'Grafikkarte' };
    const body = h(`<div><h2>${names[type]} wählen</h2><div class="list"></div></div>`);
    const list = body.querySelector('.list');
    if (cur) { const rm = h(`<div class="picker-row cur"><div><b>${esc(PART[cur].name)}</b><div class="s">eingebaut</div></div><div></div><button class="btn small danger">Ausbauen (+${fmtUSD(g.itemPrice(PART[cur]) * 0.5)})</button></div>`); rm.querySelector('button').onclick = () => { g.setPart(o.uid, type, null, idx); this.closeModal(); this.inspect(o.uid); }; list.append(rm); }
    const parts = g.partList(type);
    const bestId = type === 'gpu' ? this.bestGpu()?.id : null;
    for (const it of parts) {
      let s = `ab ${it.release.slice(0, 4)}`;
      if (type === 'gpu' || type === 'cpu') {
        const c = g.bestCoin(it.hash, it.vram || 99); const r = c ? g.revenueFor(it.hash, c, it.vram || 99) : 0; const cost = it.watt / 1000 * 24 * elec;
        const algos = Object.entries(it.hash).map(([a, v]) => `${ALGO_LABEL[a]} ${fmtHash(v, a)}`).slice(0, 3).join(' · ');
        s = `${it.watt} W${it.vram ? ` · ${it.vram} GB` : ''} · ${algos}<br/>Allein: ${c ? `<b class="${r - cost >= 0 ? 'pos' : 'neg'}">${fmtUSD(r - cost)}/Tag</b> mit ${COIN[c].name}` : 'kein lohnender Coin'}`;
      }
      if (type === 'psu') s = `${it.cap} W Kapazität`;
      if (type === 'mobo') s = `${it.slots} GPU-Slots (Rahmen: max. ${PLACEABLE[o.type].maxGpu})`;
      const price = g.itemPrice(it);
      const row = h(`<div class="picker-row ${it.id === cur ? 'cur' : ''}"><div><b>${esc(it.name)}</b>${it.id === bestId ? ' <span class="new">BESTER WERT</span>' : ''}${price > g.s.cash ? ' <span style="color:#ff6b6b;font-size:11px">zu teuer</span>' : ''}<div class="s">${s}</div></div><div class="p" style="color:#ffb000;font-weight:700">${fmtUSD(price)}</div><button class="btn small primary" ${price > g.s.cash ? 'disabled' : ''}>${cur ? 'Tauschen' : 'Kaufen'}</button></div>`);
      row.querySelector('button').onclick = () => {
        const revOf = () => { const sm = g.summary[g.facOf(o.uid)], a = sm?.per.get(o.uid); return a ? a.units.reduce((x, u) => x + u.rev, 0) * sm.throttle : 0; };
        const before = revOf();
        let ps = null, extra = 0;
        if (type === 'gpu' && o.parts.psu) {
          const oldW = cur ? PART[cur].watt || 0 : 0, add = (it.watt || 0) - oldW, n = g.psuCount(o);
          if (g.rigWatt(o) + add > PART[o.parts.psu].cap * n) { ps = g.fitPsu(o, add); extra = g.itemPrice(ps) * n - Math.round(g.itemPrice(PART[o.parts.psu]) * 0.5 * n); }
        }
        if (g.s.cash < price + extra) { this.toast(ps ? `Dafür brauchst du auch ein stärkeres Netzteil (+${fmtUSD(extra)}).` : 'Nicht genug Geld.', 'bad'); return; }
        if (!g.setPart(o.uid, type, it.id, idx)) { this.toast('Nicht genug Geld.', 'bad'); return; }
        if (ps && ps.id !== o.parts.psu) g.setPart(o.uid, 'psu', ps.id);
        this.closeModal(); this.inspect(o.uid);
        const after = revOf(); this.audio?.powerOn(); this.w.pulse?.(o.uid);
        if (after > before + 0.005) this.toast(`Eingebaut · ${fmtUSD(before)} → <b>${fmtUSD(after)}</b> pro Tag${ps ? ' (mit neuem Netzteil)' : ''}`, 'good', 4500);
      };
      list.append(row);
    }
    this.openModal(body, 'narrow');
  }
  holderUI(o) {
    const g = this.g, def = PLACEABLE[o.type];
    const sec = h(`<div class="sec"><h4>Bestückung ${o.items.length} / ${def.slots}</h4></div>`);
    const groups = {};
    o.items.forEach((it) => { (groups[it.id] ||= { n: 0, b: 0 }); groups[it.id].n++; if (it.b) groups[it.id].b++; });
    for (const [id, gr] of Object.entries(groups)) {
      const d = PLACEABLE[id];
      const r = h(`<div class="slot filled"><span class="nm">${gr.n}× ${esc(d.name)}${gr.b ? ` <span class="neg">(${gr.b} defekt)</span>` : ''}</span><button class="btn small danger">Alle verkaufen</button></div>`);
      r.querySelector('button').onclick = (e) => { e.stopPropagation(); g.holderSellAll(o.uid, id); this.inspect(o.uid); };
      sec.append(r);
    }
    if (o.items.length < def.slots) {
      const devs = g.shopList('asic', g.facOf(o.uid)).filter((d) => def.id !== 'shelf' || !d.hydro).sort((a, b) => b.releaseDay - a.releaseDay);
      const sel = h('<select style="margin-top:6px"></select>');
      for (const d of devs) { const p = g.itemPrice(d); const r = g.revenueFor({ [d.algo]: d.hash }, g.bestCoin({ [d.algo]: d.hash }, d.vram || 99) || 'BTC', d.vram || 99) - d.watt / 1000 * 24 * g.elecPrice(g.facOf(o.uid)); const left = g.stockLeft(d); sel.append(h(`<option value="${d.id}" ${left === 0 ? 'disabled' : ''}>${esc(d.name)} – ${fmtUSD(p)} (${r >= 0 ? '+' : ''}${fmtUSD(r)}/Tag)${left === 0 ? ' · ' + g.stockText(d) : left !== Infinity ? ` · noch ${left} diesen Monat` : ''}</option>`)); }
      if (sel.selectedOptions[0]?.disabled) { const ok = [...sel.options].find((x) => !x.disabled); if (ok) sel.value = ok.value; }
      sec.append(sel);
      const row = h('<div class="row"></div>');
      const others = g.facObjects(g.facOf(o.uid)).filter((x) => x.type === o.type && x.items.length < def.slots);
      if (others.length > 1) { const ab = h(`<button class="btn small good" style="margin-top:6px">Alle ${others.length} ${esc(def.name.split(' (')[0])} hier auffüllen</button>`); ab.onclick = () => { let k = 0; for (const x of others) k += g.holderAdd(x.uid, sel.value, def.slots); this.toast(k ? `${k}× ${esc(PLACEABLE[sel.value].name)} eingesetzt` : 'Nicht genug Geld.', k ? 'good' : 'bad', 3000); this.inspect(o.uid); }; sec.append(ab); }
      for (const n of [1, 5, 25, 'max']) { if (n !== 'max' && n > def.slots) continue; const b = h(`<button class="btn small ${n === 'max' ? 'primary' : ''}">${n === 'max' ? 'Auffüllen' : '+' + n}</button>`); b.onclick = () => { const k = g.holderAdd(o.uid, sel.value, n === 'max' ? def.slots : n); if (!k) this.toast('Nicht genug Geld oder kein Platz.', 'bad'); else this.toast(`${k}× ${PLACEABLE[sel.value].name} eingesetzt`, 'good', 2500); this.inspect(o.uid); }; row.append(b); }
      sec.append(row);
      if (!devs.length) sec.append(h('<div class="empty">Keine passenden Geräte im Handel.</div>'));
    }
    return sec;
  }

  // ---------- Ziele ----------
  goals() {
    const el = $('#goals'), g = this.g, s = g.s;
    const ch = CHAPTERS[s.chapter];
    el.innerHTML = '';
    // Freischaltbarer Standort: eine Zeile
    const fu = FACILITIES.find((f) => g.canUnlock(f.id));
    if (fu) { const b = h(`<div class="goal next"><div class="ck"></div><div>${esc(fu.short)} ist frei · geh durch die Tür</div></div>`); el.append(b); return; }
    if (!ch) { el.append(h(`<div class="goal"><div class="ck"></div><div>Endlosmodus · wachs weiter</div></div>`)); return; }
    const nDone = ch.goals.filter((go) => s.goals[go.id]).length;
    let shown = 0;
    for (const go of ch.goals) {
      const done = !!s.goals[go.id];
      if (done || shown >= 1) continue; shown++;
      let prog = '';
      if (!done && go.progress && !(go.id === 'pcbuild' && this.w.facId === 'keller')) { const [cur, tgt, kind] = go.progress(s, g.helpers()); if (kind === 'parts') { const lp = this.lastPick && performance.now() - this.lastPick.at < 1200 ? `<span class="lastpick">+ ${PNAME[this.lastPick.t]}</span>` : ''; prog = `<span class="cnt">${cur} / ${tgt}</span>${lp}`; } else { const f = (v) => (kind === 'hash' ? fmtHash(v) : fmtUSD(v)); const pc = Math.max(0, Math.min(100, tgt ? (cur / tgt) * 100 : 0)); prog = `<div style="font-size:11px;color:var(--dim)">${f(Math.max(0, cur))} / ${f(tgt)}</div><div class="bar" style="width:180px"><div style="width:${pc}%;background:#ffb000"></div></div>`; } }
      const gk = s.chapter + ':' + go.id, enter = gk !== this.goalKey; this.goalKey = gk;
      const bag = s.loose && !s.flags.miningStarted && go.id === 'collect' ? `<span class="bag">${['mobo', 'cpu', 'gpu', 'psu'].map((t) => `<i class="${s.loose[t] ? 'miss' : 'got'}" title="${PNAME[t]}${s.loose[t] ? ' – noch nicht gefunden' : ' – eingesammelt'}">${partSvg(t, 16)}${s.loose[t] ? '' : '<b class="tk"></b>'}<em>${{ mobo: 'Board', cpu: 'CPU', gpu: 'GPU', psu: 'Netzteil' }[t]}</em></i>`).join('')}</span>` : '';
      const gtext = go.id === 'sell' && !g.has('market') ? 'Lass deinen PC ein paar Tage schürfen' : go.id === 'pcbuild' && this.w.facId === 'keller' ? 'Alle 4 Teile gefunden · zurück ins Zimmer' : go.text;
      const row = h(`<div class="goal ${done ? 'done' : ''} ${enter ? 'enter' : ''}"><div class="ck">${done ? '✓' : ''}</div><div>${bag ? `<div class="goal-line">${esc(gtext)}${prog}</div>${bag}` : `${esc(gtext)}${prog}`}</div></div>`);
      if (!done && go.action) { const b = h(`<button class="btn small primary"><kbd>G</kbd>${esc(go.action.label)}</button>`); b.disabled = !g.canPayGoal(go); b.onclick = () => { if (g.goalAction(go)) { this.toast('✔ Erledigt!', 'good'); this.goals(); } }; row.lastElementChild.append(h('<br/>'), b); }
      el.append(row);
    }
    const allDone = ch.goals.every((go) => s.goals[go.id]);
    if (allDone && s.day < toDay(ch.minDate)) el.append(h(`<div class="goal"><div class="ck"></div><div>Weiter ab ${fmtDate(toDay(ch.minDate))}</div></div>`));
  }
  // Taste G: nächste Ziel-Aktion (z. B. Papa die Stromrechnung geben) – in der Ego-Steuerung ohne Mausklick
  goalActionKey() {
    const s = this.g.s, ch = CHAPTERS[s.chapter]; if (!ch) return false;
    const go = ch.goals.find((x) => !s.goals[x.id] && x.action);
    if (!go) { this.toast('Nichts zu bezahlen.', 'info', 2000); return false; }
    if (!this.g.canPayGoal(go)) { this.toast(`Du brauchst ${fmtUSD(go.action.cost)}.`, 'bad'); return false; }
    if (this.g.goalAction(go)) { this.toast(`✔ ${esc(go.action.label)} – erledigt!`, 'good'); this.audio?.cash(); this.goals(); this.top(); return true; }
    return false;
  }
  // Schritt-für-Schritt-Hinweise (oben in der Mitte)
  tutorial() {
    const el = $('#tut'); if (!el) return;
    if (this.g.s.feat) { el.classList.add('hidden'); return; }
    const g = this.g, s = g.s; let t = '';
    if (s.chapter === 0) {
      const btc = s.wallet.BTC.ex;
      if (!s.flags.miningStarted) t = this.inspUid ? 'Klick auf <b>Mining starten</b>.' : 'Dein PC steht neben dem Schreibtischstuhl. Geh hin, schau ihn an und drück <kbd>E</kbd>.';
      else if (!g.has('market')) t = this.inspUid ? 'Dein PC schürft jetzt Bitcoin. Schließ das Fenster mit <kbd>E</kbd> und lass ihn ein paar Tage arbeiten.' : 'Dein PC schürft Bitcoin. Lass ihn ein paar Tage arbeiten, bis sich etwas angesammelt hat …';
      else if (!(s.stats.sold > 0)) t = this.modalKind === 'market' ? 'Klick auf <b>Alles verkaufen</b>.' : `Du hast ${fmtCoin(btc)} BTC. Geh zum <b>PC-Monitor</b> auf dem Schreibtisch und drück <kbd>E</kbd>, um sie zu verkaufen.`;
      else if (!s.flags.boughtGpu) t = this.inspUid ? 'Klick auf den <b>freien GPU-Slot</b> und kauf eine zweite Grafikkarte.' : 'Mehr Grafikkarten = mehr Bitcoin. Schau deinen PC an (<kbd>E</kbd>) und bau eine zweite Karte ein.';
      else if (!s.goals.earn) t = 'Lass den PC arbeiten (Tempo mit <kbd>1</kbd> <kbd>2</kbd>) und verkauf regelmäßig am Monitor. Ziel: 1.000 $ verdient.';
    }
    if (!t) {
      const ch = CHAPTERS[s.chapter], go = ch && ch.goals.find((x) => !s.goals[x.id] && x.action);
      const rest = ch && ch.goals.filter((x) => !s.goals[x.id] && !x.action).length;
      if (go && !rest) t = s.cash >= go.action.cost ? `Drück <b>G</b>: ${esc(go.action.label)}.` : `Spare für „${esc(go.action.label)}“ – ${fmtUSD(s.cash)} / ${fmtUSD(go.action.cost)}.`;
    }
    if (!t && FACILITIES.some((f) => g.canUnlock(f.id))) t = 'Ein neuer Standort ist frei: Geh zur <b>Tür</b>, schau sie an und drück <b>E</b>.';
    if (!t && s.chapter === 1 && !s.goals.openrig) t = 'Drück <b>B</b> → Rigs: Stell eine <b>Milchkiste</b> auf. Dann anschauen, <b>E</b> und bestücken (Mainboard, CPU, Netzteil, GPUs).';
    if (!t) { const ch = CHAPTERS[s.chapter], go = ch && ch.goals.find((x) => !s.goals[x.id]); if (go) t = `Nächstes Ziel: ${esc(go.text)}`; }
    if (el.dataset.t !== t) { el.dataset.t = t; el.innerHTML = t; el.classList.toggle('hidden', !t); if (t) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } }
  }
  unlock(id) {
    const f = FACILITY[id];
    if (!this.g.unlockFacility(id)) { this.toast(`Du brauchst ${fmtUSD(f.cost)}.`, 'bad'); return; }
    this.switchSite(id);
    const ci = CHAPTERS.findIndex((c) => c.unlock === id);
    const next = CHAPTERS[ci + 1];
    this.story(next?.title || f.name, `${next?.intro || ''}<br/><br/><b>${esc(f.name)}</b> – ${esc(f.place)}<br/>${f.w} × ${f.d} m · ${f.power[0].kw.toLocaleString('de-DE')} kW Anschluss${f.rent ? ` · Miete ${fmtUSD(f.rent)}/Monat` : ''}<br/><i>${esc(f.desc)}</i><br/><br/><b>${Math.round((f.w * f.d) / 14).toLocaleString('de-DE')}×</b> so groß wie dein Kinderzimmer · <b>${Math.round(f.power[0].kw / 1.8).toLocaleString('de-DE')}×</b> so viel Strom.`);
  }

  // ---------- Dock ----------
  dock() {
    const el = $('#dock'), g = this.g;
    const unread = g.s.messages.filter((m) => !m.read).length + (g.s.ev?.open ? 1 : 0);
    const techN = TECHS.filter((t) => !(g.s.techs || {})[t.id] && g.techAvailable(t) && g.s.cash >= t.cost).length;
    el.innerHTML = '';
    const btns = [
      ['', 'Bauen', 'B', () => this.toggleBuild()], ['', 'Börse', 'M', () => this.market()], ['', 'Handy', 'P', () => this.phone(), unread], ['', 'Firma', 'C', () => this.company()],
      ['', 'Technik', 'T', () => this.techs(), techN], ['', 'Rangliste', 'L', () => this.ranking()], ['', 'Fähigkeiten', 'J', () => this.skills()], ['', this.w.empire ? 'Zurück' : 'Karte', 'K', () => this.toggleMap()], ['', 'Menü', 'ESC', () => this.menu()],
    ];
    const need = { B: 'build', M: 'market', P: 'phone', C: 'company', T: 'techs', L: 'ranking', K: 'map', J: 'skills' };
    const act = document.body.classList.contains('show-build') ? 'B' : this.w.empire ? 'K' : ({ market: 'M', phone: 'P', intro: 'P', company: 'C', techs: 'T', ranking: 'L', menu: 'ESC', skills: 'J' })[this.modalKind] || (this.paused ? 'ESC' : null);
    for (const [ic, l, key, fn, b] of btns.filter((x) => !need[x[2]] || g.has(need[x[2]]))) { const e = h(`<button class="${act === key ? 'on' : ''}" title="${l} (${key})"><span class="ic">${ic}</span>${l}<span class="key">${key}</span>${b ? `<span class="bdg">${b}</span>` : ''}</button>`); e.onclick = fn; el.append(e); }
  }
  toggleMap() {
    if (this.w.empire) { this.w.hideEmpire(); this.pause(false); this.w.setMode('play'); }
    else { this.resume(); this.w.showEmpire(); }
  }

  // ---------- Modals ----------
  openModal(node, cls = '', kind = null) { document.getElementById('lvup')?.remove(); this.openUI(); const m = $('#modal'); m.classList.remove('hidden'); const card = m.querySelector('.modal-card'); card.className = 'modal-card ' + cls; const b = m.querySelector('.modal-body'); b.innerHTML = ''; b.append(node); this.modalKind = kind; document.body.dataset.modal = kind || ''; this.dock(); }
  closeModal() { const wasEvent = this.modalKind === 'event'; $('#modal').classList.add('hidden'); this.modalKind = null; document.body.dataset.modal = ''; this.dock(); const cb = this.onModalClose; this.onModalClose = null; cb?.(); if (wasEvent && this.g.s.ev?.open) this.evSnooze = this.g.s.ev.open.key; else if (this.g.s.ev?.open) setTimeout(() => this.tryEvent(), 500); if (!this.inspUid && !document.body.classList.contains('show-build') && $('#modal').classList.contains('hidden') && (this.w.mode === 'ui')) this.w.setMode('play'); }
  // Spielstart: Nachricht von Deniz – Bitcoin gibt es jetzt, dein PC kann das. Mit Kurs.
  introPhone(onClose) {
    const g = this.g, s = g.s, p = g.price('BTC');
    const m0 = s.messages.find((m) => m.id === 'm0');
    const txt = m0 ? m0.text : MESSAGES.find((m) => m.id === 'm0').text;
    const body = h(`<div class="intro-phone"><div class="ip-date">${fmtDate(s.day)}</div>
      <div class="phone"><div class="ph-top"><div class="av"><svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="20" fill="#ffcf8a"/><path d="M6 40c1-8 7-12 14-12s13 4 14 12z" fill="#e2574c"/><circle cx="20" cy="18" r="8.5" fill="#e7b48f"/><path d="M11 17c0-7 5-10 10-10 6 0 9 4 8 9-3-3-7-4-11-3-3 1-5 2-7 4z" fill="#2f241e"/><circle cx="17" cy="19" r="1.1" fill="#2f241e"/><circle cx="23" cy="19" r="1.1" fill="#2f241e"/><path d="M17 22.5q3 2.2 6 0" stroke="#8a4a3a" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg></div><div><b>Deniz</b><span class="on">online</span></div></div>
        <div class="msg f-Deniz">${esc(txt)}</div>
        <div class="msg f-Deniz">Deine alten PC-Teile liegen doch noch irgendwo im Keller. Geh runter und such sie zusammen!<div class="pc-line"><span class="pc-dot">₿</span><span>Bitcoin gerade</span><b>${fmtUSD(p)}</b><canvas class="spark"></canvas></div></div>
        <div class="row ip-act"><button class="btn primary big">Ab in den Keller</button></div>
      </div></div>`);
    if (m0) m0.read = true;
    body.querySelector('button').onclick = () => { this.closeModal(); if (s.feat && Object.keys(s.loose || {}).length && this.w.facId !== 'keller') this.searchTrip(true); };
    this.onModalClose = onClose;
    this.openModal(body, 'narrow', 'intro');
    requestAnimationFrame(() => this.chart(body.querySelector('canvas.spark'), 'BTC', 120, true));
  }
  story(title, html, btn = 'Los geht’s') {
    const n = h(`<div class="story"><div class="ch">${esc(title)}</div><p>${html}</p><div class="row" style="justify-content:flex-end"><button class="btn primary">${btn}</button></div></div>`);
    n.querySelector('button').onclick = () => this.closeModal();
    this.openModal(n, 'narrow', 'story');
  }

  market(update = false) {
    const g = this.g, s = g.s;
    if (update && this.modalKind !== 'market') return;
    const body = h(`<div><h2>Börse</h2><div class="grid2 ${g.has('coins') ? '' : 'single'}"><div class="coins"></div><div class="detail"></div></div></div>`);
    const list = body.querySelector('.coins');
    let total = 0;
    for (const c of COINS) {
      if (!g.has('coins') && c.id !== 'BTC') continue;
      const p = g.price(c.id), p30 = g.price(c.id, s.day - 30), w = s.wallet[c.id]; const val = (w.ex + w.cold) * p; total += val;
      const started = s.day >= c.start;
      const ch = p30 ? (p / p30 - 1) * 100 : 0;
      const row = h(`<div class="coin ${this.marketCoin === c.id ? 'on' : ''} ${started ? '' : 'inactive'}"><div class="dot" style="background:${c.color}">${c.id}</div><div class="nm">${c.name}<small>${started ? `${fmtCoin(w.ex + w.cold)} ${c.id} · ${fmtUSD(val)}` : `Start ${fmtDate(c.start)}`}</small></div><div class="pr">${started ? fmtUSD(p) : '—'}<small class="${ch >= 0 ? 'pos' : 'neg'}">${started ? `${ch >= 0 ? '+' : ''}${ch.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %` : ''}</small></div></div>`);
      row.onclick = () => { this.marketCoin = c.id; this.market(); };
      list.append(row);
    }
    if (g.has('coins')) list.append(h(`<div style="padding:8px 10px;color:var(--dim);font-size:13px">Gesamt: <b style="color:#fff">${fmtUSD(total)}</b></div>`));
    const sa = h(`<button class="btn small" style="margin:4px 10px">Alle Coins verkaufen</button>`); sa.onclick = () => { const u = g.sellAll(); this.audio?.cash(); this.toast(`Alles verkauft: ${fmtUSD(u)}`, 'good', 3000); this.market(); }; if (g.has('coins')) list.append(sa);
    const pc = h(`<label style="display:flex;gap:8px;align-items:center;padding:4px 10px;font-size:13px"><input type="checkbox" ${s.payoutCold ? 'checked' : ''}/> Neue Coins in die Cold-Wallet</label>`);
    pc.querySelector('input').onchange = (e) => { s.payoutCold = e.target.checked; };
    if (g.has('cold')) list.append(pc);
    const c = COIN[this.marketCoin], w = s.wallet[c.id], p = g.price(c.id);
    const det = body.querySelector('.detail');
    det.append(h(`<div class="mk-head"><span class="cdot" style="background:${c.color}">${c.id === 'BTC' ? '₿' : c.id.slice(0, 1)}</span><h3>${c.name} <span class="tk">${c.id}</span></h3><div class="px">${fmtUSD(p)}</div></div>`));
    const hp = g.coinActive(c.id) ? g.revPerHash(c.id) : 0; const hpUnit = c.algo(s.day) === 'sha256' ? [1e12, 'TH/s'] : c.algo(s.day) === 'scrypt' ? [1e9, 'GH/s'] : c.algo(s.day) === 'kheavy' ? [1e12, 'TH/s'] : c.algo(s.day) === 'equihash' ? [1e3, 'kSol/s'] : ['rx', 'cn'].includes(c.algo(s.day)) ? [1e3, 'kH/s'] : [1e6, 'MH/s'];
    if (g.has('coins')) det.append(h(`<div style="color:var(--dim);font-size:12px;margin:4px 0 8px">${esc(c.desc)} · Algo: ${ALGO_LABEL[c.algo(s.day)]} · Netz: ${s.day >= c.start ? fmtHash(g.netHash(c.id), c.algo(s.day)) : '—'}${hp ? ` · Hashprice: <b style="color:var(--text)">${fmtUSD(hp * hpUnit[0])} pro ${hpUnit[1]} und Tag</b>` : ''}${c.end && s.day >= c.end ? ' · <b class="neg">Mining beendet</b>' : ''}</div>`));
    if (c.id === 'BTC' && g.has('autosell')) { const nh = HALVINGS.find((d) => d > s.day); if (nh) det.append(h(`<div style="font-size:13px;margin:-2px 0 8px">Nächstes Halving: <b>${fmtDate(nh)}</b> (in ${(nh - s.day).toLocaleString('de-DE')} Tagen) – Blockbelohnung ${String(BTC_REWARD(s.day)).replace('.', ',')} → ${String(BTC_REWARD(nh)).replace('.', ',')} BTC</div>`)); }
    const cv = h('<canvas class="chart" width="1200" height="520"></canvas>'); det.append(cv);
    const range = h(`<div class="seg" style="margin-top:10px"></div>`);
    this.range ??= 365;
    const hist = s.day - Math.max(c.start, toDay('2010-07-17'));
    if (this.range !== 99999 && this.range >= hist) this.range = 99999;
    for (const [l, d] of [['30 T', 30], ['1 J', 365], ['5 J', 1825], ['Alles', 99999]].filter(([, d]) => d === 99999 || d < hist)) { const b = h(`<button class="btn small ${this.range === d ? 'on' : ''}">${l}</button>`); b.onclick = () => { this.range = d; this.market(); }; range.append(b); }
    det.append(range);
    this.range ??= 365;
    requestAnimationFrame(() => this.chart(cv, c.id, this.range));
    // ---------- Handelsfenster: selbst eingeben, kaufen oder verkaufen ----------
    det.classList.add('mk-left');
    const wrap = h('<div class="mk-wrap"></div>'); det.replaceWith(wrap); wrap.append(det);
    const tk = h('<div class="ticket"></div>'); wrap.append(tk);
    this.trade ||= { mode: 'sell', unit: 'BTC' };
    const T = this.trade, fee = g.s.skills ? g.tradeFee() : 0.005, feeTxt = (fee * 100).toLocaleString('de-DE');
    const pend = c.id === 'BTC' && !s.payoutCold ? this.pendingBtc() : 0, have = w.ex + pend;
    const num = (str) => { str = String(str || '').trim().replace(/\s/g, ''); if (str.includes(',')) str = str.replace(/\./g, '').replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(str)) str = str.replace(/\./g, ''); const v = parseFloat(str); return Number.isFinite(v) && v > 0 ? v : 0; };
    const fmtIn = (v, unit) => (v > 0 ? v.toLocaleString('de-DE', { maximumFractionDigits: unit === 'BTC' ? (v < 1 ? 6 : 4) : 2, useGrouping: false }) : '');
    const sym = c.id === 'BTC' ? '₿' : c.id;
    tk.innerHTML = `<div class="seg tk-tabs"><button class="btn small ${T.mode === 'sell' ? 'on' : ''}" data-m="sell">Verkaufen</button><button class="btn small ${T.mode === 'buy' ? 'on' : ''}" data-m="buy">Kaufen</button></div>
      <div class="tk-bal"><div><span>Du hast</span><b>${fmtCoin(have)} ${c.id}</b><small>≈ ${fmtUSD(have * p)}</small></div><div><span>Kontostand</span><b>${fmtUSD(s.cash)}</b></div></div>
      <label class="tk-amt"><span class="lab">${T.mode === 'sell' ? 'Menge verkaufen' : 'Menge kaufen'}</span><span class="field"><input type="text" inputmode="decimal" autocomplete="off" placeholder="0"/><button class="unit" title="Einheit wechseln">${T.unit === 'BTC' ? c.id : '$'}</button></span></label>
      <div class="tk-chips"><button class="btn small" data-p="0.25">25 %</button><button class="btn small" data-p="0.5">50 %</button><button class="btn small" data-p="1">100 %</button></div>
      <div class="tk-sum"><div><span>Kurs</span><b>${fmtUSD(p)}</b></div><div><span>Menge</span><b class="q">–</b></div><div><span>Gebühr (${feeTxt} %)</span><b class="f">–</b></div><div class="tot"><span class="tl">${T.mode === 'sell' ? 'Du bekommst' : 'Du zahlst'}</span><b class="t">–</b></div></div>
      <div class="tk-msg"></div>
      <button class="btn primary big wide tk-go" disabled>${T.mode === 'sell' ? 'Verkaufen' : 'Kaufen'}</button>
      <div class="tk-note">Gebühr ${feeTxt} % · deine Fähigkeit Handel senkt sie</div>`;
    const inp = tk.querySelector('input[type=text]'), rng = tk.querySelector('.tk-range'), go = tk.querySelector('.tk-go'), msg = tk.querySelector('.tk-msg');
    // Obergrenze in der gewählten Einheit
    const maxIn = () => (T.mode === 'sell' ? (T.unit === 'BTC' ? have : have * p) : (T.unit === 'BTC' ? Math.max(0, s.cash) * (1 - fee) / p : Math.max(0, s.cash)));
    const floorIn = (v, unit) => { const k = unit === 'BTC' ? 1e6 : 100; return Math.floor(v * k + 1e-7) / k; };
    const m2 = (v) => `${Math.max(0, v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`, m2f = (v) => (v > 0 && v < 0.01 ? '< 0,01 $' : `−${m2(v)}`);
    T.all = false;
    const calc = () => {
      const v = num(inp.value), mx = maxIn(), tol = T.unit === 'BTC' ? (mx < 1 ? 1e-6 : 1e-4) : 0.01, over = v > mx + tol;
      const coins = T.unit === 'BTC' ? v : v / p;
      let q = '–', f = '–', t = '0,00 $', ok = v > 0 && !over, small = false;
      if (v > 0 && !over) {
        if (T.mode === 'sell') { const cq = T.all ? have : Math.min(coins, have), gross = cq * p; q = `${fmtIn(cq, 'BTC') || '0'} ${c.id}`; f = m2f(gross * fee); t = `+${m2(gross * (1 - fee))}`; if (gross * (1 - fee) < 0.01) { ok = false; small = true; } }
        else { const usd = T.all ? s.cash : Math.min(s.cash, T.unit === 'BTC' ? coins * p / (1 - fee) : v); q = `${fmtIn(usd * (1 - fee) / p, 'BTC') || '0'} ${c.id}`; f = m2f(usd * fee); t = m2(usd); if (usd < 0.01) { ok = false; small = true; } }
      }
      tk.querySelector('.q').textContent = q; tk.querySelector('.f').textContent = f; tk.querySelector('.t').textContent = t;
      msg.textContent = over ? (T.mode === 'sell' ? `So viel hast du nicht – höchstens ${fmtIn(floorIn(mx, T.unit), T.unit)} ${T.unit === 'BTC' ? c.id : '$'}.` : `Dafür reicht dein Geld nicht – höchstens ${fmtIn(floorIn(mx, T.unit), T.unit)} ${T.unit === 'BTC' ? c.id : '$'}.`) : (mx <= 0 ? (T.mode === 'sell' ? (s.stats.sold > 0 ? 'Alles verkauft – dein PC schürft schon weiter.' : 'Noch keine Bitcoin – dein PC schürft gerade.') : 'Kein Geld zum Kaufen da.') : (small ? 'Mindestens 0,01 $ pro Auftrag.' : v > 0 ? '' : 'Menge eingeben oder 25 %, 50 % oder 100 % wählen.'));
      msg.classList.toggle('bad', over || small); inp.closest('.field').classList.toggle('bad', over); tk.querySelector('.tk-sum').classList.toggle('bad', over); tk.querySelector('.tk-sum').classList.toggle('empty', !(v > 0) || over);
      go.disabled = !ok; go.textContent = ok ? (T.mode === 'sell' ? `Verkaufen · ${t}` : `Kaufen · ${q}`) : (T.mode === 'sell' ? 'Verkaufen' : 'Kaufen');
      if (rng && document.activeElement !== rng) rng.value = mx > 0 ? (over || T.all ? 100 : Math.round(Math.min(1, v / mx) * 100)) : 0;
      tk.querySelectorAll('.tk-chips .btn').forEach((b) => b.classList.toggle('on', mx > 0 && !over && (+b.dataset.p === 1 ? T.all : !T.all && Math.abs(v / mx - +b.dataset.p) < 0.004)));
    };
    const setPct = (k) => { const mx = maxIn(); T.all = k >= 1 && mx > 0; inp.value = fmtIn(floorIn(k >= 1 ? mx : mx * k, T.unit), T.unit); calc(); };
    inp.oninput = () => { T.all = false; calc(); }; inp.onkeydown = (e) => { if (e.key === 'Enter' && !go.disabled) go.click(); if (e.key === 'Escape') inp.blur(); };
    if (rng) rng.oninput = () => setPct(+rng.value / 100);
    tk.querySelectorAll('.tk-chips .btn').forEach((b) => (b.onclick = () => setPct(+b.dataset.p)));
    tk.querySelectorAll('.tk-tabs .btn').forEach((b) => (b.onclick = () => { T.mode = b.dataset.m; this.market(); }));
    tk.querySelector('.unit').onclick = (e) => { e.preventDefault(); if (T.all) { T.unit = T.unit === 'BTC' ? 'USD' : 'BTC'; e.currentTarget.textContent = T.unit === 'BTC' ? c.id : '$'; setPct(1); return; } const v = num(inp.value), k = T.mode === 'buy' ? 1 - fee : 1, coins = T.unit === 'BTC' ? v / k : v / p; T.unit = T.unit === 'BTC' ? 'USD' : 'BTC'; e.currentTarget.textContent = T.unit === 'BTC' ? c.id : '$'; inp.value = fmtIn(floorIn(T.unit === 'BTC' ? coins * k : coins * p, T.unit), T.unit); calc(); };
    if (maxIn() <= 0) { inp.disabled = true; if (rng) rng.disabled = true; tk.querySelectorAll('.tk-chips .btn').forEach((b) => (b.disabled = true)); }
    go.onclick = () => {
      const v = num(inp.value); if (!(v > 0)) return;
      if (T.mode === 'sell') {
        if (pend) g.creditPending(c.id, this.pendingBtc());
        const avail = s.wallet[c.id].ex, coins = T.all ? avail : Math.min(avail, T.unit === 'BTC' ? v : v / p); if (!(coins > 0)) return;
        const u = g.sell(c.id, T.all || coins >= avail * 0.9999 ? 1 : coins / avail); if (!u) return;
        this.audio?.cash(); this.flashCash(u); this.toast(`${fmtIn(coins, 'BTC')} ${c.id} verkauft · +${m2(u)}`, 'good', 3000);
      } else {
        let usd = Math.min(s.cash, T.unit === 'BTC' ? v * p / (1 - fee) : v); if (T.all || (usd > s.cash * 0.999 && s.cash - usd < 0.01)) usd = s.cash; const u = g.buy(c.id, usd); if (!u) { this.toast('Kauf nicht möglich.', 'bad'); return; }
        this.audio?.cash(); this.toast(`${fmtIn(u * (1 - fee) / p, 'BTC')} ${c.id} gekauft · −${m2(u)}`, 'good', 3000);
      }
      this.market();
    };
    calc();
    if (g.has('cold')) { const ct = h(`<div class="tk-cold"><div><span>Cold-Wallet</span><b>${fmtCoin(w.cold)} ${c.id}</b></div><button class="btn small">${w.cold > 0 && w.ex === 0 ? 'Auf Börse holen' : 'Einlagern'}</button></div>`); ct.querySelector('button').onclick = () => { g.transfer(c.id, !(w.cold > 0 && w.ex === 0)); this.market(); }; tk.append(ct); }
    const r3 = h(`<div class="sec"><h4>Auto-Verkauf: <span id="as-v">${Math.round(s.autoSell[c.id] * 100)} %</span></h4><input type="range" min="0" max="100" step="5" value="${Math.round(s.autoSell[c.id] * 100)}"/></div>`);
    r3.querySelector('input').oninput = (e) => { s.autoSell[c.id] = e.target.value / 100; r3.querySelector('#as-v').textContent = e.target.value + ' %'; };
    const all = h('<button class="btn small" style="margin-top:6px">Für alle</button>'); all.onclick = () => { for (const k of COINS) s.autoSell[k.id] = s.autoSell[c.id]; this.toast('Übernommen', 'good', 1500); }; r3.append(all);
    if (g.has('autosell')) det.append(r3);
    this.openModal(body, '', 'market');
  }
  chart(cv, id, range, mini = false) {
    const g = this.g, s = g.s, ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = cv.clientWidth || 600, chh = cv.clientHeight || 220; cv.width = Math.round(cw * dpr); cv.height = Math.round(chh * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = cw, H = chh; ctx.clearRect(0, 0, W, H);
    const start = Math.max(COIN[id].start, s.day - range, toDay('2010-07-17')), end = s.day;
    if (end - start < 2) { ctx.fillStyle = '#c9b8a3'; ctx.font = '600 14px Nunito, sans-serif'; ctx.fillText('Noch keine Kursdaten', 40, 60); return; }
    const n = Math.max(2, Math.min(300, end - start)), pts = []; ctx.lineJoin = 'round';
    for (let i = 0; i <= n; i++) { const d = Math.round(start + (end - start) * (i / n)); pts.push([d, g.price(id, d)]); }
    const vals = pts.map((p) => p[1]).filter((v) => v > 0);
    const logScale = Math.max(...vals) / Math.min(...vals) > 30;
    const tf = (v) => (logScale ? Math.log10(Math.max(v, 1e-9)) : v);
    const mn = Math.min(...vals.map(tf)), mx = Math.max(...vals.map(tf));
    const padT = mini ? 6 : 26, padR = mini ? 6 : 18, padB = mini ? 6 : 26; let pad = mini ? 6 : 78;
    // Runde Achsenwerte (linear) bzw. Zehnerpotenzen (log)
    let ticks = [], lo = mn, hi = mx, st = 0;
    if (!mini) {
      if (logScale) { for (let e = Math.floor(mn); e <= Math.ceil(mx); e++) ticks.push(e); lo = Math.min(lo, ticks[0]); hi = Math.max(hi, ticks[ticks.length - 1]); }
      else { const raw = (mx - mn) / 4 || Math.abs(mx) * 0.1 || 1, mag = Math.pow(10, Math.floor(Math.log10(raw))); st = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => k >= raw) || 10 * mag; lo = Math.floor(mn / st) * st; hi = Math.ceil(mx / st) * st; for (let v = lo; v <= hi + st * 0.01; v += st) ticks.push(v); }
    }
    const dec = st ? Math.max(0, Math.ceil(-Math.log10(st) - 1e-9) + (Math.abs(st / Math.pow(10, Math.floor(Math.log10(st))) - 2.5) < 1e-6 ? 1 : 0)) : 0;
    const tl = (t) => { const v = logScale ? Math.pow(10, t) : t; return !logScale && v > 0 && v < 1 ? v.toFixed(dec).replace('.', ',') + ' $' : fmtUSD(v); };
    if (!mini) { ctx.font = '600 14px Nunito, sans-serif'; pad = Math.max(56, ...ticks.map((t) => ctx.measureText(tl(t)).width)) + 20; }
    const x = (i) => pad + (i / n) * (W - pad - padR), y = (v) => H - padB - ((tf(v) - lo) / (hi - lo || 1)) * (H - padB - padT);
    ctx.strokeStyle = 'rgba(255,240,220,0.07)'; ctx.font = '600 14px Nunito, sans-serif'; ctx.lineWidth = 1; ctx.fillStyle = '#e2d1bb'; ctx.textBaseline = 'middle';
    if (!mini) for (const t of ticks) { const yy = H - padB - ((t - lo) / (hi - lo || 1)) * (H - padB - padT); ctx.beginPath(); ctx.moveTo(pad, yy); ctx.lineTo(W - padR, yy); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(tl(t), pad - 10, yy); }
    ctx.textBaseline = 'alphabetic';
    if (!mini) { ctx.textAlign = 'left'; ctx.fillText(fmtDate(start), pad, H - 6); ctx.textAlign = 'right'; ctx.fillText(fmtDate(end), W - padR, H - 6); ctx.textAlign = 'left'; }
    const grad = ctx.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, COIN[id].color + '38'); grad.addColorStop(1, COIN[id].color + '00');
    ctx.beginPath(); pts.forEach(([d, v], i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v)))); ctx.lineTo(x(n), H - padB); ctx.lineTo(x(0), H - padB); ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); pts.forEach(([d, v], i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v)))); ctx.strokeStyle = COIN[id].color; ctx.lineWidth = 2; ctx.stroke();
    if (!mini) { const [, lv] = pts[n]; ctx.beginPath(); ctx.arc(x(n), y(lv), 4.5, 0, 7); ctx.fillStyle = COIN[id].color; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#302419'; ctx.stroke(); }
    if (logScale && !mini) { ctx.fillStyle = '#9a8a78'; ctx.textAlign = 'right'; ctx.fillText('log. Skala', W - padR, 14); ctx.textAlign = 'left'; }
  }

  phone() {
    const g = this.g;
    const msgs = [...g.s.messages].sort((a, b) => b.day - a.day);
    const body = h(`<div><h2>Handy</h2><div class="phone"></div></div>`);
    const ph = body.querySelector('.phone');
    const oe = g.s.ev?.open && EVENT[g.s.ev.open.id];
    if (oe) { const card = h(`<div class="msg decide"><div class="fr">${esc(oe.from || '')}<span>Entscheidung offen · noch ${Math.max(0, g.s.ev.open.until - g.s.day)} Tage</span></div><b>${esc(g.evText(oe, 'title'))}</b><div class="row" style="margin-top:8px"><button class="btn small primary">Jetzt entscheiden</button></div></div>`); card.querySelector('button').onclick = () => { this.evSnooze = null; this.closeModal(); this.eventCard(); }; ph.append(card); }
    if (!msgs.length) ph.append(h('<div class="empty">Keine Nachrichten.</div>'));
    for (const m of msgs) { if (m.old) continue; ph.append(h(`<div class="msg f-${m.from.split(' ')[0]} ${m.read ? '' : 'unread'}"><div class="fr">${FACE[m.from] || ''} ${esc(m.from)}<span>${fmtDate(m.day)}</span></div>${esc(m.text)}</div>`)); }
    msgs.forEach((m) => (m.read = true));
    this.openModal(body, 'narrow', 'phone'); this.dock();
  }

  // Ereignis mit Entscheidung: erscheint, sobald kein anderes Fenster offen ist
  tryEvent() {
    const o = this.g.s.ev?.open; if (!o || this.evSnooze === o.key) { this.dock(); return; }
    if (this.modalKind || this.inspUid || this.w.focus || this.w.empire || !document.getElementById('splash').classList.contains('hidden') || document.body.classList.contains('show-build')) { this.dock(); return; }
    this.eventCard();
  }
  eventCard() {
    const g = this.g, o = g.s.ev?.open, e = o && EVENT[o.id]; if (!e) return;
    const ch = g.evChoices(e);
    const body = h(`<div class="story event"><div class="ev-from"><span class="ev-av">${esc((e.from || '?').slice(0, 1))}</span><span>${esc(e.from || '')}</span><span class="ev-date">${fmtDate(g.s.day)}</span></div><div class="ch">${esc(g.evText(e, 'title'))}</div><p>${g.evText(e)}</p><div class="ev-choices"></div></div>`);
    const box = body.querySelector('.ev-choices');
    for (const c of ch) {
      const b = h(`<button class="btn ${c.i === 0 ? 'primary' : ''} ev-c" ${c.ok ? '' : 'disabled'}><span class="ev-l">${esc(c.label)}${c.cost ? ` <span class="ev-cost">· ${this.money(c.cost)}</span>` : ''}</span>${c.hint ? `<small>${esc(c.hint)}</small>` : ''}${!c.ok && c.cost ? '<small>Dafür reicht dein Geld nicht.</small>' : ''}</button>`);
      b.onclick = () => { const reply = g.chooseEvent(c.i); this.evSnooze = null; this.closeModal(); this.audio?.cash?.(); if (reply) this.toast(reply, 'msg', 7000); this.refresh(); this.dock(); };
      box.append(b);
    }
    this.openModal(body, 'narrow', 'event');
  }
  company() {
    const g = this.g, s = g.s;
    const body = h(`<div><h2>Firma</h2><div class="cards"></div><div class="sec staff"></div></div>`);
    const cards = body.querySelector('.cards');
    const nextLocked = FACILITIES.find((x) => !s.unlocked.includes(x.id));
    for (const f of FACILITIES) {
      const un = s.unlocked.includes(f.id), can = g.canUnlock(f.id);
      if (!un && f !== nextLocked) continue;
      const fs = s.fac[f.id], sm = g.summary[f.id];
      const c = h(`<div class="card ${!un && !can ? 'lock' : ''}"><h3>${un ? '' : can ? '' : ''}${esc(f.name)}</h3><div class="sub">${esc(f.place)} · ${f.w}×${f.d} m</div>
        <div class="kv" style="margin:4px 0"><div class="k">Anschluss</div><div class="v">${fmtNum(f.power[fs.power].kw, 1)} kW</div>
        <div class="k">Strompreis</div><div class="v">${g.elecPrice(f.id) ? fmtUSD(g.elecPrice(f.id)) + '/kWh' : 'zahlen die Eltern'}</div>
        <div class="k">Miete</div><div class="v">${f.rent ? (un && g.upgrades(f.id).some((u) => u.fx?.rent === 0 && g.upActive(f.id, u)) ? 'keine (gekauft)' : fmtUSD(f.rent * (un ? g.fx('rent', f.id) : 1)) + '/Monat') : 'keine'}</div>
        ${un ? `<div class="k">Last</div><div class="v">${fmtWatt(sm.watt)}</div><div class="k">Temperatur</div><div class="v ${sm.temp > 38 ? 'neg' : ''}">${sm.temp.toFixed(1)} °C</div><div class="k">Geräte</div><div class="v">${fs.objects.length}</div>` : ''}</div></div>`);
      if (un) {
        const nx = f.power[fs.power + 1];
        if (nx) { const pc = g.powerCost(f.id); const b = h(`<button class="btn small">${esc(nx.label)}: ${fmtNum(nx.kw, 0)} kW (${fmtUSD(pc)})</button>`); b.disabled = s.cash < pc; b.onclick = () => { if (g.upgradePower(f.id)) { this.toast('Stromanschluss ausgebaut!', 'good'); this.company(); this.sites(); } }; c.append(b); }
        else c.append(h('<div style="font-size:12px;color:var(--dim)">Maximaler Anschluss erreicht.</div>'));
        const step = g.solarStep(f.id);
        if (step) { const cost = step * g.solarPricePerKwp(); const sb = h(`<button class="btn small">+${step} kWp Solar (${fmtUSD(cost)})</button>`); sb.disabled = s.cash < cost; sb.onclick = () => { if (g.buildSolar(f.id)) { this.toast(`Solaranlage erweitert (${f.short})`, 'good'); this.company(); } }; c.append(sb); }
        if (s.current !== f.id) { const go = h('<button class="btn small" style="margin-left:6px">Hingehen</button>'); go.onclick = () => { this.closeModal(); this.switchSite(f.id); }; c.append(go); }
        c.append(this.facExtras(f.id)); // Ausbauten, Einmotten
      } else if (can) { const b = h(`<button class="btn primary small">Übernehmen (${fmtUSD(f.cost)})</button>`); b.onclick = () => { this.closeModal(); this.unlock(f.id); }; c.append(b); }
      else { const ci = CHAPTERS.findIndex((ch) => ch.unlock === f.id); c.append(h(`<div style="font-size:12px;color:var(--dim)">Ab ${(CHAPTERS[ci]?.minDate || '').slice(0, 4)}</div>`)); }
      cards.append(c);
    }
    const st = body.querySelector('.staff');
    const allowed = s.flags.gmbh;
    st.append(this.staffSec()); // Personal mit Namen, Rollen, Bewerbungen
    const stHide = !allowed && !s.staff.tech;
    const p = g.dailyProfit();
    const loan = s.loan || 0, lim = g.loanLimit();
    const lb = h(`<div class="sec"><h4>Bankkredit</h4><div class="kv"><div class="k">Offener Kredit</div><div class="v ${loan ? 'neg' : ''}">${fmtUSD(loan)}</div><div class="k">Zinssatz</div><div class="v">${(g.loanRate() * 100).toFixed(1).replace('.', ',')} % p. a.</div><div class="k">Zinsen pro Tag</div><div class="v">${fmtUSD(loan * g.loanRate() / 365)}</div><div class="k">Weiterer Rahmen</div><div class="v">${fmtUSD(lim)}</div></div><div class="row"></div></div>`);
    const lr = lb.querySelector('.row');
    lb.querySelector('.kv').insertAdjacentHTML('beforeend', `<div class="k">Dispo-Rahmen</div><div class="v ${-s.cash > g.dispoLimit() ? 'neg' : ''}">${s.cash < 0 ? fmtUSD(-s.cash) + ' von ' : ''}${fmtUSD(g.dispoLimit())} · ${fmtNum(g.dispoRate() * 100, 0)} %</div>${loan > 0 ? `<div class="k">Tilgung</div><div class="v">${fmtUSD(g.loanPayment())}/Monat</div>` : ''}${s.loanHi > 0 && loan > 0 ? `<div class="k">davon Umschuldung</div><div class="v">${fmtUSD(Math.min(s.loanHi, loan))} · 13 %</div>` : ''}`);
    for (const f of [0.25, 1]) { const amt = Math.round(lim * f / 100) * 100; const b = h(`<button class="btn small">${fmtUSD(amt)} leihen</button>`); b.disabled = amt <= 0; b.onclick = () => { const u = g.takeLoan(amt); if (u) { this.audio?.cash(); this.toast(`Kredit über ${fmtUSD(u)} aufgenommen`, 'good'); } this.company(); }; lr.append(b); }
    const rp = h(`<button class="btn small good">Tilgen (${fmtUSD(Math.min(loan, Math.max(0, s.cash)))})</button>`); rp.disabled = !loan || s.cash <= 0; rp.onclick = () => { const u = g.repayLoan(loan); if (u) this.toast(`${fmtUSD(u)} getilgt`, 'good'); this.company(); }; lr.append(rp);
    if (g.has('loan')) st.append(lb);
    if (stHide) { st.innerHTML = ''; if (g.has('loan')) st.append(lb); }
    const nwc = h('<div class="sec"><h4>Vermögensverlauf (log)</h4><canvas class="nwchart" width="1100" height="260"></canvas></div>'); if (g.has('ranking') && (s.stats.history || []).length >= 3) st.append(nwc); requestAnimationFrame(() => this.nwChart(nwc.querySelector('canvas')));
    st.append(h(`<div class="sec"><h4>Bilanz pro Tag</h4><div class="kv"><div class="k">Mining-Ertrag</div><div class="v pos">${fmtUSD(p.rev)}</div><div class="k">Strom, Miete, Löhne</div><div class="v neg">−${fmtUSD(p.cost)}</div><div class="k">Gesamt geschürft</div><div class="v">${fmtUSD(s.stats.minedUSD)}</div><div class="k">Stromkosten bisher</div><div class="v">${fmtUSD(s.stats.elec)}</div><div class="k">In Hardware investiert</div><div class="v">${fmtUSD(s.stats.spentHW)}</div></div></div>`));
    this.openModal(body, '', 'company');
  }

  // Firmenfenster neu zeichnen, ohne an den Anfang zu springen
  reCompany() { const c = $('#modal .modal-card'), y = c ? c.scrollTop : 0; this.company(); const c2 = $('#modal .modal-card'); if (c2) c2.scrollTop = y; this.sites(); }
  // Je Standort: Ausbauten und Einmotten (im Firmenfenster)
  facExtras(fid) {
    const g = this.g, s = g.s, f = s.fac[fid], box = h('<div class="fac-ext"></div>');
    const ups = g.upgrades(fid);
    if (ups.length) {
      box.append(h('<div class="fx-h">Ausbauten</div>'));
      for (const u of ups) {
        if (g.upObsolete(fid, u)) continue;
        const on = g.upActive(fid, u), was = !!f.up?.[u.id];
        const price = u.cost ? fmtUSD(u.cost) : u.monthly > 0 ? `${fmtUSD(u.monthly)}/Monat` : '';
        const r = h(`<div class="fx-row ${on ? 'on' : ''}" title="${esc(u.desc)}"><div class="fx-t"><b>${esc(u.name)}</b><small>${esc(u.eff)}${u.monthly > 0 && u.cost ? ` · ${fmtUSD(u.monthly)}/Monat` : ''}</small></div></div>`);
        if (on) {
          r.append(h(`<span class="fx-ok">${u.days ? 'bis ' + fmtDate(f.up[u.id] + u.days) : u.monthly > 0 ? `${fmtUSD(u.monthly)}/Monat` : 'Gebaut'}</span>`));
          if (u.cancel) { const b = h('<button class="btn small">Kündigen</button>'); b.onclick = () => { g.cancelUpgrade(fid, u.id); this.toast(`${u.name} gekündigt`, 'info'); this.reCompany(); }; r.append(b); }
        } else {
          const need = Math.max(u.cost || 0, u.monthly > 0 ? u.monthly : 0);
          const b = h(`<button class="btn small">${was ? 'Erneuern' : u.cost ? 'Kaufen' : 'Buchen'} · ${price}</button>`); b.disabled = !g.canAfford(need);
          b.onclick = () => { if (g.buyUpgrade(fid, u.id)) { this.audio?.cash?.(); this.toast(`${u.name}: ${u.eff}`, 'good'); } else this.toast('Nicht genug Geld.', 'bad'); this.reCompany(); };
          r.append(b);
        }
        box.append(r);
      }
    }
    if (g.canMothball(fid)) {
      const keep = g.upgrades(fid).some((u) => u.keepRent && g.upActive(fid, u));
      const rentTxt = FACILITY[fid].rent ? (keep ? 'Miete bleibt (Mietvertrag)' : 'Miete 30 %') : 'keine Miete';
      const r = h(`<div class="fx-row moth ${f.mothball ? 'on' : ''}"></div>`);
      if (!f.mothball) {
        r.innerHTML = `<div class="fx-t"><b>Einmotten</b><small>Alle Geräte aus · ${rentTxt} · kein Verschleiß</small></div>`;
        const b = h('<button class="btn small">Einmotten</button>'); b.onclick = () => { g.mothball(fid, true); this.reCompany(); }; r.append(b);
      } else {
        const rd = g.restartDay(fid), c = g.restartCost(fid), early = s.day < rd;
        r.innerHTML = `<div class="fx-t"><b>Eingemottet</b><small>seit ${fmtDate(f.mothball)} · ${rentTxt} · Anfahren ${fmtUSD(c)}</small></div>`;
        const b = h(`<button class="btn small primary">${early ? 'Ab ' + fmtDate(rd) : 'Wieder anfahren'}</button>`); b.disabled = early || s.cash - c < -g.dispoLimit();
        b.onclick = () => { if (g.mothball(fid, false)) this.audio?.cash?.(); this.reCompany(); }; r.append(b);
      }
      box.append(r);
    }
    return box;
  }
  // Personal: Teamkarten, drei Bewerbungen, Sammel-Einstellung
  staffSec() {
    const g = this.g, s = g.s, list = s.staff.list || [], sec = h('<div class="staff2"></div>');
    const cov = Math.round(g.techCoverage() * 100), pay = g.staffMonthly();
    sec.append(h(`<h4>Personal</h4>`));
    sec.append(h(`<div class="kv"><div class="k">Team</div><div class="v">${list.length} ${list.length === 1 ? 'Person' : 'Leute'} · ${s.staff.tech} in der Technik</div><div class="k">Reparatur-Abdeckung</div><div class="v ${cov < 100 && s.staff.tech ? 'neg' : ''}">${cov} %</div><div class="k">Gehälter</div><div class="v">${fmtUSD(pay)}/Monat</div></div>`));
    const card = (p, cand) => {
      const R = ROLES[p.role], T = TRAITS[p.trait], sal = g.staffSalary(p);
      const q = cand ? (QUOTES[p.trait] || [])[p.id % 2] : '';
      const el = h(`<div class="pcard ${cand ? 'cand' : ''} r-${p.role}"><div class="pc-top"><span class="pc-av">${esc(p.name.split(' ').map((x) => x[0]).join(''))}</span><div class="pc-n"><b>${esc(p.name)}</b><small>${esc(g.roleName(p))}${cand ? '' : ` · seit ${fmtDate(p.since)}`}</small></div></div>
        <div class="pc-tags"><span class="pc-tag">${esc(T?.name || '')}</span></div>
        <div class="pc-eff">${esc(p.role === 'tech' ? T?.eff || '' : R.eff)}</div>${q ? `<div class="pc-q">${esc(q)}</div>` : ''}
        <div class="pc-f"><span>${fmtUSD(sal)}/Monat</span></div></div>`);
      const b = cand ? h('<button class="btn small good">Einstellen</button>') : h('<button class="btn small danger">Entlassen</button>');
      if (cand) { b.disabled = !g.canAfford(sal); b.onclick = () => { if (g.hire(p.id)) { this.toast(`${p.name} fängt bei Hashwerk an.`, 'good'); } else this.toast('Dafür reicht das Geld nicht.', 'bad'); this.reCompany(); }; }
      else b.onclick = () => { if (this.fireArmed === p.id) { g.fire(p.id); this.fireArmed = null; this.toast(`${p.name} geht. Schade.`, 'info'); this.reCompany(); } else { this.fireArmed = p.id; b.textContent = 'Wirklich?'; } };
      el.querySelector('.pc-f').append(b); return el;
    };
    if (list.length) {
      const key = list.filter((p) => p.role !== 'tech'), techs = list.filter((p) => p.role === 'tech');
      const shown = [...key, ...techs.slice(0, Math.max(0, 8 - key.length))];
      const grid = h('<div class="pgrid"></div>'); for (const p of shown) grid.append(card(p, false));
      const more = list.length - shown.length; if (more > 0) grid.append(h(`<div class="pcard more"><b>+ ${more}</b><small>weitere ${more === 1 ? 'Person' : 'Leute'} in der Technik</small></div>`));
      sec.append(grid);
    } else sec.append(h('<div class="pc-empty">Noch niemand angestellt. Techniker reparieren kaputte Geräte, ehe du es merkst.</div>'));
    sec.append(h('<h4 class="pc-h2">Bewerbungen</h4>'));
    const pool = h('<div class="pgrid"></div>'); for (const p of g.staffPool()) pool.append(card(p, true)); sec.append(pool);
    const row = h('<div class="row"></div>');
    const add = h(`<button class="btn small">+5 Techniker ohne Auswahl · ${fmtUSD(5 * g.techSalary())}/Monat</button>`); add.disabled = !g.canAfford(5 * g.techSalary()); add.onclick = () => { if (g.hireTech(5)) this.toast('Fünf neue Leute in der Technik.', 'good'); this.reCompany(); }; row.append(add);
    if (s.staff.tech >= 5) { const rm = h('<button class="btn small danger">−5 Techniker</button>'); rm.onclick = () => { g.hireTech(-5); this.reCompany(); }; row.append(rm); }
    sec.append(row);
    return sec;
  }

  offer(usd) {
    const g = this.g;
    const body = h(`<div class="story"><div class="ch">Ein Anruf aus Zug</div>
      <p><b>Viktor Kral, MONOLITH Hash AG:</b> „China hat die halbe Branche abgeschaltet. Ich kaufe jetzt. <b>${fmtUSD(usd)}</b> in bar für die Hashwerk GmbH – alle Standorte, alle Maschinen. Sie wären mit Anfang dreißig fertig mit Arbeiten."</p>
      <p style="color:var(--dim)">Dein aktuelles Vermögen: ${fmtUSD(g.netWorth())}. Deniz schaut dich an und sagt nichts.</p>
      <div class="row" style="justify-content:flex-end"><button class="btn danger" data-a="yes">Verkaufen</button><button class="btn primary" data-a="no">Ablehnen – wir machen weiter</button></div></div>`);
    body.querySelector('[data-a=no]').onclick = () => { g.s.flags.offerDeclined = true; this.closeModal(); this.toast('<b>Deniz:</b> JA! Ich wusste es. Wir holen ihn ein.', 'msg', 7000); };
    body.querySelector('[data-a=yes]').onclick = () => {
      g.s.flags.soldOut = true; this.closeModal();
      const b2 = h(`<div class="story" style="text-align:center"><div class="ch">Ende: Verkauft</div><div style="font-size:34px;font-weight:900;margin:6px 0">${fmtUSD(usd)}</div>
        <p>Du unterschreibst in Zug. MONOLITH übernimmt Hashwerk – und Viktor Kral bekommt seinen Rekord. Elektro Brandt gibt es immer noch; Papa hat dir einen Schlüssel für die Werkstatt hinterlegt.</p>
        <p style="color:var(--dim)">Willst du es lieber noch einmal versuchen? Du kannst den Vertrag zerreißen und weiterspielen.</p>
        <div class="row" style="justify-content:center"><button class="btn primary">Vertrag zerreißen & weiterspielen</button></div></div>`);
      b2.querySelector('button').onclick = () => { g.s.flags.offerDeclined = true; this.closeModal(); };
      this.openModal(b2, 'narrow', 'story');
    };
    this.openModal(body, 'narrow', 'story');
  }

  ending() {
    const g = this.g, s = g.s; const sha = g.algoHash('sha256'), net = g.netHash('BTC');
    const years = ((s.day - toDay('2010-10-01')) / 365).toFixed(1).replace('.', ',');
    const devs = s.unlocked.reduce((n, id) => n + s.fac[id].objects.reduce((k, o) => k + (o.items ? o.items.length : 1), 0), 0);
    const body = h(`<div class="story" style="text-align:center"><div class="ch">Finale</div>
      <div style="font-size:40px;font-weight:900;margin:6px 0">MONOLITH überholt!</div>
      <p>Vor ${years} Jahren stand ein alter PC neben deinem Bett. Heute rechnet Hashwerk mit <b>${fmtHash(sha)}</b> – das sind <b>${pctDE(sha / net)} %</b> aller Bitcoin-Blöcke weltweit.</p>
      <div class="kv" style="max-width:420px;margin:14px auto;text-align:left"><div class="k">Vermögen</div><div class="v">${fmtUSD(g.netWorth())}</div><div class="k">Geräte</div><div class="v">${devs.toLocaleString('de-DE')}</div><div class="k">Standorte</div><div class="v">${s.unlocked.length}</div><div class="k">Insgesamt geschürft</div><div class="v">${fmtUSD(s.stats.minedUSD)}</div><div class="k">Stromkosten</div><div class="v">${fmtUSD(s.stats.elec)}</div></div>
      <p style="color:var(--dim)">Papa hat den Laden übrigens behalten. Er repariert immer noch Radios – aus Spaß.</p>
      <div class="row" style="justify-content:center"><button class="btn primary big">Endlos weiterspielen</button></div></div>`);
    body.querySelector('button').onclick = () => this.closeModal();
    this.audio?.fanfare(); this.openModal(body, 'narrow', 'story');
  }

  techs() {
    const g = this.g, s = g.s;
    const body = h(`<div><h2>Technik</h2><div class="cards"></div></div>`);
    const cards = body.querySelector('.cards');
    for (const t of TECHS) {
      const own = (s.techs || {})[t.id], av = g.techAvailable(t);
      const c = h(`<div class="card ${!av && !own ? 'lock' : ''}"><h3>${t.icon} ${esc(t.name)}</h3><div class="sub">${own ? `Erforscht am ${fmtDate(own)}` : av ? `Kosten: <b style="color:#ffb000">${fmtUSD(t.cost)}</b>` : `ab ${fmtDate(toDay(t.date))}${t.minTier ? ` · braucht Standort „${FACILITIES.find((f) => f.tier === t.minTier).name}"` : ''}`}</div><div style="font-size:13px">${esc(t.desc)}</div></div>`);
      if (!own && av) { const b = h(`<button class="btn primary small" style="margin-top:8px">Erforschen</button>`); b.disabled = s.cash < t.cost; b.onclick = () => { if (g.buyTech(t.id)) { this.audio?.fanfare(); this.toast(`${esc(t.name)} erforscht!`, 'good'); this.techs(); this.dock(); } }; c.append(b); }
      cards.append(c);
    }
    this.openModal(body, '', 'techs');
  }

  ranking() {
    const g = this.g, s = g.s, day = s.day;
    const net = g.netHash('BTC');
    const mine = g.algoHash('sha256');
    const entries = [
      ['GigaWatt Mining (USA)', toDay('2014-01-01'), 0.006], ['Sibir Energo (RU)', toDay('2016-01-01'), 0.0035], ['TexaHash Inc.', toDay('2019-01-01'), 0.0045],
      ['Nordlicht Hash (IS)', toDay('2014-06-01'), 0.0025], ['Pacific Rigs (CA)', toDay('2017-01-01'), 0.002], ['Hobby-Miner „ArtForz"', toDay('2010-06-01'), 0.03, toDay('2013-01-01')],
      ['Uni-Cluster Tokio', toDay('2010-09-01'), 0.012, toDay('2014-01-01')], ['Desert Hash (AE)', toDay('2021-06-01'), 0.003], ['Andes Mining (PY)', toDay('2022-01-01'), 0.0018],
    ].filter((e) => day >= e[1] && (!e[3] || day < e[3])).map((e) => ({ name: e[0], h: net * e[2] * (0.85 + 0.3 * Math.abs(Math.sin(e[1] + day / 200))) }));
    const mono = g.monolithHash(); if (mono) entries.push({ name: 'MONOLITH Hash AG', h: mono, rival: true });
    entries.push({ name: 'Hashwerk (Du)', h: mine, me: true });
    entries.sort((a, b) => b.h - a.h);
    const rank = entries.findIndex((e) => e.me) + 1;
    const body = h(`<div><h2>Rangliste der Bitcoin-Miner</h2><p style="color:var(--dim);margin-top:-6px">Netz-Hashrate: <b style="color:#fff">${fmtHash(net)}</b> · Dein Anteil: <b style="color:#ffb000">${pctDE(mine / net)} %</b> · Platz <b>${rank}</b> von ${entries.length}</p>
      <table class="tbl"><tr><th>#</th><th>Miner</th><th>Hashrate</th><th>Anteil</th></tr>${entries.map((e, i) => `<tr class="${e.me ? 'me' : ''} ${e.rival ? 'rival' : ''}"><td>${i + 1}</td><td>${esc(e.name)}</td><td>${fmtHash(e.h)}</td><td>${pctDE(e.h / net)} %</td></tr>`).join('')}</table>
      <div class="sec"><h4>Deine Hashrate (SHA-256, log)</h4><canvas class="nwchart" width="1000" height="240"></canvas></div>
      <div class="sec"><h4>Dein Weg</h4><div class="path"></div></div></div>`);
    const ms = Object.entries(s.milestones || {}).sort((a, b) => a[1] - b[1]);
    const label = (k) => { if (k === 'cold') return 'Cold-Wallet-Profi (Börsenpleite überstanden)'; const v = +k.slice(1); return k[0] === 'h' ? `${fmtHash(v)} Hashrate` : v >= 1e9 ? 'Milliardär' : v >= 1e6 ? (v === 1e6 ? 'Millionär' : fmtUSD(v) + ' Vermögen') : fmtUSD(v) + ' Vermögen'; };
    const unl = s.unlocked.map((id) => [FACILITY[id].name, null]);
    body.querySelector('.path').innerHTML = (ms.length ? ms.map(([k, d]) => `<div style="display:flex;gap:10px;font-size:13px;padding:2px 0"><span style="color:#ffb000;min-width:86px">${fmtDate(d)}</span><span>${label(k)}</span></div>`).join('') : '<div class="empty">Noch keine Meilensteine.</div>') + `<div style="font-size:12px;color:var(--dim);margin-top:6px">Standorte: ${unl.map((u) => u[0]).join(' → ')}</div>`;
    requestAnimationFrame(() => {
      const cv = body.querySelector('canvas'); if (!cv) return; const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
      const hist = s.stats.history.filter((p) => p.h > 0);
      if (hist.length < 3) { ctx.fillStyle = '#c9b8a3'; ctx.font = '600 24px Nunito, sans-serif'; ctx.fillText('Noch zu wenig Daten.', 30, 60); return; }
      const lg = (v) => Math.log10(Math.max(1, v)); const net = hist.map((p) => g.netHash('BTC', p.d));
      const mn = lg(Math.min(...hist.map((p) => p.h))), mx = lg(Math.max(...net)) + 0.2;
      const x = (i) => 70 + (i / (hist.length - 1)) * (W - 90), y = (v) => H - 28 - ((lg(v) - mn) / (mx - mn || 1)) * (H - 50);
      ctx.fillStyle = '#d9c9b4'; ctx.font = '600 18px Nunito, sans-serif'; ctx.strokeStyle = 'rgba(255,255,255,.07)';
      for (let k = 0; k <= 3; k++) { const v = Math.pow(10, mn + ((mx - mn) * k) / 3), yy = y(v); ctx.beginPath(); ctx.moveTo(70, yy); ctx.lineTo(W - 10, yy); ctx.stroke(); ctx.fillText(fmtHash(v), 2, yy - 4); }
      ctx.beginPath(); net.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v)))); ctx.strokeStyle = '#8a7462'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); hist.forEach((p, i) => (i ? ctx.lineTo(x(i), y(p.h)) : ctx.moveTo(x(i), y(p.h)))); ctx.strokeStyle = '#ffb000'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#ffb000'; ctx.fillText('Du', W - 50, y(hist[hist.length - 1].h) - 8); ctx.fillStyle = '#c9b8a3'; ctx.fillText('Netz', W - 60, y(net[net.length - 1]) - 8);
    });
    this.openModal(body, 'narrow', 'ranking');
  }

  menu() {
    const g = this.g;
    const body = h(`<div><h2>Menü</h2><div class="row"><button class="btn primary" data-a="save">Speichern</button><button class="btn" data-a="load">Laden</button><button class="btn danger" data-a="new">Neues Spiel</button></div>
      <div class="sec"><h4>Grafik</h4><div class="row"><button class="btn small ${this.w.quality === 'high' ? 'primary' : ''}" data-q="high">Hoch</button><button class="btn small ${this.w.quality === 'medium' ? 'primary' : ''}" data-q="medium">Mittel</button><button class="btn small ${this.w.quality === 'low' ? 'primary' : ''}" data-q="low">Niedrig</button></div></div>
      <div class="sec"><h4>Ton</h4><div class="row"><button class="btn small" data-a="mute">${this.audio?.muted ? 'Ton an' : 'Ton aus'}</button></div></div>
      <div class="sec"><div style="font-size:12px;color:var(--dim)">Fan-Projekt · alle Namen fiktiv · keine Anlageberatung<br/>Bitcoin-Kurse und Hashrate: Coin Metrics Community Data (CC BY-NC 4.0)</div></div></div>`);
    body.querySelector('[data-a=save]').onclick = () => { this.toast(g.save() ? 'Gespeichert' : 'Speichern fehlgeschlagen', 'good', 2000); };
    body.querySelector('[data-a=load]').onclick = () => { if (g.load()) { this.closeModal(); this.switchSite(g.s.current); this.speedBar(); this.toast('Spielstand geladen', 'good'); } else this.toast('Kein Spielstand gefunden', 'bad'); };
    const nb = body.querySelector('[data-a=new]');
    nb.onclick = () => {
      if (!nb.dataset.armed) { nb.dataset.armed = '1'; nb.textContent = 'Sicher? Nochmal klicken = neu starten'; setTimeout(() => { if (nb.isConnected) { delete nb.dataset.armed; nb.textContent = 'Neues Spiel'; } }, 4000); return; }
      this.newGamePick(nb); // Schwierigkeit wählen, dann neu starten
    };
    body.querySelector('[data-a=mute]').onclick = () => { this.audio?.setMuted(!this.audio.muted); this.menu(); };
    body.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => { this.w.setQuality(b.dataset.q); this.menu(); }));
    this.openModal(body, 'narrow', 'menu');
  }

  newGamePick(nb) {
    const g = this.g, row = h('<div class="row diff-row"></div>');
    for (const [id, d] of Object.entries(DIFFICULTY)) { const b = h(`<button class="btn small ${id === 'normal' ? 'primary' : ''}" title="${esc(d.desc)}">${esc(d.name)}</button>`); b.onclick = () => { g.newGame(id); this.closeModal(); this.switchSite('kinder'); this.speedBar(); this.ticker(); }; row.append(b); }
    row.prepend(h('<span class="dp-lab">Neues Spiel als</span>')); nb.closest('.row').after(row); nb.remove();
  }

  // ---------- Ticker / Toasts / Hinweis ----------
  ticker() {
    const t = this.g.s.ticker.slice(0, 6);
    $('#tk-text').innerHTML = t.length ? t.map((n) => `<span class="d">${fmtDate(n.day)}</span>${esc(n.text)}`).join('<span class="sep">◆</span>') : '<span class="d">Lindental</span>Willkommen bei HASHWERK.';
  }
  toast(html, kind = 'info', ms = 4500) {
    html = String(html).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2B50}\u{23E9}-\u{23FA}\u{2705}\u{2728}\u{2744}\u{274C}]\u{FE0F}?\s?/gu, '');
    if (kind === 'bad') this.audio?.bad(); else if (kind === 'msg') this.audio?.message();
    const el = h(`<div class="toast ${kind}">${html}</div>`); $('#toasts').append(el);
    while ($('#toasts').childElementCount > 5) $('#toasts').firstElementChild.remove();
    setTimeout(() => el.remove(), ms);
    return el;
  }
  tip(uid, pos) {
    let el = document.getElementById('tip');
    if (!uid || !pos) { el?.remove(); return; }
    if (!el) { el = h('<div id="tip"></div>'); document.body.append(el); }
    const g = this.g, o = g.findObj(uid); if (!o) { el.remove(); return; }
    const def = PLACEABLE[o.type], sm = g.summary[g.facOf(uid)], a = sm?.per.get(uid);
    let line = '';
    if (a && a.units.length) { const rev = a.units.reduce((x, u) => x + u.rev, 0) * sm.throttle; const cost = a.watt / 1000 * 24 * sm.elec; line = `${fmtWatt(a.watt)} · <span class="${rev - cost >= 0 ? 'pos' : 'neg'}">${fmtUSD(rev - cost)}/Tag</span>`; }
    else if (def.kind === 'cooling') line = `kühlt ${fmtWatt(def.cool)}`;
    if (a?.status && a.status !== 'ok') line += `<br/><span class="neg">${{ broken: 'Defekt', partial: 'Teilweise defekt', psu: 'Netzteil überlastet', incomplete: 'Unvollständig', empty: 'Leer', idle: 'Pausiert (unrentabel)', off: 'Aus' }[a.status] || ''}</span>`;
    if (o.items) line += `<br/>${o.items.length}/${def.slots} belegt`;
    el.innerHTML = `<b>${esc(def.name)}</b><br/>${line}`;
    el.style.left = pos[0] + 'px'; el.style.top = pos[1] + 'px';
  }
  // Erfahrung: kleine Einblendung, beim Stufenaufstieg eine große Karte
  flushXp() { const q = this.xpQ || []; this.xpQ = []; q.forEach(([k, n, lv]) => this.xpPop(k, n, lv)); }
  xpPop(k, n, lv) {
    if (this.installing && k === 'hw') { (this.xpQ ||= []).push([k, n, lv]); return; }
    const box = $('#xpbox') || (() => { const b = h('<div id="xpbox"></div>'); document.body.append(b); return b; })();
    const el = h(`<div class="xp"><span class="xi">${skillSvg(k, 16)}</span>+${n} EP ${SKILL[k].name}</div>`); box.append(el); setTimeout(() => el.remove(), 2400);
    if (lv) { if (this.w.focus) this.lvQ = [k, lv]; else setTimeout(() => this.levelUp(k, lv), 900); }
    this.dock();
  }
  levelUp(k, lv) {
    document.getElementById('lvup')?.remove(); this.audio?.fanfare?.(); this.lvBusy = true; clearTimeout(this.lvBT); this.lvBT = setTimeout(() => { this.lvBusy = false; }, 3900);
    if (this.modalKind === 'skills') { this.skills(); const card = document.querySelector(`.sk[data-skill="${k}"]`); if (card) { card.classList.add('lvl'); setTimeout(() => card.classList.remove('lvl'), 2200); } return; }
    const el = h(`<div id="lvup"><div class="lv-ic">${skillSvg(k, 34)}</div><div class="lv-t1">Neue Stufe</div><div class="lv-t2">${SKILL[k].name} · Stufe ${lv}</div><div class="lv-t3">${SKILL[k].now(lv)}</div></div>`);
    document.body.append(el); setTimeout(() => el.classList.add('out'), 3400); setTimeout(() => el.remove(), 3900);
  }
  skills() {
    const g = this.g, s = g.s; if (!s.skills) return;
    const body = h(`<div class="skills"><h2>Fähigkeiten</h2><div class="sk-list"></div></div>`);
    const list = body.querySelector('.sk-list');
    for (const k of ['hw', 'mining', 'trade']) {
      const x = s.skills[k] || 0, lv = g.skillLv(k), lo = SKILL_XP[lv - 1], hi = SKILL_XP[lv], pc = hi ? Math.round(((x - lo) / (hi - lo)) * 100) : 100;
      list.append(h(`<div class="sk" data-skill="${k}"><div class="sk-ic">${skillSvg(k, 26)}</div><div class="sk-main"><div class="sk-top"><b>${SKILL[k].name}</b><span class="sk-lv">Stufe ${lv}</span></div><div class="sk-bar"><div style="width:${pc}%"></div></div><div class="sk-row"><span class="sk-now">${lv > 1 ? '<em>Aktiv</em>' : ''}${SKILL[k].now(lv)}</span><span class="sk-ep">${hi ? `${x - lo} / ${hi - lo} EP` : 'Höchste Stufe'}</span></div>${hi ? `<div class="sk-next"><em>Stufe ${lv + 1}</em>${SKILL[k].next(lv)}</div>` : ''}<div class="sk-learn"><span>EP durch ${SKILL[k].short}</span></div></div></div>`));
    }
    this.openModal(body, 'narrow', 'skills');
  }
  milestone(title, sub) {
    document.getElementById('milestone')?.remove();
    const el = h(`<div id="milestone"><div class="t1">MEILENSTEIN</div><div class="t2">${esc(title)}</div><div class="t3">${esc(sub || '')}</div></div>`);
    document.body.append(el); setTimeout(() => el.remove(), 4300);
    this.audio?.fanfare();
  }
  nwChart(cv) {
    const hist = this.g.s.stats.history; const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H); if (hist.length < 3) { ctx.fillStyle = '#c9b8a3'; ctx.font = '600 26px Nunito, sans-serif'; ctx.fillText('Noch zu wenig Daten – spiel ein paar Wochen.', 30, 60); return; }
    const vals = hist.map((p) => Math.max(1, p.n)); const lg = (v) => Math.log10(v);
    const mn = lg(Math.min(...vals)), mx = lg(Math.max(...vals)) + 0.01;
    const x = (i) => 70 + (i / (hist.length - 1)) * (W - 90), y = (v) => H - 30 - ((lg(v) - mn) / (mx - mn)) * (H - 60);
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.fillStyle = '#d9c9b4'; ctx.font = '600 20px Nunito, sans-serif';
    for (let k = 0; k <= 3; k++) { const v = mn + ((mx - mn) * k) / 3, yy = H - 30 - (k / 3) * (H - 60); ctx.beginPath(); ctx.moveTo(70, yy); ctx.lineTo(W - 10, yy); ctx.stroke(); ctx.fillText(fmtUSD(Math.pow(10, v)), 2, yy - 4); }
    ctx.fillText(fmtDate(hist[0].d), 70, H - 6); ctx.fillText(fmtDate(hist[hist.length - 1].d), W - 150, H - 6);
    ctx.beginPath(); hist.forEach((p, i) => (i ? ctx.lineTo(x(i), y(vals[i])) : ctx.moveTo(x(i), y(vals[i])))); ctx.strokeStyle = '#ffb000'; ctx.lineWidth = 3; ctx.stroke();
  }
  hint(text) { const e = $('#hint'); if (!text) e.classList.add('hidden'); else { e.textContent = text; e.classList.remove('hidden'); } }
}
