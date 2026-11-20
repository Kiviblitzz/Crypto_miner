// Monatsabrechnung, Mahnungen und Papas Umzugsdarlehen: Texte und das Ereignis „mahnung“ (Logik in Game: issueBill, billsDay, payBills, repayPapa)
//
// Ablauf: Miete und Strom je Standort (dazu Gehälter, Ausbauten und laufende Verträge) sammeln sich über den Monat in s.bills.acc und werden
// am 1. als Monatsabrechnung abgebucht (s.bills.hist). Reicht das Konto nicht – ab Kapitel 3 auch nicht mit dem Dispo der Bank –,
// bleibt die Rechnung offen (s.bills.open) und es wird gemahnt, jede Stufe mit BILL_GRACE Tagen Frist:
//   0 Zahlungserinnerung → 1 zweite Mahnung (+ Gebühr) → 2 letzte Mahnung (+ Gebühr, Sperre angedroht)
//   → 3 Sperre: an den Standorten mit offenen Posten ist der Strom abgestellt (f.cut), bis alles bezahlt ist (+ Wiederanschluss).
// Bezahlt wird automatisch, sobald das Konto reicht. Im Ereignis per Knopf: Coins verkaufen, Papa fragen (Kapitel 1–3, kommt aufs Darlehen),
// mit der Bank reden (ab Kapitel 3, dort Notverkauf, Umschuldung, Opa, Insolvenz) – oder später zahlen.
// Das Ereignis wird an EVENTS/EVENT angehängt (game.js), kommt nie nach Kalender (chain), nur über Game.billsDay.
import { usd } from './events.js';
import { FACILITY } from './world.js';

export const BILL_GRACE = 7; // Tage Frist je Mahnstufe
export const BILL_STAGE = ['Zahlungserinnerung', '2. Mahnung', 'Letzte Mahnung', 'Strom gesperrt'];
const MONTH = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export const monthName = (m) => { const [y, mm] = String(m).split('-'); return `${MONTH[(+mm || 1) - 1]} ${y}`; }; // '2010-10' → „Oktober 2010“
export const dd = (day) => new Date(day * 864e5).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

// Wer will das Geld? Vermieter je Standort und der Stromversorger
export const LANDLORD = { kinder: 'Herr Krause', keller: 'Herr Krause', werkstatt: 'Papa', halle: 'die Hausverwaltung', rz: 'der RZ-Betreiber', fjord: 'die Gemeinde Sogn' };
export const SUPPLIER = (id) => (id === 'fjord' ? 'das Wasserkraftwerk' : id === 'rz' ? 'der Stromversorger' : 'die Stadtwerke Lindental');
const list = (a) => (a.length <= 1 ? a[0] || '' : `${a.slice(0, -1).join(', ')} und ${a[a.length - 1]}`);
const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
// „in der Wohnung“, „im Keller“ …
const IN = { kinder: 'in der Wohnung', keller: 'im Keller', werkstatt: 'in der Werkstatt', halle: 'in der Halle', rz: 'im Rechenzentrum', fjord: 'in der Fjordhalle' };
export const siteIn = (ids) => list(ids.map((id) => IN[id] || FACILITY[id]?.short || id));

// Papas erste Nachricht: das Startgeld ist sein Umzugsdarlehen (ohne Frist, ohne Zinsen)
export const PAPA_LOAN_MSG = (amt) => `Willkommen in der eigenen Bude, Kind! Ich hab dir ${usd(amt)} überwiesen – für die ersten Monate: Miete, Strom und was man so braucht. Die Kaution hab ich übernommen, die ist mein Einzugsgeschenk. Den Rest zahlst du zurück, wenn du kannst. Keine Eile, keine Zinsen. Papa`;
export const PAPA_THANKS = ['Eine Rate? Kind, das hätte es nicht gebraucht. Aber es freut mich. Mama sagt, ich grinse.', 'Schon wieder was zurück? Ich leg das alles in die Dose für schlechte Zeiten. Für deine, nicht für meine.', 'Danke, Kind. Ich hab’s Mama gezeigt. Sie hat gesagt: „Siehste.“'];
export const PAPA_DONE = 'Alles zurück, auf den Cent. Ich hab’s dreimal nachgerechnet. Weißt du, was? Ich bin stolz auf dich. Nicht wegen des Geldes. Weil du Wort hältst.';
export const PAPA_HELP = ['Herr Krause hat bei uns angerufen. Ich hab’s ausgelegt und schreib’s zum Umzugsgeld. Kein Drama, Kind – aber das muss sich tragen.', 'Schon wieder? Ich leg’s aus, klar. Aber setz dich mal hin und rechne, was dich der Monat kostet. Bitte.'];

