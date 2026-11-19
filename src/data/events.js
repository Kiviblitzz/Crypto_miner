// Ereignisse mit Entscheidungen (eigene Geschichte rund um Familie Brandt, Lindental)
//
// Aufbau eines Ereignisses:
//   id, from (Absender), title, text: string | (s, h, g) => string
//   when: { date: 'YYYY-MM-DD', window: 14 }            – einmalig ab Datum, wartet im Fenster auf cond
//       | { yearly: 'MM-DD', from: '2011', to?, window }  – jedes Jahr
//       | { from, to, chance, repeat? }                    – Zufall, einmal pro Woche gewürfelt (chance je Woche)
//   chain: true                                           – kommt nur als Folge eines anderen Ereignisses (fx.next)
//   cond(s, h, g): zusätzliche Bedingung; expire: Tage bis zur automatischen Antwort (Standard 21)
//   fallback: Index der Antwort, wenn der Spieler nicht entscheidet (Standard: letzte)
//   choices: [{ label, hint?, cost?, need?(s,h,g), fx: {…} | (g, s) => {…}, reply? }]
//   Regel: Die letzte Antwort hat nie Kosten und nie need (sie ist der Notausgang der Automatik).
// fx (siehe Game.applyFx): cash, coin {BTC: n}, sellFrac {BTC: 0.5}, rel {papa: 1}, mod [{key, mult, days?, fac?, src?}],
//   flag, ach, xp {hw: n}, next [{id, inDays}], msg {from, text}, stat {k: n}, log, toast, do(g, s)
// mod-Schlüssel: hash, cool, cap, elec, rent, fail, rev, price, price:asic, price:gpu, monolith, repair,
//   monthly (Fixkosten/Monat, negativ = Einnahme), powerCost (Stromausbau-Preis, je Standort),
//   powerWait (mult 0 = Stromausbau bis zum Ablauf gesperrt, je Standort)
// Beträge skalieren mit der Ära: amt(g, Tage, min) = so viele Tagesumsätze, mindestens min.
import { FACILITY, CHAPTERS } from './world.js';
import { PLACEABLE, PART } from './hardware.js';
import { toDay, GPU_BOOM } from './history.js';

const nf = (d) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: d, minimumFractionDigits: 0 });
export const usd = (v) => { const a = Math.abs(v), s = v < 0 ? '−' : ''; if (a >= 1e9) return `${s}${nf(2).format(a / 1e9)} Mrd. $`; if (a >= 1e6) return `${s}${nf(2).format(a / 1e6)} Mio. $`; if (a >= 100) return `${s}${nf(0).format(a)} $`; return `${s}${nf(2).format(a)} $`; };
const btc = (s) => s.wallet.BTC.ex + s.wallet.BTC.cold;
const coins = (s, c) => (s.wallet[c]?.ex || 0) + (s.wallet[c]?.cold || 0);
const kw = (s, id) => FACILITY[id].power[s.fac[id].power].kw;
const kellerKw = (g) => (g.summary?.keller?.watt || 0) / 1000;
const rev = (g) => Math.max(1, g.dailyProfit().rev);

// ---------- Hilfen ----------
const nice = (v) => { if (!(v > 0)) return 0; const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(v)) - 1)); return Math.round(v / p) * p; };
const amt = (g, days, min = 0) => nice(Math.max(min, rev(g) * days));
// Wert einmal pro offenem Ereignis festhalten (Text, Kosten und Wirkung zeigen dieselbe Zahl)
const memo = (name, f) => (g) => {
  const ev = g.s.ev, k = ev.open?.key;
  if (k) { if (!ev.memo || ev.memo.k !== k) ev.memo = { k, v: {} }; if (ev.memo.v[name] == null) ev.memo.v[name] = f(g); return ev.memo.v[name]; }
  return ev.memo?.v?.[name] ?? f(g);
};
const has = (s, id) => s.unlocked.includes(id);
const top = (s) => s.unlocked.reduce((a, id) => (FACILITY[id].tier > FACILITY[a].tier ? id : a), s.unlocked[0]);
const tier = (s) => FACILITY[top(s)].tier;
const fname = (id) => FACILITY[id].name;
const month = (s) => new Date(s.day * 864e5).getUTCMonth();
const year = (s) => new Date(s.day * 864e5).getUTCFullYear();
const LINDENTAL = ['kinder', 'keller', 'werkstatt', 'halle'];
const FAMILY = ['papa', 'mama', 'opa', 'deniz'];
const totalKw = (g) => g.s.unlocked.reduce((a, id) => a + (g.summary?.[id]?.watt || 0), 0) / 1000;
const elecDay = (g, facs) => facs.filter((id) => has(g.s, id)).reduce((a, id) => { const sm = g.summary?.[id]; return a + (sm && !sm.tripped ? Math.max(0, (sm.watt / 1000) * 24 - g.solarKwh(id)) * sm.elec : 0); }, 0);
const exUSD = (g) => Object.keys(g.s.wallet).reduce((a, c) => a + g.s.wallet[c].ex * (g.price(c) || 0), 0);
const buy = (g, c, v) => ({ coin: { [c]: (v * (1 - g.tradeFee())) / Math.max(1e-12, g.price(c)) } });
const facMods = (facs, key, mult, days) => facs.map((fac) => ({ key, mult, days, fac }));
// Coins verkaufen – erst von der Börse, dann aus der Cold-Wallet
function sellCoins(g, c, frac) {
  const s = g.s, w = s.wallet[c], p = g.price(c); const n = (w.ex + w.cold) * frac; if (!(n > 0) || !p) return 0;
  const a = Math.min(w.ex, n); w.ex -= a; w.cold = Math.max(0, w.cold - (n - a));
  const v = n * p * (1 - g.tradeFee()); s.cash += v; s.stats.sold += v; if (s.skills) g.addXp('trade', 15 + Math.min(60, v / 10)); return v;
}
const sellDo = (c, frac, logText) => (g) => { const v = sellCoins(g, c, frac); return { log: `${logText} (${usd(v)})` }; };
// GPU-Rigs (ohne den allerersten PC im Kinderzimmer)
const rigsWithGpu = (s, facs = s.unlocked) => facs.filter((id) => has(s, id)).flatMap((id) => s.fac[id].objects.filter((o) => o.uid !== 1 && o.parts?.gpus?.length));
const gpuCount = (s, facs) => rigsWithGpu(s, facs).reduce((n, o) => n + o.parts.gpus.length, 0);
const rigValue = (g, facs) => rigsWithGpu(g.s, facs).reduce((a, o) => a + g.objectValue(o) * 2, 0); // voller Zeitwert statt halbem Ankaufspreis
function sellRigs(g, frac = 1) {
  const list = rigsWithGpu(g.s); const n = Math.ceil(list.length * frac); let v = 0;
  for (const o of list.slice(0, n)) { const half = g.objectValue(o); g.removeObject(o.uid); g.s.cash += half; v += half * 2; }
  return v;
}
// Geräte geliefert bekommen: in freie Regalplätze stellen, der Rest wird gutgeschrieben
function stashDevices(g, devId, n) {
  const s = g.s; let left = n;
  for (const id of [s.current, ...[...s.unlocked].reverse()]) {
    if (!has(s, id)) continue;
    for (const o of s.fac[id].objects) { const def = PLACEABLE[o.type]; if (def.kind !== 'holder') continue; while (left > 0 && o.items.length < def.slots) { o.items.push({ id: devId, b: 0 }); left--; } }
  }
  s.flags.boughtAsic = true; g.dayUpdate(true); for (const id of s.unlocked) g.emit('objects', id);
  return left;
}
const freeSlots = (s) => s.unlocked.reduce((n, id) => n + s.fac[id].objects.reduce((k, o) => k + (PLACEABLE[o.type].kind === 'holder' ? PLACEABLE[o.type].slots - o.items.length : 0), 0), 0);
// Einbruch: die wertvollsten Grafikkarten in Lindental, rund 30 % (4–24 Stück)
function theftPlan(g) {
  const list = [];
  for (const o of rigsWithGpu(g.s, LINDENTAL)) o.parts.gpus.forEach((id) => list.push({ uid: o.uid, id, v: g.itemPrice(PART[id]) }));
  list.sort((a, b) => b.v - a.v || a.uid - b.uid);
  const n = Math.min(list.length, Math.max(4, Math.min(24, Math.round(list.length * 0.3))));
  const take = list.slice(0, n); return { n, v: take.reduce((a, x) => a + x.v, 0), take };
}
function steal(g, take) {
  let v = 0; const facs = new Set();
  for (const t of take) { const o = g.findObj(t.uid); const i = o?.parts?.gpus.indexOf(t.id) ?? -1; if (i < 0) continue; o.parts.gpus.splice(i, 1); v += t.v; facs.add(g.facOf(o.uid)); }
  g.dayUpdate(true); for (const f of facs) g.emit('objects', f);
  return v;
}
// Pausierte (unrentable) Geräte zum Restwert verkaufen
function sellIdle(g) {
  const s = g.s; let v = 0, n = 0;
  for (const id of s.unlocked) {
    const sm = g.summary[id]; if (!sm) continue;
    for (const o of [...s.fac[id].objects]) {
      const a = sm.per.get(o.uid); if (!a || a.status !== 'idle' || o.uid === 1) continue;
      const c0 = s.cash; if (o.items) { n += o.items.length; g.holderSellAll(o.uid); } else { n++; g.removeObject(o.uid); } v += s.cash - c0;
    }
  }
  return { v, n };
}
const hottest = (g) => g.s.unlocked.reduce((a, id) => ((g.summary?.[id]?.temp || 0) > (g.summary?.[a]?.temp || 0) ? id : a), g.s.unlocked[0]);
const priceChange = (g, days) => { const p0 = g.price('BTC', g.s.day - days); return p0 ? g.price('BTC') / p0 - 1 : 0; };
// Anteil der Grafikkarten-Rigs am Ertrag (für Frühstart-Boni neuer Coins)
const gpuShare = (g) => {
  let gpu = 0, all = 0;
  for (const id of g.s.unlocked) { const sm = g.summary?.[id]; if (!sm || sm.tripped) continue; for (const o of g.s.fac[id].objects) { const a = sm.per.get(o.uid); if (!a) continue; const r = a.units.reduce((x, u) => x + (u.rev || 0), 0); all += r; if (o.parts) gpu += r; } }
  return all > 0 ? gpu / all : 0;
};
// Frühstart: Wer bei einem neuen Coin von Hand umstellt, schürft die ersten Wochen gegen wenig Konkurrenz
const earlyStart = (key, coin, bonus, days, logText) => ({
  label: `Frühstart: Grafikkarten fest auf ${coin}`, need: (s, h, g) => gpuShare(g) > 0.01,
  hint: (g) => `${days} Tage: +${nf(0).format(memo(key, (x) => bonus * gpuShare(x))(g) * 100)} % Gesamtertrag, 20 % mehr Ausfälle (alles läuft am Limit)`,
  fx: (g) => ({ mod: [{ key: 'rev', mult: 1 + memo(key, (x) => bonus * gpuShare(x))(g), days }, { key: 'fail', mult: 1.2, days }], xp: { mining: 30 }, log: logText }),
  reply: '<b>Deniz:</b> Kaum einer schürft das schon. Die Blöcke liegen auf der Straße!',
});
// Verlorene Wallet-Coins (Festplatte, Trojaner)
function loseEx(g, frac, why) {
  const s = g.s; let v = 0;
  for (const c of Object.keys(s.wallet)) { const w = s.wallet[c], n = w.ex * frac; if (!(n > 0)) continue; v += n * (g.price(c) || 0); if (c === 'BTC') { const st = (s.stats.lostBtc ||= {}); st[why] = (st[why] || 0) + n; } w.ex -= n; }
  return v;
}
function diskFx(g, s, p) {
  const ok = Math.random() < p, n = s.wallet.BTC.ex; s.flags.diskOk = ok ? 1 : 0;
  if (ok) return { xp: { hw: 20 }, log: 'April 2011: Festplatte tot, Wallet gerettet' };
  loseEx(g, 1, 'disk'); return { log: `April 2011: Festplatte tot – ${nf(0).format(n)} BTC verloren` };
}
const diskReply = (g) => (g.s.flags.diskOk ? (g.s.flags.backup ? '<b>Deniz:</b> Backup eingespielt, alles da. Siehst du? Langweilig ist gut.' : '<b>Deniz:</b> ES LÄUFT! Die Wallet ist zurück! Ich brauch ein Bier. Und du ein Backup.') : '<b>Deniz:</b> Weg. Alles weg. Ich … kauf dir einen USB-Stick. Für die nächsten.');
const debtCost = () => CHAPTERS.flatMap((c) => c.goals).find((x) => x.id === 'debt')?.action?.cost || 15000;

// Beziehungen ab Stufe 3 (Wirkung in Game.relFx / Game.powerCost)
export const REL_PERK = {
  papa: 'Papa vertraut dir: Die Werkstatt kostet keine Miete mehr.',
  mama: 'Mama hilft mit: Im Kinderzimmer kühlt es 20 % besser.',
  opa: 'Opa packt mit an: Stromausbau in Keller und Werkstatt 25 % günstiger.',
  deniz: 'Deniz ist voll dabei: 10 % weniger Ausfälle.',
};

// ---------- Bausteine für wiederkehrende Lagen ----------
const heatChoices = (extraCool = 1) => [
  { label: 'Mietklima für zwei Wochen', cost: memo('heat', (g) => nice(Math.max(150, totalKw(g) * 6))), hint: '+35 % Kühlung an allen Standorten, 14 Tage', fx: { mod: [{ key: 'cool', mult: 1.35, days: 14 }, ...(extraCool !== 1 ? [{ key: 'cool', mult: extraCool, days: 14 }] : [])], log: 'Hitzewelle: Klimageräte gemietet' }, reply: '<b>Deniz:</b> Der Lkw mit den Klimageräten ist da. Ich lieb diesen Mann.' },
  { label: 'Nachts schürfen, tagsüber drosseln', hint: '14 Tage: −35 % Ertrag und Strom, kaum Verschleiß', fx: { mod: [{ key: 'hash', mult: 0.65, days: 14 }, { key: 'elec', mult: 0.65, days: 14 }, { key: 'fail', mult: 0.5, days: 14 }, ...(extraCool !== 1 ? [{ key: 'cool', mult: extraCool, days: 14 }] : [])], log: 'Hitzewelle: nur nachts geschürft' }, reply: '<b>Opa:</b> Wie früher in der Fabrik. Die Nachtschicht ist die beste Schicht.' },
  { label: 'Durchziehen', hint: 'Hitze heißt: gedrosselte Geräte und mehr Ausfälle', fx: extraCool !== 1 ? { mod: [{ key: 'cool', mult: extraCool, days: 14 }] } : {}, reply: '<b>Deniz:</b> Ich stell schon mal Eiswürfel in den Kühlschrank. Für uns, nicht für die Miner.' },
];
const heat = (id, date, window, text) => ({ id, from: 'Deniz', title: 'Hitzewelle', when: { date, window },
  text: (s, h, g) => { const f = hottest(g); return `${text} Deine ${fname(f)} hat schon <b>${nf(0).format(g.summary[f]?.temp || 30)} °C</b>.`; },
  choices: heatChoices(), fallback: 2 });

const halving = (id, date, iso, from, to, line) => ({ id, from: 'Deniz', title: 'Halving', when: { date, window: 10 },
  text: `Am ${iso} halbiert sich die Belohnung pro Block: von <b>${from}</b> auf <b>${to} BTC</b>. Über Nacht schürfst du nur noch die Hälfte. ${line}`,
  choices: [
    { label: 'Halving-Wette: Bitcoin kaufen', cost: memo('halv', (g) => amt(g, 20, 200)), hint: 'Für 20 Tagesumsätze Bitcoin – nach jedem Halving stieg bisher der Kurs', fx: (g) => ({ ...buy(g, 'BTC', memo('halv', () => 0)(g)), log: `Halving ${iso.slice(-4)}: Bitcoin gekauft` }), reply: '<b>Deniz:</b> Wenn das schiefgeht, sag ich, es war deine Idee.' },
    { label: 'Effizienz-Kur für alle Geräte', cost: memo('kur', (g) => amt(g, 6, 100)), hint: '180 Tage: −25 % Ausfälle, −5 % Strom', fx: { mod: [{ key: 'fail', mult: 0.75, days: 180 }, { key: 'elec', mult: 0.95, days: 180 }], log: `Halving ${iso.slice(-4)}: alle Geräte gewartet` }, reply: '<b>Deniz:</b> Wärmeleitpaste, Staubsauger, neue Firmware. Die Kisten schnurren.' },
    { label: 'Weiterschürfen wie bisher', hint: 'Nichts ändern', fx: {}, reply: '<b>Deniz:</b> Halbe Belohnung, gleiche Arbeit. Willkommen im Bergbau.' },
  ], fallback: 2 });

// Kurssturz/-sprung: kaufen, verkaufen oder aushalten
const dip = (key, days, min, sellFrac, why) => [
  { label: 'Nachkaufen', cost: memo(key, (g) => amt(g, days, min)), hint: `Für ${days} Tagesumsätze Bitcoin kaufen`, fx: (g) => ({ ...buy(g, 'BTC', memo(key, () => 0)(g)), log: `${why}: Bitcoin nachgekauft` }), reply: '<b>Deniz:</b> Kaufen, wenn alle schreien. Mein Puls ist trotzdem bei 180.' },
  { label: `${sellFrac === 0.25 ? 'Ein Viertel' : sellFrac === 0.2 ? 'Ein Fünftel' : 'Ein Drittel'} der Bitcoin verkaufen`, need: (s) => btc(s) > 1e-4, hint: 'Lieber Geld in der Kasse', fx: (g) => sellDo('BTC', sellFrac, `${why}: Bitcoin verkauft`)(g), reply: '<b>Deniz:</b> Sicher ist sicher. Ich hoffe, wir ärgern uns nicht.' },
  { label: 'Nicht hinschauen', hint: 'Abwarten', fx: {}, reply: '<b>Deniz:</b> Handy weg, Rigs an. Guter Plan.' },
];

