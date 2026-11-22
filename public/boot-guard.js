/* Startschutz (klassisches Skript, vor dem Spiel-Modul in index.html eingebunden – eigene Datei wegen der CSP der Desktop-App):
   Scheitert schon das Laden des Spiels (Modul-Fehler, Datei fehlt, kein WebGL), kommt eine Meldung statt eines leeren Bildschirms.
   main.js setzt window.__hwBoot, sobald der Start geschafft ist – danach übernimmt src/ui/crash.js. */
(function () {
  var shown = false;
  function el(tag, css, text) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (text) e.textContent = text; return e; }
  function show(msg) {
    if (shown || window.__hwBoot) return; shown = true;
    var line = '[' + new Date().toISOString() + '] Start fehlgeschlagen: ' + msg + '\n';
    try { if (window.hwDesktop && window.hwDesktop.logWrite) window.hwDesktop.logWrite(line); else localStorage.setItem('hashwerk_log', ((localStorage.getItem('hashwerk_log') || '') + line).slice(-60000)); } catch (e) { /* egal */ }
    function put() {
      var d = el('div', 'position:fixed;inset:0;z-index:99;display:flex;align-items:center;justify-content:center;padding:16px;background:#1d1510;color:#fff6e6;font:16px/1.45 Nunito,system-ui,sans-serif;text-align:center');
      d.id = 'bootfail'; d.setAttribute('role', 'alert');
      var box = el('div', 'max-width:420px');
      var b = el('button', 'font:700 16px Nunito,system-ui,sans-serif;padding:11px 24px;border:0;border-radius:999px;background:#ffc23a;color:#3a2300;cursor:pointer', 'Neu laden');
      b.type = 'button'; b.onclick = function () { location.reload(); };
      box.appendChild(el('b', 'font-size:24px', 'HASHWERK konnte nicht starten.'));
      box.appendChild(el('p', '', 'Deine Spielstände sind sicher.'));
      box.appendChild(el('p', 'font:12px/1.4 monospace;opacity:.55;word-break:break-word', msg));
      box.appendChild(b); d.appendChild(box); document.body.appendChild(d);
    }
    if (document.body) put(); else document.addEventListener('DOMContentLoaded', put);
  }
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'SCRIPT') { show('Datei fehlt: ' + String(t.src || 'Skript').split('/').pop()); return; }
    if ((t && t !== window) || /ResizeObserver loop/i.test(e.message || '')) return;
    show((e.message || 'Fehler') + (e.filename ? ' (' + e.filename.split('/').pop() + ':' + e.lineno + ')' : ''));
  }, true);
  window.addEventListener('load', function () { setTimeout(function () { if (!window.__hwBoot) show('Das Spiel wurde nicht geladen.'); }, 0); });
})();
