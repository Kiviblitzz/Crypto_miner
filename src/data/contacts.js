// Kontakte im Handy: Familie und Geschäftsleute, die dir fertig montierte Hardware liefern
//
// Am Anfang baust du alles selbst (Bausatz, Gehäuse, Teile-Shop). Fertig bestückte Geräte gibt es erst über Leute, die du kennenlernst:
//   Kemal (PC-Ecke) → fertige Mining-PCs (Tower) · Jonas (Rig-Bau aus dem Forum) → fertige Open-Frame-Rigs
//   Herr Lindqvist (Großhändler, ab GmbH oder Lagerhalle) → befristete Sammelangebote für Miner (wholesale: true, liefert keine Rig-Typen)
// Aufbau eines Geschäftskontakts:
//   id, name, biz (Laden/Firma), role (eine Zeile), offer (was er liefert), types (Rig-Typen, die er fertig bestückt liefert),
//   intro: Ereignis in events.js, unknown: Name, solange man ihn nicht kennt, soon: Hinweis im Katalog (gesperrt), meet(s, g, fmt): wie/wann man ihn kennenlernt,
//   can(s): ab wann er sich überhaupt melden kann, trigger(s, g): selbst gebaut (Anlass fürs Kennenlernen), due(s): spätester Tag (damit niemand hängen bleibt),
//   lines: { hello, first, order[], tier[], call } – Reaktionen (Handy-Nachrichten)
// Zustand: s.contacts[id] = { met: Tag (kennengelernt), on: Tag (Nummer gespeichert, 0 = abgelehnt), n: Aufträge }
import { toDay } from './history.js';

const KEMAL_DUE = toDay('2010-11-28'), JONAS_DUE = toDay('2011-05-20');
// Fertige Rigs (mit Grafikkarte) eines Typs an allen Standorten
const built = (s, g, types) => { let n = 0; for (const id of s.unlocked) for (const o of s.fac[id]?.objects || []) if (types.includes(o.type) && o.parts?.gpus?.length && g.pcReady(o)) n++; return n; };

// Stammkunde: der Montageaufschlag sinkt mit der Zahl der Aufträge (je Kontakt)
export const FEE_TIERS = [
  { n: 0, fee: 0.10, label: 'Neukunde' },
  { n: 3, fee: 0.07, label: 'Stammkunde' },
  { n: 8, fee: 0.05, label: 'Bester Kunde' },
];

