// Lebendige Welt: Gespräche mit der Familie (NPCs in der 3D-Welt) und Fundstücke (Erinnerungsstücke)
//
// TALK: [{ who, ch?: [Kapitelindizes], cond?(s, h, g, fac), lines: [string | (s, h, g, fac) => string] }]
//   who: papa | opa | deniz | tech  ·  ch: s.chapter (0 erste Wohnung … 5 Fjord, 6 = nach dem Sieg)
//   fac: Standort, an dem das Gespräch stattfindet. Einträge mit cond (Ereignisse, Kurs, Hitze …) haben Vorrang.
// KEEPSAKES: [{ id, fac, spot: [x, y, z, ry], label, name, text, gain, reward (Game.applyFx), cond?(s) }]
// Zustand: s.talk { last, week, joy, got, seen, line } und s.keep { id: Tag }
import { toDay, inHeatwave, HALVINGS } from './history.js';

const nf = (d) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const usd = (v) => (v >= 100 ? `${nf(0).format(v)} $` : `${nf(2).format(v)} $`);
const T = {}; const D = (iso) => (T[iso] ??= toDay(iso));
const between = (s, a, b) => s.day >= D(a) && s.day <= D(b);
const month = (s) => new Date(s.day * 864e5).getUTCMonth() + 1;
const trend = (g, days = 30) => { const a = g.price('BTC', g.s.day - days), b = g.price('BTC'); return a > 0 && b > 0 ? b / a : 1; };
const up = (s, h, g) => trend(g) > 1.25;
const down = (s, h, g) => trend(g) < 0.78;
const hot = (s, h, g, fac) => inHeatwave(s.day) || (s.fac[fac]?.temp || 21) > 32;
const halving = (s) => HALVINGS.some((d) => s.day >= d - 21 && s.day <= d + 10);
const recent = (s, id, n = 45) => (s.ev?.log || []).some((l) => l.id === id && s.day - l.d <= n);
const rel = (s, k) => s.rel?.[k] || 0;
const winter = (s) => [12, 1, 2].includes(month(s));
const lost = (s) => !!s.flags?.shopLost && !s.flags.shopBack; // Laden verloren (Ereignis „ladenzu“), nicht zurückgekauft
const L = (a, b) => (s) => (lost(s) ? b : a); // Zeile mit Variante ohne Laden
const broken = (s, fac) => (s.fac[fac]?.objects || []).some((o) => o.broken || o.items?.some((i) => i.b));

// Wer steht da? (Name, Rolle, Anrede im Prompt)
export const PEOPLE = {
  papa: { name: 'Papa', full: 'Frank Brandt', role: (s) => (s && lost(s) ? (s.flags.papaJob ? 'Reparaturen bei Hashwerk' : 'Elektro Brandt, 1985–2013') : 'Elektro Brandt, seit 1985'), as: 'Papa' },
  opa: { name: 'Opa Heinz', full: 'Heinz Brandt', role: () => 'Elektromeister a. D.', as: 'Opa' },
  deniz: { name: 'Deniz', full: 'Deniz', role: (s) => (s.flags.gmbh && s.chapter >= 3 ? 'CTO, Hashwerk GmbH' : 'Bester Kumpel, Hardware-Nerd'), as: 'Deniz' },
  tech: { name: 'Techniker', full: 'Techniker', role: () => 'Hashwerk GmbH', as: 'dem Techniker' },
};
// Deniz ist zu MONOLITH gegangen: an seinem Platz steht eine Aushilfe
export const talkWho = (s, who) => (who === 'deniz' && s.flags.denizLeft && !s.flags.denizReturned ? 'tech' : who);

