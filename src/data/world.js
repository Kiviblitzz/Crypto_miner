// Standorte, Kapitel, Story-Nachrichten und Nachrichten-Ticker
import { toDay } from './history.js';

export const FACILITIES = [
  {
    id: 'kinder', tier: 0, name: 'Kinderzimmer', short: 'Zimmer', place: 'Lindental, Dachgeschoss', w: 4, d: 3.5, h: 2.6,
    power: [{ kw: 1.8, label: 'Mamas Limit' }, { kw: 3.6, cost: 250, label: 'Eigener Stromkreis' }],
    elec: 'household', elecMult: 1.0, rent: 0, cost: 0, baseCool: 600, ambient: 0, grid: 0.5, slots: 6,
    style: 'bedroom', desc: 'Dein Zimmer unterm Dach. Bett, Schreibtisch, ein altes Poster – und ein PC.',
  },
  {
    id: 'keller', tier: 1, name: 'Hobbykeller', short: 'Keller', place: 'Lindental, Elternhaus', w: 7, d: 5, h: 2.4,
    power: [{ kw: 4.5, label: 'Hausanschluss' }, { kw: 11, cost: 1500, label: 'Starkstrom 16 A' }, { kw: 22, cost: 4000, label: 'Starkstrom 32 A' }],
    elec: 'household', elecMult: 0.8, rent: 0, cost: 0, baseCool: 1600, ambient: -3, grid: 0.5, slots: 16,
    style: 'basement', desc: 'Kühl, staubig, mit Waschmaschine. Perfekt für die ersten Open-Frame-Rigs.',
  },
  {
    id: 'werkstatt', tier: 2, name: 'Werkstatt hinterm Laden', short: 'Werkstatt', place: 'Lindental, Hinterhof Elektro Brandt', w: 10, d: 8, h: 3.6,
    power: [{ kw: 25, label: 'Gewerbeanschluss' }, { kw: 60, cost: 12000, label: 'Verstärkter Anschluss' }, { kw: 120, cost: 30000, label: 'Eigener Trafo-Abgang' }],
    elec: 'household', elecMult: 0.72, rent: 450, cost: 0, baseCool: 5000, ambient: 0, grid: 0.5, slots: 40,
    style: 'workshop', desc: 'Papas alte Lagerwerkstatt mit Rolltor. Hier beginnt die ASIC-Ära.',
  },
  {
    id: 'halle', tier: 3, name: 'Lagerhalle', short: 'Halle', place: 'Gewerbegebiet Lindental-Nord', w: 24, d: 16, h: 7,
    power: [{ kw: 400, label: 'Mittelspannung' }, { kw: 1000, cost: 180000, label: 'Trafostation 1 MVA' }, { kw: 2000, cost: 400000, label: 'Zweite Trafostation' }],
    elec: 'household', elecMult: 0.45, rent: 2000, cost: 20000, baseCool: 50000, ambient: 0, grid: 0.5, slots: 60,
    style: 'warehouse', desc: 'Eine echte Halle. Stahlträger, Rolltore, Hallenstrahler. Zeit für Racks.',
  },
  {
    id: 'rz', tier: 4, name: 'Rechenzentrum', short: 'RZ', place: 'Frankfurt-Ost', w: 36, d: 24, h: 5,
    power: [{ kw: 2500, label: '2,5 MW' }, { kw: 6000, cost: 1500000, label: '6 MW Ausbau' }, { kw: 12000, cost: 3500000, label: '12 MW Umspannwerk' }],
    elec: 'household', elecMult: 0.27, rent: 30000, cost: 500000, baseCool: 220000, ambient: -1, grid: 0.5, slots: 200,
    style: 'datacenter', desc: 'Doppelboden, Kaltgang/Warmgang, Präzisionsklima. Hashwerk wird erwachsen.',
  },
  {
    id: 'fjord', tier: 5, name: 'Fjordhalle', short: 'Fjord', place: 'Sogn, Norwegen (Wasserkraft)', w: 64, d: 40, h: 12,
    power: [{ kw: 30000, label: '30 MW Wasserkraft' }, { kw: 60000, cost: 8000000, label: '60 MW' }, { kw: 120000, cost: 20000000, label: '120 MW' }],
    elec: 'fixed', elecFixed: 0.035, rent: 80000, cost: 3000000, baseCool: 3000000, ambient: -12, grid: 0.5, slots: 48,
    style: 'fjord', desc: 'Grüner Strom aus dem Wasserkraftwerk, eiskalte Luft vom Fjord. Das Endspiel.',
  },
];
export const FACILITY = Object.fromEntries(FACILITIES.map((f) => [f.id, f]));
// Hilfen für Bonusziele: Tagesergebnis eines Standorts, Zahl der Mining-Geräte
const facNet = (g, id) => { const sm = g.summary?.[id]; if (!sm || sm.tripped || !(sm.rev > 0)) return -1; return sm.rev * sm.throttle - Math.max(0, (sm.watt / 1000) * 24 - g.solarKwh(id)) * sm.elec - (FACILITY[id].rent / 30.4) * g.fx('rent', id); };
const devices = (s, g) => (g?.deviceCount ? g.deviceCount() : 0);

