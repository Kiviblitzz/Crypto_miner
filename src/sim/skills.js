// Fähigkeiten 2.0 – Spiellogik als Methoden für Game (Object.assign(Game.prototype, SKILL_METHODS) in game.js).
// Daten: src/data/skills.js · Menü/Baum: src/ui/skills.js · Mini-Spiel: src/ui/minigame.js
// Zustand s.sk = { ep: Erfahrung (ein Topf), spent: ausgegebene Punkte, bonus: geschenkte Punkte (z. B. Papas Quest), known: {id: Tag}, src: {id: Weg},
//   rep: geschaffte Selbst-Reparaturen (alle), reps: {loet, steck, chip, psu} je Mini-Spiel (Routine ab 5), clean: saubere,
//   day: {d, n} (Tagesdeckel), open: {id: Tag} (schon als „neu lernbar“ gemeldet), prof: {Gerätetyp: 1} (erstes Profil), payout: 1 = Deniz' Ausgleich steht aus (alte Stände) }
// Gelernt wird nur mit Punkten (Paket 18): ein Knopf „Freischalten · N Punkte“; Grundlagen (msg) kommen von selbst.
// Weitere Zustände: s.ws = { cur: Angebot, deliv: [{id, n, fac, day}] } (Großhändler), am Gerät o.defect ('steck' | 'loet'), o.psuMod, o.bios, o.pl (Leistungsziel %)
// Sperren und Betriebssystem gelten mit s.flags.sk2 (neue Spiele über startTutor, alte Spielstände nach der Migration, bot10).
import { SKILLS, SKILL, POTS, EP_DAY_CAP, ptsFor, epFor, PROFILES, PROFILE_IMM, FIRMWARE, AUTOTUNE, WK, SERVICE, OS, REPAIR, PSUMOD, BIOSMOD, PLIMIT, WHOLESALE, ROBO, MIGR_PAY, FEE, PEAK, TECH_MAP, needsOf, tierMax } from '../data/skills.js';
import { PLACEABLE, PART } from '../data/hardware.js';
import { FACILITY, UPGRADES } from '../data/world.js';
import { toDay } from '../data/history.js';
import { EVENT } from '../data/events.js';

const costOf = (id) => SKILL[id]?.learn.find((w) => w.via === 'pts')?.n || 0;
const isRig = (o) => PLACEABLE[o?.type]?.kind === 'rig' && !!o.parts;
const isAsic = (o) => { const d = PLACEABLE[o?.type]; if (!d) return false; if (d.kind === 'device') return d.look !== 'fpga'; return d.kind === 'holder' && (o.items || []).some((it) => PLACEABLE[it.id]?.look !== 'fpga'); };
const chipOk = (id) => { const d = PLACEABLE[id]; return !!d && d.look !== 'fpga' && d.look !== 'usb'; }; // Hashboard-Reparatur: ASIC-Miner, keine FPGA-Boards oder USB-Sticks
const nice = (v) => { const st = Math.pow(10, Math.max(1, Math.floor(Math.log10(Math.max(1, v))) - 1)); return Math.round(v / st) * st; }; // zwei gültige Stellen
const monthName = (iso) => { const [y, m] = iso.split('-'); return `${['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][+m - 1]} ${y}`; };

export function skEmpty() { return { ep: 0, spent: 0, bonus: 0, known: {}, src: {}, rep: 0, reps: {}, clean: 0, day: { d: -1, n: 0 }, open: {}, prof: {} }; }

