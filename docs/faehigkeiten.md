# Fähigkeiten 2.0 – Design-Entwurf

Stand: 20.11.2026 · Verfasser: Spieler-Vertreter · Status: **Entwurf, vier große Fragen offen (Abschnitt 11)**
Grundlage: `docs/wunschprofil.md` (Abschnitt „Fähigkeiten“), Code-Stand `3598a20` plus WIP-Snapshot `68d05ad` (Wohnung/Shop).

> Er will: „mining skill ist auch quatsch das sollen skills sein in so nem menü, dass man dann fpga bedienen kann betriebssysteme installieren kann usw nichts so komisches wie mining skill und dann mined man mehr“

---

## 1. Grundidee in drei Sätzen

Eine Fähigkeit ist **Wissen, das einen neuen Knopf, ein neues Gerät oder einen neuen Handgriff freischaltet**. Prozent-Boni ohne Handlung gibt es nicht mehr. Wer Undervolten kann, stellt am Rig selbst „Eco“ ein. Wer löten kann, repariert selbst statt zu bezahlen. Man lernt auf vier Wegen: Am Anfang schreibt einem Deniz aufs Handy, später lernt man mit Punkten aus eigener Arbeit, aus Büchern, Forum und Kursen oder von Leuten wie Opa, Papa, Kemal und Jonas. Gelerntes benutzt man mit echten Handgriffen, also mit Installer, BIOS-Regler und Firmware-Balken. Nur beim Reparieren gibt es kurze Mini-Spiele zum Löten und Stecken, und die kann man jederzeit überspringen.

---

## 2. Kategorien und Fähigkeitsliste

### 2.1 Kategorien (Reiter im Menü)

| Kürzel | Kategorie | Worum es geht | Erfahrungstopf |
|---|---|---|---|
| SCH | **Schrauben** | bauen, einbauen, Rahmen, Serien | Werkstatt |
| SOF | **Software** | Betriebssystem, Miner, Firmware, Automatik | Rechner |
| TUN | **Tuning** | Takt, Spannung, BIOS, Leistungsziel | Rechner |
| KST | **Kühlung & Strom** | Luft, Wasser, Immersion, Elektrik, Abwärme | Werkstatt |
| REP | **Reparatur** | Wartung, Löten, Stecken, Hashboards | Werkstatt |
| GES | **Geschäft** | Börse, Einkauf, Lager, Leute, Strommarkt | Geschäft |

Diese Entscheidung treffe ich selbst, weil es um Layout geht: **Kategorien mit kurzen Ketten** statt eines großen Baums. Innerhalb einer Kategorie bauen höchstens 2–3 Fähigkeiten aufeinander auf, zum Beispiel Löten → Hashboard-Reparatur. So findet man alles schnell, und es gibt trotzdem ein Gefühl von Fortschritt. Damit ist die offene Frage aus dem Profil „Baum oder Kategorien“ beantwortet: im Grunde beides.

### 2.2 Legende

- **Gefühl:** *Handgriff* (man tut es selbst im Inspektor oder am Gerät), *Mini-Spiel* (kurz und überspringbar), *Freischaltung* (neues Gerät, neuer Knopf oder neuer Shop-Reiter).
- **Entscheidung:** ehrliche Einschätzung:
  - **stark** heißt: Man wägt echt ab, und es gibt keine immer richtige Antwort.
  - **mittel** heißt: lohnt sich meistens, aber man muss den Zeitpunkt wählen.
  - **Komfort** heißt: spart Klicks, ohne echte Abwägung.
  - **Grundlage** heißt: Tutorial oder Story, keine Entscheidung.
  - **Wackelkandidat** heißt: Die Fähigkeit wird gestrichen, wenn es zu viele werden.
- **Lernwege:** *Handy* (kommt automatisch per Nachricht), *Punkte* (Fähigkeitspunkte aus dem passenden Erfahrungstopf), *Buch* (Shop, kommt als Paket, Lesezeit), *Forum* (gratis, dauert länger), *Kurs* (Geld und Tage), *Person* (braucht eine bestimmte Beziehungsstufe und kostet einen Spieltag).
- **Pflicht-Regel (keine Sackgasse):** Jede Fähigkeit, die ein Kapitelziel braucht, kommt **spätestens an einem festen Datum oder Ereignis automatisch per Handy**, so wie heute `CONTACT.due`. Auch alles, was es heute schon ohne Fähigkeit gibt (Milchkiste, FPGA, Cold-Wallet …), ist spätestens zum heutigen Zeitpunkt wieder erreichbar. Damit fällt nichts weg. Wer früher lernt, ist eben früher dran.

### 2.3 GPU-Zeit I: Wohnung und erste Grafikkarte (Okt. 2010 – Frühjahr 2011)

**1 · PC zusammenbauen** · SCH · ab Start · Handgriff
- Freischaltung: Mainboard, CPU und Netzteil ins Gehäuse einbauen. Das gibt es heute schon (`pcBuild`, `installLoose`) und bekommt jetzt nur einen Namen.
- Lernen: Handy (Deniz am ersten Tag, mit Nachricht `m0`), automatisch.
- Fasst an: Tutorial-Ziele `collect`/`pcbuild`, `installLoose`, `firstReady` (CPU-Start).
- Entscheidung: **Grundlage**.

**2 · CPU-Mining starten** · SOF · ab Start · Handgriff
- Freischaltung: Haken „Coins erzeugen“ im Bitcoin-Programm auf dem Bildschirm des ersten PCs. Historisch stimmt das: Der Client 0.3 hatte diesen Haken. Ersetzt den heutigen Einschalt-Knopf.
- Lernen: Handy (Deniz am ersten Tag).
- Fasst an: `startMining`, Ziel `look`.
- Entscheidung: **Grundlage**.

**3 · Grafikkarte und GPU-Miner** · SOF · sobald die erste Grafikkarte als Paket ankommt · Handgriff
- Freischaltung: Karte einbauen, dann im Miner-Programm auf dem Bildschirm „Miner starten“ klicken. Erst danach schürft die Karte.
- Lernen: Handy (Deniz: „Karte rein, Stromstecker dran, und dann das Miner-Programm, nicht mehr den Haken im Client“).
- Fasst an: `setPart`/`installPart`, `flags.boughtGpu`, Ziel `gpu`.
- Entscheidung: **Grundlage**.

**4 · Bitcoin verkaufen** · GES · sobald 12 $ in Coins liegen · Freischaltung
- Freischaltung: die Börse am Monitor, heute Feature `market`.
- Lernen: Handy (Deniz), automatisch zum selben Zeitpunkt wie heute.
- Fasst an: `FEATURES.market`, `sell`, Ziel `sell`.
- Entscheidung: **Grundlage**. Wann man verkauft, entscheidet man schon heute.

**5 · Windows installieren** · SOF · ab dem zweiten PC · Handgriff
- Freischaltung: Jeder selbst gebaute PC oder Rig braucht ein Betriebssystem. Im Inspektor-Reiter „System“ klickt man den Installer durch: drei Klicks und ein Balken, bei Tempo 1 etwa zwei Spielstunden. Die Windows-Lizenz kostet 60 $ je Rig, ab 2015 sind es 100 $. Fertig-PCs und Fertig-Rigs von Kemal und Jonas haben das System schon drauf. Auf dem allerersten PC ist noch Papas altes XP installiert.
- Lernen: Handy (Deniz, sobald der zweite PC als Bausatz kommt).
- Fasst an: neues Feld `o.os`; `analyze()` meldet ohne System den Status „Kein Betriebssystem“.
- Entscheidung: **Grundlage**. Die eigentliche Entscheidung kommt mit Nr. 6. Ob das System Pflicht wird, ist **Frage 2** im Fragebogen.

**6 · Linux-Mining-System** · SOF · ab Start · Handgriff
- Freischaltung: Im Installer gibt es die Auswahl „Linux (gratis)“. Außerdem ist es die Voraussetzung für Nr. 18 (Image), Nr. 32 (Fernwartung) und Nr. 36 (KI-Vermietung).
- Lernen:
  - Forum: gratis, 4 Tage mitlesen.
  - Buch „Linux für Rechner-Bastler“: 15 $, 1 Tag Lesezeit.
  - Deniz: ab Beziehung 1, ein Abend.
  - 1 Rechner-Punkt.
- Fasst an: Installer, `o.os`.
- Entscheidung: **stark**. 60 $ Lizenz bei einem Milchkisten-Rig für 15 $ sind ein echter Brocken. Lernt man es früh, hat man es billiger. Wer keine Lust hat, zahlt eben.

**7 · Takt und Spannung (Undervolten/Übertakten)** · TUN · ab Dez. 2010 · Handgriff
- Freischaltung: Inspektor-Reiter „Tuning“ im BIOS-Look für jeden Rig. Drei Profile:
  - *Eco*: −20 % Strom, −5 % Hash, weniger Wärme, Ausfälle ×0,85.
  - *Standard*: wie bisher.
  - *Turbo*: +8 % Hash, +18 % Strom, mehr Wärme, Ausfälle ×1,5.
  - Dazu der Knopf „Auf alle gleichen Rigs hier übernehmen“.
- Lernen:
  - Buch „Der Undervolting-Guide“: 25 $, 1 Tag. Das ist die heutige Technik `undervolt`.
  - Forum: gratis, 5 Tage.
  - Deniz: ab Beziehung 1.
  - 2 Rechner-Punkte.
- Fasst an: `analyze()` (Watt, Hash, Wärme je Rig), `wear()`; ersetzt `TECHS.undervolt` und `fx('rigPower')`.
- Entscheidung: **stark**:
  - Solange der Strom in der Warmmiete steckt (bis März 2011), lohnt Turbo.
  - Danach rechnet sich meistens Eco.
  - Im Hitzesommer hilft Eco gegen die Drosselung.

**8 · Luftstrom und Fensterabluft** · KST · ab Start · Freischaltung
- Freischaltung: neues Bau-Objekt „Fensterabluft (Ventilator und Schlauch)“ für 35 $. Es führt 900 W Wärme ab, braucht 30 W und geht nur an Fensterplätzen in der Wohnung und im Keller. Im Wärmebild erscheinen dazu Luftzug-Pfeile.
- Lernen:
  - Mama: ab Beziehung 1, „Durchzug, Kind!“
  - Forum: 3 Tage.
  - 1 Werkstatt-Punkt.
