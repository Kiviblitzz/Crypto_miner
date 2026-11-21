// HASHWERK – Einstiegspunkt: Spielschleife, Zeit, Tastatur (Ego-Perspektive), Titelbild
import { Game, fmtDate, fmtUSD } from './sim/game.js';
import { World } from './world/world.js';
import { UI } from './ui/ui.js';
import { CHAPTERS, DIFFICULTY } from './data/world.js';
import { PLACEABLE } from './data/hardware.js';
import { Audio } from './ui/audio.js';
import { initTouch } from './ui/touch.js';

const SEC_PER_DAY = [Infinity, 86400, 1440, 24, 4, 0.5, 0.12]; // 1 = Echtzeit, 2 = 1 Min/s, 3 = 1 Std/s, 4 = 6 Std/s, 5 = 2 Tage/s, 6 = 8 Tage/s

const game = new Game();
const world = new World(document.getElementById('c'), game);
world.loadFacility('kinder');
const ui = new UI(game, world);
const audio = new Audio(); ui.audio = audio;
window.addEventListener('pointerdown', () => audio.init(), { once: true });
world.player.onStep = (run) => { audio.step(run); ui.steps = (ui.steps || 0) + 1; }; // Schritte zählen: Deniz schreibt, sobald man sich in der Bude umgesehen hat (ui.ideaTick)
window.__hw = { game, world, ui }; // Debug/Tests
document.body.dataset.mode = 'title';
if (world.touchMode) initTouch(world, ui);

world.onPlace = (type, x, z, rot, template) => {
  const fac = game.s.current;
  const def = PLACEABLE[type];
  if (!game.placeableAllowed(def, fac)) { ui.toast('Das passt hier nicht hin.', 'bad'); return null; }
  if (!game.slotOk(fac, def)) { ui.toast(template?.stock ? 'Hier ist kein Platz mehr – stell es an einem anderen Standort auf.' : 'Kein Platz mehr – Zeit für einen größeren Standort.', 'bad'); world.cancelPlacement(); return null; }
  if (template?.stock) { // Ausgepacktes aus dem Bestand aufstellen: kostet nichts mehr
    const o = game.placeStock(template.stock, fac, x, z, rot);
    if (!o) { ui.toast('Davon ist nichts mehr ausgepackt.', 'info'); world.cancelPlacement(); return null; }
    audio.install?.(); return o;
  }
  if (game.parcelMode()) { ui.toast('Im Shop wird bestellt – geliefert wird morgen früh vor deine Wohnungstür.', 'info'); world.cancelPlacement(); return null; } // Paket-Modus: Kaufen geht nur über Bestellungen
  if (template?.build) { // Build aus Katalog/Konfigurator: fertig montiert oder als Bausatz
    const o = game.placeBuild(template.build, fac, x, z, rot, !!template.ready);
    if (!o) { const blk = game.buildBlocked(template.build), lock = template.ready && !game.readyOk(template.build.type); ui.toast(blk ? `${blk} gibt es nicht mehr zu kaufen.` : lock ? 'Fertig bestückt geht erst über einen Kontakt – als Bausatz geht’s sofort.' : 'Nicht genug Geld.', 'bad'); if (lock) world.cancelPlacement(); return null; }
    audio.buy(); return o;
  }
  const src = template?.kit ? template.src : template; // kit: Kopie als Bausatz (leeres Gehäuse, Teile ins Lager)
  const o = src ? game.cloneObject(src, fac, x, z, rot, !!template.kit) : game.addObject(fac, type, x, z, rot);
  if (!o) { const blk = src && game.cloneWhy(src, !!template.kit), lock = !blk && src && !template.kit && game.cloneRig(src) && !game.readyOk(src.type); const sold = !blk && !lock && (src ? !game.cloneStockOk(src) : game.stockLeft(def) === 0); ui.toast(blk ? `${blk}.` : lock ? 'Fertig bestückt geht erst über einen Kontakt – als Bausatz geht’s sofort.' : sold ? `Kontingent erschöpft – ${game.stockText()}.` : 'Nicht genug Geld.', 'bad'); if (lock || blk) world.cancelPlacement(); return null; }
  audio.buy();
  return o;
};

