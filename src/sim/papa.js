// Papas Miner (Neben-Quest) und der Umzug ins Zimmer über dem Laden – Methoden für Game (Zahlen und Texte: src/data/papa.js)
//
// s.papa = { st, at (Tag, seit dem der Schritt läuft), rig { mobo, cpu, psu, gpus }, best, tries, fan, drop, pre (Kurs vor dem Sturz), pd (Kurs bei der Entscheidung), dec, auto, up, done }
// s.home = { offer, no, offer2, no2, ans, out (Umzugstag), rentEnd (Monatserster, ab dem keine Wohnungsmiete mehr läuft), crates, shifted }
// Ohne Zufall (Math.random): Bots und Tests bleiben mit und ohne Quest vergleichbar.
import { PART, PLACEABLE } from '../data/hardware.js';
import { EVENT } from '../data/events.js';
import { PAPA, PAPA_TXT, HOME, HOME_RECTS, HOME_TXT } from '../data/papa.js';
import { pickKeepsake } from '../data/story.js';

export const PAPA_STAGES = ['', 'psu', 'wait1', 'heat', 'wait2', 'panic', 'wait3', 'proud', 'done'];
const copy = (o) => JSON.parse(JSON.stringify(o));
const hit = (a, r) => a.x0 < r.x1 - 1e-3 && a.x1 > r.x0 + 1e-3 && a.z0 < r.z1 - 1e-3 && a.z1 > r.z0 + 1e-3;
const rectOf = (o) => { const d = PLACEABLE[o.type], [w, h] = o.rot % 2 ? [d.size[1], d.size[0]] : d.size; return { x0: o.x - w / 2, x1: o.x + w / 2, z0: o.z - h / 2, z1: o.z + h / 2 }; };
const CRATE = 0.27, CRATE_AT = [8.9, 6.9]; // halbe Kantenlänge einer Umzugskiste (Welt: src/world/papa.js), Abstellort: innen am Rolltor