// Text der Mahnung zur aktuellen Stufe
export function billText(s, g) {
  const o = s.bills?.open; if (!o) return 'Alles bezahlt. Herr Krause winkt dir im Treppenhaus zu.';
  const who = (o.who || []).length ? list(o.who) : 'deine Gläubiger', sum = usd(o.amt + o.fee), months = list((o.months || []).map(monthName)), where = siteIn(o.sites || []);
  let t;
  if (o.stage === 0) t = `Die Monatsabrechnung für ${months} ist nicht gedeckt: <b>${sum}</b> sind offen. ${cap(who)} ${(o.who || []).length > 1 ? 'bitten' : 'bittet'} um Zahlung bis zum <b>${dd(o.due)}</b>.`;
  else if (o.stage === 1) t = `Zweite Mahnung von ${who}: <b>${sum}</b> offen, darin ${usd(o.fee)} Mahngebühr. Neue Frist: <b>${dd(o.due)}</b>.`;
  else if (o.stage === 2) t = `Letzte Mahnung: <b>${sum}</b> offen. Kommt bis zum <b>${dd(o.due)}</b> nichts, wird ${where} der Strom abgestellt.`;
  else t = `${cap(where)} ist der Strom abgestellt, bis die <b>${sum}</b> bezahlt sind – dort steht alles still.`;
  const ex = g.coinFunds();
  return `${t} Auf deinem Konto: <b>${usd(s.cash)}</b>.${ex >= 1 ? ` Deine Coins sind ${usd(ex)} wert – verkaufen hilft.` : ' Verkauf Teile oder Geräte, die du nicht brauchst – oder frag Papa.'}`;
}

export const BILL_EVENTS = [
  {
    id: 'mahnung', chain: true, from: 'Briefkasten', expire: 7, weight: 3,
    title: (s) => BILL_STAGE[Math.min(3, s.bills?.open?.stage || 0)],
    text: (s, h, g) => billText(s, g),
    choices: [
      {
        label: 'Coins verkaufen und alles bezahlen',
        hint: (g) => `Verkauft nur so viel wie nötig, erst von der Börse, dann aus der Cold-Wallet · ${usd(g.owed())}`,
        need: (s, h, g) => g.billCoinOk(), needText: 'Dafür reichen deine Coins nicht',
        fx: (g) => ({ do: () => g.payBills(true), log: 'Offene Rechnung mit Coins bezahlt' }),
        reply: (g) => `<b>${cap(g.s.bills?.lastWho || 'Herr Krause')}:</b> Na also, geht doch. Danke!`,
      },
      {
        label: 'Papa um Hilfe bitten',
        hint: (g) => `Papa legt ${usd(g.owed())} aus – kommt aufs Umzugsdarlehen${(g.s.papaLoan?.help || 0) > 0 ? ' · Papa −1' : ''}`,
        need: (s, h, g) => g.papaHelpOk(), needText: (g) => g.papaHelpWhy(),
        fx: (g) => ({ do: () => g.papaHelp(), log: 'Papa hat eine offene Rechnung ausgelegt' }),
        reply: (g) => `<b>Papa:</b> ${PAPA_HELP[Math.min(PAPA_HELP.length - 1, Math.max(0, (g.s.papaLoan?.help || 1) - 1))]}`,
      },
      {
        label: 'Mit der Bank reden',
        hint: 'Herr Albers sucht mit dir einen Weg: Notverkauf, Umschuldung, Sparprogramm …',
        need: (s, h, g) => g.has('loan') && s.chapter >= 2, needText: 'Einem 19-Jährigen ohne Firma leiht die Bank noch nichts',
        fx: (g) => ({ do: () => g.bankTalk(), log: 'Wegen offener Rechnungen bei der Bank' }),
      },
      {
        label: 'Später zahlen',
        hint: (g) => { const o = g.s.bills?.open; if (!o) return ''; return o.stage >= 3 ? 'Der Strom bleibt aus, bis alles bezahlt ist' : `Frist bis ${dd(o.due)} – danach ${o.stage >= 2 ? 'wird der Strom abgestellt' : 'kommt die nächste Mahnung mit Gebühr'}. Sobald das Konto reicht, wird automatisch bezahlt.`; },
        fx: {},
      },
    ],
    fallback: 3,
  },
];
