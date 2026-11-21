// Neben-Quest „Papa will selbst minen“ und der freiwillige Umzug ins Zimmer über dem Laden (Logik: src/sim/papa.js, Welt: src/world/papa.js)
//
// Papas Miner steht auf seiner Werkbank in der Werkstatt. Schritte (s.papa.st):
//   psu   – „Mein Ding piept“: das Netzteil ist zu schwach. Am Gerät (E) das passende wählen, Papa zahlt es.
//   wait1 – läuft. Nach PAPA.wait1 Tagen wird er zu heiß.
//   heat  – Lüfter verstaubt: am Gerät (E) Staub raus, neuen Lüfter festschrauben (Mini-Spiel „luefter“).
//   wait2 – läuft. Beim nächsten echten Kurssturz (BTC in 7 Tagen um PAPA.drop gefallen) will Papa verkaufen.
//   panic – hingehen und mit Papa reden: halten oder verkaufen. Kommt man nicht, verkauft er nach PAPA.panicDays allein.
//   wait3 – abwarten, wie es mit dem echten Kurs ausgeht.
//   proud – „Komm mal vorbei“: mit Papa reden, Abschluss (Papa +1, Punkte, Geld). Danach done.
// Belohnungen nur Punkte (Game.givePoints), Geld und Teile – keine Fähigkeitsknoten, keine Prozent-Boni.
//
// Umzug (s.home): ab der Werkstatt bietet Papa das Zimmer über dem Laden an (Ereignis „umzug“, ein zweites Mal „umzug2“).
//   Ja: die Wohnung ist gekündigt (Miete bis zum Monatsende), Papas Lieferwagen bringt alles aus der Wohnung als Kisten
//   in die Werkstatt (Bestand s.unpacked, Zustand der Geräte bleibt), geschlafen wird auf dem Feldbett in Papas Ecke.
//   Nein: alles bleibt, wie es ist. Der Keller bleibt in beiden Fällen bei Herrn Krause gemietet.
import { usd } from './events.js';
import { FACILITY } from './world.js';

export const PAPA = {
  start: 7, // Tage nach der Werkstatt, bis Papa sich meldet
  rig: { mobo: 'h55', cpu: 'q66', psu: 'psu400', gpus: ['rhd5870', 'rhd5870'] }, // Restteile aus dem Laden: 535 W an 400 W
  wait1: 12, // bis er heiß läuft
  wait2: 20, drop: 0.25, wait2b: 360, drop2: 0.12, wait2c: 540, drop3: 0.05, // Kurssturz: erst ab 25 %, nach einem Jahr ab 12 %, danach ab 5 %
  panicDays: 14, // so lange wartet Papa auf dich
  holdUp: 1.25, holdMin: 21, holdMax: 240, sellDays: 45, // Ausgang abwarten: gehalten, bis der Kurs wieder über dem vor dem Sturz steht (frühestens 21, höchstens 240 Tage), verkauft 45 Tage
  pts: { psu: 1, best: 1, heat: 1, decide: 1, done: 2 }, // Punkte je Schritt (best: das kleinste Netzteil, das reicht)
  gift: ['psu850', 'psu650'], // nach dem Lüfter: ein Netzteil aus dem Laden fürs Lager
  cash: 150, // zum Abschluss: Papas erste Ausschüttung
};

// Papas Ecke in der Werkstatt nach dem Umzug: Feldbett, Schreibtisch mit Monitor (Raum: rooms.js, Platzsuche: Game.freeSpot)
export const HOME_RECTS = [{ x0: 0, z0: 4.9, x1: 0.95, z1: 7.0 }, { x0: 1.3, z0: 6.7, x1: 3.0, z1: 8.0 }];
export const HOME = { delay: 3, again: 150 }; // Angebot: 3 Tage nach der Werkstatt, das zweite 150 Tage nach dem ersten Nein