export const PAPA_METHODS = {
  // ================= Umzug =================
  homeOut() { return !!this.s?.home?.out; },
  siteGone(id) { return id === 'kinder' && this.homeOut(); }, // die gekündigte Wohnung: kein Standort mehr (bleibt in s.unlocked, damit Haus und Keller funktionieren)
  liveSites() { return (this.s?.unlocked || []).filter((id) => !this.siteGone(id)); },
  homeRentOff(day = this.s.day) { const e = this.s.home?.rentEnd || 0; return !!e && day > e; }, // Miete läuft bis zum Monatsende (die Abrechnung bucht den Vortag)
  homeRects(facId) { return facId === 'werkstatt' && this.homeOut() ? HOME_RECTS : []; },
  moveCrates() { return (this.s.unpacked || []).filter((e) => e.moved); },
  crateRects(facId) { return facId !== 'werkstatt' ? [] : this.moveCrates().filter((e) => e.pos).map((e) => ({ x0: e.pos[0] - CRATE, x1: e.pos[0] + CRATE, z0: e.pos[1] - CRATE, z1: e.pos[1] + CRATE })); },
  // Angebot fällig? n = 1: das erste (ein paar Tage nach der Werkstatt), n = 2: das zweite (nach einem Nein)
  homeOfferDue(n = 1) {
    const s = this.s, H = s.home || {};
    if (this.homeOut() || !s.unlocked.includes('werkstatt') || s.chapter < 2 || !s.flags?.miningStarted) return false;
    if (s.flags.shopLost && !s.flags.shopBack) return false; // alte Stände ohne Laden: kein Zimmer über dem Laden
    if (n === 1) return !H.offer && s.day >= (s.since?.werkstatt || 0) + HOME.delay;
    return !!H.no && !H.offer2 && s.day >= H.no + HOME.again;
  },
  homeDecline() { const s = this.s, H = (s.home ||= {}); H.ans = 'nein'; if (H.offer2) H.no2 = s.day || 1; else H.no = s.day || 1; this.emit('home', 'no'); return true; },
  // Ein Gerät als Umzugskiste in den Bestand: alles bleibt erhalten (Teile, Betriebssystem, Profile, Schäden …), nur der Platz ist neu
  crate(o, from) {
    const keep = copy(o); for (const k of ['uid', 'x', 'z', 'rot']) delete keep[k]; for (const k of Object.keys(keep)) if (k[0] === '_') delete keep[k];
    const e = { type: o.type, coin: o.coin || 'auto', moved: keep, from };
    if (o.parts) e.parts = copy(o.parts); if (o.kit) e.kit = copy(o.kit); if (o.items) e.items = o.items.map((i) => ({ id: i.id, b: i.b || 0 }));
    const p = this.freeSpot('werkstatt', { size: [0.5, 0.5] }, CRATE_AT); if (p) e.pos = [p.x, p.z]; // Kiste: möglichst nah am Rolltor
    this.stockAdd(e); return e;
  },
  // Ja zum Zimmer über dem Laden: Wohnung kündigen, Papas Ecke einrichten, Lieferwagen packt die Wohnung aus
  moveHome() {
    const s = this.s; if (this.homeOut() || !s.unlocked.includes('werkstatt')) return null;
    const H = (s.home ||= {}), day = s.day || 1; H.out = day; H.ans = 'ja'; H.rentEnd = this.stockNext(day);
    let shifted = 0, crates = 0;
    const W = s.fac.werkstatt;
    for (const o of [...W.objects]) { // was in Papas Ecke steht, rückt zur Seite – ist nirgends Platz, kommt es als Kiste dazu
      if (!HOME_RECTS.some((r) => hit(rectOf(o), r))) continue;
      W.objects = W.objects.filter((x) => x !== o); const sp = this.freeSpot('werkstatt', PLACEABLE[o.type]);
      if (sp) { o.x = sp.x; o.z = sp.z; o.rot = sp.rot || 0; W.objects.push(o); } else { this.crate(o, 'werkstatt'); crates++; }
      shifted++;
    }
    for (const o of [...s.fac.kinder.objects]) { this.crate(o, 'kinder'); crates++; }
    s.fac.kinder.objects = []; delete s.fac.kinder.cut;
    H.crates = crates; H.shifted = shifted;
    const boy = !s.keep?.gameboy && !!pickKeepsake(this, 'gameboy'); // lag noch unterm Bett: Papa hat ihn beim Packen gefunden
    if (s.current === 'kinder') s.current = 'werkstatt';
    this.papaMsg(boy ? [HOME_TXT.papa, 'Unterm Bett lag noch ein Gameboy. Der ist jetzt bei Deniz.'] : HOME_TXT.papa);
    this.papaMsg(s.unlocked.includes('keller') ? HOME_TXT.krause : HOME_TXT.krauseNoKeller, 'Herr Krause');
    this.papaMsg(HOME_TXT.mama, 'Mama');
    this.logStory('home', 'Umzug ins Zimmer über dem Laden – die Wohnung ist gekündigt');
    this.dayUpdate(true); this.emit('objects', 'kinder'); this.emit('objects', 'werkstatt'); this.emit('unpacked'); this.emit('home', 'moved', { crates, shifted });
    return { crates, shifted };
  },

  // ================= Papas Miner =================
  papaSt() { return this.s.papa?.st || ''; },
  papaNeed() { const r = this.s.papa?.rig; return r ? 25 + [r.mobo, r.cpu, r.psu, ...(r.gpus || [])].reduce((a, id) => a + (PART[id]?.watt || 0), 0) : 0; }, // wie Game.rigWatt
  papaCap() { return PART[this.s.papa?.rig?.psu]?.cap || 0; },
  // Netzteile im Handel (außer dem eingebauten): reicht es, ist es das kleinste, das reicht?
  papaPsus() {
    const need = this.papaNeed(), cur = this.s.papa?.rig?.psu, l = this.partList('psu').sort((a, b) => a.cap - b.cap), best = l.find((p) => p.cap >= need);
    return l.map((p) => ({ id: p.id, name: p.name, cap: p.cap, price: this.itemPrice(p), ok: p.cap >= need, best: p === best, cur: p.id === cur })); // cur: noch mal dasselbe wie das alte
  },
  // Was die Oberfläche am Gerät zeigt: Teile, Verbrauch, Netzteil, Temperatur, Zustand
  papaView() {
    const P = this.s.papa; if (!P?.rig) return null; const st = P.st, need = this.papaNeed(), cap = this.papaCap();
    const status = st === 'psu' ? 'piept' : st === 'heat' ? 'zu heiß' : 'läuft';
    return { st, rig: P.rig, need, cap, status, temp: st === 'heat' ? 94 : st === 'psu' ? 38 : P.fan ? 61 : 72, fan: st === 'heat' ? 'verstaubt' : P.fan ? 'neu' : 'alt', sign: st === 'done' };
  },
  papaMsg(t, from = 'Papa') { const s = this.s; for (const text of [].concat(t)) { const x = { id: `pp${s.day}:${(s.messages || []).length}`, day: s.day, from, text, read: false }; s.messages.push(x); this.emit('message', x); } }, // ohne Zufall (ids wie Game.pushMsg, nur fest)
  papaStartOk(day = this.s.day) { const s = this.s; return s.unlocked.includes('werkstatt') && s.chapter >= 2 && day >= (s.since?.werkstatt || 0) + PAPA.start; },
  papaStart() {
    const s = this.s, P = (s.papa ||= { st: '' }); if (P.st) return false;
    Object.assign(P, { st: 'psu', at: s.day || 1, rig: copy(PAPA.rig), tries: 0 });
    this.papaMsg(PAPA_TXT.start); this.emit('papa', 'psu'); return true;
  },
  // Schritt 1: Netzteil tauschen (Papa zahlt). Zu schwach: piept weiter, nichts passiert. Sonst Punkte – einer mehr fürs kleinste, das reicht
  papaSetPsu(id) {
    const s = this.s, P = s.papa, it = PART[id]; if (P?.st !== 'psu' || it?.type !== 'psu' || !this.available(it)) return null;
    const need = this.papaNeed();
    if (it.cap < need) { P.tries = (P.tries || 0) + 1; return { ok: false, need, cap: it.cap, text: PAPA_TXT.psuWeak(need) }; }
    const best = this.papaPsus().find((x) => x.best)?.id === id;
    P.rig.psu = id; P.best = best ? 1 : 0; P.st = 'wait1'; P.at = s.day || 1;
    const pts = this.givePoints(PAPA.pts.psu + (best ? PAPA.pts.best : 0));
    this.logStory('papa', `Papas Miner: ${it.name} eingebaut`); this.emit('papa', 'psu-ok');
    return { ok: true, best, pts, part: id, text: best ? PAPA_TXT.psuBest : PAPA_TXT.psuBig };
  },
  // Schritt 2: Lüfter (Mini-Spiel „luefter“ in der Oberfläche, Bots: { ok: true }). Belohnung: Punkt und ein Netzteil aus dem Laden fürs Lager
  papaCool(res = { ok: true }) {
    const s = this.s, P = s.papa; if (P?.st !== 'heat') return null; if (!res?.ok) return { ok: false };
    P.fan = 1; P.st = 'wait2'; P.at = s.day || 1;
    const pts = this.givePoints(PAPA.pts.heat), gid = PAPA.gift.find((id) => PART[id] && this.available(PART[id])) || null;
    if (gid) { this.bagAdd(gid, 1); this.freshAdd(gid, 1); this.emit('bag'); }
    this.logStory('papa', 'Papas Miner: Lüfter getauscht'); this.emit('papa', 'cool');
    return { ok: true, pts, part: gid, text: PAPA_TXT.heatDone, gift: gid ? PAPA_TXT.gift(PART[gid].name) : '' };
  },
  // Schritt 3: beim Kurssturz halten oder verkaufen (im Gespräch; auto: Papa hat allein verkauft – ohne Punkte)
  papaDecide(hold, auto = false) {
    const s = this.s, P = s.papa; if (P?.st !== 'panic') return null;
    P.dec = hold ? 'hold' : 'sell'; P.auto = auto ? 1 : 0; P.pd = this.price('BTC'); P.st = 'wait3'; P.at = s.day || 1;
    const pts = auto ? 0 : this.givePoints(PAPA.pts.decide);
    if (auto) this.papaMsg(PAPA_TXT.auto);
    this.logStory('papa', hold ? 'Papa hält seine Bitcoin durch den Absturz' : 'Papa verkauft seine Bitcoin im Absturz'); this.emit('papa', 'decide');
    return { hold, pts, text: hold ? PAPA_TXT.holdReply : PAPA_TXT.sellReply };
  },
  // Abschluss im Gespräch: Papa ist stolz (Papa +1), Punkte, seine erste Ausschüttung
  papaFinish() {
    const s = this.s, P = s.papa; if (P?.st !== 'proud') return null;
    P.st = 'done'; P.done = s.day || 1;
    this.applyFx({ rel: { papa: 1 } }); const pts = this.givePoints(PAPA.pts.done); s.cash += PAPA.cash;
    this.logStory('papa', 'Papas Miner hat seinen Ehrenplatz'); this.dayUpdate(true); this.emit('papa', 'done');
    return { pts, cash: PAPA.cash, rel: 1, text: PAPA_TXT.proud };
  },
  // Täglich (Game.advanceDay, nach den Ereignissen): Umzugsangebot, Start und nächste Schritte von Papas Miner
  papaDay(day = this.s.day) {
    const s = this.s; if (!s.flags?.miningStarted) return;
    if (s.ev && !s.ev.open && day - (s.ev.last || 0) >= 3) { // nicht direkt nach einer anderen Entscheidung
      if (this.homeOfferDue(1)) { (s.home ||= {}).offer = day; this.openEvent(EVENT.umzug, 'umzug'); }
      else if (this.homeOfferDue(2)) { s.home.offer2 = day; this.openEvent(EVENT.umzug2, 'umzug2'); }
    }
    const P = s.papa;
    if (!P?.st) { if (this.papaStartOk(day)) this.papaStart(); return; }
    const dd = day - (P.at || 0);
    if (P.st === 'wait1' && dd >= PAPA.wait1) { P.st = 'heat'; P.at = day; this.papaMsg(PAPA_TXT.heat); this.emit('papa', 'heat'); }
    else if (P.st === 'wait2') { // der nächste echte Kurssturz: Bitcoin in 7 Tagen um mindestens 25 % gefallen (nach einem Jahr reichen 12 %, danach 5 %)
      const p0 = this.price('BTC', day - 7), p1 = this.price('BTC', day), f = p0 > 0 ? 1 - p1 / p0 : 0, need = dd >= PAPA.wait2c ? PAPA.drop3 : dd >= PAPA.wait2b ? PAPA.drop2 : PAPA.drop;
      if (dd >= PAPA.wait2 && f >= need) { P.st = 'panic'; P.at = day; P.drop = Math.max(1, Math.round(f * 100)); P.pre = p0; this.papaMsg(PAPA_TXT.crash(P.drop)); this.emit('papa', 'panic'); }
    } else if (P.st === 'panic' && dd >= PAPA.panicDays) this.papaDecide(false, true);
    else if (P.st === 'wait3') {
      const p = this.price('BTC', day), pre = P.pre || P.pd * PAPA.holdUp, due = P.dec === 'hold' ? (dd >= PAPA.holdMin && p >= pre) || dd >= PAPA.holdMax : dd >= PAPA.sellDays;
      // gehalten: wieder über dem Kurs vor dem Absturz? verkauft: danach gestiegen?
      if (due) { const up = P.dec === 'hold' ? p >= pre : p >= P.pd; P.up = up ? 1 : 0; P.st = 'proud'; P.at = day; this.papaMsg([P.dec === 'hold' ? (up ? PAPA_TXT.holdUp : PAPA_TXT.holdDown) : up ? PAPA_TXT.sellHigh : PAPA_TXT.sellLow, PAPA_TXT.come]); this.emit('papa', 'proud'); }
    }
  },
  // Alte und kaputte Stände: Felder prüfen. Ohne s.papa beginnt die Quest ganz normal, sobald die Werkstatt da ist (auch bei alten Ständen)
  papaMigrate(s) {
    if (s.papa && (typeof s.papa !== 'object' || !PAPA_STAGES.includes(s.papa.st || ''))) s.papa = null;
    const P = s.papa; if (P?.st && (!P.rig || !PART[P.rig.psu] || !Array.isArray(P.rig.gpus))) P.rig = copy(PAPA.rig);
    if (P?.st) P.at = Number.isFinite(P.at) ? P.at : s.day;
    if (s.home && typeof s.home !== 'object') s.home = null;
    if (s.home?.out && !s.unlocked?.includes('werkstatt')) s.home = null; // ohne Werkstatt kein Umzug
    if (s.home?.out) { if (s.current === 'kinder') s.current = 'werkstatt'; if (!Number.isFinite(s.home.rentEnd)) s.home.rentEnd = s.home.out; }
  },
};
