// Spielzustand + tägliche Simulation (Mining, Strom, Hitze, Defekte, Markt, Story)
import { COINS, COIN } from '../data/coins.js';
import { PLACEABLE, PART, PLACEABLES, PARTS, GPUS } from '../data/hardware.js';
import { FACILITIES, FACILITY, CHAPTERS, MESSAGES, NEWS, START_DAY, TECHS } from '../data/world.js';
import { EVENTS, EVENT, REL_PERK } from '../data/events.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { UPGRADES, DIFFICULTY, FULL_TALK } from '../data/world.js';
import { ROLES, TRAITS, FIRST, LAST } from '../data/staff.js';
import { BANK_EVENTS } from '../data/events_bank.js';
import { CONTACT, CONTACTS, READY_BY, FEE_TIERS } from '../data/contacts.js';
import { FUTURE, futureModel, ENDLESS_GOALS, EGOAL, ENDLESS_NEWS } from '../data/endless.js';
import { BTC_HASH, POWER_HOUSEHOLD, GPU_BOOM, MONOLITH_SHARE, DAG_AET, DAG_AEC, seasonOffset, noise, toDay, BTC_PRICE, curve, HALVINGS, BTC_REWARD } from '../data/history.js';
export const SKILL_XP = [0, 150, 500, 1200, 2500, 4500, 7500, 12000, 18000, 26000]; // Erfahrung für Stufe 1–10
export const SKILL_PCT = 2; // Schrauben: −2 % Hardwarepreis, Mining: +2 % Ertrag je Stufe über 1
export const TRADE_FEES = [0.04, 0.035, 0.03, 0.025, 0.02, 0.016, 0.013, 0.01, 0.0075, 0.005]; // Börsengebühr je Handel-Stufe
for (const e of BANK_EVENTS) if (!EVENT[e.id]) { EVENTS.push(e); EVENT[e.id] = e; } // Bankgespräch (nur über Game.dispoDay)

const LAST_DATA_DAY = BTC_PRICE.lastDay;
const FREE_POWER_END = toDay('2011-03-01'); // ab dann kostet der Strom im Kinderzimmer, auch ohne Papas Rechnung
export const SAVE_KEY = 'hashwerk-save-v1';
const DEFAULT_AUTOSELL = 0.8;
export const BUILD_FEE = 0.1; // Montageaufschlag für fertig montierte PCs/Rigs (Neukunde; Stammkunden zahlen weniger: FEE_TIERS in contacts.js)

