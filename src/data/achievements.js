// Erfolge: check(s, h, g) wird täglich geprüft; ohne check nur über Ereignisse/Bonusziele (fx.ach) vergeben.
// hidden: true – bis zur Freischaltung im Logbuch nur als „???“ sichtbar.
// Unbekannte IDs (fx.ach aus anderen Inhalten) landen in s.ach, zeigen aber kein Popup und keine Kachel.
// Statistiken dafür sammelt Game.progressDay (s.stats: y, trips, tmax, halv, asicDay, wonDay, neg1, btc2010).
import { toDay } from './history.js';

const SKILL_MAX = 10; // höchste Fähigkeitsstufe (SKILL_XP in game.js)

const yearGain = (s, y) => { const Y = s.stats.y?.[y]; return Y && Y.nw1 != null ? Y.rev - Y.elec - Y.fix : null; };
const objs = (s, fn) => { let n = 0; for (const id of s.unlocked) n += s.fac[id].objects.filter(fn).length; return n; };
// Grafikkarten-Rigs, die gerade wirklich etwas verdienen
const gpuEarning = (s, g) => s.unlocked.some((id) => { const sm = g.summary?.[id]; return sm && !sm.tripped && s.fac[id].objects.some((o) => o.parts?.gpus?.length && sm.per.get(o.uid)?.units.some((u) => u.rev > 0)); });

