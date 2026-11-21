// DOM-Oberfläche: Topbar, Standorte, Baumenü, Inspektor, Ziele, Dock, Modals (Markt, Handy, Firma, Rangliste, Menü)
import { COINS, COIN, ALGO_LABEL } from '../data/coins.js';
import { PLACEABLE, PART, CATEGORIES, PLACEABLES, PARTS } from '../data/hardware.js';
import { FACILITIES, FACILITY, CHAPTERS, FEATURES, MESSAGES, yearTitle, FAMILY_MOOD, moodTier, FULL_TALK } from '../data/world.js';
import { fmtUSD, fmtNum, fmtCoin, fmtHash, fmtDate, fmtWatt, BUILD_FEE } from '../sim/game.js';
import { skillsMenu, skRefresh, skCloseDetail, osWizard, osAbort, deviceSecs, repairRow, skillCard, pointCard, POT_SVG } from './skills.js'; // Fähigkeiten 2.0 (Taste T)
import { POTS, SKILL } from '../data/skills.js';
import { toDay, BTC_HASH, inHeatwave, HALVINGS, BTC_REWARD } from '../data/history.js';
import { EVENT, REL_PERK } from '../data/events.js';
import { ACH, ACHIEVEMENTS } from '../data/achievements.js';
import { talkTo, PEOPLE, talkWho, KEEPSAKES, KEEPSAKE, pickKeepsake, keepsakeCount, TALK_REL } from '../data/story.js';
import { DIFFICULTY } from '../data/world.js';
import { ROLES, TRAITS, QUOTES } from '../data/staff.js';
import { CONTACTS, CONTACT, FEE_TIERS, FAMILY_CONTACTS } from '../data/contacts.js';
import { showFinale, endlessGoals, egoalKey, egoalDone } from './finale.js';
import { BILL_STAGE, billText, monthName, PAPA_HELP } from '../data/bills.js';
import { Market } from './market.js';

const $ = (s) => document.querySelector(s);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SPEEDS = [{ l: 'II', v: 0, t: 'Pause (Leertaste)' }, { l: '1×', v: 1, t: 'Echtzeit – eine Sekunde ist eine Sekunde (Taste 1)' }, { l: '60×', v: 2, t: '1 Minute pro Sekunde (Taste 2)' }, { l: '1 h/s', v: 3, t: '1 Stunde pro Sekunde – ein Tag in 24 s (Taste 3)' }, { l: '6 h/s', v: 4, t: '6 Stunden pro Sekunde – ein Tag in 4 s (Taste 4)' }, { l: '2 T/s', v: 5, t: '2 Tage pro Sekunde (Taste 5)' }, { l: '8 T/s', v: 6, t: '8 Tage pro Sekunde (Taste 6)' }];
const pctDE = (x) => (x * 100).toPrecision(3).replace('.', ',');

