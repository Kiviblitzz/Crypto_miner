// Ego-Spieler: Maus-Blick (Pointer Lock oder Ziehen), WASD-Bewegung, Sprint, Kollision, Kopfwippen
import * as THREE from 'three';

export class Player {
  constructor(camera, dom) {
    this.camera = camera; this.dom = dom;
    this.pos = new THREE.Vector3(1, 0, 1);
    this.yaw = 0; this.pitch = 0; this.eye = 1.62; this.radius = 0.28;
    this.keys = {}; this.locked = false; this.enabled = false;
    this.bob = 0; this.moving = false; this.stepDist = 0;
    this.sens = 0.0022;
    this.touch = { x: 0, y: 0 }; // virtueller Joystick (-1..1)
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    document.addEventListener('mousemove', (e) => {
      if (!this.enabled || !this.locked) return;
      this.look(e.movementX, e.movementY);
    });
    // Ziehen zum Umsehen (wenn Pointer Lock nicht verfügbar ist, z. B. Touch)
    let drag = null;
    dom.addEventListener('pointerdown', (e) => { if (!this.enabled || this.locked) return; if (e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.4 && e.clientY > window.innerHeight * 0.45) return; drag = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: 0 }; });
    window.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY; this.look(dx * 1.6, dy * 1.6); });
    window.addEventListener('pointerup', (e) => { if (drag && e.pointerId === drag.id) { this.lastDragMoved = drag.moved; drag = null; } });
  }
  look(mx, my) {
    this.yaw -= mx * this.sens; this.pitch -= my * this.sens;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
  }
  setPose(x, z, yaw, pitch = -0.08) { this.pos.set(x, 0, z); this.yaw = yaw; this.pitch = pitch; this.apply(); }
  lookAtPoint(x, z) { this.yaw = Math.atan2(-(x - this.pos.x), -(z - this.pos.z)); }
  forward(out = new THREE.Vector3()) { return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
  update(dt, collides, speedScale = 1) {
    const k = this.keys;
    let fx = (k.w || k.ArrowUp ? 1 : 0) - (k.s || k.ArrowDown ? 1 : 0) + -this.touch.y;
    let sx = (k.d || k.ArrowRight ? 1 : 0) - (k.a || k.ArrowLeft ? 1 : 0) + this.touch.x;
    const len = Math.hypot(fx, sx); if (len > 1) { fx /= len; sx /= len; }
    const sprint = k.Shift ? 2.1 : 1;
    const speed = 2.6 * sprint * speedScale;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const dx = (-sin * fx + cos * sx) * speed * dt, dz = (-cos * fx - sin * sx) * speed * dt;
    this.moving = len > 0.05;
    if (this.moving) {
      const nx = this.pos.x + dx; if (!collides(nx, this.pos.z, this.radius)) this.pos.x = nx;
      const nz = this.pos.z + dz; if (!collides(this.pos.x, nz, this.radius)) this.pos.z = nz;
      const moved = Math.hypot(dx, dz); this.stepDist += moved; this.bob += moved * 5.2;
      if (this.stepDist > 0.75) { this.stepDist = 0; this.onStep?.(sprint > 1); }
    } else this.bob *= 0.9;
    this.apply();
  }
  apply() {
    const bobY = this.moving ? Math.sin(this.bob) * 0.035 : 0;
    this.camera.position.set(this.pos.x, this.eye + bobY, this.pos.z);
    this.euler.set(this.pitch, this.yaw, Math.sin(this.bob * 0.5) * (this.moving ? 0.004 : 0));
    this.camera.quaternion.setFromEuler(this.euler);
  }
}
