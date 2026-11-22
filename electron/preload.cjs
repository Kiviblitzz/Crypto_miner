'use strict';
// Brücke Spiel ↔ Desktop-App: window.hwDesktop, genau nach dem Vertrag in src/platform.js.
// Läuft in der Sandbox (nur electron.ipcRenderer/contextBridge), alle Aufrufe synchron über ipcRenderer.sendSync.
const { contextBridge, ipcRenderer } = require('electron');

const call = (ch, ...args) => { try { return ipcRenderer.sendSync(`hw:${ch}`, ...args); } catch (e) { return null; } };
const str = (v) => (typeof v === 'string' ? v : String(v));
const arr = (v) => (Array.isArray(v) ? v : []);

contextBridge.exposeInMainWorld('hwDesktop', {
  fileRead: (name) => { const v = call('fileRead', str(name)); return typeof v === 'string' ? v : null; },
  fileWrite: (name, text) => typeof text === 'string' && call('fileWrite', str(name), text) === true,
  fileList: () => arr(call('fileList')),
  fileRemove: (name) => call('fileRemove', str(name)) === true,
  logWrite: (text) => { call('logWrite', str(text)); },
  paths: () => call('paths'),
  version: () => call('version'),
  quit: () => { call('quit'); },
  setFullscreen: (on) => { call('setFullscreen', !!on); },
  isFullscreen: () => call('isFullscreen') === true,
  setWindowSize: (w, h) => { call('setWindowSize', Number(w) | 0, Number(h) | 0); },
  displaySizes: () => arr(call('displaySizes')),
  openExternal: (url) => call('openExternal', str(url)) === true,
  steamOk: () => call('steamOk') === true,
  steamUnlock: (id) => call('steamUnlock', str(id)) === true,
  steamName: () => { const v = call('steamName'); return typeof v === 'string' ? v : null; },
});

// Hinweis nach einem Neuladen durch die App (Absturz oder Hänger)
window.addEventListener('DOMContentLoaded', () => {
  const msg = call('notice');
  if (typeof msg !== 'string' || !msg) return;
  const d = document.createElement('div');
  d.setAttribute('role', 'status');
  d.textContent = msg;
  Object.assign(d.style, {
    position: 'fixed', left: '50%', bottom: '64px', transform: 'translateX(-50%)', zIndex: '2147483647', pointerEvents: 'none',
    background: 'rgba(22,24,29,.94)', color: '#fff6e6', border: '2px solid #ffb000', borderRadius: '12px', padding: '12px 18px',
    font: '600 15px/1.35 Nunito, system-ui, sans-serif', boxShadow: '0 8px 30px rgba(0,0,0,.5)', maxWidth: '80vw', textAlign: 'center',
  });
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 9000);
});