- Fasst an: `PLACEABLES` (Kühlung), Wärmebild, `UPGRADES.kinder.skylight` (bleibt).
- Entscheidung: **mittel**. Die Abluft ist billiger als die mobile Klimaanlage, braucht aber einen Fensterplatz, und die sind knapp.

**9 · Wartung (Staub und Wärmeleitpaste)** · REP · ab Start · Handgriff
- Freischaltung: Knopf „Warten“ an Rigs und Geräten. Das Material kostet 5 $ beim Rig und 15 $ beim ASIC, das Gerät ist eine Stunde aus. Danach gilt 180 Tage lang: Ausfälle ×0,7.
- Lernen:
  - Kemal: nach dem Kennenlernen; er sagt ja schon „Hab die Wärmeleitpaste frisch gemacht“.
  - Buch „PC-Pflege für Dummies“: 10 $.
  - 1 Werkstatt-Punkt.
- Fasst an: `wear()`, neues Feld `o.serv`; ersetzt später `TECHS.dustfilter` (siehe Nr. 30).
- Entscheidung: **mittel**. Man wägt ab zwischen alter Hardware pflegen und neue kaufen, und muss vor der Hitzewelle daran denken.

**10 · Löten** · REP · ab Start · Mini-Spiel
- Freischaltung: Bei defekten Rigs, Netzteilen und Mainboards gibt es den Knopf „Selbst löten“. Statt der Werkstattkosten zahlt man nur Material (25 % von `repairCost`).
- Lernen:
  - Papa: ab Beziehung 1, „Kondensator. Wie früher.“
  - Buch „Löten lernen in 7 Tagen“: 12 $, 7 Tage.
  - Ereignis „Reparatur-Café“ (2013).
  - 2 Werkstatt-Punkte.
- Fasst an: `repair()`, `repairCost()`, `broken`, Mini-Spiel „Löten“ (Abschnitt 5).
- Entscheidung: **stark**. Man tauscht Zeit gegen Geld. Später kommt dazu, ob man es den Leuten beibringt (Nr. 30).

**11 · Stromtarif wechseln** · GES · ab März 2011 (Ende der Warmmiete) · Handgriff
- Freischaltung: Im Firmenfenster kann man bei Standorten mit Haushaltsstrom (Wohnung, Keller, Werkstatt) den Tarif wählen.
  - „Neukundentarif“: −12 % für 365 Tage, danach teurer als die Grundversorgung.
  - Deshalb erinnert einen das Spiel jedes Jahr ans Wechseln.
  - Nach dem dritten Wechsel bietet Mama an: „Ich mach das ab jetzt jedes Jahr für dich.“
- Lernen: Mama, ab Beziehung 1. Sie hat die Unterlagen in der Küchenschublade.
- Fasst an: `elecPrice()` (nur Haushaltsstrom), Firmenfenster.
- Entscheidung: **mittel**. Das ist ein deutscher Klassiker: Wer nicht wechselt, zahlt drauf.

### 2.4 GPU-Zeit II: Keller und Milchkisten (2011 – 2012)

**12 · Riser und Open-Frame** · SCH · ab Jan. 2011 · Freischaltung
- Freischaltung:
  - Milchkiste und Alu-Rahmen im Shop.
  - USB-Riser: im Open-Frame +2 Kartenplätze je Mainboard, höchstens so viele, wie der Rahmen fasst.
  - Dafür steigen die Ausfälle um 5 % je Karte am Riser.
- Lernen:
  - Forum-Thread ab Jan. 2011 (Erscheinen der Milchkiste): gratis, 2 Tage. Deniz schickt den Link spätestens am 10.04.2011 (`m6`).
  - Jonas: sobald man ihn kennt.
  - 1 Werkstatt-Punkt.
  - **Pflicht:** kommt automatisch, sobald der Keller frei ist (für das Ziel `openrig`).
- Fasst an: `rigGpuCap()`, `shopList('rigs')`, `wear()`.
- Entscheidung: **mittel**. Ein billiges Board mit Risern fällt öfter aus, ein teures Board mit vielen Steckplätzen nicht.

**13 · Fehlersuche (Stecken und Messen)** · REP · ab 2011 · Mini-Spiel
- Freischaltung: Bei einem defekten Rig gibt es „Fehler suchen“. Im Stecken-Mini-Spiel findet man das eine kaputte Teil, also Riser, Kabel oder Karte, und tauscht nur das. Liegt das Teil im Lager, kostet die Reparatur nichts. Sonst bestellt man es, und das Paket kommt am nächsten Morgen.
- Lernen:
  - Jonas.
  - Forum: 3 Tage.
  - 1 Werkstatt-Punkt.
- Fasst an: `repair()`, `bag` (Ersatzteile), Shop/Pakete.
- Entscheidung: **stark**. Lohnt es sich, Ersatzriser auf Vorrat zu haben, oder wartet man auf das Paket?

**14 · Elektrik mit Opa** · KST · ab Keller · Handgriff
- Freischaltung: Im Firmenfenster kann man den Stromausbau „selbst machen“, aber nur bei den Haushaltsstufen von Wohnung, Keller und Werkstatt. Das kostet 40 % weniger, dafür steht der Standort 2 Tage still. Optional, wenn Hausflur und Keller fertig sind: Die Arbeit passiert am Sicherungskasten im Keller.
- Lernen:
  - Opa im Keller ansprechen, ab Beziehung 0, ein Samstag. Das Ereignis „Opa und der Starkstrom“ wird zur Lehrstunde.
  - Buch „Elektroinstallation für Laien“: 20 $.
  - 2 Werkstatt-Punkte.
- Fasst an: `powerCost()`, `buyPower`, Ereignis `opastrom`, Personal „Elektriker“ (der bleibt für die großen Standorte).
- Entscheidung: **mittel**. Weniger Geld gegen 2 Tage Stillstand; im Boom schmerzt der Stillstand.

**15 · Wasserkühlung** · KST · ab Juni 2011 · Handgriff und kleines Mini-Spiel
- Freischaltung:
  - Teil „Wasserkühlungs-Set“ je Karte, 60 $, kommt als Paket.
  - Einbau am Rig: Kühler auf die Karten, Schläuche stecken, befüllen und dicht prüfen.
  - Danach gehen 70 % der Rig-Wärme über den Radiator nach draußen, das Rig ist leise, und Turbo kostet keinen Hitzezuschlag mehr.
- Lernen:
  - Jonas.
  - Buch „Wasserkühlung kompakt“: 35 $, 3 Tage.
  - 3 Werkstatt-Punkte.
- Fasst an: neues Feld `o.wk`; `analyze()` (Wärme), `facSummary()` (Raumtemperatur), Profil Turbo.
- Entscheidung: **stark**:
  - Das Set kostet 60 $ je Karte; eine Klimaanlage 400 $ plus 900 W Dauerverbrauch.
  - Ideal, wenn die Kühlung am Standort das Limit ist.

**16 · Limit-Orders** · GES · ab Juni 2011 · Handgriff
- Freischaltung:
  - Verkaufsauftrag: „Verkaufe X, sobald der Kurs ≥ Y steht“. Er läuft, bis er ausgeführt oder gestrichen wird.
  - Gebühr 0,5 % statt 1,5 % beim Sofortverkauf.
  - Der Auto-Verkauf kann „nur über dem 7-Tage-Schnitt“ verkaufen, so wie heute der Händler.
- Lernen:
  - Opa: ab Beziehung 2, „Oben verkaufen, kluger Junge“.
  - Forum: 4 Tage.
  - 2 Geschäft-Punkte.
- Fasst an: `tradeFee()`, `sell()`, Auto-Verkauf, Personal „Händler“ (−0,5 % bleibt).
- Entscheidung: **stark**. Eine niedrige Gebühr und ein guter Preis gegen das Risiko, dass der Auftrag nie ausgeführt wird.

**17 · Cold-Wallet (Papier-Wallet)** · GES · ab 20.06.2011 · Freischaltung
- Freischaltung: die Cold-Wallet in der Börse, heute Feature `cold`.
- Lernen: Handy (Deniz nach dem GoxBank-Hack, `m8`), automatisch zum selben Zeitpunkt wie heute.
- Fasst an: `FEATURES.cold`, `transfer()`, Ereignisse GoxBank/FXT.
- Entscheidung: **Grundlage**. Die Abwägung zwischen Sicherheit und Liquidität gibt es heute schon.

**18 · Mining-Image vom USB-Stick** · SOF · ab Okt. 2011, braucht Linux · Handgriff, dann Komfort
- Freischaltung: Man installiert mit einem Klick statt mit dem Assistenten und ohne Wartezeit. Später, zusammen mit Nr. 32 (Fernwartung), bekommt jedes neue Rig das System automatisch.
- Lernen:
  - Deniz.
  - Forum: 3 Tage.
  - 1 Rechner-Punkt.
- Fasst an: Installer, `o.os`.
- Entscheidung: **Komfort**. Das ist bewusst der Ausweg, damit die Installation nicht nervt.

**19 · Lager und Logistik** · GES · ab Keller · Freischaltung
- Freischaltung: Der Bestand „zum Aufstellen“ darf über die freien Stellplätze hinaus wachsen: +4 Kartons im Kellerabteil. Später kommen Hochregale als Ausbau dazu: Werkstatt +20, Halle +100. So kann man in billigen Phasen auf Vorrat kaufen.
- Lernen:
  - Papa: ab Beziehung 1, er kennt das Ladenlager.
  - Buch „Lager clever organisieren“: 15 $.
  - 1 Geschäft-Punkt.
- Fasst an: `orderRoom()`/`orderRoomOk()` aus dem Shop-Umbau, `s.unpacked`, `UPGRADES`.
- Entscheidung: **stark**:
  - Man bindet Kapital gegen steigende Preise.
  - Wer vor dem GPU-Boom 2017 und 2021 Karten hortet, gewinnt.
  - Wer vor dem Halving hortet, verliert.
- Bezug zum Wunsch: „mehrere pcs im inventar“.

**20 · Pool und Solo** · SOF · ab Nov. 2010 · Handgriff
- Freischaltung: Am Gerät oder Standort wählt man „Pool (wie bisher)“ oder „Solo“.
  - Solo bringt im Mittel dasselbe, aber in Blöcken: Ein ganzer Block hat Ende 2010 50 BTC.
  - Lohnt sich nur, solange der eigene Anteil am Netz spürbar ist.