export const CONTACTS = [
  {
    id: 'kemal', name: 'Kemal', biz: 'PC-Ecke Kemal', color: '#7fd1a8',
    role: 'Deniz’ Cousin · kleiner PC-Laden in der Lindentaler Bahnhofstraße',
    offer: 'Fertig bestückte Mining-PCs (Tower)', types: ['tower'], intro: 'kemal',
    unknown: 'Deniz’ Cousin', soon: 'Fertig bestückte PCs gibt’s bald bei Deniz’ Cousin. Bis dahin baust du selbst.', meet: () => 'Deniz stellt ihn dir vor, sobald dein zweiter PC läuft – den baust du selbst. Spätestens Ende November 2010.',
    can: () => true, trigger: (s, g) => built(s, g, ['tower', 'crate', 'frame6', 'frame8', 'frame12']) >= 2, due: () => KEMAL_DUE,
    lines: {
      hello: 'Hallo! Deniz hat schon viel erzählt. Sag einfach, was du brauchst – ich bau’s dir zusammen.',
      first: 'Dein erster PC von mir ist unterwegs! Kabel ordentlich verlegt, Treiber drauf, zwölf Stunden getestet.',
      order: ['Läuft? Läuft. Wie immer.', 'Hab die Wärmeleitpaste frisch gemacht. Geht aufs Haus.', 'Meine Mutter fragt, ob du auch mal was isst. Ich soll dir Börek mitgeben.', 'Noch einer! Wo stellst du die eigentlich alle hin?'],
      tier: ['', 'Du bist jetzt Stammkunde bei mir! Ab sofort nur noch 7 % Montage. Und der Kaffee ist gratis.', 'Bester Kunde der PC-Ecke! 5 % Montage – mehr Rabatt geht nicht, sonst bringt mich meine Mutter um.'],
      call: 'Na, doch keine Lust mehr auf Schraubenzieher? Kein Problem, ich bau dir alles fertig zusammen.',
    },
  },
  {
    id: 'jonas', name: 'Jonas', biz: 'Rahmenwerk · Rig-Bau', color: '#8fb8ff',
    role: 'aus dem Mining-Forum („Rahmenwerk“) · baut Open-Frame-Rigs in seiner Garage in Kassel',
    offer: 'Fertig bestückte Open-Frame-Rigs (Milchkiste, Alu- und Stahlrahmen)', types: ['crate', 'frame6', 'frame8', 'frame12'], intro: 'jonas',
    unknown: 'Jemand aus dem Mining-Forum', soon: 'Fertig bestückte Rigs gibt’s bald bei einem Rig-Bauer aus dem Forum. Bis dahin baust du selbst.', meet: (s, g, fmt) => `Er meldet sich, sobald dein erstes selbst gebautes Open-Frame-Rig läuft (z. B. eine Milchkiste im Keller) – ${s.unlocked.includes('keller') ? `spätestens am ${fmt(CONTACT.jonas.due(s))}` : 'spätestens einen Monat nach dem Umzug in den Keller'}.`,
    can: (s) => s.unlocked.includes('keller'), trigger: (s, g) => built(s, g, CONTACT.jonas.types) > 0, due: (s) => Math.max(JONAS_DUE, (s.since?.keller || 0) + 30),
    lines: {
      hello: 'Moin! Schick mir einfach, was du brauchst. Ich schweiße, verkabel und teste – du stellst nur noch hin.',
      first: 'Dein erstes Rig ist auf der Spedition! Riser doppelt geprüft, Kabelbinder in Orange.',
      order: ['Rig ist raus. Die Spedition kennt deine Adresse inzwischen auswendig.', 'Hab einen Lüfter mehr reingebaut. Sicher ist sicher.', 'Im Forum fragen sie, wer der Typ mit den vielen Rigs ist. Ich sag nix.', 'Meine Garage riecht nach Alu und Lötzinn. Ich liebe es.'],
      tier: ['', 'Drei Rigs! Du bist jetzt Stammkunde – 7 % Montage statt 10.', 'Du bist mein bester Kunde. Ab jetzt 5 % Montage. Und dein Name steht auf meiner Werkbank.'],
      call: 'Hey, schön, dass du dich meldest! Klar bau ich dir Rigs. Schick mir, was du brauchst.',
    },
  },
  {
    id: 'lindqvist', name: 'Herr Lindqvist', biz: 'Nordic Mining Supply', color: '#9fc6e8', wholesale: true,
    role: 'Mining-Großhändler aus Göteborg · beliefert Farmen in ganz Europa',
    offer: 'Sammelangebote für Miner – fester Preis unter Einzelpreis, nur ein paar Tage gültig', types: [], intro: 'lindqvist',
    callHint: 'Danach meldet er sich, wenn er einen Posten hat.', callLog: 'meldet sich mit Sammelangeboten',
    unknown: 'Ein Großhändler', soon: '', meet: () => 'Er meldet sich, sobald die Hashwerk GmbH gegründet ist oder du in die Lagerhalle ziehst.',
    can: (s, g) => g.staffAllowed(), trigger: (s) => Object.values(s.fac || {}).some((f) => (f.objects || []).some((o) => (o.items?.length || 0) >= 8)),
    due: (s) => Math.max(typeof s.flags?.gmbh === 'number' ? s.flags.gmbh : 0, s.since?.halle || 0) + 30,
    lines: {
      hello: 'God dag! Ab und zu habe ich größere Posten übrig. Dann melde ich mich – meistens nur für ein paar Tage. Wer schnell zusagt, zahlt weniger.',
      first: 'Tack! Freut mich, dass wir ins Geschäft kommen.',
      order: ['Wie immer per Spedition. Der Fahrer fragt, ob es bei Ihnen Kaffee gibt.', 'Der Posten kam direkt aus Shenzhen – noch eingeschweißt.', 'In Göteborg schneit es. Bei Ihnen hoffentlich nur Hashes.'],
      tier: ['', '', ''], // keine Montage-Stufen (wholesale), nur für das gemeinsame Format
      call: 'Ah, Hashwerk! Schön, dass Sie anrufen. Ich melde mich beim nächsten Posten.',
    },
  },
];
export const CONTACT = Object.fromEntries(CONTACTS.map((c) => [c.id, c]));
// Wer liefert welchen Rig-Typ fertig bestückt?
export const READY_BY = Object.fromEntries(CONTACTS.flatMap((c) => c.types.map((t) => [t, c.id])));

// Familie (Beziehungen s.rel, Wirkungen ab Stufe 3: REL_PERK in events.js)
export const FAMILY_CONTACTS = [
  { id: 'deniz', name: 'Deniz', role: (s) => (s.flags.denizLeft && !s.flags.denizReturned ? 'Bei MONOLITH in Zug' : s.flags.gmbh && s.chapter >= 3 ? 'CTO, Hashwerk GmbH' : 'Bester Kumpel, Hardware-Nerd') },
  { id: 'papa', name: 'Papa', role: (s) => (s.flags.shopLost && !s.flags.shopBack ? (s.flags.papaJob ? 'Reparaturen bei Hashwerk' : 'Elektro Brandt, 1985–2013') : 'Elektro Brandt, seit 1985') },
  { id: 'mama', name: 'Mama', role: (s) => (s.day >= toDay('2023-08-01') ? 'Im Ruhestand, Gewächshaus-Fan' : 'Erzieherin im Kindergarten') },
  { id: 'opa', name: 'Opa Heinz', role: () => 'Elektromeister a. D.' },
];
