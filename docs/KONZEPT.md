# HASHWERK – Vom Kinderzimmer zum Rechenzentrum

**Genre:** 3D-Tycoon / Aufbau-Simulation · **Engine:** Three.js (Browser) · **Sprache:** Deutsch

> Ein Bastler-Tycoon, der von Oktober 2010 bis heute (und darüber hinaus) auf echten
> historischen Daten läuft: Bitcoin-Kurs, Netz-Hashrate, Halvings, neue Coins, neue
> Hardware-Generationen. Du startest mit einem alten PC in deinem Kinderzimmer und
> stehst am Ende vor einer 60-MW-Halle am norwegischen Fjord.

## 1. Story (eigene Geschichte)

**Oktober 2010, Lindental (Kleinstadt).** Du bist 17. Dein Vater Frank führt seit 25 Jahren
den kleinen Elektronik-Reparaturladen **„Elektro Brandt"** – aber seit die Leute online
bestellen, frisst der Laden Schulden. Die Bank will bis Ende 2013 **15.000 $** sehen, sonst
macht sie dicht.

In einem Forum liest du von „Bitcoin" – digitales Geld, das man mit der Grafikkarte
„schürfen" kann. Du hast einen alten PC, 300 $ Erspartes und ein Zimmer unterm Dach.

| Figur | Rolle |
|---|---|
| **Mama (Sabine)** | Zahlt die Stromrechnung. Meldet sich, wenn dein Zimmer zur Sauna wird. |
| **Papa (Frank)** | Stolzer Ladenbesitzer, skeptisch – bis du ihm die erste Rate auf den Tisch legst. |
| **Opa Heinz** | Elektriker a. D., knurrig, genial. Verlegt Starkstrom, baut Sicherungskästen. |
| **Deniz** | Bester Kumpel, Hardware-Nerd, Gamer. Wird später dein CTO. |
| **Viktor Kral** | CEO der **MONOLITH Hash AG**. Will dich kaufen, später verdrängen. Dein Rivale bis zum Schluss. |

### Kapitel (je ein neuer Standort = sichtbares Wachstum)
| # | Standort | Ab | Fläche | Strom | Ziel / Freischaltung |
|---|---|---|---|---|---|
| 1 | **Kinderzimmer** (Dachzimmer) | 10/2010 | 4×3,5 m | 1,8 kW (Mamas Limit) | Erste neue GPU, 1.000 $ verdient, Papa 2.000 $ für die Stromrechnung geben |
| 2 | **Hobbykeller** | 2011 | 7×5 m | 4,5 → 22 kW (Opa) | Open-Frame-Rig, 3 GH/s, Ladenschulden (15.000 $) tilgen |
| 3 | **Werkstatt hinterm Laden** | 2012 | 10×8 m | 25 → 120 kW | Erster ASIC, 1 TH/s, Hashwerk GmbH gründen (25.000 $) |
| 4 | **Lagerhalle** (Gewerbegebiet) | 2014 | 24×16 m | 0,4 → 2 MW | Techniker einstellen, 1 PH/s |
| 5 | **Rechenzentrum** | 2017 | 36×24 m | 2,5 → 12 MW | 20 PH/s, 10 Mio. $ Vermögen |
| 6 | **Fjordhalle** (Norwegen, Wasserkraft) | 2020 | 64×40 m | 30 → 120 MW | 1 EH/s, **MONOLITH überholen** → Ende + Endlosmodus |

Alle Standorte laufen parallel weiter – das Zimmer bleibt als „Museum" deines Anfangs.

## 2. Kern-Loop
1. **Bauen:** Rigs/ASICs/Racks/Kühlung im Raster platzieren (Geist-Vorschau, R = drehen).
2. **Basteln:** Rig anklicken → Slots: Mainboard, CPU, Netzteil, GPU 1…n (3D-Modell zeigt die Teile).
3. **Minen:** Jedes Gerät mined „Auto (profitabelster Coin)" oder einen festen Coin.
4. **Verwalten:** Hitze (Raumtemperatur → Drosselung/Defekte), Strom (Sicherung fliegt!),
   Miete, Löhne, Reparaturen.
5. **Handeln:** Wallet (Börse vs. Cold-Wallet), Auto-Verkauf-Quote, Charts, HODL oder Cash.
6. **Wachsen:** Kapitelziele → neuer Standort → größere Hardware-Klasse.

