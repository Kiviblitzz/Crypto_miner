// Absturzschutz im Spiel: fängt Fehler aus der Hauptschleife (main.js), window.onerror und unhandledrejection,
// schreibt sie mit Stack ins Protokoll (platform.log), sichert den Stand in eine eigene Datei (rescue, SaveStore.rescue)
// und zeigt „Ups, Fehler.“ mit „Weiterspielen“ und „Letzten Stand laden“. Mehr als FLOOD_N Fehler in FLOOD_MS: Simulation hält an.
// Fehler beim Start (vor window.__hwBoot) zeigt das kleine Skript in index.html. Fehler im Fenster selbst lösen keine Schleife aus.
import './saves.css';
import { platform } from '../platform.js';

export const FLOOD_N = 5, FLOOD_MS = 10000;
const RESCUE_GAP = 10000; // Notfall-Sicherung höchstens alle 10 s
const LOG_MAX = 20; // so viele Fehler ins Protokoll, danach nur noch zählen
const msgOf = (e) => { try { if (e && typeof e === 'object' && 'message' in e) return `${e.name || 'Error'}: ${e.message}`; return String(e); } catch (x) { return 'Fehler'; } };
const full = (e) => { try { return e?.stack ? `${msgOf(e)}\n${e.stack}` : msgOf(e); } catch (x) { return 'Fehler'; } };
const own = (file) => { try { return !file || location.origin === 'null' || file.startsWith(location.origin) || file.startsWith('file:'); } catch (e) { return true; } };

export class Crash {
  // opt: inGame() → bool, rescue() → bool, hasSave() → bool, onShow(), onResume(), loadLast(), toTitle()
  constructor(opt = {}) { this.opt = opt; this.times = []; this.open = false; this.halted = false; this.busy = false; this.count = 0; this.logged = 0; this.lastRescue = -1e9; this.rescued = false; this.el = null; this.last = ''; }
  get stop() { return this.open || this.halted; } // Hauptschleife: keine Simulation, kein Bild
  install() {
    window.addEventListener('error', (e) => {
      if (e.target && e.target !== window) return; // Bilder, Schriften …
      if (/ResizeObserver loop/i.test(e.message || '') || !own(e.filename)) return; // harmlos bzw. Browser-Erweiterung
      this.report(e.error ?? e.message, 'Fehler');
    });
    window.addEventListener('unhandledrejection', (e) => {
      const r = e.reason;
      if (typeof DOMException !== 'undefined' && r instanceof DOMException) { this.log(`Hinweis: ${msgOf(r)}`); return; } // Mauszeiger, Ton, Vollbild: Browser sagt nein – kein Spielfehler
      this.report(r, 'Promise');
    });
    window.addEventListener('keydown', (e) => { // offenes Fenster: Esc = Weiterspielen (nicht, wenn angehalten); andere Tasten gehen nicht ins Spiel
      if (!this.open) return;
      e.stopImmediatePropagation();
      if (e.key === 'Escape') { e.preventDefault(); this.resume(); }
    }, true);
  }
  log(t) { try { platform.log(t); } catch (e) { /* egal */ } }
  report(err, where = 'Fehler') {
    if (this.busy) return; // Fehler beim Behandeln eines Fehlers: nicht noch einmal
    this.busy = true;
    try {
      const now = performance.now(); this.count++;
      this.times = this.times.filter((t) => now - t < FLOOD_MS); this.times.push(now);
      if (this.logged < LOG_MAX) { this.logged++; this.log(`${where}: ${full(err)}`); } else if (this.logged === LOG_MAX) { this.logged++; this.log('Weitere Fehler werden nur noch gezählt.'); }
      try { console.error(err); } catch (e) { /* egal */ }
      if (!window.__hwBoot) return; // Start noch nicht fertig: index.html zeigt die Meldung
      if (!this.halted && this.times.length > FLOOD_N) { this.halted = true; this.log(`${this.times.length} Fehler in ${FLOOD_MS / 1000} s – Simulation angehalten`); }
      if (now - this.lastRescue > RESCUE_GAP && this.opt.inGame?.()) { this.lastRescue = now; let ok = false; try { ok = !!this.opt.rescue?.(); } catch (e) { ok = false; } this.rescued = this.rescued || ok; }
      this.last = msgOf(err);
      this.show();
    } catch (e) { /* Fehlerbehandlung selbst gescheitert: still bleiben */ } finally { this.busy = false; }
  }
  show() {
    const first = !this.open; this.open = true;
    if (first) try { this.opt.onShow?.(); } catch (e) { /* egal */ }
    let el = this.el;
    if (!el || !el.isConnected) {
      el = document.createElement('div'); el.id = 'crash'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Fehler');
      el.innerHTML = '<div class="cr-card"><h3>Ups, Fehler.</h3><p class="cr-sub"></p><p class="cr-halt"></p><div class="cr-btns"><button class="btn big primary cr-go">Weiterspielen</button><button class="btn big cr-load">Letzten Stand laden</button><button class="btn big cr-title">Zum Titelbild</button></div><p class="cr-det"></p></div>';
      el.querySelector('.cr-go').onclick = () => this.resume();
      el.querySelector('.cr-load').onclick = () => this.act('loadLast');
      el.querySelector('.cr-title').onclick = () => this.act('toTitle');
      document.body.append(el); this.el = el;
    }
    if (first || this.has === undefined) { try { this.has = !!this.opt.hasSave?.(); } catch (e) { this.has = false; } } // heiler Stand da? (einmal je Fenster – bei einer Fehlerflut nicht jedes Mal alle Dateien lesen)
    el.querySelector('.cr-sub').textContent = this.rescued || this.has ? 'Spielstand ist gesichert.' : 'Sichern ging nicht.';
    el.querySelector('.cr-halt').textContent = this.halted ? 'Zu viele Fehler hintereinander – das Spiel ist angehalten.' : '';
    el.querySelector('.cr-go').classList.toggle('hidden', this.halted);
    el.querySelector('.cr-load').classList.toggle('primary', this.halted);
    el.querySelector('.cr-load').classList.toggle('hidden', !this.has);
    el.querySelector('.cr-title').classList.toggle('hidden', !this.halted);
    el.querySelector('.cr-det').textContent = `${this.last}${this.count > 1 ? ` (${this.count}×)` : ''}`;
    el.classList.remove('hidden');
    if (first) el.querySelector(this.halted ? '.cr-load' : '.cr-go')?.focus();
  }
  resume() {
    if (this.halted || !this.open) return;
    this.open = false; this.el?.classList.add('hidden');
    try { this.opt.onResume?.(); } catch (e) { /* egal */ }
  }
  act(k) { try { this.opt[k]?.(); } catch (e) { try { location.reload(); } catch (e2) { /* nichts mehr zu tun */ } } }
}
