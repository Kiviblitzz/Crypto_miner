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
    box(S.right, 0.86, 2.02, 0.04, mat('door', { color: 0xf4f1ea, roughness: 0.5 }), 3.03, 0, 0.02);
    for (const [y, h] of [[0.16, 0.78], [1.1, 0.78]]) box(S.right, 0.6, h, 0.012, mat('doorPanel', { color: 0xe6e1d6, roughness: 0.5 }), 3.03, y, 0.045, 0, 0.004);
    for (const x of [2.575, 3.475]) box(S.right, 0.06, 2.1, 0.07, M.white(), x, 0, 0.035);
    box(S.right, 0.96, 0.06, 0.07, M.white(), 3.025, 2.05, 0.035);
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
    put('desk', 2.75, 0.25);
    // Monitor mit Mining-Konsole
    const scrC = document.createElement('canvas'); scrC.width = 512; scrC.height = 288; const scr = new THREE.CanvasTexture(scrC); scr.colorSpace = THREE.SRGBColorSpace;
    B.screens.push({ canvas: scrC, tex: scr, kind: 'pc' });
    put('monitor', 2.6, 0.14).position.y = 0.74;
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.49, 0.285), new THREE.MeshStandardMaterial({ map: scr, emissive: 0xffffff, emissiveMap: scr, emissiveIntensity: 0.9, roughness: 0.25 })); sm.position.set(2.6, 0.74 + 0.32, 0.152); g.add(sm);
    B.blocked.push(blk(2.0, 0, 3.5, 0.5));
    // Stuhl
    put('chair', 3.05, 0.86, 0.42);
    B.blocked.push(blk(2.8, 0.61, 3.3, 1.11));
    // Teppich
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.3), mat('rug', { map: TEX.carpet([1, 1], 18), roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(2.0, 0.005, 2.3); rug.receiveShadow = true; g.add(rug);
    // Regal rechts hinten an der Wand
    put('bookshelf', 3.75, 0.16);
    put('lampion', 2.0, 1.8).position.y = 2.44;
    put('desklamp', 2.12, 0.12).position.y = 0.74;
    put('fairy', 2.0, 0.09).position.y = 2.42;
    put('radiator', 1.5, 0.1).position.y = 0.12;
    B.blocked.push(blk(3.5, 0, 4.0, 0.5));
    B.lights.push({ pos: [2.0, 2.05, 1.8], color: 0xffdcb0, intensity: 1.25, dist: 8 });
    B.lights.push({ pos: [2.32, 1.02, 0.2], color: 0xffb46b, intensity: 1.1, dist: 2.2 }); // Schreibtischlampe
    B.lights.push({ pos: [1.85, 1.25, 0.55], color: 0xcfe0ff, intensity: 1.35, dist: 4 }); // kühles Fensterlicht auf Tisch und PC
    B.outside = 'town';
    B.doors = [{ c: [3.98, 1.0, 3.03], s: [0.14, 2.0, 0.85], label: 'Zimmertür' }];
    B.spawn = { x: 3.3, z: 3.0, look: [1.6, 0.9] };
    // Plätze für herumliegende alte PC-Teile (Start)
    B.looseSpots = { mobo: [0.52, 0.58, 2.7, 0.35, 'auf dem Bett'], cpu: [2.28, 0.745, 0.36, 0.5, 'auf dem Schreibtisch'], gpu: [1.6, 0.012, 1.85, 0.7, 'auf dem Teppich'], psu: [1.1, 0.0, 1.3, 0.3, 'vor dem Schrank'] };
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
    const st = mat('stairs', { color: 0x9c8f7c, roughness: 0.8 });
    for (let i = 0; i < 8; i++) box(g, 1.2, 0.3 * (i + 1), 0.25, st, 6.4, 0, 1.9 - i * 0.25);
    B.blocked.push(blk(5.8, 0, 7.0, 2.0));
    // Regal mit Kartons
    box(g, 1.0, 1.6, 0.4, M.steel(), 3.0, 0, 0.2);
    for (let i = 0; i < 5; i++) box(g, 0.3, 0.25, 0.3, mat('carton', { color: 0xb08a5a, roughness: 0.9 }), 2.65 + (i % 3) * 0.35, 1.6 * (i < 3 ? 0.25 : 0.6), 0.2);
    B.blocked.push(blk(2.5, 0, 3.5, 0.5));
    // Rohre an der Decke
    cyl(g, 0.05, 0.05, w, mat('pipe', { color: 0x9aa0a6, roughness: 0.4, metalness: 0.6 }), w / 2, h - 0.15, 0.3, 10, 'x');
    cyl(g, 0.035, 0.035, w, M.copper(), w / 2, h - 0.25, 0.45, 10, 'x');
    for (const x of [2, 5]) { const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), M.ledWhite()); bulb.position.set(x, h - 0.2, 2.5); g.add(bulb); B.lights.push({ pos: [x, h - 0.7, 2.5], color: 0xffe2b0, intensity: 3.2, dist: 7 }); }
    poster(S.left, textTexture([{ text: 'Familie Brandt', font: 'bold 40px Georgia', color: '#333' }, { text: 'Urlaub 1998', font: '30px Georgia', color: '#555' }], { w: 256, h: 256, bg: '#f5efe0' }), 0.4, 0.4, 2.5, 1.5, 0.085);
    // Dartscheibe, altes Fahrrad, Weihnachtskisten
    const dart = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), mat('dart', { map: textTexture([{ text: '◎', font: 'bold 220px Arial', color: '#c22' }], { w: 256, h: 256, bg: '#1a1a1a' }), roughness: 0.8 })); dart.position.set(5.3, 1.6, 0.085); S.back.add(dart);
    const bike = new THREE.Group(); bike.position.set(6.6, 0, 3.6); bike.rotation.y = Math.PI / 2; g.add(bike);
    for (const x of [-0.5, 0.5]) { const wh = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 8, 24), M.rubber()); wh.position.set(x, 0.35, 0); bike.add(wh); }
    const fr = mat('bikeFrame', { color: 0x2266aa, roughness: 0.4, metalness: 0.6 });
    for (const [x, y, rz, l] of [[-0.12, 0.55, 0.9, 0.75], [0.25, 0.55, -0.6, 0.6], [0.05, 0.75, 0, 0.7]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, l, 6), fr); b.position.set(x, y, 0); b.rotation.z = rz + Math.PI / 2 * (rz === 0 ? 1 : 0); bike.add(b); }
    B.blocked.push(blk(6.2, 2.8, 7.0, 4.4));
    for (let i = 0; i < 3; i++) box(g, 0.55, 0.35, 0.4, mat('xmasBox' + i, { color: [0xa83232, 0x2f7d3a, 0xc9a227][i], roughness: 0.8 }), 4.6 + (i % 2) * 0.1, i * 0.35, 4.75);
    B.blocked.push(blk(4.3, 4.5, 5.0, 5.0));
    B.outside = 'garden';
    B.doors = [{ c: [6.4, 1.2, 1.0], s: [1.2, 2.4, 2.0], label: 'Kellertreppe' }];
    B.spawn = { x: 5.2, z: 2.7, look: [2.0, 2.6] };
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