- Lernen:
  - Forum.
  - 1 Rechner-Punkt.
- Fasst an: `revenueFor()` (bei Solo zufällig je Tag), Ticker „Block gefunden!“.
- Entscheidung: **Wackelkandidat**. Die Entscheidung ist nur eine Frage der Risikofreude, macht aber 2010/11 echte Jubelmomente. Die alte Technik „Eigener Pool-Server +2 %“ fällt ersatzlos weg (Abschnitt 9).

### 2.5 FPGA-Kurzzeit (Juli 2011 – 2012)

**21 · FPGA-Boards bedienen** · SOF · ab 01.07.2011 · Handgriff
- Freischaltung:
  - Fieldforge FX-1 und Quad im Shop.
  - Nach dem Aufstellen muss man einmalig „Bitstream laden“ (USB-JTAG-Kabel, 5 s Balken), sonst rechnet das Board nicht.
  - Gibt es jetzt schon ohne Fähigkeit (`fpga1`, `fpga4`).
- Lernen:
  - Forum-Thread „Bitstreams für Fieldforge“ ab 01.07.2011: gratis, 5 Tage. Deniz erinnert am 15.07.2011 daran (`m10`).
  - Buch „FPGA für Bastler“: 40 $, 2 Tage.
  - Deniz: ab Beziehung 2.
  - 2 Rechner-Punkte.
- Fasst an: `shopList('asic')`, `addObject`/`holderAdd`, neues Feld `o.bit`.
- Entscheidung: **stark** (aber nur kurz):
  - 20 W bei 210 MH/s ist in der Wohnung mit 1,8-kW-Limit und Hitze verlockend.
  - Dafür ist das Board teuer, und ab 2013 sind die ASICs da.

**22 · FPGA-Bausatz löten** · SCH/REP · ab Okt. 2011, braucht Nr. 10 und Nr. 21 · Mini-Spiel
- Freischaltung: Fieldforge als Bausatz für 35 % weniger. Löten muss man einmal je Bestellung, nicht je Board.
- Lernen:
  - Forum: 5 Tage.
  - 2 Werkstatt-Punkte.
- Entscheidung: **Wackelkandidat**. Das Fenster ist kurz, und es bringt wenig neue Abwägung.

### 2.6 ASIC-Zeit: Werkstatt und Halle (2013 – 2017)

**23 · ASIC in Betrieb nehmen** · SOF · ab 01.02.2013 · Handgriff (einmal)
- Freischaltung: Beim allerersten ASIC trägt man im Geräte-Menü die Pool-Adresse ein (ein Klick, „Deniz’ Pool“). Danach geht es automatisch.
- Lernen: Handy (Deniz, `m14`), automatisch, Pflicht für Kapitel 3.
- Fasst an: `addObject` (Gerät), Ziel `asic`.
- Entscheidung: **Grundlage**. Ist der Story-Moment „Eine Kiste schafft so viel wie 100 Grafikkarten“.

**24 · Vorbestellen beim Hersteller** · GES · ab Juni 2012 · Handgriff
- Freischaltung: Bei Geräten mit Kontingent (`stock`) gibt es „Vorbestellen“.
  - Man zahlt den Listenpreis ohne Graumarkt-Aufschlag.
  - Geliefert wird in 45–120 Tagen; mit 10 % Chance verschiebt der Hersteller um weitere 30 Tage.
  - Höchstens 10 Vorbestellungen je Monat.
- Lernen:
  - Forum-Thread „Glacier A1: Batch 1“: 3 Tage.
  - Deniz.
  - 2 Geschäft-Punkte.
- Fasst an: `stock`, `stockLeft()`, `itemPrice()` (`stock.mult`), Bestellungen (`orders`, `due`).
- Entscheidung: **stark** und historisch: Heute doppelt so viel zahlen oder in drei Monaten günstig bekommen, wenn die Netz-Hashrate den Ertrag schon halbiert hat? Genau das war die Lektion von 2013.

**25 · Gebrauchtmarkt** · GES · ab März 2014 · Freischaltung
- Freischaltung: Shop-Reiter „Gebraucht“.
  - Karten und Geräte sind 1–3 Jahre alt und kosten 35–60 % des Neupreises.
  - Zustand A, B oder C; C ist defekt und lohnt sich nur mit Nr. 10 oder Nr. 31.
  - Die Angebote wechseln jede Woche.
  - Nach Krypto-Wintern (2015, 2018/19) und nach dem Merge (Sept. 2022) gibt es echte Schwemmen.
- Lernen:
  - Forum-Marktplatz: gratis, 3 Tage.
  - Jonas.
  - 1 Geschäft-Punkt.
- Fasst an: Shop, `itemPrice()`, `o.bought` (Alter zählt in `wear()`), Ereignis Insolvenz-Container 2018.
- Entscheidung: **stark**. Billig gegen alt, und man kann gezielt Defektes kaufen, wenn man reparieren kann.

**26 · Serienbau und Vorlagen** · SCH · ab Keller · Komfort
- Freischaltung:
  - Bis zu 5 eigene Builds als Vorlage speichern und mit einem Klick als Bausatz-Serie bestellen (×1, ×5, ×10 in einem Paket).
  - Das ist „builds direkt kaufen“ für Selbstschrauber.
  - Fertig montiert kauft man weiter bei Kemal und Jonas; das hat er schon abgenommen.
- Lernen:
  - Kemal: ab 3 Aufträgen.
  - Jonas.
  - 2 Werkstatt-Punkte.
- Fasst an: `lastBuild`, Konfigurator, `orderBuild()` aus dem Shop-Umbau, `assembleAll()` (bleibt frei).
- Entscheidung: **Komfort**. Bezug zum Wunsch: „builds direkt kaufen“.

**27 · ASIC-Firmware flashen** · SOF · ab Juni 2016 · Handgriff
- Freischaltung: Am ASIC: „Firmware flashen“ (Datei wählen, 10 s Balken, „Nicht ausschalten!“).
  - Danach −8 % Strom bei gleichem Hash, wie die heutige Technik `firmware`.
  - Dieselben Tuning-Profile wie bei den Rigs (Eco/Standard/Turbo).
  - Kostet die Garantie: Neue ASICs haben jetzt 180 Tage Garantie; ein defektes Gerät wird kostenlos ersetzt, ist aber 30 Tage weg.
  - Dazu kommt 2 % Risiko, dass das Gerät nicht mehr startet (Rettung mit Nr. 10).
  - „Alle gleichen Geräte hier flashen“ geht als Sammelbefehl.
- Lernen:
  - Kurs „Herstellerschulung Firmware“: max. 2.000 $ oder 3 Tagesumsätze, 3 Tage.
  - Deniz: als CTO nach der GmbH, ab Beziehung 2.
  - 3 Rechner-Punkte.
- Fasst an: `analyze()` (Gerät), `fx('asicHash')`/`fx('asicPower')` (entfällt), neue Felder `o.fw`, `o.warranty`, `wear()`.
- Entscheidung: **stark**: Garantie gegen Effizienz.

**28 · BIOS-Mod (Speicher-Timings)** · TUN · ab Aug. 2016 (Polaris) bis zum Merge · Handgriff
- Freischaltung: An Crimson-Polaris-Karten (RS 470/480/570/580) „BIOS flashen“: +18 % Ethash bei gleichem Strom. Jeder Flash hat 3 % Risiko, dass die Karte tot ist („gebrickt“, Rettung im Löt-Mini-Spiel mit dem BIOS-Clip). Sammelbefehl je Rig.
- Lernen:
  - Forum „Polaris-Straps“: 5 Tage.
  - Deniz.
  - 2 Rechner-Punkte.
  - Braucht Nr. 7.
- Fasst an: `analyze()` (Rig, nur Ethash/ETC), neues Feld `o.bios`.
- Entscheidung: **stark** und historisch: Polaris wird gegenüber Verdant attraktiver, allerdings mit Risiko.

**29 · Großhandel (Mengenrabatt)** · GES · ab GmbH · Freischaltung
- Freischaltung: Wer 10 gleiche Geräte in einer Bestellung kauft, zahlt 8 % weniger; ab 50 Stück 12 %. Geliefert wird per Spedition.
- Lernen:
  - Kurs „Einkauf für Unternehmen“ (IHK-Abendkurs): max. 1.500 $ oder 2 Tagesumsätze, 5 Tage.
  - Papa.
  - 3 Geschäft-Punkte.
- Fasst an: `holderAdd()`/`orderHolder()`, `itemPrice()`. Hierhin wandert der alte Schrauben-Rabatt (Abschnitt 9).
- Entscheidung: **stark**. Man bindet viel Kapital auf einmal und verliert Flexibilität, etwa wenn kurz darauf ein besseres Modell kommt.

**30 · Leute einarbeiten** · GES · ab erstem Techniker (Halle) · Freischaltung
- Freischaltung:
  - Techniker übernehmen deine Reparatur-Fähigkeiten.
  - Mit Nr. 10 oder 13 reparieren sie zu Materialkosten (25 %), mit Nr. 31 zu 10 %, statt heute 60 % von `repairCost`.
  - Mit Nr. 9 machen sie Wartungsrunden; das ersetzt die Technik „Staubfilter & Wartungsplan“.
- Lernen:
  - Kurs „Ausbilderschein“: 600 $, 4 Tage.
  - 2 Geschäft-Punkte.
- Fasst an: `techRepairs()`, `staffFx()`, `TECHS.dustfilter` (entfällt).
- Entscheidung: **mittel**. Man investiert einmal, damit es sich im großen Betrieb lohnt.

### 2.7 Rechenzentrum (2017 – 2021)

**31 · Hashboard-Reparatur (Chips löten)** · REP · ab 2017, braucht Nr. 10 · Mini-Spiel
- Freischaltung: Defekte ASICs repariert man selbst, auch C-Ware vom Gebrauchtmarkt oder den Insolvenz-Container 2018. Das geht im Mini-Spiel „Chip-Kette“, zum Materialpreis (10 % von `repairCost`).
- Lernen:
  - Kurs „Service-Lehrgang beim Hersteller“: max. 5.000 $ oder 3 Tagesumsätze, 7 Tage.
  - Papa: nach den Ereignissen „papaJob“ oder „papaRepairs“ („Endlich wieder richtige Platinen!“).
  - 4 Werkstatt-Punkte.
