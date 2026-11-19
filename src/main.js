// HASHWERK – Einstiegspunkt: Spielschleife, Zeit, Tastatur (Ego-Perspektive), Titelbild
import { Game, fmtDate, fmtUSD } from './sim/game.js';
import { World } from './world/world.js';
import { UI } from './ui/ui.js';
import { CHAPTERS } from './data/world.js';
import { PLACEABLE } from './data/hardware.js';
import { Audio } from './ui/audio.js';
import { initTouch } from './ui/touch.js';

const SEC_PER_DAY = [Infinity, 4.0, 1.6, 0.5, 0.12];

const game = new Game();
const world = new World(document.getElementById('c'), game);
world.loadFacility('kinder');
const ui = new UI(game, world);
const audio = new Audio(); ui.audio = audio;
window.addEventListener('pointerdown', () => audio.init(), { once: true });
world.player.onStep = (run) => audio.step(run);
window.__hw = { game, world, ui }; // Debug/Tests
document.body.dataset.mode = 'title';
if (world.touchMode) initTouch(world, ui);

world.onPlace = (type, x, z, rot, template) => {
  const fac = game.s.current;
  const def = PLACEABLE[type];
  if (!game.placeableAllowed(def, fac)) { ui.toast('Das passt hier nicht hin.', 'bad'); return null; }
  const o = template ? game.cloneObject(template, fac, x, z, rot) : game.addObject(fac, type, x, z, rot);
  if (!o) { ui.toast('Nicht genug Geld.', 'bad'); return null; }
  audio.buy();
  return o;
};

// Titelbild
const splash = document.getElementById('splash');
const hasSave = game.hasSave();
if (hasSave) {
  const b = document.getElementById('btn-continue'); b.classList.remove('hidden');
  const info = game.saveInfo(); if (info) b.innerHTML = `<span class="bi">▶</span><span class="bt">Weiterspielen<small>${fmtDate(info.day)} · ${fmtUSD(info.cash)}</small></span>`;
}
let splashOrbit = true;
document.getElementById('btn-new').onclick = () => {
  game.newGame(); splash.classList.add('hidden'); splashOrbit = false;
  world.setMode('ui');
  ui.switchSite('kinder'); ui.speedBar(); ui.ticker();
  ui.introPhone(() => { ui.setSpeed(1); ui.keysHint(); ui.tutorial(); });
};
document.getElementById('btn-continue').onclick = () => {
  if (game.load()) { splash.classList.add('hidden'); splashOrbit = false; ui.switchSite(game.s.current); ui.speedBar(); ui.ticker(); ui.keysHint(); world.setMode('play'); ui.toast('Willkommen zurück!', 'good'); }
};

// Beim Verlassen speichern
window.addEventListener('beforeunload', () => { if (splash.classList.contains('hidden')) game.save(); });

// Tastatur (Hotkeys)
const HOT = { g: () => ui.goalActionKey(), b: () => ui.toggleBuild(), m: () => ui.market(), p: () => ui.phone(), c: () => ui.company(), t: () => ui.techs(), l: () => ui.ranking(), k: () => ui.toggleMap() };
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || !splash.classList.contains('hidden')) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (e.code === 'Space') { e.preventDefault(); ui.setSpeed(game.s.speed ? 0 : (ui.lastSpeed || 1)); return; }
  if (['1', '2', '3', '4'].includes(e.key)) { ui.setSpeed(+e.key); ui.lastSpeed = +e.key; return; }
  if (k === 'Escape') {
    if (world.mode === 'map') { ui.toggleMap(); return; }
    if (world.mode === 'ui') { ui.resume(); return; }
    if (ui.paused) { ui.resume(); return; }
    return;
  }
  if (world.mode === 'ui' && k === 'e' && ui.inspUid && document.getElementById('modal').classList.contains('hidden') && performance.now() - (ui.openedAt || 0) > 200) { ui.resume(); return; }
  if (HOT[k] && (world.mode === 'play' || world.mode === 'ui' || ui.paused || world.mode === 'map')) {
    if (world.mode === 'map' && k !== 'k') return;
    if (k === 'b' && world.mode === 'ui' && document.body.classList.contains('show-build')) { ui.resume(); return; }
    if (k !== 'b' && k !== 'k' && ui.modalKind && ui.modalKind === { m: 'market', p: 'phone', c: 'company', t: 'techs', l: 'ranking' }[k]) { ui.resume(); return; }
    const NEED = { b: 'build', m: 'market', p: 'phone', c: 'company', t: 'techs', l: 'ranking', k: 'map' };
    if (NEED[k] && !game.has(NEED[k])) { ui.toast('Noch nicht freigeschaltet.', 'info', 1800); return; }
    HOT[k](); return;
  }
  if (e.key === 'Delete' && world.selected) {
    const o = game.findObj(world.selected); if (!o) return;
    if (ui.delArmed === o.uid) { const v = game.objectValue(o); game.removeObject(o.uid); ui.resume(); ui.delArmed = null; ui.toast(`Verkauft für ${v.toLocaleString('de-DE')} $`, 'good', 2500); }
    else { ui.delArmed = o.uid; ui.toast('Nochmal Entf drücken, um das Objekt zu verkaufen.', 'info', 3000); setTimeout(() => { if (ui.delArmed === o.uid) ui.delArmed = null; }, 3000); }
  }
});

// Spielschleife
let last = performance.now();
let screenTimer = 0;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const s = game.s;
  if (splashOrbit) {
    // Langsamer Blick durchs Kinderzimmer hinter dem Titelbild
    const t = now / 1000 * 0.12;
    world.camera.position.set(3.3, 1.6, 3.05);
    world.controls.target.set(1.9 + Math.sin(t) * 1.4, 1.05 + Math.sin(t * 0.7) * 0.15, 0.6 + Math.cos(t) * 0.5);
    s.frac = 0.83;
  } else if (s.speed && document.getElementById('modal').classList.contains('hidden') && !ui.paused) {
    s.frac += dt / SEC_PER_DAY[s.speed];
    let n = 0;
    while (s.frac >= 1 && n < 4) { s.frac -= 1; game.advanceDay(); n++; }
    if (s.frac >= 1) s.frac = 0.99;
  }
  screenTimer -= dt; if (screenTimer <= 0) { screenTimer = 1.0; world.updateStatus(); world.drawScreens(); if (!splashOrbit) ui.tutorial(); const sm = game.summary[s.current]; if (sm) audio.setLoad(sm.watt, !sm.tripped && !splashOrbit); if (world.aim) ui.prompt(world.aim); }
  ui.liveWallet();
  world.update();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
