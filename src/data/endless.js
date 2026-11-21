// Endlosmodus: Zukunfts-Hardware nach dem Ende der echten Daten und Endlosziele nach dem Sieg über MONOLITH.
//
// Zukunfts-Hardware: etwa alle FUTURE.every Tage erscheint eine neue Miner-Generation (Game.futureStep).
//   Effizienz: J/TH des besten bestehenden SHA-256-Miners × FUTURE.effStep^Generation, nie unter FUTURE.effMin.
//   Geräte werden in s.futureHW gespeichert und beim Laden in PLACEABLE/PLACEABLES eingetragen (Typ-ID 'fut1', 'fut2' …).
//   Modelle: look 'hydro' | 'asic' | 'whirl' (bestehende Modelle aus models.js). Hydro nur in Rack/Container.
//
// Endlosziele (ENDLESS_GOALS, geordnet): { id, text(s, g, st), sub?, ready?(s, g, st), check?(s, g, st) | tick?(s, g, st),
//   progress?(s, g, st) => [cur, tgt, kind('hash'|'usd'|'watt'|'count'|'days'|'btc'|'wait')], action?: {label, cost}, fx? (wie Ereignisse, beim Bezahlen),
//   start?: {from, text} | (s) => {from, text} (Handy-Nachricht, sobald das Ziel dran ist), done: {from?, text} (Nachricht beim Erreichen), card?: 'stiftung'|'kral' }
//   st = s.egoals.st[id] – eigener Fortschritt des Ziels (wird gespeichert).
import { toDay, HALVINGS } from './history.js';

// Preis: roiDays Tage Reinertrag bei refElec $/kWh (Hashpreis beim Erscheinen), zwischen minPerTH und usdPerTH (Stand S23) je TH/s
export const FUTURE = { every: 300, jitter: 35, effStep: 0.88, effMin: 5, hashStep: { hydro: 1.15, air: 1.12 }, maxW: { hydro: 12000, air: 6000 }, usdPerTH: { hydro: 20.7, air: 23.6 }, minPerTH: 4, roiDays: 500, refElec: 0.05 };

// Namen und Bauform je Generation (danach geht es nach Schema weiter)
const NAMED = [
  ['Swarm S25 Hydro', 'hydro'], ['Whirl M70S', 'whirl'], ['Swarm S25 XP', 'asic'], ['Whirl M70S Hydro', 'hydro'],
  ['Swarm S27', 'asic'], ['Swarm S27 Hydro', 'hydro'], ['Whirl M80S', 'whirl'], ['Swarm S29 Hydro', 'hydro'],
  ['Swarm S29 XP', 'asic'], ['Whirl M90S Hydro', 'hydro'], ['Swarm S31', 'asic'], ['Swarm S31 Hydro', 'hydro'],
];
export function futureModel(n) { // n = 0, 1, 2 …
  if (n < NAMED.length) { const [name, look] = NAMED[n]; return { name, look, hydro: look === 'hydro' }; }
  const k = n - NAMED.length, gen = 33 + 2 * Math.floor(k / 2), hydro = k % 2 === 1;
  return { name: hydro ? `Swarm S${gen} Hydro` : (k % 4 === 0 ? `Whirl M${100 + 10 * Math.floor(k / 4)}S` : `Swarm S${gen}`), look: hydro ? 'hydro' : k % 4 === 0 ? 'whirl' : 'asic', hydro };
}

// Halvings nach 2032 im Vier-Jahres-Takt weiterdenken
export function nextHalving(day) {
  const list = [...HALVINGS]; while (list[list.length - 1] < day + 4000) list.push(list[list.length - 1] + 1456);
  return list.find((d) => d >= day);
}
const yearOf = (day) => new Date(day * 864e5).getUTCFullYear();

// KRAL Compute: Viktor Krals KI-Firma nach dem Ende von MONOLITH. Tagesumsatz in $.
export const kralComputeRev = (day) => 320000 * Math.pow(1.04, Math.max(0, day - toDay('2027-01-01')) / 365);
// Umsatz pro Tag: Mining + KI-Miete (feste Einnahmen aus Ereignissen)
export const dayRevenue = (g) => { let r = g.dailyProfit().rev; for (const m of g.s.mods || []) if (m.key === 'monthly' && m.mult < 0 && g.s.day < m.until) r += -m.mult / 30.4; return r; };

// Tagesbilanz je Standort (Ertrag − Strom − Miete); Personal zählt nicht mit
export function siteNet(g, id) {
  const sm = g.summary?.[id]; if (!sm) return 0;
  const rent = g.siteRent(id) / 30.4;
  if (sm.tripped) return -rent;
  return sm.rev * sm.throttle - Math.max(0, sm.watt / 1000 * 24 - g.solarKwh(id)) * sm.elec - rent;
}
const rentSites = (g) => g.s.unlocked.filter((id) => g.siteRent(id) > 0);

