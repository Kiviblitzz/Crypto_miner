// Räume / Standorte – Böden, Wände (mit Ausblendung zur Kamera), Möbel, Licht
import * as THREE from 'three';
import { TEX, M, mat, textTexture } from './materials.js';
import { box, cyl, fan, instance, X } from './models.js';
import { furniture } from './furniture.js';

function wallMat(key, tex) { return mat('wall_' + key, { map: tex, roughness: 0.9 }); }

// Wand mit optionalen Öffnungen (Fenster/Türen) entlang einer Achse
function wall(group, len, h, thick, material, holes = []) {
  // holes: [{from, to, y0, y1}]
  const segs = [];
  let x = 0;
  const hs = [...holes].sort((a, b) => a.from - b.from);
  for (const ho of hs) {
    if (ho.from > x) segs.push([x, ho.from, 0, h]);
    if (ho.y0 > 0) segs.push([ho.from, ho.to, 0, ho.y0]);
    if (ho.y1 < h) segs.push([ho.from, ho.to, ho.y1, h]);
    x = ho.to;
  }
  if (x < len) segs.push([x, len, 0, h]);
  for (const [a, b, y0, y1] of segs) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b - a, y1 - y0, thick), material);
    m.position.set((a + b) / 2, (y0 + y1) / 2, 0); m.castShadow = true; m.receiveShadow = true; group.add(m);
  }
}

function windowFrame(group, from, to, y0, y1, thick, frameMat = M.white()) {
  const w = to - from, h = y1 - y0, cx = (from + to) / 2, cy = (y0 + y1) / 2;
  const f = 0.05;
  for (const [x, y, ww, hh] of [[cx, y0 + f / 2, w, f], [cx, y1 - f / 2, w, f], [from + f / 2, cy, f, h], [to - f / 2, cy, f, h], [cx, cy, f * 0.6, h]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, thick + 0.02), frameMat); m.position.set(x, y, 0); group.add(m);
  }
  const g = new THREE.Mesh(new THREE.PlaneGeometry(w - f, h - f), M.window()); g.position.set(cx, cy, 0); group.add(g);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.03, thick + 0.15), frameMat); sill.position.set(cx, y0 - 0.015, 0.06); group.add(sill);
}

function poster(group, tex, w, h, x, y, z = 0.01) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat('poster_' + tex.uuid, { map: tex, roughness: 0.7 }));
  m.position.set(x, y, z); group.add(m); return m;
}

// Raum-Grundgerüst: Boden + 4 Wände
function shell(def, { floorMat, wallMatA, wallMatB, thick = 0.15, holes = {}, baseboard = M.white() }) {
  const root = new THREE.Group();
  const { w, d, h } = def;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), floorMat); floor.position.set(w / 2, -0.05, d / 2); floor.receiveShadow = true; root.add(floor);
  const walls = [];
  const mk = (name, len, material, pos, rotY, outward, hl) => {
    const g = new THREE.Group(); g.position.copy(pos); g.rotation.y = rotY; root.add(g);
    wall(g, len, h, thick, material, hl || []);
    const bb = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.02), baseboard); bb.position.set(len / 2, 0.05, thick / 2 + 0.01); g.add(bb);
    walls.push({ name, group: g, outward });
    return g;
  };
  // back (z=0) – Innenseite zeigt +Z
  const back = mk('back', w, wallMatA, new THREE.Vector3(0, 0, -thick / 2), 0, new THREE.Vector3(0, 0, -1), holes.back);
  // front (z=d)
  const front = mk('front', w, wallMatB, new THREE.Vector3(w, 0, d + thick / 2), Math.PI, new THREE.Vector3(0, 0, 1), holes.front);
  // left (x=0) – Innenseite zeigt +X
  const left = mk('left', d, wallMatB, new THREE.Vector3(-thick / 2, 0, d), Math.PI / 2, new THREE.Vector3(-1, 0, 0), holes.left);
  // right (x=w)
  const right = mk('right', d, wallMatB, new THREE.Vector3(w + thick / 2, 0, 0), -Math.PI / 2, new THREE.Vector3(1, 0, 0), holes.right);
  // Decke (nur im Rundgang sichtbar)
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat('ceiling', { color: 0xf2efe8, roughness: 1, side: THREE.DoubleSide }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(w / 2, h, d / 2); ceil.castShadow = (def.tier ?? 0) <= 2; root.add(ceil); // Sonne nur durchs Fenster
  return { root, walls, back, front, left, right, ceil };
}

const blk = (x0, z0, x1, z1) => ({ x0, z0, x1, z1 });