export const TALK = [
  // ===================== Opa Heinz (im Hobbyraum im Keller deines Hauses – er hat das Haus 1971 verkabelt) =====================
  { who: 'opa', ch: [1, 2], lines: [
    'Starkstrom im Keller. Deine Oma hätte mich dafür erschlagen. Und dann gefragt, ob es jetzt wärmer wird.',
    'Ich hab 1962 mein erstes Radio gebaut. Röhren, Lötzinn, verbrannte Finger. Du machst im Grunde dasselbe, nur mit mehr Lüftern.',
    'Sicherungen fliegen nicht einfach so raus, Junge. Die wollen dir was sagen. Meistens: zu viel.',
    'Mittwochs wäscht Frau Kowalczyk aus dem Vorderhaus. Dann nimmst du zwei Rechner vom Netz, sonst haben wir ihre Wäsche und deine Bitcoin auf dem Gewissen.',
    'Kabel immer ordentlich verlegen. Kabelsalat ist der Anfang vom Ende. Das gilt übrigens auch fürs Leben.',
    'Dein Rechner löst also Rätsel, und wer zuerst fertig ist, kriegt Geld? Früher hieß das Kreuzworträtsel. Da gab es einen Kugelschreiber.',
    'Die Leitungen hier unten sind von 1971. Hab ich selbst gezogen, für den alten Krause, den Vater von deinem Vermieter. Die halten länger als mancher Neubau.',
  ] },
  { who: 'opa', ch: [3, 4, 5, 6], lines: [
    'Die Halle in Lindental-Nord? Da hab ich 1974 die Hauptverteilung angeschlossen. Wenn es da brummt, liegt es nicht an mir.',
    'Jetzt, wo du in der großen Welt bist, ist es still hier unten. Fast zu still. Ich lass das Radio laufen.',
    'Megawatt. Früher war das ein Kraftwerk, heute ist es dein Hobby. Ich bin stolz und ein kleines bisschen besorgt.',
    'Deine Mutter sagt, du arbeitest zu viel. Ich sag, er ist ein Brandt. Wir arbeiten nicht zu viel, wir arbeiten gründlich.',
    'Ich komm trotzdem jeden Tag her. Alte Gewohnheit. Herr Krause hat mir sogar einen Kellerschlüssel gegeben. Und das Bier steht hier kühler.',
  ] },
  { who: 'opa', ch: [2], lines: [
    'In der Werkstatt hinterm Laden hab ich deinem Vater das Löten beigebracht. Er war schlechter als du. Sag es ihm nicht.',
  ] },
  { who: 'opa', ch: [4], lines: [
    'Frankfurt. Ich war einmal in Frankfurt, 1983. Da hat mir einer den Schirm geklaut. Pass auf deine Schirme auf.',
  ] },
  { who: 'opa', ch: [5, 6], lines: [
    'Norwegen! Wasserkraft! Da fließt der Strom bergab, wie es sich gehört.',
    'Schick mir ein Foto vom Fjord. Ein echtes, ausgedruckt. Das Handy-Zeug kann ich nicht vergrößern.',
  ] },
  { who: 'opa', cond: (s) => (s.fac.keller?.power || 0) >= 2, lines: [
    'Zweiunddreißig Ampere im Altbau-Keller. Dem Netzbetreiber hab ich gesagt, Herr Krause baut eine Sauna ein. Ist ja nicht mal gelogen.',
  ] },
  { who: 'opa', cond: up, lines: [
    'Deine Zaubermünzen sind gestiegen, sagt Papa. Dann spendier deinem Opa mal ein Bier. Ein kleines.',
    (s, h, g) => `Bitcoin bei ${usd(g.price('BTC'))}? Für das Geld hab ich 1962 ein ganzes Jahr gearbeitet. Na ja, fast.`,
  ] },
  { who: 'opa', cond: down, lines: [
    'Runter geht es, rauf geht es. Wie beim Paternoster im Rathaus. Hauptsache, man springt nicht in Panik raus.',
  ] },
  { who: 'opa', cond: hot, lines: [
    'Hier unten hat es ja Sauna-Temperaturen. Mach die Kellerfenster auf, sonst schwitzen dir die Platinen.',
  ] },
  { who: 'opa', cond: (s, h) => h.facilityTripped(), lines: [
    'Na? Sicherung raus? Ich sag nichts. Ich guck nur so.',
  ] },
  { who: 'opa', cond: winter, lines: [
    'Im Winter heizt dein Rechenkram den ganzen Keller. Ich trag gar keine Hausschuhe mehr. Fortschritt.',
    (s) => (month(s) === 12 ? 'Weihnachten ist bald. Ich wünsch mir nichts. Außer, dass die Lichterkette nicht wieder an deiner Steckdosenleiste hängt.' : 'Draußen friert es, hier unten ist Sommer. Die Spinnen haben schon gefragt, ob sie bleiben dürfen.'),
  ] },
  { who: 'opa', cond: (s) => rel(s, 'opa') >= 3, lines: [
    'Du bist der Einzige in der Familie, der freiwillig mit mir über Leitungsquerschnitte redet. Das vergess ich dir nie.',
  ] },
  { who: 'opa', cond: (s) => rel(s, 'opa') < 0, lines: [
    'Hm. Du kommst nur noch runter, wenn was kaputt ist. Ist ja gut. Ich bin ja nur der Opa.',
  ] },
  { who: 'opa', cond: (s) => s.flags.kralTorn, lines: ['Papa hat erzählt, du hast dem Anzugträger seine Karte zerrissen. Da wär ich gern dabei gewesen.'] },
  { who: 'opa', cond: (s) => s.flags.kralKept, lines: ['Die Visitenkarte von diesem Kral? Gut aufheben. Seine Gegner kennt man am besten mit Telefonnummer.'] },
  { who: 'opa', cond: (s) => recent(s, 'storm', 60), lines: ['Nach dem Gewitter hab ich jede Steckdose im Haus durchgemessen. Alle heil. Ich bin eben gründlich.'] },
  { who: 'opa', cond: (s) => recent(s, 'friseur', 120), lines: ['Mein Friseur hat wieder gefragt. Diesmal nach Ethereum. Ich wechsel den Friseur.'] },
  { who: 'opa', cond: halving, lines: ['Halbierung, sagt Deniz. Die Belohnung wird halbiert? Das ist ja wie bei der Rente.'] },
  { who: 'opa', cond: (s) => between(s, '2018-01-01', '2019-06-30'), lines: ['Achtzig bin ich jetzt. Mit achtzig fängt man nicht mehr mit Bitcoin an, sagen die. Ich sag: Mit achtzig hat man endlich Zeit dafür.'] },
  { who: 'opa', cond: (s) => between(s, '2020-03-16', '2020-12-31'), lines: ['Ich soll zu Hause bleiben, sagt deine Mutter. Ich bin in deinem Keller. Das ist fast zu Hause.'] },
  { who: 'opa', cond: (s) => !!s.keep?.radio, lines: ['Das Radio läuft wieder. Kurzwelle, abends. Manchmal hör ich Oslo. Ich glaube, das ist ein Zeichen.'] },

  // ===================== Papa (an der Werkbank in der Werkstatt) =====================
  { who: 'papa', ch: [2], lines: [
    L('Elektro Brandt, seit 1985. Und jetzt mit Bitcoin-Abteilung im Hinterhof. Opa sagt, das ist der Fortschritt. Er sagt es nicht freundlich.', 'Neunundzwanzig Jahre Elektro Brandt. Jetzt steh ich in meiner alten Werkstatt und baue Bitcoin-Kisten. Opa sagt, das ist der Fortschritt. Er sagt es nicht freundlich.'),
    L('Ich hab heute drei Fernseher und einen Toaster repariert. Du hast mehr verdient als ich. Ist in Ordnung, wirklich – fast.', 'Ich repariere jetzt Miner statt Fernseher. Die meckern weniger als Kunden. Sie piepen nur.'),
    L('Die Kunden fragen, warum es hinten so brummt. Ich sag: Kühlschrankprüfung. Dann nicken sie.', 'Herr Öztürk fragt, warum es hinten so brummt. Ich sag: Kühlschrankprüfung. Dann nickt er.'),
    'Ich versteh nicht alles, was du hier machst. Aber ich seh, dass du es gut machst.',
    'ASIC heißt das? Ein Chip, der nur eine einzige Sache kann, die aber perfekt. Kenn ich. So war mein Meister.',
    'Mama sagt, ich soll dich nicht immer von der Arbeit abhalten. Also: Ich halt dich nicht ab. Ich steh nur hier.',
    'Halt den Boden frei, Kind. Wer über ein Kabel stolpert, stolpert meistens in ein Gerät.',
    'Nimm ruhig meinen guten Lötkolben, den mit dem blauen Griff. Meinen allerersten hab ich irgendwann verlegt. Der ist bestimmt noch hier irgendwo.',
  ] },
  { who: 'papa', ch: [3, 4, 5, 6], lines: [
    'Die Werkstatt ist jetzt deine. Ich komm nur noch zum Kaffee. Und zum Gucken. Und manchmal zum Reparieren.',
    'Deine Halle, dein Rechenzentrum, und trotzdem kommst du zu mir an die Werkbank. Das freut mich mehr, als ich sage.',
    'Ein Kunde wollte wissen, ob ich der Vater vom Hashwerk-Brandt bin. Ich hab zweimal Ja gesagt. Damit er es auch versteht.',
    L('Der Laden läuft wieder. Nicht toll, aber ehrlich. Ich glaube, die Leute kommen auch, um nach dir zu fragen.', 'Manchmal steh ich vorne am alten Schaufenster. Herr Öztürk verkauft da jetzt Fahrräder. Ist auch was Ehrliches.'),
  ] },
  { who: 'papa', ch: [5, 6], lines: [
    'Norwegen … Ich war mit deiner Mutter mal dort, lange her. Es hat zwei Wochen geregnet, und wir waren trotzdem glücklich.',
  ] },
  { who: 'papa', ch: [6], lines: [
    L('Du hast MONOLITH überholt. Ich hab den Zeitungsartikel an die Kasse geklebt. Gleich neben die erste Mark von 1985.', 'Du hast MONOLITH überholt. Ich hab den Zeitungsartikel an die Werkbank geklebt. Gleich neben das alte Ladenschild.'),
  ] },
  { who: 'papa', cond: (s) => s.flags.debt && s.chapter <= 3, lines: [
    'Die Bank hat angerufen. Nicht wegen Schulden. Nur so, wie es uns geht. Das gab es noch nie.',
    'Seit du den Laden gerettet hast, schlaf ich wieder durch. Mama sagt, ich schnarche jetzt. Vor Erleichterung.',
  ] },
  { who: 'papa', cond: (s) => s.flags.gmbh && s.chapter === 3, lines: [
    'Hashwerk GmbH. Ich hab dein Firmenschild dreimal geputzt. Es glänzt jetzt mehr als meins.',
  ] },
  { who: 'papa', cond: up, lines: [
    L('Der Kurs steigt, sagt das Radio. Ich hab gleich die Preise im Laden gesenkt. Wenn es gut läuft, muss man teilen.', 'Der Kurs steigt, sagt das Radio. Ich hab gleich Kuchen für die ganze Werkstatt geholt. Wenn es gut läuft, muss man teilen.'),
  ] },
  { who: 'papa', cond: down, lines: [
    'Kurs im Keller? Kenn ich vom Laden. Man macht weiter, bis es wieder hell wird. Und man spart an der Heizung.',
  ] },
  { who: 'papa', cond: hot, lines: [
    L('Mach das Rolltor auf, hier sind es gefühlt vierzig Grad. Die Kunden denken schon, ich backe Brötchen.', 'Mach das Rolltor auf, hier sind es gefühlt vierzig Grad. Herr Öztürk denkt schon, ich backe Brötchen.'),
  ] },
  { who: 'papa', cond: (s) => rel(s, 'papa') >= 3, lines: [
    'Weißt du, was das Schönste ist? Nicht das Geld. Dass wir wieder zusammen in der Werkstatt stehen.',
  ] },
  { who: 'papa', cond: (s) => rel(s, 'papa') < 0, lines: [
    'Schon gut, du hast viel zu tun. Ich auch. Ich hab nur gedacht … ach, egal.',
  ] },
  { who: 'papa', cond: (s) => s.flags.repaircafe, lines: [
    L('Samstag waren vierzehn Leute im Reparatur-Café. Eine Dame hat Kuchen mitgebracht. Ich glaube, wir haben jetzt Stammkunden.', 'Das Reparatur-Café machen wir jetzt samstags hier in der Werkstatt. Zwischen den Minern ist es schön warm.'),
  ] },
  { who: 'papa', cond: (s) => s.flags.papaRepairs, lines: [
    'Deine Miner sind gar nicht so anders als Fernseher. Kondensator raus, Kondensator rein, Kaffee.',
  ] },
  { who: 'papa', cond: (s) => between(s, '2020-03-17', '2020-07-31'), lines: [
    L('Laden zu, Werkstatt offen. Ich trag Maske und rede mit den Lötstellen. Die widersprechen wenigstens nicht.', 'Alles zu, nur die Werkstatt läuft. Ich trag Maske und rede mit den Lötstellen. Die widersprechen wenigstens nicht.'),
  ] },
  { who: 'papa', cond: (s) => s.flags.kralTorn, lines: ['Ich seh immer noch Krals Gesicht, als du seine Karte zerrissen hast. Das häng ich mir innerlich über die Theke.'] },
  { who: 'papa', cond: (s) => s.flags.kralKept, lines: ['Krals Karte liegt bei dir in der Schublade? Lass sie da. Und mach die Schublade zu.'] },
  { who: 'papa', cond: (s) => s.flags.offerMade && !s.flags.soldOut, lines: ['Kral will dich kaufen? Dich kauft man nicht, Kind. Dich hat man. Als Familie, meine ich.'] },
  { who: 'papa', cond: (s) => s.flags.soldOut, lines: ['Verkauft, na ja. Die Werkbank gehört aber immer noch uns. Und der Kaffee auch.'] },
  { who: 'papa', cond: (s) => month(s) === 12, lines: [L('Zu Weihnachten gibt es im Laden wieder Lichterketten zum halben Preis. Für dich gratis. Für deine Hallen … reden wir noch.', 'Früher gab es zu Weihnachten im Laden Lichterketten zum halben Preis. Jetzt hängen sie an deinen Racks. Gratis.')] },
  { who: 'papa', cond: halving, lines: ['Halbierung? Wenn mir einer den Stundenlohn halbiert, streike ich. Deine Rechner nicht. Tapfer, die Dinger.'] },
  { who: 'papa', cond: (s) => !!s.keep?.loetkolben, lines: ['Mein erster Lötkolben liegt jetzt bei dir. Pass gut auf ihn auf, der hat mehr Fernseher gerettet als jeder Kundendienst.'] },

  // ===================== Deniz (Werkstatt und Hallen) =====================
  { who: 'deniz', ch: [2], lines: [
    'Ich hab drei Nächte durchgezockt und zwei Nächte Miner eingerichtet. Rate mal, was mehr Spaß gemacht hat. Genau: beides.',
    'Diese ASICs sind wie Grafikkarten, die nie spielen dürfen. Irgendwie traurig. Aber schnell.',
    'Wenn du mich suchst: Ich bin der mit der Pizza und dem Schraubendreher.',
    'Dein Papa hat mir heute zwei Stunden lang erklärt, wie man Röhren lötet. Ich weiß jetzt alles über 1970.',
    'Ich hab den alten Fernseher als Kursanzeige umgebaut. Er zeigt Bitcoin in Schwarz-Weiß. Sehr stilvoll.',
  ] },
  { who: 'deniz', ch: [3], lines: [
    'Kaltgang, Warmgang. Ich hab die Halle mit Klebeband markiert. Das ist jetzt professionell, weil das Band gelb ist.',
    'Ich hab ausgerechnet, dass unsere Halle mehr Strom zieht als halb Lindental-Nord. Der Zähler dreht sich wie ein Ventilator.',
    'Ich hab den Technikern Namen auf die Helme geschrieben. Jetzt streiten sie, wer den cooleren hat.',
  ] },
  { who: 'deniz', ch: [4], lines: [
    'Frankfurt! Doppelboden! Ich hab heute zehn Minuten lang einfach nur den Doppelboden angeschaut. Schön.',
    'Die Klimaanlage im Rechenzentrum ist leiser als dein alter PC. Ich vermisse das Brummen ein bisschen.',
    'Hier muss man Besucherausweise tragen. Ich hab mir einen gemacht, auf dem ‚Chef der Lüfter‘ steht. Keiner hat was gesagt.',
  ] },
  { who: 'deniz', ch: [5, 6], lines: [
    'Norwegen hat mehr Fjorde als Lindental Ampeln. Ich hab nachgezählt. Okay, Lindental hat nur zwei Ampeln.',
    'In der Fjordhalle ist es so kalt, dass ich die Pizza neben einen Miner lege. Gleichmäßig warm. Ingenieurskunst.',
    'Die Leute hier sagen ‚takk‘ zu allem. Ich sag jetzt auch takk zu allem. Sogar zum Kaffeeautomaten.',
  ] },
  { who: 'deniz', ch: [6], lines: [
    'MONOLITH überholt. Ich hab drei Tage gebraucht, um mit dem Grinsen aufzuhören. Bin noch nicht ganz fertig.',
  ] },
  { who: 'deniz', ch: [2, 3, 4, 5, 6], lines: [
    'Weißt du noch, deine feuchte Bude im Hinterhaus? Ein PC, anfangs nicht mal mit Grafikkarte, null Ahnung. Und jetzt guck uns an.',
  ] },
  { who: 'deniz', cond: (s) => between(s, '2013-01-15', '2013-09-30'), lines: ['Die ersten ASICs sind unterwegs! Ich hab die Lieferseite so oft neu geladen, dass mein Browser um Gnade bittet.'] },
  { who: 'deniz', cond: (s) => between(s, '2013-12-06', '2014-06-30'), lines: ['Dogecoin. Ein Hund. Als Münze. Ich bin verliebt und schäme mich kein bisschen.'] },
  { who: 'deniz', cond: (s) => between(s, '2014-02-07', '2014-05-31'), lines: ['GoxBank ist weg. Einfach weg. Ich hab nur noch ein Passwort und ein ganz schlechtes Gefühl.'] },
  { who: 'deniz', cond: (s) => between(s, '2015-01-01', '2015-12-31'), lines: ['Kurs im Keller, Strom teuer. Ich sag nur: Winterschlaf. Für die Rechner, nicht für uns.'] },
  { who: 'deniz', cond: (s) => between(s, '2015-07-30', '2016-06-30'), lines: ['Ethereum ist gestartet. Ein Weltcomputer, den alle zusammen betreiben. Klingt verrückt. Ich will ihn minen.'] },
  { who: 'deniz', cond: (s) => between(s, '2017-10-15', '2018-01-15'), lines: ['Alle reden über Bitcoin: meine Tante, der Bäcker. Der Bäcker! Das ist bestimmt kein gutes Zeichen.'] },
  { who: 'deniz', cond: (s) => between(s, '2018-02-01', '2018-12-31'), lines: ['Bärenmarkt. Ich hab mir einen Teddy auf den Schreibtisch gesetzt. Damit der Bär wenigstens nett guckt.'] },
  { who: 'deniz', cond: (s) => between(s, '2021-03-15', '2021-11-30'), lines: ['Allzeithoch! Ich hab vor Freude einen Serverschrank umarmt. Er war kalt und hat nichts gesagt.'] },
  { who: 'deniz', cond: (s) => between(s, '2022-09-15', '2022-12-31'), lines: ['Ethereum ist jetzt Proof of Stake. Unsere Grafikkarten haben Feierabend, für immer. Ich trauere still.'] },
  { who: 'deniz', cond: (s) => between(s, '2022-11-08', '2023-02-28'), lines: ['FXT ist pleite, die Börse mit der riesigen Stadionwerbung. Gut, dass wir unsere Coins selbst verwahren.'] },
  { who: 'deniz', cond: (s) => between(s, '2024-01-10', '2024-06-30'), lines: ['Bitcoin-Fonds an der Börse. Jetzt kann meine Oma Bitcoin im Sparplan kaufen. Hat sie schon. Sie ist schneller als ich.'] },
  { who: 'deniz', cond: halving, lines: ['Halving! Die Belohnung halbiert sich. Ich hab Kuchen gekauft. Einen halben, aus Solidarität.'] },
  { who: 'deniz', cond: up, lines: [
    (s, h, g) => `Bitcoin steht bei ${usd(g.price('BTC'))}. Ich tu so, als wär ich ganz ruhig. Bin ich nicht.`,
  ] },
  { who: 'deniz', cond: down, lines: ['Rot, überall rot. Ich trink jetzt einen Kakao und guck nicht auf den Kurs. Okay, einmal noch.'] },
  { who: 'deniz', cond: hot, lines: ['Hitzewelle. Die Miner jammern, ich jammere. Wir haben eine Selbsthilfegruppe gegründet.'] },
  { who: 'deniz', cond: (s, h) => h.facilityTripped(), lines: ['Der Strom ist weg? Dann reden wir eben. Wie früher in der großen Pause. Nur ohne Pausenbrot.'] },
  { who: 'deniz', cond: (s) => rel(s, 'deniz') >= 3, lines: ['Ohne dich säße ich immer noch im Callcenter und würde Router neu starten. Danke, Alter. Ehrlich.'] },
  { who: 'deniz', cond: (s) => rel(s, 'deniz') < 0, lines: ['Schon okay. Ich mach meinen Job. Aber früher haben wir mehr gelacht.'] },
  { who: 'deniz', cond: (s) => s.flags.denizPartner, lines: ['Teilhaber Deniz. Meine Mutter hat geweint und dann gefragt, ob ich jetzt einen Anzug brauche. Nein. Nie.'] },
  { who: 'deniz', cond: (s) => s.flags.denizReturned, lines: ['Bei MONOLITH gab es Obstkörbe und Angst. Hier gibt es Pizza und dich. Ich bleib.'] },
  { who: 'deniz', cond: (s) => !!s.ach?.pizza, lines: ['Ich erzähl immer noch jedem von unserer Bitcoin-Pizza. Die Leute gucken mich an, als hätte ich ein Haus verfuttert.'] },
  { who: 'deniz', cond: (s) => s.flags.offerMade && !s.flags.soldOut, lines: ['Kral hat dir ein Angebot gemacht? Lass mich raten: zu viel Geld, zu wenig Herz.'] },
  { who: 'deniz', cond: (s) => s.flags.kralTorn, lines: ['Du hast Krals Karte zerrissen? Ich hab die Schnipsel eingerahmt. Moderne Kunst.'] },
  { who: 'deniz', cond: (s) => s.flags.hodl11, lines: ['Juni 2011, du hast alles gehalten. Ich hab verkauft. Ich rede nicht darüber. Nie.'] },
  { who: 'deniz', cond: (s) => s.flags.sold11, lines: ['Juni 2011 bei dreißig Dollar verkauft, genau wie ich. Wir sind so vernünftig, es tut weh.'] },
  { who: 'deniz', cond: (s, h) => h.netWorth() >= 1e6, lines: ['Millionäre aus Lindental. Ich hab mir neue Socken gekauft. Sonst ändert sich nix.'] },
  { who: 'deniz', cond: (s) => !!s.keep?.gameboy, lines: ['Ich hab den Gameboy wieder zum Laufen gebracht. Mein Spielstand von 2009 ist noch drauf. Ich war richtig gut damals.'] },

  // ===================== Techniker (Halle, Rechenzentrum, Fjord) =====================
  { who: 'tech', lines: [
    'Alles im grünen Bereich, Chef. Bis auf den Kaffeeautomaten. Der zeigt wieder Fehler sieben.',
    'Die Lüfter singen heute in A-Dur. Das ist gut. In Moll wird es teuer.',
    'Ich hab heute zwölf Miner abgestaubt. Ich niese jetzt in Hashrate.',
    'Faustregel: Riecht ein Gerät komisch, ist es kaputt. Riecht es gar nicht, ist es neu.',
    'Deniz sagt, ich soll Sie nicht mit Kleinkram stören. Also nur kurz: schöne Anlage.',
  ] },
  { who: 'tech', cond: (s, h, g, fac) => (s.fac[fac]?.temp || 21) > 30, lines: ['Hier drin hat es gut über dreißig Grad. Meine Brotdose steht jetzt direkt vor der Kühlung.'] },
  { who: 'tech', cond: (s, h, g, fac) => broken(s, fac), lines: ['Da hinten qualmt einer. Nicht ich, ein Miner. Ich kümmer mich drum.'] },
  { who: 'tech', cond: (s, h, g, fac) => !broken(s, fac) && (s.fac[fac]?.objects?.length || 0) > 3, lines: ['Keine Ausfälle gerade. Ich klopf auf Holz. Hier gibt es nur Stahl, also klopf ich auf Stahl.'] },
  { who: 'tech', cond: (s, h, g, fac) => fac === 'rz', lines: ['Im Rechenzentrum trägt man Überschuhe. Ich fühl mich wie im Krankenhaus. Für Computer.'] },
  { who: 'tech', cond: (s, h, g, fac) => fac === 'fjord', lines: ['Heute stand ein Elch vor dem Fenster und hat auf die Container geguckt. Ich glaube, der will sich bewerben.'] },
  { who: 'tech', cond: (s, h, g, fac) => fac === 'halle', lines: ['Die Hallentore klemmen bei Frost. Ich hab sie Gertrud und Helga getauft. Mit Namen gehen sie besser auf.'] },
  { who: 'tech', cond: down, lines: ['Kurs schlecht, Stimmung gut. Wir lassen uns die Laune nicht kleinrechnen.'] },
  { who: 'tech', cond: (s) => (s.frac ?? 0.5) > 0.85 || (s.frac ?? 0.5) < 0.22, lines: ['Nachtschicht. Die Miner und ich. Wir verstehen uns ohne Worte.'] },
  // ---------- nach „ladenzu“: Papa ohne Laden (Werkstatt, Kapitel 3–4) ----------
  { who: 'papa', cond: (s) => lost(s) && s.chapter >= 2 && s.chapter <= 3, lines: [
    'Morgens fahr ich noch manchmal zum Laden. Dann fällt mir ein, dass ich ja hierher muss. Ist auch schön.',
    'Herr Öztürk ist anständig. Er hat das alte Schild nicht weggeworfen, sondern mir gegeben. Es steht bei Mama im Flur.',
    'Die Bank hat mir einen Brief geschrieben: „Wir bedauern.“ Ich hab ihn eingerahmt. Als Erinnerung, nie wieder Schulden.',
  ] },
];

