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
- **Was er sehen will:** die spielbare Version als Artifact, das nach jeder Runde aktualisiert wird: https://claude.ai/artifact/RLtXTTQaYJExVNeNKcRBGq

## Offene Fragen (für den nächsten Fragebogen)
- Wie viele Fähigkeiten sind „so viel wie möglich“? Lieber ein großer Baum oder Kategorien (Hardware, Software, Kühlung, Handel …)?
- Sollen Fähigkeiten verloren gehen bzw. veralten, z. B. GPU-Wissen in der ASIC-Ära?
- Wie oft darf ein Mini-Spiel kommen, bevor es nervt? Soll es überspringbar sein?
