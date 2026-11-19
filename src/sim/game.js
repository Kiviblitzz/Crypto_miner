// Spielzustand + tägliche Simulation (Mining, Strom, Hitze, Defekte, Markt, Story)
import { COINS, COIN } from '../data/coins.js';
import { PLACEABLE, PART, PLACEABLES, PARTS, GPUS } from '../data/hardware.js';
import { FACILITIES, FACILITY, CHAPTERS, MESSAGES, NEWS, START_DAY, TECHS } from '../data/world.js';
import { BTC_HASH, POWER_HOUSEHOLD, GPU_BOOM, MONOLITH_SHARE, DAG_AET, DAG_AEC, seasonOffset, noise, toDay, BTC_PRICE, curve } from '../data/history.js';

const LAST_DATA_DAY = BTC_PRICE.lastDay;
export const SAVE_KEY = 'hashwerk-save-v1';
const DEFAULT_AUTOSELL = 0.8;

const RELEASES = [...PLACEABLES, ...PARTS].filter((it) => it.releaseDay > START_DAY && (it.kind === 'device' || it.kind === 'rig' || it.type));
const fmtHashS = (h, a) => fmtHash(h, a);
const curveSolar = curve([['2010-01', 3200], ['2013-01', 1900], ['2016-01', 1500], ['2020-01', 1100], ['2023-01', 1000], ['2026-01', 750]], { log: false });
function rnd(seed) { const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

export class Game {
  constructor() { this.listeners = {}; this.newGame(); }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, ...a) { (this.listeners[ev] || []).forEach((f) => f(...a)); }

  newGame() {
    const s = {
      version: 1, day: START_DAY, frac: 0.35, cash: 300, nextUid: 1,
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
    };
    for (const c of COINS) s.autoSell[c.id] = 0;
    const m0 = MESSAGES.find((m) => m.id === 'm0'); if (m0) s.messages.push({ id: 'm0', day: START_DAY, from: m0.from, text: m0.text, read: true }); // Start-Nachricht (im Intro gezeigt)
    this.s = s;
    this.cache = {};
    // Startausstattung: alter Tower-PC mit Q66 + RHD 4850
    const pc = this.addObject('kinder', 'tower', 1.75, 0.75, 0, { mobo: 'h55', cpu: 'q66', psu: 'psu400', gpus: ['rhd4850'] }, true);
    pc.mode = 'off'; // Mining startet der Spieler selbst
    while (s.newsIdx < NEWS.length && NEWS[s.newsIdx].day < s.day) s.newsIdx++;
    this.dayUpdate(true);
  }

  // ---------- Speichern / Laden ----------
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.s)); return true; } catch (e) { return false; } }
  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  saveInfo() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s ? { day: s.day, cash: s.cash, sites: s.unlocked.length } : null; } catch (e) { return null; } }
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
      const s = JSON.parse(raw); if (!s || s.version !== 1) return false;
      for (const f of FACILITIES) s.fac[f.id] ||= { power: 0, tripped: false, temp: 21, objects: [] };
      // Alte Spielstände: Parodie-Kürzel auf echte Coins umstellen
      const MIG = { SLV: 'LTC', WUF: 'DOGE', SHD: 'XMR', AET: 'ETH', AEC: 'ETC', ZRP: 'ZEC', CRV: 'RVN', KSK: 'KAS' };
      for (const [o, n] of Object.entries(MIG)) {
        if (s.wallet[o]) { s.wallet[n] = s.wallet[o]; delete s.wallet[o]; }
        if (s.autoSell[o] != null) { s.autoSell[n] = s.autoSell[o]; delete s.autoSell[o]; }
        if (s.stats?.coins?.[o] != null) { s.stats.coins[n] = s.stats.coins[o]; delete s.stats.coins[o]; }
        for (const f of Object.values(s.fac)) for (const ob of f.objects || []) if (ob.coin === o) ob.coin = n;
      }
      if (!Number.isFinite(s.cash)) s.cash = 0;
      for (const c of COINS) { s.wallet[c.id] ||= { ex: 0, cold: 0 }; if (s.autoSell[c.id] == null) s.autoSell[c.id] = DEFAULT_AUTOSELL; }
      this.s = s; this.cache = {}; this.dayUpdate(true); return true;
    } catch (e) { console.warn(e); return false; }
  }

  // ---------- Technologien ----------
  fx(key) { let m = 1; const u = this.s.techs || {}; for (const t of TECHS) if (u[t.id] && t.fx[key]) m *= t.fx[key]; return m; }
  techAvailable(t) { return this.s.day >= toDay(t.date) && (!t.minTier || Math.max(...this.s.unlocked.map((id) => FACILITY[id].tier)) >= t.minTier); }
  buyTech(id) { const t = TECHS.find((x) => x.id === id); if (!t || (this.s.techs ||= {})[id] || !this.techAvailable(t) || !this.canAfford(t.cost)) return false; this.s.cash -= t.cost; this.s.techs[id] = this.s.day;
    if (id === 'ico') { const usd = Math.min(30e6, 600000 + this.netWorthFast() * 0.25); const p = this.price('ETH') || 1; this.s.wallet.ETH.ex += usd / p; this.toast(`ICO ausverkauft: ${fmtUSD(usd)} in Ethereum`, 'good', 9000); }
    this.dayUpdate(true); return true; }

  // ---------- Markt ----------
  price(id, day = this.s.day) {
    const c = COIN[id]; if (day < c.start) return 0;
    if (day > LAST_DATA_DAY && this.s.endless) return c.price(LAST_DATA_DAY) * this.s.endless[id].p;
    const vol = id === 'BTC' ? 0.045 : 0.07;
    return c.price(day) * Math.exp(noise(day, id.charCodeAt(0) + id.charCodeAt(1)) * vol);
  }
  netHash(id, day = this.s.day) {
    const c = COIN[id]; if (day < c.start) return Infinity;
    if (day > LAST_DATA_DAY && this.s.endless) return c.hash(LAST_DATA_DAY) * this.s.endless[id].h;
    return c.hash(day) * Math.exp(noise(day, 99 + id.charCodeAt(0)) * 0.03);
  }
  coinActive(id, day = this.s.day) { const c = COIN[id]; return day >= c.start && (!c.end || day < c.end); }
  coinAlgo(id, day = this.s.day) { return COIN[id].algo(day); }
  elecPrice(facId, day = this.s.day) {
    const f = FACILITY[facId];
    if (facId === 'kinder' && !this.s.flags.papa1) return 0; // Mama zahlt – noch.
    if (f.elec === 'fixed') return f.elecFixed * (day > toDay('2022-03-01') && day < toDay('2023-06-01') ? 1.6 : 1) * this.fx('elec') * this.fx('fjordElec');
    return POWER_HOUSEHOLD(day) * f.elecMult * this.fx('elec');
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
      const h0 = this.cache[k] ??= this.hashprice(item.algo, item.releaseDay + 15) || 1;
      const h1 = this.hashprice(item.algo, Math.min(day, LAST_DATA_DAY)) || h0;
      const ratio = Math.min(2.6, Math.max(0.06, Math.pow(h1 / h0, 0.55)));
      p *= ratio * Math.max(0.35, 1 - 0.1 * years);
    } else p *= Math.pow(1.02, Math.max(0, (day - toDay('2010-01-01')) / 365));
    return Math.max(1, Math.round(p));
  }
  available(item, day = this.s.day) {
    if (day < item.releaseDay) return false;
    const years = (day - item.releaseDay) / 365;
    if (item.type === 'gpu' || item.type === 'cpu') return years < 7;
    if (item.type === 'mobo' || item.type === 'psu') return years < 9;
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
    if (s.flags.boughtGpu) { this.grant('build'); this.grant('speed2'); }
    if (this.has('build')) { let hot = false; for (const id of s.unlocked) if ((this.summary[id]?.temp || 0) > 30) hot = true; if (hot) this.grant('heat'); }
    if (s.chapter >= 1) { this.grant('rigs'); this.grant('autosell'); this.grant('speed3'); this.grant('company'); this.grant('build'); this.grant('speed2'); this.grant('market'); }
    if (s.chapter >= 1 && s.day >= toDay('2011-10-07')) this.grant('coins');
    if (s.chapter >= 1 && s.day >= toDay('2011-06-20')) this.grant('cold');
    if (s.unlocked.length >= 2) this.grant('map');
    if (s.chapter >= 2) { this.grant('techs'); this.grant('ranking'); this.grant('loan'); this.grant('buycoins'); this.grant('coins'); this.grant('cold'); this.grant('heat'); }
  }
  startMining(uid) { const o = this.findObj(uid); if (!o) return false; o.mode = 'auto'; this.s.flags.miningStarted = true; this.s.flags.seenPc = true; this.checkGoals(); this.dayUpdate(true); this.emit('objects', this.facOf(uid)); return true; }
  // Zentraler Geld-Check: nur kaufen, was wirklich bezahlt werden kann (kein Kauf bei Minus-Konto)
  canAfford(usd) { return Number.isFinite(usd) && usd >= 0 && Number.isFinite(this.s.cash) && this.s.cash >= usd; }
  addObject(facId, type, x, z, rot, parts, free = false) {
    const def = PLACEABLE[type];
    const o = { uid: this.s.nextUid++, type, x, z, rot, coin: 'auto', broken: false, bought: this.s.day };
    if (def.kind === 'rig') o.parts = parts || { mobo: null, cpu: null, psu: null, gpus: [] };
    if (def.kind === 'holder') o.items = [];
    if (!free) { const p = this.itemPrice(def); if (!this.canAfford(p)) return null; this.s.cash -= p; this.s.stats.spentHW += p; }
    this.s.fac[facId].objects.push(o);
    if (def.kind === 'device' && def.look !== 'fpga' && def.look !== 'usb') this.s.flags.boughtAsic = true;
    this.dayUpdate(true);
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
    if (o.parts) for (const pid of this.partIds(o)) v += this.itemPrice(PART[pid]) * 0.5;
    if (o.items) for (const it of o.items) v += this.itemPrice(PLACEABLE[it.id]) * (it.b ? 0.2 : 0.5);
    if (o.broken) v *= 0.4;
    return Math.round(v);
  }
  partIds(o) { const p = o.parts; return [p.mobo, p.cpu, p.psu, ...p.gpus].filter(Boolean); }

  // Teil in Rig einbauen (altes wird verkauft)
  setPart(uid, slot, partId, gpuIndex = 0) {
    const o = this.findObj(uid); if (!o || !o.parts) return false;
    const part = partId ? PART[partId] : null;
    const mult = slot === 'psu' ? this.psuCount(o) : 1;
    const price = part ? this.itemPrice(part) * mult : 0;
    let old = slot === 'gpu' ? o.parts.gpus[gpuIndex] : o.parts[slot];
    const refund = old ? Math.round(this.itemPrice(PART[old]) * 0.5 * mult) : 0;
    if (!Number.isFinite(price) || this.s.cash + refund < price || (price > refund && this.s.cash < 0)) return false;
    this.s.cash += refund - price; this.s.stats.spentHW += price;
    if (slot === 'gpu') {
      if (partId) o.parts.gpus[gpuIndex] = partId; else o.parts.gpus.splice(gpuIndex, 1);
      o.parts.gpus = o.parts.gpus.filter(Boolean);
      if (partId) this.s.flags.boughtGpu = true;
    } else {
      o.parts[slot] = partId;
      if (slot === 'mobo') { const cap = this.rigGpuCap(o); if (o.parts.gpus.length > cap) { for (const g of o.parts.gpus.slice(cap)) this.s.cash += Math.round(this.itemPrice(PART[g]) * 0.5); o.parts.gpus = o.parts.gpus.slice(0, cap); } }
    }
    this.dayUpdate(true); this.emit('objects', this.facOf(uid));
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
    const maxCap = Math.max(...this.partList('psu').map((x) => x.cap)) * this.psuCount(o);
    while (o.parts.gpus.length < cap && this.canAfford(this.itemPrice(PART[gpuId]))) {
      if (this.rigWatt(o) + PART[gpuId].watt > maxCap) { this.toast(`Mehr GPUs schafft kein verfügbares Netzteil (max. ${maxCap} W).`, 'info'); break; }
      if (!this.setPart(uid, 'gpu', gpuId, o.parts.gpus.length)) break; n++;
    }
    if (o.parts.psu && this.rigWatt(o) > PART[o.parts.psu].cap * this.psuCount(o)) { const ps = this.fitPsu(o); if (ps && ps.id !== o.parts.psu) this.setPart(uid, 'psu', ps.id); }
    return n;
  }
  cloneCost(o) {
    const def = PLACEABLE[o.type]; let c = this.itemPrice(def);
    if (o.parts) { for (const id of this.partIds(o)) c += this.itemPrice(PART[id]) * (id === o.parts.psu ? this.psuCount(o) : 1); }
    if (o.items) for (const it of o.items) c += this.itemPrice(PLACEABLE[it.id]);
    return Math.round(c);
  }
  cloneObject(src, facId, x, z, rot) {
    const cost = this.cloneCost(src); if (!this.canAfford(cost)) return null;
    const def = PLACEABLE[src.type];
    const o = { uid: this.s.nextUid++, type: src.type, x, z, rot, coin: src.coin, broken: false, bought: this.s.day };
    if (src.parts) o.parts = JSON.parse(JSON.stringify(src.parts));
    if (src.items) o.items = src.items.map((i) => ({ id: i.id, b: 0 }));
    this.s.cash -= cost; this.s.stats.spentHW += cost;
    this.s.fac[facId].objects.push(o); this.dayUpdate(true); this.emit('objects', facId); return o;
  }
  holderAdd(uid, devId, n = 1) {
    const o = this.findObj(uid); if (!o || !o.items) return 0;
    const def = PLACEABLE[o.type], dev = PLACEABLE[devId];
    const price = this.itemPrice(dev);
    let added = 0;
    while (added < n && o.items.length < def.slots && this.canAfford(price)) {
      o.items.push({ id: devId, b: 0 }); this.s.cash -= price; this.s.stats.spentHW += price; added++;
    }
    if (added) { if (dev.look !== 'fpga' && dev.look !== 'usb') this.s.flags.boughtAsic = true; this.dayUpdate(true); this.emit('objects', this.facOf(uid)); }
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
    if (o.items) { let c = 0; for (const it of o.items) if (it.b) c += this.itemPrice(PLACEABLE[it.id]) * 0.08; return Math.round(c); }
    let base = this.itemPrice(PLACEABLE[o.type]);
    if (o.parts) for (const pid of this.partIds(o)) base += this.itemPrice(PART[pid]);
    return Math.max(5, Math.round(base * 0.08));
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
        r.units.push({ hash: { [d.algo]: d.hash * n * ah }, vram: d.vram || 99, w: d.watt * n * ap });
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
    let watt = 0, heat = 0, cool = fd.baseCool * this.fx('cool'), rev = 0; const per = new Map(); const hashByAlgo = {};
    const elecP = this.elecPrice(facId, day);
    let coolCap = 0, coolW = 0; const coolers = [];
    for (const o of f.objects) {
      const a = this.analyze(o, day, elecP); per.set(o.uid, a);
      if (PLACEABLE[o.type].kind === 'cooling') { coolCap += a.cool; coolW += a.watt; coolers.push(a); continue; }
      watt += a.watt; heat += a.heat;
      for (const u of a.units) { rev += u.rev; if (u.algo) hashByAlgo[u.algo] = (hashByAlgo[u.algo] || 0) + u.h; }
    }
    // Thermostat: Kühlgeräte laufen nur so stark wie nötig
    const util = coolCap ? Math.min(1, Math.max(0.05, (heat - fd.baseCool * 0.6) / coolCap)) : 0;
    for (const a of coolers) { a.watt *= util; a.heat = a.watt; a.util = util; }
    watt += coolW * util; heat += coolW * util; cool += coolCap;
    const capKw = fd.power[f.power].kw;
    const ambient = 21 + fd.ambient + seasonOffset(day) * (fd.style === 'basement' ? 0.4 : 1);
    const temp = ambient + 12 * (heat / Math.max(1, cool));
    const throttle = temp > 38 ? Math.max(0.35, 1 - (temp - 38) * 0.05) : 1;
    const elec = this.elecPrice(facId, day);
    return { watt, heat, cool, rev, per, capKw, tripped: watt / 1000 > capKw, temp, throttle, elec, hashByAlgo };
  }

  // ---------- Kennzahlen ----------
  algoHash(algo) { let h = 0; for (const id of this.s.unlocked) { const sm = this.summary[id]; if (sm && !sm.tripped) h += (sm.hashByAlgo[algo] || 0) * sm.throttle; } return h; }
  walletValue() { let v = 0; for (const c of COINS) { const w = this.s.wallet[c.id]; v += (w.ex + w.cold) * this.price(c.id); } return v; }
  hardwareValue() { let v = 0; for (const f of Object.values(this.s.fac)) for (const o of f.objects) v += this.objectValue(o); return v; }
  netWorth() { return this.s.cash + this.walletValue() + this.hardwareValue() - (this.s.loan || 0); }
  monolithHash(day = this.s.day) { return day < toDay('2014-03-01') ? 0 : BTC_HASH(Math.min(day, LAST_DATA_DAY)) * MONOLITH_SHARE(day) * (this.s.endless ? this.s.endless.BTC.h : 1); }
  dailyProfit() { let rev = 0, cost = 0; for (const id of this.s.unlocked) { const sm = this.summary[id]; if (!sm) continue; if (!sm.tripped) { rev += sm.rev * sm.throttle; cost += Math.max(0, sm.watt / 1000 * 24 - this.solarKwh(id)) * sm.elec; } cost += FACILITY[id].rent / 30.4; } cost += this.s.staff.tech * this.techSalary() / 30.4; if (this.s.loan > 0) cost += this.s.loan * this.loanRate() / 365; return { rev, cost, net: rev - cost }; }
  techSalary(day = this.s.day) { return Math.round(2600 * Math.pow(1.03, (day - toDay('2014-01-01')) / 365)); }
  techCoverage() { let n = 0; for (const id of this.s.unlocked) for (const o of this.s.fac[id].objects) { const def = PLACEABLE[o.type]; if (def.kind === 'holder') n += o.items.length; else if (def.kind !== 'decor' && def.kind !== 'cooling') n++; } return n ? Math.min(1, (this.s.staff.tech * 60) / n) : 1; }

  // Zusammenfassungen für alle Standorte neu berechnen
  dayUpdate(silent = false) {
    this.summary = {};
    for (const id of this.s.unlocked) this.summary[id] = this.facSummary(id);
    if (this.s.feat) { this.checkFeatures(); this.checkGoals(); }
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
    const minedByCoin = {};
    let elecCost = 0;
    const netOwn = {};
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
          const coins = (u.h * sm.throttle) / (this.netHash(c, day) + (s.lastNet[c] || 0)) * COIN[c].emission(day) * this.fx('rev');
          minedByCoin[c] = (minedByCoin[c] || 0) + coins;
          netOwn[c] = (netOwn[c] || 0) + u.h * sm.throttle;
          if (c === 'LTC' && day >= COIN.DOGE.mergedFrom) { const w = (u.h * sm.throttle) / (this.netHash('DOGE', day) + (s.lastNet.DOGE || 0)) * COIN.DOGE.emission(day); minedByCoin.DOGE = (minedByCoin.DOGE || 0) + w; netOwn.DOGE = (netOwn.DOGE || 0) + u.h * sm.throttle; }
        }
        // Defekte (nur laufende Geräte verschleißen)
        if (a.watt > 0) this.wear(o, sm.temp, day);
      }
    }
    s.lastNet = netOwn;
    // Coins gutschreiben & Auto-Verkauf
    let sold = 0, minedUSD = 0;
    s.stats.coins ||= {};
    for (const [c, n] of Object.entries(minedByCoin)) {
      const p = this.price(c, day); minedUSD += n * p; s.stats.coins[c] = (s.stats.coins[c] || 0) + n;
      const sell = n * s.autoSell[c];
      sold += sell * p;
      const keep = n - sell;
      if (s.payoutCold) s.wallet[c].cold += keep; else s.wallet[c].ex += keep;
    }
    s.cash += sold - elecCost;
    s.stats.minedUSD += minedUSD; s.stats.sold += sold; s.stats.elec += elecCost;
    // Fixkosten
    let fixed = 0;
    for (const id of s.unlocked) fixed += FACILITY[id].rent / 30.4;
    fixed += s.staff.tech * this.techSalary(day) / 30.4;
    if (s.loan > 0) fixed += (s.loan * this.loanRate(day)) / 365;
    s.cash -= fixed;
    if (!Number.isFinite(s.cash)) s.cash = 0;
    if (s.cash < 0) {
      // Automatisch Coins von der Börse verkaufen, um das Minus auszugleichen
      let need = -s.cash + 50;
      for (const c of COINS) { const w = s.wallet[c.id], p = this.price(c.id, day); if (need <= 0 || !p || w.ex <= 0) continue; const n = Math.min(w.ex, need / (p * 0.995)); w.ex -= n; s.cash += n * p * 0.995; need -= n * p * 0.995; }
      if (s.cash < 0) { s.cash -= Math.min(-s.cash * 0.15 / 365, 5e6); if (!s.flags.warnedNeg || day - s.flags.warnedNeg > 30) { s.flags.warnedNeg = day; this.toast('Konto im Minus!', 'bad', 8000); } }
    }
    // Techniker reparieren
    this.techRepairs(day);
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
    this.checkMessages(); this.checkGoals();
    if (day === toDay('2021-05-26') && !s.flags.offerMade && s.unlocked.length >= 4) { s.flags.offerMade = true; this.emit('offer', Math.max(40e6, Math.round(this.netWorthFast() * 1.4 / 1e6) * 1e6)); }
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
    const nw = this.netWorthFast();
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
      const base = def.selfCooled ? 0.0004 : 0.0007 * heatMul;
      for (const it of o.items) { if (it.b) continue; if (Math.random() < base) it.b = 1; }
    } else if (def.kind === 'rig' || def.kind === 'device') {
      if (o.broken) return;
      const age = day - (o.bought || day);
      const p = 0.0009 * heatMul * (age > life ? 2.2 : 1) * (def.kind === 'rig' ? 1 + (o.parts.gpus.length * 0.15) : 1);
      if (Math.random() < p) { o.broken = true; this.toast(`${def.name} ist kaputt!`, 'bad'); this.emit('objects', this.facOf(o.uid)); }
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
    if (n) { s.cash -= cost; this.emit('objects', s.current); }
  }
  exchangeCrash(loss, text) {
    let lostUSD = 0, coldUSD = 0;
    for (const c of COINS) coldUSD += this.s.wallet[c.id].cold * this.price(c.id);
    const exUSD = COINS.reduce((a, c) => a + this.s.wallet[c.id].ex * this.price(c.id), 0);
    if (coldUSD > 1000 && exUSD < coldUSD * 0.05) { const ms = (this.s.milestones ||= {}); if (!ms.cold) { ms.cold = this.s.day; this.emit('milestone', 'Cold-Wallet-Profi', `${fmtUSD(coldUSD)} sicher – während andere alles verlieren.`); } }
    for (const c of COINS) { const w = this.s.wallet[c.id]; lostUSD += w.ex * loss * this.price(c.id); w.ex *= 1 - loss; }
    if (lostUSD > 1) this.toast(`${text} – du verlierst Coins im Wert von ${fmtUSD(lostUSD)}!`, 'bad', 9000);
    else this.toast(`${text} – deine Coins in der Cold-Wallet sind sicher.`, 'good', 7000);
  }
  endlessStep() {
    const s = this.s;
    if (!s.endless) s.endless = Object.fromEntries(COINS.map((c) => [c.id, { p: 1, h: 1 }]));
    for (const c of COINS) {
      const e = s.endless[c.id];
      const vol = c.id === 'BTC' ? 0.028 : 0.045;
      e.p *= Math.exp(gauss() * vol + 0.00025);
      e.h *= Math.exp(gauss() * 0.006 + (c.id === 'BTC' ? 0.0007 : 0.0003) + (Math.log(e.p) - Math.log(e.h)) * 0.002);
    }
  }

  // ---------- Story ----------
  helpers() {
    return {
      countPlaced: (fn) => { let n = 0; for (const id of this.s.unlocked) n += this.s.fac[id].objects.filter(fn).length; return n; },
      algoHash: (a) => this.algoHash(a), netWorth: () => this.netWorth(), monolithHash: () => this.monolithHash(), dailyRev: () => this.dailyProfit().rev,
      maxTemp: () => Math.max(...this.s.unlocked.map((id) => this.s.fac[id].temp || 21)),
      facilityTripped: () => this.s.unlocked.some((id) => this.s.fac[id].tripped),
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
  chapter() { return CHAPTERS[Math.min(this.s.chapter, CHAPTERS.length - 1)]; }
  checkGoals() {
    const s = this.s, h = this.helpers();
    const ch = CHAPTERS[s.chapter]; if (!ch) return;
    for (const g of ch.goals) if (!s.goals[g.id] && g.check(s, h)) { s.goals[g.id] = true; this.toast(`✔ ${g.text}`, 'good'); this.emit('goal', g); }
    const done = ch.goals.every((g) => s.goals[g.id]);
    if (done && s.day >= toDay(ch.minDate)) {
      if (ch.unlock) {
        s.chapter++;
        if (!s.unlocked.includes(ch.unlock)) this.emit('unlockable', ch.unlock);
      } else if (!s.flags.won) { s.flags.won = true; this.emit('won'); s.chapter++; }
    }
  }
  canPayGoal(g) { return this.canAfford(g.action.cost) || this.s.cash + this.exchangeValue() >= g.action.cost; }
  exchangeValue() { let v = 0; for (const c of COINS) { const w = this.s.wallet[c.id]; if (w && w.ex > 0) v += w.ex * this.price(c.id) * 0.995; } return v; }
  goalAction(g) {
    if (!this.canAfford(g.action.cost) && this.canPayGoal(g)) { let need = g.action.cost - this.s.cash + 0.01; for (const c of COINS) { const w = this.s.wallet[c.id], p = this.price(c.id); if (need <= 0 || !p || !(w.ex > 0)) continue; const n = Math.min(w.ex, need / (p * 0.995)); w.ex -= n; this.s.cash += n * p * 0.995; this.s.stats.sold += n * p * 0.995; need -= n * p * 0.995; } }
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
    this.s.cash -= f.cost; this.s.unlocked.push(facId);
    this.dayUpdate(true); this.emit('unlocked', facId); return true;
  }
  upgradePower(facId) {
    const f = this.s.fac[facId], fd = FACILITY[facId];
    const next = fd.power[f.power + 1]; if (!next || !this.canAfford(next.cost)) return false;
    this.s.cash -= next.cost; f.power++; this.dayUpdate(true); return true;
  }
  hireTech(n) { if (FACILITY[this.s.unlocked[this.s.unlocked.length - 1]].tier < 3 && !this.s.flags.gmbh) return false; if (n > 0 && !this.canAfford(n * this.techSalary())) return false; this.s.staff.tech = Math.max(0, this.s.staff.tech + n); this.dayUpdate(true); return true; }

  // ---------- Solaranlage (Green Mining wie im Vorbild) ----------
  solarStep(facId) { return { kinder: 0, keller: 6, werkstatt: 30, halle: 250, rz: 400, fjord: 0 }[facId] || 0; }
  solarPricePerKwp(day = this.s.day) { return Math.round(curveSolar(day)); }
  solarKwh(facId, day = this.s.day) { const kwp = this.s.fac[facId].solar || 0; if (!kwp) return 0; const doy = (day % 365.25) / 365.25; const season = 0.2 + 0.8 * (0.5 - 0.5 * Math.cos(2 * Math.PI * doy)); return kwp * 4.5 * season; }
  buildSolar(facId) { const kwp = this.solarStep(facId); const cost = kwp * this.solarPricePerKwp(); if (!kwp || !this.canAfford(cost)) return false; this.s.cash -= cost; this.s.fac[facId].solar = (this.s.fac[facId].solar || 0) + kwp; this.dayUpdate(true); return true; }

  // ---------- Bankkredit ----------
  loanRate(day = this.s.day) { return day < toDay('2022-06-01') ? 0.065 : day < toDay('2024-06-01') ? 0.115 : 0.09; }
  loanLimit() { return Math.max(0, Math.round((this.hardwareValue() * 0.5 + this.walletValue() * 0.25 + Math.max(0, this.s.cash) * 0.2) / 1000) * 1000 - (this.s.loan || 0)); }
  takeLoan(usd) { usd = Math.min(usd, this.loanLimit()); if (usd <= 0) return 0; this.s.loan = (this.s.loan || 0) + usd; this.s.cash += usd; this.dayUpdate(true); return usd; }
  repayLoan(usd) { usd = Math.min(usd, this.s.loan || 0, Math.max(0, this.s.cash)); if (usd <= 0) return 0; this.s.loan -= usd; this.s.cash -= usd; this.dayUpdate(true); return usd; }

  // ---------- Wallet ----------
  sell(coin, frac) {
    const w = this.s.wallet[coin]; const n = w.ex * frac; if (n <= 0) return 0;
    const usd = n * this.price(coin) * 0.995; w.ex -= n; this.s.cash += usd; this.s.stats.sold += usd; this.dayUpdate(true); return usd;
  }
  buy(coin, usd) {
    usd = Math.min(+usd || 0, this.s.cash); if (!(usd > 0) || !this.canAfford(usd)) return 0;
    const p = this.price(coin); if (!p) return 0;
    this.s.wallet[coin].ex += (usd * 0.995) / p; this.s.cash -= usd; this.dayUpdate(true); return usd;
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
  if (a === 0) return '0 $';
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