// Kapitel & Ziele (check bekommt den Spielzustand + Hilfsfunktionen)
export const CHAPTERS = [
  {
    title: 'Kapitel 1 – Das Kinderzimmer', unlock: 'keller', minDate: '2011-01-01', site: 'kinder', // volles Zimmer: Papa räumt den Keller sofort frei, sonst über die Feiertage
    intro: 'Oktober 2010. Papas Laden steckt in Schulden. Du hast ein leeres PC-Gehäuse, ein paar alte Teile und eine Idee.',
    goals: [
      { id: 'collect', text: 'Such die PC-Teile im Keller', doneText: 'Alle Teile gefunden! Bring sie hoch zu deinem\u00a0PC.', check: (s) => s.flags.miningStarted || !s.loose || !Object.keys(s.loose).length, progress: (s) => [4 - Object.keys(s.loose || {}).length, 4, 'parts'] },
      { id: 'pcbuild', text: 'Bau die Teile in deinen PC ein', doneText: '', check: (s) => s.flags.miningStarted || !!s.flags.pcBuilt, progress: (s) => { const pc = s.fac.kinder.objects.find((o) => o.type === 'tower'); const p = pc?.parts || {}; return [[p.mobo, p.cpu, p.gpus?.length, p.psu].filter(Boolean).length, 4, 'parts']; } },
      { id: 'look', text: 'Schalte deinen PC ein', doneText: 'Dein PC läuft!', check: (s) => s.flags.miningStarted },
      { id: 'sell', text: 'Verkaufe deine Bitcoin am Monitor', doneText: 'Erste Bitcoin verkauft!', check: (s) => s.stats.sold > 0 },
      { id: 'gpu', text: 'Bau eine zweite Grafikkarte ein', doneText: 'Zweite Grafikkarte läuft!', check: (s) => s.flags.boughtGpu },
      { id: 'rig2', text: 'Bau einen zweiten Mining-PC', doneText: 'Zwei PCs schürfen!', check: (s, h) => h.rigsAt('kinder') >= 2, progress: (s, h) => [h.rigsAt('kinder'), 2, 'n'] }, // Katalog B → Rigs → „Fertig bestückt“
      { id: 'fill1', text: 'Fülle dein Zimmer mit Mining-PCs', orDate: true, doneText: 'Dein Zimmer ist voll!', check: (s) => !!s.full?.kinder, progress: (s, h) => [h.fill('kinder'), 1, 'fill', 'kinder'] }, // alle Plätze belegt oder Strom am Limit
      { id: 'papa1', text: 'Bezahl Papas Stromrechnung', action: { label: '2.000 $ geben', cost: 2000, flag: 'papa1' }, check: (s) => s.flags.papa1 },
    ],
    waitText: 'Papa räumt den Hobbykeller über die Feiertage für dich frei – ab Januar gehört er dir.',
    bonus: [
      { id: 'b1top', until: '2010-12-31', from: (s) => !!s.goals.sell, text: 'Verkauf Bitcoin, solange der Kurs über 0,35 $ steht', check: (s) => (s.stats.soldMaxP || 0) >= 0.35, reward: { rel: { deniz: 1 }, xp: { trade: 40 }, text: 'Deniz: „0,39 $! Gutes Timing!“' } },
      { id: 'b1hold', from: (s) => !!s.goals.gpu, text: 'Halte 2.000 Bitcoin auf einmal', check: (s) => s.wallet.BTC.ex + s.wallet.BTC.cold >= 2000, progress: (s) => [s.wallet.BTC.ex + s.wallet.BTC.cold, 2000, 'coin'], reward: { rel: { opa: 1 }, text: 'Opa sammelt ja auch Briefmarken' } },
      { id: 'b1mine', from: (s) => !!s.goals.gpu, text: 'Schürfe insgesamt 10.000 Bitcoin', check: (s) => (s.stats.coins?.BTC || 0) >= 1e4, progress: (s) => [s.stats.coins?.BTC || 0, 1e4, 'coin'], reward: { rel: { mama: 1 }, text: 'Mama: „Und das alles mit unserem Strom?“' } },
    ],
  },
  {
    title: 'Kapitel 2 – Der Hobbykeller', unlock: 'werkstatt', minDate: '2012-06-01', site: 'keller', // voller Keller: die Werkstatt sofort (Papa redet mit Herrn Öztürk), sonst ab Juni 2012
    intro: 'Papa staunt. Der Keller gehört dir – solange die Waschmaschine weiterläuft.',
    goals: [
      { id: 'openrig', text: 'Bau dein erstes Rig im Keller', check: (s, h) => h.rigsAt('keller') > 0 }, // mit mindestens 1 GPU
      { id: 'rigs8', text: 'Betreibe 8 Mining-Rigs', check: (s, h) => h.rigsAll() >= 8, progress: (s, h) => [h.rigsAll(), 8, 'n'] }, // Zimmer + Keller
      { id: 'debt', text: 'Rette Papas Laden – Frist der Bank: Ende 2013', action: { label: '15.000 $ überweisen', cost: 15000, flag: 'debt' }, check: (s) => s.flags.debt || !!s.flags.shopLost }, // nach der Frist: Ereignis „ladenzu“ (events.js)
      { id: 'fill2', text: 'Fülle den Keller', orDate: true, doneText: 'Der Keller ist voll!', check: (s) => !!s.full?.keller, progress: (s, h) => [h.fill('keller'), 1, 'fill', 'keller'] }, // orDate: ab minDate auch ohne vollen Keller erledigt
    ],
    waitText: 'Papas Untermieter Zweirad Öztürk zieht erst im Juni 2012 aus der Werkstatt aus.',
    bonus: [
      // Bezug zu m1 („bis Ende 2013“): wer zwei Jahre früher zahlt, macht Papa sehr froh
      { id: 'b2early', until: '2011-12-31', text: 'Rette den Laden noch 2011 – zwei Jahre vor der Frist der Bank', check: (s) => !!s.flags.debt && s.day <= toDay('2011-12-31'), reward: { rel: { papa: 2 }, ach: 'deadline' } },
      { id: 'b2fuse', streak: 60, text: '60 Tage am Stück ohne rausgeflogene Sicherung – mit mindestens 3 kW im Keller', check: (s, h, g) => s.unlocked.includes('keller') && !s.fac.keller.tripped && (g.summary?.keller?.watt || 0) >= 3000, reward: { rel: { opa: 1 }, text: 'Opa: „Sauber verkabelt, Junge.“' } },
      { id: 'b2ltc', text: 'Schürfe 50.000 Litecoin', check: (s) => (s.stats.coins?.LTC || 0) >= 5e4, progress: (s) => [s.stats.coins?.LTC || 0, 5e4, 'coin'], reward: { rel: { deniz: 1 }, xp: { mining: 60 }, text: 'Deniz hatte den richtigen Riecher' } },
      { id: 'b2cold', text: 'Leg 100 Bitcoin in die Cold-Wallet', check: (s) => s.wallet.BTC.cold >= 100, progress: (s) => [s.wallet.BTC.cold, 100, 'coin'], reward: { rel: { mama: 1 }, text: 'Mama: „Endlich legst du mal was zurück.“' } },
    ],
  },
  {
    title: 'Kapitel 3 – Die Werkstatt', unlock: 'halle', minDate: '2015-06-01', site: 'werkstatt', // nicht mitten in den Hashpreis-Absturz 2014: wer im Sommer 2014 eine Halle füllt, verliert alles
    intro: 'Elektro Brandt ist gerettet, und Zweirad Öztürk ist ausgezogen. Papa drückt dir den Schlüssel zur Werkstatt hinterm Laden in die Hand.',
    introLost: 'Elektro Brandt gibt es nicht mehr. Herr Öztürk hat das Haus ersteigert und vermietet dir die Werkstatt hinterm alten Laden. Papa trägt die erste Kiste hinein.', // nach „ladenzu“
    goals: [
      { id: 'asic', text: 'Kauf deinen ersten ASIC-Miner', check: (s) => s.flags.boughtAsic },
      { id: 'miners20', text: 'Betreibe 20 Miner', check: (s, h) => h.miners() >= 20, progress: (s, h) => [h.miners(), 20, 'n'] }, // ASICs/FPGAs, einzeln oder im Regal
      { id: 'gmbh', text: 'Gründe die Hashwerk GmbH', action: { label: 'Gründen · 25.000 $', cost: 25000, flag: 'gmbh' }, check: (s) => s.flags.gmbh },
    ],
    waitText: 'Die Halle in Lindental-Nord wird erst im Juni 2015 fertig – der Bauträger ist pleite gegangen, ein neuer baut weiter.',
    bonus: [
      { id: 'b3cold', until: '2014-02-23', text: 'Hab mindestens die Hälfte deiner Coins in der Cold-Wallet (ab 10.000 $)', check: (s, h, g) => { const v = g.coinValue(); return v.all >= 1e4 && v.coldShare >= 0.5; }, reward: { rel: { papa: 1 }, text: 'Papa: „Wie früher bei der Sparkasse.“' } },
      { id: 'b3top', until: '2014-05-31', text: 'Verkauf Coins, solange Bitcoin über 1.000 $ steht', check: (s) => !!s.stats.sold1000, reward: { rel: { opa: 1 }, xp: { trade: 120 }, text: 'Opa: „Oben verkaufen. Kluger Junge.“' } },
      { id: 'b3eff', text: 'Bring deine SHA-256-Flotte unter 2.500 J/TH (ab 1 TH/s)', check: (s, h, g) => h.algoHash('sha256') >= 1e12 && g.fleetJTH() <= 2500, progress: (s, h, g) => [g.fleetJTH(), 2500, 'jth'], reward: { mod: [{ key: 'fail', mult: 0.95 }], xp: { hw: 80 }, text: 'Kühlere Miner: 5 % weniger Ausfälle' } },
      { id: 'b3doge', text: 'Schürfe eine Million Dogecoin', check: (s) => (s.stats.coins?.DOGE || 0) >= 1e6, progress: (s) => [s.stats.coins?.DOGE || 0, 1e6, 'coin'], reward: { rel: { deniz: 1 }, text: 'Deniz druckt Hunde-Sticker' } },
      { id: 'b3full', text: 'Fülle die Werkstatt bis unters Dach', check: (s) => !!s.full?.werkstatt, progress: (s, h) => [h.fill('werkstatt'), 1, 'fill', 'werkstatt'], reward: { rel: { papa: 1 }, xp: { hw: 100 }, text: 'Papa: „Die Kunden fragen, warum der Laden brummt.“' } },
      { id: 'b3solar', unit: 'kWp', text: 'Bau 30 kWp Solar aufs Werkstattdach', check: (s) => (s.fac.werkstatt.solar || 0) >= 30, progress: (s) => [s.fac.werkstatt.solar || 0, 30, 'n'], reward: { rel: { mama: 1 }, mod: [{ key: 'elec', mult: 0.95, fac: 'werkstatt' }], text: '−5 % Strom in der Werkstatt' } },
    ],
  },
  {
    title: 'Kapitel 4 – Die Lagerhalle', unlock: 'rz', minDate: '2017-06-01', site: 'halle',
    intro: 'Die Hashwerk GmbH zieht ins Gewerbegebiet Lindental-Nord. Deniz hat sich im Büro-Container schon den Platz am Fenster gesichert.',
    goals: [
      { id: 'tech', text: 'Stell einen Techniker ein', live: true, eod: true, check: (s) => s.staff.tech > 0 }, // zählt erst am Tagesende
      { id: 'rack12', text: 'Bestücke ein Rack komplett', check: (s, h) => h.fullRack() }, // 12 Geräte in einem 42U-Rack
      { id: 'fill4', text: 'Lagerhalle zu 75 % auslasten', orDate: '2018-03-01', check: (s, h) => h.use('halle') >= 0.75, progress: (s, h) => [h.use('halle'), 0.75, 'use', 'halle'] }, // volle Racks zählen ganz, halbe halb (Game.facUse); orDate: wer den Boom 2017 verpasst, muss im Winter 2018 nicht nachkaufen
    ],
    waitText: 'Das Frankfurter Rechenzentrum ist noch bis Juni 2017 an eine Bank vermietet.',
    bonus: [
      { id: 'b4bear', until: '2016-01-07', text: 'Überstehe den Bärenmarkt: Schließ 2015 mit Gewinn ab', check: (s) => { const Y = s.stats.y?.[2015]; return !!Y && Y.nw1 != null && Y.rev - Y.elec - Y.fix > 0; }, reward: { rel: { papa: 1 }, text: 'Papa: „Wer im Winter verdient, schafft alles.“' } },
      { id: 'b4plus', streak: 90, text: 'Halte die Halle 90 Tage am Stück im Plus', check: (s, h, g) => facNet(g, 'halle') > 0, reward: { mod: [{ key: 'rent', mult: 0.8, fac: 'halle' }], text: 'Der Vermieter senkt die Hallenmiete um 20 %' } },
      { id: 'b4eff', text: 'Bring deine SHA-256-Flotte unter 150 J/TH (ab 100 TH/s)', check: (s, h, g) => h.algoHash('sha256') >= 1e14 && g.fleetJTH() <= 150, progress: (s, h, g) => [g.fleetJTH(), 150, 'jth'], reward: { rel: { deniz: 1 }, text: 'Deniz: „Effizienz ist alles.“' } },
      { id: 'b4cover', unit: 'Geräte', text: 'Volle Techniker-Abdeckung bei mindestens 60 Geräten', check: (s, h, g) => s.staff.tech > 0 && g.techCoverage() >= 1 && devices(s, g) >= 60, progress: (s, h, g) => [devices(s, g), 60, 'n'], reward: { mod: [{ key: 'fail', mult: 0.95 }], text: '5 % weniger Ausfälle' } },
      { id: 'b4eth', text: 'Schürfe 500 Ethereum', check: (s) => (s.stats.coins?.ETH || 0) >= 500, progress: (s) => [s.stats.coins?.ETH || 0, 500, 'coin'], reward: { rel: { opa: 1 }, text: 'Opa: „Ether? Damit hat man früher operiert.“' } },
    ],
  },
  {
    title: 'Kapitel 5 – Das Rechenzentrum', unlock: 'fjord', minDate: '2020-06-01', site: 'rz',
    intro: 'Ein echtes Rechenzentrum in Frankfurt. In der Branche spricht sich herum, dass es Hashwerk gibt – sogar bei MONOLITH in Zug.',
    goals: [
      { id: 'mw6', text: 'Bau das Rechenzentrum auf 6 MW aus', check: (s) => s.fac.rz.power >= 1 },
      { id: 'fill5', text: 'Rechenzentrum zu 75 % auslasten', orDate: true, check: (s, h) => h.use('rz') >= 0.75, progress: (s, h) => [h.use('rz'), 0.75, 'use', 'rz'] }, // orDate: im Krypto-Winter 2018–2020 keine Pflicht – spätestens Juni 2020 geht es nach Norwegen
    ],
    waitText: 'Das Wasserkraftwerk in Sogn liefert erst ab Juni 2020 Strom für die Fjordhalle.',
    bonus: [
      { id: 'b5y18', until: '2019-01-07', text: 'Schließ den Krypto-Winter 2018 ohne Verlust ab', check: (s) => { const Y = s.stats.y?.[2018]; return !!Y && Y.nw1 != null && Y.rev - Y.elec - Y.fix >= 0; }, reward: { mod: [{ key: 'elec', mult: 0.95, fac: 'rz' }], text: 'Neuer Stromvertrag: −5 % Strom im RZ' } },
      { id: 'b5eff', text: 'Bring deine SHA-256-Flotte unter 60 J/TH (ab 5 PH/s)', check: (s, h, g) => h.algoHash('sha256') >= 5e15 && g.fleetJTH() <= 60, progress: (s, h, g) => [g.fleetJTH(), 60, 'jth'], reward: { rel: { deniz: 1 }, text: 'Deniz rahmt das Datenblatt ein' } },
      { id: 'b5fam', text: 'Halte die Familie zusammen: Papa, Mama, Opa und Deniz mindestens auf Stufe 2', check: (s) => ['papa', 'mama', 'opa', 'deniz'].every((k) => (s.rel?.[k] || 0) >= 2), reward: { rel: { mama: 1 }, text: 'Sonntagsessen bei Brandts' } },
      { id: 'b5eth', text: 'Halte 1.000 Ethereum', check: (s) => s.wallet.ETH.ex + s.wallet.ETH.cold >= 1000, progress: (s) => [s.wallet.ETH.ex + s.wallet.ETH.cold, 1000, 'coin'], reward: { rel: { papa: 1 }, xp: { trade: 150 }, text: 'Papa versteht jetzt, was ein Token ist' } },
      { id: 'b5mw12', text: 'Bau das Rechenzentrum auf 12 MW aus', check: (s) => s.fac.rz.power >= 2, reward: { rel: { opa: 1 }, text: 'Opa: „Zwölf Megawatt. Ich hab mal einen Bauernhof verkabelt.“' } },
    ],
  },
  {
    title: 'Kapitel 6 – Die Fjordhalle', unlock: null, minDate: '2021-01-01', site: 'fjord', // frühester Sieg: Neujahr 2021
    intro: 'Wasserkraft, Fjordluft, 30 Megawatt. Jetzt geht es gegen MONOLITH.',
    goals: [
      { id: 'eh1', text: 'Schaff 1 EH/s', check: (s, h) => h.algoHash('sha256') >= 1e18, progress: (s, h) => [h.algoHash('sha256'), 1e18, 'hash'] },
      { id: 'mono', text: 'Überhol MONOLITH', live: true, check: (s, h) => h.algoHash('sha256') > h.monolithHash(), progress: (s, h) => [h.algoHash('sha256'), h.monolithHash(), 'hash'] },
    ],
    // Wartedatum nur als Sperre gegen einen Sieg vor 2021; sonst stehen die Bonusziele direkt unter dem aktuellen Ziel
    waitText: 'Die erste Weltrangliste der Miner erscheint im Januar 2021 – bis dahin musst du vorn bleiben.',
    bonus: [
      { id: 'b6cold', until: '2022-11-10', text: 'Bring vier Fünftel deiner Coins in die Cold-Wallet (ab 1 Mio. $)', check: (s, h, g) => { const v = g.coinValue(); return v.all >= 1e6 && v.coldShare >= 0.8; }, reward: { rel: { opa: 1 }, text: 'Opa: „Börsen kommen und gehen.“' } },
      { id: 'b6mw60', text: 'Bau die Fjordhalle auf 60 MW aus', check: (s) => s.fac.fjord.power >= 1, reward: { rel: { papa: 1 }, text: 'Papa fliegt zum ersten Mal nach Norwegen' } },
      { id: 'b6eff', text: 'Bring deine SHA-256-Flotte unter 30 J/TH (ab 100 PH/s)', check: (s, h, g) => h.algoHash('sha256') >= 1e17 && g.fleetJTH() <= 30, progress: (s, h, g) => [g.fleetJTH(), 30, 'jth'], reward: { rel: { deniz: 1 }, text: 'Deniz: „Das ist Weltspitze.“' } },
      { id: 'b6full', text: 'Fülle die Fjordhalle mit Containern', check: (s) => !!s.full?.fjord, progress: (s, h) => [h.fill('fjord'), 1, 'fill', 'fjord'], reward: { rel: { deniz: 1 }, text: 'Deniz: „Mehr Fjord gibt es nicht.“' } },
      { id: 'b6heat', text: 'Lass die Abwärme ganz Sogn heizen', check: (s) => !!s.techs?.heatsale, reward: { rel: { mama: 1 }, text: 'Mama: „Ein ganzes Dorf warm – das ist mein Kind!“' } },
    ],
  },
];
// Standort erstmals voll (Game.checkFull): wer was dazu sagt, und wie es weitergeht
export const FULL_TALK = {
  kinder: { from: 'Mama', text: 'Du kannst ja nicht mal mehr zum Bett laufen! Und warm ist es hier wie im Backofen.', next: 'Papa räumt dir den Keller frei.' },
  keller: { from: 'Papa', text: 'Die Waschmaschine findet keinen Platz mehr, Kind. Ich red mit Herrn Öztürk wegen der Werkstatt.', next: 'Die Werkstatt hinterm Laden wartet.' },
  werkstatt: { from: 'Papa', text: 'Die Kunden fragen schon, warum der ganze Laden brummt. Hinten passt keine Kiste mehr rein.', next: 'In Lindental-Nord wird eine Lagerhalle gebaut.' },
  halle: { from: 'Deniz', text: 'Alle Rack-Plätze an der Stromschiene sind belegt. Wir brauchen ein richtiges Rechenzentrum.', next: 'In Frankfurt wird ein Rechenzentrum frei.' },
  rz: { from: 'Deniz', text: 'Frankfurt ist voll. Kaltgang, Warmgang, alles dicht. In Norwegen gibt es Wasserkraft und Platz ohne Ende.', next: 'Die Fjordhalle in Sogn ruft.' },
  fjord: { from: 'Deniz', text: 'Mehr Fjord gibt es nicht. Ab jetzt zählt nur noch, was in jedem Container steckt.', next: '' },
};
// Jahresrückblick (1. Januar): Titel je Jahr, danach Endlos-Titel
export const YEAR_TITLES = {
  2010: 'Ein PC und eine Idee', 2011: 'Milchkisten und 30 Dollar', 2012: 'Das erste Halving', 2013: 'ASIC-Goldrausch', 2014: 'Die GoxBank-Pleite',
  2015: 'Der lange Winter', 2016: 'Effizienz oder Ende', 2017: 'Das Krypto-Fieber', 2018: 'Die Eiszeit', 2019: 'Tauwetter', 2020: 'Lockdown und Halving',
  2021: 'China schaltet ab', 2022: 'Merge, Energiekrise, FXT', 2023: 'Durchatmen', 2024: 'Fonds und das vierte Halving', 2025: '126.000 Dollar', 2026: 'Im Heute angekommen',
};
export function yearTitle(y) {
  if (YEAR_TITLES[y]) return YEAR_TITLES[y];
  if ((y - 2012) % 4 === 0) return `Das ${(y - 2012) / 4 + 1}. Halving`;
  return ['Ohne Landkarte', 'Neuland', 'Eigene Wege', 'Weiter, immer weiter', 'Nebel über dem Fjord', 'Das Unbekannte'][(y - 2027) % 6] || 'Ein neues Jahr';
}
// Familienzeile im Jahresrückblick: Stimmung je Beziehungsstufe (≤ −2, −1, 0, 1–2, 3–4, 5)
export const FAMILY_MOOD = {
  papa: ['Papa spricht kaum noch mit dir.', 'Papa ist ein bisschen enttäuscht.', 'Papa fragt, wann du mal wieder zum Essen kommst.', 'Papa ist stolz auf dich.', 'Papa erzählt jedem Kunden von dir.', 'Papa hat dein Logo ins Schaufenster geklebt.'],
  mama: ['Mama macht sich große Sorgen um dich.', 'Mama findet, du arbeitest zu viel.', 'Mama hofft, dass du genug schläfst.', 'Mama schickt dir jede Woche Kuchen.', 'Mama strickt dir einen Hashwerk-Schal.', 'Mama zeigt allen Nachbarinnen deine Zeitungsartikel.'],
  opa: ['Opa brummelt nur noch.', 'Opa hält das alles für Spinnerei.', 'Opa will wissen, was du da eigentlich machst.', 'Opa nickt anerkennend.', 'Opa nennt dich jetzt „Herr Ingenieur“.', 'Opa redet im Skatclub nur noch von dir.'],
  deniz: ['Deniz meldet sich gar nicht mehr.', 'Deniz ist ein bisschen sauer.', 'Deniz schickt dir Memes, wie immer.', 'Deniz ist richtig gut drauf.', 'Deniz würde für dich durchs Feuer gehen.', 'Deniz nennt Hashwerk nur noch „unser Baby“.'],
};
export const moodTier = (v) => (v <= -2 ? 0 : v < 0 ? 1 : v === 0 ? 2 : v <= 2 ? 3 : v <= 4 ? 4 : 5);