- Fasst an: `repair()`, Gebrauchtmarkt, Ereignis Insolvenz-Container, Nr. 30.
- Entscheidung: **stark**. Lohnt es sich, kaputte Miner billig zu kaufen und aufzubereiten?

**32 · Fernwartung** · SOF · ab 2016, braucht Linux · Komfort
- Freischaltung: Sammelbefehle über alle Standorte von Handy oder Laptop: Profil, Coin, Betrieb, Neustart. Dazu eine Liste aller Defekte mit „Techniker hinschicken“. Neue Rigs bekommen das Image automatisch (siehe Nr. 18).
- Lernen:
  - Kurs „Linux-Server-Admin“ (online): 300 $, 4 Tage.
  - Deniz.
  - 2 Rechner-Punkte.
- Fasst an: Inspektor-Sammelbefehle, Firmenfenster, `brokenIn()`.
- Entscheidung: **Komfort**, aber wichtig, weil man nicht teleportiert und sonst jeden Standort abläuft.

**33 · Autotuning und Leistungsziel** · TUN · ab Okt. 2019, braucht Nr. 27 · Handgriff
- Freischaltung: Ein Regler „Leistungsziel“ von 60 bis 120 % je Gerät oder Standort; dabei gilt Hash ∝ Leistung^0,7. „Fahr den Standort genau auf den Anschluss“ wird so zu einem Knopf.
- Lernen:
  - Kurs.
  - Deniz.
  - 3 Rechner-Punkte.
- Fasst an: `analyze()`, `autoLimit()`, `facCap()`.
- Entscheidung: **stark**. Man wählt zwischen Effizienz (weniger Leistung, besseres J/TH) und dem vollen Anschluss.

**34 · Immersionskühlung** · KST · ab Sept. 2020 · Freischaltung und Handgriff
- Freischaltung: neues Objekt „Immersions-Tank“ (Halter, 12 Plätze, kühlt sich selbst, ab Halle). Miner im Tank haben bei Leistungsziel bis 115 % Ausfälle ×0,7 statt ×1,6. Das ersetzt die heutige Technik `immersion` (+10 % Hash, −30 % Ausfälle), aber nur für die Geräte im Tank.
- Lernen:
  - Kurs „Immersion-Workshop“ (Messe): max. 20.000 $ oder 2 Tagesumsätze, 3 Tage.
  - Deniz: ab Beziehung 2.
  - 4 Werkstatt-Punkte.
- Fasst an: `PLACEABLES` (Halter, `selfCooled`), `wear()`, `TECHS.immersion` (entfällt).
- Entscheidung: **stark**. Der Tank kostet viel, dafür werden Leistung und Dichte möglich.

**35 · Lastmanagement (Abschalten bei Preisspitzen)** · KST · ab Juni 2021 · Handgriff
- Freischaltung: Schalter je Standort „Bei Preisspitzen abschalten“: Strom ×0,85, Laufzeit ×0,92. Im Fjord kommt der „Netzdienst-Vertrag“ dazu: Geld fürs Abschalten auf Abruf.
- Lernen:
  - Kurs „Energiemarkt für Großverbraucher“.
  - Mama: kleine Version schon mit Nr. 11.
  - 3 Geschäft-Punkte.
- Fasst an: `elecPrice()`, `facSummary()`, `TECHS.trading` (entfällt).
- Entscheidung: **stark**. Lohnt sich nur, wenn der Strom einen großen Anteil am Ertrag frisst.

### 2.8 Endspiel (2022 – 2030)

**36 · Rechenleistung vermieten (KI und Rendern)** · SOF/GES · ab 15.09.2022 (Merge) · Handgriff
- Freischaltung: Betriebsart „Vermieten“ für GPU-Rigs ab 8 GB VRAM. Es gibt einen festen Betrag je Karte und Tag aus einer Preiskurve: 2022 wenig, 2023/24 KI-Boom, danach fallend. Das passt zum Erfolg `ai`.
- Lernen:
  - Handy (Deniz nach dem Merge: „Die KI-Leute suchen Grafikkarten!“), dann Kurs „Cloud-Hosting“.
  - 3 Rechner-Punkte.
  - Braucht Nr. 6.
- Fasst an: `analyze()` (neue Einheit ohne Coin), Erfolg `merge`/`ai`.
- Entscheidung: **stark** und historisch: RVN oder KAS schürfen oder vermieten? Ist die einzige Zukunft für Grafikkarten nach dem Merge.

**37 · Abwärme verkaufen** · KST · ab Jan. 2022 · Freischaltung
- Freischaltung: neue Ausbauten mit Wärmetauscher:
  - „Gewächshaus für Mama“ (Keller/Werkstatt, klein, Mama +1, ab Aug. 2023).
  - „Fernwärme Sogn“ (Fjord, −20 % Strom). Das ist die heutige Technik `heatsale`; Bonusziel `b6heat` zeigt dann darauf.
- Lernen:
  - Kurs „Wärmenetze“.
  - Mama: Gewächshaus-Fan, ab Beziehung 2.
  - 3 Werkstatt-Punkte.
- Fasst an: `UPGRADES`, `TECHS.heatsale` (entfällt), Bonusziel `b6heat`.
- Entscheidung: **mittel**.

**38 · Sensoren und Frühwarnung** · SOF · ab Jan. 2024 · Handgriff
- Freischaltung: Liste „Fällt bald aus“ (3–7 Tage Vorwarnung je Gerät) und der Knopf „Vorher warten“ (Nr. 9 an allen markierten Geräten). Techniker mit Nr. 30 machen das selbst. Ersetzt die Technik `predict` (−50 % Ausfälle).
- Lernen:
  - Kurs.
  - Deniz.
  - 4 Rechner-Punkte.
- Fasst an: `wear()` (würfelt vorab), Firmenfenster.
- Entscheidung: **mittel**.

**39 · Hydro-Kühlkreislauf** · KST · ab Juni 2024 · Freischaltung
- Freischaltung: Hydro-Miner auch außerhalb von Rack und Container, über das Objekt „Trockenkühler und Verteiler“ (Halle, RZ, Fjord). Rack und Container bleiben ohne Fähigkeit möglich, damit nichts wegfällt.
- Lernen:
  - Herstellerschulung.
  - 3 Werkstatt-Punkte.
- Fasst an: `placeableAllowed()` (`hydro`), `PLACEABLES`.
- Entscheidung: **mittel**.

**40 · Heizungs-Miner für Lindental** · KST · ab Okt. 2022 (Energiekrise) · Freischaltung
- Freischaltung: Alte ASICs gehen als Heizung zu Nachbarn, etwa zu Frau Kowalczyk. Von November bis März zahlen die Nachbarn den Strom, die Coins gehören dir. Die Geräte stehen in einer eigenen Liste „Bei Nachbarn“.
- Lernen: Opa, ab Beziehung 3, „Ich kenn jeden Keller in Lindental“.
- Fasst an: neue Liste `s.lent`, `progressDay`.
- Entscheidung: **Wackelkandidat**. Mit viel Charme: Es gibt eine Alternative zum Verschrotten, aber es ist ein eigenes kleines System.

### 2.9 Ehrliche Bilanz

- **40 Fähigkeiten**, davon:
  - 27 mit echter Entscheidung (Ziel ≥ 25 erreicht): 18 **stark**, 9 **mittel**,
  - 3 **Komfort** (Nr. 18, 26, 32),
  - 3 **Wackelkandidaten** (Nr. 20, 22, 40),
  - 7 **Grundlagen** (Nr. 1–5, 17, 23).
- Die Grundlagen sind kein Fehler: Er will „einige sachen am anfang kriegt man über sein handy nachrichten“. Sie ersetzen die heutigen Feature-Karten für Börse und Cold-Wallet und machen das Tutorial zur Geschichte.
- **Streichliste**, falls es zu viel wird: erst Nr. 22, dann Nr. 20, dann Nr. 40 (Nr. 40 gern als spätere Erweiterung).

---

## 3. Lernwege im Detail

### 3.1 Punkte durch Tun

Es gibt **drei Erfahrungstöpfe**: *Werkstatt* (Schrauben, Kühlung & Strom, Reparatur), *Rechner* (Software, Tuning) und *Geschäft*. Erfahrung (EP) gibt es nur fürs Tun, **nicht fürs Laufenlassen**. Das heutige „+6 EP Mining je Tag“ entfällt; genau das ist „mining skill quatsch“.

| Topf | Wofür | EP |
|---|---|---|
| Werkstatt | neu gekauftes Teil eingebaut (nur frische Teile, wie heute `s.fresh`) | 15 |
| | Bausatz fertig | 25 |
| | Gerät aufgestellt (nicht beim Umziehen) | 10 |
| | selbst repariert per Mini-Spiel / per Routine | 30 / 10 |
| | Wartung | 5 (höchstens 50 am Tag) |
| | Wasserkühlung eingebaut | 40 |
| | Strom selbst ausgebaut | 80 |
| Rechner | Betriebssystem per Assistent / per Image | 20 / 5 |
| | Tuning-Profil erstmals für einen Gerätetyp | 25 |
| | Firmware, BIOS-Mod oder Bitstream | 20 |
| | Vermietung gestartet | 30 |
| Geschäft | Verkauf oder Kauf nach Volumen: Umsatz ÷ 10, 2–75 je Handel (wie heute) | 2–75 |
| | Limit-Order ausgeführt | 10 |
| | Vorbestellung geliefert | 40 |
| | Gebraucht gekauft | 10 |
| | Personal eingestellt | 30 |
| | Tarif gewechselt | 20 |

- **Deckel:** höchstens 300 EP je Topf und Spieltag, damit der Zeitraffer nicht explodiert.
- **Fähigkeitspunkte:** Der n-te Punkt braucht 100·n EP mehr als der vorige. Gesamt heißt das: 100, 300, 600, 1.000, 1.500, 2.100, 2.800, 3.600, 4.500, 5.500 …
- **Zum Vergleich der Bot heute:** Im Juni 2021 hat er Schrauben 5.700 EP (≈ 10 Werkstatt-Punkte) und Handel 9.700 EP (≈ 13 Geschäft-Punkte).
- **Kosten einer Fähigkeit:** 1–4 Punkte. Mit Punkten allein bekommt man ungefähr ein Drittel bis die Hälfte aller Fähigkeiten. Für den Rest nimmt man Bücher, Forum, Kurse und Leute. Genau dadurch entsteht die Entscheidung, *wofür* man seine Punkte ausgibt.
- Alte EP aus Ereignissen, Bonuszielen und Fundstücken (`xp: {hw|mining|trade}`) landen im passenden Topf (Abschnitt 7).