export function buildRoom(def) {
  const B = { blocked: [], lights: [], screens: [], spins: [] };
  let S;
  const { w, d, h } = def;

  if (def.style === 'bedroom') {
    S = shell(def, {
      floorMat: mat('floorWood', { map: TEX.wood([3, 3]), roughness: 0.65 }),
      wallMatA: wallMat('bedA', TEX.plaster([2, 2], '#a3b2b5')), wallMatB: wallMat('bedB', TEX.plaster([2, 2], '#ece4d3')),
      holes: { back: [{ from: 1.0, to: 2.0, y0: 0.9, y1: 2.15 }], right: [{ from: 2.6, to: 3.45, y0: 0, y1: 2.05 }] },
    });
    windowFrame(S.back, 1.0, 2.0, 0.9, 2.15, 0.15);
    // Tür (rechts, nahe vorne)
    box(S.right, 0.86, 2.06, 0.04, mat('door', { color: 0xf4f1ea, roughness: 0.5 }), 3.03, 0, 0.02, 0, 0.004);
    for (const [y, h] of [[0.16, 0.78], [1.1, 0.78]]) box(S.right, 0.6, h, 0.012, mat('doorPanel', { color: 0xe6e1d6, roughness: 0.5 }), 3.03, y, 0.045, 0, 0.004);
    for (const x of [2.575, 3.475]) box(S.right, 0.06, 2.112, 0.07, M.white(), x, 0, 0.035, 0, 0.006);
    box(S.right, 0.96, 0.07, 0.07, M.white(), 3.025, 2.042, 0.035, 0, 0.006);
    cyl(S.right, 0.026, 0.026, 0.012, X.chrome(), 3.36, 1.0, 0.046, 20, 'z');
    box(S.right, 0.13, 0.02, 0.02, X.chrome(), 3.31, 0.99, 0.07, 0, 0.008);
    cyl(S.right, 0.008, 0.008, 0.03, X.chrome(), 3.36, 1.0, 0.06, 10, 'z');
    // Poster
    // Konzertposter (gedeckte Farben, illustriert)
    { const c = document.createElement('canvas'); c.width = 360; c.height = 512; const g2 = c.getContext('2d');
      const gr = g2.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#3b2a4a'); gr.addColorStop(1, '#1f1a2e'); g2.fillStyle = gr; g2.fillRect(0, 0, 360, 512);
      g2.fillStyle = '#e9a65a'; g2.beginPath(); g2.arc(180, 250, 110, 0, Math.PI * 2); g2.fill(); g2.fillStyle = '#3b2a4a'; for (let k = 0; k < 7; k++) g2.fillRect(70, 200 + k * 16, 220, 6);
      g2.fillStyle = '#2a2236'; g2.beginPath(); g2.moveTo(40, 360); g2.lineTo(110, 300); g2.lineTo(170, 345); g2.lineTo(240, 285); g2.lineTo(320, 360); g2.lineTo(320, 380); g2.lineTo(40, 380); g2.fill();
      g2.fillStyle = '#f3d9a0'; g2.font = '700 64px Fredoka, Arial'; g2.textAlign = 'center'; g2.fillText('SUBNET', 180, 100); g2.font = '500 22px Fredoka, Arial'; g2.fillStyle = '#e9a65a'; g2.fillText('LIVE · TOUR 2010', 180, 440); g2.fillStyle = 'rgba(243,217,160,.5)'; g2.font = '500 16px Arial'; g2.fillText('Lindental · Stadthalle', 180, 470);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; poster(S.left, t, 0.5, 0.71, 1.5, 1.6, 0.085); }
    poster(S.right, textTexture([{ text: 'TO THE', font: 'bold 70px Arial' }, { text: 'MOON', font: 'bold 120px Arial', color: '#ffd23f' }, { text: '🚀', font: '120px Arial' }], { bg: '#0b1630', deco: (g, W, H) => { g.fillStyle = '#fff'; for (let i = 0; i < 80; i++) g.fillRect(Math.random() * W, Math.random() * H, 2, 2); } }), 0.6, 0.85, 1.0, 1.6, 0.085);
    // Pinnwand mit Zetteln und Polaroid (statt Platzhalter-Karte)
    { const c = document.createElement('canvas'); c.width = 600; c.height = 400; const g2 = c.getContext('2d');
      g2.fillStyle = '#b98a5a'; g2.fillRect(0, 0, 600, 400); for (let k = 0; k < 2600; k++) { g2.fillStyle = Math.random() < 0.5 ? 'rgba(90,55,25,.25)' : 'rgba(230,190,140,.22)'; g2.fillRect(Math.random() * 600, Math.random() * 400, 2, 2); }
      g2.strokeStyle = '#8a6440'; g2.lineWidth = 16; g2.strokeRect(8, 8, 584, 384);
      const note = (x, y, w, h, rot, col, txt, sz = 26) => { g2.save(); g2.translate(x, y); g2.rotate(rot); g2.fillStyle = 'rgba(0,0,0,.18)'; g2.fillRect(4, 5, w, h); g2.fillStyle = col; g2.fillRect(0, 0, w, h); g2.fillStyle = '#3a3226'; g2.font = `600 ${sz}px Fredoka, Arial`; txt.split('|').forEach((l, i) => g2.fillText(l, 12, 38 + i * (sz + 6))); g2.fillStyle = '#d94b4b'; g2.beginPath(); g2.arc(w / 2, 8, 7, 0, 7); g2.fill(); g2.restore(); };
      note(40, 40, 150, 120, -0.06, '#fff2a8', 'BTC|0,06 $ ?!', 30); note(220, 30, 140, 110, 0.05, '#bfe3c4', 'Mathe|Mo. 8:00'); note(400, 60, 150, 120, -0.03, '#f7c6c0', 'Deniz|anrufen!'); note(70, 220, 140, 110, 0.07, '#c9dcf5', 'Grafik-|karte?');
      g2.save(); g2.translate(270, 190); g2.rotate(-0.05); g2.fillStyle = 'rgba(0,0,0,.2)'; g2.fillRect(5, 6, 150, 170); g2.fillStyle = '#f7f4ee'; g2.fillRect(0, 0, 150, 170); const sky = g2.createLinearGradient(0, 12, 0, 120); sky.addColorStop(0, '#7fb2e5'); sky.addColorStop(1, '#f6d8a8'); g2.fillStyle = sky; g2.fillRect(12, 12, 126, 110); g2.fillStyle = '#3d6f8f'; g2.fillRect(12, 92, 126, 30); g2.fillStyle = '#2a2a2a'; for (const px of [50, 72, 96]) { g2.beginPath(); g2.arc(px, 82, 7, 0, 7); g2.fill(); g2.fillRect(px - 5, 86, 10, 22); } g2.fillStyle = '#d94b4b'; g2.beginPath(); g2.arc(75, 6, 7, 0, 7); g2.fill(); g2.restore();
      note(450, 230, 120, 110, 0.04, '#fff2a8', 'GPU|sparen', 24);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; poster(S.back, t, 0.9, 0.6, 2.75, 1.85, 0.085); }
    // Möbel (modelliert, gebacken)
    const g = S.root;
    const put = (type, x, z, ry = 0) => { const f = instance('furn:' + type, () => furniture(type), { lod: false }); f.position.set(x, 0, z); f.rotation.y = ry; g.add(f); return f; };
    put('bed', 0.5, 2.5);
    B.blocked.push(blk(0, 1.5, 1.0, 3.5));
    put('wardrobe', 0.3, 0.5);
    B.blocked.push(blk(0, 0, 0.6, 1.0));
    put('desk', 2.75, 0.25).traverse((m) => { if (m.isMesh && m.material?.name === 'darkMetal') m.userData.focusHide = true; }); // Tischbeine stören die Nahansicht
    // Monitor mit Mining-Konsole
    const scrC = document.createElement('canvas'); scrC.width = 512; scrC.height = 288; const scr = new THREE.CanvasTexture(scrC); scr.colorSpace = THREE.SRGBColorSpace;
    B.screens.push({ canvas: scrC, tex: scr, kind: 'pc' });
    put('monitor', 2.6, 0.14).position.y = 0.74;
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.49, 0.285), new THREE.MeshStandardMaterial({ map: scr, emissive: 0xffffff, emissiveMap: scr, emissiveIntensity: 0.9, roughness: 0.95 })); sm.position.set(2.6, 0.74 + 0.32, 0.152); g.add(sm);
    B.blocked.push(blk(2.0, 0, 3.5, 0.5));
    // Stuhl
    put('chair', 3.3, 0.95, 0.42 + 0.45);
    B.blocked.push(blk(3.05, 0.7, 3.55, 1.2));
    // Teppich
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.3), mat('rug', { map: TEX.carpet([1, 1], 18), roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(2.0, 0.005, 2.3); rug.receiveShadow = true; g.add(rug);
    // Regal rechts hinten an der Wand
    put('bookshelf', 3.75, 0.16);
    put('lampion', 2.0, 1.8).position.y = 2.44;
    put('desklamp', 2.12, 0.12).position.y = 0.74;
    put('fairy', 2.0, 0.09).position.y = 2.42;
    { const rad = put('radiator', 1.5, 0.1); rad.position.y = 0.12; rad.traverse((m) => { if (m.isMesh) m.userData.focusHide = true; }); } // stört die PC-Nahansicht
    B.blocked.push(blk(3.5, 0, 4.0, 0.5));
    B.lights.push({ pos: [2.0, 2.05, 1.8], color: 0xffdcb0, intensity: 0.4, dist: 8 });
    B.lights.push({ pos: [2.22, 0.98, 0.34], color: 0xffb46b, intensity: 0.7, dist: 1.8 }); // Schreibtischlampe
    B.lights.push({ pos: [1.85, 1.25, 0.55], color: 0xcfe0ff, intensity: 0.75, dist: 4 }); // kühles Fensterlicht auf Tisch und PC
    B.outside = 'town';
    B.doors = [{ c: [3.98, 1.0, 3.03], s: [0.14, 2.0, 0.85], label: 'Zimmertür' }];
    B.spawn = { x: 3.3, z: 3.0, look: [1.6, 0.9] };
    B.props = [{ c: [2.6, 1.08, 0.13], s: [0.55, 0.4, 0.12], label: 'PC-Monitor', hint: 'Börse', action: 'market' }, { c: [0.5, 0.45, 2.5], s: [1.0, 0.5, 2.0], label: 'Bett', hint: 'Schlafen', action: 'sleep' }];
  } else if (def.style === 'basement') {
    S = shell(def, {
      floorMat: mat('floorBase', { map: TEX.concrete([3, 2], 118), roughness: 0.9 }),
      wallMatA: wallMat('baseA', TEX.plaster([3, 1], '#bdb8ad')), wallMatB: wallMat('baseB', TEX.plaster([3, 1], '#c7c2b6')), baseboard: M.steel(),
      holes: { back: [{ from: 1.2, to: 2.2, y0: 1.75, y1: 2.2 }, { from: 3.6, to: 4.6, y0: 1.75, y1: 2.2 }] },
    });
    windowFrame(S.back, 1.2, 2.2, 1.75, 2.2, 0.15, M.steel()); windowFrame(S.back, 3.6, 4.6, 1.75, 2.2, 0.15, M.steel());
    const g = S.root;
    // Waschmaschine & Trockner
    for (const z of [0.6, 1.3]) { box(g, 0.6, 0.85, 0.6, M.white(), 0.3, 0, z); const dr = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), mat('wmDoor', { color: 0x8aa5b8, roughness: 0.1, metalness: 0.5 })); dr.rotation.y = Math.PI / 2; dr.position.set(0.61, 0.42, z); g.add(dr); }
    for (const z of [0.6, 1.3]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 10, 32), M.alu()); ring.rotation.y = Math.PI / 2; ring.position.set(0.61, 0.42, z); g.add(ring); cyl(g, 0.03, 0.03, 0.03, M.offwhite(), 0.6, 0.76, z + 0.18, 20, 'x'); box(g, 0.02, 0.06, 0.18, M.offwhite(), 0.6, 0.73, z - 0.12); box(g, 0.01, 0.02, 0.05, M.ledGreen(), 0.61, 0.77, z + 0.05); }
    B.blocked.push(blk(0, 0.3, 0.6, 1.6));
    // Heizkessel
    box(g, 0.7, 1.6, 0.6, mat('boiler', { color: 0xe6e1d6, roughness: 0.45, metalness: 0.1 }), 0.35, 0, 4.4);
    cyl(g, 0.05, 0.05, 0.9, M.copper(), 0.3, 1.95, 4.4, 10);
    B.blocked.push(blk(0, 4.0, 0.7, 5.0));
    // Treppe
    {
      const N = 10, rise = h / N, run = 0.22, z0 = N * run, x0 = 5.8, W = 1.2;
      const prof = new THREE.Shape(); prof.moveTo(-z0, 0);
      for (let i = 0; i < N; i++) { const zf = z0 - i * run; prof.lineTo(-zf, (i + 1) * rise); prof.lineTo(-(zf - run), (i + 1) * rise); }
      prof.lineTo(0, 0); prof.lineTo(-z0, 0);
      const body = new THREE.Mesh(new THREE.ExtrudeGeometry(prof, { depth: W, bevelEnabled: false }), mat('stairConcrete', { map: TEX.concrete([1, 1], 77), color: 0xb4ab9c, roughness: 0.95 }));
      body.rotation.y = Math.PI / 2; body.position.set(x0, 0, 0); body.castShadow = body.receiveShadow = true; g.add(body);
      const tread = mat('stairTread', { map: TEX.wood([1, 0.3]), color: 0xa27a52, roughness: 0.7 }), nose = mat('stairNose', { color: 0x6e5236, roughness: 0.6 });
      for (let i = 0; i < N; i++) {
        const zf = z0 - i * run, y = (i + 1) * rise;
        const t = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, 0.03, run + 0.02), tread); t.position.set(x0 + W / 2 + 0.02, y + 0.015, zf - run / 2 + 0.01); t.castShadow = t.receiveShadow = true; g.add(t);
        const n = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, 0.032, 0.025), nose); n.position.set(x0 + W / 2 + 0.02, y + 0.014, zf + 0.012); g.add(n);
      }
      // Geländer an der offenen Seite: Pfosten, Stäbe, Handlauf 85 cm über den Stufenkanten
      const rail = mat('stairRail', { color: 0x5a4130, roughness: 0.55 }), bal = mat('stairBal', { color: 0x2b2622, roughness: 0.5, metalness: 0.4 });
      const xr = x0 + 0.04, yAt = (z) => (z0 - z) / run * rise + 0.85;
      const post = (z, top) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, top, 0.06), rail); p.position.set(xr, top / 2, z); p.castShadow = true; g.add(p); };
      const zA = z0 - 0.05, zB = z0 - 6.2 * run; post(zA, yAt(zA) + 0.05); post(zB, Math.min(h - 0.02, yAt(zB) + 0.05));
      const pA = new THREE.Vector3(xr, yAt(zA), zA), pB = new THREE.Vector3(xr, yAt(zB), zB), len = pA.distanceTo(pB);
      const hr = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, len, 12), rail); hr.position.copy(pA).lerp(pB, 0.5); hr.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pB.clone().sub(pA).normalize()); hr.castShadow = true; g.add(hr);
      for (let i = 1; i < 6; i++) { const z = z0 - (i + 0.5) * run, y0 = (i + 1) * rise + 0.03, y1 = yAt(z) - 0.02; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, y1 - y0, 8), bal); b.position.set(xr, (y0 + y1) / 2, z); g.add(b); }
      // Treppenloch in der Decke
      const hole = new THREE.Mesh(new THREE.PlaneGeometry(W, 1.3), new THREE.MeshBasicMaterial({ color: 0x0d0a08 })); hole.rotation.x = Math.PI / 2; hole.position.set(x0 + W / 2, h - 0.004, 0.65); g.add(hole);
      B.blocked.push(blk(5.75, 0, 7.0, z0 + 0.05));
    }
    // Regal mit Kartons
    { // offenes Steckregal: vier Pfosten, vier Böden, Kartons darauf
      const post = mat('shelfPost', { color: 0x6f747a, roughness: 0.45, metalness: 0.6 }), board = mat('shelfBoard', { color: 0xa39a8a, roughness: 0.8 });
      for (const x of [2.515, 3.485]) for (const z of [0.03, 0.37]) box(g, 0.03, 1.62, 0.03, post, x, 0, z, 0, 0.004);
      for (const y of [0.05, 0.55, 1.05, 1.55]) box(g, 1.0, 0.025, 0.4, board, 3.0, y, 0.2, 0, 0.004);
      const carton = mat('carton', { color: 0xb08a5a, roughness: 0.9 });
      for (const [x, y, w2, h2, ry] of [[2.7, 0.075, 0.34, 0.3, 0.04], [3.12, 0.075, 0.4, 0.26, -0.03], [2.68, 0.575, 0.3, 0.25, -0.05], [3.05, 0.575, 0.3, 0.32, 0.06], [2.9, 1.075, 0.42, 0.24, 0.02]]) box(g, w2, h2, 0.3, carton, x, y, 0.2, ry, 0.01);
    }
    B.blocked.push(blk(2.5, 0, 3.5, 0.5));
    // Rohre an der Decke
    cyl(g, 0.05, 0.05, w, mat('pipe', { color: 0x9aa0a6, roughness: 0.4, metalness: 0.6 }), w / 2, h - 0.15, 0.3, 10, 'x');
    cyl(g, 0.035, 0.035, w, M.copper(), w / 2, h - 0.25, 0.45, 10, 'x');
    for (const x of [2, 5]) { const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), M.ledWhite()); bulb.position.set(x, h - 0.2, 2.5); g.add(bulb); B.lights.push({ pos: [x, h - 0.7, 2.5], color: 0xffe2b0, intensity: 3.2, dist: 7 }); }
    { // gerahmtes Urlaubsfoto
      const c = document.createElement('canvas'); c.width = 320; c.height = 256; const x = c.getContext('2d');
      const sky = x.createLinearGradient(0, 0, 0, 130); sky.addColorStop(0, '#7fb6d8'); sky.addColorStop(1, '#d9ecf2'); x.fillStyle = sky; x.fillRect(0, 0, 320, 130);
      x.fillStyle = '#f2c14e'; x.beginPath(); x.arc(240, 52, 22, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#3d7fa6'; x.fillRect(0, 118, 320, 44); x.fillStyle = '#e8d3a4'; x.fillRect(0, 158, 320, 54);
      x.fillStyle = '#2a2a2a'; for (const [px, hh] of [[110, 44], [134, 52], [156, 30]]) { x.beginPath(); x.arc(px, 182 - hh, 7, 0, Math.PI * 2); x.fill(); x.fillRect(px - 6, 186 - hh, 12, hh - 6); }
      x.fillStyle = '#f5efe0'; x.fillRect(0, 210, 320, 46); x.fillStyle = '#4a3a2c'; x.font = 'bold 22px Nunito, sans-serif'; x.textAlign = 'center'; x.fillText('Urlaub 1998', 160, 242);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      poster(S.left, t, 0.4, 0.32, 2.5, 1.5, 0.09);
      const fr = mat('photoFrame', { color: 0x4a3222, roughness: 0.6 });
      for (const [w2, h2, px, py] of [[0.46, 0.03, 2.5, 1.66], [0.46, 0.03, 2.5, 1.34], [0.03, 0.35, 2.27, 1.5], [0.03, 0.35, 2.73, 1.5]]) box(S.left, w2, h2, 0.025, fr, px, py - h2 / 2, 0.085, 0, 0.004);
    }
    // Dartscheibe, altes Fahrrad, Weihnachtskisten
    const dart = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), mat('dart', { map: textTexture([{ text: '◎', font: 'bold 220px Arial', color: '#c22' }], { w: 256, h: 256, bg: '#1a1a1a' }), roughness: 0.8 })); dart.position.set(5.3, 1.6, 0.085); S.back.add(dart);
    const bike = new THREE.Group(); bike.position.set(6.6, 0, 3.6); bike.rotation.y = Math.PI / 2; g.add(bike);
    for (const x of [-0.5, 0.5]) { const wh = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 8, 24), M.rubber()); wh.position.set(x, 0.35, 0); bike.add(wh); }
    const fr = mat('bikeFrame', { color: 0x2266aa, roughness: 0.4, metalness: 0.6 });
    for (const [x, y, rz, l] of [[-0.12, 0.55, 0.9, 0.75], [0.25, 0.55, -0.6, 0.6], [0.05, 0.75, 0, 0.7]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, l, 6), fr); b.position.set(x, y, 0); b.rotation.z = rz + Math.PI / 2 * (rz === 0 ? 1 : 0); bike.add(b); }
    B.blocked.push(blk(6.2, 2.8, 7.0, 4.4));
    // Aufbewahrungsboxen mit Deckel und beschriftetem Etikett
    const labels = ['Weihnachten', 'Fotos', 'Kabel'];
    for (let i = 0; i < 3; i++) {
      const x = 4.6 + (i % 2) * 0.1, y = i * 0.36;
      box(g, 0.55, 0.32, 0.4, mat('storeBox' + i, { color: [0x8c4a3e, 0x55705a, 0xa08850][i], roughness: 0.6 }), x, y, 4.75, 0, 0.02);
      box(g, 0.58, 0.04, 0.43, mat('storeLid' + i, { color: [0x6e382f, 0x405745, 0x806b3e][i], roughness: 0.55 }), x, y + 0.32, 4.75, 0, 0.012);
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.08), new THREE.MeshStandardMaterial({ map: textTexture([{ text: labels[i], font: 'bold 44px "Comic Sans MS", cursive', color: '#2a2a2a' }], { w: 256, h: 96, bg: '#efe6cf' }), roughness: 0.9 }));
      lab.position.set(x, y + 0.17, 4.75 - 0.202); lab.rotation.y = Math.PI; g.add(lab);
    }
    B.blocked.push(blk(4.3, 4.5, 5.0, 5.0));
    B.outside = 'garden';
    B.doors = [{ c: [6.4, 1.2, 1.1], s: [1.2, 2.4, 2.2], label: 'Kellertreppe' }];
    B.spawn = { x: 5.2, z: 2.7, look: [2.0, 2.6] };
    // Alte PC-Teile im verstaubten Keller (Start)
    B.looseSpots = { mobo: [2.0, 0.405, 3.6, 0.4, 'auf einem Karton'], cpu: [0.32, 0.852, 1.3, 0.3, 'auf der Waschmaschine'], gpu: [1.3, 0.305, 4.45, 0.9, 'auf der Holzkiste'], psu: [4.25, 0.0, 0.48, -0.2, 'neben dem Regal'] };
    { const fb = new THREE.Group(); fb.position.set(5.3, 1.3, 0.09); S.back.add(fb); box(fb, 0.5, 0.7, 0.12, mat('fusebox', { color: 0xd8d4c8, roughness: 0.6 }), 0, 0, 0); for (let i = 0; i < 6; i++) box(fb, 0.05, 0.1, 0.02, M.black(), -0.15 + i * 0.06, 0.45, 0.07); box(fb, 0.03, 0.03, 0.01, M.ledGreen(), 0.18, 0.6, 0.07); }
    B.props = [{ c: [5.3, 1.65, 0.15], s: [0.55, 0.75, 0.2], label: 'Sicherungskasten', hint: 'Firma', action: 'company' }];
  } else if (def.style === 'workshop') {
    S = shell(def, {
      floorMat: mat('floorWork', { map: TEX.concrete([4, 3], 132), roughness: 0.85 }),
      wallMatA: wallMat('workA', TEX.brick([4, 2])), wallMatB: wallMat('workB', TEX.brick([4, 2])), baseboard: M.steel(),
      holes: { right: [{ from: 2.5, to: 6.0, y0: 0, y1: 3.0 }], back: [{ from: 8.0, to: 9.0, y0: 0, y1: 2.1 }] },
    });
    // Rolltor
    const rt = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.0), mat('rolltor', { map: TEX.corrugated([1, 6], '#8e9aa6'), roughness: 0.5, metalness: 0.6, side: THREE.DoubleSide }));
    rt.rotation.z = Math.PI / 2; rt.position.set(4.25, 1.5, 0.0); rt.rotation.set(0, 0, 0); S.right.add(rt);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.1, 0.05), mat('shopDoor', { color: 0x5a6b48, roughness: 0.6 })); door.position.set(8.5, 1.05, 0.0); S.back.add(door);
    const sign = textTexture([{ text: 'ELEKTRO BRANDT', font: 'bold 64px Arial', color: '#fff' }, { text: 'Reparatur · Service · seit 1985', font: '30px Arial', color: '#ffd' }], { w: 1024, h: 256, bg: '#1b4d8f' });
    poster(S.back, sign, 3.0, 0.75, 4.5, 2.8, 0.085);
    const g = S.root;
    const wb = mat('workbench', { color: 0x7a5a3a, roughness: 0.8 });
    box(g, 2.6, 0.06, 0.8, wb, 1.6, 0.85, 0.4); for (const x of [0.4, 2.8]) box(g, 0.06, 0.85, 0.7, M.steel(), x, 0, 0.4);
    const peg = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.0), mat('pegboard', { map: TEX.perforated([8, 4]), color: 0xd0b48a, roughness: 0.8 })); peg.position.set(1.6, 1.6, 0.09); S.back.add(peg);
    for (let i = 0; i < 6; i++) box(g, 0.04, 0.25, 0.02, M.steel(), 0.6 + i * 0.35, 1.3, 0.1);
    box(g, 0.45, 0.35, 0.35, M.black(), 0.9, 0.91, 0.35); box(g, 0.4, 0.28, 0.01, M.screen(), 0.9, 0.95, 0.53);
    B.blocked.push(blk(0, 0, 3.0, 1.0));
    // Kartons "Elektro Brandt"
    for (let i = 0; i < 6; i++) box(g, 0.5, 0.4, 0.5, mat('carton', { color: 0xb08a5a, roughness: 0.9 }), 0.35 + (i % 2) * 0.55, Math.floor(i / 2) * 0.4, 7.3);
    B.blocked.push(blk(0, 7.0, 1.0, 8.0));
    for (let x = 2; x < w; x += 3) { box(g, 1.5, 0.05, 0.12, M.tube(), x, h - 0.3, d / 2); B.lights.push({ pos: [x, h - 0.5, d / 2], color: 0xf4f8ff, intensity: 4.5, dist: 9 }); }
    const floorLine = new THREE.Mesh(new THREE.PlaneGeometry(w - 1, 0.08), mat('lineYellow', { color: 0xe6c200, roughness: 0.6 })); floorLine.rotation.x = -Math.PI / 2; floorLine.position.set(w / 2, 0.004, 1.3); g.add(floorLine);
    B.outside = 'yard';
    B.doors = [{ c: [8.5, 1.05, 0.06], s: [1.0, 2.1, 0.16], label: 'Tür zum Laden' }, { c: [9.95, 1.5, 4.25], s: [0.16, 3.0, 3.5], label: 'Rolltor' }];
    B.spawn = { x: 8.5, z: 1.4, look: [4.5, 5.0] };
    B.props = [{ c: [1.6, 1.0, 0.4], s: [2.6, 0.3, 0.8], label: 'Werkbank', hint: 'Technik', action: 'techs' }, { c: [0.9, 1.1, 0.35], s: [0.45, 0.35, 0.35], label: 'Alter Fernseher', hint: 'Börse', action: 'market' }];
  } else if (def.style === 'warehouse') {
    S = shell(def, {
      floorMat: mat('floorEpoxy', { map: TEX.epoxy([8, 6]), roughness: 0.35, metalness: 0.1 }),
      wallMatA: wallMat('whA', TEX.corrugated([10, 3], '#a9b1b9')), wallMatB: wallMat('whB', TEX.corrugated([8, 3], '#b3bac1')), baseboard: mat('kick', { color: 0x3d4148 }), thick: 0.25,
      holes: { back: [{ from: 6, to: 10, y0: 0, y1: 4.5 }, { from: 14, to: 18, y0: 0, y1: 4.5 }] },
    });
    for (const x of [8, 16]) { const rt = new THREE.Mesh(new THREE.PlaneGeometry(4, 4.5), mat('rolltorW', { map: TEX.corrugated([1, 8], '#6e7b88'), roughness: 0.5, metalness: 0.6, side: THREE.DoubleSide })); rt.position.set(x, 2.25, 0); S.back.add(rt); }
    const g = S.root;
    const col = mat('steelBeam', { color: 0x2f5f9a, roughness: 0.5, metalness: 0.6 });
    for (const x of [6, 12, 18]) for (const z of [5.5, 10.5]) { box(g, 0.35, h, 0.35, col, x, 0, z); B.blocked.push(blk(x - 0.5, z - 0.5, x + 0.5, z + 0.5)); }
    box(g, w, 0.4, 0.25, col, w / 2, h - 0.5, 0.3);
    // Büro-Container
    box(g, 5, 2.6, 3, mat('officeCont', { color: 0xe7e9ec, roughness: 0.6 }), 2.5, 0, d - 1.5);
    box(g, 1.2, 0.8, 0.02, M.window(), 1.5, 1.2, d - 3.01); box(g, 1.2, 0.8, 0.02, M.window(), 3.5, 1.2, d - 3.01);
    const logo = textTexture([{ text: 'HASHWERK', font: 'bold 110px Arial', color: '#ffb000' }, { text: 'MINING GmbH', font: 'bold 44px Arial', color: '#fff' }], { w: 1024, h: 320, bg: '#16181d' });
    poster(S.left, logo, 6, 1.9, 8, 4.5, 0.14);
    B.blocked.push(blk(0, d - 3, 5, d));
    // Paletten
    for (let i = 0; i < 3; i++) { box(g, 1.2, 0.15, 1.0, mat('pallet', { color: 0xb59263, roughness: 0.9 }), w - 1.2, 0, d - 1 - i * 1.3); box(g, 1.1, 0.9, 0.9, mat('carton', { color: 0xb08a5a, roughness: 0.9 }), w - 1.2, 0.15, d - 1 - i * 1.3); }
    B.blocked.push(blk(w - 2, d - 4.5, w, d));
    // Bodenmarkierung
    const ln = mat('lineYellow', { color: 0xe6c200, roughness: 0.6 });
    for (const z of [3.0, 8.0, 13.0]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(w - 2, 0.12), ln); l.rotation.x = -Math.PI / 2; l.position.set(w / 2, 0.004, z); g.add(l); }
    for (let x = 4; x < w; x += 8) for (let z = 4; z < d; z += 8) { const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.25, 16), M.darkMetal()); lamp.position.set(x, h - 0.6, z); g.add(lamp); const lg = new THREE.Mesh(new THREE.CircleGeometry(0.38, 16), M.tube()); lg.rotation.x = Math.PI / 2; lg.position.set(x, h - 0.74, z); g.add(lg); B.lights.push({ pos: [x, h - 1, z], color: 0xf6f8ff, intensity: 18, dist: 16 }); }
    B.outside = 'industrial';
    B.doors = [{ c: [8, 2.25, 0.1], s: [4, 4.5, 0.2], label: 'Rolltor' }, { c: [16, 2.25, 0.1], s: [4, 4.5, 0.2], label: 'Rolltor' }];
    B.spawn = { x: 8, z: 1.6, look: [12, 10] };
    B.props = [{ c: [2.5, 1.3, d - 1.5], s: [5, 2.6, 3], label: 'Büro-Container', hint: 'Firma', action: 'company' }];
  } else if (def.style === 'datacenter') {
    S = shell(def, {
      floorMat: mat('floorRaised', { map: TEX.tiles([w / 0.6, d / 0.6]), roughness: 0.5, metalness: 0.05 }),
      wallMatA: wallMat('dcA', TEX.plaster([6, 2], '#e9edf1')), wallMatB: wallMat('dcB', TEX.plaster([6, 2], '#dfe4ea')), baseboard: mat('dcKick', { color: 0x30353d }), thick: 0.3,
    });
    const g = S.root;
    // NOC-Glasraum
    box(g, 8, 3, 0.05, M.window(), 4, 0, 4.5); box(g, 0.05, 3, 4.5, M.window(), 8, 0, 2.25);
    for (let i = 0; i < 3; i++) { box(g, 1.6, 0.04, 0.7, mat('nocDesk', { color: 0xf2f2f2, roughness: 0.4 }), 1.5 + i * 2.2, 0.74, 2.2); box(g, 1.2, 0.5, 0.04, M.screen(), 1.5 + i * 2.2, 0.8, 1.95); }
    B.blocked.push(blk(0, 0, 8.5, 5.0));
    // Großer Status-Bildschirm
    const scr = document.createElement('canvas'); scr.width = 1024; scr.height = 512; const sTex = new THREE.CanvasTexture(scr); sTex.colorSpace = THREE.SRGBColorSpace;
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), new THREE.MeshStandardMaterial({ map: sTex, emissive: 0xffffff, emissiveMap: sTex, emissiveIntensity: 1, roughness: 0.3 })); sm.position.set(18, 3.0, 0.2); S.back.add(sm);
    B.screens.push({ canvas: scr, tex: sTex, kind: 'dc' });
    // Kabeltrassen
    for (let z = 7; z < d; z += 8) { box(g, w - 12, 0.06, 0.3, M.steel(), w / 2 + 5, h - 0.4, z); for (let x = 10; x < w - 1; x += 0.9) box(g, 0.04, 0.04, 0.26, M.cableYellow(), x, h - 0.34, z); }
    for (let x = 4; x < w; x += 6) for (let z = 3; z < d; z += 6) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), M.tube()); p.rotation.x = Math.PI / 2; p.position.set(x, h - 0.02, z); g.add(p); }
    for (let x = 6; x < w; x += 12) for (let z = 8; z < d; z += 10) B.lights.push({ pos: [x, h - 0.6, z], color: 0xf0f6ff, intensity: 11, dist: 14 });
    // gelochte Bodenplatten-Reihen (Kaltgänge)
    const pm = mat('perfTile', { map: TEX.perfTile([1, 1]), roughness: 0.5 });
    for (let z = 7; z < d - 1; z += 4) { const l = new THREE.Mesh(new THREE.PlaneGeometry(w - 10, 0.6), pm); l.rotation.x = -Math.PI / 2; l.position.set(w / 2 + 4, 0.003, z); g.add(l); }
    B.outside = 'city';
    { const dr = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.2, 0.06), mat('dcDoor', { color: 0x8a939e, roughness: 0.4, metalness: 0.5 })); dr.position.set(d - 20, 1.1, 0.16); S.left.add(dr); const pl = textTexture([{ text: 'AUSGANG', font: 'bold 60px Arial', color: '#fff' }], { w: 256, h: 96, bg: '#1a8f3a' }); poster(S.left, pl, 0.6, 0.22, d - 20, 2.45, 0.17); }
    B.doors = [{ c: [0.08, 1.1, 20], s: [0.16, 2.2, 1.0], label: 'Ausgang' }];
    B.spawn = { x: 1.3, z: 20, look: [18, 13] };
    B.props = [{ c: [18, 3.0, 0.3], s: [7, 3.5, 0.3], label: 'NOC-Großbildschirm', hint: 'Rangliste', action: 'ranking' }, { c: [3.7, 0.9, 2.1], s: [6.2, 0.6, 0.9], label: 'NOC-Arbeitsplätze', hint: 'Börse', action: 'market' }];
  } else if (def.style === 'fjord') {
    S = shell(def, {
      floorMat: mat('floorFjord', { map: TEX.concrete([16, 10], 140), roughness: 0.8 }),
      wallMatA: mat('fjordGlass', { color: 0xa8d0f0, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.18, depthWrite: false }),
      wallMatB: wallMat('fjB', TEX.corrugated([16, 4], '#56606b')), baseboard: mat('kick', { color: 0x3d4148 }), thick: 0.3,
    });
    const g = S.root;
    const frame = mat('fjFrame', { color: 0x2b2f36, roughness: 0.5, metalness: 0.7 });
    for (let x = 0; x <= w; x += 8) { box(g, 0.4, h, 0.4, frame, x, 0, 0); box(g, 0.4, h, 0.4, frame, x, 0, d); B.blocked.push(blk(x - 0.5, 0, x + 0.5, 0.5)); B.blocked.push(blk(x - 0.5, d - 0.5, x + 0.5, d)); }
    for (let x = 0; x <= w; x += 8) box(g, 0.3, 0.6, d, frame, x, h - 0.6, d / 2);
    box(g, w, 0.4, 0.3, frame, w / 2, h - 0.4, 0); box(g, w, 0.3, 0.3, frame, w / 2, 3.0, 0);
    const logo = textTexture([{ text: 'HASHWERK NORD', font: 'bold 110px Arial', color: '#7fe3ff' }, { text: '100 % Wasserkraft', font: 'bold 50px Arial', color: '#fff' }], { w: 1024, h: 320, bg: '#101418' });
    poster(S.left, logo, 12, 3.8, 20, 8, 0.16);
    for (let x = 8; x < w; x += 16) for (let z = 8; z < d; z += 12) B.lights.push({ pos: [x, h - 1, z], color: 0xeaf4ff, intensity: 60, dist: 30 });
    B.outside = 'fjord';
    { const dr = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.08), mat('fjDoor', { color: 0x3b4450, roughness: 0.4, metalness: 0.6 })); dr.position.set(d - 20, 1.2, 0.18); S.left.add(dr); const pl = textTexture([{ text: 'UTGANG · AUSGANG', font: 'bold 40px Arial', color: '#fff' }], { w: 512, h: 96, bg: '#1a8f3a' }); poster(S.left, pl, 1.2, 0.22, d - 20, 2.7, 0.19); }
    B.doors = [{ c: [0.1, 1.2, 20], s: [0.2, 2.4, 1.2], label: 'Ausgang' }];
    B.spawn = { x: 1.6, z: 20, look: [32, 20] };
    B.props = [{ c: [0.2, 8, 20], s: [0.3, 3.8, 12], label: 'HASHWERK NORD', hint: 'Rangliste', action: 'ranking' }];
  }
  // Decken-Material passend zum Raum
  const ceilMat = { bedroom: mat('ceilBed', { color: 0xf3f0ea, roughness: 1, side: THREE.DoubleSide }), basement: mat('ceilBase', { map: TEX.concrete([3, 2], 150), roughness: 1, side: THREE.DoubleSide }), workshop: mat('ceilWork', { map: TEX.concrete([4, 3], 120), roughness: 1, side: THREE.DoubleSide }), warehouse: mat('ceilWh', { map: TEX.corrugated([10, 6], '#6f7780'), roughness: 0.8, side: THREE.DoubleSide }), datacenter: mat('ceilDc', { map: TEX.tiles([w / 1.2, d / 1.2]), roughness: 0.9, side: THREE.DoubleSide }), fjord: mat('ceilFj', { color: 0x1e252d, roughness: 0.6, metalness: 0.4, transparent: true, opacity: 0.55, side: THREE.DoubleSide }) }[def.style];
  if (ceilMat) S.ceil.material = ceilMat;
  S.root.userData.walls = S.walls;
  return { ...B, root: S.root, walls: S.walls, ceil: S.ceil };
}

