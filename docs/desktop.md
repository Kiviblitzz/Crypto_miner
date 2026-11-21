# HASHWERK als Desktop-Spiel (Electron, Steam)

Die Desktop-Version ist das normale Spiel (Vite-Build) in einem eigenen Fenster mit Electron 33. Sie läuft komplett offline,
Spielstände und Protokoll liegen als Dateien im Benutzerordner.

## Bauen

Einmal `npm install`, dann:

| Befehl | Ergebnis |
|---|---|
| `npm run desktop:build:win` | `release/HASHWERK-win32-x64/` und `release/HASHWERK-win32-x64-<version>.zip` |
| `npm run desktop:build:linux` | `release/HASHWERK-linux-x64/` und ZIP |
| `npm run desktop:dev` | baut das Spiel und startet es direkt (Entwicklermodus: F12 Entwicklerwerkzeuge, F5 neu laden) |

Der Windows-Build geht auch unter Linux oder macOS (kein Wine nötig, Symbol und Versionsangaben setzt `@electron/packager` selbst).
Die ZIP-Datei entsteht nur, wenn `zip` (Linux/macOS) bzw. `tar` (Windows 10/11) vorhanden ist; für Steam reicht der Ordner.

Programmsymbol: `electron/icons/hashwerk.ico` (Windows) und `hashwerk.png` (Linux) – zum Ändern einfach ersetzen.

## Unter Windows testen

1. ZIP entpacken, `HASHWERK.exe` starten. Windows SmartScreen warnt beim ersten Start („Weitere Informationen“ → „Trotzdem ausführen“), weil die Exe nicht signiert ist.
2. Das Spiel startet im Vollbild. **F11** oder **Alt+Enter** wechselt zwischen Vollbild und Fenster; Größe und Modus werden gemerkt.
3. Grafikkarte prüfen: In `%APPDATA%\HASHWERK\logs\hashwerk.log` steht beim Start eine Zeile `WebGL: …` mit dem Namen der Grafikkarte.
   Steht dort „SwiftShader“, „llvmpipe“ oder der Zusatz „Software-Rendering“, läuft das Spiel ohne Grafikkarte (Grafiktreiber aktualisieren).
   Bei Laptops mit zwei Grafikchips nimmt die App die schnelle Karte; falls nicht: Windows-Einstellungen → System → Anzeige → Grafik → `HASHWERK.exe` → „Hohe Leistung“.
4. Speichern, Spiel beenden, neu starten, Spielstand laden.

## Wo liegt was

| | Windows | Linux |
|---|---|---|
| Benutzerordner | `%APPDATA%\HASHWERK\` | `~/.config/HASHWERK/` |
| Spielstände | `saves\<name>.json` | `saves/<name>.json` |
| Protokoll | `logs\hashwerk.log` (ab 1 MB wird es zu `hashwerk.old.log`) | `logs/hashwerk.log` |
| Fenstergröße/Vollbild | `window.json` | `window.json` |
| Absturzberichte (nur lokal) | `Crashpad\` | `Crashpad/` |

Im Protokoll stehen Start, Grafikkarte, Fehler des Spiels (Konsole), Abstürze und Hänger.
Stürzt das Spiel ab, lädt die App es neu und zeigt einen Hinweis; hängt es, fragt sie „Warten“ oder „Neu laden“.

Umgebungsvariablen (nur zum Testen): `HASHWERK_DEV=1` (Entwicklerwerkzeuge), `HASHWERK_USER_DATA=<ordner>` (anderer Benutzerordner),
`HASHWERK_STEAM_APPID=<id>` (App-ID ohne Neubau).

## Was für Steam noch fehlt

1. **Steamworks-Partnerkonto** anlegen (partner.steamgames.com): Firmen-/Bank-/Steuerdaten, Identitätsprüfung.
2. **App-Gebühr 100 US-$** (Steam Direct) pro Spiel; wird nach 1.000 $ Umsatz erstattet. Laut Steamworks-Doku gelten Wartezeiten:
   30 Tage zwischen Zahlung und erster Veröffentlichung, die Shopseite muss mindestens 2 Wochen als „Demnächst“ sichtbar sein, Shopseite und Build werden von Valve geprüft (einige Werktage).
3. **App-ID eintragen:** in `steam/steam_appid.txt` (statt `0`), dann neu bauen. Mit `0` ist Steam aus und das Spiel läuft ohne Steam.
4. **Erfolge** in Steamworks anlegen (Statistiken & Erfolge) und veröffentlichen. Der API-Name eines Erfolgs ist die ID, die das Spiel an `platform.steamUnlock(id)` übergibt (Buchstaben, Ziffern, `_`).
5. **Depot hochladen mit SteamPipe** (steamcmd aus dem Steamworks SDK). Beispiel `app_build.vdf`:

   ```
   "AppBuild"
   {
     "AppID" "<App-ID>"
     "Desc" "HASHWERK 0.1.0"
     "ContentRoot" "C:\pfad\zu\release\HASHWERK-win32-x64\"
     "BuildOutput" "C:\pfad\zu\steam-build-output\"
     "Depots"
     {
       "<Depot-ID>"
       {
         "FileMapping" { "LocalPath" "*" "DepotPath" "." "recursive" "1" }
       }
     }
   }
   ```

   Hochladen: `steamcmd +login <steam-benutzer> +run_app_build C:\pfad\zu\app_build.vdf +quit`.
   In Steamworks unter Installation → Allgemein eine Startoption `HASHWERK.exe` (Windows) anlegen und den Build auf einen Branch setzen.
6. **Steam Cloud** (optional, für Spielstände auf mehreren PCs): Auto-Cloud, Stammverzeichnis `WinAppDataRoaming`, Unterordner `HASHWERK/saves`, Muster `*.json`.
7. **Code-Signatur** (optional): Über Steam gestartet ist die fehlende Signatur kaum ein Problem. Wer die ZIP-Datei auch außerhalb von Steam weitergibt, braucht gegen SmartScreen-Warnungen ein Code-Signing-Zertifikat (kostet jährlich).

## Bekannte Grenzen

- Electron 33 bekommt keine Sicherheitsupdates mehr. Weil das Spiel nur eigene, lokale Dateien lädt und Netzzugriffe gesperrt sind, ist das Risiko gering;
  vor dem Release kann die Version in `package.json` angehoben werden (danach `npm install` und testen).
- Das Steam-Overlay (Erfolgs-Meldungen, Shift+Tab) wird nur eingeschaltet, wenn Steam läuft und eine App-ID gesetzt ist.
