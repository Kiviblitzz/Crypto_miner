// Personal der Hashwerk GmbH: Rollen, Eigenschaften, Namen (alle Namen fiktiv)
//
// Rolle: sal = Gehaltsfaktor (× Game.techSalary, das Grundgehalt), max = sinnvolle Höchstzahl (Wirkung stapelt nicht)
// Eigenschaft: nur Charakter (Schlagwort und Satz im Bewerbungsgespräch), keine Wirkung
// Techniker gibt es nicht mehr: Reparieren geht selbst (Mini-Spiele), mit Robi (Shop → Roboter) oder als „Reparieren lassen“ zum vollen Preis.

export const ROLES = {
  elec: { m: 'Elektriker', f: 'Elektrikerin', sal: 1.2, max: 1, eff: 'Stromausbau −20 %, warnt 3 Tage vor der Sicherung' },
  trader: { m: 'Händler', f: 'Händlerin', sal: 1.5, max: 1, eff: 'Verkauft nur über dem 7-Tage-Schnitt, Gebühr −0,5 %' },
};
export const STAFF_ROLES = Object.keys(ROLES); // je eine Stelle

export const TRAITS = {
  flink: { name: 'Flink', eff: 'Schnell bei der Sache' },
  gruendlich: { name: 'Gründlich', eff: 'Arbeitet sorgfältig' },
  sparfuchs: { name: 'Sparfuchs', eff: 'Achtet aufs Geld' },
};

// Kurze Sätze aus dem Bewerbungsgespräch (je Eigenschaft)
export const QUOTES = {
  flink: ['„Ich bin schneller am Rack, als die Sicherung fliegt."', '„Zwei Lüfter tauschen, bevor der Kaffee kalt ist? Gern."'],
  gruendlich: ['„Ich schraube lieber einmal richtig als dreimal schnell."', '„Staub ist mein persönlicher Feind."'],
  sparfuchs: ['„Ersatzteile? Hab ich noch welche im Kofferraum."', '„Warum neu kaufen, wenn man löten kann?"'],
};

// Vornamen mit Geschlecht (für die Rollenbezeichnung) und Nachnamen – bunt gemischt aus Lindental, Frankfurt und Sogn
export const FIRST = [
  ['Jana', 'f'], ['Murat', 'm'], ['Lena', 'f'], ['Ole', 'm'], ['Ingrid', 'f'], ['Tobias', 'm'], ['Svenja', 'f'], ['Kemal', 'm'],
  ['Mia', 'f'], ['Erik', 'm'], ['Sigrid', 'f'], ['Anton', 'm'], ['Nele', 'f'], ['Can', 'm'], ['Katrin', 'f'], ['Jonas', 'm'],
  ['Elif', 'f'], ['Lars', 'm'], ['Marit', 'f'], ['Felix', 'm'], ['Sophie', 'f'], ['Hakan', 'm'], ['Birgit', 'f'], ['Niklas', 'm'],
  ['Tuva', 'f'], ['Paul', 'm'], ['Greta', 'f'], ['Jannik', 'm'], ['Aylin', 'f'], ['Henrik', 'm'],
];
export const LAST = [
  'Krüger', 'Aksoy', 'Vogt', 'Nygaard', 'Lie', 'Brenner', 'Hahn', 'Doğan', 'Schuster', 'Solberg', 'Haugen', 'Weber', 'Busch',
  'Yılmaz', 'Engel', 'Pfeiffer', 'Kaya', 'Dahl', 'Berg', 'Graf', 'Lindner', 'Demir', 'Sommer', 'Ernst', 'Lunde', 'Rieger',
  'Hoffmann', 'Albrecht', 'Arslan', 'Strand',
];