// Handy-Nachrichten. when: Datum ODER cond(state, helpers)
export const MESSAGES = [
  { id: 'm0', date: '2010-10-01', from: 'Deniz', text: 'Ey, meine alte Grafikkarte schürft jetzt Bitcoin – Internetgeld, das Computer selbst herstellen!' },
  { id: 'm1', date: '2010-10-04', from: 'Papa', text: 'Die Bank will 15.000 $ bis Ende 2013. Sonst ist der Laden weg. Nicht dein Problem, Kind.' },
  { id: 'm2', date: '2010-10-09', from: 'Deniz', text: 'Tipp: Crimson-Karten minen viel schneller als Verdant. Die RHD 5870 ist gerade der Hit.' },
  { id: 'm3', cond: (s, h) => h.maxTemp() > 32, from: 'Mama', text: 'Warum ist es bei dir so warm? Und was brummt da?' },
  { id: 'm4', date: '2010-11-06', from: 'Deniz', text: '0,39 $ pro Bitcoin!! Ich glaub, ich spinne.' },
  { id: 'm5', cond: (s) => s.flags.papa1, from: 'Papa', text: 'Du hast die Stromrechnung bezahlt?? Na gut. Der Keller gehört dir. Strom zahlst du ab jetzt selbst.' },
  { id: 'm6', date: '2011-04-10', from: 'Deniz', text: 'Die Leute bauen jetzt Rigs in Milchkisten. Sieht wild aus, läuft aber.' },
  { id: 'm8', date: '2011-06-20', from: 'Deniz', text: 'GoxBank wurde gehackt! Lass nicht alles auf der Börse liegen.' },
  { id: 'm9', cond: (s, h) => h.facilityTripped(), from: 'Opa Heinz', text: 'Sicherung raus? Ich leg dir einen eigenen Stromkreis. Kostet aber.' },
  { id: 'm10', date: '2011-07-15', from: 'Deniz', text: 'Es gibt jetzt FPGA-Boards. Wenig Strom, viel Leistung. Aber teuer.' },
  { id: 'm11', date: '2011-10-08', from: 'Deniz', text: 'Neuer Coin: Litecoin. Da sind Grafikkarten richtig stark. Stell mal um!' },
  { id: 'm12', cond: (s) => s.flags.debt && s.day < toDay('2012-06-01'), from: 'Papa', text: 'Der Laden ist gerettet! Wenn Zweirad Öztürk im Juni 2012 auszieht, gehört die Werkstatt hinten dir. Wird’s dir im Keller vorher zu eng, red ich mit ihm.' },
  { id: 'm12b', cond: (s) => s.flags.debt && s.day >= toDay('2012-06-01') && !s.messages.some((m) => m.id === 'm12'), from: 'Papa', text: 'Der Laden ist gerettet! Zweirad Öztürk ist schon ausgezogen – die Werkstatt hinten gehört dir.' },
  { id: 'm13', date: '2012-11-28', from: 'Deniz', text: 'Halving! Nur noch 25 BTC pro Block. Unsere Erträge halbieren sich.' },
  { id: 'm14', date: '2013-02-01', from: 'Deniz', text: 'Die ersten ASICs sind da. Eine Kiste schafft so viel wie 100 Grafikkarten.' },
  { id: 'm15', date: '2013-11-29', from: 'Mama', text: 'Im Fernsehen reden sie über Bitcoin. Über 1.000 Dollar! Ist das dein Ding?' },
  { id: 'm15b', cond: (s) => !s.flags.debt && s.day >= toDay('2013-10-20') && s.day < toDay('2014-01-01'), from: 'Papa', text: 'Die Bank hat geschrieben: Wenn bis Silvester keine 15.000 $ da sind, wird der Laden versteigert. Ich weiß, ich hab gesagt, das ist nicht dein Problem …' },
  { id: 'm16', date: '2014-02-10', from: 'Deniz', text: 'GoxBank zahlt nichts mehr aus. Hol deine Coins in die Cold-Wallet!' },
  { id: 'm17', cond: (s) => s.day >= toDay('2014-03-12') && s.day <= toDay('2014-05-31') && (s.flags.gmbh || s.unlocked.includes('werkstatt')), from: 'Viktor Kral', text: 'Viktor Kral, MONOLITH Hash AG. Wir kaufen kleine Betriebe. Denken Sie drüber nach.' },
  { id: 'm18', cond: (s) => s.flags.gmbh, from: 'Deniz', text: 'Hashwerk GmbH! Ich kündige und steig ein. CTO? Sag ja.' },
  { id: 'm19', date: '2015-08-01', from: 'Deniz', text: 'Ethereum ist live! Unsere alten Grafikkarten sind wieder was wert.' },
  { id: 'm20', date: '2016-07-09', from: 'Deniz', text: 'Zweites Halving: 12,5 BTC pro Block. Nur sparsame ASICs lohnen sich noch.' },
  { id: 'mICO', cond: (s) => s.techs && s.techs.ico, from: 'Deniz', text: 'Unser ICO ist durch! Verkauf die Ethereum, bevor die Blase platzt.' },
  { id: 'm22', date: '2018-12-15', from: 'Deniz', text: 'Krypto-Winter. Und 3-GB-Karten können kein Ethereum mehr minen.' },
  { id: 'm23', date: '2019-11-30', from: 'Deniz', text: 'Monero läuft jetzt auf CPUs besser als auf Grafikkarten.' },
  { id: 'm24', date: '2020-03-13', from: 'Mama', text: 'Bleibt zuhause. Und pass auf dich auf.' },
  { id: 'm25', date: '2020-12-10', from: 'Deniz', text: '4-GB-Karten fallen bei Ethereum raus. Auf Ethereum Classic laufen sie noch.' },
  { id: 'm26', date: '2021-05-21', from: 'Deniz', text: 'China verbietet Mining! Die halbe Welt geht offline. Mehr Blöcke für uns!' },
  { id: 'm28', date: '2022-09-15', from: 'Deniz', text: 'The Merge: Ethereum braucht keine Miner mehr. Alle Grafikkarten suchen neue Coins.' },
  { id: 'm29', date: '2022-11-11', from: 'Deniz', text: 'FXT ist pleite. Hoffentlich lagen deine Coins in der Cold-Wallet!' },
  { id: 'm30', date: '2023-08-20', from: 'Deniz', text: 'Kaspa-ASICs sind da. Auch da sind Grafikkarten jetzt raus.' },
  { id: 'm31', date: '2024-01-11', from: 'Papa', text: 'Im Radio sagen sie, es gibt jetzt Bitcoin-Fonds. Du warst echt früh dran, Kind.' },
  { id: 'm32', date: '2024-04-20', from: 'Deniz', text: 'Viertes Halving: 3,125 BTC. Jetzt zählt nur noch Effizienz.' },
  { id: 'm33', date: '2025-10-06', from: 'Opa Heinz', text: '126.000 Dollar. Ich hab 2011 gesagt, verkauf. Gut, dass du nie auf mich hörst.' },
  { id: 'm34', cond: (s) => s.unlocked.includes('fjord'), from: 'Viktor Kral', text: 'Norwegen also. Mutig. Einholen werden Sie uns trotzdem nie.' },
  { id: 'm35', cond: (s) => s.flags.won, from: 'Deniz', text: 'WIR HABEN MONOLITH ÜBERHOLT. Vom Kinderzimmer bis hier. Wahnsinn.' },
  { id: 'm36', date: '2026-11-19', from: 'Deniz', text: 'Wir sind im Heute angekommen. Ab jetzt weiß keiner, was kommt.' },
  // ---------- Deniz-Tipps (ab Kapitel 2; tip: true – fallen z. B. bei „keine Tipps“ weg) ----------
  { id: 't_idle', tip: true, cond: (s) => s.chapter >= 1 && s.stats.idle > 0, from: 'Deniz', text: 'Eins deiner Geräte pausiert – der Strom kostet mehr, als es schürft. Stell es auf einen anderen Coin oder verkauf es, solange es noch was wert ist.' },
  { id: 't_hot', tip: true, cond: (s, h) => s.chapter >= 1 && h.maxTemp() > 34, from: 'Deniz', text: 'Über 34 Grad bei dir! Ab 38 drosseln die Karten, und heiße Hardware geht schneller kaputt. Im Katalog (B) gibt es Lüfter.' },
  { id: 't_trip', tip: true, cond: (s) => s.chapter >= 1 && !!s.flags.everTripped, from: 'Deniz', text: 'Im Firmenfenster (C) siehst du, wie viel dein Anschluss schafft. Erst den Strom ausbauen, dann neue Geräte hinstellen.' },
  { id: 't_halv12', tip: true, date: '2012-10-29', from: 'Deniz', text: 'In einem Monat ist Halving: nur noch halb so viele Bitcoin pro Block. Alte, stromhungrige Karten rechnen sich danach kaum noch.' },
  { id: 't_net14', tip: true, date: '2014-06-10', from: 'Deniz', text: 'Die Netz-Hashrate verdoppelt sich gerade alle zwei Monate. Ein Miner, der sich heute rechnerisch in 90 Tagen bezahlt, schafft das so nie. Lieber weniger kaufen – und nur die sparsamsten.' },
  { id: 't_halv16', tip: true, date: '2016-06-09', from: 'Deniz', text: 'Noch 30 Tage bis zum zweiten Halving. Verkauf ineffiziente Miner jetzt, solange sie noch Geld bringen.' },
  { id: 't_halv20', tip: true, date: '2020-04-11', from: 'Deniz', text: 'In 30 Tagen halbiert sich die Belohnung wieder. Rechne nach, welche Miner das überleben – nur die sparsamen.' },
  { id: 't_halv24', tip: true, date: '2024-03-21', from: 'Deniz', text: 'Viertes Halving in 30 Tagen. Danach zählt jedes Joule pro Terahash.' },
  { id: 't_halv28', tip: true, date: '2028-03-16', from: 'Deniz', text: 'Fünftes Halving in einem Monat. Ab dann nur noch 1,5625 BTC pro Block.' },
  { id: 't_dag3', tip: true, date: '2018-11-15', from: 'Deniz', text: 'In einem Monat wächst die Ethereum-DAG über 3 GB. Karten mit 3 GB fallen dann raus – verkaufen oder auf Ethereum Classic stellen.' },
  { id: 't_merge', tip: true, date: '2022-08-15', from: 'Deniz', text: 'In einem Monat kommt der Merge. Danach ist Ethereum-Mining vorbei – Grafikkarten jetzt verkaufen oder umstellen.' },
  { id: 't_neg', tip: true, cond: (s) => s.chapter >= 1 && s.cash < 0, from: 'Deniz', text: 'Dein Konto ist im Minus! Die Bank nimmt dafür happige Zinsen. Verkauf ein paar Coins oder schalte unrentable Geräte ab.' },
  { id: 't_halle', tip: true, cond: (s) => s.unlocked.includes('halle'), from: 'Deniz', text: 'Willkommen in der Halle! Ein 42U-Rack fasst 12 Miner – viel platzsparender als Kisten auf dem Boden.' },
  { id: 't_fjord', tip: true, cond: (s) => s.unlocked.includes('fjord'), from: 'Deniz', text: 'Fjordhalle! Ein Mining-Container fasst 200 Miner und kühlt sich selbst. Damit füllst du 30 MW.' },
];

