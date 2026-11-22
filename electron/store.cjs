'use strict';
// Dateien im Benutzerordner: Spielstände (saves/<name>.json), Protokoll (logs/hashwerk.log) und kleine JSON-Dateien (z. B. window.json).
// Alles synchron, damit die Brücke (ipcRenderer.sendSync) einfach bleibt. Schreiben immer atomar: erst <datei>.tmp, dann umbenennen.
const fs = require('fs');
const path = require('path');

const NAME_RE = /^[a-z0-9_-]{1,40}$/;
const SAVE_RE = /^([a-z0-9_-]{1,40})\.json$/;
const MAX_FILE = 32 * 1024 * 1024; // größter Spielstand (Schutz gegen volle Platte durch einen Fehler im Spiel)
const LOG_MAX = 1024 * 1024; // ab 1 MB wird hashwerk.log zu hashwerk.old.log
const LOG_LINE_MAX = 64 * 1024;

const okName = (n) => typeof n === 'string' && NAME_RE.test(n);
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Unter Windows kann das Umbenennen kurz scheitern, wenn ein Virenscanner oder die Steam-Cloud die Zieldatei gerade liest
function renameRetry(from, to) {
  for (let i = 0; ; i++) {
    try { fs.renameSync(from, to); return; } catch (e) {
      if (i >= 6 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
      pause(25 * (i + 1));
    }
  }
}

function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  const fd = fs.openSync(tmp, 'w');
  try { fs.writeFileSync(fd, text, 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  try { renameRetry(tmp, file); } catch (e) { fs.rmSync(tmp, { force: true }); throw e; }
}

function createStore(root) {
  const saves = path.join(root, 'saves');
  const logs = path.join(root, 'logs');
  const logFile = path.join(logs, 'hashwerk.log');
  const logOld = path.join(logs, 'hashwerk.old.log');
  const saveFile = (n) => path.join(saves, n + '.json');
  let onError = () => {};

  function logWrite(text) {
    try {
      let s = String(text);
      if (s.length > LOG_LINE_MAX) s = s.slice(0, LOG_LINE_MAX) + ' …(gekürzt)';
      if (!s.endsWith('\n')) s += '\n';
      fs.mkdirSync(logs, { recursive: true });
      let size = 0;
      try { size = fs.statSync(logFile).size; } catch (e) { size = 0; }
      if (size > 0 && size + Buffer.byteLength(s) > LOG_MAX) { fs.rmSync(logOld, { force: true }); renameRetry(logFile, logOld); }
      fs.appendFileSync(logFile, s, 'utf8');
      return true;
    } catch (e) { return false; }
  }

  return {
    root, saves, logs, logFile,
    okName,
    onError(fn) { onError = fn; },
    logWrite,
    fileRead(name) {
      if (!okName(name)) return null;
      try { return fs.readFileSync(saveFile(name), 'utf8'); } catch (e) { if (e.code !== 'ENOENT') onError(`Lesen ${name}: ${e.message}`); return null; }
    },
    fileWrite(name, text) {
      if (!okName(name) || typeof text !== 'string' || Buffer.byteLength(text) > MAX_FILE) return false;
      try { writeAtomic(saveFile(name), text); return true; } catch (e) { onError(`Schreiben ${name}: ${e.message}`); return false; }
    },
    fileList() {
      let names = [];
      try { names = fs.readdirSync(saves); } catch (e) { return []; }
      const out = [];
      for (const f of names.sort()) {
        const m = SAVE_RE.exec(f); if (!m) continue;
        try { const st = fs.statSync(path.join(saves, f)); if (st.isFile()) out.push({ name: m[1], size: st.size, mtime: Math.round(st.mtimeMs) }); } catch (e) { /* gerade gelöscht */ }
      }
      return out;
    },
    fileRemove(name) {
      if (!okName(name)) return false;
      try { fs.rmSync(saveFile(name), { force: true }); return true; } catch (e) { onError(`Löschen ${name}: ${e.message}`); return false; }
    },
    // kleine Hilfsdateien direkt im Benutzerordner (z. B. Fenstergröße)
    readJSON(file) { try { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); } catch (e) { return null; } },
    writeJSON(file, data) { try { writeAtomic(path.join(root, file), JSON.stringify(data, null, 1)); return true; } catch (e) { onError(`Schreiben ${file}: ${e.message}`); return false; } },
  };
}

module.exports = { createStore, okName, writeAtomic, LOG_MAX };
