// Finale: Krals Anruf, Chronik, Familien-Epilog (je Person 3 Varianten nach s.rel), „Was wäre wenn“, Abspann.
// end = 'won' (MONOLITH überholt) | 'sold' (an Kral verkauft)
import { toDay } from './history.js';

const yearOf = (day) => new Date(day * 864e5).getUTCFullYear();
const nf = (d) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: d });
const usd = (v) => (v >= 1e9 ? `${nf(2).format(v / 1e9)} Mrd. $` : v >= 1e6 ? `${nf(1).format(v / 1e6)} Mio. $` : `${nf(0).format(v)} $`);
const SITE_IN = { fjord: 'in der Fjordhalle', rz: 'im Rechenzentrum', halle: 'in der Lagerhalle', werkstatt: 'in der Werkstatt', keller: 'im Hobbykeller', kinder: 'in deiner alten Bude' };
const lastSite = (s) => s.unlocked[s.unlocked.length - 1];
export const playerAge = (day) => 19 + Math.floor((day - toDay('2010-10-01')) / 365.25); // Oktober 2010: 19 Jahre, gerade in die erste Wohnung gezogen

// ---------- Krals Anruf ----------
export function kralCall(s, end) {
  const f = s.flags, fin = s.fin || {}, L = [];
  if (end === 'sold') {
    L.push('Willkommen bei MONOLITH, Brandt. Sie haben das Richtige getan. Fast alle tun irgendwann das Richtige.');
    if (f.kralTorn) L.push('Meine Visitenkarte haben Sie damals zerrissen. Diesen Vertrag nicht. Ich rahme ihn ein.');
    if (f.denizLeft && !f.denizReturned) L.push('Deniz sitzt übrigens zwei Büros weiter. Er hat Ihnen einen Kuchen gebacken. Er ist schief.');
    L.push('Ihre Halle bekommt ein neues Schild. Schwarz, mit silberner Schrift. Sie werden es hassen.');
    return L;
  }
  L.push('Glückwunsch, Brandt. Ich hätte Sie 2014 kaufen sollen.');
  if (f.kralTorn) L.push('Sie haben damals meine Visitenkarte zerrissen, vor meinen Augen. Ich habe die Schnipsel aufgehoben. Sie liegen in meiner Schreibtischschublade – als Mahnung.');
  else if (f.kralKept) L.push('Sie haben meine Karte damals eingesteckt. Ich habe zwei Jahre auf Ihren Anruf gewartet. Er kam nie. Das war klug.');
  else L.push('Wir sind uns nie richtig begegnet. Ich kannte nur Ihre Hashrate. Sie wurde jedes Quartal größer.');
  if (f.contractTorn) L.push('Sie haben meinen Kaufvertrag unterschrieben – und dann zerrissen. Das hat mir in dreißig Jahren keiner angetan.');
  else if (f.offerDeclined) L.push(`${fin.offerUsd ? usd(fin.offerUsd) : 'Ein Vermögen'} habe ich Ihnen geboten. Mein Vorstand fand das zu viel. Heute lacht keiner mehr darüber.`);
  if (f.denizReturned) L.push('Grüßen Sie Deniz. Er hat meinen Serverplan mitgenommen, als er zu Ihnen zurückging. Ich weiß es. Er weiß, dass ich es weiß.');
  else if (f.denizLeft) L.push('Und Deniz … er ist der beste Ingenieur, den ich habe. Er redet bis heute von Ihrer Werkstatt. Vielleicht sollten Sie ihn mal anrufen.');
  else if (f.denizPartner) L.push('Ihr Freund Deniz war nie zu kaufen. Ich habe es versucht. „Teilhaber“, hat er gesagt. Teilhaber einer Werkstatt!');
  L.push('Genießen Sie es. Platz eins ist der kälteste Ort der Welt. Das sagt Ihnen einer, der es weiß.');
  return L;
}
export const KRAL_REPLIES = [
  { label: 'Danke, Herr Kral.', react: () => 'Kral schweigt einen Moment. „Bitte.“ Dann ist die Leitung tot.' },
  { label: 'Einfach auflegen', react: (s) => (s.flags.denizLeft && !s.flags.denizReturned ? 'Du legst auf. In der Halle ist es sehr still. Irgendwo piept ein Container.' : 'Du legst auf. Deniz, der heimlich mitgehört hat, klatscht langsam Beifall.') },
];

