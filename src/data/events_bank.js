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
        need: (s, h, g) => g.bankSalePreview() > 0,
        fx: (g) => ({ do: () => { if (!g.bankFireSale()) g.bankSaving(); }, log: 'Bankgespräch: Notverkauf alter Geräte' }),
        reply: '<b>Herr Albers:</b> Schade um die Maschinen. Aber so bleibt das Konto sauber.',
      },
      {
        label: 'Sparprogramm: einmotten und Personal entlassen',
        hint: (g) => { const n = g.s.staff?.list?.length || 0, m = g.s.unlocked.filter((id) => g.canMothball(id) && !g.s.fac[id].mothball).length; return n || m ? `${m} Standort(e) einmotten, ${n} Leute entlassen` : 'Es gibt nichts mehr zu sparen'; },
        need: (s, h, g) => (s.staff?.list?.length || 0) + s.unlocked.filter((id) => g.canMothball(id) && !s.fac[id].mothball).length > 0,
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
    ],
  },
];
