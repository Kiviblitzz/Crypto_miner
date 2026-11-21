// Fähigkeiten 2.0 (Taste T): Wissen, das einen Handgriff, ein Gerät oder einen Knopf freischaltet – keine Prozent-Boni ohne Handlung.
// Entwurf: docs/faehigkeiten.md. Reine Daten, kein DOM (Logik: src/sim/skills.js, Menü: src/ui/skills.js).
//
// SKILL_CATS: Äste im Baum (Farbe und Richtung in src/ui/skills.js).
// Ein gemeinsamer Punktetopf (Paket 18): Erfahrung kommt nur durchs Selbermachen (Bauen, Reparieren, Verkaufen …), POTS sagt nur, woher sie kam.
//   Der n-te Fähigkeitspunkt braucht 50·n Erfahrung mehr als der vorige (50, 150, 300, 500, 750 …), höchstens EP_DAY_CAP am Tag.
// SKILLS[]: { id, nr, cat, name, feel, from?, minTier?, needs?, learn: [Lernweg], can, desc, use, hint?, where?, play?, soon?, due? }
//   feel: 'Handgriff' | 'Mini-Spiel' | 'Freischaltung'
//   from: ab Datum lernbar (vorher „Bald“ bzw. „Später“), minTier: ab Standort-Stufe, needs: andere Fähigkeiten, gate(s, g): '' oder Grund
//   learn: { via: 'pts', n } freischalten mit n Fähigkeitspunkten (der einzige Lernweg) · { via: 'msg' } Grundlage, kommt von selbst
//   can: ein Satz für den Tooltip im Baum – was man danach tun kann (ohne Zahlen). Leute (Kemal, Jonas, Lindqvist, Papa) schalten keine Knoten frei.
//   play: true = im Spiel benutzbar; soon: Text für den Zustand „Bald“ (Handgriff kommt mit einem späteren Update)
//   due(s, g): Pflicht-Ausweg (keine Sackgasse) – ab dann automatisch gelernt, mit Handy-Nachricht dueMsg
//   where: wohin „Zeig mir wo“ führt ('rig', 'rigNoOs', 'gpuRig', 'fpga', 'asic', 'broken', 'market', 'company', 'shop:<cat>')
import { toDay } from './history.js';

export const SKILL_CATS = [
  { id: 'sch', name: 'Schrauben', pot: 'w', desc: 'Bauen, einbauen, Rahmen, Serien' },
  { id: 'sof', name: 'Software', pot: 'r', desc: 'Betriebssystem, Miner, Firmware, Automatik' },
  { id: 'tun', name: 'Tuning', pot: 'r', desc: 'Takt, Spannung, BIOS, Leistungsziel' },
  { id: 'kst', name: 'Kühlung & Strom', pot: 'w', desc: 'Luft, Wasser, Immersion, Elektrik, Abwärme' },
  { id: 'rep', name: 'Reparatur', pot: 'w', desc: 'Wartung, Löten, Fehlersuche, Roboter' },
  { id: 'ges', name: 'Geschäft', pot: 'g', desc: 'Börse, Einkauf, Lager, Leute' },
];
export const SKILL_CAT = Object.fromEntries(SKILL_CATS.map((c) => [c.id, c]));
export const POTS = { w: { name: 'Werkstatt', long: 'Erfahrung' }, r: { name: 'Rechner', long: 'Erfahrung' }, g: { name: 'Geschäft', long: 'Erfahrung' } }; // Herkunft der Erfahrung (Symbol), alles in einen Topf
export const XP_POT = { hw: 'w', mining: 'r', trade: 'g' }; // alte addXp-Schlüssel → Herkunft
export const EP_DAY_CAP = 600;
export const ptsFor = (ep) => Math.floor((Math.sqrt(1 + (8 * Math.max(0, ep)) / 50) - 1) / 2); // 25·n·(n+1) ≤ ep
export const epFor = (n) => 25 * n * (n + 1);