// Titelbild
const splash = document.getElementById('splash');
const hasSave = game.hasSave();
if (hasSave) {
  // Hintergrund im Titel: das eigene Zimmer aus dem Spielstand
  let loaded = false; try { loaded = game.load(); if (loaded) { world.syncObjects(); world.syncLoose(); world.syncParcels?.(); } } catch (e) { /* neuer Stand bleibt */ }
  const b = document.getElementById('btn-continue'); if (loaded) b.classList.remove('hidden'); b.classList.add('primary'); document.getElementById('btn-new').classList.remove('primary');
  const info = game.saveInfo(); if (info) b.innerHTML = `<span class="bi"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></span><span class="bt">Weiterspielen<small>${fmtDate(info.day)} · ${fmtUSD(info.cash)}</small></span>`;
}
let splashOrbit = true;
// Neues Spiel: erst den Schwierigkeitsgrad wählen
const DIFF_ICON = { easy: '<path d="M4 15c3-6 13-6 16 0"/><path d="M7 19h10"/>', normal: '<path d="M5 12h14"/><path d="M12 5v14"/>', hard: '<path d="M6 4h12v4a6 6 0 0 1-12 0z"/><path d="M12 14v4M8 20h8"/>' };
function pickDifficulty(start) {
  const btns = splash.querySelector('.splash-btns'); btns.classList.add('hidden');
  const box = document.createElement('div'); box.className = 'splash-btns diff-pick';
  box.innerHTML = '<div class="dp-h">Wie willst du spielen?</div>';
  for (const [id, d] of Object.entries(DIFFICULTY)) {
    const b = document.createElement('button'); b.className = 'btn big' + (id === 'normal' ? ' primary' : ''); b.dataset.diff = id;
    b.innerHTML = `<span class="bi"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${DIFF_ICON[id]}</svg></span><span class="bt">${d.name}<small>${d.desc}</small></span>`;
    b.onclick = () => { box.remove(); btns.classList.remove('hidden'); start(id); };
    box.append(b);
  }
  const back = document.createElement('button'); back.className = 'dp-back'; back.textContent = 'Zurück';
  back.onclick = () => { box.remove(); btns.classList.remove('hidden'); };
  box.append(back);
  btns.after(box);
}
const btnNew = document.getElementById('btn-new');
btnNew.onclick = () => {
  // Vorhandener Spielstand: erst nach zweitem Klick überschreiben
  if (hasSave && !btnNew.dataset.armed) { const bt = btnNew.querySelector('.bt'), was = bt.innerHTML; btnNew.dataset.armed = '1'; bt.innerHTML = 'Wirklich neu?<small>Nochmal klicken – der Spielstand wird überschrieben</small>'; setTimeout(() => { delete btnNew.dataset.armed; bt.innerHTML = was; }, 4000); return; }
  pickDifficulty((diff) => {
  game.newGame(diff); ui.resetSession(); splash.classList.add('hidden'); splashOrbit = false;
  world.setMode('ui');
  game.startTutor(); // Anlernen: alles kommt nach und nach – zuerst das Handy
  ui.switchSite('kinder'); world.syncLoose(); world.syncParcels?.(); ui.speedBar(); ui.ticker(); ui.dock(); ui.keysHint();
  ui.wakeUp(); // aufwachen, dann vibriert das Handy
  });
};
document.getElementById('btn-continue').onclick = () => {
  if (game.load()) { ui.resetSession(); splash.classList.add('hidden'); splashOrbit = false; ui.switchSite(game.s.current); ui.speedBar(); ui.ticker(); ui.keysHint(); world.setMode('play'); ui.toast('Willkommen zurück!', 'good'); }
  else ui.toast('Spielstand konnte nicht geladen werden', 'bad');
};

// Beim Verlassen speichern – auch wenn der Tab nur in den Hintergrund geht (mobil kommt beforeunload oft nicht)
const saveNow = () => { if (splash.classList.contains('hidden')) game.save(); };
window.addEventListener('beforeunload', saveNow);
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { saveNow(); audio.ctx?.suspend?.().catch(() => {}); } // Ton im Hintergrund-Tab anhalten
  else audio.ctx?.resume?.().catch(() => {});
});