// Schon gesprochen heute
export const AGAIN = {
  papa: ['Wir haben doch vorhin schon geredet. Ab an die Arbeit, Chef!', 'Noch mal? Du willst doch nur an meinen Kaffee.'],
  opa: ['Zweimal am Tag? Da muss ich erst überlegen, was ich noch weiß.', 'Geh schon, Junge. Ich lauf dir nicht weg.'],
  deniz: ['Wir hatten heute schon unser Meeting. Es war sehr produktiv. Es ging um Pizza.', 'Bin mitten im Code. Gleich. Also morgen.'],
  tech: ['Alles wie vorhin, Chef. Nur zwei Minuten älter.', 'Läuft. Ich sag Bescheid, wenn nicht.'],
};

// Gespräche heben die Beziehung behutsam: einmal pro Woche zählt ein Gespräch als Viertelpunkt,
// insgesamt höchstens +2 pro Person und nie über Stufe 3 hinaus.
export const TALK_REL = { quarters: 4, maxGain: 2, cap: 3 };

const initTalk = (s) => { s.talk ||= {}; for (const k of ['last', 'week', 'joy', 'got', 'seen', 'line']) s.talk[k] ||= {}; return s.talk; };
const run = (f, ...a) => { try { return f(...a); } catch (e) { return null; } };

