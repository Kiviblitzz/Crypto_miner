# HASHWERK – Ersatzplan für Kurs- und Hashrate-Daten

Stand 2026-11-21. Ziel: `src/data/btc_daily.js` (heute Coin Metrics, CC BY-NC 4.0) durch Daten ersetzen, die in einem verkauften Spiel erlaubt sind. Keine Rechtsberatung; die Risikohinweise ersetzen keine anwaltliche Prüfung. Im Repo wurde nichts geändert. Alle Skripte, Daten und Ergebnisse liegen unter `scripts/kursdaten/ (Skripte) bzw. Arbeitsordner (Daten, nicht im Repo) `.

## 0. Empfehlung in Kürze

| Zeitraum | Hashrate | Kurs (USD) |
|---|---|---|
| 2010-07-18 – 2011-12-31 | aus der Blockchain (CC0-Zeitstempel bzw. eigener Knoten) | **offen**: Coin Metrics um Erlaubnis bitten (Plan A). Plan B: Mt.Gox-Trades (bitcoincharts-Archiv), Restrisiko |
| 2012-01-01 – heute | aus der Blockchain | **Bitstamp**, offizielle API, mit schriftlicher Bestätigung bzw. Data License Agreement (partners@bitstamp.net) |

- **Hashrate ist gelöst.** Aus CC0-Block-Zeitstempeln und der Konsensregel nachgerechnet, stimmt sie an 92 % aller Tage nach Rundung exakt mit der heutigen Datei überein. Kein Tag weicht um mehr als 1 % ab.
- **Kurs ab 2012:** Bitstamp weicht im Mittel 0,35 % von den heutigen Werten ab (ab 2014 ≤ 0,5 % pro Jahr). Ausreißer bis 20 % gibt es im dünnen ersten Halbjahr 2012.
- **Kurs 2010–2011:** Es gibt keine frei lizenzierte, saubere Quelle. Die Datei muss aber weiter am 2010-07-18 beginnen (siehe 4.). Ohne Lösung für diesen Abschnitt kann die Datei nicht ersetzt werden.
- **Parallel** Coin Metrics anfragen (Mail-Entwurf in 8.). Bei einem Ja bleibt alles, wie es ist; nur die Credits ändern sich.

## 1. Hashrate aus der Blockchain

### Quellen und Bedingungen

