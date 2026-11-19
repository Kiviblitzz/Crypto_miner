// Ego-Ansicht: eigene Hände/Arme (Hoodie-Ärmel), Bau-Tablet beim Platzieren, Taschenlampe
import * as THREE from 'three';

const overlay = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, depthTest: false, depthWrite: false, ...extra });

export class ViewModel {
  constructor(camera) {
    this.camera = camera;
    const g = (this.root = new THREE.Group()); camera.add(g);
    const sleeve = overlay(0x2d4f86), skin = overlay(0xe2b48f), dark = overlay(0x16181d, { metalness: 0.3, roughness: 0.4 });
    const mk = (geo, m, parent, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.renderOrder = 50; o.castShadow = false; o.frustumCulled = false; parent.add(o); return o; };
    // Rechter Arm
    this.right = new THREE.Group(); g.add(this.right);
    mk(new THREE.BoxGeometry(0.09, 0.09, 0.42), sleeve, this.right, 0, 0, 0.12);
    mk(new THREE.BoxGeometry(0.075, 0.05, 0.1), skin, this.right, 0, 0.005, -0.12);
    mk(new THREE.BoxGeometry(0.02, 0.02, 0.06), skin, this.right, -0.035, 0.03, -0.12);
    // Linker Arm (erscheint mit dem Tablet)
    this.left = new THREE.Group(); g.add(this.left);
    mk(new THREE.BoxGeometry(0.09, 0.09, 0.42), sleeve, this.left, 0, 0, 0.12);
    mk(new THREE.BoxGeometry(0.075, 0.05, 0.1), skin, this.left, 0, 0.005, -0.12);
    // Bau-Tablet
    this.tablet = new THREE.Group(); g.add(this.tablet);
    mk(new THREE.BoxGeometry(0.26, 0.17, 0.012), dark, this.tablet, 0, 0, 0);
    const c = document.createElement('canvas'); c.width = 256; c.height = 160; this.tabCanvas = c;
    this.tabTex = new THREE.CanvasTexture(c); this.tabTex.colorSpace = THREE.SRGBColorSpace;
    const scr = mk(new THREE.PlaneGeometry(0.24, 0.15), new THREE.MeshBasicMaterial({ map: this.tabTex, depthTest: false, depthWrite: false, toneMapped: false }), this.tablet, 0, 0, 0.007); scr.renderOrder = 51;
    this.tablet.visible = false; this.left.visible = false;
    // Taschenlampe
    this.lamp = new THREE.SpotLight(0xfff2d8, 0, 26, 0.42, 0.45, 1.4);
    this.lamp.position.set(0.12, -0.08, 0); camera.add(this.lamp); camera.add(this.lamp.target); this.lamp.target.position.set(0.05, -0.1, -3);
    this.lampOn = false;
    this.t = 0; this.raise = 0;
  }
  setTablet(text) {
    const g = this.tabCanvas.getContext('2d');
    g.fillStyle = '#0c1320'; g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#ffb000'; g.font = 'bold 22px Arial'; g.fillText('HASHWERK BAU', 14, 32);
    g.fillStyle = '#e8edf4'; g.font = '18px Arial';
    const words = String(text || '').split(' '); let line = '', y = 66;
    for (const w of words) { if ((line + w).length > 22) { g.fillText(line, 14, y); y += 24; line = ''; } line += w + ' '; }
    g.fillText(line, 14, y);
    g.fillStyle = '#5dff9c'; g.font = '15px Arial'; g.fillText('Klick = setzen · R = drehen', 14, 148);
    this.tabTex.needsUpdate = true;
  }
  toggleLamp() { this.lampOn = !this.lampOn; this.lamp.intensity = this.lampOn ? 26 : 0; return this.lampOn; }
  update(dt, { moving, bob, placing, visible, uiOpen }) {
    this.t += dt;
    this.root.visible = visible;
    const want = placing ? 1 : 0; this.raise += (want - this.raise) * Math.min(1, dt * 8);
    const sway = Math.sin(this.t * 1.6) * 0.004, walkX = moving ? Math.sin(bob * 0.5) * 0.012 : 0, walkY = moving ? Math.abs(Math.cos(bob * 0.5)) * 0.012 : 0;
    const low = uiOpen ? 0.12 : 0;
    // Rechte Hand: ruhig unten rechts, beim Bauen hält sie das Tablet
    this.right.position.set(0.24 + walkX, -0.24 + sway + walkY - low + this.raise * 0.04, -0.38);
    this.right.rotation.set(0.12 + this.raise * 0.3, -0.12 - this.raise * 0.2, 0);
    this.left.visible = this.tablet.visible = this.raise > 0.05;
    this.left.position.set(-0.2 + walkX, -0.25 + sway + walkY + this.raise * 0.03, -0.4);
    this.left.rotation.set(0.35, 0.25, 0);
    this.tablet.position.set(-0.02 + walkX, -0.2 + walkY - (1 - this.raise) * 0.2, -0.42);
    this.tablet.rotation.set(-0.55, 0.06, 0.02);
  }
}