// Umgebung außerhalb des Raums
const facadeCache = new Map();
export const nightMats = [];
export const nightGround = [];
export function buildOutside(kind, def) {
  const g = new THREE.Group();
  const { w, d } = def;
  const grass = mat('grass', { color: 0x5d8a44, roughness: 1 }); grass.userData.day ??= grass.color.clone(); grass.userData.night ??= new THREE.Color(0x1d2a1f); if (!nightGround.includes(grass)) nightGround.push(grass);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, kind === 'fjord' ? 300 : 600), kind === 'city' || kind === 'industrial' ? mat('asphalt', { map: TEX.concrete([60, 60], 70), roughness: 1 }) : grass);
  ground.rotation.x = -Math.PI / 2; ground.position.set(w / 2, -0.12, kind === 'fjord' ? 130 : d / 2); ground.receiveShadow = true; g.add(ground);
  if (kind === 'fjord') { const quay = new THREE.Mesh(new THREE.BoxGeometry(600, 2, 6), mat('quay', { color: 0x6f747a, roughness: 0.9 })); quay.position.set(w / 2, -1.1, -23); g.add(quay); }
  // Fester Seed: jedes Mal dieselbe Kulisse
  let seed = 0x9e3779b9 ^ (kind.length * 977 + (def.style || '').length * 131);
  const rand = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rnd = (a, b) => a + rand() * (b - a);
  // Blickachse aus dem Fenster (Schlafzimmer: Rückwand, Richtung −z) freihalten
  const view = def.style === 'bedroom' ? -Math.PI / 2 : null, inView = (a, deg) => view != null && Math.abs(Math.atan2(Math.sin(a - view), Math.cos(a - view))) < THREE.MathUtils.degToRad(deg);
  if (kind === 'town' || kind === 'garden' || kind === 'yard') {
    // Nachbarhäuser & Bäume
    const roofM = mat('roof', { color: 0x8f3b2a, roughness: 0.8 }); roofM.userData.day ??= roofM.color.clone(); roofM.userData.night ??= new THREE.Color(0x2e1a1c); if (!nightGround.includes(roofM)) nightGround.push(roofM);
    // Fassaden mit Fensterraster; nachts gehen zufällig Fenster an (emissiveMap)
    const facade = (col) => { const key = 'facade' + col; if (facadeCache.has(key)) return facadeCache.get(key);
      const c = document.createElement('canvas'); c.width = 256; c.height = 256; const gg = c.getContext('2d'); gg.fillStyle = col; gg.fillRect(0, 0, 256, 256);
      const e = document.createElement('canvas'); e.width = 256; e.height = 256; const ge = e.getContext('2d'); ge.fillStyle = '#000'; ge.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) { const px = 22 + x * 58, py = 30 + y * 74; gg.fillStyle = '#5b6b78'; gg.fillRect(px, py, 34, 44); gg.fillStyle = '#f4efe6'; gg.fillRect(px - 3, py + 44, 40, 5); gg.fillRect(px + 15, py, 4, 44); if (rand() < 0.45) { ge.fillStyle = rand() < 0.5 ? '#ffcf7a' : '#ffb35c'; ge.fillRect(px, py, 34, 44); } }
      const t = new THREE.CanvasTexture(c), te = new THREE.CanvasTexture(e); t.colorSpace = te.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: te, emissiveIntensity: 0, roughness: 0.9 }); facadeCache.set(key, m); nightMats.push(m); return m; };
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rnd(-0.1, 0.1), front = inView(a, 80); let r = rnd(16, 30); if (front) r = rnd(40, 48);
      const x = w / 2 + Math.cos(a) * r, z = d / 2 + Math.sin(a) * r;
      const hw = rnd(6, 9), hd = rnd(6, 8); let hh = rnd(5, 8); if (front) hh = rnd(4.6, 5.6);
      const house = new THREE.Mesh(new THREE.BoxGeometry(hw, hh, hd), facade(['#ece2cc', '#dccaa8', '#cfd8dc', '#e8d2c0'][i % 4])); house.position.set(x, hh / 2, z); house.lookAt(w / 2, hh / 2, d / 2); house.castShadow = true; g.add(house);
      // Satteldach (Dreiecksprisma)
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(hw * 0.62, hw * 0.62, hd + 0.6, 3, 1), roofM);
      roof.position.set(x, hh + hw * 0.18, z); roof.scale.set(1, 1, 0.55); roof.quaternion.copy(house.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))); roof.castShadow = true; g.add(roof);
      const chim = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 0.6), mat('chimney', { color: 0x8a5a48, roughness: 0.9 })); chim.position.set(x + rnd(-1.5, 1.5), hh + 1.6, z + rnd(-1, 1)); g.add(chim);
    }
    if (def.style === 'bedroom') {
      // Ferne Häuserzeile vor dem Fenster: niedrige Silhouetten mit warmen Fenstern
      for (let k = 0; k < 7; k++) {
        const a = view + THREE.MathUtils.degToRad(-58 + k * 15 + rnd(-3, 3)), r = rnd(34, 44), hw = rnd(5, 8), hd = rnd(5, 7), hh = rnd(4.2, 5.4);
        const x = w / 2 + Math.cos(a) * r, z = d / 2 + Math.sin(a) * r;
        const house = new THREE.Mesh(new THREE.BoxGeometry(hw, hh, hd), facade(['#e8d2c0', '#dccaa8', '#ece2cc'][k % 3])); house.position.set(x, hh / 2, z); house.lookAt(w / 2, hh / 2, d / 2); g.add(house);
        const roof = new THREE.Mesh(new THREE.CylinderGeometry(hw * 0.62, hw * 0.62, hd + 0.6, 3, 1), roofM); roof.position.set(x, hh + hw * 0.18, z); roof.scale.set(1, 1, 0.55); roof.quaternion.copy(house.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))); g.add(roof);
      }
      // Dachgeschoss: das eigene Haus steht darunter, man blickt über die Dächer
      g.position.y = -4.6;
      const own = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 4.4, d + 0.4), facade('#e8dcc4')); own.position.set(w / 2, 2.2, d / 2); g.add(own); // endet unter dem Zimmerboden (kein Z-Fighting)
    }
    for (let i = 0; i < 24; i++) { const a = rand() * Math.PI * 2, r = inView(a, 80) ? rnd(16, 38) : rnd(10, 40); const t = new THREE.Group(); t.position.set(w / 2 + Math.cos(a) * r, 0, d / 2 + Math.sin(a) * r); cyl(t, 0.15, 0.2, 2, mat('trunk', { color: 0x5b3b24 }), 0, 1, 0, 8); const c = new THREE.Mesh(new THREE.SphereGeometry(rnd(1.2, 2), 10, 8), mat('treeTop', { color: 0x3f7a36, roughness: 0.9 })); c.position.y = 2.8; c.castShadow = true; t.add(c); g.add(t); }
  } else if (kind === 'industrial' || kind === 'city') {
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = rnd(45, 80); const bw = rnd(10, 25), bh = kind === 'city' ? rnd(15, 60) : rnd(6, 14), bd = rnd(10, 25); const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat('bld' + (i % 3), { color: [0x9aa3ad, 0x7f8a96, 0xb5bcc4][i % 3], roughness: 0.8 })); b.position.set(w / 2 + Math.cos(a) * r, bh / 2, d / 2 + Math.sin(a) * r); g.add(b); }
  } else if (kind === 'fjord') {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1200, 500), mat('fjordWater', { color: 0x1f4f6e, roughness: 0.08, metalness: 0.6 }));
    water.rotation.x = -Math.PI / 2; water.position.set(w / 2, -1.6, -270); g.add(water);
    const rock = mat('rock', { color: 0x4a5058, roughness: 1, flatShading: true });
    const snow = mat('snow', { color: 0xf4f7fb, roughness: 0.8, flatShading: true });
    for (let i = 0; i < 18; i++) {
      const side = i % 2 ? 1 : -1; const x = w / 2 + side * rnd(60, 320), z = -rnd(80, 480), hh = rnd(90, 220), r = rnd(70, 140);
      const m = new THREE.Mesh(new THREE.ConeGeometry(r, hh, 7), rock); m.position.set(x, hh / 2 - 2, z); g.add(m);
      const s = new THREE.Mesh(new THREE.ConeGeometry(r * 0.32, hh * 0.32, 7), snow); s.position.set(x, hh * 0.84 - 2, z); g.add(s);
    }
    // Wasserkraftwerk-Rohre
    for (let i = 0; i < 2; i++) cyl(g, 1.2, 1.2, 160, mat('penstock', { color: 0x6b737d, metalness: 0.7, roughness: 0.4 }), w + 30 + i * 4, 40, -40, 12).rotation.set(0.9, 0, 0);
  }
  return g;
}