const XMAS = {
  2010: 'Dein erstes Weihnachten als Miner. Mama wundert sich, warum dein Zimmer im Dezember 26 Grad hat.',
  2011: 'Papa hat den Baum in den Keller gestellt – „da ist es ja warm“.',
  2012: 'Das erste Halving ist durch. Opa erzählt zum dritten Mal von 1962, Deniz isst die Plätzchen.',
  2013: 'Bitcoin hat die 1.000 $ geknackt. Opa will wissen, ob man davon auch Geschenke kaufen kann.',
  2014: 'GoxBank ist pleite, die Rigs brummen. Papa hat trotzdem die beste Laune seit Jahren.',
  2015: 'Der Kurs ist im Keller, die Stimmung nicht. Mama hat Gans gemacht.',
  2016: 'Zweites Halving, Kral in Lindental – und Opa hat einen Lichterketten-Rekord aufgestellt.',
  2017: 'Bitcoin bei fast 20.000 $. Sogar Tante Gisela fragt, wie man das kauft.',
  2018: 'Krypto-Winter. Papa sagt: „Hauptsache, die Heizung läuft.“ Sie läuft – mit Abwärme.',
  2019: 'Ein ruhiges Jahr. Deniz zeigt Hochzeitsfotos. Alle.',
  2020: 'Weihnachten im kleinen Kreis. Opa hat gelernt, wie Videoanrufe gehen.',
  2021: '68.800 $, China-Verbot, Krals Anruf. Mama will nur, dass du mal ausschläfst.',
  2022: 'Merge, Energiekrise, FXT. Papa: „Und ich dachte, 2008 war schlimm.“',
  2023: 'Mama ist in Rente und hat Plätzchen für die ganze Firma gebacken.',
  2024: 'Bitcoin über 100.000 $. Opa hat den Zeitungsartikel eingerahmt.',
  2025: 'Das ganze Haus riecht nach Zimt. Deniz bringt seine Familie mit.',
  2026: 'Sechzehn Jahre seit dem ersten PC im Kinderzimmer. Der alte Kasten steht immer noch da.',
};

