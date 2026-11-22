// Einstellungsmenü: Grafik · Ton · Steuerung · Tasten · Sprache. Alles wirkt sofort und wird gespeichert (prefs.js, Plattform-Datei „settings“).
// Erreichbar über „Einstellungen“ im Titelbild und in der Pause. Esc schließt das Menü (zurück zur Pause bzw. zum Titelbild);
// beim Tastenbelegen bricht Esc nur das Belegen ab. Solange das Menü offen ist, lösen Tasten nichts im Spiel aus.
import { platform } from '../platform.js';
import * as P from '../prefs.js';
import * as KEYS from '../keys.js';
import './settings.css';

const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pct = (v) => `${Math.round(v * 100)} %`;
const de1 = (v) => v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const GEAR = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5"/></svg>';
const TABS = [['gfx', 'Grafik'], ['snd', 'Ton'], ['ctl', 'Steuerung'], ['keys', 'Tasten'], ['lang', 'Sprache']];
const QNAME = { auto: 'Auto', low: 'Niedrig', medium: 'Mittel', high: 'Hoch' };
const SENS_BASE = 0.0022;

export function initSettings({ world, ui, audio }) {
  const S = { open: false, from: null, tab: 'gfx', cap: null, note: '' };
  let root = null, back = null;

  // ---------- Anwenden (Start und nach jeder Änderung) ----------
  function applyAll() {
    const s = P.get();
    world.setFpsLimit?.(s.fps);
    if (s.scale !== 1 || world.rscale) world.setRenderScale?.(s.scale);
    world.setFov?.(s.fov);
    world.player.sens = SENS_BASE * s.sens; world.player.invertY = s.invertY;
    audio.setVolumes?.(s.vol); audio.setMuted?.(s.mute);
    ui.refreshKeys?.();
  }
  function applyWindow() { // nur Desktop: Vollbild und Fenstergröße wie zuletzt gewählt
    const s = P.get(); if (!platform.desktop) return;
    if (typeof s.fullscreen === 'boolean' && s.fullscreen !== platform.isFullscreen()) platform.setFullscreen(s.fullscreen);
    if (s.win && platform.canResize() && !platform.isFullscreen()) platform.setWindowSize(s.win[0], s.win[1]);
  }
  applyAll(); applyWindow();
  // Beschriftungen nach dem echten Tastatur-Layout (Chrome/Edge/Desktop)
  try { navigator.keyboard?.getLayoutMap?.().then((m) => { if (KEYS.setLayout([...m.entries()])) { ui.refreshKeys?.(); if (S.open) render(); } }).catch(() => {}); } catch (e) { /* ohne Layout: Standard-Beschriftungen */ }

  // ---------- Knöpfe in Titelbild und Pause ----------
  const btnHtml = (id) => `<button id="${id}" class="btn big"><span class="bi">${GEAR}</span><span class="bt">Einstellungen</span></button>`;
  const tb = document.getElementById('btn-settings') || (() => { const box = document.querySelector('#splash .splash-btns'); if (!box) return null; const b = h(btnHtml('btn-settings')); box.append(b); return b; })();
  if (tb) tb.onclick = () => open('title');
  const pb = document.getElementById('pause-settings') || (() => { const r = document.getElementById('pause-resume'); if (!r) return null; const b = h(btnHtml('pause-settings')); r.after(b); return b; })();
  if (pb) pb.onclick = () => open('pause');

  // ---------- Öffnen / Schließen ----------
  function build() {
    root = h(`<div id="settings" class="hidden" role="dialog" aria-modal="true" aria-labelledby="set-title"><div class="set-card">
      <div class="set-head"><h2 id="set-title">Einstellungen</h2><button class="set-x" title="Zurück (Esc)" aria-label="Zurück">✕</button></div>
      <div class="set-tabs" role="tablist">${TABS.map(([id, l]) => `<button class="set-tab" role="tab" data-t="${id}">${l}</button>`).join('')}</div>
      <div class="set-body"></div>
      <div class="set-foot">Änderungen gelten sofort und werden gespeichert. <kbd>Esc</kbd> zurück</div>
    </div></div>`);
    root.querySelector('.set-x').onclick = () => close();
    root.querySelectorAll('.set-tab').forEach((b) => { b.onclick = () => { S.tab = b.dataset.t; S.cap = null; S.note = ''; render(); }; });
    root.addEventListener('pointerdown', (e) => { if (S.cap && !e.target.closest('.kb, .set-cap')) { S.cap = null; render(); } }); // Klick daneben: Belegen abbrechen
    document.body.append(root);
  }
  function open(from) {
    if (!root) build();
    S.open = true; S.from = from; S.cap = null; S.note = ''; back = document.activeElement;
    root.classList.remove('hidden'); document.body.classList.add('settings-open'); document.body.dataset.settings = from;
    render(); root.querySelector(`.set-tab[data-t="${S.tab}"]`)?.focus({ preventScroll: true });
  }
  function close() {
    if (!S.open) return;
    S.open = false; S.cap = null; root?.classList.add('hidden'); document.body.classList.remove('settings-open'); delete document.body.dataset.settings;
    if (back?.isConnected) back.focus?.({ preventScroll: true }); back = null;
  }

  // ---------- Bausteine ----------
  const row = (label, sub, ctl, cls = '') => { const r = h(`<div class="set-row ${cls}"><div class="set-l"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</div><div class="set-c"></div></div>`); r.lastElementChild.append(ctl); return r; };
  function seg(opts, cur, pick, label) {
    const el = h(`<div class="seg set-seg" role="radiogroup" aria-label="${esc(label)}"></div>`);
    for (const [v, l] of opts) { const b = h(`<button class="btn ${v === cur ? 'on' : ''}" role="radio" aria-checked="${v === cur}">${l}</button>`); b.onclick = () => pick(v); el.append(b); }
    return el;
  }
  function toggle(on, change, labels = ['An', 'Aus']) {
    const b = h(`<button class="set-tg ${on ? 'on' : ''}" role="switch" aria-checked="${on}"><i></i><span>${on ? labels[0] : labels[1]}</span></button>`);
    b.onclick = () => change(!on); return b;
  }
  function slider(min, max, step, val, fmt, input, done, label) {
    const el = h(`<label class="set-sl"><input type="range" min="${min}" max="${max}" step="${step}" value="${val}" aria-label="${esc(label)}"/><b>${fmt(val)}</b></label>`);
    const inp = el.querySelector('input'), out = el.querySelector('b');
    const fill = () => inp.style.setProperty('--p', `${((+inp.value - min) / (max - min)) * 100}%`); fill(); // gefüllter Teil der Leiste
    inp.oninput = () => { out.textContent = fmt(+inp.value); fill(); input(+inp.value); };
    inp.onchange = () => done?.(+inp.value);
    return el;
  }
  const note = (html, cls = '') => h(`<div class="set-note ${cls}">${html}</div>`);

  // ---------- Reiter ----------
  function paneGfx(body) {
    const s = P.get(), mode = world.gfx?.mode || s.gfx.mode || 'auto';
    body.append(row('Qualität', 'Schatten, Licht und Effekte', seg([['auto', 'Auto'], ['low', 'Niedrig'], ['medium', 'Mittel'], ['high', 'Hoch']], mode, (k) => { if (world.setGfxMode) world.setGfxMode(k); else world.setQuality?.(k === 'auto' ? 'high' : k); render(); }, 'Qualität')));
    const cur = QNAME[world.quality] || 'Hoch';
    body.append(note(mode === 'auto' ? `Gerade: ${cur} – ruckelt es, schaltet das Spiel selbst herunter.` : 'Ruckelt es? Stell auf „Niedrig“ oder auf „Auto“.'));
    if (world.glInfo) body.append(note(world.glSoft ? (platform.desktop ? 'Die Grafikkarte wird nicht genutzt – die 3D-Grafik läuft auf dem Prozessor. Abhilfe: Grafiktreiber aktualisieren.' : 'Die Grafikkarte wird nicht genutzt – der Browser rechnet die 3D-Grafik auf dem Prozessor. Abhilfe: im Browser „Hardwarebeschleunigung verwenden“ einschalten.') : `Grafikkarte: ${esc(world.glInfo)}`, world.glSoft ? 'warn' : 'dim'));
    body.append(row('Bildrate begrenzen', 'Höchstens so viele Bilder pro Sekunde', seg(P.FPS_STEPS.map((n) => [n, n ? String(n) : 'Aus']), s.fps, (n) => { P.set({ fps: n }); world.setFpsLimit?.(n); render(); }, 'Bildrate')));
    const fs = platform.isFullscreen();
    body.append(row('Vollbild', '', toggle(fs, (on) => { platform.setFullscreen(on); P.set({ fullscreen: on }); setTimeout(render, 250); })));
    body.append(row('Auflösung', 'Weniger Bildpunkte – läuft flüssiger', seg(P.SCALE_STEPS.map((v) => [v, pct(v)]), s.scale, (v) => { P.set({ scale: v }); world.setRenderScale?.(v); render(); }, 'Auflösung')));
    if (platform.canResize()) {
      const sizes = (platform.displaySizes() || []).filter((x) => Array.isArray(x) && x.length === 2), curW = s.win || [window.outerWidth, window.outerHeight];
      if (sizes.length) {
        const sel = h(`<select class="set-sel" aria-label="Fenstergröße" ${fs ? 'disabled' : ''}>${sizes.map(([w, hh]) => `<option value="${w}x${hh}" ${w === curW[0] && hh === curW[1] ? 'selected' : ''}>${w} × ${hh}</option>`).join('')}</select>`);
        sel.onchange = () => { const [w, hh] = sel.value.split('x').map(Number); platform.setWindowSize(w, hh); P.set({ win: [w, hh] }); };
        body.append(row('Fenstergröße', fs ? 'Erst Vollbild ausschalten' : '', sel));
      }
    }
  }
  function paneSnd(body) {
    const s = P.get();
    body.append(row('Ton', '', toggle(!s.mute, (on) => { P.set({ mute: !on }); audio.setMuted?.(!on); render(); })));
    const vol = (k, label, sub) => body.append(row(label, sub, slider(0, 100, 1, Math.round(s.vol[k] * 100), (v) => `${v} %`, (v) => audio.setVolume?.(k, v / 100), (v) => { P.set({ vol: { [k]: v / 100 } }); if (k === 'sfx' || k === 'master') audio.click?.(); }, label), s.mute ? 'muted' : ''));
    vol('master', 'Gesamt', '');
    vol('music', 'Musik', 'Ruhige Klänge, im Spiel erzeugt · 0 % = aus');
    vol('sfx', 'Effekte', 'Klicks, Kasse, Nachrichten, Schritte');
    vol('amb', 'Umgebung', 'Rauschen und Brummen der Geräte');
    if (s.mute) body.append(note('Der Ton ist aus – die Regler gelten, sobald er wieder an ist.', 'dim'));
  }
  function paneCtl(body) {
    const s = P.get();
    body.append(row('Mausempfindlichkeit', '', slider(P.SENS.min, P.SENS.max, 0.1, s.sens, (v) => `${de1(v)}×`, (v) => { world.player.sens = SENS_BASE * v; }, (v) => P.set({ sens: v }), 'Mausempfindlichkeit')));
    body.append(row('Maus umkehren', 'Oben und unten tauschen', toggle(s.invertY, (on) => { P.set({ invertY: on }); world.player.invertY = on; render(); })));
    body.append(row('Sichtfeld', 'Wie viel du auf einmal siehst', slider(P.FOV.min, P.FOV.max, 1, s.fov, (v) => `${v}°`, (v) => world.setFov?.(v), (v) => P.set({ fov: v }), 'Sichtfeld')));
    body.append(note(`Tasten belegst du im Reiter „Tasten“.`, 'dim'));
  }
  function paneKeys(body) {
    const un = new Set(KEYS.unbound());
    if (S.cap) {
      const a = KEYS.ACTION[S.cap.act];
      const c = h(`<div class="set-cap" role="status"><span>Taste für „${esc(a.name)}“ drücken …</span><small><kbd>Esc</kbd> bricht ab</small><button class="btn small">Taste entfernen</button></div>`);
      c.querySelector('button').onclick = () => { const { act, slot } = S.cap; KEYS.clear(act, slot); S.cap = null; S.note = KEYS.unbound().includes(act) ? `„${esc(a.name)}“ hat jetzt keine Taste.` : ''; P.save(); ui.refreshKeys?.(); render(); };
      body.append(c);
    } else if (S.note) body.append(note(S.note, un.size ? 'warn' : ''));
    const map = KEYS.bindings();
    for (const [gid, gname] of KEYS.GROUPS) {
      const grp = h(`<div class="set-grp"><h4>${gname}</h4></div>`);
      for (const a of KEYS.ACTIONS.filter((x) => x.group === gid)) {
        const r = h(`<div class="set-key ${un.has(a.id) ? 'bad' : ''}" data-a="${a.id}"><span class="n">${esc(a.name)}${un.has(a.id) ? '<em>nicht belegt</em>' : ''}</span></div>`);
        for (const slot of [0, 1]) {
          const code = map[a.id][slot], on = S.cap && S.cap.act === a.id && S.cap.slot === slot, lab = code ? KEYS.codeLabel(code) : '–';
          const b = h(`<button class="kb ${slot ? 'alt' : ''} ${on ? 'cap' : ''} ${code ? '' : 'empty'} ${lab.length > 9 ? 'long' : ''}" data-s="${slot}" title="${slot ? 'Zweite Taste' : 'Taste'} für „${esc(a.name)}“ – klicken und neue Taste drücken">${on ? '…' : esc(lab)}</button>`);
          b.onclick = (e) => { e.stopPropagation(); S.cap = { act: a.id, slot }; S.note = ''; render(); };
          r.append(b);
        }
        grp.append(r);
      }
      body.append(grp);
    }
    body.append(h('<div class="set-grp"><div class="set-key fixed"><span class="n">Menü und Pause</span><kbd>Esc</kbd><span class="fx">fest</span></div></div>'));
    const rs = h(`<div class="set-act"><button class="btn" ${KEYS.isDefault() ? 'disabled' : ''}>Standard wiederherstellen</button></div>`);
    rs.querySelector('button').onclick = () => { KEYS.reset(); S.cap = null; S.note = 'Alle Tasten wie am Anfang.'; P.save(); ui.refreshKeys?.(); render(); };
    body.append(rs);
  }
  function paneLang(body) {
    const s = P.get(), list = h('<div class="set-langs" role="radiogroup" aria-label="Sprache"></div>');
    for (const [id, l, ok] of P.LANGS) { const b = h(`<button class="set-lang ${s.lang === id ? 'on' : ''}" role="radio" aria-checked="${s.lang === id}" ${ok ? '' : 'disabled'}><i></i>${esc(l)}</button>`); if (ok) b.onclick = () => { P.set({ lang: id }); render(); }; list.append(b); }
    body.append(row('Sprache', '', list));
  }
  function render() {
    if (!root || !S.open) return;
    root.querySelectorAll('.set-tab').forEach((b) => { const on = b.dataset.t === S.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    const body = root.querySelector('.set-body'), keep = body.scrollTop; body.innerHTML = ''; body.dataset.t = S.tab;
    ({ gfx: paneGfx, snd: paneSnd, ctl: paneCtl, keys: paneKeys, lang: paneLang })[S.tab](body);
    body.scrollTop = keep;
  }

  // ---------- Tastenbelegen ----------
  function commit(code, key) {
    const { act, slot } = S.cap, a = KEYS.ACTION[act]; S.cap = null;
    if (KEYS.FIXED.includes(code)) { S.note = 'Esc bleibt fürs Menü.'; render(); return; }
    KEYS.learn(code, key);
    const r = KEYS.assign(act, slot, code);
    S.note = r.moved.map((m) => `„${esc(KEYS.ACTION[m.act].name)}“ hat jetzt ${m.code ? `<kbd>${esc(KEYS.codeLabel(m.code))}</kbd>` : 'keine Taste'}.`).join(' ');
    if (r.moved.length) S.note = `<kbd>${esc(KEYS.codeLabel(code))}</kbd> ist jetzt „${esc(a.name)}“. ` + S.note;
    P.save(); ui.refreshKeys?.(); render();
  }
  window.addEventListener('keydown', (e) => {
    if (!S.open) return;
    if (S.cap) { e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat) return; const c = KEYS.codeOf(e); if (c === 'Escape') { S.cap = null; render(); return; } if (c) commit(c, e.key); return; }
    e.stopImmediatePropagation(); // Spieltasten wirken nicht, solange das Menü offen ist (Bedienen mit Tab, Pfeilen, Leertaste bleibt)
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  }, true);
  document.addEventListener('fullscreenchange', () => { if (S.open && S.tab === 'gfx') render(); });
  window.addEventListener('resize', () => { if (S.open && S.tab === 'gfx' && platform.desktop) render(); });

  const api = { open, close, render, apply: applyAll, isOpen: () => S.open, state: S, get from() { return S.from; }, pauseOff() { if (S.open && S.from === 'pause') close(); } };
  ui.settings = api;
  return api;
}
