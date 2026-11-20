// Fähigkeiten 2.0 – Spiellogik als Methoden für Game (Object.assign(Game.prototype, SKILL_METHODS) in game.js).
// Daten: src/data/skills.js · Menü/Baum: src/ui/skills.js · Mini-Spiel: src/ui/minigame.js
// Zustand s.sk = { ep: {w,r,g}, spent: {w,r,g}, known: {id: Tag}, src: {id: Weg}, learning: null | {id, via, d0, until},
//   queue: [{id, via}], teach: null | {id, who, until}, books: {Buch-ID: Tag}, rep: geschaffte Selbst-Reparaturen, clean: saubere,
//   day: {d, w, r, g} (Tagesdeckel), open: {id: Tag} (schon als „neu lernbar“ gemeldet), prof: {Gerätetyp: 1} (erstes Profil) }
// Sperren und Betriebssystem gelten mit s.flags.sk2 (neue Spiele über startTutor, alte Spielstände nach der Migration, bot10).
import { SKILLS, SKILL, SKILL_CAT, POTS, XP_POT, EP_DAY_CAP, ptsFor, epFor, TEACHERS, PROFILES, PROFILE_IMM, FIRMWARE, AUTOTUNE, WK, SERVICE, OS, REPAIR, BULK, FEE, PEAK, BOOK, TECH_MAP, tierMax } from '../data/skills.js';
import { PLACEABLE, PART } from '../data/hardware.js';
import { FACILITY, UPGRADES } from '../data/world.js';
import { toDay } from '../data/history.js';

const potOf = (id) => SKILL_CAT[SKILL[id]?.cat]?.pot || 'w';
const isRig = (o) => PLACEABLE[o?.type]?.kind === 'rig' && !!o.parts;
const isAsic = (o) => { const d = PLACEABLE[o?.type]; if (!d) return false; if (d.kind === 'device') return d.look !== 'fpga'; return d.kind === 'holder' && (o.items || []).some((it) => PLACEABLE[it.id]?.look !== 'fpga'); };
const monthName = (iso) => { const [y, m] = iso.split('-'); return `${['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][+m - 1]} ${y}`; };

export function skEmpty() { return { ep: { w: 0, r: 0, g: 0 }, spent: { w: 0, r: 0, g: 0 }, known: {}, src: {}, learning: null, queue: [], teach: null, books: {}, rep: 0, clean: 0, day: { d: -1, w: 0, r: 0, g: 0 }, open: {}, prof: {} }; }

// Alte Spielstände (ohne s.sk): Erfahrung umrechnen, Grundlagen und Gekauftes als gelernt, Geräte mit Betriebssystem, Techniken → Fähigkeiten/Ausbauten
export function migrateSkills(s) {
  if (s.sk && typeof s.sk === 'object') { const e = skEmpty(); for (const k of Object.keys(e)) if (s.sk[k] == null) s.sk[k] = e[k]; for (const k of ['ep', 'spent', 'day']) s.sk[k] = { ...e[k], ...s.sk[k] }; for (const id of Object.keys(s.sk.known)) if (!SKILL[id]) delete s.sk.known[id]; return false; }
  const sk = (s.sk = skEmpty()), old = s.skills || {}, day = s.day || 1, has = (fn) => Object.values(s.fac || {}).some((f) => (f.objects || []).some(fn)), learn = (id) => { if (SKILL[id] && !sk.known[id]) { sk.known[id] = day; sk.src[id] = 'migr'; } };
  sk.ep.w = Math.round(old.hw || 0); sk.ep.g = Math.round(old.trade || 0); sk.ep.r = Math.round((old.mining || 0) * 0.4); // Mining-EP waren passiv verdient
  for (const k of SKILLS) if (k.learn.length === 1 && k.learn[0].via === 'msg' && (!k.from || day >= toDay(k.from))) learn(k.id); // Grundlagen, deren Zeit vorbei ist
  learn('windows'); learn('gpuminer'); if (s.flags?.miningStarted) learn('boerse');
  if (s.chapter >= 1 || has((o) => ['crate', 'frame6', 'frame8', 'frame12'].includes(o.type))) learn('riser');
  if (s.chapter >= 1) { learn('linux'); if (day >= toDay('2011-10-01')) learn('image'); }
  if (has((o) => PLACEABLE[o.type]?.look === 'fpga' || (o.items || []).some((it) => PLACEABLE[it.id]?.look === 'fpga'))) learn('fpga');
  if (day >= toDay('2011-06-20') && s.chapter >= 1) learn('cold');
  const techs = s.techs || {};
  for (const [t, m] of Object.entries(TECH_MAP)) {
    if (!techs[t]) continue;
    for (const id of m.skills || []) learn(id);
    for (const [fid, uid] of Object.entries(m.up || {})) if (s.fac?.[fid]) (s.fac[fid].up ||= {})[uid] ||= techs[t];
  }
  for (const f of Object.values(s.fac || {})) for (const o of f.objects || []) {
    const d = PLACEABLE[o.type]; if (!d) continue;
    if (d.kind === 'rig' && o.parts) { o.os ||= o.uid === 1 && o.type === 'tower' ? 'xp' : 'linux'; if (techs.undervolt && o.parts.gpus?.length) o.prof ||= 'eco'; }
    if (d.look === 'fpga') o.bit = 1;
    if (techs.firmware && (d.kind === 'device' || d.kind === 'holder') && d.look !== 'fpga') o.fw = 1;
  }
  (s.flags ||= {}).sk2 = 1;
  const pts = ['w', 'r', 'g'].reduce((a, p) => a + ptsFor(sk.ep[p]), 0);
  if (s.chapter >= 1 || Object.keys(techs).length) (s.mods ||= []).push({ key: 'rev', mult: 1.1, fac: null, until: day + 120, src: 'migr2' }); // Übergangshilfe: die alten Boni fallen weg
  (s.messages ||= []).push({ id: 'sk2:migr', day, from: 'Deniz', text: `Neues Menü auf T: deine Fähigkeiten als großer Baum. Was du dir schon draufgeschafft hast, ist gelernt${pts ? ` – und du hast ${pts} ${pts === 1 ? 'Punkt' : 'Punkte'} zu verteilen` : ''}. Ich hab vor dem Update alle Rigs noch mal durchoptimiert, das trägt dich die nächsten Monate.`, read: false });
  return true;
}