// Gespräch führen: Zeile wählen, Freude/Beziehung verbuchen. Gibt { who, person, line, again, joy, relUp, quarters, capped } zurück.
export function talkTo(g, who0, fac = g.s.current) {
  const s = g.s, h = g.helpers(), t = initTalk(s), who = talkWho(s, who0), person = PEOPLE[who];
  if (!person) return null;
  const again = t.last[who] === s.day;
  t.last[who] = s.day;
  const txt = (l) => (typeof l === 'function' ? run(l, s, h, g, fac) : l);
  let line;
  if (again) line = AGAIN[who][(s.day + (t.seen[who + ':again'] = (t.seen[who + ':again'] || 0) + 1)) % AGAIN[who].length];
  else {
    const cands = [];
    TALK.forEach((e, i) => {
      if (e.who !== who || (e.ch && !e.ch.includes(Math.min(6, s.chapter)))) return;
      if (e.cond && !run(e.cond, s, h, g, fac)) return;
      e.lines.forEach((l, j) => { const key = `${who}:${i}:${j}`; cands.push({ key, l, w: (t.seen[key] ?? -1e6) - (e.cond ? 60 : 0) }); });
    });
    const pool = cands.filter((c) => c.key !== t.line[who]); const use = pool.length ? pool : cands;
    if (use.length) {
      const best = Math.min(...use.map((c) => c.w)), top = use.filter((c) => c.w === best), c = top[Math.floor(Math.random() * top.length)];
      line = txt(c.l); t.seen[c.key] = s.day; t.line[who] = c.key;
    }
    line ||= AGAIN[who][0];
  }
  // Freude: das erste Gespräch des Tages freut die Person; einmal pro Woche zählt es für die Beziehung
  let joy = false, relUp = false;
  const fam = s.rel && who in s.rel, capped = fam && ((t.got[who] || 0) >= TALK_REL.maxGain || rel(s, who) >= TALK_REL.cap);
  if (!again && fam) {
    joy = true;
    const wk = Math.floor(s.day / 7);
    if (!capped && t.week[who] !== wk) {
      t.week[who] = wk; t.joy[who] = (t.joy[who] || 0) + 1;
      if (t.joy[who] >= TALK_REL.quarters) { t.joy[who] = 0; t.got[who] = (t.got[who] || 0) + 1; g.applyFx({ rel: { [who]: 1 } }); relUp = true; }
    }
  }
  return { who, person, name: person.name, role: person.role(s), line, again, joy, relUp, quarters: fam ? t.joy[who] || 0 : 0, capped: fam && !relUp && ((t.got[who] || 0) >= TALK_REL.maxGain || rel(s, who) >= TALK_REL.cap) };
}

