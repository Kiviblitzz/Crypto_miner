// Räume / Standorte – Böden, Wände (mit Ausblendung zur Kamera), Möbel, Licht
import * as THREE from 'three';
import { TEX, M, mat, textTexture } from './materials.js';
import { box, cyl, fan } from './models.js';

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
  ceil.rotation.x = Math.PI / 2; ceil.position.set(w / 2, h, d / 2); ceil.visible = false; root.add(ceil);
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
      wallMatA: wallMat('bedA', TEX.plaster([2, 2], '#9fb6c9')), wallMatB: wallMat('bedB', TEX.plaster([2, 2], '#ece4d3')),
      holes: { back: [{ from: 1.0, to: 2.0, y0: 0.9, y1: 2.15 }], right: [{ from: 2.6, to: 3.45, y0: 0, y1: 2.05 }] },
    });
    windowFrame(S.back, 1.0, 2.0, 0.9, 2.15, 0.15);
    // Tür (rechts, nahe vorne)
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.88, 2.02, 0.04), mat('door', { color: 0xf4f1ea, roughness: 0.5 })); door.position.set(3.03, 1.01, 0.02); S.right.add(door);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), M.alu()); knob.position.set(3.33, 1.0, 0.07); S.right.add(knob);
    // Poster
    poster(S.left, textTexture([{ text: 'SUBNET', font: 'bold 120px Impact, Arial', color: '#ffdd55' }, { text: 'LIVE · TOUR 2010', font: '40px Arial', color: '#fff' }], { bg: '#1b1036', accent: '#ff3d7f', deco: (g, W, H) => { g.fillStyle = '#ff3d7f55'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(W / 2, H * 0.62, 30 + i * 22, Math.PI, 0); g.stroke(); } } }), 0.6, 0.85, 1.5, 1.6, 0.085);
    poster(S.right, textTexture([{ text: 'TO THE', font: 'bold 70px Arial' }, { text: 'MOON', font: 'bold 120px Arial', color: '#ffd23f' }, { text: '🚀', font: '120px Arial' }], { bg: '#0b1630', deco: (g, W, H) => { g.fillStyle = '#fff'; for (let i = 0; i < 80; i++) g.fillRect(Math.random() * W, Math.random() * H, 2, 2); } }), 0.6, 0.85, 1.0, 1.6, 0.085);
    poster(S.back, textTexture([{ text: 'WORLD MAP', font: 'bold 44px Arial', color: '#333' }], { bg: '#e8dcbc', deco: (g, W, H) => { g.fillStyle = '#7da36a'; for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(Math.random() * W, H * 0.3 + Math.random() * H * 0.5, 30 + Math.random() * 50, 20 + Math.random() * 30, Math.random(), 0, 7); g.fill(); } } }), 0.9, 0.6, 2.75, 1.85, 0.085);
    // Bett
    const g = S.root;
    const wood = mat('bedWood', { color: 0x8b5a33, roughness: 0.7 });
    box(g, 1.0, 0.3, 2.0, wood, 0.5, 0, 2.5); box(g, 0.95, 0.18, 1.95, mat('mattress', { color: 0xf3f3f0, roughness: 0.9 }), 0.5, 0.3, 2.5);
    box(g, 0.98, 0.08, 1.4, mat('blanket', { color: 0x3d6db5, roughness: 0.95 }), 0.5, 0.47, 2.75);
    box(g, 0.6, 0.12, 0.35, mat('pillow', { color: 0xffffff, roughness: 0.95 }), 0.5, 0.48, 1.75);
    box(g, 1.0, 0.75, 0.05, wood, 0.5, 0, 1.5);
    B.blocked.push(blk(0, 1.5, 1.0, 3.5));
    // Kleiderschrank
    box(g, 0.6, 2.0, 1.0, mat('wardrobe', { color: 0xe8e2d6, roughness: 0.6 }), 0.3, 0, 0.5);
    box(g, 0.01, 1.9, 0.01, M.alu(), 0.6, 0.05, 0.5);
    B.blocked.push(blk(0, 0, 0.6, 1.0));
    // Schreibtisch
    const desk = mat('desk', { color: 0xd8c3a0, roughness: 0.55 });
    box(g, 1.5, 0.04, 0.5, desk, 2.75, 0.72, 0.25);
    for (const x of [2.05, 3.45]) box(g, 0.04, 0.72, 0.46, desk, x, 0, 0.25);
    // Monitor mit Mining-Konsole
    const scr = textTexture([{ text: 'cgminer 2.0', font: 'bold 34px monospace', color: '#6f6', y: 40 }, { text: 'GPU0: 100 Mh/s  A:42 R:0', font: '26px monospace', color: '#6f6', y: 110 }, { text: 'Pool: connected', font: '26px monospace', color: '#6f6', y: 160 }, { text: '> _', font: '26px monospace', color: '#6f6', y: 210 }], { w: 512, h: 288, bg: '#020a02' });
    box(g, 0.5, 0.32, 0.03, M.black(), 2.6, 0.92, 0.12);
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.27), mat('monitorScreen', { map: scr, emissive: 0xffffff, emissiveMap: scr, emissiveIntensity: 0.9, roughness: 0.3 })); sm.position.set(2.6, 1.08, 0.136); g.add(sm);
    box(g, 0.06, 0.18, 0.06, M.black(), 2.6, 0.76, 0.1);
    box(g, 0.42, 0.02, 0.14, M.black(), 2.6, 0.76, 0.33); box(g, 0.06, 0.02, 0.1, M.black(), 2.95, 0.76, 0.33);
    box(g, 0.1, 0.25, 0.1, mat('mug', { color: 0xc23b3b, roughness: 0.4 }), 3.25, 0.76, 0.2);
    B.blocked.push(blk(2.0, 0, 3.5, 0.5));
    // Stuhl
    const ch = new THREE.Group(); ch.position.set(2.75, 0, 0.78); g.add(ch);
    cyl(ch, 0.25, 0.25, 0.03, M.black(), 0, 0.03, 0, 10); cyl(ch, 0.025, 0.025, 0.42, M.alu(), 0, 0.24, 0, 8);
    box(ch, 0.46, 0.08, 0.46, mat('chairFab', { color: 0x262a33, roughness: 0.9 }), 0, 0.45, 0); box(ch, 0.46, 0.55, 0.07, mat('chairFab', { color: 0x262a33, roughness: 0.9 }), 0, 0.53, 0.22);
    B.blocked.push(blk(2.5, 0.5, 3.0, 1.0));
    // Teppich
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.3), mat('rug', { map: TEX.carpet([1, 1], 350), roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(2.0, 0.005, 2.3); rug.receiveShadow = true; g.add(rug);
    // Regal rechts hinten an der Wand
    box(g, 0.45, 1.9, 0.32, desk, 3.75, 0, 0.16);
    for (const y of [0.4, 0.8, 1.2, 1.6]) box(g, 0.43, 0.02, 0.3, mat('shelfWood', { color: 0xbfa77f, roughness: 0.6 }), 3.75, y, 0.17);
    for (let i = 0; i < 12; i++) box(g, 0.035, 0.24, 0.2, mat('book' + (i % 3), { color: [0xa33, 0x37a, 0x3a5][i % 3], roughness: 0.8 }), 3.58 + (i % 6) * 0.06, i < 6 ? 0.82 : 1.22, 0.18);
    B.blocked.push(blk(3.5, 0, 4.0, 0.5));
    B.lights.push({ pos: [2.0, 2.4, 1.8], color: 0xffd7a0, intensity: 3.5, dist: 8 });
    B.outside = 'town';
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
    B.blocked.push(blk(0, 0.3, 0.6, 1.6));
    // Heizkessel
    box(g, 0.7, 1.6, 0.6, mat('boiler', { color: 0xd65d2a, roughness: 0.5, metalness: 0.3 }), 0.35, 0, 4.4);
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
    for (const x of [2, 5]) { const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), M.ledWhite()); bulb.position.set(x, h - 0.2, 2.5); g.add(bulb); B.lights.push({ pos: [x, h - 0.3, 2.5], color: 0xffe2b0, intensity: 3.2, dist: 7 }); }
    poster(S.left, textTexture([{ text: 'Familie Brandt', font: 'bold 40px Georgia', color: '#333' }, { text: 'Urlaub 1998', font: '30px Georgia', color: '#555' }], { w: 256, h: 256, bg: '#f5efe0' }), 0.4, 0.4, 2.5, 1.5, 0.085);
    B.outside = 'garden';
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
    for (const z of [0.3, d - 0.3]) box(g, w, 0.4, 0.25, col, w / 2, h - 0.5, z);
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
    for (let x = 4; x < w; x += 8) for (let z = 4; z < d; z += 8) { const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.25, 16), M.darkMetal()); lamp.position.set(x, h - 0.6, z); g.add(lamp); const lg = new THREE.Mesh(new THREE.CircleGeometry(0.38, 16), M.tube()); lg.rotation.x = Math.PI / 2; lg.position.set(x, h - 0.74, z); g.add(lg); B.lights.push({ pos: [x, h - 1, z], color: 0xf6f8ff, intensity: 30, dist: 18 }); }
    B.outside = 'industrial';
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
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), mat('bigScreen', { map: sTex, emissive: 0xffffff, emissiveMap: sTex, emissiveIntensity: 1, roughness: 0.3 })); sm.position.set(18, 3.0, 0.2); S.back.add(sm);
    B.screens.push({ canvas: scr, tex: sTex, kind: 'dc' });
    // Kabeltrassen
    for (let z = 7; z < d; z += 8) { box(g, w - 12, 0.06, 0.3, M.steel(), w / 2 + 5, h - 0.4, z); for (let x = 10; x < w - 1; x += 0.9) box(g, 0.04, 0.04, 0.26, M.cableYellow(), x, h - 0.34, z); }
    for (let x = 4; x < w; x += 6) for (let z = 3; z < d; z += 6) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), M.tube()); p.rotation.x = Math.PI / 2; p.position.set(x, h - 0.02, z); g.add(p); }
    for (let x = 6; x < w; x += 12) for (let z = 8; z < d; z += 10) B.lights.push({ pos: [x, h - 0.6, z], color: 0xf0f6ff, intensity: 22, dist: 16 });
    // gelochte Bodenplatten-Reihen (Kaltgänge)
    const pm = mat('perfTile', { map: TEX.perfTile([1, 1]), roughness: 0.5 });
    for (let z = 7; z < d - 1; z += 4) { const l = new THREE.Mesh(new THREE.PlaneGeometry(w - 10, 0.6), pm); l.rotation.x = -Math.PI / 2; l.position.set(w / 2 + 4, 0.003, z); g.add(l); }
    B.outside = 'city';
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
  }
  S.root.userData.walls = S.walls;
  return { ...B, root: S.root, walls: S.walls, ceil: S.ceil };
}