// Tuning-Profile (Nr. 7 Takt & Spannung für GPU-Rigs, Nr. 27 Firmware für ASICs): Faktoren auf Strom (P), Hashrate (H), Ausfälle (F)
// imm: Turbo im Immersionsbecken (Ausbau „immersion“, Nr. 34) – mehr Takt, kein Hitze-Verschleiß
export const PROFILES = {
  eco: { name: 'Eco', P: 0.78, H: 0.95, F: 0.85, desc: '−22 % Strom, −5 % Hashrate, weniger Wärme und Verschleiß' },
  std: { name: 'Standard', P: 1, H: 1, F: 1, desc: 'Werkseinstellung' },
  turbo: { name: 'Turbo', P: 1.18, H: 1.08, F: 1.5, desc: '+8 % Hashrate, +18 % Strom, mehr Wärme und Verschleiß' },
};
export const PROFILE_IMM = { P: 1.2, H: 1.12, F: 1 }; // Turbo im Kühlbad
export const FIRMWARE = { P: 0.9, H: 1.08, brick: 0.02 }; // Hashwerk-Firmware: −10 % Strom, +8 % Hashrate, 2 % Risiko je Flash (Gerät defekt)
export const AUTOTUNE = { P: 0.9 }; // Autotuning (Nr. 33): Spannung je Chip – −10 % Strom bei gleicher Hashrate
export const WK = { perGpu: 60, heat: 0.3 }; // Wasserkühlung je Karte: 70 % der Wärme gehen über den Radiator nach draußen
export const SERVICE = { days: 180, fail: 0.7, rig: 5, dev: 15 }; // Wartung: Material, 180 Tage Ausfälle ×0,7
export const OS = { win: { name: 'Windows', price: (day) => (day >= toDay('2015-01-01') ? 100 : 60) }, linux: { name: 'Linux' }, xp: { name: 'Windows XP' } };
// Selbst reparieren je Art des Defekts: Material als Anteil von repairCost (ohne/mit Fähigkeit), Mini-Spiel, Fähigkeit; Routine ab 5 geschafften
//   loet: Kondensator (Rig, Mini-Spiel Löten) · steck: Riser/Karte (Rig, Fehlersuche durch Stecken) · chip: Hashboard (Miner, Chip-Kette – nur mit Fähigkeit)
export const REPAIR = { routine: 5, loet: { self: 0.35, skill: 0.25, sk: 'loeten', game: 'loeten', name: 'Kondensator' }, steck: { self: 0.3, skill: 0.15, sk: 'stecken', game: 'stecken', name: 'Riser oder Karte' }, chip: { self: 0.1, skill: 0.1, sk: 'hashboard', game: 'chips', need: true, name: 'Hashboard' } };
export const PSUMOD = { cap: 1.15, fail: 1.1, cost: 10 }; // Netzteil-Mod (Nr. 44): +15 % Leistung, etwas mehr Verschleiß, 10 $ Material
export const BIOSMOD = { cards: ['rs470', 'rs480', 'rs570', 'rs580'], H: 1.18, risk: 0.03 }; // BIOS-Mod (Nr. 28): Polaris-Karten, +18 % Ethash, 3 % Risiko je Flash
export const PLIMIT = { min: 60, max: 120, exp: 0.7, fail: 2.5 }; // Leistungsziel (Nr. 33): Hash ∝ Leistung^0,7, über 100 % mehr Verschleiß
// Großhändler-Kontakt (Nr. 29, Herr Lindqvist): befristete Sammelangebote mit sichtbarem Preis statt verstecktem Mengenrabatt
//   n: Stückzahl nach Standort-Stufe, disc: Preis als Anteil von Einzelpreis × Menge, every: Tage bis zum nächsten Angebot, days: gültig
export const WHOLESALE = { n: { 2: 16, 3: 48, 4: 96, 5: 200 }, min: 8, disc: [0.84, 0.9], days: 7, budget: 1.25, every: [21, 35] }; // every: Tage bis zum nächsten Anruf
// Robi (Nr. 46–48): Ladestation je Robi, versorgt ihren Standort. Stufe 1 USB-Stick, 2 mit Greifarm (Teile tauschen), 3 mit Lötkopf (löten).
//   jobs: Fahrten am Tag je Stufe (mehr Robis = mehr Fahrten), mods: Nachrüstung im Inspektor (after: erst das andere Modul)
export const ROBO = { jobs: [12, 24, 40], mods: { steck: { skill: 'robo_steck', price: 8000, name: 'Greifarm' }, loet: { skill: 'robo_loet', price: 40000, name: 'Lötkopf', after: 'steck' } } };
// Alte Spielstände (vor Fähigkeiten 2.0): statt eines Prozent-Übergangs einmal Geld von Deniz – so viel wie 120 Tage × 10 % des Tagesumsatzes, gedeckelt
export const MIGR_PAY = { days: 120, share: 0.1, cap: 2e6 };
export const FEE = { now: 0.015, limit: 0.005, trader: 0.005, min: 0.002 }; // Börse: Sofortverkauf, Limit-Order, Händler, Untergrenze
export const PEAK = { elec: 0.85, hash: 0.92 }; // Lastmanagement: Abschalten bei Preisspitzen

const anyObj = (s, fn) => Object.values(s.fac || {}).some((f) => (f.objects || []).some(fn));
const tierMax = (s, F) => Math.max(0, ...(s.unlocked || []).map((id) => F[id]?.tier ?? 0));
export { tierMax };