export const EVENTS = [
  // ---------- jedes Jahr ----------
  {
    id: 'pizza', from: 'Deniz', title: 'Pizza-Tag', when: { yearly: '05-22', from: '2011', window: 5 },
    text: (s, h, g) => `Heute vor ${new Date(s.day * 864e5).getUTCFullYear() - 2010} Jahr(en) hat einer 10.000 Bitcoin für zwei Pizzen bezahlt. Ich bestell – zahlst du in Bitcoin?${s.stats.pizzaBTC ? ` <br><small>Deine Pizza-Bitcoin wären heute ${usd(s.stats.pizzaBTC * g.price('BTC'))} wert.</small>` : ''}`,
    choices: [
      { label: 'In Bitcoin zahlen', need: (s, h, g) => btc(s) * g.price('BTC') >= 25, hint: 'Deniz +1 · ein Stück Geschichte', fx: (g) => ({ coin: { BTC: -25 / g.price('BTC') }, stat: { pizzaBTC: 25 / g.price('BTC') }, rel: { deniz: 1 }, ach: 'pizza' }), reply: '<b>Deniz:</b> Legendär. Das erzähl ich unseren Enkeln.' },
      { label: 'Bar zahlen', cost: 25, hint: 'Deniz +1', fx: { rel: { deniz: 1 } }, reply: '<b>Deniz:</b> Salami für dich, Thunfisch für mich.' },
      { label: 'Keine Zeit – die Rigs!', hint: 'Deniz −1', fx: { rel: { deniz: -1 } }, reply: '<b>Deniz:</b> Dann ess ich eben beide.' },
    ],
  },
  {
    id: 'xmas', from: 'Mama', title: 'Weihnachten bei Brandts', when: { yearly: '12-21', from: '2010', window: 5 }, expire: 10,
    text: (s) => `${XMAS[year(s)] || 'Wieder ein Jahr. Die Familie sitzt zusammen, draußen schneit es.'} „Und was legst du dieses Jahr unter den Baum?“`,
    choices: [
      { label: 'Ein großes Fest für alle', cost: memo('xmas', (g) => amt(g, 3, 60)), hint: 'Alle, die dir noch nicht ganz vertrauen (unter Stufe 3): +1', fx: (g, s) => ({ rel: Object.fromEntries(FAMILY.filter((k) => (s.rel[k] || 0) < 3).map((k) => [k, 1])) }), reply: '<b>Mama:</b> So voll war das Wohnzimmer noch nie. Opa singt. Opa singt nie.' },
      { label: 'Selbstgebastelte Geschenke', hint: 'Mama +1 · Hardware-Erfahrung', fx: { rel: { mama: 1 }, xp: { hw: 15 } }, reply: '<b>Mama:</b> Ein Stern aus alten Lüftern, der leuchtet! Der kommt an die Spitze.' },
      { label: 'Heiligabend bei den Rigs', hint: 'Mama −1, Papa −1 · eine Woche +8 % Ertrag', fx: { rel: { mama: -1, papa: -1 }, mod: [{ key: 'rev', mult: 1.08, days: 7 }] }, reply: '<b>Mama:</b> Wir heben dir Kartoffelsalat auf. Wie jedes Jahr.' },
    ],
    fallback: 1,
  },

  // ---------- 2011 ----------
  {
    id: 'backup', from: 'Deniz', title: 'Hast du ein Backup?', when: { date: '2011-01-25', window: 30 }, cond: (s) => btc(s) > 1,
    text: (s) => `„Bei einem aus dem Forum ist die Festplatte abgeraucht – mit 3.000 Bitcoin drauf. Weg. Für immer. Deine wallet.dat liegt auch nur auf deinem alten PC, oder?“ Darin: <b>${nf(0).format(s.wallet.BTC.ex)} BTC</b>.`,
    choices: [
      { label: 'USB-Stick kaufen und sichern', cost: 15, hint: 'Die Wallet ist doppelt gesichert', fx: { flag: 'backup', log: 'Januar 2011: Wallet auf einem USB-Stick gesichert' }, reply: '<b>Deniz:</b> Und jetzt den Stick NICHT in die Hosentasche. Mama wäscht alles.' },
      { label: 'Ausdrucken und in den Schuhkarton', hint: 'Kostet nichts · ein Abend Arbeit: die Rechner stehen 2 Tage', fx: { flag: 'backup', mod: ['kinder', 'keller', 'werkstatt'].map((fac) => ({ key: 'hash', mult: 0, days: 2, fac })), log: 'Januar 2011: Wallet auf Papier gesichert' }, reply: '<b>Deniz:</b> Ein Schuhkarton voller Zahlen. Opa wäre stolz.' },
      { label: 'Mach ich später', hint: 'Was soll schon passieren?', fx: { log: 'Januar 2011: kein Backup gemacht' }, reply: '<b>Deniz:</b> „Später“ heißt bei dir „nie“. Ich sag’s nur.' },
    ],
    fallback: 2,
  },
  {
    id: 'festplatte', from: 'Deniz', title: 'Die Festplatte klackert', when: { date: '2011-04-15', window: 20 },
    cond: (s) => s.wallet.BTC.ex > 1 && typeof s.ev.done.backup === 'number', // nur wer vorher gefragt wurde
    text: (s) => (s.flags.backup
      ? `Klack. Klack. Klack. Die Festplatte deines alten PCs ist hinüber. Zum Glück hast du im Januar ein Backup gemacht – deine <b>${nf(0).format(s.wallet.BTC.ex)} BTC</b> sind sicher.`
      : `Klack. Klack. Klack. Die Festplatte deines alten PCs ist hinüber – und mit ihr die wallet.dat mit <b>${nf(0).format(s.wallet.BTC.ex)} BTC</b>. Ein Backup hast du nicht.`),
    choices: [
      { label: (g) => (g.s.flags.backup ? 'Neue Festplatte, Backup einspielen' : 'Profi-Datenrettung in der Stadt'), cost: (g) => (g.s.flags.backup ? 40 : 200), hint: (g) => (g.s.flags.backup ? 'Alles läuft gleich wieder' : '85 % Chance, dass die Wallet zurückkommt'), fx: (g, s) => diskFx(g, s, s.flags.backup ? 1 : 0.85), reply: diskReply },
      { label: (g) => (g.s.flags.backup ? 'Papas alte Platte nehmen' : 'Opas Gefrierfach-Trick'), hint: (g) => (g.s.flags.backup ? 'Kostet nichts · Papa +1' : 'Kostet nichts · 50 % Chance · Opa +1'), fx: (g, s) => ({ ...diskFx(g, s, s.flags.backup ? 1 : 0.5), rel: s.flags.backup ? { papa: 1 } : { opa: 1 } }), reply: diskReply },
      { label: (g) => (g.s.flags.backup ? 'Weitermachen' : 'Neu aufsetzen und abhaken'), hint: (g) => (g.s.flags.backup ? 'Das Backup ist schon drauf' : 'Die Coins sind verloren'), fx: (g, s) => diskFx(g, s, s.flags.backup ? 1 : 0), reply: diskReply },
    ],
    fallback: 1,
  },
  {
    id: 'opastrom', from: 'Opa Heinz', title: 'Opa und der Starkstrom', when: { date: '2011-03-10', window: 120 },
    cond: (s) => !!opaFac(s),
    text: (s) => { const id = opaFac(s), nx = FACILITY[id].power[s.fac[id].power + 1]; return `„Junge, deine Sicherung fliegt bald. Ich leg dir im ${fname(id)} <b>${nx.label}</b> (${nf(1).format(nx.kw)} kW). Du zahlst das Material, ich die Arbeit. Und du hilfst mit.“ Beim Elektriker kostet das ${usd(nx.cost)}.`; },
    choices: [
      { label: 'Opa machen lassen', cost: (g) => opaCost(g.s), hint: '40 % günstiger · Opa +1 · viel Hardware-Erfahrung', fx: (g, s) => ({ do: () => { const id = opaFac(s); if (id) s.fac[id].power++; }, rel: { opa: 1 }, xp: { hw: 80 }, flag: 'opaStrom', log: 'Opa hat den Starkstrom gelegt' }), reply: '<b>Opa:</b> Rot ist Phase, Blau ist Null. Und Finger weg, wenn ich „weg“ sage.' },
      { label: 'Opa machen lassen – mit einem Kasten Bier', cost: (g) => opaCost(g.s) + 20, hint: '40 % günstiger · Opa +2 · viel Hardware-Erfahrung', fx: (g, s) => ({ do: () => { const id = opaFac(s); if (id) s.fac[id].power++; }, rel: { opa: 2 }, xp: { hw: 80 }, flag: 'opaStrom', log: 'Opa hat den Starkstrom gelegt (mit Bier)' }), reply: '<b>Opa:</b> Ein Mann von Welt. Das Bier trinken wir, wenn die Sicherung hält.' },
      { label: 'Noch nicht nötig', hint: 'Später selbst ausbauen (Firma, C)', fx: {}, reply: '<b>Opa:</b> Sag Bescheid, bevor’s brennt. Nicht danach.' },
    ],
  },
  {
    id: 'juni11', from: 'Deniz', title: '30 Dollar!', when: { date: '2011-06-08', window: 6 }, cond: (s) => btc(s) > 0.5,
    text: (s, h, g) => `Bitcoin steht bei <b>${usd(g.price('BTC'))}</b>. Alle drehen durch. Du hast <b>${nf(1).format(btc(s))} BTC</b>. Verkaufen? Halten?`,
    choices: [
      { label: 'Die Hälfte verkaufen', hint: 'Geld für neue Grafikkarten', fx: (g) => ({ ...sellDo('BTC', 0.5, 'Juni 2011: bei 30 $ die Hälfte verkauft')(g), flag: 'sold11' }), reply: '<b>Deniz:</b> Vernünftig. Langweilig, aber vernünftig.' },
      { label: 'Alles verkaufen', hint: 'Kasse machen', fx: (g) => ({ ...sellDo('BTC', 1, 'Juni 2011: bei 30 $ alles verkauft')(g), flag: 'sold11' }), reply: '<b>Deniz:</b> Cash ist King. Hoffentlich.' },
      { label: 'HODL – alles halten', hint: 'Wer weiß, wo das noch hingeht', fx: { flag: 'hodl11', log: 'Juni 2011: alles gehalten' }, reply: '<b>Deniz:</b> Stahlnerven. Ich hab schon verkauft …' },
    ],
    fallback: 2,
  },
  {
    id: 'goxhack', from: 'Deniz', title: 'Hack bei GoxBank', when: { date: '2011-06-20', window: 10 }, cond: (s) => btc(s) > 0.2,
    text: 'Bei GoxBank sind Kundendaten aufgetaucht, der Kurs fiel kurz auf einen Cent. Sollen deine Coins runter von Börse und Festplatte – in eine Papier-Wallet, die keiner hacken kann?',
    choices: [
      { label: 'Ab in die Cold-Wallet', hint: '1 % Gebühr · neue Coins landen künftig auch dort', fx: (g, s) => ({ do: () => { for (const c of Object.keys(s.wallet)) { const w = s.wallet[c]; w.cold += w.ex * 0.99; w.ex = 0; } s.payoutCold = true; }, flag: 'coldEarly', log: 'Juni 2011: Coins in die Cold-Wallet gerettet' }), reply: '<b>Deniz:</b> Papier-Wallet im Schuhkarton. Sehr Lindental.' },
      { label: 'Liegen lassen', hint: 'Börsen gehen doch nicht pleite. Oder?', fx: { log: 'Juni 2011: Coins auf der Börse gelassen' }, reply: '<b>Deniz:</b> Wird schon gutgehen. Bestimmt.' },
    ],
  },
  {
    id: 'tiefpunkt', from: 'Deniz', title: 'Deniz gibt auf?', when: { date: '2011-08-25', window: 14 },
    text: (s, h, g) => `„<b>${usd(g.price('BTC'))}</b>. Vor elf Wochen waren es 30. Ich verkauf meine Grafikkarten und hör auf. Willst du sie? 40 % unter Ladenpreis.“`,
    choices: [
      { label: 'Deniz’ Karten übernehmen', hint: '30 Tage Grafikkarten 40 % billiger · Deniz +1', fx: { mod: [{ key: 'price:gpu', mult: 0.6, days: 30 }], rel: { deniz: 1 }, log: 'August 2011: Deniz’ Grafikkarten übernommen' }, reply: '<b>Deniz:</b> Dann hab ich wenigstens Besuchsrecht.' },
      { label: 'Ihm Mut machen', hint: 'Deniz +2 – er bleibt dabei', fx: { rel: { deniz: 2 }, flag: 'denizStays', log: 'August 2011: Deniz zum Weitermachen überredet' }, reply: '<b>Deniz:</b> Okay. Einmal noch. Aber wenn’s unter 2 Dollar fällt …' },
      { label: 'Auch alle Bitcoin verkaufen', hint: 'Raus, bevor es noch tiefer geht', fx: (g) => sellDo('BTC', 1, 'August 2011: alle Bitcoin im Tief verkauft')(g), reply: '<b>Deniz:</b> Wenigstens sind wir uns einig.' },
    ],
    fallback: 1,
  },
  {
    id: 'ltcstart', from: 'Deniz', title: 'Litecoin – Silber zum Gold', when: { date: '2011-10-08', window: 14 },
    text: (s, h, g) => `„Ein neuer Coin! Litecoin läuft auf Grafikkarten richtig gut. Ein Litecoin kostet <b>${usd(g.price('LTC'))}</b>. Ich kauf für 100 Dollar. Bist du dabei?“`,
    choices: [
      { label: 'Für 100 $ Litecoin kaufen', cost: 100, hint: (g) => `≈ ${nf(0).format(100 / Math.max(0.01, g.price('LTC')))} LTC`, fx: (g) => ({ ...buy(g, 'LTC', 100), log: 'Oktober 2011: Litecoin zum Start gekauft' }), reply: '<b>Deniz:</b> Silberjungs. Das wird was.' },
      { label: 'Für 400 $ Litecoin kaufen', cost: 400, hint: (g) => `≈ ${nf(0).format(400 / Math.max(0.01, g.price('LTC')))} LTC`, fx: (g) => ({ ...buy(g, 'LTC', 400), log: 'Oktober 2011: viel Litecoin zum Start gekauft' }), reply: '<b>Deniz:</b> Du gehst ja richtig ran!' },
      earlyStart('ltcfs', 'Litecoin', 0.35, 30, 'Oktober 2011: Frühstart bei Litecoin'),
      { label: 'Nur schürfen, nicht kaufen', hint: 'Die Rigs auf „Auto“ wählen selbst den besten Coin', fx: {}, reply: '<b>Deniz:</b> Auch gut. Auf „Auto“ nehmen die Rigs, was mehr bringt.' },
    ],
    fallback: 3,
  },
  {
    id: 'noise', from: 'Mama', title: 'Frau Kowalczyk von nebenan', when: { from: '2011-03-01', to: '2013-12-31', chance: 0.15 }, cond: (s, h, g) => s.unlocked.includes('keller') && kellerKw(g) > 1.5,
    text: '„Die Nachbarin war da. Aus dem Keller brummt es Tag und Nacht, sagt sie, ihr Fernseher flimmert. Kannst du was machen?“',
    choices: [
      { label: 'Dämmmatten kaufen', cost: 250, hint: 'Ruhe im Haus · Mama +1', fx: { rel: { mama: 1 }, log: 'Dämmmatten im Keller verlegt' }, reply: '<b>Mama:</b> Danke, Schatz. Sie hat sogar gewunken.' },
      { label: 'Ihren Fernseher reparieren', hint: 'Papa hilft – kostet nichts · Papa +1, Mama +1', fx: { rel: { papa: 1, mama: 1 }, xp: { hw: 15 }, log: 'Frau Kowalczyks Fernseher repariert' }, reply: '<b>Papa:</b> Kondensator. Wie früher. Hat Spaß gemacht.' },
      { label: 'Keller nachts drosseln', hint: '−25 % Hashrate im Keller für 60 Tage', fx: { mod: [{ key: 'hash', mult: 0.75, days: 60, fac: 'keller' }] }, reply: '<b>Mama:</b> Na gut. Ich sag ihr Bescheid.' },
    ],
  },
  {
    id: 'storm', from: 'Opa Heinz', title: 'Gewitter über Lindental', when: { from: '2011-05-01', to: '2016-09-30', chance: 0.04, repeat: 120 }, cond: (s) => { const m = month(s); return m >= 4 && m <= 8 && s.unlocked.includes('keller'); },
    text: '„Blitz in den Trafo an der Dorfstraße. Bei euch ist der Strom weg. Ich kann dir ein Notstromaggregat leihen, das säuft aber Diesel.“',
    choices: [
      { label: 'Aggregat leihen', cost: (g) => Math.round(Math.max(40, rev(g) * 0.4)), hint: 'Diesel für einen Tag · Opa +1', fx: { rel: { opa: 1 } }, reply: '<b>Opa:</b> Und nicht drinnen laufen lassen, Junge!' },
      { label: 'Einen Tag abwarten', hint: 'Kinderzimmer, Keller und Werkstatt stehen 2 Tage', fx: { mod: [{ key: 'hash', mult: 0, days: 2, fac: 'keller' }, { key: 'hash', mult: 0, days: 2, fac: 'werkstatt' }, { key: 'hash', mult: 0, days: 2, fac: 'kinder' }] }, reply: '<b>Opa:</b> Dann spielen wir halt Skat.' },
    ],
  },

  // ---------- 2012 ----------
  {
    id: 'abi', from: 'Mama', title: 'Abiturprüfungen', when: { date: '2012-03-06', window: 14 },
    text: '„In vier Wochen sind deine Prüfungen. Ich sehe dich nur noch zwischen deinen Kisten. Wie wär’s mit Lernen?“',
    choices: [
      { label: 'Lernen – die Rigs laufen allein', hint: 'Mama +2 · 45 Tage 30 % mehr Ausfälle (keiner schaut nach)', fx: { rel: { mama: 2 }, mod: [{ key: 'fail', mult: 1.3, days: 45 }], flag: 'abi', log: 'Frühjahr 2012: fürs Abitur gelernt' }, reply: '<b>Mama:</b> Nervennahrung steht vor deiner Tür. Opa passt auf die Sicherung auf.' },
      { label: 'Mit Deniz neben den Rigs lernen', hint: 'Mama +1, Deniz +1', fx: { rel: { mama: 1, deniz: 1 }, flag: 'abi', log: 'Frühjahr 2012: mit Deniz im Keller gelernt' }, reply: '<b>Mama:</b> Ich höre euch über Hashraten reden statt über Goethe. Na ja.' },
      { label: 'Abi ist überbewertet', hint: 'Mama −2', fx: { rel: { mama: -2 }, log: 'Frühjahr 2012: lieber geschürft als gelernt' }, reply: '<b>Mama:</b> Darüber reden wir noch, junger Mann.' },
    ],
    fallback: 1,
  },
  {
    id: 'bankdruck', from: 'Papa', title: 'Die Bank macht Druck', when: { date: '2012-04-20', window: 20 }, cond: (s) => !s.flags.debt && s.chapter >= 1,
    text: (s, h, g) => `„Die Bank hat angerufen. Sie wollen die ${usd(debtCost())} nicht erst Ende 2013 – sie drohen, den Kredit schon dieses Jahr zu kündigen. Ich weiß nicht weiter.“${btc(s) > 1 ? ` Deine <b>${nf(0).format(btc(s))} BTC</b> wären heute ${usd(btc(s) * g.price('BTC'))} wert.` : ''}`,
    choices: [
      { label: 'Bitcoin verkaufen und alles zahlen', need: (s, h, g) => s.cash + btc(s) * g.price('BTC') * (1 - g.tradeFee()) >= debtCost(), hint: 'Laden sofort gerettet · Papa +2', fx: (g, s) => { const c = debtCost(); if (s.cash < c) { const need = (c - s.cash + 0.01) / (g.price('BTC') * (1 - g.tradeFee())); sellCoins(g, 'BTC', Math.min(1, need / Math.max(1e-9, btc(s)))); } s.cash -= c; return { flag: 'debt', rel: { papa: 2 }, do: () => g.checkGoals(), log: `April 2012: Papas Schulden mit Bitcoin bezahlt (${usd(c)})` }; }, reply: '<b>Papa:</b> Ich … ich hab den Brief von der Bank verbrannt. Im Waschbecken. Mama war nicht begeistert.' },
      { label: 'Papa 2.000 $ für die Raten geben', cost: 2000, hint: 'Die Bank gibt bis Ende 2013 Ruhe · Papa +1', fx: { rel: { papa: 1 }, log: 'April 2012: Papa 2.000 $ für die Bank gegeben' }, reply: '<b>Papa:</b> Die Bank hält still. Danke, Kind. Den Rest schaffen wir bis Ende 2013.' },
      { label: '„Die Bank blufft, Papa.“', hint: 'Papa −2', fx: { rel: { papa: -2 }, log: 'April 2012: Papa mit der Bank allein gelassen' }, reply: '<b>Papa:</b> Hoffentlich hast du recht. Ich schlaf seit Wochen schlecht.' },
    ],
    fallback: 1,
  },
  {
    id: 'bitspar', from: 'Deniz', title: '7 Prozent pro Woche', when: { date: '2012-08-05', window: 10 },
    text: (s) => `„Kennst du BitSpar? Der Typ zahlt 7 % Zinsen – pro <b>Woche</b>. Mein Cousin hat schon 40 Bitcoin Gewinn. Auf dem Papier.“${btc(s) > 0.05 ? ` Du hast ${nf(1).format(btc(s))} BTC.` : ''}`,
    choices: [
      { label: 'Ein Viertel deiner Bitcoin anlegen', need: (s) => btc(s) > 0.05, hint: 'Hohe Zinsen – wenn es gutgeht', fx: (g, s) => { const n = btc(s) * 0.25, win = Math.random() < 0.25; s.flags.bitsparWin = win ? 1 : 0; return { coin: { BTC: win ? n * 0.2 : -n }, flag: 'bitspar', log: win ? 'August 2012: rechtzeitig aus BitSpar ausgestiegen' : `August 2012: ${nf(2).format(n)} BTC bei BitSpar verloren` }; }, reply: (g) => (g.s.flags.bitsparWin ? '<b>Deniz:</b> Du bist nach drei Wochen raus – mit 20 % Plus. Zwei Tage später ist BitSpar offline. Glück gehabt!' : '<b>Deniz:</b> Zwei Wochen später ist BitSpar offline. Alles weg. Mein Cousin redet nicht mehr mit mir.') },
      { label: 'Bargeld anlegen', cost: memo('bs', (g) => amt(g, 10, 100)), hint: 'Hohe Zinsen – wenn es gutgeht', fx: (g, s) => { const c = memo('bs', () => 0)(g), win = Math.random() < 0.25; s.flags.bitsparWin = win ? 1 : 0; return { cash: win ? c * 1.2 : 0, flag: 'bitspar', log: win ? 'August 2012: rechtzeitig aus BitSpar ausgestiegen' : `August 2012: ${usd(c)} bei BitSpar verloren` }; }, reply: (g) => (g.s.flags.bitsparWin ? '<b>Deniz:</b> Du bist nach drei Wochen raus – mit 20 % Plus. Zwei Tage später ist BitSpar offline. Glück gehabt!' : '<b>Deniz:</b> Zwei Wochen später ist BitSpar offline. Alles weg. Mein Cousin redet nicht mehr mit mir.') },
      { label: 'Klingt nach Schneeballsystem', hint: 'Finger weg', fx: { flag: 'bitsparNo', log: 'August 2012: BitSpar abgelehnt' }, reply: '<b>Deniz:</b> Zwei Wochen später ist BitSpar offline. Okay, du hattest recht. Wie immer. Nervt.' },
    ],
  },
  halving('halv12', '2012-10-15', '28.11.2012', 50, 25, '„Sechs Wochen noch. Danach rechnen sich alte Karten nur noch auf Litecoin“, sagt Deniz.'),

  // ---------- 2013 ----------
  {
    id: 'forgebox', from: 'Deniz', title: 'Forgebox nimmt Vorbestellungen an', when: { date: '2013-01-20', window: 14 },
    text: '„Forgebox aus Kansas baut ASIC-Miner! 60 GH/s in einer Kiste – so viel wie hundert Grafikkarten. Lieferung angeblich im März. <b>1.300 $</b> pro Stück, Vorkasse.“',
    choices: [
      { label: 'Einen vorbestellen', cost: 1300, hint: 'Lieferung … irgendwann · Preis fest', fx: (g, s) => ({ flag: 'forgebox', stat: { forgeN: 1 }, do: () => { s.flags.forgeDay = s.day; }, next: [{ id: 'forgedeliv', inDays: 150 + Math.floor(Math.random() * 91) }], log: 'Januar 2013: einen Forgebox-Miner vorbestellt' }), reply: '<b>Deniz:</b> Bestellnummer 4711. Ich hab ein gutes Gefühl.' },
      { label: 'Drei vorbestellen', cost: 3900, hint: 'Lieferung … irgendwann · Preis fest', fx: (g, s) => ({ flag: 'forgebox', stat: { forgeN: 3 }, do: () => { s.flags.forgeDay = s.day; }, next: [{ id: 'forgedeliv', inDays: 150 + Math.floor(Math.random() * 91) }], log: 'Januar 2013: drei Forgebox-Miner vorbestellt' }), reply: '<b>Deniz:</b> Drei! Wir werden Könige.' },
      { label: 'Abwarten, bis es echte Geräte gibt', hint: 'Ab Februar liefert Glacier die ersten A1 in den Handel', fx: {}, reply: '<b>Deniz:</b> Vernünftig. Ich kauf trotzdem einen Aufkleber.' },
    ],
    fallback: 2,
  },
  {
    id: 'forgedeliv', chain: true, from: 'Deniz', title: 'Forgebox liefert – endlich', cond: (s) => (s.stats.forgeN || 0) > 0,
    text: (s, h, g) => { const n = s.stats.forgeN, x = g.netHash('BTC') / Math.max(1, g.netHash('BTC', s.flags.forgeDay || s.day)); return `Monate zu spät steht ein Paket aus Kansas vor der Tür: <b>${n} Miner</b>, baugleich mit dem Glacier A1. Die Bitcoin-Netzleistung hat sich seit deiner Bestellung <b>${nf(0).format(x)}-fach</b> erhöht.`; },
    choices: [
      { label: 'Aufbauen', hint: (g) => (freeSlots(g.s) >= (g.s.stats.forgeN || 1) ? 'Kommt in ein freies Regal' : 'Zu wenig freie Regalplätze – den Rest schreibt Forgebox dir gut'), fx: (g, s) => { const n = s.stats.forgeN || 0; const left = stashDevices(g, 'gla1', n); const v = left * g.itemPrice(PLACEABLE.gla1); s.stats.forgeN = 0; return { cash: v, log: `Forgebox geliefert: ${n - left} Miner aufgebaut${left ? `, ${usd(v)} Gutschrift` : ''}` }; }, reply: '<b>Deniz:</b> Es lebt! Es piept! Es ist … laut.' },
      { label: 'Originalverpackt weiterverkaufen', hint: (g) => `${usd((g.s.stats.forgeN || 0) * g.itemPrice(PLACEABLE.gla1) * 1.15)} von einem ungeduldigen Käufer`, fx: (g, s) => { const v = (s.stats.forgeN || 0) * g.itemPrice(PLACEABLE.gla1) * 1.15; s.stats.forgeN = 0; return { cash: v, log: `Forgebox-Lieferung für ${usd(v)} weiterverkauft` }; }, reply: '<b>Deniz:</b> Der Käufer hat geweint. Vor Freude, glaub ich.' },
    ],
    fallback: 0,
  },
  {
    id: 'repaircafe', from: 'Papa', title: 'Reparatur-Café', when: { date: '2013-04-01', window: 30 },
    text: '„Ich will samstags ein Reparatur-Café im Laden machen. Leute bringen kaputte Sachen, wir löten zusammen. Bräuchte nur Werkbänke und Messgeräte.“',
    choices: [
      { label: 'Einrichtung bezahlen', cost: 3000, hint: 'Papa +2 · Reparaturen dauerhaft 15 % günstiger', fx: { rel: { papa: 2 }, mod: [{ key: 'repair', mult: 0.85 }], flag: 'repaircafe', log: 'April 2013: Reparatur-Café im Laden eröffnet' }, reply: '<b>Papa:</b> Elf Leute am ersten Samstag! Elf!' },
      { label: 'Lieber in Miner investieren', hint: 'Papa −1', fx: { rel: { papa: -1 } }, reply: '<b>Papa:</b> Verstehe. War nur so eine Idee.' },
    ],
  },
  {
    id: 'mamaurlaub', from: 'Mama', title: 'Urlaub? Wir?', when: { date: '2013-07-25', window: 14 },
    text: '„Papa und ich waren seit vierzehn Jahren nicht im Urlaub. Der Laden … du weißt schon. Eine Woche Ostsee wäre schön. Aber wer passt auf den Laden auf?“',
    choices: [
      { label: 'Ich schenk euch die Reise', cost: memo('urlaub', (g) => nice(Math.max(1200, rev(g) * 2))), hint: 'Mama +2, Papa +2', fx: { rel: { mama: 2, papa: 2 }, flag: 'ostsee', log: 'Sommer 2013: Eltern an die Ostsee geschickt' }, reply: '<b>Mama:</b> Papa hat am ersten Tag gefragt, ob der Laden noch steht. Ab Tag drei nicht mehr.' },
      { label: 'Ich übernehme den Laden', hint: 'Mama +1, Papa +1 · 14 Tage −20 % Hashrate (keine Zeit zum Optimieren)', fx: { rel: { mama: 1, papa: 1 }, mod: [{ key: 'hash', mult: 0.8, days: 14 }], log: 'Sommer 2013: zwei Wochen Papas Laden geschmissen' }, reply: '<b>Papa:</b> Du hast drei Fernseher verkauft? Ich verkaufe drei im Monat!' },
      { label: 'Keine Zeit, Goldrausch!', hint: 'Mama −1', fx: { rel: { mama: -1 } }, reply: '<b>Mama:</b> Dann eben nächstes Jahr. Wie letztes Jahr.' },
    ],
    fallback: 1,
  },
  {
    id: 'silkroad', from: 'Deniz', title: 'Razzia im Darknet', when: { date: '2013-10-03', window: 10 },
    text: (s, h, g) => `„Die Polizei hat eine illegale Handelsplattform im Darknet geschlossen. Bitcoin fällt auf <b>${usd(g.price('BTC'))}</b>, die Zeitungen schreiben ‚Verbrechergeld‘. Ist das das Ende – oder ein Rabatt?“`,
    choices: dip('silk', 10, 150, 1 / 3, 'Oktober 2013'),
    fallback: 2,
  },
  {
    id: 'tausend', from: 'Deniz', title: 'Tausend Dollar – und ein Hund', when: { date: '2013-12-07', window: 8 },
    text: (s, h, g) => `„Letzte Woche 1.150 $, Mama hat’s im Fernsehen gesehen. Jetzt verbietet China den Banken Bitcoin – <b>${usd(g.price('BTC'))}</b>. Und gestern ist ein Witz-Coin gestartet: Dogecoin, mit einem Hund drauf.“`,
    choices: [
      { label: 'Ein Drittel der Bitcoin verkaufen', need: (s) => btc(s) > 1e-4, hint: 'Gewinne mitnehmen', fx: (g) => sellDo('BTC', 1 / 3, 'Dezember 2013: nach dem 1.000-$-Gipfel verkauft')(g), reply: '<b>Deniz:</b> Siebenhundert Dollar das Stück. Vor zwei Jahren waren es zwei.' },
      { label: 'Für 50 $ Dogecoin – aus Spaß', cost: 50, hint: (g) => `≈ ${nf(0).format(50 / Math.max(1e-6, g.price('DOGE')))} DOGE`, fx: (g) => ({ ...buy(g, 'DOGE', 50), flag: 'doge13', log: 'Dezember 2013: Dogecoin aus Spaß gekauft' }), reply: '<b>Deniz:</b> Such wow. Very Investment.' },
      earlyStart('dogefs', 'Dogecoin', 0.3, 21, 'Dezember 2013: Frühstart bei Dogecoin'),
      { label: 'Nichts tun', hint: 'Halten', fx: {}, reply: '<b>Deniz:</b> Ruhig bleiben. Unser Ding ist schürfen.' },
    ],
    fallback: 3,
  },

  // ---------- 2014 ----------
  {
    id: 'goxstop', from: 'Deniz', title: 'GoxBank zahlt nicht mehr aus', when: { date: '2014-02-07', window: 10 }, cond: (s, h, g) => exUSD(g) > 50,
    text: (s, h, g) => `„GoxBank hat alle Auszahlungen gestoppt, angeblich ‚technische Probleme‘. Auf der Börse liegen noch Coins im Wert von <b>${usd(exUSD(g))}</b>. Ein Händler kauft GoxBank-Guthaben – für 75 % des Kurses.“`,
    choices: [
      { label: 'An den Händler verkaufen', hint: 'Sofort Geld, 25 % Abschlag', fx: (g, s) => { let v = 0; for (const c of Object.keys(s.wallet)) { const w = s.wallet[c]; v += w.ex * (g.price(c) || 0) * 0.75; w.ex = 0; } return { cash: v, flag: 'goxSold', log: `Februar 2014: GoxBank-Guthaben für ${usd(v)} verkauft` }; }, reply: '<b>Deniz:</b> Ein Viertel weg, drei Viertel sicher. Ich schlaf heute besser.' },
      { label: 'Alles in die Cold-Wallet retten', hint: 'Vielleicht klappt es noch – 50:50', fx: (g, s) => { const ok = Math.random() < 0.5; s.flags.goxRescue = ok ? 1 : 0; if (ok) { for (const c of Object.keys(s.wallet)) { const w = s.wallet[c]; w.cold += w.ex * 0.98; w.ex = 0; } s.payoutCold = true; } return { log: ok ? 'Februar 2014: Coins von GoxBank gerettet' : 'Februar 2014: Rettung von GoxBank gescheitert' }; }, reply: (g) => (g.s.flags.goxRescue ? '<b>Deniz:</b> DURCH! Die letzte Auszahlung, bevor alles zu war. Alles in der Cold-Wallet.' : '<b>Deniz:</b> Hängt fest. „Auszahlung in Bearbeitung.“ Für immer, fürchte ich.') },
      { label: 'Die zahlen schon wieder', hint: 'Abwarten', fx: {}, reply: '<b>Deniz:</b> Hoffentlich hast du recht.' },
    ],
    fallback: 2,
  },
  {
    id: 'kralcard', from: 'Viktor Kral', title: 'Eine Visitenkarte', when: { date: '2014-03-14', window: 60 },
    text: 'Ein schwarzer Wagen hält vor Elektro Brandt. Viktor Kral, MONOLITH Hash AG, legt seine Karte auf die Theke: „Kleine Betriebe gehen in diesem Geschäft unter. Rufen Sie an, bevor es so weit ist.“',
    choices: [
      { label: 'Karte einstecken', hint: 'Man weiß nie', fx: { flag: 'kralKept', log: 'März 2014: Krals Visitenkarte eingesteckt' }, reply: 'Die Karte ist schwer. Echtes Papier, geprägte Schrift.' },
      { label: 'Karte zerreißen', hint: 'Papa +1 · MONOLITH strengt sich mehr an', fx: { flag: 'kralTorn', rel: { papa: 1 }, mod: [{ key: 'monolith', mult: 1.05 }], log: 'März 2014: Krals Karte vor seinen Augen zerrissen' }, reply: '<b>Papa</b> (leise): Das war … ziemlich cool.' },
    ],
  },
  {
    id: 'malware', from: 'Deniz', title: 'Ein Trojaner geht um', when: { date: '2014-06-25', window: 14 }, cond: (s, h, g) => exUSD(g) > 100,
    text: (s, h, g) => `„Ein Trojaner klaut gerade Börsen-Logins, im Forum haben drei Leute über Nacht alles verloren. Bei dir liegen auf der Börse <b>${usd(exUSD(g))}</b>.“`,
    choices: [
      { label: 'Alles in die Cold-Wallet, Zwei-Faktor an', hint: '1 % Gebühr · neue Coins landen künftig dort', fx: (g, s) => ({ do: () => { for (const c of Object.keys(s.wallet)) { const w = s.wallet[c]; w.cold += w.ex * 0.99; w.ex = 0; } s.payoutCold = true; }, flag: 'twofa', log: 'Juni 2014: Coins vor dem Trojaner in Sicherheit gebracht' }), reply: '<b>Deniz:</b> Papier-Wallet 2.0. Und ein neues Passwort, das nicht „Pizza123“ ist.' },
      { label: 'Virenscanner kaufen', cost: 50, hint: 'Hilft meistens (85 %)', fx: (g, s) => { const bad = Math.random() < 0.15, v = bad ? loseEx(g, 0.3, 'hack') : 0; s.flags.malwareHit = v; return { log: bad ? `Juni 2014: Trojaner trotz Scanner – ${usd(v)} weg` : 'Juni 2014: Virenscanner hat den Trojaner erwischt' }; }, reply: (g) => (g.s.flags.malwareHit ? `<b>Deniz:</b> Er war schneller als der Scanner. ${usd(g.s.flags.malwareHit)} sind weg.` : '<b>Deniz:</b> Der Scanner hat ihn erwischt! „Bedrohung entfernt.“ Schönster Satz der Welt.') },
      { label: 'Mir passiert so was nicht', hint: 'Riskant', fx: (g, s) => { const bad = Math.random() < 0.4, v = bad ? loseEx(g, 0.4, 'hack') : 0; s.flags.malwareHit = v; return { log: bad ? `Juni 2014: Trojaner hat ${usd(v)} von der Börse geklaut` : 'Juni 2014: Glück gehabt, kein Trojaner' }; }, reply: (g) => (g.s.flags.malwareHit ? `<b>Deniz:</b> Doch. ${usd(g.s.flags.malwareHit)} – einfach weg. Ich hab’s dir gesagt.` : '<b>Deniz:</b> Glück gehabt. Diesmal.') },
    ],
    fallback: 0,
  },
  {
    id: 'opakrank', from: 'Papa', title: 'Opa im Krankenhaus', when: { date: '2014-08-05', window: 14 },
    text: '„Opa ist von der Leiter gefallen. Hüfte. Er liegt im Kreiskrankenhaus, schimpft auf das Essen und fragt nach dir.“',
    choices: [
      { label: 'Jeden Tag besuchen', hint: 'Opa +2 · 14 Tage −20 % Hashrate', fx: { rel: { opa: 2 }, mod: [{ key: 'hash', mult: 0.8, days: 14 }], log: 'August 2014: Opa jeden Tag im Krankenhaus besucht' }, reply: '<b>Opa:</b> Die Schwestern sagen, ich wär ein Musterpatient. Lügnerinnen.' },
      { label: 'Einzelzimmer und Tablet spendieren', cost: memo('krank', (g) => nice(Math.max(500, rev(g) * 1.5))), hint: 'Opa +1, Papa +1', fx: { rel: { opa: 1, papa: 1 }, log: 'August 2014: Opa ein Einzelzimmer spendiert' }, reply: '<b>Opa:</b> Was soll ich mit dem Ding? … Wie macht man da Skat an?' },
      { label: 'Eine Karte schicken', hint: 'Mehr nicht', fx: {}, reply: '<b>Papa:</b> Er hat sie ans Bett geklebt. Neben den Schaltplan vom Krankenhaus.' },
    ],
    fallback: 2,
  },
  {
    id: 'stromvertrag', from: 'Stadtwerke Lindental', title: 'Neue Stromtarife', when: { date: '2014-10-15', window: 14 }, cond: (s) => tier(s) >= 1,
    text: (s, h, g) => `„Für Gewerbekunden in Lindental haben wir zwei Tarife für die nächsten zwei Jahre: Festpreis (−12 %) oder Flex mit Abschaltrecht bei Netzengpässen (−20 %). Bearbeitungsgebühr ${usd(svFee(g))}.“ Dein Strom in Lindental kostet gerade ${usd(elecDay(g, LINDENTAL))} am Tag.`,
    choices: [
      { label: 'Festpreis-Tarif', cost: (g) => svFee(g), hint: '2 Jahre: −12 % Strom in Lindental', fx: { mod: facMods(LINDENTAL, 'elec', 0.88, 730), log: 'Oktober 2014: Festpreis-Tarif der Stadtwerke' }, reply: '<b>Papa:</b> Unterschrieben. Ich hab den Kugelschreiber behalten.' },
      { label: 'Flex-Tarif mit Abschaltrecht', cost: (g) => svFee(g), hint: '2 Jahre: −20 % Strom, aber −8 % Hashrate in Lindental', fx: { mod: [...facMods(LINDENTAL, 'elec', 0.8, 730), ...facMods(LINDENTAL, 'hash', 0.92, 730)], log: 'Oktober 2014: Flex-Tarif mit Abschaltrecht' }, reply: '<b>Deniz:</b> Wenn das Netz ächzt, gehen wir kurz schlafen. Fair.' },
      { label: 'Beim alten Tarif bleiben', hint: 'Keine Gebühr', fx: {}, reply: '<b>Stadtwerke:</b> Unser Angebot gilt nicht ewig.' },
    ],
    fallback: 2,
  },
  {
    id: 'netz', from: 'Netzbetreiber', title: 'Warteschlange am Netz', when: { from: '2014-06-01', chance: 0.5, repeat: 30 },
    cond: (s, h, g) => !!netzFac(s, g),
    text: (s, h, g) => { const id = netzFac(s, g), nx = FACILITY[id].power[s.fac[id].power + 1], sm = g.summary[id]; return `„Für ${nx.label} in ${id === 'halle' ? 'Lindental-Nord' : 'Frankfurt-Ost'} brauchen Sie einen neuen Netzanschluss. ${id === 'rz' ? 'Rechenzentren stehen hier Schlange.' : 'Das Mittelspannungsnetz ist voll.'} Normal: 180 Tage Wartezeit. Mit Baukostenzuschuss: sofort.“ Die ${fname(id)} nutzt ${nf(0).format((sm.watt / 1000 / sm.capKw) * 100)} % ihres Anschlusses.`; },
    choices: [
      { label: 'Opa kennt den Netzmeister', need: (s) => (s.rel?.opa || 0) >= 3, hint: 'Opa ab Stufe 3: kein Zuschuss, kein Warten · Opa +1', fx: (g, s) => { const id = netzFac(s, g) || 'halle'; return { rel: { opa: 1 }, flag: 'netz_' + id, log: `Opa hat beim Netzbetreiber angerufen (${fname(id)})` }; }, reply: '<b>Opa:</b> Der Hubert und ich, wir haben 1971 zusammen gelernt. Das geht klar.' },
      { label: 'Baukostenzuschuss zahlen', hint: 'Stromausbau dort sofort möglich, ein Jahr lang 40 % teurer', fx: (g, s) => { const id = netzFac(s, g) || 'halle'; return { mod: [{ key: 'powerCost', mult: 1.4, days: 365, fac: id }], flag: 'netz_' + id, log: `Netzbetreiber: Baukostenzuschuss für die ${fname(id)}` }; }, reply: '<b>Netzbetreiber:</b> Der Bagger kommt Montag.' },
      { label: 'Anstellen – 180 Tage warten', hint: 'Kein Stromausbau dort für 180 Tage, danach zum Normalpreis', fx: (g, s) => { const id = netzFac(s, g) || 'halle'; return { mod: [{ key: 'powerWait', mult: 0, days: 180, fac: id }], flag: 'netz_' + id, log: `Netzbetreiber: 180 Tage Warteschlange für die ${fname(id)}` }; }, reply: '<b>Netzbetreiber:</b> Sie sind Nummer 47. Wir melden uns.' },
    ],
    fallback: 2,
  },

  // ---------- 2015 ----------
  {
    id: 'papaonline', from: 'Papa', title: 'Papa gegen das Internet', when: { date: '2015-03-07', window: 14 },
    text: '„Die Leute schauen sich bei mir Fernseher an und bestellen sie dann online. Deniz meint, ich brauche einen Webshop. Ich weiß nicht mal, was ein Warenkorb ist.“',
    choices: [
      { label: 'Webshop bauen lassen', cost: memo('shop', (g) => nice(Math.max(2500, rev(g) * 3))), hint: 'Papa +2 · Papa zahlt dir zwei Jahre lang monatlich etwas zurück', fx: (g) => ({ rel: { papa: 2 }, mod: [{ key: 'monthly', mult: -Math.round(memo('shop', () => 0)(g) / 12), days: 730 }], flag: 'webshop', log: 'März 2015: Webshop für Elektro Brandt' }), reply: '<b>Papa:</b> Drei Bestellungen über Nacht! Aus Bayern! Wer kauft in Bayern Kabel bei mir?' },
      { label: 'Deniz baut ihn am Wochenende', hint: 'Papa +1, Deniz +1 · kostet nichts', fx: { rel: { papa: 1, deniz: 1 }, flag: 'webshop', log: 'März 2015: Deniz baut Papas Webshop' }, reply: '<b>Deniz:</b> Pizza und eine Steckdosenleiste als Lohn. Faires Geschäft.' },
      { label: 'Online gewinnt sowieso', hint: 'Papa −1', fx: { rel: { papa: -1 } }, reply: '<b>Papa:</b> Danke für die Ermutigung.' },
    ],
    fallback: 1,
  },
  {
    id: 'ethstart', from: 'Deniz', title: 'Ethereum ist live', when: { date: '2015-07-30', window: 14 },
    text: (s, h, g) => `„Ethereum läuft! Grafikkarten haben wieder was zu tun. Ein Ether kostet <b>${usd(g.price('ETH'))}</b>. Ich glaub, das wird groß. Oder es ist in einem Jahr tot.“`,
    choices: [
      { label: 'Ether kaufen', cost: memo('eth', (g) => amt(g, 3, 100)), hint: (g) => `≈ ${nf(0).format(memo('eth', (x) => amt(x, 3, 100))(g) / Math.max(0.01, g.price('ETH')))} ETH`, fx: (g) => ({ ...buy(g, 'ETH', memo('eth', () => 0)(g)), log: 'Juli 2015: Ether zum Start gekauft' }), reply: '<b>Deniz:</b> Weltcomputer! Ich hab keine Ahnung, was das heißt, aber ich bin dabei.' },
      { label: 'Deniz’ Gebrauchtkarten-Kontakt', hint: '45 Tage Grafikkarten 25 % billiger · Deniz +1', fx: { mod: [{ key: 'price:gpu', mult: 0.75, days: 45 }], rel: { deniz: 1 }, log: 'Juli 2015: günstige Gebraucht-GPUs für Ethereum' }, reply: '<b>Deniz:</b> Ein Typ in Halle hat 200 Karten im Keller. Frag nicht.' },
      earlyStart('ethfs', 'Ethereum', 0.4, 30, 'Juli 2015: Frühstart bei Ethereum'),
      { label: 'Bei Bitcoin bleiben', hint: 'Nichts ändern', fx: {}, reply: '<b>Deniz:</b> Deine Rigs auf „Auto“ schürfen trotzdem, was sich lohnt.' },
    ],
    fallback: 3,
  },
  {
    id: 'kita15', from: 'Opa Heinz', title: 'Abwärme für die Kita', when: { date: '2015-10-10', window: 14 }, cond: (s) => tier(s) >= 2,
    text: (s) => `„Die Kita Sonnenschein frierst jeden Winter, die Ölheizung ist von 1979. Deine ${fname(top(s))} macht Wärme ohne Ende. Ich könnte eine Leitung legen.“`,
    choices: [
      { label: 'Leitung legen, Kita zahlt Heizgeld', cost: memo('kita', (g) => nice(Math.max(3000, rev(g) * 3))), hint: 'Opa +1, Mama +1 · drei Jahre monatliches Heizgeld', fx: (g) => ({ rel: { opa: 1, mama: 1 }, mod: [{ key: 'monthly', mult: -Math.round(memo('kita', () => 0)(g) / 12), days: 1095 }], flag: 'kita', log: 'Oktober 2015: Abwärme heizt die Kita' }), reply: '<b>Opa:</b> Fünfzehn Meter Rohr, und die Kinder haben es warm. So muss Technik.' },
      { label: 'Leitung legen, Wärme gratis', cost: memo('kita', (g) => nice(Math.max(3000, rev(g) * 3))), hint: 'Opa +2, Mama +2', fx: { rel: { opa: 2, mama: 2 }, flag: 'kita', log: 'Oktober 2015: Abwärme heizt die Kita – gratis' }, reply: '<b>Mama:</b> Die Kinder haben dir ein Bild gemalt. Ein Computer mit Sonne drin.' },
      { label: 'Keine Zeit', hint: 'Opa −1', fx: { rel: { opa: -1 } }, reply: '<b>Opa:</b> Dann friert die Kita halt noch ein Jahr.' },
    ],
    fallback: 2,
  },

  // ---------- 2016 ----------
  {
    id: 'kralhalle', from: 'Viktor Kral', title: 'Kral zieht nach Lindental', when: { date: '2016-03-06', window: 30 },
    text: (s) => (has(s, 'halle')
      ? '„Nachbarn, Brandt! MONOLITH mietet die Halle neben Ihrer. Übrigens: Für die Trafostation zwischen unseren Hallen gibt es ein Vorkaufsrecht. 60.000 $. Ich biete mit.“'
      : '„MONOLITH mietet im Gewerbegebiet Lindental-Nord – da, wo Sie irgendwann hinwollen. Für die Trafostation dort gibt es ein Vorkaufsrecht. 60.000 $. Ich biete mit.“'),
    choices: [
      { label: 'Trafostation kaufen', cost: 60000, hint: 'Stromausbau der Lagerhalle dauerhaft −20 %', fx: { mod: [{ key: 'powerCost', mult: 0.8, fac: 'halle' }, { key: 'monolith', mult: 0.98 }], flag: 'trafo', log: 'März 2016: Trafostation vor Kral gekauft' }, reply: '<b>Kral:</b> Gut gespielt, Brandt. Diesmal.' },
      { label: 'Kral soll sie haben', hint: 'Stromausbau der Lagerhalle dauerhaft +25 %', fx: { mod: [{ key: 'powerCost', mult: 1.25, fac: 'halle' }, { key: 'monolith', mult: 1.03 }], log: 'März 2016: Kral bekommt die Trafostation' }, reply: '<b>Kral:</b> Vernünftig. Ich schicke Ihnen eine Rechnung für die Mitbenutzung.' },
    ],
  },
  {
    id: 'daohack', from: 'Deniz', title: 'Die KASSE wurde gehackt', when: { date: '2016-06-17', window: 10 },
    text: (s, h, g) => `„Die KASSE – dieser Gemeinschaftsfonds auf Ethereum – ist gehackt! Ein Drittel aller Ether darin ist weg. Ether fällt auf <b>${usd(g.price('ETH'))}</b>. Die Entwickler wollen die ganze Kette spalten, um den Diebstahl rückgängig zu machen.“${coins(s, 'ETH') > 0.01 ? ` Du hast ${nf(1).format(coins(s, 'ETH'))} ETH.` : ''}`,
    choices: [
      { label: 'Ether billig nachkaufen', cost: memo('dao', (g) => amt(g, 5, 200)), hint: (g) => `≈ ${nf(0).format(memo('dao', (x) => amt(x, 5, 200))(g) / Math.max(0.01, g.price('ETH')))} ETH`, fx: (g) => ({ ...buy(g, 'ETH', memo('dao', () => 0)(g)), log: 'Juni 2016: Ether nach dem KASSE-Hack gekauft' }), reply: '<b>Deniz:</b> Wer jetzt kauft, ist mutig oder verrückt. Wir sind beides.' },
      { label: 'Alle Ether verkaufen', need: (s) => coins(s, 'ETH') > 0.01, hint: 'Raus aus Ethereum', fx: (g) => sellDo('ETH', 1, 'Juni 2016: Ether nach dem Hack verkauft')(g), reply: '<b>Deniz:</b> Weg damit. Smart Contracts, dumme Fehler.' },
      { label: 'Abwarten', hint: 'Mal sehen, ob die Spaltung klappt', fx: {}, reply: '<b>Deniz:</b> Im Juli spalten sie. Dann gibt’s zwei Ethereums. Verrückte Welt.' },
    ],
    fallback: 2,
  },
  halving('halv16', '2016-07-06', '09.07.2016', 25, 12.5, '„Nur sparsame ASICs überleben das“, sagt Deniz.'),
  {
    id: 'mama50', from: 'Papa', title: 'Mama wird 50', when: { date: '2016-08-28', window: 14 },
    text: '„Mama wird nächsten Monat 50. Ich hab keine Idee. Sie wünscht sich ‚nichts‘, was bei uns ‚was Großes‘ heißt.“',
    choices: [
      { label: 'Wellness-Wochenende für beide', cost: memo('m50', (g) => nice(Math.max(1500, rev(g) * 2))), hint: 'Mama +2, Papa +1', fx: { rel: { mama: 2, papa: 1 }, log: 'Mamas 50. Geburtstag: Wellness-Wochenende' }, reply: '<b>Mama:</b> Ein Bademantel mit meinem Namen drauf. Ich zieh ihn nie wieder aus.' },
      { label: 'Ein Fotobuch: 50 Jahre Sabine', cost: 80, hint: 'Mama +1, Opa +1 (er hat die alten Fotos)', fx: { rel: { mama: 1, opa: 1 }, log: 'Mamas 50. Geburtstag: Fotobuch' }, reply: '<b>Opa:</b> Seite 12 – da hat sie mir mit fünf den Lötkolben geklaut.' },
      { label: 'Das überlasse ich Papa', hint: 'Mama −1', fx: { rel: { mama: -1 } }, reply: '<b>Papa:</b> Ich hab ihr einen Wasserkocher geschenkt. Bitte sag nichts.' },
    ],
    fallback: 1,
  },
  {
    id: 'zcash16', from: 'Deniz', title: 'Zcash-Goldrausch', when: { date: '2016-10-28', window: 7 },
    text: (s, h, g) => `„Zcash ist gestartet! Weil es noch fast keine gibt, kostet ein Coin <b>${usd(g.price('ZEC'))}</b>. Unsere Grafikkarten könnten zwei Wochen lang absahnen – wenn sie die Hitze aushalten.“`,
    choices: [
      { ...earlyStart('zecfs', 'Zcash', 0.8, 14, 'Oktober 2016: Zcash-Goldrausch mitgemacht'), reply: '<b>Deniz:</b> Es riecht nach heißem Kunststoff. Und nach Geld.' },
      { label: 'Zcash kaufen', cost: memo('zec', (g) => amt(g, 2, 100)), hint: 'Neuer Coin, irrer Preis', fx: (g) => ({ ...buy(g, 'ZEC', memo('zec', () => 0)(g)), log: 'Oktober 2016: Zcash zum Startpreis gekauft' }), reply: '<b>Deniz:</b> Am ersten Tag kaufen. Das hat bestimmt noch nie wehgetan.' },
      { label: 'Nicht verrückt machen', hint: 'Abwarten', fx: {}, reply: '<b>Deniz:</b> In zwei Wochen ist der Spuk vorbei. Wetten?' },
    ],
    fallback: 2,
  },

  // ---------- 2017 ----------
  {
    id: 'kralhost', from: 'Viktor Kral', title: 'Kral will mieten', when: { date: '2017-03-07', window: 20 }, cond: (s) => tier(s) >= 2,
    text: (s, h, g) => `„Brandt, ein Geschäftsvorschlag. MONOLITH stellt eigene Maschinen in Ihre ${fname(top(s))} – ein Fünftel Ihres Anschlusses. Sie bekommen <b>${usd(hostFee(g))}</b> im Monat, zwei Jahre fest. Den Strom zahle ich.“`,
    choices: [
      { label: 'Vermieten', hint: 'Zwei Jahre: ein Fünftel weniger Anschluss, feste Miete · MONOLITH +3 %', fx: (g, s) => ({ mod: [{ key: 'cap', mult: 0.8, days: 730, fac: top(s) }, { key: 'monthly', mult: -hostFee(g), days: 730 }, { key: 'monolith', mult: 1.03, days: 730 }], flag: 'kralHost', log: `März 2017: Fläche an MONOLITH vermietet (${usd(hostFee(g))}/Monat)` }), reply: '<b>Kral:</b> Freut mich. Meine Techniker kommen Montag. Sie fassen nichts an.' },
      { label: 'Nicht an MONOLITH', hint: 'Deniz +1 – er traut Kral nicht', fx: { rel: { deniz: 1 }, log: 'März 2017: Krals Mietangebot abgelehnt' }, reply: '<b>Deniz:</b> Der wollte nur unsere Kühlung abschauen. Gut so.' },
    ],
    fallback: 1,
  },
  {
    id: 'gpuhaendler', from: 'Deniz', title: 'Grafikkarten-Händler aus Leipzig', when: { date: '2017-06-15', window: 14 }, cond: (s) => gpuCount(s) >= 2,
    text: (s, h, g) => `„Alle wollen Ethereum minen, Grafikkarten sind ausverkauft. Ein Händler aus Leipzig zahlt für deine ${gpuCount(s)} Karten in ${rigsWithGpu(s).length} Rigs <b>${usd(rigValue(g))}</b> – den vollen Zeitwert.“ Und leiser: „Pass auf, in Sachsen werden gerade Rigs geklaut.“`,
    choices: [
      { label: 'Alle GPU-Rigs verkaufen', hint: 'Doppelt so viel wie sonst beim Verkauf · dein erster PC bleibt', fx: (g) => { const v = sellRigs(g); return { log: `Juni 2017: GPU-Rigs für ${usd(v)} nach Leipzig verkauft` }; }, reply: '<b>Deniz:</b> Ein Transporter voller Karten. Der Typ hat bar bezahlt. In einer Sporttasche.' },
      { label: 'Die Hälfte verkaufen', hint: 'Halb Geld, halb Ethereum', fx: (g) => { const v = sellRigs(g, 0.5); return { log: `Juni 2017: halbe GPU-Rigs für ${usd(v)} verkauft` }; }, reply: '<b>Deniz:</b> Kompromiss. Mama wäre stolz.' },
      { label: 'Behalten und Alarmanlage einbauen', cost: memo('alarm', (g) => nice(Math.max(900, rev(g) * 0.5))), hint: 'Schützt deine Standorte vor Einbrüchen', fx: { flag: 'alarm', log: 'Juni 2017: Alarmanlage eingebaut' }, reply: '<b>Opa:</b> Die piept, wenn eine Maus furzt. Gut so.' },
      { label: 'Behalten', hint: 'Ethereum läuft gerade gut', fx: {}, reply: '<b>Deniz:</b> Recht hast du. Die Dinger drucken gerade Geld.' },
    ],
    fallback: 3,
  },
  {
    id: 'einbruch', from: 'Papa', title: 'Einbruch!', when: { from: '2017-06-20', to: '2022-06-30', chance: 0.04, repeat: 365 },
    cond: (s) => GPU_BOOM(s.day) > 1.4 && gpuCount(s, LINDENTAL) >= 12 && !s.flags.alarm,
    text: (s, h, g) => { const p = memo('theft', theftPlan)(g); return `„Heute Nacht hat jemand das Rolltor aufgehebelt. <b>${p.n} Grafikkarten</b> sind weg – Wert ${usd(p.v)}. Die Polizei sagt: Mining-Karten sind gerade begehrter als Autoradios.“`; },
    choices: [
      { label: 'Anzeige, Versicherung, Alarmanlage', cost: memo('alarm2', (g) => nice(Math.max(1500, rev(g) * 0.5))), hint: 'Versicherung zahlt 40 % · nie wieder Einbruch', fx: (g) => { const v = steal(g, memo('theft', theftPlan)(g).take); return { cash: v * 0.4, flag: 'alarm', log: `Einbruch: ${usd(v)} Grafikkarten gestohlen, Alarmanlage eingebaut` }; }, reply: '<b>Papa:</b> Kameras an jeder Ecke. Jetzt sieht uns sogar die Katze zu.' },
      { label: 'Deniz sucht auf Kleinanzeigen', hint: 'Mit Glück kommt die Hälfte zurück', fx: (g, s) => { const p = memo('theft', theftPlan)(g); const lucky = Math.random() < 0.5; s.flags.theftLucky = lucky ? 1 : 0; const v = steal(g, lucky ? p.take.slice(0, Math.ceil(p.take.length / 2)) : p.take); return { rel: { deniz: 1 }, log: `Einbruch: ${usd(v)} Grafikkarten gestohlen${lucky ? ' – Deniz fand einen Teil wieder' : ''}` }; }, reply: (g) => (g.s.flags.theftLucky ? '<b>Deniz:</b> „Gebrauchte Karten, Abholung Lindental“ – der Depp hat sie bei uns um die Ecke angeboten. Die Hälfte ist zurück!' : '<b>Deniz:</b> Nichts. Die sind wahrscheinlich schon in Polen.') },
      { label: 'Abhaken', hint: 'Die Karten sind weg', fx: (g) => { const v = steal(g, memo('theft', theftPlan)(g).take); return { log: `Einbruch: ${usd(v)} Grafikkarten gestohlen` }; }, reply: '<b>Papa:</b> Ich häng wenigstens ein neues Schloss dran.' },
    ],
    fallback: 2,
  },
  {
    id: 'ico', from: 'Deniz', title: 'Ein eigener Token?', when: { date: '2017-07-15', window: 30 }, cond: (s) => !!s.flags.gmbh || tier(s) >= 3,
    text: (s, h, g) => `„Alle machen ICOs! Wir verkaufen ‚HashwerkToken‘ gegen Ether – Anteile an unserer künftigen Hashrate. Anwalt, Whitepaper, Werbung: <b>${usd(icoCost(g))}</b>. Einsammeln könnten wir <b>${usd(icoRaise(g))}</b>.“`,
    choices: [
      { label: 'ICO starten', cost: (g) => icoCost(g), hint: 'Käufer zahlen in Ether · die Finanzaufsicht schaut zu', fx: (g, s) => { const v = icoRaise(g); s.stats.icoUSD = v; return { ...buy(g, 'ETH', v), flag: 'ico', next: [{ id: 'icoreg', inDays: Math.max(30, toDay('2017-11-10') - s.day) }], msg: { from: 'Deniz', text: 'Unser ICO ist durch! Verkauf die Ethereum, bevor die Blase platzt.' }, log: `Juli 2017: HashwerkToken-ICO bringt ${usd(v)}` }; }, reply: '<b>Deniz:</b> Ausverkauft in elf Minuten. ELF. Ich muss mich hinlegen.' },
      { label: 'Wir sind Miner, keine Zocker', hint: 'Opa +1', fx: { rel: { opa: 1 }, log: 'Juli 2017: keinen ICO gemacht' }, reply: '<b>Opa:</b> Recht so. Geld kommt vom Arbeiten. Oder vom Schürfen, meinetwegen.' },
    ],
    fallback: 1,
  },
  {
    id: 'icoreg', chain: true, from: 'Finanzaufsicht', title: 'Post von der Finanzaufsicht', cond: (s) => !!s.flags.ico,
    text: (s) => `„Ihr HashwerkToken ist nach unserer Auffassung ein Wertpapier. Für Wertpapiere braucht es einen Prospekt. Den haben Sie nicht.“ Der ICO hat ${usd(s.stats.icoUSD || 0)} eingesammelt.`,
    choices: [
      { label: 'Anwälte reichen den Prospekt nach', cost: (g) => nice(Math.max(50000, (g.s.stats.icoUSD || 0) * 0.06)), hint: 'Der Token bleibt, die Aufsicht ist zufrieden', fx: { flag: 'icoOk', log: 'November 2017: Prospekt für den HashwerkToken nachgereicht' }, reply: '<b>Anwältin:</b> 412 Seiten. Die liest keiner. Genau so muss das sein.' },
      { label: 'Rückkauf: Anleger auszahlen', cost: (g) => nice((g.s.stats.icoUSD || 0) * 0.8), hint: '80 % des Erlöses zurück · Opa +1, Papa +1', fx: { rel: { opa: 1, papa: 1 }, flag: 'icoBack', log: 'November 2017: HashwerkToken zurückgekauft' }, reply: '<b>Papa:</b> Anständig. So hab ich dich erzogen. Glaube ich.' },
      { label: 'Aussitzen', hint: 'Riskant: Bußgeld möglich', fx: (g, s) => { const fine = Math.random() < 0.5 ? nice((s.stats.icoUSD || 0) * 0.25) : 0; s.flags.icoFine = fine; return { cash: -fine, log: fine ? `November 2017: Bußgeld von ${usd(fine)} für den HashwerkToken` : 'November 2017: Finanzaufsicht hat den Fall eingestellt' }; }, reply: (g) => (g.s.flags.icoFine ? `<b>Finanzaufsicht:</b> Bußgeldbescheid über ${usd(g.s.flags.icoFine)}. Zahlbar sofort.` : '<b>Deniz:</b> Die haben den Fall eingestellt. Zu viele ICOs, zu wenig Beamte.') },
    ],
    fallback: 2,
  },
  {
    id: 'fork17', from: 'Deniz', title: 'Bitcoin spaltet sich', when: { date: '2017-08-01', window: 10 }, cond: (s) => btc(s) > 0.1,
    text: (s) => `Heute ist eine Abspaltung passiert: Wer Bitcoin hatte, bekommt die neuen Coins gratis dazu. In deiner Cold-Wallet liegen <b>${nf(2).format(s.wallet.BTC.cold)} BTC</b>, auf der Börse <b>${nf(2).format(s.wallet.BTC.ex)} BTC</b> – die Börse zahlt nur die Hälfte aus.`,
    choices: [
      { label: 'Abspalt-Coins sofort verkaufen', hint: (g) => `+${usd(g.s.wallet.BTC.cold * 300 + g.s.wallet.BTC.ex * 150)}`, fx: (g, s) => { const v = s.wallet.BTC.cold * 300 + s.wallet.BTC.ex * 150; return { cash: v, log: `August 2017: Abspalt-Coins für ${usd(v)} verkauft`, toast: `+${usd(v)} aus der Abspaltung` }; }, reply: '<b>Deniz:</b> Geschenktes Geld. Beste Sorte.' },
      { label: 'Verkaufen und mit Deniz teilen', hint: (g) => `+${usd((g.s.wallet.BTC.cold * 300 + g.s.wallet.BTC.ex * 150) / 2)} · Deniz +2`, fx: (g, s) => { const v = (s.wallet.BTC.cold * 300 + s.wallet.BTC.ex * 150) / 2; return { cash: v, rel: { deniz: 2 }, log: `August 2017: Abspalt-Coins mit Deniz geteilt` }; }, reply: '<b>Deniz:</b> Du bist verrückt. Danke. Ich kauf mir einen Stuhl, der nicht quietscht.' },
    ],
    fallback: 0,
  },
  {
    id: 'papakauft', from: 'Papa', title: 'Papa will auch Bitcoin', when: { date: '2017-10-12', window: 14 },
    text: (s, h, g) => `„<b>${usd(g.price('BTC'))}</b> für einen Bitcoin! Der Weber vom Kegelclub hat sein Geld verdoppelt. Ich will 10.000 $ von meinem Ersparten reinstecken. Was meinst du?“`,
    choices: [
      { label: 'Okay – aber nur die Hälfte', hint: 'Papa kauft für 5.000 $ · Papa +1', fx: (g, s) => ({ rel: { papa: 1 }, stat: { papaBtc: 5000 / g.price('BTC'), papaUsd: 5000 }, log: 'Oktober 2017: Papa kauft Bitcoin für 5.000 $' }), reply: '<b>Papa:</b> Fünftausend. Fühlt sich an wie Lotto.' },
      { label: 'Ich schenk dir Bitcoin für 1.000 $', need: (s, h, g) => btc(s) * g.price('BTC') >= 1000, hint: 'Aus deiner Wallet · Papa +2', fx: (g) => ({ coin: { BTC: -1000 / g.price('BTC') }, rel: { papa: 2 }, stat: { papaBtc: 1000 / g.price('BTC'), papaUsd: 1000 }, log: 'Oktober 2017: Papa Bitcoin geschenkt' }), reply: '<b>Papa:</b> Mein erster Bitcoin. Na ja, ein Sechstel. Ich rahm mir die Adresse ein.' },
      { label: 'Lass es, Papa', hint: 'Papa −1 – aber sein Erspartes bleibt sicher', fx: { rel: { papa: -1 }, flag: 'papaNo', log: 'Oktober 2017: Papa vom Bitcoin-Kauf abgehalten' }, reply: '<b>Papa:</b> Du bist schlimmer als deine Mutter.' },
    ],
    fallback: 2,
  },
  {
    id: 'friseur', from: 'Opa Heinz', title: 'Opas Friseur', when: { date: '2017-12-17', window: 6 }, cond: (s) => btc(s) > 0.2,
    text: (s, h, g) => `„Mein Friseur hat mich nach Bitcoin gefragt. Mein FRISEUR. Wenn der einsteigt, ist es Zeit auszusteigen, Junge.“ Kurs heute: <b>${usd(g.price('BTC'))}</b>.`,
    choices: [
      { label: 'Ein Drittel verkaufen', hint: 'Opa +1', fx: (g) => ({ ...sellDo('BTC', 1 / 3, 'Dezember 2017: auf Opa gehört, ein Drittel verkauft')(g), rel: { opa: 1 } }), reply: '<b>Opa:</b> Kluger Junge. Kommt nach mir.' },
      { label: 'Alles verkaufen', hint: 'Opa +1', fx: (g) => ({ ...sellDo('BTC', 1, 'Dezember 2017: kurz vor dem Gipfel alles verkauft')(g), rel: { opa: 1 } }), reply: '<b>Opa:</b> Ganz oder gar nicht. So mag ich das.' },
      { label: 'Halten', hint: 'Opa ist ja kein Analyst', fx: { log: 'Dezember 2017: trotz Opas Friseur gehalten' }, reply: '<b>Opa:</b> Wie du meinst. Ich hab dich gewarnt.' },
    ],
    fallback: 2,
  },

  // ---------- 2018 ----------
  {
    id: 'opa80', from: 'Mama', title: 'Opa wird 80', when: { date: '2018-03-07', window: 14 },
    text: (s) => `„Opa wird 80! Er will ‚kein Theater‘. Also machen wir Theater. Die halbe Straße kommt, und er will unbedingt deine ${fname(top(s))} sehen.“`,
    choices: [
      { label: (g) => `Ein Fest in der ${fname(top(g.s))}`, cost: memo('o80', (g) => nice(Math.max(2000, rev(g) * 2))), hint: 'Opa +2, Mama +1, Papa +1', fx: { rel: { opa: 2, mama: 1, papa: 1 }, log: 'März 2018: Opas 80. zwischen den Minern gefeiert' }, reply: '<b>Opa:</b> Achtzig Jahre, und das hier ist das Lauteste, was ich je gehört hab. Herrlich.' },
      { label: 'Sein altes Röhrenradio restaurieren', hint: 'Opa +2 · Hardware-Erfahrung', fx: { rel: { opa: 2 }, xp: { hw: 40 }, flag: 'radio', log: 'März 2018: Opas Röhrenradio von 1962 restauriert' }, reply: '<b>Opa:</b> Das spielt ja wieder! Da lief 1962 die Nachricht, dass ich die Meisterprüfung hab.' },
      { label: 'Nur kurz vorbeischauen', hint: 'Opa −1', fx: { rel: { opa: -1 } }, reply: '<b>Mama:</b> Er hat zweimal gefragt, wo du bist.' },
    ],
    fallback: 1,
  },
  heat('heat18', '2018-07-24', 10, '„Dürresommer! Zwei Wochen über 35 Grad, die Flüsse sind so warm, dass Kraftwerke drosseln.“'),
  {
    id: 'winter18', from: 'Deniz', title: 'Krypto-Winter', when: { date: '2018-10-05', window: 14 },
    text: (s, h, g) => `„Seit Januar fällt der Kurs: <b>${usd(g.price('BTC'))}</b>. Bei einem Miner in Sachsen steht der Insolvenzverwalter – Container voller Geräte für einen Bruchteil.“${s.stats.papaBtc ? ` Papa fragt leise, ob seine Bitcoin (jetzt ${usd(s.stats.papaBtc * g.price('BTC'))}) je wieder was wert werden.` : ''}`,
    choices: [
      { label: 'Zuschlagen', hint: '30 Tage ASICs 45 % billiger · ein Jahr mehr Ausfälle (gebraucht)', fx: { mod: [{ key: 'price:asic', mult: 0.55, days: 30 }, { key: 'fail', mult: 1.2, days: 365 }], log: 'Oktober 2018: Insolvenz-Miner günstig gekauft' }, reply: '<b>Deniz:</b> Die haben noch Aufkleber von 2017 drauf: „To the moon“. Na dann.' },
      { label: 'Papa seine Bitcoin abkaufen', need: (s) => (s.stats.papaBtc || 0) > 0, cost: (g) => g.s.stats.papaUsd || 0, hint: 'Zu seinem Einkaufspreis · Papa +2', fx: (g, s) => { const n = s.stats.papaBtc || 0; s.stats.papaBtc = 0; return { coin: { BTC: n }, rel: { papa: 2 }, flag: 'papaBought', log: 'Oktober 2018: Papa seine Bitcoin zum Einkaufspreis abgekauft' }; }, reply: '<b>Papa:</b> Du nimmst mir das ab? Zum alten Preis? Kind … danke.' },
      { label: 'Durchhalten', hint: 'Winter geht vorbei', fx: {}, reply: '<b>Deniz:</b> Mütze auf, Rigs an. Wir haben schon 2015 überlebt.' },
    ],
    fallback: 2,
  },
  {
    id: 'poach', from: 'Deniz', title: 'Kral will Deniz', when: { date: '2018-11-12', window: 30 }, cond: (s) => !!s.flags.gmbh,
    text: '„Kral hat mich angerufen. CTO bei MONOLITH, doppeltes Gehalt, Dienstwagen. Ich will eigentlich nicht weg. Aber … sag du was.“',
    choices: [
      { label: '10 % Firmenanteile für Deniz', hint: 'Deniz +2 · 15 % weniger Ausfälle', fx: { rel: { deniz: 2 }, mod: [{ key: 'fail', mult: 0.85 }], flag: 'denizPartner', log: 'November 2018: Deniz wird Teilhaber' }, reply: '<b>Deniz:</b> Partner. Wir. Ich muss mich setzen.' },
      { label: 'Gehalt verdoppeln', hint: '+3.000 $ Fixkosten pro Monat · Deniz +1', fx: { rel: { deniz: 1 }, mod: [{ key: 'monthly', mult: 3000 }], log: 'November 2018: Deniz bleibt für doppeltes Gehalt' }, reply: '<b>Deniz:</b> Okay. Okay! Ich bleib.' },
      { label: 'Gehen lassen', hint: 'Deniz −3 · MONOLITH wird stärker', fx: { rel: { deniz: -3 }, mod: [{ key: 'monolith', mult: 1.1 }], flag: 'denizLeft', next: [{ id: 'denizback', inDays: 900 }], log: 'November 2018: Deniz geht zu MONOLITH' }, reply: '<b>Deniz:</b> … Mach’s gut. Ehrlich.' },
    ],
    fallback: 1,
  },
  {
    id: 'denizback', chain: true, from: 'Deniz', title: 'Darf ich zurück?', cond: (s) => s.flags.denizLeft,
    text: '„Bei MONOLITH ist alles Excel und Angst. Ich vermisse unsere Werkstatt. Darf ich zurück? Ohne Dienstwagen.“',
    choices: [
      { label: 'Willkommen zurück!', hint: 'Deniz +3 · MONOLITH verliert seinen CTO', fx: { rel: { deniz: 3 }, mod: [{ key: 'monolith', mult: 1 / 1.1 }], flag: 'denizReturned', log: 'Deniz kommt von MONOLITH zurück' }, reply: '<b>Deniz:</b> Ich hab Brezeln mitgebracht. Und Krals Serverplan.' },
      { label: 'Nein', hint: 'Deniz bleibt bei MONOLITH', fx: { log: 'Deniz bleibt bei MONOLITH' }, reply: '<b>Deniz:</b> Verstehe. War einen Versuch wert.' },
    ],
  },

  // ---------- 2019 ----------
  {
    id: 'silberhochzeit', from: 'Opa Heinz', title: 'Silberhochzeit', when: { date: '2019-03-07', window: 14 },
    text: '„Deine Eltern sind 25 Jahre verheiratet. Sabine wollte immer nach Norwegen, Fjorde gucken. Frank sagt, das ist zu teuer. Frank sagt immer, das ist zu teuer.“',
    choices: [
      { label: 'Eine Norwegen-Reise schenken', cost: memo('silber', (g) => nice(Math.max(4000, rev(g) * 2))), hint: 'Mama +2, Papa +2 · Mama bringt Ideen mit', fx: { rel: { mama: 2, papa: 2 }, flag: 'norwegen', log: 'März 2019: Eltern zur Silberhochzeit nach Norwegen geschickt' }, reply: '<b>Mama</b> (Postkarte): „Wasserfälle, Wasserkraft, kalte Luft. Wär das nicht was für deine Computer?“' },
      { label: 'Ein Fest im Garten organisieren', cost: memo('garten', (g) => nice(Math.max(500, rev(g) * 0.5))), hint: 'Mama +1, Papa +1, Opa +1', fx: { rel: { mama: 1, papa: 1, opa: 1 }, log: 'März 2019: Silberhochzeit im Garten gefeiert' }, reply: '<b>Opa:</b> Ich hab die Lichterkette gelegt. Nur einmal ist die Sicherung geflogen.' },
      { label: 'Karte und Blumen', hint: 'Nichts Besonderes', fx: {}, reply: '<b>Mama:</b> Danke, Schatz. Die Tulpen sind schön.' },
    ],
    fallback: 2,
  },
  {
    id: 'denizhochzeit', from: 'Deniz', title: 'Deniz heiratet', when: { date: '2019-08-05', window: 14 },
    text: '„Ayla hat Ja gesagt! Du bist mein Trauzeuge, keine Widerrede. Die Feier wird klein. Also, für meine Familie klein: 200 Leute.“',
    choices: [
      { label: 'Die Feier bezahlen', cost: memo('hz', (g) => nice(Math.max(5000, rev(g) * 3))), hint: 'Deniz +2', fx: { rel: { deniz: 2 }, log: 'August 2019: Deniz’ Hochzeit bezahlt' }, reply: '<b>Deniz:</b> Meine Mutter will dich adoptieren. Ernsthaft. Sie hat gefragt.' },
      { label: 'Einen Bitcoin schenken', need: (s) => btc(s) >= 1, hint: 'Deniz +2 · ein Bitcoin weniger', fx: { coin: { BTC: -1 }, rel: { deniz: 2 }, log: 'August 2019: Deniz einen Bitcoin zur Hochzeit geschenkt' }, reply: '<b>Deniz:</b> Den verkaufe ich nie. NIE. Na gut, vielleicht bei einer Million.' },
      { label: 'Trauzeuge sein reicht', hint: 'Deniz +1', fx: { rel: { deniz: 1 } }, reply: '<b>Deniz:</b> Deine Rede war furchtbar. Ich hab geheult.' },
    ],
    fallback: 2,
  },
  {
    id: 'quanten', from: 'Opa Heinz', title: 'Opa liest Zeitung', when: { date: '2019-10-15', window: 14 },
    text: '„Hier steht: Ein Quantencomputer hat in drei Minuten gerechnet, wofür andere zehntausend Jahre brauchen. Knackt der jetzt dein Bitcoin? Ist dein Geld weg?“',
    choices: [
      { label: 'Opa alles in Ruhe erklären', hint: 'Opa +1 · Handels-Erfahrung', fx: { rel: { opa: 1 }, xp: { trade: 25 } }, reply: '<b>Opa:</b> Also … noch nicht. Aber irgendwann. Gut, dann schlaf ich heute noch ruhig.' },
      { label: 'Sicherheitshalber ein Zehntel verkaufen', need: (s) => btc(s) > 1e-4, hint: 'Für Opas Nerven', fx: (g) => sellDo('BTC', 0.1, 'Oktober 2019: aus Angst vor Quantencomputern verkauft')(g), reply: '<b>Opa:</b> Sehr vernünftig. Ich hab mein Erspartes auch unter der Matratze.' },
      { label: '„Ach, Opa.“', hint: 'Opa −1', fx: { rel: { opa: -1 } }, reply: '<b>Opa:</b> Lach du nur. Ich hab schon Röhren gelötet, da gab’s noch keine Transistoren.' },
    ],
    fallback: 0,
  },

  // ---------- 2020 ----------
  {
    id: 'corona12', from: 'Deniz', title: 'Schwarzer Donnerstag', when: { date: '2020-03-12', window: 4 },
    text: (s, h, g) => `„Bitcoin fällt an einem Tag um 40 % – <b>${usd(g.price('BTC'))}</b>! Alle verkaufen, die Börsen hängen. Entweder ist das das Ende – oder der Ausverkauf des Jahrzehnts.“`,
    choices: dip('c12', 15, 500, 0.25, 'März 2020'),
    fallback: 2,
  },
  {
    id: 'corona', from: 'Papa', title: 'Der Laden muss zu', when: { date: '2020-03-17', window: 20 },
    text: '„Lockdown. Elektro Brandt muss zumachen, keiner weiß, wie lange. Die Miete läuft weiter.“',
    choices: [
      { label: 'Drei Monatsmieten übernehmen', cost: 4500, hint: 'Papa +2', fx: { rel: { papa: 2 }, log: 'März 2020: drei Ladenmieten übernommen' }, reply: '<b>Papa:</b> Ich zahl dir das zurück. Irgendwann. Danke, Kind.' },
      { label: 'Papa repariert deine Miner', hint: '−10 % Ausfälle dauerhaft · 2.000 $ Lohn pro Monat · Papa +1', fx: { rel: { papa: 1 }, mod: [{ key: 'fail', mult: 0.9 }, { key: 'monthly', mult: 2000 }], flag: 'papaRepairs', log: 'März 2020: Papa repariert jetzt Miner' }, reply: '<b>Papa:</b> Endlich wieder richtige Platinen!' },
      { label: '„Er schafft das schon“', hint: 'Papa −1', fx: { rel: { papa: -1 } }, reply: '<b>Papa:</b> Hm. Ja. Schaff ich.' },
    ],
  },
  halving('halv20', '2020-05-08', '11.05.2020', 6.25 * 2, 6.25, '„Mitten in der Pandemie. Ausgerechnet jetzt“, seufzt Deniz.'),
  {
    id: 'opahaus', from: 'Opa Heinz', title: 'Opa will arbeiten', when: { date: '2020-08-01', window: 30 }, cond: (s) => tier(s) >= 2,
    text: (s) => `„Rente ist langweilig. Ich bin 82 und will was tun. Lass mich Hausmeister in deiner ${fname(top(s))} sein. Ich kenn jedes Kabel.“${has(s, 'fjord') ? ' „Und ja, auch in Norwegen. Ich war 1962 schon mal da. Auf Montage.“' : ''}`,
    choices: [
      { label: 'Opa wird Hausmeister', hint: 'Opa +2 · −15 % Ausfälle · 1.500 $ Lohn im Monat', fx: { rel: { opa: 2 }, mod: [{ key: 'fail', mult: 0.85, src: 'opaHaus' }, { key: 'monthly', mult: 1500, src: 'opaHaus' }], flag: 'opaHaus', log: 'August 2020: Opa wird Hausmeister bei Hashwerk' }, reply: '<b>Opa:</b> Erster Arbeitstag: Ich hab drei lose Klemmen gefunden. DREI.' },
      { label: 'Opa berät beim Stromnetz', hint: 'Opa +1 · Stromausbau überall 15 % günstiger', fx: { rel: { opa: 1 }, mod: [{ key: 'powerCost', mult: 0.85 }], log: 'August 2020: Opa berät Hashwerk beim Stromnetz' }, reply: '<b>Opa:</b> Ich ruf nur ein paar Leute an. Und dann rufen die ein paar Leute an.' },
      { label: 'Du sollst dich ausruhen, Opa', hint: 'Opa −1', fx: { rel: { opa: -1 } }, reply: '<b>Opa:</b> Ausruhen kann ich, wenn ich tot bin.' },
    ],
    fallback: 1,
  },
  {
    id: 'paypal20', from: 'Mama', title: 'Mama will Bitcoin', when: { date: '2020-10-15', window: 14 },
    text: (s, h, g) => `„Mein Bezahldienst bietet bald Bitcoin an. Zwei Klicks! Ich hätte 2.000 $ übrig. Bitcoin steht bei <b>${usd(g.price('BTC'))}</b>. Sollte ich?“`,
    choices: [
      { label: 'Ja, Mama – aber nicht verkaufen!', hint: 'Mama kauft für 2.000 $ · Mama +1', fx: (g) => ({ rel: { mama: 1 }, stat: { mamaBtc: 2000 / g.price('BTC') }, log: 'Oktober 2020: Mama kauft Bitcoin' }), reply: '<b>Mama:</b> Gekauft! Muss ich jetzt jeden Tag nachschauen?' },
      { label: 'Ich schenk dir einen halben Bitcoin', need: (s) => btc(s) >= 0.5, hint: 'Aus deiner Wallet · Mama +2', fx: { coin: { BTC: -0.5 }, rel: { mama: 2 }, stat: { mamaBtc: 0.5 }, log: 'Oktober 2020: Mama einen halben Bitcoin geschenkt' }, reply: '<b>Mama:</b> Ein HALBER? Was ist das in Euro? … Oh. Oh!' },
      { label: 'Lass das lieber', hint: 'Mama bleibt beim Sparbuch', fx: {}, reply: '<b>Mama:</b> Na gut. Das Sparbuch hat mich auch noch nie enttäuscht. Begeistert aber auch nicht.' },
    ],
    fallback: 2,
  },

  // ---------- 2021 ----------
  {
    id: 'autobauer', from: 'Papa', title: 'Papa und das E-Auto', when: { date: '2021-03-07', window: 14 },
    text: (s, h, g) => `„Ein Autobauer hat für Milliarden Bitcoin gekauft, und man kann jetzt Autos mit Bitcoin bezahlen! Unser Lieferwagen ist 22 Jahre alt … Bitcoin steht bei <b>${usd(g.price('BTC'))}</b>.“`,
    choices: [
      { label: 'Papa einen E-Transporter schenken', cost: memo('auto', (g) => nice(Math.max(45000, rev(g) * 0.5))), hint: 'Papa +2 · Hardware dauerhaft 3 % billiger (ihr holt selbst ab)', fx: { rel: { papa: 2 }, mod: [{ key: 'price', mult: 0.97 }], log: 'März 2021: Papa einen E-Transporter geschenkt' }, reply: '<b>Papa:</b> Der fährt ja ganz leise! Ich hab dreimal gehupt, um sicherzugehen, dass er an ist.' },
      { label: 'Ein Viertel der Bitcoin verkaufen', need: (s) => btc(s) > 1e-4, hint: 'Hoher Kurs – mitnehmen', fx: (g) => sellDo('BTC', 0.25, 'März 2021: Bitcoin bei fast 50.000 $ verkauft')(g), reply: '<b>Papa:</b> Gut. Dann fahre ich den alten Bus halt, bis er auseinanderfällt.' },
      { label: 'Der Bus fährt doch noch', hint: 'Nichts tun', fx: {}, reply: '<b>Papa:</b> Stimmt. Meistens.' },
    ],
    fallback: 2,
  },
  {
    id: 'chengdu', from: 'Deniz', title: 'Miner aus Chengdu', when: { date: '2021-06-22', window: 20 }, cond: (s) => !!s.flags.gmbh,
    text: '„China hat Mining verboten. Ein Händler aus Chengdu muss tausende gebrauchte Miner loswerden – 30 % unter Marktpreis. Gebraucht halt. Viel Staub.“',
    choices: [
      { label: 'Zuschlagen', hint: '60 Tage ASICs 30 % billiger · ein Jahr mehr Ausfälle', fx: { mod: [{ key: 'price:asic', mult: 0.7, days: 60 }, { key: 'fail', mult: 1.3, days: 365 }], log: 'Juni 2021: gebrauchte Miner aus Chengdu gekauft' }, reply: '<b>Deniz:</b> Ich bestell Druckluft. Viel Druckluft.' },
      { label: 'Ablehnen', hint: 'Lieber neue Geräte', fx: {}, reply: '<b>Deniz:</b> Auch gut. Der Staub hätte uns eh umgebracht.' },
    ],
  },
  {
    id: 'gpuboom21', from: 'Deniz', title: 'Grafikkarten zum Goldpreis', when: { date: '2021-08-01', window: 14 },
    text: (s, h, g) => `„Grafikkarten kosten das Doppelte von 2020, Gamer weinen auf allen Kanälen.${gpuCount(s) ? ` Für deine ${gpuCount(s)} Karten bekämen wir <b>${usd(rigValue(g))}</b>.` : ''} Und ein Sammler will meine alten Karten von 2011 – das ist meine Sammlung!“`,
    choices: [
      { label: 'Alle GPU-Rigs verkaufen', need: (s) => gpuCount(s) >= 1, hint: 'Voller Zeitwert zum Boom-Preis · dein erster PC bleibt', fx: (g) => { const v = sellRigs(g); return { log: `August 2021: GPU-Rigs für ${usd(v)} verkauft` }; }, reply: '<b>Deniz:</b> Ein Gamer aus Köln hat sich bedankt. Er hat geweint.' },
      { label: 'Deniz’ Sammlung versteigern', hint: (g) => `+${usd(amt(g, 0.5, 2000))} für die Firma · Deniz −1`, fx: (g) => ({ cash: amt(g, 0.5, 2000), rel: { deniz: -1 }, log: 'August 2021: Deniz’ GPU-Sammlung versteigert' }), reply: '<b>Deniz:</b> Meine RHD 5870 … Mach’s gut, Kleine.' },
      { label: 'Alles behalten', hint: 'Die Karten schürfen weiter', fx: {}, reply: '<b>Deniz:</b> Gut. Ich hätte meine Sammlung eh nicht hergegeben.' },
    ],
    fallback: 2,
  },
  {
    id: 'festpreis', from: 'Stadtwerke Lindental', title: 'Festpreis oder Börse?', when: { date: '2021-10-15', window: 14 }, cond: (s) => tier(s) >= 1,
    text: (s, h, g) => `„Die Gaspreise steigen, der Strommarkt wird nervös. Wir bieten Gewerbekunden einen Festpreis für zwei Jahre – etwas über dem heutigen Preis, dafür sicher.${has(s, 'rz') ? ' Ihr Frankfurter Rechenzentrum versorgen wir über unseren Partner gleich mit.' : ''} Bearbeitungsgebühr: <b>${usd(fpFee(g))}</b>.“`,
    choices: [
      { label: 'Festpreis abschließen', cost: (g) => fpFee(g), hint: '2 Jahre: Strom in Lindental und Frankfurt im Schnitt 14 % günstiger, wenn die Preise steigen', fx: { mod: facMods([...LINDENTAL, 'rz'], 'elec', 0.86, 730), flag: 'festpreis', log: 'Oktober 2021: Strom-Festpreis für zwei Jahre' }, reply: '<b>Papa:</b> Ich hab den Vertrag ins Gefrierfach gelegt. Da ist er sicher.' },
      { label: 'Börsenpreis – wird schon nicht so schlimm', hint: 'Risiko: Preissprünge 2022', fx: {}, reply: '<b>Stadtwerke:</b> Wie Sie meinen. Wir haben Sie gewarnt.' },
    ],
    fallback: 1,
  },

  // ---------- 2022 ----------
  {
    id: 'denizpapa', from: 'Deniz', title: 'Deniz wird Vater', when: { date: '2022-03-07', window: 14 },
    text: '„Ayla ist schwanger! Im Juni ist es so weit. Ich will zwei Monate Elternzeit nehmen. Ich weiß, gerade ist viel los …“',
    choices: [
      { label: 'Natürlich – volle zwei Monate', hint: 'Deniz +2 · 60 Tage 20 % mehr Ausfälle', fx: { rel: { deniz: 2 }, mod: [{ key: 'fail', mult: 1.2, days: 60 }], flag: 'denizKind', log: 'März 2022: Deniz geht in Elternzeit' }, reply: '<b>Deniz:</b> Ich schick dir jeden Tag ein Foto. Von ihr, nicht von den Windeln.' },
      { label: 'Elternzeit plus Babyausstattung', cost: memo('baby', (g) => nice(Math.max(3000, rev(g) * 0.3))), hint: 'Deniz +3 · 60 Tage 20 % mehr Ausfälle', fx: { rel: { deniz: 3 }, mod: [{ key: 'fail', mult: 1.2, days: 60 }], flag: 'denizKind', log: 'März 2022: Deniz’ Baby eingekleidet' }, reply: '<b>Deniz:</b> Ein Kinderwagen mit Lüfter?! Du bist irre. Danke.' },
      { label: 'Zwei Wochen müssen reichen', hint: 'Deniz −2', fx: { rel: { deniz: -2 }, log: 'März 2022: Deniz nur zwei Wochen frei gegeben' }, reply: '<b>Deniz:</b> … Okay. Du bist der Chef.' },
    ],
    fallback: 0,
  },
  heat('heat22', '2022-07-17', 8, '„Hitzewelle UND Energiekrise. Die Strompreise sind so hoch wie nie, und draußen hat es 39 Grad.“'),
  {
    id: 'merge22', from: 'Deniz', title: 'Noch sieben Tage Ethereum', when: { date: '2022-09-08', window: 6 },
    text: (s, h, g) => `„Am 15. ist der Merge: Ethereum braucht dann keine Miner mehr. Millionen Grafikkarten suchen neue Arbeit.${gpuCount(s) ? ` Unsere ${gpuCount(s)} Karten sind heute noch ${usd(rigValue(g))} wert – nächste Woche sicher weniger.` : ''} Ein Ether-Miner aus Dresden verkauft übrigens seine Kühltechnik.“`,
    choices: [
      { label: 'Alle GPU-Rigs verkaufen', need: (s) => gpuCount(s) >= 1, hint: 'Voller Zeitwert, solange es geht · dein erster PC bleibt', fx: (g) => { const v = sellRigs(g); return { log: `September 2022: GPU-Rigs vor dem Merge für ${usd(v)} verkauft` }; }, reply: '<b>Deniz:</b> Weg sind sie. Eine Ära endet mit einem Lieferwagen.' },
      { ...earlyStart('kasfs', 'Kaspa', 0.3, 60, 'September 2022: nach dem Merge früh auf Kaspa umgestellt'), reply: '<b>Deniz:</b> Kaspa! Ein Block pro Sekunde. Unsere Karten haben wieder einen Sinn.' },
      { label: 'Kühltechnik aus Dresden kaufen', cost: memo('dresden', (g) => nice(Math.max(2000, rev(g) * 2))), hint: '+10 % Kühlung überall, dauerhaft', fx: { mod: [{ key: 'cool', mult: 1.1 }], log: 'September 2022: Kühltechnik eines Ether-Miners gekauft' }, reply: '<b>Deniz:</b> Lüfter, Rohre, ein Wärmetauscher. Und ein Zettel: „Viel Glück. Wir brauchten es nicht mehr.“' },
      { label: 'Abwarten, umstellen', hint: 'Die Rigs suchen sich andere Coins', fx: {}, reply: '<b>Deniz:</b> Ethereum Classic, Ravencoin, Kaspa. Irgendwas geht immer.' },
    ],
    fallback: 3,
  },
  {
    id: 'fxtstop', from: 'Deniz', title: 'Bei FXT stimmt was nicht', when: { date: '2022-11-06', window: 4 }, cond: (s, h, g) => exUSD(g) > 100,
    text: (s, h, g) => `„FXT, die zweitgrößte Börse der Welt, wackelt: Auszahlungen dauern ewig, Gerüchte sagen, das Kundengeld ist weg. Auf der Börse hast du noch <b>${usd(exUSD(g))}</b>. Wir haben das 2014 schon mal erlebt …“`,
    choices: [
      { label: 'Sofort alles in die Cold-Wallet', hint: 'Über eine andere Börse · 2 % Gebühr · neue Coins landen dort', fx: (g, s) => ({ do: () => { for (const c of Object.keys(s.wallet)) { const w = s.wallet[c]; w.cold += w.ex * 0.98; w.ex = 0; } s.payoutCold = true; }, flag: 'fxtSafe', log: 'November 2022: Coins vor der FXT-Pleite gerettet' }), reply: '<b>Deniz:</b> Drei Tage vor dem Knall. Wir lernen doch dazu.' },
      { label: 'Alles zu 90 % verkaufen', hint: 'Ein Händler nimmt FXT-Guthaben', fx: (g, s) => { let v = 0; for (const c of Object.keys(s.wallet)) { const w = s.wallet[c]; v += w.ex * (g.price(c) || 0) * 0.9; w.ex = 0; } return { cash: v, log: `November 2022: FXT-Guthaben für ${usd(v)} verkauft` }; }, reply: '<b>Deniz:</b> Zehn Prozent Lehrgeld. Besser als hundert.' },
      { label: 'Abwarten', hint: 'FXT ist doch riesig', fx: {}, reply: '<b>Deniz:</b> Hoffentlich hast du recht. Ich hab ein ganz mieses Gefühl.' },
    ],
    fallback: 2,
  },
  {
    id: 'kralbroke', from: 'Viktor Kral', title: 'MONOLITH wankt', when: { date: '2022-12-05', window: 25 }, cond: (s) => !!s.flags.gmbh && !s.flags.soldOut,
    text: '„Brandt. Ich mache es kurz: Wir müssen Container verkaufen. Volle Maschinen, 45 % unter Liste, 30 Tage. Nehmen Sie, oder ich verkaufe an die Kanadier.“',
    choices: [
      { label: 'Krals Container kaufen', hint: '30 Tage ASICs 45 % billiger · MONOLITH ein Jahr schwächer', fx: { mod: [{ key: 'price:asic', mult: 0.55, days: 30 }, { key: 'monolith', mult: 0.8, days: 365 }], log: 'Dezember 2022: Krals Container gekauft' }, reply: '<b>Deniz:</b> Wir kaufen MONOLITH-Maschinen. Ich glaub, ich träum.' },
      { label: 'Er soll an die Kanadier verkaufen', hint: 'MONOLITH ein Jahr etwas schwächer', fx: { mod: [{ key: 'monolith', mult: 0.9, days: 365 }] }, reply: '<b>Kral:</b> Wie Sie wollen.' },
    ],
  },
  {
    id: 'sogn', from: 'Gemeinde Sogn', title: 'Der Gemeinderat von Sogn', when: { from: '2020-06-01', chance: 1, repeat: 30 }, cond: (s) => has(s, 'fjord') && !s.flags.sognDone,
    text: (s) => `„Willkommen in Sogn! Bevor die Fjordhalle über 30 Megawatt wächst, möchte der Gemeinderat wissen: Was passiert mit der Wärme? Wir heizen hier noch mit Öl.“${s.flags.norwegen ? ' Deine Mutter war 2019 übrigens hier – der Bürgermeister erinnert sich an „die Frau mit den vielen Fragen“.' : ''}`,
    choices: [
      { label: (g) => (g.s.techs?.heatsale ? 'Fernwärme fürs Dorf (deine Abwärme-Technik passt)' : 'Fernwärme fürs ganze Dorf bauen'), cost: (g) => (g.s.techs?.heatsale ? 0 : 3000000), hint: 'Ausbau frei · −10 % Strom in der Fjordhalle (Wärmeverkauf) · Opa +1', fx: { mod: [{ key: 'elec', mult: 0.9, fac: 'fjord' }], rel: { opa: 1 }, flag: ['sognDone', 'sognOk'], log: 'Sogn: Fernwärme aus der Fjordhalle' }, reply: '<b>Bürgermeisterin:</b> Das Schwimmbad hat jetzt 28 Grad. Im Februar! Velkommen, Hashwerk.' },
      { label: 'Nur Schule und Schwimmbad heizen', cost: 1500000, hint: 'Ausbau frei · Mama +1', fx: { rel: { mama: 1 }, flag: ['sognDone', 'sognOk'], log: 'Sogn: Schule und Schwimmbad mit Abwärme beheizt' }, reply: '<b>Bürgermeisterin:</b> Ein Anfang. Die Kinder danken es Ihnen.' },
      { label: 'Erst mal bei 30 MW bleiben', hint: 'Stromausbau der Fjordhalle ein Jahr gesperrt', fx: { mod: [{ key: 'powerWait', mult: 0, days: 365, fac: 'fjord' }], flag: 'sognDone', log: 'Sogn: Ausbau der Fjordhalle vorerst gesperrt' }, reply: '<b>Bürgermeisterin:</b> Dann sprechen wir nächstes Jahr wieder.' },
    ],
    fallback: 2,
  },

  // ---------- 2023 ----------
  {
    id: 'strompreisbremse', from: 'Papa', title: 'Die Strompreisbremse', when: { date: '2023-03-07', window: 14 },
    text: '„Der Staat deckelt die Strompreise – rückwirkend ab Januar. Aber nur mit Antrag: Formulare, Nachweise, Verbrauchsprognosen. Für große Verbraucher gibt’s extra Regeln.“',
    choices: [
      { label: 'Steuerberater macht den Antrag', cost: memo('spb', (g) => amt(g, 2, 800)), hint: '10 Monate: −20 % Strom in Lindental und Frankfurt', fx: { mod: facMods([...LINDENTAL, 'rz'], 'elec', 0.8, 300), log: 'März 2023: Strompreisbremse beantragt (Steuerberater)' }, reply: '<b>Steuerberater:</b> Formular 7b, Anlage C. Mein Lieblingsformular.' },
      { label: 'Mit Papa selbst ausfüllen', hint: '10 Monate: −10 % Strom · Papa +1 · Handels-Erfahrung', fx: { mod: facMods([...LINDENTAL, 'rz'], 'elec', 0.9, 300), rel: { papa: 1 }, xp: { trade: 30 }, log: 'März 2023: Strompreisbremse mit Papa beantragt' }, reply: '<b>Papa:</b> Drei Abende, zwei Kannen Kaffee. Die Hälfte haben wir falsch, aber die Hälfte richtig.' },
      { label: 'Kein Papierkram', hint: 'Voller Strompreis', fx: {}, reply: '<b>Papa:</b> Verschenktes Geld. Aber gut, ist deins.' },
    ],
    fallback: 2,
  },
  {
    id: 'mamarente', from: 'Mama', title: 'Mama geht in Rente', when: { date: '2023-08-01', window: 14 },
    text: (s, h, g) => `„Nach 31 Jahren im Kindergarten ist Schluss! Ich will endlich reisen. Oder ein Gewächshaus. Oder beides.“${s.stats.mamaBtc ? ` Ihre Bitcoin von 2020 sind heute ${usd(s.stats.mamaBtc * g.price('BTC'))} wert. „Ist das viel?“` : ''}`,
    choices: [
      { label: 'Gewächshaus mit Abwärme aus dem Keller', cost: memo('gh', (g) => nice(Math.max(3000, rev(g) * 0.3))), hint: 'Mama +2 · Keller dauerhaft 20 % besser gekühlt', fx: { rel: { mama: 2 }, mod: [{ key: 'cool', mult: 1.2, fac: 'keller' }], flag: 'gewaechshaus', log: 'August 2023: Mamas Gewächshaus heizt mit Keller-Abwärme' }, reply: '<b>Mama:</b> Tomaten im Oktober! Die Nachbarn halten mich für eine Hexe.' },
      { label: 'Eine Weltreise schenken', cost: memo('welt', (g) => nice(Math.max(15000, rev(g) * 1))), hint: 'Mama +3', fx: { rel: { mama: 3 }, log: 'August 2023: Mama auf Weltreise geschickt' }, reply: '<b>Mama</b> (Postkarte aus Japan): „Hier gibt es Toiletten mit mehr Knöpfen als deine Computer.“' },
      { label: 'Zur Abschiedsfeier kommen', hint: 'Mama +1', fx: { rel: { mama: 1 } }, reply: '<b>Mama:</b> Die Kinder haben ein Lied gesungen. Ich hab geheult. Du auch, gib’s zu.' },
    ],
    fallback: 2,
  },
  {
    id: 'schule23', from: 'Gymnasium Lindental', title: 'Dein altes Gymnasium', when: { date: '2023-10-15', window: 14 },
    text: '„Lieber ehemaliger Schüler, unsere Informatik-AG möchte verstehen, was Bitcoin-Mining ist. Hätten Sie Zeit für einen Vortrag? Ihr alter Mathelehrer, Herr Behrens, lässt grüßen.“',
    choices: [
      { label: 'Vortrag halten und Rechner spenden', cost: memo('schule', (g) => nice(Math.max(2000, rev(g) * 0.3))), hint: 'Mama +1, Opa +1 · Nachwuchs für später', fx: { rel: { mama: 1, opa: 1 }, xp: { trade: 30 }, flag: 'schule', log: 'Oktober 2023: Vortrag am Gymnasium, Rechner gespendet' }, reply: '<b>Herr Behrens:</b> Sie waren in Mathe eine Katastrophe. Ich bin sehr stolz.' },
      { label: 'Nur den Vortrag halten', hint: 'Mama +1 · Handels-Erfahrung', fx: { rel: { mama: 1 }, xp: { trade: 30 }, log: 'Oktober 2023: Vortrag am Gymnasium' }, reply: '<b>Mama:</b> Die Lehrerin hat mich angerufen. Du warst ein Hit.' },
      { label: 'Keine Zeit', hint: 'Absagen', fx: {}, reply: '<b>Herr Behrens:</b> Schade. Vielleicht nächstes Jahr.' },
    ],
    fallback: 2,
  },

  // ---------- 2024 ----------
  {
    id: 'etf24', from: 'Papa', title: 'Papas Rente', when: { date: '2024-02-05', window: 14 },
    text: (s, h, g) => `„Die Bitcoin-Fonds sind da! Mein Bankberater sagt, ich soll meine private Rente umschichten. Ich bin 67. Ist das verrückt?“${s.stats.papaBtc ? ` „Übrigens: Meine Bitcoin von 2017 sind jetzt ${usd(s.stats.papaBtc * g.price('BTC'))} wert. Hätte ich bloß nicht so gezittert.“` : ''}`,
    choices: [
      { label: 'Ein Viertel in den Fonds, der Rest sicher', hint: 'Papa +1', fx: { rel: { papa: 1 }, flag: 'papaEtf', log: 'Februar 2024: Papa legt ein Viertel seiner Rente in einen Bitcoin-Fonds' }, reply: '<b>Papa:</b> Ein Viertel. Wie bei der Pizza. Damit kann ich leben.' },
      { label: 'Ich zahle dir eine Rente aus der Firma', hint: 'Papa +3 · 2.500 $ im Monat, dauerhaft', fx: { rel: { papa: 3 }, mod: [{ key: 'monthly', mult: 2500 }], flag: 'papaRente', log: 'Februar 2024: Hashwerk zahlt Papa eine Rente' }, reply: '<b>Papa:</b> Mein Kind zahlt mir Rente. Ich weiß nicht, ob ich lachen oder weinen soll. Ich mach beides.' },
      { label: 'Lass die Finger davon', hint: 'Papa −1', fx: { rel: { papa: -1 } }, reply: '<b>Papa:</b> Ausgerechnet du sagst das.' },
    ],
    fallback: 0,
  },
  halving('halv24', '2024-04-17', '20.04.2024', 6.25, 3.125, '„Jetzt zählt nur noch Effizienz“, sagt Deniz.'),
  {
    id: 'aitenant', from: 'Deniz', title: 'Eine KI-Firma klopft an', when: { date: '2024-06-10', window: 45 }, cond: (s) => has(s, 'fjord') || has(s, 'rz'),
    text: (s) => { const f = aiFac(s); return `„NordGPU will Fläche in deiner ${fname(f)} für KI-Server mieten. Fester Preis, egal was Bitcoin macht: 80.000 $ pro Megawatt und Monat.“ Die ${fname(f)} hat gerade <b>${nf(1).format(kw(s, f) / 1000)} MW</b>.`; },
    choices: [
      { label: 'Die Hälfte vermieten', hint: 'Halber Anschluss · feste Miete', fx: (g, s) => { const f = aiFac(s); return { mod: [{ key: 'cap', mult: 0.5, fac: f }, { key: 'monthly', mult: -Math.round(kw(s, f) / 1000 * 0.5 * 80000) }], flag: 'aiTenant', ach: 'ai', log: `Juni 2024: halbe ${fname(f)} an NordGPU vermietet` }; }, reply: '<b>Deniz:</b> Bitcoin und KI unter einem Dach. 2024, Baby.' },
      { label: 'Ein Drittel vermieten', hint: 'Zwei Drittel Anschluss · feste Miete', fx: (g, s) => { const f = aiFac(s); return { mod: [{ key: 'cap', mult: 2 / 3, fac: f }, { key: 'monthly', mult: -Math.round(kw(s, f) / 1000 / 3 * 80000) }], flag: 'aiTenant', ach: 'ai', log: `Juni 2024: ein Drittel der ${fname(f)} an NordGPU vermietet` }; }, reply: '<b>Deniz:</b> Ein Drittel Zukunft, zwei Drittel Bitcoin. Gefällt mir.' },
      { label: 'Ablehnen – wir minen', hint: 'Alles bleibt Bitcoin', fx: { log: 'Juni 2024: NordGPU abgewiesen' }, reply: '<b>Deniz:</b> Ehrlich gesagt bin ich erleichtert.' },
    ],
    fallback: 2,
  },
  {
    id: 'goxrefund', from: 'Deniz', title: 'GoxBank zahlt zurück', when: { date: '2024-07-05', window: 30 }, cond: (s) => (s.stats.lostBtc?.gox || 0) > 0.01,
    text: (s) => `Zehn Jahre nach der Pleite zahlt der GoxBank-Treuhänder aus! Du bekommst einen Teil deiner damals verlorenen <b>${nf(2).format(s.stats.lostBtc.gox)} BTC</b> zurück.`,
    choices: [
      { label: 'Auszahlung in Bitcoin annehmen', hint: (g) => `${nf(2).format(g.s.stats.lostBtc.gox * 0.2)} BTC`, fx: (g, s) => ({ coin: { BTC: s.stats.lostBtc.gox * 0.2 }, log: `Juli 2024: ${nf(2).format(s.stats.lostBtc.gox * 0.2)} BTC von GoxBank zurück` }), reply: '<b>Deniz:</b> Zehn Jahre! Ich hatte das Passwort schon vergessen.' },
      { label: 'Sofort verkaufen und Deniz einladen', hint: 'Bargeld · Deniz +1', fx: (g, s) => ({ cash: s.stats.lostBtc.gox * 0.2 * g.price('BTC') * 0.98, rel: { deniz: 1 }, log: 'Juli 2024: GoxBank-Auszahlung verkauft' }), reply: '<b>Deniz:</b> Steak. Auf GoxBank. Endlich zahlen die mal was.' },
    ],
    fallback: 0,
  },
  {
    id: 'yencrash', from: 'Deniz', title: 'Schwarzer Montag', when: { date: '2024-08-05', window: 5 },
    text: (s, h, g) => `„Die japanische Notenbank hebt die Zinsen, weltweit platzen Hebel-Wetten. Bitcoin fällt an einem Tag auf <b>${usd(g.price('BTC'))}</b>. Gleiche Frage wie 2020: kaufen?“`,
    choices: dip('yen', 15, 2000, 0.2, 'August 2024'),
    fallback: 2,
  },
  {
    id: 'kralki', from: 'Viktor Kral', title: 'KRAL Compute', when: { date: '2024-10-10', window: 30 }, cond: (s) => tier(s) >= 3,
    text: (s, h, g) => { const f = kiFac(s); return `„Brandt. MONOLITH heißt jetzt KRAL Compute. Bitcoin ist Vergangenheit, die Zukunft ist KI – und KI braucht Strom. Ich kaufe Ihnen die halbe Anschlussleistung Ihrer ${fname(f)} ab: <b>${usd(kiOffer(g))}</b>, heute.“`; },
    choices: [
      { label: 'Halben Anschluss verkaufen', hint: 'Sofort viel Geld · halbe Leistung dort, für immer', fx: (g, s) => { const f = kiFac(s), v = kiOffer(g); return { cash: v, mod: [{ key: 'cap', mult: 0.5, fac: f }, { key: 'monolith', mult: 0.9 }], log: `Oktober 2024: halben Anschluss der ${fname(f)} an KRAL Compute verkauft (${usd(v)})` }; }, reply: '<b>Kral:</b> Ein kluger Mann. Meine Leute verlegen die Kabel heute Nacht.' },
      { label: 'Gegenangebot: Wir hosten seine Server', hint: 'Zwei Jahre halbe Leistung, dafür Miete (insgesamt mehr Geld)', fx: (g, s) => { const f = kiFac(s), v = kiOffer(g); return { mod: [{ key: 'cap', mult: 0.5, fac: f, days: 730 }, { key: 'monthly', mult: -Math.round((v * 1.4) / 24), days: 730 }, { key: 'monolith', mult: 0.9 }], log: `Oktober 2024: KRAL-Compute-Server in der ${fname(f)}` }; }, reply: '<b>Kral:</b> Sie verhandeln wie ein Elektriker. Das meine ich als Kompliment.' },
      { label: '„Nicht käuflich, Kral.“', hint: 'Er baut dann eben in Texas · MONOLITH −10 %', fx: { mod: [{ key: 'monolith', mult: 0.9 }], flag: 'kralNo', log: 'Oktober 2024: Krals KI-Angebot abgelehnt' }, reply: '<b>Kral:</b> Das sagten Sie 2014 auch. Ich mag Leute, die sich treu bleiben.' },
    ],
    fallback: 2,
  },

  // ---------- 2025 ----------
  {
    id: 'reserve25', from: 'Opa Heinz', title: 'Eine Reserve für Hashwerk', when: { date: '2025-03-07', window: 14 },
    text: '„Im Radio: Ein ganzer Staat legt eine Bitcoin-Reserve an. Und du? Du verkaufst alles, was du schürfst. Meine Mutter hatte immer Einmachgläser im Keller. Für schlechte Zeiten.“',
    choices: [
      { label: 'Bitcoin für 30 Tagesumsätze kaufen', cost: memo('res', (g) => amt(g, 30, 5000)), hint: 'Hashwerk-Reserve · Opa +1', fx: (g) => ({ ...buy(g, 'BTC', memo('res', () => 0)(g)), rel: { opa: 1 }, log: 'März 2025: Hashwerk-Reserve in Bitcoin angelegt' }), reply: '<b>Opa:</b> Ein Glas für schlechte Zeiten. Brav.' },
      { label: 'Ab jetzt ein Viertel jeder Ausbeute behalten', hint: 'Auto-Verkauf aller Coins höchstens 75 % · Opa +2', fx: (g, s) => ({ do: () => { for (const c of Object.keys(s.autoSell)) s.autoSell[c] = Math.min(s.autoSell[c], 0.75); }, rel: { opa: 2 }, log: 'März 2025: ein Viertel jeder Ausbeute wird gehalten' }), reply: '<b>Opa:</b> Jeden Tag ein bisschen. So hab ich mein Haus bezahlt.' },
      { label: '„Opa, das ist Unternehmensführung.“', hint: 'Opa −1', fx: { rel: { opa: -1 } }, reply: '<b>Opa:</b> Ich hab 40 Jahre einen Betrieb geführt. Aber bitte.' },
    ],
    fallback: 2,
  },
  {
    id: 'ladenzukunft', from: 'Papa', title: 'Elektro Brandt', when: { date: '2025-08-01', window: 14 },
    text: '„Ich bin 68. Der Laden war mein Leben, aber meine Knie wollen nicht mehr. Zweirad Öztürk würde die Räume mieten. Oder … du machst was draus?“',
    choices: [
      { label: 'Hashwerk übernimmt den Laden', cost: memo('laden', (g) => nice(Math.max(20000, rev(g) * 0.3))), hint: 'Papa +2 · Showroom und Reparatur-Café: −10 % Reparaturkosten, Werkstatt +25 % Kühlung', fx: { rel: { papa: 2 }, mod: [{ key: 'repair', mult: 0.9 }, { key: 'cool', mult: 1.25, fac: 'werkstatt' }], flag: 'ladenHashwerk', log: 'August 2025: Hashwerk übernimmt Elektro Brandt' }, reply: '<b>Papa:</b> Das Schild bleibt aber hängen. „Elektro Brandt, seit 1988.“ Darauf bestehe ich.' },
      { label: 'An Zweirad Öztürk vermieten', hint: 'Papa +1 · Papa hat seine Ruhe', fx: { rel: { papa: 1 }, log: 'August 2025: Papas Laden an Zweirad Öztürk vermietet' }, reply: '<b>Papa:</b> Herr Öztürk hat mir ein E-Bike geschenkt. Für die Knie.' },
      { label: 'Laden schließen, Werkstatt vergrößern', hint: 'Werkstatt +50 % Anschluss · Papa −1', fx: { rel: { papa: -1 }, mod: [{ key: 'cap', mult: 1.5, fac: 'werkstatt' }], log: 'August 2025: Laden geschlossen, Werkstatt vergrößert' }, reply: '<b>Papa:</b> Siebenunddreißig Jahre. Na ja. Es ist ja in der Familie.' },
    ],
    fallback: 1,
  },
  {
    id: 'hebel25', from: 'Deniz', title: 'Die Nacht der Liquidationen', when: { date: '2025-10-11', window: 6 },
    text: (s, h, g) => `„Vor fünf Tagen 126.000 $ – heute Nacht wurden Hebel-Wetten über 19 Milliarden zwangsaufgelöst. Bitcoin bei <b>${usd(g.price('BTC'))}</b>. Gut, dass wir nie mit Hebel gespielt haben. Oder … jetzt?“`,
    choices: [
      { label: 'Ohne Hebel nachkaufen', cost: memo('heb', (g) => amt(g, 20, 10000)), hint: 'Für 20 Tagesumsätze Bitcoin kaufen', fx: (g) => ({ ...buy(g, 'BTC', memo('heb', () => 0)(g)), log: 'Oktober 2025: nach dem Hebel-Crash nachgekauft' }), reply: '<b>Deniz:</b> Langweilig und richtig. Unser Stil.' },
      { label: 'Einmal mit dreifachem Hebel', cost: memo('heb3', (g) => amt(g, 5, 5000)), hint: 'Glück: +60 % in einer Woche · Pech: Einsatz weg', fx: (g, s) => { const c = memo('heb3', () => 0)(g), win = Math.random() < 0.55; s.flags.hebelWin = win ? 1 : 0; return { cash: win ? c * 1.6 : 0, log: win ? `Oktober 2025: Hebel-Wette gewonnen (+${usd(c * 0.6)})` : `Oktober 2025: Hebel-Wette verloren (${usd(c)})` }; }, reply: (g) => (g.s.flags.hebelWin ? '<b>Deniz:</b> Plus 60 Prozent! Und jetzt nie wieder. Versprochen?' : '<b>Deniz:</b> Liquidiert. In vier Stunden. Das erzählen wir Opa nicht.') },
      { label: 'Nicht hinschauen', hint: 'Abwarten', fx: {}, reply: '<b>Deniz:</b> Handy weg, Rigs an. Hat sich bewährt.' },
    ],
    fallback: 2,
  },

  // ---------- 2026 ----------
  {
    id: 'tief26', from: 'Deniz', title: 'Der Kater nach dem Gipfel', when: { date: '2026-03-07', window: 14 },
    text: (s, h, g) => `„Bitcoin bei <b>${usd(g.price('BTC'))}</b> – ${nf(0).format(Math.max(0, (1 - g.price('BTC') / 126000) * 100))} % unter dem Hoch vom Oktober. Der Ertrag pro Terahash ist so tief wie nie, kleine Miner schalten ab. Und wir?“`,
    choices: [
      { label: 'Pausierte Geräte verkaufen', hint: (g) => { let n = 0; for (const id of g.s.unlocked) for (const a of g.summary[id]?.per.values() || []) if (a.status === 'idle') n++; return n ? `${n} unrentable Geräte zum Restwert` : 'Gerade ist nichts pausiert'; }, fx: (g) => { const r = sellIdle(g); return { log: `März 2026: ${r.n} unrentable Geräte für ${usd(r.v)} verkauft` }; }, reply: '<b>Deniz:</b> Platz für die nächste Generation. Ein bisschen traurig ist es trotzdem.' },
      { label: 'Strom-Sparpaket für alle Geräte', cost: memo('spar', (g) => amt(g, 3, 5000)), hint: 'Ein Jahr: −8 % Strom überall', fx: { mod: [{ key: 'elec', mult: 0.92, days: 365 }], log: 'März 2026: Strom-Sparpaket' }, reply: '<b>Deniz:</b> Neue Firmware, neue Lüfterkurven. Jede Kilowattstunde zählt.' },
      { label: 'Durchhalten – der nächste Zyklus kommt', hint: 'Nichts ändern', fx: {}, reply: '<b>Deniz:</b> Wir haben 2015 und 2018 überlebt. Das hier auch.' },
    ],
    fallback: 2,
  },
  {
    id: 'sommerfest26', from: 'Mama', title: 'Lindentaler Sommerfest', when: { date: '2026-08-01', window: 14 },
    text: '„Dem Sommerfest fehlt ein Sponsor, die Brauerei ist abgesprungen. Die halbe Stadt fragt, ob ‚die Hashwerk-Leute‘ nicht … Ich hab gesagt, ich frag mal.“',
    choices: [
      { label: 'Hauptsponsor werden', cost: memo('fest', (g) => nice(Math.max(25000, rev(g) * 0.5))), hint: 'Papa, Mama, Opa und Deniz +1', fx: { rel: { papa: 1, mama: 1, opa: 1, deniz: 1 }, log: 'August 2026: Hashwerk sponsert das Sommerfest' }, reply: '<b>Mama:</b> Auf dem Banner steht „Hashwerk – aus Lindental in die Welt“. Opa hat es dreimal fotografiert.' },
      { label: 'Eine Hüpfburg und Freibier', cost: memo('hupf', (g) => nice(Math.max(5000, rev(g) * 0.1))), hint: 'Papa +1, Deniz +1', fx: { rel: { papa: 1, deniz: 1 }, log: 'August 2026: Hüpfburg und Freibier fürs Sommerfest' }, reply: '<b>Deniz:</b> Die Hüpfburg sieht aus wie ein Miner. Meine Tochter will nie wieder runter.' },
      { label: 'Dieses Jahr nicht', hint: 'Mama −1', fx: { rel: { mama: -1 } }, reply: '<b>Mama:</b> Dann frag ich die Sparkasse. Die sagen bestimmt auch nein.' },
    ],
    fallback: 2,
  },
  {
    id: 'denizopen', from: 'Deniz', title: 'Open Source?', when: { date: '2026-10-10', window: 14 },
    text: (s, h, g) => `„Unsere Firmware ist die beste der Branche. Ich will sie veröffentlichen – für alle kleinen Miner, die so anfangen wie wir im Kinderzimmer. KRAL Compute würde dafür allerdings <b>${usd(osOffer(g))}</b> zahlen.“${s.flags.schule ? ' „Zwei aus deiner Schul-AG von damals arbeiten übrigens schon mit dran.“' : ''}`,
    choices: [
      { label: 'Open Source für alle', hint: 'Deniz +2 · die Community findet Fehler: −10 % Ausfälle', fx: { rel: { deniz: 2 }, mod: [{ key: 'fail', mult: 0.9 }], flag: 'openSource', log: 'Oktober 2026: Hashwerk-Firmware als Open Source veröffentlicht' }, reply: '<b>Deniz:</b> 4.000 Sterne am ersten Tag. Ein Junge aus Chile hat sich bedankt. Mit Foto vom Kinderzimmer.' },
      { label: 'An KRAL Compute verkaufen', hint: (g) => `+${usd(osOffer(g))} · Deniz −2 · MONOLITH +5 %`, fx: (g) => ({ cash: osOffer(g), rel: { deniz: -2 }, mod: [{ key: 'monolith', mult: 1.05 }], log: `Oktober 2026: Firmware an KRAL Compute verkauft (${usd(osOffer(g))})` }), reply: '<b>Deniz:</b> Okay. Es ist dein Laden. Ich geh eine Runde spazieren.' },
      { label: 'Bleibt unser Geheimnis', hint: 'Dauerhaft +2 % Ertrag', fx: { mod: [{ key: 'rev', mult: 1.02 }], log: 'Oktober 2026: Firmware bleibt Betriebsgeheimnis' }, reply: '<b>Deniz:</b> Auch gut. Dann sind wir halt weiter die Besten. Heimlich.' },
    ],
    fallback: 2,
  },

  // ---------- Endlosmodus (ab Ende 2026) ----------
  halving('halv28', '2028-04-08', '15.04.2028', 3.125, 1.5625, '„Das erste Halving, das keiner vorhersagen kann“, sagt Deniz.'),
  {
    id: 'e_markt', from: 'Deniz', title: 'Der Markt spielt verrückt', when: { from: '2026-12-01', chance: 0.35, repeat: 90 },
    cond: (s, h, g) => Math.abs(priceChange(g, 30)) > 0.2,
    text: (s, h, g) => { const ch = priceChange(g, 30); return `„Bitcoin ${ch > 0 ? 'steigt' : 'fällt'} in einem Monat um <b>${nf(0).format(Math.abs(ch) * 100)} %</b> auf ${usd(g.price('BTC'))}. Keiner weiß, warum. ${ch > 0 ? 'Mitnehmen?' : 'Nachkaufen?'}“`; },
    choices: [
      { label: (g) => (priceChange(g, 30) > 0 ? 'Ein Viertel verkaufen' : 'Nachkaufen'), cost: (g) => (priceChange(g, 30) > 0 ? 0 : memo('em', (x) => amt(x, 15, 5000))(g)), need: (s, h, g) => priceChange(g, 30) < 0 || btc(s) > 1e-4, hint: (g) => (priceChange(g, 30) > 0 ? 'Gewinne sichern' : 'Für 15 Tagesumsätze Bitcoin kaufen'), fx: (g) => (priceChange(g, 30) > 0 ? sellDo('BTC', 0.25, 'Kurssprung: ein Viertel verkauft')(g) : { ...buy(g, 'BTC', memo('em', () => 0)(g)), log: 'Kursrutsch: nachgekauft' }), reply: '<b>Deniz:</b> Gemacht. Jetzt nicht mehr hinschauen.' },
      { label: 'Ruhig bleiben', hint: 'Abwarten', fx: {}, reply: '<b>Deniz:</b> Wir sind Miner. Wir schürfen. Punkt.' },
    ],
    fallback: 1,
  },
  {
    id: 'e_hitze', from: 'Deniz', title: 'Hitzesommer', when: { from: '2027-01-01', chance: 0.2, repeat: 365 },
    cond: (s) => month(s) >= 5 && month(s) <= 7,
    text: (s, h, g) => { const f = hottest(g); return `„Schon wieder ein Rekordsommer. Die Außenluft ist so warm, dass alle Kühlungen schwächeln – zwei Wochen lang.“ Deine ${fname(f)} hat <b>${nf(0).format(g.summary[f]?.temp || 30)} °C</b>.`; },
    choices: heatChoices(0.8),
    fallback: 2,
  },
  {
    id: 'e_strom', from: 'Stadtwerke Lindental', title: 'Unruhe an der Strombörse', when: { from: '2027-01-01', chance: 0.1, repeat: 365 },
    text: '„Die Großhandelspreise steigen. Für die nächsten sechs Monate rechnen wir mit 20 % teurerem Strom – es sei denn, Sie sichern sich jetzt einen Festpreis.“',
    choices: [
      { label: 'Festpreis sichern', cost: memo('es', (g) => nice(Math.max(2000, elecDay(g, g.s.unlocked) * 15))), hint: '180 Tage: Strom 2 % günstiger statt 20 % teurer', fx: { mod: [{ key: 'elec', mult: 0.98, days: 180 }], log: 'Strombörse: Festpreis gesichert' }, reply: '<b>Papa:</b> Festpreis. Das Wort mag ich.' },
      { label: 'Abschaltvertrag: bei Preisspitzen vom Netz', hint: '180 Tage: Strom +5 %, Hashrate −7 %', fx: { mod: [{ key: 'elec', mult: 1.05, days: 180 }, { key: 'hash', mult: 0.93, days: 180 }], log: 'Strombörse: Abschaltvertrag' }, reply: '<b>Deniz:</b> Wenn der Strom teuer ist, schlafen die Miner. Wie Katzen.' },
      { label: 'Den höheren Preis zahlen', hint: '180 Tage: Strom +20 %', fx: { mod: [{ key: 'elec', mult: 1.2, days: 180 }], log: 'Strombörse: höhere Preise geschluckt' }, reply: '<b>Stadtwerke:</b> Wir schicken die neue Abschlagszahlung.' },
    ],
    fallback: 2,
  },
];
export const EVENT = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

