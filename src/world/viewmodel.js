// Ego-Ansicht: eigene Hände (modelliert: Handrücken, Fingerglieder, Daumen, Hoodie-Ärmel mit Bündchen),
// Bau-Tablet beim Platzieren, Taschenlampe. Wird in einer eigenen Szene über das Bild gezeichnet
// (Tiefenpuffer geleert), damit die Hände nie in Wände oder Geräte hineinragen.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const capsule = (r, len, seg = 10) => { const g = new THREE.CapsuleGeometry(r, len, 4, seg); g.rotateX(Math.PI / 2); return g; };

export class ViewModel {
  constructor(camera) {
    this.camera = camera;
    // Eigene Szene + Licht für die Hände
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xfff6ea, 0x3a3f4a, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(0.6, 1, 0.4); this.scene.add(key);
    this.root = new THREE.Group(); this.scene.add(this.root);
    const sleeve = new THREE.MeshStandardMaterial({ color: 0x2d4f86, roughness: 0.92 });
    const cuffM = new THREE.MeshStandardMaterial({ color: 0x24406e, roughness: 0.95 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xe0b08a, roughness: 0.62 });
    const nail = new THREE.MeshStandardMaterial({ color: 0xf0cdb6, roughness: 0.35 });
    this.mats = { sleeve, cuffM, skin, nail };
    this.right = this.makeArm(1); this.root.add(this.right);
    this.left = this.makeArm(-1); this.root.add(this.left);
    // Bau-Tablet (abgerundetes Gehäuse, Rahmen, Kamera, Bildschirm)
    this.tablet = new THREE.Group(); this.root.add(this.tablet);
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1c21, roughness: 0.35, metalness: 0.4 });
    const bump = new THREE.MeshStandardMaterial({ color: 0xff9f1a, roughness: 0.6 });
    this.tablet.add(new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.18, 0.014, 3, 0.006), bump));
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.256, 0.166, 0.012, 3, 0.005), dark); body.position.z = 0.002; this.tablet.add(body);
    const camDot = new THREE.Mesh(new THREE.CircleGeometry(0.003, 12), new THREE.MeshStandardMaterial({ color: 0x333a48, roughness: 0.1, metalness: 0.8 })); camDot.position.set(0, 0.078, 0.0085); this.tablet.add(camDot);
    const c = document.createElement('canvas'); c.width = 256; c.height = 160; this.tabCanvas = c;
    this.tabTex = new THREE.CanvasTexture(c); this.tabTex.colorSpace = THREE.SRGBColorSpace;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.236, 0.146), new THREE.MeshBasicMaterial({ map: this.tabTex, toneMapped: false })); scr.position.z = 0.0085; this.tablet.add(scr);
    this.tablet.visible = false; this.left.visible = false;
    // Taschenlampe (beleuchtet die Welt, hängt an der Kamera)
    this.lamp = new THREE.SpotLight(0xfff2d8, 0, 26, 0.42, 0.45, 1.4);
    this.lamp.position.set(0.12, -0.08, 0); camera.add(this.lamp); camera.add(this.lamp.target); this.lamp.target.position.set(0.05, -0.1, -3);
    this.lampOn = false;
    this.t = 0; this.raise = 0;
    this.root.traverse((o) => { o.frustumCulled = false; });
  }
  // Unterarm im Ärmel + Hand (side 1 = rechts, -1 = links). Vorne = -Z, Handrücken zeigt nach oben.
  makeArm(side) {
    const { sleeve, cuffM, skin, nail } = this.mats;
    const g = new THREE.Group();
    // Ärmel: leicht bauchig gedrehter Stoff + Rippbündchen
    const slv = new THREE.Mesh(new THREE.LatheGeometry([[0.0, -0.22], [0.056, -0.22], [0.06, -0.12], [0.057, 0.0], [0.05, 0.16], [0.047, 0.2], [0, 0.2]].map(([a, b]) => new THREE.Vector2(a, b)), 20), sleeve);
    slv.rotation.x = -Math.PI / 2; slv.position.z = 0.12; g.add(slv);
    for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.007, 8, 22), cuffM); t.position.z = -0.075 - i * 0.012; g.add(t); }
    // Handgelenk + Handrücken
    const wrist = new THREE.Mesh(capsule(0.029, 0.03, 12), skin); wrist.scale.set(1.25, 0.8, 1); wrist.position.z = -0.1; g.add(wrist);
    const hand = new THREE.Group(); hand.position.set(0, 0.002, -0.125); hand.rotation.set(-0.08, 0, side * -0.06); g.add(hand);
    const palm = new THREE.Mesh(new RoundedBoxGeometry(0.074, 0.026, 0.08, 4, 0.012), skin); palm.position.z = -0.035; hand.add(palm);
    // Finger: zwei Glieder je Finger, leicht gekrümmt
    const lens = [0.04, 0.046, 0.043, 0.034];
    for (let i = 0; i < 4; i++) {
      const fx = side * (-0.0255 + i * 0.017), L = lens[i];
      const f = new THREE.Group(); f.position.set(fx, 0.002, -0.074); f.rotation.set(-0.35 - i * 0.04, side * (i - 1.5) * 0.04, 0); hand.add(f);
      const p1 = new THREE.Mesh(capsule(0.0082, L * 0.5, 10), skin); p1.position.z = -L * 0.3; f.add(p1);
      const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.0088, 10, 8), skin); knuckle.position.set(0, 0.002, 0.002); f.add(knuckle);
      const j = new THREE.Group(); j.position.z = -L * 0.58; j.rotation.x = -0.7; f.add(j);
      const p2 = new THREE.Mesh(capsule(0.0075, L * 0.42, 10), skin); p2.position.z = -L * 0.26; j.add(p2);
      const n = new THREE.Mesh(new RoundedBoxGeometry(0.011, 0.003, 0.011, 2, 0.0014), nail); n.position.set(0, 0.0068, -L * 0.42); j.add(n);
    }
    // Daumen (zeigt zur Körpermitte)
    const th = new THREE.Group(); th.position.set(-side * 0.036, -0.004, -0.03); th.rotation.set(-0.2, -side * 0.75, side * 0.5); hand.add(th);
    const t1 = new THREE.Mesh(capsule(0.0105, 0.026, 10), skin); t1.position.z = -0.016; th.add(t1);
    const tj = new THREE.Group(); tj.position.z = -0.034; tj.rotation.y = side * 0.35; th.add(tj);
    const t2 = new THREE.Mesh(capsule(0.009, 0.018, 10), skin); t2.position.z = -0.012; tj.add(t2);
    const tn = new THREE.Mesh(new RoundedBoxGeometry(0.012, 0.003, 0.012, 2, 0.0014), nail); tn.position.set(0, 0.008, -0.02); tj.add(tn);
    return g;
  }
  setTablet(text) {
    const g = this.tabCanvas.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 160); grd.addColorStop(0, '#13213a'); grd.addColorStop(1, '#0a0f1a');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 160);
    g.strokeStyle = 'rgba(93,170,255,0.12)'; for (let x = 0; x < 256; x += 16) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x, 130); g.stroke(); }
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
    // Szene folgt der Kamera
    this.root.position.copy(this.camera.position); this.root.quaternion.copy(this.camera.quaternion);
    const want = placing ? 1 : 0; this.raise += (want - this.raise) * Math.min(1, dt * 8);
    const sway = Math.sin(this.t * 1.6) * 0.004, walkX = moving ? Math.sin(bob * 0.5) * 0.012 : 0, walkY = moving ? Math.abs(Math.cos(bob * 0.5)) * 0.012 : 0;
    const low = uiOpen ? 0.12 : 0;
    // Rechte Hand: ruhig unten rechts, beim Bauen zum Tablet
    this.right.position.set(0.205 + walkX, -0.212 + sway + walkY - low + this.raise * 0.02, -0.34);
    this.right.rotation.set(0.18 + this.raise * 0.2, -0.22 - this.raise * 0.2, 0.14);
    this.left.visible = this.tablet.visible = this.raise > 0.05;
    this.left.position.set(-0.2 + walkX, -0.255 + sway + walkY + this.raise * 0.03, -0.4);
    this.left.rotation.set(0.35, 0.25, -0.1);
    this.tablet.position.set(-0.02 + walkX, -0.2 + walkY - (1 - this.raise) * 0.2, -0.42);
    this.tablet.rotation.set(-0.55, 0.06, 0.02);
  }
}
