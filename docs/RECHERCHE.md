# Recherche: Vorbild „Crypto Miner Tycoon Simulator" + Echtdaten

> Phase 1 (Recherche). Ziel: verstehen, was das Vorbild gut macht, und echte
> historische Daten sammeln, damit unser Spiel „wie in echt" abläuft.
>
> Hinweis: Steam-, Steam-Community- und MobyGames-Seiten waren aus der
> Build-Umgebung nicht direkt abrufbar (Netzwerk-Policy). Die Infos stammen aus
> Websuche-Auszügen (Steam-Store-Texte, Entwickler-Devlog auf TIGSource,
> Community-Guide, Nintendo-eShop, Presse-Mitteilungen).

## 1. Das Vorbild (Bigosaur, PC 2022 / Switch 2023)

| Bereich | Was das Original macht |
|---|---|
| Start | Szenario 1 beginnt **2010 in einem Schlafzimmer**, mit historisch korrekten Kursen. Story: Teenager, reicher Vater investiert. |
| Rigs | PC-Bau durch **Komponenten in Slots ziehen** (früher Menüs) – CPU, GPU, FPGA, ASIC. |
| Racks | Racks ordnen den Platz und **lenken Hitze**. Engine schafft tausende Geräte pro Halle. |
| Umwelt | **Strom, Hitze, Lärm, Staub**. Staub ⇒ Lüfter gehen kaputt ⇒ Silizium überhitzt ⇒ Verschleiß. Overlays (D = Staub, H = Hitze) mit Farbverlauf pro Kachel. |
| Wartung | Kaputte/veraltete Teile tauschen. |
| Business | Büros mieten/kaufen, **Personal einstellen**, Schichten, Aufgabenprioritäten, Rechnungen & Löhne. |
| Forschung | Mitarbeiter-Skills, Forschungslabore (müssen leise sein), neue Technik, eigener Coin (ICO), bessere Solarpanels. |
| Markt | Bitcoin, Ethereum & andere; Handel am Markt. |
| Ziele | Jedes Szenario hat ein Forschungs-Endziel (z. B. Quantencomputer / KI); später Solar/„Green Mining", Zeitreise-Story. |
| Präsentation | Isometrisch, 2D-Sprites, eigene C++-Engine. Spielzeit Ø ~5 h. |

### Was wir übernehmen
* Der Kern-Loop **Geld → Hardware → Hashrate → Coins → Geld** mit echten Kursen.
* **Komponenten in Slots** (Mainboard ← CPU/GPU/Netzteil) – das haptische Basteln.
* **Hitze & Strom als Platz-Puzzle**: Kühlung platzieren, Sicherung nicht überlasten.
* Klein anfangen (Zimmer) → immer größer.

### Was wir anders / besser machen
* **Echtes 3D** (Three.js) statt Iso-2D: frei drehbare Kamera + **Ego-Rundgang** durch die eigene Farm.
* **Eigene Story** (siehe KONZEPT.md) mit Familie, Kumpel, Rivale – geerdet statt Zeitreise.
* **Standort-Kette mit sichtbarem Wachstum**: Kinderzimmer → Keller → Garage → Lagerhalle →
  Rechenzentrum → Wasserkraft-Halle am Fjord. Alle Standorte laufen parallel weiter.
* **Echte Ökonomie-Formel** statt Fantasie-Ertrag:
  `Ertrag/Tag = Deine Hashrate / (Netz-Hashrate + Deine) × Blöcke/Tag × Blockbelohnung`
  ⇒ Halvings, Difficulty-Explosion, ASIC-Ära, China-Bann 2021, ETH-Merge 2022 wirken automatisch.
* **DAG-Grenze**: 3-GB-Karten fallen Ende 2018 aus dem Ether-Mining, 4-GB-Karten Ende 2020 – wie in echt.
* **Börsen-Risiko**: Coins auf der Börse können beim „GoxBank"-Crash (Feb 2014) bzw.
  „FXT"-Crash (Nov 2022) verloren gehen → Hardware-Wallet kaufen lohnt sich.

## 2. Echtdaten (gerundet, für Spielzwecke)

### Bitcoin-Halvings
| Datum | Block | Belohnung |
|---|---|---|
| 03.01.2009 | 0 | 50 BTC |
| 28.11.2012 | 210 000 | 25 |
| 09.07.2016 | 420 000 | 12,5 |
| 11.05.2020 | 630 000 | 6,25 |
| 20.04.2024 | 840 000 | 3,125 |
| ~04/2028 | 1 050 000 | 1,5625 |

### Bitcoin-Kurs (USD, Stützpunkte)
2010-07 $0.07 · 2010-11 $0.28 · 2011-02 $1 · **2011-06 $30** · 2011-11 $2.3 · 2012-08 $11 ·
2013-04 $230→$70 · **2013-12 $1 150** · 2014-02 GoxBank-Crash · 2015-01 $200 · 2016-12 $960 ·
**2017-12 $19 500** · 2018-12 $3 200 · 2019-06 $13 000 · 2020-03 $5 000 (Corona) · 2020-12 $29 000 ·
2021-04 $64 000 · 2021-07 $30 000 · **2021-11 $69 000** · 2022-06 $19 000 · 2022-11 $15 800 (FXT) ·
2024-01 Spot-ETF · 2024-03 $73 000 · 2024-12 $106 000 · 2025-04 $76 000 · **2025-10-06 $126 000** ·
2026-02 $66 000 · 2026-09 $84 000 · 2026-11 ≈ $64 000.

