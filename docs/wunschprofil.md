# Wunschprofil des Spielers (für Entwicklung und Vertreter-Agent)

Dieses Profil sammelt, was der Auftraggeber von HASHWERK will. Der Agent `spieler-vertreter` liest es vor jeder Entscheidung und ergänzt es, wenn er Neues lernt (mit Datum und Quelle).
Zitate sind wörtlich (Tippfehler bleiben stehen), damit der Ton erhalten bleibt.

## Grundregeln (nie brechen)
- **Keine Zusatzkosten:** „ich hab aber nur das abo ich will keine api kosten zusätzlich haben“. Keine bezahlten APIs, keine OpenAI-Keys.
- **Echte Kurse:** „die bitcoin rates sollen alle auch komplett realistisch sein“. Echte Tageskurse, Hashrate und Schwierigkeit (`src/data/history.js`, `btc_daily.js`) werden nie geschönt. Wenn sich etwas zu schnell anfühlt, wird das Spiel drumherum angepasst (Startteile, Tempo, Ziele), nie die Daten.
- **Fertig und fehlerfrei:** „arbeite solange bis ein komplettes spiel fertig ist“. Keine halben Features, keine Bugs, alles getestet.
- **Sprache:** Deutsch, locker und witzig. Deutsche Anführungszeichen „…“.

## Kern des Spiels
- **Minen steht im Mittelpunkt:** „Fokus soll wirklich auf dem minen liegen immer mehr pcs bauen schnell im Zimmer zu klein dann größer usw“
- **Selbst bauen:** „das bauen soll auch selbst gemacht werden so wie am anfang … man kann sich builds zusammenstellen aber auch so bauen … man kann im shop schon fertig pcs kaufen aber man kann auch bei jedem pc das ausbauen neues ein usw“
- **Fertige Geräte über Kontakte:** „dass man fertig pcs über einen kontakt freischaltet … und dann rigs“. Erledigt: Kemal liefert PCs, Jonas Rigs.

## Welt und Story
- **Kein Teleport:** „nicht einfach teleportieren das kommt komisch“. Wohnung → Flur → Treppe → Keller läuft man selbst und geht wieder hoch. „das soll so richtig story mässig sein“
- **Start in der eigenen Wohnung:** „man startet und ist schon in seiner eigenen wohnung die ist aber noch klein und kacke und davon upgraden“
- **Langsamer Anfang:** „früher viel langsamer gemined … nicht 800 bitcoins nach ner minute“. Deshalb die billigsten Teile am Anfang (erst nur CPU-Mining) und die erste Grafikkarte als spürbarer Sprung.
- **Shop und Pakete:** „separat in einen shop gehen“. Bestellungen kommen am Anfang „vor die Tür gelegt als paket“.

## Fähigkeiten (Stand 20.11.2026)
- **Keine Prozent-Boni:** „mining skill ist auch quatsch“. Kein „+2 % Ertrag pro Stufe“.
- **Freischaltungen im Menü:** „das sollen skills sein in so nem menü, dass man dann fpga bedienen kann betriebssysteme installieren kann usw“
- **Möglichst viele:** „so viel geben wie möglich“. Gewünscht sind z. B. Wasserkühlung, Betriebssystem installieren, Übertakten/Undervolten, FPGA und ASIC-Firmware, Löten und Reparieren, Builds direkt kaufen, mehrere PCs im Inventar.
- **Lernen auf allen drei Wegen:** durch Tun (Punkte), über Kurse, Bücher und Forum, und von Leuten (Opa, Deniz, Jonas …). „einige sachen am anfang kriegt man über sein handy nachrichten“
- **Benutzen:** „teils echter handgriff aber bei zb irgendwie reperatur maybe so ein mini game mit löten oder stecken“

## Bedienung aus Spielersicht (der Vertreter prüft das immer)
- **Esc:** „wenn man in einem menü escape drückt dass sich dann das menü schliesst und nur beim nochmal drücken dann wirklich das pause menü kommt“. Allgemein heißt das: Eingaben verhalten sich so, wie ein Spieler sie erwartet. Kein Doppel-Effekt, kein Menü über einem Menü, nichts Unerwartetes.
- **Was zählt:** Texte müssen klar sein, Knöpfe dürfen nicht abgeschnitten sein, der nächste Schritt muss immer erkennbar sein, man darf nicht festhängen (keine Sackgassen) und es gibt keine stillen Fehler.

## Zusammenarbeit
- **Entscheidungen:** „Klein allein, groß fragen“. Kleines (Texte, Zahlen, Layout, Detail-Balance) entscheidet der Vertreter selbst. Bei Story-Richtung, neuen Systemen und großen Umbauten kommt ein Fragebogen zum Anklicken mit Freitext-Feld.
- **Wie der Auftraggeber schreibt:** kurz, umgangssprachlich und schnell. Er wechselt oft mitten in der Arbeit das Thema. Neue Wünsche werden sofort aufgenommen, ohne Bisheriges zu verwerfen.
- **Nachts entscheidet der Vertreter:** „Ab jetz gehe ich schlafen für die Nacht antworte jetzt für mich stell ganz ganz wichtige Sachen für morgen zurück sonst denk nach was ich sagen würde anhand meiner Antworten denk immer an den Spieler“. Ist er nicht da, entscheidet der Ideen-Typ auch Mittelgroßes nach diesem Profil. Nur „ganz ganz wichtige Sachen“ (nimmt bisherige Spielweise weg, neue Story-Richtung, berührt eine Grundregel) werden mit einer vorläufigen, leicht rückbaubaren Empfehlung zurückgestellt.
- **Was er sehen will:** die spielbare Version als Artifact, das nach jeder Runde aktualisiert wird: https://claude.ai/artifact/RLtXTTQaYJExVNeNKcRBGq