export const ENDLESS_GOALS = [
  {
    id: 'halving',
    text: (s, g, st) => `Übersteh das Halving ${yearOf(st.h || nextHalving(Math.max(s.day, toDay('2028-01-01'))))} im Plus`,
    sub: (s, g, st) => (s.day < st.h ? `Am ${new Date(st.h * 864e5).toLocaleDateString('de-DE', { timeZone: 'UTC' })} halbiert sich die Blockbelohnung. Danach 30 Tage am Stück im Plus.` : '30 Tage am Stück im Plus nach dem Halving'),
    ready: (s, g, st) => { st.h ||= nextHalving(Math.max(s.day, toDay('2028-01-01'))); return s.day >= st.h - 150; },
    tick: (s, g, st) => {
      st.h ||= nextHalving(Math.max(s.day, toDay('2028-01-01')));
      if (s.day < st.h) return false;
      st.n = g.dailyProfit().net > 0 ? (st.n || 0) + 1 : 0;
      if (st.n >= 30) return true;
      if (s.day > st.h + 365) { st.h = nextHalving(s.day + 1); st.n = 0; st.miss = (st.miss || 0) + 1; } // verpasst: nächstes Halving
      return false;
    },
    progress: (s, g, st) => (s.day < st.h ? [st.h - s.day, 0, 'wait'] : [st.n || 0, 30, 'days']),
    start: { from: 'Opa Heinz', text: 'In ein paar Monaten halbiert sich wieder die Belohnung. Wie 2012, nur mit mehr Nullen. Alte Kisten raus, sparsame rein, Junge.' },
    done: { from: 'Opa Heinz', text: 'Halving überstanden, und kein Tag im Minus. Ich hab’s dem ganzen Stammtisch erzählt.' },
  },
  {
    id: 'eh10', text: 'Schaff 10 EH/s',
    check: (s, g) => g.algoHash('sha256') >= 1e19, progress: (s, g) => [g.algoHash('sha256'), 1e19, 'hash'],
    done: { from: 'Deniz', text: '10 Exahash. Weißt du noch, wie wir uns über 100 Megahash gefreut haben? Das ist hundert Milliarden Mal so viel.' },
  },
  {
    id: 'allplus', text: 'Alle Standorte gleichzeitig im Plus',
    sub: (s, g) => `Jeder Standort mit Miete verdient mehr, als Strom und Miete kosten (${rentSites(g).map((id) => ({ werkstatt: 'Werkstatt', halle: 'Halle', rz: 'RZ', fjord: 'Fjord' })[id] || id).join(', ')}) · Tipp: Solar aufs Dach, sparsamste Miner`,
    ready: (s, g) => rentSites(g).length >= 2,
    check: (s, g) => { const r = rentSites(g); return r.length >= 2 && r.every((id) => siteNet(g, id) > 0); },
    progress: (s, g) => { const r = rentSites(g); return [r.filter((id) => siteNet(g, id) > 0).length, r.length, 'count']; },
    done: { from: 'Papa', text: 'Jeder Standort schreibt schwarze Zahlen. Das hab ich mit einem einzigen Laden in 25 Jahren nicht geschafft.' },
  },
  {
    id: 'mw120', text: 'Fahr die Fjordhalle mit 120 MW unter Volllast', sub: () => 'Ausbau auf 120 MW, dann über 90 % Last',
    ready: (s) => s.unlocked.includes('fjord'),
    check: (s, g) => { const sm = g.summary?.fjord; return !!sm && s.fac.fjord.power >= 2 && !sm.tripped && sm.watt >= 0.9 * sm.capKw * 1000; },
    progress: (s, g) => { const sm = g.summary?.fjord; return [sm?.watt || 0, 0.9 * (s.fac.fjord.power >= 2 && sm ? sm.capKw : 120000) * 1000, 'watt']; },
    done: { from: 'Opa Heinz', text: '120 Megawatt. Ich hab 1974 ein ganzes Dorf mit zwei Megawatt versorgt und dachte, das wäre viel.' },
  },
  {
    id: 'kraftwerk', text: 'Kauf das Wasserkraftwerk in Sogn', sub: () => 'Eigener Strom: Der Strompreis in der Fjordhalle sinkt für immer um 45 %',
    ready: (s) => s.unlocked.includes('fjord'),
    action: { label: 'Kraftwerk kaufen · 120 Mio. $', cost: 120e6 }, fx: { mod: [{ key: 'elec', mult: 0.55, fac: 'fjord', src: 'kraftwerk' }] },
    done: { from: 'Opa Heinz', text: 'Ein eigenes Kraftwerk. Junge, ich hab früher Sicherungen für 16 Ampere verkauft. Ich fahr nächste Woche hin und guck mir die Turbinen an.' },
  },
  {
    id: 'stiftung', text: 'Gründe die Lindental-Stiftung', sub: () => 'Lehrwerkstatt, Reparatur-Cafés, Gewächshäuser – für die Stadt, in der alles anfing',
    action: { label: '50 Mio. $ stiften', cost: 50e6 }, card: 'stiftung',
  },
  {
    id: 'campus', text: 'Bau den Hashwerk-Campus in Lindental', sub: () => 'Eigene Chip-Entwicklung mit Deniz: alle Miner brauchen 6 % weniger Strom',
    action: { label: 'Campus bauen · 80 Mio. $', cost: 80e6 }, fx: { mod: [{ key: 'asicPower', mult: 0.94, src: 'campus' }] },
    done: { from: 'Deniz', text: 'Unser eigener Chip, entworfen in Lindental. Ich hab ihn „Milchkiste“ getauft. Keine Widerrede.' },
  },
  {
    id: 'cold1000', text: 'Leg 1.000 BTC in die Cold-Wallet', sub: () => 'Behalten statt verkaufen – oder an der Börse nachkaufen',
    check: (s) => s.wallet.BTC.cold >= 1000, progress: (s) => [s.wallet.BTC.cold, 1000, 'btc'],
    done: { from: 'Mama', text: 'Tausend Bitcoin. Bitte sag mir, dass die nicht in einem Schuhkarton liegen.' },
  },
  {
    id: 'bn1', text: 'Werde Milliardär',
    check: (s, g) => g.netWorth() >= 1e9, progress: (s, g) => [g.netWorth(), 1e9, 'usd'],
    done: { from: 'Viktor Kral', text: 'Eine Milliarde. Willkommen im Club, Brandt. Er ist kleiner und kälter, als Sie denken.' },
  },
  {
    id: 'kral', text: 'Überhol KRAL Compute', sub: (s, g) => `Krals KI-Firma macht ${Math.round(kralComputeRev(s.day) / 1000).toLocaleString('de-DE')} Tsd. $ Umsatz am Tag. Mining und KI-Miete zählen.`,
    ready: (s) => !!s.egoals.done.stiftung, // das letzte Ziel – erst nach der Stiftung
    check: (s, g) => dayRevenue(g) > kralComputeRev(s.day), progress: (s, g) => [dayRevenue(g), kralComputeRev(s.day), 'usd'],
    start: (s) => ({ from: 'Viktor Kral', text: s.ev?.done?.kralki ? 'Brandt. KRAL Compute verdient mit KI inzwischen mehr am Tag als Sie mit Bitcoin. Wetten, dass das so bleibt?' : 'MONOLITH heißt jetzt KRAL Compute. Bitcoin war gestern, Brandt – wir rechnen jetzt für KI. Rufen Sie an, wenn Sie wieder zweiter sein wollen.' }),
    card: 'kral',
  },
];
export const EGOAL = Object.fromEntries(ENDLESS_GOALS.map((x) => [x.id, x]));