### Bitcoin-Netz-Hashrate (Stützpunkte)
2010-07 ~0,3 GH/s · 2010-12 ~90 GH/s · 2011-06 ~10 TH/s · 2012-12 ~24 TH/s · 2013-12 ~8 PH/s ·
2014-12 ~290 PH/s · 2016-12 ~2,2 EH/s · 2017-12 ~14 EH/s · 2018-12 ~40 EH/s · 2020-12 ~135 EH/s ·
2021-05 180 → 2021-07 85 EH/s (China-Bann) · 2022-12 ~250 EH/s · 2023-12 ~515 EH/s ·
2024-12 ~800 EH/s · 2025-04 ~1 100 EH/s · 2025-11 ~1 250 EH/s · 2026-01 ~730 EH/s · 2026-11 ~930 EH/s.

### Hardware-Ären (Effizienz grob)
CPU ~5000 J/GH → GPU ~500 J/GH → FPGA ~50 J/GH → ASIC: 2013 ~10 J/GH → S9 (2016) ~98 J/TH →
S17 (2019) ~45 J/TH → S19 Pro (2020) ~29,5 J/TH → S19 XP (2022) ~21 J/TH → S21 XP (2024) 13,5 J/TH
→ Hydro (2024) 12 J/TH.

| Gerät (real) | Jahr | Leistung | Watt |
|---|---|---|---|
| HD 5770 | 2009 | ~200 MH/s SHA | 108 |
| HD 5870 | 2009 | ~400 MH/s SHA | 190 |
| Avalon 1 | 01/2013 | 66 GH/s | 620 |
| Antminer S9 | 2016 | 13,5 TH/s | 1 323 |
| Antminer S17 | 2019 | 56 TH/s | 2 520 |
| Antminer S19 Pro | 2020 | 110 TH/s | 3 250 |
| Antminer S21 XP | 2024 | 270 TH/s | 3 645 |
| RX 470/580 | 2016/17 | 31–32 MH/s Ethash | 130–135 |
| GTX 1070 | 2016 | 28 MH/s Ethash | 120 |
| RTX 3080 | 2020 | ~100 MH/s Ethash | 224 |
| RTX 3090 | 2020 | ~120 MH/s Ethash | 294 |

Mining-Mainboards: H81 Pro BTC (6 GPUs, 2015–17), B250 Mining Expert (19 PCIe, 08/2017).
GPU-Knappheit 2021: RTX 3080 (UVP $699) im Schnitt **$1 643** auf eBay (Aug 2021), LHR-Varianten günstiger.

### Altcoins (Start / Algorithmus / Besonderheit)
| Real | Im Spiel | Start | Algo | Besonderheit |
|---|---|---|---|---|
| Litecoin | **Silvercoin (SLV)** | 10/2011 | Scrypt | Scrypt-ASICs ab 2014; ATH ~$410 (05/2021) |
| Dogecoin | **Wuffcoin (WUF)** | 12/2013 | Scrypt | Meme-Rallye 05/2021 ($0,70) |
| Monero | **Shadow (SHD)** | 04/2014 | RandomX (CPU) | CPU-Coin; ATH ~$795 (01/2026) |
| Ethereum | **Aether (AET)** | 07/2015 | Ethash (GPU) | **Merge 15.09.2022 → GPU-Mining endet** |
| Ethereum Classic | **Aether Classic (AEC)** | 07/2016 | Etchash | bleibt PoW |
| Zcash | **Zeroproof (ZRP)** | 10/2016 | Equihash | Rallye 2025/26 (>$500) |
| Ravencoin | **Corvus (CRV)** | 01/2018 | KawPow (GPU) | GPU-Fluchtziel nach dem Merge |
| Kaspa | **Kaskad (KSK)** | 11/2021 | kHeavyHash | ASICs ab 08/2023; Peak $0,20 (08/2024) |

### Strompreis Deutschland (Haushalt, ct/kWh)
2010: 23,7 · 2013: 29 · 2020: 32 · 2023: **47** (Rekord) · 2025: 39,3 · 2026: 37.
Gewerbe deutlich billiger; Norwegen (Wasserkraft) ~4–6 ct.

## 3. Markenrecht
Alle Hersteller- und Produktnamen sind **fiktiv** (z. B. „Crimson RHD 5870", „Verdant GFX 1070",
„Swarm S9", „Silicor", „Arix Zenon"). Die 3D-Modelle sind prozedural im Code gebaut und erinnern
nur grob an echte Bauformen (Grafikkarte mit Lüftern, ASIC-Kasten mit 2 Lüftern, 42U-Rack …),
ohne Logos. Coins außer Bitcoin (generischer Protokollname) tragen Parodie-Namen.

## Quellen (Auswahl)
* Steam-Store / Starter Edition (Text über Suche): store.steampowered.com/app/1859290, /app/2304990
* TIGSource-Devlog des Entwicklers: forums.tigsource.com/index.php?topic=73281.0
* Steam-Community-Guide: steamcommunity.com/sharedfiles/filedetails/?id=3293959009
* Nintendo eShop: nintendo.com (Crypto Miner Tycoon Simulator)
* Halvings: coinmarketcap.com/halving/bitcoin, coingecko.com/explain/bitcoin_halving
* Kurse: statmuse.com, kriptofoni.com (2026 Monatswerte), coinlore.com (LTC, XMR, KAS)
* Hashrate: news.bitcoin.com (808 EH/s Ende 2024), hashrateindex.com
* Hardware: thenextweb.com (Mining-Hardware-Geschichte), d-central.tech, support.bitmain.com (S21 XP)
* GPU-Hashraten: tomshardware.com, gpu-monkey.com; Knappheit: techspot.com (08/2021)
* Mainboards: anandtech.com (B250 Mining Expert), cryptomining-blog.com (H81 Pro BTC)
* Strompreis: elektronik-zeit.de, check24.de, yello.de