// ===================== Fundstücke =====================
export const KEEPSAKES = [
  {
    id: 'gameboy', fac: 'kinder', spot: [0.97, 0.0, 2.92, 0.55], label: 'Alter Gameboy', name: 'Deniz’ Gameboy', cond: (s) => s.flags.miningStarted,
    text: 'Unterm Bett, zwischen einer Socke und deinem Berufsschulordner: ein grauer Handheld, hinten mit Edding beschriftet: <b>„DENIZ – FINGER WEG“</b>. Du hattest ihn 2009 „nur übers Wochenende“ ausgeliehen, beim Umzug ist er mit in die Kiste gerutscht. Das Spielmodul steckt noch drin.',
    gain: 'Deniz +1', reward: { rel: { deniz: 1 }, msg: { from: 'Deniz', text: 'MEIN GAMEBOY?! Dafür hab ich 2009 einen Monat lang Rasen gemäht. Der Spielstand ist noch drauf. Du bist offiziell der Beste.' } },
  },
  {
    id: 'radio', fac: 'keller', spot: [0.34, 0.0, 4.855, Math.PI / 2], label: 'Altes Röhrenradio', name: 'Opas Röhrenradio, 1962',
    text: 'Hinter dem Heizkessel, unter einer Decke im Gerümpel vom Vormieter: ein Holzradio mit Stoffbespannung. Innen klebt ein Zettel in Opas Schrift: <b>„Mein erstes. Gebaut 1962, für Lisbeth. Rauscht nie.“</b> Du drehst am Knopf – und es knistert tatsächlich.',
    gain: 'Opa +1 · +40 EP Schrauben', reward: { rel: { opa: 1 }, xp: { hw: 40 }, msg: { from: 'Opa Heinz', text: 'Das Radio! Das hab ich 1971 dem alten Krause geliehen, als ich in deinem Haus die Leitungen gezogen hab – und nie zurückgekriegt. Behalt es, Junge. Und dreh ab und zu Kurzwelle.' } },
  },
  {
    id: 'loetkolben', fac: 'werkstatt', spot: [2.42, 0.0, 0.5, 0.35], label: 'Alter Lötkolben', name: 'Papas erster Lötkolben',
    text: 'Unter der Werkbank, eingeklemmt hinter einem Bein: ein Lötkolben mit angekokeltem Holzgriff. Eingeritzt: <b>„F. B. 1979“</b>. Damit hat Papa als Lehrling sein Gesellenstück gelötet. Die Spitze ist noch gut.',
    gain: 'Reparaturen dauerhaft 5 % günstiger', reward: { mod: [{ key: 'repair', mult: 0.95, src: 'keep' }], msg: { from: 'Papa', text: 'Mein erster Lötkolben! Den hab ich seit dem Umzug in den Laden gesucht. Behalt ihn. Er bringt Glück beim Reparieren.' } },
  },
  {
    id: 'pruefer', fac: 'halle', spot: [18.32, 0.0, 10.78, 0.9], label: 'Alter Spannungsprüfer', name: 'Opas Spannungsprüfer',
    text: 'Am Fuß des hintersten Stahlträgers, halb unter Kabelbindern: ein gelber Spannungsprüfer, zerkratzt und verstaubt. Auf dem Griff steht <b>„H. Brandt, Elektromeister“</b>. Opa hat 1974 die Hauptverteilung dieser Halle angeschlossen – und offenbar etwas vergessen.',
    gain: 'Opa +1 · +80 EP Schrauben', reward: { rel: { opa: 1 }, xp: { hw: 80 }, msg: { from: 'Opa Heinz', text: 'Mein Prüfer! Den hab ich 1974 wochenlang gesucht. Ich hatte sogar deinen Vater im Verdacht. Sag ihm bitte nichts.' } },
  },
  {
    id: 'usbstick', fac: 'rz', spot: [6.4, 0.0, 4.78, 0.6], label: 'Alter USB-Stick', name: '„BTC 2011 – NICHT LÖSCHEN“',
    text: 'Am Fuß der Glaswand zum Leitstand, zwischen zwei Bodenplatten: ein zerkratzter USB-Stick mit Klebeband-Etikett in deiner Schrift von damals. Beim Umzug muss er aus einer Kiste gerutscht sein. Darauf: eine Wallet aus dem ersten Winter.',
    gain: '+0,5 BTC', reward: { coin: { BTC: 0.5 }, msg: { from: 'Deniz', text: 'Du hast den Stick gefunden?! Ich hab 2017 zwei Wochen lang deine alte Bude danach durchsucht. Erzähl das bitte niemandem.' } },
  },
  {
    id: 'polarfoto', fac: 'fjord', spot: [8.42, 0.0, 0.34, 0.45], label: 'Altes Foto', name: 'Polarlicht über dem Sognefjord',
    text: 'In der Fuge unter dem Fenster klemmt ein vergilbtes Foto: grünes Polarlicht über dem Fjord. Hinten, in Mamas Schrift: <b>„Frank &amp; Sabine, Hochzeitsreise 1989. Hierher kommen wir zurück.“</b> Es muss in einer der Kisten aus dem Laden gesteckt haben.',
    gain: 'Mama +1 · Papa +1', reward: { rel: { mama: 1, papa: 1 }, msg: { from: 'Mama', text: 'Unser Foto! Papa hat damals gesagt, wir kommen wieder. Jetzt bist du da. Schick mir ein neues, ja? Mit Polarlicht.' } },
  },
];
export const KEEPSAKE = Object.fromEntries(KEEPSAKES.map((k) => [k.id, k]));

// Welche Fundstücke liegen an diesem Standort noch herum?
export function keepsakesAt(s, facId) {
  return KEEPSAKES.filter((k) => k.fac === facId && s.unlocked?.includes(k.fac) && !s.keep?.[k.id] && (!k.cond || run(k.cond, s)));
}
// Aufheben: Belohnung, ggf. Erfolg „Schatzsucher“; gibt das Fundstück zurück (oder null)
export function pickKeepsake(g, id) {
  const s = g.s, k = KEEPSAKE[id]; s.keep ||= {};
  if (!k || s.keep[id] || !keepsakesAt(s, k.fac).includes(k)) return null;
  s.keep[id] = s.day || 1;
  g.applyFx(k.reward);
  if (KEEPSAKES.every((x) => s.keep[x.id])) g.unlockAch('treasure');
  g.dayUpdate(true); g.emit('keep', id);
  return k;
}
export const keepsakeCount = (s) => KEEPSAKES.filter((k) => s.keep?.[k.id]).length;