// Endlos-Nachrichten für den Ticker (fiktiv), etwa alle 40–80 Tage eine, ohne Wiederholung bis die Liste durch ist
export const ENDLESS_NEWS = [
  'Netzbetreiber zahlen Minern Prämien fürs Abschalten bei Lastspitzen',
  'EU-Parlament diskutiert Abwärmepflicht für Rechenzentren',
  'Norwegen senkt die Netzentgelte für Industriekunden',
  'Erster Supermarkt in Lindental nimmt Bitcoin an der Kasse',
  'Chiphersteller melden Engpass bei 2-nm-Wafern: Miner-Lieferzeiten steigen',
  'Pensionsfonds kauft Bitcoin – Analysten streiten über Risiko',
  'Studie: Bitcoin-Mining nutzt inzwischen zu 70 % erneuerbare Energie',
  'Solarspitzen im Sommer: Miner schalten mittags ab und verdienen trotzdem',
  'Zentralbank testet den digitalen Euro in drei Städten',
  'Kleine Börse „Pelikan Exchange“ schließt nach Hack – Kunden warten auf ihr Geld',
  'Heizungsbauer bietet Wärmepumpe mit eingebautem Miner an',
  'Lindentaler Gymnasium startet AG „Strom & Code“',
  'Gebrauchte Miner fluten die Kleinanzeigen – Kilopreise wie Altmetall',
  'Satellitenfirma will Bitcoin-Blöcke aus dem All verteilen',
  'Kältewelle in Skandinavien: Wasserkraftwerke laufen auf Hochtouren',
  'Gericht: Abwärme aus Mining darf als Fernwärme verkauft werden',
  'MONOLITH Hash AG kündigt eine KI-Sparte an',
  'Handyspiele zahlen Belohnungen in Satoshi aus',
  'Island verbietet neue Mining-Farmen – der Strom geht an Aluminiumhütten',
  'Hafen von Rotterdam testet Container-Miner an der Kaimauer',
];