// ---------- Verstaubter Keller (bevor er zum Hobbykeller wird) ----------
function webTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.strokeStyle = 'rgba(235,230,220,.55)'; g.lineWidth = 1.4;
  for (let a = 0; a <= 8; a++) { const t = (a / 8) * Math.PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(t) * 250, Math.sin(t) * 250); g.stroke(); }
  for (let r = 22; r < 250; r += 22 + r * 0.08) { g.beginPath(); for (let a = 0; a <= 8; a++) { const t = (a / 8) * Math.PI / 2, rr = r * (0.92 + 0.08 * Math.sin(a * 2.3)); const x = Math.cos(t) * rr, y = Math.sin(t) * rr; if (a) g.quadraticCurveTo(Math.cos(t - 0.1) * rr * 0.93, Math.sin(t - 0.1) * rr * 0.93, x, y); else g.moveTo(x, y); } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Tuch über einem alten Sessel: Höhenfeld aus Sitz, Armlehnen und Lehne, weich geglättet,
// mit Falten an den Seiten und einem welligen Saum am Boden
function drapedSheet() {
  const R = 72, SX = 1.04, SZ = 0.98, Hf = new Float32Array((R + 1) * (R + 1));
  const chairH = (x, z) => {
    const ax = Math.abs(x); if (ax > 0.42 || z < -0.4 || z > 0.37) return 0;
    if (z < -0.2) return 0.98 - (ax > 0.3 ? (ax - 0.3) * 0.9 : 0) + (z + 0.2) * 0.4;
    if (ax > 0.29) return 0.64;
    return 0.47 - (z > 0.25 ? (z - 0.25) * 0.5 : 0);
  };
  for (let j = 0; j <= R; j++) for (let i = 0; i <= R; i++) Hf[j * (R + 1) + i] = chairH((i / R - 0.5) * SX, (j / R - 0.5) * SZ);
  const tmp = new Float32Array(Hf.length);
  for (let it = 0; it < 4; it++) {
    for (let j = 0; j <= R; j++) for (let i = 0; i <= R; i++) { let s = 0, n = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a > R || b > R) continue; s += Hf[b * (R + 1) + a]; n++; } tmp[j * (R + 1) + i] = s / n; }
    for (let k = 0; k < Hf.length; k++) Hf[k] = Math.max(tmp[k], it < 2 ? 0 : Hf[k] * 0.98);
  }
  const geo = new THREE.PlaneGeometry(SX, SZ, R, R); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let k = 0; k < pos.count; k++) {
    const i = k % (R + 1), j = Math.floor(k / (R + 1)), x = pos.getX(k), z = pos.getZ(k), hgt = Hf[j * (R + 1) + i];
    const ang = Math.atan2(z, x), slope = Math.min(1, Math.max(0, hgt) * 3) * (hgt < 0.4 ? 1 : 0.35);
    const fold = (Math.sin(ang * 13 + 1.3) * 0.6 + Math.sin(ang * 7 - 0.4) * 0.4) * 0.035 * slope;
    const r = Math.hypot(x, z), push = hgt < 0.03 ? 0.035 * Math.sin(ang * 5 + 1.7) + 0.02 * Math.sin(ang * 11) : 0;
    const k2 = 1 + (fold + push) / Math.max(0.2, r);
    pos.setXYZ(k, x * k2, Math.max(0.006, hgt + Math.sin(x * 23 + z * 17) * 0.006 + (hgt < 0.02 ? 0.004 * Math.sin(ang * 9) : 0)), z * k2);
  }
  geo.computeVertexNormals();
  return geo;
}
export function buildDustyClutter(def) {
  const g = new THREE.Group(), blocked = [], h = def.h;
  const carton = mat('cartonDusty', { color: 0xa88a62, roughness: 0.95 }), tape = mat('cartonTape', { color: 0xcdb98e, roughness: 0.7 });
  const wood = mat('crateWood', { color: 0x8a6a48, roughness: 0.9 }), sheet = mat('dustSheet', { color: 0xcfc7b8, roughness: 1, side: THREE.DoubleSide });
  const box3 = (w, hh, d, m, x, y, z, ry = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), m); b.position.set(x, y + hh / 2, z); b.rotation.y = ry; b.castShadow = b.receiveShadow = true; g.add(b); return b; };
  const kart = (x, z, w, hh, d, ry = 0, y = 0) => { box3(w, hh, d, carton, x, y, z, ry); box3(w * 1.002, 0.004, 0.06, tape, x, y + hh, z, ry); blocked.push(blk(x - w / 2 - 0.05, z - d / 2 - 0.05, x + w / 2 + 0.05, z + d / 2 + 0.05)); };
  // Kartons (auf einem liegt das Mainboard), ein Stapel am Regal
  kart(2.0, 3.6, 0.5, 0.4, 0.4, 0.15); kart(2.6, 3.8, 0.44, 0.32, 0.38, -0.3); kart(1.5, 3.9, 0.4, 0.55, 0.42, 0.1);
  kart(3.95, 0.32, 0.5, 0.36, 0.42, 0.05); box3(0.42, 0.3, 0.36, carton, 3.95, 0.36, 0.32, -0.12);
  // Holzkiste (darauf die Grafikkarte)
  box3(0.55, 0.3, 0.42, wood, 1.3, 0, 4.45, 0.08); for (const dy of [0.08, 0.2]) box3(0.56, 0.03, 0.43, mat('crateSlat', { color: 0x6f5238, roughness: 0.9 }), 1.3, dy, 4.45, 0.08);
  blocked.push(blk(0.95, 4.15, 1.65, 4.75));
  // Abgedeckter alter Sessel
  const chair = new THREE.Group(); chair.position.set(3.35, 0, 4.3); chair.rotation.y = 2.5; g.add(chair);
  chair.add(new THREE.Mesh(drapedSheet(), sheet));
  chair.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
  blocked.push(blk(2.85, 3.8, 3.85, 4.75));
  // Schmutzschleier unten an den Wänden und staubige Flecken am Boden
  const grime = (() => { const c = document.createElement('canvas'); c.width = 8; c.height = 128; const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(40,30,20,0)'); gr.addColorStop(1, 'rgba(40,30,20,.55)'); x.fillStyle = gr; x.fillRect(0, 0, 8, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }); })();
  for (const [x, z, w, ry] of [[def.w / 2, 0.012, def.w, 0], [0.012, def.d / 2, def.d, Math.PI / 2], [def.w - 0.012, def.d / 2, def.d, -Math.PI / 2], [def.w / 2, def.d - 0.012, def.w, Math.PI]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.9), grime); p.position.set(x, 0.45, z); p.rotation.y = ry; p.raycast = () => {}; g.add(p); }
  const dustFloor = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); for (let i = 0; i < 70; i++) { const px = Math.random() * 256, py = Math.random() * 256, r = 10 + Math.random() * 46; const gr = x.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, 'rgba(200,190,170,.22)'); gr.addColorStop(1, 'rgba(200,190,170,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }); })();
  { const f = new THREE.Mesh(new THREE.PlaneGeometry(def.w, def.d), dustFloor); f.rotation.x = -Math.PI / 2; f.position.set(def.w / 2, 0.003, def.d / 2); f.raycast = () => {}; g.add(f); }
  // Altes Zeug auf dem Regal: Farbdosen, Gläser, ein altes Radio
  const can = mat('paintCan', { color: 0x8a8f94, roughness: 0.5, metalness: 0.6 });
  for (const [x, y, z, r, hh, c] of [[2.65, 1.575, 0.2, 0.08, 0.18, can], [2.85, 1.575, 0.22, 0.07, 0.15, mat('paintCan2', { color: 0x9c3b2e, roughness: 0.6 })], [3.3, 1.575, 0.2, 0.05, 0.12, mat('jar', { color: 0xc9d6c8, roughness: 0.15, transparent: true, opacity: 0.6 })]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hh, 16), c); m.position.set(x, y + hh / 2, z); m.castShadow = true; g.add(m); }
  box3(0.3, 0.16, 0.14, mat('oldRadio', { color: 0x6b4a32, roughness: 0.7 }), 3.1, 1.575, 0.22);
  // Spinnweben in den Ecken
  const web = new THREE.MeshBasicMaterial({ map: webTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.85 });
  for (const [x, z, ry] of [[0.02, 0.02, 0], [def.w - 0.02, 0.02, -Math.PI / 2], [0.02, def.d - 0.02, Math.PI / 2], [3.4, 0.02, 0]]) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), web); pl.position.set(x + (ry === 0 ? 0.3 : ry < 0 ? -0.0 : 0), h - 0.3, z + (ry === 0 ? 0 : 0.3)); pl.rotation.y = ry; pl.raycast = () => {}; g.add(pl);
  }
  // Schwebender Staub
  const n = 260, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([0.3 + Math.random() * (def.w - 0.6), 0.2 + Math.random() * (h - 0.4), 0.3 + Math.random() * (def.d - 0.6)], i * 3);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dc = document.createElement('canvas'); dc.width = dc.height = 32; const dg2 = dc.getContext('2d'); const rg = dg2.createRadialGradient(16, 16, 0, 16, 16, 16); rg.addColorStop(0, 'rgba(255,240,215,1)'); rg.addColorStop(1, 'rgba(255,240,215,0)'); dg2.fillStyle = rg; dg2.fillRect(0, 0, 32, 32);
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dc), color: 0xffe4c0, size: 0.014, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
  dust.raycast = () => {}; g.add(dust); g.userData.dust = dust;
  return { group: g, blocked };
}