// Alte Spielstände (ohne s.sk): Erfahrung umrechnen, Grundlagen und Gekauftes als gelernt, Geräte mit Betriebssystem, Techniken → Fähigkeiten/Ausbauten
export function migrateSkills(s) {
  if (s.sk && typeof s.sk === 'object') {
    const sk = s.sk, e = skEmpty(), day = s.day || 1; sk.known ||= {}; sk.src ||= {};
    for (const x of [sk.learning, ...(sk.queue || []), sk.teach]) if (x?.id && SKILL[x.id] && !sk.known[x.id]) { sk.known[x.id] = day; sk.src[x.id] = 'migr'; } // Paket 18: was gerade gelernt wurde, ist fertig
    delete sk.learning; delete sk.queue; delete sk.teach; delete sk.books; delete sk.wantRead;
    for (const id of Object.keys(sk.known)) if (!SKILL[id]) delete sk.known[id]; // z. B. Großhändler-Kontakt (jetzt nur noch ein Kontakt im Handy)
    if (sk.ep && typeof sk.ep === 'object') sk.ep = Math.round((sk.ep.w || 0) + (sk.ep.r || 0) + (sk.ep.g || 0)); // drei Töpfe → einer
    if (sk.spent && typeof sk.spent === 'object') sk.spent = Object.keys(sk.known).reduce((a, id) => a + (sk.src[id] === 'pts' ? costOf(id) : 0), 0); // nur bestehende Knoten zählen
    if (!sk.day || typeof sk.day !== 'object' || sk.day.n == null) sk.day = { d: -1, n: 0 };
    for (const k of Object.keys(e)) if (sk[k] == null) sk[k] = e[k];
    if (s.sk.rep && !Object.keys(s.sk.reps).length) s.sk.reps.loet = s.sk.rep; // bisher gab es nur das Löt-Spiel
    const old = (s.mods || []).find((m) => m.src === 'migr2'); // Zwischenstand: +10 % Ertrag für 120 Tage → Rest als einmalige Auszahlung
    if (old) { s.mods = s.mods.filter((m) => m.src !== 'migr2'); const left = Math.max(0, Math.min(1, (old.until - (s.day || 1)) / MIGR_PAY.days)); if (left > 0.05 && !s.sk.payout) { s.sk.payout = 1; s.sk.payFrac = left; } }
    return false;
  }
  const sk = (s.sk = skEmpty()), old = s.skills || {}, day = s.day || 1, has = (fn) => Object.values(s.fac || {}).some((f) => (f.objects || []).some(fn)), learn = (id) => { if (SKILL[id] && !sk.known[id]) { sk.known[id] = day; sk.src[id] = 'migr'; } };
  sk.ep = Math.round((old.hw || 0) + (old.trade || 0) + (old.mining || 0) * 0.4); // Mining-EP waren passiv verdient
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
  const pts = ptsFor(sk.ep);
  if (s.chapter >= 1 || Object.keys(techs).length) sk.payout = 1; // Ausgleich für die weggefallenen Boni: Deniz verkauft den alten Kram (Game.skPayout nach dem Laden)
  (s.messages ||= []).push({ id: 'sk2:migr', day, from: 'Deniz', text: `Neues Menü auf T: deine Fähigkeiten als großer Baum. Was du dir schon draufgeschafft hast, ist gelernt${pts ? ` – und du hast ${pts} ${pts === 1 ? 'Punkt' : 'Punkte'} zu verteilen` : ''}. Wirken tut nur noch, wo du Hand anlegst: am Gerät, im Inspektor.`, read: false });
  return true;
}