// Umgebung außerhalb des Raums
export function buildOutside(kind, def) {
  const g = new THREE.Group();
  const { w, d } = def;
  const grass = mat('grass', { color: 0x5d8a44, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, kind === 'fjord' ? 300 : 600), kind === 'city' || kind === 'industrial' ? mat('asphalt', { map: TEX.concrete([60, 60], 70), roughness: 1 }) : grass);
  ground.rotation.x = -Math.PI / 2; ground.position.set(w / 2, -0.12, kind === 'fjord' ? 130 : d / 2); ground.receiveShadow = true; g.add(ground);
  if (kind === 'fjord') { const quay = new THREE.Mesh(new THREE.BoxGeometry(600, 2, 6), mat('quay', { color: 0x6f747a, roughness: 0.9 })); quay.position.set(w / 2, -1.1, -23); g.add(quay); }
  const rnd = (a, b) => a + Math.random() * (b - a);
  if (kind === 'town' || kind === 'garden' || kind === 'yard') {
    // Nachbarhäuser & Bäume
    const roofM = mat('roof', { color: 0x8f3b2a, roughness: 0.8 });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, r = rnd(18, 30);
      const x = w / 2 + Math.cos(a) * r, z = d / 2 + Math.sin(a) * r;
      const hw = rnd(5, 8), hd = rnd(5, 8), hh = rnd(4, 7);
      const house = new THREE.Mesh(new THREE.BoxGeometry(hw, hh, hd), mat('house' + (i % 3), { color: [0xe9dfc9, 0xd7c6a7, 0xc9d3d9][i % 3], roughness: 0.9 })); house.position.set(x, hh / 2, z); house.castShadow = true; g.add(house);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(hw, hd) * 0.75, 2.5, 4), roofM); roof.position.set(x, hh + 1.25, z); roof.rotation.y = Math.PI / 4; g.add(roof);
    }
    for (let i = 0; i < 24; i++) { const a = Math.random() * Math.PI * 2, r = rnd(10, 40); const t = new THREE.Group(); t.position.set(w / 2 + Math.cos(a) * r, 0, d / 2 + Math.sin(a) * r); cyl(t, 0.15, 0.2, 2, mat('trunk', { color: 0x5b3b24 }), 0, 1, 0, 8); const c = new THREE.Mesh(new THREE.SphereGeometry(rnd(1.2, 2), 10, 8), mat('treeTop', { color: 0x3f7a36, roughness: 0.9 })); c.position.y = 2.8; c.castShadow = true; t.add(c); g.add(t); }
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