// Nachrichten-Ticker. effect: optionale Spielwirkung
export const NEWS = [
  ['2010-10-01', 'GPU-Mining-Software jetzt öffentlich – Netz-Hashrate explodiert'],
  ['2010-11-06', 'Bitcoin erreicht 0,39 $ – Allzeithoch'],
  ['2010-11-27', 'Erster Mining-Pool geht online'],
  ['2011-02-09', 'Bitcoin erreicht erstmals Parität mit dem US-Dollar'],
  ['2011-06-08', 'Bitcoin bei 30 $! Medien berichten weltweit'],
  ['2011-06-19', 'GoxBank gehackt – Kurs kurzzeitig auf 1 Cent'],
  ['2011-07-01', 'FPGA-Miner kommen auf den Markt'],
  ['2011-10-07', 'Litecoin (Scrypt) startet – „Silber zum Bitcoin-Gold"'],
  ['2012-11-28', 'Erstes Halving: Blockbelohnung sinkt auf 25 BTC'],
  ['2013-02-01', 'Erste ASIC-Miner ausgeliefert: Glacier A1 mit 66 GH/s'],
  ['2013-04-10', 'Bitcoin-Blase platzt: von 230 $ auf 70 $'],
  ['2013-11-28', 'Bitcoin über 1.000 $!'],
  ['2013-12-06', 'Dogecoin startet – ein Hund erobert das Internet'],
  ['2014-02-24', 'GoxBank insolvent! Kunden verlieren ihre Coins', { exchangeLoss: 0.7 }],
  ['2014-04-18', 'Monero startet – Privatsphäre-Coin mit CryptoNight'],
  ['2014-09-11', 'Dogecoin führt Merged Mining mit Litecoin ein'],
  ['2015-01-14', 'Bitcoin fällt auf 180 $ – Miner geben auf'],
  ['2015-07-01', 'Hitzewelle: bis 38 °C – Miner kämpfen mit der Kühlung'],
  ['2015-07-30', 'Ethereum geht live – Smart Contracts & Ethash'],
  ['2016-06-15', 'Swarm S9 vorgestellt: 13,5 TH/s – Effizienz-Sprung'],
  ['2016-07-09', 'Zweites Halving: 12,5 BTC pro Block'],
  ['2016-07-20', 'Ethereum spaltet sich: Ethereum Classic entsteht'],
  ['2016-10-28', 'Zcash startet – erste Coins für tausende Dollar gehandelt'],
  ['2017-06-15', 'GPU-Knappheit: Miner kaufen Grafikkarten leer'],
  ['2017-07-15', 'ICO-Fieber: Start-ups sammeln Milliarden in Ethereum ein'],
  ['2017-12-17', 'Bitcoin erreicht 19.500 $ – Krypto-Fieber weltweit'],
  ['2018-01-03', 'Ravencoin startet – ASIC-resistent'],
  ['2018-02-06', 'Crash: Bitcoin halbiert sich in sieben Wochen'],
  ['2018-07-24', 'Dürresommer: zwei Wochen Hitzewelle – Rechenzentren am Limit'],
  ['2018-12-15', 'Krypto-Winter: Bitcoin bei 3.200 $'],
  ['2019-06-26', 'Bitcoin zurück bei 13.000 $'],
  ['2019-07-23', 'Hitzerekord: über 40 °C in Deutschland'],
  ['2019-11-30', 'Monero wechselt auf RandomX – CPU-Mining ist zurück'],
  ['2020-03-12', 'Corona-Crash: Bitcoin fällt an einem Tag um 40 %'],
  ['2020-05-11', 'Drittes Halving: 6,25 BTC pro Block'],
  ['2020-12-31', 'Bitcoin schließt das Jahr bei 29.000 $'],
  ['2021-02-18', 'Hersteller drosseln Mining-Leistung neuer Karten (LHR)'],
  ['2021-04-14', 'Bitcoin bei 64.000 $ – Krypto-Börse geht an die Nasdaq'],
  ['2021-05-08', 'Dogecoin bei 0,70 $ – der Hund ist Milliarden wert'],
  ['2021-05-21', 'China verbietet Krypto-Mining – Hashrate bricht ein'],
  ['2021-08-15', 'GPU-Preise auf Rekordniveau: VTX 3080 für 1.600 $ gehandelt'],
  ['2021-11-07', 'Kaspa startet – ein Block pro Sekunde'],
  ['2021-11-10', 'Bitcoin-Allzeithoch: 68.800 $'],
  ['2022-05-12', 'Stablecoin-Kollaps reißt den Markt mit'],
  ['2022-07-17', 'Hitzewelle und Energiekrise: Strom so teuer wie nie'],
  ['2022-09-15', 'The Merge: Ethereum wechselt zu Proof-of-Stake – GPU-Mining endet'],
  ['2022-11-11', 'Börse FXT bricht zusammen – Milliarden Kundengelder weg', { exchangeLoss: 0.85 }],
  ['2022-12-21', 'Großer Miner „CoreHash" insolvent – zu viele Kredite, zu wenig Hashprice'],
  ['2023-08-15', 'Kaspa-ASICs ausgeliefert – GPUs verlieren'],
  ['2024-01-11', 'US-Behörde genehmigt Spot-Bitcoin-ETFs'],
  ['2024-03-14', 'Bitcoin erreicht 73.000 $'],
  ['2024-04-20', 'Viertes Halving: 3,125 BTC pro Block'],
  ['2024-12-17', 'Bitcoin knackt 100.000 $'],
  ['2025-10-06', 'Neues Allzeithoch: Bitcoin bei 126.000 $'],
  ['2025-11-10', 'Zcash verzehnfacht sich – Privacy-Coins im Fokus'],
  ['2026-01-24', 'Wintersturm in den USA: Miner schalten ab, Hashrate fällt stark'],
  ['2026-02-28', 'Bitcoin rutscht unter 66.000 $'],
  ['2026-11-19', 'Gegenwart erreicht – ab jetzt ist der Markt unvorhersehbar'],
].map(([d, t, effect]) => ({ day: toDay(d), text: t, effect }));