// ---------- Chronik ----------
// Gewicht je Eintrag (höher = wichtiger). Ereignisse können selbst `weight` tragen; sonst gilt diese Tabelle, unbekannte zählen 3.
const WEIGHT = { juni11: 8, goxhack: 7, kralcard: 9, poach: 9, denizback: 9, corona: 7, repaircafe: 6, friseur: 7, fork17: 4, chengdu: 5, kralbroke: 8, aitenant: 7, goxrefund: 6, pizza: 2, noise: 2, storm: 1, offer: 10, sold: 11, torn: 10, won: 11 };
const MILESTONES = [['h' + 1e12, '1 TH/s – die ASIC-Ära beginnt', 4], ['n' + 1e6, 'Die erste Million', 6], ['h' + 1e15, '1 PH/s Hashrate', 4], ['h' + 1e18, '1 EH/s Hashrate', 5], ['cold', 'Börsenpleite überstanden – dank Cold-Wallet', 6], ['n' + 1e9, 'Milliardär', 7]]; // Schlüssel wie Game.checkMilestones
export function chronicle(s, events, max = 10) {
  const out = [{ d: toDay('2010-10-01'), t: 'Ein leeres PC-Gehäuse in der feuchten Bude im Hinterhaus. Deniz schreibt von Bitcoin.', w: 12 }];
  if (s.feat?.map > 1) out.push({ d: s.feat.map, t: 'Umzug in den Hobbyraum im Keller', w: 5 });
  for (const [k, t, w] of MILESTONES) if (s.milestones?.[k]) out.push({ d: s.milestones[k], t, w });
  const seen = new Set();
  for (const e of s.ev?.log || []) {
    const base = String(e.id).split(':')[0];
    if (base === 'pizza' && seen.has('pizza')) continue; seen.add(base);
    const w = events?.[e.id]?.weight ?? WEIGHT[e.id] ?? (base === 'eg' ? 5 : 3);
    out.push({ d: e.d, t: e.t, w });
  }
  return out.map((x, i) => ({ ...x, i })).sort((a, b) => b.w - a.w || a.d - b.d).slice(0, max).sort((a, b) => a.d - b.d || a.i - b.i);
}