// Tastatur (Hotkeys)
// H = Handy (P geht weiter), I = Wärmebild
const HOT = { j: () => ui.skills(), g: () => ui.goalActionKey(), b: () => ui.toggleBuild(), m: () => ui.market(), h: () => ui.phone(), p: () => ui.phone(), i: () => ui.toggleHeat(), c: () => ui.company(), t: () => ui.techs(), l: () => ui.ranking(), k: () => ui.toggleMap() };
function onKey(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || !splash.classList.contains('hidden')) return;
  if (world.cine) { e.preventDefault(); return; } // Aufwachen (World.wakeUp): keine Eingabe
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (e.code === 'Space') { e.preventDefault(); ui.setSpeed(game.s.speed ? 0 : (ui.lastSpeed || 1)); return; }
  if (['1', '2', '3', '4', '5', '6'].includes(e.key)) { ui.setSpeed(+e.key); return; }
  if (k === 'Escape') {
    if (world.mode === 'map') { ui.toggleMap(); return; }
    if (world.mode === 'ui') { ui.resume(); return; }
    if (ui.paused) { if (performance.now() - (ui.pausedAt || 0) > 350) ui.resume(); return; } // dasselbe Esc, das gerade die Maus freigab und pausierte, nicht gleich wieder auflösen
    // Im Spiel ohne eingefangene Maus (z. B. gerade ein Fenster mit Esc geschlossen, eingebettete Seite): das nächste Esc öffnet die Pause
    if (world.mode === 'play' && !world.cine && document.pointerLockElement !== world.canvas) { ui.pause(true); return; }
    return;
  }
  if (world.mode === 'ui' && k === 'e' && ui.inspUid && document.getElementById('modal').classList.contains('hidden') && performance.now() - (ui.openedAt || 0) > 200) { ui.resume(); return; }
  if (HOT[k] && (world.mode === 'play' || world.mode === 'ui' || ui.paused || world.mode === 'map')) {
    if (world.mode === 'map' && k !== 'k') return;
    if (k === 'b' && world.mode === 'ui' && document.body.classList.contains('show-build')) { ui.resume(); return; }
    if (k !== 'b' && k !== 'k' && ui.modalKind && ui.modalKind === { m: 'market', p: 'phone', h: 'phone', c: 'company', t: 'techs', l: 'ranking', j: 'skills' }[k]) { ui.resume(); return; }
    if (ui.stickyModal()) return; // Story/Finale/Rückblick nicht wegklicken
    const NEED = { b: 'build', m: 'market', p: 'phone', h: 'phone', i: 'heat', c: 'company', t: 'techs', l: 'ranking', k: 'map', j: 'skills' };
    if (NEED[k] && !game.has(NEED[k])) { ui.toast('Noch nicht freigeschaltet.', 'info', 1800); return; }
    HOT[k](); return;
  }
  if (e.key === 'Delete' && world.selected) {
    const o = game.findObj(world.selected); if (!o) return;
    if (!game.canSell(o)) { ui.toast('Den PC brauchst du noch.', 'info', 2500); return; }
    if (ui.delArmed === o.uid) { const v = game.objectValue(o); game.removeObject(o.uid); ui.resume(); ui.delArmed = null; ui.toast(`Verkauft für ${v.toLocaleString('de-DE')} $`, 'good', 2500); }
    else { ui.delArmed = o.uid; ui.toast('Nochmal Entf drücken, um das Objekt zu verkaufen.', 'info', 3000); setTimeout(() => { if (ui.delArmed === o.uid) ui.delArmed = null; }, 3000); }
  }
}
window.addEventListener('keydown', onKey);
// H gehört jetzt dem Handy: vor der Welt abfangen (die nahm H früher fürs Wärmebild, das jetzt auf I liegt)
window.addEventListener('keydown', (e) => { if (e.key !== 'h' && e.key !== 'H') return; if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return; e.stopImmediatePropagation(); onKey(e); }, true);

// Spielschleife
let last = performance.now();
let screenTimer = 0;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const s = game.s;
  if (splashOrbit) {
    // Langsamer Blick durch die erste Wohnung hinter dem Titelbild
    const t = now / 1000 * 0.12;
    world.camera.position.set(3.3, 1.6, 3.05);
    world.controls.target.set(2.35 + Math.sin(t) * 0.4, 1.0 + Math.sin(t * 0.7) * 0.1, 0.4 + Math.cos(t) * 0.25);
    s.frac = 0.83;
  } else if (s.speed && document.getElementById('modal').classList.contains('hidden') && !ui.paused && (s.flags.miningStarted || !s.feat)) { // Zeit steht, bis der erste PC läuft
    const slow = ui.showRun && performance.now() < (ui.slowUntil || 0); s.frac += dt / (slow ? Math.max(60, SEC_PER_DAY[s.speed]) : SEC_PER_DAY[s.speed]); // Einschalt-Moment kurz in Zeitlupe
    let n = 0;
    while (s.frac >= 1 && n < 4) { s.frac -= 1; game.advanceDay(); n++; }
    if (s.frac >= 1) s.frac = 0.99;
  }
  screenTimer -= dt; if (world.screensDirty) { world.screensDirty = false; screenTimer = 0; } if (screenTimer <= 0) { screenTimer = 1.0; world.updateStatus(); world.drawScreens(); if (!splashOrbit) ui.tutorial(); const sm = game.summary[s.current]; if (sm) audio.setLoad(sm.watt, !sm.tripped && !splashOrbit); if (world.aim) ui.prompt(world.aim); }
  ui.liveWallet(); ui.objMarker();
  world.update();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