export const SKILLS = [
  // ---------- GPU-Zeit I: Wohnung ----------
  { id: 'bauen', nr: 1, cat: 'sch', name: 'PC zusammenbauen', feel: 'Handgriff', play: true, learn: [{ via: 'msg' }], desc: 'Mainboard, Prozessor und Netzteil ins Gehäuse einbauen.', use: 'PC anschauen, E', where: 'rig' },
  { id: 'cpustart', nr: 2, cat: 'sof', name: 'CPU-Mining starten', feel: 'Handgriff', play: true, learn: [{ via: 'msg' }], desc: 'Den Bitcoin-Client auf „Coins erzeugen“ stellen – der Prozessor schürft.', use: 'Dein erster PC', where: 'rig' },
  { id: 'gpuminer', nr: 3, cat: 'sof', name: 'Grafikkarte und GPU-Miner', feel: 'Handgriff', play: true, learn: [{ via: 'msg' }], due: (s) => !!s.flags.boughtGpu, dueMsg: { from: 'Deniz', text: 'Karte drin? Dann läuft jetzt der GPU-Miner statt dem Haken im Client. Gelernt: Grafikkarte und GPU-Miner.' }, desc: 'Grafikkarten einbauen und den GPU-Miner nutzen.', use: 'Inspektor → Teile', where: 'rig' },
  { id: 'boerse', nr: 4, cat: 'ges', name: 'Bitcoin verkaufen', feel: 'Freischaltung', play: true, learn: [{ via: 'msg' }], due: (s, g) => g.has('market') && !!s.flags.miningStarted, desc: 'Die Börse am Monitor (M).', use: 'Monitor oder M', where: 'market' },
  { id: 'windows', nr: 5, cat: 'sof', name: 'Windows installieren', feel: 'Handgriff', play: true, learn: [{ via: 'msg' }], due: (s, g) => g.osNeedAny(), dueMsg: { from: 'Deniz', text: 'Dein neuer PC hat noch kein Betriebssystem! Inspektor auf, Reiter „System“, Installer durchklicken. Windows kostet eine Lizenz – oder lern Linux, das kostet nix (T).' }, desc: 'Jeder selbst gebaute PC oder Rig braucht ein Betriebssystem. Den Installer klickst du am Gerät durch; Windows kostet eine Lizenz.', use: 'Inspektor → System', hint: 'Fertig-PCs von Kemal und Jonas haben das System schon drauf.', where: 'rigNoOs' },
  { id: 'linux', nr: 6, cat: 'sof', name: 'Linux-Mining-System', feel: 'Handgriff', play: true, needs: ['windows'], learn: [{ via: 'pts', n: 1 }], desc: 'Im Installer gibt es „Linux (gratis)“ statt der Windows-Lizenz.', use: 'Inspektor → System', hint: 'Lohnt sich ab dem zweiten Rig: Die Lizenz kostet mehr als eine Milchkiste.', where: 'rigNoOs' },
  { id: 'takt', nr: 7, cat: 'tun', name: 'Takt und Spannung', feel: 'Handgriff', play: true, from: '2010-12-01', needs: ['gpuminer'], learn: [{ via: 'pts', n: 2 }], desc: 'Im BIOS jedes GPU-Rigs: Eco (−22 % Strom, −5 % Hash), Standard oder Turbo (+8 % Hash, +18 % Strom). Wirkt nur auf Grafikkarten.', use: 'Inspektor → Tuning', hint: 'Eco, wenn der Strom über ein Drittel des Ertrags frisst oder es heiß ist. Turbo, solange der Strom fast nichts kostet.', where: 'gpuRig' },
  { id: 'abluft', nr: 8, cat: 'kst', name: 'Luftstrom und Fensterabluft', feel: 'Freischaltung', soon: 'Fensterabluft (Ventilator mit Schlauch) als neues Kühlteil', learn: [{ via: 'pts', n: 1 }], desc: 'Neues Kühlteil „Fensterabluft“ für Fensterplätze.', use: 'Shop → Kühlung' },
  { id: 'wartung', nr: 9, cat: 'rep', name: 'Wartung', feel: 'Handgriff', play: true, learn: [{ via: 'pts', n: 1 }], desc: 'Du kannst Rigs und Miner entstauben und die Wärmeleitpaste wechseln – danach fallen sie eine Weile seltener aus.', use: 'Inspektor → Wartung', hint: 'Vor dem Sommer warten – Hitze frisst Hardware.', where: 'rig' },
  { id: 'loeten', nr: 10, cat: 'rep', name: 'Löten', feel: 'Mini-Spiel', play: true, learn: [{ via: 'pts', n: 2 }], desc: 'Selbst reparieren wird leichter (breiterer grüner Bereich, weniger Lötstellen) und billiger (Material 25 statt 35 %). Nach 5 geschafften Reparaturen geht es als Routine mit einem Klick.', use: 'Defektes Rig → Selbst reparieren', hint: 'Spart den Werkstattpreis – kostet nur ein paar Sekunden.', where: 'broken' },
  { id: 'tarif', nr: 11, cat: 'ges', name: 'Stromtarif wechseln', feel: 'Handgriff', from: '2011-03-01', soon: 'Tarifwechsel im Firmenfenster', learn: [{ via: 'pts', n: 1 }], desc: 'Neukundentarif bei Haushaltsstrom, jedes Jahr neu wechseln.', use: 'Firma (C)' },
  // ---------- GPU-Zeit II: Keller ----------
  { id: 'riser', nr: 12, cat: 'sch', name: 'Riser und Open-Frame', feel: 'Freischaltung', play: true, from: '2011-01-01', learn: [{ via: 'pts', n: 1 }], due: (s) => s.unlocked.includes('keller') && s.day >= toDay('2011-04-10'), dueMsg: { from: 'Deniz', text: 'Die Leute bauen jetzt Rigs in Milchkisten – hier der Forum-Link, ich hab dir alles markiert. Gelernt: Riser und Open-Frame.' }, desc: 'Milchkiste und Alu-Rahmen im Shop: Mainboard unten, Karten an Risern obendrauf.', use: 'Shop → Rigs', hint: 'Billiger als ein Tower-Gehäuse und passt mehr Karten.', where: 'shop:rigs' },
  { id: 'stecken', nr: 13, cat: 'rep', name: 'Fehlersuche (Stecken und Messen)', feel: 'Mini-Spiel', play: true, from: '2011-01-01', needs: ['wartung'], learn: [{ via: 'pts', n: 1 }], desc: 'Rig startet nicht? Karten und Riser einzeln abziehen, Test-Boot, so findest du das kaputte Teil – das geht auch ohne die Fähigkeit. Mit ihr zeigen dir Dioden die Verdächtigen, das Material kostet 15 statt 30 %, und nach 5 Erfolgen geht es als Routine mit einem Klick.', use: 'Defektes Rig → Fehler suchen', hint: 'Halbe-halbe abziehen – so reichen zwei, drei Test-Boots.', where: 'broken' },
  { id: 'elektrik', nr: 14, cat: 'kst', name: 'Elektrik mit Opa', feel: 'Handgriff', soon: 'Stromausbau selbst machen (−40 %, 2 Tage Stillstand)', learn: [{ via: 'pts', n: 2 }], desc: 'Stromausbau in Wohnung, Keller und Werkstatt selbst machen.', use: 'Firma (C)' },
  { id: 'wasser', nr: 15, cat: 'kst', name: 'Wasserkühlung', feel: 'Handgriff', play: true, from: '2011-06-01', needs: ['gpuminer'], learn: [{ via: 'pts', n: 3 }], desc: 'Am Rig: Kühler auf die Karten, Schläuche stecken (60 $ je Karte). Danach gehen 70 % der Wärme über den Radiator nach draußen – Turbo ohne Hitzestau.', use: 'Inspektor → Wasserkühlung', hint: 'Lohnt sich, wenn die Kühlung am Standort das Limit ist.', where: 'gpuRig' },
  { id: 'limit', nr: 16, cat: 'ges', name: 'Limit-Orders', feel: 'Handgriff', play: true, from: '2011-06-01', needs: ['boerse'], learn: [{ via: 'pts', n: 2 }], desc: 'An der Börse: Verkaufsauftrag „sobald der Kurs ≥ X steht“ und Auto-Verkauf nur über dem 7-Tage-Schnitt. Gebühr 0,5 % statt 1,5 %.', use: 'Börse (M)', hint: 'Niedrige Gebühr und besserer Preis – aber der Auftrag wird vielleicht nie ausgeführt.', where: 'market' },
  { id: 'cold', nr: 17, cat: 'ges', name: 'Cold-Wallet', feel: 'Freischaltung', play: true, from: '2011-06-20', learn: [{ via: 'msg' }], due: (s, g) => g.has('cold'), desc: 'Coins offline lagern – sicher vor Börsenpleiten.', use: 'Börse (M)', where: 'market' },
  { id: 'image', nr: 18, cat: 'sof', name: 'Mining-Image vom USB-Stick', feel: 'Handgriff', play: true, from: '2011-10-01', needs: ['linux'], learn: [{ via: 'pts', n: 1 }], desc: 'Linux mit einem Klick aufspielen statt mit dem Assistenten – auch für alle neuen Rigs am Standort auf einmal.', use: 'Inspektor → System', hint: 'Spart Klicks ab dem fünften Rig.', where: 'rigNoOs' },
  { id: 'lager', nr: 19, cat: 'ges', name: 'Lager und Logistik', feel: 'Freischaltung', soon: 'Vorrat über die freien Stellplätze hinaus', learn: [{ via: 'pts', n: 1 }], desc: 'Mehr bestellen, als gerade Stellplätze frei sind.', use: 'Shop' },
  { id: 'pool', nr: 20, cat: 'sof', name: 'Pool und Solo', feel: 'Handgriff', from: '2010-11-01', soon: 'Solo-Mining mit ganzen Blöcken', learn: [{ via: 'pts', n: 1 }], desc: 'Am Gerät „Pool“ oder „Solo“ wählen.', use: 'Inspektor' },
  // ---------- FPGA ----------
  { id: 'fpga', nr: 21, cat: 'sof', name: 'FPGA-Boards bedienen', feel: 'Handgriff', play: true, from: '2011-07-01', learn: [{ via: 'pts', n: 2 }], desc: 'Fieldforge-Boards kaufen und nach dem Aufstellen den Bitstream laden (USB-JTAG-Kabel) – sonst rechnet das Board nicht.', use: 'Shop → Miner, dann Inspektor', hint: '20 W bei 210 MH/s – verlockend in der kleinen Wohnung, aber teuer.', where: 'shop:asic' },
  { id: 'fpgakit', nr: 22, cat: 'sch', name: 'FPGA-Bausatz löten', feel: 'Mini-Spiel', from: '2011-10-01', needs: ['loeten', 'fpga'], soon: 'Fieldforge als Bausatz (−35 %)', learn: [{ via: 'pts', n: 2 }], desc: 'Fieldforge als Bausatz für 35 % weniger.', use: 'Shop → Miner' },
  // ---------- ASIC-Zeit ----------
  { id: 'asic', nr: 23, cat: 'sof', name: 'ASIC in Betrieb nehmen', feel: 'Handgriff', play: true, from: '2013-02-01', learn: [{ via: 'msg' }], due: (s) => s.day >= toDay('2013-02-01'), dueMsg: { from: 'Deniz', text: 'Die ersten ASICs! Pool-Adresse eintragen, fertig – den Rest machen die Kisten selbst. Gelernt: ASIC in Betrieb nehmen.' }, desc: 'ASIC-Miner aufstellen und am Pool anmelden.', use: 'Shop → Miner', where: 'shop:asic' },
  { id: 'vorbestellen', nr: 24, cat: 'ges', name: 'Vorbestellen beim Hersteller', feel: 'Handgriff', from: '2012-06-01', soon: 'Listenpreis ohne Graumarkt-Aufschlag, Lieferung in 45–120 Tagen', learn: [{ via: 'pts', n: 2 }], desc: 'Bei knappen Geräten zum Listenpreis vorbestellen.', use: 'Shop → Miner' },
  { id: 'gebraucht', nr: 25, cat: 'ges', name: 'Gebrauchtmarkt', feel: 'Freischaltung', from: '2014-03-01', soon: 'Shop-Reiter „Gebraucht“', learn: [{ via: 'pts', n: 1 }], desc: 'Gebrauchte Karten und Miner für 35–60 % des Neupreises.', use: 'Shop' },
  { id: 'serie', nr: 26, cat: 'sch', name: 'Serienbau und Vorlagen', feel: 'Freischaltung', soon: 'Eigene Builds als Vorlage speichern und in Serie bestellen', learn: [{ via: 'pts', n: 2 }], desc: 'Bis zu 5 Builds speichern und als Bausatz-Serie bestellen.', use: 'Shop → Rigs' },
  { id: 'firmware', nr: 27, cat: 'sof', name: 'ASIC-Firmware flashen', feel: 'Handgriff', play: true, from: '2016-01-01', needs: ['asic', 'linux'], learn: [{ via: 'pts', n: 3 }], gate: (s) => (s.flags.gmbh || s.unlocked.includes('halle') ? '' : 'ab der GmbH'), desc: 'Am Miner oder Regal „Firmware flashen“: −10 % Strom, +8 % Hashrate. Die Profile Eco und Turbo gehen damit auch ohne ASIC-Takt. Jeder Flash hat 2 % Risiko, dass das Gerät hängen bleibt.', use: 'Inspektor → Firmware', hint: 'Lohnt sich fast immer – nur nicht kurz vor dem Verkauf.', where: 'asic' },
  { id: 'biosmod', nr: 28, cat: 'tun', name: 'BIOS-Mod (Speicher-Timings)', feel: 'Handgriff', play: true, from: '2016-08-01', needs: ['takt'], learn: [{ via: 'pts', n: 2 }], desc: 'An Crimson-Polaris-Karten (RS 470, 480, 570, 580) die Speicher-Timings flashen: +18 % Ethash-Hashrate bei gleichem Strom. Jeder Flash hat 3 % Risiko, dass das Rig hängen bleibt – dann hilft nur Löten (BIOS-Clip).', use: 'Inspektor → Tuning (Rigs mit Polaris-Karten)', hint: 'Macht die günstigen Polaris-Karten im Ethereum-Boom stärker als manche teure Verdant.', where: 'gpuRig' },
  // ---------- Rechenzentrum ----------
  { id: 'hashboard', nr: 31, cat: 'rep', name: 'Hashboard-Reparatur', feel: 'Mini-Spiel', play: true, from: '2017-01-01', needs: ['fpgakit', 'loeten'], learn: [{ via: 'pts', n: 4 }], desc: 'Defekte ASIC-Miner selbst reparieren: im Mini-Spiel „Chip-Kette“ die Spannung von Chip zu Chip messen, den toten Chip finden und neu einlöten – zum Materialpreis (10 %). Nach 5 Erfolgen als Routine, später übernimmt der Löt-Robo.', use: 'Defekter Miner → Hashboard reparieren', hint: 'Lohnt sich, sobald viele Miner laufen – der Werkstattpreis frisst sonst den Gewinn.', where: 'broken' },
  { id: 'fernwartung', nr: 32, cat: 'sof', name: 'Fernwartung', feel: 'Handgriff', play: true, from: '2016-01-01', needs: ['image'], learn: [{ via: 'pts', n: 2 }], desc: 'Neue Rigs bekommen das Mining-Image automatisch über das Netz – an jedem Standort. Im Rechenzentrum passiert das ohnehin.', use: 'Automatisch beim Aufstellen', hint: 'Spart den Gang zu jedem neuen Rig.', where: 'rig' },
  { id: 'autotuning', nr: 33, cat: 'tun', name: 'Autotuning und Leistungsziel', feel: 'Handgriff', play: true, from: '2019-10-01', needs: ['fernwartung', 'firmware'], learn: [{ via: 'pts', n: 3 }], desc: 'Schalter „Autotuning“ an geflashten Minern und Regalen: Die Firmware sucht für jeden Chip die kleinste Spannung – 10 % weniger Strom bei gleicher Hashrate. Dazu ein Regler „Leistungsziel“ von 60 bis 120 % je Gerät (auch an GPU-Rigs): weniger Leistung spart mehr Strom, als sie Hash kostet; mehr bringt Hash, frisst aber Strom und Hardware.', use: 'Inspektor → Tuning', hint: 'Kostet nur einen Klick je Regal – lohnt sich immer, wenn der Strom etwas kostet.', where: 'asic' },
  { id: 'immersion', nr: 34, cat: 'kst', name: 'Immersionskühlung', feel: 'Freischaltung', play: true, from: '2020-09-01', minTier: 4, needs: ['firmware'], learn: [{ via: 'pts', n: 4 }], desc: 'Ausbau „Immersionsbecken“ im Rechenzentrum und in der Fjordhalle: Miner baden in Kühlflüssigkeit (Ausfälle ×0,7). Turbo bringt dort +12 % Hash ohne Hitze-Verschleiß.', use: 'Firma (C) → Ausbauten, dann Turbo am Regal', hint: 'Teuer – lohnt sich bei viel Leistung auf wenig Platz.', where: 'company' },
  { id: 'lastman', nr: 35, cat: 'kst', name: 'Lastmanagement', feel: 'Handgriff', play: true, from: '2021-06-01', minTier: 4, learn: [{ via: 'pts', n: 3 }], desc: 'Schalter je Standort „Bei Preisspitzen abschalten“: Strom ×0,85, dafür läuft alles nur 92 % der Zeit.', use: 'Firma (C) → Standort', hint: 'Lohnt sich nur, wenn der Strom einen großen Teil des Ertrags frisst.', where: 'company' },
  // ---------- Endspiel ----------
  { id: 'vermieten', nr: 36, cat: 'sof', name: 'Rechenleistung vermieten', feel: 'Handgriff', from: '2022-09-15', needs: ['linux'], soon: 'Betriebsart „Vermieten“ für GPU-Rigs (KI und Rendern)', learn: [{ via: 'pts', n: 3 }], desc: 'GPU-Rigs an KI- und Render-Kunden vermieten.', use: 'Inspektor' },
  { id: 'abwaerme', nr: 37, cat: 'kst', name: 'Abwärme verkaufen', feel: 'Freischaltung', play: true, from: '2022-01-01', minTier: 5, learn: [{ via: 'pts', n: 3 }], desc: 'Ausbau „Fernwärme Sogn“: Die Fjordhalle heizt das Dorf, dafür sinkt der Strompreis um 20 %.', use: 'Firma (C) → Fjordhalle → Ausbauten', where: 'company' },
  { id: 'sensoren', nr: 38, cat: 'sof', name: 'Sensoren und Frühwarnung', feel: 'Handgriff', from: '2024-01-01', needs: ['wartung'], soon: 'Liste „Fällt bald aus“ mit „Vorher warten“', learn: [{ via: 'pts', n: 4 }], desc: 'Vorwarnung 3–7 Tage vor einem Ausfall.', use: 'Firma (C)' },
  { id: 'hydro', nr: 39, cat: 'kst', name: 'Hydro-Kühlkreislauf', feel: 'Freischaltung', from: '2024-06-01', soon: 'Hydro-Miner auch außerhalb von Rack und Container', learn: [{ via: 'pts', n: 3 }], desc: 'Trockenkühler und Verteiler für Hydro-Miner.', use: 'Shop → Miner' },
  { id: 'heizung', nr: 40, cat: 'kst', name: 'Heizungs-Miner für Lindental', feel: 'Freischaltung', from: '2022-10-01', soon: 'Alte ASICs heizen die Keller der Nachbarn', learn: [{ via: 'pts', n: 2 }], desc: 'Alte ASICs als Heizung zu den Nachbarn bringen.', use: 'Inspektor' },
  // ---------- Mehr in den Lieblings-Ästen (Antwort 20.11.: Löten, Takt & Spannung, OS & Firmware – „mehr noch“) ----------
  { id: 'luefter', nr: 42, cat: 'tun', name: 'Lüfterkurve', feel: 'Handgriff', play: true, from: '2011-01-01', needs: ['takt'], learn: [{ via: 'pts', n: 1 }], desc: 'Im BIOS jedes GPU-Rigs die Lüfterkurve wählen: „Leise“ (−3 % Strom, mehr Verschleiß) oder „Kühl“ (+3 % Strom, Ausfälle ×0,8).', use: 'Inspektor → Tuning', hint: 'Kühl, wenn es heiß ist und die Karten alt sind.', where: 'gpuRig' },
  { id: 'skript', nr: 43, cat: 'sof', name: 'Eigenes Miner-Skript', feel: 'Handgriff', play: true, from: '2012-01-01', needs: ['linux', 'takt'], learn: [{ via: 'pts', n: 2 }], desc: 'Ein Skript stellt die Profile eines Standorts jeden Tag selbst ein: Eco, wenn der Strom teuer oder es heiß ist, Turbo, wenn der Strom fast nichts kostet. Schalter je Standort im Inspektor.', use: 'Inspektor → Tuning → Skript', hint: 'Automatik für Takt und Spannung – du stellst es einmal ein.', where: 'gpuRig' },
  { id: 'psumod', nr: 44, cat: 'rep', name: 'Netzteil-Mod', feel: 'Mini-Spiel', play: true, from: '2012-01-01', needs: ['loeten'], learn: [{ via: 'pts', n: 2 }], desc: 'Am Rig das Netzteil umlöten (Mini-Spiel, 10 $ Material): 15 % mehr Leistung, damit mehr Karten an dasselbe Netzteil passen. Das Rig fällt etwas öfter aus. Nach 5 Mods als Routine.', use: 'Inspektor → Netzteil', hint: 'Spart das größere Netzteil – lohnt sich, wenn nur ein paar Watt fehlen.', where: 'rig' },
  // Dual-Mining bleibt ungebaut (und damit unsichtbar): Die klassischen Zweit-Coins (Decred, Siacoin, Pascal) fehlen in den echten Kursdaten,
  // und erfundene Kurse kommen nicht ins Spiel.
  { id: 'dual', nr: 45, cat: 'tun', name: 'Dual-Mining', feel: 'Handgriff', from: '2015-08-01', needs: ['takt'], soon: 'Grafikkarten schürfen zwei Coins gleichzeitig', learn: [{ via: 'pts', n: 2 }], desc: 'Zwei Algorithmen auf derselben Karte.', use: 'Inspektor → Coin' },
  { id: 'asictakt', nr: 49, cat: 'tun', name: 'ASIC-Takt im Web-Interface', feel: 'Handgriff', play: true, from: '2014-01-01', needs: ['asic', 'takt'], learn: [{ via: 'pts', n: 2 }], desc: 'Im Web-Interface der Miner die Chip-Frequenz wählen: Eco, Standard oder Turbo – wie bei den Grafikkarten, aber für ASICs.', use: 'Inspektor → Tuning (Miner und Regale)', hint: 'Im Bärenmarkt rettet Eco die Marge, bei billigem Strom bringt Turbo mehr Hash.', where: 'asic' },
  // ---------- Roboter (Antwort 20.11.: Mini-Spiele übernimmt später ein Roboter – kein Personal). Bis zur Halle macht man alles selbst. ----------
  { id: 'robo_usb', nr: 46, cat: 'rep', name: 'USB-Stick-Robo', feel: 'Freischaltung', play: true, minTier: 3, needs: ['image'], learn: [{ via: 'pts', n: 3 }], desc: 'Robi mit Ladestation (Shop → Roboter): Er fährt aus seiner Garage zu jedem neuen Rig am Standort, steckt den USB-Stick ein und spielt das Mining-Image auf. Jede Station versorgt ihren Standort; mehrere Robis schaffen mehr Fahrten am Tag (12 je Robi, mit Greifarm 24, mit Lötkopf 40). Braucht Platz und Strom, kein Gehalt.', use: 'Shop → Roboter', hint: 'Ab vielen Geräten je Standort spart er jeden Gang – in großen Hallen einfach einen zweiten Robi dazustellen.', where: 'shop:robo' },
  { id: 'robo_steck', nr: 47, cat: 'rep', name: 'Steck-Robo', feel: 'Freischaltung', play: true, minTier: 3, needs: ['robo_usb'], learn: [{ via: 'pts', n: 3 }], desc: 'Greifarm für Robi (im Inspektor nachrüsten, Stufe 2): Er baut Bausätze am Standort selbst aus dem Lager ein und tauscht bei streikenden Rigs den kaputten Riser oder die Karte (Fehlersuche) – zum Materialpreis. Doppelt so viele Fahrten am Tag.', use: 'Robi → Inspektor → Modul', where: 'robi' },
  { id: 'robo_loet', nr: 48, cat: 'rep', name: 'Löt-Robo', feel: 'Freischaltung', play: true, from: '2017-01-01', minTier: 3, needs: ['robo_steck', 'loeten'], learn: [{ via: 'pts', n: 4 }], desc: 'Lötkopf für Robi (teuer, Stufe 3, nach dem Greifarm): Er lötet kaputte Rigs, repariert mit „Hashboard-Reparatur“ auch Miner (Chip-Kette) und lötet mit „Netzteil-Mod“ überlastete Netzteile um – alles zum Materialpreis, 40 Fahrten am Tag. Sonst bleibt bei Defekten nur „Reparieren lassen“ zum vollen Preis.', use: 'Robi → Inspektor → Modul', hint: 'Spät und teuer, aber dann lötest du nie wieder selbst.', where: 'robi' },
];
// Tooltip im Baum: ein Satz, was man danach tun kann (Paket 18: kurz, ohne Zahlen)
const CAN = {
  bauen: 'Du kannst einen PC aus Einzelteilen zusammenschrauben.', cpustart: 'Du kannst mit dem Prozessor deine ersten Coins schürfen.', gpuminer: 'Du kannst mit Grafikkarten schürfen.',
  windows: 'Du kannst Windows auf neuen Rechnern installieren.', linux: 'Du kannst das Mining-Linux gratis installieren.', image: 'Du kannst neue Rigs mit dem USB-Stick in einem Klick einrichten.',
  fpga: 'Du kannst FPGA-Boards aufstellen und ihnen den Bitstream laden.', asic: 'Du kannst ASIC-Miner in Betrieb nehmen.', firmware: 'Du kannst ASIC-Miner mit eigener Firmware flashen.',
  fernwartung: 'Du kannst neue Rigs aus der Ferne einrichten lassen.', skript: 'Du kannst ein Skript die Profile eines Standorts wählen lassen.', takt: 'Du kannst Grafikkarten auf Eco oder Turbo stellen.',
  biosmod: 'Du kannst Polaris-Karten mit schnelleren Speicher-Timings flashen.', autotuning: 'Du kannst Miner ihre Spannung selbst finden lassen und ein Leistungsziel einstellen.', luefter: 'Du kannst die Lüfterkurve deiner Grafikkarten einstellen.',
  asictakt: 'Du kannst ASIC-Miner im Web-Interface auf Eco oder Turbo stellen.', wasser: 'Du kannst Rigs eine Wasserkühlung einbauen.', immersion: 'Du kannst Miner in ein Kühlbad tauchen.',
  lastman: 'Du kannst Standorte bei teurem Strom kurz abschalten lassen.', abwaerme: 'Du kannst die Wärme deiner Miner an die Fernwärme verkaufen.', wartung: 'Du kannst Rigs entstauben und die Wärmeleitpaste wechseln.',
  loeten: 'Du lötest kaputte Kondensatoren leichter und billiger aus.', stecken: 'Du findest kaputte Riser und Karten schneller – Dioden zeigen die Verdächtigen.', hashboard: 'Du kannst kaputte Hashboards von ASIC-Minern selbst reparieren.',
  psumod: 'Du kannst Netzteile umlöten, damit mehr Karten dranpassen.', robo_usb: 'Du kannst Robi aufstellen – er steckt neuen Rigs den USB-Stick ein.', robo_steck: 'Du kannst Robi einen Greifarm geben – er tauscht Riser und baut Bausätze ein.',
  robo_loet: 'Du kannst Robi einen Lötkopf geben – er repariert kaputte Geräte selbst.', riser: 'Du kannst Rigs mit Risern in Milchkisten und offene Rahmen bauen.', boerse: 'Du kannst Coins an der Börse verkaufen.',
  limit: 'Du kannst Verkäufe zu einem Wunschkurs vorbestellen.', cold: 'Du kannst Coins in einer Cold-Wallet sicher aufbewahren.',
};
for (const k of SKILLS) k.can = CAN[k.id] || k.use || '';
export const SKILL = Object.fromEntries(SKILLS.map((k) => [k.id, k]));
// Im Baum stehen nur gebaute Fähigkeiten (play: true); Voraussetzungen, die noch nicht gebaut sind, zählen nicht (keine Lücken, keine losen Linien)
export const TREE = SKILLS.filter((k) => k.play);
export const needsOf = (k) => (k?.needs || []).filter((n) => SKILL[n]?.play);

// Alte Techniken (Taste T bis 11/2026) → Fähigkeit und/oder Ausbau (docs/faehigkeiten.md, Abschnitt 8). Alte Spielstände: nichts Bezahltes geht verloren.
export const TECH_MAP = {
  undervolt: { skills: ['takt'], prof: 'eco' },
  pool: { skills: ['pool'] },
  dustfilter: { skills: ['wartung'], up: { werkstatt: 'dustmat', halle: 'dustmat', rz: 'dustmat', fjord: 'dustmat' } },
  firmware: { skills: ['firmware'], fw: true },
  aisle: { up: { halle: 'aisle', rz: 'aisle' } },
  immersion: { skills: ['immersion'], up: { rz: 'immersion', fjord: 'immersion' } },
  heatsale: { skills: ['abwaerme'], up: { fjord: 'fernwaerme' } },
  trading: { skills: ['lastman'] },
  predict: { skills: ['sensoren'] },
};