export const START_DAY = toDay('2010-10-01');

// Technologien (wie die Forschung im Vorbild): einmal kaufen, wirken dauerhaft
export const TECHS = [
  { id: 'undervolt', name: 'Undervolting-Guide', icon: '🪫', date: '2010-12-01', cost: 300, desc: 'GPU-Rigs brauchen 12 % weniger Strom bei gleicher Leistung.', fx: { rigPower: 0.88 } },
  { id: 'pool', name: 'Eigener Pool-Server', icon: '🖧', date: '2011-06-01', cost: 2500, desc: 'Keine Poolgebühren mehr: +2 % Ertrag auf alles.', fx: { rev: 1.02 } },
  { id: 'dustfilter', name: 'Staubfilter & Wartungsplan', icon: '🧹', date: '2012-06-01', cost: 6000, minTier: 2, desc: '35 % weniger Ausfälle.', fx: { fail: 0.65 } },
  { id: 'firmware', name: 'Hashwerk-ASIC-Firmware', icon: '💾', date: '2016-01-01', cost: 60000, minTier: 3, desc: 'Eigene Firmware: ASICs +6 % Hashrate, −8 % Strom.', fx: { asicHash: 1.06, asicPower: 0.92 } },
  { id: 'ico', hidden: true, name: 'Eigener Coin: HashwerkToken-ICO', icon: '🪙', date: '2017-06-01', cost: 400000, minTier: 3, desc: 'Eigener Token. Käufer zahlen in Ethereum.', fx: {} }, // jetzt ein Ereignis (events.js); bleibt für alte Spielstände
  { id: 'aisle', name: 'Kalt-/Warmgang-Einhausung', icon: '🧊', date: '2017-06-01', cost: 250000, minTier: 3, desc: '+35 % Kühlleistung in allen Standorten.', fx: { cool: 1.35 } },
  { id: 'immersion', name: 'Immersionskühlung', icon: '🛢️', date: '2020-09-01', cost: 1500000, minTier: 4, desc: 'Miner baden in Kühlflüssigkeit: +10 % Hashrate (Übertakten), 30 % weniger Ausfälle.', fx: { asicHash: 1.10, fail: 0.7 } },
  { id: 'heatsale', name: 'Abwärme an Fernwärmenetz', icon: '♨️', date: '2022-01-01', cost: 3000000, minTier: 5, desc: 'Die Fjordhalle heizt das Dorf: −20 % Stromkosten in der Fjordhalle.', fx: { fjordElec: 0.8 } },
  { id: 'trading', name: 'Stromhandels-Abteilung', icon: '📉', date: '2023-06-01', cost: 8000000, minTier: 4, desc: 'Flexibler Einkauf & Abschalten bei Preisspitzen: −10 % Strom überall.', fx: { elec: 0.9 } },
  { id: 'predict', name: 'KI-Wartung (Predictive Maintenance)', icon: '🤖', date: '2024-01-01', cost: 5000000, minTier: 4, desc: 'Sensoren erkennen Defekte vorher: −50 % Ausfälle.', fx: { fail: 0.5 } },
];