## 3. Echte Ökonomie
* `Coins/Tag = H_dein / (H_netz + H_dein) × Emission/Tag` – Netz-Hashrate & Kurs aus echten
  Stützpunkten (log-interpoliert, leichtes Tagesrauschen).
* Halvings, ASIC-Ära (ab 2013), Scrypt-ASICs (2014/17), **DAG-Limit** (3 GB Ende 2018, 4 GB Ende 2020),
  **ETC-ECIP-1099** (11/2020), **China-Bann** (05–07/2021), **Merge** (15.09.2022), Kaskad-ASICs (08/2023).
* Hardware-Preise: GPU-Boom-Faktor (2017/18, 2021/22 bis 2,3×), ASIC-Preise folgen dem Hashprice.
* Börsen-Crashs „GoxBank" (24.02.2014) und „FXT" (11.11.2022) vernichten Coins, die auf der Börse liegen.
* Nach November 2026: Endlosmodus mit Zufallsmarkt; Halving 2028.

## 4. Hitze & Strom
* Raumtemperatur `T = Umgebung + 12 °C × Wärmelast / Kühlleistung` (+ Jahreszeit, Fjord kalt).
* Ab 38 °C Drosselung, Ausfallrate steigt stark. Kühlgeräte kosten selbst Strom.
* Überschreitet die Last die Anschlussleistung → **Sicherung fliegt**, alles steht.

### Weitere Systeme (im Spiel umgesetzt)
* **Betriebsmodus je Gerät:** „Auto (nur wenn profitabel)", „Immer an", „Aus". Unrentable Geräte
  pausieren automatisch – wichtig, denn mit deutschem Haushaltsstrom war GPU-Mining 2012 ein Verlustgeschäft.
* **Thermostat:** Kühlgeräte laufen nur so stark wie nötig.
* **Story-Kniff:** Im Kinderzimmer zahlen anfangs die Eltern den Strom – bis du Papa die Rechnung erstattest.
  Den Keller rechnet Papa über den günstigeren Gewerbezähler ab.
* **Technik/Forschung (🔬):** Undervolting, eigener Pool, Staubfilter, eigene ASIC-Firmware,
  Kalt-/Warmgang, Immersionskühlung, Abwärme-Verkauf, Stromhandel, KI-Wartung – jeweils ab ihrem
  historischen Zeitpunkt.
* **Hardware-Releases:** Neue GPUs, CPUs, Mainboards, Netzteile und Miner erscheinen am echten
  Erscheinungsdatum (Toast + News-Ticker), alte verschwinden nach einigen Jahren aus dem Handel.
* **Solar, Kredit, Hitzewellen, Übernahmeangebot 2021:** Solaranlagen senken Stromkosten, Bankkredite mit historischen Zinsen,
  echte Hitzewellen heizen die Räume, und Viktor Kral bietet nach dem China-Bann an, Hashwerk zu kaufen (Entscheidung).
* **Meilensteine:** 1 GH/s … 10 EH/s, „Millionär!", „Milliardär!" mit Fanfare.
* **Leben in der Halle:** Techniker laufen herum, du sitzt im Kinderzimmer am Schreibtisch,
  defekte Geräte qualmen, ab 38 °C glüht der Bildschirmrand rot.

## 5. 3D & Steuerung
* Komplett prozedurale, eigene Modelle (keine Logos): Tower-PC mit Glasseite, Milchkisten-Rig,
  Alu-Open-Frame, Grafikkarten mit drehenden Lüftern, FPGA-Boards, USB-Sticks, ASICs, 42U-Racks,
  Schwerlastregale, 40-ft-Container, Ventilatoren, Klimaanlagen, CRAC-Schränke, Möbel.
* Tag/Nacht-Zyklus, Status-LEDs mit Bloom, Wände blenden zur Kamera hin aus.
* Maus: Links = wählen/bauen, Rechts = drehen, Mitte = schieben, Rad = Zoom, WASD/Q/E.
* **Rundgang-Modus (F):** in Ego-Perspektive durch die eigene Farm laufen.

## 6. Markenrecht
Fiktive Marken: **Crimson** (rote GPUs), **Verdant** (grüne GPUs), **Silicor**/**Arix** (CPUs),
**Swarm**/**Whirl**/**Glacier** (ASICs), **Fieldforge** (FPGA). Coins: Bitcoin, Silvercoin, Wuffcoin,
Shadow, Aether, Aether Classic, Zeroproof, Corvus, Kaskad. Börsen: GoxBank, FXT.