### 3.2 Forum, Bücher und Kurse

| Weg | Wo | Kosten | Dauer | Ab wann |
|---|---|---|---|---|
| **Forum** | am PC-Monitor (Browser „Mining-Forum“) oder im Handy | gratis | 2–7 Spieltage „mitlesen“ | ab Start |
| **Buch** | Online-Shop, Reiter „Bücher“. Im Paket-Modus kommt es **am nächsten Morgen als Paket vor die Wohnungstür**. Danach liegt es auf dem Schreibtisch: E → „Lesen“, oder im Menü J | 10–40 $ | 1–7 Spieltage | ab Start |
| **Kurs** | Volkshochschule bzw. IHK Lindental, Herstellerschulung, Messe-Workshop; Anmeldung im Handy oder Firmenfenster | max(Mindestpreis, n Tagesumsätze), gedeckelt, so wie `amt()` in `events.js` | 3–7 Spieltage | ab Werkstatt bzw. GmbH |

- **Ein Lernplatz:** Man liest oder belegt immer nur eine Sache gleichzeitig. Weitere stehen in der Warteschlange („Danach: …“). Leute sind davon getrennt.
- Lernen läuft mit der Spielzeit. Bei Tempo 4 ist ein Buch in Sekunden durch, und man wartet nie auf Echtzeit.
- **Sichtbarer Fortschritt:** Gelesene Bücher stehen im Regal der Wohnung bzw. des Kellers. Ein Bücherregal, das voller wird, ist schöner als ein Balken.
- Das Paket-System aus dem Shop-Umbau braucht dafür nur eine neue Posten-Art: `orderAdd([{ k: 'book', id }], preis)`. Beim Auspacken landet sie in `s.sk.books`.

### 3.3 Leute

| Person | Wo man sie fragt | bringt bei (Beziehung nötig) |
|---|---|---|
| **Deniz** | Handy ab Start; persönlich ab GmbH (Werkstatt) | Grundlagen (automatisch), Linux (1), Takt & Spannung (1), FPGA (2), Firmware (2, nach GmbH), Immersion (2), Autotuning, Fernwartung, Sensoren |
| **Opa Heinz** | im Keller, sobald Starkstrom liegt; vorher per Handy („Komm Samstag vorbei“) | Elektrik (0), Limit-Orders (2), Heizungs-Miner (3) |
| **Papa** | im Laden per Handy, ab Kapitel 3 in der Werkstatt | Löten (1), Lager (1), Großhandel (1), Hashboard (nach „papaJob“/„papaRepairs“) |
| **Mama** | Handy | Luftstrom (1), Stromtarif (1), Abwärme/Gewächshaus (2) |
| **Kemal** | Handy, Kontakt aktiv | Wartung, Serienbau (ab 3 Aufträgen) |
| **Jonas** | Handy, Kontakt aktiv | Riser & Open-Frame, Fehlersuche, Wasserkühlung, Gebrauchtmarkt |

- **Ablauf:**
  - Wo die Person in der Welt steht (Opa im Keller, Papa in der Werkstatt, Deniz ab GmbH), gibt es im Gespräch (`talk`) einen neuen Knopf: „Bring mir … bei“.
  - Sonst geht man über Handy → Kontakte → „Um Hilfe bitten“. Die Lehrstunde ist dann am nächsten Spieltag fertig.
  - Es wird **nicht teleportiert**: Wer bei Opa lernen will, geht in den Keller oder ruft an.
- **Kosten:**
  - Ein Spieltag.
  - Bei Opa wahlweise ein Kasten Bier für 20 $; das passt zum Ereignis „Opa und der Starkstrom“.
- **Beziehung:**
  - Eine Lehrstunde zählt wie ein Gespräch: +¼ Punkt, mit den Grenzen aus `TALK_REL`.
  - Ist die Beziehung zu niedrig, sagt die Person freundlich ab und gibt einen Hinweis, etwa „Opa: ‚Hilf mir erst mal mit dem Radio.‘ (Beziehung 2 nötig)“.
  - So bekommen die Beziehungspunkte endlich einen spielerischen Nutzen.

### 3.4 Handy-Nachrichten am Anfang

| Wann | Von | Lehrt |
|---|---|---|
| Tag 1 (`m0`) | Deniz | Nr. 1 PC zusammenbauen, Nr. 2 CPU-Mining starten |
| erste Grafikkarte im Paket | Deniz | Nr. 3 Grafikkarte und GPU-Miner |
| 12 $ in Coins | Deniz | Nr. 4 Bitcoin verkaufen |
| zweiter PC als Bausatz | Deniz | Nr. 5 Windows installieren, dazu der Hinweis „oder lern Linux, kostet nix“ (Nr. 6 lernbar) |
| 01.12.2010 | Deniz | Hinweis auf den Undervolting-Guide (Nr. 7 lernbar) |
| 10.04.2011 (`m6`) | Deniz | Forum-Link Milchkisten (Nr. 12 lernbar) |
| 20.06.2011 (`m8`) | Deniz | Nr. 17 Cold-Wallet |
| 15.07.2011 (`m10`) | Deniz | Forum-Link FPGA (Nr. 21 lernbar) |
| 01.02.2013 (`m14`) | Deniz | Nr. 23 ASIC in Betrieb nehmen |
| 15.09.2022 (`m28`) | Deniz | Hinweis auf die Vermietung (Nr. 36 lernbar) |

- **Was man dann sieht:** Jede Lehr-Nachricht zeigt statt der heutigen Feature-Karte eine Karte „**Gelernt:** …“ bzw. „**Neu lernbar:** …“ mit dem Knopf „Zeig mir wo“.
- **`FEATURES` bleibt** für die reinen Bedien-Funktionen (Zeitraffer, Karte, Logbuch, Firma).

---

## 4. Menü-Konzept (Taste J)

```
┌ Fähigkeiten ──────────────────────────────────────────────────── J ✕ ┐
│ Werkstatt ▓▓▓▓▓░░  2 Punkte frei   Rechner ▓▓░░░░░  1 Punkt   Geschäft ▓░░░░░░  0 │
│ Gerade: Buch „Linux für Rechner-Bastler“  ▓▓▓▓░░  noch 1 Tag   · danach: Forum FPGA │
├──────────────────────────────────────────────────────────────────────────┤
│ [Alle] [Schrauben] [Software] [Tuning] [Kühlung & Strom] [Reparatur] [Geschäft] │
├──────────────────────────────────────────────────────────────────────────┤
│ JETZT LERNBAR (3)                                                        │
│ ┌ Takt & Spannung ─────────────────────────── Tuning ┐                   │
│ │ Am Rig: Eco (−20 % Strom) oder Turbo (+8 % Hash).  │                   │
│ │ Lohnt sich: sobald du Strom selbst bezahlst.       │                   │
│ │ [Buch · 25 $ · 1 Tag] [Forum · gratis · 5 Tage]    │                   │
│ │ [Deniz · 1 Abend ✓]   [2 Rechner-Punkte]           │                   │
│ └────────────────────────────────────────────────────┘                   │
│ ┌ Löten ── Reparatur ┐  [Papa · Beziehung 1 nötig ✗] [Buch 12 $] [2 P.]  │
│ ┌ Stromtarif ── Geschäft ┐  [Mama · 1 Abend ✓]                            │
│                                                                          │
│ BALD (2)    FPGA-Boards bedienen – ab Juli 2011 · Wasserkühlung – ab Juni │
│ GELERNT (6) PC zusammenbauen · CPU-Mining · Grafikkarte · Börse · …  [▾]   │
│ SPÄTER      ??? · 24 weitere, je weiter du kommst                         │
└──────────────────────────────────────────────────────────────────────────┘
```

**Zustände einer Fähigkeit:**

| Zustand | Wann | Was man sieht |
|---|---|---|
| **Später** | mehr als ein Kapitel entfernt | nur als Zähler „??? · 24 weitere“, keine Spoiler |
| **Bald** | Datum, Standort oder Voraussetzung fehlt, aber in Reichweite | Name und Grund: „ab Juli 2011“, „braucht Löten“, „ab Werkstatt“ |
| **Lernbar** | alles erfüllt | Karte mit Wirkung, Abwägung („Lohnt sich, wenn …“) und **allen Lernwegen als Knöpfen**; was nicht geht, ist grau mit Grund („Beziehung 1 nötig“, „fehlen 10 $“) |
| **Wird gelernt** | Buch, Forum oder Kurs läuft | Balken, Resttage, „Abbrechen“ (Buch bleibt, Forum fängt neu an) |
| **Gelernt** | fertig | kleine Zeile mit „Wo?“ → Knopf „Zeig mir wo“: öffnet z. B. den Inspektor-Reiter „Tuning“ am nächsten Rig oder markiert den Shop-Reiter |

- **Auf einen Blick:** freie Punkte je Topf, was gerade gelernt wird, und wie viel jetzt lernbar ist. Im Dock trägt J ein Abzeichen, sobald etwas Neues lernbar ist oder ein Punkt frei wird.
- **Karte „Gelernt“:** Sie ersetzt das heutige Popup „Neue Stufe“ mit großem Symbol, „Gelernt: Linux-Mining-System“ und „Neu: Beim Installer kannst du Linux wählen (spart 60 $ je Rig)“. Wie heute wird sie zurückgehalten, solange ein Fenster offen ist.
- **Bedienung:**
  - Esc schließt das Menü; erst das nächste Esc öffnet die Pause.
  - „Zeig mir wo“ schließt das Menü, bevor es etwas anderes öffnet, damit nie zwei Fenster übereinander liegen.
  - Bei 1366×768 passen 3 lernbare Karten untereinander, ohne dass etwas abgeschnitten wird.

---

## 5. Mini-Spiele

**Grundsatz:** Ein Mini-Spiel wird **nie aufgezwungen**. Bei einem Defekt hat man immer drei Knöpfe:
1. **Selbst reparieren** (Mini-Spiel, spart Geld)
2. **Sofort (Routine)** (ab 5 geschafften Reparaturen dieser Art, ein Klick, gleiche Ersparnis, weniger EP)
3. **Reparieren lassen** (kostet `repairCost`, wie heute)

