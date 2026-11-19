// HASHWERK – Einstiegspunkt: Spielschleife, Zeit, Tastatur, Splash
import { Game, fmtDate, fmtUSD } from './sim/game.js';
import { World } from './world/world.js';
import { UI } from './ui/ui.js';
import { CHAPTERS } from './data/world.js';
import { PLACEABLE } from './data/hardware.js';
import { Audio } from './ui/audio.js';

const SEC_PER_DAY = [Infinity, 4.0, 1.6, 0.5, 0.12];

const game = new Game();
const world = new World(document.getElementById('c'), game);
world.loadFacility('kinder');
const ui = new UI(game, world);
const audio = new Audio(); ui.audio = audio;
window.addEventListener('pointerdown', () => audio.init(), { once: true });
window.__hw = { game, world, ui }; // Debug/Tests

world.onPlace = (type, x, z, rot, template) => {
  const fac = game.s.current;
  const def = PLACEABLE[type];
  if (!game.placeableAllowed(def, fac)) { ui.toast('Das passt hier nicht hin.', 'bad'); return null; }
  const o = template ? game.cloneObject(template, fac, x, z, rot) : game.addObject(fac, type, x, z, rot);
  if (!o) { ui.toast('Nicht genug Geld.', 'bad'); return null; }
  audio.buy();
  return o;
};

// Splash
const splash = document.getElementById('splash');
const hasSave = game.hasSave();
if (hasSave) {
  const b = document.getElementById('btn-continue'); b.classList.remove('hidden');
  const info = game.saveInfo(); if (info) b.innerHTML = `▶ Weiterspielen <small style="display:block;font-size:12px;font-weight:400;opacity:.8">${fmtDate(info.day, true)} · ${info.sites} Standort${info.sites > 1 ? 'e' : ''} · ${fmtUSD(info.cash)}</small>`;
}
let splashOrbit = true;
document.getElementById('btn-new').onclick = () => {
  game.newGame(); splash.classList.add('hidden'); splashOrbit = false;
  ui.switchSite('kinder'); ui.speedBar(); ui.ticker();
  ui.story(CHAPTERS[0].title, `${CHAPTERS[0].intro}<br/><br/>Dein PC steht neben dem Schreibtisch: ein alter <b>Silicor Core Q66</b> mit einer <b>Crimson RHD 4850</b>. Er schürft schon Bitcoin – du musst nur die Zeit laufen lassen (▶ oben).<br/><br/>Klick den PC an, um Teile zu tauschen. Links kannst du neue Rigs, Kühlung und später ASICs kaufen. Pass auf <b>Hitze</b> und <b>Strom</b> auf – Mamas Sicherung hält nur 1,8 kW.`, 'Los geht’s!');
  ui.onModalClose = () => { ui.setSpeed(1); const pc = game.facObjects('kinder')[0]; if (pc) world.select(pc.uid); ui.toast('👆 Das ist dein PC. Rechts siehst du Ertrag, Stromkosten und die Bauteile – klick einen GPU-Slot, um aufzurüsten.', 'msg', 9000); };
};
document.getElementById('btn-continue').onclick = () => {
  if (game.load()) { splash.classList.add('hidden'); splashOrbit = false; ui.switchSite(game.s.current); ui.speedBar(); ui.ticker(); ui.toast('Willkommen zurück!', 'good'); }
};

// Beim Verlassen speichern
window.addEventListener('beforeunload', () => { if (splash.classList.contains('hidden')) game.save(); });

// Tastatur
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || !splash.classList.contains('hidden')) return;
  if (e.code === 'Space') { e.preventDefault(); ui.setSpeed(game.s.speed ? 0 : (ui.lastSpeed || 1)); }
  if (['1', '2', '3', '4'].includes(e.key)) { ui.setSpeed(+e.key); ui.lastSpeed = +e.key; }
  if (e.key === 'f' || e.key === 'F') { if (!world.fpActive) world.enterFP(); }
  if (e.key === 'Delete' && world.selected) {
    const o = game.findObj(world.selected); if (!o) return;
    if (ui.delArmed === o.uid) { const v = game.objectValue(o); game.removeObject(o.uid); ui.inspect(null); ui.delArmed = null; ui.toast(`Verkauft für ${v.toLocaleString('de-DE')} $`, 'good', 2500); }
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
  screenTimer -= dt; if (screenTimer <= 0) { screenTimer = 1.5; world.updateStatus(); world.drawScreens(); const sm = game.summary[s.current]; if (sm) audio.setLoad(sm.watt, !sm.tripped && !splashOrbit); }
  world.update();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