export const SKILL_METHODS = {
  // ---------- Grundzustand ----------
  skOn() { return !!this.s?.flags?.sk2; },
  knows(id) { return !!this.s?.sk?.known?.[id]; },
  learnSkill(id, src = '') {
    const s = this.s, k = SKILL[id]; if (!k || !s.sk || this.knows(id)) return false;
    s.sk.known[id] = s.day || 1; s.sk.src[id] = src || 'msg';
    if (s.sk.learning?.id === id) s.sk.learning = null; s.sk.queue = s.sk.queue.filter((q) => q.id !== id); if (s.sk.teach?.id === id) s.sk.teach = null;
    this.emit('skill', id, src); return true;
  },
  // ---------- Erfahrung und Punkte ----------
  addEp(pot, n, quiet = false) {
    const s = this.s; if (!s?.sk || !(n > 0) || !POTS[pot]) return 0;
    const d = s.sk.day; if (d.d !== s.day) { d.d = s.day; d.w = d.r = d.g = 0; }
    const add = Math.round(Math.min(n, EP_DAY_CAP - d[pot])); if (add <= 0) return 0;
    const before = ptsFor(s.sk.ep[pot]); s.sk.ep[pot] += add; d[pot] += add; const after = ptsFor(s.sk.ep[pot]);
    if (!s.flags?.tutor || s.flags.boughtGpu) this.grant('skills'); // Anlernen: Fähigkeiten erst nach der ersten Grafikkarte
    if (!quiet || after > before) this.emit('xp', pot, add, after > before ? after : 0);
    return add;
  },
  fpTotal(pot) { return ptsFor(this.s.sk?.ep?.[pot] || 0); },
  fpFree(pot) { return Math.max(0, this.fpTotal(pot) - (this.s.sk?.spent?.[pot] || 0)); },
  epProgress(pot) { const ep = this.s.sk?.ep?.[pot] || 0, n = ptsFor(ep), lo = epFor(n), hi = epFor(n + 1); return { ep, n, cur: ep - lo, need: hi - lo, pc: Math.round(((ep - lo) / (hi - lo)) * 100) }; },
  // ---------- Zustand einer Fähigkeit: known | learning | open | soon | later | wip (Handgriff kommt später) | auto (kommt per Handy) ----------
  skillState(id) {
    const s = this.s, k = SKILL[id]; if (!k) return { st: 'later', why: '' };
    if (this.knows(id)) return { st: 'known', why: '' };
    const L = s.sk; if (L?.learning?.id === id || L?.teach?.id === id || L?.queue?.some((q) => q.id === id)) return { st: 'learning', why: L.learning?.id === id || L.teach?.id === id ? '' : 'in der Warteschlange' };
    const tm = tierMax(s, FACILITY), from = k.from ? toDay(k.from) : 0;
    if (from && s.day < from) return { st: from - s.day > 540 ? 'later' : 'soon', why: `ab ${monthName(k.from)}` };
    if (k.minTier && tm < k.minTier) { const f = Object.values(FACILITY).find((x) => x.tier === k.minTier); return { st: k.minTier > tm + 1 ? 'later' : 'soon', why: `ab ${f?.short === 'RZ' ? 'dem Rechenzentrum' : f?.short === 'Halle' ? 'der Lagerhalle' : 'Standort ' + (f?.short || k.minTier)}` }; }
    const miss = (k.needs || []).filter((n) => !this.knows(n)); if (miss.length) return { st: 'soon', why: `braucht ${miss.map((n) => SKILL[n]?.name || n).join(' und ')}` };
    const gate = k.gate?.(s, this); if (gate) return { st: 'soon', why: gate };
    if (k.soon) return { st: 'wip', why: 'Handgriff kommt mit einem späteren Update' };
    if (k.learn.every((w) => w.via === 'msg')) return { st: 'auto', why: 'Kommt von selbst, wenn es so weit ist' };
    return { st: 'open', why: '' };
  },
  courseOk() { const s = this.s; return tierMax(s, FACILITY) >= 2 || s.flags.gmbh ? '' : 'Kurse gibt es ab der Werkstatt'; },
  courseCost(w) { const rev = Math.max(0, this.dailyProfit?.().rev || 0); return Math.round(Math.min(w.cap || Infinity, Math.max(w.min || 0, (w.rev || 0) * rev)) / 10) * 10; },
  bookPending(id) { return this.pendingItems(false).some((it) => it.k === 'book' && it.id === id); },
  // Lernwege einer Fähigkeit als Knöpfe: { i, via, label, sub, ok, why, cost, days }
  skillWays(id) {
    const s = this.s, k = SKILL[id]; if (!k) return [];
    const st = this.skillState(id).st, open = st === 'open', busy = !!s.sk.learning, out = [];
    k.learn.forEach((w, i) => {
      if (w.via === 'msg') return;
      const r = { i, via: w.via, ok: open, why: open ? '' : '', cost: 0, days: w.days || 0, label: '', sub: '' };
      if (w.via === 'pts') { const pot = potOf(id), free = this.fpFree(pot); r.label = `${w.n} ${POTS[pot].name}-${w.n === 1 ? 'Punkt' : 'Punkte'}`; r.sub = `${free} frei`; if (open && free < w.n) { r.ok = false; r.why = `noch ${w.n - free} ${w.n - free === 1 ? 'Punkt' : 'Punkte'} sammeln`; } }
      else if (w.via === 'forum') { r.label = 'Im Forum mitlesen'; r.sub = `gratis · ${w.days} ${w.days === 1 ? 'Tag' : 'Tage'}${busy ? ' · danach' : ''}`; }
      else if (w.via === 'book') {
        const own = !!s.sk.books[w.id], pend = this.bookPending(w.id); r.cost = own || pend ? 0 : w.price; r.label = `Buch „${w.title}“`;
        r.sub = own ? `liegt bereit · ${w.days} ${w.days === 1 ? 'Tag' : 'Tage'} lesen` : pend ? 'unterwegs – kommt morgen früh' : `${w.price} $ · ${w.days} ${w.days === 1 ? 'Tag' : 'Tage'} lesen${this.parcelMode() ? ' · als Paket' : ''}`;
        if (open && pend) { r.ok = false; r.why = 'Das Buch ist schon bestellt'; } else if (open && !own && !this.canAfford(w.price)) { r.ok = false; r.why = `fehlen ${Math.ceil(w.price - s.cash)} $`; }
      } else if (w.via === 'course') {
        const c = this.courseCost(w), why = this.courseOk(); r.cost = c; r.label = `Kurs „${w.title}“`; r.sub = `${c.toLocaleString('de-DE')} $ · ${w.days} Tage${busy ? ' · danach' : ''}`;
        if (open && why) { r.ok = false; r.why = why; } else if (open && !this.canAfford(c)) { r.ok = false; r.why = 'Dafür reicht das Geld nicht'; }
      } else if (w.via === 'person') {
        const T = TEACHERS[w.who], fam = s.rel && w.who in s.rel, lv = fam ? s.rel[w.who] || 0 : 0, reach = T?.ok(s, this) || '';
        r.label = `${T?.name || w.who} fragen`; r.sub = fam ? `ab Beziehung ${w.rel} · bis morgen` : 'bis morgen';
        if (open && w.flag && !s.flags[w.flag]) { r.ok = false; r.why = w.who === 'papa' ? 'Papa hat noch keine Zeit dafür' : 'Noch nicht möglich'; }
        else if (open && reach) { r.ok = false; r.why = reach; } else if (open && fam && lv < w.rel) { r.ok = false; r.why = `Beziehung ${w.rel} nötig (jetzt ${lv})`; }
        else if (open && s.sk.teach) { r.ok = false; r.why = `Du lernst gerade bei ${TEACHERS[s.sk.teach.who]?.name || 'jemandem'}`; }
      }
      out.push(r);
    });
    return out;
  },
  // Lernen starten (i = Index im learn-Array). '' = gestartet, sonst Grund
  startLearn(id, i) {
    const s = this.s, k = SKILL[id], w = k?.learn?.[i]; if (!w) return 'Geht nicht';
    const r = this.skillWays(id).find((x) => x.i === i); if (!r || !r.ok) return r?.why || this.skillState(id).why || 'Geht gerade nicht';
    const slot = (via, days) => { const L = { id, via, d0: s.day, until: s.day + Math.max(1, days) }; if (s.sk.learning) s.sk.queue.push({ id, via, days }); else s.sk.learning = L; };
    if (w.via === 'pts') { s.sk.spent[potOf(id)] += w.n; this.learnSkill(id, 'pts'); }
    else if (w.via === 'forum') slot('forum', w.days);
    else if (w.via === 'book') {
      if (!s.sk.books[w.id]) {
        if (this.parcelMode()) { this.orderAdd([{ k: 'book', id: w.id }], w.price); s.sk.wantRead = { ...(s.sk.wantRead || {}), [w.id]: id }; this.emit('skills'); return ''; }
        s.cash -= w.price; s.sk.books[w.id] = s.day || 1;
      }
      slot('book', w.days);
    } else if (w.via === 'course') { s.cash -= r.cost; slot('course', w.days); }
    else if (w.via === 'person') s.sk.teach = { id, who: w.who, until: s.day + 1 };
    this.dayUpdate(true); this.emit('skills'); return '';
  },
  stopLearn() { const s = this.s, L = s.sk?.learning; if (!L) return false; s.sk.learning = null; this.skNext(); this.emit('skills'); return true; }, // Buch bleibt, Forum fängt neu an, Kursgeld ist weg
  skNext() { const s = this.s; while (!s.sk.learning && s.sk.queue.length) { const q = s.sk.queue.shift(); if (this.knows(q.id)) continue; s.sk.learning = { id: q.id, via: q.via, d0: s.day, until: s.day + Math.max(1, q.days || 1) }; } },
  // Buch aus dem Paket (pickupParcel)
  skBook(id) { const s = this.s, b = BOOK[id]; if (!b || !s.sk) return; s.sk.books[id] ||= s.day || 1; const want = s.sk.wantRead?.[id]; if (want && !this.knows(want)) { delete s.sk.wantRead[id]; if (s.sk.learning) s.sk.queue.push({ id: want, via: 'book', days: b.days }); else s.sk.learning = { id: want, via: 'book', d0: s.day, until: s.day + b.days }; } this.emit('skills'); },
  // Pflicht-Auswege (keine Sackgasse) und Grundlagen per Handy – bei jeder Prüfung (checkFeatures)
  skDue() {
    const s = this.s; if (!s?.sk) return;
    for (const k of SKILLS) { if (!k.due || this.knows(k.id)) continue; let ok = false; try { ok = k.due(s, this); } catch (e) { ok = false; } if (!ok) continue; if (this.learnSkill(k.id, 'msg') && k.dueMsg) this.pushMsg(k.dueMsg); }
  },
  // Täglich: Lernen voran, Lehrstunden, Skript-Profile, Roboter, Limit-Orders, neu lernbare Fähigkeiten melden
  skDay(day = this.s.day) {
    const s = this.s; if (!s?.sk) return;
    const L = s.sk.learning; if (L && day >= L.until) { s.sk.learning = null; this.learnSkill(L.id, L.via); this.skNext(); }
    const T = s.sk.teach; if (T && day >= T.until) { s.sk.teach = null; this.learnSkill(T.id, 'person:' + T.who); }
    this.skDue();
    for (const id of s.unlocked) if (s.fac[id]?.skript && this.knows('skript')) this.autoProfiles(id);
    this.robotDay(day);
    this.limitDay(day);
    if (day % 7 === 0 || !s.sk.openChecked) { s.sk.openChecked = 1; const neu = []; for (const k of SKILLS) if (!s.sk.open[k.id] && !this.knows(k.id) && this.skillState(k.id).st === 'open') { s.sk.open[k.id] = day; neu.push(k.id); } if (neu.length) this.emit('skillopen', neu); }
  },
  skillsOpenN() { let n = 0; for (const k of SKILLS) if (this.skillState(k.id).st === 'open' && this.skillWays(k.id).some((w) => w.ok)) n++; return n; },

  // ---------- Sperren mit Ausweg (nur mit s.flags.sk2) ----------
  skillLock(def) { if (!this.skOn() || !def?.skill || this.knows(def.skill)) return ''; return `Erst lernen: ${SKILL[def.skill]?.name || def.skill} (T)`; },

  // ---------- Betriebssystem (Nr. 5, 6, 18, 32) ----------
  osNeed(o) { return this.skOn() && isRig(o) && o.os === null; },
  osNeedAny() { const s = this.s; if (!this.skOn()) return false; for (const id of s.unlocked) for (const o of s.fac[id].objects) if (this.osNeed(o)) return true; return this.pendingItems().some((e) => e.k === 'place' && PLACEABLE[e.type]?.kind === 'rig' && !e.ready); }, // auch bestellt, unterwegs oder ausgepackt
  osPrice(kind) { return kind === 'win' ? OS.win.price(this.s.day) : 0; },
  osWhy(o, kind) { if (!this.osNeed(o)) return 'Hat schon ein System'; if (kind === 'linux' && !this.knows('linux')) return 'Erst Linux lernen (T)'; if (kind === 'win' && !this.canAfford(this.osPrice('win'))) return `Die Lizenz kostet ${this.osPrice('win')} $`; return ''; },
  osInstall(uid, kind, viaImage = false) {
    const o = this.findObj(uid); if (!o || this.osWhy(o, kind) || (viaImage && !this.knows('image'))) return false;
    if (kind === 'win') this.s.cash -= this.osPrice('win');
    o.os = kind; this.addEp('r', viaImage ? 5 : 20, viaImage); this.learnSkill('windows', 'msg');
    this.dayUpdate(true); this.emit('objects', this.facOf(uid)); return true;
  },
  osImageAll(facId = this.s.current) { if (!this.knows('image')) return 0; let n = 0; for (const o of this.s.fac[facId]?.objects || []) if (this.osNeed(o) && this.osInstall(o.uid, 'linux', true)) n++; return n; },
  osAutoOk(facId) { return this.knows('linux') && (this.knows('fernwartung') || (FACILITY[facId]?.tier ?? 0) >= 4); },
  // Neuer Rig (Kauf, Bausatz, Paket): fertig montiert vom Kontakt = Windows drauf; sonst ohne System, außer Automatik
  rigNew(o, ready, facId) { if (!this.skOn() || !isRig(o)) return; if (ready) { o.os = 'win'; return; } o.os = null; if (this.osAutoOk(facId)) { o.os = 'linux'; this.emit('robo', facId, null, o.uid, 'net'); } },

  // ---------- Takt & Spannung, Lüfterkurve, Skript (Nr. 7, 42, 43) und ASIC-Firmware (Nr. 27) ----------
  profKind(o) { const d = PLACEABLE[o?.type]; if (!d) return ''; if (isRig(o)) return o.parts.gpus.length ? 'gpu' : ''; if (d.kind === 'device' || d.kind === 'holder') return isAsic(o) ? 'asic' : ''; return ''; },
  profOk(o) { const k = this.profKind(o); if (k === 'gpu') return this.knows('takt') ? '' : 'Erst „Takt und Spannung“ lernen (T)'; if (k === 'asic') return this.knows('asictakt') || (o.fw && this.knows('firmware')) ? '' : 'Erst „ASIC-Takt im Web-Interface“ lernen (T)'; return 'Nur für Grafikkarten oder geflashte ASICs'; },
  setProfile(uid, p) {
    const o = this.findObj(uid); if (!o || !PROFILES[p] || this.profOk(o)) return false;
    if (p === 'std') delete o.prof; else o.prof = p;
    const k = o.type + ':' + p; if (p !== 'std' && !this.s.sk.prof[k]) { this.s.sk.prof[k] = 1; this.addEp('r', 25); }
    this.dayUpdate(true); this.emit('objects', this.facOf(uid)); return true;
  },
  profileAll(facId, p, kind = null) { let n = 0; for (const o of this.s.fac[facId]?.objects || []) { const k = this.profKind(o); if (!k || (kind && k !== kind) || this.profOk(o) || (o.prof || 'std') === p) continue; if (p === 'std') delete o.prof; else o.prof = p; n++; } if (n) { this.dayUpdate(true); this.emit('objects', facId); } return n; },
  setFan(uid, f) { const o = this.findObj(uid); if (!o || this.profKind(o) !== 'gpu' || !this.knows('luefter')) return false; if (f === 'quiet' || f === 'cool') o.fan = f; else delete o.fan; this.dayUpdate(true); return true; },
  // Faustregel 9.4: Eco bei Strom > 35 % des Ertrags oder > 34 °C, Turbo bei < 15 % und < 30 °C
  profRule(facId, kind = 'gpu') {
    const sm = this.summary?.[facId]; if (!sm) return 'std'; let rev = 0, w = 0;
    for (const o of this.s.fac[facId].objects) { if (this.profKind(o) !== kind) continue; const a = sm.per.get(o.uid); if (!a) continue; for (const u of a.units) rev += u.rev || u.potential || 0; w += a.watt; }
    if (!(rev > 0)) return 'std'; const share = ((w / 1000) * 24 * this.elecPrice(facId)) / rev;
    return share > 0.35 || sm.temp > 34 ? 'eco' : share < 0.15 && sm.temp < 30 ? 'turbo' : 'std';
  },
  autoProfiles(facId) { const p = this.profRule(facId, 'gpu'); let n = 0; for (const o of this.s.fac[facId].objects) { if (this.profKind(o) !== 'gpu' || o.os !== 'linux' && this.skOn() || this.profOk(o) || (o.prof || 'std') === p) continue; if (p === 'std') delete o.prof; else o.prof = p; n++; } return n; },
  setSkript(facId, on) { if (!this.knows('skript') || !this.s.fac[facId]) return false; this.s.fac[facId].skript = on ? 1 : 0; if (on) this.autoProfiles(facId); this.dayUpdate(true); return true; },
  flashOk(o) { if (!this.knows('firmware')) return 'Erst „ASIC-Firmware flashen“ lernen (T)'; if (!isAsic(o)) return 'Nur für ASIC-Miner'; if (o.fw) return 'Schon geflasht'; return ''; },
  flash(uid, quiet = false) {
    const o = this.findObj(uid); if (!o || this.flashOk(o)) return null; o.fw = 1; let brick = false;
    if (Math.random() < FIRMWARE.brick) { brick = true; if (o.items?.length) o.items[Math.floor(Math.random() * o.items.length)].b = 1; else o.broken = true; }
    this.addEp('r', 20, quiet); if (!quiet) { this.dayUpdate(true); this.emit('objects', this.facOf(uid)); } return { brick };
  },
  flashAll(facId) { let n = 0, b = 0; for (const o of this.s.fac[facId]?.objects || []) { const r = this.flash(o.uid, true); if (r) { n++; if (r.brick) b++; } } if (n) { this.dayUpdate(true); this.emit('objects', facId); } return { n, b }; },
  atOk(o) { if (!this.knows('autotuning')) return 'Erst „Autotuning“ lernen (T)'; if (this.profKind(o) !== 'asic') return 'Nur für ASIC-Miner'; if (!o.fw) return 'Erst die Firmware flashen'; return ''; },
  setAt(uid, on) { const o = this.findObj(uid); if (!o || this.atOk(o)) return false; if (on) o.at = 1; else delete o.at; this.dayUpdate(true); this.emit('objects', this.facOf(uid)); return true; },
  atAll(facId) { let n = 0; for (const o of this.s.fac[facId]?.objects || []) if (!o.at && !this.atOk(o)) { o.at = 1; n++; } if (n) { this.dayUpdate(true); this.emit('objects', facId); } return n; },
  siteImm(facId) { return !!facId && (UPGRADES[facId] || []).some((u) => u.imm && this.upActive(facId, u)); },
  // Faktoren am Gerät { P, H, F } aus Profil, Firmware, Lüfterkurve (analyze, wear)
  devTune(o, facId = null) {
    let P = 1, H = 1, F = 1; const k = this.profKind(o);
    if (k === 'asic' && o.fw) { P *= FIRMWARE.P; H *= FIRMWARE.H; if (o.at) P *= AUTOTUNE.P; }
    if (k && o.prof && PROFILES[o.prof]) { const pr = o.prof === 'turbo' && k === 'asic' && this.siteImm(facId) ? PROFILE_IMM : PROFILES[o.prof]; P *= pr.P; H *= pr.H; F *= pr.F; }
    if (k === 'gpu' && o.fan === 'quiet') { P *= 0.97; F *= 1.25; } else if (k === 'gpu' && o.fan === 'cool') { P *= 1.03; F *= 0.8; }
    return { P, H, F };
  },
  // Verschleiß-Faktor: Profil, Wartung, Ausbauten am Standort (Staubfilter, Immersion)
  wearMul(o, facId = null, day = this.s.day) { let m = this.devTune(o, facId).F; if (o.serv && day - o.serv < SERVICE.days) m *= SERVICE.fail; if (facId) m *= this.upFx(facId, 'fail'); return m; },

  // ---------- Wartung (Nr. 9) ----------
  serviceCost(o) { const d = PLACEABLE[o?.type]; if (!d) return 0; if (d.kind === 'rig') return SERVICE.rig; if (d.kind === 'device') return SERVICE.dev; if (d.kind === 'holder') return SERVICE.dev * (o.items?.length || 0); return 0; },
  serviceWhy(o) { if (!this.knows('wartung')) return 'Erst „Wartung“ lernen (T)'; const c = this.serviceCost(o); if (!c) return 'Nichts zu warten'; if (o.serv && this.s.day - o.serv < 30) return 'Gerade erst gewartet'; if (!this.canAfford(c)) return `Material kostet ${c} $`; return ''; },
  service(uid, quiet = false) { const o = this.findObj(uid); if (!o || this.serviceWhy(o)) return false; this.s.cash -= this.serviceCost(o); o.serv = this.s.day || 1; const d = this.s.sk.day; if ((d.serv || 0) < 50 || d.d !== this.s.day) { this.addEp('w', 5, true); d.serv = (d.d === this.s.day ? d.serv || 0 : 0) + 5; } if (!quiet) { this.dayUpdate(true); this.emit('objects', this.facOf(uid)); } return true; },
  serviceAll(facId) { let n = 0; for (const o of this.s.fac[facId]?.objects || []) if (this.service(o.uid, true)) n++; if (n) { this.dayUpdate(true); this.emit('objects', facId); } return n; },

  // ---------- Wasserkühlung (Nr. 15) und FPGA-Bitstream (Nr. 21) ----------
  wkCost(o) { return WK.perGpu * Math.max(1, o?.parts?.gpus?.length || 0); },
  wkWhy(o) { if (!this.knows('wasser')) return 'Erst „Wasserkühlung“ lernen (T)'; if (this.profKind(o) !== 'gpu') return 'Nur für Rigs mit Grafikkarten'; if (o.wk) return 'Schon eingebaut'; if (!this.canAfford(this.wkCost(o))) return `Das Set kostet ${this.wkCost(o)} $`; return ''; },
  wkInstall(uid) { const o = this.findObj(uid); if (!o || this.wkWhy(o)) return false; this.s.cash -= this.wkCost(o); this.s.stats.spentHW += this.wkCost(o); o.wk = 1; this.addEp('w', 40); this.dayUpdate(true); this.emit('objects', this.facOf(uid)); return true; },
  bitNeed(o) { return this.skOn() && PLACEABLE[o?.type]?.look === 'fpga' && !o.bit; },
  bitLoad(uid) { const o = this.findObj(uid); if (!o || !this.bitNeed(o) || !this.knows('fpga')) return false; o.bit = 1; this.addEp('r', 20); this.dayUpdate(true); this.emit('objects', this.facOf(uid)); return true; },

  // ---------- Reparieren: selbst (Mini-Spiel), Routine (1 Klick), Roboter ----------
  repairSelfOk(o) { return !!o?.broken && isRig(o); }, // ASICs: Hashboard-Reparatur kommt später
  repairSelfCost(o) { return Math.max(1, Math.round(this.repairCost(o) * (this.knows('loeten') ? REPAIR.skill : REPAIR.self))); },
  repairRoutineOk(o) { return this.repairSelfOk(o) && this.knows('loeten') && (this.s.sk?.rep || 0) >= REPAIR.routine; },
  repairSelf(uid, res = {}) {
    const o = this.findObj(uid); if (!o || !this.repairSelfOk(o) || !res.ok) return false; const c = this.repairSelfCost(o); if (!this.canAfford(c)) return false;
    this.s.cash -= c; o.broken = false; const sk = this.s.sk;
    if (res.routine) this.addEp('w', 10, true); else { sk.rep = (sk.rep || 0) + 1; if (res.clean) sk.clean = (sk.clean || 0) + 1; this.addEp('w', res.clean ? 40 : 30); if ((sk.clean || 0) >= 10) this.unlockAch('loetmeister'); }
    this.dayUpdate(true); this.emit('objects', this.facOf(uid)); return true;
  },

  // ---------- Roboter (Nr. 46–48): Ladestation „robi“, Module steck/loet ----------
  roboMods: { steck: { skill: 'robo_steck', price: 8000, name: 'Greifarm' }, loet: { skill: 'robo_loet', price: 40000, name: 'Lötkopf' } },
  roboModWhy(o, m) { const M = this.roboMods[m]; if (!M || o?.type !== 'robi') return 'Geht nicht'; if (o.mods?.[m]) return 'Schon eingebaut'; if (!this.knows(M.skill)) return `Erst „${SKILL[M.skill].name}“ lernen (T)`; if (!this.canAfford(M.price)) return `Kostet ${M.price.toLocaleString('de-DE')} $`; return ''; },
  roboMod(uid, m) { const o = this.findObj(uid); if (!o || this.roboModWhy(o, m)) return false; const M = this.roboMods[m]; this.s.cash -= M.price; this.s.stats.spentHW += M.price; (o.mods ||= {})[m] = this.s.day || 1; this.dayUpdate(true); this.emit('objects', this.facOf(uid)); return true; },
  // Jeden Tag: Robi fährt zu neuen Rigs (USB-Stick), baut Bausätze ein (Greifarm), lötet kaputte Rigs (Lötkopf) – Welt zeigt die Fahrt über 'robo'
  robotDay() {
    const s = this.s;
    for (const fid of s.unlocked) {
      const f = s.fac[fid]; if (f.mothball) continue; const bots = f.objects.filter((o) => o.type === 'robi'); if (!bots.length) continue;
      const mods = { steck: bots.some((b) => b.mods?.steck), loet: bots.some((b) => b.mods?.loet) }; let jobs = 12 * bots.length; const bot = bots[0];
      for (const o of [...f.objects]) {
        if (jobs <= 0) break;
        if (this.osNeed(o) && this.knows('linux')) { o.os = 'linux'; jobs--; this.emit('robo', fid, bot.uid, o.uid, 'usb'); continue; }
        if (mods.loet && this.repairSelfOk(o)) { const c = this.repairSelfCost(o); if (this.canAfford(c)) { s.cash -= c; o.broken = false; jobs--; this.emit('robo', fid, bot.uid, o.uid, 'loet'); } }
      }
      if (mods.steck && jobs > 0) for (const o of this.kitsOpen(fid)) { if (jobs <= 0) break; if (this.assembleKit(o.uid)) { jobs--; this.emit('robo', fid, bot.uid, o.uid, 'steck'); } }
    }
  },

  // ---------- Börse: feste Gebühr, Limit-Orders (Nr. 16) ----------
  tradeFee(limit = false) { const t = this.s?.staff?.list && this.staffFx?.().trader; return Math.max(FEE.min, (limit ? FEE.limit : FEE.now) - (t ? FEE.trader : 0)); },
  limitMode() { const s = this.s; return !!s.autoLimit && this.knows('limit') && !s.payoutCold; },
  limitAdd(coin, n, p) { const s = this.s, w = s.wallet[coin]; if (!this.knows('limit') || !w || !(n > 0) || !(p > 0) || n > w.ex + 1e-9) return false; w.ex -= n; (s.limits ||= []).push({ id: (s.nextUid++), coin, n, p, day: s.day }); this.dayUpdate(true); return true; }, // reserviert die Coins
  limitCancel(id) { const s = this.s, i = (s.limits || []).findIndex((x) => x.id === id); if (i < 0) return false; const l = s.limits.splice(i, 1)[0]; s.wallet[l.coin].ex += l.n; this.dayUpdate(true); return true; },
  limitDay(day) {
    const s = this.s; if (!s.limits?.length) return;
    for (const l of [...s.limits]) { const p = this.price(l.coin, day); if (!(p >= l.p)) continue; const usd = l.n * p * (1 - this.tradeFee(true)); s.cash += usd; s.stats.sold += usd; s.limits = s.limits.filter((x) => x !== l); this.addEp('g', 10); this.toast(`Limit-Order ausgeführt: ${l.coin} zu ${p.toLocaleString('de-DE', { maximumFractionDigits: p < 10 ? 2 : 0 })} $ · +${Math.round(usd).toLocaleString('de-DE')} $`, 'good', 6000); }
  },
  // Großhandel (Nr. 29): Rabatt für n gleiche Geräte in einer Bestellung
  bulkDisc(n) { if (!this.knows('grosshandel')) return 0; for (const [k, d] of BULK) if (n >= k) return d; return 0; },
  // Ausbauten mit Fähigkeit oder Datum (UPGRADES.skill/from)
  upLock(facId, u) { if (u.from && this.s.day < toDay(u.from)) return `ab ${monthName(u.from)}`; if (u.skill && !this.knows(u.skill)) return `Erst lernen: ${SKILL[u.skill]?.name || u.skill} (T)`; return ''; },
  peakToggle(facId) { const f = this.s.fac[facId]; if (!f || !this.knows('lastman')) return false; f.peak = f.peak ? 0 : 1; this.dayUpdate(true); return true; },
  peakFx(key, facId) { const f = facId && this.s?.fac?.[facId]; if (!f?.peak) return 1; return key === 'elec' ? PEAK.elec : key === 'hash' ? PEAK.hash : 1; },
};