// ---------- Rechnungen einzelner Ereignisse ----------
function opaFac(s) { for (const id of ['werkstatt', 'keller', 'kinder']) if (has(s, id) && FACILITY[id].power[s.fac[id].power + 1]) return id; return null; }
function opaCost(s) { const id = opaFac(s); return id ? Math.round(FACILITY[id].power[s.fac[id].power + 1].cost * 0.6) : 0; }
function svFee(g) { return nice(Math.max(300, elecDay(g, LINDENTAL) * 25)); }
function fpFee(g) { return nice(Math.max(500, elecDay(g, [...LINDENTAL, 'rz']) * 20)); }
// Netzbetreiber: neuester Standort ab der Halle (nicht Fjord), der schon zu 70 % ausgelastet ist und noch ausbauen kann
function netzFac(s, g) {
  for (const id of ['rz', 'halle']) {
    if (!has(s, id) || s.flags['netz_' + id] || !FACILITY[id].power[s.fac[id].power + 1]) continue;
    const sm = g.summary?.[id]; if (sm && sm.watt / 1000 > sm.capKw * 0.7) return id;
  }
  return null;
}
function hostFee(g) { const id = top(g.s), cap = g.summary?.[id]?.capKw || kw(g.s, id); return nice(cap * 0.2 * 24 * 30.4 * 0.06); }
function icoCost(g) { return nice(Math.min(400000, Math.max(25000, g.netWorthFast() * 0.08))); }
const icoRaise = memo('icoRaise', (g) => nice(Math.min(30e6, icoCost(g) * 1.5 + Math.max(0, g.netWorthFast()) * 0.25)));
function aiFac(s) { return has(s, 'fjord') ? 'fjord' : 'rz'; }
function kiFac(s) { return has(s, 'rz') ? 'rz' : 'halle'; }
const kiOffer = memo('kiOffer', (g) => { const f = kiFac(g.s); return nice(kw(g.s, f) * 0.5 * 8760 * 0.08 * 1.5); });
const osOffer = memo('osOffer', (g) => nice(Math.max(2e6, Math.max(0, g.netWorthFast()) * 0.03)));