const PART_ICON = {
      mobo: '<rect x="3" y="3" width="18" height="18" rx="3"/><rect x="8" y="8" width="6" height="6" rx="1"/><path d="M17.5 7v4M17.5 14v3M6 17.5h4"/>',
      cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2.5v3M12 2.5v3M15 2.5v3M9 18.5v3M12 18.5v3M15 18.5v3M2.5 9h3M2.5 15h3M18.5 9h3M18.5 15h3"/>',
      gpu: '<rect x="2" y="6" width="20" height="11" rx="2.5"/><circle cx="9" cy="11.5" r="3"/><circle cx="16.5" cy="11.5" r="2"/><path d="M5 17v3M8.5 17v3"/>',
      psu: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="10" cy="12" r="4"/><path d="M10 9.5v5M7.5 12h5M17.5 9v6"/>' };
const PNAME = { mobo: 'Mainboard', cpu: 'Prozessor', gpu: 'Grafikkarte', psu: 'Netzteil' };
const potSvg = (k, size = 22) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${POT_SVG[k] || POT_SVG.w}</svg>`; // Erfahrungstöpfe (Werkstatt, Rechner, Geschäft)
const partSvg = (t, size = 22) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PART_ICON[t]}</svg>`;
const ACH_SVG = {
  got: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3.5h8l-1.2 5.2M8 3.5l1.2 5.2"/><circle cx="12" cy="14.5" r="5.5" fill="currentColor" fill-opacity=".18"/><path d="M12 11.8l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z" fill="currentColor"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="10.5" width="13" height="9.5" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>',
  secret: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.2 9.3a2.9 2.9 0 1 1 4.1 2.6c-.8.4-1.3 1-1.3 1.9v.6"/><circle cx="12" cy="17.6" r=".6" fill="currentColor"/></svg>',
};
const LOCK_SVG = '<svg class="lock-ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5.5" y="10.5" width="13" height="9.5" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';
const MONTH_RE = /^(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+\d{4}:\s*/;
const PKG_SVG = '<svg class="pkg-ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9M7.8 5.5l8.4 4"/></svg>'; // Paket
const PHONE_SVG = '<svg class="ph-ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/></svg>';
const PAUSE_LABEL = { heat: 'Pausiert (zu heiß)', event: 'Gedrosselt (Ereignis)', loss: 'Pausiert (kaum rentabel)' }; // Grund der Auto-Pause (Game.autoLimit)
const MOVE_TO = { kinder: 'In die Wohnung tragen', keller: 'In den Keller tragen', werkstatt: 'In die Werkstatt bringen', halle: 'In die Halle bringen', rz: 'Ins Rechenzentrum schicken', fjord: 'In die Fjordhalle schicken' };

// Gesprächskarte: gezeichnetes Gesicht (kein Emoji), passend zu den Figuren in der Welt
const FACES = {
  papa: { bg: '#7a5230', shirt: '#5c3d22', skin: '#e0b089', hair: '#9b9b9b', extra: '<path d="M26.5 37.2q5.5-2.6 11 0q-1.2 2.4-5.5 1.6q-4.3.8-5.5-1.6z" fill="#8a8a8a"/>', top: '<path d="M19.5 27c-.6-9 5-13.5 12.5-13.5S45.1 18 44.5 27c-1.5-5-4.6-7.5-12.5-7.5S21 22 19.5 27z" fill="#9b9b9b"/>' },
  opa: { bg: '#5b6b4a', shirt: '#46533a', skin: '#ecc4a2', hair: '#e4e4e4', extra: '<g fill="none" stroke="#4a3b2c" stroke-width="1.4"><circle cx="27" cy="29" r="3.6"/><circle cx="37" cy="29" r="3.6"/><path d="M30.6 29h2.8"/></g><path d="M27.5 36.6q4.5-1.8 9 0" stroke="#d8d8d8" stroke-width="2.2" fill="none" stroke-linecap="round"/>', top: '<path d="M19.6 30c-1.4-4 .2-8.4 2.6-9.6c-.6 3 .2 5.2-.4 9.6zM44.4 30c1.4-4-.2-8.4-2.6-9.6c.6 3-.2 5.2.4 9.6z" fill="#e4e4e4"/>' },
  deniz: { bg: '#2e6fd6', shirt: '#24539e', skin: '#c89a72', hair: '#231811', extra: '', top: '<path d="M19 28c-2-10 4.5-15.5 13-15.5S47 18 45 28c-.8-3.6-2.4-5.6-4.4-6.6c-.6 2-3.4 2.6-5 .8c-1.4 1.8-4.6 1.8-5.6-.2c-1.4 1.6-4.6 1.4-5.2-.6c-2.6 1-4.6 3.2-5.8 6.6z" fill="#231811"/>' },
  tech: { bg: '#e07a10', shirt: '#b45f0a', skin: '#e0b394', hair: '#3a2a1c', extra: '', top: '<path d="M18.6 26.5a13.4 12 0 0 1 26.8 0z" fill="#ffd400"/><rect x="16.5" y="25.4" width="31" height="3" rx="1.5" fill="#f2c600"/><rect x="30.6" y="14.6" width="2.8" height="8" rx="1.2" fill="#f2c600"/>' },
  mama: { bg: '#c2577a', shirt: '#9c3f5d', skin: '#efc3a0', hair: '#7a4a2a', extra: '', top: '<path d="M18.8 31c-.8 6.4.4 11.4 2.6 14.4l3.2-1.2c-2-3.6-2.6-8.6-2.4-13.2zM45.2 31c.8 6.4-.4 11.4-2.6 14.4l-3.2-1.2c2-3.6 2.6-8.6 2.4-13.2z" fill="#7a4a2a"/><path d="M18.6 31.5c-1.6-11 4-18.4 13.4-18.4S47 20.5 45.4 31.5c-1-3-1.8-6.4-3-8.6c-3 1.8-7.4 2-10.6.4c-3.4 1.6-7.6 1.4-10.4-.4c-1.2 2.2-2 5.6-2.8 8.6z" fill="#7a4a2a"/>' },
  kemal: { bg: '#2f9d6e', shirt: '#22724f', skin: '#c9946b', hair: '#1c140f', extra: '<g fill="none" stroke="#1c140f" stroke-width="1.5"><rect x="23.2" y="26.4" width="7.4" height="5.4" rx="1.5"/><rect x="33.4" y="26.4" width="7.4" height="5.4" rx="1.5"/><path d="M30.6 28.6h2.8"/></g>', top: '<path d="M19.4 27.5c-1.2-9 4.6-14 12.6-14s13.8 5 12.6 14c-1.2-4-3.4-6.6-6-7.6c-3.4 1.4-9.8 1.4-13.2 0c-2.6 1-4.8 3.6-6 7.6z" fill="#1c140f"/>' },
  jonas: { bg: '#4f6fd0', shirt: '#3a4f99', skin: '#f0c7a6', hair: '#c9a25a', extra: '', top: '<path d="M20.4 29c.4-2.4 2.6-3.6 5.4-3.4l-.6 2.2c-1.8-.2-3.4.2-4.8 1.2zM43.6 29c-.4-2.4-2.6-3.6-5.4-3.4l.6 2.2c1.8-.2 3.4.2 4.8 1.2z" fill="#c9a25a"/><path d="M18.8 25.6a13.2 12.6 0 0 1 26.4 0z" fill="#d8643a"/><rect x="17.4" y="23.6" width="29.2" height="4.6" rx="2.3" fill="#b8502c"/><circle cx="32" cy="12.6" r="2.6" fill="#d8643a"/>' },
};
function faceSvg(who) {
  const f = FACES[who] || FACES.tech;
  return `<svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="${f.bg}"/><path d="M9 64c2.5-11 11-16.5 23-16.5S52.5 53 55 64z" fill="${f.shirt}"/><rect x="28.5" y="40" width="7" height="9" rx="3" fill="${f.skin}"/><circle cx="19.6" cy="31" r="2.6" fill="${f.skin}"/><circle cx="44.4" cy="31" r="2.6" fill="${f.skin}"/><ellipse cx="32" cy="30" rx="12.4" ry="14" fill="${f.skin}"/>${f.top}<circle cx="27" cy="29.2" r="1.6" fill="#2a1d16"/><circle cx="37" cy="29.2" r="1.6" fill="#2a1d16"/><path d="M24.8 25.4h4.4M34.8 25.4h4.4" stroke="${f.hair}" stroke-width="1.6" stroke-linecap="round"/><path d="M28.4 38.4q3.6 2.6 7.2 0" stroke="#7a3f30" stroke-width="1.6" fill="none" stroke-linecap="round"/>${f.extra}</svg>`;
}

export class UI {
  constructor(game, world) {
    this.g = game; this.w = world; this.cat = 'rigs'; this.marketCoin = 'BTC'; this.lastBuildDay = -1;
    this.mk = new Market(this); // Browser „Shop | Börse“ (market.js): Fenster und PC-Monitor
    this.dock(); this.speedBar();
    world.onSelect = (uid) => this.inspect(uid);
    world.onHeat = () => this.sites();
    world.onEmpire = (on) => { this.dock(); this.hint(on ? 'Ziehen = drehen · Rad = Zoom · K = zurück' : null); document.body.classList.toggle('empire', on); };
    world.onPlacing = (on) => { this.placingHint = on; this.placedRun = 0; this.prompt(null); this.hint(on ? 'Klick = setzen · R = drehen · Rechtsklick = fertig' : null); };
    world.onAim = (aim) => { document.body.classList.toggle('aiming', !!aim); this.prompt(aim); };
    world.onInteract = (uid) => this.openInspector(uid);
    world.onDoor = (door) => this.travel(door);
    world.onParcel = (id) => this.pickParcel(id); // Paket vor der Wohnungstür aufheben (die Welt zeigt die Kartons: world.syncParcels)
    world.onProp = (p) => this.useProp(p);
    world.onSnap = () => this.audio?.install?.();
    world.onNoAim = () => { // E ohne Ziel: das markierte Ziel in Reichweite benutzen
      const t = this.objTarget, g = this.g; if (!t) return;
      const lt = Object.keys(g.s.loose || {}).find((k) => t.label === PNAME[k]); if (lt) { world.onLoose(lt); return; }
      const pc = g.facObjects(g.s.current).find((o) => o.type === 'tower'); if (pc && t.label === 'Dein PC') { this.openInspector(pc.uid); return; }
      const pr = world.room?.props?.find((p) => p.action === 'market'); if (pr && (t.label === 'Börse' || t.label === 'Bitcoin verkaufen' || t.label === 'Shop: Grafikkarte bestellen')) { this.useProp(pr); return; } // an den Monitor (Browser „Shop | Börse“)
      if (t.label === 'Paket abholen' && t.final) { const p = g.s.parcels?.[0]; if (p) world.pickParcel(p.id); return; }
      if (/ freischalten$/.test(t.label)) { if (world.hoff) { if (t.final) this.travel(t.door); } else if (world.room?.doors?.[0]) this.travel(world.room.doors[0]); }
    };
    // Haus (Wohnung ↔ Treppenhaus ↔ Keller): Standortwechsel zu Fuß, Türgeräusch, Hinweis auf die Taschenlampe
    world.onHouseMove = (id) => this.houseMove(id);
    world.onDoorSound = (key, open) => this.audio?.door?.(open);
    world.onZone = (where) => { if (where === 'kel' && world.dusty && !world.vm?.lampOn && !this.lampHinted) { this.lampHinted = true; this.lampHint = this.toast('Ganz schön dunkel hier unten. <kbd>F</kbd> schaltet die Taschenlampe an.', 'info', 4500); } };
    world.onInstalled = (uid) => { this.installing = false; this.flushXp(); if (this.inspUid === uid) this.inspect(uid); if (this.afterSnap) { this.toast(this.afterSnap, 'good', 2600); this.afterSnap = null; } };
    world.onLoose = (t) => { this.w.pickupFx(t); if (!this.g.s.loose?.[t]) return; this.toast(`${PNAME[t]} in der Tasche`, 'good', 2200); if (!this.g.pickUp(t)) return; this.lastPick = { t, at: performance.now() }; setTimeout(() => this.goals(), 1300); this.audio?.install?.(); this.goals(); };
    world.onKeep = (id) => this.pickKeep(id);
    game.on('xp', (k, n, lv) => this.xpPop(k, n, lv));
    game.on('skill', (id) => { if (this.w.focus || this.installing) { this.lvQ = ['sk', id]; return; } setTimeout(() => skillCard(this, id), 700); this.dock(); }); // „Gelernt …“
    game.on('skillopen', (ids) => { if (!this.g.has('skills')) return; this.toast(`<b>Neu lernbar:</b> ${ids.slice(0, 3).map((id) => esc(SKILL[id]?.name || id)).join(', ')}${ids.length > 3 ? ' …' : ''} – <kbd>T</kbd>`, 'good', 6000); this.dock(); });
    game.on('skills', () => { skRefresh(this); this.dock(); });
    world.onIncome = () => { this.bumpWallet(); this.audio?.tick?.(); };
    world.onLamp = (on) => { if (on) this.lampHint?.remove(); this.toast(on ? 'Taschenlampe an' : 'Taschenlampe aus', 'info', 1500); this.keysHint(); };
    world.onPause = () => this.pause(true);
    world.onCanvasClickInUI = () => this.resume();
    world.onPlaced = (o, p) => { const again = this.placedAgain(o, p); this.pauseHint(this.g.facOf(o.uid) || this.g.s.current); return again; }; // true = gleich noch einen setzen (Rigs, Miner, Regale)
    world.onModeChange = (m) => { document.body.dataset.mode = m; this.dock(); };
    world.onLockChange = (locked) => { $('#clickhint').classList.toggle('hidden', locked || this.w.mode !== 'play' || this.w.touchMode || !!this.paused); };
    $('#modal .modal-x').onclick = () => this.closeModal();
    $('#modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') this.closeModal(); });
    $('#pause-resume').onclick = () => this.resume();
    $('#pause-menu').onclick = () => { this.pause(false); this.menu(); };
    // Einstellungen in der Pause: Ton, Mausempfindlichkeit (pro Gerät gemerkt)
    const pref = (() => { try { return JSON.parse(localStorage.getItem('hashwerk_prefs') || '{}'); } catch (e) { return {}; } })();
    const savePref = () => { try { localStorage.setItem('hashwerk_prefs', JSON.stringify(pref)); } catch (e) { /* egal */ } };
    this.pref = pref; this.savePref = savePref; // auch für weitere Schalter (Jahresrückblick)
    const snd = $('#ps-sound'), sens = $('#ps-sens');
    const applySnd = () => { const on = pref.sound !== false; snd.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/>${on ? '<path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>' : '<path d="M16 9.5l5 5M21 9.5l-5 5"/>'}</svg><span>${on ? 'Ton an' : 'Ton aus'}</span>`; snd.setAttribute('aria-pressed', on); snd.title = on ? 'Ton ist an – klicken zum Ausschalten' : 'Ton ist aus – klicken zum Einschalten'; snd.classList.toggle('off', !on); this.audio?.setMuted?.(!on); };
    snd.onclick = () => { pref.sound = pref.sound === false; savePref(); applySnd(); };
    sens.value = pref.sens || 1; const applySens = () => { this.w.player.sens = 0.0022 * (+sens.value || 1); const v = $('#ps-val'); if (v) v.textContent = (+sens.value).toLocaleString('de-DE', { minimumFractionDigits: 1 }) + '×'; };
    sens.oninput = () => { pref.sens = +sens.value; savePref(); applySens(); };
    setTimeout(() => { applySnd(); applySens(); }, 0);
    $('#clickhint').onclick = () => this.w.requestLock();
    game.on('toast', (t, k, ms) => this.toast(t, k, ms));
    const showMsg = (m) => { if (document.querySelector('#featcards .featcard:not(.lesson)') || document.getElementById('lvup') || this.lvBusy) { setTimeout(() => showMsg(m), 1200); return; } this.toast(`<b>${m.tip ? 'Tipp von ' : ''}${esc(m.from)}:</b> ${esc(m.text)}`, 'msg', m.tip ? 10000 : 7000); this.dock(); };
    this.flushMsgs = (base = 3000) => { const q = this.msgQ || []; this.msgQ = []; q.forEach((m, i) => setTimeout(() => showMsg(m), base + i * 2500)); };
    game.on('message', (m) => { if (this.inspUid || this.w.focus) { (this.msgQ ||= []).push(m); this.dock(); return; } showMsg(m); });
    game.on('news', () => this.ticker());
    game.on('feature', (f) => this.featureCard(f));
    game.on('lesson', (f) => { if (!f) this.lessonDone(); }); // Lektion benutzt: Hinweiskarte weg (die nächste kommt über 'feature')
    game.on('milestone', (t, sub) => this.milestone(t, sub));
    game.on('won', () => this.ending());
    game.on('egoal', (id) => egoalDone(this, id));
    game.on('event', () => { this.evSnooze = null; this.tryEvent(); });
    game.on('achievement', (id) => { const a = ACH[id]; if (a) setTimeout(() => this.milestone(a.name, a.desc, 'Erfolg'), 600); });
    game.on('offer', (usd) => this.offer(usd));
    game.on('release', (it, text) => { if (it.type !== 'psu' && it.type !== 'mobo') this.toast(`${esc(text)}`, 'info', 6000); this.ticker(); this.lastBuildDay = -99; });
    game.on('update', () => this.onDay());
    game.on('refresh', () => this.refresh());
    game.on('goal', () => { this.audio?.cash(); });
    game.on('bill', (b) => this.onBill(b)); // Monatsabrechnung gebucht (b) oder offene Rechnung bezahlt (null)
    game.on('idea', () => this.ringCard('Deniz')); // Anlernen: Deniz schreibt von Bitcoin
    game.on('papaLoan', () => { if (this.modalKind === 'company') this.reCompany(); this.dock(); });
    game.on('facfull', (id, c) => this.facFull(id, c));
    game.on('bag', () => this.refresh()); // Teile gekauft/verkauft/ein- und ausgebaut
    game.on('parcels', () => { this.w.syncParcels?.(); this.refresh(); }); // Paket geliefert oder aufgehoben
    game.on('orders', () => this.refresh()); game.on('unpacked', () => this.refresh()); // Bestellt, ausgepackt, aufgestellt
    game.on('contact', () => { this.lastBuildDay = -99; this.refresh(); }); // Kontakt kennengelernt/angerufen: Katalog zeigt „Fertig bestückt“
    game.on('unlockable', (id) => { this.milestone('Kapitel geschafft', `${FACILITY[id].short} ist frei`); this.toast(`<b>${FACILITY[id].short}</b> ist frei`, 'good', 8000); this.goals(); this.sites(); });
    this.initProgress(); // Jahresrückblick, Erfolge im Logbuch, Bonusziele
    setInterval(() => { this.top(); this.buildAfford(); }, 200);
    this.refresh(); this.ticker();
  }

  // Geldbeträge im Katalog: ab 10 $ ganze Dollar, darunter mit Cent – überall gleich
  money(v) { return v >= 10 ? Math.ceil(v - 1e-9).toLocaleString('de-DE') + ' $' : fmtUSD(v); }
  // „Dir fehlen …“ – und wenn Coins auf der Börse liegen, die das decken: verkaufen (M)
  missText(p, ex = null) { const g = this.g, gap = p - g.s.cash; if (!(gap > 0)) return ''; ex ??= g.has('market') ? g.exchangeValue() : 0; return `Dir fehlen ${this.money(gap)}${ex >= gap ? ' – verkauf Bitcoin an der Börse (M)' : ''}`; }
  buildAfford() {
    if (!document.body.classList.contains('show-build')) return;
    const cash = this.g.s.cash, ex = this.g.has('market') ? this.g.exchangeValue() : 0;
    for (const card of document.querySelectorAll('#build .item[data-price]')) {
      const p = +card.dataset.price, fp = +(card.dataset.fp || p), short = p > cash; const off = !!(card.dataset.hydro || card.dataset.sold || card.dataset.full); card.classList.toggle('dis', short || off); const pb = card.querySelector('.place'); if (pb) pb.disabled = short || off;
      const m = card.querySelector('.miss'); if (m) { const t = card.dataset.full ? 'Kein Platz mehr – Zeit für einen größeren Standort' : fp > cash ? this.missText(fp, ex) : ''; if (m.textContent !== t) m.textContent = t; } // fp: voller Rig („Dir fehlen …“), p: kleinster Einstieg
    }
    for (const b of document.querySelectorAll('#build button[data-p]')) b.disabled = +b.dataset.p > cash || b.dataset.full === '1';
  }
  // Offener Katalog: Tagespreise aktualisieren, ohne die Karten neu aufzubauen
  buildPrices() {
    if (!document.body.classList.contains('show-build')) return;
    for (const card of document.querySelectorAll('#build .item[data-id]')) {
      const it = PLACEABLE[card.dataset.id]; if (!it) continue; const p = this.g.itemPrice(it); if (+card.dataset.price === p) continue;
      if (card.dataset.rig) continue; // Rig-Karten: Preise hängen am Build, neu aufbauen reicht wöchentlich
      card.dataset.price = p; const pe = card.querySelector('.t .p'); if (pe) pe.textContent = this.money(p); const pb = card.querySelector('.place'); if (pb) pb.textContent = this.buyLabel(p);
    }
    this.buildAfford();
  }
  refresh() { this.top(); this.sites(); this.build(true); this.goals(); this.dock(); if (this.inspUid) this.inspect(this.inspUid, true); }
  onDay() {
    if (this.g.s.ev?.open) this.tryEvent();
    this.sites(); this.goals(); this.keysHint();
    if (this.g.s.day % 7 === 0) this.dock();
    if (this.g.s.day - this.lastBuildDay >= 7) this.build(true); else this.buildPrices();
    if (this.inspUid) this.inspectStats();
    this.market(true); // Börse auffrischen, falls sie offen ist
    if (this.modalKind === 'ranking') this.ranking();
    if (this.modalKind === 'company') this.company();
  }

  // ---------- Topbar ----------
  speedBar() {
    const el = $('#speed'); el.innerHTML = '';
    SPEEDS.forEach((s) => { const b = h(`<button title="${s.t}">${s.l}</button>`); b.onclick = () => this.setSpeed(s.v); if (!this.speedOk(s.v)) b.style.display = 'none'; el.append(b); });
    el.style.display = this.g.s.flags?.tutor && !this.g.has('speed2') ? 'none' : ''; // Anlernen: Tempo-Knöpfe erst mit dem Zeitraffer
    this.setSpeed(this.g.s.speed ?? 0);
  }
  speedOk(v) { const g = this.g; return v <= 1 || (v <= 4 && g.has('speed2')) || (v >= 5 && g.has('speed3')); } // Zeitraffer: Minuten bis 6 Std/s, schneller vorspulen: Tage pro Sekunde
  setSpeed(v) { if (!this.speedOk(v)) { this.toast('Noch nicht freigeschaltet.', 'info', 1800); return; } this.g.s.speed = v; if (v) this.lastSpeed = v; this.g.s.paused = v === 0; if (v >= 2) this.g.learned?.('speed2'); if (v >= 5) this.g.learned?.('speed3'); [...$('#speed').children].forEach((b, i) => b.classList.toggle('on', SPEEDS[i].v === v)); }
  top() {
    const g = this.g, s = g.s;
    const vf = this.w.visFrac ?? s.frac, day = vf > 0.27 && vf < 0.79;
    const icon = day ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>' : '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z" fill="currentColor"/></svg>';
    $('#date').innerHTML = `${fmtDate(s.day, true)}<span class="tod" title="${day ? 'Tag' : 'Nacht'}">${icon}</span>${inHeatwave(s.day) ? '<span class="hw-ic" title="Hitzewelle: +6 °C Umgebung"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 4.5a2 2 0 0 1 4 0v9.2a4 4 0 1 1-4 0z"/><circle cx="12" cy="16.8" r="1.6" fill="currentColor"/><path d="M12 9v6"/></svg></span>' : ''}`;
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
    for (const [id, ok] of [['#st-profit', mOn], ['#st-hash', mOn], ['#st-nw', g.has('rigs')], ['#st-btc', !s.flags.tutor || g.has('market')]]) $(id).style.display = ok ? '' : 'none';
    document.body.classList.toggle('tut-nobtc', !!s.flags.tutor && !g.has('market')); // Anlernen: Bitcoin-Kurs erst mit der Börse (CSS erzwingt sonst die Anzeige)
    $('#st-cash').title = 'Bargeld · am 1. jedes Monats werden Miete und Strom abgebucht (Handy → Konto)'; $('#st-nw').title = 'Kontostand + Coins + Wiederverkaufswert der Hardware − Kredit, Papas Darlehen und Rechnungen'; $('#st-profit').title = 'Mining-Ertrag minus Strom, Miete, Löhne und Zinsen pro Tag';
    const ob = g.owed?.() || 0, dl = (g.nextBillDay?.() ?? s.day + 99) - s.day, est = ob <= 0 && mOn && s.flags.miningStarted && dl <= 5 ? g.billEstimate() : 0;
    const bsub = ob > 0 ? `<div class="bill-due neg">${esc(BILL_STAGE[Math.min(3, s.bills.open.stage)])}: ${fmtUSD(ob)} offen</div>` : est >= 1 ? `<div class="bill-due">Abrechnung ${dl <= 1 ? 'morgen' : `in ${dl} Tagen`}: ~${fmtUSD(est)}</div>` : ''; // Monatserster: Miete und Strom
    $('#st-cash').innerHTML = `<div class="l">Kontostand</div><div class="v ${s.cash < 0 ? 'neg' : ''}">${fmtUSD(this.dCash)}</div>${bsub}`;
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
    const g = this.g, s = g.s, w = this.w; let pos = null, label = '', aimed = false, final = false, tdoor = null;
    const play = w.mode === 'play' && !this.paused && !w.cine, where = w.houseWhere?.() || null; // Haus: 'apt' | 'up' | 'low' | 'kel'
    const route = (t, lab) => { const p = w.houseRoute(t); if (p) { pos = p; label = lab; final = (t === 'haustuer' || t === 'parcels') && where === 'up'; } };
    const lying = Object.keys(s.loose || {});
    if (s.chapter === 0 && play && !s.flags.miningStarted && where) { // Anfang: zu Fuß in den Keller, Teile suchen, wieder hoch zum PC
      if (lying.length && where !== 'kel') route('keller', 'Runter in den Keller');
      else if (lying.length) {
        const spots = w.room?.looseSpots || {}, here = lying.filter((t) => spots[t]);
        if (here.length) { const cp = w.camera.position, d = (t) => Math.hypot(spots[t][0] - cp.x, spots[t][2] - cp.z) + (w.toScreen(spots[t][0], spots[t][1] + 0.1, spots[t][2]).on ? 0 : 100); const keep = here.includes(this.markLoose) && w.toScreen(spots[this.markLoose][0], spots[this.markLoose][1] + 0.1, spots[this.markLoose][2]).on; const t = keep ? this.markLoose : here.sort((a, b) => d(a) - d(b))[0]; this.markLoose = w.markLoose = t; pos = [spots[t][0], spots[t][1] + 0.1, spots[t][2]]; label = PNAME[t]; aimed = w.aim?.loose === t; }
      } else if (where !== 'apt') route('kinder', 'Hoch in deine Wohnung');
      else { const pc = g.facObjects('kinder').find((o) => o.type === 'tower'); if (pc) { pos = [pc.x, 0.78, pc.z]; label = 'Dein PC'; aimed = w.aim?.uid === pc.uid; } }
    } else if (s.chapter === 0 && play && !where && w.facId === 'kinder') { // (ohne Treppenhaus)
      const pc = g.facObjects('kinder').find((o) => o.type === 'tower'); if (pc && !s.flags.miningStarted) { pos = [pc.x, 0.78, pc.z]; label = 'Dein PC'; aimed = w.aim?.uid === pc.uid; }
    }
    if (!pos && s.chapter === 0 && play && (where === 'apt' || (!where && w.facId === 'kinder')) && s.flags.miningStarted && s.flags.cpuStart && g.has('build') && !s.flags.gpuOrdered && !s.flags.boughtGpu) { const pr = w.room?.props?.find((p) => p.action === 'market'); if (pr) { pos = [pr.c[0], pr.c[1] + 0.16, pr.c[2]]; label = 'Shop: Grafikkarte bestellen'; aimed = w.aim?.prop === pr; } } // erstes Ziel nach dem Einschalten: der Shop am Monitor
    const parcelFirst = !!(where && w.parcelsLying?.()); // ein Paket vor der Tür geht vor (Börse/Freischalten können warten)
    if (!pos && !parcelFirst && s.chapter === 0 && play && (where === 'apt' || (!where && w.facId === 'kinder')) && s.flags.miningStarted && g.has('market') && !(s.stats.sold > 0)) { const pr = w.room?.props?.find((p) => p.action === 'market'); if (pr) { pos = [pr.c[0], pr.c[1] + 0.16, pr.c[2]]; label = 'Bitcoin verkaufen'; aimed = w.aim?.prop === pr; } }
    if (!pos && !parcelFirst && play && (where || !this.visiting) && s.flags.miningStarted) { // neuer Standort frei: im Haus an der Haustür (Keller: an der Kellertür), sonst an der Tür
      const fu = FACILITIES.find((f) => g.canUnlock(f.id)), door = w.room?.doors?.[0];
      if (fu && where) { if (fu.id === 'keller') { route('keller', `${fu.short} freischalten`); final = where === 'low'; tdoor = { kind: 'kellertuer', label: 'Kellertür' }; } else { route('haustuer', `${fu.short} freischalten`); tdoor = { kind: 'haustuer', label: 'Haustür' }; } }
      else if (fu && door && !door.auto) { pos = [door.c[0], Math.min(1.7, door.c[1] + 0.5), door.c[2]]; label = `${fu.short} freischalten`; aimed = w.aim?.door === door; }
    }
    if (!pos && play && where && w.parcelsLying?.()) { // Pakete vor der Wohnungstür
      route('parcels', 'Paket abholen'); if (pos && w.toScreen(...pos).dist < 1.7) pos = null;
    }
    if (!pos && play && where && this.walkGoal) { // Klick auf Wohnung/Keller oben: Weg zeigen
      const done = this.walkGoal.id === 'keller' ? where === 'kel' : where === 'apt';
      if (done || performance.now() > this.walkGoal.until) this.walkGoal = null; else route(this.walkGoal.id, this.walkGoal.id === 'keller' ? 'Zum Keller' : 'Zur Wohnung');
    }
    const sp = pos && w.toScreen(...pos);
    this.objTarget = sp && sp.dist < 2.0 ? { label, pos, final, door: tdoor } : null;
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
    const f0 = s.mineDay0 === s.day ? s.mineFrac0 || 0 : 0, fa = s.accr?.day === s.day && (s.accr.coin || 'BTC') === 'BTC' ? s.accr.f : 0;
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
      const kw = sm.watt / 1000, cap = sm.capKw, ci = this.capInfo(f.id);
      const b = h(`<div class="site ${g.s.current === f.id ? 'on' : ''}"><div class="n">${f.short} ${sm.tripped ? '<b class="neg">· Sicherung raus</b>' : ''}${g.s.fac[f.id].mothball ? '<b class="moth">· eingemottet</b>' : ''}</div>
        <div class="m" title="${kw < 10 ? kw.toFixed(2) : kw.toFixed(0)} / ${cap} kW"><span class="${sm.temp > 38 ? 'neg' : ''}">${sm.temp.toFixed(0)} °C</span></div>
        <div class="caps"><span class="cp ${ci.c.used >= ci.c.max ? 'full' : ''}" title="Stellplätze für Rigs, Miner und Regale"><em>Platz</em> ${ci.plc}<i><b style="width:${ci.sp}%"></b></i></span><span class="cp ${ci.pp >= 90 ? 'full' : ''}" title="Last am Stromanschluss"><em>Strom</em> ${ci.pw}<i><b style="width:${ci.pp}%"></b></i></span></div></div>`);
      b.onclick = () => { if (g.s.current !== f.id) this.goSite(f.id); };
      el.append(b);
    }
    const hb = h(`<div class="site ${this.w.heatMode ? 'on' : ''}" title="Wärmebild ein/aus (Taste I)"><div class="n">Wärmebild</div><div class="m">Taste I</div></div>`);
    hb.onclick = () => this.toggleHeat(); if (g.has('heat')) el.append(hb);
    const br = g.brokenIn(g.s.current);
    if (br.n) { const b = h(`<div class="site fix" title="Alle defekten Geräte hier reparieren"><div class="n">${br.n} defekt</div><div class="m">Alle reparieren: ${fmtUSD(br.c)}</div></div>`); b.onclick = () => { const n = g.repairAll(g.s.current); this.toast(n ? `${n} Gerät(e) repariert` : 'Nicht genug Geld.', n ? 'good' : 'bad'); this.sites(); }; el.append(b); }
  }
  // Standort wählen (Leiste oben, Firma, Haustür): Wohnung ↔ Keller geht man zu Fuß, alles andere per Überblendung
  goSite(id) {
    const w = this.w;
    if ((id === 'kinder' || id === 'keller') && w.hoff && !w.empire) {
      this.resume(); this.walkGoal = { id, until: performance.now() + 90000 };
      this.toast(id === 'keller' ? 'Zum Keller gehst du zu Fuß: raus in den Flur und die Kellertreppe runter.' : 'Zur Wohnung: die Kellertreppe hoch, dann die paar Stufen rauf zur Wohnungstür.', 'info', 3800);
      return;
    }
    this.switchSite(id, { arrive: true });
  }
  // opt.arrive: Ankunft von einem anderen Standort – zu Hause beginnt man im Hausflur an der Haustür
  switchSite(id, opt = {}) {
    this.fade();
    const fromMap = !!this.w.empire; if (fromMap) this.w.hideEmpire(false); // Raum wird gleich ohnehin neu geladen
    const wasHouse = !!this.w.hoff && !fromMap;
    this.g.s.current = id; this.visiting = null; document.body.classList.remove('visiting'); this.walkGoal = null;
    this.w.loadFacility(id, { at: opt.arrive && id === 'kinder' && !wasHouse ? 'haustuer' : null });
    if (fromMap) { this.pause(false); this.w.setMode('play'); }
    if (this.inspUid) { this.inspUid = null; $('#inspector').classList.add('hidden'); }
    this.refresh(); this.toast(`${esc(FACILITY[id].name)} – ${esc(FACILITY[id].place)}`, 'info', 3000);
  }
  fade() { const f = $('#fade'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }

  // ---------- Shop (Baumenü) ----------
  // Paket-Modus (Game.parcelMode, neue Spiele bis zur Werkstatt): die Kaufknöpfe bestellen – geliefert wird am nächsten Morgen als Paket vor die
  // Wohnungstür. Oben stehen Lieferstatus und der Bestand „Ausgepackt – zum Aufstellen“ (aufstellen kostet nichts mehr).
  build(force = false) {
    const el = $('#build'), g = this.g, fac = g.s.current, pm = g.parcelMode();
    if (!force && el.childElementCount) return;
    this.lastBuildDay = g.s.day;
    el.innerHTML = '';
    const head = h(`<div class="bhead"><h2>Shop${pm ? '<span class="bsub">Online-Shop · Lieferung morgen vor deine Wohnungstür</span>' : ''}</h2><button class="modal-x" title="Schließen (B)">✕</button></div>`); head.querySelector('button').onclick = () => this.resume(); head.lastElementChild.before(this.capStrip(fac)); el.append(head);
    const cats = h('<div class="cats"></div>');
    const catOk = (c) => (c.id === 'parts' ? (g.has('rigs') || !!g.s.flags.cpuStart) && PARTS.some((p) => g.available(p)) : (c.id !== 'rigs' || g.has('rigs')) && g.shopList(c.id, fac).length > 0); // CPU-Start: Teile (Grafikkarten) gleich von Anfang an
    if (!CATEGORIES.some((c) => c.id === this.cat && catOk(c))) this.cat = (CATEGORIES.find(catOk) || CATEGORIES[0]).id;
    for (const c of CATEGORIES.filter(catOk)) { const b = h(`<button class="${this.cat === c.id ? 'on' : ''}"><span class="ic">${c.icon}</span>${c.name}</button>`); b.onclick = () => { this.cat = c.id; this.build(true); }; cats.append(b); }
    el.append(cats);
    const list = h('<div class="items"></div>');
    this.shopTop(list, fac); // Lieferstatus und Ausgepacktes – in allen Rubriken oben
    if (this.cat === 'parts') { el.style.setProperty('--cols', 3); this.partsView(list); el.append(list); return; }
    const items = g.shopList(this.cat, fac).sort((a, b) => b.releaseDay - a.releaseDay);
    if (this.cat === 'rigs') { const kb = this.kitsBar(fac); if (kb) list.append(kb); }
    if (this.cat === 'rigs' && g.s.lastBuild) { const lb = this.lastBuildCard(fac); if (lb) list.append(lb); }
    el.style.setProperty('--cols', list.querySelector('.unpack, .shipbar') ? 3 : Math.max(1, Math.min(3, items.length))); // Lieferstatus/Ausgepacktes brauchen die volle Breite
    if (!items.length) list.append(h('<div class="empty">Noch nichts da.</div>'));
    for (const it of items) {
      const lk = g.skillLock(it); // Fähigkeit fehlt (z. B. Milchkiste: Riser und Open-Frame, FPGA, Roboter)
      if (lk) { const c = h(`<div class="item dis sk-locked"><div class="t"><span>${esc(it.name)}</span><span class="p">${this.money(g.itemPrice(it))}</span></div><div class="s">${esc(it.desc || '')}</div><div class="sk-lock"><span>${esc(lk)}</span></div><button class="btn small">Im Fähigkeiten-Baum ansehen</button></div>`); try { const url = this.w.thumbnail(it.id); if (url) c.prepend(h(`<div class="thumb"><img alt="" src="${url}"/></div>`)); } catch (e) { /* ohne Vorschau */ } c.querySelector('button').onclick = (e) => { e.stopPropagation(); this.resume(); this.skills(it.skill); }; list.append(c); continue; }
      if (it.kind === 'rig') { list.append(this.rigCard(it, fac)); continue; }
      const price = g.itemPrice(it); const isNew = g.s.day - it.releaseDay < 120;
      let s = esc(it.desc || '');
      if (it.kind === 'device') { const of = g.devOffer(it, fac); s = `${fmtHash(it.hash, it.algo)} · ${fmtWatt(it.watt)} · ${ALGO_LABEL[it.algo]}<br/>≈ <b class="${of.net >= 0 ? 'pos' : 'neg'}">${of.net >= 0 ? '+' : ''}${fmtUSD(of.net)}/Tag</b> hier · ${this.roiText(of.roi)}${it.hydro ? ' · nur in Rack/Container' : ''}`; }
      if (it.kind === 'cooling') s = `Kühlt ${fmtWatt(it.cool)} · verbraucht ${fmtWatt(it.watt)}`;
      if (it.kind === 'holder') s = `${esc(it.desc)}<br/><span class="rc-dim">1 Stellplatz für ${it.slots} Geräte</span>`;
      if (it.kind === 'device' && g.facTier(fac) >= 1 && !it.hydro) s += `<br/><span class="rc-dim">Tipp: im Regal teilen sich 8 Miner einen Stellplatz</span>`;
      const left = g.stockLeft(it), sold = left === 0; if (left !== Infinity) s += `<br/><span class="stock ${sold ? 'neg' : ''}">${sold ? 'Kontingent: ' + esc(g.stockText(it)) : `Kontingent: noch ${left} Stück diesen Monat`}</span>`;
      if ((it.kind === 'device' || it.kind === 'holder') && g.slotOk(fac, it) && g.rentStart(fac) > 0) s += `<br/><b class="rc-warn">Startet die Miete: −${fmtUSD(g.rentStart(fac))}/Tag</b>`; // erstes Gerät am Miet-Standort
      const noSlot = pm ? !g.orderRoomOk(it) : !g.slotOk(fac, it); if (noSlot) s += `<br/><span class="stock neg">${pm && g.pendingSlots() ? 'Kein Platz mehr – Bestelltes belegt die letzten Plätze' : `Alle ${g.slotsMax(fac)} Plätze belegt`}</span>`;
      const card = h(`<div class="item ${price > g.s.cash || it.hydro || noSlot ? 'dis' : ''}" data-price="${price}" data-id="${it.id}" ${it.hydro ? 'data-hydro="1"' : ''} ${noSlot ? 'data-full="1"' : ''}><div class="t"><span>${esc(it.name)}${isNew ? '<span class="new">NEU</span>' : ''}</span><span class="p">${this.money(price)}</span></div><div class="s">${s}</div><div class="miss">${this.missText(price)}</div><button class="btn small primary place" ${price > g.s.cash || it.hydro ? 'disabled' : ''}>${this.buyLabel(price)}</button></div>`);
      try { const url = this.w.thumbnail(it.id); if (url) card.prepend(h(`<div class="thumb"><img alt="" src="${url}"/></div>`)); } catch (e) { /* ohne Vorschau weiter */ }
      if (sold) { card.dataset.sold = '1'; card.classList.add('dis'); card.querySelector('.place').disabled = true; card.addEventListener('click', (e) => { e.stopImmediatePropagation(); this.toast(`${it.name}: ${g.stockText(it)}`, 'bad'); }); }
      card.onclick = () => {
        if (it.hydro) { this.toast('Hydro-Miner nur in Rack oder Container.', 'bad'); return; }
        if (g.parcelMode()) { this.orderItem(it); return; }
        if (!g.slotOk(fac, it)) { this.toast('Kein Platz mehr – Zeit für einen größeren Standort.', 'bad'); return; }
        if (g.itemPrice(it) > g.s.cash) { this.toast('Nicht genug Geld.', 'bad'); return; } // Preis von heute, nicht vom Öffnen
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
  // Kaufknopf: im Paket-Modus „Bestellen · X $“, sonst „Platzieren · X $“
  buyLabel(price, verb = null) { return `${verb || (this.g.parcelMode() ? 'Bestellen' : 'Platzieren')} · ${this.money(price)}`; }
  // Shop oben: was unterwegs ist, was vor der Tür liegt, und der Bestand „Ausgepackt – zum Aufstellen“
  shopTop(list, fac) {
    const g = this.g, s = g.s, groups = g.stockGroups(), parcels = s.parcels || [], orders = s.orders || [];
    if (parcels.length || orders.length) {
      const n = orders.reduce((a, o) => a + o.items.length, 0), bits = [];
      if (orders.length) bits.push(`${n === 1 ? 'Eine Bestellung' : `${n} Bestellungen`} unterwegs – kommt morgen früh`);
      if (parcels.length) bits.push(`<b>${parcels.length === 1 ? 'Ein Paket' : `${parcels.length} Pakete`} vor deiner Wohnungstür</b> (${esc(parcels.slice(0, 3).map((p) => p.label).join(', '))}${parcels.length > 3 ? ' …' : ''}) – hingehen und <kbd>E</kbd>`);
      const bar = h(`<div class="shipbar">${PKG_SVG}<span>${bits.join('<br/>')}</span></div>`);
      if (parcels.length && !this.w.syncParcels) { const b = h('<button class="btn small primary">Reinholen</button>'); b.onclick = (e) => { e.stopPropagation(); for (const p of [...parcels]) this.pickParcel(p.id); }; bar.append(b); } // Welt ohne Paket-Kartons: hier hereinholen
      list.append(bar);
    }
    if (!groups.length) return;
    const total = groups.reduce((a, x) => a + x.n, 0), box = h(`<div class="unpack"><div class="up-h">Ausgepackt – zum Aufstellen <span>${total} ${total === 1 ? 'Stück' : 'Stück'} · kostet nichts mehr</span></div><div class="up-row"></div></div>`), row = box.querySelector('.up-row');
    for (const gr of groups) {
      const e = gr.e, def = PLACEABLE[e.type], ok = g.placeableAllowed(def, fac), full = !g.slotOk(fac, def);
      const w = def.kind === 'rig' ? (e.parts && g.partIds({ type: e.type, parts: e.parts }).length ? g.rigWatt({ type: e.type, parts: e.parts }) : 0) : def.watt || 0, warn = ok && !full ? this.rigWarn(fac, w) : '';
      const sub = !ok ? `Passt nicht in ${esc(FACILITY[fac].short)}` : full ? 'Hier ist kein Platz mehr' : e.kit ? 'Bausatz – Teile liegen im Lager' : e.ready ? `Fertig bestückt · ${e.parts?.gpus?.length || 0}× ${esc(PART[e.parts?.gpus?.[0]]?.name || 'ohne Karte')}` : def.kind === 'rig' ? 'Leeres Gehäuse' : def.kind === 'cooling' ? `Kühlt ${fmtWatt(def.cool)}` : def.kind === 'holder' ? `${e.items?.length || 0} / ${def.slots} Geräte` : def.kind === 'device' ? fmtHash(def.hash, def.algo) : 'Deko';
      const c = h(`<div class="up-card ${ok && !full ? '' : 'dis'}"><div class="up-th"></div><div class="up-t"><b>${esc(g.stockName(e))}${gr.n > 1 ? ` <em>×${gr.n}</em>` : ''}</b><span>${sub}</span>${warn ? `<span class="rc-warn">${esc(warn)}</span>` : ''}</div><button class="btn small primary" ${ok && !full ? '' : 'disabled'}>Aufstellen</button></div>`);
      try { const url = this.w.thumbnail(e.type); if (url) c.querySelector('.up-th').append(h(`<img alt="" src="${url}"/>`)); } catch (err) { /* ohne Vorschau */ }
      c.querySelector('button').onclick = (ev) => { ev.stopPropagation(); this.placeFromStock(gr.key); };
      row.append(c);
    }
    list.append(box);
  }
  // Ausgepacktes aufstellen: Platzier-Modus wie beim Kaufen, aber gratis (Game.placeStock über main.js onPlace)
  placeFromStock(key) {
    const g = this.g, e = g.stockFind(key); if (!e) return; const def = PLACEABLE[e.type], fac = g.s.current;
    if (!g.placeableAllowed(def, fac)) { this.toast(`${esc(def.name)} passt nicht in ${esc(FACILITY[fac].short)}.`, 'bad'); return; }
    if (!g.slotOk(fac, def)) { this.toast('Hier ist kein Platz mehr – stell es an einem anderen Standort auf.', 'bad'); return; }
    this.resume(); this.w.startPlacement(e.type, null, { type: e.type, rot: 0, coin: e.coin || 'auto', parts: e.parts, items: e.items, stock: g.stockKey(e) });
  }
  // Paket vor der Wohnungstür aufheben (world.onParcel)
  pickParcel(id) {
    const r = this.g.pickupParcel(id); if (!r) return null;
    this.audio?.install?.();
    const bits = []; if (r.parts) bits.push(`${r.parts === 1 ? 'ein Teil' : `${r.parts} Teile`} im Lager`); if (r.dev) bits.push(`${r.dev} im Regal`); if (r.place) bits.push(`${r.place === 1 ? 'eins' : r.place} zum Aufstellen: <kbd>B</kbd> → oben „Ausgepackt“`);
    const names = r.names.slice(0, 3).join(', ') + (r.names.length > 3 ? ' …' : '');
    this.toast(`<b>Paket ausgepackt:</b> ${esc(names)}${bits.length ? ` – ${bits.join(', ')}` : ''}`, 'good', 6500);
    this.goals(); return r;
  }
  // Bestellt (Toast) – mit Hinweis auf die Lieferung
  ordered(what, extra = '') { this.audio?.buy?.(); this.toast(`<b>Bestellt:</b> ${esc(what)} – kommt morgen früh als Paket vor deine Wohnungstür.${extra}`, 'good', 5000); this.goals(); }
  orderItem(it) {
    const g = this.g, why = g.orderWhy(it); if (why) { this.toast(`${esc(why)}.`, 'bad'); return false; }
    if (!g.orderPlace(it.id)) { this.toast('Bestellen ging nicht.', 'bad'); return false; }
    this.ordered(it.name); return true;
  }
  // Monitor in der Wohnung: Online-Shop oder Börse (die Börse ist der Desktop, oben ein Knopf „Shop“ – Market.atPc)
  openShop() { if (!document.body.classList.contains('show-build')) this.toggleBuild(); }

  // ---------- Ego-Steuerung: Panels öffnen/schließen ----------
  anyPanelOpen() { return !$('#modal').classList.contains('hidden') || !!this.inspUid || document.body.classList.contains('show-build'); }
  openUI() { this.pause(false); if (this.w.mode === 'play') this.w.setMode('ui'); }
  stickyModal() { return !$('#modal').classList.contains('hidden') && ['story', 'won', 'year', 'intro'].includes(this.modalKind); }
  resume() {
    this.pause(false);
    if (!$('#modal').classList.contains('hidden') && this.modalKind === 'event' && this.g.s.ev?.open) this.evSnooze = this.g.s.ev.open.key; // ESC = später entscheiden
    if (!$('#modal').classList.contains('hidden')) { this.modalKind = null; document.body.dataset.modal = ''; $('#modal').classList.add('hidden'); this.onModalClose?.(); this.onModalClose = null; }
    document.body.classList.remove('show-build', 'show-goals'); this.dock();
    if (this.inspUid) { this.inspUid = null; $('#inspector').classList.add('hidden'); this.w.select(null); }
    this.w.focusObject?.(null); this.pickType = null; this.showRun = false; this.w.ghostPart?.(null);
    const hadLv = !!this.lvQ;
    if (this.lvQ) { const [k, lv] = this.lvQ; this.lvQ = null; this.lvBusy = true; setTimeout(() => this.levelUp(k, lv), 2600); }
    this.osWiz = null; // Installer bricht mit dem Schließen des Inspektors ab
    this.flushMsgs?.(hadLv ? 7200 : 3000);
    if (this.w.mode === 'ui' || this.w.mode === 'play') this.w.setMode('play');
  }
  pause(on) {
    if (on && !this.paused) this.pausedAt = performance.now();
    this.paused = on; this.w.paused = on; // Welt: keine Bewegung/Spieltasten in der Pause
    $('#pause').classList.toggle('hidden', !on);
    if (on) { $('#clickhint').classList.add('hidden'); this.prompt(null); }
  }
  // Neues Spiel / Laden: UI-Zustand aus der alten Sitzung verwerfen
  resetSession() {
    this.marketCoin = 'BTC'; this.trade = null; this.lastSpeed = null; this.evSnooze = null; this.delArmed = null;
    clearTimeout(this.featT); this.featQ = []; this.msgQ = []; this.xpQ = []; this.lvQ = null; this.lvBusy = false; $('#featcards').innerHTML = '';
    this.osWiz = null; this.mg?.cancel(); this.skView = null; // Fähigkeiten: Installer, Mini-Spiel, Baum-Ansicht
    clearTimeout(this.instT); this.installing = false; this.afterSnap = null; this.showRun = false; this.pickType = null; this.rate = 0; this.rateDay = null;
    this.visiting = null; this.walkGoal = null; this.lampHinted = false; this.idea0 = null; this.ideaRead = null; this.ideaSteps0 = 0; this.steps = 0; this.ringOff = null; document.body.classList.remove('visiting', 'show-build', 'show-goals');
    if (this.w.heatMode) this.w.toggleHeat(false);
    if (this.inspUid) { this.inspUid = null; $('#inspector').classList.add('hidden'); this.w.select(null); }
    this.w.focusObject?.(null); this.w.ghostPart?.(null); this.pause(false);
  }
  openInspector(uid) { this.g.learned?.('inspect'); this.openedAt = performance.now(); if (!this.g.s.flags.seenPc) { this.g.s.flags.seenPc = true; this.g.checkGoals?.(); } this.w.select(uid); this.openUI(); }
  flashCash(u) { const el = $('#st-cash'); if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); if (u > 0) { const f = h(`<div class="cashfly">+${fmtUSD(u)}</div>`); document.body.append(f); setTimeout(() => f.remove(), 1400); } }
  // „Neu freigeschaltet“-Karte mit kurzer Erklärung
  featureCard(f) {
    if (!FEATURES[f]) return;
    (this.featQ ||= []).push(f);
    clearTimeout(this.featT); this.featT = setTimeout(() => this.showFeatures(), 60);
  }
  showFeatures() {
    const les = this.g.lesson(), isLes = les && (this.featQ || []).includes(les); // Anlernen: Lektionskarte darf neben der Handy-Nachricht stehen
    if (this.w.mode !== 'play' || this.paused || document.getElementById('lvup') || this.lvQ || this.lvBusy || (!isLes && document.querySelector('#toasts .toast.msg'))) { clearTimeout(this.featT); this.featT = setTimeout(() => this.showFeatures(), 700); return; }
    const q = this.featQ || []; this.featQ = []; if (!q.length) return;
    if (isLes) { this.lessonCard(les); return; }
    this.audio?.message();
    const box = $('#featcards'); box.innerHTML = '';
    const PRIO = ['market', 'build', 'skills', 'speed2', 'autosell', 'rigs', 'company', 'coins', 'cold', 'heat', 'map', 'techs', 'ranking', 'loan', 'buycoins', 'speed3', 'phone'];
    const top = [...q].sort((a, b) => (PRIO.indexOf(a) + 99) % 99 - (PRIO.indexOf(b) + 99) % 99)[0], rest = q.filter((f) => f !== top);
    const el = h(`<div class="featcard"><div class="fc-t">Neu</div><div class="fc-h">${esc(FEATURES[top].title)}</div><div class="fc-b">${FEATURES[top].text}</div>${rest.length && top !== 'market' ? `<div class="fc-more">Außerdem: ${rest.map((f) => esc(FEATURES[f].title)).join(', ')}</div>` : ''}</div>`);
    box.append(el); clearTimeout(this.featHide);
    this.featHide = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 600); }, top === 'market' ? 4000 : 5200);
    this.speedBar(); this.dock(); this.keysHint(); this.sites(); this.goals();
  }
  // Anlernen (Game.tutorTick): Hinweiskarte mit Taste, bleibt stehen, bis man es benutzt hat (Game.learned → lessonDone)
  lessonCard(f) {
    const F = FEATURES[f]; if (!F || this.g.lesson() !== f) return;
    const box = $('#featcards'); box.querySelectorAll('.featcard').forEach((x) => x.remove()); clearTimeout(this.featHide);
    const ring = f === 'phone', key = F.key && !F.pseudo ? `<kbd class="fc-k">${F.key}</kbd>` : '';
    const el = h(`<div class="featcard lesson ${ring ? 'ring' : ''}" data-f="${f}"><div class="fc-t">${ring ? `${PHONE_SVG}Bzzz … bzzz …` : F.pseudo ? 'Nächster Schritt' : 'Neu'}</div><div class="fc-h">${key}${esc(F.title)}</div><div class="fc-b">${F.text}</div></div>`);
    box.append(el); this.audio?.message();
    this.speedBar(); this.dock(); this.keysHint(); this.sites(); this.goals();
  }
  lessonDone() { const el = document.querySelector('#featcards .featcard.lesson'); if (el) { el.classList.add('out'); setTimeout(() => el.remove(), 600); } this.dock(); this.keysHint(); }
  // Neues Spiel: Aufwachen in der Wohnung (Kamerafahrt der Welt, wenn es sie gibt), dann vibriert das Handy
  wakeUp() {
    this.w.visFrac = this.g.s.frac; // Morgenlicht sofort (sonst dämmert es erst langsam vom Titelbild-Abend herüber)
    this.w.setMode('play');
    let done = false; const go = () => { if (done) return; done = true; this.g.grant('phone'); this.setSpeed(1); this.keysHint(); this.dock(); };
    if (this.w.wakeUp) { try { this.w.wakeUp(go); setTimeout(go, 15000); return; } catch (e) { /* ohne Kamerafahrt weiter */ } }
    setTimeout(go, 1400);
  }
  // Wärmebild (Taste I – H ist jetzt das Handy)
  toggleHeat() { if (!this.g.has('heat')) return; const on = this.w.toggleHeat(); this.sites(); this.g.learned?.('heat'); this.toast(on ? 'Wärmebild an' : 'Wärmebild aus', 'info', 1500); }
  // Tasten-Hinweise unten rechts: nur, was schon freigeschaltet ist
  keysHint() {
    const g = this.g, el = $('#keys'); if (!el) return;
    const unread = g.s.messages.filter((m) => !m.read).length;
    const ks = [['build', 'B', 'Shop'], ['market', 'M', 'Börse']].filter(([f]) => g.has(f));
    if (g.has('phone')) ks.unshift(['phone', 'H', unread ? `Handy (${unread})` : 'Handy']);
    if (this.w.facId === 'keller' && this.w.dusty) ks.unshift(['lamp', 'F', this.w.vm?.lampOn ? 'Lampe aus' : 'Taschenlampe']);
    el.innerHTML = ks.map(([, k, l]) => `<span><kbd>${k}</kbd>${l}</span>`).join('') + '<span><kbd>Esc</kbd>Menü</span>';
  }
  // Shop (B): Reiter im Browser „Shop | Börse“ (market.js) – als Fenster oder am PC-Monitor; der Katalog selbst bleibt build()
  toggleBuild() { (this.mk ||= new Market(this)).openTab('shop'); }
  prompt(aim) {
    const el = $('#prompt');
    if (!aim || this.w.mode !== 'play') { el.classList.add('hidden'); return; }
    if (aim.keep || aim.prop?.action === 'talk') { el.innerHTML = this.promptLife(aim); el.classList.remove('hidden'); return; }
    let html = '';
    if (aim.loose) {
      html = `<kbd>E</kbd>${PNAME[aim.loose]} aufheben`;
    } else if (aim.parcel != null) {
      html = `<kbd>E</kbd>Paket aufheben${aim.label ? `<span> · ${esc(aim.label)}</span>` : ''}`;
    } else if (aim.door) {
      const k = aim.door.kind;
      html = k === 'kellertuer' ? (this.g.canUnlock('keller') ? `<kbd>E</kbd>${esc(FACILITY.keller.short)} freischalten` : '<kbd>E</kbd>Kellertür<span> · abgeschlossen</span>') : k === 'haustuer' ? '<kbd>E</kbd>Haustür<span> · raus in die Stadt</span>' : `<kbd>E</kbd>${esc(aim.door.label)}`;
    } else if (aim.prop) {
      const mon = this.monitorUse(aim.prop); // PC-Monitor: Shop und/oder Börse
      html = mon ? `<kbd>E</kbd>${mon === 'both' ? 'Shop · Börse' : mon === 'shop' ? 'Online-Shop' : esc(aim.prop.hint)}` : aim.prop.action === 'market' ? `Monitor · ${this.g.s.flags.miningStarted ? 'Miner läuft' : 'aus'}` : `<kbd>E</kbd>${esc(aim.prop.hint)}`;
    } else {
      const o = this.g.findObj(aim.uid); if (!o) { el.classList.add('hidden'); return; }
      const def = PLACEABLE[o.type], sm = this.g.summary[this.g.facOf(aim.uid)], a = sm?.per.get(aim.uid);
      let line = '';
      if (a && a.units.length) { const rev = a.units.reduce((x, u) => x + u.rev, 0) * sm.throttle; const cost = a.watt / 1000 * 24 * sm.elec; line = `${a.units.filter((u) => u.h).map((u) => fmtHash(u.h * sm.throttle, u.algo)).join(' · ') || 'pausiert'} · <span class="${rev - cost >= 0 ? 'pos' : 'neg'}">${rev - cost >= 0 ? '+' : ''}${fmtUSD(rev - cost)}/Tag</span>`; }
      else if (def.kind === 'cooling') line = `kühlt ${fmtWatt(def.cool)}`;
      const st = a?.psuOff && a.status === 'ok' ? `Netzteil zu schwach – ${a.psuOff === 1 ? '1 Karte' : a.psuOff + ' Karten'} aus` : { broken: 'Defekt – reparieren', partial: 'Teilweise defekt', psu: 'Netzteil zu schwach', incomplete: 'Teile fehlen – bestücken', noos: 'Kein Betriebssystem – installieren', nobit: 'Bitstream fehlt – laden', empty: '➕ Leer – Geräte einsetzen', idle: { heat: 'pausiert (zu heiß)', event: 'gedrosselt (Ereignis)', loss: 'pausiert (kaum rentabel)' }[a?.limit] || 'pausiert (unrentabel)', full: 'pausiert (Anschluss voll)', off: '⏻ aus' }[a?.status];
      const build = o.type === 'tower' && o.parts && !this.g.s.flags.miningStarted, first = this.g.isFirstPc(o), need = first ? this.g.firstNeed().length : 4, miss = build ? (first ? this.g.firstMissing(o) : this.g.pcMissing(o)).length : 0;
      html = build ? `<kbd>E</kbd>${miss ? 'Teile einbauen' : 'PC einschalten'}<div class="st">${need - miss} von ${need} Teilen eingebaut</div>` : `<kbd>E</kbd>${esc(o.type === 'tower' ? (this.g.facObjects('kinder').find((x) => x.type === 'tower')?.uid === o.uid ? 'Dein PC' : 'Mining-PC') : (def.short || def.name.replace(/[-‑]Gehäuse|\s*\(.*\)/g, '')))}${st ? `<div class="st">${st}</div>` : line ? `<div class="ln">${line}</div>` : ''}`;
    }
    el.innerHTML = html; el.classList.remove('hidden');
  }
  useProp(p) {
    if (p.action === 'talk') { this.talk(p.who); return; }
    if (p.action === 'shop') { if (this.g.has('build')) this.openShop(); else this.toast('Bau erst deinen PC zusammen.', 'info', 3000); return; }
    if (p.action === 'market') { const mon = this.monitorUse(p); if (!mon) { this.toast(this.g.s.flags.miningStarted ? 'Noch nichts zu verkaufen – lass den PC arbeiten.' : 'Bau erst deinen PC zusammen.', 'info', 3000); return; } (this.mk ||= new Market(this)).atPc(p, mon); } // Browser „Shop | Börse“ auf dem Bildschirm
    else if (p.action === 'company') this.company();
    else if (p.action === 'techs') this.skills(); // Opas Werkbank: der Fähigkeiten-Baum
    else if (p.action === 'ranking') this.ranking();
    else if (p.action === 'sleep') {
      const s = this.g.s;
      if (s.feat && !s.flags.miningStarted) { this.toast('Erst den PC bauen, dann schlafen.', 'info', 2500); return; }
      const vf = this.w.visFrac ?? s.frac;
      // jederzeit hinlegen: bis zum nächsten Morgen (nachts nach Mitternacht: bis 7 Uhr)
      this.fade(); const steps = vf >= 0.29 ? 1 : 0;
      for (let i = 0; i < steps; i++) this.g.advanceDay();
      s.frac = 0.29; this.w.visFrac = 0.29;
      this.g.learned?.('sleep'); this.toast(s.parcels?.length ? 'Guten Morgen! Vor deiner Wohnungstür liegt ein Paket.' : 'Guten Morgen!', 'good', 3000);
    }
  }
  // Was kann man am Monitor? 'both' (Shop und Börse), 'shop', 'market' oder '' – der Shop nur am PC-Monitor in der Wohnung
  monitorUse(p) {
    if (p?.action !== 'market') return ''; const g = this.g, shop = g.has('build') && (p.label === 'PC-Monitor' || this.w.facId === 'kinder'), mk = g.has('market');
    return shop && mk ? 'both' : shop ? 'shop' : mk ? 'market' : '';
  }
  // Am Anfang in den verstaubten Keller: früher per Überblendung, jetzt zu Fuß (der Marker zeigt den Weg)
  searchTrip(down) {
    this.resume();
    if (down && this.w.facId !== 'keller' && this.w.hoff) this.toast('Raus in den Flur und die Kellertreppe runter – der Pfeil zeigt dir den Weg.', 'info', 4200);
  }
  // Wechsel der Szene auf der Kellertreppe (World.checkHouseSwitch): Standort still umstellen, ohne Überblendung
  houseMove(id) {
    const s = this.g.s, cur = id === 'keller' && s.unlocked.includes('keller') ? 'keller' : 'kinder', prev = s.current;
    this.visiting = id === 'keller' && cur !== 'keller' ? 'keller' : null; // Keller noch nicht frei (Teile-Suche): nur zu Besuch
    document.body.classList.toggle('visiting', !!this.visiting);
    if (cur !== prev) { s.current = cur; this.toast(esc(FACILITY[cur].name), 'info', 1600); }
    this.top(); this.sites(); this.goals(); this.keysHint(); this.dock();
    if (document.body.classList.contains('show-build')) this.build(true);
  }
  travel(door) {
    const g = this.g;
    if (door?.kind === 'kellertuer') { // abgeschlossene Kellertür: Hinweis – oder jetzt freischalten
      if (g.canUnlock('keller')) { this.unlock('keller'); return; }
      this.audio?.click?.(); this.toast(esc(CHAPTERS[g.s.chapter]?.waitText || 'Abgeschlossen – das Kellerabteil ist noch voll mit Gerümpel vom Vormieter.'), 'info', 5000); return;
    }
    const home = door?.kind === 'haustuer'; // aus dem Haus: Wohnung und Keller erreicht man zu Fuß
    const dests = FACILITIES.filter((f) => !(home && (f.id === 'kinder' || f.id === 'keller')));
    if (!dests.some((f) => f.id !== g.s.current && (g.s.unlocked.includes(f.id) || g.canUnlock(f.id)))) { this.toast(home ? 'Draußen wartet noch nichts auf dich – erst mal hier Geld verdienen.' : 'Die Tür bleibt erst mal zu.', 'info', 2600); return; }
    const body = h(`<div><h2>${esc(door.label)}</h2><p style="color:var(--dim);margin-top:-6px">Wohin willst du?</p><div class="cards"></div></div>`);
    const cards = body.querySelector('.cards');
    for (const f of dests) {
      const un = g.s.unlocked.includes(f.id), here = g.s.current === f.id, can = g.canUnlock(f.id);
      if (!un && !can) continue;
      const sm = g.summary[f.id];
      const c = h(`<div class="card"><h3>${here ? '' : ''}${esc(f.name)}</h3><div class="sub">${esc(f.place)}</div>${un && sm ? `<div style="font-size:12px;color:var(--dim)">${fmtWatt(sm.watt)} · ${fmtNum(sm.temp, 1)} °C · Platz ${g.slotsUsed(f.id)}/${g.slotsMax(f.id)}</div>` : `<div style="font-size:12px;color:var(--dim)">${f.slots} Stellplätze · ${fmtNum(f.power[0].kw, 1)} kW</div>`}</div>`);
      const b = h(`<button class="btn small ${here ? '' : 'primary'}" style="margin-top:6px">${here ? 'Hierbleiben' : un ? 'Hingehen' : f.cost ? `Übernehmen (${fmtUSD(f.cost)})` : 'Einziehen'}</button>`);
      b.onclick = () => { this.closeModal(); if (here) return; if (!un) { this.unlock(f.id); return; } this.switchSite(f.id, { arrive: true }); };
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
    el.classList.toggle('hidden', !!this.mg); // Mini-Spiel ersetzt den Inspektor, bis es vorbei ist
    const def = PLACEABLE[o.type], g = this.g;
    this.w.focusObject?.(o.type === 'tower' && o.parts && g.s.chapter === 0 ? uid : null);
    const firstPc = o.type === 'tower' && g.facObjects('kinder').find((x) => x.type === 'tower')?.uid === uid; // nur der allererste PC heißt „Dein PC“
    el.innerHTML = `<div class="insp-h"><h3>${esc(firstPc ? 'Dein PC' : o.type === 'tower' ? 'Mining-PC' : (def.short || def.name.replace(/[-‑]Gehäuse|\s*\(.*\)/g, '')))}</h3><span id="insp-badge"></span><button class="modal-x insp-x" title="Schließen (E/ESC)">✕</button></div><div id="insp-stats"></div><div id="insp-ctrl"></div>`;
    el.querySelector('.insp-x').onclick = () => this.resume();
    this.inspectStats();
    const c = $('#insp-ctrl');
    if (def.kind === 'rig' && o.parts && o.type === 'tower' && g.s.chapter === 0 && (!g.s.flags.miningStarted || this.showRun)) { c.append(this.pcBuild(o)); return; }
    if (this.osWiz?.uid === uid) { osWizard(this, o, c); return; } // Betriebssystem-Installer (Esc bricht nur ihn ab)
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
    c.append(deviceSecs(this, o)); // Fähigkeiten: System, Tuning, Firmware, Wartung, Wasserkühlung, Bitstream, Robi
    if (def.kind === 'rig') c.append(this.rigBuild(o));
    if (def.kind === 'holder') c.append(this.holderUI(o));
    const row = h('<div class="row sec"></div>');
    repairRow(this, o, row); // selbst (Mini-Spiel) · Routine · reparieren lassen
    if (!g.has('build')) { if (row.childElementCount) c.append(row); return; }
    const ks = def.kind === 'rig' && o.parts ? this.kitSec(o) : null;
    if (g.slotKind(def) && (def.kind !== 'rig' || g.has('rigs')) && !g.cloneBlocked(o.kit && !g.pcReady(o) ? { ...o, parts: o.kit } : o)) { // weitere PCs erst ab „Mehr PCs“ (nach der ersten Grafikkarte)
      const src = o.kit && !g.pcReady(o) ? { ...o, parts: o.kit } : o; // offener Bausatz: „noch so einen“ = derselbe Bausatz, nicht das leere Gehäuse
      const fac = g.facOf(uid), pm = g.parcelMode(), full = pm ? !g.orderRoomOk(def) : !g.slotOk(fac, def), rig = g.cloneRig(src), lock = rig && (!g.readyOk(o.type) || src !== o), cc = g.cloneCost(src, lock), ck = rig ? g.cloneCost(src, true) : 0, cid = g.readyBy(o.type), ow = rig ? g.cloneWhy(src, lock) : '';
      const kitT = () => ({ type: o.type, rot: o.rot, coin: o.coin, parts: { mobo: null, cpu: null, psu: null, gpus: [] }, kit: true, src }); // Bausatz-Kopie: leeres Gehäuse, Teile ins Lager
      const ag = h(`<button class="btn ${ks ? '' : 'primary'} wide again" ${full || ow || cc > g.s.cash ? 'disabled' : ''} title="${full ? 'Alle Plätze belegt' : ow ? esc(ow) : lock ? 'Gleiches Gehäuse, alle Teile ins Lager – selbst einbauen' : rig && cid ? `Gleicher Rig, fertig montiert von ${esc(CONTACT[cid].name)} (${Math.round(g.buildFee(o.type) * 100)} % Montage)` : 'Gleiches Gerät mit allen Teilen noch mal kaufen und hinstellen'}">${full ? (pm ? 'Kein Platz mehr frei' : 'Kein Platz mehr hier') : lock ? `Noch so einen als Bausatz${pm ? ' bestellen' : ''} · ${this.money(cc)}` : `Noch so einen ${pm ? 'bestellen' : 'bauen'} · ${this.money(cc)}`}</button>`);
      ag.onclick = () => { if (pm) { this.orderAgain(lock ? src : o, lock); return; } this.resume(); this.w.startPlacement(o.type, null, lock ? kitT() : o); };
      const as = h('<div class="sec again-sec"></div>'); as.append(ag);
      if (ow) as.append(h(`<div class="again-why">${esc(ow)}.</div>`));
      else if (rig && !full && lock && cid && !g.readyOk(o.type)) { const ll = h(this.lockLine(cid)); this.lockWire(ll); as.append(ll); }
      else if (rig && !full && !lock) { const kb = h(`<button class="btn small again-kit" ${ck > g.s.cash ? 'disabled' : ''} title="Gleiches Gehäuse, alle Teile ins Lager – selbst einbauen (günstiger, Schrauben-EP)">Als Bausatz${pm ? ' bestellen' : ''} · ${this.money(ck)}</button>`); kb.onclick = () => { if (pm) { this.orderAgain(o, true); return; } this.resume(); this.w.startPlacement(o.type, null, kitT()); }; as.append(kb); }
      c.prepend(as);
    }
    if (ks) c.prepend(ks);
    const mv = h('<button class="btn">✥ Verschieben</button>'); mv.onclick = () => { this.resume(); this.w.startPlacement(o.type, uid); }; row.append(mv);
    const mvb = this.moveButton(o); if (mvb) row.append(mvb);
    const rt = h('<button class="btn">⟳ Drehen</button>'); rt.onclick = () => { const r0 = o.rot; o.rot = (o.rot + 1) % 4; if (!this.w.canPlace(def, o.x, o.z, o.rot, uid)) { o.rot = r0; this.toast('Kein Platz zum Drehen.', 'bad'); } this.w.syncObjects(); }; row.append(rt);
    if (def.kind !== 'decor' && !g.slotKind(def)) { const blk = g.cloneBlocked(o), pm = g.parcelMode(); const dp = h(`<button class="btn" title="${blk ? esc(blk) + ' gibt es nicht mehr zu kaufen' : pm ? 'Gleiches Gerät noch mal bestellen – Lieferung morgen' : 'Gleiches Objekt inkl. Teilen noch mal kaufen'}" ${blk ? 'disabled' : ''}>⧉ ${pm ? 'Nachbestellen' : 'Duplizieren'} ${blk ? '· Teile nicht mehr im Handel' : `(${fmtUSD(this.g.cloneCost ? this.g.cloneCost(o) : 0)})`}</button>`); dp.onclick = () => { if (pm) { this.orderAgain(o, false); return; } this.resume(); this.w.startPlacement(o.type, null, o); }; row.append(dp); }
    const sell = h(`<button class="btn danger">Verkaufen (+${fmtUSD(g.objectValue(o))})</button>`); sell.onclick = () => { if (!g.canSell(o)) { this.toast('Den PC brauchst du noch.', 'info', 2500); return; } g.removeObject(uid); this.resume(); }; row.append(sell);
    c.append(row);
  }
  // „Noch so einen“ / Nachbestellen im Paket-Modus (Game.orderClone)
  orderAgain(src, kit) {
    const g = this.g, def = PLACEABLE[src.type], why = g.cloneWhy(src, kit);
    if (why) { this.toast(`${esc(why)}.`, 'bad'); return; }
    if (!g.orderRoomOk(def)) { this.toast(esc(g.orderWhy(def) || 'Kein Platz mehr.'), 'bad'); return; }
    if (!g.orderClone(src, kit)) { this.toast(g.cloneRig(src) && !kit && !g.readyOk(src.type) ? 'Fertig bestückt geht erst über einen Kontakt – als Bausatz geht’s sofort.' : 'Nicht genug Geld.', 'bad'); return; }
    this.ordered(`${src.type === 'tower' ? (kit ? 'PC-Bausatz' : 'Mining-PC') : def.name}${kit && src.type !== 'tower' ? ' als Bausatz' : ''}`, kit ? ' Die Teile kommen mit ins Paket.' : '');
    if (this.inspUid) this.inspect(this.inspUid);
  }
  // ---------- Umziehen: Gerät samt Teilen an einen anderen Standort ----------
  moveButton(o) {
    const g = this.g, def = PLACEABLE[o.type]; if (!g.slotKind(def) && def.kind !== 'cooling') return null;
    if (g.isFirstPc(o)) return h('<button class="btn" disabled title="Dein erster PC bleibt in der Wohnung – zur Erinnerung">Bleibt in der Wohnung</button>');
    const from = g.facOf(o.uid), tg = g.s.unlocked.filter((id) => id !== from); if (!tg.length) return null;
    if (tg.length === 1) {
      const to = tg[0], why = g.moveWhy(o, to), fee = g.moveFee(o, to);
      const b = h(`<button class="btn" ${why ? 'disabled' : ''} title="${esc(why || `Mit allen Teilen nach ${FACILITY[to].name}${fee ? ` · Umzug ${fmtUSD(fee)}` : ''}`)}">${esc(MOVE_TO[to] || `Nach ${FACILITY[to].short}`)}${fee ? ` · ${this.money(fee)}` : ''}</button>`);
      b.onclick = () => this.doMove(o.uid, to); return b;
    }
    const b = h('<button class="btn" title="Mit allen Teilen an einen anderen Standort bringen">Zum Standort …</button>'); b.onclick = () => this.movePicker(o); return b;
  }
  movePicker(o) {
    const g = this.g, from = g.facOf(o.uid), def = PLACEABLE[o.type];
    const body = h(`<div><h2>Wohin damit?</h2><p style="color:var(--dim);margin-top:-6px">${esc(def.name)} – mit allen Teilen${o.items?.length ? ` und ${o.items.length} Geräten` : ''}</p><div class="cards"></div></div>`), cards = body.querySelector('.cards');
    for (const to of g.s.unlocked) {
      if (to === from) continue; const f = FACILITY[to], why = g.moveWhy(o, to), fee = g.moveFee(o, to);
      const c = h(`<div class="card"><h3>${esc(f.name)}</h3><div class="sub">${esc(f.place)}</div><div style="font-size:12px;color:var(--dim)">Platz ${g.slotsUsed(to)}/${g.slotsMax(to)} · Strom ${fmtNum(g.elecPrice(to, g.s.day, true) * 100, 1)} ct/kWh${f.rent && g.rentStart(to) > 0 ? ` · startet die Miete (−${fmtUSD(g.rentStart(to))}/Tag)` : ''}</div>${why ? `<div style="font-size:12px;color:#ff8f84">${esc(why)}</div>` : ''}</div>`);
      const b = h(`<button class="btn small ${why ? '' : 'primary'}" style="margin-top:6px" ${why ? 'disabled' : ''}>${fee ? `Hinbringen · ${this.money(fee)}` : 'Hinbringen'}</button>`); b.onclick = () => { this.closeModal(); this.doMove(o.uid, to); };
      c.append(b); cards.append(c);
    }
    this.openModal(body, 'narrow', 'move');
  }
  doMove(uid, to) {
    const g = this.g, o = g.findObj(uid); if (!o) return;
    const why = g.moveWhy(o, to); if (why) { this.toast(esc(why), 'bad'); return; }
    const r = g.moveObject(uid, to); if (!r) { this.toast('Kein Platz zum Abstellen gefunden.', 'bad'); return; }
    this.resume(); this.audio?.install?.();
    this.toast(`${esc(o.type === 'tower' ? 'Mining-PC' : PLACEABLE[o.type].name)} steht jetzt ${to === 'kinder' ? 'in der Wohnung' : to === 'keller' ? 'im Keller' : `in: ${esc(FACILITY[to].name)}`}${r.fee ? ` · Umzug ${fmtUSD(r.fee)}` : ''}`, 'good', 4000);
  }
  // Neuer Standort zum ersten Mal: Geräte von dort mitnehmen, wo der Strom teurer ist? („Deine 5 PCs mitnehmen?“)
  offerMove(to, tries = 0) {
    if (this.modalKind) { if (tries < 20) setTimeout(() => this.offerMove(to, tries + 1), 1500); return; } // erst, wenn kein anderes Fenster offen ist
    const g = this.g, list = g.moveCandidates(to), free = g.slotsMax(to) - g.slotsUsed(to); if (!list.length || free <= 0) return;
    const take = list.slice(0, free), n = take.length, fee = take.reduce((a, c) => a + c.fee, 0), save = take.reduce((a, c) => a + c.save, 0), F = FACILITY[to];
    const pcs = take.every((c) => c.o.type === 'tower'), rigs = take.every((c) => PLACEABLE[c.o.type].kind === 'rig'), noun = pcs ? (n === 1 ? 'PC' : 'PCs') : rigs ? (n === 1 ? 'Rig' : 'Rigs') : n === 1 ? 'Gerät' : 'Geräte';
    const froms = [...new Set(take.map((c) => c.from))].map((id) => FACILITY[id].short).join(' und '), first = g.s.fac.kinder.objects.some((x) => g.isFirstPc(x)) && take.some((c) => c.from === 'kinder');
    const body = h(`<div class="story"><div class="ch">Umziehen?</div><p><b>Deine ${n} ${noun} mitnehmen?</b><br/>${esc(froms)} → ${esc(F.name)}: dort ist der Strom günstiger${save > 0.005 ? ` – spart etwa <b>${fmtUSD(save)}/Tag</b>` : ''}.${list.length > n ? ` Es passen ${n} von ${list.length}.` : ''}${first ? '<br/>Dein erster PC bleibt in der Wohnung.' : ''}${fee ? `<br/>Umzug: ${fmtUSD(fee)}.` : ''}${F.rent && g.rentStart(to) > 0 ? `<br/>Damit startet die Miete: −${fmtUSD(g.rentStart(to))}/Tag.` : ''}</p><div class="row" style="justify-content:flex-end;gap:8px"><button class="btn">Lieber nicht</button><button class="btn primary" ${fee > g.s.cash ? 'disabled' : ''}>Alle mitnehmen${fee ? ` · ${this.money(fee)}` : ''}</button></div></div>`);
    const [no, yes] = body.querySelectorAll('button');
    no.onclick = () => this.closeModal();
    yes.onclick = () => { const r = g.moveAll(to, take); this.closeModal(); if (r.n) { this.audio?.install?.(); this.toast(`${r.n} ${noun} stehen jetzt ${to === 'keller' ? 'im Keller' : `in: ${esc(F.name)}`}${r.fee ? ` · Umzug ${fmtUSD(r.fee)}` : ''}`, 'good', 5000); } };
    this.openModal(body, 'narrow', 'move');
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
    const st = sm.tripped ? ['bad', 'Kein Strom'] : a.status === 'broken' ? ['bad', 'Defekt'] : a.status === 'partial' ? ['warn', 'Teilweise defekt'] : a.status === 'psu' ? ['bad', 'Netzteil zu schwach'] : a.status === 'incomplete' ? ['warn', 'Unvollständig'] : a.status === 'noos' ? ['warn', 'Kein Betriebssystem'] : a.status === 'nobit' ? ['warn', 'Bitstream fehlt'] : a.status === 'empty' ? ['idle', 'Leer'] : a.status === 'idle' ? ['idle', PAUSE_LABEL[a.limit] || 'Pausiert (unrentabel)'] : a.status === 'full' ? ['idle', 'Pausiert (Anschluss voll)'] : a.status === 'off' ? ['idle', 'Aus'] : def.kind === 'decor' ? ['idle', 'Deko'] : a.psuOff ? ['warn', `${a.psuOff === 1 ? '1 Karte' : a.psuOff + ' Karten'} aus`] : ['ok', sm.throttle < 1 ? 'Läuft (gedrosselt)' : 'Läuft'];
    if (this.showRun && g.s.flags.miningStarted && o.type === 'tower') { if (badge) badge.innerHTML = `<span class="badge ok"><i></i>Läuft</span>`; const se = $('#insp-stats'); if (se) se.innerHTML = ''; return; }
    if (!g.s.flags.miningStarted && def.kind === 'rig' && o.parts) { const need = g.isFirstPc(o) ? g.firstNeed().length : 4, n = need - (g.isFirstPc(o) ? g.firstMissing(o) : g.pcMissing(o)).length; if (badge) badge.innerHTML = `<span class="badge ${n === need ? 'ok' : 'idle'}"><i></i>${n} / ${need} Teile</span>`; const se = $('#insp-stats'); if (se) se.innerHTML = ''; return; }
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
    if (sm.elec === 0 && g.s.flags.miningStarted) rows.push(['Strom', '<span class="pos">Pauschale in der Warmmiete</span>']);
    if (a.units.length) { rows.push(['Ertrag / Tag', `<span class="pos">${fmtUSD(rev)}</span>`]); if (cost > 0.005) rows.push(['Strom / Tag', `<span class="neg">−${fmtUSD(cost)}</span>`]); if (cost > 0.005) rows.push(['Gewinn / Tag', `<b class="${rev - cost >= 0 ? 'pos' : 'neg'}">${fmtUSD(rev - cost)}</b>`]); }
    else if (def.kind === 'cooling') rows.push(['Strom / Tag', `<span class="neg">−${fmtUSD(cost)}</span>`]);
    const el = $('#insp-stats'); if (el) el.innerHTML = `<div class="kv">${rows.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('')}</div>`;
  }
  // Erster Mining-PC: Schritt für Schritt zusammenbauen
  pcBuild(o) {
    const g = this.g, s = g.s, p = o.parts, spots = this.w.room?.looseSpots || {};
    const need = g.firstNeed(), steps = [['mobo', 'Mainboard'], ['cpu', 'Prozessor'], ['gpu', 'Grafikkarte'], ['psu', 'Netzteil']].filter(([t]) => need.includes(t)); // CPU-Start: ohne Grafikkarte
    const cur = (t) => (t === 'gpu' ? p.gpus[0] : p[t]);
    const running = s.flags.miningStarted;
    const firstNext = running ? null : steps.map(([t]) => t).find((t) => !cur(t) && s.inv?.includes(t) && !((t === 'cpu' || t === 'gpu') && !p.mobo));
    setTimeout(() => this.w.ghostPart?.(o.uid, firstNext, s.invIds?.[firstNext]), 0);
    const sec = h(`<div class="pcb ${running ? 'running' : ''}"></div>`);
    if (running) sec.append(h(`<div class="pcb-live"><span class="lab">Schon geschürft</span><b id="pcb-live">Miner startet …</b><span class="sub">Dein PC arbeitet jetzt für dich.</span></div>`));
    const partsBox = running ? h(`<details class="pcb-parts"><summary>Verbaute Teile (${g.partIds(o).length})</summary></details>`) : null; if (partsBox) sec.append(partsBox);
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
        this.afterSnap = g.firstReady(o) ? 'Alle Teile sind drin. Schalt deinen PC ein!' : `${lab} eingebaut`;
      };
      (partsBox || sec).append(row);
    });
    // CPU-Start: der Grafikkarten-Platz bleibt erst mal frei – die Karte bestellt man später im Shop
    if (!need.includes('gpu')) { const gid = p.gpus[0], gi = gid ? PART[gid] : null; (partsBox || sec).append(h(`<div class="pcb-step ${gi ? 'done' : 'opt'}"><span class="ic">${partSvg('gpu')}${gi ? '<i class="tick"></i>' : ''}</span><div class="tx"><b>Grafikkarte</b><span>${gi ? esc(gi.name) : 'Noch keine – der Prozessor schürft erst mal allein. Eine Karte bestellst du später im Shop.'}</span></div></div>`)); }
    if (!running) {
      // Live-Vorschau: was der PC mit den eingebauten Teilen schafft
      const hs = [p.cpu, ...p.gpus].filter(Boolean).reduce((a, id) => a + (PART[id].hash.sha256 || 0), 0), watt = g.rigWatt(o);
      const rev = hs ? g.revenueFor({ sha256: hs }, 'BTC', 99) : 0, px = g.price('BTC') || 1;
      const rows = [['Rechenleistung', hs ? fmtHash(hs, 'sha256') : '–'], ['Verbrauch', !g.partIds(o).length ? '–' : p.psu ? `${watt} W von ${PART[p.psu].cap} W` : `${watt} W`], ['Ertrag / Tag', rev ? `<span class="pos">≈ ${Math.round(rev / px).toLocaleString('de-DE')} BTC</span> <span style="color:var(--dim)">(${fmtUSD(rev)})</span>` : '–']];
      if (g.firstReady(o) || s.flags.pcBuilt) sec.append(h(`<div class="kv pcb-sum">${rows.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('')}</div>`));
      const ready = g.firstReady(o), miss = g.firstMissing(o).length;
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
  bestGpu() {
    const g = this.g; let best = null, bv = -Infinity; const elec = g.elecPrice(g.s.current);
    for (const it of g.partList('gpu')) { const c = g.bestCoin(it.hash, it.vram); const r = c ? g.revenueFor(it.hash, c, it.vram) : 0; const v = (r - it.watt / 1000 * 24 * elec) / Math.max(50, g.itemPrice(it)); if (v > bv) { bv = v; best = it; } }
    return best;
  }
  // Alle Teile eines Typs: kaufen und gleich einbauen (wie im Einbau-Fenster) – das alte Teil kommt ins Lager, nicht in den Verkauf
  partPicker(o, type, idx = 0) {
    const g = this.g, elec = g.elecPrice(g.facOf(o.uid)), slot = type === 'gpu' ? idx : null;
    const cur = type === 'gpu' ? o.parts.gpus[idx] : o.parts[type];
    const names = { mobo: 'Mainboard', cpu: 'Prozessor', psu: 'Netzteil', gpu: 'Grafikkarte' };
    const body = h(`<div><h2>${names[type]} wählen</h2><div class="list"></div></div>`);
    const list = body.querySelector('.list');
    if (cur) { const rm = h(`<div class="picker-row cur"><div><b>${esc(PART[cur].name)}</b><div class="s">eingebaut</div></div><div></div><button class="btn small">Ausbauen · ins Lager</button></div>`); rm.querySelector('button').onclick = () => { g.removePart(o.uid, type, idx); this.closeModal(); this.inspect(o.uid); this.toast(`${esc(PART[cur].name)} liegt im Lager${type === 'mobo' ? ' (mit CPU und Karten)' : ''}`, 'info', 3000); }; list.append(rm); }
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
      const pl = it.id === cur ? null : g.buyPlan(o, it.id, slot), price = pl?.total ?? g.itemPrice(it), why = pl?.why || '', short = !why && price > g.s.cash;
      if (pl?.psu) s += `<br/><span class="rc-dim">mit ${esc(PART[pl.psu].name)} (+${fmtUSD(pl.extra)}) – das alte Netzteil kommt ins Lager</span>`;
      const row = h(`<div class="picker-row ${it.id === cur ? 'cur' : ''}"><div><b>${esc(it.name)}</b>${it.id === bestId ? ' <span class="new">BESTER WERT</span>' : ''}${why ? ` <span style="color:#ff6b6b;font-size:11px">${esc(why)}</span>` : short ? ' <span style="color:#ff6b6b;font-size:11px">zu teuer</span>' : ''}<div class="s">${s}</div></div><div class="p" style="color:#ffb000;font-weight:700">${fmtUSD(price)}</div><button class="btn small primary" ${!pl || why || short ? 'disabled' : ''}>${it.id === cur ? 'Eingebaut' : `${g.parcelMode() ? 'Bestellen' : cur ? 'Tauschen' : 'Kaufen'}${pl?.psu ? ' + Netzteil' : ''}`}</button></div>`);
      row.querySelector('button').onclick = () => {
        if (g.parcelMode()) { const r = g.orderPlan(o.uid, it.id, slot); if (!r) { this.toast(esc(g.buyPlan(o, it.id, slot)?.why || 'Nicht genug Geld.'), 'bad'); return; } this.closeModal(); this.ordered(`${it.name}${r.psu ? ` + ${PART[r.psu].name}` : ''}`, ' Dann aus dem Lager einbauen.'); this.inspect(o.uid); return; }
        const revOf = () => { const sm = g.summary[g.facOf(o.uid)], a = sm?.per.get(o.uid); return a ? a.units.reduce((x, u) => x + u.rev, 0) * sm.throttle : 0; };
        const before = revOf(), r = g.buyInstall(o.uid, it.id, slot);
        if (!r) { this.toast(esc(g.buyPlan(o, it.id, slot)?.why || 'Nicht genug Geld.'), 'bad'); return; }
        this.closeModal(); this.inspect(o.uid);
        const after = revOf(); this.audio?.powerOn(); this.w.pulse?.(o.uid);
        this.toast(`Eingebaut${after > before + 0.005 ? ` · ${fmtUSD(before)} → <b>${fmtUSD(after)}</b> pro Tag` : ''}${r.psu ? ' (mit neuem Netzteil)' : ''}${cur || r.psu ? ' · Altteile im Lager' : ''}`, 'good', 4500);
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
      if (!devs.length) { sec.append(h('<div class="empty">Keine passenden Geräte im Handel.</div>')); return sec; } // ohne Auswahl keine Kauf-Knöpfe
      const sel = h('<select style="margin-top:6px"></select>');
      for (const d of devs) { const p = g.itemPrice(d); const r = g.revenueFor({ [d.algo]: d.hash }, g.bestCoin({ [d.algo]: d.hash }, d.vram || 99) || 'BTC', d.vram || 99) - d.watt / 1000 * 24 * g.elecPrice(g.facOf(o.uid)); const left = g.stockLeft(d); sel.append(h(`<option value="${d.id}" ${left === 0 ? 'disabled' : ''}>${esc(d.name)} – ${fmtUSD(p)} (${r >= 0 ? '+' : ''}${fmtUSD(r)}/Tag)${left === 0 ? ' · ' + g.stockText(d) : left !== Infinity ? ` · noch ${left} diesen Monat` : ''}</option>`)); }
      if (sel.selectedOptions[0]?.disabled) { const ok = [...sel.options].find((x) => !x.disabled); if (ok) sel.value = ok.value; }
      sec.append(sel);
      const row = h('<div class="row"></div>');
      const others = g.facObjects(g.facOf(o.uid)).filter((x) => x.type === o.type && x.items.length < def.slots);
      if (others.length > 1) { const ab = h(`<button class="btn small good" style="margin-top:6px">Alle ${others.length} ${esc(def.name.split(' (')[0])} hier auffüllen</button>`); ab.onclick = () => { let k = 0; for (const x of others) k += g.parcelMode() ? g.orderHolder(x.uid, sel.value, def.slots) : g.holderAdd(x.uid, sel.value, def.slots); this.toast(k ? `${k}× ${esc(PLACEABLE[sel.value].name)} ${g.parcelMode() ? 'bestellt – kommen morgen früh' : 'eingesetzt'}` : 'Nicht genug Geld.', k ? 'good' : 'bad', 3000); this.inspect(o.uid); }; sec.append(ab); }
      const pm = g.parcelMode(), pend = pm ? g.pendingHolder(o.uid) : 0; if (pend) sec.append(h(`<div class="rc-dim" style="margin-top:4px">${pend} ${pend === 1 ? 'Gerät' : 'Geräte'} unterwegs – kommen mit dem Paket ins Regal</div>`));
      for (const n of [1, 5, 25, 'max']) { if (n !== 'max' && n > def.slots) continue; const b = h(`<button class="btn small ${n === 'max' ? 'primary' : ''}">${n === 'max' ? (pm ? 'Auffüllen bestellen' : 'Auffüllen') : '+' + n}</button>`); b.onclick = () => { const k = pm ? g.orderHolder(o.uid, sel.value, n === 'max' ? def.slots : n) : g.holderAdd(o.uid, sel.value, n === 'max' ? def.slots : n); if (!k) this.toast('Nicht genug Geld oder kein Platz.', 'bad'); else if (pm) this.ordered(`${k}× ${PLACEABLE[sel.value].name}`, ' Beim Auspacken kommen sie gleich ins Regal.'); else this.toast(`${k}× ${PLACEABLE[sel.value].name} eingesetzt`, 'good', 2500); this.inspect(o.uid); }; row.append(b); }
      sec.append(row);
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
    if (!ch) { endlessGoals(this, el); return; }
    const nDone = ch.goals.filter((go) => s.goals[go.id]).length;
    let shown = 0;
    for (const go of ch.goals) {
      const done = !!s.goals[go.id];
      if (done || shown >= 1) continue; shown++;
      let prog = '';
      if (!done && go.progress && !(go.id === 'pcbuild' && this.w.facId === 'keller')) { const [cur, tgt, kind, fid] = go.progress(s, g.helpers()); if (kind === 'n' || kind === 'fill' || kind === 'use') prog = this.goalProg(cur, tgt, kind, fid); else if (kind === 'parts') { const lp = this.lastPick && performance.now() - this.lastPick.at < 1200 ? `<span class="lastpick">+ ${PNAME[this.lastPick.t]}</span>` : ''; prog = `<span class="cnt">${cur} / ${tgt}</span>${lp}`; } else { const f = (v) => (kind === 'hash' ? fmtHash(v) : fmtUSD(v)); const pc = Math.max(0, Math.min(100, tgt ? (cur / tgt) * 100 : 0)); prog = `<div style="font-size:11px;color:var(--dim)">${f(Math.max(0, cur))} / ${f(tgt)}</div><div class="bar" style="width:180px"><div style="width:${pc}%;background:#ffb000"></div></div>`; } }
      // Bezahl-Ziele: Fortschritt aus Bargeld + verkaufbaren Coins (Börse und Cold-Wallet) bis zum offenen Rest
      const left = go.action ? g.payLeft(go) : 0, paid = go.action ? g.payPaid(go) : 0;
      if (!done && go.action) { const fund = Math.min(g.payFunds(), left), pc = left ? Math.max(0, Math.min(100, (fund / left) * 100)) : 100; prog = `${paid > 0 && left > 0 ? `<span class="gnoch"> · noch ${fmtUSD(left)}</span>` : ''}<div class="gpay" title="Bargeld und Coins (Börse und Cold-Wallet, nach Gebühr) – was an Bargeld fehlt, wird beim Bezahlen aus den Coins verkauft"><span class="cnt">${fmtNum(Math.floor(fund), 0)} / ${this.money(left)}</span><div class="bar" style="width:180px"><div style="width:${pc}%;background:#ffb000"></div></div></div>`; }
      const gk = s.chapter + ':' + go.id, enter = gk !== this.goalKey; this.goalKey = gk;
      const bag = s.loose && !s.flags.miningStarted && go.id === 'collect' ? `<span class="bag">${g.firstNeed().map((t) => `<i class="${s.loose[t] ? 'miss' : 'got'}" title="${PNAME[t]}${s.loose[t] ? ' – noch nicht gefunden' : ' – eingesammelt'}">${partSvg(t, 16)}${s.loose[t] ? '' : '<b class="tk"></b>'}<em>${{ mobo: 'Board', cpu: 'CPU', gpu: 'GPU', psu: 'Netzteil' }[t]}</em></i>`).join('')}</span>` : '';
      const gtext = (go.id === 'sell' && !g.has('market') ? 'Lass deinen PC ein paar Tage schürfen' : go.id === 'pcbuild' && this.w.facId === 'keller' ? `Alle ${g.firstNeed().length} Teile gefunden · zurück in die Wohnung` : go.text) + (go.orDate ? ` – sonst ab ${this.monthYear(g.orDate(ch, go))}` : '');
      const gh = this.goalHint(go);
      const row = h(`<div class="goal ${done ? 'done' : ''} ${enter ? 'enter' : ''}"><div class="ck">${done ? '✓' : ''}</div><div>${bag ? `<div class="goal-line">${esc(gtext)}${prog}</div>${bag}` : `${esc(gtext)}${prog}`}${gh ? `<div class="goal-hint">${gh}</div>` : ''}</div></div>`);
      if (!done && go.action) { const b = h(`<button class="btn small primary"><kbd>G</kbd>${esc(go.action.label)}</button>`); b.disabled = !g.canPayGoal(go); b.onclick = () => { if (g.goalAction(go)) { this.toast('✔ Erledigt!', 'good'); this.goals(); } }; row.lastElementChild.append(h('<br/>'), b); }
      el.append(row);
      if (!done && go.open === 'company' && g.has('company')) { const cb = h('<button class="btn small primary"><kbd>C</kbd>Zur Firma: Ausbauten</button>'); cb.onclick = () => this.company(); row.lastElementChild.append(h('<br/>'), cb); } // z. B. Opas Nachtstromzähler
      if (!done && go.action) { // Raten (z. B. 1.000 $ für Papas Laden): Knopf zeigt den Rest, daneben eine Rate
        const b0 = row.querySelector('button.primary'); if (b0 && paid > 0) b0.innerHTML = `<kbd>G</kbd>${esc(`Rest überweisen · ${fmtUSD(left)}`)}`;
        const part = go.action.part;
        if (part && left > part) { const pb = h(`<button class="btn small" title="Eine Rate – was an Bargeld fehlt, kommt aus deinen Coins (erst Börse, dann Cold-Wallet)">${fmtUSD(part)} einzahlen</button>`); pb.disabled = !g.canPayGoal(go, part); pb.onclick = () => { if (g.goalAction(go, true)) { this.toast(`${fmtUSD(part)} eingezahlt – noch ${fmtUSD(g.payLeft(go))}`, 'good', 3500); this.audio?.cash?.(); this.goals(); this.top(); } }; row.lastElementChild.append(' ', pb); }
      }
      const od = ch.goals.find((x) => x.skip && !s.goals[x.id] && x !== go); // „voll → schneller weiter“ immer sichtbar
      if (od && !ch.hard && s.flags.miningStarted && g.has('rigs')) { const [c2, t2, k2, f2] = od.progress ? od.progress(s, g.helpers()) : [0, 1, 'n'], rest = ch.goals.every((x) => x === od || s.goals[x.id]), sh = FACILITY[ch.unlock]?.short || 'weiter'; el.append(h(`<div class="goal sub"><div class="ck"></div><div>${esc(od.text)} <span class="gor">→ ${esc(rest || s.day >= toDay(ch.minDate) ? `${sh} sofort` : `${sh} schon vor ${this.monthYear(ch.minDate)}`)}</span>${this.goalProg(c2, t2, k2, f2)}</div></div>`)); } // „sofort“ nur, wenn sonst alles erledigt ist
    }
    const allDone = ch.goals.every((go) => s.goals[go.id]);
    this.goalsBonus(el, ch, allDone && s.day < toDay(ch.minDate), !allDone && g.saving(ch));
  }
  // Wie geht das Ziel? Kurzer Hinweis unter „zweiter PC“ / „erstes Rig im Keller“ (Bausatz zuerst, fertig bestückt über Kontakte)
  goalHint(go) {
    const g = this.g, s0 = g.s;
    if (go.id === 'gpuorder') return g.has('build') ? 'Am <b>Monitor</b> <kbd>E</kbd> oder <kbd>B</kbd>: Shop → Teile → Grafikkarten. Lieferung morgen früh vor deine Wohnungstür.' : '';
    if (go.id === 'gpu') { const bag = g.bagList('gpu'), pc0 = g.facObjects('kinder').find((x) => x.type === 'tower' && x.parts); if (bag.length) { const fits = !pc0 || bag.some((b) => !g.psuWhy(pc0, b.id)); return fits ? 'Die Karte liegt im Lager: PC anschauen, <kbd>E</kbd> → Grafikkarte 1 → einbauen.' : 'Die Karte braucht mehr Strom, als dein Netzteil liefert: PC anschauen, <kbd>E</kbd> → Grafikkarte 1 → „Netzteil bestellen“, dann einbauen.'; } if (s0.parcels?.length) return 'Das Paket liegt vor deiner Wohnungstür – hingehen und <kbd>E</kbd>.'; if (s0.orders?.length) return 'Bestellt – morgen früh liegt das Paket vor der Tür. Leg dich ins Bett (<kbd>E</kbd>) und schlaf bis morgen.'; return ''; }
    const site = { rig2: 'kinder', openrig: 'keller' }[go.id]; if (!site || !g.has('rigs') || !g.s.unlocked.includes(site)) return '';
    if (g.facObjects(site).some((o) => g.osNeed?.(o) && g.pcReady(o))) return 'Der neue Rig braucht noch ein Betriebssystem: anschauen, <kbd>E</kbd> → System → Installer.'; // Fähigkeiten: ohne System schürft er nicht
    if (g.kitsOpen(site).length) return g.s.current === site ? 'Bausatz steht – anschauen, <kbd>E</kbd> und die Teile aus dem Lager einbauen.' : `Dein Bausatz wartet ${site === 'kinder' ? 'in der Wohnung' : 'im Keller'} aufs Einbauen.`;
    const t = go.id === 'rig2' ? 'tower' : 'crate', nm = t === 'tower' ? 'Tower' : 'Milchkiste';
    if (g.parcelMode()) return g.readyOk(t) ? `<kbd>B</kbd> → Rigs → ${nm}: „Fertig bestellen“ oder als Bausatz. Morgen früh vor der Tür, dann oben im Shop „Aufstellen“.` : `<kbd>B</kbd> → Rigs → ${nm}: „Bausatz bestellen“. Morgen auspacken, aufstellen, selbst einbauen.`;
    return g.readyOk(t) ? `<kbd>B</kbd> → Rigs → ${nm}: „Fertig bestückt“ oder als Bausatz.` : `<kbd>B</kbd> → Rigs → ${nm}: „Als Bausatz“ kaufen, hinstellen, selbst einbauen.`;
  }
  // Taste G: nächste Ziel-Aktion (z. B. Papa die Stromrechnung geben) – in der Ego-Steuerung ohne Mausklick
  goalActionKey() {
    const s = this.g.s, ch = CHAPTERS[s.chapter]; if (!ch) return egoalKey(this);
    const go = ch.goals.find((x) => !s.goals[x.id] && x.action);
    if (!go) { this.toast('Nichts zu bezahlen.', 'info', 2000); return false; }
    const left = this.g.payLeft(go), part = go.action.part;
    if (!this.g.canPayGoal(go)) { this.toast(`Du brauchst ${fmtUSD(left)}${part && left > part && this.g.canPayGoal(go, part) ? ` – oder zahl im Ziel ${fmtUSD(part)} an` : ''}.`, 'bad'); return false; }
    if (this.g.goalAction(go)) { this.toast(`✔ ${esc(this.g.payPaid(go) > left ? `${fmtUSD(left)} überwiesen` : go.action.label)} – erledigt!`, 'good'); this.audio?.cash(); this.goals(); this.top(); return true; }
    return false;
  }
  // Schritt-für-Schritt-Hinweise (oben in der Mitte)
  tutorial() {
    this.ideaTick();
    const el = $('#tut'); if (!el) return;
    if (this.g.s.feat) { el.classList.add('hidden'); return; }
    const g = this.g, s = g.s; let t = '';
    if (s.chapter === 0) {
      const btc = s.wallet.BTC.ex;
      if (!s.flags.miningStarted) t = this.inspUid ? 'Klick auf <b>Mining starten</b>.' : 'Dein PC steht neben dem Schreibtischstuhl. Geh hin, schau ihn an und drück <kbd>E</kbd>.';
      else if (!g.has('market')) t = this.inspUid ? 'Dein PC schürft jetzt Bitcoin. Schließ das Fenster mit <kbd>E</kbd> und lass ihn ein paar Tage arbeiten.' : 'Dein PC schürft Bitcoin. Lass ihn ein paar Tage arbeiten, bis sich etwas angesammelt hat …';
      else if (!(s.stats.sold > 0)) t = this.mk?.open ? 'Klick auf <b>Verkaufen</b>, dann <b>Alles</b> und bestätigen.' : `Du hast ${fmtCoin(btc)} BTC. Geh zum <b>PC-Monitor</b> auf dem Schreibtisch und drück <kbd>E</kbd>, um sie zu verkaufen.`;
      else if (!s.flags.boughtGpu) t = this.inspUid ? 'Klick auf den <b>freien GPU-Slot</b> und kauf eine zweite Grafikkarte.' : 'Mehr Grafikkarten = mehr Bitcoin. Schau deinen PC an (<kbd>E</kbd>) und bau eine zweite Karte ein.';
      else if (!s.goals.earn) t = 'Lass den PC arbeiten (Tempo mit <kbd>1</kbd>–<kbd>4</kbd>) und verkauf regelmäßig am Monitor. Ziel: 1.000 $ verdient.';
    }
    if (!t) {
      const ch = CHAPTERS[s.chapter], go = ch && ch.goals.find((x) => !s.goals[x.id] && x.action);
      const rest = ch && ch.goals.filter((x) => !s.goals[x.id] && !x.action).length;
      if (go && !rest) t = s.cash >= go.action.cost ? `Drück <b>G</b>: ${esc(go.action.label)}.` : `Spare für „${esc(go.action.label)}“ – ${fmtUSD(s.cash)} / ${fmtUSD(go.action.cost)}.`;
    }
    if (!t && FACILITIES.some((f) => g.canUnlock(f.id))) t = `Ein neuer Standort ist frei: Geh zur <b>${this.w.hoff ? 'Haustür' : 'Tür'}</b>, schau sie an und drück <b>E</b>.`;
    if (!t && s.chapter === 0 && s.goals.gpu && !s.goals.rig2) t = g.readyOk('tower') ? 'Drück <b>B</b> → Rigs → Tower: <b>Fertig bestückt</b> kaufen und hinstellen – oder als Bausatz selbst bauen.' : 'Drück <b>B</b> → Rigs → Tower: <b>Als Bausatz</b> kaufen und hinstellen. Dann anschauen, <b>E</b> und die Teile aus dem Lager einbauen.';
    if (!t && s.chapter === 1 && !s.goals.openrig) t = 'Drück <b>B</b> → Rigs: Stell eine <b>Milchkiste</b> auf. Dann anschauen, <b>E</b> und bestücken (Mainboard, CPU, Netzteil, GPUs).';
    if (!t) { const ch = CHAPTERS[s.chapter], go = ch && ch.goals.find((x) => !s.goals[x.id]); if (go) t = `Nächstes Ziel: ${esc(go.text)}`; }
    if (el.dataset.t !== t) { el.dataset.t = t; el.innerHTML = t; el.classList.toggle('hidden', !t); if (t) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } }
  }
  unlock(id) {
    const f = FACILITY[id];
    if (!this.g.unlockFacility(id)) { this.toast(`Du brauchst ${fmtUSD(f.cost)}.`, 'bad'); return; }
    if ((id === 'keller' || id === 'kinder') && this.w.hoff && !this.w.empire) { // im Haus: kein Teleport, die Kellertür ist jetzt offen
      if (this.w.facId === 'keller') this.w.reloadHere(); else this.w.prewarmHouse?.(); // verstaubten Keller gegen den freien tauschen (unter der Story-Karte)
      this.houseMove(this.w.facId); if (this.w.facId !== id) this.walkGoal = { id, until: performance.now() + 90000 };
    } else this.switchSite(id);
    const ci = CHAPTERS.findIndex((c) => c.unlock === id);
    const next = CHAPTERS[ci + 1];
    this.story(next?.title || f.name, `${(this.g.s.flags.shopLost && next?.introLost) || next?.intro || ''}<br/><br/><b>${esc(f.name)}</b> – ${esc(f.place)}<br/>${f.w} × ${f.d} m · ${f.power[0].kw.toLocaleString('de-DE')} kW Anschluss${f.rent ? ` · Miete ${fmtUSD(f.rent)}/Monat ab dem ersten Gerät` : ''}<br/><i>${esc(f.desc)}</i><br/><br/><b>${f.slots}</b> Stellplätze statt ${FACILITY[FACILITIES[Math.max(0, f.tier - 1)].id].slots} · <b>${Math.round((f.w * f.d) / 14).toLocaleString('de-DE')}×</b> so groß wie deine erste Bude · <b>${Math.round(f.power[0].kw / 1.8).toLocaleString('de-DE')}×</b> so viel Strom.`);
    this.onModalClose = () => setTimeout(() => this.offerMove(id), 300); // danach: Geräte mitnehmen? (V2)
  }

  // ---------- Dock ----------
  dock() {
    const el = $('#dock'), g = this.g;
    const unread = g.s.messages.filter((m) => !m.read).length + (g.s.ev?.open ? 1 : 0);
    const skN = g.has('skills') && g.s.sk ? g.skillsOpenN() : 0; // Fähigkeiten, die man gerade auf einem Weg lernen kann
    el.innerHTML = '';
    const btns = [
      ['', 'Shop', 'B', () => this.toggleBuild()], ['', 'Börse', 'M', () => this.market()], ['', 'Handy', 'H', () => this.phone(), unread], ['', 'Firma', 'C', () => this.company()],
      ['', 'Fähigkeiten', 'T', () => this.skills(), skN], ['', 'Logbuch', 'L', () => this.ranking(), this.achNew || 0], ['', this.w.empire ? 'Zurück' : 'Karte', 'K', () => this.toggleMap()], ['', 'Menü', 'ESC', () => this.menu()],
    ];
    const need = { B: 'build', M: 'market', H: 'phone', C: 'company', T: 'skills', L: 'ranking', K: 'map' };
    const act = document.body.classList.contains('show-build') ? 'B' : this.w.empire ? 'K' : ({ market: 'M', phone: 'H', intro: 'H', company: 'C', skills: 'T', ranking: 'L', menu: 'ESC' })[this.modalKind] || (this.paused ? 'ESC' : null);
    const les = g.lesson(), lf = les && (les === 'bills' ? 'phone' : FEATURES[les]?.by || les); // Anlernen: der Knopf der laufenden Lektion leuchtet (Monatsabrechnung: das Handy)
    for (const [ic, l, key, fn, b] of btns.filter((x) => !need[x[2]] || g.has(need[x[2]]))) { const e = h(`<button class="${act === key ? 'on' : ''} ${lf && need[key] === lf ? 'learn' : ''}" title="${l} (${key})">${ic}${l}<span class="key">${key}</span>${b ? `<span class="bdg">${b}</span>` : ''}</button>`); e.onclick = () => { if (this.stickyModal()) return; fn(); }; el.append(e); }
  }
  toggleMap() {
    this.g.learned?.('map');
    if (this.w.empire) { this.w.hideEmpire(); this.pause(false); this.w.setMode('play'); }
    else { this.resume(); this.w.showEmpire(); }
  }

  // ---------- Modals ----------
  openModal(node, cls = '', kind = null) { document.getElementById('lvup')?.remove(); this.openUI(); const m = $('#modal'); m.classList.remove('hidden'); const card = m.querySelector('.modal-card'); card.className = 'modal-card ' + cls; card.scrollTop = 0; /* neues Fenster beginnt oben (reCompany stellt die Position selbst wieder her) */ const b = m.querySelector('.modal-body'); b.innerHTML = ''; b.append(node); this.modalKind = kind; document.body.dataset.modal = kind || ''; this.dock(); }
  closeModal() { const wasEvent = this.modalKind === 'event'; $('#modal').classList.add('hidden'); this.modalKind = null; document.body.dataset.modal = ''; this.dock(); const cb = this.onModalClose; this.onModalClose = null; cb?.(); if (wasEvent && this.g.s.ev?.open) this.evSnooze = this.g.s.ev.open.key; else if (this.g.s.ev?.open) setTimeout(() => this.tryEvent(), 500); if (!this.inspUid && !document.body.classList.contains('show-build') && $('#modal').classList.contains('hidden') && (this.w.mode === 'ui')) this.w.setMode('play'); }
  story(title, html, btn = 'Los geht’s') {
    const n = h(`<div class="story"><div class="ch">${esc(title)}</div><p>${html}</p><div class="row" style="justify-content:flex-end"><button class="btn primary">${btn}</button></div></div>`);
    n.querySelector('button').onclick = () => this.closeModal();
    this.openModal(n, 'narrow', 'story');
  }

  // ---------- Lebendige Welt: Gespräche & Fundstücke ----------
  promptLife(aim) {
    if (aim.keep) { const k = KEEPSAKE[aim.keep]; return `<kbd>E</kbd>${esc(k?.label || 'Etwas')} aufheben<div class="st">Sieht nach einer Erinnerung aus</div>`; }
    const s = this.g.s, who = talkWho(s, aim.prop.who), p = PEOPLE[who];
    const today = s.talk?.last?.[who] === s.day;
    return `<kbd>E</kbd>Mit ${esc(p.as)} reden<div class="st">${esc(p.role(s))}${today ? ' · heute schon gesprochen' : ''}</div>`;
  }
  talk(who0) {
    const r = talkTo(this.g, who0, this.w.facId); if (!r) return;
    const heart = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg>';
    const pips = `<i class="tk-pips" title="Einmal pro Woche zählt ein Gespräch für eure Beziehung">${Array.from({ length: TALK_REL.quarters }, (_, i) => `<b class="${i < r.quarters ? 'on' : ''}"></b>`).join('')}</i>`;
    const joy = r.relUp ? `<span class="tk-joy up">${heart}${esc(r.person.as)} mag eure Gespräche · Beziehung +1</span>` : r.joy ? `<span class="tk-joy">${heart}${esc(r.name)} freut sich${r.capped ? '' : pips}</span>` : '<span></span>';
    const n = h(`<div class="story talk"><div class="tk-who"><span class="tk-av">${faceSvg(r.who)}</span><div class="tk-n"><b>${esc(r.name)}</b><small>${esc(r.role)}</small></div></div><p class="tk-line">„${r.line}“</p><div class="tk-foot">${joy}<button class="btn primary">Bis später</button></div></div>`);
    n.querySelector('button').onclick = () => this.closeModal();
    this.openModal(n, 'narrow', 'talk');
    if (r.relUp) this.audio?.cash?.();
    this.refresh?.();
  }
  pickKeep(id) {
    const k = KEEPSAKE[id]; if (!k || this.g.s.keep?.[id]) return;
    this.w.keepFx(id);
    if (!pickKeepsake(this.g, id)) return;
    this.audio?.install?.(); this.refresh?.();
    setTimeout(() => this.keepCard(k), 480);
  }
  keepCard(k) {
    const s = this.g.s, n0 = keepsakeCount(s), all = KEEPSAKES.length;
    let pic = ''; try { pic = this.w.keepThumb?.(k.id) || ''; } catch (e) { pic = ''; }
    const n = h(`<div class="story keep"><div class="kp-tag">Fundstück ${n0} von ${all}</div>${pic ? `<div class="kp-pic"><img src="${pic}" alt=""></div>` : ''}<div class="ch">${esc(k.name)}</div><p>${k.text}</p><div class="kp-gain"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>${esc(k.gain)}</div>${n0 >= all ? '<div class="kp-all">Alle Erinnerungsstücke gefunden. Schatzsucher!</div>' : ''}<div class="row" style="justify-content:flex-end"><button class="btn primary">Einstecken</button></div></div>`);
    n.querySelector('button').onclick = () => this.closeModal();
    this.openModal(n, 'narrow', 'keep');
  }

  // Börse: eigene Seite (market.js) – als Fenster (M) oder am PC-Monitor (useProp → Market.atPc)
  market(update = false) { (this.mk ||= new Market(this)).show(update); }

  phone(tab = null) {
    this.g.learned?.('phone'); this.ringOff?.(); this.ringOff = null;
    const g = this.g;
    const msgs = [...g.s.messages].sort((a, b) => b.day - a.day), unread = msgs.filter((m) => !m.read).length;
    tab = tab || (unread || g.s.ev?.open ? 'msgs' : this.phoneTab || 'msgs'); this.phoneTab = tab;
    const newC = CONTACTS.filter((c) => g.contactMet(c.id) && !g.contactOn(c.id)).length, owe = g.owed?.() > 0;
    const body = h(`<div><h2>Handy</h2><div class="ph-tabs" role="tablist"><button class="btn small ${tab === 'msgs' ? 'on' : ''}" data-t="msgs">Nachrichten${unread ? ` <span class="ph-n">${unread}</span>` : ''}</button><button class="btn small ${tab === 'contacts' ? 'on' : ''}" data-t="contacts">Kontakte${newC ? ` <span class="ph-n">${newC}</span>` : ''}</button><button class="btn small ${tab === 'konto' ? 'on' : ''}" data-t="konto">Konto${owe ? ' <span class="ph-n ph-warn">!</span>' : ''}</button></div><div class="phone"></div></div>`);
    body.querySelectorAll('.ph-tabs button').forEach((b) => { b.onclick = () => this.phone(b.dataset.t); });
    const ph = body.querySelector('.phone');
    if (tab === 'contacts') { this.phoneContacts(ph); this.openModal(body, 'narrow', 'phone'); this.dock(); return; }
    if (tab === 'konto') { g.learned?.('konto'); this.phoneKonto(ph); this.openModal(body, 'narrow', 'phone'); this.dock(); return; }
    const oe = g.s.ev?.open && EVENT[g.s.ev.open.id];
    const ob = g.s.bills?.open; // offene Rechnung: immer oben, auch wenn gerade eine andere Entscheidung offen ist (die Mahnung kommt dann danach)
    if (ob && oe?.id !== 'mahnung') { const card = h(`<div class="msg decide bill"><div class="fr">${esc((ob.who || [])[0] || 'Rechnung')}<span>${esc(BILL_STAGE[Math.min(3, ob.stage)])} · ${ob.stage >= 3 ? 'Strom abgestellt' : `Frist bis ${fmtDate(ob.due)}`}</span></div><b>${fmtUSD(g.owed())} offen</b><div class="row" style="margin-top:8px"><button class="btn small primary">Zum Konto</button></div></div>`); card.querySelector('button').onclick = () => this.phone('konto'); ph.append(card); }
    if (oe) { const card = h(`<div class="msg decide"><div class="fr">${esc(oe.from || '')}<span>Entscheidung offen · noch ${Math.max(0, g.s.ev.open.until - g.s.day)} Tage</span></div><b>${esc(g.evText(oe, 'title'))}</b><div class="row" style="margin-top:8px"><button class="btn small primary">Jetzt entscheiden</button></div></div>`); card.querySelector('button').onclick = () => { this.evSnooze = null; this.closeModal(); this.eventCard(); }; ph.append(card); }
    if (!msgs.length) ph.append(h('<div class="empty">Keine Nachrichten.</div>'));
    for (const m of msgs) { if (m.old) continue; const tip = MESSAGES.find((x) => x.id === m.id)?.tip; ph.append(h(`<div class="msg f-${m.from.split(' ')[0]} ${m.read ? '' : 'unread'} ${tip ? 'tip' : ''}"><div class="fr">${esc(m.from)}${tip ? '<em class="tip-tag">Tipp</em>' : ''}<span>${fmtDate(m.day)}</span></div>${esc(m.text)}</div>`)); }
    msgs.forEach((m) => (m.read = true));
    this.openModal(body, 'narrow', 'phone'); this.dock();
  }
  // Handy → Kontakte: Geschäftskontakte (fertig montierte Hardware, Stammkunden-Rabatt) und Familie (Beziehung, Wirkung ab Stufe 3)
  phoneContacts(ph) {
    const g = this.g, s = g.s;
    ph.classList.add('ph-contacts');
    ph.append(h('<div class="ct-sec">Geschäftlich</div>'));
    for (const c of CONTACTS) {
      const st = g.contactState(c.id), met = !!st?.met, on = !!st?.on, tier = g.contactTier(c.id), T = FEE_TIERS[tier], nx = FEE_TIERS[tier + 1], n = st?.n || 0;
      const badge = on ? '<span class="ct-b on">Freigeschaltet</span>' : met ? '<span class="ct-b off">Nicht gespeichert</span>' : '<span class="ct-b lock">Noch nicht kennengelernt</span>';
      const tierLine = on ? `<div class="ct-tier"><b>${esc(T.label)}</b> · ${Math.round(T.fee * 100)}&nbsp;% Montage · ${n} ${n === 1 ? 'Auftrag' : 'Aufträge'}${nx ? `<br/><span>Noch ${nx.n - n} ${nx.n - n === 1 ? 'Auftrag' : 'Aufträge'} bis „${esc(nx.label)}“ (${Math.round(nx.fee * 100)}&nbsp;%)</span>` : ''}</div>` : '';
      const last = on ? [...s.messages].reverse().find((m) => m.from === c.name) : null;
      const card = h(`<div class="ct-card ${on ? 'on' : met ? 'met' : 'unknown'}"><div class="ct-av">${met ? faceSvg(c.id) : `<span class="ct-q">?</span>`}</div><div class="ct-main"><div class="ct-name"><b>${esc(met ? c.name : c.unknown)}</b>${met ? `<span class="ct-biz">${esc(c.biz)}</span>` : ''}${badge}</div>${met ? `<div class="ct-role">${esc(c.role)}</div>` : ''}<div class="ct-offer">${on ? 'Liefert' : 'Bietet'}: ${esc(c.offer)}</div>${tierLine}${last ? `<div class="ct-last">„${esc(last.text)}“</div>` : ''}${!met ? `<div class="ct-how">${LOCK_SVG}<span>${esc(c.meet(s, g, fmtDate))}</span></div>` : ''}<div class="ct-act"></div></div></div>`);
      const act = card.querySelector('.ct-act');
      if (met && !on) { const b = h(`<button class="btn small primary">${esc(c.name)} anrufen</button>`); b.onclick = () => { this.callContact(c.id); this.phone('contacts'); }; act.append(b); act.append(h('<span class="ct-hint">Danach gibt’s fertig bestückte Geräte im Katalog.</span>')); }
      if (on && g.has('build')) { const b = h('<button class="btn small">Zum Katalog</button>'); b.onclick = () => { this.closeModal(); this.cat = 'rigs'; this.toggleBuild(); }; act.append(b); }
      if (!act.childElementCount) act.remove();
      ph.append(card);
    }
    ph.append(h('<div class="ct-sec">Familie</div>'));
    for (const f of FAMILY_CONTACTS) {
      const lv = s.rel?.[f.id] || 0, face = f.id;
      const dots = Array.from({ length: 5 }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
      const perk = lv >= 3 ? (f.id === 'papa' && s.flags.shopLost && REL_PERK.papaLost ? REL_PERK.papaLost : REL_PERK[f.id]) : '';
      const card = h(`<div class="ct-card fam"><div class="ct-av">${faceSvg(face)}</div><div class="ct-main"><div class="ct-name"><b>${esc(f.name)}</b><span class="ct-rel" title="Beziehung ${lv} von 5">${lv < 0 ? `<em class="neg">verstimmt (${lv})</em>` : `<span class="ct-dots">${dots}</span>`}</span></div><div class="ct-role">${esc(f.role(s))}</div>${perk ? `<div class="ct-perk">${esc(perk)}</div>` : REL_PERK[f.id] ? `<div class="ct-how2">Ab Stufe 3: ${esc(REL_PERK[f.id])}</div>` : ''}</div></div>`);
      if (f.id === 'papa') { const lb = this.papaLoanBox(); if (lb) card.querySelector('.ct-main').append(lb); }
      ph.append(card);
    }
  }
  // Papas Umzugsdarlehen (Kontakte → Papa): Rest, Raten, alles zurückzahlen
  papaLoanBox() {
    const g = this.g, s = g.s, L = s.papaLoan; if (!L || !(L.total > 0)) return null;
    if (!(L.left > 0)) return h(`<div class="ct-loan done">Umzugsdarlehen <b>zurückgezahlt</b>${L.done ? ` am ${fmtDate(L.done)}` : ''} · ${this.money(L.total)}</div>`);
    const pc = Math.round(Math.max(0, Math.min(1, 1 - L.left / L.total)) * 100), rate = Math.min(L.left, Math.max(50, Math.round(L.total / 10 / 50) * 50));
    const el = h(`<div class="ct-loan"><div>Umzugsdarlehen: noch <b>${this.money(L.left)}</b> von ${this.money(L.total)} · ohne Zinsen, ohne Frist</div><div class="bar"><div style="width:${pc}%"></div></div><div class="ct-act"></div></div>`);
    const act = el.querySelector('.ct-act');
    const pay = (v) => { const r = g.repayPapa(v); if (r) { this.audio?.cash?.(); this.toast(g.papaLeft() > 0 ? `${this.money(r)} an Papa überwiesen – noch ${this.money(g.papaLeft())}` : `${this.money(r)} an Papa überwiesen – alles zurückgezahlt!`, 'good', 4000); } this.phone('contacts'); };
    const b1 = h(`<button class="btn small">${this.money(rate)} zurückzahlen</button>`); b1.disabled = !g.canAfford(rate); b1.onclick = () => pay(rate); act.append(b1);
    if (L.left > rate) { const b2 = h(`<button class="btn small primary">Alles zurückzahlen · ${this.money(L.left)}</button>`); b2.disabled = !g.canAfford(L.left); b2.onclick = () => pay(L.left); act.append(b2); }
    if (!g.canAfford(rate)) act.append(h('<span class="ct-hint">Dafür reicht dein Konto gerade nicht.</span>'));
    return el;
  }
  // Handy → Konto: Kontostand, nächste Abrechnung, offene Rechnung (Mahnung), laufende Monatskosten, Monatsabrechnungen, Schulden
  phoneKonto(ph) {
    const g = this.g, s = g.s, B = s.bills || { hist: [] }, o = B.open, L = s.papaLoan, nb = g.nextBillDay();
    ph.classList.add('ph-contacts', 'ph-konto');
    ph.append(h(`<div class="kt-head"><div><span>Kontostand</span><b class="${s.cash < 0 ? 'neg' : ''}">${fmtUSD(s.cash)}</b></div><div><span>Nächste Abrechnung</span><b>${fmtDate(nb)}</b><small>etwa ${fmtUSD(g.billEstimate())} · bisher ${fmtUSD(g.billAccrued())}</small></div></div>`));
    if (o) {
      const box = h(`<div class="kt-open st${o.stage}"><div class="kt-oh"><b>${esc(BILL_STAGE[Math.min(3, o.stage)])}</b><span>${fmtUSD(g.owed())} offen</span></div><div class="kt-ot">${billText(s, g)}</div><div class="ct-act"></div></div>`);
      const act = box.querySelector('.ct-act');
      if (g.billCoinOk()) { const b = h('<button class="btn small primary">Coins verkaufen und bezahlen</button>'); b.onclick = () => { if (g.payBills(true)) this.audio?.cash?.(); this.phone('konto'); }; act.append(b); }
      if (g.has('market')) { const b = h('<button class="btn small">Zur Börse</button>'); b.onclick = () => { this.closeModal(); this.market(); }; act.append(b); }
      if (g.papaHelpOk()) { const b = h('<button class="btn small">Papa um Hilfe bitten</button>'); b.onclick = () => { if (g.papaHelp()) { this.audio?.cash?.(); this.toast(`<b>Papa:</b> ${esc(PAPA_HELP[Math.min(PAPA_HELP.length - 1, (s.papaLoan?.help || 1) - 1)])}`, 'msg', 8000); } this.phone('konto'); }; act.append(b); }
      ph.append(box);
    }
    const mc = g.monthlyCosts(), OTHER = { staff: 'Gehälter', ups: 'Ausbauten (laufend)', deals: 'Laufende Verträge', income: 'Einnahmen aus Verträgen' };
    const rows = mc.rows.filter((r) => r.rent >= 0.5 || r.elec >= 0.5 || r.pausch).map((r) => [`${esc(FACILITY[r.fac].short)}${r.cut ? ' <em class="neg">gesperrt</em>' : ''}`, [r.rent >= 0.5 ? `Miete ${fmtUSD(r.rent)}` : '', r.pausch ? 'Strom in der Warmmiete' : r.elec >= 0.5 ? `Strom ~${fmtUSD(r.elec)}` : ''].filter(Boolean).join(' · ')]);
    for (const [k, v] of Object.entries(mc.other)) if (Math.abs(v) >= 0.5) rows.push([OTHER[k], v < 0 ? `<span class="pos">+${fmtUSD(-v)}</span>` : fmtUSD(v)]);
    ph.append(h('<div class="ct-sec">Monatskosten bei heutiger Last</div>'));
    ph.append(h(`<div class="kt-card"><div class="kv">${rows.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('') || '<div class="k">Noch keine laufenden Kosten</div><div class="v">–</div>'}<div class="k"><b>Pro Monat</b></div><div class="v"><b>${fmtUSD(mc.total)}</b></div></div></div>`));
    ph.append(h('<div class="ct-sec">Monatsabrechnungen</div>'));
    if (!B.hist?.length) ph.append(h(`<div class="kt-card kt-empty">Noch keine Abrechnung. Miete und Strom werden am ${fmtDate(nb)} zum ersten Mal abgebucht.</div>`));
    (B.hist || []).slice(0, 12).forEach((b, i) => ph.append(this.billCard(b, i === 0)));
    const loan = s.loan || 0;
    if (L?.total > 0 || loan > 0) {
      ph.append(h('<div class="ct-sec">Schulden</div>'));
      const kv = []; if (L?.total > 0) kv.push(['Papas Umzugsdarlehen', L.left > 0 ? `${fmtUSD(L.left)} von ${fmtUSD(L.total)}` : '<span class="pos">zurückgezahlt</span>']); if (loan > 0) kv.push(['Bankkredit', fmtUSD(loan)]);
      const c = h(`<div class="kt-card"><div class="kv">${kv.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('')}</div>${L?.left > 0 ? '<div class="ct-act"></div>' : ''}</div>`);
      if (L?.left > 0) { const b = h('<button class="btn small">Bei Papa zurückzahlen</button>'); b.onclick = () => this.phone('contacts'); c.querySelector('.ct-act').append(b); c.querySelector('.ct-act').append(h('<span class="ct-hint">ohne Zinsen, ohne Frist – auch in Raten</span>')); }
      ph.append(c);
    }
  }
  // Eine Monatsabrechnung: Miete und Strom je Standort, sonstige Posten, Summe, Status
  billCard(b, open = false) {
    const ST = { ok: ['abgebucht', 'pos'], dispo: ['abgebucht · Dispo', 'warn'], open: ['offen', 'neg'], paid: [`bezahlt am ${b.paidDay ? fmtDate(b.paidDay) : '–'}`, 'pos'], gut: ['gutgeschrieben', 'pos'], insolv: ['Insolvenz', ''] }[b.st] || ['', ''];
    const OTHER = { staff: 'Gehälter', ups: 'Ausbauten (laufend)', deals: 'Laufende Verträge', income: 'Einnahmen aus Verträgen' }, L = [];
    for (const it of b.items || []) {
      const F = FACILITY[it.fac]?.short || it.fac;
      if (it.rent > 0) L.push([`Miete ${esc(F)}${it.fac === 'kinder' ? ' (warm)' : ''}`, fmtUSD(it.rent)]);
      if (it.pausch && !(it.elec > 0)) L.push([`Strom ${esc(F)} · ${fmtNum(it.kwh || 0, 0)} kWh`, 'in der Warmmiete']);
      else if (it.elec > 0) L.push([`Strom ${esc(F)} · ${fmtNum(it.kwh || 0, 0)} kWh`, fmtUSD(it.elec)]);
    }
    for (const [k, v] of Object.entries(b.other || {})) L.push([OTHER[k] || esc(k), v < 0 ? `+${fmtUSD(-v)}` : fmtUSD(v)]);
    const tot = b.total < 0 ? '+' + fmtUSD(-b.total) : fmtUSD(b.total);
    return h(`<details class="kt-bill kt-card" ${open ? 'open' : ''}><summary><span class="kt-m">${esc(monthName(b.m))}</span><span class="kt-st ${ST[1]}">${ST[0]}</span><b class="kt-sum">${tot}</b></summary><div class="kv">${L.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('')}<div class="k"><b>Summe</b></div><div class="v"><b>${tot}</b></div></div></details>`);
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
      const b = h(`<button class="btn ${c.i === 0 ? 'primary' : ''} ev-c" ${c.ok ? '' : 'disabled'}><span class="ev-l">${esc(c.label)}${c.cost ? ` <span class="ev-cost">· ${this.money(c.cost)}</span>` : ''}</span>${c.hint ? `<small>${esc(c.hint)}</small>` : ''}${!c.ok && c.cost && !c.needFail ? '<small>Dafür reicht dein Geld nicht.</small>' : ''}${!c.ok && c.needFail ? `<small>${esc(c.needText || 'Gerade nicht möglich.')}</small>` : ''}</button>`);
      b.onclick = () => { const k0 = o.key, reply = g.chooseEvent(c.i); this.evSnooze = null; this.closeModal(); if (g.s.ev?.open && g.s.ev.open.key !== k0) { this.evSnooze = null; setTimeout(() => this.tryEvent(), 600); } this.audio?.cash?.(); if (reply) this.toast(reply, 'msg', 7000); this.refresh(); this.dock(); }; // Folge-Ereignis (z. B. Mahnung → Bankgespräch) gleich zeigen
      box.append(b);
    }
    this.openModal(body, 'narrow', 'event');
  }
  // Monatsabrechnung gebucht: kurze Meldung (im Zeitraffer nur die ersten, offene und Dispo-Abbuchungen), Details im Handy → Konto
  onBill(b) {
    this.dock(); if (this.modalKind === 'phone' && this.phoneTab === 'konto') this.phone('konto');
    if (!b || b.st === 'open') return; // offen: chargeBill meldet sich selbst, die Mahnung kommt als Ereignis
    const s = this.g.s, first = (s.stats.bills || 0) <= 2;
    if (!first && (s.speed || 0) >= 5 && b.st !== 'dispo') return;
    const parts = (b.items || []).map((it) => `${FACILITY[it.fac]?.short || it.fac} ${fmtUSD(it.rent + it.elec)}`).join(', ');
    this.toast(`<b>Monatsabrechnung ${esc(monthName(b.m))}:</b> ${b.total < 0 ? `+${fmtUSD(-b.total)} gutgeschrieben` : `${fmtUSD(b.total)} abgebucht`}${parts ? ` (${esc(parts)})` : ''}${b.st === 'dispo' ? ' – das Konto ist im Dispo' : ''}. Details: Handy → Konto.`, b.st === 'dispo' ? 'bad' : 'info', first ? 9000 : 5000);
  }
  // Anlernen: nach Papas Nachricht schreibt Deniz – nach ein paar Schritten oder spätestens 40 Sekunden (liest man das Handy nicht: nach 90 Sekunden)
  ideaTick() {
    const g = this.g; if (!g.ideaPending?.() || !g.has('phone')) { if (!g.ideaPending?.()) this.idea0 = null; return; }
    if (this.w.cine || !$('#splash').classList.contains('hidden')) return;
    const now = performance.now(); this.idea0 ??= now;
    if (!this.ideaRead && g.s.messages.find((m) => m.id === 'm0p')?.read) { this.ideaRead = now; this.ideaSteps0 = this.steps || 0; }
    const t = (now - this.idea0) / 1000, tr = this.ideaRead ? (now - this.ideaRead) / 1000 : 0, st = (this.steps || 0) - (this.ideaSteps0 || 0);
    if (!((this.ideaRead && tr >= 8 && (st >= 8 || tr >= 40)) || t >= 90)) return;
    if (this.modalKind === 'phone' || this.paused) return; // erst, wenn das Handy wieder zu ist
    g.denizIdea();
  }
  // Das Handy klingelt (neue Nachricht außerhalb einer Lektion): Karte bis zum Öffnen des Handys
  ringCard(from) {
    const box = $('#featcards'); if (!box) return; box.querySelector('.featcard.ring2')?.remove();
    const el = h(`<div class="featcard ring ring2"><div class="fc-t">${PHONE_SVG}Bzzz … bzzz …</div><div class="fc-h"><kbd class="fc-k">H</kbd>${esc(from)} schreibt dir</div><div class="fc-b">Neue Nachricht! Drück <kbd>H</kbd> für dein Handy.</div></div>`);
    box.prepend(el); this.audio?.message?.(); this.keysHint(); this.dock();
    let gone = false; const off = () => { if (gone) return; gone = true; el.classList.add('out'); setTimeout(() => el.remove(), 600); }; this.ringOff = off; setTimeout(off, 45000); // bleibt, bis das Handy aufgeht (spätestens 45 Sekunden)
  }
  // Firma → Monatskosten: Miete und Strom je Standort (bei heutiger Last), Sonstiges, nächste Abrechnung, Offenes, Papas Darlehen
  costsSec() {
    const g = this.g, s = g.s, mc = g.monthlyCosts(), nb = g.nextBillDay(), o = s.bills?.open, L = s.papaLoan;
    const OTHER = { staff: 'Gehälter', ups: 'Ausbauten (laufend)', deals: 'Laufende Verträge', income: 'Einnahmen aus Verträgen' }, rows = [];
    for (const r of mc.rows) { if (!(r.rent >= 0.5 || r.elec >= 0.5 || r.pausch)) continue; rows.push([`${esc(FACILITY[r.fac].name)}${r.cut ? ' <em class="neg">· Strom gesperrt</em>' : ''}`, [r.rent >= 0.5 ? `Miete ${fmtUSD(r.rent)}` : '', r.pausch ? 'Strom in der Warmmiete' : r.elec >= 0.5 ? `Strom ~${fmtUSD(r.elec)}` : ''].filter(Boolean).join(' · ')]); }
    for (const [k, v] of Object.entries(mc.other)) if (Math.abs(v) >= 0.5) rows.push([OTHER[k], v < 0 ? `<span class="pos">+${fmtUSD(-v)}</span>` : fmtUSD(v)]);
    rows.push(['<b>Pro Monat</b>', `<b>${fmtUSD(mc.total)}</b>`], ['Nächste Abrechnung', `${fmtDate(nb)} · etwa ${fmtUSD(g.billEstimate())}`]);
    if (o) rows.push([`Offen · ${esc(BILL_STAGE[Math.min(3, o.stage)])}`, `<span class="neg">${fmtUSD(g.owed())}</span>`]);
    if (L?.left > 0) rows.push(['Papas Umzugsdarlehen', `${fmtUSD(L.left)} · ohne Zinsen`]);
    const sec = h(`<div class="sec costs"><h4>Monatskosten</h4><div class="kv">${rows.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('')}</div><div class="row"></div></div>`), r = sec.querySelector('.row');
    if (o && g.billCoinOk()) { const b = h('<button class="btn small primary">Coins verkaufen und bezahlen</button>'); b.onclick = () => { if (g.payBills(true)) this.audio?.cash?.(); this.reCompany(); }; r.append(b); }
    const b = h('<button class="btn small">Abrechnungen im Handy</button>'); b.onclick = () => { this.closeModal(); this.phone('konto'); }; r.append(b);
    return sec;
  }
  rentLabel(f, un) {
    const g = this.g; if (!f.rent) return 'keine';
    if (un && g.upgrades(f.id).some((u) => u.fx?.rent === 0 && g.upActive(f.id, u))) return 'keine (gekauft)';
    if (un && f.id !== 'kinder' && !g.facInUse(f.id)) return `ruht ohne Geräte (${fmtUSD(f.rent)}/Monat)`;
    const r = f.rent * (un ? g.fx('rent', f.id) : 1); return r >= 0.5 ? `${fmtUSD(r)}/Monat${f.id === 'kinder' ? ' (warm)' : ''}` : 'keine';
  }
  company() {
    this.g.learned?.('company');
    const g = this.g, s = g.s;
    const body = h(`<div><h2>Firma</h2><div class="cards"></div><div class="sec staff"></div></div>`);
    const cards = body.querySelector('.cards');
    const nextLocked = FACILITIES.find((x) => !s.unlocked.includes(x.id));
    for (const f of FACILITIES) {
      const un = s.unlocked.includes(f.id), can = g.canUnlock(f.id);
      if (!un && f !== nextLocked) continue;
      const fs = s.fac[f.id], sm = g.summary[f.id];
      const c = h(`<div class="card ${!un && !can ? 'lock' : ''}"><h3>${un ? '' : can ? '' : ''}${esc(f.name)}</h3><div class="sub">${esc(f.place)} · ${fmtNum(f.w, 1)}×${fmtNum(f.d, 1)} m</div>
        <div class="kv" style="margin:4px 0"><div class="k">Anschluss</div><div class="v">${fmtNum(f.power[fs.power].kw, 1)} kW</div>
        <div class="k">Strompreis</div><div class="v">${g.elecPrice(f.id) ? fmtUSD(g.elecPrice(f.id)) + '/kWh' : 'Pauschale in der Warmmiete'}</div>
        <div class="k">Miete</div><div class="v">${this.rentLabel(f, un)}</div>${un && fs.cut ? '<div class="k">Strom</div><div class="v neg">gesperrt – Rechnung offen</div>' : ''}
        ${un ? `<div class="k">Last</div><div class="v">${fmtWatt(sm.watt)}</div><div class="k">Temperatur</div><div class="v ${sm.temp > 38 ? 'neg' : ''}">${fmtNum(sm.temp, 1)} °C</div><div class="k">Stellplätze</div><div class="v ${g.slotsUsed(f.id) >= g.slotsMax(f.id) ? 'neg' : ''}">${g.slotsUsed(f.id)} / ${g.slotsMax(f.id)}</div>` : `<div class="k">Stellplätze</div><div class="v">${f.slots}</div>`}</div></div>`);
      if (un) {
        const nx = f.power[fs.power + 1];
        if (nx) { const pc = g.powerCost(f.id), wait = g.powerWaitUntil?.(f.id), b = h(`<button class="btn small">${esc(nx.label)}: ${fmtNum(nx.kw, nx.kw < 10 ? 1 : 0)} kW (${wait ? `ab ${fmtDate(wait)}` : fmtUSD(pc)})</button>`); b.disabled = s.cash < pc || !!wait; b.onclick = () => { if (g.upgradePower(f.id)) { this.toast('Stromanschluss ausgebaut!', 'good'); this.company(); this.sites(); } }; c.append(b); }
        else c.append(h('<div style="font-size:12px;color:var(--dim)">Maximaler Anschluss erreicht.</div>'));
        const step = g.solarStep(f.id);
        if (step) { const cost = step * g.solarPricePerKwp(); const sb = h(`<button class="btn small">+${step} kWp Solar (${fmtUSD(cost)})</button>`); sb.disabled = s.cash < cost; sb.onclick = () => { if (g.buildSolar(f.id)) { this.toast(`Solaranlage erweitert (${f.short})`, 'good'); this.company(); } }; c.append(sb); }
        if (s.current !== f.id) { const go = h('<button class="btn small" style="margin-left:6px">Hingehen</button>'); go.onclick = () => { this.closeModal(); this.goSite(f.id); }; c.append(go); }
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
    for (const f of (lim >= 400 ? [0.25, 1] : [1])) { const amt = Math.round(lim * f / 100) * 100; const b = h(`<button class="btn small">${fmtUSD(amt)} leihen</button>`); b.disabled = amt <= 0; b.onclick = () => { const u = g.takeLoan(amt); if (u) { this.audio?.cash(); this.toast(`Kredit über ${fmtUSD(u)} aufgenommen`, 'good'); } this.company(); }; lr.append(b); }
    const rp = h(`<button class="btn small good">Tilgen (${fmtUSD(Math.min(loan, Math.max(0, s.cash)))})</button>`); rp.disabled = !loan || s.cash <= 0; rp.onclick = () => { const u = g.repayLoan(loan); if (u) this.toast(`${fmtUSD(u)} getilgt`, 'good'); this.company(); }; lr.append(rp);
    if (g.has('loan')) st.append(lb);
    if (stHide) { st.innerHTML = ''; if (g.has('loan')) st.append(lb); }
    st.prepend(this.costsSec()); // Monatskosten und nächste Abrechnung ganz oben
    const nwc = h('<div class="sec"><h4>Vermögensverlauf (log)</h4><canvas class="nwchart" width="1100" height="260"></canvas></div>'); if (g.has('ranking') && (s.stats.history || []).length >= 3) st.append(nwc); requestAnimationFrame(() => this.nwChart(nwc.querySelector('canvas')));
    st.append(h(`<div class="sec"><h4>Bilanz pro Tag</h4><div class="kv"><div class="k">Mining-Ertrag</div><div class="v pos">${fmtUSD(p.rev)}</div><div class="k">Strom, Miete, Löhne</div><div class="v neg">−${fmtUSD(p.cost)}</div><div class="k">Abgebucht wird monatlich</div><div class="v">am ${fmtDate(g.nextBillDay())} · etwa ${fmtUSD(g.billEstimate())}</div><div class="k">Gesamt geschürft</div><div class="v">${fmtUSD(s.stats.minedUSD)}</div><div class="k">Stromkosten bisher</div><div class="v">${fmtUSD(s.stats.elec)}</div><div class="k">In Hardware investiert</div><div class="v">${fmtUSD(s.stats.spentHW)}</div></div></div>`));
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
          const need = Math.max(u.cost || 0, u.monthly > 0 ? u.monthly : 0), lk = g.upLock(fid, u);
          if (lk) { r.classList.add('lock'); r.append(h(`<span class="fx-lock">${esc(lk)}</span>`)); box.append(r); continue; } // Fähigkeit oder Datum fehlt
          const b = h(`<button class="btn small">${was ? 'Erneuern' : u.cost ? 'Kaufen' : 'Buchen'} · ${price}</button>`); b.disabled = !g.canAfford(need);
          b.onclick = () => { if (g.buyUpgrade(fid, u.id)) { this.audio?.cash?.(); this.toast(`${u.name}: ${u.eff}`, 'good'); } else this.toast('Nicht genug Geld.', 'bad'); this.reCompany(); };
          r.append(b);
        }
        box.append(r);
      }
    }
    if (g.knows('lastman') && FACILITY[fid].tier >= 2) { const on = !!f.peak; const r = h(`<div class="fx-row ${on ? 'on' : ''}"><div class="fx-t"><b>Lastmanagement</b><small>Bei Preisspitzen abschalten: Strom ×0,85, läuft 92 % der Zeit</small></div><button class="btn small ${on ? '' : 'primary'}">${on ? 'Ausschalten' : 'Einschalten'}</button></div>`); r.querySelector('button').onclick = () => { g.peakToggle(fid); this.reCompany(); }; box.append(r); }
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
      <p><b>Viktor Kral, MONOLITH Hash AG:</b> „China hat die halbe Branche abgeschaltet. Ich kaufe jetzt. <b>${fmtUSD(usd)}</b> in bar für die Hashwerk GmbH – alle Standorte, alle Maschinen. Sie wären mit Anfang dreißig fertig mit Arbeiten.“</p>
      <p style="color:var(--dim)">Dein aktuelles Vermögen: ${fmtUSD(g.netWorth())}. Deniz schaut dich an und sagt nichts.</p>
      <div class="row" style="justify-content:flex-end"><button class="btn danger" data-a="yes">Verkaufen</button><button class="btn primary" data-a="no">Ablehnen – wir machen weiter</button></div></div>`);
    let answered = false;
    body.querySelector('[data-a=no]').onclick = () => { answered = true; g.declineOffer(usd); this.onModalClose = null; this.closeModal(); this.toast('<b>Deniz:</b> JA! Ich wusste es. Wir holen ihn ein.', 'msg', 7000); };
    body.querySelector('[data-a=yes]').onclick = () => { answered = true; this.onModalClose = null; this.closeModal(); g.sellOut(usd); showFinale(this, 'sold', usd); }; // echtes Ende mit Abspann
    this.openModal(body, 'narrow', 'story');
    this.onModalClose = () => { if (!answered) g.declineOffer(usd); };
  }

  // Finale: mehrseitige Abschluss-Sequenz (src/ui/finale.js)
  ending() { showFinale(this, 'won'); }

  techs() { this.skills(); } // Technik ist in den Fähigkeiten aufgegangen (Taste T)

  ranking(tab = this.logTab || 'rank') {
    this.g.learned?.('ranking');
    this.logTab = tab;
    if (tab !== 'rank') { if (tab === 'ach') { this.achNew = 0; this.dock(); } this.openModal(this.logShell(tab, tab === 'ach' ? this.achPane() : this.chronPane()), 'narrow logbook-card', 'ranking'); return; }
    const g = this.g, s = g.s, day = s.day;
    const net = g.netHash('BTC');
    const mine = g.algoHash('sha256');
    const entries = [
      ['GigaWatt Mining (USA)', toDay('2014-01-01'), 0.006], ['Sibir Energo (RU)', toDay('2016-01-01'), 0.0035], ['TexaHash Inc.', toDay('2019-01-01'), 0.0045],
      ['Nordlicht Hash (IS)', toDay('2014-06-01'), 0.0025], ['Pacific Rigs (CA)', toDay('2017-01-01'), 0.002], ['GPU-Farm „Nachtfalter" (US)', toDay('2010-06-01'), 0.03, toDay('2013-01-01')],
      ['Uni-Cluster Tokio', toDay('2010-09-01'), 0.012, toDay('2014-01-01')], ['Desert Hash (AE)', toDay('2021-06-01'), 0.003], ['Andes Mining (PY)', toDay('2022-01-01'), 0.0018],
    ].filter((e) => day >= e[1] && (!e[3] || day < e[3])).map((e) => ({ name: e[0], h: net * e[2] * (0.85 + 0.3 * Math.abs(Math.sin(e[1] + day / 200))) }));
    const mono = g.monolithHash();
    if (mono) { const top = Math.max(0, ...entries.map((e) => e.h)); if (top > mono * 0.8) for (const e of entries) e.h *= (mono * 0.8) / top; entries.push({ name: 'MONOLITH Hash AG', h: mono, rival: true }); } // der Rivale ist der Größte der Konkurrenz
    entries.push({ name: 'Hashwerk (Du)', h: mine, me: true });
    entries.sort((a, b) => b.h - a.h);
    const rank = entries.findIndex((e) => e.me) + 1;
    const body = h(`<div><h3 class="lb-sub">Rangliste der Bitcoin-Miner</h3><p style="color:var(--dim);margin-top:-2px">Netz-Hashrate: <b style="color:#fff">${fmtHash(net)}</b> · Dein Anteil: <b style="color:#ffb000">${pctDE(mine / net)} %</b> · Platz <b>${rank}</b> von ${entries.length}</p>
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
    this.openModal(this.logShell('rank', body), 'narrow logbook-card', 'ranking');
  }

  // ---------- Logbuch: Reiter Rangliste · Erfolge · Chronik ----------
  logShell(tab, pane) {
    const s = this.g.s, AL = ACHIEVEMENTS.filter((a) => !a.legacy || s.ach?.[a.id]), n = AL.filter((a) => s.ach?.[a.id]).length;
    const box = h('<div class="logbook"><div class="lb-head"><h2>Logbuch</h2><div class="lb-tabs" role="tablist"></div></div></div>');
    const tabs = box.querySelector('.lb-tabs');
    for (const [k, l] of [['rank', 'Rangliste'], ['ach', `Erfolge <small>${n}/${AL.length}</small>`], ['log', 'Chronik']]) {
      const b = h(`<button class="lb-tab ${tab === k ? 'on' : ''}" role="tab" aria-selected="${tab === k}">${l}${k === 'ach' && this.achNew && tab !== 'ach' ? '<i class="lb-dot"></i>' : ''}</button>`);
      b.onclick = () => { if (tab !== k) this.ranking(k); };
      tabs.append(b);
    }
    pane.classList.add('lb-pane'); box.append(pane); return box;
  }
  achPane() {
    const s = this.g.s, got = s.ach || {}, AL = ACHIEVEMENTS.filter((a) => !a.legacy || got[a.id]), n = AL.filter((a) => got[a.id]).length; // legacy: nur alte Spielstände
    const pane = h(`<div class="ach-pane"><div class="ach-sum"><span><b>${n}</b> von ${AL.length} Erfolgen</span><div class="ach-bar"><div style="width:${Math.round((n / AL.length) * 100)}%"></div></div></div><div class="ach-grid"></div></div>`);
    const grid = pane.querySelector('.ach-grid');
    for (const a of AL) {
      const d = got[a.id], secret = a.hidden && !d;
      grid.append(h(`<div class="ach ${d ? 'got' : 'lock'} ${secret ? 'secret' : ''}"><div class="ach-ic">${ACH_SVG[d ? 'got' : secret ? 'secret' : 'lock']}</div><div class="ach-tx"><b>${secret ? '???' : esc(a.name)}</b><span>${secret ? 'Versteckter Erfolg' : esc(a.desc)}</span>${d ? `<em>${fmtDate(d)}</em>` : ''}</div></div>`));
    }
    return pane;
  }
  chronPane() {
    const g = this.g, log = [...(g.s.ev?.log || [])].sort((a, b) => b.d - a.d);
    const pane = h('<div class="chron"></div>');
    if (!log.length) { pane.append(h('<div class="empty">Noch keine Einträge. Deine Entscheidungen und Bonusziele landen hier.</div>')); return pane; }
    let yr = null;
    for (const e of log) {
      const y = g.yearOf(e.d), bonus = String(e.id).startsWith('bonus:');
      if (y !== yr) { yr = y; pane.append(h(`<div class="cr-y"><b>${y}</b><span>${esc(yearTitle(y))}</span></div>`)); }
      const t = String(e.t || '').replace(MONTH_RE, '').replace(/^Bonus:\s*/, '');
      pane.append(h(`<div class="cr-r ${bonus ? 'bonus' : ''}"><span class="cr-d">${fmtDate(e.d)}</span><span class="cr-t">${bonus ? '<em>Bonus</em>' : ''}${esc(t)}</span></div>`));
    }
    return pane;
  }

  // ---------- Bonusziele in der Zielleiste ----------
  // Wartephase (alle Ziele erfüllt, Datum noch nicht erreicht): Begründung + bis zu 2 offene Bonusziele.
  // Sonst nur ein Bonusziel mit Frist (oder im letzten Kapitel, das kein Wartedatum hat).
  goalsBonus(el, ch, wait, saving = false) {
    const g = this.g, s = g.s;
    const open = (ch.bonus || []).filter((b) => !s.bonus?.[b.id] && !(b.until && s.day > toDay(b.until)) && (!b.from || b.from(s)));
    if (saving && s.flags.miningStarted) { for (const b of open.slice(0, 2)) el.append(this.bonusRow(b)); return; } // Sparphase: Zeit für Bonusziele
    if (wait) {
      el.append(h(`<div class="goal wait"><div class="ck"></div><div><div class="gw-t">Weiter ab ${fmtDate(toDay(ch.minDate))}</div>${ch.waitText ? `<div class="gw-x">${esc(ch.waitText)}</div>` : ''}</div></div>`));
      for (const b of open.slice(0, 2)) el.append(this.bonusRow(b));
    } else if (s.flags.miningStarted) { const b = open.find((x) => !x.wait && (x.until || !ch.unlock)); if (b) el.append(this.bonusRow(b)); }
  }
  bonusRow(b) {
    const g = this.g, pr = g.bonusProgress(b), rw = g.rewardText(b.reward);
    let prog = '';
    if (pr) {
      const [cur, tgt, kind] = pr;
      const f = (v) => (kind === 'usd' ? fmtUSD(v) : kind === 'hash' ? fmtHash(v) : kind === 'coin' ? fmtCoin(v) : Math.round(v).toLocaleString('de-DE'));
      if (kind === 'jth') prog = Number.isFinite(cur) ? `<span class="gb-p">jetzt ${Math.round(cur).toLocaleString('de-DE')} J/TH</span>` : ''; // weniger ist besser
      else if (kind === 'fill' && pr[3]) { const ci = this.capInfo(pr[3]); prog = `<span class="gb-p">${this.livePlc(ci)} · ${ci.pw}</span>`; }
      else prog = `<span class="gb-p">${f(Math.max(0, Math.min(cur, tgt)))} / ${f(tgt)}${kind === 'days' ? ' Tage' : b.unit ? ' ' + esc(b.unit) : ''}</span>`;
    }
    return h(`<div class="goal bonus"><div class="ck"></div><div><div class="gb-l"><span class="gb-tag">Bonus</span><span class="gb-x">${esc(b.text)}</span>${prog}</div>${rw || b.until ? `<div class="gb-r">${rw ? `<span class="gb-rw">${esc(rw)}</span>` : ''}${b.until ? `<span class="gb-u">bis ${fmtDate(toDay(b.until))}</span>` : ''}</div>` : ''}</div></div>`);
  }

  // ---------- Jahresrückblick (am 1. Januar, abschaltbar im Pausenmenü) ----------
  initProgress() {
    const g = this.g;
    g.on('year', (y) => { if (this.pref?.year === false) return; (this.yearQ ||= []).push(y); this.tryYear(); });
    g.on('achievement', (id) => { if (ACH[id]) { this.achNew = (this.achNew || 0) + 1; this.dock(); } });
    setInterval(() => { if (this.yearQ?.length) this.tryYear(); }, 1000);
    const snd = $('#ps-sound');
    if (snd && !$('#ps-year')) {
      const b = h('<button id="ps-year" class="ps-t"></button>'); snd.after(b);
      const apply = () => { const on = this.pref?.year !== false; b.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>${on ? '<path d="M9 14.5l2 2 4-4"/>' : '<path d="M10 13l4 4M14 13l-4 4"/>'}</svg><span>Jahresrückblick ${on ? 'an' : 'aus'}</span>`; b.classList.toggle('off', !on); b.setAttribute('aria-pressed', on); b.title = on ? 'Am 1. Januar erscheint ein Rückblick aufs alte Jahr – klicken zum Ausschalten' : 'Kein Jahresrückblick – klicken zum Einschalten'; };
      b.onclick = () => { if (!this.pref) return; this.pref.year = this.pref.year === false; this.savePref?.(); apply(); };
      apply();
    }
  }
  // wie tryEvent: nie über ein anderes Fenster legen, sondern warten
  tryYear() {
    if (!this.yearQ?.length) return;
    if (this.modalKind || this.inspUid || this.w.focus || this.w.empire || this.paused || document.getElementById('lvup') || !$('#splash').classList.contains('hidden') || document.body.classList.contains('show-build')) return;
    const y = this.yearQ.shift();
    if (!this.yearReview(y) && this.yearQ.length) this.tryYear();
  }
  yearReview(y) {
    const g = this.g, s = g.s, Y = s.stats?.y?.[y]; if (!Y || Y.nw1 == null) return false;
    const log = (s.ev?.log || []).filter((e) => g.yearOf(e.d) === y);
    if (!(Y.rev > 0) && !log.length) return false; // z. B. allererstes Jahr ohne Mining: nichts zu erzählen
    const gain = Y.rev - Y.elec - Y.fix, nw = Y.nw0 > 0 ? Y.nw1 / Y.nw0 : 0;
    const nwTxt = !nw || Math.round(Math.abs(nw - 1) * 100) === 0 ? '' : nw >= 2 ? `×${fmtNum(nw, nw >= 10 ? 0 : 1)}` : `${nw >= 1 ? '+' : '−'}${Math.round(Math.abs(nw - 1) * 100)} %`;
    const hs = (v, a) => (v > 0 ? `${fmtHash(v, a)}${a !== 'sha256' ? ` <small>${esc(ALGO_LABEL[a] || a)}</small>` : ''}` : '0');
    const cell = (l, v, cls = '') => `<div class="yr-c"><span>${l}</span><b class="${cls}">${v}</b></div>`;
    const rows = [['Hashrate', `${hs(Y.h0, Y.a0)} → <b>${hs(Y.h1, Y.a1)}</b>`], ['Vermögen', `${fmtUSD(Y.nw0)} → <b>${fmtUSD(Y.nw1)}</b>${nwTxt ? ` <small class="${nw >= 1 ? 'pos' : 'neg'}">${nwTxt}</small>` : ''}`]];
    if (Y.p0 && Y.p1) rows.push(['Bitcoin-Kurs', `${fmtUSD(Y.p0)} → <b>${fmtUSD(Y.p1)}</b>`]);
    if (Y.trips) rows.push(['Sicherung', `${Y.trips}× rausgeflogen`]);
    const dec = this.keyDecision(log), fam = this.familyLine();
    const w0 = s.stats.btc2010 || 0, wi = w0 > 0 && y >= 2011 ? `Die <b>${fmtCoin(w0)} BTC</b> aus deinem ersten Winter wären heute <b>${fmtUSD(w0 * g.price('BTC'))}</b> wert.` : '';
    const partial = Y.d0 > toDay(`${y}-01-01`) + 1;
    const body = h(`<div class="story yr"><div class="ch">Jahresrückblick${partial ? ` · ab ${fmtDate(Y.d0)}` : ''}</div>
      <div class="yr-t"><b>${y}</b><span>${esc(yearTitle(y))}</span></div>
      <div class="yr-grid">${cell('Ertrag', fmtUSD(Y.rev), 'pos')}${cell('Strom', Y.elec > 0 ? '−' + fmtUSD(Y.elec) : 'Pauschale')}${cell(Y.fix < 0 ? 'Feste Einnahmen' : 'Fixkosten', Y.fix > 0 ? '−' + fmtUSD(Y.fix) : Y.fix < 0 ? '+' + fmtUSD(-Y.fix) : '–', Y.fix < 0 ? 'pos' : '')}${cell('Gewinn', `${gain >= 0 ? '+' : ''}${fmtUSD(gain)}`, gain >= 0 ? 'pos' : 'neg')}</div>
      <div class="yr-rows">${rows.map(([l, v]) => `<div class="yr-r"><span>${l}</span><span>${v}</span></div>`).join('')}</div>
      ${dec ? `<div class="yr-p"><span class="yr-k">Wichtigste Entscheidung</span>${esc(dec)}</div>` : ''}
      <div class="yr-p"><span class="yr-k">Familie</span>${esc(fam)}</div>
      ${wi ? `<div class="yr-p"><span class="yr-k">Was wäre wenn</span>${wi}</div>` : ''}
      <div class="row yr-act"><span class="yr-off">Abschalten: Pause · Jahresrückblick</span><button class="btn primary">Auf ins Jahr ${y + 1}</button></div></div>`);
    body.querySelector('button').onclick = () => this.closeModal();
    this.audio?.message?.();
    this.openModal(body, 'narrow yr-card', 'year');
    return true;
  }
  // „Wichtigste Entscheidung“: echte Wahl mit mehreren Antworten vor Zufalls-/Jahresereignissen, bei Gleichstand die spätere
  keyDecision(log) {
    let best = null, bw = -99;
    for (const e of log) {
      if (String(e.id).startsWith('bonus:')) continue;
      const ev = EVENT[e.id], ch = ev?.choices?.[e.i];
      const w = !ev ? -1 : ((ev.choices || []).length > 1 ? 2 : 0) + (ch?.cost ? 1 : 0) - (ev.when?.chance != null || ev.when?.yearly ? 2 : 0);
      if (w >= bw) { bw = w; best = e; }
    }
    return best ? String(best.t || '').replace(MONTH_RE, '') : '';
  }
  familyLine() {
    const s = this.g.s, r = s.rel || {}, away = s.flags.denizLeft && !s.flags.denizReturned;
    const vals = ['papa', 'mama', 'opa', 'deniz'].filter((k) => !(k === 'deniz' && away)).map((k) => [k, r[k] || 0]);
    const tail = away ? ' Deniz arbeitet jetzt bei MONOLITH.' : '';
    if (!vals.some(([, v]) => v)) return `Bei Brandts ist alles beim Alten: Papa ${this.g.s.flags.shopLost && !this.g.s.flags.shopBack ? 'an der Werkbank' : 'im Laden'}, Mama im Garten, Opa am Radio.` + tail;
    const hi = vals.reduce((a, b) => (b[1] > a[1] ? b : a)), lo = vals.reduce((a, b) => (b[1] < a[1] ? b : a));
    let t = hi[1] > 0 ? FAMILY_MOOD[hi[0]][moodTier(hi[1])] : '';
    if (lo[1] < 0 && lo[0] !== hi[0]) t += (t ? ' ' : '') + FAMILY_MOOD[lo[0]][moodTier(lo[1])];
    return (t || FAMILY_MOOD[hi[0]][moodTier(hi[1])]) + tail;
  }

  menu() {
    const g = this.g;
    const body = h(`<div><h2>Menü</h2><div class="row"><button class="btn primary" data-a="save">Speichern</button><button class="btn" data-a="load">Laden</button><button class="btn danger" data-a="new">Neues Spiel</button></div>
      <div class="sec"><h4>Grafik</h4><div class="row">${[['auto', 'Automatisch'], ['high', 'Hoch'], ['medium', 'Mittel'], ['low', 'Niedrig']].map(([k, l]) => `<button class="btn small ${(this.w.gfx?.mode || 'auto') === k ? 'primary' : ''}" data-q="${k}">${l}</button>`).join('')}</div><div style="font-size:12px;color:var(--dim);margin-top:6px">${(this.w.gfx?.mode || 'auto') === 'auto' ? `Gerade: ${({ high: 'Hoch', medium: 'Mittel', low: 'Niedrig' })[this.w.quality]} – ruckelt es, schaltet das Spiel selbst herunter.` : 'Ruckelt es? Stell auf „Niedrig“ oder öffne das Spiel im Browser statt in der App.'}</div>${this.w.glInfo ? `<div style="font-size:12px;color:${this.w.glSoft ? '#ffb36b' : 'var(--dim)'};margin-top:4px">${this.w.glSoft ? '⚠ Grafikkarte wird nicht genutzt – der Browser rechnet die 3D-Grafik auf dem Prozessor. Abhilfe: Spiel im Browser (Chrome, Edge, Firefox) öffnen und dort „Hardwarebeschleunigung verwenden“ einschalten.' : 'Grafikkarte: ' + esc(this.w.glInfo)}</div>` : ''}</div>
      <div class="sec"><h4>Ton</h4><div class="row"><button class="btn small" data-a="mute">${this.audio?.muted ? 'Ton an' : 'Ton aus'}</button></div></div>
      <div class="sec"><div style="font-size:12px;color:var(--dim)">Fan-Projekt · alle Namen fiktiv · keine Anlageberatung<br/>Bitcoin-Kurse und Hashrate: Coin Metrics Community Data (CC BY-NC 4.0)</div></div></div>`);
    body.querySelector('[data-a=save]').onclick = () => { this.toast(g.save() ? 'Gespeichert' : 'Speichern fehlgeschlagen', 'good', 2000); };
    const lb = body.querySelector('[data-a=load]');
    lb.onclick = () => {
      if (!g.hasSave()) { this.toast('Kein Spielstand gefunden', 'bad'); return; }
      if (!lb.dataset.armed) { lb.dataset.armed = '1'; lb.textContent = 'Sicher? Nochmal klicken = laden'; setTimeout(() => { if (lb.isConnected) { delete lb.dataset.armed; lb.textContent = 'Laden'; } }, 4000); return; }
      if (!g.load()) { this.toast('Spielstand konnte nicht geladen werden', 'bad'); return; }
      this.resetSession(); this.closeModal(); this.switchSite(g.s.current); this.w.syncLoose(); this.w.syncParcels?.(); this.speedBar(); this.ticker(); this.keysHint(); this.toast('Spielstand geladen', 'good');
    };
    const nb = body.querySelector('[data-a=new]');
    nb.onclick = () => {
      if (!nb.dataset.armed) { nb.dataset.armed = '1'; nb.textContent = 'Sicher? Nochmal klicken = neu starten'; setTimeout(() => { if (nb.isConnected) { delete nb.dataset.armed; nb.textContent = 'Neues Spiel'; } }, 4000); return; }
      this.newGamePick(nb); // Schwierigkeit wählen, dann neu starten
    };
    body.querySelector('[data-a=mute]').onclick = () => { this.audio?.setMuted(!this.audio.muted); this.menu(); };
    body.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => { this.w.setGfxMode(b.dataset.q); this.menu(); }));
    this.openModal(body, 'narrow', 'menu');
  }

  newGamePick(nb) {
    const g = this.g, row = h('<div class="row diff-row"></div>');
    for (const [id, d] of Object.entries(DIFFICULTY)) { const b = h(`<button class="btn small ${id === 'normal' ? 'primary' : ''}" title="${esc(d.desc)}">${esc(d.name)}</button>`); b.onclick = () => { g.newGame(id); g.startTutor(); this.resetSession(); this.closeModal(); this.switchSite('kinder'); this.w.syncLoose(); this.w.syncParcels?.(); this.speedBar(); this.ticker(); this.dock(); this.keysHint(); this.wakeUp(); }; row.append(b); }
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
    if (a?.status && a.status !== 'ok') line += `<br/><span class="neg">${{ broken: 'Defekt', partial: 'Teilweise defekt', psu: 'Netzteil überlastet', incomplete: 'Unvollständig', noos: 'Kein Betriebssystem', nobit: 'Bitstream fehlt', empty: 'Leer', idle: 'Pausiert (unrentabel)', full: 'Anschluss voll', off: 'Aus' }[a.status] || ''}</span>`;
    if (o.items) line += `<br/>${o.items.length}/${def.slots} belegt`;
    el.innerHTML = `<b>${esc(def.name)}</b><br/>${line}`;
    el.style.left = pos[0] + 'px'; el.style.top = pos[1] + 'px';
  }
  // Erfahrung: kleine Einblendung, beim Stufenaufstieg eine große Karte
  flushXp() { const q = this.xpQ || []; this.xpQ = []; q.forEach(([k, n, lv]) => this.xpPop(k, n, lv)); }
  xpPop(k, n, lv) {
    if (this.installing && k === 'w') { (this.xpQ ||= []).push([k, n, lv]); return; }
    const box = $('#xpbox') || (() => { const b = h('<div id="xpbox"></div>'); document.body.append(b); return b; })();
    const el = h(`<div class="xp"><span class="xi">${potSvg(k, 16)}</span>+${n} ${POTS[k]?.long || 'Erfahrung'}</div>`); box.append(el); setTimeout(() => el.remove(), 2400);
    if (lv) { if (this.w.focus) this.lvQ = ['pt', k]; else setTimeout(() => this.levelUp('pt', k), 900); }
    this.dock();
  }
  // Große Karte: Fähigkeitspunkt frei (pt) oder gelernt (sk) – wartet, solange der Spieler gerade etwas fokussiert
  levelUp(kind, v) { if (kind === 'sk') skillCard(this, v); else pointCard(this, v); }
  skills(sel) { if (!this.g.has('skills') && this.g.s.flags?.tutor) { this.toast('Noch nicht freigeschaltet.', 'info', 1800); return; } skillsMenu(this, sel); }
  // Esc zuerst für das, was gerade offen ist: Mini-Spiel, Installer, Details im Baum (main.js) – true = erledigt
  escLocal() { if (this.mg) { this.mg.cancel(); return true; } if (this.osWiz) return osAbort(this); return skCloseDetail(this); }
  milestone(title, sub, kicker = 'Meilenstein') {
    if (performance.now() < (this.msBusy || 0)) { (this.msQ ||= []).push([title, sub, kicker]); this.msPump(); return; } // nacheinander statt übereinander
    this.msBusy = performance.now() + 3200;
    document.getElementById('milestone')?.remove();
    const el = h(`<div id="milestone"><div class="t1">${esc(kicker.toUpperCase())}</div><div class="t2">${esc(title)}</div><div class="t3">${esc(sub || '')}</div></div>`);
    document.body.append(el); setTimeout(() => el.remove(), 4300);
    this.audio?.fanfare();
    if (this.msQ?.length) this.msPump();
  }
  msPump() { if (this.msT) return; this.msT = setTimeout(() => { this.msT = null; const q = this.msQ?.shift(); if (q) this.milestone(...q); }, Math.max(150, (this.msBusy || 0) - performance.now() + 150)); }
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

  // ---------- Kern-Kreislauf: Belegung, Fertig-PCs, Bausätze, Teile-Lager, Einbau ----------
  roiText(roi) { return Number.isFinite(roi) ? `amortisiert in ${Math.max(1, Math.round(roi)).toLocaleString('de-DE')} Tagen` : 'lohnt sich hier nicht'; }
  monthYear(d) { const [y, m] = d.split('-'); return `${['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][+m - 1]} ${y}`; }
  capInfo(fac) {
    const c = this.g.facCap(fac), mw = c.capW >= 1e6, f = (w) => (mw ? fmtNum(w / 1e6, 1) : fmtNum(w / 1000, c.capW < 1e4 ? 1 : 0));
    return { c, plc: `${c.used}/${c.max}`, pw: `${f(c.watt)}/${f(c.capW)} ${mw ? 'MW' : 'kW'}`, sp: Math.min(100, (c.used / c.max) * 100), pp: Math.min(100, (c.watt / c.capW) * 100) };
  }
  livePlc(ci) { const c = ci.c; return c.live < c.used ? `In Betrieb ${c.live}/${c.max}` : `Platz ${ci.plc}`; } // leere Gehäuse zählen fürs Volle nicht
  goalProg(cur, tgt, kind, fid) {
    if (kind === 'fill' && fid) { const ci = this.capInfo(fid); return `<span class="cnt gfill" title="Für „voll“ zählen nur Plätze mit Geräten, die schürfen können – leere Gehäuse nicht">${this.livePlc(ci)} · ${ci.pw}</span>`; }
    if (kind === 'use') return `<span class="cnt">${Math.round(Math.min(cur, tgt) * 100)} / ${Math.round(tgt * 100)} %</span>`;
    return `<span class="cnt">${Math.round(Math.min(cur, tgt)).toLocaleString('de-DE')} / ${Math.round(tgt).toLocaleString('de-DE')}</span>`;
  }
  // Kopfzeile im Katalog: Plätze und Strom am Standort
  capStrip(fac) {
    const g = this.g, f = FACILITY[fac], ci = this.capInfo(fac), nx = f.power[g.s.fac[fac].power + 1];
    const tmp = g.summary[fac]?.temp ?? 21;
    const el = h(`<div class="bcap"><span class="bc-n">${esc(f.short)}</span><span class="bc-i ${tmp > 35 ? 'full' : ''}" title="${tmp > 35 ? 'Zu warm: Kühlung (Katalog → Kühlung) hält die Geräte auf Tempo' : 'Raumtemperatur'}">${Math.round(tmp)} °C</span><span class="bc-i ${ci.c.used >= ci.c.max ? 'full' : ''}" title="Stellplätze für Rigs, Miner und Regale – Kühlung und Deko brauchen keinen"><em>Platz</em> ${ci.plc}<i><b style="width:${ci.sp}%"></b></i></span><span class="bc-i ${ci.pp >= 90 ? 'full' : ''}" title="Last am Stromanschluss"><em>Strom</em> ${ci.pw}<i><b style="width:${ci.pp}%"></b></i></span>${nx && g.has('company') && ci.pp >= 60 ? '<button class="btn small bc-up">Strom ausbauen</button>' : ''}</div>`);
    const b = el.querySelector('.bc-up'); if (b) b.onclick = () => { this.resume(); this.company(); };
    return el;
  }
  // Rig-Karte: fertig bestückt (Hauptaktion), selbst zusammenstellen, nur Gehäuse
  // Die Karte zeigt immer den VOLL bestückten Rig (bester Ertrag pro Stellplatz) und merkt sich genau diese Zusammenstellung:
  // Klick kauft, was angezeigt wird (Preis/Verfügbarkeit werden geprüft); zu teuer → „Klein anfangen“ mit 1 Karte, später auffüllen
  rigCard(it, fac) {
    const g = this.g, pm = g.parcelMode(), lock = !g.readyOk(it.id), rd = !lock, r = g.readyRig(it.id, fac, Infinity, rd), cp = g.itemPrice(it), full = pm ? !g.orderRoomOk(it) : !g.slotOk(fac, it), isNew = g.s.day - it.releaseDay < 120, price = r ? r.price : cp;
    const cfg = r ? { type: r.type, mobo: r.mobo, cpu: r.cpu, psu: r.psu, gpu: r.gpu, n: r.n } : null;
    const sm = cfg && cfg.n > 1 && r.price > g.s.cash ? g.buildStats({ ...cfg, n: 1 }, fac, rd) : null; // gleiches Netzteil: reicht später für alle Karten
    const per = (x) => `<b class="${x.net >= 0 ? 'pos' : 'neg'}">${x.net >= 0 ? '+' : ''}${fmtUSD(x.net)}/Tag</b>`;
    const spec = r ? `${lock ? 'Bausatz' : 'Fertig'}: ${r.n}× ${esc(PART[r.gpu].name)} · ${fmtWatt(r.watt)}<br/>≈ ${per(r)} pro Stellplatz · ${this.roiText(r.roi)}` : esc(it.desc || '');
    const fd = full ? 'data-full="1"' : '', warn = r && !full ? this.rigWarn(fac, r.watt) : '', cid = g.readyBy(it.id);
    const main = !r ? '' : lock ? `<button class="btn small primary wide rc-kit" data-p="${r.price}" ${fd} ${full || r.price > g.s.cash ? 'disabled' : ''} title="${pm ? 'Gehäuse und Teile kommen morgen im Paket – auspacken, aufstellen, selbst einbauen (Schrauben-EP)' : 'Gehäuse wird aufgestellt, die Teile liegen im Lager – selbst einbauen (Schrauben-EP)'}">${pm ? 'Bausatz bestellen' : 'Als Bausatz'} · ${this.money(r.price)}</button>` : `<button class="btn small primary wide rc-ready" data-p="${r.price}" ${fd} ${full || r.price > g.s.cash ? 'disabled' : ''} title="${cid ? `Fertig montiert von ${esc(CONTACT[cid].name)} · ${Math.round(g.buildFee(it.id) * 100)} % Montage` : 'Fertig montiert'}">${pm ? 'Fertig bestellen' : 'Fertig bestückt'} · ${this.money(r.price)}</button>`;
    const small = sm && !full ? `<button class="btn small wide rc-small" data-p="${sm.price}" ${sm.price > g.s.cash ? 'disabled' : ''} title="1 Karte jetzt, die anderen ${cfg.n - 1} später auffüllen – das Netzteil reicht für alle ${cfg.n} · ≈ ${fmtUSD(sm.net)}/Tag pro Stellplatz">Klein anfangen: 1 Karte · ${this.money(sm.price)}</button>` : '';
    const minP = sm && !full ? Math.min(price, sm.price) : price; // Karte nur abblenden, wenn auch der kleine Einstieg zu teuer ist
    const card = h(`<div class="item rigc ${full || minP > g.s.cash ? 'dis' : ''}" data-rig="1" data-price="${minP}" data-fp="${price}" data-id="${it.id}" ${fd}><div class="t"><span>${esc(it.name)}${isNew ? '<span class="new">NEU</span>' : ''}</span><span class="p">${this.money(price)}</span></div><div class="s">${spec}<br/><span class="rc-dim">bis ${it.maxGpu} Grafikkarten${full ? '' : ` · Platz ${g.slotsUsed(fac)}/${g.slotsMax(fac)}`}</span>${warn ? `<br/><b class="rc-warn">${warn}</b>` : ''}</div>${lock && cid ? this.lockLine(cid) : ''}<div class="miss">${full ? (pm && g.pendingSlots() ? 'Kein Platz mehr – Bestelltes belegt die letzten Plätze' : 'Kein Platz mehr – Zeit für einen größeren Standort') : this.missText(price)}</div>${main}${small}<div class="rc-row"><button class="btn small rc-cfg" data-p="0" ${fd} ${full ? 'disabled' : ''} title="Teile selbst wählen${lock ? '' : ': als Bausatz oder fertig montiert'}">Selbst bauen</button><button class="btn small rc-case" data-p="${cp}" ${fd} ${full || cp > g.s.cash ? 'disabled' : ''} title="Leeres Gehäuse – Teile einzeln einbauen">Gehäuse · ${this.money(cp)}</button></div></div>`);
    try { const url = this.w.thumbnail(it.id); if (url) card.prepend(h(`<div class="thumb"><img alt="" src="${url}"/></div>`)); } catch (e) { /* ohne Vorschau weiter */ }
    const go = (fn) => (e) => { e?.stopPropagation(); if (g.parcelMode() ? !g.orderRoomOk(it) : !g.slotOk(fac, it)) { this.toast(g.parcelMode() ? `${esc(g.orderWhy(it))}.` : 'Kein Platz mehr – Zeit für einen größeren Standort.', 'bad'); return; } fn(); };
    // gekauft wird genau die gezeigte Zusammenstellung; hat sich der Preis spürbar geändert oder ist ein Teil ausgelaufen: Katalog neu
    const buy = (c, ready, shown) => go(() => {
      const blk = g.buildBlocked(c), now = blk ? 0 : g.buildStats(c, fac, ready).price;
      if (blk || Math.abs(now - shown) > Math.max(2, shown * 0.02)) { this.toast(blk ? `${esc(blk)} gibt es nicht mehr zu kaufen – Katalog aktualisiert.` : `Neuer Preis: ${this.money(now)} statt ${this.money(shown)}. Katalog aktualisiert.`, 'info', 4500); this.build(true); return; }
      this.startBuild(c, ready);
    });
    const ready = cfg ? buy(cfg, true, r.price) : null, kit = cfg ? buy(cfg, false, r.price) : null;
    const caseOnly = go(() => { if (g.itemPrice(it) > g.s.cash) { this.toast('Nicht genug Geld.', 'bad'); return; } if (g.parcelMode()) { this.orderItem(it); return; } this.resume(); this.w.startPlacement(it.id); });
    card.querySelector('.rc-ready')?.addEventListener('click', ready);
    card.querySelector('.rc-kit')?.addEventListener('click', kit);
    card.querySelector('.rc-small')?.addEventListener('click', buy({ ...cfg, n: 1 }, rd, sm?.price || 0));
    card.querySelector('.rc-case').onclick = caseOnly;
    card.querySelector('.rc-cfg').onclick = go(() => this.configurator(it.id));
    this.lockWire(card);
    card.onclick = r ? (lock ? kit : ready) : caseOnly;
    return card;
  }
  // Katalog: offene Bausätze am Standort in einem Rutsch fertig schrauben
  kitsBar(fac) {
    const g = this.g, k = g.kitsOpen(fac); if (!k.length) return null; const n = k.reduce((a, o) => a + g.kitPlan(o).length, 0);
    const el = h(`<div class="kitbar"><div class="kb-t">${partSvg('mobo', 18)}<b>${k.length} ${k.length === 1 ? 'Bausatz wartet' : 'Bausätze warten'}</b> aufs Einbauen · ${n} Teile im Lager</div><button class="btn small primary">${k.length === 1 ? 'Fertig schrauben' : 'Alle fertig schrauben'}</button></div>`);
    el.querySelector('button').onclick = (e) => { e.stopPropagation(); this.assembleAllUI(fac); };
    return el;
  }
  // Gesperrt: wer liefert fertig montiert, und wie lernt man ihn kennen? (abgelehnt: gleich anrufen)
  lockText(cid) {
    const g = this.g, c = CONTACT[cid], st = g.contactState(cid);
    if (st?.met) return { short: `Fertig bestückt liefert dir ${esc(c.name)}, sobald du ihn anrufst.`, long: `${c.name} (${c.biz}): ${c.offer}. Auch im Handy (H) unter Kontakte.`, call: true };
    return { short: esc(c.soon), long: c.meet(g.s, g, fmtDate), call: false };
  }
  lockLine(cid) {
    const t = this.lockText(cid);
    return `<div class="rc-lock" title="${esc(t.long)}">${LOCK_SVG}<span>${t.short}</span>${t.call ? `<button class="btn small rc-call" data-c="${cid}">${esc(CONTACT[cid].name)} anrufen</button>` : ''}</div>`;
  }
  lockWire(el) { el.querySelectorAll('.rc-call').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); this.callContact(b.dataset.c); }; }); }
  // Inspektor oben: Serien-Einbau – diesen Bausatz komplett aus dem Lager, alle am Standort, oder weiter zum nächsten offenen Bausatz
  kitSec(o) {
    const g = this.g, uid = o.uid, fac = g.facOf(uid), fb = g.kitPlan(o), kits = g.kitsOpen(fac), others = kits.filter((x) => x.uid !== uid), box = h('<div class="sec kit-sec"></div>');
    if (fb.length >= 2 || (o.kit && fb.length)) {
      const b = h(`<button class="btn primary wide">Alles aus dem Lager einbauen (${fb.length} ${fb.length === 1 ? 'Teil' : 'Teile'})</button>`);
      b.onclick = () => { const last = PART[fb[fb.length - 1]]?.type, n = g.assembleKit(uid); this.rbOpen = null; this.inspect(uid); if (n) { this.w.animateInstall?.(uid, last); this.audio?.install?.(); const left = g.kitsOpen(fac).length; this.toast(`${n} ${n === 1 ? 'Teil' : 'Teile'} eingebaut${left ? ` · noch ${left} ${left === 1 ? 'Bausatz' : 'Bausätze'} hier` : ''}`, 'good', 3000); } };
      box.append(b);
    } else if (others.length) { const nx = others[0], b = h(`<button class="btn primary wide">Nächster Bausatz (${others.length} offen) →</button>`); b.onclick = () => { this.rbOpen = null; this.openInspector(nx.uid); }; box.append(b); }
    if (kits.length >= 2) { const b = h(`<button class="btn small wide kit-all" title="Jeder Bausatz bekommt seine eigenen Teile aus dem Lager">Alle Bausätze hier fertig schrauben (${kits.length})</button>`); b.onclick = () => this.assembleAllUI(fac, uid); box.append(b); }
    return box.childElementCount ? box : null;
  }
  // Alle offenen Bausätze am Standort einbauen (Inspektor, Katalog)
  assembleAllUI(fac = this.g.s.current, uid = null) {
    const r = this.g.assembleAll(fac); if (!r.parts) { this.toast('Für die Bausätze liegen keine passenden Teile im Lager.', 'info', 3500); return; }
    this.audio?.install?.(); this.toast(`${r.kits} ${r.kits === 1 ? 'Bausatz' : 'Bausätze'} fertig geschraubt · ${r.parts} Teile eingebaut`, 'good', 4000);
    if (uid && this.inspUid === uid) this.inspect(uid); this.build(true); this.pauseHint(fac);
  }
  callContact(id) { if (!this.g.callContact(id)) return; this.audio?.message?.(); this.toast(`<b>${esc(CONTACT[id].name)}:</b> ${esc(CONTACT[id].lines.call)}`, 'msg', 6000); this.refresh(); }
  // Passt noch einer rein, ohne dass es zu heiß wird oder der Anschluss nicht reicht?
  rigWarn(fac, watt) {
    const sm = this.g.summary?.[fac]; if (!sm || sm.tripped || !watt) return '';
    const rent = this.g.rentStart?.(fac) || 0; // erstes Gerät an einem Miet-Standort: der Mietvertrag startet (sonst ruht er)
    return sm.watt + watt > sm.capKw * 1000 ? 'Anschluss reicht nicht – erst Strom ausbauen' : sm.temp + (12 * watt) / Math.max(1, sm.cool) > 38 ? 'Wird hier zu heiß – erst Kühlung aufstellen' : rent > 0 ? `Startet die Miete: −${fmtUSD(rent)}/Tag` : '';
  }
  lastBuildCard(fac) {
    const g = this.g, lb = g.s.lastBuild; if (!lb || g.buildBlocked(lb) || !g.placeableAllowed(PLACEABLE[lb.type], fac)) return null;
    const lock = lb.ready && !g.readyOk(lb.type), ready = lb.ready && !lock; // fertig montiert gesperrt (z. B. alter Stand): als Bausatz wiederholen
    const pm = g.parcelMode(), st = g.buildStats(lb, fac, ready), full = pm ? !g.orderRoomOk(PLACEABLE[lb.type]) : !g.slotOk(fac, PLACEABLE[lb.type]), fd = full ? 'data-full="1"' : '';
    const card = h(`<div class="item rigc lastb ${full || st.price > g.s.cash ? 'dis' : ''}" data-rig="1" data-price="${st.price}" ${fd}><div class="t"><span>Wie zuletzt</span><span class="p">${this.money(st.price)}</span></div><div class="s">${esc(PLACEABLE[lb.type].name)} · ${st.n}× ${esc(PART[lb.gpu]?.name || 'ohne Grafikkarte')}<br/>${ready ? `fertig montiert${g.readyBy(lb.type) ? ` von ${esc(CONTACT[g.readyBy(lb.type)].name)}` : ''}` : 'als Bausatz zum Selbsteinbauen'}<br/>≈ <b class="${st.net >= 0 ? 'pos' : 'neg'}">${st.net >= 0 ? '+' : ''}${fmtUSD(st.net)}/Tag</b> · ${this.roiText(st.roi)}${!full && st.ok ? ((w) => (w ? `<br/><b class="rc-warn">${w}</b>` : ''))(this.rigWarn(fac, st.watt)) : ''}</div>${lock ? this.lockLine(g.readyBy(lb.type)) : ''}<div class="miss">${full ? 'Kein Platz mehr – Zeit für einen größeren Standort' : ''}</div><button class="btn small primary wide lb-again" data-p="${st.price}" ${fd} ${full || st.price > g.s.cash ? 'disabled' : ''}>${lock ? (pm ? 'Nochmal als Bausatz bestellen' : 'Nochmal als Bausatz') : pm ? 'Nochmal bestellen' : 'Nochmal bauen'} · ${this.money(st.price)}</button><div class="rc-row"><button class="btn small lb-edit" data-p="0" ${fd}>Ändern</button></div></div>`);
    const again = card.querySelector('.lb-again'), edit = card.querySelector('.lb-edit');
    again.onclick = (e) => { e.stopPropagation(); this.startBuild(lb, ready); };
    edit.onclick = (e) => { e.stopPropagation(); this.configurator(lb.type, lb); };
    this.lockWire(card);
    card.onclick = () => this.startBuild(lb, ready);
    return card;
  }
  // Build kaufen und hinstellen (mehrere hintereinander: Platzier-Modus bleibt an)
  startBuild(cfg, ready) {
    const g = this.g, fac = g.s.current, st = g.buildStats(cfg, fac, ready), blk = g.buildBlocked(cfg);
    if (blk) { this.toast(`${esc(blk)} gibt es nicht mehr zu kaufen.`, 'bad'); return; }
    if (ready && !g.readyOk(cfg.type)) { this.toast(`${this.lockText(g.readyBy(cfg.type)).short} Als Bausatz geht’s sofort.`, 'info', 5000); return; }
    if (!st.ok) { this.toast(esc(st.why), 'bad'); return; }
    const pm = g.parcelMode();
    if (pm ? !g.orderRoomOk(PLACEABLE[cfg.type]) : !g.slotOk(fac, PLACEABLE[cfg.type])) { this.toast(pm ? `${esc(g.orderWhy(PLACEABLE[cfg.type]) || 'Kein Platz mehr')}.` : 'Kein Platz mehr – Zeit für einen größeren Standort.', 'bad'); return; }
    if (st.price > g.s.cash) { this.toast(`${this.missText(st.price)}.`, 'bad'); return; }
    if (pm) { // Paket-Modus: bestellen statt hinstellen – morgen früh vor der Tür, dann „Ausgepackt“ → Aufstellen
      if (!g.orderBuild(cfg, fac, ready)) { this.toast('Bestellen ging nicht.', 'bad'); return; }
      if (this.modalKind === 'config') this.closeModal();
      this.ordered(`${cfg.type === 'tower' ? (ready ? 'Mining-PC' : 'PC-Bausatz') : PLACEABLE[cfg.type].name}${ready ? (cfg.type === 'tower' ? '' : ' (fertig bestückt)') : cfg.type === 'tower' ? '' : ' als Bausatz'}${st.n ? ` mit ${st.n}× ${PART[cfg.gpu]?.name || 'Karte'}` : ''}`, ready ? '' : ' Die Teile kommen mit ins Paket.');
      if (document.body.classList.contains('show-build')) this.build(true); return;
    }
    this.resume();
    this.w.startPlacement(cfg.type, null, { type: cfg.type, rot: 0, coin: 'auto', parts: ready ? st.parts : { mobo: null, cpu: null, psu: null, gpus: [] }, build: { type: cfg.type, mobo: cfg.mobo, cpu: cfg.cpu, psu: cfg.psu, gpu: cfg.gpu, n: st.n }, ready });
  }
  // Nach dem Setzen: pausieren Geräte, weil es zu heiß ist oder der Anschluss voll? Dann sagen, was hilft.
  pauseHint(fac) {
    const g = this.g, sm = g.summary?.[fac]; if (!sm || sm.tripped || !g.s.flags?.miningStarted) return;
    // Kühlung nur bei echter Hitze vorschlagen (limit 'heat'); Ereignis-Drosselung und kaum rentable Geräte sind kein Kühlproblem
    let heat = 0, full = 0, loss = 0; for (const a of sm.per.values()) { if (a.status === 'idle' && a.limit === 'heat') heat++; else if (a.status === 'full') full++; else if (a.status === 'idle' && a.limit === 'loss') loss++; }
    if (!heat && !full && !loss) { this.pauseKey = null; return; }
    const key = `${fac}:${heat}:${full}:${loss}`; if (this.pauseKey === key) return; this.pauseKey = key;
    const n = (k) => `${k} ${k === 1 ? 'Gerät pausiert' : 'Geräte pausieren'}`;
    this.pauseToast?.remove();
    if (full) this.pauseToast = this.toast(`Anschluss voll: ${n(full)}. Mehr Strom: <kbd>B</kbd> Shop → oben „Strom ausbauen“.`, 'info', 7000);
    else if (!heat) this.pauseToast = this.toast(`Kaum rentabel: ${n(loss)} – der Strom frisst fast den ganzen Ertrag. Kühlung hilft da nicht.`, 'info', 7000);
    else { const fan = g.shopList('cool', fac).sort((x, y) => g.itemPrice(x) - g.itemPrice(y))[0]; this.pauseToast = this.toast(`Zu heiß hier: ${n(heat)}. Stell Kühlung auf: <kbd>B</kbd> Shop → Kühlung${fan ? ` (${esc(fan.name)} ab ${this.money(g.itemPrice(fan))})` : ''}.`, 'info', 7000); }
  }
  // Nach dem Setzen: gleich noch einen? (Rigs, Miner, Regale – solange Geld, Platz und Kontingent reichen)
  placedAgain(o, p) {
    const g = this.g, d = PLACEABLE[o.type], fac = g.facOf(o.uid) || g.s.current, t = p?.template, n = (this.placedRun = (this.placedRun || 0) + 1);
    const empty = (d.kind === 'rig' && !g.pcReady(o)) || (d.kind === 'holder' && !o.items?.length), src = t?.kit ? t.src : t;
    if (t?.stock) { // aus dem Bestand „Ausgepackt“: gleich das nächste gleiche Stück, solange eins da ist und Platz bleibt
      const left = g.stockGroups().find((x) => x.key === t.stock)?.n || 0;
      if (left && g.slotOk(fac, d)) { this.hint(`${n} aufgestellt · Klick = noch eins (${left} übrig) · R = drehen · Rechtsklick = fertig`); return true; }
      if (empty) this.toast(o.kit ? 'Bausatz steht. Die Teile liegen im Lager – anschauen und <kbd>E</kbd>: einbauen.' : 'Steht. Anschauen und <kbd>E</kbd>: bestücken.', 'good', 5000);
      if (left) this.toast(`Hier ist kein Platz mehr – ${left === 1 ? 'das letzte Stück' : `die übrigen ${left}`} stellst du woanders auf.`, 'info', 5000);
      return false;
    }
    const tipE = () => { if (empty) this.toast((t?.build && !t.ready) || t?.kit ? `Bausatz steht. Teile liegen im Lager – anschauen und <kbd>E</kbd>: einbauen${n > 1 ? ' (oder <kbd>B</kbd> → „Alle fertig schrauben“)' : ''}` : 'Anschauen und <kbd>E</kbd>: bestücken', 'good', 5000); };
    if (!g.slotKind(d)) { tipE(); return false; }
    const cost = t?.build ? g.buildStats(t.build, fac, t.ready).price : src ? g.cloneCost(src, !!t.kit) : g.itemPrice(d);
    const why = !g.slotOk(fac, d) ? 'full' : !g.canAfford(cost) ? 'money' : (t?.build ? g.buildBlocked(t.build) : src ? g.cloneBlocked(src) || !g.cloneStockOk(src) : g.stockLeft(d) < 1) ? 'stock' : '';
    if (!why) { this.hint(`${n} gesetzt · Klick = noch einer (${this.money(cost)}) · R = drehen · Rechtsklick = fertig`); return true; }
    tipE();
    if (why === 'full') this.toast(`${n > 1 ? `${n} Stück gesetzt. ` : ''}Kein Platz mehr – Zeit für einen größeren Standort.`, 'info', 5000);
    else if (why === 'money' && n > 1) this.toast(`${n} Stück gesetzt – für den nächsten fehlen ${this.money(cost - g.s.cash)}.`, 'info', 4000);
    return false;
  }
  // Konfigurator: Gehäuse, Mainboard, CPU, Grafikkarten, Netzteil – live Hashrate, Watt, Ertrag, Amortisation
  configurator(type, cfg0 = null) {
    const g = this.g, fac = g.s.current;
    const base = cfg0 || g.readyRig(type, fac, Infinity, false) || { type };
    const cfg = { type: base.type || type, mobo: base.mobo, cpu: base.cpu, psu: base.psu, gpu: base.gpu, n: base.n ?? 1 };
    const body = h(`<div class="cfgr"><h2>PC zusammenstellen</h2><p class="cf-x"></p><div class="cf-grid"></div><div class="cf-sum"></div><div class="cf-go"></div></div>`);
    const grid = body.querySelector('.cf-grid'), sum = body.querySelector('.cf-sum'), goEl = body.querySelector('.cf-go'), el = g.elecPrice(fac), cfx = body.querySelector('.cf-x');
    const val = (it) => { const c = g.bestCoin(it.hash, it.vram); const r = c ? g.revenueFor(it.hash, c, it.vram) : 0; return r - (it.watt / 1000) * 24 * el; };
    const render = () => {
      grid.innerHTML = ''; goEl.innerHTML = '';
      const cid = g.readyBy(cfg.type), lock = !g.readyOk(cfg.type), fee = Math.round(g.buildFee(cfg.type) * 100);
      cfx.innerHTML = `${g.parcelMode() ? 'Bestellt wird heute, geliefert morgen früh vor deine Wohnungstür. ' : ''}Als <b>Bausatz</b> kommen die Teile ins Lager und du baust sie selbst ein (günstiger, Schrauben-EP). ${lock ? (cid ? this.lockText(cid).short : '') : `<b>Fertig montiert</b> läuft er sofort (+${fee}&nbsp;% Montage${cid ? ` bei ${esc(CONTACT[cid].name)}` : ''}).`}`;
      const rigs = PLACEABLES.filter((x) => x.kind === 'rig' && g.available(x) && g.placeableAllowed(x, fac));
      const np = g.psuCount({ type: cfg.type });
      const sel = (lab, list, cur, txt, key, num = false) => { const r = h(`<label class="cf-r"><span>${lab}</span><select>${list.map((it) => `<option value="${it.id}" ${String(it.id) === String(cur) ? 'selected' : ''}>${esc(txt(it))}</option>`).join('')}</select></label>`); r.querySelector('select').onchange = (e) => { cfg[key] = num ? +e.target.value : e.target.value; if (key === 'type' || key === 'mobo') cfg.n = Math.max(cfg.n, 1); render(); }; grid.append(r); return r; };
      sel('Gehäuse', rigs, cfg.type, (it) => `${it.name} · ${this.money(g.itemPrice(it))}`, 'type');
      sel('Mainboard', g.partList('mobo'), cfg.mobo, (it) => `${it.name} · ${Math.min(it.slots, PLACEABLE[cfg.type].maxGpu)} Plätze · ${this.money(g.itemPrice(it))}`, 'mobo');
      sel('Prozessor', [...g.partList('cpu')].sort((a, b) => g.itemPrice(a) - g.itemPrice(b)), cfg.cpu, (it) => `${it.name} · ${it.watt} W · ${this.money(g.itemPrice(it))}`, 'cpu');
      const gl = [...g.partList('gpu')].sort((a, b) => val(b) / g.itemPrice(b) - val(a) / g.itemPrice(a));
      if (!gl.some((x) => x.id === cfg.gpu)) cfg.gpu = gl[0]?.id;
      sel('Grafikkarte', gl, cfg.gpu, (it) => `${it.name} · ${it.watt} W · ${val(it) >= 0 ? '+' : ''}${fmtUSD(val(it))}/Tag · ${this.money(g.itemPrice(it))}`, 'gpu');
      const cap = g.buildCap(cfg); cfg.n = Math.min(cfg.n, cap);
      sel('Anzahl', Array.from({ length: cap + 1 }, (_, i) => ({ id: i })), cfg.n, (it) => `${it.id} ${it.id === 1 ? 'Grafikkarte' : 'Grafikkarten'}`, 'n', true);
      const w0 = 25 + [cfg.mobo, cfg.cpu].filter(Boolean).reduce((a, id) => a + (PART[id].watt || 0), 0) + (cfg.gpu ? PART[cfg.gpu].watt * cfg.n : 0);
      const psl = [...g.partList('psu')].sort((a, b) => a.cap - b.cap);
      const ps = sel(np > 1 ? 'Netzteile (2 Stück)' : 'Netzteil', psl, cfg.psu, (it) => `${it.name}${np > 1 ? ' ×2' : ''}${it.cap * np < w0 ? ' – zu schwach' : ''} · ${this.money(g.itemPrice(it) * np)}`, 'psu');
      const fit = psl.find((x) => x.cap * np >= w0);
      if (fit && fit.id !== cfg.psu) { const b = h(`<button class="btn small cf-fit">Passendes nehmen</button>`); b.onclick = (e) => { e.preventDefault(); cfg.psu = fit.id; render(); }; ps.append(b); }
      const kit = g.buildStats(cfg, fac, false), rd = g.buildStats(cfg, fac, true), algo = kit.coin ? g.coinAlgo(kit.coin) : null;
      sum.innerHTML = `<div class="kv"><div class="k">Rechenleistung</div><div class="v">${algo ? `${fmtHash(kit.hash[algo] || 0, algo)} → ${COIN[kit.coin].name}` : '–'}</div><div class="k">Verbrauch</div><div class="v ${kit.cap && kit.watt > kit.cap ? 'neg' : ''}">${fmtWatt(kit.watt)} von ${fmtWatt(kit.cap)}</div><div class="k">Ertrag / Tag</div><div class="v pos">${fmtUSD(kit.rev)}</div><div class="k">Strom / Tag</div><div class="v neg">−${fmtUSD(kit.rev - kit.net)}</div><div class="k">Gewinn / Tag</div><div class="v"><b class="${kit.net >= 0 ? 'pos' : 'neg'}">${fmtUSD(kit.net)}</b></div><div class="k">Amortisation</div><div class="v">${Number.isFinite(rd.roi) ? `${Math.round(kit.roi)} Tage (Bausatz) · ${Math.round(rd.roi)} Tage (montiert)` : 'lohnt sich hier nicht'}</div></div>${kit.why ? `<div class="cf-why">${esc(kit.why)}</div>` : ''}`;
      const pm = g.parcelMode(), full = pm ? !g.orderRoomOk(PLACEABLE[cfg.type]) : !g.slotOk(fac, PLACEABLE[cfg.type]);
      const lt = lock && cid ? this.lockText(cid) : null; // gesperrt: statt „Fertig montiert“ der Weg dorthin (abgelehnt: gleich anrufen)
      const bk = h(`<button class="btn big ${lock ? 'primary' : ''}" ${full || !kit.ok || kit.price > g.s.cash ? 'disabled' : ''} title="Gehäuse wird aufgestellt, die Teile liegen im Lager – selbst einbauen">${pm ? 'Bausatz bestellen' : 'Bausatz'} · ${this.money(kit.price)}</button>`);
      const br = lt?.call ? h(`<button class="btn big cf-call" title="${esc(lt.long)} Danach geht’s fertig montiert.">${esc(CONTACT[cid].name)} anrufen</button>`) : h(`<button class="btn big ${lock ? 'locked' : 'primary'}" ${full || lock || !rd.ok || rd.price > g.s.cash ? 'disabled' : ''} title="${lt ? esc(lt.long) : 'Läuft sofort'}">${lock ? `${LOCK_SVG}Fertig montiert · bald` : `${pm ? 'Fertig bestellen' : 'Fertig montiert'} · ${this.money(rd.price)}`}</button>`);
      bk.onclick = () => this.startBuild(cfg, false); br.onclick = () => { if (lt?.call) { this.callContact(cid); this.configurator(cfg.type, cfg); return; } this.startBuild(cfg, true); };
      goEl.append(bk, br);
      if (full) goEl.append(h(`<div class="cf-why">${pm && g.pendingSlots() ? 'Kein Platz mehr – Bestelltes belegt die letzten Plätze.' : 'Kein Platz mehr – Zeit für einen größeren Standort.'}</div>`));
      else if (kit.price > g.s.cash) goEl.append(h(`<div class="cf-why">${this.missText(kit.price)}.</div>`));
    };
    render();
    document.body.classList.remove('show-build'); // Katalog zu, sonst liegt er über dem Fenster
    this.openModal(body, 'narrow cfg', 'config');
  }
  // Katalog „Teile“: Lager + Handel (Grafikkarten, Prozessoren, Mainboards, Netzteile)
  partsView(list) {
    const g = this.g, fac = g.s.current, T = this.partTab || 'gpu', el = g.elecPrice(fac);
    const NAMES = { gpu: 'Grafikkarten', cpu: 'Prozessoren', mobo: 'Mainboards', psu: 'Netzteile' };
    const tabs = h(`<div class="pv-tabs">${['gpu', 'cpu', 'mobo', 'psu'].map((t) => `<button class="btn small ${t === T ? 'on' : ''}" data-t="${t}">${partSvg(t, 16)}${NAMES[t]}</button>`).join('')}</div>`);
    tabs.querySelectorAll('button').forEach((b) => { b.onclick = () => { this.partTab = b.dataset.t; this.build(true); }; });
    list.append(tabs);
    const pm = g.parcelMode(), pend = g.pendingParts(), pn = Object.values(pend).reduce((a, n) => a + n, 0);
    const bag = g.bagList(), bc = g.bagCount(), bx = h(`<div class="pv-bag"><div class="pv-h">Dein Lager${bag.length ? ` · ${bc} ${bc === 1 ? 'Teil' : 'Teile'} · Restwert ${this.money(g.bagValue())}` : ''}${pn ? ` · ${pn} unterwegs oder vor der Tür` : ''}</div></div>`);
    if (!bag.length) bx.append(h(`<div class="pv-e">Leer. ${pm ? 'Bestellte Teile landen hier, sobald du das Paket aufhebst.' : 'Gekaufte und ausgebaute Teile landen hier.'} Einbauen: PC anschauen und <kbd>E</kbd>.</div>`));
    for (const b of bag) { const c = h(`<span class="pv-chip">${partSvg(b.part.type, 14)}<b>${b.n}×</b> ${esc(b.part.name)}<button class="btn small" title="Ein Stück verkaufen">+${this.money(g.partResale(b.id))}</button></span>`); c.querySelector('button').onclick = (e) => { e.stopPropagation(); g.sellPart(b.id, 1); this.audio?.cash?.(); }; bx.append(c); }
    list.append(bx); const kb = this.kitsBar(fac); if (kb) list.append(kb);
    const val = (it) => { const c = g.bestCoin(it.hash, it.vram); const r = c ? g.revenueFor(it.hash, c, it.vram) : 0; return { c, r, net: r - (it.watt / 1000) * 24 * el }; };
    let parts = g.partList(T); if (T === 'gpu') parts = [...parts].sort((a, b) => val(b).net / g.itemPrice(b) - val(a).net / g.itemPrice(a)); if (T === 'psu') parts = [...parts].sort((a, b) => a.cap - b.cap);
    const bestId = T === 'gpu' ? parts[0]?.id : null;
    for (const it of parts) {
      const price = g.itemPrice(it), n = g.bagN(it.id), isNew = g.s.day - it.releaseDay < 120;
      let spec = '';
      let psuNeed = 0; // passt die Karte in keinen PC mit freiem Platz, weil das Netzteil zu schwach ist? Dann gleich beim Kauf sagen
      if (T === 'gpu') { const v = val(it); const rigs = g.facObjects(fac).filter((o2) => o2.parts?.mobo && o2.parts.psu && PLACEABLE[o2.type]?.kind === 'rig' && o2.parts.gpus.length < g.rigGpuCap(o2)); if (rigs.length && rigs.every((o2) => g.psuWhy(o2, it.id))) psuNeed = Math.min(...rigs.map((o2) => g.wattAfter(o2, it.id)));
        spec = `${it.watt} W · ${it.vram} GB${v.c ? ` · ${fmtHash(it.hash[g.coinAlgo(v.c)] || 0, g.coinAlgo(v.c))}` : ''}<br/>allein ≈ <b class="${v.net >= 0 ? 'pos' : 'neg'}">${v.net >= 0 ? '+' : ''}${fmtUSD(v.net)}/Tag</b>${v.c ? ` mit ${COIN[v.c].name}` : ''}${psuNeed ? `<br/><b class="neg">Dein Netzteil reicht dafür nicht – du brauchst eins ab ${psuNeed} W</b>` : ''}`; }
      if (T === 'cpu') spec = `${it.watt} W · reicht als Steuerzentrale${it.hash.sha256 ? ` · schürft mit (${fmtHash(it.hash.sha256, 'sha256')})` : ''}`;
      if (T === 'mobo') spec = `${it.slots} Grafikkarten-Plätze · ${it.watt} W`;
      if (T === 'psu') spec = `${it.cap} W Leistung${it.cap >= 1600 ? ' · für große Rahmen (8er/12er brauchen zwei)' : ''}`;
      const card = h(`<div class="item part" data-price="${price}"><div class="t"><span>${esc(it.name)}${isNew ? '<span class="new">NEU</span>' : ''}</span><span class="p">${this.money(price)}</span></div><div class="s">${it.id === bestId ? '<b class="pv-best">Bester Wert für dein Geld</b><br/>' : ''}${spec}${n ? `<br/><b class="pv-n">Im Lager: ${n}</b>` : ''}${pend[it.id] ? `<br/><b class="pv-n">Unterwegs: ${pend[it.id]}</b>` : ''}</div><div class="miss"></div><div class="rc-row"><button class="btn small primary place" data-p="${price}">${pm ? 'Bestellen' : 'Kaufen'} · ${this.money(price)}</button>${T === 'gpu' || T === 'psu' ? `<button class="btn small" data-p="${price * 2}">2×</button>` : ''}</div></div>`);
      const [b1, b2] = card.querySelectorAll('button');
      const buy = (k) => (e) => { e.stopPropagation(); if (g.parcelMode()) { const got = g.orderPart(it.id, k); if (!got) { this.toast('Nicht genug Geld.', 'bad'); return; } this.ordered(`${got}× ${it.name}`, psuNeed ? ` Achtung: Dein Netzteil reicht dafür nicht – bestell eins ab ${psuNeed} W mit (Reiter Netzteile).` : ' Paket aufheben, dann PC anschauen und <kbd>E</kbd>: einbauen.'); return; } const got = g.buyPart(it.id, k); if (!got) { this.toast('Nicht genug Geld.', 'bad'); return; } this.audio?.buy?.(); this.toast(`${got}× ${esc(it.name)} im Lager – einbauen: PC anschauen und <kbd>E</kbd>`, 'good', 3500); };
      b1.onclick = buy(1); if (b2) b2.onclick = buy(2); card.onclick = buy(1);
      list.append(card);
    }
  }
  // Inspektor: Einbau wie beim ersten PC – Steckplätze, Lager, Ghost-Vorschau, Einrast-Animation
  rigBuild(o) {
    const g = this.g, p = o.parts, cap = g.rigGpuCap(o), np = g.psuCount(o), uid = o.uid, open = this.rbOpen?.uid === uid ? this.rbOpen.key : null;
    const pm = g.parcelMode(), pend = g.pendingParts(), pn = Object.values(pend).reduce((a, n) => a + n, 0), bc = g.bagCount(), sec = h(`<div class="sec pcb rb"><h4>Einbau <span class="rb-bag">${bc ? `Lager: ${bc} ${bc === 1 ? 'Teil' : 'Teile'}` : 'Lager leer'}${pn ? ` · ${pn} unterwegs` : ''}</span></h4></div>`);
    const rows = [['mobo', 'Mainboard', p.mobo, null], ['cpu', 'Prozessor', p.cpu, null]];
    for (let i = 0; i < Math.max(cap, p.gpus.length); i++) rows.push(['gpu', `Grafikkarte ${i + 1}`, p.gpus[i] || null, i]);
    if (!p.mobo) rows.push(['gpu', 'Grafikkarten', null, -1]);
    rows.push(['psu', np > 1 ? 'Netzteile (2 Stück)' : 'Netzteil', p.psu, null]);
    const revOf = () => { const sm = g.summary[g.facOf(uid)], a = sm?.per.get(uid); return a ? a.units.reduce((x, u) => x + u.rev, 0) * sm.throttle : 0; };
    const install = (id, idx) => {
      const before = revOf(), why = g.installWhy(o, id, idx); if (why) { this.toast(esc(why), 'bad'); return; }
      const t = PART[id].type; this.rbOpen = null; this.w.ghostPart?.(null);
      if (!g.installPart(uid, id, idx)) return;
      this.inspect(uid); this.w.animateInstall?.(uid, t); this.audio?.install?.();
      const after = revOf(), over = g.rigWatt(o) > (o.parts.psu ? PART[o.parts.psu].cap * np : Infinity);
      this.toast(over ? `${esc(PART[id].name)} eingebaut – <b>Netzteil zu schwach</b> (${g.rigWatt(o)} W). Stärkeres einbauen!` : `${esc(PART[id].name)} eingebaut${after > before + 0.005 ? ` · ${fmtUSD(before)} → <b>${fmtUSD(after)}</b> pro Tag` : ''}`, over ? 'bad' : 'good', 4000);
    };
    // Neu kaufen und einbauen – reicht das Netzteil nicht, kommt das passende gleich mit (Preis im Knopf)
    const buyIn = (id, idx) => {
      if (g.parcelMode()) { const r = g.orderPlan(uid, id, idx); if (!r) { this.toast(esc(g.buyPlan(o, id, idx)?.why || 'Nicht genug Geld.'), 'bad'); this.inspect(uid); return; } this.rbOpen = null; this.w.ghostPart?.(null); this.ordered(`${PART[id].name}${r.psu ? ` + ${PART[r.psu].name}` : ''}`, ' Paket aufheben, dann hier aus dem Lager einbauen.'); this.inspect(uid); return; }
      const before = revOf(), t = PART[id].type, r = g.buyInstall(uid, id, idx);
      if (!r) { this.toast(esc(g.buyPlan(o, id, idx)?.why || 'Nicht genug Geld.'), 'bad'); this.inspect(uid); return; }
      this.rbOpen = null; this.w.ghostPart?.(null); this.inspect(uid); this.w.animateInstall?.(uid, t); this.audio?.install?.();
      const after = revOf();
      this.toast(`${esc(PART[id].name)} eingebaut${r.psu ? ` – mit ${esc(PART[r.psu].name)}, das alte Netzteil liegt im Lager` : ''}${after > before + 0.005 ? ` · ${fmtUSD(before)} → <b>${fmtUSD(after)}</b> pro Tag` : ''}`, 'good', 4500);
    };
    const shopFor = (t) => {
      const el = g.elecPrice(g.facOf(uid)), val = (it) => { const c = g.bestCoin(it.hash, it.vram); return (c ? g.revenueFor(it.hash, c, it.vram) : 0) - (it.watt / 1000) * 24 * el; };
      let l = g.partList(t);
      if (t === 'gpu') l = [...l].sort((a, b) => val(b) / g.itemPrice(b) - val(a) / g.itemPrice(a));
      else if (t === 'psu') { const need = g.rigWatt(o) - (p.psu ? 0 : 0); l = [...l].filter((x) => x.cap * np >= need).sort((a, b) => a.cap - b.cap); }
      else if (t === 'mobo') l = [...l].sort((a, b) => Math.min(b.slots, PLACEABLE[o.type].maxGpu) - Math.min(a.slots, PLACEABLE[o.type].maxGpu) || g.itemPrice(a) - g.itemPrice(b));
      else l = [...l].sort((a, b) => g.itemPrice(a) - g.itemPrice(b));
      return l.slice(0, 3);
    };
    for (const [t, lab, id, idx] of rows) {
      const key = `${t}:${idx}`, locked = (t === 'cpu' || t === 'gpu') && !p.mobo, it = id ? PART[id] : null, isOpen = open === key;
      const bagN = g.bagList(t).filter((b) => b.n >= (t === 'psu' ? np : 1)).length, pendT = Object.entries(pend).filter(([pid]) => PART[pid]?.type === t).reduce((a, [, n]) => a + n, 0);
      const row = h(`<div class="pcb-step ${it ? 'done' : locked ? 'locked' : 'free'} ${isOpen ? 'open' : ''}"><span class="ic">${partSvg(t)}${it ? '<i class="tick"></i>' : ''}</span><div class="tx"><b>${lab}</b><span>${it ? esc(it.name) : locked ? 'Erst ein Mainboard einbauen' : bagN ? `frei · ${bagN} passende im Lager` : pendT ? `frei · ${pendT} unterwegs` : 'frei'}</span></div>${locked ? '' : `<button class="btn small ${!it ? 'primary' : ''}">${isOpen ? 'Zu' : it ? 'Tauschen' : 'Einbauen'}</button>`}</div>`);
      const b = row.querySelector('button');
      if (b) b.onclick = () => { this.rbOpen = isOpen ? null : { uid, key }; this.w.ghostPart?.(null); this.inspect(uid); };
      sec.append(row);
      if (!isOpen) continue;
      const pick = h('<div class="rb-pick"></div>');
      if (it) { const rm = h(`<button class="btn small rb-out">Ausbauen · ins Lager</button>`); rm.onclick = () => { g.removePart(uid, t, idx); this.rbOpen = null; this.audio?.install?.(); this.toast(`${esc(it.name)} liegt im Lager${t === 'mobo' && (p.cpu || p.gpus.length) ? ' (mit CPU und Karten)' : ''}`, 'info', 3000); this.inspect(uid); }; pick.append(rm); }
      const own = g.bagList(t).filter((b2) => b2.n >= (t === 'psu' ? np : 1) && b2.id !== id);
      if (own.length) pick.append(h('<div class="rb-h">Aus dem Lager</div>'));
      for (const b2 of own) {
        const bw = g.psuWhy(o, b2.id, t === 'gpu' && id ? idx : null);
        const c = h(`<div class="rb-opt"><span><b>${esc(b2.part.name)}</b> <em>${b2.n}×${bw ? ' · Netzteil zu schwach' : ''}</em></span><button class="btn small primary" ${bw ? `disabled title="${esc(bw)}"` : ''}>Einbauen</button></div>`);
        c.onmouseenter = () => this.w.ghostPart?.(uid, t, b2.id); c.onmouseleave = () => this.w.ghostPart?.(null);
        c.querySelector('button').onclick = () => install(b2.id, t === 'gpu' && id ? idx : null);
        pick.append(c);
        if (bw && t !== 'psu' && p.psu) { // Netzteil zu schwach: Grund lesbar machen und das kleinste passende gleich anbieten
          const need = g.wattAfter(o, b2.id, t === 'gpu' && id ? idx : null), cap = PART[p.psu].cap * np;
          const fit = g.partList('psu').filter((x) => g.available(x) && x.cap * np >= need).sort((a, b) => a.cap - b.cap || g.itemPrice(a) - g.itemPrice(b))[0];
          const fx = h(`<div class="rb-fix"><span>Braucht ${need} W – dein Netzteil schafft nur ${cap} W.</span>${fit ? `<button class="btn small primary">${pm ? 'Netzteil bestellen' : 'Netzteil kaufen'} · ${esc(fit.name)} · ${this.money(g.itemPrice(fit) * np)}</button>` : '<span>Dafür gibt es noch kein passendes Netzteil.</span>'}</div>`);
          if (fit) fx.querySelector('button').onclick = () => buyIn(fit.id, null);
          pick.append(fx);
        }
      }
      const shop = shopFor(t).filter((x) => x.id !== id);
      if (shop.length) pick.append(h(`<div class="rb-h">${pm ? 'Im Shop bestellen · Lieferung morgen' : 'Neu kaufen'}</div>`));
      for (const x of shop) {
        const si = t === 'gpu' && id ? idx : null, pl = g.buyPlan(o, x.id, si) || { why: 'Geht nicht' }, price = pl.total ?? g.itemPrice(x) * (t === 'psu' ? np : 1);
        const tip = pl.why || (pm ? (pl.psu ? `Bestellen – mit ${PART[pl.psu].name} (+${fmtUSD(pl.extra)}), weil das Netzteil sonst nicht reicht. Morgen früh im Paket.` : 'Bestellen – morgen früh im Paket, dann aus dem Lager einbauen') : pl.psu ? `Kaufen und gleich einbauen – mit ${PART[pl.psu].name} (+${fmtUSD(pl.extra)}), weil das Netzteil sonst nicht reicht. Das alte kommt ins Lager.` : 'Kaufen und gleich einbauen');
        const c = h(`<div class="rb-opt"><span><b>${esc(x.name)}</b> <em>${t === 'gpu' ? `${x.watt} W` : t === 'psu' ? `${x.cap} W` : t === 'mobo' ? `${x.slots} Plätze` : `${x.watt} W`}</em></span><button class="btn small" ${pl.why || price > g.s.cash ? 'disabled' : ''} title="${esc(tip)}">${pm ? (pl.psu ? 'Bestellen + Netzteil' : 'Bestellen') : pl.psu ? 'Kaufen + Netzteil' : 'Kaufen'} · ${this.money(price)}</button></div>`);
        c.onmouseenter = () => this.w.ghostPart?.(uid, t, x.id); c.onmouseleave = () => this.w.ghostPart?.(null);
        c.querySelector('button').onclick = () => buyIn(x.id, si);
        pick.append(c);
      }
      const more = h('<button class="btn small rb-more">Alle Teile ansehen …</button>'); more.onclick = () => this.partPicker(o, t, t === 'gpu' ? Math.max(0, idx ?? 0) : 0); if (!locked) pick.append(more);
      sec.append(pick);
    }
    if (p.psu) { const watt = g.rigWatt(o), capW = PART[p.psu].cap * np; sec.append(h(`<div class="pcb-load"><span>Netzteil-Last</span><div class="bar"><div style="width:${Math.min(100, (watt / capW) * 100)}%;background:${watt > capW ? '#ff8f84' : 'var(--acc)'}"></div></div><span>${watt} / ${capW} W</span></div>`)); }
    // Abkürzungen: Bausatz aus dem Lager komplett einbauen, Basis-Teile kaufen, freie Plätze füllen
    const qr = h('<div class="row rb-quick"></div>'); // Serien-Einbau steht oben (kitSec)
    if (pm) { // Paket-Modus: dieselben Abkürzungen als Bestellung (Teile kommen morgen ins Lager)
      if (!p.mobo || !p.cpu || !p.psu) { const pl = g.basePlan(o); if (pl?.items.length) { const b = h(`<button class="btn small" ${pl.total > g.s.cash ? 'disabled' : ''}>Basis-Teile bestellen · ${this.money(pl.total)}</button>`); b.onclick = () => { if (!g.orderBase(uid)) this.toast('Nicht genug Geld.', 'bad'); else this.ordered('Basis-Teile', ' Paket aufheben, dann hier einbauen.'); this.inspect(uid); }; qr.append(b); } }
      else if (p.gpus.length < cap) { const bg = this.bestGpu(), pl = bg && g.fillPlan(o, bg.id); if (pl) { const b = h(`<button class="btn small">Freie Plätze: ${pl.k}× ${esc(bg.name)} bestellen · ${this.money(pl.total)}</button>`); b.onclick = () => { if (!g.orderFill(uid, bg.id)) this.toast('Nicht genug Geld.', 'bad'); else this.ordered(`${pl.k}× ${bg.name}${pl.psu ? ` + ${PART[pl.psu].name}` : ''}`, ' Paket aufheben, dann hier einbauen.'); this.inspect(uid); }; qr.append(b); } }
    }
    else if (!p.mobo || !p.cpu || !p.psu) { const b = h('<button class="btn small">Basis-Teile kaufen & einbauen</button>'); b.onclick = () => { const r = g.quickBase(uid); if (!r) this.toast('Nicht genug Geld.', 'bad'); this.inspect(uid); }; qr.append(b); }
    else if (p.gpus.length < cap) { const bg = this.bestGpu(); if (bg) { const k = cap - p.gpus.length, pr = g.itemPrice(bg) * k; const b = h(`<button class="btn small">Freie Plätze füllen · ${k}× ${esc(bg.name)} · ${this.money(pr)}</button>`); b.onclick = () => { const n = g.fillGpus(uid, bg.id); if (!n) this.toast('Nicht genug Geld.', 'bad'); else { this.w.animateInstall?.(uid, 'gpu'); this.audio?.install?.(); } this.inspect(uid); }; qr.append(b); } }
    if (qr.childElementCount) sec.append(qr);
    return sec;
  }
  // Standort erstmals voll: kleiner Story-Moment und der Weg zum nächsten Standort
  facFull(id, c) {
    const g = this.g, f = FACILITY[id], t = FULL_TALK[id];
    this.milestone(`${f.short} ist voll`, c.live >= c.max ? `Alle ${c.max} Plätze belegt` : `Strom am Limit: ${fmtWatt(c.watt)}`, 'Standort voll');
    this.audio?.message?.();
    setTimeout(() => {
      if (t) this.toast(`<b>${esc(t.from)}:</b> ${esc(t.text)}`, 'msg', 9000);
      const step = this.nextSiteStep(id); if (step) setTimeout(() => this.toast(step, 'good', 10000), 1200);
      this.goals(); this.dock(); this.sites();
    }, 1800);
  }
  nextSiteStep(id) {
    const g = this.g, s = g.s, f = FACILITY[id], nx = FACILITIES.find((x) => x.tier === f.tier + 1); if (!nx) return '';
    if (s.unlocked.includes(nx.id)) return `Platz gibt es im <b>${esc(nx.short)}</b> – Karte <kbd>K</kbd> oder durch die Tür.`;
    if (g.canUnlock(nx.id)) return `<b>${esc(nx.short)} freischalten:</b> geh durch die Tür${nx.cost ? ` (${fmtUSD(nx.cost)})` : ''}.`;
    const ci = CHAPTERS.findIndex((x) => x.unlock === nx.id), ch = CHAPTERS[ci]; if (!ch || s.chapter > ci) return '';
    const open = ch.goals.filter((x) => !s.goals[x.id] && !x.orDate);
    if (open.length) return `Für ${esc(nx.short === 'Keller' ? 'den Keller' : nx.short === 'Halle' ? 'die Halle' : nx.short === 'Werkstatt' ? 'die Werkstatt' : nx.short === 'RZ' ? 'das RZ' : 'die Fjordhalle')} fehlt noch: <b>${esc(open[0].text)}</b>`;
    if (s.day < toDay(ch.minDate) && !g.chSkip(ch)) return `${esc(nx.short)}: ab ${this.monthYear(ch.minDate)}. ${esc(t2(ch.waitText))}`;
    return '';
    function t2(x) { return x || ''; }
  }
}
