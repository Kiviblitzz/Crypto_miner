'use strict';
// Steam (optional). steamworks.js wird nur geladen, wenn eine App-ID gesetzt ist:
// Umgebungsvariable HASHWERK_STEAM_APPID oder steam/steam_appid.txt (0 = aus). Ohne Steam läuft das Spiel genauso, alle Aufrufe liefern dann false/null.
const fs = require('fs');
const path = require('path');

const ACH_RE = /^[A-Za-z0-9_]{1,64}$/;

function readAppId(appRoot) {
  const env = process.env.HASHWERK_STEAM_APPID;
  let raw = env != null && env !== '' ? env : null;
  if (raw == null) { try { raw = fs.readFileSync(path.join(appRoot, 'steam', 'steam_appid.txt'), 'utf8'); } catch (e) { raw = '0'; } }
  const id = Number.parseInt(String(raw).trim(), 10);
  return Number.isInteger(id) && id > 0 ? id : 0;
}

function createSteam({ appRoot, log }) {
  const appId = readAppId(appRoot);
  let sw = null, client = null;
  const steam = {
    appId,
    ok: () => !!client,
    // vor app.whenReady() aufrufen: verbindet sich mit dem laufenden Steam-Client und schaltet das Steam-Overlay ein
    start() {
      if (!appId) { log('Steam: aus (keine App-ID)'); return false; }
      try { sw = require('steamworks.js'); } catch (e) { log(`Steam: steamworks.js nicht ladbar: ${e.message}`); return false; }
      try { client = sw.init(appId); } catch (e) { client = null; log(`Steam: nicht verbunden (App-ID ${appId}): ${e.message}`); return false; }
      try { sw.electronEnableSteamOverlay(); } catch (e) { log(`Steam: Overlay nicht aktiv: ${e.message}`); }
      log(`Steam: verbunden (App-ID ${appId}, Spieler ${steam.name() || '?'})`);
      return true;
    },
    unlock(id) {
      if (!client || typeof id !== 'string' || !ACH_RE.test(id)) return false;
      try {
        if (client.achievement.isActivated(id)) return true;
        const done = !!client.achievement.activate(id);
        log(`Steam: Erfolg ${id} ${done ? 'freigeschaltet' : 'nicht freigeschaltet'}`);
        return done;
      } catch (e) { log(`Steam: Erfolg ${id}: ${e.message}`); return false; }
    },
    name() {
      if (!client) return null;
      try { return client.localplayer.getName() || null; } catch (e) { return null; }
    },
  };
  return steam;
}

module.exports = { createSteam, readAppId };
