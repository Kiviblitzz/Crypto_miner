// Touch-Steuerung für Handy/Tablet: virtueller Joystick links, Umsehen durch Ziehen, Knöpfe rechts
export function initTouch(world, ui) {
  const pad = document.getElementById('touchpad');
  const stick = document.getElementById('stick'), knob = document.getElementById('knob');
  const show = () => pad.classList.toggle('hidden', world.mode !== 'play');
  const prev = world.onModeChange; world.onModeChange = (m) => { prev?.(m); show(); };
  show();
  let id = null, cx = 0, cy = 0;
  const R = 50;
  stick.addEventListener('pointerdown', (e) => { id = e.pointerId; const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; stick.setPointerCapture(id); move(e); e.stopPropagation(); });
  const move = (e) => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    world.player.touch.x = dx / R; world.player.touch.y = dy / R;
  };
  stick.addEventListener('pointermove', move);
  const end = (e) => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; world.player.touch.x = world.player.touch.y = 0; };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  document.getElementById('t-use').onclick = () => world.primaryAction();
  document.getElementById('t-build').onclick = () => { if (ui.g.has('build')) ui.toggleBuild(); }; // Shop erst, wenn er eingeführt ist (Anlernen)
  document.getElementById('t-menu').onclick = () => { world.setMode('ui'); ui.pause(true); };
}