// Funktionen, die nach und nach freigeschaltet werden (mit kurzer Erklärung)
export const FEATURES = {
  phone: { title: 'Handy', key: 'P', text: 'Nachrichten liest du mit <kbd>P</kbd>.' },
  skills: { title: 'Fähigkeiten', key: 'J', text: 'Was du tust, lernst du. <kbd>J</kbd> zeigt deine Fähigkeiten.' },
  market: { title: 'Börse', key: 'M', text: 'Am <b>Monitor</b> verkaufst du Bitcoin für Dollar.' },
  build: { title: 'Bauen', key: 'B', text: '<kbd>B</kbd> öffnet den Katalog. Klick stellt hin.' },
  speed2: { title: 'Zeitraffer', key: '2', text: '<kbd>1</kbd> <kbd>2</kbd> Tempo, <kbd>Leertaste</kbd> Pause.' },
  heat: { title: 'Wärmebild', key: 'H', text: '<kbd>H</kbd> zeigt, wo es zu heiß wird.' },
  rigs: { title: 'Rigs', key: 'B', text: 'Neu im Katalog <kbd>B</kbd>.' },
  autosell: { title: 'Auto-Verkauf', key: 'E', text: 'Neue Coins werden automatisch verkauft.' },
  speed3: { title: 'Schneller vorspulen', key: '3', text: '<kbd>3</kbd> <kbd>4</kbd> spulen schneller vor.' },
  company: { title: 'Firma', key: 'C', text: '<kbd>C</kbd>: Strom ausbauen, Kosten sehen.' },
  coins: { title: 'Mehr Coins', key: 'E', text: 'Am Gerät wählst du, was es schürft.' },
  cold: { title: 'Cold-Wallet', key: 'E', text: 'Sicher vor Börsenpleiten. Findest du in der Börse.' },
  map: { title: 'Karte', key: 'K', text: '<kbd>K</kbd> zeigt alle Standorte.' },
  techs: { title: 'Technik', key: 'T', text: '<kbd>T</kbd>: An Opas Werkbank Verbesserungen austüfteln.' },
  ranking: { title: 'Logbuch', key: 'L', text: '<kbd>L</kbd>: Rangliste, Erfolge und Chronik.' },
  loan: { title: 'Bankkredit', key: 'C', text: 'Die Bank leiht dir Geld. Mit Zinsen.' },
  buycoins: { title: 'Coins kaufen', key: 'E', text: 'In der Börse kannst du jetzt auch kaufen.' },
};