export const SKILL_METHODS = {
  // ---------- Grundzustand ----------
  skOn() { return !!this.s?.flags?.sk2; },
  knows(id) { return !!this.s?.sk?.known?.[id]; },
  learnSkill(id, src = '') {
    const s = this.s, k = SKILL[id]; if (!k || !s.sk || this.knows(id)) return false;
    s.sk.known[id] = s.day || 1; s.sk.src[id] = src || 'msg';
    this.emit('skill', id, src); return true;
  },
  // ---------- Erfahrung und Punkte: ein Topf (pot = Herkunft, nur fürs Symbol der Einblendung) ----------
  addEp(pot, n, quiet = false) {
    const s = this.s; if (!s?.sk || !(n > 0) || !POTS[pot]) return 0;
    const d = s.sk.day; if (d.d !== s.day) { d.d = s.day; d.n = 0; }
    const add = Math.round(Math.min(n, EP_DAY_CAP - d.n)); if (add <= 0) return 0;
    const before = this.fpTotal(); s.sk.ep += add; d.n += add; const after = this.fpTotal();
    if (!s.flags?.tutor || s.flags.boughtGpu) this.grant('skills'); // Anlernen: Fähigkeiten erst nach der ersten Grafikkarte
    if (!quiet || after > before) this.emit('xp', pot, add, after > before ? after : 0);
    return add;
  },
  fpTotal() { return ptsFor(this.s.sk?.ep || 0) + (this.s.sk?.bonus || 0); },
  fpFree() { return Math.max(0, this.fpTotal() - (this.s.sk?.spent || 0)); },
  epProgress() { const ep = this.s.sk?.ep || 0, n = ptsFor(ep), lo = epFor(n), hi = epFor(n + 1); return { ep, n, cur: ep - lo, need: hi - lo, pc: Math.round(((ep - lo) / (hi - lo)) * 100) }; },
  // Haken für Geschichten (z. B. Papas Quest): Punkte schenken statt Knoten
  givePoints(n) { const s = this.s; if (!s?.sk || !(n > 0)) return 0; s.sk.bonus = (s.sk.bonus || 0) + n; this.emit('xp', 'w', 0, this.fpTotal()); this.emit('skills'); return n; },
  skillCost(id) { return costOf(id); },
  // ---------- Zustand einer Fähigkeit: known | open | soon | later | wip (kommt später) | auto (Grundlage, kommt von selbst); hw = wartet auf Datum, Standort oder Hardware ----------
  skillState(id) {
    const s = this.s, k = SKILL[id]; if (!k) return { st: 'later', why: '' };
    if (this.knows(id)) return { st: 'known', why: '' };
    const tm = tierMax(s, FACILITY), from = k.from ? toDay(k.from) : 0;
    if (from && s.day < from) return { st: from - s.day > 540 ? 'later' : 'soon', why: `ab ${monthName(k.from)}`, hw: true };
    if (k.minTier && tm < k.minTier) { const f = Object.values(FACILITY).find((x) => x.tier === k.minTier); return { st: k.minTier > tm + 1 ? 'later' : 'soon', why: `ab ${f?.short === 'RZ' ? 'dem Rechenzentrum' : f?.short === 'Halle' ? 'der Lagerhalle' : 'Standort ' + (f?.short || k.minTier)}`, hw: true }; }
    if (!k.play) return { st: 'wip', why: 'Kommt mit einem späteren Update' }; // steht nicht im Baum
    const miss = needsOf(k).filter((n) => !this.knows(n)); if (miss.length) return { st: 'soon', why: `braucht ${miss.map((n) => SKILL[n]?.name || n).join(' und ')}` };
    const gate = k.gate?.(s, this); if (gate) return { st: 'soon', why: gate, hw: true };
    if (k.soon) return { st: 'wip', why: 'Handgriff kommt mit einem späteren Update' };
    if (k.learn.every((w) => w.via === 'msg')) return { st: 'auto', why: 'Kommt von selbst, wenn es so weit ist' };
    return { st: 'open', why: '' };
  },
  // Der einzige Lernweg: Punkte. { i, via: 'pts', n, label, sub, ok, why }
  skillWays(id) {
    const k = SKILL[id], n = costOf(id); if (!k || !n) return [];
    const st = this.skillState(id), free = this.fpFree(), r = { i: 0, via: 'pts', n, label: `Freischalten · ${n} ${n === 1 ? 'Punkt' : 'Punkte'}`, sub: `${free} frei`, ok: st.st === 'open' && free >= n, why: '' };
    if (st.st !== 'open') r.why = st.st === 'known' ? 'Schon gelernt' : st.why || 'Noch nicht möglich'; else if (free < n) r.why = `noch ${n - free} ${n - free === 1 ? 'Punkt' : 'Punkte'} sammeln`;
    return [r];
  },
  // Freischalten (i bleibt für alte Aufrufer). '' = gelernt, sonst Grund
  startLearn(id) {
    const s = this.s, r = this.skillWays(id)[0]; if (!r || !r.ok) return r?.why || this.skillState(id).why || 'Geht gerade nicht';
    s.sk.spent += r.n; this.learnSkill(id, 'pts'); this.dayUpdate(true); this.emit('skills'); return '';
  },
  // Pflicht-Auswege (keine Sackgasse) und Grundlagen per Handy – bei jeder Prüfung (checkFeatures)
  skDue() {
    const s = this.s; if (!s?.sk) return;
    for (const k of SKILLS) { if (!k.due || this.knows(k.id)) continue; let ok = false; try { ok = k.due(s, this); } catch (e) { ok = false; } if (!ok) continue; if (this.learnSkill(k.id, 'msg') && k.dueMsg) this.pushMsg(k.dueMsg); }
  },
  // Täglich: Pflicht-Auswege, Skript-Profile, Roboter, Großhändler, Limit-Orders, neu lernbare Fähigkeiten melden
  skDay(day = this.s.day) {
    const s = this.s; if (!s?.sk) return;
    this.skDue();
    for (const id of s.unlocked) if (s.fac[id]?.skript && this.knows('skript')) this.autoProfiles(id);
    this.robotDay(day);
    this.wsDay(day); this.wsTimer(day);
    this.limitDay(day);
    if (day % 7 === 0 || !s.sk.openChecked) { s.sk.openChecked = 1; const neu = []; for (const k of SKILLS) if (!s.sk.open[k.id] && !this.knows(k.id) && this.skillState(k.id).st === 'open') { s.sk.open[k.id] = day; neu.push(k.id); } if (neu.length) this.emit('skillopen', neu); }
  },
  skillsOpenN() { let n = 0; for (const k of SKILLS) if (k.play && this.skillWays(k.id).some((w) => w.ok)) n++; return n; },

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
    for (const o of this.s.fac[facId].objects) { if (this.profKind(o) !== kind) continue; const a = sm.per.get(o.uid); if (!a) continue; for (const u of a.units) { rev += u.rev || u.potential || 0; w += u.w || 0; } } // u.w: Leistung auch pausierter Einheiten (sonst wirkt der Strom gratis)
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
    if (k && o.pl) { const f = o.pl / 100; P *= f; H *= Math.pow(f, PLIMIT.exp); if (f > 1) F *= 1 + (f - 1) * PLIMIT.fail; } // Leistungsziel: Hash ∝ Leistung^0,7
    return { P, H, F };
  },
  // Verschleiß-Faktor: Profil, Wartung, Ausbauten am Standort (Staubfilter, Immersion)
  wearMul(o, facId = null, day = this.s.day) { let m = this.devTune(o, facId).F; if (o.psuMod) m *= PSUMOD.fail; if (o.serv && day - o.serv < SERVICE.days) m *= SERVICE.fail; if (facId) m *= this.upFx(facId, 'fail'); return m; },

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

  // ---------- Reparieren: selbst (Mini-Spiel je Defekt), Routine (1 Klick), Robi; sonst „Reparieren lassen“ zum vollen Preis ----------
  // Art des Defekts: Rig → o.defect ('steck' = Riser/Kabel/Karte, 'loet' = Kondensator; alte Stände ohne Angabe: 'loet'),
  // ASIC-Miner und Regalplätze → 'chip' (Hashboard, nur mit der Fähigkeit). FPGA-Boards: nur reparieren lassen.
  repairKind(o) {
    const d = PLACEABLE[o?.type]; if (!d) return '';
    if (isRig(o)) return o.broken ? (o.defect === 'steck' ? 'steck' : 'loet') : '';
    if (d.kind === 'device') return o.broken && chipOk(o.type) ? 'chip' : '';
    if (d.kind === 'holder') return (o.items || []).some((it) => it.b && chipOk(it.id)) ? 'chip' : '';
    return '';
  },
  repairSelfOk(o) { const k = this.repairKind(o); return k && (!REPAIR[k].need || this.knows(REPAIR[k].sk)) ? k : ''; },
  // Material: ein Gerät bzw. ein Regalplatz (all = alle kaputten Plätze); robo = Robi arbeitet wie mit der Fähigkeit
  repairSelfCost(o, all = false, robo = false) {
    const k = this.repairKind(o); if (!k) return 0; const R = REPAIR[k], rate = robo || this.knows(R.sk) ? R.skill : R.self;
    let base = 0;
    if (o.items) { const br = o.items.filter((it) => it.b && chipOk(it.id)); for (const it of all ? br : br.slice(0, 1)) base += this.itemPrice(PLACEABLE[it.id]) * 0.08; base *= this.fx('repair'); }
    else base = this.repairCost(o);
    return Math.max(1, Math.round(base * rate));
  },
  repairBrokenN(o) { return o.items ? o.items.filter((it) => it.b && chipOk(it.id)).length : o.broken ? 1 : 0; },
  repairRoutineOk(o) { const k = this.repairSelfOk(o); return !!k && this.knows(REPAIR[k].sk) && (this.s.sk?.reps?.[k] || 0) >= REPAIR.routine; },
  repairFix(o, all = false) { if (o.items) { for (const it of o.items) if (it.b && chipOk(it.id)) { it.b = 0; if (!all) break; } } else { o.broken = false; delete o.defect; } },
  // res = Ergebnis des Mini-Spiels { ok, clean } oder { ok: true, routine: true } (Routine: im Regal gleich alle Plätze)
  repairSelf(uid, res = {}) {
    const o = this.findObj(uid), k = this.repairSelfOk(o); if (!o || !k || !res.ok) return false;
    const all = !!res.routine && !!o.items, c = this.repairSelfCost(o, all); if (!this.canAfford(c)) return false;
    this.s.cash -= c; this.repairFix(o, all); const sk = this.s.sk; sk.reps ||= {};
    if (res.routine) this.addEp('w', 10, true); else { sk.reps[k] = (sk.reps[k] || 0) + 1; sk.rep = (sk.rep || 0) + 1; if (res.clean) sk.clean = (sk.clean || 0) + 1; this.addEp('w', res.clean ? 40 : 30); if ((sk.clean || 0) >= 10) this.unlockAch('loetmeister'); }
    this.dayUpdate(true); this.emit('objects', this.facOf(uid)); return true;
  },

  // ---------- Netzteil-Mod (Nr. 44): umlöten, +15 % Leistung am Netzteil, das Rig fällt etwas öfter aus ----------
  psuCap(o, ps = PART[o?.parts?.psu]) { return ps ? Math.round(ps.cap * this.psuCount(o) * (o.psuMod && ps.id === o.parts.psu ? PSUMOD.cap : 1)) : 0; },
  psuModWhy(o) { if (!isRig(o) || !o.parts.psu) return 'Nur für Rigs mit Netzteil'; if (!this.knows('psumod')) return 'Erst „Netzteil-Mod“ lernen (T)'; if (o.psuMod) return 'Schon umgelötet'; if (o.broken) return 'Erst reparieren'; if (!this.canAfford(PSUMOD.cost)) return `Material kostet ${PSUMOD.cost} $`; return ''; },
  psuRoutineOk(o) { return !this.psuModWhy(o) && (this.s.sk?.reps?.psu || 0) >= REPAIR.routine; },
  psuMod(uid, res = {}) {
    const o = this.findObj(uid); if (!o || this.psuModWhy(o) || !res.ok) return false;
    this.s.cash -= PSUMOD.cost; o.psuMod = 1; const sk = this.s.sk; sk.reps ||= {};
    if (res.routine) this.addEp('w', 8, true); else { sk.reps.psu = (sk.reps.psu || 0) + 1; if (res.clean) sk.clean = (sk.clean || 0) + 1; this.addEp('w', res.clean ? 35 : 25); }
    this.dayUpdate(true); this.emit('objects', this.facOf(uid)); return true;
  },

  // ---------- BIOS-Mod (Nr. 28): Polaris-Karten eines Rigs mit Speicher-Timings flashen (+18 % Ethash, 3 % Risiko) ----------
  biosCards(o) { return isRig(o) ? o.parts.gpus.filter((id) => BIOSMOD.cards.includes(id)).length : 0; },
  biosWhy(o) { if (!this.knows('biosmod')) return 'Erst „BIOS-Mod“ lernen (T)'; if (!this.biosCards(o)) return 'Nur für Rigs mit Polaris-Karten (RS 470 bis 580)'; if (o.bios) return 'Schon geflasht'; if (o.broken) return 'Erst reparieren'; return ''; },
  biosFlash(uid, quiet = false) {
    const o = this.findObj(uid); if (!o || this.biosWhy(o)) return null; o.bios = 1; let brick = false;
    if (Math.random() < BIOSMOD.risk) { brick = true; o.broken = true; o.defect = 'loet'; } // hängt im Flash: BIOS-Clip anlöten
    this.addEp('r', 20, quiet); if (!quiet) { this.dayUpdate(true); this.emit('objects', this.facOf(uid)); } return { brick };
  },
  biosAll(facId) { let n = 0, b = 0; for (const o of this.s.fac[facId]?.objects || []) { const r = this.biosFlash(o.uid, true); if (r) { n++; if (r.brick) b++; } } if (n) { this.dayUpdate(true); this.emit('objects', facId); } return { n, b }; },

  // ---------- Leistungsziel (Nr. 33): Regler 60–120 % je Gerät; Hash ∝ Leistung^0,7, über 100 % mehr Verschleiß ----------
  plWhy(o) { const k = this.profKind(o); if (!this.knows('autotuning')) return 'Erst „Autotuning und Leistungsziel“ lernen (T)'; if (!k) return 'Nur für Grafikkarten-Rigs und ASIC-Miner'; if (k === 'asic' && !o.fw) return 'Erst die Firmware flashen'; return ''; },
  plClamp(pc) { return Math.round(Math.max(PLIMIT.min, Math.min(PLIMIT.max, +pc || 100)) / 5) * 5; },
  setPl(uid, pc) { const o = this.findObj(uid); if (!o || this.plWhy(o)) return false; pc = this.plClamp(pc); if (pc === 100) delete o.pl; else o.pl = pc; this.dayUpdate(true); this.emit('objects', this.facOf(uid)); return true; },
  plAll(facId, pc, type = null) { let n = 0; pc = this.plClamp(pc); for (const o of this.s.fac[facId]?.objects || []) { if (this.plWhy(o) || (type && o.type !== type) || (o.pl || 100) === pc) continue; if (pc === 100) delete o.pl; else o.pl = pc; n++; } if (n) { this.dayUpdate(true); this.emit('objects', facId); } return n; },
  // „Fahr den Standort genau auf den Anschluss“: ein Ziel für alle einstellbaren Geräte, sodass 95 % des Anschlusses genutzt werden
  plFit(facId) {
    const f = this.s.fac[facId]; if (!f) return 0; const list = f.objects.filter((o) => !this.plWhy(o)); if (!list.length) return 0;
    for (const o of list) delete o.pl; this.dayUpdate(true);
    const sm = this.summary[facId]; let wt = 0; for (const o of list) wt += sm?.per?.get(o.uid)?.watt || 0; if (!(wt > 0)) return 100;
    const pc = this.plClamp(((sm.capKw * 1000 * 0.95 - (sm.watt - wt)) / wt) * 100);
    if (pc !== 100) for (const o of list) o.pl = pc; this.dayUpdate(true); this.emit('objects', facId); return pc;
  },

  // ---------- Roboter (Nr. 46–48): je Robi eine Ladestation, sie versorgt ihren Standort; Stufen: USB-Stick → Greifarm → Lötkopf ----------
  roboMods: ROBO.mods,
  roboStage(o) { return 1 + (o?.mods?.steck ? 1 : 0) + (o?.mods?.loet ? 1 : 0); },
  roboJobs(o) { return ROBO.jobs[this.roboStage(o) - 1] || ROBO.jobs[0]; },
  robiIn(facId) { return (this.s.fac[facId]?.objects || []).filter((o) => o.type === 'robi'); },
  roboModWhy(o, m) { const M = ROBO.mods[m]; if (!M || o?.type !== 'robi') return 'Geht nicht'; if (o.mods?.[m]) return 'Schon eingebaut'; if (M.after && !o.mods?.[M.after]) return `Erst den ${ROBO.mods[M.after].name} nachrüsten`; if (!this.knows(M.skill)) return `Erst „${SKILL[M.skill].name}“ lernen (T)`; if (!this.canAfford(M.price)) return `Kostet ${M.price.toLocaleString('de-DE')} $`; return ''; },
  roboMod(uid, m) { const o = this.findObj(uid); if (!o || this.roboModWhy(o, m)) return false; const M = ROBO.mods[m]; this.s.cash -= M.price; this.s.stats.spentHW += M.price; (o.mods ||= {})[m] = this.s.day || 1; this.dayUpdate(true); this.emit('objects', this.facOf(uid)); return true; },
  // Jeden Tag je Standort: alle Robis dort teilen sich die Fahrten. USB-Stick an neue Rigs (alle), Riser/Karte tauschen und Bausätze einbauen (Greifarm),
  // löten: Rigs, Miner mit „Hashboard-Reparatur“, überlastete Netzteile mit „Netzteil-Mod“ (Lötkopf). Bezahlt wird nur Material. Die Welt zeigt die Fahrt ('robo').
  robotDay() {
    const s = this.s;
    for (const fid of s.unlocked) {
      const f = s.fac[fid]; if (f.mothball) continue; const bots = this.robiIn(fid); if (!bots.length) continue;
      const B = bots.map((b) => ({ b, n: this.roboJobs(b), steck: !!b.mods?.steck, loet: !!b.mods?.loet }));
      const free = (need) => B.some((q) => q.n > 0 && (!need || q[need])), take = (need) => { const q = B.find((x) => x.n > 0 && (!need || x[need])); if (q) q.n--; return q; };
      const go = (q, o, kind) => this.emit('robo', fid, q.b.uid, o.uid, kind);
      for (const o of [...f.objects]) {
        if (!free('')) break;
        if (this.osNeed(o) && this.knows('linux')) { const q = take(''); if (q) { o.os = 'linux'; go(q, o, 'usb'); } continue; }
        const k = this.repairKind(o); if (!k || (k === 'chip' && !this.knows('hashboard'))) continue;
        const need = k === 'steck' ? 'steck' : 'loet';
        for (let i = this.repairBrokenN(o); i > 0 && free(need); i--) { const c = this.repairSelfCost(o, false, true); if (!this.canAfford(c)) break; s.cash -= c; this.repairFix(o); go(take(need), o, need); }
      }
      if (this.knows('psumod')) for (const o of f.objects) { if (!free('loet')) break; const ov = isRig(o) && !o.psuMod && !o.broken && this.rigOverload(o); if (!ov || ov.w > ov.cap * PSUMOD.cap || !this.canAfford(PSUMOD.cost)) continue; s.cash -= PSUMOD.cost; o.psuMod = 1; go(take('loet'), o, 'loet'); }
      for (const o of this.kitsOpen(fid)) { if (!free('steck')) break; if (this.assembleKit(o.uid)) go(take('steck'), o, 'steck'); }
    }
  },
  // Alte Spielstände mit Technikern: die gehen, dafür gibt es einen Robi samt Station (mit Greifarm, ab 2017 auch Lötkopf)
  robiMigrate() {
    const s = this.s, st = s.staff; if (!st) return false;
    const list = st.list || [], n = list.filter((p) => p.role === 'tech').length || (!list.length ? +st.tech || 0 : 0);
    st.list = list.filter((p) => p.role !== 'tech'); st.pool = (st.pool || []).filter((p) => p.role !== 'tech'); delete st.tech;
    if (!n || s.flags.robiGift) return false; s.flags.robiGift = s.day || 1;
    if (s.sk && !this.knows('robo_usb')) { s.sk.known.robo_usb = s.day || 1; s.sk.src.robo_usb = 'migr'; }
    const mods = { steck: s.day || 1 }; if (s.day >= toDay('2017-01-01')) mods.loet = s.day || 1;
    const fid = s.unlocked.filter((id) => FACILITY[id].tier >= 3).sort((a, b) => s.fac[b].objects.length - s.fac[a].objects.length)[0];
    const sp = fid && this.freeSpot(fid, PLACEABLE.robi), IN = { halle: 'in der Lagerhalle', rz: 'im Rechenzentrum', fjord: 'in der Fjordhalle' };
    if (sp) s.fac[fid].objects.push({ uid: s.nextUid++, type: 'robi', x: sp.x, z: sp.z, rot: sp.rot || 0, coin: 'auto', broken: false, bought: s.day, mods });
    else this.stockAdd({ type: 'robi', mods });
    s.messages.push({ id: 'robi:gift', day: s.day, from: 'Hashwerk GmbH', read: false, text: `Die Techniker haben gekündigt, Deniz hat dir einen Robi besorgt. ${sp ? `Er steht samt Ladestation ${IN[fid] || 'am größten Standort'}` : 'Er liegt samt Ladestation im Bestand (B) zum Aufstellen'}, mit Greifarm${mods.loet ? ' und Lötkopf' : ''}: Er fährt selbst zu kaputten Geräten und repariert zum Materialpreis${mods.loet ? '' : ' (löten kann er ab dem Lötkopf)'}. Mehr Robis gibt es im Shop unter Roboter – jede Station versorgt ihren Standort.` });
    return true;
  },
  // Alte Spielstände: einmal Geld statt Prozent-Übergang (nach dem Laden, wenn der Tagesumsatz bekannt ist)
  skPayout() {
    const s = this.s; if (s.sk?.payout !== 1) return 0; s.sk.payout = s.day || 1;
    const rev = Math.max(0, this.dailyProfit?.().rev || 0), raw = Math.min(MIGR_PAY.cap, rev * MIGR_PAY.days * MIGR_PAY.share * (s.sk.payFrac ?? 1)); delete s.sk.payFrac; if (raw < 50) return 0;
    const x = nice(raw); s.cash += x;
    s.messages.push({ id: 'sk2:geld', day: s.day, from: 'Deniz', read: false, text: `Hab deinen alten Kram verkauft, hier ${x.toLocaleString('de-DE')} $. Die Undervolt-Skripte und die ganze Technik-Liste von früher braucht keiner mehr – was du kannst, steht jetzt im Baum (T).` });
    return x;
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
  // ---------- Großhändler-Kontakt (Nr. 29): Herr Lindqvist macht befristete Sammelangebote (Ereignis 'lq_offer' in events.js) ----------
  // Sichtbarer Festpreis unter Einzelpreis × Menge, eine Woche gültig; geliefert am nächsten Tag per Spedition: in freie Regale, der Rest in den Bestand.
  wsSite() { let best = null; for (const id of this.s.unlocked) { const t = FACILITY[id].tier; if (t >= 2 && !this.s.fac[id].mothball && (!best || t > FACILITY[best].tier)) best = id; } return best; },
  wsMake(key = null) {
    const s = this.s, fac = this.wsSite(); if (!fac) return null;
    let best = null, bv = Infinity;
    for (const d of this.shopList('asic', fac)) { if (d.algo !== 'sha256' || d.hydro || !chipOk(d.id) || this.stockLeft(d) < WHOLESALE.min) continue; const v = this.devOffer(d, fac); if (v.net > 0 && v.roi < bv) { bv = v.roi; best = d; } }
    if (!best) return null;
    const unit = this.itemPrice(best), disc = WHOLESALE.disc[0] + Math.random() * (WHOLESALE.disc[1] - WHOLESALE.disc[0]), budget = Math.max(0, s.cash) * WHOLESALE.budget;
    let n = Math.min(WHOLESALE.n[Math.min(5, FACILITY[fac].tier)] || WHOLESALE.min, this.stockLeft(best));
    while (n > WHOLESALE.min && n * unit * disc > budget) n -= WHOLESALE.min; // Posten so groß, dass er bezahlbar bleibt
    if (n < WHOLESALE.min || n * unit * disc > budget) return null;
    const raw = n * unit * disc, step = Math.max(10, Math.pow(10, Math.floor(Math.log10(raw)) - 1) / 2); // glatter Preis: 37.500 $, 160.000 $
    return { key, id: best.id, n, unit, price: Math.floor(raw / step) * step, fac, day: s.day };
  },
  wsCan() { return this.contactOn('lindqvist') && !!this.wsMake(); },
  // Alle 3–5 Wochen ruft er an (unabhängig von den Zufalls-Ereignissen), wenn gerade keine andere Entscheidung offen ist
  wsTimer(day = this.s.day) {
    const s = this.s; if (!this.contactOn('lindqvist') || !s.flags.miningStarted) return; s.ws ||= { deliv: [] };
    if (!s.ws.next) { s.ws.next = day + 14; return; } if (day < s.ws.next || s.ev?.open) return;
    s.ws.next = day + WHOLESALE.every[0] + Math.floor(Math.random() * (WHOLESALE.every[1] - WHOLESALE.every[0] + 1));
    if (this.wsMake()) { const last = s.ev.last; this.openEvent(EVENT.lq_offer, 'lq_offer:' + day); s.ev.last = last; } // bremst die Zufalls-Ereignisse nicht
  },
  // Das offene Angebot (einmal je Ereignis ausgewürfelt, Text, Kosten und Lieferung zeigen dieselben Zahlen)
  wsOffer() { const s = this.s, o = s.ev?.open; if (o?.id !== 'lq_offer') return null; s.ws ||= { deliv: [] }; if (s.ws.cur?.key !== o.key) s.ws.cur = this.wsMake(o.key); return s.ws.cur; },
  wsAccept() { // den Preis zieht chooseEvent ab (choice.cost)
    const s = this.s, of = s.ws?.cur; if (!of || !PLACEABLE[of.id]) return false;
    this.stockUse(PLACEABLE[of.id], of.n); s.stats.spentHW += of.price; (s.ws.deliv ||= []).push({ id: of.id, n: of.n, fac: of.fac, day: s.day + 1 }); s.ws.cur = null;
    const st = s.contacts?.lindqvist; if (st) st.n = (st.n || 0) + 1; s.ws.n = (s.ws.n || 0) + 1; s.ws.saved = (s.ws.saved || 0) + of.unit * of.n - of.price;
    this.emit('orders'); return true;
  },
  wsDecline() { if (this.s.ws) this.s.ws.cur = null; },
  wsPending() { return (this.s.ws?.deliv || []).reduce((a, d) => a + d.n, 0); },
  wsDay(day = this.s.day) {
    const s = this.s, L = s.ws?.deliv; if (!L?.length) return;
    for (const dv of L.filter((x) => x.day <= day)) {
      const d = PLACEABLE[dv.id]; if (!d) continue; let n = dv.n, inH = 0; const facs = new Set();
      const sites = [dv.fac, ...s.unlocked.filter((id) => id !== dv.fac).sort((a, b) => FACILITY[b].tier - FACILITY[a].tier)].filter((id) => s.fac[id] && !s.fac[id].mothball);
      for (const id of sites) { for (const o of s.fac[id].objects) { const hd = PLACEABLE[o.type]; if (hd?.kind !== 'holder' || !o.items) continue; while (n > 0 && o.items.length < hd.slots) { o.items.push({ id: dv.id, b: 0 }); n--; inH++; facs.add(id); } if (!n) break; } if (!n) break; }
      for (let i = 0; i < n; i++) this.stockAdd({ type: dv.id });
      s.flags.boughtAsic = true;
      this.contactMsg('lindqvist', `Die Spedition war da: ${dv.n}× ${d.name}${inH ? ` – ${inH === dv.n ? 'alle' : inH} direkt in freie Regale` : ''}${n ? `${inH ? ', ' : ' – '}${n} zum Aufstellen im Bestand (B)` : ''}. Tack för affären!`);
      for (const id of facs) { this.capWarn(id); this.emit('objects', id); } if (n) this.emit('unpacked');
    }
    s.ws.deliv = L.filter((x) => x.day > day); this.dayUpdate(true);
  },
  // Ausbauten mit Fähigkeit oder Datum (UPGRADES.skill/from)
  upLock(facId, u) { if (u.from && this.s.day < toDay(u.from)) return `ab ${monthName(u.from)}`; if (u.skill && !this.knows(u.skill)) return `Erst lernen: ${SKILL[u.skill]?.name || u.skill} (T)`; return ''; },
  peakToggle(facId) { const f = this.s.fac[facId]; if (!f || !this.knows('lastman')) return false; f.peak = f.peak ? 0 : 1; this.dayUpdate(true); return true; },
  peakFx(key, facId) { const f = facId && this.s?.fac?.[facId]; if (!f?.peak) return 1; return key === 'elec' ? PEAK.elec : key === 'hash' ? PEAK.hash : 1; },
};
