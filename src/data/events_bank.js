// Bankgespräch: öffnet Game.dispoDay, sobald das Konto den Dispo-Rahmen überschreitet (Format wie events.js).
// chain: true – kommt nie nach Kalender, nur über Game.openEvent. Wird in game.js an EVENTS/EVENT angehängt.
import { usd } from './events.js';

export const BANK_EVENTS = [
  {
    id: 'bank', chain: true, from: 'Lindentaler Bank', title: 'Bankgespräch', expire: 7, fallback: 1,
    text: (s, h, g) => `Herr Albers von der Lindentaler Bank bittet zum Gespräch. Dein Konto steht bei <b>${usd(s.cash)}</b>, `
      + `der Dispo-Rahmen liegt bei <b>${usd(g.dispoLimit())}</b>. „So geht das nicht weiter, Herr Brandt. Was schlagen Sie vor?“`,
    choices: [
      {
        label: 'Coins aus der Cold-Wallet verkaufen',
        hint: (g) => { const v = g.coldValue(); return v > 0 ? `Bis das Konto wieder im Plus ist · in der Cold-Wallet liegen ${usd(v)}` : 'Die Cold-Wallet ist leer'; },
        need: (s, h, g) => g.coldValue() > 1,
        fx: (g) => ({ do: () => g.bankColdSale(), log: 'Bankgespräch: Cold-Wallet angezapft' }),
        reply: '<b>Herr Albers:</b> Sehen Sie, geht doch. Wer so viel auf der hohen Kante hat, braucht keinen Dispo.',
      },
      {
        label: 'Notverkauf: älteste Geräte abgeben',
        hint: (g) => { const v = g.bankSalePreview(); return v > 0 ? `Bringt etwa ${usd(v)} · die Wohnung bleibt` : 'Es gibt nichts mehr zu verkaufen'; },
        need: (s, h, g) => g.bankSalePreview() > 0,
        fx: (g) => { const t = g.bankAuto(); return { log: `Bankgespräch: ${t}`, autoText: t }; },
        reply: '<b>Herr Albers:</b> Schade um die Maschinen. Aber so bleibt das Konto sauber.',
      },
      {
        label: 'Sparprogramm: einmotten, Personal entlassen',
        hint: (g) => { const n = g.s.staff?.list?.length || 0, m = g.s.unlocked.filter((id) => g.canMothball(id) && !g.s.fac[id].mothball).length; return g.savingPossible() ? `${m} Standort(e) einmotten, ${n} Leute entlassen, laufende Zusagen streichen` : 'Es gibt nichts mehr zu sparen'; },
        need: (s, h, g) => g.savingPossible(),
        fx: (g) => ({ do: () => g.bankSaving(), log: 'Bankgespräch: Sparprogramm' }),
        reply: '<b>Herr Albers:</b> Harte Schnitte. Aber die Zahlen werden es Ihnen danken.',
      },
      {
        label: 'Umschuldung: Kredit zu 13 %',
        hint: (g) => (g.reschedOk() ? `Das Minus wird zum Bankkredit (${usd(Math.max(0, -g.s.cash) + 1000)}), teurer als der normale Kredit` : 'Die Bank will erst mehr Sicherheiten sehen'),
        need: (s, h, g) => g.reschedOk(),
        fx: (g) => ({ do: () => g.bankReschedule(), log: 'Bankgespräch: Umschuldung zu 13 %' }),
        reply: '<b>Herr Albers:</b> Unterschreiben Sie hier. Und hier. Und hier.',
      },
      {
        label: 'Opa Heinz um Hilfe bitten',
        hint: 'Einmalig 5.000 $ – Opa fragt nicht nach',
        need: (s) => !s.flags.opaBank,
        fx: { cash: 5000, flag: 'opaBank', rel: { opa: 1 }, log: 'Bankgespräch: Opa Heinz hilft mit 5.000 $' },
        reply: '<b>Opa Heinz:</b> Hier, 5.000. Zurückzahlen kannst du, wenn du Millionär bist. Mit Zinsen!',
      },
      {
        label: 'Insolvenz anmelden',
        hint: 'Nur wenn nichts anderes mehr geht: Schulden weg, Kasse leer, Mieten ruhen',
        need: (s, h, g) => g.insolvencyOk(),
        fx: (g) => ({ do: () => g.bankInsolvency(), rel: { papa: -1 }, log: 'Bankgespräch: Insolvenz und Neuanfang' }),
        reply: '<b>Papa:</b> Ich kenn das. Man steht wieder auf. Komm, wir fangen klein an.',
      },
      {
        label: 'Um Aufschub bitten',
        hint: 'Die Bank meldet sich in zwei Wochen wieder · Zinsen laufen weiter',
        fx: { log: 'Bankgespräch: Aufschub erbeten' },
        reply: '<b>Herr Albers:</b> Zwei Wochen. Dann reden wir noch einmal.',
      },
    ],
  },
];