`repairAll` bleibt als Bezahl-Knopf. Im Zeitraffer ab Tempo 3 springt nie etwas auf. Defekte warten in der Liste, bis man selbst klickt.

| Mini-Spiel | Wann | Ablauf | Dauer | Belohnung |
|---|---|---|---|---|
| **Löten** (Nr. 10) | defekter Rig, Netzteil, Mainboard; gebrickte Karte | (1) Messen: 3–5 Messpunkte antippen, einer zeigt den falschen Wert. (2) Löten: Taste oder Finger halten, der Wärmebalken füllt sich; im grünen Bereich loslassen. Zu kurz ergibt eine kalte Lötstelle, zu lang ein verbranntes Pad. 2–3 Lötstellen. | 15–20 s | Reparatur zum Materialpreis (25 %), +30 Werkstatt-EP; alle Stellen grün („sauber“): +10 EP |
| **Stecken** (Nr. 13) | Rig „startet nicht“ / „Karte fehlt“ | Board mit Risern und Kabeln. Halbe-halbe abziehen, „Test-Boot“, LED grün oder rot; so findet man das kaputte Teil in 2–3 Zügen. Danach Ersatz einstecken und Farben zuordnen (kein Molex an SATA). | 10–15 s | nur das kaputte Teil kostet (aus dem Lager: 0 $), +20 EP |
| **Chip-Kette** (Nr. 31) | defekter ASIC | Spannung von Chip zu Chip messen; hinter dem toten Chip fällt sie ab. Den Chip auslöten, dann im Löt-Takt neu setzen. | 20–25 s | 10 % von `repairCost`, +40 EP |
| **Dichtheit** (Nr. 15) | einmal beim Einbau der Wasserkühlung | Pumpe läuft, 10 s auf Tropfen achten, die tropfende Verschraubung antippen. | 10 s | ohne Prüfung 20 % Chance auf ein „Leck“ (Rig defekt, Löten) |

- **Fehlschlag macht nichts schlimmer.** Man darf einmal neu versuchen, sonst zahlt man den normalen Preis. Es gibt keine Strafe außer der verlorenen Ersparnis.
- **Überspringen:** Der Knopf ist jederzeit sichtbar. Esc bricht **nur das Mini-Spiel** ab, ohne Kosten; erst das nächste Esc öffnet die Pause. Das Mini-Spiel ersetzt den Inspektor für die Dauer und öffnet ihn danach wieder. Es liegen nie zwei Fenster übereinander.
- **Häufigkeit:** Selbst bei 100 Geräten taucht ein Mini-Spiel nur auf, wenn man selbst klickt. Ab 5 Erfolgen gibt es „Routine“. Ab der Halle übernehmen das Techniker mit Nr. 30. Dazu ist **Frage 3** offen.
- **Bedienung:** Maus, Touch (`touch.js`) und Tastatur (Leertaste halten). Kein Zeitdruck außer dem Wärmebalken. Ton über `audio.js` (Zischen beim Löten, Klick beim Stecken).

---

## 6. Echte Handgriffe

| Handgriff | Wo | Wie es sich anfühlt |
|---|---|---|
| **Betriebssystem installieren** (Nr. 5, 6, 18) | Inspektor-Reiter „System“, als Monitor gestaltet; beim ersten PC auf dem echten 3D-Bildschirm (`screensDirty`) | Assistent: Sprache → Festplatte → „Windows (60 $)“ oder „Linux (gratis)“ → Balken. Bei Tempo 1 etwa zwei Spielstunden, danach startet der Miner. Mit Image ein Klick, mit Fernwartung automatisch. |
| **Takt, Spannung, Leistungsziel** (Nr. 7, 33) | Inspektor-Reiter „Tuning“ im BIOS-Look (blau-grau, Monospace) | Drei Profil-Knöpfe. Darunter eine Live-Vorschau: Hash, Watt, °C am Standort, Netto pro Tag, Ausfall-Risiko. Mit Nr. 33 ein Regler von 60–120 %. Sammelknopf „Auf alle gleichen hier“. |
| **Firmware und BIOS flashen** (Nr. 27, 28) | Geräte-Menü im Inspektor (Web-Oberfläche des ASIC bzw. Konsole des Rigs) | „Datei wählen“ (Hashwerk-FW / Polaris-Straps) → Warnung „Garantie erlischt“ → 10 s Balken „Nicht ausschalten!“ → Neustart-Animation am Gerät. |
| **Wasserkühlung einbauen** (Nr. 15) | am Rig (Paket mit Set ausgepackt) | Karten nacheinander anklicken (Kühler drauf, Karte im 3D-Modell bekommt einen Block), Schläuche stecken, befüllen, dann das Mini-Spiel Dichtheit. Am Ende hängt ein Radiator am Fenster. |
| **Bitstream laden** (Nr. 21) | am FPGA | USB-JTAG-Kabel anstecken (Klick), 5 s Balken, Board-LEDs blinken grün. |
| **Strom selbst ausbauen** (Nr. 14) | Firmenfenster, optional am Sicherungskasten im Keller | „Selbst machen“ → 2 Tage Baustelle (Absperrband, Kabeltrommel). Mit dem Hausflur und Keller aus dem Parallel-Umbau geht man dafür hin. |
| **Bei Leuten lernen** (Abschnitt 3.3) | im Keller bei Opa, in der Werkstatt bei Papa | hingehen, ansprechen, „Bring mir … bei“, kurze Zeile („Rot ist Phase, Blau ist Null.“), Karte „Gelernt“. |

**Regel:** Ein Handgriff dauert höchstens drei Klicks und zehn Sekunden. Was man oft tut, bekommt einen Sammelknopf („Auf alle gleichen“), damit es ab dem zehnten Rig nicht nervt.

---

## 7. Was mit den alten Fähigkeiten passiert

### 7.1 Im Spiel

| Heute | Neu |
|---|---|
| Schrauben: −2 % Hardwarepreis je Stufe (`itemPrice`, Z. 235) | **entfällt**; Ersatz: Großhandel (Nr. 29), Gebrauchtmarkt (Nr. 25), Vorbestellen (Nr. 24), Linux statt Lizenz (Nr. 6) |
| Mining: +2 % Ertrag je Stufe (`fx('rev')`, Z. 140) und 6 EP je Tag (Z. 1019) | **entfällt komplett**; Ersatz: Tuning-Profile (Nr. 7, 27, 33), BIOS-Mod (Nr. 28) |
| Handel: Gebühr 4 % → 0,5 % je Stufe (`TRADE_FEES`, `tradeFee`) | feste Gebühr **1,5 % Sofortverkauf**, **0,5 % mit Limit** (Nr. 16), Händler −0,5 % (mindestens 0,2 %) |
| Popup „Neue Stufe“, „+15 EP Schrauben“ | Karte „Gelernt …“, kleine Einblendung „+15 Werkstatt-Erfahrung“, „Fähigkeitspunkt frei“ |
| Bau-Panel „Schrauben −X %“ (`ui.js` Z. 293) | fällt weg |
| Erfolg `master` „Eine Fähigkeit auf die höchste Stufe“ | gleiche ID, neu: „**Meisterbrief** – alle Fähigkeiten einer Kategorie gelernt“ |
| Erfolg `tinker` „Fünf Techniken entwickelt“ | gleiche ID, neu: „**Tüftler** – fünf Fähigkeiten aus Büchern oder Forum gelernt“ |

**Weiterverwendung von `addXp(k, n, quiet)`:** Die Funktion bleibt als dünne Weiterleitung erhalten: `hw` → Werkstatt, `trade` → Geschäft, `mining` → Rechner. So müssen die vielen Aufrufer (Ereignisse, Bonusziele, Fundstücke, Shop-Umbau) nicht auf einmal angefasst werden. Nur die Texte („+40 EP Schrauben“ in `story.js`, Hinweise wie „viel Hardware-Erfahrung“ in `events.js`) bekommen neue Wörter.

### 7.2 Alte Spielstände

Die Migration läuft in `load()` über `migrateSkills(s)`, ohne neue Speicher-Version. Erkennbar ist ein alter Stand an `s.sk` fehlt.

1. **Erfahrung:** `s.skills.hw` → Werkstatt-EP 1:1, `s.skills.trade` → Geschäft-EP 1:1, `s.skills.mining` → Rechner-EP ×0,4 (das war passiv verdient). Die Punkte ergeben sich aus den Schwellen. **Alle Punkte sind frei**, und eine Handy-Nachricht von Deniz sagt: „Neues Menü (J): Du hast 9 Punkte zu verteilen.“
2. **Gelernt** werden ohne Punktkosten:
   - alle Grundlagen, deren Zeitpunkt vorbei ist;
   - Riser & Open-Frame, wenn eine Milchkiste oder ein Rahmen steht oder `chapter ≥ 1`;
   - FPGA, wenn ein FPGA steht;
   - Linux und Image ab `chapter ≥ 1`, denn alte Stände kannten keine Installation;
   - dazu jede gekaufte Technik über die Tabelle in Abschnitt 8.
3. **Geräte:** Alle bestehenden Rigs bekommen `o.os = 'linux'` (keine Nach-Installation) und Profil „Standard“. Hatte der Spieler die Technik `undervolt`, bekommen sie „Eco“ (entspricht etwa −12 % Strom). Bei `firmware` bekommen die ASICs `o.fw = 'hw'` ohne Garantie.
4. **Übergangspolster:** Alte Stände verlieren auf einen Schlag bis zu +16 % Ertrag und −10 % Hardwarepreis (siehe Abschnitt 9). Damit niemand mitten im Rechenzentrum pleitegeht, gibt es einmalig 120 Tage lang +10 % Ertrag. Die Quelle heißt `src: 'migr2'` in `s.mods`, Text: „Deniz hat vor dem Update alle Rigs noch mal durchoptimiert.“ Das ist kein Fähigkeits-Bonus, sondern eine zeitlich begrenzte Übergangshilfe.
5. **Altes Feld:** `s.skills` bleibt unverändert liegen, damit man notfalls zurückrechnen kann. Die neuen Daten stehen in `s.sk = { ep: {w, r, g}, spent: {w, r, g}, known: {id: Tag}, learning: null | {id, via, until}, queue: [], books: {}, routine: {loeten: n, stecken: n, chips: n} }`.

---

## 8. Was mit den Techniken (`TECHS`, Taste T) passiert