// ---------- Familien-Epilog ----------
export const relTier = (r) => (r >= 3 ? 2 : r >= 1 ? 1 : 0);
export const REL_LABEL = ['kühl', 'gut', 'eng'];
export function epilog(s, end, day = s.day) {
  const f = s.flags, r = s.rel || {}, sold = end === 'sold';
  const lost = !!f.shopLost && !f.shopBack, L = s.papaLoan || {}; // lost: alte Spielstände (frühere Bankfrist), L: Papas Umzugsdarlehen
  const loanT = L.total > 0 ? (L.done ? ' Das zurückgezahlte Umzugsgeld liegt immer noch in seiner Keksdose. „Für schlechte Zeiten.“' : L.left > 0 ? ' Das Umzugsgeld von damals erwähnt er nie. Mama schon.' : '') : '';
  const papa = [
    `Papa hat den Laden irgendwann zugemacht. Ihr telefoniert an Geburtstagen, und er fragt nie nach Hashwerk. Aber in seiner Schublade liegt jeder Zeitungsartikel über dich, ausgeschnitten und gefaltet.${L.left > 0 ? loanT : ''}`,
    lost ? `Einen Laden hat Papa nie wieder aufgemacht. In der Werkstatt hinterm alten Schaufenster repariert er Radios und erzählt jedem, dass sein Kind „was mit Computern“ macht. Seit ein paar Jahren sagt er es mit Stolz.${loanT}`
      : `Elektro Brandt gibt es noch. Papa repariert Radios und erzählt jedem Kunden, dass sein Kind „was mit Computern“ macht. Seit ein paar Jahren sagt er es mit Stolz.${f.papaRepairs ? ' Und wenn keiner hinschaut, repariert er Miner.' : ''}${loanT}`,
    lost ? `Papa hat keinen Laden mehr und vermisst ihn kein bisschen, sagt er. Über seiner Werkbank hängt eingerahmt der erste Zeitungsartikel über dich – gleich neben dem alten Ladenschild.${loanT}`
      : `Papa hat Elektro Brandt behalten – aus Spaß, sagt er. Über der Kasse hängt eingerahmt der erste Zeitungsartikel über dich.${f.repaircafe ? ' Samstags ist das Reparatur-Café so voll, dass die Leute auf dem Gehweg löten.' : ' Jeder Kunde bekommt die Geschichte zu hören, ob er will oder nicht.'}${loanT}`,
  ];
  const mama = [
    'Mama wäscht deine Wäsche nicht mehr. Den Schimmelfleck in deiner ersten Bude hat sie nie vergessen – und du kommst zu selten zum Essen.',
    'Mama ruft immer noch jeden Sonntag an und fragt, ob du genug lüftest. In deiner ersten Wohnung hat sie damals heimlich einen Luftentfeuchter versteckt. Er steht immer noch da.',
    'Mama hat aus der Abwärme ein Gewächshaus gemacht. Ihre Tomaten gewinnen jedes Jahr beim Lindentaler Gartenfest. „Bitcoin-Tomaten“ steht auf dem Schild, und keiner traut sich zu fragen.',
  ];
  const age = yearOf(day) - 1938;
  const opa = [
    'Opa grummelt, dass früher alles mit Kupfer und Verstand ging. Zu seinem Geburtstag kommst du trotzdem – mit einer Flasche Korn und einem schlechten Gewissen.',
    `Opa baut in seiner Garage Sicherungskästen, die keiner bestellt hat. Einer davon hängt ${SITE_IN[lastSite(s)] || 'bei dir'}. Er hält.`,
    `Opa (${age}) hält Vorträge in der Berufsschule: „Strom ist kein Spielzeug. Außer bei meinem Enkel.“ Den Starkstromanschluss im Keller zeigt er jedem, der stehen bleibt.`,
  ];
  const away = f.denizLeft && !f.denizReturned;
  const deniz = sold ? [
    'Deniz hat kein Wort gesagt, als du unterschrieben hast. Er arbeitet jetzt bei einer Firma in Berlin. Ihr schreibt euch zu Weihnachten.',
    'Deniz hat seinen Anteil in einen Hackerspace im alten Lindentaler Kino gesteckt. Kinder löten dort samstags ihre ersten Platinen.',
    'Deniz hat seinen Anteil in einen Hackerspace im alten Lindentaler Kino gesteckt. Du schaust jeden Samstag vorbei, und ihr baut Milchkisten-Rigs mit den Kindern – nur zum Spaß.',
  ] : away ? [
    'Deniz arbeitet immer noch für Kral. Manchmal schreibt er nachts: „Weißt du noch, die Milchkiste?“ Du antwortest jedes Mal.',
    'Deniz arbeitet immer noch für Kral. Freitags zockt ihr online wie früher und redet nie über die Arbeit.',
    'Deniz arbeitet immer noch für Kral – offiziell. Inoffiziell schickt er dir jeden Montag einen Tipp und unterschreibt mit „Milchkiste“.',
  ] : [
    'Deniz hat sich zurückgezogen und baut Retro-Konsolen. Ihr seht euch selten. Zu Weihnachten schickt er dir eine leere Diskette. Ihr wisst beide, was sie bedeutet.',
    'Deniz leitet die Technik und schläft mit dem Laptop auf dem Bauch. Freitags zockt ihr wie früher – er gewinnt immer noch.',
    `Deniz ist ${f.denizPartner ? 'Teilhaber, CTO' : 'CTO'} und dein Trauzeuge. Er trägt Kapuzenpullis zu Vorstandssitzungen und hat seinen alten Gameboy immer in der Jackentasche.`,
  ];
  return [
    { who: 'papa', name: 'Papa', full: 'Frank Brandt', text: papa[relTier(r.papa || 0)], tier: relTier(r.papa || 0) },
    { who: 'mama', name: 'Mama', full: 'Sabine Brandt', text: mama[relTier(r.mama || 0)], tier: relTier(r.mama || 0) },
    { who: 'opa', name: 'Opa Heinz', full: 'Heinz Brandt', text: opa[relTier(r.opa || 0)], tier: relTier(r.opa || 0) },
    { who: 'deniz', name: 'Deniz', full: 'Deniz', text: deniz[relTier(r.deniz || 0)], tier: relTier(r.deniz || 0) },
  ];
}
export function soldLead(s, usdVal, day = s.day) {
  return `Du unterschreibst in Zug. MONOLITH übernimmt die Hashwerk GmbH mit allen Standorten und Maschinen, und Viktor Kral bekommt seinen Rekord. Du bist ${playerAge(day)} und musst nie wieder arbeiten.`;
}

