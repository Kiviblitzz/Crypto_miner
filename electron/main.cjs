'use strict';
// HASHWERK Desktop (Electron), Hauptprozess: Fenster, Brücke window.hwDesktop (synchrones IPC, Vertrag in src/platform.js),
// Dateien im Benutzerordner, Steam, Absturzschutz. Das Spiel selbst ist der Vite-Build in dist/ und wird über app://hashwerk/ geladen.
const { app, BrowserWindow, Menu, ipcMain, protocol, net, screen, shell, session, dialog, crashReporter } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const { createStore } = require('./store.cjs');
const { createSteam } = require('./steam.cjs');

const DEV = process.env.HASHWERK_DEV === '1';
const APP_ROOT = path.join(__dirname, '..');
const DIST = path.join(APP_ROOT, 'dist');
const SCHEME = 'app', HOST = 'hashwerk', ORIGIN = `${SCHEME}://${HOST}`, START_URL = `${ORIGIN}/index.html`;
const MIN_W = 800, MIN_H = 450;

// ---------- Benutzerordner (vor allem anderen: Sperre, Protokoll und Chromium-Daten liegen dort) ----------
app.setName('HASHWERK');
if (process.platform === 'win32') app.setAppUserModelId('HASHWERK');
app.setPath('userData', process.env.HASHWERK_USER_DATA ? path.resolve(process.env.HASHWERK_USER_DATA) : path.join(app.getPath('appData'), 'HASHWERK'));
const store = createStore(app.getPath('userData'));
const log = (msg) => store.logWrite(`[${new Date().toISOString()}] main: ${msg}`);
store.onError((msg) => log(`Datei: ${msg}`));
const errText = (e) => (e && e.stack) || String(e);
process.on('uncaughtException', (e) => log(`Fehler im Hauptprozess: ${errText(e)}`));
process.on('unhandledRejection', (e) => log(`Fehler im Hauptprozess (Promise): ${errText(e)}`));

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  start();
}