## Antworten vom 20.11.2026 (Fragebogen und Nachrichten)
- **Anlernen statt Menüflut:** „die menüs lernt man nicht das soll doch so angelernt sein … man wacht auf und dann steht da neue nachricht aufs handy und dann steht da drück H für handy“. Eingebaut: Lektionen, Handy auf H, Wärmebild auf I.
- **Geld im Alltag:** „sowieso muss man miete und strom zahlen das so machen“. Miete und Strom werden monatlich fällig, auch in der Wohnung.
- **Papas Laden:** „denk dir aber für das andere nochmal was aus“. Die Bankfrist mit 15.000 $ bis Ende 2013 wirkt sinnlos („15000 bis in 2 jahren ist ja garnichts“). Es braucht eine neue Idee.
- **Tempo:** „anpassbar aber 1x echtzeit“. 1× = echte Zeit, schnellere Stufen zum Vorspulen.
- **Betriebssystem:** Jeder selbst gebaute PC bzw. Rig braucht eines, bis Automatik. Am Anfang klickt man den Installer selbst durch (Windows-Lizenz oder Linux, wenn gelernt), später geht es per USB-Stick mit einem Klick, im Rechenzentrum automatisch.
- **Mini-Spiele:** „immer selber aber man kann das verbessern durch so skill points oder ganz weg machen vielleicht oder jemanden einstellen (roboter also zb einen roboter der aus seinem haus fährt und dann einen usb stick einsteckt oder so)“. Am Anfang immer selbst; durch Fähigkeiten besser oder ganz automatisch; Personal bzw. Roboter kann es übernehmen.
- **Veralten:** „alle fähigkeiten bleiben aber gpu übertakten geht nur für gpus“. Nichts geht verloren, wirkt aber nur auf passende Hardware.
- **Roadmap später:** „man kann ja maybe auch später zum ai center upgraden … da bräuchte man ja wieder gpus“ (KI-Rechenzentrum mit GPUs).
- **Technik-Menü (T):** „erklär mir das nochmal genauer“. Offen, muss einfacher erklärt und neu gefragt werden.
- **Technik-Menü (T), entschieden:** „So skills nicht also nicht einfach son skill 15% weniger Strom soll es nicht geben. Das soll alles in T aufgehen eine große skill Seite“. T wird die eine Fähigkeiten-Seite, die TECHS gehen darin auf, es gibt keine Klick-Boni mehr.
- **Papas Laden, entschieden:** „Erstmal weglassen alles mit Papa aber im Hinterkopf Ideen oder stell mir nochmal andere Ideen vor“. Bankfrist und Schulden-Drama fallen weg; die Werkstatt bleibt (Papa vermietet sie). Neue Laden-Ideen kommen später; die ersten vier Vorschläge (Laden wächst mit, Bitcoin-Dilemma, Übergabe, Kreditrate) hat er nicht genommen.
- **Startgeld, entschieden:** „Man muss wirklich erstmal damit verdienen aber man kann vielleicht bei Papa zurück zahlen oder so also so papa leiht einem Geld für den Auszug dass das so anfängt und dann macht man aber nichts und dann kommt die Nachricht vom Kumpel“. Papas Umzugsdarlehen ohne Frist und Zinsen; Miete und Strom bezahlt man nur aus dem Mining. Man wacht ohne Plan auf, erst Deniz' Nachricht bringt die Bitcoin-Idee.
- **Fähigkeiten-Seite T:** „Ein großer Baum“. Ein zusammenhängender Baum mit Linien wie in Strategiespielen, zeitlich von links nach rechts, verschiebbar und zoombar; Kategorien nur als Äste bzw. Farben.
- **Lieblings-Fähigkeiten:** „Löten & Reparieren, Undervolten/Übertakten, Betriebssystem & Firmware, Mehr noch“. Diese Äste bekommen die schönsten Handgriffe; „mehr noch“ heißt: noch mehr Fähigkeiten.
- **Automatik:** Mini-Spiele übernimmt später ein Roboter (keine Techniker, keine Familie), der sichtbar von seiner Ladestation zum Gerät fährt.
- **Papa:** „Papa will selbst minen, Ja das ist gut so helfen und Belohnungen und skills kriegen“. Neben-Quest: Papa baut im Laden einen schlechten Miner, man hilft ihm (zu Fuß hin) und lernt bei ihm Elektrik und Fehlersuche. Die übrigen Laden-Ideen sind raus.
- **Menüs zu voll:** „Menüs unübersichtlich, Die Menüs sind zu voll und unübersichtlich dass soll man alles lernen durch einen Grund“. In jedem Fenster steht nur, was man gerade kann; Noch-nicht-Verfügbares wird ausgeblendet, nicht ausgegraut. Jede neue Funktion kommt mit einem Grund (Nachricht oder Fähigkeit), auch innerhalb der Fenster.
- **Börse:** „das Menü für die bitcoins ist kacke das sieht nicht gut aus das soll auf dem echten Monitor auch noch sein“. Die Börse braucht ein neues, schönes Design und soll auch auf dem PC-Monitor in der 3D-Welt laufen. Entschieden: „Kamera zoomt rein“ (E am PC, weiche Kamerafahrt, Esc zurück) und „Ganz simpel“: großer Kurs, Bestand, Chart, große Knöpfe Kaufen/Verkaufen, Betrag mit 25 %/50 %/Alles. Kein Zeitstil-Wandel. M öffnet dieselbe Seite als Fenster, wenn man nicht am PC steht.
- **„Mehr noch“ bei den Fähigkeiten:** „Einfach mehr Fähigkeiten“.
- **Entschlacken, entschieden vom Vertreter (21.11.2026, nachts):** In jedem Fenster steht nur, was man gerade kann. Tasten ohne Funktion tun nichts und stehen nicht in der Tastenleiste. Das Ziele-Panel zeigt nur eine Zeile, jedes Ziel erst nach seinem Grund. **Bonusziele bleiben Überraschungen** („Bonus geschafft: …“) und werden nicht vorher verraten. „Fülle deine Wohnung“ erscheint erst ab etwa 70 % Füllstand. Handy-Nachrichten sind Chats pro Person mit Ungelesen-Zähler. Die Firma heißt bis zur GmbH „Meine Bude“. Der Bausatz-Vorschlag im Shop ist immer bezahlbar, sonst steht dort „Spar noch X $“. Strom steht überall gleich da; Bitcoin-Ertrag ist klar als Coins gekennzeichnet.
- **Börse, Details (Vertreter):** Die Mini-Ansicht auf dem Monitor ist aus 2–3 m lesbar. Kaufen kommt erst mit Deniz' Nachricht, damit man 2010 nicht billig Coins kauft und das Mining egal wird. Zeiträume: 30 Tage und Alles, nach einem Jahr Spielzeit auch „1 Jahr“.
- **Rechnungen, entschieden vom Vertreter (21.11.2026):** Mahnstufen bleiben (Erinnerung, zwei Mahnungen, nach 3 Wochen Strom aus); jede Mahnung ist eine klare Handy-Nachricht mit „Jetzt zahlen“ bzw. „Coins verkaufen“. Papa hilft immer (bis 5.000 $, alles aufs Darlehen), wird aber kühler, ab dem dritten Mal mit ehrlichem Satz. Die Strom-Nachzahlung bis März 2011 bleibt; ist sie für einen normalen Spieler nicht schaffbar, wird die Frist gestreckt, nie der Kurs. **Umziehen ist freiwillig, aber als Fortschritt angelegt:** Ab der Werkstatt bietet Papa das Zimmer über dem Laden an. Wer kündigt, zahlt keine Wohnungsmiete mehr; die PCs kommen mit Papas Lieferwagen als Kisten in die Werkstatt (nichts wird gelöscht). **Kein Job-Hinweis im Spiel**, denn „Man muss wirklich erstmal damit verdienen“. Der spätere Sieg (Juli 2021) ist okay, die Miete im Krypto-Winter gehört dazu.
- **Fähigkeiten, entschieden vom Vertreter (21.11.2026):** Kein Großhandels-Rabatt in Prozent, stattdessen meldet sich der Großhändler Herr Lindqvist per Handy mit befristeten Sammelangeboten zu sichtbaren Preisen. Alte Spielstände bekommen statt eines Prozent-Übergangs einmalig Geld von Deniz („Hab deinen alten Kram verkauft“). Noch nicht gebaute Fähigkeiten erscheinen nicht im Baum; fertige, aber gesperrte dürfen grau sichtbar sein. Phase 2 in dieser Reihenfolge: Löt-Spiele (Fehlersuche durch Stecken, Chip-Kette, Netzteil-Mod), dann Tuning (Leistungsregler, BIOS-Mod, Dual-Mining). Die Techniker heißen „Reparaturdienst (extern)“ und lassen sich zentral abschalten.
- **Arbeitsweise:** „der ideen typ soll mit dir quatschen und mit mir in einem andern chat so dass du nicht auf antworten warten musst“. Der Spieler-Vertreter läuft als eigener Chat, fragt den Auftraggeber dort und schickt die Ergebnisse an den Entwicklungs-Chat.

## Roadmap (später)
- KI-Rechenzentrum: Mining-Hallen zu KI-Rechenzentren umbauen; dafür braucht man wieder GPUs (passt zu „GPU-Übertakten geht nur für GPUs“).

## Offene Fragen (für den nächsten Fragebogen)
- **Techniker:** Auto-Reparatur zu 60 % neben dem Robo behalten? Vorläufig ja, morgen fragen.