**Empfehlung: zusammenlegen.** Das Wissen wird zu Fähigkeiten mit Handgriff, Bauten werden zu Ausbauten im Firmenfenster, und Taste T fällt weg. Dazu ist **Frage 1** offen.

**Begründung:**
- Die Techniken sind genau das, was er „quatsch“ findet: „+2 % Ertrag auf alles“ (`pool`) oder „−35 % Ausfälle“ (`dustfilter`), gekauft mit einem Klick und ohne Handlung.
- Mehrere heißen schon heute wie Wissen: „Undervolting-*Guide*“ ist ein Buch, „Hashwerk-ASIC-*Firmware*“ ist eine Fähigkeit.
- Zwei Menüs, die beide „freischalten“, verwirren. Der Dock-Knopf T zählt dann nur noch Ausbauten, und die gibt es schon im Firmenfenster (C).
- **Opas Werkbank bleibt** als Ort in der Welt (Keller): Dort lernt man bei Opa, liest und übt das Löten. Sie ist nur kein eigenes Menü mehr.

| Technik heute | wird zu |
|---|---|
| `undervolt` Undervolting-Guide (2010-12, −12 % Rig-Strom) | Nr. 7 Takt & Spannung (das Buch ist ein Lernweg) |
| `pool` Eigener Pool-Server (2011-06, +2 % Ertrag) | entfällt; Nr. 20 Pool & Solo (Wackelkandidat) |
| `dustfilter` Staubfilter & Wartungsplan (2012-06, −35 % Ausfälle) | Nr. 9 Wartung + Nr. 30 Leute einarbeiten (Wartungsrunden); dazu ein Ausbau „Staubfilter-Matten“ je Standort ab Werkstatt (Ausfälle ×0,8) |
| `firmware` Hashwerk-ASIC-Firmware (2016-01) | Nr. 27 ASIC-Firmware flashen |
| `ico` (versteckt, Ereignis) | bleibt versteckt, wie heute |
| `aisle` Kalt-/Warmgang (2017-06, +35 % Kühlung überall) | Ausbau in Halle und RZ (`coolMul 1.35` je Standort) |
| `immersion` Immersionskühlung (2020-09) | Nr. 34 Immersionskühlung (Tank-Objekt) |
| `heatsale` Abwärme ans Fernwärmenetz (2022-01) | Nr. 37 Abwärme verkaufen → Ausbau „Fernwärme Sogn“; Bonusziel `b6heat` prüft dann `s.fac.fjord.up.fernwaerme` |
| `trading` Stromhandels-Abteilung (2023-06) | Nr. 35 Lastmanagement |
| `predict` KI-Wartung (2024-01) | Nr. 38 Sensoren & Frühwarnung |

**Alte Spielstände:** Jede gekaufte Technik ergibt die passende Fähigkeit als „gelernt“. Bei Bauten wird der passende Ausbau gesetzt: `aisle` an allen Standorten ab Halle, `heatsale` als Fjord-Ausbau. Nichts Bezahltes geht verloren.

---

## 9. Balance-Hinweise

### 9.1 Was ich gemessen habe

Ich habe den Balance-Bot `bot9` (Normal, 20.11.2026, Code-Stand `3598a20`) mit Varianten laufen lassen; die alten Boni habe ich dafür im Code abgeschaltet. **Heute** hat der Bot beim Sieg am 25.06.2021:
- Schrauben Stufe 6 (−10 % Hardware),
- Mining Stufe 9 (+16 % Ertrag),
- Handel Stufe 7 (1,3 % Gebühr),
- dazu die Techniken Undervolt (2010-12), Pool und Staubfilter (2013), Firmware und Kalt-/Warmgang (2017) und Immersion (2021-02).

| Variante | Seed 1 | Seed 2 |
|---|---|---|
| heute (alte Boni) | Sieg 06/2021 | Sieg 06/2021 |
| A: keine Boni, Gebühr 4 % | **kein Sieg**, Fjord nie, Vermögen 0,1 Mio. $ | **kein Sieg**, Fjord nie |
| B: keine Boni, Gebühr fest 1,5 % | Sieg 11/2021 (Kontostand zeitweise −126.000 $) | **kein Sieg**, Fjord nie |
| C: nur der Ertrags-Bonus, 1,5 % | Sieg 04/2022 | Sieg 08/2021 |
| D: nur der Preis-Rabatt, 1,5 % | Sieg 06/2021 | **kein Sieg**, Fjord nie |
| E: flach ×1,12 Ertrag, ×0,92 Preis ab Tag 1, 1,5 % | Sieg 06/2021, **aber Kapitel 3 schon 12/2011** statt 02/2013 | – |

**Was daraus folgt:**
1. Die alten Boni tragen die Wirtschaft. Ohne Ersatz kippt der Weg RZ → Fjord, weil 3 Mio. $ dann nicht rechtzeitig da sind.
2. Keiner der beiden Hebel reicht allein zuverlässig. Es braucht Ertrag **und** Preis.
3. Ein flacher Ersatz ab dem ersten Tag macht den Anfang viel zu schnell. Das widerspricht direkt seinem Wunsch: „früher viel langsamer gemined … nicht 800 bitcoins nach ner minute“. Der Ersatz muss **mit der Zeit wachsen**: Tuning ab Dez. 2010, Limit ab Juni 2011, Vorbestellen 2012, Gebraucht 2014, Großhandel ab GmbH, Firmware 2016, Autotuning 2019.

### 9.2 Hebel-Budget (Ersatz für die alten Boni)

| Alt (Stand Juni 2021) | Neuer Hebel | ab | Was der Bot tun muss |
|---|---|---|---|
| Mining +16 % Ertrag | Eco-Profil Rigs (−20 % Strom, −5 % Hash): bei Strom = 50 % des Ertrags ≈ +10 % Netto | Dez. 2010 | lernt Nr. 7 sofort (Forum); monatlich: `profileAll(site)` nach Regel 9.4 |
| | ASIC-Firmware (−8 % Strom) + Profile | Juni 2016 | lernt Nr. 27 (Kurs); flasht alle ASICs (Sammelbefehl) |
| | Autotuning (Leistungsziel) | Okt. 2019 | stellt das Ziel so ein, dass der Anschluss zu 95 % voll ist |
| | BIOS-Mod (+18 % Ethash Polaris) | Aug. 2016 | flasht Polaris-Karten |
| Schrauben −10 % Hardware | Großhandel −8/−12 % (ab 10/50 Stück) | GmbH | kauft ohnehin in Mengen (`holderAdd(n)`), Mengen bündeln |
| | Vorbestellen (kein Graumarkt-Aufschlag) | Juni 2012 | bestellt vor, solange `stock.mult > 1` gilt |
| | Linux statt 60 $ Lizenz | Start | lernt Nr. 6 in der ersten Woche |
| Handel 1,3 % Gebühr | Sofortverkauf fest 1,5 %, Limit 0,5 % | Juni 2011 | Auto-Verkauf mit Limit („über 7-Tage-Schnitt“) |
| Techniken (Undervolt … Predict) | jeweils die Fähigkeit oder der Ausbau aus Abschnitt 8 | gleiche Daten | lernt bzw. kauft zu denselben Zeitpunkten wie heute (`cash > 3× Kosten`) |

### 9.3 Was die Bot-Matrix nicht verschlechtern darf

- **Normal: 4 von 4 Seeds gewinnen**, Sieg zwischen 01/2021 und 09/2021 (heute 06/2021). Fjord spätestens 09/2020 (heute 06/2020).
- **Anfang nicht schneller:**
  - Keller (K2) nicht vor 01/2011 (heute 05/2011).
  - Werkstatt (K3) nicht vor 01/2013 (heute 02/2013).
- **Anfang nicht langsamer:** K2 spätestens 06/2011. Die neue Windows-Lizenz darf die Wohnung nicht verstopfen; dafür lernt der Bot Linux sofort.
- **Gemütlich** (2 Seeds) und **Historiker** (2 Seeds) gewinnen weiter; Historiker darf bis 12/2021.
- **Der Hodl-Bot gewinnt weiterhin nicht.** Er ist die Kontrollgruppe: Nur halten darf nicht reichen.
- **Kontostand und Kredit:**
  - Tiefster Kontostand bei Normal nicht schlechter als −5.000 $ (heute ≈ −2.000 $).
  - Keine Insolvenz.
  - Bankgespräche höchstens 2 bei Normal.
- **Mini-Spiele zählen nicht für die Balance.** Der Bot zahlt Reparaturen wie heute oder nutzt „Routine“. Wer selbst lötet, ist besser dran als der Bot, nie schlechter.

### 9.4 Faustregel für Profile (Bot und Tipp-Text im Menü)

- **Eco**, wenn der Strom mehr als 35 % des Ertrags kostet oder es am Standort über 34 °C hat.
- **Turbo**, wenn der Strom weniger als 15 % kostet (Warmmiete bis März 2011, Fjord) und es unter 30 °C hat.
- Sonst **Standard**.

---

## 10. Umsetzungsplan (für einen Entwickler-Agenten)

**Schritt 0: Warten.** Erst nach dem Merge von Wohnung/Treppenhaus und Shop/Pakete anfangen. Beide fassen `game.js`, `ui.js` und `world.js` an, und der Shop-Umbau bringt neue `addXp`-Aufrufe (`orderPart`, `orderPlan`, `orderBase`, `orderFill`) sowie `orderRoom()`, an das Nr. 19 andockt.

1. **Daten:** neues Modul `src/data/skills.js`. Es ist reine Datenhaltung ohne DOM, im Stil von `contacts.js`:
   - `SKILL_CATS`, `POTS` (`w`, `r`, `g`, mit Schwellen),
   - `SKILLS[]` = `{ id, cat, name, from, minTier?, needs[], due?(s), learn: [{ via: 'msg'|'pts'|'book'|'forum'|'course'|'person', … }], unlock: { feat?, place?, part?, ui? }, desc, use, hint }`,
   - `BOOKS[]` (Shop-Posten), `COURSES[]` (Preisformel wie `amt()`), `TEACH` (Person → Fähigkeit, Beziehung, Geschenk),
   - der Kopfkommentar erklärt das Format, wie in `events.js`.
