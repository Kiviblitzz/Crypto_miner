// HASHWERK – Einstiegspunkt: Spielschleife, Zeit, Tastatur, Splash
import { Game } from './sim/game.js';
import { World } from './world/world.js';
import { UI } from './ui/ui.js';
import { CHAPTERS } from './data/world.js';
import { PLACEABLE } from './data/hardware.js';

const SEC_PER_DAY = [Infinity, 4.0, 1.6, 0.5, 0.12];

const game = new Game();
const world = new World(document.getElementById('c'), game);
world.loadFacility('kinder');
const ui = new UI(game, world);
window.__hw = { game, world, ui }; // Debug/Tests

world.onPlace = (type, x, z, rot, template) => {
  const fac = game.s.current;
  const def = PLACEABLE[type];
  if (!game.placeableAllowed(def, fac)) { ui.toast('Das passt hier nicht hin.', 'bad'); return null; }
  const o = template ? game.cloneObject(template, fac, x, z, rot) : game.addObject(fac, type, x, z, rot);
  if (!o) { ui.toast('Nicht genug Geld.', 'bad'); return null; }
  return o;
};

// Splash
const splash = document.getElementById('splash');
const hasSave = game.hasSave();
if (hasSave) document.getElementById('btn-continue').classList.remove('hidden');
let splashOrbit = true;
document.getElementById('btn-new').onclick = () => {
  game.newGame(); splash.classList.add('hidden'); splashOrbit = false;
  ui.switchSite('kinder'); ui.speedBar(); ui.ticker();
  ui.story(CHAPTERS[0].title, `${CHAPTERS[0].intro}<br/><br/>Dein PC steht neben dem Schreibtisch: ein alter <b>Silicor Core Q66</b> mit einer <b>Crimson RHD 4850</b>. Er schürft schon Bitcoin – du musst nur die Zeit laufen lassen (▶ oben).<br/><br/>Klick den PC an, um Teile zu tauschen. Links kannst du neue Rigs, Kühlung und später ASICs kaufen. Pass auf <b>Hitze</b> und <b>Strom</b> auf – Mamas Sicherung hält nur 1,8 kW.`, 'Los geht’s!');
  ui.onModalClose = () => ui.setSpeed(1);
};
document.getElementById('btn-continue').onclick = () => {
  if (game.load()) { splash.classList.add('hidden'); splashOrbit = false; ui.switchSite(game.s.current); ui.speedBar(); ui.ticker(); ui.toast('Willkommen zurück!', 'good'); }
};

// Tastatur
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || !splash.classList.contains('hidden')) return;
  if (e.code === 'Space') { e.preventDefault(); ui.setSpeed(game.s.speed ? 0 : (ui.lastSpeed || 1)); }
  if (['1', '2', '3', '4'].includes(e.key)) { ui.setSpeed(+e.key); ui.lastSpeed = +e.key; }
  if (e.key === 'f' || e.key === 'F') { if (!world.fpActive) world.enterFP(); }
});

// Spielschleife
let last = performance.now();
let screenTimer = 0;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const s = game.s;
  if (splashOrbit) {
    // Langsame Kamerafahrt hinter dem Titelbildschirm
    const t = now / 1000 * 0.08; const d = world.def;
    world.controls.target.set(d.w / 2, 0.6, d.d / 2);
    world.camera.position.set(d.w / 2 + Math.cos(t) * 5.2, 3.2, d.d / 2 + Math.sin(t) * 5.2);
    s.frac = 0.78;
  } else if (s.speed && document.getElementById('modal').classList.contains('hidden')) {
    s.frac += dt / SEC_PER_DAY[s.speed];
    let n = 0;
    while (s.frac >= 1 && n < 4) { s.frac -= 1; game.advanceDay(); n++; }
    if (s.frac >= 1) s.frac = 0.99;
  }
  screenTimer -= dt; if (screenTimer <= 0) { screenTimer = 1.5; world.updateStatus(); world.drawScreens(); }
  world.update();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