function start() {
  log(`Start HASHWERK ${app.getVersion()} · Electron ${process.versions.electron} · Chrome ${process.versions.chrome} · ${process.platform}-${process.arch}${DEV ? ' · Entwicklermodus' : ''}`);
  try { crashReporter.start({ uploadToServer: false }); } catch (e) { log(`Absturzberichte: ${e.message}`); }

  // ---------- Grafikkarte erzwingen (kein Software-Rendering, auf Laptops die schnelle GPU) ----------
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('force_high_performance_gpu');
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

  const steam = createSteam({ appRoot: APP_ROOT, log });
  steam.start();

  protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true } }]);

  let win = null, quitting = false, notice = null, hang = null, hangReload = false;
  const crashes = [];

  // ---------- Fensterzustand (window.json im Benutzerordner) ----------
  const WIN_FILE = 'window.json';
  const num = (v, lo, hi) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : null);
  const ws = (() => {
    const s = store.readJSON(WIN_FILE) || {};
    return { width: num(s.width, MIN_W, 16384), height: num(s.height, MIN_H, 16384), x: num(s.x, -65536, 65536), y: num(s.y, -65536, 65536), fullscreen: s.fullscreen !== false, maximized: !!s.maximized };
  })();
  // Fenstergröße, die beim nächsten Verlassen des Vollbilds gelten soll (Start im Vollbild oder Größenwahl im Vollbild)
  let pendingSize = ws.fullscreen && ws.width && ws.height ? [ws.width, ws.height] : null;
  let saveTimer = null;
  const saveWin = () => { clearTimeout(saveTimer); saveTimer = null; store.writeJSON(WIN_FILE, ws); };
  const saveWinSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveWin, 500); };
  const rememberWin = () => {
    if (!win || win.isDestroyed()) return;
    ws.fullscreen = win.isFullScreen();
    ws.maximized = win.isMaximized();
    if (win.isNormal() && !pendingSize) { const [x, y] = win.getPosition(), [w, h] = win.getContentSize(); Object.assign(ws, { x, y, width: w, height: h }); }
    saveWinSoon();
  };
  const workArea = () => (win && !win.isDestroyed() ? screen.getDisplayMatching(win.getBounds()) : screen.getPrimaryDisplay()).workArea;
  // Rahmen und Titelleiste (Außenmaß minus Innenmaß), im Vollbild geschätzt
  let frame = process.platform === 'win32' ? [16, 39] : [0, 37];
  const measureFrame = () => { if (win && win.isNormal()) { const [ow, oh] = win.getSize(), [cw, ch] = win.getContentSize(); frame = [ow - cw, oh - ch]; } };

  function windowOptions() {
    const wa = screen.getPrimaryDisplay().workArea;
    let w = ws.width || Math.min(1600, Math.round(wa.width * 0.85)), h = ws.height || Math.min(900, Math.round(wa.height * 0.85));
    const o = { width: w, height: h, useContentSize: true, minWidth: MIN_W, minHeight: MIN_H, fullscreen: ws.fullscreen, show: false, backgroundColor: '#0b0e13', title: 'HASHWERK', autoHideMenuBar: true };
    // gemerkte Position nur, wenn das Fenster noch sichtbar auf einem Bildschirm liegt (Monitor abgesteckt usw.)
    if (ws.x != null && ws.y != null) {
      const vis = screen.getAllDisplays().some(({ workArea: a }) => Math.min(a.x + a.width, ws.x + w) - Math.max(a.x, ws.x) >= 120 && Math.min(a.y + a.height, ws.y + h) - Math.max(a.y, ws.y) >= 80);
      if (vis) { o.x = ws.x; o.y = ws.y; } else { ws.x = null; ws.y = null; }
    }
    if (process.platform === 'linux') o.icon = path.join(__dirname, 'icons', 'hashwerk.png');
    o.webPreferences = { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, spellcheck: false, devTools: DEV };
    return o;
  }

  const isAppUrl = (u) => { try { const x = new URL(u); return x.protocol === `${SCHEME}:` && x.host === HOST; } catch (e) { return false; } };

  function openExternal(url) {
    let u = null;
    try { u = new URL(String(url)); } catch (e) { u = null; }
    if (!u || (u.protocol !== 'https:' && u.protocol !== 'mailto:')) { log(`Link blockiert: ${String(url).slice(0, 200)}`); return false; }
    shell.openExternal(u.href).catch((e) => log(`Link nicht geöffnet: ${e.message}`));
    return true;
  }

  function toggleFullscreen(on) {
    if (!win || win.isDestroyed()) return false;
    win.setFullScreen(on === undefined ? !win.isFullScreen() : !!on);
    return true;
  }

  function reloadGame(msg) {
    if (!win || win.isDestroyed() || quitting) return;
    notice = msg;
    win.loadURL(START_URL).catch((e) => log(`Neu laden fehlgeschlagen: ${e.message}`));
  }

  // ---------- Brücke: alle Aufrufe synchron, Antwort immer gesetzt (sonst hängt das Spiel) ----------
  function sync(name, fallback, fn) {
    ipcMain.on(`hw:${name}`, (e, ...args) => {
      let out = fallback;
      try {
        const f = e.senderFrame;
        if (f && win && e.sender === win.webContents && f === e.sender.mainFrame && isAppUrl(f.url)) { const v = fn(...args); out = v === undefined ? fallback : v; }
      } catch (err) { log(`Brücke ${name}: ${errText(err)}`); }
      e.returnValue = out;
    });
  }
  sync('fileRead', null, (n) => store.fileRead(n));
  sync('fileWrite', false, (n, t) => store.fileWrite(n, t));
  sync('fileList', [], () => store.fileList());
  sync('fileRemove', false, (n) => store.fileRemove(n));
  sync('logWrite', false, (t) => store.logWrite(t));
  sync('paths', null, () => ({ saves: store.saves, logs: store.logs }));
  sync('version', null, () => app.getVersion());
  sync('quit', true, () => { setImmediate(() => app.quit()); return true; });
  sync('setFullscreen', false, (on) => toggleFullscreen(!!on));
  sync('isFullscreen', false, () => !!win && win.isFullScreen());
  sync('setWindowSize', false, (w, h) => {
    const wa = workArea();
    w = num(Number(w), MIN_W, Math.max(MIN_W, wa.width - frame[0])); h = num(Number(h), MIN_H, Math.max(MIN_H, wa.height - frame[1]));
    if (w == null || h == null) return false;
    Object.assign(ws, { width: w, height: h, x: null, y: null });
    if (win.isFullScreen()) { pendingSize = [w, h]; saveWinSoon(); return true; } // gilt beim Verlassen des Vollbilds
    if (win.isMaximized()) win.unmaximize();
    win.setContentSize(w, h); win.center();
    return true;
  });
  sync('displaySizes', [], () => {
    const wa = workArea();
    const maxW = wa.width - frame[0], maxH = wa.height - frame[1];
    const common = [[1024, 576], [1024, 768], [1152, 648], [1280, 720], [1280, 800], [1280, 1024], [1366, 768], [1440, 900], [1600, 900], [1680, 1050],
      [1920, 1080], [1920, 1200], [2048, 1152], [2560, 1080], [2560, 1440], [2560, 1600], [3440, 1440], [3840, 1600], [3840, 2160]];
    const out = common.filter(([w, h]) => w >= MIN_W && h >= MIN_H && w <= maxW && h <= maxH);
    if (!out.length) out.push([Math.max(MIN_W, maxW), Math.max(MIN_H, maxH)]);
    return out;
  });
  sync('openExternal', false, (url) => openExternal(url));
  sync('steamOk', false, () => steam.ok());
  sync('steamUnlock', false, (id) => steam.unlock(String(id)));
  sync('steamName', null, () => steam.name());
  sync('notice', null, () => { const n = notice; notice = null; return n; });

  // ---------- Sicherheit: nur das eigene Spiel, keine Navigation nach außen, keine neuen Fenster ----------
  app.on('web-contents-created', (_e, wc) => {
    wc.setWindowOpenHandler(({ url }) => { openExternal(url); return { action: 'deny' }; });
    wc.on('will-navigate', (e) => { if (!isAppUrl(e.url)) { e.preventDefault(); openExternal(e.url); } });
    wc.on('will-redirect', (e) => { if (!isAppUrl(e.url)) { e.preventDefault(); log(`Weiterleitung blockiert: ${String(e.url).slice(0, 200)}`); } });
    wc.on('will-attach-webview', (e) => e.preventDefault());
  });

  const CSP = ["default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' data:",
    "img-src 'self' data: blob:", "media-src 'self' data: blob:", "connect-src 'self' data: blob:", "worker-src 'self' blob:",
    "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-src 'none'"].join('; ');
  const DIST_ROOT = path.resolve(DIST) + path.sep;
  const notFound = () => new Response('Nicht gefunden', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });

  // index.html bindet Google Fonts ein. Offline (und ohne Verbindung zu Google) liefern wir dieselben Schriften aus dist/_fonts.
  const FONTS = { Nunito: [500, 600, 700, 800], Fredoka: [500, 600, 700] };
  const fontCss = Object.entries(FONTS).flatMap(([fam, weights]) => weights.map((w) => `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(${ORIGIN}/_fonts/${fam.toLowerCase()}-latin-${w}-normal.woff2) format('woff2')}`)).join('\n');
  const netBlocked = new Set();

  function registerProtocols() {
    protocol.handle(SCHEME, async (req) => {
      let file;
      try {
        const u = new URL(req.url);
        if (u.host !== HOST) return notFound();
        let rel = decodeURIComponent(u.pathname);
        if (rel === '/' || rel === '') rel = '/index.html';
        file = path.resolve(DIST, '.' + rel);
        if (!file.startsWith(DIST_ROOT)) return notFound();
      } catch (e) { return notFound(); }
      let res;
      try { res = await net.fetch(pathToFileURL(file).href); } catch (e) { return notFound(); }
      if (!/\.html?$/i.test(file)) return res;
      const h = new Headers(res.headers); h.set('content-security-policy', CSP); h.set('content-type', 'text/html; charset=utf-8');
      return new Response(res.body, { status: res.status, headers: h });
    });
    // kein Netz: http/https werden nie ins Internet weitergereicht (Spiel läuft komplett offline)
    const offline = (req) => {
      let u = null;
      try { u = new URL(req.url); } catch (e) { return notFound(); }
      if (u.host === 'fonts.googleapis.com' && u.pathname === '/css2') return new Response(fontCss, { status: 200, headers: { 'content-type': 'text/css; charset=utf-8' } });
      if (!netBlocked.has(u.host)) { netBlocked.add(u.host); log(`Netzwerk gesperrt: ${u.protocol}//${u.host}`); }
      return notFound();
    };
    protocol.handle('https', offline);
    protocol.handle('http', offline);
  }

  function setupSession() {
    const ses = session.defaultSession;
    const allowed = new Set(['pointerLock', 'fullscreen', 'clipboard-sanitized-write']);
    ses.setPermissionRequestHandler((wc, perm, cb, d) => cb(allowed.has(perm) && isAppUrl((d && d.requestingUrl) || wc.getURL())));
    ses.setPermissionCheckHandler((_wc, perm, origin) => allowed.has(perm) && origin === ORIGIN);
  }

  // ---------- Absturzschutz ----------
  function watchRenderer(wc) {
    let consoleN = 0, consoleT = Date.now(), dropped = 0;
    wc.on('console-message', (e) => {
      const { level, message, lineNumber: line, sourceId } = e;
      if (level !== 'error') return;
      const now = Date.now();
      if (now - consoleT > 60000) { if (dropped) log(`Konsole: ${dropped} weitere Fehler nicht protokolliert`); consoleT = now; consoleN = 0; dropped = 0; }
      if (++consoleN > 40) { dropped++; return; }
      const src = String(sourceId || '').replace(ORIGIN, '');
      log(`Konsole (Fehler): ${String(message).slice(0, 4000)}${src ? ` (${src}:${line})` : ''}`);
    });
    wc.on('preload-error', (_e, p, err) => log(`Preload-Fehler ${p}: ${errText(err)}`));
    wc.on('did-fail-load', (_e, code, desc, url, isMain) => { if (isMain) log(`Laden fehlgeschlagen: ${desc} (${code}) ${url}`); });
    wc.on('render-process-gone', (_e, d) => {
      log(`Spielprozess beendet: ${d.reason} (Code ${d.exitCode})`);
      if (quitting || d.reason === 'clean-exit') return;
      if (hang) { hang.abort(); hang = null; }
      const now = Date.now();
      while (crashes.length && now - crashes[0] > 120000) crashes.shift();
      crashes.push(now);
      const why = hangReload ? 'Neu geladen, weil das Spiel nicht mehr reagiert hat.' : 'Nach einem Absturz neu geladen.';
      hangReload = false;
      if (crashes.length <= 3) { reloadGame(`${why} Dein zuletzt gespeicherter Stand ist noch da.`); return; }
      dialog.showMessageBox(win, { type: 'error', title: 'HASHWERK', message: 'HASHWERK stürzt wiederholt ab.', detail: `Das Protokoll liegt in:\n${store.logFile}`, buttons: ['Neu laden', 'Beenden'], defaultId: 0, cancelId: 1, noLink: true })
        .then(({ response }) => { if (response === 0) { crashes.length = 0; reloadGame('Neu geladen. Dein zuletzt gespeicherter Stand ist noch da.'); } else app.quit(); })
        .catch((e) => log(`Dialog: ${e.message}`));
    });
    wc.on('unresponsive', () => {
      log('Spiel reagiert nicht');
      if (hang || quitting) return;
      const ac = new AbortController(); hang = ac;
      dialog.showMessageBox(win, { type: 'warning', title: 'HASHWERK', message: 'HASHWERK reagiert gerade nicht.', detail: 'Du kannst warten oder das Spiel neu laden. Dein zuletzt gespeicherter Stand bleibt erhalten.', buttons: ['Warten', 'Neu laden'], defaultId: 0, cancelId: 0, noLink: true, signal: ac.signal })
        .then(({ response }) => {
          if (hang === ac) hang = null;
          if (response === 1 && !ac.signal.aborted && win && !win.isDestroyed()) { log('Neu laden nach Hänger'); hangReload = true; wc.forcefullyCrashRenderer(); }
        })
        .catch((e) => log(`Dialog: ${e.message}`));
    });
    wc.on('responsive', () => { log('Spiel reagiert wieder'); if (hang) { hang.abort(); hang = null; } });
  }

  function createWindow() {
    win = new BrowserWindow(windowOptions());
    const wc = win.webContents;
    if (ws.maximized && !ws.fullscreen) win.maximize();
    win.once('ready-to-show', () => { win.show(); win.focus(); measureFrame(); });
    for (const ev of ['resize', 'move', 'maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen']) win.on(ev, () => { measureFrame(); rememberWin(); });
    win.on('leave-full-screen', () => {
      // gewählte Fenstergröße aus dem Vollbild heraus anwenden
      setTimeout(() => {
        if (!win || win.isDestroyed() || win.isFullScreen() || !pendingSize) return;
        const [w, h] = pendingSize; pendingSize = null;
        if (win.isMaximized()) win.unmaximize();
        const [cw, ch] = win.getContentSize();
        if (cw !== w || ch !== h) win.setContentSize(w, h);
        if (ws.x != null && ws.y != null) win.setPosition(ws.x, ws.y); else win.center();
        rememberWin();
      }, 50);
    });
    win.on('close', () => { rememberWin(); saveWin(); });
    win.on('closed', () => { win = null; });
    win.on('page-title-updated', (e) => e.preventDefault());
    wc.on('before-input-event', (e, input) => {
      if (input.type !== 'keyDown') return;
      const k = input.key;
      if (k === 'F11' || (input.alt && k === 'Enter')) { e.preventDefault(); toggleFullscreen(); return; }
      if (!DEV) return;
      if (k === 'F12' || (input.control && input.shift && (k === 'I' || k === 'i'))) { e.preventDefault(); wc.toggleDevTools(); }
      else if (k === 'F5' || (input.control && (k === 'r' || k === 'R'))) { e.preventDefault(); wc.reloadIgnoringCache(); }
    });
    watchRenderer(wc);
    win.loadURL(START_URL).catch((e) => log(`Start fehlgeschlagen: ${e.message}`));
  }

  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show(); win.focus();
  });
  app.on('child-process-gone', (_e, d) => log(`Hilfsprozess beendet: ${d.type} ${d.reason} (Code ${d.exitCode})${d.name ? ' ' + d.name : ''}`));
  app.on('before-quit', () => { quitting = true; if (saveTimer) saveWin(); });
  app.on('window-all-closed', () => app.quit());

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    registerProtocols();
    setupSession();
    createWindow();
    // für Fehlerberichte: welche Grafikkarte Chromium nutzt (nach dem ersten Laden, dann läuft der GPU-Prozess)
    win.webContents.once('did-finish-load', () => {
      const st = app.getGPUFeatureStatus();
      const names = { webgl: 'WebGL', webgl2: 'WebGL2', gpu_compositing: 'Compositing', rasterization: 'Rasterung' };
      log(`Grafik: ${Object.keys(names).filter((k) => st[k]).map((k) => `${names[k]} ${st[k]}`).join(', ')}`);
      const hex = (n) => `0x${Number(n || 0).toString(16).padStart(4, '0')}`;
      app.getGPUInfo('basic').then((info) => {
        const g = (info && info.gpuDevice) || [];
        const act = g.find((d) => d.active) || g[0];
        if (act) log(`Grafikkarte: ${act.vendorString || hex(act.vendorId)} ${act.deviceString || hex(act.deviceId)}${g.length > 1 ? ` (${g.length} Grafikchips)` : ''}`);
      }).catch(() => {});
      const probe = `(() => { try { const c = document.createElement('canvas').getContext('webgl2'); if (!c) return 'nicht verfügbar';
        const e = c.getExtension('WEBGL_debug_renderer_info'); const r = String(e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : c.getParameter(c.RENDERER));
        const l = c.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); return r; } catch (err) { return 'Fehler ' + err.message; } })()`;
      win.webContents.executeJavaScript(probe).then((r) => log(`WebGL: ${r}${/swiftshader|llvmpipe|softpipe|software|basic render/i.test(r) ? ' – Software-Rendering, keine Grafikkarte!' : ''}`)).catch(() => {});
    });
  }).catch((e) => log(`Start: ${errText(e)}`));
}