2. **Sim-Kern:** neues Modul `src/sim/skills.js`, mit Funktionen, die `g` bekommen, nach dem Muster von `story.js` (`talkTo`):
   - `knows(g, id)`, `ways(g, id)` → Liste mit `{ via, ok, why, cost, days }`, `startLearn`, `learnTick(g)` (täglich), `learn(g, id, src)`, `addEp(g, pot, n)` mit Tagesdeckel, `fpFree(g, pot)`, `skillsDue(g)` (Pflicht-Fallbacks per Datum), `migrateSkills(s)`.
   - In `game.js` nur dünne Haken: `newGame`/`load` (`s.sk`), `advanceDay` → `learnTick`/`skillsDue`, `addXp` → `addEp`, `g.knows = (id) => knows(this, id)`.
3. **Alte Boni raus:**
   - `fx('rev')` (Skill-Teil), `itemPrice` (Skill-Rabatt), die Mining-EP je Tag.
   - `TRADE_FEES` raus, `tradeFee(limit)` neu.
   - `SKILL_XP`/`SKILL_PCT` aus den Exporten und den `ui.js`-Importen.
   - **Sofort danach Schritt 9 (Bot) einmal laufen lassen**, um den Einbruch zu sehen. Erwartet sind Werte wie in 9.1, Zeile B.
4. **Gerätezustand und Wirkungen:**
   - Neue Felder `o.os`, `o.prof`, `o.fw`, `o.bios`, `o.wk`, `o.serv`, `o.warranty`, `o.bit` (alle mit `||=` in `load()`).
   - Wirkungen in `analyze()` (Profile, Wasserkühlung, Firmware, BIOS, Vermieten), `wear()` (Wartung, Profile, Riser, Garantie), `facSummary()`/`autoLimit()` (Leistungsziel, Lastmanagement), `repair()`/`repairCost()`/`techRepairs()` (Selbst, Routine, Personal).
5. **Sperren mit Ausweg:**
   - Wo gesperrt wird: `shopList` (FPGA, Reiter „Gebraucht“), `rigGpuCap` (Riser), `orderRoom` (Lager), `powerCost` bzw. Stromausbau (Elektrik), `holderAdd`/`orderHolder` (Großhandel), `stock` (Vorbestellen), `sell` (Limit).
   - Jede Sperre muss in `skillsDue` einen festen Ausweg haben. Dafür kommt ein Test „keine Sackgasse“: Ein Spiel ganz ohne Lernen erreicht trotzdem jedes Kapitelziel.
6. **Techniken auflösen** (nur nach Ja auf Frage 1):
   - `TECHS` bleibt als versteckte Liste für die Migration.
   - Neue `UPGRADES` (`aisle`, `fernwaerme`, `dustmat`).
   - Taste T und Dock-Knopf raus; `FEATURES.techs` umtexten; `b6heat` anpassen; Erfolg `tinker` neu prüfen.
7. **UI Menü:** neues Modul `src/ui/skills.js`:
   - Menü J (Reiter, Karten, Lernwege, Fortschritt, „Zeig mir wo“), Karte „Gelernt“ (ersetzt `levelUp`), Einblendung „+n Erfahrung“ (ersetzt `xpPop`).
   - `ui.skills()` leitet nur noch weiter. Die Tabelle `SKILL` in `ui.js` entfällt.
   - Esc-Verhalten und „kein Fenster über Fenster“ über das vorhandene `openModal`/`closeModal`.
8. **UI am Gerät:**
   - Inspektor-Reiter „System“ (Installer), „Tuning“ (Profile, Regler, Sammelknopf), Geräte-Menü (Firmware/BIOS/Bitstream).
   - Reparatur-Dialog mit drei Knöpfen; Bau-Abschnitt für die Wasserkühlung.
9. **Bot:** `bot10` aus `bot9`:
   - Er lernt jede Fähigkeit zum frühesten Zeitpunkt auf dem billigsten Weg und setzt Profile nach 9.4.
   - Dazu Limit-Auto-Verkauf, Vorbestellen und Mengen-Bündel.
   - Matrix: Normal 4 Seeds, Gemütlich 2, Historiker 2, Hodl 2. Zahlen in `skills.js` drehen, bis 9.3 hält. Daten (`history.js`, `btc_daily.js`) werden nicht angefasst.
10. **Mini-Spiele:** neues Modul `src/ui/minigame.js`:
    - Canvas-2D-Overlay mit Maus, Touch und Tastatur. `play(kind, opts)` liefert ein Promise `{ ok, clean, skipped }`.
    - Vier Spiele: `loeten`, `stecken`, `chips`, `dicht`. Esc bricht nur das Mini-Spiel ab.
11. **Shop und Welt:**
    - Bücher als Paket-Posten `k: 'book'` in `orderAdd`; Auspacken nach `s.sk.books`.
    - Ein Bücher-Requisit im Regal der Wohnung bzw. des Kellers, mit „Lesen“ per E.
    - Beim Gespräch (`talk`) der neue Knopf „Bring mir … bei“; im Handy unter Kontakte „Um Hilfe bitten“.
12. **Inhalte:**
    - `MESSAGES` mit `teach:`-Feld (Abschnitt 3.4).
    - Ereignisse: `opastrom` lehrt Elektrik, `repaircafe` lehrt Löten, `papaRepairs` öffnet Hashboard.
    - Texte „EP Schrauben“ → „Werkstatt-Erfahrung“ in `story.js`, `events.js`, `world.js`; die Erfolge `master`, `tinker` und neue Erfolge („Lötmeister“: 10 saubere Reparaturen; „Bücherwurm“: alle Bücher).
13. **Migration testen:** alte Spielstände (Snapshots aus früheren Bot-Läufen in Kapitel 1, 3 und 5) laden. Prüfen, dass nichts abstürzt, keine Gekauft-Technik verloren geht und das Übergangspolster greift.
14. **Playtest durch den Spieler-Vertreter** (Rolle 2) bei 1366×768 und 1920×1080:
    - Esc, Fenster und Zahlen prüfen.
    - Jedes Mini-Spiel einmal spielen und einmal überspringen.
    - Ein Spiel „ohne je zu lernen“ bis Kapitel 3 durchspielen.
15. **Ein-Datei-Build** (`scripts/build-single.mjs`) und Artifact aktualisieren.

---

## 11. Offene große Fragen (Fragebogen)

Die folgenden Dinge habe ich selbst entschieden, weil es um Layout, Zahlen und Details geht: Kategorien mit kurzen Ketten statt eines großen Baums, drei Erfahrungstöpfe, die Gebühr von 1,5 bzw. 0,5 %, die Dauer der Mini-Spiele, das Übergangspolster für alte Spielstände und dass fertige PCs weiter über Kemal und Jonas laufen. Vier Fragen sind zu groß für mich:

```json
{"questions":[
  {"question":"Im Technik-Menü (Taste T) gibt es Sachen wie „Undervolting-Guide“ oder „Eigene ASIC-Firmware“, die mit einem Klick einfach Prozente geben. Das überschneidet sich stark mit den neuen Fähigkeiten. Was soll damit passieren?","header":"Technik (T)","multiSelect":false,"options":[
    {"label":"In Fähigkeiten aufgehen (Empfohlen)","description":"Wissen wie Undervolten, Firmware oder Immersion wird zur Fähigkeit mit echtem Handgriff am Gerät. Bauten wie der Kalt-/Warmgang werden normale Ausbauten im Firmenfenster. Taste T fällt weg, Opas Werkbank bleibt als Ort im Keller."},
    {"label":"Als Firmen-Forschung behalten","description":"Fähigkeiten = was du selbst kannst. Technik = was die Firma später teuer anschafft. Beide Menüs bleiben nebeneinander."},
    {"label":"So lassen wie es ist","description":"Das Technik-Menü bleibt mit seinen Prozent-Boni unverändert, die Fähigkeiten kommen nur dazu."}]},
  {"question":"Soll jeder selbst gebaute PC oder Rig erst ein Betriebssystem brauchen, das du am Gerät installierst?","header":"OS-Install","multiSelect":false,"options":[
    {"label":"Ja, bis Automatik (Empfohlen)","description":"Am Anfang klickst du den Installer selbst durch: Windows kostet 60 $ Lizenz, Linux ist gratis, wenn du es gelernt hast. Später reicht ein USB-Stick-Image mit einem Klick, im Rechenzentrum geht es automatisch. Fertig-PCs von Kemal und Jonas haben es schon drauf."},
    {"label":"Nur beim ersten PC","description":"Einmal als kleiner Story-Moment am Anfang, danach laufen alle Rigs ohne Installation."},
    {"label":"Nein, nur freiwillig","description":"Rigs laufen auch ohne. Ein eigenes Mining-System bringt nur Extras wie Fernwartung oder später die KI-Vermietung."}]},
  {"question":"Wie oft sollen die Mini-Spiele (Löten, Stecken) kommen?","header":"Mini-Spiele","multiSelect":false,"options":[
    {"label":"Nur wenn ich will (Empfohlen)","description":"Nie aufgezwungen: Bei einem Defekt wählst du „Selbst reparieren“ (Mini-Spiel, spart Geld) oder „Reparieren lassen“ (kostet wie heute). Nach 5 geschafften Reparaturen geht es auf Wunsch mit einem Klick. Im Zeitraffer springt nie etwas auf."},
    {"label":"Bei jeder Reparatur","description":"Jede Reparatur ist ein kurzes Mini-Spiel. Wer überspringt, zahlt den vollen Reparaturpreis."},
    {"label":"Auch bei Einbau und Flashen","description":"Mehr Handarbeit: Auch Wasserkühlung einbauen, Firmware und BIOS flashen bekommen kleine Spielchen."},
    {"label":"Nur einmal zum Lernen","description":"Jedes Mini-Spiel kommt genau einmal, danach geht es immer automatisch."}]},
  {"question":"Sollen Fähigkeiten veralten, zum Beispiel GPU-Übertakten, wenn die ASICs kommen?","header":"Veralten","multiSelect":false,"options":[
    {"label":"Nie verlieren (Empfohlen)","description":"Was du gelernt hast, bleibt für immer. Wird es unwichtig (z. B. FPGA nach 2013), steht es ausgegraut unter „Früher“."},
    {"label":"Auffrischen nötig","description":"Wissen gehört zu seiner Zeit: Für neue Hardware brauchst du ein kurzes Update (Forum oder Kurs), sonst geht der Knopf nicht."},
    {"label":"Punkte zurück","description":"Veraltetes Wissen gibt einen Teil der Punkte zurück, damit du sie neu verteilen kannst."}]}
]}
```