const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export const monthOf = (day) => { const d = new Date(day * 864e5); return `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

export const PAPA_TXT = {
  start: ['Kannst du mal gucken? Mein Ding piept.', 'Hab mir aus Restteilen einen Miner gebaut. Steht auf meiner Werkbank.'],
  psuBest: 'Er läuft! Und piept nicht mehr. Wie hast du das so schnell gesehen?',
  psuBig: 'Läuft. So ein dickes Netzteil für das bisschen? Na gut, das hält ewig.',
  psuWeak: (need) => `Piept noch – braucht ${need} W`,
  heat: ['Jetzt piept er nicht mehr. Jetzt glüht er.', 'Nach zehn Minuten geht er aus. Riecht nach Toast.'],
  heatDone: 'Er brummt nur noch. Wie ein Kühlschrank. Schön.',
  gift: (name) => `Nimm das ${name} mit. Lag hinten im Laden rum.`,
  crash: (pc) => [`Hast du den Kurs gesehen? Minus ${pc} % in einer Woche!`, 'Ich will alles verkaufen. Komm bitte vorbei.'],
  panic: (pc) => `Minus ${pc} %. Ich schlaf schon nicht mehr. Soll ich verkaufen?`,
  hold: 'Halten, Papa. Das kommt wieder.',
  sell: 'Verkauf ruhig. Sicher ist sicher.',
  holdReply: 'Na gut. Ich guck einfach nicht mehr hin.',
  sellReply: 'Puh. Jetzt kann ich wieder schlafen.',
  auto: 'Hab verkauft. Ich konnte nicht mehr hingucken.',
  holdUp: 'Gut, dass ich nicht verkauft hab. Jetzt ist er mehr wert als vor dem Absturz!',
  holdDown: 'Der Kurs ist immer noch unten. Ich halte trotzdem. Du hast gesagt, das kommt wieder.',
  sellLow: 'Gut, dass ich verkauft hab. Der ist danach noch weiter gefallen.',
  sellHigh: 'Hätte ich mal gehalten. Na ja. Gelernt ist gelernt.',
  come: 'Komm mal vorbei. Ich will dir was zeigen.',
  proud: 'Mein Miner hat jetzt einen Ehrenplatz. Das Schild hab ich selbst gemalt. Ohne dich würde der immer noch piepen.',
};

// Umzug: Angebot als Ereignis von Papa (kommt nur über Game.papaDay, nie nach Kalender)
const yes = {
  label: 'Ja, ich zieh um',
  hint: (g) => { const n = g.s.fac.kinder?.objects?.length || 0; return `Wohnung kündigen: −${usd(FACILITY.kinder.rent)} Miete ab ${monthOf(g.stockNext(g.s.day))}${n ? ` · Papas Lieferwagen bringt ${n === 1 ? 'ein Gerät als Kiste' : `${n} Geräte als Kisten`}` : ''}`; },
  fx: (g) => ({ do: () => g.moveHome(), log: 'Umzug ins Zimmer über dem Laden' }),
  reply: '<b>Papa:</b> Ich hol den Lieferwagen.',
};
export const HOME_EVENTS = [
  {
    id: 'umzug', chain: true, from: 'Papa', title: 'Zimmer über dem Laden', expire: 14,
    text: '„Das Zimmer über dem Laden steht leer. Willst du? Kostet dich nichts. Bis ich es ausgeräumt hab, steht dir ein Feldbett in der Werkstatt.“',
    choices: [yes, { label: 'Nein, ich bleib in der Wohnung', hint: 'Alles bleibt, wie es ist', fx: (g) => ({ do: () => g.homeDecline(), log: 'Zimmer über dem Laden abgelehnt' }), reply: '<b>Papa:</b> Okay. Das Angebot steht.' }],
    fallback: 1,
  },
  {
    id: 'umzug2', chain: true, from: 'Papa', title: 'Zimmer über dem Laden', expire: 14,
    text: '„Das Zimmer über dem Laden ist immer noch frei. Letzte Chance, dann stellt Opa da seine Eisenbahn auf.“',
    choices: [yes, { label: 'Nein, ich bleib in der Wohnung', hint: 'Das Angebot kommt nicht wieder', fx: (g) => ({ do: () => g.homeDecline(), log: 'Zimmer über dem Laden endgültig abgelehnt' }), reply: '<b>Papa:</b> Dann kriegt Opa das Zimmer. Der freut sich.' }],
    fallback: 1,
  },
];

export const HOME_TXT = {
  papa: 'Die Kisten stehen am Rolltor. Das Feldbett hinten links.',
  krause: 'Kündigung ist angekommen. Schade. Den Keller können Sie behalten, 50 $ wie gehabt.',
  krauseNoKeller: 'Kündigung ist angekommen. Schade. Den Schlüssel bitte in den Briefkasten.',
  mama: 'Endlich raus aus dem feuchten Loch! Ich bring dir eine richtige Bettdecke vorbei.',
};
