// Plattform-Brücke: Desktop (Electron – window.hwDesktop aus electron/preload.cjs) oder Browser (Ersatz über localStorage usw.).
// Alle Aufrufe sind synchron (Desktop: ipcRenderer.sendSync), damit Speichern/Laden im Spiel einfach bleibt.
// Vertrag für window.hwDesktop (nur wenn vorhanden; jede Methode darf fehlen → Browser-Ersatz):
//   fileRead(name) → string|null · fileWrite(name, text) → bool (atomar: tmp + rename) · fileList() → [{ name, size, mtime }]
//   fileRemove(name) → bool · logWrite(text) · paths() → { saves, logs } · version() → string
//   quit() · setFullscreen(bool) · isFullscreen() → bool · setWindowSize(w, h) · displaySizes() → [[w, h], …]
//   openExternal(url) (nur https: und mailto:) · steamOk() → bool · steamUnlock(id) → bool · steamName() → string|null
// Dateinamen: nur [a-z0-9_-], ohne Endung (Desktop hängt .json bzw. .log an und legt sie im Benutzerordner ab).
const D = typeof window !== 'undefined' && window.hwDesktop ? window.hwDesktop : null;
const PRE = 'hashwerk_f_';
const okName = (n) => typeof n === 'string' && /^[a-z0-9_-]{1,40}$/.test(n);
const has = (k) => !!D && typeof D[k] === 'function';
const LOG_KEY = 'hashwerk_log', LOG_MAX = 60000;

export const platform = {
  desktop: !!D,
  // ---------- Dateien (Spielstände, Einstellungen) ----------
  read(name) {
    if (!okName(name)) return null;
    try { if (has('fileRead')) return D.fileRead(name) ?? null; return localStorage.getItem(PRE + name); } catch (e) { return null; }
  },
  write(name, text) {
    if (!okName(name) || typeof text !== 'string') return false;
    try { if (has('fileWrite')) return !!D.fileWrite(name, text); localStorage.setItem(PRE + name, text); return true; } catch (e) { return false; }
  },
  list() {
    try {
      if (has('fileList')) return (D.fileList() || []).filter((f) => okName(f?.name));
      const out = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(PRE)) { const v = localStorage.getItem(k) || ''; out.push({ name: k.slice(PRE.length), size: v.length, mtime: 0 }); } }
      return out;
    } catch (e) { return []; }
  },
  remove(name) {
    if (!okName(name)) return false;
    try { if (has('fileRemove')) return !!D.fileRemove(name); localStorage.removeItem(PRE + name); return true; } catch (e) { return false; }
  },
  // ---------- Protokoll (Fehler) ----------
  log(text) {
    const line = `[${new Date().toISOString()}] ${String(text)}\n`;
    try { if (has('logWrite')) { D.logWrite(line); return; } } catch (e) { /* weiter mit Ersatz */ }
    try { const old = localStorage.getItem(LOG_KEY) || ''; localStorage.setItem(LOG_KEY, (old + line).slice(-LOG_MAX)); } catch (e) { /* egal */ }
  },
  paths() { try { return has('paths') ? D.paths() : null; } catch (e) { return null; } },
  version() { try { return has('version') ? D.version() : null; } catch (e) { return null; } },
  // ---------- Fenster ----------
  quit() { try { if (has('quit')) return D.quit(); window.close(); } catch (e) { /* Browser: geht oft nicht */ } },
  canQuit() { return has('quit'); },
  setFullscreen(on) {
    try {
      if (has('setFullscreen')) return D.setFullscreen(!!on);
      if (on && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
      else if (!on && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    } catch (e) { /* egal */ }
  },
  isFullscreen() { try { return has('isFullscreen') ? !!D.isFullscreen() : !!document.fullscreenElement; } catch (e) { return false; } },
  canResize() { return has('setWindowSize'); },
  setWindowSize(w, h) { try { if (has('setWindowSize')) D.setWindowSize(w | 0, h | 0); } catch (e) { /* egal */ } },
  displaySizes() { try { return has('displaySizes') ? D.displaySizes() || [] : []; } catch (e) { return []; } },
  openExternal(url) {
    if (!/^(https:|mailto:)/.test(String(url))) return;
    try { if (has('openExternal')) return D.openExternal(url); window.open(url, '_blank', 'noopener'); } catch (e) { /* egal */ }
  },
  // ---------- Steam (optional: ohne Steam läuft alles genauso) ----------
  steamOk() { try { return has('steamOk') && !!D.steamOk(); } catch (e) { return false; } },
  steamUnlock(id) { try { return has('steamUnlock') ? !!D.steamUnlock(String(id)) : false; } catch (e) { return false; } },
  steamName() { try { return has('steamName') ? D.steamName() : null; } catch (e) { return null; } },
};