const RELEASES = [...PLACEABLES, ...PARTS].filter((it) => it.releaseDay > START_DAY && (it.kind === 'device' || it.kind === 'rig' || it.type));
const BASE_EFF = Math.min(...PLACEABLES.filter((p) => p.kind === 'device' && p.algo === 'sha256').map((p) => p.watt / (p.hash / 1e12))); // bestes J/TH bei Datenende
const fmtHashS = (h, a) => fmtHash(h, a);
const curveSolar = curve([['2010-01', 3200], ['2013-01', 1900], ['2016-01', 1500], ['2020-01', 1100], ['2023-01', 1000], ['2026-01', 750]], { log: false });
function rnd(seed) { const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

export class Game {
  constructor() { this.listeners = {}; this.newGame(); }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, ...a) { (this.listeners[ev] || []).forEach((f) => f(...a)); }

  newGame(diff = 'normal') {
    const s = {
      version: 1, day: START_DAY, frac: 0.83, cash: 300, nextUid: 1,
      wallet: Object.fromEntries(COINS.map((c) => [c.id, { ex: 0, cold: 0 }])),
      autoSell: Object.fromEntries(COINS.map((c) => [c.id, DEFAULT_AUTOSELL])),
      payoutCold: false,
      unlocked: ['kinder'], current: 'kinder',
      fac: Object.fromEntries(FACILITIES.map((f) => [f.id, { power: 0, tripped: false, temp: 21, objects: [] }])),
      staff: { tech: 0 },
      chapter: 0, goals: {}, flags: {}, messages: [], newsIdx: 0, ticker: [],
      stats: { minedUSD: 0, sold: 0, spentHW: 0, elec: 0, history: [] },
      endless: null, lastNet: {},
      feat: { phone: 1 },
      ev: { done: {}, open: null, log: [], later: [], last: 0 }, rel: { papa: 0, mama: 0, opa: 0, deniz: 0 }, mods: [], ach: {},
      full: {}, // Standort erstmals voll: Tag (Story-Moment, Kapitelziele)
      bag: {}, lastBuild: null, // Teile-Lager {Teil-ID: Anzahl}, zuletzt gekaufter Build
      contacts: {}, since: {}, // Geschäftskontakte (fertig montierte Hardware, src/data/contacts.js), Tag der Standort-Übernahme
    };
    Object.assign(s, { futureHW: [], netEff: 1, egoals: { done: {}, st: {}, cur: null }, fin: {}, ngPlus: 0, enews: {} }); // Endlosmodus & Finale
    this.registerFutureHW([]);
    for (const c of COINS) s.autoSell[c.id] = 0;
    this.initProgress(s);
    const m0 = MESSAGES.find((m) => m.id === 'm0'); if (m0) s.messages.push({ id: 'm0', day: START_DAY, from: m0.from, text: m0.text, read: true }); // Start-Nachricht (im Intro gezeigt)
    this.s = s;
    this.cache = {};
    this.initEcon(diff);
    // Start: leeres Gehäuse – den ersten Mining-PC baut der Spieler selbst zusammen
    // Alte Teile liegen im Zimmer herum – einsammeln und einbauen
    s.loose = { mobo: 'h55', cpu: 'cel33', gpu: 'rhd4850', psu: 'psu400' }; s.inv = [];
    s.skills = { hw: 0, mining: 0, trade: 0 };
    s.keep = {}; s.talk = { last: {}, week: {}, joy: {}, got: {}, seen: {}, line: {} }; // Fundstücke, Gespräche (src/data/story.js)
    const pc = this.addObject('kinder', 'tower', 1.75, 0.75, 0, { mobo: null, cpu: null, psu: null, gpus: [] }, true);
    pc.mode = 'off'; // Einschalten erst, wenn alle Teile drin sind
    while (s.newsIdx < NEWS.length && NEWS[s.newsIdx].day < s.day) s.newsIdx++;
    this.dayUpdate(true);
  }

  // ---------- Speichern / Laden ----------
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.s)); return true; } catch (e) { return false; } }
  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  saveInfo() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s ? { day: s.day, cash: s.cash, sites: s.unlocked.length } : null; } catch (e) { return null; } }
  load() {
    const prev = { s: this.s, cache: this.cache, summary: this.summary }; // bei Fehler zurück zum laufenden Spiel
    try {
      const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
      const s = JSON.parse(raw); if (!s || s.version !== 1) return false;
      s.fac ||= {}; s.wallet ||= {}; s.autoSell ||= {}; s.lastNet ||= {};
      s.futureHW = Array.isArray(s.futureHW) ? s.futureHW.filter((it) => it?.id && it.hash > 0 && it.watt > 0) : []; this.registerFutureHW(s.futureHW); // Zukunfts-Miner vor dem Aussortieren unbekannter Geräte eintragen
      for (const f of FACILITIES) s.fac[f.id] ||= { power: 0, tripped: false, temp: 21, objects: [] };
      // Alte Spielstände: Parodie-Kürzel auf echte Coins umstellen
      const MIG = { SLV: 'LTC', WUF: 'DOGE', SHD: 'XMR', AET: 'ETH', AEC: 'ETC', ZRP: 'ZEC', CRV: 'RVN', KSK: 'KAS' };
      for (const [o, n] of Object.entries(MIG)) {
        if (s.wallet[o]) { s.wallet[n] = s.wallet[o]; delete s.wallet[o]; }
        if (s.autoSell[o] != null) { s.autoSell[n] = s.autoSell[o]; delete s.autoSell[o]; }
        if (s.stats?.coins?.[o] != null) { s.stats.coins[n] = s.stats.coins[o]; delete s.stats.coins[o]; }
        if (s.endless?.[o]) { s.endless[n] = s.endless[o]; delete s.endless[o]; }
        if (s.lastNet[o] != null) { s.lastNet[n] = s.lastNet[o]; delete s.lastNet[o]; }
        for (const f of Object.values(s.fac)) for (const ob of f.objects || []) if (ob.coin === o) ob.coin = n;
      }
      // Unbekannte Objekte und Teile (z. B. aus anderen Spielversionen) aussortieren statt abzustürzen
      for (const f of Object.values(s.fac)) {
        f.objects = (f.objects || []).filter((ob) => ob && PLACEABLE[ob.type]);
        for (const ob of f.objects) {
          if (ob.coin !== 'auto' && !COIN[ob.coin]) ob.coin = 'auto';
          if (PLACEABLE[ob.type].kind === 'rig') { ob.parts ||= { mobo: null, cpu: null, psu: null, gpus: [] }; for (const k of ['mobo', 'cpu', 'psu']) if (ob.parts[k] && !PART[ob.parts[k]]) ob.parts[k] = null; ob.parts.gpus = (ob.parts.gpus || []).filter((id) => PART[id]); }
          if (PLACEABLE[ob.type].kind === 'holder') ob.items = (ob.items || []).filter((it) => it && PLACEABLE[it.id]);
        }
      }
      s.unlocked = (s.unlocked || ['kinder']).filter((id) => FACILITY[id]); if (!s.unlocked.length) s.unlocked = ['kinder'];
      if (!s.unlocked.includes(s.current)) s.current = s.unlocked[0];
      if (s.endless) for (const c of COINS) s.endless[c.id] ||= { p: 1, h: 1 };
      s.staff ||= { tech: 0 }; s.goals ||= {}; s.messages ||= []; s.ticker ||= [];
      if (!Number.isFinite(s.cash)) s.cash = 0;
      for (const c of COINS) { s.wallet[c.id] ||= { ex: 0, cold: 0 }; if (s.autoSell[c.id] == null) s.autoSell[c.id] = DEFAULT_AUTOSELL; }
      s.ev ||= { done: {}, open: null, log: [], later: [], last: 0 }; s.ev.done ||= {}; s.ev.log ||= []; s.ev.later ||= [];
      s.skills ||= { hw: 0, mining: 0, trade: 0 };
      s.rel ||= { papa: 0, mama: 0, opa: 0, deniz: 0 }; s.mods ||= []; s.ach ||= {}; s.flags ||= {}; s.stats ||= { minedUSD: 0, sold: 0, spentHW: 0, elec: 0, history: [] };
      s.futureHW ||= []; s.netEff ||= 1; s.egoals ||= { done: {}, st: {}, cur: null }; s.egoals.done ||= {}; s.egoals.st ||= {}; s.fin ||= {}; s.ngPlus ||= 0; s.enews ||= {};
      s.keep ||= {}; s.talk ||= { last: {}, week: {}, joy: {}, got: {}, seen: {}, line: {} };
      this.initProgress(s);
      this.migrateEcon(s);
      const oldFull = !s.full; s.full ||= {};
      s.bag ||= {}; for (const id of Object.keys(s.bag)) if (!PART[id] || !(s.bag[id] > 0)) delete s.bag[id]; if (s.lastBuild && !PLACEABLE[s.lastBuild.type]) s.lastBuild = null;
      s.since ||= {}; const oldContacts = !s.contacts || typeof s.contacts !== 'object'; if (oldContacts) s.contacts = {};
      for (const id of Object.keys(s.contacts)) { const c = s.contacts[id]; if (!CONTACT[id] || !c || typeof c !== 'object') delete s.contacts[id]; else { c.met = +c.met || 0; c.on = +c.on || 0; c.n = Math.max(0, +c.n || 0); } }
      if (oldContacts) this.migrateContacts(s); // alte Stände: Kontakte, die man nach dem Spielstand schon hätte, still freischalten
      this.s = s; this.cache = {};
      if (oldFull) { this.summary = {}; for (const id of s.unlocked) this.summary[id] = this.facSummary(id); this.checkFull(true); } // alte Stände: schon volle Standorte ohne Story-Moment merken
      this.dayUpdate(true); return true;
    } catch (e) {
      console.warn(e); this.registerFutureHW(prev.s?.futureHW || []);
      if (this.s !== prev.s) { this.s = prev.s; this.cache = prev.cache; this.summary = prev.summary; try { this.dayUpdate(true); } catch (e2) { /* alter Stand bleibt */ } }
      return false;
    }
  }

  // ---------- Technologien ----------
  fx(key, facId = null) { let m = 1; const u = this.s.techs || {}; for (const t of TECHS) if (u[t.id] && t.fx[key]) m *= t.fx[key];
    m *= this.fxExt(key, facId);
    for (const md of this.s.mods || []) if (md.key === key && (!md.fac || md.fac === facId) && this.s.day < md.until) m *= md.mult; if (key === 'rev' && this.s.skills) m *= 1 + (SKILL_PCT / 100) * (this.skillLv('mining') - 1); return m * this.relFx(key, facId) * (key === 'rev' || key === 'monolith' ? this.diff(key) : 1); }
  // Beziehungen ab Stufe 3 wirken (Texte: REL_PERK in events.js; Opa: siehe powerCost)
  relFx(key, facId) {
    const r = this.s.rel; if (!r) return 1;
    if (key === 'rent' && facId === 'werkstatt' && r.papa >= 3 && !this.s.flags.shopLost) return 0; // Papa: keine Werkstattmiete
    if (key === 'repair' && r.papa >= 3 && this.s.flags.shopLost) return 0.8; // ohne Laden: Papa repariert mit (−20 % Reparaturkosten)
    if (key === 'cool' && facId === 'kinder' && r.mama >= 3) return 1.2; // Mama: +20 % Kühlung im Kinderzimmer
    if (key === 'fail' && r.deniz >= 3) return 0.9; // Deniz: −10 % Ausfälle
    return 1;
  }
  techAvailable(t) { return this.s.day >= toDay(t.date) && (!t.minTier || Math.max(...this.s.unlocked.map((id) => FACILITY[id].tier)) >= t.minTier); }
  buyTech(id) { const t = TECHS.find((x) => x.id === id); if (!t || (this.s.techs ||= {})[id] || !this.techAvailable(t) || !this.canAfford(t.cost)) return false; this.s.cash -= t.cost; this.s.techs[id] = this.s.day;
    if (id === 'ico') { const usd = Math.min(30e6, 600000 + this.netWorthFast() * 0.25); const p = this.price('ETH') || 1; this.s.wallet.ETH.ex += usd / p; this.toast(`ICO ausverkauft: ${fmtUSD(usd)} in Ethereum`, 'good', 9000); }
    this.dayUpdate(true); return true; }

  // ---------- Markt ----------
  price(id, day = this.s.day) {
    const c = COIN[id]; if (day < c.start) return 0;
    if (day > LAST_DATA_DAY && this.s.endless) return c.price(LAST_DATA_DAY) * this.endlessMult(id, day, 0);
    if (id === 'BTC' && day <= c.price.dailyEnd) return c.price(day); // echte Tageskurse, kein künstliches Rauschen
    const vol = id === 'BTC' ? 0.045 : 0.07;
    return c.price(day) * Math.exp(noise(day, id.charCodeAt(0) + id.charCodeAt(1)) * vol);
  }
  netHash(id, day = this.s.day) {
    const c = COIN[id]; if (day < c.start) return Infinity;
    if (day > LAST_DATA_DAY && this.s.endless) return c.hash(LAST_DATA_DAY) * this.endlessMult(id, day, 1);
    if (id === 'BTC' && day <= c.hash.dailyEnd) return c.hash(day); // echte Netz-Hashrate
    return c.hash(day) * Math.exp(noise(day, 99 + id.charCodeAt(0)) * 0.03);
  }
  // Endlosmodus: Kurs- (k=0) bzw. Hashraten-Faktor (k=1) eines vergangenen Tages aus der Historie, heute der laufende Wert
  endlessMult(id, day, k) {
    const s = this.s, e = s.endless[id]; if (!e) return 1;
    const H = s.endlessHist, i = day < s.day && H ? H.ids.indexOf(id) : -1, r = i >= 0 && H.d[day];
    return r ? r[i * 2 + k] : k ? e.h : e.p;
  }
  coinActive(id, day = this.s.day) { const c = COIN[id]; return day >= c.start && (!c.end || day < c.end); }
  coinAlgo(id, day = this.s.day) { return COIN[id].algo(day); }
  elecPrice(facId, day = this.s.day, full = false) {
    const f = FACILITY[facId];
    if (facId === 'kinder' && !full && !this.s.flags.papa1 && day < FREE_POWER_END) return 0; // Mama zahlt – bis März 2011 (full: regulärer Preis, z. B. für die Kartenwahl)
    if (f.elec === 'fixed') return f.elecFixed * (day > toDay('2022-03-01') && day < toDay('2023-06-01') ? 1.6 : 1) * this.fx('elec', facId) * this.fx('fjordElec');
    return POWER_HOUSEHOLD(day) * f.elecMult * this.fx('elec', facId);
  }
  // USD pro (H/s) pro Tag für Coin
  revPerHash(id, day = this.s.day) {
    if (!this.coinActive(id, day)) return 0;
    const own = this.s.lastNet[id] || 0;
    return (COIN[id].emission(day) * this.price(id, day)) / (this.netHash(id, day) + own);
  }
  dagOk(vram, coinId, day = this.s.day) {
    const c = COIN[coinId];
    if (!c.dag) return true;
    const dag = c.dag === 'ETH' ? DAG_AET(day) : DAG_AEC(day);
    return vram >= dag + 0.05;
  }
  // Ertrag eines Hash-Profils {algo: H/s} für Coin
  revenueFor(hash, coinId, vram = 99, day = this.s.day) {
    const algo = this.coinAlgo(coinId, day);
    const h = hash[algo] || 0; if (!h) return 0;
    if (!this.dagOk(vram, coinId, day)) return 0;
    let r = h * this.revPerHash(coinId, day) * this.fx('rev');
    const c = COIN[coinId];
    if (coinId === 'LTC' && day >= COIN.DOGE.mergedFrom) r += h * this.revPerHash('DOGE', day);
    return r;
  }
  bestCoin(hash, vram = 99, day = this.s.day) {
    let best = null, br = 0;
    for (const c of COINS) {
      if (c.mergedWith && day >= c.mergedFrom) continue; // DOGE läuft dann über LTC
      const r = this.revenueFor(hash, c.id, vram, day);
      if (r > br) { br = r; best = c.id; }
    }
    return best;
  }
  hashprice(algo, day) {
    let best = 0;
    for (const c of COINS) { if (this.coinActive(c.id, day) && c.algo(day) === algo) best = Math.max(best, (c.emission(day) * c.price(day)) / c.hash(day)); }
    return best;
  }

  // ---------- Hardware-Preise & Verfügbarkeit ----------
  itemPrice(item, day = this.s.day) {
    const years = Math.max(0, (day - item.releaseDay) / 365);
    let p = item.price;
    if (item.type === 'gpu') p *= Math.max(0.3, 1 - 0.13 * years) * GPU_BOOM(day);
    else if (item.type === 'cpu' || item.type === 'mobo' || item.type === 'psu') p *= Math.max(0.35, 1 - 0.12 * years);
    else if (item.kind === 'device') {
      const k = `hp_${item.algo}_${item.releaseDay}`;
      const h0 = this.cache[k] ??= this.hashprice(item.algo, Math.min(item.releaseDay + 15, LAST_DATA_DAY)) || 1; // Zukunfts-Hardware: Preis kommt aus dem Markt beim Erscheinen
      const d1 = Math.min(day, LAST_DATA_DAY); if (this.hpDay !== d1) { this.hpDay = d1; this.hpC = {}; } // je Tag einmal rechnen (große Flotten)
      const h1 = (this.hpC[item.algo] ??= this.hashprice(item.algo, d1)) || h0;
      if (item.fut) p = this.futureBase(item, day); // Zukunfts-Hardware: Listenpreis folgt dem aktuellen Hashpreis
      const ratio = Math.min(2.6, Math.max(0.06, Math.pow(h1 / h0, 0.55)));
      p *= ratio * Math.max(0.35, 1 - 0.1 * years);
    } else p *= Math.pow(1.02, Math.max(0, (day - toDay('2010-01-01')) / 365));
    if (this.s?.skills) p *= 1 - (SKILL_PCT / 100) * (this.skillLv('hw') - 1);
    if (this.s?.mods?.length) p *= this.fx('price') * this.fx('price:' + (item.kind === 'device' ? 'asic' : item.type || item.kind));
    if (item.stock?.mult && day < toDay(item.stock.until)) p *= item.stock.mult; // Graumarkt-Aufschlag während des Kontingents
    p *= this.diff('hw');
    return Math.max(1, Math.round(p));
  }
  available(item, day = this.s.day) {
    if (day < item.releaseDay) return false;
    const years = (day - item.releaseDay) / 365;
    if (item.type === 'gpu' || item.type === 'cpu') return years < 7;
    // Netzteile, Mainboards, Rahmen, Regale, Kühlung, Deko laufen nie aus (sonst ist der Handel im Endlosmodus leer)
    if (item.kind === 'device') return years < 5.5;
    return true;
  }
  facTier(facId) { return FACILITY[facId].tier; }
  placeableAllowed(item, facId) {
    const t = this.facTier(facId);
    if (item.minTier != null && t < item.minTier) return false;
    if (item.maxTier != null && t > item.maxTier) return false;
    if (item.hydro) return false; // Hydro-Miner nur in Container/Rack
    return true;
  }
  shopList(cat, facId) {
    return PLACEABLES.filter((p) => p.cat === cat && this.available(p) && (this.placeableAllowed(p, facId) || (p.hydro && this.facTier(facId) >= 3)));
  }
  partList(type) { return PARTS.filter((p) => p.type === type && this.available(p)).sort((a, b) => b.releaseDay - a.releaseDay); }

  // ---------- Objekte ----------
  facObjects(facId = this.s.current) { return this.s.fac[facId].objects; }
  findObj(uid) { for (const f of Object.values(this.s.fac)) { const o = f.objects.find((x) => x.uid === uid); if (o) return o; } return null; }
  facOf(uid) { for (const [id, f] of Object.entries(this.s.fac)) if (f.objects.some((x) => x.uid === uid)) return id; return null; }

  // ---------- Freischaltungen (am Anfang kann man wenig, alles kommt nach und nach) ----------
  has(f) { return !this.s.feat || !!this.s.feat[f]; }
  grant(f) { if (this.has(f)) return false; this.s.feat[f] = this.s.day || 1; if (f === 'autosell') for (const c of COINS) if (!this.s.autoSell[c.id]) this.s.autoSell[c.id] = DEFAULT_AUTOSELL; this.emit('feature', f); return true; }
  checkFeatures() {
    const s = this.s; if (!s.feat) return;
    const btc = s.wallet.BTC ? s.wallet.BTC.ex + s.wallet.BTC.cold : 0;
    if (s.flags.miningStarted && btc * this.price('BTC') >= 12) this.grant('market');
    if (s.flags.boughtGpu) { this.grant('build'); this.grant('speed2'); this.grant('rigs'); } // gleich weitere Mining-PCs bauen
    if (s.goals.rig2 || (s.unlocked.includes('kinder') && this.summary?.kinder?.watt > 1200)) this.grant('company'); // Strom ausbauen (Eigener Stromkreis)
    if (this.has('build')) { let hot = false; for (const id of s.unlocked) if ((this.summary[id]?.temp || 0) > 30) hot = true; if (hot) this.grant('heat'); }
    if (s.chapter >= 1) { this.grant('rigs'); this.grant('autosell'); this.grant('speed3'); this.grant('company'); this.grant('build'); this.grant('speed2'); this.grant('market'); }
    if (s.chapter >= 1 && s.day >= toDay('2011-10-07')) this.grant('coins');
    if (s.chapter >= 1 && s.day >= toDay('2011-06-20')) this.grant('cold');
    if (s.unlocked.length >= 2) this.grant('map');
    if (s.chapter >= 2) { this.grant('techs'); this.grant('ranking'); this.grant('loan'); this.grant('buycoins'); this.grant('coins'); this.grant('cold'); this.grant('heat'); }
    if (s.chapter >= 1) { this.grant('techs'); this.grant('ranking'); } // Opas Werkbank und das Logbuch schon im Keller
  }
  startMining(uid) { const o = this.findObj(uid); if (!o || (o.parts && !this.pcReady(o))) return false; o.mode = 'auto'; const first = !this.s.flags.miningStarted; if (first) { this.s.mineDay0 = this.s.day; this.s.mineFrac0 = this.s.frac || 0; } this.s.flags.miningStarted = true; this.s.flags.seenPc = true; if (first) this.addXp('mining', 40); this.checkGoals(); this.dayUpdate(true); this.emit('objects', this.facOf(uid)); return true; }
  // Zentraler Geld-Check: nur kaufen, was wirklich bezahlt werden kann (kein Kauf bei Minus-Konto)
  canAfford(usd) { return Number.isFinite(usd) && usd >= 0 && Number.isFinite(this.s.cash) && this.s.cash >= usd; }
  addObject(facId, type, x, z, rot, parts, free = false) {
    const def = PLACEABLE[type];
    if (!free && this.stockLeft(def) < 1) return null; // Kontingent erschöpft
    if (!free && !this.slotOk(facId, def)) return null; // alle Stellplätze belegt
    const o = { uid: this.s.nextUid++, type, x, z, rot, coin: 'auto', broken: false, bought: this.s.day };
    if (def.kind === 'rig') o.parts = parts || { mobo: null, cpu: null, psu: null, gpus: [] };
    if (def.kind === 'holder') o.items = [];
    if (!free) { const p = this.itemPrice(def); if (!this.canAfford(p)) return null; this.s.cash -= p; this.s.stats.spentHW += p; if (this.s.skills) this.addXp('hw', 10); }
    if (!free) this.stockUse(def, 1);
    this.s.fac[facId].objects.push(o);
    if (def.kind === 'device' && def.look !== 'fpga' && def.look !== 'usb') this.s.flags.boughtAsic = true;
    this.dayUpdate(true); if (!free) this.capWarn(facId);
    this.emit('objects', facId);
    return o;
  }
  removeObject(uid) {
    const facId = this.facOf(uid); if (!facId) return;
    const f = this.s.fac[facId];
    const o = f.objects.find((x) => x.uid === uid);
    this.s.cash += this.objectValue(o);
    f.objects = f.objects.filter((x) => x !== o);
    this.dayUpdate(true); this.emit('objects', facId);
  }
  objectValue(o) {
    const def = PLACEABLE[o.type];
    let v = this.itemPrice(def) * 0.5;
    if (o.parts) for (const pid of this.partIds(o)) v += this.itemPrice(PART[pid]) * 0.5 * (pid === o.parts.psu ? this.psuCount(o) : 1); // Doppel-Netzteil zählt doppelt
    if (o.items) for (const it of o.items) v += this.itemPrice(PLACEABLE[it.id]) * (it.b ? 0.2 : 0.5);
    if (o.broken) v *= 0.4;
    return Math.round(v);
  }
  // Verkaufen erlaubt? Den einzigen PC im Kinderzimmer braucht man noch (sonst Sackgasse)
  canSell(o) { return !!o && this.has('build') && !(this.s.chapter === 0 && o.type === 'tower'); }
  partIds(o) { const p = o.parts; return [p.mobo, p.cpu, p.psu, ...p.gpus].filter(Boolean); }
  // Erster PC-Zusammenbau: welche Teile fehlen noch, und wie viel Geld muss für sie übrig bleiben?
  // ---------- Fähigkeiten: lernen durch Tun ----------
  skillLv(k) { const x = this.s.skills?.[k] || 0; return SKILL_XP.filter((t) => x >= t).length; }
  addXp(k, n, quiet = false) {
    const s = this.s; if (!s.skills) return; const before = this.skillLv(k); s.skills[k] = (s.skills[k] || 0) + Math.round(n);
    this.grant('skills'); const after = this.skillLv(k); if (!quiet || after > before) this.emit('xp', k, Math.round(n), after > before ? after : 0);
  }
  creditPending(coin, n) { const s = this.s; if (!(n > 0)) return; s.wallet[coin].ex += n; const n0 = s.accr?.day === s.day && s.accr.coin === coin ? s.accr.n || 0 : 0; s.accr = { day: s.day, f: s.frac, coin, n: n0 + n }; } // n: heute schon gutgeschrieben
  tradeFee() { return Math.max(0, (TRADE_FEES[this.skillLv('trade') - 1] ?? 0.005) - (this.s.staff?.list && this.staffFx().trader ? 0.005 : 0)); }
  // ---------- Herumliegende Teile ----------
  pickUp(type) { const s = this.s; if (!s.loose?.[type]) return false; s.inv.push(type); s.invIds = { ...(s.invIds || {}), [type]: s.loose[type] }; delete s.loose[type]; this.checkGoals(); this.emit('loose'); return true; }
  installLoose(uid, type) {
    const s = this.s, o = this.findObj(uid); if (!o?.parts || !s.inv?.includes(type)) return false;
    if ((type === 'cpu' || type === 'gpu') && !o.parts.mobo) return false;
    const id = s.invIds[type]; if (type === 'gpu') o.parts.gpus.push(id); else o.parts[type] = id;
    s.inv = s.inv.filter((t) => t !== type);
    if (this.pcReady(o)) s.flags.pcBuilt = true;
    this.addXp('hw', 25); this.dayUpdate(true); this.emit('objects', this.facOf(uid)); return true;
  }
  pcMissing(o) { const p = o.parts; return ['mobo', 'cpu', 'gpu', 'psu'].filter((t) => (t === 'gpu' ? !p.gpus.length : !p[t])); }
  pcReady(o) { return o?.parts && this.pcMissing(o).length === 0; }
  buildReserve(o, type) { if (this.s.flags.miningStarted || !o?.parts) return 0; let r = 0; for (const t of this.pcMissing(o)) if (t !== type) { const l = this.partList(t); if (l.length) r += Math.min(...l.map((x) => this.itemPrice(x))); } return r; }

  // Teil in Rig einbauen (altes wird verkauft)
  setPart(uid, slot, partId, gpuIndex = 0) {
    const o = this.findObj(uid); if (!o || !o.parts) return false;
    const part = partId ? PART[partId] : null;
    const mult = slot === 'psu' ? this.psuCount(o) : 1;
    const price = part ? this.itemPrice(part) * mult : 0;
    let old = slot === 'gpu' ? o.parts.gpus[gpuIndex] : o.parts[slot];
    const refund = old ? Math.round(this.itemPrice(PART[old]) * (this.s.flags.miningStarted ? 0.5 : 1) * mult) : 0; // Beim ersten Zusammenbau: voller Umtausch
    if (!Number.isFinite(price) || this.s.cash + refund < price || (price > refund && this.s.cash < 0)) return false;
    this.s.cash += refund - price; this.s.stats.spentHW += price;
    if (slot === 'gpu') {
      if (partId) o.parts.gpus[gpuIndex] = partId; else o.parts.gpus.splice(gpuIndex, 1);
      o.parts.gpus = o.parts.gpus.filter(Boolean);
      if (partId && this.s.flags.miningStarted) { this.s.flags.boughtGpu = true; this.addXp('hw', 20); }
    } else {
      o.parts[slot] = partId;
      if (slot === 'mobo') { const cap = this.rigGpuCap(o); if (o.parts.gpus.length > cap) { for (const g of o.parts.gpus.slice(cap)) this.s.cash += Math.round(this.itemPrice(PART[g]) * 0.5); o.parts.gpus = o.parts.gpus.slice(0, cap); } }
    }
    if (!this.s.flags.miningStarted && o.type === 'tower' && this.pcReady(o)) this.s.flags.pcBuilt = true;
    this.dayUpdate(true); if (partId && slot === 'gpu') this.capWarn(this.facOf(uid)); this.emit('objects', this.facOf(uid));
    return true;
  }
  psuCount(o) { return PLACEABLE[o.type].maxGpu >= 8 ? 2 : 1; }
  rigGpuCap(o) { const def = PLACEABLE[o.type]; const mb = o.parts.mobo ? PART[o.parts.mobo] : null; return mb ? Math.min(def.maxGpu, mb.slots) : 0; }

  rigWatt(o) { return 25 + this.partIds(o).reduce((a, id) => a + (PART[id].watt || 0), 0); }
  fitPsu(o, extraW = 0) {
    const need = this.rigWatt(o) + extraW; const n = this.psuCount(o);
    const psus = this.partList('psu').sort((a, b) => a.cap - b.cap);
    const fit = psus.find((x) => x.cap * n >= need) || psus[psus.length - 1];
    return fit;
  }
  quickBase(uid) {
    const o = this.findObj(uid); if (!o || !o.parts) return false;
    const def = PLACEABLE[o.type];
    if (!o.parts.mobo) {
      const mbs = this.partList('mobo'); const best = Math.max(...mbs.map((m) => Math.min(m.slots, def.maxGpu)));
      const mb = mbs.filter((m) => Math.min(m.slots, def.maxGpu) === best).sort((a, b) => this.itemPrice(a) - this.itemPrice(b))[0];
      if (!mb || !this.setPart(uid, 'mobo', mb.id)) return false;
    }
    if (!o.parts.cpu) { const c = this.partList('cpu').sort((a, b) => this.itemPrice(a) - this.itemPrice(b))[0]; if (!c || !this.setPart(uid, 'cpu', c.id)) return false; }
    if (!o.parts.psu) { const ps = this.fitPsu(o, this.rigGpuCap(o) * 160); if (!ps || !this.setPart(uid, 'psu', ps.id)) return false; }
    return true;
  }
  fillGpus(uid, gpuId) {
    const o = this.findObj(uid); if (!o || !o.parts?.mobo) return 0;
    const cap = this.rigGpuCap(o); let n = 0;
    const maxCap = Math.max(0, o.parts.psu ? PART[o.parts.psu].cap : 0, ...this.partList('psu').map((x) => x.cap)) * this.psuCount(o); // ohne Netzteil im Handel kein -Infinity
    while (o.parts.gpus.length < cap && this.canAfford(this.itemPrice(PART[gpuId]))) {
      if (this.rigWatt(o) + PART[gpuId].watt > maxCap) { this.toast(`Mehr GPUs schafft kein verfügbares Netzteil (max. ${maxCap} W).`, 'info'); break; }
      if (!this.setPart(uid, 'gpu', gpuId, o.parts.gpus.length)) break; n++;
    }
    if (o.parts.psu && this.rigWatt(o) > PART[o.parts.psu].cap * this.psuCount(o)) { const ps = this.fitPsu(o); if (ps && ps.id !== o.parts.psu) this.setPart(uid, 'psu', ps.id); }
    return n;
  }
  // Noch so einen: Rigs mit Teilen kommen fertig montiert (Montageaufschlag des Kontakts) oder als Bausatz (kit: Teile ins Lager)
  cloneCost(o, kit = false) {
    const def = PLACEABLE[o.type]; let c = this.itemPrice(def);
    if (o.parts) { for (const id of this.partIds(o)) c += this.itemPrice(PART[id]) * (id === o.parts.psu ? this.psuCount(o) : 1); }
    if (o.items) for (const it of o.items) c += this.itemPrice(PLACEABLE[it.id]);
    if (this.cloneRig(o) && !kit) c *= 1 + this.buildFee(o.type);
    return Math.round(c);
  }
  cloneRig(o) { return !!o?.parts && PLACEABLE[o.type]?.kind === 'rig' && this.partIds(o).length > 0; } // Rig mit Teilen: Kopie = fertig montierter Auftrag
  // Duplizieren nur mit Hardware, die es noch zu kaufen gibt: Name des ersten ausgelaufenen Teils, sonst null
  cloneBlocked(o) {
    const items = [PLACEABLE[o.type], ...(o.parts ? this.partIds(o).map((id) => PART[id]) : []), ...(o.items || []).map((it) => PLACEABLE[it.id])];
    const it = items.find((x) => x && !this.available(x)); return it ? it.name : null;
  }
  cloneObject(src, facId, x, z, rot, kit = false) {
    if (this.cloneBlocked(src)) return null;
    const rig = this.cloneRig(src); kit = kit && rig;
    if (rig && !kit && !this.readyOk(src.type)) return null; // fertig montiert erst über einen Kontakt
    const cost = this.cloneCost(src, kit); if (!this.canAfford(cost)) return null;
    if (!this.cloneStockOk(src)) return null; // Kontingent erschöpft
    const def = PLACEABLE[src.type];
    if (!this.slotOk(facId, def)) return null; // alle Stellplätze belegt
    const o = { uid: this.s.nextUid++, type: src.type, x, z, rot, coin: src.coin, broken: false, bought: this.s.day };
    if (src.parts) o.parts = kit ? { mobo: null, cpu: null, psu: null, gpus: [] } : JSON.parse(JSON.stringify(src.parts));
    if (kit) { const np = this.psuCount(src); for (const id of this.partIds(src)) { const n = id === src.parts.psu ? np : 1; this.bagAdd(id, n); this.freshAdd(id, n); } }
    if (src.items) o.items = src.items.map((i) => ({ id: i.id, b: 0 }));
    this.s.cash -= cost; this.s.stats.spentHW += cost; this.cloneStockOk(src, true);
    if (def.kind === 'device' && def.look !== 'fpga' && def.look !== 'usb') this.s.flags.boughtAsic = true;
    if (this.s.skills) this.addXp('hw', 10, true);
    this.s.fac[facId].objects.push(o); if (rig && !kit) this.contactOrder(src.type); this.dayUpdate(true); this.capWarn(facId); this.emit('objects', facId); if (kit) this.emit('bag'); return o;
  }
  // ---------- Schnell bauen & Stellplätze (Kern-Kreislauf: mehr Geräte → Standort voll → größerer Standort) ----------
  // Stellplätze: Rigs, Einzelgeräte und Halter (Regal, Rack, Container) brauchen je einen, Kühlung und Deko nicht
  slotKind(def) { const k = def?.kind; return k === 'rig' || k === 'device' || k === 'holder'; }
  slotsUsed(facId) { let n = 0; for (const o of this.s.fac[facId]?.objects || []) if (this.slotKind(PLACEABLE[o.type])) n++; return n; }
  slotsMax(facId) { return FACILITY[facId]?.slots ?? Infinity; }
  slotOk(facId, def) { return !this.slotKind(def) || this.slotsUsed(facId) < this.slotsMax(facId); }
  // Belegung eines Standorts: Plätze, Strom am aktuellen Anschluss; voll = alle Plätze belegt oder letzter Ausbau zu 95 % ausgelastet
  facCap(facId) {
    const fd = FACILITY[facId], f = this.s.fac[facId], sm = this.summary?.[facId];
    const used = this.slotsUsed(facId), max = this.slotsMax(facId), cf = this.fx('cap', facId);
    const capW = fd.power[f.power].kw * cf * 1000, maxW = fd.power[fd.power.length - 1].kw * cf * 1000, last = f.power >= fd.power.length - 1;
    const watt = sm && !sm.tripped ? sm.watt : 0, power = last && watt >= capW * 0.95;
    return { used, max, watt, capW, maxW, last, power, full: used >= max || power, fill: Math.min(1, Math.max(used / max, watt / (maxW * 0.95))) };
  }
  // Auslastung für Ziele: laufende Plätze (Rig mit GPU, Gerät, Halter anteilig nach Bestückung) bzw. Strom am letzten Ausbau
  facUse(facId) {
    let n = 0; for (const o of this.s.fac[facId]?.objects || []) { const d = PLACEABLE[o.type]; if (d.kind === 'device') n++; else if (d.kind === 'rig') n += this.pcReady(o) ? 1 : 0; else if (d.kind === 'holder') n += Math.min(1, (o.items?.length || 0) / d.slots); }
    const c = this.facCap(facId); return Math.min(1, Math.max(n / c.max, c.watt / c.maxW));
  }
  // Erstmals voll: kleiner Story-Moment (ui: 'facfull'), merkt sich den Tag in s.full
  checkFull(silent = false) {
    const s = this.s; if (!s.full || !s.flags?.miningStarted) return;
    for (const id of s.unlocked) {
      if (s.full[id] || !this.summary?.[id]) continue;
      const c = this.facCap(id); if (!c.full) continue;
      s.full[id] = s.day || 1; if (silent) continue;
      const t = FULL_TALK[id]; if (t) { const m = { id: 'full:' + id, day: s.day, from: t.from, text: t.text, read: false }; s.messages.push(m); }
      this.emit('facfull', id, c);
    }
  }
  // Fertig bestückter Rig: Rahmen + Mainboard (meiste Plätze) + günstigste CPU + passendes Netzteil + Grafikkarten.
  // Kartenmodell nach Amortisation des vollen Rigs (zum regulären Strompreis – Mamas Gratisstrom endet), dann so viele Karten, wie bezahlbar sind (mind. 1).
  readyRig(type, facId = this.s.current, budget = this.s.cash, ready = true, day = this.s.day) {
    const def = PLACEABLE[type]; if (def?.kind !== 'rig' || !this.available(def, day)) return null;
    const mbs = this.partList('mobo'), cpus = this.partList('cpu'), psus = this.partList('psu').sort((a, b) => a.cap - b.cap); if (!mbs.length || !cpus.length || !psus.length) return null;
    const pr = (it) => this.itemPrice(it, day), capOf = (m) => Math.min(m.slots, def.maxGpu), top = Math.max(...mbs.map(capOf));
    const mb = mbs.filter((m) => capOf(m) === top).sort((a, b) => pr(a) - pr(b))[0], cpu = [...cpus].sort((a, b) => pr(a) - pr(b))[0];
    const np = this.psuCount({ type }), baseW = 25 + mb.watt + cpu.watt, el = this.elecPrice(facId, day, true);
    const cfgFor = (gp, n) => { const ps = psus.find((x) => x.cap * np >= baseW + n * gp.watt); return ps ? { type, mobo: mb.id, cpu: cpu.id, psu: ps.id, gpu: gp.id, n } : null; };
    let best = null, bv = -Infinity;
    const gl = this.partList('gpu'), full = (gp) => { let n = top, c = null; while (n >= 1 && !(c = cfgFor(gp, n))) n--; return c; };
    // Belastungsprobe: halber Ertrag (die Schwierigkeit steigt) zum regulären Strompreis – so gewinnen sparsame Karten statt Ladenhüter
    const stress = (c) => { const st = this.buildStats(c, facId, ready, day, el), net = st.rev * 0.5 - (st.rev - st.net); return { net, roi: net > 0 ? st.price / net : Infinity }; };
    const rows = gl.map((gp) => { const c = full(gp); return c && { gp, c, t: stress(c) }; }).filter(Boolean);
    const score = (r) => (r.t.net > 0 ? 1e6 - r.t.roi : r.t.net); // erst rentabel, dann kürzeste Amortisation
    for (const r of rows) if (score(r) > bv) { bv = score(r); best = r; }
    // bezahlbare Alternative (mind. 1 Karte), wenn sie höchstens doppelt so lange zum Amortisieren braucht wie das beste Modell
    const one = (r) => { const c1 = cfgFor(r.gp, 1); return c1 && this.buildStats(c1, facId, ready, day).price <= budget; };
    if (best && !one(best)) { let alt = null; for (const r of rows) if (one(r) && r.t.net > 0 && (!(best.t.net > 0) || r.t.roi <= best.t.roi * 2) && (!alt || score(r) > score(alt))) alt = r; if (alt) best = alt; }
    best = best?.c;
    if (!best) return null;
    let out = null; for (let n = best.n; n >= 1; n--) { const c = cfgFor(PART[best.gpu], n); if (!c) continue; out = this.buildStats(c, facId, ready, day); if (out.price <= budget) break; }
    if (out && out.price > budget) out = this.buildStats(best, facId, ready, day); // nichts bezahlbar: den vollen Rig zeigen (mit „Dir fehlen …“)
    return out;
  }
  // Build = Gehäuse + Mainboard + CPU + Netzteil (bei 8er-Rahmen doppelt) + n gleiche GPUs
  buildParts(cfg) { const n = Math.max(0, Math.min(cfg.n || 0, this.buildCap(cfg))); return { mobo: cfg.mobo || null, cpu: cfg.cpu || null, psu: cfg.psu || null, gpus: cfg.gpu ? Array(n).fill(cfg.gpu) : [] }; }
  buildCap(cfg) { const def = PLACEABLE[cfg.type], mb = PART[cfg.mobo]; return def && mb ? Math.min(def.maxGpu, mb.slots) : 0; }
  buildStats(cfg, facId = this.s.current, ready = true, day = this.s.day, elec = null) {
    const def = PLACEABLE[cfg.type], parts = this.buildParts(cfg), np = this.psuCount({ type: cfg.type }), pr = (it) => (it ? this.itemPrice(it, day) : 0);
    const ids = [parts.mobo, parts.cpu, ...parts.gpus].filter(Boolean), watt = 25 + ids.reduce((a, id) => a + (PART[id].watt || 0), 0), cap = parts.psu ? PART[parts.psu].cap * np : 0;
    const kit = pr(def) + ids.reduce((a, id) => a + pr(PART[id]), 0) + pr(PART[parts.psu]) * np, price = Math.round(ready ? kit * (1 + this.buildFee(cfg.type)) : kit);
    const hash = {}; for (const id of [parts.cpu, ...parts.gpus].filter(Boolean)) for (const [a, v] of Object.entries(PART[id].hash)) hash[a] = (hash[a] || 0) + v;
    const vram = parts.gpus.length ? Math.min(...parts.gpus.map((id) => PART[id].vram)) : 99, ok = !!(parts.mobo && parts.cpu && parts.psu) && watt <= cap;
    const coin = ok ? this.bestCoin(hash, vram, day) : null, rev = coin ? this.revenueFor(hash, coin, vram, day) : 0, w = Math.round(watt * this.fx('rigPower')), net = rev - (w / 1000) * 24 * (elec ?? this.elecPrice(facId, day, true)); // Katalog: regulärer Strompreis (Mamas Gratisstrom endet bald)
    const why = !parts.mobo ? 'Mainboard fehlt' : !parts.cpu ? 'Prozessor fehlt' : !parts.psu ? 'Netzteil fehlt' : watt > cap ? `Netzteil zu schwach (${watt} W > ${cap} W)` : '';
    return { ...cfg, n: parts.gpus.length, parts, np, price, kit: Math.round(kit), rev, net, watt: w, cap, coin, hash, ok, why, ready, roi: net > 0 ? price / net : Infinity, template: { type: cfg.type, rot: 0, coin: 'auto', parts } };
  }
  buildBlocked(cfg) { const items = [PLACEABLE[cfg.type], ...[cfg.mobo, cfg.cpu, cfg.psu, cfg.n > 0 ? cfg.gpu : null].filter(Boolean).map((id) => PART[id])]; const it = items.find((x) => !x || !this.available(x)); return it ? it.name || 'Teil' : null; }
  // Build platzieren: fertig montiert (Teile drin, +10 %) oder als Bausatz (leeres Gehäuse, Teile ins Lager)
  placeBuild(cfg, facId, x, z, rot, ready = true) {
    const def = PLACEABLE[cfg.type]; if (def?.kind !== 'rig' || this.buildBlocked(cfg) || !this.slotOk(facId, def)) return null;
    if (ready && !this.readyOk(cfg.type)) return null; // fertig montiert erst über einen Kontakt (Kemal, Jonas)
    const st = this.buildStats(cfg, facId, ready); if (ready && !st.ok) return null;
    if (!this.canAfford(st.price)) return null;
    const o = { uid: this.s.nextUid++, type: cfg.type, x, z, rot, coin: 'auto', broken: false, bought: this.s.day, parts: ready ? JSON.parse(JSON.stringify(st.parts)) : { mobo: null, cpu: null, psu: null, gpus: [] } };
    if (!ready) { const p = st.parts; for (const id of [p.mobo, p.cpu, ...p.gpus]) if (id) { this.bagAdd(id, 1); this.freshAdd(id, 1); } if (p.psu) { this.bagAdd(p.psu, st.np); this.freshAdd(p.psu, st.np); } }
    this.s.cash -= st.price; this.s.stats.spentHW += st.price; if (this.s.skills) this.addXp('hw', 10, true);
    this.s.lastBuild = { type: cfg.type, mobo: cfg.mobo, cpu: cfg.cpu, psu: cfg.psu, gpu: cfg.gpu, n: st.n, ready };
    this.s.fac[facId].objects.push(o); if (ready) this.contactOrder(cfg.type); this.dayUpdate(true); this.capWarn(facId); this.emit('objects', facId); if (!ready) this.emit('bag'); return o;
  }
  // ---------- Kontakte: fertig montierte Hardware gibt es erst über Leute, die man kennenlernt (src/data/contacts.js) ----------
  contactState(id) { return this.s.contacts?.[id] || null; }
  contactMet(id) { return !!this.s.contacts?.[id]?.met; }
  contactOn(id) { return !!this.s.contacts?.[id]?.on; }
  readyBy(type) { return READY_BY[type] || null; } // wer liefert diesen Typ fertig bestückt?
  readyOk(type) { const c = READY_BY[type]; return !c || this.contactOn(c); } // Typen ohne Kontakt: immer
  contactTier(id) { const n = this.s.contacts?.[id]?.n || 0; let t = 0; for (let i = 0; i < FEE_TIERS.length; i++) if (n >= FEE_TIERS[i].n) t = i; return t; }
  buildFee(type) { const c = READY_BY[type]; return c ? FEE_TIERS[this.contactTier(c)].fee : BUILD_FEE; }
  // Meldet er sich jetzt? (Ereignis-Bedingung): noch nicht kennengelernt, möglich, und selbst gebaut oder spätestens am Stichtag
  contactDue(id) { const c = CONTACT[id], s = this.s; return !!c && !this.contactMet(id) && c.can(s, this) && (c.trigger(s, this) || s.day >= c.due(s)); }
  // Kennenlernen: save = Nummer gespeichert (sonst später über die Kontaktliste anrufen)
  meetContact(id, save = true) {
    const c = CONTACT[id]; if (!c) return false; const st = ((this.s.contacts ||= {})[id] ||= { met: 0, on: 0, n: 0 });
    st.met ||= this.s.day || 1;
    if (save && !st.on) { st.on = this.s.day || 1; this.s.messages.push({ id: `ct:${id}:hi`, day: this.s.day, from: c.name, text: c.lines.hello, read: true }); } // die Antwort im Ereignis zeigt die Zeile schon
    this.emit('contact', id); return true;
  }
  callContact(id) {
    const st = this.s.contacts?.[id], c = CONTACT[id]; if (!c || !st?.met || st.on) return false;
    st.on = this.s.day || 1; this.contactMsg(id, c.lines.call); this.logStory('contact', `${c.name} (${c.biz}) angerufen – liefert jetzt fertig montiert`);
    this.emit('contact', id); return true;
  }
  contactMsg(id, text) { const c = CONTACT[id]; if (!c || !text) return; const m = { id: `ct:${id}:${this.s.day}:${Math.random().toString(36).slice(2, 6)}`, day: this.s.day, from: c.name, text, read: false }; this.s.messages.push(m); this.emit('message', m); }
  // Fertig montierter Auftrag: zählt für den Stammkunden-Rabatt; erste Lieferung, Rabattstufen und jede 5. Lieferung mit Nachricht
  contactOrder(type) {
    const id = READY_BY[type], st = id && this.s.contacts?.[id]; if (!st) return;
    const t0 = this.contactTier(id); st.n = (st.n || 0) + 1; const t1 = this.contactTier(id), L = CONTACT[id].lines;
    if (t1 > t0) this.contactMsg(id, L.tier[t1]);
    else if (st.n === 1) this.contactMsg(id, L.first);
    else if (st.n % 5 === 0) this.contactMsg(id, L.order[(st.n / 5 - 1) % L.order.length]);
  }
  // Alte Spielstände (ohne s.contacts): wer schon so weit ist oder fertige Geräte gekauft hat, kennt die Leute schon – still, ohne Ereignis
  migrateContacts(s) {
    const lb = s.lastBuild, kinds = (types) => { let n = 0; for (const f of Object.values(s.fac || {})) for (const o of f.objects || []) if (types.includes(o.type) && o.parts && (o.parts.gpus?.length || o.parts.mobo)) n++; return n; };
    const kemal = s.chapter >= 1 || s.day >= CONTACT.kemal.due(s) || kinds(CONTACTS.flatMap((c) => c.types)) >= 2 || !!lb?.ready;
    const jonas = s.chapter >= 2 || (s.unlocked.includes('keller') && s.day >= CONTACT.jonas.due(s)) || kinds(CONTACT.jonas.types) > 0 || (!!lb?.ready && CONTACT.jonas.types.includes(lb.type));
    for (const [id, on] of [['kemal', kemal], ['jonas', jonas]]) if (on) { s.contacts[id] = { met: s.day || 1, on: s.day || 1, n: 0 }; s.ev.done[CONTACT[id].intro] = 'migr'; }
  }
  // ---------- Teile-Lager: kaufen, einbauen, ausbauen, tauschen, verkaufen ----------
  bagN(id) { return this.s.bag?.[id] || 0; }
  bagAdd(id, n = 1) { const b = (this.s.bag ||= {}); b[id] = (b[id] || 0) + n; if (b[id] <= 0) delete b[id]; }
  bagList(type = null) { return Object.entries(this.s.bag || {}).filter(([id, n]) => n > 0 && PART[id] && (!type || PART[id].type === type)).map(([id, n]) => ({ id, n, part: PART[id] })).sort((a, b) => b.part.releaseDay - a.part.releaseDay); }
  // Schrauben-EP gibt es nur für neu gekaufte Teile (sonst ließe sich durch Aus- und Einbauen endlos EP sammeln)
  freshAdd(id, n) { const f = (this.s.fresh ||= {}); f[id] = Math.max(0, (f[id] || 0) + n); if (!f[id]) delete f[id]; }
  bagCount() { let n = 0; for (const v of Object.values(this.s.bag || {})) n += v; return n; }
  partResale(id) { return Math.round(this.itemPrice(PART[id]) * 0.5); }
  bagValue() { let v = 0; for (const [id, n] of Object.entries(this.s.bag || {})) if (PART[id] && n > 0) v += this.partResale(id) * n; return v; }
  buyPart(id, n = 1) {
    const it = PART[id]; if (!it || !this.available(it)) return 0; const p = this.itemPrice(it); let k = 0;
    while (k < n && this.canAfford(p)) { this.s.cash -= p; this.s.stats.spentHW += p; this.bagAdd(id, 1); this.freshAdd(id, 1); k++; }
    if (k) { if (this.s.skills) this.addXp('hw', 3 * k, true); this.emit('bag'); }
    return k;
  }
  sellPart(id, n = 1) { const k = Math.min(n, this.bagN(id)); if (k <= 0) return 0; const v = this.partResale(id) * k; this.s.cash += v; this.bagAdd(id, -k); if ((this.s.fresh?.[id] || 0) > this.bagN(id)) this.freshAdd(id, this.bagN(id) - this.s.fresh[id]); this.emit('bag'); return v; }
  // Warum passt das Teil nicht? '' = passt
  installWhy(o, id, idx = null) {
    const it = PART[id], p = o?.parts; if (!it || !p) return 'Passt nicht';
    if (this.bagN(id) < (it.type === 'psu' ? this.psuCount(o) : 1)) return it.type === 'psu' && this.psuCount(o) > 1 ? `Dieser Rahmen braucht ${this.psuCount(o)} Netzteile` : 'Nicht im Lager';
    if ((it.type === 'cpu' || it.type === 'gpu') && !p.mobo) return 'Erst ein Mainboard einbauen';
    if (it.type === 'gpu' && (idx == null || !p.gpus[idx]) && p.gpus.length >= this.rigGpuCap(o)) return 'Alle Steckplätze belegt';
    return '';
  }
  installPart(uid, id, idx = null) {
    const o = this.findObj(uid); if (!o?.parts || this.installWhy(o, id, idx)) return false;
    const it = PART[id], p = o.parts, n = it.type === 'psu' ? this.psuCount(o) : 1;
    if (it.type === 'gpu') { if (idx != null && p.gpus[idx]) this.bagAdd(p.gpus.splice(idx, 1)[0], 1); p.gpus.push(id); if (this.s.flags.miningStarted) this.s.flags.boughtGpu = true; } // neue Karte kommt hinten dazu (Einbau-Animation)
    else {
      if (p[it.type]) this.bagAdd(p[it.type], n);
      p[it.type] = id;
      if (it.type === 'mobo') { const cap = this.rigGpuCap(o); while (p.gpus.length > cap) this.bagAdd(p.gpus.pop(), 1); }
    }
    this.bagAdd(id, -n); const fresh = (this.s.fresh?.[id] || 0) > 0; if (fresh) this.freshAdd(id, -n);
    if (!this.s.flags.miningStarted && o.type === 'tower' && this.pcReady(o)) this.s.flags.pcBuilt = true;
    if (this.s.skills && fresh) this.addXp('hw', 15);
    this.dayUpdate(true); if (it.type === 'gpu') this.capWarn(this.facOf(uid)); this.emit('objects', this.facOf(uid)); this.emit('bag'); return true;
  }
  // Ausbauen: Teil zurück ins Lager. Ohne Mainboard kommen auch CPU und Karten raus; ohne Pflichtteil steht das Gerät still
  removePart(uid, slot, idx = 0) {
    const o = this.findObj(uid), p = o?.parts; if (!p) return false;
    if (slot === 'gpu') { if (!p.gpus[idx]) return false; this.bagAdd(p.gpus.splice(idx, 1)[0], 1); }
    else {
      if (!p[slot]) return false;
      this.bagAdd(p[slot], slot === 'psu' ? this.psuCount(o) : 1); p[slot] = null;
      if (slot === 'mobo') { if (p.cpu) { this.bagAdd(p.cpu, 1); p.cpu = null; } while (p.gpus.length) this.bagAdd(p.gpus.pop(), 1); }
    }
    this.dayUpdate(true); this.emit('objects', this.facOf(uid)); this.emit('bag'); return true;
  }
  // Kosten/Ertrag eines Geräts am Standort (Katalog): Netto pro Tag und Amortisation in Tagen
  devOffer(def, facId = this.s.current, day = this.s.day) {
    const h = { [def.algo]: def.hash * this.fx('asicHash') }, c = this.bestCoin(h, def.vram || 99, day), rev = c ? this.revenueFor(h, c, def.vram || 99, day) : 0;
    const net = rev - (def.watt * this.fx('asicPower') / 1000) * 24 * this.elecPrice(facId, day, true), price = this.itemPrice(def, day);
    return { price, rev, net, coin: c, roi: net > 0 ? price / net : Infinity };
  }
  holderAdd(uid, devId, n = 1) {
    const o = this.findObj(uid); if (!o || !o.items) return 0;
    const def = PLACEABLE[o.type], dev = PLACEABLE[devId]; if (!dev) return 0;
    const price = this.itemPrice(dev);
    let added = 0;
    n = Math.min(n, this.stockLeft(dev)); // Kontingent
    while (added < n && o.items.length < def.slots && this.canAfford(price)) {
      o.items.push({ id: devId, b: 0 }); this.s.cash -= price; this.s.stats.spentHW += price; added++;
    }
    this.stockUse(dev, added);
    if (added) { if (dev.look !== 'fpga' && dev.look !== 'usb') this.s.flags.boughtAsic = true; this.dayUpdate(true); this.capWarn(this.facOf(uid)); this.emit('objects', this.facOf(uid)); }
    return added;
  }
  holderRemove(uid, idx) {
    const o = this.findObj(uid); if (!o || !o.items[idx]) return;
    const it = o.items[idx];
    this.s.cash += Math.round(this.itemPrice(PLACEABLE[it.id]) * (it.b ? 0.2 : 0.5));
    o.items.splice(idx, 1); this.dayUpdate(true); this.emit('objects', this.facOf(uid));
  }
  holderSellAll(uid, devId) {
    const o = this.findObj(uid); if (!o) return;
    for (let i = o.items.length - 1; i >= 0; i--) if (!devId || o.items[i].id === devId) { const it = o.items[i]; this.s.cash += Math.round(this.itemPrice(PLACEABLE[it.id]) * (it.b ? 0.2 : 0.5)); o.items.splice(i, 1); }
    this.dayUpdate(true); this.emit('objects', this.facOf(uid));
  }
  repairCost(o) {
    if (o.items) { let c = 0; for (const it of o.items) if (it.b) c += this.itemPrice(PLACEABLE[it.id]) * 0.08; return Math.round(c * this.fx('repair')); }
    let base = this.itemPrice(PLACEABLE[o.type]);
    if (o.parts) for (const pid of this.partIds(o)) base += this.itemPrice(PART[pid]);
    return Math.max(5, Math.round(base * 0.08 * this.fx('repair')));
  }
  brokenIn(facId) { let n = 0, c = 0; for (const o of this.s.fac[facId].objects) { if (o.broken || (o.items && o.items.some((i) => i.b))) { n++; c += this.repairCost(o); } } return { n, c }; }
  repairAll(facId) { let n = 0; for (const o of this.s.fac[facId].objects) if ((o.broken || (o.items && o.items.some((i) => i.b))) && this.repair(o.uid)) n++; return n; }
  repair(uid) {
    const o = this.findObj(uid); if (!o) return false;
    const c = this.repairCost(o); if (!this.canAfford(c)) return false;
    this.s.cash -= c; o.broken = false; if (o.items) o.items.forEach((it) => (it.b = 0));
    this.dayUpdate(true); this.emit('objects', this.facOf(uid)); return true;
  }

  // ---------- Geräte-Analyse ----------
  // Liefert pro Objekt: {watt, units:[{hash, vram, coin, rev, algo}], cool, heat, status}
  analyze(o, day = this.s.day, elec = null) {
    const def = PLACEABLE[o.type];
    if (o.mode === 'off' && def.kind !== 'decor') return { watt: 0, cool: 0, heat: 0, units: [], status: 'off', note: 'Ausgeschaltet' };
    const r = { watt: 0, cool: 0, heat: 0, units: [], status: 'ok', note: '' };
    if (def.kind === 'rig') {
      const p = o.parts;
      if (!p.mobo || !p.cpu || !p.psu) { r.status = 'incomplete'; r.note = 'Mainboard, CPU und Netzteil nötig'; return r; }
      const parts = this.partIds(o).map((id) => PART[id]);
      r.watt = 25 + parts.reduce((a, x) => a + (x.watt || 0), 0);
      const cap = PART[p.psu].cap * this.psuCount(o);
      const rigPow = this.fx('rigPower');
      if (r.watt > cap) { r.status = 'psu'; r.note = `Netzteil überlastet (${r.watt} W > ${cap} W)`; r.watt = 0; return r; }
      if (o.broken) { r.status = 'broken'; r.watt = 0; return r; }
      r.watt = Math.round(r.watt * rigPow);
      const hash = {}; let vram = 99;
      for (const id of p.gpus) { const g = PART[id]; for (const [a, h] of Object.entries(g.hash)) hash[a] = (hash[a] || 0) + h; vram = Math.min(vram, g.vram); }
      const cpuH = PART[p.cpu].hash;
      // GPUs + CPU (CPU zählt bei SHA-256/CN/RX mit)
      for (const [a, h] of Object.entries(cpuH)) hash[a] = (hash[a] || 0) + h;
      if (!p.gpus.length) vram = 99;
      r.units.push({ hash, vram, w: r.watt });
      r.heat = r.watt;
    } else if (def.kind === 'device') {
      if (o.broken) { r.status = 'broken'; return r; }
      const ap = this.fx('asicPower'), ah = this.fx('asicHash');
      r.watt = def.watt * ap; r.heat = r.watt;
      r.units.push({ hash: { [def.algo]: def.hash * ah }, vram: def.vram || 99, w: r.watt });
    } else if (def.kind === 'holder') {
      let broken = 0;
      const groups = {};
      for (const it of o.items) { if (it.b) { broken++; continue; } (groups[it.id] ||= 0); groups[it.id]++; }
      for (const [id, n] of Object.entries(groups)) {
        const d = PLACEABLE[id]; const ap = this.fx('asicPower'), ah = this.fx('asicHash');
        r.watt += d.watt * n * ap;
        r.units.push({ hash: { [d.algo]: d.hash * n * ah }, vram: d.vram || 99, w: d.watt * n * ap, n });
      }
      r.heat = def.selfCooled ? r.watt * 0.03 : r.watt;
      if (def.selfCooled) r.watt *= 1.06; // Pumpen/Lüfter
      if (broken) { r.status = broken === o.items.length ? 'broken' : 'partial'; r.note = `${broken} Gerät(e) defekt`; }
      if (!o.items.length) { r.status = 'empty'; r.note = 'Leer – Geräte einsetzen'; }
    } else if (def.kind === 'cooling') {
      r.watt = def.watt; r.cool = def.cool * this.fx('cool'); r.heat = def.watt;
    }
    // Coin-Wahl
    for (const u of r.units) {
      const coin = o.coin === 'auto' ? this.bestCoin(u.hash, u.vram, day) : o.coin;
      u.coin = coin;
      u.rev = coin ? this.revenueFor(u.hash, coin, u.vram, day) : 0;
      u.algo = coin ? this.coinAlgo(coin, day) : null;
      u.h = coin ? (u.hash[u.algo] || 0) : 0;
      if (coin && !this.dagOk(u.vram, coin, day)) u.note = 'Zu wenig VRAM für DAG';
    }
    // Auto-Betrieb: unrentable Einheiten pausieren
    if (elec != null && (o.mode || 'auto') === 'auto' && r.units.length) {
      let idle = 0;
      for (const u of r.units) {
        const cost = (u.w / 1000) * 24 * elec * (def.selfCooled ? 1.06 : 1);
        if (u.rev < cost) { u.idle = true; r.watt -= u.w * (def.selfCooled ? 1.06 : 1); u.potential = u.rev; u.rev = 0; u.h = 0; idle++; }
      }
      if (idle) {
        r.watt = Math.max(0, r.watt); r.heat = def.selfCooled ? r.watt * 0.03 : r.watt;
        if (idle === r.units.length && (r.status === 'ok' || r.status === 'partial')) { r.status = 'idle'; r.note = 'Pausiert: Strom teurer als Ertrag'; }
      }
    }
    return r;
  }

  // Facility-Zusammenfassung
  facSummary(facId, day = this.s.day) {
    const f = this.s.fac[facId], fd = FACILITY[facId];
    let watt = 0, heat = 0, cool = fd.baseCool * this.fx('cool', facId), rev = 0; const per = new Map(); const hashByAlgo = {};
    const elecP = this.elecPrice(facId, day);
    let coolCap = 0, coolW = 0; const coolers = [];
    for (const o of f.objects) per.set(o.uid, f.mothball ? { watt: 0, cool: 0, heat: 0, units: [], status: 'off', note: 'Eingemottet' } : this.analyze(o, day, elecP));
    this.autoLimit(facId, per, elecP, day);
    for (const o of f.objects) {
      const a = per.get(o.uid);
      if (PLACEABLE[o.type].kind === 'cooling') { coolCap += a.cool; coolW += a.watt; coolers.push(a); continue; }
      watt += a.watt; heat += a.heat;
      for (const u of a.units) { rev += u.rev; if (u.algo) hashByAlgo[u.algo] = (hashByAlgo[u.algo] || 0) + u.h; }
    }
    // Thermostat: Kühlgeräte laufen nur so stark wie nötig
    const util = coolCap ? Math.min(1, Math.max(0.05, (heat - fd.baseCool * 0.6) / coolCap)) : 0;
    for (const a of coolers) { a.watt *= util; a.heat = a.watt; a.util = util; }
    watt += coolW * util; heat += coolW * util; cool += coolCap;
    cool = cool * this.upFx(facId, 'coolMul') + this.upFx(facId, 'coolAdd', true); // Ausbauten
    const capKw = fd.power[f.power].kw * this.fx('cap', facId);
    const ambient = 21 + fd.ambient + seasonOffset(day) * (fd.style === 'basement' ? 0.4 : 1);
    const tripped = watt / 1000 > capKw;
    const temp = tripped ? ambient : ambient + 12 * (heat / Math.max(1, cool)); // Sicherung raus: nichts läuft, keine Abwärme
    const throttle = (temp > 38 ? Math.max(0.35, 1 - (temp - 38) * 0.05) : 1) * this.fx('hash', facId);
    const elec = this.elecPrice(facId, day);
    return { watt, heat, cool, rev, per, capKw, tripped, temp, throttle, elec, hashByAlgo };
  }
  // Auto-Betrieb: nur so viele Geräte hochfahren, wie Anschluss und Kühlung hergeben – rentabelste zuerst,
  // Drosselung durch Hitze zählt mit. Der Rest pausiert ('full' = Anschluss voll, sonst zu heiß).
  autoLimit(facId, per, elec, day) {
    const f = this.s.fac[facId], fd = FACILITY[facId];
    const capW = fd.power[f.power].kw * this.fx('cap', facId) * 1000, cool0 = fd.baseCool * this.fx('cool', facId), fxh = this.fx('hash', facId);
    const ambient = 21 + fd.ambient + seasonOffset(day) * (fd.style === 'basement' ? 0.4 : 1);
    let W = 0, H = 0, R = 0, coolCap = 0, coolW = 0; const cand = [];
    for (const o of f.objects) {
      const a = per.get(o.uid), def = PLACEABLE[o.type];
      if (def.kind === 'cooling') { coolCap += a.cool; coolW += a.watt; continue; }
      const auto = (o.mode || 'auto') === 'auto', sc = !!def.selfCooled; let aw = a.watt, ah = a.heat;
      for (const u of a.units) {
        if (!auto || u.idle) { R += u.rev; continue; }
        const we = u.w * (sc ? 1.06 : 1), he = sc ? u.w * 0.03 : u.w;
        cand.push({ a, u, we, he, n: u.n || 1, rev: u.rev, cost: (we / 1000) * 24 * elec }); aw -= we; ah -= he;
      }
      W += Math.max(0, aw); H += Math.max(0, ah);
    }
    if (!cand.length) return;
    const util = (h) => (coolCap ? Math.min(1, Math.max(0.05, (h - fd.baseCool * 0.6) / coolCap)) : 0);
    const thr = (h) => { const t = ambient + 12 * ((h + coolW * util(h)) / Math.max(1, cool0 + coolCap)); return t > 38 ? Math.max(0.35, 1 - (t - 38) * 0.05) : 1; };
    cand.sort((x, y) => (y.rev - y.cost) / (y.we || 1) - (x.rev - x.cost) / (x.we || 1));
    let t0 = thr(H);
    for (const c of cand) {
      // Wie viele Geräte der Einheit dürfen laufen? (Regal/Container: auch nur ein Teil)
      const room = capW - W - coolW * util(H + c.he), jmax = c.we <= room ? c.n : c.n > 1 ? Math.floor((c.n * Math.max(0, room)) / c.we) : 0;
      const gain = (j) => { const kk = j / c.n; return (R + c.rev * kk) * thr(H + c.he * kk) * fxh - c.cost * kk - R * t0 * fxh; };
      let j = jmax;
      if (j > 0 && gain(j) < 0) { let best = 0; j = 0; for (let i = 1; i < jmax; i++) { const gi = gain(i); if (gi > best) { best = gi; j = i; } } }
      const k = j / c.n, why = j < jmax ? 'heat' : jmax < c.n ? 'full' : '';
      if (k > 0) { W += c.we * k; H += c.he * k; R += c.rev * k; t0 = thr(H); }
      if (k >= 1) continue;
      const a = c.a, u = c.u; a.watt = Math.max(0, a.watt - c.we * (1 - k)); a.heat = Math.max(0, a.heat - c.he * (1 - k));
      if (k > 0) { u.rev *= k; u.h *= k; u.part = k; } else { u.idle = true; u.potential = u.rev; u.rev = 0; u.h = 0; }
      a.limit = a.limit === 'full' ? 'full' : why;
    }
    for (const a of per.values()) {
      if (!a.limit) continue;
      if (a.units.every((u) => u.idle) && (a.status === 'ok' || a.status === 'partial')) { a.status = a.limit === 'full' ? 'full' : 'idle'; a.note = a.limit === 'full' ? 'Pausiert: Anschluss voll' : 'Pausiert: zu heiß, Drosselung frisst den Ertrag'; }
      else if (!a.note) a.note = a.limit === 'full' ? 'Teilweise pausiert: Anschluss voll' : 'Teilweise pausiert: zu heiß';
    }
  }
  // Warnung beim Kauf: Volllast (alle Geräte an) übersteigt den Anschluss
  capWarn(facId) {
    const f = this.s.fac[facId], fd = FACILITY[facId], sm = this.summary?.[facId]; if (!f || !sm) return;
    let w = 0;
    for (const o of f.objects) { const a = sm.per.get(o.uid), def = PLACEABLE[o.type]; if (!a) continue; if (def.kind === 'cooling') { w += a.status === 'off' ? 0 : def.watt; continue; } w += a.watt; for (const u of a.units) if (u.idle || u.part) w += u.w * (u.idle ? 1 : 1 - u.part) * (def.selfCooled ? 1.06 : 1); }
    const cap = fd.power[f.power].kw * this.fx('cap', facId) * 1000; this.capWarned ||= {};
    if (w <= cap) { delete this.capWarned[facId]; return; }
    if (this.capWarned[facId] && w < this.capWarned[facId] * 1.5) return; // erst bei deutlich mehr Last erneut warnen
    this.capWarned[facId] = w;
    this.toast(`Volllast ${fmtWatt(w)} – mehr als der Anschluss (${fmtWatt(cap)}). Im Auto-Betrieb laufen nur so viele Geräte, wie Strom da ist.`, 'info', 7000);
  }

  // ---------- Kennzahlen ----------
  algoHash(algo) { let h = 0; for (const id of this.s.unlocked) { const sm = this.summary[id]; if (sm && !sm.tripped) h += (sm.hashByAlgo[algo] || 0) * sm.throttle; } return h; }
  walletValue() { let v = 0; for (const c of COINS) { const w = this.s.wallet[c.id]; v += (w.ex + w.cold) * this.price(c.id); } return v; }
  hardwareValue() { let v = this.bagValue(); for (const f of Object.values(this.s.fac)) for (const o of f.objects) v += this.objectValue(o); return v; }
  netWorth() { return this.s.cash + this.walletValue() + this.hardwareValue() - (this.s.loan || 0); }
  monolithHash(day = this.s.day) { return day < toDay('2014-03-01') ? 0 : BTC_HASH(Math.min(day, LAST_DATA_DAY)) * MONOLITH_SHARE(day) * (this.s.endless ? this.s.endless.BTC.h : 1) * this.fx('monolith'); }
  dailyProfit() { let rev = 0, cost = 0; for (const id of this.s.unlocked) { const sm = this.summary[id]; if (!sm) continue; if (!sm.tripped) { rev += sm.rev * sm.throttle; cost += Math.max(0, sm.watt / 1000 * 24 - this.solarKwh(id)) * sm.elec; } cost += FACILITY[id].rent / 30.4 * this.fx('rent', id); } cost += this.staffMonthly() / 30.4 + this.extraDaily(this.s.day, true); for (const md of this.s.mods || []) if (md.key === 'monthly' && this.s.day < md.until) cost += md.mult / 30.4; if (this.s.loan > 0) cost += this.s.loan * this.loanRate() / 365; return { rev, cost, net: rev - cost }; }
  techSalary(day = this.s.day) { return Math.round(2600 * Math.pow(1.03, (day - toDay('2014-01-01')) / 365)); }
  techCoverage() { let n = 0; for (const id of this.s.unlocked) for (const o of this.s.fac[id].objects) { const def = PLACEABLE[o.type]; if (def.kind === 'holder') n += o.items.length; else if (def.kind !== 'decor' && def.kind !== 'cooling') n++; } return n ? Math.min(1, this.techCap() / n) : 1; }

  // Zusammenfassungen für alle Standorte neu berechnen
  dayUpdate(silent = false) {
    this.summary = {};
    for (const id of this.s.unlocked) this.summary[id] = this.facSummary(id);
    if (this.s.feat) { this.checkFull(); this.checkFeatures(); this.checkGoals(); }
    if (!silent) this.emit('update');
    else this.emit('refresh');
  }

  // ---------- Zeit ----------
  advanceDay() {
    const s = this.s;
    s.day++;
    if (s.day > LAST_DATA_DAY) this.endlessStep();
    this.checkFeatures();
    const day = s.day;
    // Gutschrift nur für den Teil des Tages, der noch nicht gutgeschrieben ist (erster Tag ab dem Einschalten, vorab verkaufte Anteile)
    const D = day - 1, minedByCoin = {}, f0 = s.mineDay0 === D ? s.mineFrac0 || 0 : 0, startK = Math.max(0, 1 - f0);
    // Vorab gutgeschrieben wurde nur der behaltene Anteil eines Coins (s.accr.coin) – Auto-Verkauf und andere Coins laufen voll weiter
    const accrC = s.accr?.day === D ? s.accr.coin || 'BTC' : null, keepK = (c) => (c === accrC && startK > 0 ? Math.max(0, 1 - Math.max(f0, s.accr.f || 0)) / startK : 1);
    let elecCost = 0;
    const netOwn = {}, perH = {}, coinPerH = (c) => (perH[c] ??= COIN[c].emission(day) * this.fx('rev') / (this.netHash(c, day) + (s.lastNet[c] || 0))); // je Coin einmal pro Tag
    for (const id of s.unlocked) {
      const f = s.fac[id], sm = this.facSummary(id, day);
      const wasTripped = f.tripped;
      f.tripped = sm.tripped; f.temp = sm.temp;
      if (sm.tripped && !wasTripped) { this.toast(`Sicherung raus! ${(sm.watt / 1000).toFixed(1)} von ${sm.capKw} kW`, 'bad', 9000); s.flags.everTripped = true; }
      if (!sm.tripped && wasTripped) this.toast(`Strom in „${FACILITY[id].name}" wieder da`, 'good');
      if (sm.tripped) continue;
      elecCost += Math.max(0, (sm.watt / 1000) * 24 - this.solarKwh(id, day)) * sm.elec;
      for (const o of f.objects) {
        const a = sm.per.get(o.uid);
        for (const u of a.units) {
          if (!u.coin || !u.rev) continue;
          const c = u.coin;
          const coins = u.h * sm.throttle * coinPerH(c) * startK;
          minedByCoin[c] = (minedByCoin[c] || 0) + coins;
          netOwn[c] = (netOwn[c] || 0) + u.h * sm.throttle;
          if (c === 'LTC' && day >= COIN.DOGE.mergedFrom) { const w = (u.h * sm.throttle) / (this.netHash('DOGE', day) + (s.lastNet.DOGE || 0)) * COIN.DOGE.emission(day); minedByCoin.DOGE = (minedByCoin.DOGE || 0) + w; netOwn.DOGE = (netOwn.DOGE || 0) + u.h * sm.throttle; }
        }
        // Defekte (nur laufende Geräte verschleißen)
        if (a.watt > 0) this.wear(o, sm.temp, day);
      }
    }
    s.lastNet = netOwn;
    // Defekte des Tages: höchstens eine Meldung
    if (this.broke?.length) { const br = this.broke; this.broke = null; for (const fid of new Set(br.map((o) => this.facOf(o.uid)))) this.emit('objects', fid); this.toast(br.length === 1 ? `${PLACEABLE[br[0].type].name} ist kaputt!` : `${br.length} Geräte kaputt${s.staff.tech ? ' – die Techniker reparieren …' : ' – reparieren nicht vergessen'}`, 'bad'); }
    // Coins gutschreiben & Auto-Verkauf
    let sold = 0, minedUSD = 0;
    s.stats.coins ||= {};
    for (const [c, n] of Object.entries(minedByCoin)) {
      const p = this.price(c, day); minedUSD += n * p; s.stats.coins[c] = (s.stats.coins[c] || 0) + n;
      const sell = this.traderSell(c, n * s.autoSell[c], p, day);
      sold += sell * p * (s.skills ? 1 - this.tradeFee() : 1);
      const keep = c === accrC && s.accr.n != null ? Math.max(0, n - sell - s.accr.n) : (n - sell) * keepK(c); // vorab Gutgeschriebenes abziehen
      if (s.payoutCold) s.wallet[c].cold += keep; else s.wallet[c].ex += keep;
    }
    s.cash += sold - elecCost;
    s.stats.minedUSD += minedUSD; s.stats.sold += sold; s.stats.elec += elecCost;
    if (minedUSD > 0 && s.skills) this.addXp('mining', 6, true);
    // Fixkosten
    let fixed = 0;
    for (const id of s.unlocked) fixed += FACILITY[id].rent / 30.4 * this.fx('rent', id);
    for (const md of s.mods) if (md.key === 'monthly' && day < md.until) fixed += md.mult / 30.4; // laufende Kosten/Erträge aus Ereignissen (negativ = Einnahme)
    fixed += this.staffMonthly(day) / 30.4 + this.extraDaily(day); // Personal, Ausbauten, Umschuldung
    if (s.loan > 0) fixed += (s.loan * this.loanRate(day)) / 365;
    s.cash -= fixed;
    if (!Number.isFinite(s.cash)) s.cash = 0;
    if (s.cash < 0) {
      // Automatisch Coins von der Börse verkaufen, um das Minus auszugleichen
      let need = -s.cash + 50; const fk = 1 - (s.skills ? this.tradeFee() : 0.005);
      for (const c of COINS) { const w = s.wallet[c.id], p = this.price(c.id, day); if (need <= 0 || !p || w.ex <= 0) continue; const n = Math.min(w.ex, need / (p * fk)); w.ex -= n; s.cash += n * p * fk; need -= n * p * fk; }
      if (s.cash < 0) this.dispoDay(day); // Dispo-Zins, ggf. Bankgespräch
    }
    // Techniker reparieren
    this.techRepairs(day);
    this.econDay(day);
    // News & Ereignisse
    while (s.newsIdx < NEWS.length && NEWS[s.newsIdx].day <= day) {
      const n = NEWS[s.newsIdx++];
      s.ticker.unshift({ day: n.day, text: n.text }); s.ticker = s.ticker.slice(0, 30);
      this.emit('news', n);
      if (n.effect?.exchangeLoss) this.exchangeCrash(n.effect.exchangeLoss, n.text);
    }
    // Kurs-Alarm bei starken Bewegungen (Bitcoin)
    {
      const p0 = this.price('BTC', day - 7), p1 = this.price('BTC', day), ch = p0 ? p1 / p0 - 1 : 0;
      if (Math.abs(ch) > 0.22 && (!s.flags.lastAlarm || day - s.flags.lastAlarm > 25)) {
        s.flags.lastAlarm = day;
        const held = (s.wallet.BTC.ex + s.wallet.BTC.cold) * p1;
        this.toast(ch > 0 ? `Bitcoin +${Math.round(ch * 100)} % diese Woche!` : `Bitcoin ${Math.round(ch * 100)} % diese Woche.`, ch > 0 ? 'good' : 'bad', 8000);
      }
    }
    // Neue Hardware im Handel
    for (const it of RELEASES) {
      if (it.releaseDay !== day) continue;
      const kind = { gpu: 'Grafikkarte', cpu: 'Prozessor', mobo: 'Mainboard', psu: 'Netzteil' }[it.type] || (it.kind === 'device' ? 'Miner' : it.kind === 'rig' ? 'Rig-Rahmen' : 'Hardware');
      const spec = it.kind === 'device' ? ` – ${fmtHashS(it.hash, it.algo)} bei ${it.watt} W` : it.type === 'gpu' ? ` – ${it.vram} GB, ${it.watt} W` : '';
      const text = `Neu im Handel: ${it.name.includes(kind) ? '' : kind + ' '}${it.name}${spec}`;
      s.ticker.unshift({ day, text }); s.ticker = s.ticker.slice(0, 30);
      this.emit('release', it, text);
    }
    // Story
    this.checkMessages(); this.checkGoals(true); this.checkEvents();
    this.endlessDay();
    if (day % 7 === 0) this.checkAchievements();
    if (day % 30 === 0) s.mods = s.mods.filter((m) => m.until > day);
    if (day >= toDay('2021-05-26') && day <= toDay('2021-12-31') && !s.flags.offerMade && s.flags.gmbh) { s.flags.offerMade = true; this.emit('offer', Math.max(40e6, Math.round(this.netWorthFast() * 1.4 / 1e6) * 1e6)); }
    this.progressDay(day, minedUSD, elecCost, fixed); // Jahreswerte, Erfolge, Bonus-Serien
    // Statistik
    const d = new Date(day * 86400000);
    if (d.getUTCDay() === 1 || s.stats.history.length === 0) {
      s.stats.history.push({ d: day, c: Math.round(s.cash), n: Math.round(this.netWorthFast()), h: this.algoHashFrom(netOwn) });
      if (s.stats.history.length > 1200) s.stats.history.splice(0, s.stats.history.length - 1200);
    }
    if (d.getUTCDate() === 1) { this.save(); this.emit('autosave'); }
    this.dayUpdate();
    this.checkMilestones();
  }
  checkMilestones() {
    const ms = (this.s.milestones ||= {});
    const sha = this.algoHash('sha256');
    for (const [v, l] of [[1e9, '1 GH/s'], [1e10, '10 GH/s'], [1e11, '100 GH/s'], [1e12, '1 TH/s'], [1e13, '10 TH/s'], [1e14, '100 TH/s'], [1e15, '1 PH/s'], [1e16, '10 PH/s'], [1e17, '100 PH/s'], [1e18, '1 EH/s'], [1e19, '10 EH/s']]) {
      if (sha >= v && !ms['h' + v]) { ms['h' + v] = this.s.day; this.emit('milestone', `${l} Hashrate`, 'Deine SHA-256-Leistung wächst und wächst.'); }
    }
    const nw = this.s.day % 7 ? -Infinity : this.netWorthFast(); // Vermögen (alle Geräte bewerten) nur wöchentlich prüfen
    for (const [v, l, t] of [[1e4, '10.000 $ Vermögen', 'Mehr als Papas Laden im Jahr umsetzt.'], [1e5, '100.000 $ Vermögen', 'Sechsstellig. Mit Internetgeld.'], [1e6, 'Millionär!', 'Die erste Million. Mama glaubt es immer noch nicht.'], [1e7, '10 Mio. $ Vermögen', 'Hashwerk ist ein echtes Unternehmen.'], [1e8, '100 Mio. $ Vermögen', 'Die Wirtschaftspresse ruft an.'], [1e9, 'Milliardär!', 'Vom Kinderzimmer zur Milliarde.']]) {
      if (nw >= v && !ms['n' + v]) { ms['n' + v] = this.s.day; this.emit('milestone', l, t); }
    }
  }
  algoHashFrom(netOwn) { return netOwn.BTC || 0; }
  netWorthFast() { return this.s.cash + this.walletValue() + this.hardwareValue() - (this.s.loan || 0); }

  wear(o, temp, day) {
    if (this.s.chapter === 0 && this.s.feat) return; // im Kinderzimmer geht nichts kaputt
    const def = PLACEABLE[o.type];
    const heatMul = (temp < 30 ? 1 : temp < 38 ? 1 + (temp - 30) / 8 : 2 + (temp - 38) * 0.5) * this.fx('fail');
    const life = (def.life || 6) * 365;
    if (def.kind === 'holder') {
      const base = def.selfCooled ? 0.0004 * this.fx('fail') : 0.0007 * heatMul;
      for (const it of o.items) { if (it.b) continue; if (Math.random() < base) it.b = 1; }
    } else if (def.kind === 'rig' || def.kind === 'device') {
      if (o.broken) return;
      const age = day - (o.bought || day);
      const p = 0.0009 * heatMul * (age > life ? 2.2 : 1) * (def.kind === 'rig' ? 1 + (o.parts.gpus.length * 0.15) : 1);
      if (Math.random() < p) { o.broken = true; (this.broke ||= []).push(o); } // Meldung gesammelt am Tagesende (advanceDay)
    }
  }
  techRepairs() {
    const s = this.s; if (!s.staff.tech) return;
    const cov = this.techCoverage();
    let cost = 0, n = 0;
    for (const id of s.unlocked) for (const o of s.fac[id].objects) {
      if (o.broken && Math.random() < cov && this.canAfford(cost + this.repairCost(o) * 0.6)) { cost += this.repairCost(o) * 0.6; o.broken = false; n++; }
      if (o.items) for (const it of o.items) if (it.b && Math.random() < cov && this.canAfford(cost + this.itemPrice(PLACEABLE[it.id]) * 0.05)) { cost += this.itemPrice(PLACEABLE[it.id]) * 0.05; it.b = 0; n++; }
    }
    if (n) { s.cash -= cost * this.staffFx().repair; this.emit('objects', s.current); }
  }
  exchangeCrash(loss, text) {
    loss = Math.min(1, loss * this.diff('exLoss')); // Schwierigkeit
    let lostUSD = 0, coldUSD = 0;
    for (const c of COINS) coldUSD += this.s.wallet[c.id].cold * this.price(c.id);
    const exUSD = COINS.reduce((a, c) => a + this.s.wallet[c.id].ex * this.price(c.id), 0);
    if (coldUSD > 1000 && exUSD < coldUSD * 0.05) { const ms = (this.s.milestones ||= {}); if (!ms.cold) { ms.cold = this.s.day; this.emit('milestone', 'Cold-Wallet-Profi', `${fmtUSD(coldUSD)} sicher – während andere alles verlieren.`); } }
    for (const c of COINS) { const w = this.s.wallet[c.id]; lostUSD += w.ex * loss * this.price(c.id); if (c.id === 'BTC') { const st = (this.s.stats.lostBtc ||= {}); st[this.s.day < toDay('2018-01-01') ? 'gox' : 'fxt'] = (st[this.s.day < toDay('2018-01-01') ? 'gox' : 'fxt'] || 0) + w.ex * loss; } w.ex *= 1 - loss; }
    if (lostUSD > 1) this.toast(`${text} – du verlierst Coins im Wert von ${fmtUSD(lostUSD)}!`, 'bad', 9000);
    else this.toast(`${text} – deine Coins in der Cold-Wallet sind sicher.`, 'good', 7000);
  }
  endlessStep() {
    const s = this.s;
    if (!s.endless) s.endless = Object.fromEntries(COINS.map((c) => [c.id, { p: 1, h: 1 }]));
    for (const c of COINS) {
      const e = s.endless[c.id];
      const vol = c.id === 'BTC' ? 0.028 : 0.045;
      // Kurs: Zufallspfad um einen sanften Trend (+9 %/Jahr), weich zurückgezogen – weder endlose Talfahrt noch Dauerrausch
      e.p *= Math.exp(gauss() * vol + 0.00025 - (Math.log(e.p) - 0.00025 * (s.day - LAST_DATA_DAY)) * 0.0008);
      // Netz-Hashrate folgt der Rentabilität: Ziel = Ertrag (Belohnung × Kurs) ÷ Effizienz der Netz-Miner, mit gut 5 Monaten Verzögerung
      // (der technische Fortschritt der Zukunfts-Hardware gilt für alle Netze – alte Altcoin-ASICs verlieren langsam an Wert)
      if (c.id === 'BTC') s.netEff = (s.netEff || 1) + (this.futureFront() - (s.netEff || 1)) / 900;
      const em0 = c.emission(LAST_DATA_DAY) || 1, target = Math.max(1e-6, (c.emission(s.day) / em0) * e.p / (s.netEff || 1));
      e.h *= Math.exp(gauss() * 0.006 + (Math.log(target) - Math.log(e.h)) / 160);
    }
    // Verlauf merken (Charts, Wochenvergleich), begrenzt auf ~2000 Tage
    const H = (s.endlessHist ||= { ids: COINS.map((c) => c.id), d: {} });
    H.d[s.day] = H.ids.flatMap((id) => (s.endless[id] ? [+s.endless[id].p.toPrecision(6), +s.endless[id].h.toPrecision(6)] : [1, 1]));
    delete H.d[s.day - 2000];
    this.futureStep(); this.endlessNews();
  }

  // ---------- Endlosmodus: Zukunfts-Hardware ----------
  // Bestes J/TH heute im Verhältnis zum besten Miner bei Datenende (1 = Stand 2026)
  futureFront() { let b = BASE_EFF; for (const it of this.s.futureHW || []) b = Math.min(b, it.watt / (it.hash / 1e12)); return b / BASE_EFF; }
  futureDue(n) { return LAST_DATA_DAY + FUTURE.every * (n + 1) + Math.round((rnd(n + 7) - 0.5) * 2 * FUTURE.jitter); }
  // Geräte aus dem Spielstand in den Katalog eintragen (und Reste eines anderen Spielstands entfernen)
  registerFutureHW(list) {
    const ids = new Set(list.map((it) => it.id));
    for (let i = PLACEABLES.length - 1; i >= 0; i--) if (PLACEABLES[i].fut && !ids.has(PLACEABLES[i].id)) { delete PLACEABLE[PLACEABLES[i].id]; PLACEABLES.splice(i, 1); }
    for (const it of list) { it.releaseDay ??= toDay(it.release); if (!PLACEABLE[it.id]) { PLACEABLES.push(it); PLACEABLE[it.id] = it; } }
  }
  makeFutureHW(n, day) {
    const m = futureModel(n), k = m.hydro ? 'hydro' : 'air', ref = m.hydro ? PLACEABLE.s23hyd : PLACEABLE.s23;
    const eff = Math.max(FUTURE.effMin, BASE_EFF * Math.pow(FUTURE.effStep, n + 1) * (m.hydro ? 1 : 1.12));
    const th = Math.min((ref?.hash || (m.hydro ? 580e12 : 318e12)) / 1e12 * Math.pow(FUTURE.hashStep[k], n + 1), FUTURE.maxW[k] / eff);
    const it = { id: 'fut' + (n + 1), fut: n + 1, kind: 'device', cat: 'asic', name: m.name, release: new Date(day * 864e5).toISOString().slice(0, 10), releaseDay: day,
      price: 0, watt: Math.round(th * eff), algo: 'sha256', hash: Math.round(th) * 1e12,
      size: [0.5, 0.5], minTier: m.hydro ? 3 : 0, look: m.look, ...(m.hydro ? { hydro: true } : {}), life: 9 };
    it.price = this.futureBase(it, day); // Listenpreis beim Erscheinen
    return it;
  }
  // Preis nach Hashpreis (wie am echten Markt): Hersteller verlangen etwa FUTURE.roiDays Tage Reinertrag bei FUTURE.refElec $/kWh
  futureBase(it, day = this.s.day) {
    if (this.hpNowDay !== day) { this.hpNowDay = day; this.hpNowV = COIN.BTC.emission(day) * this.price('BTC', day) / this.netHash('BTC', day) * 1e12; } // $ pro TH/s und Tag
    const th = it.hash / 1e12, eff = it.watt / th, k = it.hydro ? 'hydro' : 'air';
    const usd = Math.min(th * FUTURE.usdPerTH[k], Math.max(th * FUTURE.minPerTH, FUTURE.roiDays * th * (this.hpNowV - eff / 1000 * 24 * FUTURE.refElec)));
    return Number.isFinite(usd) ? Math.max(500, Math.round(usd / 50) * 50) : it.price || 5000;
  }
  futureStep() {
    const s = this.s, list = (s.futureHW ||= []); let it = null;
    while (s.day >= this.futureDue(list.length) && list.length < 60) { it = this.makeFutureHW(list.length, s.day); list.push(it); this.registerFutureHW(list); }
    if (!it) return;
    const jth = (it.watt / (it.hash / 1e12)).toLocaleString('de-DE', { maximumFractionDigits: 1 });
    const text = `Neu im Handel: Miner ${it.name} – ${fmtHash(it.hash, 'sha256')} bei ${it.watt} W (${jth} J/TH)`;
    s.ticker.unshift({ day: s.day, text }); s.ticker = s.ticker.slice(0, 30);
    this.emit('release', it, text);
    this.pushMsg({ from: 'Deniz', text: `Die ${it.name} ist raus! ${jth} J/TH${it.hydro ? ', nur für Rack und Container' : ''}. Unsere alten Kisten sehen dagegen ganz schön alt aus.` });
  }
  // Ticker im Endlosmodus: Halvings, Rekorde, Kursstürze und erfundene Marktmeldungen
  news(text) { const s = this.s, n = { day: s.day, text }; s.ticker.unshift(n); s.ticker = s.ticker.slice(0, 30); this.emit('news', n); }
  endlessNews() {
    const s = this.s, day = s.day, e = (s.enews ||= {}), p = this.price('BTC', day), nh = this.netHash('BTC', day);
    if (!e.ath) { e.ath = 0; e.hrec = 0; for (let d = toDay('2017-01-01'); d <= LAST_DATA_DAY; d += 3) { e.ath = Math.max(e.ath, COIN.BTC.price(d)); e.hrec = Math.max(e.hrec, COIN.BTC.hash(d)); } e.next = day + 25; e.used = []; }
    const fmtP = (v) => fmtUSD(Math.round(v / 1000) * 1000);
    for (const hd of HALVINGS) {
      if (hd <= LAST_DATA_DAY) continue;
      const r = BTC_REWARD(hd).toLocaleString('de-DE', { maximumFractionDigits: 5 });
      if (day === hd - 30) this.news(`In 30 Tagen ist Halving: Die Belohnung pro Block sinkt auf ${r} BTC`);
      if (day === hd) { this.news(`Halving! Ab heute gibt es nur noch ${r} BTC pro Block`); e.hdH = nh; }
      if (day === hd + 75 && e.hdH) { const ch = Math.round((nh / e.hdH - 1) * 100); this.news(ch < 0 ? `Nach dem Halving: ${-ch} % weniger Netz-Hashrate – alte Miner gehen vom Netz` : `Netz-Hashrate trotz Halving ${ch} % höher – die Miner glauben an den Kurs`); }
    }
    if (p > e.ath) { e.ath = p; if (day - (e.athDay || 0) > 45) { e.athDay = day; this.news(`Neues Allzeithoch: Bitcoin bei ${fmtP(p)}`); } }
    (e.wk ||= []).push(p); if (e.wk.length > 8) e.wk.shift(); // Kurse der letzten Woche (im Endlosmodus gibt es keine Kurshistorie)
    const ch = e.wk.length >= 8 ? p / e.wk[0] - 1 : 0;
    if (Math.abs(ch) > 0.2 && day - (e.crashDay || 0) > 40) { e.crashDay = day; this.news(ch < 0 ? `Bitcoin bricht ein: ${Math.round(ch * 100)} % in einer Woche` : `Bitcoin springt um ${Math.round(ch * 100)} % in einer Woche auf ${fmtP(p)}`); }
    if (nh > e.hrec * 1.15) { e.hrec = nh; this.news(`Rekord: Die Netz-Hashrate steigt auf ${fmtHash(nh, 'sha256')}`); }
    if (day >= e.next) { let pool = ENDLESS_NEWS.map((_, i) => i).filter((i) => !e.used.includes(i)); if (!pool.length) { e.used = []; pool = ENDLESS_NEWS.map((_, i) => i); } const i = pool[Math.floor(Math.random() * pool.length)]; e.used.push(i); e.next = day + 40 + Math.floor(Math.random() * 40); this.news(ENDLESS_NEWS[i]); }
  }
  pushMsg(m) { const s = this.s, x = { id: 'eg' + s.day + Math.random().toString(36).slice(2, 6), day: s.day, from: m.from, text: m.text, read: false }; s.messages.push(x); this.emit('message', x); }

  // ---------- Endlosziele (nach dem Sieg über MONOLITH) ----------
  endlessDay() {
    const s = this.s;
    if (s.day <= toDay('2011-03-31') && s.stats.coins) s.stats.btcWinter = s.stats.coins.BTC || 0; // für „Was wäre wenn“ im Finale
    if (!s.flags.won || s.chapter < CHAPTERS.length || !s.egoals) return;
    const eg = s.egoals;
    for (const goal of ENDLESS_GOALS) {
      if (eg.done[goal.id] || goal.action) continue;
      const st = (eg.st[goal.id] ||= {});
      const ok = goal.tick ? goal.tick(s, this, st) : (!goal.ready || goal.ready(s, this, st)) && goal.check(s, this, st);
      if (ok) this.finishEndlessGoal(goal);
    }
    const cur = this.endlessGoal();
    if (cur && eg.cur !== cur.id) { eg.cur = cur.id; const st = (eg.st[cur.id] ||= {}); if (cur.start && !st.started) { st.started = s.day; this.pushMsg(typeof cur.start === 'function' ? cur.start(s) : cur.start); } }
  }
  // Aktuelles Endlosziel: das erste offene, das schon dran ist
  endlessGoal() { const s = this.s, eg = s.egoals; if (!eg) return null; for (const goal of ENDLESS_GOALS) { if (eg.done[goal.id]) continue; const st = (eg.st[goal.id] ||= {}); if (!goal.ready || goal.ready(s, this, st)) return goal; } return null; }
  // Nächste Investition (Ziel mit Kaufknopf), auch wenn ein anderes Endlosziel gerade dran ist – Investitionen der Reihe nach
  endlessInvest() { const s = this.s, eg = s.egoals; if (!eg) return null; for (const goal of ENDLESS_GOALS) { if (!goal.action || eg.done[goal.id]) continue; const st = (eg.st[goal.id] ||= {}); return !goal.ready || goal.ready(s, this, st) ? goal : null; } return null; }
  finishEndlessGoal(goal) {
    const s = this.s; if (s.egoals.done[goal.id]) return;
    s.egoals.done[goal.id] = s.day; this.logStory('eg:' + goal.id, `Endlosziel: ${typeof goal.text === 'function' ? goal.text(s, this, s.egoals.st[goal.id] || {}) : goal.text}`);
    if (goal.done) this.pushMsg(goal.done);
    this.emit('egoal', goal.id);
  }
  endlessAction(id) {
    const goal = EGOAL[id], s = this.s; if (!goal?.action || s.egoals.done[id] || !s.flags.won || (this.endlessGoal() !== goal && this.endlessInvest() !== goal) || !this.canAfford(goal.action.cost)) return false;
    s.cash -= goal.action.cost; s.stats.invested = (s.stats.invested || 0) + goal.action.cost; if (goal.fx) this.applyFx(goal.fx);
    this.finishEndlessGoal(goal); this.dayUpdate(true); return true;
  }
  siteRent(id) { return FACILITY[id].rent * this.fx('rent', id); }

  // ---------- Finale, Verkauf, Neues Spiel+ ----------
  logStory(id, t) { const s = this.s; s.ev.log.push({ d: s.day, id, i: 0, t }); if (s.ev.log.length > 300) s.ev.log.shift(); }
  markWon() { const s = this.s; if (s.fin.wonDay) return; s.fin.wonDay = s.day; this.logStory('won', 'MONOLITH überholt – Hashwerk ist die Nummer eins'); }
  declineOffer(usd) { const s = this.s; s.flags.offerDeclined = s.day; s.fin.offerUsd = usd; this.logStory('offer', `Krals Angebot über ${fmtUSD(usd)} abgelehnt`); }
  sellOut(usd) { const s = this.s; s.flags.soldOut = s.day; s.fin.offerUsd = usd; s.fin.soldDay = s.day; s.fin.soldUsd = usd; this.logStory('sold', `Hashwerk für ${fmtUSD(usd)} an MONOLITH verkauft`); }
  tearContract() { const s = this.s; delete s.flags.soldOut; s.fin.soldDay = 0; s.flags.offerDeclined = s.day; s.flags.contractTorn = s.day; this.logStory('torn', 'Krals Kaufvertrag zerrissen – Hashwerk bleibt in Lindentaler Hand'); this.dayUpdate(true); }
  // Neues Spiel+: Opas Werkzeugkiste (−10 % auf alle Hardware, dauerhaft)
  newGamePlus(ending = 'won') {
    const old = this.s, n = (old.ngPlus || 0) + 1, prev = { ending, day: old.day, nw: Math.round(this.netWorth()), won: old.fin?.wonDay || 0 };
    this.newGame(old.diff || 'normal');
    const s = this.s; s.ngPlus = n; s.flags['ng+'] = 1; s.fin.prev = prev;
    s.mods.push({ key: 'price', mult: 0.9, fac: null, until: 1e9, src: 'ngplus' });
    this.dayUpdate(true); return true;
  }

  // ---------- Story ----------
  helpers() {
    return {
      countPlaced: (fn) => { let n = 0; for (const id of this.s.unlocked) n += this.s.fac[id].objects.filter(fn).length; return n; },
      algoHash: (a) => this.algoHash(a), netWorth: () => this.netWorth(), monolithHash: () => this.monolithHash(), dailyRev: () => this.dailyProfit().rev,
      maxTemp: () => Math.max(...this.s.unlocked.map((id) => this.s.fac[id].temp || 21)),
      facilityTripped: () => this.s.unlocked.some((id) => this.s.fac[id].tripped),
      firmValue: () => this.firmValue(), // Bargeld + Hardware − Kredit, ohne Coins
      rigsAt: (id) => this.rigsAt(id), rigsAll: () => this.s.unlocked.reduce((n, id) => n + this.rigsAt(id), 0), // betriebsbereite Rigs/PCs mit GPU
      miners: () => { let n = 0; for (const id of this.s.unlocked) for (const o of this.s.fac[id].objects) { const k = PLACEABLE[o.type].kind; if (k === 'device') n++; else if (k === 'holder') n += o.items.length; } return n; },
      asics: () => { let n = 0; const ok = (d) => d.kind === 'device' && d.look !== 'fpga'; for (const id of this.s.unlocked) for (const o of this.s.fac[id].objects) { const d = PLACEABLE[o.type]; if (ok(d)) n++; else if (d.kind === 'holder') for (const it of o.items) if (ok(PLACEABLE[it.id])) n++; } return n; }, // ohne FPGAs (die lohnen 2012 nicht)
      fullRack: () => this.s.unlocked.some((id) => this.s.fac[id].objects.some((o) => o.type === 'rack' && o.items.length >= PLACEABLE.rack.slots)),
      fill: (id) => (this.s.unlocked.includes(id) ? this.facCap(id).fill : 0), use: (id) => (this.s.unlocked.includes(id) ? this.facUse(id) : 0),
    };
  }
  checkMessages() {
    const s = this.s, h = this.helpers();
    const have = new Set(s.messages.map((m) => m.id));
    for (const m of MESSAGES) {
      if (have.has(m.id)) continue;
      const ok = m.date ? s.day >= toDay(m.date) && s.day - toDay(m.date) < 40 : m.cond(s, h);
      if (m.date && s.day - toDay(m.date) >= 40) { have.add(m.id); s.messages.push({ id: m.id, day: toDay(m.date), from: m.from, text: m.text, read: true, old: true }); continue; }
      if (ok) { s.messages.push({ id: m.id, day: s.day, from: m.from, text: m.text, read: false }); this.emit('message', m); }
    }
  }
  // ---------- Ereignisse mit Entscheidungen ----------
  evText(e, k = 'text') { const v = e[k]; return typeof v === 'function' ? v(this.s, this.helpers(), this) : v || ''; }
  evChoices(e) { const s = this.s, h = this.helpers(); return (e.choices || []).map((c, i) => { const cost = typeof c.cost === 'function' ? c.cost(this) : c.cost || 0; const needOk = !c.need || c.need(s, h, this), ok = (!cost || this.canAfford(cost)) && needOk; return { needFail: !needOk, needText: typeof c.needText === 'function' ? c.needText(this) : c.needText, i, label: typeof c.label === 'function' ? c.label(this) : c.label, hint: typeof c.hint === 'function' ? c.hint(this) : c.hint || '', cost, ok }; }); }
  evDue(e, day) {
    const w = e.when || {}, s = this.s;
    if (w.date) { const d = toDay(w.date); if (day < d) return null; if (day > d + (w.window ?? 14)) return 'skip'; return e.id; }
    if (w.yearly) { const y = new Date(day * 86400000).getUTCFullYear(); if (w.from && y < +w.from) return null; if (w.to && y > +w.to) return null; const d = toDay(`${y}-${w.yearly}`); if (day < d || day > d + (w.window ?? 7)) return null; return `${e.id}:${y}`; }
    if (w.from || w.to || w.chance) {
      if (w.from && day < toDay(w.from)) return null; if (w.to && day > toDay(w.to)) return w.repeat ? null : 'skip';
      if (day % 7 !== 3) return null; // einmal pro Woche würfeln
      const key = w.repeat ? `${e.id}:${Math.floor(day / (w.repeat || 365))}` : e.id;
      if (s.ev.done[key]) return null;
      if (Math.random() >= (w.chance ?? 1) * (e.bad ? this.diff('badEvents') : 1)) return null; // schlechte Ereignisse je nach Schwierigkeit
      return key;
    }
    return e.id;
  }
  checkEvents() {
    const s = this.s; if (!s.ev || !s.flags.miningStarted) return;
    const day = s.day, h = this.helpers();
    if (s.ev.open) { if (day > s.ev.open.until) { const e = EVENT[s.ev.open.id]; this.chooseEvent(e?.fallback ?? (e?.choices?.length || 1) - 1, true); } return; }
    // fällige Folge-Ereignisse zuerst
    const li = s.ev.later.findIndex((l) => l.day <= day);
    if (li >= 0) { const l = s.ev.later.splice(li, 1)[0]; const e = EVENT[l.id]; if (e && (!e.cond || e.cond(s, h, this))) return this.openEvent(e, l.id + ':' + l.day); }
    for (const e of EVENTS) {
      if (e.chain) continue; // nur als Folge-Ereignis
      if (s.ev.done[e.id] && !(e.when?.yearly || e.when?.repeat)) continue;
      const key = this.evDue(e, day); if (!key) continue;
      if (key === 'skip') { s.ev.done[e.id] = 'skip'; continue; }
      if (s.ev.done[key]) continue;
      const random = e.when?.chance != null;
      if (random && day - (s.ev.last || 0) < 21) continue;
      if (e.cond && !e.cond(s, h, this)) continue; // Datums-Ereignisse warten im Zeitfenster auf ihre Bedingung
      return this.openEvent(e, key);
    }
  }
  openEvent(e, key) {
    const s = this.s; s.ev.done[key] = s.day; s.ev.last = s.day;
    s.ev.open = { id: e.id, key, day: s.day, until: s.day + (e.expire ?? 21) };
    this.emit('event', e);
  }
  chooseEvent(i, auto = false) {
    const s = this.s, o = s.ev.open; if (!o) return null; const e = EVENT[o.id]; if (!e) { s.ev.open = null; return null; }
    const ch = (e.choices || [])[i]; if (!ch) { s.ev.open = null; return null; }
    const cost = typeof ch.cost === 'function' ? ch.cost(this) : ch.cost || 0;
    if (!auto && cost && !this.canAfford(cost)) return null;
    if (!auto && ch.need && !ch.need(s, this.helpers(), this)) return null;
    if (cost) { if (this.canAfford(cost)) s.cash -= cost; else return this.chooseEvent((e.choices.length || 1) - 1, true); }
    s.ev.open = null;
    const fx = typeof ch.fx === 'function' ? ch.fx(this, s) : ch.fx || {};
    this.applyFx(fx);
    s.ev.log.push({ d: s.day, id: e.id, i, t: fx.log || `${this.evText(e, 'title')}: ${typeof ch.label === 'function' ? ch.label(this) : ch.label}` }); if (s.ev.log.length > 300) s.ev.log.shift();
    if (auto) this.toast(`${this.evText(e, 'title')}: ohne Antwort – ${fx.autoText || (typeof ch.label === 'function' ? ch.label(this) : ch.label)}`, 'info', 6000);
    this.dayUpdate(true);
    return typeof ch.reply === 'function' ? ch.reply(this) : ch.reply || null;
  }
  applyFx(fx) {
    const s = this.s; if (!fx) return;
    if (fx.cash) s.cash += fx.cash;
    for (const [c, n] of Object.entries(fx.coin || {})) { const w = s.wallet[c]; if (!w) continue; if (n >= 0) w.ex += n; else { let r = -n; const a = Math.min(w.ex, r); w.ex -= a; r -= a; w.cold = Math.max(0, w.cold - r); } }
    for (const [c, f] of Object.entries(fx.sellFrac || {})) this.sell(c, f);
    for (const [k, n] of Object.entries(fx.rel || {})) { const old = s.rel[k] || 0, pk = k === 'papa' && s.flags.shopLost && REL_PERK.papaLost ? 'papaLost' : k; s.rel[k] = Math.max(-3, Math.min(5, old + n)); if (old < 3 && s.rel[k] >= 3 && REL_PERK[pk]) this.toast(REL_PERK[pk], 'good', 8000); }
    for (const m of fx.mod || []) s.mods.push({ key: m.key, mult: m.mult, fac: m.fac || null, until: m.days ? s.day + m.days : 1e9, src: m.src || null });
    for (const f of [].concat(fx.flag || [])) s.flags[f] = s.day || 1;
    for (const a of [].concat(fx.ach || [])) this.unlockAch(a);
    for (const [k, n] of Object.entries(fx.xp || {})) if (s.skills) this.addXp(k, n);
    for (const n of [].concat(fx.next || [])) s.ev.later.push({ id: n.id, day: s.day + (n.inDays || 1) });
    if (fx.msg) { const m = { id: 'ev' + s.day + Math.random().toString(36).slice(2, 6), day: s.day, from: fx.msg.from, text: fx.msg.text, read: false }; s.messages.push(m); this.emit('message', m); }
    if (fx.stat) for (const [k, n] of Object.entries(fx.stat)) s.stats[k] = (s.stats[k] || 0) + n;
    if (fx.toast) this.toast(fx.toast, 'good', 6000);
    if (fx.do) fx.do(this, s);
  }
  checkAchievements() { const s = this.s, h = this.helpers(); s.ach ||= {}; for (const a of ACHIEVEMENTS) if (!s.ach[a.id] && a.check && a.check(s, h, this)) this.unlockAch(a.id); }
  unlockAch(id) { const s = this.s; s.ach ||= {}; if (s.ach[id]) return false; s.ach[id] = s.day || 1; this.emit('achievement', id); return true; }
  relLv(k) { return this.s.rel?.[k] || 0; }
  chapter() { return CHAPTERS[Math.min(this.s.chapter, CHAPTERS.length - 1)]; }
  // eod = Tagesabschluss: Ziele mit eod:true zählen nur dort (z. B. Techniker eingestellt und bezahlt)
  checkGoals(eod = false) {
    const s = this.s, h = this.helpers();
    const ch = CHAPTERS[s.chapter]; if (!ch) return;
    for (const g of ch.goals) {
      if (g.live && s.goals[g.id] && !g.check(s, h, this)) { delete s.goals[g.id]; continue; } // live: gilt nur, solange es erfüllt ist (z. B. vor MONOLITH liegen)
      if (s.goals[g.id] === 'date' && g.check(s, h, this)) s.goals[g.id] = true; // doch noch voll geworden
      if (s.goals[g.id] || (g.eod && !eod)) continue;
      if (!g.check(s, h, this)) { if (g.orDate && s.day >= toDay(this.orDate(ch, g))) s.goals[g.id] = 'date'; continue; } // orDate: ab dem Datum auch so erledigt (still)
      s.goals[g.id] = true; const again = g.live && s.flags['goal:' + g.id]; if (g.live) s.flags['goal:' + g.id] = s.day || 1; // erneut erreicht: keine zweite Meldung
      if (g.doneText !== '' && !again) this.toast(g.doneText || `Geschafft: ${g.text}`, 'good'); if (!again) this.emit('goal', g);
    }
    this.checkBonus(ch);
    const done = ch.goals.every((g) => s.goals[g.id]);
    if (done && (s.day >= toDay(ch.minDate) || this.chSkip(ch))) {
      if (ch.unlock) {
        s.chapter++;
        if (!s.unlocked.includes(ch.unlock)) this.emit('unlockable', ch.unlock);
      } else if (!s.flags.won) { s.flags.won = true; this.emit('won'); s.chapter++; }
    }
  }
  // Standort voll (orDate-Ziel echt erfüllt): das Wartedatum des Kapitels entfällt
  chSkip(ch) { return !!ch && !ch.hard && ch.goals.some((g) => g.skip && this.s.goals[g.id] === true); } // skip: „Standort voll“-Ziele
  orDate(ch, g) { return typeof g.orDate === 'string' ? g.orDate : ch.minDate; }
  rigsAt(id) { let n = 0; for (const o of this.s.fac[id]?.objects || []) if (o.parts && PLACEABLE[o.type].kind === 'rig' && o.parts.gpus.length && this.pcReady(o)) n++; return n; }
  canPayGoal(g) { return this.canAfford(g.action.cost) || this.s.cash + this.exchangeValue() >= g.action.cost; }
  exchangeValue() { const fk = 1 - (this.s.skills ? this.tradeFee() : 0.005); let v = 0; for (const c of COINS) { const w = this.s.wallet[c.id]; if (w && w.ex > 0) v += w.ex * this.price(c.id) * fk; } return v; }
  goalAction(g) {
    const fk = 1 - (this.s.skills ? this.tradeFee() : 0.005);
    if (!this.canAfford(g.action.cost) && this.canPayGoal(g)) { let need = g.action.cost - this.s.cash + 0.01; for (const c of COINS) { const w = this.s.wallet[c.id], p = this.price(c.id); if (need <= 0 || !p || !(w.ex > 0)) continue; const n = Math.min(w.ex, need / (p * fk)); w.ex -= n; this.s.cash += n * p * fk; this.s.stats.sold += n * p * fk; need -= n * p * fk; } }
    if (!this.canAfford(g.action.cost)) return false;
    this.s.cash -= g.action.cost; this.s.flags[g.action.flag] = true;
    this.checkGoals(); this.checkFeatures(); this.dayUpdate(true); return true;
  }
  canUnlock(facId) {
    const f = FACILITY[facId];
    const ci = CHAPTERS.findIndex((c) => c.unlock === facId);
    return ci >= 0 && this.s.chapter > ci && !this.s.unlocked.includes(facId);
  }
  unlockFacility(facId) {
    const f = FACILITY[facId];
    if (!this.canUnlock(facId) || !this.canAfford(f.cost)) return false;
    this.s.cash -= f.cost; this.s.unlocked.push(facId); (this.s.since ||= {})[facId] = this.s.day;
    this.dayUpdate(true); this.emit('unlocked', facId); return true;
  }
  upgradePower(facId) {
    const f = this.s.fac[facId], fd = FACILITY[facId];
    const next = fd.power[f.power + 1]; if (!next) return false;
    const wait = this.powerWaitUntil(facId); if (wait) { this.toast(`Der Netzbetreiber lässt dich warten: Ausbau ab ${fmtDate(wait)}.`, 'info', 7000); return false; }
    const cost = this.powerCost(facId); if (!this.canAfford(cost)) return false;
    this.s.cash -= cost; f.power++; this.dayUpdate(true); return true;
  }
  // Preis des nächsten Stromausbaus: Ereignis-Modifikatoren (powerCost) und Opa ab Stufe 3 (−25 % in Keller/Werkstatt)
  powerCost(facId) {
    const f = this.s.fac[facId], next = FACILITY[facId].power[f.power + 1]; if (!next) return 0;
    let c = next.cost * this.fx('powerCost', facId);
    if ((facId === 'keller' || facId === 'werkstatt') && this.relLv('opa') >= 3) c *= 0.75;
    return Math.round(c);
  }
  // Ereignis-Sperre (Netzbetreiber, Gemeinde Sogn): Tag, bis zu dem nicht ausgebaut werden darf, sonst 0
  powerWaitUntil(facId) { let u = 0; for (const md of this.s.mods || []) if (md.key === 'powerWait' && md.mult === 0 && (!md.fac || md.fac === facId) && this.s.day < md.until) u = Math.max(u, md.until); return u; }
  hireTech(n) { if (!this.staffAllowed()) return false; if (n > 0 && !this.canAfford(n * this.techSalary())) return false; this.staffAdjust(n); this.dayUpdate(true); return true; }

  // ---------- Wirtschaft: Schwierigkeit, Ausbauten, Einmotten, Dispo & Bank, Kontingente, Personal ----------
  diff(key) { const d = DIFFICULTY[this.s?.diff] || DIFFICULTY.normal; return d[key] ?? 1; }
  initEcon(diff = 'normal') {
    const s = this.s; s.diff = DIFFICULTY[diff] ? diff : 'normal'; s.cash = DIFFICULTY[s.diff].cash;
    s.staff = { tech: 0, list: [], pool: [], poolDay: 0, nextId: 1 }; s.stock = {};
    for (const f of Object.values(s.fac)) { f.up = {}; f.mothball = 0; }
  }
  migrateEcon(s) { // alte Spielstände: Normal, Techniker bekommen Namen
    s.diff ||= 'normal'; s.stock ||= {}; s.staff ||= { tech: 0 };
    const st = s.staff; st.list ||= []; st.pool ||= []; st.poolDay ||= 0; st.nextId ||= 1;
    if (!st.list.length && st.tech > 0) for (let i = 0; i < st.tech; i++) st.list.push(this.makeStaff('tech', st, Math.max(0, s.day - 30), s.unlocked[s.unlocked.length - 1]));
    st.tech = st.list.filter((p) => p.role === 'tech').length;
    for (const f of Object.values(s.fac)) { f.up ||= {}; f.mothball ||= 0; }
  }
  // Zusatzfaktoren für fx(): Schwierigkeit, Personal, Ausbauten, Einmotten
  fxExt(key, facId) {
    const s = this.s; if (!s) return 1;
    if (key === 'fail') return this.diff('wear') * (s.staff?.list ? this.staffFx().fail : 1);
    if (key === 'powerCost') return s.staff?.list && this.staffFx().elec ? 0.8 : 1;
    if (key === 'elec') return this.diff('elec') * (facId && s.fac?.[facId]?.up ? this.upFx(facId, 'elec') : 1); // Schwierigkeit: Strompreis
    if (!facId || !s.fac?.[facId]?.up) return 1;
    let m = this.upFx(facId, key);
    if (key === 'rent' && !this.facInUse(facId)) return 0; // ohne Mining-Geräte: der Mietvertrag ruht, bis das erste Gerät drinsteht
    if (key === 'rent' && s.fac[facId].mothball && !(UPGRADES[facId] || []).some((u) => u.keepRent && this.upActive(facId, u))) m *= s.fac[facId].noRent ? 0 : 0.3;
    return m;
  }

  // Ausbauten je Standort (UPGRADES in world.js)
  upgrades(facId) { const l = UPGRADES[facId] || []; return this.s.flags?.shopLost && !this.s.flags.shopBack ? l.map((u) => (u.lost ? { ...u, ...u.lost } : u)) : l; } // lost: Variante, nachdem die Bank den Laden geschlossen hat
  upActive(facId, u) { const d = this.s.fac[facId]?.up?.[u.id]; return !!d && (!u.days || this.s.day - d < u.days); }
  upFx(facId, key, add = false) { let m = add ? 0 : 1; if (!this.s.fac[facId]?.up) return m; for (const u of UPGRADES[facId] || []) if (u.fx?.[key] != null && this.upActive(facId, u)) m = add ? m + u.fx[key] : m * u.fx[key]; return m; }
  upObsolete(facId, u) { const o = u.obsoleteBy && this.upgrades(facId).find((x) => x.id === u.obsoleteBy); return !!o && this.upActive(facId, o); }
  upMonthly() { let m = 0; for (const id of this.s.unlocked) for (const u of UPGRADES[id] || []) if (u.monthly && this.upActive(id, u)) m += u.monthly; return m; }
  buyUpgrade(facId, id) {
    const s = this.s, u = this.upgrades(facId).find((x) => x.id === id), f = s.fac[facId];
    if (!u || !f || !s.unlocked.includes(facId) || this.upActive(facId, u) || this.upObsolete(facId, u)) return false;
    const c = u.cost || 0; if (!this.canAfford(Math.max(c, u.monthly > 0 ? u.monthly : 0))) return false;
    s.cash -= c; (f.up ||= {})[id] = s.day || 1; if (u.rel) this.applyFx({ rel: u.rel });
    this.dayUpdate(true); this.emit('upgrade', facId, id); return true;
  }
  cancelUpgrade(facId, id) { const u = this.upgrades(facId).find((x) => x.id === id); if (!u?.cancel || !this.s.fac[facId]?.up?.[id]) return false; delete this.s.fac[facId].up[id]; this.dayUpdate(true); return true; }
  // Diebstahlschutz: Kinderzimmer (Mama ist zu Hause) und Profi-Standorte ab Rechenzentrum immer, sonst per Ausbau
  facSecure(facId) { if (facId === 'kinder' || (FACILITY[facId]?.tier ?? 0) >= 4) return true; return this.upgrades(facId).some((u) => u.secure && this.upActive(facId, u)); }
  facUps(facId) { return this.upgrades(facId).some((u) => u.ups && this.upActive(facId, u)); }

  // Einmotten: Geräte aus, Miete 30 %, kein Verschleiß; Wiederanfahren kostet 2 % des Hardwarewerts, frühestens nach 7 Tagen
  facInUse(facId) { return (this.s.fac[facId]?.objects || []).some((o) => { const k = PLACEABLE[o.type]?.kind; return k === 'rig' || k === 'device' || (k === 'holder' && o.items?.length > 0); }); } // Mining-Geräte vorhanden (sonst ruht die Miete)
  canMothball(facId) { return facId !== 'kinder' && this.s.unlocked.includes(facId); }
  facHwValue(facId) { let v = 0; for (const o of this.s.fac[facId].objects) v += this.objectValue(o); return v; }
  restartCost(facId) { return Math.round(this.facHwValue(facId) * 0.02); }
  restartDay(facId) { const m = this.s.fac[facId]?.mothball; return m ? m + 7 : 0; }
  mothball(facId, on = true) {
    const s = this.s, f = s.fac[facId]; if (!f || !this.canMothball(facId)) return false;
    if (on) { if (f.mothball) return false; f.mothball = s.day || 1; const keep = (UPGRADES[facId] || []).some((u) => u.keepRent && this.upActive(facId, u)); this.toast(`${FACILITY[facId].name} eingemottet: Geräte aus, ${!FACILITY[facId].rent ? 'keine Miete' : keep ? 'Miete läuft weiter (Mietvertrag)' : 'Miete nur noch 30 %'}.`, 'info', 6000); }
    else {
      if (!f.mothball || s.day < this.restartDay(facId)) return false;
      const c = this.restartCost(facId); if (s.cash - c < -this.dispoLimit()) return false; // Wiederanfahren darf in den Dispo gehen
      s.cash -= c; f.mothball = 0; f.noRent = 0; this.toast(`${FACILITY[facId].name} läuft wieder.`, 'good');
    }
    this.dayUpdate(true); this.emit('objects', facId); return true;
  }

  // Dispo & Bank: Minus bis max(2.000 $, 10 % Hardwarewert) zu 12 % (Schwierigkeit), darüber Bankgespräch
  dispoLimit() { return Math.max(2000, Math.round(this.hardwareValue() * 0.1 / 100) * 100); }
  dispoRate() { return 0.12 * this.diff('dispo'); }
  hiRate(day = this.s.day) { return Math.max(0, 0.13 - this.loanRate(day)); } // Aufschlag der Umschuldung über den normalen Kreditzins
  extraDaily(day = this.s.day, withDispo = false) {
    const s = this.s; let d = this.upMonthly() / 30.4;
    if (s.loanHi > 0) d += Math.min(s.loanHi, s.loan || 0) * this.hiRate(day) / 365;
    if (withDispo && s.cash < 0) d += -s.cash * this.dispoRate() / 365;
    return d;
  }
  dispoDay(day) {
    const s = this.s; s.cash -= -s.cash * this.dispoRate() / 365;
    const lim = this.dispoLimit(), over = -s.cash > lim;
    if (!s.flags.warnedNeg || day - s.flags.warnedNeg > 30) { s.flags.warnedNeg = day; this.toast(over ? `Dispo überzogen: ${fmtUSD(s.cash)} bei ${fmtUSD(lim)} Rahmen!` : `Konto im Minus: Dispo ${fmtUSD(-s.cash)} von ${fmtUSD(lim)} (${fmtNum(this.dispoRate() * 100, 0)} % Zinsen)`, 'bad', 8000); }
    if (over && s.ev && !s.ev.open && day - (s.flags.bankTalk || -99) >= 14) { s.flags.bankTalk = day; this.openEvent(EVENT.bank, 'bank:' + day); }
  }
  bankSaleList() { // älteste Geräte zuerst; das Kinderzimmer bleibt, Kühlung und Deko auch
    const all = [];
    for (const id of this.s.unlocked) { if (id === 'kinder') continue; for (const o of this.s.fac[id].objects) { const k = PLACEABLE[o.type].kind; if (k !== 'decor' && k !== 'cooling') all.push(o); } }
    return all.sort((a, b) => (a.bought || 0) - (b.bought || 0) || a.uid - b.uid);
  }
  bankSalePreview() { const need = -this.s.cash; let v = 0; for (const o of this.bankSaleList()) { if (v >= need) break; v += this.objectValue(o); } return v; }
  bankFireSale() {
    let n = 0, v = 0;
    for (const o of this.bankSaleList()) { if (this.s.cash >= 0) break; v += this.objectValue(o); this.removeObject(o.uid); n++; }
    if (n) this.toast(`Notverkauf: ${n} Gerät(e) für ${fmtUSD(v)} abgegeben.`, 'info', 7000);
    return v;
  }
  bankSaving() { // Sparprogramm: alles einmotten (außer Kinderzimmer), Personal entlassen
    const s = this.s; let n = 0;
    for (const id of s.unlocked) if (this.canMothball(id) && !s.fac[id].mothball && (s.fac[id].objects.length || FACILITY[id].rent)) { s.fac[id].mothball = s.day || 1; n++; }
    const k = s.staff?.list?.length || 0; if (k) { s.staff.list = []; this.syncStaff(); }
    for (const id of s.unlocked) for (const u of UPGRADES[id] || []) if (u.cancel && u.monthly > 0 && s.fac[id].up?.[u.id]) delete s.fac[id].up[u.id];
    let m = 0; for (const md of s.mods) if (md.key === 'monthly' && md.mult > 0 && md.until > s.day) { md.until = s.day; m++; } // laufende Verträge aus Ereignissen ruhen
    if (n || k || m) this.toast(`Sparprogramm: ${n} Standort(e) eingemottet, ${k} Leute entlassen${m ? ', laufende Zusagen gestrichen' : ''}.`, 'info', 7000);
    this.dayUpdate(true); this.emit('objects', s.current); return n + k + m;
  }
  savingPossible() { const s = this.s; return (s.staff?.list?.length || 0) + s.unlocked.filter((id) => this.canMothball(id) && !s.fac[id].mothball && (s.fac[id].objects.length || FACILITY[id].rent)).length + s.mods.filter((md) => md.key === 'monthly' && md.mult > 0 && md.until > s.day).length > 0; }
  // Insolvenz: nur wenn nichts mehr hilft – Schulden weg, Kasse 0, Mietverträge eingemotteter Standorte ruhen bis zum Wiederanfahren
  insolvencyOk() { const s = this.s; return s.cash < -this.dispoLimit() && this.bankSalePreview() <= 0 && this.coldValue() < 1 && !this.reschedOk() && !!s.flags.opaBank && !this.savingPossible(); }
  bankInsolvency() {
    const s = this.s; const debt = Math.max(0, -s.cash) + (s.loan || 0);
    s.cash = 0; s.loan = 0; s.loanHi = 0; s.flags.insolvent = (s.flags.insolvent || 0) + 1;
    for (const id of s.unlocked) if (s.fac[id].mothball) s.fac[id].noRent = 1;
    for (const c of COINS) s.wallet[c.id].ex = 0;
    this.toast(`Insolvenz: ${fmtUSD(debt)} Schulden gestrichen. Neuanfang mit leerer Kasse.`, 'bad', 9000);
    this.dayUpdate(true); return debt;
  }
  coldValue() { let v = 0; for (const c of COINS) v += (this.s.wallet[c.id]?.cold || 0) * this.price(c.id); return v; }
  bankColdSale() { // Cold-Wallet anzapfen: so viel verkaufen, bis das Konto wieder 1.000 $ im Plus ist (wertvollste Coins zuerst)
    const s = this.s; let need = Math.max(0, -s.cash) + 1000, got = 0;
    for (const c of [...COINS].sort((a, b) => (s.wallet[b.id].cold * this.price(b.id)) - (s.wallet[a.id].cold * this.price(a.id)))) {
      const w = s.wallet[c.id], p = this.price(c.id) * (1 - this.tradeFee()); if (need <= 0 || !p || !(w.cold > 0)) continue;
      const n = Math.min(w.cold, need / p); w.cold -= n; s.cash += n * p; s.stats.sold += n * p; got += n * p; need -= n * p;
    }
    if (got > 0) this.toast(`Cold-Wallet angezapft: ${fmtUSD(got)} verkauft.`, 'info', 7000);
    this.dayUpdate(true); return got;
  }
  bankAuto() { // ohne Antwort: Geräte, dann Cold-Wallet, dann Sparprogramm – hilft das alles nicht mehr: Opa, zuletzt Insolvenz (keine Endlos-Schulden)
    if (this.bankFireSale()) return 'Notverkauf alter Geräte'; if (this.bankColdSale()) return 'Cold-Wallet angezapft';
    if (this.savingPossible()) { this.bankSaving(); return 'Sparprogramm (eingemottet, Personal entlassen)'; }
    const s = this.s; if (s.cash >= -this.dispoLimit()) return 'Aufschub';
    if (!s.flags.opaBank) { this.applyFx({ cash: 5000, flag: 'opaBank', rel: { opa: 1 } }); this.toast('Opa Heinz springt ein: 5.000 $ fürs Konto.', 'info', 8000); return 'Opa springt ein'; }
    if (this.bankSalePreview() <= 0 && this.coldValue() < 1) { this.bankInsolvency(); this.applyFx({ rel: { papa: -1 } }); return 'Insolvenz'; }
    return 'Aufschub';
  }
  reschedOk() { const s = this.s, amt = Math.max(0, -s.cash) + 1000; return (s.loan || 0) + amt <= Math.max(20000, this.hardwareValue() * 0.8 + this.walletValue() * 0.5); }
  bankReschedule() { const s = this.s, amt = Math.ceil((Math.max(0, -s.cash) + 1000) / 100) * 100; s.loan = (s.loan || 0) + amt; s.loanHi = (s.loanHi || 0) + amt; s.cash += amt; return amt; }

  // Kontingente (stock in hardware.js): n Stück pro Kalendermonat bis zum Datum
  firmValue() { return this.s.cash + this.hardwareValue() - (this.s.loan || 0); } // Firmenwert: Kasse + Hardware − Kredit (ohne Coins)
  loanRisk() { // Risikoaufschlag: bis +6 % je nach Verschuldung gegenüber den Sicherheiten (einmal pro Tag berechnet)
    const s = this.s, L = s?.loan || 0; if (!(L > 0)) return 0;
    const c = (this.cache ||= {}).risk; if (c && c.d === s.day && c.L === L) return c.v;
    const v = Math.min(0.06, 0.06 * L / Math.max(1, this.hardwareValue() + this.walletValue()));
    this.cache.risk = { d: s.day, L, v }; return v;
  }
  loanPayment() { const L = this.s.loan || 0; return L > 0 ? Math.min(L, Math.max(100, Math.ceil(L / 60))) : 0; } // Tilgung: 5 Jahre Laufzeit
  monthKey(day) { return new Date(day * 86400000).toISOString().slice(0, 7); }
  stockLeft(def, day = this.s.day) {
    const st = def?.stock; if (!st || day >= toDay(st.until)) return Infinity;
    const u = this.s.stock?.[def.id]; return Math.max(0, st.n - (u && u.m === this.monthKey(day) ? u.n : 0));
  }
  stockUse(def, n) { if (!(n > 0) || this.stockLeft(def) === Infinity) return; const m = this.monthKey(this.s.day), st = (this.s.stock ||= {}); if (st[def.id]?.m !== m) st[def.id] = { m, n: 0 }; st[def.id].n += n; }
  stockNext(day = this.s.day) { const d = new Date(day * 86400000); return Math.round(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) / 86400000); }
  stockText() { return `ausverkauft bis ${fmtDate(this.stockNext())}`; }
  cloneStockOk(src, use = false) {
    const need = {}; if (PLACEABLE[src.type]?.stock) need[src.type] = 1;
    for (const it of src.items || []) if (PLACEABLE[it.id]?.stock) need[it.id] = (need[it.id] || 0) + 1;
    for (const [id, n] of Object.entries(need)) { if (use) this.stockUse(PLACEABLE[id], n); else if (this.stockLeft(PLACEABLE[id]) < n) return false; }
    return true;
  }

  // Personal (s.staff.list; s.staff.tech = Zahl der Techniker, für alte Stellen im Code)
  staffAllowed() { return !!this.s.flags.gmbh || FACILITY[this.s.unlocked[this.s.unlocked.length - 1]].tier >= 3; }
  staffOf(role) { return (this.s.staff?.list || []).filter((p) => p.role === role); }
  roleName(p) { return ROLES[p.role]?.[p.g === 'f' ? 'f' : 'm'] || p.role; }
  staffSalary(p, day = this.s.day) { return Math.round(this.techSalary(day) * (ROLES[p.role]?.sal || 1)); }
  staffMonthly(day = this.s.day) { const l = this.s.staff?.list; if (!l) return (this.s.staff?.tech || 0) * this.techSalary(day); let m = 0; for (const p of l) m += this.techSalary(day) * (ROLES[p.role]?.sal || 1); return m; }
  staffFx() {
    return this.cache.sfx ??= (() => {
      const t = this.staffOf('tech'), n = Math.max(1, t.length), k = (tr) => t.filter((p) => p.trait === tr).length;
      return { cap: t.reduce((a, p) => a + (p.trait === 'flink' ? 72 : 60), 0), fail: 1 - 0.2 * k('gruendlich') / n, repair: 1 - 0.15 * k('sparfuchs') / n, elec: this.staffOf('elec').length > 0, trader: this.staffOf('trader').length > 0 };
    })();
  }
  techCap() { return this.s.staff?.list ? this.staffFx().cap : (this.s.staff?.tech || 0) * 60; }
  syncStaff() { this.s.staff.tech = this.staffOf('tech').length; if (this.cache) delete this.cache.sfx; }
  makeStaff(role, st, day, fac = null) {
    const used = new Set([...st.list, ...(st.pool || [])].map((p) => p.name)); let name = '', g = 'm';
    for (let k = 0; k < 60; k++) { const [fn, gg] = FIRST[Math.floor(Math.random() * FIRST.length)]; name = `${fn} ${LAST[Math.floor(Math.random() * LAST.length)]}`; g = gg; if (!used.has(name)) break; }
    const tk = Object.keys(TRAITS);
    return { id: st.nextId++, name, g, role, trait: tk[Math.floor(Math.random() * tk.length)], fac, since: day };
  }
  // Drei Bewerbungen; neue Runde alle 30 Tage, nach einer Einstellung rückt jemand nach (Elektrik/Handel nur, solange die Rolle fehlt)
  staffPool() { const st = this.s.staff; if (st.pool.length < 3 || this.s.day - st.poolDay >= 30) this.refreshPool(st.pool.length >= 3); return st.pool; }
  refreshPool(all = true) {
    const s = this.s, st = s.staff; if (all) st.pool = []; st.poolDay = s.day;
    st.pool = st.pool.filter((p) => p.role === 'tech' || !this.staffOf(p.role).length);
    while (st.pool.length < 3) {
      const roles = ['tech', 'tech']; for (const r of ['elec', 'trader']) if (!this.staffOf(r).length && !st.pool.some((p) => p.role === r)) roles.push(r);
      const role = st.pool.some((p) => p.role === 'tech') ? roles[Math.floor(Math.random() * roles.length)] : 'tech';
      st.pool.push(this.makeStaff(role, st, s.day, s.unlocked[s.unlocked.length - 1]));
    }
  }
  hire(pid) {
    const s = this.s, st = s.staff, i = st.pool.findIndex((p) => p.id === pid); if (i < 0 || !this.staffAllowed()) return false;
    const p = st.pool[i]; if (!this.canAfford(this.staffSalary(p))) return false;
    st.pool.splice(i, 1); p.since = s.day; p.fac = s.unlocked[s.unlocked.length - 1]; st.list.push(p); this.syncStaff(); this.refreshPool(false);
    this.dayUpdate(true); this.emit('staff', p); return true;
  }
  fire(pid) { const st = this.s.staff, i = st.list.findIndex((p) => p.id === pid); if (i < 0) return false; st.list.splice(i, 1); this.syncStaff(); this.dayUpdate(true); this.emit('staff'); return true; }
  staffAdjust(n) { // Sammel-Einstellung/-Kündigung von Technikern (ohne Auswahl)
    const s = this.s, st = s.staff;
    if (n > 0) for (let i = 0; i < n; i++) st.list.push(this.makeStaff('tech', st, s.day, s.unlocked[s.unlocked.length - 1]));
    else for (let i = 0; i < -n; i++) { const t = st.list.map((p) => p.role).lastIndexOf('tech'); if (t < 0) break; st.list.splice(t, 1); }
    this.syncStaff();
  }
  // Händler: verkauft nur über dem 7-Tage-Schnitt, sonst bleiben die Coins auf der Börse liegen
  traderSell(c, want, p, day) {
    const s = this.s; if (!(want > 0) || s.payoutCold || !s.staff?.list || !this.staffFx().trader) return want;
    let avg = 0; for (let k = 1; k <= 7; k++) avg += this.price(c, day - k); avg /= 7;
    const hold = (s.trHold ||= {});
    if (p < avg) { hold[c] = (hold[c] || 0) + want; return 0; }
    const w = s.wallet[c], extra = Math.min(hold[c] || 0, w.ex); hold[c] = 0;
    if (extra > 0) { w.ex -= extra; const usd = extra * p * (1 - this.tradeFee()); s.cash += usd; s.stats.sold += usd; }
    return want;
  }
  // Täglich: auslaufende Verträge, Elektrikerin warnt vor der Sicherung
  econDay(day) {
    const s = this.s;
    if (new Date(day * 86400000).getUTCDate() === 1 && s.loan > 0) { const r = this.loanPayment(); s.loan -= r; s.cash -= r; if (s.loanHi) s.loanHi = Math.min(s.loanHi, s.loan); }
    if (day === FREE_POWER_END && !s.flags.papa1 && s.flags.miningStarted) this.applyFx({ msg: { from: 'Mama', text: 'Ab März zahlst du deinen Strom selbst. Ich hab die Rechnung gesehen, mein Lieber.' } });
    for (const id of s.unlocked) for (const u of UPGRADES[id] || []) { const d = s.fac[id].up?.[u.id]; if (d && u.days && day - d === u.days) this.toast(`${u.name} (${FACILITY[id].short}) ist ausgelaufen.`, 'info', 7000); }
    if (s.staff?.list && this.staffFx().elec) {
      for (const id of s.unlocked) {
        const f = s.fac[id]; if (f.tripped || f.mothball || day - (f.tripWarn || -99) < 10) continue;
        if (this.facSummary(id, day + 3).tripped) { f.tripWarn = day; const p = this.staffOf('elec')[0]; this.toast(`${p.name}: ${FACILITY[id].name} – in drei Tagen fliegt dort die Sicherung, wenn wir nichts ändern.`, 'bad', 9000); }
      }
    }
  }

  // ---------- Fortschritt: Bonusziele, Jahreswerte, Statistiken für Erfolge ----------
  initProgress(s) {
    s.stats.y ||= {}; s.stats.trips ||= 0; s.stats.halv ||= 0; s.stats.tmax ||= 0; s.bonus ||= {}; s.streak ||= {};
  }
  inWait(ch) { return !!ch && ch.goals.every((go) => this.s.goals[go.id]) && this.s.day < toDay(ch.minDate) && !this.chSkip(ch); }
  // Sparphase: es fehlt nur noch eine Zahlung (z. B. Papas Stromrechnung), für die das Geld noch nicht reicht
  saving(ch) { const open = ch ? ch.goals.filter((go) => !this.s.goals[go.id]) : []; return open.length > 0 && open.every((go) => go.action && !this.canPayGoal(go)); }
  idlePhase(ch) { return this.inWait(ch) || this.saving(ch); }
  bonusOpen(ch, b) { const s = this.s; return !s.bonus?.[b.id] && !(b.until && s.day > toDay(b.until)) && (!b.from || b.from(s)) && (!b.wait || this.idlePhase(ch)); }
  checkBonus(ch = CHAPTERS[this.s.chapter]) {
    const s = this.s; if (!ch?.bonus || !s.bonus) return; const h = this.helpers();
    for (const b of ch.bonus) { if (!this.bonusOpen(ch, b)) continue; if (b.streak ? (s.streak[b.id] || 0) >= b.streak : b.check(s, h, this)) this.grantBonus(b); }
  }
  // Serien („N Tage am Stück“) zählen einmal pro Tag
  bonusStreaks() {
    const s = this.s, ch = CHAPTERS[s.chapter]; if (!ch?.bonus) return; const h = this.helpers();
    for (const b of ch.bonus) { if (!b.streak || s.bonus[b.id]) continue; s.streak[b.id] = this.bonusOpen(ch, b) && b.check(s, h, this) ? (s.streak[b.id] || 0) + 1 : 0; }
  }
  bonusProgress(b) { const s = this.s; if (b.streak) return [s.streak?.[b.id] || 0, b.streak, 'days']; return b.progress ? b.progress(s, this.helpers(), this) : null; }
  grantBonus(b) {
    const s = this.s; s.bonus[b.id] = s.day || 1;
    const r = b.reward || {}, txt = this.rewardText(r);
    this.applyFx(r);
    s.ev.log.push({ d: s.day, id: 'bonus:' + b.id, i: 0, t: `Bonus: ${b.text}` }); if (s.ev.log.length > 300) s.ev.log.shift();
    this.emit('milestone', 'Bonus', txt ? `${b.text} · ${txt}` : b.text); this.emit('bonus', b);
  }
  rewardText(r = {}) {
    const NAME = { papa: 'Papa', mama: 'Mama', opa: 'Opa', deniz: 'Deniz' }, out = [];
    if (r.cash) out.push(`+${fmtUSD(r.cash)}`);
    for (const [k, n] of Object.entries(r.rel || {})) out.push(`${NAME[k] || k} ${n > 0 ? '+' : '−'}${Math.abs(n)}`);
    if (r.text) out.push(r.text);
    return out.join(' · ');
  }
  // Effizienz der laufenden Flotte eines Algorithmus in J/TH (bzw. J pro 10^12 Hash); Infinity ohne Leistung
  fleetJTH(algo = 'sha256') { let w = 0, hs = 0; for (const id of this.s.unlocked) { const sm = this.summary?.[id]; if (!sm || sm.tripped) continue; for (const a of sm.per.values()) for (const u of a.units || []) if (u.algo === algo && u.h > 0 && !u.idle) { w += u.w || 0; hs += u.h; } } return hs > 0 ? (w / hs) * 1e12 : Infinity; }
  coinValue() { let ex = 0, cold = 0; for (const c of COINS) { const w = this.s.wallet[c.id], p = this.price(c.id); ex += w.ex * p; cold += w.cold * p; } return { ex, cold, all: ex + cold, coldShare: ex + cold > 0 ? cold / (ex + cold) : 0 }; }
  deviceCount() { let n = 0; for (const id of this.s.unlocked) for (const o of this.s.fac[id].objects) { const k = PLACEABLE[o.type]?.kind; if (k === 'holder') n += o.items.length; else if (k === 'rig' || k === 'device') n++; } return n; }
  // Leitwert Hashrate: SHA-256, sonst der erste andere Algorithmus mit Leistung (wie oben in der Leiste)
  mainHash() { for (const a of ['sha256', 'scrypt', 'ethash', 'kawpow', 'kheavy', 'equihash', 'rx', 'cn']) { const v = this.algoHash(a); if (v > 0) return [v, a]; } return [0, 'sha256']; }
  yearOf(day) { return new Date(day * 86400000).getUTCFullYear(); }
  progressDay(day, mined = 0, elec = 0, fixed = 0) {
    const s = this.s, st = s.stats; this.initProgress(s);
    const D = day - 1, y = this.yearOf(D);
    let Y = st.y[y];
    if (!Y) { const [h0, a0] = this.mainHash(); Y = st.y[y] = { d0: D, rev: 0, elec: 0, fix: 0, nw0: Math.round(this.netWorthFast()), h0, a0, p0: this.price('BTC', D) }; }
    Y.rev += Number.isFinite(mined) ? mined : 0; Y.elec += Number.isFinite(elec) ? elec : 0; Y.fix += Number.isFinite(fixed) ? fixed : 0;
    // Sicherungen, Höchsttemperatur, Leerlauf (für Erfolge und Tipps)
    st.tp ||= {}; let idle = 0;
    for (const id of s.unlocked) {
      const f = s.fac[id]; if (f.tripped && !st.tp[id]) { st.trips++; Y.trips = (Y.trips || 0) + 1; } st.tp[id] = !!f.tripped;
      if (Number.isFinite(f.temp)) st.tmax = Math.max(st.tmax || 0, f.temp);
      const sm = this.summary?.[id]; if (sm && !sm.tripped) for (const a of sm.per.values()) if (a.status === 'idle') idle++;
    }
    st.idle = idle;
    if (HALVINGS.includes(day) && mined > 0) st.halv++;
    if (s.flags.boughtAsic && !st.asicDay) st.asicDay = day;
    if (s.flags.won && !st.wonDay) st.wonDay = day;
    if (s.cash < 0 && !st.neg1) st.neg1 = day;
    if (day <= toDay('2011-03-31')) st.btc2010 = st.coins?.BTC || 0; // „erster Winter“ für den Was-wäre-wenn-Vergleich
    if ((st.sold || 0) > (st.soldPrev ?? st.sold) + 0.01) { const p = Math.max(this.price('BTC', D), this.price('BTC', day)); st.soldMaxP = Math.max(st.soldMaxP || 0, p); if (p >= 1000) st.sold1000 ||= day; }
    st.soldPrev = st.sold || 0;
    this.bonusStreaks(); this.checkBonus();
    // Jahreswechsel: Abschluss des alten Jahres + Rückblick
    if (this.yearOf(day) !== y) {
      const [h1, a1] = this.mainHash();
      Object.assign(Y, { nw1: Math.round(this.netWorthFast()), h1, a1, btc: s.wallet.BTC.ex + s.wallet.BTC.cold, cash: Math.round(s.cash), p1: this.price('BTC', day), rel: { ...s.rel } });
      this.emit('year', y);
    }
    this.checkAchievements();
  }

  // ---------- Solaranlage (Green Mining wie im Vorbild) ----------
  solarStep(facId) { return { kinder: 0, keller: 6, werkstatt: 30, halle: 250, rz: 400, fjord: 0 }[facId] || 0; }
  solarPricePerKwp(day = this.s.day) { return Math.round(curveSolar(day)); }
  solarKwh(facId, day = this.s.day) { const kwp = this.s.fac[facId].solar || 0; if (!kwp) return 0; const doy = (day % 365.25) / 365.25; const season = 0.2 + 0.8 * (0.5 - 0.5 * Math.cos(2 * Math.PI * doy)); return kwp * 4.5 * season; }
  buildSolar(facId) { const kwp = this.solarStep(facId); const cost = kwp * this.solarPricePerKwp(); if (!kwp || !this.canAfford(cost)) return false; this.s.cash -= cost; this.s.fac[facId].solar = (this.s.fac[facId].solar || 0) + kwp; this.dayUpdate(true); return true; }

  // ---------- Bankkredit ----------
  loanRate(day = this.s.day) { return (day < toDay('2022-06-01') ? 0.065 : day < toDay('2024-06-01') ? 0.115 : 0.09) + this.loanRisk(); }
  loanLimit() { return Math.max(0, Math.round((this.hardwareValue() * 0.5 + this.walletValue() * 0.25) / 1000) * 1000 - (this.s.loan || 0)); } // Sicherheiten: Hardware und Coins, kein Bargeld
  takeLoan(usd) { usd = Math.min(usd, this.loanLimit()); if (usd <= 0) return 0; this.s.loan = (this.s.loan || 0) + usd; this.s.cash += usd; this.dayUpdate(true); return usd; }
  repayLoan(usd) { usd = Math.min(usd, this.s.loan || 0, Math.max(0, this.s.cash)); if (usd <= 0) return 0; this.s.loan -= usd; this.s.cash -= usd; this.dayUpdate(true); return usd; }

  // ---------- Wallet ----------
  sell(coin, frac) {
    const w = this.s.wallet[coin]; const n = w.ex * frac; if (n <= 0) return 0;
    const usd = n * this.price(coin) * (1 - (this.s.skills ? this.tradeFee() : 0.005)); w.ex -= n; this.s.cash += usd; this.s.stats.sold += usd; if (this.s.skills && usd >= 1) this.addXp('trade', Math.min(75, Math.max(2, usd / 10))); this.dayUpdate(true); return usd; // EP nach Volumen, nicht pro Klick
  }
  buy(coin, usd) {
    if (!this.has('buycoins')) return 0;
    usd = Math.min(+usd || 0, this.s.cash); if (!(usd > 0) || !this.canAfford(usd)) return 0;
    const p = this.price(coin); if (!p) return 0;
    const fee = this.s.skills ? this.tradeFee() : 0.005; this.s.wallet[coin].ex += (usd * (1 - fee)) / p; this.s.cash -= usd; if (this.s.skills && usd >= 1) this.addXp('trade', Math.min(50, Math.max(2, usd / 10))); this.dayUpdate(true); return usd;
  }
  transfer(coin, toCold) {
    const w = this.s.wallet[coin];
    if (toCold) { w.cold += w.ex; w.ex = 0; } else { w.ex += w.cold; w.cold = 0; }
    this.dayUpdate(true);
  }

  toast(text, kind = 'info', ms = 5000) { this.emit('toast', text, kind, ms); }
  sellAll() { let u = 0; for (const c of COINS) u += this.sell(c.id, 1); return u; }
}