| Quelle | Inhalt | Bedingungen | Bewertung |
|---|---|---|---|
| Eigener Bitcoin-Core-Knoten (`getblockheader`, REST `/rest/headers`) | alle Header: `time`, `bits`, `difficulty`, `chainwork` | Software MIT; die Daten erzeugt man selbst, es gibt keine Nutzungsbedingungen | **empfohlen für Aktualisierungen** |
| [bitcoin-data/block-arrival-times](https://github.com/bitcoin-data/block-arrival-times), Datei `qa/block-timestamps/block-timestamps.csv` | `height,time` aller Blöcke 0–942357 (bis 2026-03-26 19:47 UTC), 16,9 MB | [LICENSE.md](https://github.com/bitcoin-data/block-arrival-times/blob/master/LICENSE.md) = CC0 1.0: „Affirmer hereby overtly, fully, permanently, irrevocably and unconditionally waives, abandons, and surrenders all of Affirmer's Copyright and Related Rights …“. Datenbankrechte nach RL 96/9/EG sind ausdrücklich eingeschlossen (Abschnitt 1 vi). | **empfohlen (Grundbestand)** |
| [bitcoinj-Checkpoints](https://github.com/bitcoinj/bitcoinj/blob/master/core/src/main/resources/org.bitcoin.production.checkpoints.txt) | 436 Header, je einer pro 2016er-Periode, bis Höhe 878976 (2025-01-12) | Apache-2.0 | nur zur Gegenprobe |
| [Electrum `checkpoints.json`](https://github.com/spesmilo/electrum/blob/master/electrum/chains/mainnet/checkpoints.json) | Target je Periode bis Höhe ≈ 963647 (≈ Aug. 2026), keine Zeitstempel | MIT | nur zur Gegenprobe; reicht auch für eine Hashrate pro Periode |
| mempool.space-API | Blöcke und Header | ToS laut Quelltext ([mempool/mempool](https://github.com/mempool/mempool), Stand 10.07.2024): nur Gewährleistungs- und Haftungsausschluss, keine Klausel gegen die Nutzung der Daten; Rate-Limits | nicht nötig; Host hier gesperrt |
| blockstream.info, blockchair, blockchain.info | Explorer-APIs | Bedingungen nicht geprüft (Hosts gesperrt) | nicht nötig |
| BigQuery `crypto_bitcoin` | alle Blöcke | braucht ein Google-Konto mit Abrechnung | ausgeschlossen |

### Formel (so ist auch die heutige Datei gebaut, nachgeprüft)
- Difficulty je Periode nach Bitcoin Core `pow.cpp`: `T_neu = T_alt · clamp(t_letzter − t_erster, ¼·2 Wo, 4·2 Wo) / 1 209 600 s`, auf das Compact-Format gerundet, `D = T_max / T`. Damit braucht man **nur Zeitstempel**.
- Tageswert: `H_d = Σ (D_Block · 2^32) / 86 400 s` über alle Blöcke mit Zeitstempel am UTC-Tag d. Das ist gleichwertig zu „D · 2^32 / Blockzeit“.
- 7-Tage-Mittel: **zentriert (d−3 … d+3)**, am Anfang und Ende der Reihe gekappt. Nachlaufend (d−6 … d) gemittelt läge die Abweichung bei 3,3 % im Mittel und 23 % im Maximum. Die heutige Datei ist also eindeutig zentriert gemittelt.

### Prototyp-Ergebnis (`scripts/hashrate_from_chain.py`, `scripts/compare_hash.py`)
- Die nachgerechneten Difficulties stimmen mit **436/436** bitcoinj-Checkpoints (Bits und Zeitstempel) und **467/467** Electrum-Targets überein.
- Dritte Gegenprobe: Rohe 80-Byte-Header bis Höhe 478558 wurden auf lückenlose Hash-Verkettung geprüft; kein einziger Zeitstempel weicht von der CC0-Liste ab. Quelle der Header ist die gemeinsame Historie BTC/BSV aus `bsv-blockchain/chaintracks-server`; sie dienen nur der Prüfung und kommen nicht ins Spiel.
- Vergleich mit `BTC_DAILY_HASH_GH`, 2010-07-18 bis 2026-03-22 (5727 Tage): **5281 Tage (92,2 %) sind nach Rundung auf 3 Stellen identisch**, die größte Abweichung liegt bei 0,99 %. Ungerundet beträgt die mittlere Abweichung 0,11 %; das ist genau der Rundungsfehler der heutigen Datei.
- Rückfallebene nur mit Perioden-Checkpoints (ohne Einzelblock-Zeiten): im Mittel 3,0 %, P95 8,7 %, maximal 30 %. Das ist nur eine Notlösung.

## 2. Kurse

### Geprüfte Quellen
Hinweis: Viele Anbieterseiten sind aus dem Container gesperrt. Ihre Zitate stammen aus dem Suchindex und sind mit **(S)** markiert. Vor einer Entscheidung den Originaltext im Browser lesen und als PDF mit Datum sichern.

| Quelle | Zeitraum | Bedingung (Zitat) | Ergebnis |
|---|---|---|---|
| Coin Metrics, [github.com/coinmetrics/data](https://github.com/coinmetrics/data) | 2010-07-18 ff. | README: „Data is made available under the CC BY-NC 4.0 license.“ | nein, außer mit Erlaubnis |
| **Bitstamp**, offizielle API ([bitstamp.net/api](https://www.bitstamp.net/api/)) | ab Sept. 2011 (Start 2011-09-13; frühester API-Tag noch per Abruf zu prüfen) | (S) „Bitstamp allows the incorporation and redistribution of our exchange data for commercial purposes. This includes the right to create ratios, calculations, new original works, statistics, and similar …“ sowie „Companies seeking to utilize Bitstamp's exchange data for their own commercial purposes are directed to contact partners@bitstamp.net to receive and sign a commercial use Data License Agreement.“ | **beste Quelle**; Data License Agreement oder schriftliche Bestätigung einholen |
| Kraken ([API-Doku, legacy](https://docs-legacy.kraken.com/api/docs/guides/global-intro/)) | ab 2013 | (S) vorherige Erlaubnis nötig für „any non-personal commercial use of data from publicly accessible endpoints, such as market data …“; Kontakt marketdata@kraken.com | nur mit Erlaubnis; als Zweitquelle denkbar |
| Coinbase ([Market Data Terms](https://www.coinbase.com/legal/market_data)) | ab 2015 | (S) untersagt: „Redistribute, display, or disseminate the Market Data—or any … works based on … or derived from the Market Data ("Derived Works")—to any third party …“ | nein |
| FRED `CBBTCUSD` (Daten von Coinbase) | ab 2014-12 | (S) [FRED Legal](https://fred.stlouisfed.org/legal): Bei Reihen Dritter kann die Bank „not grant permission“; ohne Erlaubnis des Rechteinhabers nur „non-commercial educational or personal use“ | nein (Coinbase-Bedingungen gelten) |
| Gemini ([Market Data Agreement](https://www.gemini.com/legal/market-data-agreement)) | ab 2015 | (S) Weitergabe verboten, dafür gibt es einen eigenen „Redistribution Agreement“ | nein |
| CoinGecko, kostenloser Plan ([API Terms](https://www.coingecko.com/en/api_terms)) | ab 2013 | (S) nur Namensnennung; Weitergabe erst im Enterprise-Plan | nein |
| CoinDesk BPI (alte API) | ab 2010-07-17, bis 2013 auf Mt.Gox-Basis | Alte Doku, zitiert in [node-coindesk-api](https://github.com/gabmontes/node-coindesk-api): „You are free to use this API to include our data in any application or website as you see fit, as long as each page or app that uses it includes the text “Powered by CoinDesk” …“. Die API ist abgeschaltet, Daten gibt es nur noch über Kopien Dritter. | unsicher (Rechtekette, heutiger Eigentümer); nur Notlösung |
| bitcoincharts.com, CSV-Archiv (`mtgoxUSD`, `bitstampUSD` …) | Mt.Gox 2010-07-17 – 2014-02 (jeder Trade) | keine Lizenz und keine Nutzungsbedingungen auffindbar, Betreiber unklar; Host gesperrt | Plan B für 2010–2011, Restrisiko |
| Kaggle „Bitcoin Historical Data“ (mczielinski) und Spiegel [ff137](https://github.com/ff137/bitstamp-btcusd-minute-data) | 2012 ff., Minutenkerzen | Daten stammen von der Bitstamp-API; Kaggle-Bestand CC BY-SA 4.0, Updates CC BY 4.0 (laut ff137) | **nur für den Prototyp** (ShareAlike, fremde Lizenz auf Bitstamp-Daten); fürs Spiel direkt bei Bitstamp abrufen |
| Mt.Gox-Leak 2014 | 2011-04 – 2013-11 | unrechtmäßig veröffentlicht | ausgeschlossen |
| Wikidata, Wikipedia, Bitcoin-Wiki, Wikimedia Commons | – | keine tägliche Reihe gefunden | ungeeignet |
| CryptoDataDownload, CoinMarketCap, Investing, Yahoo, Kaggle mit „CC0“-Etikett | – | (S) Weitergabe untersagt, oder die Herkunft liegt bei diesen Anbietern | nein |

### Darf man Tagesschlusskurse aus öffentlichen Trades selbst berechnen und weitergeben?
- **Urheberrecht:** Einzelne Kurse sind Fakten und nicht geschützt (§ 2 UrhG verlangt eine Schöpfung).
- **Datenbankherstellerrecht (§§ 87a ff. UrhG, RL 96/9/EG):**
  - Wer zum Berechnen alle Trades übernimmt, „entnimmt“ einen wesentlichen Teil der Datenbank (EuGH C-304/07 *Directmedia*). Das ist zustimmungspflichtig, wenn die Datenbank geschützt ist. Der Schutz dauert 15 Jahre (§ 87d).
  - Geschützt sind nur Hersteller mit Sitz in der EU oder im EWR (§ 127a UrhG): betroffen wären z. B. Bitstamp (Luxemburg) und vielleicht der Betreiber von bitcoincharts; nicht betroffen sind Coin Metrics (USA) und Mt.Gox (Japan).
  - Nach EuGH C-203/02 *BHB/William Hill* zählt eine Investition ins *Erzeugen* von Daten nicht. Eigene Handelsdaten einer Börse sind deshalb möglicherweise gar nicht geschützt. Das ist aber nicht sicher.
- **Vertrag/AGB:** API-Bedingungen gelten unabhängig davon. Coinbase verbietet abgeleitete Werke ausdrücklich, Kraken verlangt eine Erlaubnis. Bitstamp erlaubt „calculations … statistics“ ausdrücklich.
- **Fazit:** Selbst rechnen ist erlaubt, wenn die Quelle es erlaubt (Bitstamp). Bei anderen Quellen macht das Rechnen die Daten nicht „sauber“. Auch das Argument „Fakten, kein Schutz bei US-Herstellern“ (Coin Metrics) taugt nicht als Grundlage. Es bleibt der Lizenzvertrag, und Steam reagiert auf Takedown-Meldungen von Rechteinhabern.

### 2010–2011 (vor Bitstamp)
- Damals war **Mt.Gox** praktisch der Markt (seit 2010-07-17). Coin Metrics beginnt am 2010-07-18 und stützt sich hier vermutlich auf Mt.Gox-Daten; das ist nicht belegt.
- Welche Quellen es gibt und wie sauber sie sind:
  - bitcoincharts-Archiv mit jedem Mt.Gox-Trade: vollständig, aber ohne Lizenz.
  - Alte Mt.Gox-API: seit 2014 abgeschaltet.
  - CoinDesk BPI: Mt.Gox-basiert; Erlaubnis von früher, API abgeschaltet.
  - Kleinere Börsen (Bitcoin Market/PayPal, TradeHill ab 06/2011): sehr dünn.
  - New Liberty Standard (2009/10): gerechneter Kurs, kein Marktpreis.
  - Mt.Gox-Leak: ausgeschlossen.
- Qualität: Viele Tage haben nur wenige Trades. Am 2011-06-19 gab es den Mt.Gox-Hack mit Crash auf 0,01 $ und eine Handelspause bis zum 2011-06-26. Diese Tage müssen ausdrücklich behandelt werden.
- Einen Prototyp für 2010–2011 gibt es nicht: bitcoincharts ist gesperrt, und eine lizenzklare Kopie fehlt.
- **Empfehlung:**
  - Plan A: Erlaubnis von Coin Metrics, notfalls nur für 2010-07-18 bis 2011-12-31.
  - Plan B: Tagesschluss aus Mt.Gox-Trades, Restrisiko dokumentieren und anwaltlich bewerten lassen.
  - Das Spiel erst 2012 beginnen zu lassen, wäre eine Designfrage und keine Datenlösung.

### Prototyp Kurs (`scripts/daily_close_from_minutes.py`, `scripts/compare_price.py`)
Tagesschluss = Schlusskurs der letzten Minute mit Umsatz vor 24:00 UTC. So ist auch der Coin-Metrics-Schlusskurs definiert, Stichtag 00:00 UTC. Verglichen mit `BTC_DAILY_PRICE` vom 2012-01-01 bis 2026-05-23 (5254 Tage):

| | mittl. Abw. | Median | P95 | max |
|---|---|---|---|---|
| gesamt | 0,35 % | 0,14 % | 1,37 % | 20,3 % (2012-01-18) |
| 2012 | 1,65 % | 1,10 % | – | 20,3 % |
| 2013 | 0,62 % | 0,31 % | – | 8,5 % |
| 2014–2017 | 0,31–0,53 % | ≈ 0,2–0,3 % | – | ≤ 5,0 % |
| 2018–2022 | 0,15–0,27 % | ≈ 0,1–0,2 % | – | ≤ 3,1 % |
| 2023–2026 | 0,09–0,13 % | ≈ 0,05–0,08 % | – | ≤ 1,1 % |

- Im ersten Halbjahr 2012 liegen 21 Tage mehr als 5 % daneben, ab dem zweiten Halbjahr 2012 fast keiner mehr. Mit dem Tages-VWAP statt dem Schluss wären die Abweichungen größer; der Schlusskurs ist also richtig.
- Lücken: Wegen des Bitstamp-Ausfalls fehlen 3 Tage (2015-01-06 bis -08). Sie werden mit dem letzten echten Schluss gefüllt, alternativ mit Kraken-Daten, falls Kraken zustimmt.

## 3. Datei neu erzeugen (Skizze, `scripts/`)
1. **Zeitstempel:** `block-timestamps.csv` (CC0) übernehmen. Für die Zeit danach `node_block_times.sh` gegen einen eigenen Knoten laufen lassen:
   - Variante A: `bitcoind -prune=10000 -rest=1`, voll synchronisiert. Das dauert 1–3 Tage, lädt ≈ 700 GB herunter und braucht ≈ 10 GB Platte.
   - Variante B: nur die Header synchronisieren (Minuten) und rückwärts über `getblockheader` laufen.
2. **Kurs:** `fetch_bitstamp_ohlc.py out.csv 2011-08-01` holt `/api/v2/ohlc/btcusd/?step=86400` und schreibt `date,close_usd`. Erst nach der Freigabe durch Bitstamp ausführen; hier ungetestet, weil der Host gesperrt ist. Für 2010–2011 eine zweite CSV aus der gewählten Quelle anlegen.
3. **Bauen:** `python3 -I build_btc_daily.py --timestamps block_times.csv --price fruehphase.csv --price bitstamp.csv --start 2010-07-18 --end <Stichtag> --out btc_daily.neu.js`
   - Format wie heute: `BTC_DAILY_FIRST`, `BTC_DAILY_PRICE` (4 Stellen), `BTC_DAILY_HASH_GH` (3 Stellen).
   - Die Hashrate wird zentriert über 7 Tage gemittelt und am Rand gekappt.
   - Kurslücken werden mit dem Vortagesschluss gefüllt und protokolliert.
4. **Prüfen:** `compare_files.py src/data/btc_daily.js btc_daily.neu.js` vergleicht nur lesend. Dann bewusst ins Repo kopieren und die Credits anpassen.
5. **Wichtig:** `BTC_DAILY_FIRST` muss 2010-07-18 bleiben. `history.js` gibt vor dem Starttag `arr[0]` zurück; ein Start 2012 würde 2010–2011 im Spiel flach machen.
6. **Prototyp-Lauf:** `out/btc_daily.prototyp.js` (2012-01-01 bis 2026-03-25; nur zum Vergleich, nicht ins Repo).
   - Kurs: im Mittel 0,36 % Abweichung, 26 Tage über 5 %.
   - Hashrate: im Mittel 0,02 % Abweichung, Median 0,00 %. Das Maximum von 4,0 % am letzten Tag ist ein Artefakt der Randkappung.

## 4. Risiken
- Der Bitstamp-Text ist zweideutig: Die Weitergabe wird erlaubt, zugleich wird auf ein Data License Agreement verwiesen. Deshalb die Erlaubnis schriftlich einholen und archivieren. Die Zitate sind teils nur aus dem Suchindex (S), die Originale also gegenlesen.
- Für 2010–2011 gibt es ohne Coin Metrics keine Quelle mit klarer Lizenz. Bei Plan B bleibt ein Restrisiko, vor allem falls bitcoincharts in der EU betrieben wird; dann läuft der Datenbankschutz für Mt.Gox-Daten bis etwa 2029.
- Bitstamp war 2011/2012 dünn gehandelt: Einzeltage weichen bis zu 20 % von einem Mehrbörsen-Kurs ab. Das sind echte Kurse, aber andere als heute.
- Den CC0-Datensatz pflegen Dritte, er kann veralten. Dagegen hilft der eigene Knoten. Header-Zeitstempel können um bis zu ≈ 2 h abweichen; die Methode gleicht der von Coin Metrics, die Wirkung ist vernachlässigbar.
- Spiegeldaten (Kaggle, ff137, BSV-Header) nicht ausliefern. Sie dienten nur der Prüfung.
- Börsennamen in den Credits nur als Quellenangabe verwenden. Der bisherige Hinweis „Börsen … frei erfunden“ sollte die Datenquellen ausnehmen, und es darf keine Unterstützung durch die Börsen behauptet werden.
- Vor dem Release ist eine kurze Prüfung durch eine Anwältin oder einen Anwalt für IT- und Urheberrecht ratsam.

## 5. Aufwand (grob)
| Schritt | Aufwand |
|---|---|
| Hashrate-Pipeline übernehmen (Skripte fertig) | 0,5 Tag |
| Eigener Knoten (für Daten ab 2026-03-26 und künftige Updates) | 1 h Einrichtung, dann 1–3 Tage unbeaufsichtigt (Variante A) bzw. Minuten (B) |
| Bitstamp: Mail, Vertrag, Abrufskript | 1–2 h Arbeit, Wartezeit unbekannt (Wochen) |
| 2010–2011: Coin-Metrics-Anfrage bzw. Mt.Gox-Auswertung | Mail 15 min bzw. 0,5–1 Tag plus Risikoentscheidung |
| Datei bauen, vergleichen, Credits, Spieltest | 0,5 Tag |
| Anwaltliche Kurzprüfung | 1–2 h Beratung |

## 6. Credits (Vorschlag für `finale.js`, nicht umgesetzt)
- „Netz-Hashrate: eigene Berechnung aus der Bitcoin-Blockchain (Difficulty, Block-Zeitstempel); Zeitstempel: Bitcoin Block Arrival Time Dataset, github.com/bitcoin-data (CC0)“. CC0 verlangt keine Nennung, sie ist aber fair.
- „BTC/USD-Tageskurse ab 2012: Bitstamp (bitstamp.net)“, mit dem Wortlaut, den Bitstamp im Vertrag verlangt.
- 2010–2011 je nach Lösung: „Coin Metrics (coinmetrics.io), mit freundlicher Genehmigung“ oder „Mt.Gox-Handelsdaten (über bitcoincharts.com)“.
- „Coin Metrics Community Data (CC BY-NC 4.0)“ entfernen, solange es keine Erlaubnis gibt.

## 7. Mail-Entwürfe (Platzhalter ersetzen)

**An info@coinmetrics.io**
> Subject: Permission request – commercial use of BTC PriceUSD and HashRate (Community data) in an indie game
>
> Hello Coin Metrics team,
>
> I'm an independent developer in Germany working on HASHWERK, a German-language Bitcoin mining tycoon game planned for Steam Early Access. The game replays real history day by day, and for this I use two series from your Community data (github.com/coinmetrics/data, btc.csv): PriceUSD and HashRate, daily from 2010-07-18, embedded as static arrays (about 95 KB, rounded to 3–4 significant digits, hash rate smoothed to a 7-day mean).
>
> Since the data is licensed under CC BY-NC 4.0 and the game will be sold, I'd like to ask for permission for this commercial use:
> - BTC only, these two series, daily, 2010-07-18 to present, with occasional updates;
> - shown only inside the game (charts and in-game prices); not offered as a download, API or separate dataset, and not resold;
> - attribution in the credits and on the store page as you prefer, e.g. "Bitcoin price and hash rate data: Coin Metrics (coinmetrics.io), used with permission".
>
> If a full permission isn't possible, a permission limited to PriceUSD from 2010-07-18 to 2011-12-31 would already help a lot. If there is a fee or a standard agreement for small projects, please let me know.
>
> Thank you and best regards,
> [Name], [Studio], [Address], [E-Mail]

**An partners@bitstamp.net**
> Subject: Commercial use of Bitstamp BTC/USD daily closing prices in a game
>
> Hello, we are developing a commercial game (Steam) that shows real historical Bitcoin prices. We'd like to use BTC/USD daily closing prices from your public API (OHLC, step 86400, from 2011 onward), embedded in the game and credited to Bitstamp; the data won't be offered as a separate dataset. Your API page says that Bitstamp allows the incorporation and redistribution of exchange data for commercial purposes and refers companies to a commercial use Data License Agreement. Could you send us that agreement, or confirm in writing that this use is permitted, and tell us the attribution you require? Thank you, [Name], [Studio], [Address]

## 8. Anhang

**Dateien** (unter `Arbeitsordner`):
- `scripts/`:
  - `hashrate_from_chain.py`, `compare_hash.py`, `period_only.py`, `parse_bitcoinj.py`, `check_bsv_headers.py`
  - `daily_close_from_minutes.py`, `compare_price.py`
  - `build_btc_daily.py`, `compare_files.py`
  - `fetch_bitstamp_ohlc.py`, `node_block_times.sh` (beide ungetestet)
- `data/`: `hash_daily_chain.csv`, `periods_chain.csv`, `vergleich_hash.csv`, `bitstamp_daily_close.csv`, `data_bitcoinj_periods.csv`
- `ref/coinmetrics_ref.csv`: Referenz, gelesen aus `btc_daily.js`
- `out/btc_daily.prototyp.js`
- `dl/`: Downloads, nur zur Prüfung

**Gesperrt** (Proxy 403 bzw. DNS): mempool.space, blockstream.info, api.blockchair.com, blockchain.info, bitcoincharts.com/api.bitcoincharts.com, bitstamp.net, api.kraken.com, api.exchange.coinbase.com, fred.stlouisfed.org, wikidata.org, coinmetrics.io-API, data.bitcoinity.org, api.coingecko.com, cryptodatadownload.com, zenodo.org, datahub.io, kaggle.com, huggingface.co, archive.org, bitcoin.org, bitcoincore.org, bitcoin-data.github.io, jentic.com. Kein P2P-Zugang. Die GitHub-API ist für nicht verknüpfte Repos gesperrt; raw.githubusercontent.com funktioniert.

**Erreichbar:** GitHub (raw), GitLab, PyPI, npm, Maven Central.

**Quellen:**
- Blockchain-Daten: https://github.com/bitcoin-data/block-arrival-times · https://github.com/bitcoinj/bitcoinj · https://github.com/spesmilo/electrum · https://github.com/mempool/mempool · https://github.com/bsv-blockchain/chaintracks-server
- Coin Metrics: https://github.com/coinmetrics/data
- Börsen: https://www.bitstamp.net/api/ · https://docs-legacy.kraken.com/api/docs/guides/global-intro/ · https://www.kraken.com/legal/global-terms · https://www.coinbase.com/legal/market_data · https://www.gemini.com/legal/market-data-agreement
- Datenportale: https://fred.stlouisfed.org/legal · https://fred.stlouisfed.org/data/CBBTCUSD · https://www.coingecko.com/en/api_terms
- Kursdatensätze: https://github.com/gabmontes/node-coindesk-api · https://github.com/ff137/bitstamp-btcusd-minute-data · https://github.com/mczielinski/kaggle-bitcoin
- Rechtsprechung: EuGH C-203/02 (BHB/William Hill), C-304/07 (Directmedia)
