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
// fx (siehe Game.applyFx): cash, coin {BTC: n}, sellFrac {BTC: 0.5}, rel {papa: 1}, mod [{key, mult, days?, fac?}],
//   flag, ach, xp {hw: n}, next [{id, inDays}], msg {from, text}, stat {k: n}, log, toast, do(g, s)
// mod-Schlüssel: hash, cool, cap, elec, rent, fail, rev, price, price:asic, price:gpu, monolith, monthly (Fixkosten/Monat, negativ = Einnahme)
import { FACILITY } from './world.js';

const nf = (d) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: d, minimumFractionDigits: 0 });
export const usd = (v) => { const a = Math.abs(v), s = v < 0 ? '−' : ''; if (a >= 1e6) return `${s}${nf(2).format(a / 1e6)} Mio. $`; if (a >= 100) return `${s}${nf(0).format(a)} $`; return `${s}${nf(2).format(a)} $`; };
const btc = (s) => s.wallet.BTC.ex + s.wallet.BTC.cold;
const kw = (s, id) => FACILITY[id].power[s.fac[id].power].kw;
const kellerKw = (g) => (g.summary?.keller?.watt || 0) / 1000;
const rev = (g) => Math.max(1, g.dailyProfit().rev);

export const EVENTS = [
  // ---------- 2011 ----------
  {
    id: 'juni11', from: 'Deniz', title: '30 Dollar!', when: { date: '2011-06-08', window: 6 }, cond: (s) => btc(s) > 1,
    text: (s, h, g) => `Bitcoin steht bei <b>${usd(g.price('BTC'))}</b>. Alle drehen durch. Du hast <b>${nf(1).format(btc(s))} BTC</b>. Verkaufen? Halten?`,
    choices: [
      { label: 'Die Hälfte verkaufen', fx: { sellFrac: { BTC: 0.5 }, flag: 'sold11', log: 'Juni 2011: bei 30 $ die Hälfte verkauft' }, reply: '<b>Deniz:</b> Vernünftig. Langweilig, aber vernünftig.' },
      { label: 'Alles verkaufen', fx: { sellFrac: { BTC: 1 }, flag: 'sold11', log: 'Juni 2011: bei 30 $ alles verkauft' }, reply: '<b>Deniz:</b> Cash ist King. Hoffentlich.' },
      { label: 'HODL – alles halten', fx: { flag: 'hodl11', log: 'Juni 2011: alles gehalten' }, reply: '<b>Deniz:</b> Stahlnerven. Ich hab schon verkauft …' },
    ],
    fallback: 2,
  },
  {
    id: 'goxhack', from: 'Deniz', title: 'Hack bei GoxBank', when: { date: '2011-06-20', window: 10 }, cond: (s) => btc(s) > 0.5,
    text: 'Bei GoxBank sind Kundendaten aufgetaucht, der Kurs fiel kurz auf einen Cent. Sollen deine Coins von der Börse runter in eine eigene Wallet?',
    choices: [
      { label: 'Ab in die Cold-Wallet', hint: 'Neue Coins landen künftig auch dort', fx: (g, s) => ({ do: () => { for (const c of Object.keys(s.wallet)) { const w = s.wallet[c]; w.cold += w.ex * 0.99; w.ex = 0; } s.payoutCold = true; }, flag: 'coldEarly', log: 'Juni 2011: Coins in die Cold-Wallet gerettet' }), reply: '<b>Deniz:</b> Papier-Wallet im Schuhkarton. Sehr Lindental.' },
      { label: 'Liegen lassen', fx: { log: 'Juni 2011: Coins auf der Börse gelassen' }, reply: '<b>Deniz:</b> Wird schon gutgehen. Bestimmt.' },
    ],
  },
  {
    id: 'pizza', from: 'Deniz', title: 'Pizza-Tag', when: { yearly: '05-22', from: '2011', to: '2026', window: 5 },
    text: (s, h, g) => `Heute vor ${new Date(s.day * 864e5).getUTCFullYear() - 2010} Jahr(en) hat einer 10.000 Bitcoin für zwei Pizzen bezahlt. Ich bestell – zahlst du in Bitcoin?${s.stats.pizzaBTC ? ` <br><small>Deine Pizza-Bitcoin wären heute ${usd(s.stats.pizzaBTC * g.price('BTC'))} wert.</small>` : ''}`,
    choices: [
      { label: 'In Bitcoin zahlen', need: (s, h, g) => btc(s) * g.price('BTC') >= 25, fx: (g) => ({ coin: { BTC: -25 / g.price('BTC') }, stat: { pizzaBTC: 25 / g.price('BTC') }, rel: { deniz: 1 }, ach: 'pizza' }), reply: '<b>Deniz:</b> Legendär. Das erzähl ich unseren Enkeln.' },
      { label: 'Bar zahlen (25 $)', cost: 25, fx: { rel: { deniz: 1 } }, reply: '<b>Deniz:</b> Salami für dich, Thunfisch für mich.' },
      { label: 'Keine Zeit – die Rigs!', fx: { rel: { deniz: -1 } }, reply: '<b>Deniz:</b> Dann ess ich eben beide.' },
    ],
  },
  {
    id: 'noise', from: 'Mama', title: 'Frau Kowalczyk von nebenan', when: { from: '2011-03-01', to: '2013-12-31', chance: 0.15 }, cond: (s, h, g) => s.unlocked.includes('keller') && kellerKw(g) > 1.5,
    text: '„Die Nachbarin war da. Aus dem Keller brummt es Tag und Nacht, sagt sie, ihr Fernseher flimmert. Kannst du was machen?“',
    choices: [
      { label: 'Dämmmatten kaufen', cost: 250, hint: 'Ruhe im Haus', fx: { rel: { mama: 1 }, log: 'Dämmmatten im Keller verlegt' }, reply: '<b>Mama:</b> Danke, Schatz. Sie hat sogar gewunken.' },
      { label: 'Ihren Fernseher reparieren', hint: 'Papa hilft – kostet nichts', fx: { rel: { papa: 1, mama: 1 }, xp: { hw: 15 }, log: 'Frau Kowalczyks Fernseher repariert' }, reply: '<b>Papa:</b> Kondensator. Wie früher. Hat Spaß gemacht.' },
      { label: 'Keller nachts drosseln', hint: '−25 % Hashrate im Keller für 60 Tage', fx: { mod: [{ key: 'hash', mult: 0.75, days: 60, fac: 'keller' }] }, reply: '<b>Mama:</b> Na gut. Ich sag ihr Bescheid.' },
    ],
  },
  {
    id: 'storm', from: 'Opa Heinz', title: 'Gewitter über Lindental', when: { from: '2011-05-01', to: '2016-09-30', chance: 0.04, repeat: 120 }, cond: (s) => { const m = new Date(s.day * 864e5).getUTCMonth(); return m >= 4 && m <= 8 && s.unlocked.includes('keller'); },
    text: '„Blitz in den Trafo an der Dorfstraße. Bei euch ist der Strom weg. Ich kann dir ein Notstromaggregat leihen, das säuft aber Diesel.“',
    choices: [
      { label: 'Aggregat leihen', cost: (g) => Math.round(Math.max(40, rev(g) * 0.4)), hint: 'Diesel für einen Tag', fx: { rel: { opa: 1 } }, reply: '<b>Opa:</b> Und nicht drinnen laufen lassen, Junge!' },
      { label: 'Einen Tag abwarten', hint: 'Alle Standorte in Lindental stehen 2 Tage', fx: { mod: [{ key: 'hash', mult: 0, days: 2, fac: 'keller' }, { key: 'hash', mult: 0, days: 2, fac: 'werkstatt' }, { key: 'hash', mult: 0, days: 2, fac: 'kinder' }] }, reply: '<b>Opa:</b> Dann spielen wir halt Skat.' },
    ],
  },
  // ---------- 2013 ----------
  {
    id: 'repaircafe', from: 'Papa', title: 'Reparatur-Café', when: { date: '2013-04-06', window: 30 }, cond: (s) => s.flags.debt,
    text: '„Ich will samstags ein Reparatur-Café im Laden machen. Leute bringen kaputte Sachen, wir löten zusammen. Bräuchte nur Werkbänke und Messgeräte.“',
    choices: [
      { label: 'Einrichtung bezahlen', cost: 3000, hint: 'Papa +2 · Reparaturen werden günstiger', fx: { rel: { papa: 2 }, mod: [{ key: 'repair', mult: 0.85 }], flag: 'repaircafe', log: 'April 2013: Reparatur-Café im Laden eröffnet' }, reply: '<b>Papa:</b> Elf Leute am ersten Samstag! Elf!' },
      { label: 'Lieber in Miner investieren', fx: { rel: { papa: -1 } }, reply: '<b>Papa:</b> Verstehe. War nur so eine Idee.' },
    ],
  },
  // ---------- 2014 ----------
  {
    id: 'kralcard', from: 'Viktor Kral', title: 'Eine Visitenkarte', when: { date: '2014-03-14', window: 60 }, cond: (s) => s.unlocked.includes('werkstatt'),
    text: 'Ein schwarzer Wagen hält vor Elektro Brandt. Viktor Kral, MONOLITH Hash AG, legt seine Karte auf die Theke: „Kleine Betriebe gehen in diesem Geschäft unter. Rufen Sie an, bevor es so weit ist.“',
    choices: [
      { label: 'Karte einstecken', fx: { flag: 'kralKept', log: 'März 2014: Krals Visitenkarte eingesteckt' }, reply: 'Die Karte ist schwer. Echtes Papier, geprägte Schrift.' },
      { label: 'Karte zerreißen', fx: { flag: 'kralTorn', rel: { papa: 1 }, mod: [{ key: 'monolith', mult: 1.05 }], log: 'März 2014: Krals Karte vor seinen Augen zerrissen' }, reply: '<b>Papa</b> (leise): Das war … ziemlich cool.' },
    ],
  },
  // ---------- 2017 ----------
  {
    id: 'fork17', from: 'Deniz', title: 'Bitcoin spaltet sich', when: { date: '2017-08-01', window: 10 }, cond: (s) => btc(s) > 0.1,
    text: (s) => `Heute ist eine Abspaltung passiert: Wer Bitcoin hatte, bekommt die neuen Coins gratis dazu. In deiner Cold-Wallet liegen <b>${nf(2).format(s.wallet.BTC.cold)} BTC</b>, auf der Börse <b>${nf(2).format(s.wallet.BTC.ex)} BTC</b> – die Börse zahlt nur die Hälfte aus.`,
    choices: [
      { label: 'Abspalt-Coins sofort verkaufen', fx: (g, s) => { const v = s.wallet.BTC.cold * 300 + s.wallet.BTC.ex * 150; return { cash: v, log: `August 2017: Abspalt-Coins für ${usd(v)} verkauft`, toast: `+${usd(v)} aus der Abspaltung` }; }, reply: '<b>Deniz:</b> Geschenktes Geld. Beste Sorte.' },
    ],
  },
  {
    id: 'friseur', from: 'Opa Heinz', title: 'Opas Friseur', when: { date: '2017-12-17', window: 6 }, cond: (s) => btc(s) > 0.5,
    text: (s, h, g) => `„Mein Friseur hat mich nach Bitcoin gefragt. Mein FRISEUR. Wenn der einsteigt, ist es Zeit auszusteigen, Junge.“ Kurs heute: <b>${usd(g.price('BTC'))}</b>.`,
    choices: [
      { label: 'Ein Drittel verkaufen', fx: { sellFrac: { BTC: 1 / 3 }, rel: { opa: 1 }, log: 'Dezember 2017: auf Opa gehört, ein Drittel verkauft' }, reply: '<b>Opa:</b> Kluger Junge. Kommt nach mir.' },
      { label: 'Alles verkaufen', fx: { sellFrac: { BTC: 1 }, rel: { opa: 1 }, log: 'Dezember 2017: kurz vor dem Gipfel alles verkauft' }, reply: '<b>Opa:</b> Ganz oder gar nicht. So mag ich das.' },
      { label: 'Halten', fx: { log: 'Dezember 2017: trotz Opas Friseur gehalten' }, reply: '<b>Opa:</b> Wie du meinst. Ich hab dich gewarnt.' },
    ],
    fallback: 2,
  },
  // ---------- 2018 ----------
  {
    id: 'poach', from: 'Deniz', title: 'Kral will Deniz', when: { date: '2018-11-12', window: 30 }, cond: (s) => s.flags.gmbh,
    text: '„Kral hat mich angerufen. CTO bei MONOLITH, doppeltes Gehalt, Dienstwagen. Ich will eigentlich nicht weg. Aber … sag du was.“',
    choices: [
      { label: '10 % Firmenanteile für Deniz', hint: 'Deniz +2 · 15 % weniger Ausfälle', fx: { rel: { deniz: 2 }, mod: [{ key: 'fail', mult: 0.85 }], flag: 'denizPartner', log: 'November 2018: Deniz wird Teilhaber' }, reply: '<b>Deniz:</b> Partner. Wir. Ich muss mich setzen.' },
      { label: 'Gehalt verdoppeln', hint: '+3.000 $ Fixkosten pro Monat', fx: { rel: { deniz: 1 }, mod: [{ key: 'monthly', mult: 3000 }], log: 'November 2018: Deniz bleibt für doppeltes Gehalt' }, reply: '<b>Deniz:</b> Okay. Okay! Ich bleib.' },
      { label: 'Gehen lassen', hint: 'MONOLITH wird stärker', fx: { rel: { deniz: -3 }, mod: [{ key: 'monolith', mult: 1.1 }], flag: 'denizLeft', next: [{ id: 'denizback', inDays: 900 }], log: 'November 2018: Deniz geht zu MONOLITH' }, reply: '<b>Deniz:</b> … Mach’s gut. Ehrlich.' },
    ],
    fallback: 1,
  },
  {
    id: 'denizback', chain: true, from: 'Deniz', title: 'Darf ich zurück?', cond: (s) => s.flags.denizLeft,
    text: '„Bei MONOLITH ist alles Excel und Angst. Ich vermisse unsere Werkstatt. Darf ich zurück? Ohne Dienstwagen.“',
    choices: [
      { label: 'Willkommen zurück!', fx: { rel: { deniz: 3 }, mod: [{ key: 'monolith', mult: 1 / 1.1 }], flag: 'denizReturned', log: 'Deniz kommt von MONOLITH zurück' }, reply: '<b>Deniz:</b> Ich hab Brezeln mitgebracht. Und Krals Serverplan.' },
      { label: 'Nein', fx: { log: 'Deniz bleibt bei MONOLITH' } },
    ],
  },
  // ---------- 2020 ----------
  {
    id: 'corona', from: 'Papa', title: 'Der Laden muss zu', when: { date: '2020-03-17', window: 20 },
    text: '„Lockdown. Elektro Brandt muss zumachen, keiner weiß, wie lange. Die Miete läuft weiter.“',
    choices: [
      { label: 'Drei Monatsmieten übernehmen', cost: 4500, hint: 'Papa +2', fx: { rel: { papa: 2 }, log: 'März 2020: drei Ladenmieten übernommen' }, reply: '<b>Papa:</b> Ich zahl dir das zurück. Irgendwann. Danke, Kind.' },
      { label: 'Papa repariert deine Miner', hint: '−10 % Ausfälle dauerhaft · 2.000 $ Lohn pro Monat', fx: { rel: { papa: 1 }, mod: [{ key: 'fail', mult: 0.9 }, { key: 'monthly', mult: 2000 }], flag: 'papaRepairs', log: 'März 2020: Papa repariert jetzt Miner' }, reply: '<b>Papa:</b> Endlich wieder richtige Platinen!' },
      { label: '„Er schafft das schon“', fx: { rel: { papa: -1 } }, reply: '<b>Papa:</b> Hm. Ja. Schaff ich.' },
    ],
  },
  // ---------- 2021 ----------
  {
    id: 'chengdu', from: 'Deniz', title: 'Miner aus Chengdu', when: { date: '2021-06-22', window: 20 }, cond: (s) => s.flags.gmbh,
    text: '„China hat Mining verboten. Ein Händler aus Chengdu muss tausende gebrauchte Miner loswerden – 30 % unter Marktpreis. Gebraucht halt. Viel Staub.“',
    choices: [
      { label: 'Zuschlagen', hint: 'ASICs 60 Tage lang 30 % billiger · ein Jahr lang mehr Ausfälle', fx: { mod: [{ key: 'price:asic', mult: 0.7, days: 60 }, { key: 'fail', mult: 1.3, days: 365 }], log: 'Juni 2021: gebrauchte Miner aus Chengdu gekauft' }, reply: '<b>Deniz:</b> Ich bestell Druckluft. Viel Druckluft.' },
      { label: 'Ablehnen', fx: {} },
    ],
  },
  // ---------- 2022 ----------
  {
    id: 'kralbroke', from: 'Viktor Kral', title: 'MONOLITH wankt', when: { date: '2022-12-05', window: 25 }, cond: (s) => s.flags.gmbh && !s.flags.soldOut,
    text: '„Brandt. Ich mache es kurz: Wir müssen Container verkaufen. Volle S19 XP, 45 % unter Liste, 30 Tage. Nehmen Sie, oder ich verkaufe an die Kanadier.“',
    choices: [
      { label: 'Krals Container kaufen', hint: 'ASICs 30 Tage 45 % billiger · MONOLITH ein Jahr schwächer', fx: { mod: [{ key: 'price:asic', mult: 0.55, days: 30 }, { key: 'monolith', mult: 0.8, days: 365 }], log: 'Dezember 2022: Krals Container gekauft' }, reply: '<b>Deniz:</b> Wir kaufen MONOLITH-Maschinen. Ich glaub, ich träum.' },
      { label: 'Er soll an die Kanadier verkaufen', fx: { mod: [{ key: 'monolith', mult: 0.9, days: 365 }] }, reply: '<b>Kral:</b> Wie Sie wollen.' },
    ],
  },
  // ---------- 2024 ----------
  {
    id: 'goxrefund', from: 'Deniz', title: 'GoxBank zahlt zurück', when: { date: '2024-07-05', window: 30 }, cond: (s) => (s.stats.lostBtc?.gox || 0) > 0.01,
    text: (s) => `Zehn Jahre nach der Pleite zahlt der GoxBank-Treuhänder aus! Du bekommst einen Teil deiner damals verlorenen <b>${nf(2).format(s.stats.lostBtc.gox)} BTC</b> zurück.`,
    choices: [{ label: 'Auszahlung annehmen', fx: (g, s) => ({ coin: { BTC: s.stats.lostBtc.gox * 0.2 }, log: `Juli 2024: ${nf(2).format(s.stats.lostBtc.gox * 0.2)} BTC von GoxBank zurück` }), reply: '<b>Deniz:</b> Zehn Jahre! Ich hatte das Passwort schon vergessen.' }],
  },
  {
    id: 'aitenant', from: 'Deniz', title: 'Eine KI-Firma klopft an', when: { date: '2024-06-10', window: 45 }, cond: (s) => s.unlocked.includes('fjord'),
    text: (s) => `„NordGPU AS will Fläche in der Fjordhalle für KI-Server mieten. Fester Preis, egal was Bitcoin macht. Die zahlen 80.000 $ pro Megawatt und Monat.“ Die Fjordhalle hat gerade <b>${nf(0).format(kw(s, 'fjord') / 1000)} MW</b>.`,
    choices: [
      { label: 'Die Hälfte vermieten', hint: 'Halbe Anschlussleistung · feste Miete', fx: (g, s) => ({ mod: [{ key: 'cap', mult: 0.5, fac: 'fjord' }, { key: 'monthly', mult: -Math.round(kw(s, 'fjord') / 1000 * 0.5 * 80000) }], flag: 'aiTenant', ach: 'ai', log: 'Juni 2024: halbe Fjordhalle an NordGPU vermietet' }), reply: '<b>Deniz:</b> Bitcoin und KI unter einem Dach. 2024, Baby.' },
      { label: 'Ein Drittel vermieten', fx: (g, s) => ({ mod: [{ key: 'cap', mult: 2 / 3, fac: 'fjord' }, { key: 'monthly', mult: -Math.round(kw(s, 'fjord') / 1000 / 3 * 80000) }], flag: 'aiTenant', ach: 'ai', log: 'Juni 2024: ein Drittel der Fjordhalle an NordGPU vermietet' }) },
      { label: 'Ablehnen – wir minen', fx: { log: 'Juni 2024: NordGPU abgewiesen' } },
    ],
    fallback: 2,
  },
];
export const EVENT = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