// ---------- Was wäre wenn ----------
// g: Game (für Kurse). Liefert [{big, text}] – das Wichtigste zuerst.
export function whatIf(g) {
  const s = g.s, p = g.price('BTC'), out = [];
  const mined = s.stats.coins?.BTC || 0, held = (s.wallet.BTC?.ex || 0) + (s.wallet.BTC?.cold || 0);
  const lost = (s.stats.lostBtc?.gox || 0) + (s.stats.lostBtc?.fxt || 0);
  const soldBtc = Math.max(0, mined - held - (s.stats.pizzaBTC || 0) - lost);
  if (soldBtc * p > 1000) out.push({ v: soldBtc * p, big: usd(soldBtc * p), text: `Du hast ${nf(2).format(mined)} BTC geschürft und rund ${nf(2).format(soldBtc)} davon verkauft. Hättest du keinen einzigen hergegeben, lägen heute ${usd(soldBtc * p)} mehr auf dem Konto.` });
  if (s.stats.btcWinter > 0.01) { const then = s.stats.btcWinter * g.price('BTC', toDay('2011-03-31')); out.push({ v: s.stats.btcWinter * p, big: usd(s.stats.btcWinter * p), text: `Die ${nf(2).format(s.stats.btcWinter)} BTC aus deinem ersten Winter waren im März 2011 ${usd(then)} wert. Heute: ${usd(s.stats.btcWinter * p)}.` }); }
  if (s.stats.pizzaBTC > 0) out.push({ v: s.stats.pizzaBTC * p, big: usd(s.stats.pizzaBTC * p), text: `Deine Pizza-Bitcoin (${nf(4).format(s.stats.pizzaBTC)} BTC) wären heute ${usd(s.stats.pizzaBTC * p)} wert. Sie waren lecker.` });
  if (lost > 0.01) out.push({ v: lost * p, big: usd(lost * p), text: `Bei Börsenpleiten hast du ${nf(2).format(lost)} BTC verloren – heute ${usd(lost * p)}. Not your keys, not your coins.` });
  if (!out.length) out.push({ v: 0, big: usd(held * p), text: `Du hältst ${nf(2).format(held)} BTC. Wer weiß, was die in zehn Jahren wert sind?` });
  return out.sort((a, b) => b.v - a.v);
}

// ---------- Abspann ----------
export const CREDITS = [
  ['Spielidee & Umsetzung', 'HASHWERK – ein Fan-Projekt'],
  ['3D-Grafik', 'three.js'],
  ['Bitcoin-Kurse und Hashrate', 'Coin Metrics Community Data (CC BY-NC 4.0)'],
  ['Besetzung', 'Frank Brandt · Sabine Brandt · Heinz Brandt · Deniz · Viktor Kral'],
  ['In der Hauptrolle', 'Du'],
  ['Hinweis', 'Alle Namen, Firmen, Börsen und Geräte sind frei erfunden. Ähnlichkeiten mit echten Personen wären Zufall. Keine Anlageberatung.'],
];