// ---------- Formatierung ----------
const nf = (d) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: d, minimumFractionDigits: d });
export function fmtUSD(v, compact = true) {
  const a = Math.abs(v), sign = v < 0 ? '−' : '';
  if (compact && a >= 1e9) return `${sign}${nf(2).format(a / 1e9)} Mrd. $`;
  if (compact && a >= 1e6) return `${sign}${nf(2).format(a / 1e6)} Mio. $`;
  if (a >= 100) return `${sign}${nf(0).format(a)} $`;
  if (a >= 1) return `${sign}${nf(2).format(a)} $`;
  if (a < 1e-5) return '0 $';
  return `${sign}${a.toPrecision(3).replace('.', ',')} $`;
}
export function fmtNum(v, d = 2) { return nf(d).format(v); }
export function fmtCoin(v) { const a = Math.abs(v); if (a >= 1e6) return nf(2).format(v / 1e6) + ' Mio.'; if (a >= 1000) return nf(0).format(v); if (a >= 100) return nf(1).format(v); if (a >= 10) return nf(2).format(v); if (a >= 1) return nf(3).format(v); if (a === 0) return '0'; return v.toPrecision(3).replace('.', ','); }
export function fmtHash(h, algo) {
  const unit = algo === 'equihash' ? 'Sol/s' : 'H/s';
  const u = ['', 'k', 'M', 'G', 'T', 'P', 'E']; let i = 0;
  while (h >= 1000 && i < u.length - 1) { h /= 1000; i++; }
  return `${nf(h >= 100 ? 0 : h >= 10 ? 1 : 2).format(h)} ${u[i]}${unit}`;
}
export function fmtDate(day, long = false) {
  const d = new Date(day * 86400000);
  return d.toLocaleDateString('de-DE', long ? { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' } : { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}
export function fmtWatt(w) { if (w >= 1e6) return `${nf(2).format(w / 1e6)} MW`; if (w >= 1000) return `${nf(1).format(w / 1000)} kW`; return `${Math.round(w)} W`; }