export const ACHIEVEMENTS = [
  { id: 'firstsale', name: 'Hallo Welt', desc: 'Deine ersten Bitcoin verkauft.', check: (s) => s.stats.sold > 0 },
  { id: 'milk', name: 'Milchmann', desc: 'Fünf Milchkisten-Rigs gleichzeitig aufgestellt.', check: (s) => objs(s, (o) => o.type === 'crate') >= 5 },
  { id: 'selfmade', name: 'Selbst geschraubt', desc: 'Zehn Bausätze selbst zusammengebaut.', check: (s) => (s.stats.kits || 0) >= 10 },
  { id: 'regular', name: 'Stammkunde', desc: 'Bei Kemal oder Jonas „Bester Kunde“ geworden.', check: (s) => Object.values(s.contacts || {}).some((c) => (c?.n || 0) >= 8) },
  { id: 'cold', name: 'Schuhkarton', desc: 'Coins in die Cold-Wallet gelegt.', check: (s) => Object.values(s.wallet).some((w) => w.cold > 0) },
  { id: 'opa', name: 'Opa hatte recht', desc: 'Dreimal ist die Sicherung rausgeflogen.', check: (s) => (s.stats.trips || 0) >= 3 },
  { id: 'sauna', name: 'Sauna-Club', desc: 'Ein Standort wurde heißer als 40 °C.', hidden: true, check: (s) => (s.stats.tmax || 0) > 40 },
  { id: 'pizza', name: 'Pizza-Tag', desc: 'Eine Pizza mit Bitcoin bezahlt.' },
  { id: 'pizzarich', name: 'Teuerste Pizza', desc: 'Deine Pizza-Bitcoin sind über 100.000 $ wert.', hidden: true, check: (s, h, g) => (s.stats.pizzaBTC || 0) * g.price('BTC') >= 1e5 },
  { id: 'deadline', name: 'Zwei Jahre zu früh', desc: 'Papas Laden schon 2011 gerettet.' },
  { id: 'diamond', name: 'Diamantpfoten', desc: 'Im Juni 2011 nicht verkauft – und Ende 2013 noch 50 BTC gehabt.', check: (s) => !!s.flags.hodl11 && (s.stats.y?.[2013]?.btc || 0) >= 50 },
  { id: 'early', name: 'Früher Vogel', desc: 'Einen ASIC-Miner vor dem 1. Juli 2013 gekauft.', check: (s) => !!s.stats.asicDay && s.stats.asicDay < toDay('2013-07-01') },
  { id: 'coolhead', name: 'Kalter Kopf', desc: 'Die GoxBank-Pleite ohne Verlust überstanden.', check: (s) => s.day >= toDay('2014-02-24') && s.day <= toDay('2014-04-30') && (s.stats.lostBtc?.gox || 0) < 1e-6 && s.wallet.BTC.cold > 0.01 },
  { id: 'muchwow', name: 'Viel Wow', desc: '100.000 Dogecoin geschürft.', check: (s) => (s.stats.coins?.DOGE || 0) >= 1e5 },
  { id: 'eth', name: 'Weltcomputer', desc: 'Dein erstes Ethereum geschürft.', check: (s) => (s.stats.coins?.ETH || 0) > 0 },
  { id: 'blackzero', name: 'Schwarze Null', desc: 'Bis Ende 2015 kein einziger Tag im Minus.', check: (s) => s.day >= toDay('2016-01-01') && !!s.stats.y?.[2011] && !s.stats.neg1 && s.stats.minedUSD > 0 },
  { id: 'winter15', name: 'Überwintert', desc: 'Das Jahr 2015 mit Gewinn abgeschlossen.', check: (s) => yearGain(s, 2015) > 0 },
  { id: 'tinker', name: 'Tüftler', desc: 'Fünf Techniken entwickelt.', check: (s) => Object.keys(s.techs || {}).length >= 5 },
  { id: 'kraltorn', name: 'Kein Anschluss', desc: 'Krals Visitenkarte vor seinen Augen zerrissen.', hidden: true, check: (s) => !!s.flags.kralTorn },
  { id: 'ice18', name: 'Eiszeit', desc: 'Das Jahr 2018 mit Gewinn abgeschlossen.', check: (s) => yearGain(s, 2018) > 0 },
  { id: 'master', name: 'Meisterbrief', desc: 'Eine Fähigkeit auf die höchste Stufe gebracht.', check: (s, h, g) => !!s.skills && ['hw', 'mining', 'trade'].some((k) => g.skillLv(k) >= SKILL_MAX) },
  { id: 'sun', name: 'Sonnenkind', desc: '1 MWp Solar auf deinen Dächern.', check: (s) => Object.values(s.fac).reduce((a, f) => a + (f.solar || 0), 0) >= 1000 },
  { id: 'onepct', name: 'Ein Prozent', desc: 'Im ASIC-Zeitalter (ab 2015) 1 % der weltweiten Bitcoin-Hashrate.', check: (s, h, g) => s.day >= toDay('2015-01-01') && h.algoHash('sha256') >= g.netHash('BTC') * 0.01 },
  { id: 'prodigal', name: 'Brezeln zur Begrüßung', desc: 'Deniz ist von MONOLITH zurückgekommen.', hidden: true, check: (s) => !!s.flags.denizReturned },
  { id: 'notforsale', name: 'Nicht käuflich', desc: 'Krals Übernahmeangebot abgelehnt.', check: (s) => !!s.flags.offerDeclined && !s.flags.soldOut },
  { id: 'halv4', name: 'Vier Halvings', desc: 'Bei vier Halvings mit laufenden Minern dabei.', check: (s) => (s.stats.halv || 0) >= 4 },
  { id: 'merge', name: 'Nach dem Merge', desc: 'Nach dem Ethereum-Merge mit Grafikkarten weitergeschürft.', check: (s, h, g) => s.day >= toDay('2022-09-16') && gpuEarning(s, g) },
  { id: 'twice', name: 'Zweimal Glück', desc: 'Auch die FXT-Pleite ohne Verlust überstanden.', hidden: true, check: (s) => !!s.ach?.coolhead && s.day >= toDay('2022-11-11') && s.day <= toDay('2023-01-31') && (s.stats.lostBtc?.fxt || 0) < 1e-6 && s.wallet.BTC.cold > 0.01 },
  { id: 'family', name: 'Familienbande', desc: 'Papa, Mama, Opa und Deniz – alle auf Stufe 3.', check: (s) => ['papa', 'mama', 'opa', 'deniz'].every((k) => (s.rel?.[k] || 0) >= 3) },
  { id: 'allsites', name: 'Sechs Adressen', desc: 'Alle sechs Standorte gehören dir.', check: (s) => s.unlocked.length >= 6 },
  { id: 'goliath', name: 'Goliath', desc: 'MONOLITH überholt.', check: (s) => !!s.flags.won },
  { id: 'prodigy', name: 'Vorzeitig', desc: 'MONOLITH schon vor 2022 überholt.', check: (s) => !!s.stats.wonDay && s.stats.wonDay < toDay('2022-01-01') },
  { id: 'ai', name: 'Zweites Standbein', desc: 'Fläche an eine KI-Firma vermietet.' },
  { id: 'treasure', name: 'Schatzsucher', desc: 'Alle Erinnerungsstücke gefunden.' }, // vergibt die Welt (Fundstücke)
  { id: 'talker', name: 'Familienmensch', desc: 'Mit drei Menschen aus deiner Familie geredet.', check: (s) => ['papa', 'mama', 'opa', 'deniz'].filter((k) => s.talk?.last?.[k] != null).length >= 3 },
  { id: 'oldbox', name: 'Der alte Kasten', desc: 'Dein allererster PC steht 2026 noch – und ist an.', hidden: true, check: (s) => s.day >= toDay('2026-01-01') && s.unlocked.some((id) => s.fac[id].objects.some((o) => o.uid === 1 && o.type === 'tower' && o.mode !== 'off' && !o.broken)) },
];
export const ACH = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