// Ausbauten je Standort: einmal kaufen (cost) oder laufend bezahlen (monthly, negativ = Einnahme).
// fx: Faktoren je Standort – coolMul (Kühlung gesamt), coolAdd (W), rent, elec, cap, hash (über Game.fx(key, fac)).
// secure: Diebstahlschutz (Game.facSecure), days: läuft nach so vielen Tagen aus, cancel: kündbar, keepRent: Einmotten spart keine Miete,
// rel: Beziehungen beim Kauf, obsoleteBy: entfällt, sobald dieser Ausbau gekauft ist. Kaufpreise ≈ 10 Jahresmieten (Geld-Senke für später).
export const UPGRADES = {
  kinder: [
    { id: 'skylight', name: 'Dachfensterlüfter', cost: 80, fx: { coolAdd: 400 }, eff: '+400 W Kühlung', desc: 'Ein kleiner Lüfter im Dachfenster schiebt die warme Luft nach draußen.' },
  ],
  keller: [
    { id: 'nightmeter', name: 'Opas Nachtstromzähler', cost: 400, fx: { elec: 0.8 }, eff: 'Strom −20 % im Keller', desc: 'Der alte Zähler der Nachtspeicherheizung hängt noch im Heizungskeller. Opa klemmt die Rigs auf den Nachtstrom-Tarif.' },
    { id: 'shaft', name: 'Opas Abluftschacht', cost: 600, fx: { coolMul: 1.3 }, eff: 'Kühlung ×1,3', desc: 'Opa Heinz mauert einen Schacht vom Heizungsraum bis über das Dach.' },
    { id: 'bars', name: 'Fenstergitter', cost: 150, secure: true, eff: 'Diebstahlschutz', desc: 'Stahlgitter vor den Kellerfenstern. Sieht nach Gefängnis aus, hält aber.' },
  ],
  werkstatt: [
    { id: 'doorvent', name: 'Rolltor-Lüftung', cost: 1500, fx: { coolMul: 1.25 }, eff: 'Kühlung ×1,25', desc: 'Lamellen im Rolltor und ein Abluftgebläse unterm Dach.' },
    { id: 'alarm', name: 'Alarmanlage', cost: 900, secure: true, eff: 'Diebstahlschutz', desc: 'Bewegungsmelder und eine Sirene, die halb Lindental weckt.' },
    { id: 'buyshop', name: 'Werkstatt von Papa kaufen', cost: 45000, fx: { rent: 0 }, rel: { papa: 1 }, eff: 'Keine Miete mehr · Papa freut sich', desc: 'Papa verkauft dir die Werkstatt. Das Geld steckt er in den Laden.', lost: { name: 'Werkstatt von Herrn Öztürk kaufen', rel: null, eff: 'Keine Miete mehr', desc: 'Herr Öztürk verkauft dir die Werkstatt hinterm alten Laden. Papa hilft beim Umschreiben der Schilder.' } },
  ],
  halle: [
    { id: 'lease5', name: '5-Jahres-Mietvertrag', cost: 4000, days: 1826, keepRent: true, obsoleteBy: 'buyhall', fx: { rent: 0.75 }, eff: 'Miete −25 % für 5 Jahre', desc: 'Lange Bindung, kleinere Miete. Einmotten spart dann aber keine Miete mehr.' },
    { id: 'guard', name: 'Wachdienst', monthly: 1200, cancel: true, secure: true, eff: 'Diebstahlschutz', desc: 'Nachts fährt ein Wachmann zweimal ums Gelände. Monatlich kündbar.' },
    { id: 'roofvent', name: 'Dachventilatoren', cost: 25000, fx: { coolMul: 1.3 }, eff: 'Kühlung ×1,3', desc: 'Sechs große Ventilatoren im Hallendach ziehen die Hitze ab.' },
    { id: 'buyhall', name: 'Halle kaufen', cost: 240000, fx: { rent: 0 }, eff: 'Keine Miete mehr', desc: 'Der Vermieter will in Rente. Die Halle gehört dann dir.' },
  ],
  rz: [
    { id: 'diesel', name: 'Notstromdiesel', cost: 400000, ups: true, fx: { cap: 1.1 }, eff: 'USV · +10 % Anschluss', desc: 'Ein Diesel im Hof fängt Stromausfälle ab und deckt Lastspitzen.' },
    { id: 'green', name: 'Ökostrom-Vertrag', cost: 250000, fx: { elec: 0.88 }, eff: 'Strom −12 %', desc: 'Zehn Jahre Windstrom aus der Nordsee zum Festpreis.' },
    { id: 'buyrz', name: 'Rechenzentrum kaufen', cost: 3600000, fx: { rent: 0 }, eff: 'Keine Miete mehr', desc: 'Der Betreiber zieht nach Amsterdam und verkauft das Gebäude.' },
  ],
  fjord: [
    { id: 'icechim', name: 'Eiskamin', cost: 1500000, fx: { coolMul: 1.2, hash: 1.03 }, eff: 'Kühlung ×1,2 · +3 % Hashrate', desc: 'Ein Schacht saugt Gletscherluft an. Die Miner takten etwas höher.' },
    { id: 'salmon', name: 'Lachszucht mit Abwärme', cost: 2500000, monthly: -60000, eff: '+60.000 $/Monat', desc: 'Die Abwärme hält die Becken der Lachszucht nebenan warm. Die zahlt dafür.' },
    { id: 'buyfjord', name: 'Fjordhalle kaufen', cost: 9600000, fx: { rent: 0 }, eff: 'Keine Miete mehr', desc: 'Die Gemeinde Sogn verkauft dir die Halle samt Kai.' },
    { id: 'hydro', name: 'Anteil am Wasserkraftwerk', cost: 30000000, fx: { elec: 0.6 }, eff: 'Strom −40 % in der Fjordhalle', desc: 'Ein Drittel des Kraftwerks gehört dann Hashwerk. Strom fast zum Selbstkostenpreis.' },
  ],
};

// Schwierigkeitsgrade (Faktoren über Game.diff(key))
export const DIFFICULTY = {
  easy: { name: 'Gemütlich', desc: 'Mehr Startgeld, weniger Pech, günstigere Hardware, billigerer Strom, 10 % mehr Ertrag und ein langsamerer Rivale.', cash: 500, wear: 0.5, dispo: 0.5, exLoss: 0.5, badEvents: 0.6, hw: 0.9, elec: 0.85, rev: 1.1, monolith: 0.8, tips: 1 },
  normal: { name: 'Normal', desc: 'So, wie die Geschichte gedacht ist.', cash: 300, wear: 1, dispo: 1, exLoss: 1, badEvents: 1, hw: 1, tips: 1 },
  hard: { name: 'Historiker', desc: 'Mehr Verschleiß, teurer Dispo, 10 % teurerer Strom, öfter Pech, keine Tipps.', cash: 300, wear: 1.3, dispo: 1.5, exLoss: 1, badEvents: 1.3, hw: 1, elec: 1.1, tips: 0 },
};
