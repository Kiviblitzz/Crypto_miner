// Bankgespräch: öffnet Game.dispoDay, sobald das Konto den Dispo-Rahmen überschreitet (Format wie events.js).
// chain: true – kommt nie nach Kalender, nur über Game.openEvent. Wird in game.js an EVENTS/EVENT angehängt.
import { usd } from './events.js';

export const BANK_EVENTS = [
  {
    id: 'bank', chain: true, from: 'Lindentaler Bank', title: 'Bankgespräch', expire: 7, fallback: 0,
    text: (s, h, g) => `Herr Albers von der Lindentaler Bank bittet zum Gespräch. Dein Konto steht bei <b>${usd(s.cash)}</b>, `
      + `der Dispo-Rahmen liegt bei <b>${usd(g.dispoLimit())}</b>. „So geht das nicht weiter, Herr Brandt. Was schlagen Sie vor?"`,
    choices: [
      {
        label: 'Notverkauf: älteste Geräte abgeben',
        hint: (g) => { const v = g.bankSalePreview(); return v > 0 ? `Bringt etwa ${usd(v)} · das Kinderzimmer bleibt` : 'Es gibt nichts mehr zu verkaufen'; },
        fx: (g) => ({ do: () => g.bankFireSale(), log: 'Bankgespräch: Notverkauf alter Geräte' }),
        reply: '<b>Herr Albers:</b> Schade um die Maschinen. Aber so bleibt das Konto sauber.',
      },
      {
        label: 'Umschuldung: Kredit zu 13 %',
        hint: (g) => `Das Minus wird zum Bankkredit (${usd(Math.max(0, -g.s.cash) + 1000)}), teurer als der normale Kredit`,
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
    ],
  },
];
