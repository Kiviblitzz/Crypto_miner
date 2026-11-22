// Ego-Spieler: Maus-Blick (Pointer Lock oder Ziehen), WASD-Bewegung, Sprint, Kollision, Kopfwippen
import * as THREE from 'three';
import { held } from '../keys.js';

export class Player {
  constructor(camera, dom) {
    this.camera = camera; this.dom = dom;
    this.pos = new THREE.Vector3(1, 0, 1);
    this.yaw = 0; this.pitch = 0; this.eye = 1.62; this.radius = 0.28;
    this.keys = {}; this.locked = false; this.enabled = false;
    this.bob = 0; this.moving = false; this.stepDist = 0;
    this.sens = 0.0022; this.invertY = false; // Einstellungen: Empfindlichkeit, Maus umkehren (oben/unten)
    this.touch = { x: 0, y: 0 }; // virtueller Joystick (-1..1)
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.lockAt = 0; this.avgMag = 12;
    document.addEventListener('mousemove', (e) => {
      if (!this.enabled || !this.locked) return;
      // Direkt nach dem Einfangen der Maus kommen oft Sprünge – kurz ignorieren
      if (performance.now() - this.lockAt < 120) return;
      const mx = e.movementX || 0, my = e.movementY || 0, mag = Math.hypot(mx, my);
      // Bekannter Browser-Fehler: einzelne, unsinnig große Bewegungswerte verwerfen
      if (mag > 180 && mag > this.avgMag * 7) return;
      this.avgMag = this.avgMag * 0.85 + Math.min(mag, 400) * 0.15;
      this.look(mx, my);
    });
    // Ziehen zum Umsehen (wenn Pointer Lock nicht verfügbar ist, z. B. im eingebetteten Fenster oder per Touch)
    let drag = null;
    const endDrag = () => { if (drag) { this.lastDragMoved = drag.moved; drag = null; } };
    dom.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.locked) return;
      if (e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.4 && e.clientY > window.innerHeight * 0.45) return;
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: 0, mouse: e.pointerType === 'mouse' };
      try { dom.setPointerCapture(e.pointerId); } catch (err) { /* nicht kritisch */ }
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (this.locked) { endDrag(); return; } // Maus wurde gerade eingefangen: kein doppeltes Drehen
      if (drag.mouse && e.buttons === 0) { endDrag(); return; } // Taste wurde außerhalb losgelassen
      let dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      const mag = Math.hypot(dx, dy); if (mag > 140) { const k = 140 / mag; dx *= k; dy *= k; } // kein Sprung bei verlorenen Ereignissen
      drag.moved += Math.abs(dx) + Math.abs(dy); this.look(dx * 1.6, dy * 1.6);
    });
    window.addEventListener('pointerup', (e) => { if (drag && e.pointerId === drag.id) endDrag(); });
    window.addEventListener('pointercancel', endDrag); dom.addEventListener('lostpointercapture', endDrag);
    window.addEventListener('blur', endDrag); document.addEventListener('visibilitychange', endDrag);
  }
  look(mx, my) {
    this.yaw -= mx * this.sens; this.pitch -= my * this.sens * (this.invertY ? -1 : 1);
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
  }
  setPose(x, z, yaw, pitch = -0.08, y = 0) { this.pos.set(x, y, z); this.yaw = yaw; this.pitch = pitch; this.apply(); }
  lookAtPoint(x, z) { this.yaw = Math.atan2(-(x - this.pos.x), -(z - this.pos.z)); }
  forward(out = new THREE.Vector3()) { return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
  // ground(x, z, y): Bodenhöhe unter dem Spieler (Treppen, Podeste) oder null = flacher Raum
  update(dt, collides, speedScale = 1, ground = null) {
    const k = this.keys, H = (a) => (held(a, k) ? 1 : 0); // Tasten nach der Belegung (keys.js)
    let fx = H('fwd') - H('back') + -this.touch.y;
    let sx = H('right') - H('left') + this.touch.x;
    const len = Math.hypot(fx, sx); if (len > 1) { fx /= len; sx /= len; }
    const sprint = H('sprint') ? 2.1 : 1;
    const speed = 2.6 * sprint * speedScale;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const dx = (-sin * fx + cos * sx) * speed * dt, dz = (-cos * fx - sin * sx) * speed * dt;
    this.moving = len > 0.05;
    this.wish = { x: dt > 0 ? dx / dt : 0, z: dt > 0 ? dz / dt : 0 }; // gewollte Laufrichtung (Türen, Türtrichter)
    if (this.moving) {
      const x0 = this.pos.x, z0 = this.pos.z;
      const nx = this.pos.x + dx; if (!collides(nx, this.pos.z, this.radius)) this.pos.x = nx;
      const nz = this.pos.z + dz; if (!collides(this.pos.x, nz, this.radius)) this.pos.z = nz;
      if (ground) { const gy = ground(this.pos.x, this.pos.z, this.pos.y); if (gy != null) this.pos.y = gy; }
      const moved = Math.hypot(this.pos.x - x0, this.pos.z - z0); this.stepDist += moved; this.bob += moved * 5.2;
      if (this.stepDist > 0.75) { this.stepDist = 0; this.onStep?.(sprint > 1); }
    } else this.bob *= 0.9;
    this.apply();
  }
  apply() {
    const bobY = this.moving ? Math.sin(this.bob) * 0.035 : 0;
    this.camera.position.set(this.pos.x, this.pos.y + this.eye + bobY, this.pos.z);
    this.euler.set(this.pitch, this.yaw, Math.sin(this.bob * 0.5) * (this.moving ? 0.004 : 0));
    this.camera.quaternion.setFromEuler(this.euler);
  }
}
