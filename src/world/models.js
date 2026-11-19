// Prozedurale 3D-Modelle – "von Hand modelliert": abgerundete Kanten und Fasen, gebogene Lüfterflügel,
// Lamellen-Kühler, Heatpipes, verlegte Kabel, Schrauben, Etiketten. Danach nach Material zusammengeführt
// (wenige Draw-Calls) und mit einer vereinfachten Fern-Stufe (LOD) versehen.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { M, mat } from './materials.js';
import { PLACEABLE, PART } from '../data/hardware.js';

// Detailstufe beim Bauen (lo = Fernansicht: einfache Quader, keine Schrauben)
export const Q = { lo: false, mid: false };
const gcache = new Map();
const cached = (k, fn) => { const key = k + (Q.lo ? '|lo' : Q.mid ? '|mid' : ''); let g = gcache.get(key); if (!g) { g = fn(); gcache.set(key, g); } return g; };
const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

// ---------- Zusatz-Materialien ----------
export const X = {
  gold: () => mat('gold', { color: 0xd8a640, roughness: 0.28, metalness: 1 }),
  caseBlack: () => mat('caseBlack', { color: 0x1b1d22, roughness: 0.42, metalness: 0.35 }),
  wire: () => mat('grillWire', { color: 0xc4c8ce, roughness: 0.3, metalness: 0.9 }),
  wireDark: () => mat('grillWireDark', { color: 0x2a2c31, roughness: 0.45, metalness: 0.6 }),
  ram: () => mat('ramSpreader', { color: 0x8d1c26, roughness: 0.35, metalness: 0.7 }),
  chrome: () => mat('chrome', { color: 0xe3e6ea, roughness: 0.14, metalness: 1 }),
  plastic: () => mat('plasticGrey', { color: 0x8a8f96, roughness: 0.55 }),
  profile: () => mat('aluProfile', { color: 0xb7bdc5, roughness: 0.36, metalness: 0.85 }),
  rack: () => mat('rackBlack', { color: 0x1d2025, roughness: 0.5, metalness: 0.55 }),
  groove: () => mat('groove', { color: 0x4a4f57, roughness: 0.5, metalness: 0.7 }),
  cap: () => mat('capacitor', { color: 0x2b2f3a, roughness: 0.35, metalness: 0.6 }),
  brass: () => mat('brass', { color: 0xc9a24a, roughness: 0.3, metalness: 0.95 }),
  wood: () => mat('woodbar', { color: 0x9b6b3a, roughness: 0.8 }),
  orange: () => mat('beamOrange', { color: 0xe8701c, roughness: 0.5, metalness: 0.4 }),
  blueUp: () => mat('shelfBlue', { color: 0x2b5fa8, roughness: 0.5, metalness: 0.5 }),
  leaf: () => mat('leaf2', { color: 0x3f8f3c, roughness: 0.65, side: THREE.DoubleSide }),
  leafDark: () => mat('leaf3', { color: 0x2c6b2f, roughness: 0.7, side: THREE.DoubleSide }),
  soil: () => mat('soil', { color: 0x3b2a1d, roughness: 1 }),
  terracotta: () => mat('pot', { color: 0xb5643c, roughness: 0.8 }),
  acrylic: () => mat('acryl', { color: 0xdfe8f0, roughness: 0.1, transparent: true, opacity: 0.45, depthWrite: false }),
  glassTank: () => mat('glassTank', { color: 0xcfe6ef, roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false }),
  sand: () => mat('sand', { color: 0xd8c08a, roughness: 1 }),
  stone: () => mat('stone', { color: 0x777a7f, roughness: 0.9 }),
};

// ---------- Geometrie-Helfer ----------
function boxGeo(w, h, d, r = -1) {
  return cached(`box|${w}|${h}|${d}|${r}`, () => {
    const mn = Math.min(w, h, d), mx = Math.max(w, h, d);
    const rad = r >= 0 ? Math.min(r, mn / 2 - 1e-4) : Math.min(mn * 0.22, 0.01 + mx * 0.012, 0.04);
    if (Q.lo || rad < 0.0012) return new THREE.BoxGeometry(w, h, d);
    const seg = r >= 0 ? (rad >= 0.03 ? 4 : rad >= 0.012 ? 3 : rad >= 0.006 ? 2 : 1) : mx > 0.25 ? 2 : 1;
    return new RoundedBoxGeometry(w, h, d, seg, rad);
  });
}
const cylGeo = (rt, rb, h, seg) => cached(`cyl|${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, Q.lo ? Math.max(6, seg >> 1) : seg));
const torusGeo = (R, r, seg = 32, rs = 6) => cached(`tor|${R}|${r}|${seg}|${rs}`, () => new THREE.TorusGeometry(R, r, Q.lo ? 3 : rs, Q.lo ? Math.max(8, seg >> 1) : seg));
const sphGeo = (r, ws = 16, hs = 12) => cached(`sph|${r}|${ws}|${hs}`, () => new THREE.SphereGeometry(r, Q.lo ? Math.max(6, ws >> 1) : ws, Q.lo ? Math.max(4, hs >> 1) : hs));
const planeGeo = (w, h) => cached(`pl|${w}|${h}`, () => new THREE.PlaneGeometry(w, h));

// Quader (Unterkante auf y) mit automatisch abgerundeten Kanten; r>=0 = eigener Radius ("weich")
export function box(parent, w, h, d, material, x = 0, y = 0, z = 0, ry = 0, r = -1) {
  const m = new THREE.Mesh(boxGeo(w, h, d, r), material); m.position.set(x, y + h / 2, z); m.rotation.y = ry; parent.add(m); return m;
}
export function boxC(parent, w, h, d, material, x = 0, y = 0, z = 0, r = -1) { const m = new THREE.Mesh(boxGeo(w, h, d, r), material); m.position.set(x, y, z); parent.add(m); return m; }
export function soft(parent, w, h, d, material, x, y, z, r, ry = 0) { return box(parent, w, h, d, material, x, y, z, ry, r); }
export function cyl(parent, rt, rb, h, material, x = 0, y = 0, z = 0, seg = 20, axis = 'y') {
  const m = new THREE.Mesh(cylGeo(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  if (axis === 'z') m.rotation.x = Math.PI / 2; if (axis === 'x') m.rotation.z = Math.PI / 2;
  parent.add(m); return m;
}
export function sph(parent, r, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, ws = 16, hs = 12) { const m = new THREE.Mesh(sphGeo(r, ws, hs), material); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m; }
// Drehkörper: Profil [[radius, höhe], ...] gegen den Uhrzeigersinn (unten → außen → oben)
export function lathe(parent, pts, material, x = 0, y = 0, z = 0, seg = 28) {
  const g = cached('lathe|' + pts.join(';') + '|' + seg, () => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), Q.lo ? Math.max(8, seg >> 1) : seg));
  const m = new THREE.Mesh(g, material); m.position.set(x, y, z); parent.add(m); return m;
}
// Verlegtes Kabel / Schlauch entlang Stützpunkten
export function tube(parent, pts, r, material, seg = 20, radial = 7) {
  const curve = new THREE.CatmullRomCurve3(pts.map(V3));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Q.lo ? Math.max(3, seg >> 2) : Q.mid ? Math.max(4, seg >> 1) : seg, r, Q.lo || Q.mid ? 4 : radial, false), material); parent.add(m); return m;
}
// Stab zwischen zwei Punkten
export function rod(parent, a, b, r, material, seg = 8) {
  const A = V3(a), B = V3(b), dir = B.clone().sub(A); const len = dir.length();
  const m = new THREE.Mesh(cylGeo(r, r, len, seg), material); m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); parent.add(m); return m;
}
export function plane(parent, w, h, material, x, y, z, rx = 0, ry = 0) { const m = new THREE.Mesh(planeGeo(w, h), material); m.position.set(x, y, z); m.rotation.order = 'YXZ'; m.rotation.set(rx, ry, 0); parent.add(m); return m; }
function disc(parent, r, material, x, y, z, axis = 'z') { const m = new THREE.Mesh(cached(`disc|${r}`, () => new THREE.CircleGeometry(r, Q.lo ? 12 : 28)), material); m.position.set(x, y, z); if (axis === 'y') m.rotation.x = -Math.PI / 2; if (axis === '-z') m.rotation.y = Math.PI; if (axis === 'x') m.rotation.y = Math.PI / 2; if (axis === '-x') m.rotation.y = -Math.PI / 2; parent.add(m); return m; }
// Schraube (Linsenkopf) – nur in der Nahansicht
export function screw(parent, x, y, z, axis = 'z', r = 0.0035) {
  if (Q.lo || Q.mid) return;
  const m = new THREE.Mesh(cached(`screw|${r}`, () => { const g = new THREE.SphereGeometry(r, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.45, 1); return g; }), X.chrome());
  m.position.set(x, y, z);
  const rot = { z: [Math.PI / 2, 0, 0], '-z': [-Math.PI / 2, 0, 0], x: [0, 0, -Math.PI / 2], '-x': [0, 0, Math.PI / 2], y: [0, 0, 0], '-y': [Math.PI, 0, 0] }[axis];
  m.rotation.set(...rot); parent.add(m);
}
// Lamellen-Kühler (dünne Bleche entlang einer Achse)
function finStack(parent, w, h, d, n, material, x, y, z, axis = 'x') {
  if (Q.lo) { boxC(parent, w, h, d, M.fins(), x, y, z); return; }
  const len = axis === 'x' ? w : axis === 'y' ? h : d, t = Math.min(0.0012, (len / n) * 0.35);
  for (let i = 0; i < n; i++) {
    const o = -len / 2 + (i + 0.5) * (len / n);
    if (axis === 'x') boxC(parent, t, h, d, material, x + o, y, z, 0);
    else if (axis === 'y') boxC(parent, w, t, d, material, x, y + o, z, 0);
    else boxC(parent, w, h, t, material, x, y, z + o, 0);
  }
}
// Etiketten / Aufkleber (Canvas)
const _lbl = new Map();
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export function labelMat(key, w, h, draw, emissive = 0) {
  if (_lbl.has(key)) return _lbl.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h, rng(key.length * 977 + 13));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, ...(emissive ? { emissive: 0xffffff, emissiveMap: t, emissiveIntensity: emissive } : {}) });
  m.name = 'lbl_' + key; _lbl.set(key, m); return m;
}
function barcode(g, x, y, w, h, r) { g.fillStyle = '#111'; let px = x; while (px < x + w) { const bw = 1 + Math.floor(r() * 3); if (r() > 0.4) g.fillRect(px, y, bw, h); px += bw + 1; } }
function qr(g, x, y, s, r) { const n = 13, c = s / n; g.fillStyle = '#111'; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (r() > 0.5) g.fillRect(x + i * c, y + j * c, c, c); for (const [a, b] of [[0, 0], [n - 4, 0], [0, n - 4]]) { g.fillRect(x + a * c, y + b * c, 4 * c, 4 * c); g.fillStyle = '#fff'; g.fillRect(x + (a + 0.7) * c, y + (b + 0.7) * c, 2.6 * c, 2.6 * c); g.fillStyle = '#111'; g.fillRect(x + (a + 1.3) * c, y + (b + 1.3) * c, 1.4 * c, 1.4 * c); } }
const stickerMat = (key, title, sub, color = '#1b1d22') => labelMat(key, 256, 128, (g, w, h, r) => {
  g.fillStyle = '#f1f1ec'; g.fillRect(0, 0, w, h); g.fillStyle = color; g.fillRect(0, 0, w, 30);
  g.fillStyle = '#fff'; g.font = 'bold 22px Arial'; g.fillText(title, 10, 23);
  g.fillStyle = '#222'; g.font = '15px Arial'; String(sub).split('|').forEach((l, i) => g.fillText(l, 10, 52 + i * 18));
  barcode(g, 10, 96, 150, 24, r); qr(g, 180, 44, 66, r);
});

// ---------- Lüfter ----------
function ringGeo(rIn, rOut, depth) {
  return cached(`ring|${rIn}|${rOut}|${depth}`, () => {
    const h = depth / 2, b = Math.min((rOut - rIn) * 0.35, h * 0.5);
    const g = new THREE.LatheGeometry([[rIn, -h], [rOut - b, -h], [rOut, -h + b], [rOut, h - b], [rOut - b, h], [rIn, h], [rIn, -h]].map(([a, c]) => new THREE.Vector2(a, c)), Q.lo ? 12 : 28);
    g.rotateX(Math.PI / 2); return g;
  });
}
function hubGeo(hr, depth) {
  return cached(`hub|${hr}|${depth}`, () => {
    const h = depth * 0.5, bz = Math.min(depth * 0.3, hr * 0.35);
    const g = new THREE.LatheGeometry([[0, -h], [hr, -h], [hr, h], [hr * 0.93, h + bz * 0.55], [hr * 0.62, h + bz * 0.92], [0, h + bz]].map(([a, c]) => new THREE.Vector2(a, c)), Q.lo ? 8 : 16);
    g.rotateX(Math.PI / 2); return g;
  });
}
// Gebogene, verdrehte Flügel (alle n Flügel in einer Geometrie)
function bladeGeo(r, n, depth, hubR, wide = 1) {
  return cached(`blade|${r}|${n}|${depth}|${hubR}|${wide}`, () => {
    const U = Q.lo ? 2 : r < 0.04 ? 4 : 6, Vn = Q.lo ? 1 : r < 0.04 ? 2 : 3, tip = r * 0.96;
    const pos = [], idx = [];
    for (let b = 0; b < n; b++) {
      const a0 = (b / n) * Math.PI * 2, base = pos.length / 3;
      for (let i = 0; i <= U; i++) {
        const u = i / U;
        const span = (Math.PI * 2 / n) * (0.46 + 0.3 * Math.sin(u * Math.PI * 0.8)) * wide;
        const sweep = 0.5 * u * u;
        for (let j = 0; j <= Vn; j++) {
          const v = j / Vn - 0.5;
          const rad = hubR + (tip - hubR) * u * (1 - 0.14 * (4 * v * v) * Math.pow(u, 5));
          const th = a0 + sweep + v * span;
          const z = -v * depth * 0.85 * (1 - 0.35 * u) + (0.25 - v * v) * depth * 0.35;
          pos.push(Math.cos(th) * rad, Math.sin(th) * rad, z);
        }
      }
      for (let i = 0; i < U; i++) for (let j = 0; j < Vn; j++) { const a = base + i * (Vn + 1) + j, c = a + Vn + 1; idx.push(a, c, a + 1, c, c + 1, a + 1); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  });
}
function squareFrameGeo(s, r, depth) {
  return cached(`sqf|${s}|${r}|${depth}`, () => {
    const h = s / 2, c = s * 0.12, sh = new THREE.Shape();
    sh.moveTo(-h + c, -h); sh.lineTo(h - c, -h); sh.quadraticCurveTo(h, -h, h, -h + c); sh.lineTo(h, h - c); sh.quadraticCurveTo(h, h, h - c, h);
    sh.lineTo(-h + c, h); sh.quadraticCurveTo(-h, h, -h, h - c); sh.lineTo(-h, -h + c); sh.quadraticCurveTo(-h, -h, -h + c, -h);
    const hole = new THREE.Path(); hole.absarc(0, 0, r, 0, Math.PI * 2, true); sh.holes.push(hole);
    const bev = Math.min(depth * 0.15, s * 0.015), dd = Math.max(0.0005, depth - bev * 2);
    const g = new THREE.ExtrudeGeometry(sh, { depth: dd, bevelEnabled: !Q.lo, bevelThickness: bev, bevelSize: bev * 0.8, bevelSegments: 1, curveSegments: Q.lo || s < 0.09 ? 6 : 10 });
    g.translate(0, 0, -dd / 2); return g;
  });
}
function addGrill(g, r, z, material = X.wire()) {
  if (Q.lo) { const gm = new THREE.Mesh(cached(`gc|${r}`, () => new THREE.CircleGeometry(r, 16)), M.grill()); gm.position.z = z; g.add(gm); return; }
  const wr = Math.max(0.0009, r * 0.016);
  for (const f of r < 0.04 ? [0.5, 0.95] : [0.36, 0.66, 0.95]) { const t = new THREE.Mesh(torusGeo(r * f, wr, r < 0.04 ? 16 : 26, 3), material); t.position.z = z; g.add(t); }
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(cylGeo(wr, wr, r * 1.9, 5), material); b.rotation.z = (i * Math.PI) / 4; b.position.z = z; g.add(b); }
  const c = new THREE.Mesh(cylGeo(r * 0.2, r * 0.2, wr * 2, 12), material); c.rotation.x = Math.PI / 2; c.position.z = z; g.add(c);
}
// Lüfter: Achse = lokale Z. Gibt Gruppe zurück; Rotor ist als spin markiert
export function fan(parent, r, { blade = M.fanBlade(), frame = M.black(), n = 7, square = false, grill = false, depth = 0.012, frameless = false, wide = 1, hub = null } = {}) {
  const g = new THREE.Group(); parent.add(g);
  const hubR = r * 0.34;
  if (Q.lo || Q.mid) {
    // Fernansicht: Rahmen-Fläche + Gitter-Scheibe
    if (square) { const pl = new THREE.Mesh(planeGeo(r * 2.15, r * 2.15), frame); pl.position.z = -depth * 0.3; g.add(pl); }
    const d = new THREE.Mesh(cached(`gc|${r}`, () => new THREE.CircleGeometry(r, 12)), grill ? M.grill() : blade); d.position.z = depth * 0.3; g.add(d);
    return g;
  }
  if (square) {
    const s = r * 2.15;
    g.add(new THREE.Mesh(squareFrameGeo(s, r * 1.03, depth), frame));
    if (!Q.lo) {
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4, r0 = hubR * 0.8, r1 = r * 1.3, len = r1 - r0;
        const b = new THREE.Mesh(boxGeo(len, r * 0.07, depth * 0.16, 0), frame); b.position.set(Math.cos(a) * (r0 + len / 2), Math.sin(a) * (r0 + len / 2), -depth * 0.42); b.rotation.z = a; g.add(b);
      }
    }
  } else if (!frameless) g.add(new THREE.Mesh(ringGeo(r * 1.02, r * 1.1, depth), frame));
  if (!Q.lo) { const mh = new THREE.Mesh(cylGeo(hubR * 0.9, hubR * 0.9, depth * 0.2, 20), frame); mh.rotation.x = Math.PI / 2; mh.position.z = -depth * 0.42; g.add(mh); }
  const rotor = new THREE.Group(); rotor.userData.spin = true; g.add(rotor);
  rotor.add(new THREE.Mesh(hubGeo(hubR, depth * 0.8), hub || frame));
  rotor.add(new THREE.Mesh(bladeGeo(r, n, depth * 0.85, hubR * 0.9, wide), blade));
  if (grill) addGrill(g, r * 1.02, depth * 0.5 + 0.0015, grill === 'dark' ? X.wireDark() : X.wire());
  return g;
}

// ---------- Grafikkarte (Länge entlang X, Höhe Y, Lüfter zeigen nach +Z) ----------
function gpuFaceGeo(L, H, n, r) {
  return cached(`gpuface|${L}|${H}|${n}|${r}`, () => {
    const x0 = 0.004, x1 = L - 0.002, y0 = 0.004, y1 = H - 0.002, c = 0.01, sh = new THREE.Shape();
    sh.moveTo(x0 + c, y0); sh.lineTo(x1 - c * 2, y0); sh.lineTo(x1, y0 + c * 2); sh.lineTo(x1, y1 - c); sh.quadraticCurveTo(x1, y1, x1 - c, y1);
    sh.lineTo(x0 + c, y1); sh.quadraticCurveTo(x0, y1, x0, y1 - c); sh.lineTo(x0, y0 + c); sh.quadraticCurveTo(x0, y0, x0 + c, y0);
    for (let i = 0; i < n; i++) { const p = new THREE.Path(); p.absarc((L / n) * (i + 0.5), H / 2 + 0.002, r * 1.06, 0, Math.PI * 2, true); sh.holes.push(p); }
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: !Q.lo, bevelThickness: 0.0012, bevelSize: 0.001, bevelSegments: 1, curveSegments: Q.lo ? 6 : 14 });
    g.translate(0, 0, -0.0052); return g;
  });
}
function accentGeo(w, h, slant) {
  return cached(`acc|${w}|${h}|${slant}`, () => {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(w, 0); sh.lineTo(w + slant, h); sh.lineTo(slant, h); sh.lineTo(0, 0);
    return new THREE.ExtrudeGeometry(sh, { depth: 0.0012, bevelEnabled: false });
  });
}
export function gpuModel(parent, look) {
  const g = new THREE.Group(); parent.add(g);
  const L = look.len, H = 0.112, T = 0.016 + 0.016 * look.slot;
  const red = look.brand === 'crimson';
  const shroud = red ? M.shroudDark() : (L > 0.28 ? M.shroudSilver() : M.shroudDark());
  const accent = red ? M.crimson() : M.verdant();
  const n = look.fans, r = Math.min(H * 0.42, (L / n) * 0.44), zF = T / 2 - 0.001;
  // Platine, Goldkontakte, Backplate
  boxC(g, L - 0.004, H - 0.004, 0.0016, M.pcbGreen(), L / 2, H / 2, -T / 2 + 0.0035);
  boxC(g, 0.072, 0.009, 0.0018, X.gold(), L * 0.36, -0.0025, -T / 2 + 0.0035);
  boxC(g, L * 0.985, H * 0.95, 0.002, M.darkMetal(), L / 2, H / 2, -T / 2 + 0.001);
  if (!Q.lo) for (const [sx, sy] of [[0.12, 0.2], [0.12, 0.8], [0.6, 0.2], [0.6, 0.8], [0.92, 0.5]]) screw(g, L * sx, H * sy, -T / 2, '-z', 0.0025);
  // Kühlblock hinter den Lüftern
  boxC(g, L - 0.012, H - 0.016, 0.002, M.darkMetal(), L / 2, H / 2, -T / 2 + 0.006);
  finStack(g, L - 0.014, H - 0.018, T - 0.016, Math.round(L / 0.0055), M.alu(), L / 2, H / 2, -0.0015, 'x');
  // Lüfterabdeckung mit Öffnungen + Akzente
  const face = new THREE.Mesh(gpuFaceGeo(L, H, n, r), shroud); face.position.z = zF; g.add(face);
  const accG = accentGeo(0.006, H * 0.5, 0.012);
  for (let i = 1; i < n; i++) { const a = new THREE.Mesh(accG, accent); a.position.set((L / n) * i - 0.009, H * 0.25, zF + 0.0002); g.add(a); }
  boxC(g, L * 0.55, 0.003, 0.0015, accent, L * 0.42, 0.009, zF + 0.0006, 0);
  for (let i = 0; i < n; i++) {
    const cx = (L / n) * (i + 0.5), cy = H / 2 + 0.002;
    const f = fan(g, r, { n: 9, depth: 0.008, frameless: true, wide: 1.15 }); f.position.set(cx, cy, zF - 0.007);
    const ring = new THREE.Mesh(torusGeo(r * 1.06, 0.0012, 28, 3), accent); ring.position.set(cx, cy, zF + 0.0002); g.add(ring);
  }
  // Oberkante: Logo-Leiste, Heatpipes, Stromstecker
  boxC(g, L * 0.62, 0.005, T * 0.4, shroud, L * 0.62, H - 0.0005, zF - T * 0.2);
  plane(g, L * 0.3, T * 0.3, labelMat(red ? 'gpuLogoC' : 'gpuLogoV', 256, 48, (c, w, h) => { c.fillStyle = '#0b0b0d'; c.fillRect(0, 0, w, h); c.fillStyle = red ? '#ff2a40' : '#7dff3a'; c.font = 'bold 34px Arial'; c.textAlign = 'center'; c.fillText(red ? 'CRIMSON' : 'VERDANT', w / 2, 36); }, 1.4), L * 0.6, H + 0.0021, zF - T * 0.2, -Math.PI / 2);
  for (let k = 0; k < 3; k++) {
    const z = -T / 2 + 0.006 + k * ((T - 0.014) / 2), x0 = L * 0.08 + k * 0.006;
    tube(g, [[x0, H - 0.012, z], [x0 + 0.006, H + 0.003, z], [x0 + 0.03, H + 0.005, z], [L * 0.28 + k * 0.01, H - 0.012, z]], 0.0026, M.copper(), 12, 6);
  }
  const pins = L > 0.26 ? 2 : 1;
  for (let k = 0; k < pins; k++) { boxC(g, 0.022, 0.01, 0.008, M.black(), L - 0.04 - k * 0.026, H + 0.004, -T / 2 + 0.008, 0.0008); if (!Q.lo) for (let p = 0; p < 4; p++) boxC(g, 0.0035, 0.002, 0.003, X.gold(), L - 0.049 - k * 0.026 + p * 0.0055, H + 0.009, -T / 2 + 0.008, 0); }
  // Slotblech mit Anschlüssen und Lüftungsschlitzen
  boxC(g, 0.0015, H + 0.016, T + 0.006, X.chrome(), -0.001, H / 2 + 0.005, 0, 0);
  boxC(g, 0.012, 0.0015, T + 0.006, X.chrome(), -0.006, H + 0.0125, 0, 0);
  for (let k = 0; k < 3; k++) boxC(g, 0.003, 0.014, 0.006, M.black(), -0.0025, 0.02 + k * 0.02, -T / 2 + 0.008, 0);
  boxC(g, 0.003, 0.016, 0.006, M.black(), -0.0025, 0.082, -T / 2 + 0.008, 0);
  if (!Q.lo) for (let k = 0; k < 6; k++) boxC(g, 0.0025, 0.012, 0.0022, M.black(), -0.0022, 0.02 + k * 0.014, T / 2 - 0.002, 0);
  boxC(g, L * 0.6, 0.004, 0.0015, M.rgb(), L / 2, H - 0.012, zF + 0.0008, 0);
  return g;
}

// ---------- Mainboard, CPU-Kühler, Netzteil ----------
function mobo(parent, w, d, x, y, z, vertical = false) {
  const g = new THREE.Group(); parent.add(g);
  boxC(g, w, 0.0025, d, M.pcbBlack(), 0, 0, 0);
  const sx = -w * 0.2, sz = -d * 0.15;
  boxC(g, 0.05, 0.004, 0.05, M.alu(), sx, 0.003, sz);
  // Spannungswandler-Kühler
  box(g, 0.016, 0.022, 0.075, M.darkMetal(), sx - 0.042, 0.001, sz + 0.005); box(g, 0.075, 0.022, 0.016, M.darkMetal(), sx + 0.005, 0.001, sz - 0.042);
  if (!Q.lo) for (let i = 0; i < 5; i++) { boxC(g, 0.017, 0.0015, 0.07, X.groove(), sx - 0.042, 0.006 + i * 0.0035, sz + 0.005, 0); }
  // RAM-Sticks
  for (let i = 0; i < 4; i++) { boxC(g, 0.006, 0.008, d * 0.56, M.black(), w * 0.06 + i * 0.012, 0.005, -d * 0.1, 0); box(g, 0.0045, 0.03, d * 0.52, i % 2 ? X.ram() : M.darkMetal(), w * 0.06 + i * 0.012, 0.006, -d * 0.1); }
  // Chipsatz, PCIe, Batterie, Kondensatoren, Stecker
  box(g, 0.036, 0.008, 0.036, M.darkMetal(), w * 0.15, 0.001, d * 0.26);
  for (let i = 0; i < 3; i++) boxC(g, w * 0.5, 0.008, 0.007, i === 0 ? M.alu() : M.black(), -w * 0.1, 0.005, d * 0.08 + i * 0.06, 0.001);
  cyl(g, 0.01, 0.01, 0.003, X.chrome(), w * 0.32, 0.003, d * 0.18, 18);
  if (!Q.lo) for (let i = 0; i < 8; i++) cyl(g, 0.0035, 0.0035, 0.009, X.cap(), sx - 0.03 + i * 0.009, 0.006, sz + 0.038, 10);
  box(g, 0.012, 0.012, 0.034, M.black(), w * 0.45, 0.001, -d * 0.1);
  box(g, 0.04, 0.032, 0.06, M.darkMetal(), -w * 0.44, 0.001, -d * 0.32);
  g.position.set(x, y, z); if (vertical) g.rotation.z = Math.PI / 2; return g;
}
function cpuCooler(parent, x, y, z, rotX = 0) {
  const g = new THREE.Group(); parent.add(g);
  box(g, 0.045, 0.012, 0.045, M.copper(), 0, 0, 0);
  for (let i = 0; i < 4; i++) { const px = -0.018 + i * 0.012; cyl(g, 0.003, 0.003, 0.03, M.copper(), px, 0.026, 0, 10); if (!Q.lo) cyl(g, 0.0032, 0.0032, 0.004, M.copper(), px, 0.141, 0, 10); }
  finStack(g, 0.1, 0.1, 0.05, 26, M.alu(), 0, 0.088, 0, 'y');
  box(g, 0.102, 0.004, 0.052, M.darkMetal(), 0, 0.138, 0);
  const f = fan(g, 0.045, { square: true, n: 7 }); f.position.set(0, 0.088, 0.033);
  g.position.set(x, y, z); g.rotation.x = rotX; return g;
}
function psuBox(parent, x, y, z, w = 0.15, h = 0.086, d = 0.16) {
  box(parent, w, h, d, X.caseBlack(), x, y, z);
  const f = fan(parent, 0.05, { n: 9, grill: 'dark' }); f.position.set(x, y + h + 0.001, z); f.rotation.x = -Math.PI / 2;
  plane(parent, d * 0.6, h * 0.6, stickerMat('psuLbl', 'VOLTAR 750', '80+ GOLD · 230V~|12V ⎓ 62A'), x + w / 2 + 0.0012, y + h / 2, z, 0, Math.PI / 2);
  for (let i = 0; i < 6; i++) box(parent, 0.016, 0.01, 0.004, M.black(), x - w / 2 + 0.025 + (i % 3) * 0.022, y + 0.02 + Math.floor(i / 3) * 0.018, z + d / 2);
  box(parent, 0.026, 0.018, 0.004, M.black(), x - w / 2 + 0.03, y + h * 0.35, z - d / 2 - 0.002);
  box(parent, 0.008, 0.012, 0.004, M.ledRed(), x - w / 2 + 0.06, y + h * 0.4, z - d / 2 - 0.002);
  for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) screw(parent, x + a * (w / 2 - 0.008), y + h / 2 + b * (h / 2 - 0.008), z - d / 2, '-z');
}

// ---------- Rigs ----------
function riser(root, x, y, z, gx, gy, gz) {
  box(root, 0.03, 0.003, 0.02, M.pcbBlue(), x, y, z);
  box(root, 0.012, 0.007, 0.01, M.alu(), x - 0.006, y + 0.003, z);
  box(root, 0.026, 0.008, 0.006, M.black(), x, y + 0.003, z + 0.007);
  tube(root, [[x - 0.006, y + 0.008, z], [x - 0.01, y + 0.05, z + 0.02], [gx, (y + gy) / 2, gz - 0.03], [gx, gy - 0.03, gz]], 0.0025, M.cableBlue(), 16, 5);
}
export function buildRig(type, parts) {
  const root = new THREE.Group();
  const gpus = (parts?.gpus || []).map((id) => PART[id]).filter(Boolean);
  if (type === 'tower') {
    const W = 0.22, H = 0.47, D = 0.46, y0 = 0.02, sh = X.caseBlack();
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) cyl(root, 0.017, 0.02, y0, M.rubber(), a * (W / 2 - 0.03), y0 / 2, b * (D / 2 - 0.05), 18);
    box(root, W, 0.012, D, sh, 0, y0, 0);
    box(root, W, 0.012, D, sh, 0, y0 + H - 0.012, 0);
    box(root, 0.01, H, D, sh, -W / 2 + 0.005, y0, 0);
    box(root, W, H, 0.01, sh, 0, y0, -D / 2 + 0.005);
    // Front: Rahmen + Mesh + RGB
    box(root, W + 0.006, H + 0.004, 0.024, M.blackGloss(), 0, y0 - 0.002, D / 2 + 0.002);
    boxC(root, W - 0.05, H - 0.08, 0.004, M.perforated(), 0, y0 + H / 2, D / 2 + 0.0145, 0);
    for (const s of [-1, 1]) boxC(root, 0.005, H - 0.06, 0.004, M.rgb(), s * (W / 2 - 0.011), y0 + H / 2, D / 2 + 0.0145, 0);
    // Deckel: Staubfilter, Taster, USB
    boxC(root, W - 0.05, 0.003, D * 0.55, M.perforated(), 0, y0 + H + 0.001, -0.04, 0);
    cyl(root, 0.012, 0.012, 0.004, M.ledBlue(), W / 2 - 0.045, y0 + H + 0.001, D / 2 - 0.035, 24);
    cyl(root, 0.0105, 0.0105, 0.006, X.chrome(), W / 2 - 0.045, y0 + H + 0.003, D / 2 - 0.035, 24);
    for (let i = 0; i < 2; i++) boxC(root, 0.014, 0.004, 0.006, M.black(), -0.03 + i * 0.022, y0 + H + 0.001, D / 2 - 0.035, 0);
    // Glasseite mit Rahmen und Rändelschrauben
    boxC(root, 0.004, H - 0.03, D - 0.05, M.glass(), W / 2, y0 + H / 2, -0.005, 0);
    boxC(root, 0.008, 0.016, D - 0.02, sh, W / 2, y0 + H - 0.008, -0.005); boxC(root, 0.008, 0.016, D - 0.02, sh, W / 2, y0 + 0.008, -0.005);
    boxC(root, 0.008, H, 0.016, sh, W / 2, y0 + H / 2, -D / 2 + 0.008); boxC(root, 0.008, H, 0.014, sh, W / 2, y0 + H / 2, D / 2 - 0.017);
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) cyl(root, 0.007, 0.007, 0.01, X.chrome(), W / 2 + 0.006, y0 + H / 2 + a * (H / 2 - 0.03), -0.005 + b * (D / 2 - 0.04), 14, 'x');
    // Netzteil-Abdeckung innen
    box(root, W - 0.02, 0.1, D - 0.03, sh, 0.0, y0 + 0.012, 0.0);
    plane(root, 0.12, 0.03, labelMat('hwLogo', 256, 64, (c, w, h) => { c.fillStyle = '#16181c'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffb000'; c.font = 'bold 40px Arial'; c.textAlign = 'center'; c.fillText('HASHWERK', w / 2, 46); }, 0.8), W / 2 - 0.0096, y0 + 0.07, 0.08, 0, Math.PI / 2);
    // Rückseite: Lüfter, I/O-Blende, Slotbleche, Netzteil-Buchse
    const fb = fan(root, 0.055, { n: 7, square: true }); fb.position.set(0.02, y0 + H * 0.8, -D / 2 - 0.004); fb.rotation.y = Math.PI;
    const fr = fan(root, 0.06, { n: 7, square: true }); fr.position.set(0, y0 + H * 0.62, D / 2 - 0.02);
    const fr2 = fan(root, 0.06, { n: 7, square: true }); fr2.position.set(0, y0 + H * 0.34, D / 2 - 0.02);
    boxC(root, 0.05, 0.13, 0.003, X.chrome(), -W / 2 + 0.04, y0 + H * 0.78, -D / 2 - 0.0005, 0);
    if (!Q.lo) for (let i = 0; i < 6; i++) boxC(root, 0.014, 0.008, 0.004, i % 3 ? M.black() : M.cableBlue(), -W / 2 + 0.04, y0 + H * 0.72 + i * 0.018, -D / 2 - 0.002, 0);
    for (let i = 0; i < 5; i++) boxC(root, W * 0.55, 0.012, 0.003, X.chrome(), 0.0, y0 + H * 0.52 - i * 0.022, -D / 2 - 0.0005, 0);
    box(root, 0.03, 0.022, 0.006, M.black(), 0.05, y0 + 0.04, -D / 2 - 0.003);
    box(root, 0.008, 0.008, 0.004, M.ledBlue(), W / 2 - 0.04, y0 + H - 0.04, D / 2 + 0.014);
    if (parts?.mobo) mobo(root, 0.3, 0.24, -W / 2 + 0.012, y0 + H * 0.6, 0, true).rotation.set(0, 0, -Math.PI / 2);
    if (parts?.cpu) cpuCooler(root, -W / 2 + 0.016, y0 + H * 0.78, 0.0, 0).rotation.set(0, 0, -Math.PI / 2);
    if (parts?.psu) { psuBox(root, 0, y0 + 0.012, -0.1, 0.15, 0.086, 0.16); tube(root, [[-0.04, y0 + 0.11, 0.1], [-0.05, y0 + 0.16, 0.13], [-W / 2 + 0.03, y0 + 0.24, 0.12], [-W / 2 + 0.02, y0 + 0.3, 0.11]], 0.009, M.black(), 18, 8); }
    gpus.forEach((gp, i) => {
      const m = gpuModel(root, gp.look); m.position.set(-W / 2 + 0.014, y0 + H * 0.5 - i * 0.07, -D / 2 + 0.03);
      m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)));
      const gy = y0 + H * 0.5 - i * 0.07, zc = -D / 2 + 0.03 + gp.look.len - 0.04;
      if (parts?.psu) tube(root, [[0.05, y0 + 0.11, 0.05 - i * 0.02], [0.07, y0 + 0.16, 0.06], [0.06, gy - 0.01, zc + 0.02], [0.03, gy - 0.008, zc]], 0.005, M.black(), 16, 6);
    });
  } else if (type === 'crate') {
    // Milchkiste mit Griffmulden und Rand
    const S = 0.36, Hc = 0.28;
    box(root, S, 0.014, S, M.crate(), 0, 0, 0);
    for (const [x, z, w, d] of [[0, S / 2 - 0.006, S, 0.012], [0, -S / 2 + 0.006, S, 0.012], [S / 2 - 0.006, 0, 0.012, S], [-S / 2 + 0.006, 0, 0.012, S]]) box(root, w, Hc, d, M.crate(), x, 0, z);
    for (const [x, z, w, d] of [[0, S / 2 - 0.008, S + 0.004, 0.02], [0, -S / 2 + 0.008, S + 0.004, 0.02], [S / 2 - 0.008, 0, 0.02, S], [-S / 2 + 0.008, 0, 0.02, S]]) box(root, w, 0.022, d, mat('crateRim', { color: 0x2a6cc8, roughness: 0.55 }), x, Hc - 0.02, z);
    for (const s of [-1, 1]) box(root, 0.1, 0.03, 0.016, mat('crateHole', { color: 0x07152b, roughness: 1 }), 0, Hc - 0.06, s * (S / 2 - 0.006));
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) box(root, 0.03, 0.012, 0.03, mat('crateRim', { color: 0x2a6cc8, roughness: 0.55 }), a * (S / 2 - 0.02), -0.006, b * (S / 2 - 0.02));
    if (parts?.mobo) mobo(root, 0.3, 0.3, 0, Hc + 0.005, 0);
    if (parts?.cpu) cpuCooler(root, -0.05, Hc + 0.008, 0.02);
    if (parts?.psu) psuBox(root, 0.05, 0.014, 0.02, 0.15, 0.086, 0.16);
    // Holzlatte für die GPUs (angeschraubt)
    const by = Hc + 0.18;
    box(root, S + 0.06, 0.022, 0.032, X.wood(), 0, by, -0.1);
    for (const s of [-1, 1]) { box(root, 0.022, by - Hc + 0.02, 0.022, X.wood(), s * (S / 2 + 0.012), Hc - 0.02, -0.1); screw(root, s * (S / 2 + 0.012), by + 0.011, -0.084, 'z', 0.004); }
    gpus.forEach((gp, i) => { const n = Math.max(gpus.length, 1); const m = gpuModel(root, gp.look); const gx = -S / 2 + 0.04 + i * (S / Math.max(n - 0.5, 1)); m.position.set(gx, Hc + 0.06, 0.12); m.rotation.set(0, Math.PI / 2, 0); riser(root, gx + 0.02, Hc + 0.008, -0.02, gx, Hc + 0.06, 0.12 - gp.look.len * 0.36); });
  } else {
    // Open-Air-Rahmen aus Alu-Strebenprofil
    const def = PLACEABLE[type]; const Wd = def.size[0] - 0.08, D = 0.42, Hf = 0.52;
    const pr = X.profile();
    for (const x of [-Wd / 2, Wd / 2]) for (const z of [-D / 2, D / 2]) { beam(root, Hf, 'y', x, Hf / 2, z, pr); if (!Q.lo) cyl(root, 0.014, 0.016, 0.012, M.rubber(), x, -0.004, z, 14); }
    for (const y of [0.12, Hf - 0.0125]) { beam(root, Wd, 'x', 0, y, D / 2, pr); beam(root, Wd, 'x', 0, y, -D / 2, pr); }
    for (const x of [-Wd / 2, Wd / 2]) beam(root, D, 'z', x, 0.12, 0, pr);
    beam(root, Wd, 'x', 0, Hf - 0.0125, 0, pr);
    if (!Q.lo) for (const x of [-Wd / 2, Wd / 2]) for (const z of [-D / 2, D / 2]) for (const y of [0.12, Hf - 0.0125]) box(root, 0.03, 0.03, 0.03, M.darkMetal(), x, y - 0.015, z, 0, 0.004);
    box(root, Wd, 0.005, D, M.aluDark(), 0, 0.133, 0);
    // Einschalter
    box(root, 0.02, 0.012, 0.014, M.black(), -Wd / 2 + 0.05, 0.138, D / 2 - 0.02); cyl(root, 0.004, 0.004, 0.006, M.ledRed(), -Wd / 2 + 0.05, 0.153, D / 2 - 0.02, 10);
    if (parts?.mobo) mobo(root, 0.3, 0.25, -Wd / 2 + 0.2, 0.14, -0.02);
    if (parts?.cpu) cpuCooler(root, -Wd / 2 + 0.15, 0.142, -0.02);
    const psus = [];
    if (parts?.psu) { psuBox(root, Wd / 2 - 0.12, 0.136, -0.04); psus.push([Wd / 2 - 0.12, 0.136 + 0.09, 0.02]); if (def.maxGpu >= 8) { psuBox(root, Wd / 2 - 0.3, 0.136, -0.04); psus.push([Wd / 2 - 0.3, 0.136 + 0.09, 0.02]); } }
    const n = Math.max(1, def.maxGpu), sp = Wd / n;
    gpus.forEach((gp, i) => {
      const gx = -Wd / 2 + sp * (i + 0.5) - 0.02, L = gp.look.len;
      const m = gpuModel(root, gp.look); m.position.set(gx, Hf - 0.01, L / 2); m.rotation.set(0, Math.PI / 2, 0);
      riser(root, gx + 0.02, 0.136, 0.1, gx, Hf - 0.01, L / 2 - L * 0.36);
      const p = psus[i % Math.max(1, psus.length)];
      if (p) tube(root, [p, [p[0] + (gx - p[0]) * 0.3, Hf + 0.06, 0.05], [gx, Hf + 0.17, -L / 2 + 0.06], [gx + 0.004, Hf + 0.105, -L / 2 + 0.045]], 0.0035, M.black(), 18, 5);
    });
  }
  return root;
}
// Alu-Strebenprofil 20×20 mit Nuten
function profileGeo(len) {
  return cached(`prof|${len}`, () => {
    if (Q.lo) return new THREE.BoxGeometry(0.025, 0.025, len);
    const s = 0.0125, nW = 0.0035, nD = 0.004, c = 0.002, sh = new THREE.Shape();
    const pts = [];
    for (let k = 0; k < 4; k++) {
      const rot = (p) => { const a = (k * Math.PI) / 2, [x, y] = p; return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]; };
      for (const p of [[s, -s + c], [s, -nW], [s - nD, -nW], [s - nD, nW], [s, nW], [s, s - c]]) pts.push(rot(p));
    }
    sh.moveTo(...pts[0]); for (const p of pts.slice(1)) sh.lineTo(...p); sh.lineTo(...pts[0]);
    const g = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false }); g.translate(0, 0, -len / 2); return g;
  });
}
function beam(parent, len, axis, x, y, z, material) {
  const m = new THREE.Mesh(profileGeo(len), material); m.position.set(x, y, z);
  if (axis === 'x') m.rotation.y = Math.PI / 2; if (axis === 'y') m.rotation.x = Math.PI / 2;
  parent.add(m); return m;
}

// ---------- Einzelgeräte ----------
export function buildDevice(look, parent = new THREE.Group()) {
  const g = new THREE.Group(); parent.add(g);
  if (look === 'asic' || look === 'whirl') {
    const wh = look === 'whirl';
    const W = wh ? 0.15 : 0.16, H = wh ? 0.22 : 0.195, D = wh ? 0.42 : 0.36;
    const body = wh ? mat('whirlBody', { color: 0x3a3f47, roughness: 0.4, metalness: 0.7 }) : M.alu();
    box(g, W, H, D, body, 0, 0, 0);
    if (!Q.lo) for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) boxC(g, 0.002, 0.005, D * 0.84, X.groove(), sx * (W / 2 + 0.0004), H * (0.14 + i * 0.145), 0, 0);
    const r = W / 2.2, s = r * 2.15, fy = H / 2;
    for (const zs of wh ? [1, -1] : [1, -1]) {
      const zc = zs * (D / 2 + 0.013);
      if (!(wh && zs < 0)) {
        const f = fan(g, r, { n: 7, square: true, grill: true, depth: 0.026 }); f.position.set(0, fy, zc); if (zs < 0) f.rotation.y = Math.PI;
        boxC(g, W * 0.94, H * 0.94, 0.002, M.fins(), 0, H / 2, zs * (D / 2 + 0.0012), 0);
        const fill = (H - s) / 2; if (fill > 0.002) { boxC(g, W, fill, 0.026, M.black(), 0, H - fill / 2, zc); boxC(g, W, fill, 0.026, M.black(), 0, fill / 2, zc); }
      } else {
        // Whirl: Rückseite mit Netzteil-Anschlüssen
        boxC(g, W, H, 0.02, body, 0, H / 2, zs * (D / 2 + 0.01));
        box(g, 0.03, 0.024, 0.006, M.black(), -0.03, H * 0.2, zs * (D / 2 + 0.022)); box(g, 0.03, 0.024, 0.006, M.black(), 0.03, H * 0.2, zs * (D / 2 + 0.022));
        finStack(g, W * 0.8, H * 0.4, 0.006, 16, M.alu(), 0, H * 0.65, zs * (D / 2 + 0.023), 'x');
      }
    }
    const back = -(D / 2 + 0.027);
    box(g, 0.006, 0.006, 0.004, M.ledGreen(), -0.04, H - 0.012, back);
    box(g, 0.006, 0.006, 0.004, M.ledRed(), -0.028, H - 0.012, back);
    box(g, 0.016, 0.012, 0.004, M.ledAmber(), 0.04, H - 0.014, back);
    if (!wh) {
      // Netzteil oben, Stromkabel zu den Hashboards
      box(g, W * 0.86, 0.064, D * 0.62, M.darkMetal(), 0, H, -0.03);
      if (!Q.lo) for (let i = 0; i < 5; i++) boxC(g, W * 0.86 + 0.001, 0.003, 0.006, X.groove(), 0, H + 0.012 + i * 0.01, -0.03 + D * 0.31 - 0.012, 0);
      const pf = fan(g, 0.026, { n: 7, square: true, grill: true, depth: 0.01 }); pf.position.set(0, H + 0.032, -0.03 - D * 0.31 - 0.005); pf.rotation.y = Math.PI;
      plane(g, W * 0.6, D * 0.3, stickerMat('apwLbl', 'SWARM PSU', 'APW · 220-277V~|Output 12V'), 0, H + 0.0645, 0.0, -Math.PI / 2);
      for (const x of [-0.04, 0, 0.04]) { box(g, 0.016, 0.01, 0.014, M.black(), x, H, 0.145); tube(g, [[x * 0.6, H + 0.03, 0.08], [x * 0.8, H + 0.06, 0.115], [x, H + 0.012, 0.145]], 0.0045, M.black(), 10, 6); }
      plane(g, D * 0.42, H * 0.42, stickerMat('asicLbl', 'SWARM MINER', 'SHA-256 · 1x Ethernet|Made in Hashland'), W / 2 + 0.0012, H * 0.55, -0.06, 0, Math.PI / 2);
      box(g, 0.016, 0.012, 0.006, M.black(), 0.02, H - 0.016, back);
    } else {
      // Tragegriff + Typenschild
      if (!Q.lo) { rod(g, [-0.035, H, -0.1], [-0.035, H + 0.025, -0.1], 0.004, M.black()); rod(g, [-0.035, H + 0.025, -0.1], [-0.035, H + 0.025, 0.1], 0.004, M.black()); rod(g, [-0.035, H + 0.025, 0.1], [-0.035, H, 0.1], 0.004, M.black()); }
      plane(g, D * 0.42, H * 0.42, stickerMat('whirlLbl', 'WHIRL MINER', 'SHA-256 · 3400W|IP20 · Do not cover', '#3a6fd6'), W / 2 + 0.0012, H * 0.55, 0.0, 0, Math.PI / 2);
    }
  } else if (look === 'asic_old') {
    const W = 0.2, H = 0.2, D = 0.3;
    for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) box(g, 0.012, H, 0.012, M.alu(), x, 0, z);
    box(g, W + 0.012, 0.01, D + 0.012, M.alu(), 0, 0, 0); box(g, W + 0.012, 0.01, D + 0.012, M.alu(), 0, H - 0.01, 0);
    for (let i = 0; i < 4; i++) {
      const y = 0.03 + i * 0.042;
      boxC(g, W - 0.02, 0.0025, D - 0.02, M.pcbBlue(), 0, y, 0);
      finStack(g, W * 0.7, 0.022, D * 0.6, 12, M.alu(), 0, y + 0.0125, 0, 'x');
      box(g, 0.014, 0.008, 0.02, M.black(), W / 2 - 0.03, y + 0.001, -D / 2 + 0.03);
    }
    const f = fan(g, 0.06, { n: 7, square: true, grill: true, depth: 0.025 }); f.position.set(0, H / 2, D / 2 + 0.014);
    box(g, 0.08, 0.004, 0.06, M.pcbGreen(), 0, H, -0.08); box(g, 0.016, 0.012, 0.018, X.chrome(), 0.02, H + 0.004, -0.1);
    box(g, 0.006, 0.006, 0.004, M.ledGreen2(), 0.07, H - 0.03, D / 2 + 0.028);
    tube(g, [[-0.06, H + 0.004, -0.04], [-0.08, H + 0.03, 0.0], [-0.09, H - 0.02, 0.05]], 0.004, M.black(), 10, 6);
  } else if (look === 'hydro') {
    const W = 0.44, H = 0.09, D = 0.56;
    box(g, W, H, D, M.alu(), 0, 0, 0);
    if (!Q.lo) for (let i = 0; i < 8; i++) boxC(g, W * 0.86, 0.002, 0.006, X.groove(), 0, H + 0.0005, -D * 0.38 + i * D * 0.1, 0);
    plane(g, 0.16, 0.08, stickerMat('hydLbl', 'SWARM HYDRO', 'Kühlwasser 40-55°C|max. 8 bar'), W * 0.25, H + 0.0012, 0.12, -Math.PI / 2);
    for (const [x, m] of [[-0.1, M.hose()], [0.1, M.hoseRed()]]) {
      cyl(g, 0.016, 0.016, 0.03, X.brass(), x, H / 2, -D / 2 - 0.015, 16, 'z');
      tube(g, [[x, H / 2, -D / 2 - 0.03], [x, H / 2, -D / 2 - 0.1], [x * 1.2, H * 0.1, -D / 2 - 0.16], [x * 1.3, -0.1, -D / 2 - 0.16]], 0.012, m, 14, 8);
    }
    box(g, 0.006, 0.006, 0.004, M.ledGreen(), 0.18, H * 0.6, D / 2 + 0.003);
    box(g, 0.016, 0.012, 0.006, M.black(), 0.14, H * 0.5, D / 2 + 0.002);
  } else if (look === 'fpga') {
    box(g, 0.2, 0.06, 0.16, X.acrylic(), 0, 0, 0);
    boxC(g, 0.18, 0.003, 0.14, M.pcbGreen(), 0, 0.062, 0, 0);
    for (let i = 0; i < 4; i++) { box(g, 0.03, 0.004, 0.03, M.black(), -0.06 + i * 0.04, 0.0635, -0.03); finStack(g, 0.026, 0.008, 0.026, 7, M.alu(), -0.06 + i * 0.04, 0.0715, -0.03, 'x'); }
    for (let i = 0; i < 6; i++) cyl(g, 0.0035, 0.0035, 0.008, X.cap(), -0.07 + i * 0.012, 0.067, 0.04, 10);
    const f = fan(g, 0.025, { n: 7, square: true }); f.position.set(0.045, 0.072, 0.035); f.rotation.x = -Math.PI / 2;
    box(g, 0.012, 0.008, 0.016, X.chrome(), -0.095, 0.0635, 0.03);
    box(g, 0.005, 0.005, 0.005, M.ledGreen2(), 0.07, 0.066, 0.06);
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) screw(g, a * 0.09, 0.06, b * 0.07, 'y', 0.004);
  } else if (look === 'usb') {
    box(g, 0.3, 0.024, 0.06, X.caseBlack(), 0, 0, 0);
    for (let i = 0; i < 10; i++) {
      const x = -0.135 + i * 0.03;
      box(g, 0.012, 0.012, 0.005, X.chrome(), x, 0.024, 0.0);
      box(g, 0.018, 0.05, 0.009, M.aluDark(), x, 0.034, 0.0);
      finStack(g, 0.018, 0.034, 0.003, 6, M.alu(), x, 0.06, 0.0055, 'y');
      box(g, 0.01, 0.004, 0.0095, M.ledBlue(), x, 0.084, 0);
    }
    tube(g, [[0.15, 0.012, 0], [0.2, 0.01, 0.02], [0.24, 0.004, 0.08], [0.3, 0.004, 0.1]], 0.004, M.cable(), 12, 6);
  }
  return g;
}

// ---------- Halter ----------
export function buildHolder(type, items = []) {
  const root = new THREE.Group();
  if (type === 'shelf') {
    const W = 0.96, D = 0.46, H = 1.8, up = X.blueUp();
    for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) { box(root, 0.032, H, 0.032, up, x, 0, z); if (!Q.lo) box(root, 0.05, 0.008, 0.05, M.darkMetal(), x, 0, z); }
    const levels = [0.08, 0.52, 0.96, 1.4];
    for (const y of levels) { box(root, W, 0.022, D, mat('shelfBoard', { color: 0xc8b896, roughness: 0.8 }), 0, y, 0); box(root, W + 0.03, 0.04, 0.012, X.orange(), 0, y - 0.015, D / 2 + 0.012); box(root, W + 0.03, 0.04, 0.012, X.orange(), 0, y - 0.015, -D / 2 - 0.012); }
    if (!Q.lo) { rod(root, [-W / 2, 0.1, -D / 2], [W / 2, 1.38, -D / 2], 0.004, M.steel()); rod(root, [W / 2, 0.1, -D / 2], [-W / 2, 1.38, -D / 2], 0.004, M.steel()); }
    items.forEach((it, i) => { const d = PLACEABLE[it.id]; const lv = Math.floor(i / 2), side = i % 2; const m = buildDevice(d.look, root); m.position.set(side ? 0.24 : -0.24, levels[lv] + 0.022, 0); });
  } else if (type === 'rack') {
    // Offenes Mining-Rack: Pfosten mit Lochraster, Böden, PDU, Switch, Kabel
    const W = 0.62, D = 1.1, H = 2.0, rk = X.rack();
    box(root, W, 0.06, D, rk, 0, 0.02, 0);
    if (!Q.lo) for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { cyl(root, 0.022, 0.022, 0.02, M.rubber(), a * (W / 2 - 0.05), 0.012, b * (D / 2 - 0.06), 14, 'x'); box(root, 0.02, 0.012, 0.03, M.steel(), a * (W / 2 - 0.05), 0.01, b * (D / 2 - 0.06)); }
    box(root, W, 0.03, D, rk, 0, H - 0.03, 0);
    for (const x of [-W / 2 + 0.018, W / 2 - 0.018]) for (const z of [-D / 2 + 0.02, D / 2 - 0.02]) { box(root, 0.036, H, 0.04, rk, x, 0, z); boxC(root, 0.002, H - 0.12, 0.022, M.perforated(), x + (x > 0 ? -0.019 : 0.019), H / 2, z, 0); }
    for (const x of [-W / 2 + 0.018, W / 2 - 0.018]) for (const y of [0.4, 1.2]) box(root, 0.03, 0.03, D - 0.06, rk, x, y, 0);
    const levels = [0.12, 0.6, 1.08, 1.56];
    for (const y of levels) { box(root, W - 0.05, 0.012, D - 0.05, M.perforated(), 0, y - 0.012, 0); box(root, W - 0.04, 0.03, 0.02, rk, 0, y - 0.03, D / 2 - 0.03); }
    // Switch oben
    box(root, W - 0.08, 0.044, 0.3, X.caseBlack(), 0, H - 0.075, -0.33);
    if (!Q.lo) for (let i = 0; i < 12; i++) { box(root, 0.014, 0.012, 0.004, M.black(), -0.2 + i * 0.036, H - 0.06, -0.482); box(root, 0.004, 0.003, 0.002, i % 3 ? M.ledGreen() : M.ledAmber(), -0.2 + i * 0.036, H - 0.045, -0.484); }
    // PDU an der Rückseite
    box(root, 0.06, H - 0.3, 0.05, X.caseBlack(), W / 2 - 0.07, 0.15, -D / 2 + 0.06);
    if (!Q.lo) for (let i = 0; i < 12; i++) box(root, 0.04, 0.03, 0.004, M.black(), W / 2 - 0.07, 0.25 + i * 0.13, -D / 2 + 0.086);
    box(root, 0.04, 0.02, 0.004, M.ledBlue(), W / 2 - 0.07, 0.18, -D / 2 + 0.086);
    items.forEach((it, i) => {
      const d = PLACEABLE[it.id]; const lv = Math.floor(i / 3), col = i % 3; if (lv > 3) return;
      const m = buildDevice(d.look, root); const x = -0.18 + col * 0.18;
      if (d.look === 'hydro') m.position.set(0, levels[lv] + col * 0.12, 0); else m.position.set(x, levels[lv], 0);
      box(root, 0.025, 0.012, 0.006, i % 2 ? M.ledGreen() : M.ledGreen2(), x, levels[lv] - 0.024, D / 2 - 0.018);
      if (!Q.lo && d.look !== 'hydro') {
        tube(root, [[x, levels[lv] + 0.15, -0.21], [x + 0.03, levels[lv] + 0.2, -0.32], [W / 2 - 0.1, levels[lv] + 0.12, -D / 2 + 0.12], [W / 2 - 0.07, 0.26 + ((lv * 3 + col) % 12) * 0.13, -D / 2 + 0.09]], 0.005, M.black(), 14, 5);
        tube(root, [[x + 0.02, levels[lv] + 0.18, -0.21], [x * 0.8, levels[lv] + 0.26, -0.4], [-0.2 + ((lv * 3 + col) % 12) * 0.036, H - 0.25, -0.5], [-0.2 + ((lv * 3 + col) % 12) * 0.036, H - 0.055, -0.49]], 0.0025, (lv + col) % 2 ? M.cableBlue() : M.cableYellow(), 16, 5);
      }
    });
    if (items.length) box(root, 0.08, 0.03, 0.006, M.ledBlue(), 0.2, H - 0.25, D / 2 + 0.012);
  } else if (type === 'container') {
    const L = 12.2, W = 2.44, H = 2.9;
    const shell = mat('containerShell', { color: 0x2f6f73, roughness: 0.55, metalness: 0.5 });
    const corr = mat('containerCorr', { color: 0x2b6669, roughness: 0.5, metalness: 0.5 });
    box(root, L, H, W, shell, 0, 0.1, 0);
    // Wellblech-Rippen
    for (let x = -L / 2 + 0.2; x < L / 2 - 0.1; x += 0.3) { box(root, 0.12, H - 0.25, 0.04, corr, x, 0.22, W / 2, 0, 0); box(root, 0.12, H - 0.25, 0.04, corr, x, 0.22, -W / 2, 0, 0); }
    for (let z = -W / 2 + 0.25; z < W / 2 - 0.15; z += 0.3) box(root, 0.04, H - 0.25, 0.12, corr, -L / 2, 0.22, z, 0, 0);
    // Rahmen + Eckbeschläge mit Langlöchern
    for (const z of [-W / 2, W / 2]) { box(root, L, 0.16, 0.12, M.darkMetal(), 0, 0.02, z); box(root, L, 0.12, 0.12, M.darkMetal(), 0, H - 0.04, z); }
    for (const x of [-L / 2 + 0.1, L / 2 - 0.1]) for (const z of [-W / 2 + 0.08, W / 2 - 0.08]) for (const y of [0, H - 0.08]) {
      box(root, 0.2, 0.18, 0.2, M.darkMetal(), x, y, z);
      if (!Q.lo) box(root, 0.09, 0.05, 0.01, M.black(), x, y + 0.065, z + (z > 0 ? 0.1 : -0.1));
    }
    const hydro = items.some((it) => PLACEABLE[it.id]?.hydro);
    if (!hydro) for (let i = 0; i < 10; i++) { const f = fan(root, 0.28, { n: 7, square: true, frame: M.darkMetal(), depth: 0.06, grill: 'dark' }); f.position.set(-L / 2 + 0.9 + i * 1.15, 1.6, W / 2 + 0.06); }
    else {
      // Trockenkühler auf dem Dach
      box(root, L * 0.8, 0.6, W * 0.9, M.darkMetal(), 0, H + 0.1, 0);
      finStack(root, L * 0.78, 0.4, 0.02, 120, M.alu(), 0, H + 0.4, W * 0.45 + 0.012, 'x');
      for (let i = 0; i < 6; i++) { const f = fan(root, 0.38, { n: 7, frame: M.black(), depth: 0.06, grill: 'dark' }); f.position.set(-L * 0.33 + i * (L * 0.66 / 5), H + 0.72, 0); f.rotation.x = -Math.PI / 2; }
      for (const [dx, m] of [[0.6, M.hose()], [0.9, M.hoseRed()]]) tube(root, [[L / 2 - dx, 0.3, W / 2 + 0.1], [L / 2 - dx, H * 0.6, W / 2 + 0.16], [L / 2 - dx, H + 0.2, W / 2 + 0.1], [L / 2 - dx, H + 0.3, W * 0.3]], 0.08, m, 16, 10);
    }
    // Doppeltür mit Verriegelungsstangen
    for (const zz of [-W / 4, W / 4]) {
      box(root, 0.05, H - 0.3, W / 2 - 0.06, M.darkMetal(), L / 2 + 0.03, 0.2, zz);
      for (const dz of [-0.3, 0.3]) {
        cyl(root, 0.022, 0.022, H - 0.4, M.steel(), L / 2 + 0.08, H / 2 + 0.05, zz + dz, 12);
        if (!Q.lo) { box(root, 0.04, 0.06, 0.06, M.steel(), L / 2 + 0.07, 0.25, zz + dz); box(root, 0.04, 0.06, 0.06, M.steel(), L / 2 + 0.07, H - 0.2, zz + dz); }
        box(root, 0.04, 0.03, 0.3, X.orange(), L / 2 + 0.11, 1.05, zz + dz + 0.13);
      }
    }
    // Status-Leiste, Typenschild, Treppe
    box(root, L * 0.9, 0.06, 0.02, items.length ? M.ledGreen() : M.ledAmber(), 0, H - 0.25, W / 2 + 0.05);
    plane(root, 2.0, 0.5, labelMat('contLbl', 512, 128, (c, w, h) => { c.fillStyle = '#f2f2f2'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffb000'; c.fillRect(0, 0, 18, h); c.fillStyle = '#1b1d22'; c.font = 'bold 64px Arial'; c.fillText('HASHWERK', 40, 70); c.font = '26px Arial'; c.fillText('HWKU 204471 · 45G1 · MAX GROSS 30.480 KG', 40, 110); }), L / 2 - 1.6, H - 0.5, -W / 2 - 0.022, 0, Math.PI);
    for (let i = 0; i < 3; i++) box(root, 0.3, 0.06, 0.9, M.perforated(), L / 2 + 0.3 + i * 0.25, i * 0.18 + 0.12, 0);
    for (const s of [-1, 1]) rod(root, [L / 2 + 0.25, 0, s * 0.45], [L / 2 + 0.9, 0.5, s * 0.45], 0.02, M.steel());
  }
  return root;
}

// ---------- Kühlung & Deko ----------
export function buildCooling(type) {
  const root = new THREE.Group();
  if (type === 'fan') {
    // Standventilator: gedrehter Fuß, Teleskop-Stange, Motorgehäuse, Drahtkorb
    lathe(root, [[0, 0], [0.19, 0], [0.19, 0.012], [0.17, 0.03], [0.06, 0.05], [0.03, 0.06], [0, 0.06]], M.white(), 0, 0, 0, 40);
    for (let i = 0; i < 3; i++) box(root, 0.022, 0.008, 0.016, i === 1 ? M.ledBlue() : M.offwhite(), -0.03 + i * 0.03, 0.04, 0.12, 0, 0.003);
    cyl(root, 0.016, 0.016, 0.6, M.white(), 0, 0.36, 0, 16);
    cyl(root, 0.011, 0.011, 0.42, X.chrome(), 0, 0.84, 0, 14);
    cyl(root, 0.02, 0.02, 0.03, M.offwhite(), 0, 0.66, 0, 16);
    const head = new THREE.Group(); head.position.set(0, 1.05, 0.04); root.add(head);
    const mot = lathe(head, [[0, -0.11], [0.05, -0.1], [0.065, -0.06], [0.065, -0.02], [0.04, 0], [0, 0]], M.white(), 0, 0, 0, 28); mot.rotation.x = Math.PI / 2; mot.position.z = -0.01;
    box(head, 0.03, 0.06, 0.04, M.white(), 0, -0.09, -0.06);
    head.add(new THREE.Mesh(ringGeo(0.2, 0.215, 0.05), M.white()));
    addGrill(head, 0.205, 0.03, M.white()); addGrill(head, 0.205, -0.03, M.white());
    fan(head, 0.18, { n: 5, blade: M.fanBladeWhite(), frame: M.white(), depth: 0.025, frameless: true, wide: 1.5, hub: M.offwhite() });
  } else if (type === 'mobileac') {
    box(root, 0.45, 0.76, 0.36, M.white(), 0, 0.03, 0, 0, 0.04);
    for (let i = 0; i < 6; i++) { const s = box(root, 0.36, 0.008, 0.03, M.offwhite(), 0, 0.52 + i * 0.035, 0.175, 0, 0.003); s.rotation.x = -0.4; }
    box(root, 0.38, 0.24, 0.01, mat('acPanel', { color: 0xd5d8dc, roughness: 0.5 }), 0, 0.15, 0.18, 0, 0.004);
    box(root, 0.14, 0.05, 0.006, M.screen(), 0.08, 0.68, 0.18, 0, 0.002);
    for (let i = 0; i < 3; i++) cyl(root, 0.009, 0.009, 0.006, M.offwhite(), -0.12 + i * 0.03, 0.705, 0.182, 14, 'z');
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { cyl(root, 0.025, 0.025, 0.02, M.rubber(), a * 0.17, 0.025, b * 0.13, 16, 'x'); box(root, 0.03, 0.01, 0.04, M.offwhite(), a * 0.17, 0.045, b * 0.13); }
    const hm = mat('hoseGrey', { color: 0xbfc3c7, roughness: 0.7 });
    cyl(root, 0.075, 0.075, 0.04, hm, 0, 0.6, -0.2, 20, 'z');
    tube(root, [[0, 0.6, -0.2], [0, 0.66, -0.35], [0, 0.95, -0.42], [0, 1.25, -0.45]], 0.065, hm, 24, 14);
    if (!Q.lo) { const cv = new THREE.CatmullRomCurve3([[0, 0.6, -0.2], [0, 0.66, -0.35], [0, 0.95, -0.42], [0, 1.25, -0.45]].map(V3)); for (let i = 1; i < 16; i++) { const k = i / 16, t = new THREE.Mesh(torusGeo(0.066, 0.006, 24, 4), hm); t.position.copy(cv.getPointAt(k)); t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), cv.getTangentAt(k)); root.add(t); } }
  } else if (type === 'splitac') {
    box(root, 0.9, 0.08, 0.36, M.offwhite(), 0, 0, 0, 0, 0.02);
    box(root, 0.9, 1.62, 0.36, M.white(), 0, 0.08, 0, 0, 0.05);
    for (let i = 0; i < 12; i++) { const s = box(root, 0.78, 0.01, 0.04, M.offwhite(), 0, 0.98 + i * 0.045, 0.175, 0, 0.004); s.rotation.x = -0.35; }
    box(root, 0.7, 0.55, 0.012, mat('acGrid', { map: M.perforated().map, color: 0xffffff, roughness: 0.6 }), 0, 0.2, 0.18, 0, 0.004);
    box(root, 0.2, 0.07, 0.006, M.screen(), 0, 0.82, 0.181, 0, 0.003);
    box(root, 0.02, 0.02, 0.006, M.ledGreen(), 0.16, 0.84, 0.182, 0, 0.002);
  } else if (type === 'indfan') {
    const fr = M.darkMetal();
    box(root, 0.95, 0.06, 0.45, fr, 0, 0, 0);
    for (const s of [-1, 1]) { box(root, 0.06, 0.6, 0.08, fr, s * 0.47, 0.04, 0); cyl(root, 0.03, 0.03, 0.06, M.steel(), s * 0.45, 0.55, 0, 16, 'x'); for (const z of [-0.18, 0.18]) cyl(root, 0.035, 0.035, 0.03, M.rubber(), s * 0.4, 0.015, z, 16); }
    const f = fan(root, 0.42, { n: 5, square: true, frame: fr, depth: 0.3, grill: 'dark', wide: 1.3, blade: mat('indBlade', { color: 0x8d949c, roughness: 0.4, metalness: 0.8, side: THREE.DoubleSide }) });
    f.position.set(0, 0.55, 0);
    addGrill(f, 0.43, -0.152, X.wireDark());
    box(root, 0.12, 0.08, 0.06, M.black(), 0.3, 0.06, 0.2); cyl(root, 0.02, 0.02, 0.02, M.ledRed(), 0.3, 0.1, 0.235, 14, 'z');
  } else if (type === 'evap') {
    const body = mat('evapBody', { color: 0xd9dcd2, roughness: 0.6 }), pad = mat('evapPad', { color: 0xc7a86a, roughness: 0.9 });
    box(root, 1.4, 1.5, 0.9, body, 0, 0.06, 0, 0, 0.05);
    for (const [x, z] of [[0, 0.455], [0, -0.455]]) { box(root, 1.2, 1.1, 0.02, pad, x, 0.24, z, 0, 0.005); if (!Q.lo) for (let i = 0; i < 9; i++) box(root, 0.012, 1.1, 0.025, body, -0.56 + i * 0.14, 0.24, z, 0, 0.004); }
    box(root, 0.02, 1.1, 0.7, pad, 0.705, 0.24, 0, 0, 0.005);
    const f = fan(root, 0.4, { n: 6, frame: M.darkMetal(), depth: 0.1, grill: 'dark' }); f.position.set(0, 1.6, 0); f.rotation.x = -Math.PI / 2;
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) cyl(root, 0.035, 0.035, 0.03, M.rubber(), a * 0.62, 0.035, b * 0.38, 16, 'x');
    box(root, 0.06, 0.3, 0.01, mat('evapGauge', { color: 0x6fb7e8, roughness: 0.2, transparent: true, opacity: 0.7 }), -0.6, 0.3, 0.462, 0, 0.003);
  } else if (type === 'crac') {
    const body = mat('cracBody', { color: 0xcfd3d8, roughness: 0.45, metalness: 0.3 });
    box(root, 1.9, 0.08, 0.9, M.darkMetal(), 0, 0, 0, 0, 0.01);
    box(root, 1.9, 1.92, 0.9, body, 0, 0.08, 0, 0, 0.02);
    for (let i = 0; i < 3; i++) {
      const x = -0.62 + i * 0.62;
      box(root, 0.58, 1.5, 0.012, M.perforated(), x, 0.16, 0.452, 0, 0.004);
      box(root, 0.02, 0.18, 0.03, X.chrome(), x + 0.24, 0.9, 0.465, 0, 0.006);
    }
    box(root, 0.3, 0.18, 0.01, M.screen(), 0.6, 1.72, 0.456, 0, 0.004);
    box(root, 0.04, 0.04, 0.01, M.ledGreen(), -0.7, 1.75, 0.456, 0, 0.004);
    plane(root, 0.36, 0.12, stickerMat('cracLbl', 'POLARIS CRAC', 'Kälteleistung 45 kW|R-32 · 400V 3~', '#2a6fd6'), -0.3, 1.78, 0.457);
  }
  return root;
}
function leafGeo(len, wid) {
  return cached(`leaf|${len}|${wid}`, () => {
    const g = new THREE.PlaneGeometry(wid, len, 2, Q.lo ? 3 : 8); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i) + len / 2, t = y / len; const taper = Math.sin(Math.PI * Math.min(1, 0.08 + t * 0.95)) * 0.9 + 0.1; p.setXYZ(i, x * taper, y * (1 - t * 0.15), -t * t * len * 0.45 + Math.abs(x * taper) * 0.35); }
    g.computeVertexNormals(); return g;
  });
}
export function buildDecor(type) {
  const root = new THREE.Group();
  if (type === 'plant') {
    lathe(root, [[0, 0], [0.095, 0], [0.1, 0.01], [0.128, 0.23], [0.142, 0.235], [0.142, 0.27], [0.12, 0.27], [0.116, 0.24], [0, 0.24]], X.terracotta(), 0, 0, 0, 32);
    disc(root, 0.117, X.soil(), 0, 0.245, 0, 'y');
    for (let i = 0; i < 16; i++) {
      const a = i * 2.39996, big = i < 10;
      const l = new THREE.Mesh(leafGeo(big ? 0.5 + (i % 3) * 0.08 : 0.34, big ? 0.075 : 0.06), i % 3 ? X.leaf() : X.leafDark());
      l.position.set(Math.cos(a) * 0.03, 0.24, Math.sin(a) * 0.03); l.rotation.order = 'YXZ'; l.rotation.set(-(0.2 + (i % 4) * 0.14), -a - Math.PI / 2, 0); root.add(l);
    }
  } else if (type === 'lamp') {
    lathe(root, [[0, 0], [0.15, 0], [0.15, 0.012], [0.12, 0.03], [0.02, 0.04], [0, 0.04]], M.black(), 0, 0, 0, 36);
    cyl(root, 0.011, 0.011, 1.4, M.black(), 0, 0.74, 0, 12);
    cyl(root, 0.02, 0.02, 0.05, X.brass(), 0, 1.44, 0, 16);
    sph(root, 0.04, M.ledWhite(), 0, 1.5, 0, 1, 1.3, 1);
    lathe(root, [[0.205, 1.42], [0.2, 1.43], [0.125, 1.67], [0.12, 1.68]], M.lampShade(), 0, 0, 0, 40);
    const tr = new THREE.Mesh(torusGeo(0.205, 0.005, 40, 5), X.brass()); tr.rotation.x = Math.PI / 2; tr.position.y = 1.42; root.add(tr);
  } else if (type === 'sofa') {
    const fab = mat('sofaFab', { color: 0x3a3f5c, roughness: 0.95 }), cush = mat('cushion', { color: 0x5560a0, roughness: 0.95 });
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) cyl(root, 0.022, 0.016, 0.08, mat('sofaFoot', { color: 0x6b4a2b, roughness: 0.6 }), a * 0.62, 0.04, b * 0.34, 12);
    soft(root, 1.4, 0.26, 0.85, fab, 0, 0.08, 0, 0.06);
    soft(root, 1.4, 0.5, 0.22, fab, 0, 0.28, -0.32, 0.08);
    for (const s of [-1, 1]) soft(root, 0.2, 0.32, 0.85, fab, s * 0.6, 0.28, 0, 0.08);
    for (const s of [-1, 1]) { soft(root, 0.5, 0.14, 0.62, cush, s * 0.26, 0.33, 0.06, 0.06); const b = soft(root, 0.5, 0.42, 0.14, cush, s * 0.26, 0.42, -0.2, 0.065); b.rotation.x = -0.18; }
    const p = soft(root, 0.3, 0.3, 0.1, mat('pillowYel', { color: 0xe8b23c, roughness: 0.95 }), 0.42, 0.45, -0.1, 0.045); p.rotation.set(-0.3, -0.3, 0.15);
  } else if (type === 'neon') {
    box(root, 0.5, 0.04, 0.3, M.black(), 0, 0, 0, 0, 0.012); cyl(root, 0.02, 0.02, 0.88, M.black(), 0, 0.46, 0, 12);
    const t = labelMat('neonHodl', 512, 220, (g, w, h) => { g.fillStyle = '#08020a'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff3df0'; g.shadowBlur = 30; g.strokeStyle = '#ff9bf7'; g.lineWidth = 10; g.font = 'bold 150px Arial'; g.strokeText('HODL', w / 2, h / 2); g.shadowBlur = 0; g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeText('HODL', w / 2, h / 2); }, 2.2);
    plane(root, 0.9, 0.38, t, 0, 1.12, 0.012);
    box(root, 0.94, 0.42, 0.024, X.acrylic(), 0, 0.91, 0, 0, 0.01);
    box(root, 0.96, 0.44, 0.012, M.black(), 0, 0.9, -0.016, 0, 0.005);
  } else if (type === 'aquarium') {
    const cab = mat('aqCab', { color: 0x2b2b2b, roughness: 0.6 });
    box(root, 0.95, 0.7, 0.42, cab, 0, 0, 0);
    for (const s of [-1, 1]) { box(root, 0.45, 0.6, 0.01, mat('aqDoor', { color: 0x333333, roughness: 0.4 }), s * 0.235, 0.05, 0.212, 0, 0.004); box(root, 0.012, 0.1, 0.02, X.chrome(), s * 0.03, 0.36, 0.22, 0, 0.004); }
    box(root, 0.9, 0.5, 0.38, X.glassTank(), 0, 0.71, 0, 0, 0.004);
    box(root, 0.88, 0.42, 0.36, M.water(), 0, 0.75, 0, 0, 0.002);
    box(root, 0.92, 0.025, 0.4, M.black(), 0, 0.7, 0, 0, 0.006);
    box(root, 0.94, 0.05, 0.41, M.black(), 0, 1.2, 0, 0, 0.01);
    box(root, 0.86, 0.04, 0.34, X.sand(), 0, 0.725, 0, 0, 0.01);
    box(root, 0.8, 0.02, 0.02, M.ledBlue(), 0, 1.19, 0.17);
    for (let i = 0; i < 4; i++) sph(root, 0.04 + (i % 2) * 0.02, X.stone(), -0.3 + i * 0.2, 0.77, -0.08 + (i % 3) * 0.05, 1.3, 0.7, 1);
    for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(leafGeo(0.25 + (i % 3) * 0.05, 0.03), X.leaf()); l.position.set(-0.36 + i * 0.13, 0.75, -0.12); l.rotation.set(-0.15, i * 1.3, 0); root.add(l); }
    for (let i = 0; i < 5; i++) {
      const fm = mat('fish' + (i % 2), { color: i % 2 ? 0xff8a00 : 0xffd400, emissive: i % 2 ? 0x552200 : 0x554400 });
      const fx = -0.3 + i * 0.15, fy = 0.85 + (i % 3) * 0.1, fz = (i % 2 - 0.5) * 0.15;
      sph(root, 0.03, fm, fx, fy, fz, 1.8, 1, 0.55);
      const tail = new THREE.Mesh(cached('fishTail', () => new THREE.ConeGeometry(0.022, 0.035, 8)), fm); tail.position.set(fx - 0.06, fy, fz); tail.rotation.z = Math.PI / 2; tail.scale.set(1, 1, 0.3); root.add(tail);
    }
    box(root, 0.08, 0.16, 0.05, M.black(), 0.38, 0.8, -0.15, 0, 0.008);
  } else if (type === 'fridge') {
    const red = mat('fridgeBody', { color: 0xc8102e, roughness: 0.4, metalness: 0.3 });
    box(root, 0.5, 1.45, 0.45, red, 0, 0.04, 0, 0, 0.03);
    box(root, 0.5, 0.04, 0.42, M.black(), 0, 0, 0);
    box(root, 0.44, 1.18, 0.02, M.black(), 0, 0.12, 0.225, 0, 0.012);
    box(root, 0.4, 1.12, 0.01, mat('fridgeGlass', { color: 0x223344, emissive: 0x9fd8ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.6, depthWrite: false }), 0, 0.15, 0.236, 0, 0.004);
    tube(root, [[0.2, 0.4, 0.25], [0.215, 0.42, 0.27], [0.215, 1.1, 0.27], [0.2, 1.12, 0.25]], 0.009, X.chrome(), 12, 8);
    plane(root, 0.42, 0.13, labelMat('fridgeLogo', 256, 80, (c, w, h) => { c.fillStyle = '#c8102e'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'italic bold 52px Arial'; c.textAlign = 'center'; c.fillText('Kühl!', w / 2, 58); }, 0.6), 0, 1.38, 0.227);
    for (let r = 0; r < 4; r++) {
      box(root, 0.4, 0.006, 0.36, X.wire(), 0, 0.26 + r * 0.29, 0.0, 0, 0);
      for (let c = 0; c < 4; c++) lathe(root, [[0, 0], [0.021, 0], [0.025, 0.01], [0.025, 0.105], [0.019, 0.12], [0, 0.12]], mat('can' + ((r + c) % 3), { color: [0x22aa44, 0x2266dd, 0xeeeeee][(r + c) % 3], metalness: 0.7, roughness: 0.3 }), -0.13 + c * 0.087, 0.27 + r * 0.29, 0.06, 14);
    }
  } else if (type === 'arcade') {
    // Klassischer Automat mit geschwungenen Seitenwangen
    const side = mat('arcadeBody', { color: 0x2a1a5e, roughness: 0.5 }), trim = mat('arcadeTrim', { color: 0xffd400, roughness: 0.4, emissive: 0x332200 });
    const prof = [[-0.3, 0], [0.3, 0], [0.3, 0.84], [0.36, 0.9], [0.18, 1.0], [0.22, 1.52], [0.3, 1.6], [0.3, 1.75], [-0.3, 1.75]];
    const sg = cached('arcSide', () => { const s = new THREE.Shape(); s.moveTo(...prof[0]); for (const p of prof.slice(1)) s.lineTo(...p); s.lineTo(...prof[0]); const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: !Q.lo, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 }); g.rotateY(-Math.PI / 2); return g; });
    for (const x of [-0.27, 0.3]) { const m = new THREE.Mesh(sg, side); m.position.x = x; root.add(m); }
    box(root, 0.54, 1.75, 0.5, side, 0, 0, -0.05, 0, 0.01);
    box(root, 0.54, 0.84, 0.02, side, 0, 0, 0.29, 0, 0.005); box(root, 0.54, 0.15, 0.1, M.black(), 0, 1.6, 0.25, 0, 0.008);
    const t = labelMat('arcadeScr', 256, 220, (g, w, h) => { g.fillStyle = '#05050f'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.font = 'bold 60px Arial'; g.fillStyle = '#ffd400'; g.fillText('BLOCK', w / 2, 80); g.fillStyle = '#ff3d7f'; g.fillText('BUSTER', w / 2, 150); g.fillStyle = '#5dff9c'; g.font = '18px Arial'; g.fillText('INSERT COIN', w / 2, 200); }, 1.2);
    const sc = plane(root, 0.46, 0.4, t, 0, 1.25, 0.2, -0.08); sc.rotation.x = -0.08;
    const cp = box(root, 0.58, 0.05, 0.22, M.black(), 0, 0.9, 0.28, 0, 0.01); cp.rotation.x = 0.25;
    cyl(root, 0.007, 0.007, 0.06, X.chrome(), -0.13, 0.98, 0.3, 10); sph(root, 0.02, M.ledRed(), -0.13, 1.02, 0.3);
    for (let i = 0; i < 3; i++) cyl(root, 0.022, 0.022, 0.016, [M.ledRed(), M.ledBlue(), M.ledGreen2()][i], 0.03 + i * 0.065, 0.965, 0.31 - i * 0.004, 16);
    plane(root, 0.5, 0.12, labelMat('arcadeMarq', 256, 64, (g, w, h) => { g.fillStyle = '#1a0838'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff3df0'; g.font = 'bold 40px Arial'; g.textAlign = 'center'; g.fillText('ARCADE', w / 2, 46); }, 2), 0, 1.66, 0.305);
    box(root, 0.14, 0.2, 0.01, M.black(), 0, 0.35, 0.305, 0, 0.004);
    for (const s of [-1, 1]) box(root, 0.018, 0.04, 0.006, M.ledRed(), s * 0.03, 0.47, 0.31, 0, 0.002);
    box(root, 0.6, 0.012, 0.52, trim, 0, 1.75, -0.05, 0, 0.004);
  }
  return root;
}

// ---------- Baking & Instanzen (mit LOD) ----------
const templates = new Map();
const LOD_DIST = 5;
function bake(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map(); const spins = [];
  const visit = (o) => {
    if (o.userData.spin) { spins.push({ obj: o, m: o.matrixWorld.clone() }); return; }
    if (o.isMesh) {
      const g = o.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!g.index) { const n = g.attributes.position.count, ix = n > 65535 ? new Uint32Array(n) : new Uint16Array(n); for (let i = 0; i < n; i++) ix[i] = i; g.setIndex(new THREE.BufferAttribute(ix, 1)); }
      g.applyMatrix4(o.matrixWorld);
      if (!buckets.has(o.material)) buckets.set(o.material, []);
      buckets.get(o.material).push(g);
    }
    for (const c of o.children) visit(c);
  };
  visit(root);
  const meshes = [];
  for (const [m, gs] of buckets) { const merged = mergeGeometries(gs, false); merged.computeBoundingSphere(); meshes.push({ geom: merged, mat: m }); gs.forEach((g) => g.dispose()); }
  const spinT = spins.map(({ obj, m }) => { obj.parent?.remove(obj); obj.position.set(0, 0, 0); obj.rotation.set(0, 0, 0); obj.scale.set(1, 1, 1); obj.updateMatrix(); return { obj, m }; });
  const bbox = new THREE.Box3().setFromObject(root);
  return { meshes, spins: spinT, bbox };
}
function fromTemplate(t) {
  const g = new THREE.Group();
  for (const { geom, mat: m } of t.meshes) { const mesh = new THREE.Mesh(geom, m); mesh.castShadow = !m.transparent; mesh.receiveShadow = true; g.add(mesh); }
  g.userData.fans = [];
  for (const { obj, m } of t.spins) { const c = obj.clone(true); m.decompose(c.position, c.quaternion, c.scale); g.add(c); g.userData.fans.push(c); }
  return g;
}
export function instance(key, builder, { lod = true, dist = LOD_DIST } = {}) {
  let t = templates.get(key);
  if (!t) {
    Q.lo = Q.mid = false; const hi = bake(builder());
    let lo = null, mid = null;
    if (lod) { try { Q.mid = true; mid = bake(builder()); Q.mid = false; Q.lo = true; lo = bake(builder()); } finally { Q.lo = Q.mid = false; } }
    t = { hi, mid, lo }; templates.set(key, t);
  }
  const hi = fromTemplate(t.hi);
  if (!t.lo) { hi.userData.bbox = t.hi.bbox; return hi; }
  const mid = fromTemplate(t.mid), lo = fromTemplate(t.lo);
  const l = new THREE.LOD(); l.addLevel(hi, 0); l.addLevel(mid, dist); l.addLevel(lo, dist * 2.8);
  l.userData.fans = [...hi.userData.fans, ...mid.userData.fans, ...lo.userData.fans]; l.userData.bbox = t.hi.bbox;
  return l;
}

// Modell für ein Spielobjekt bauen
export function objectModel(o) {
  const def = PLACEABLE[o.type];
  if (def.kind === 'rig') {
    const p = o.parts || {}; const key = `rig:${o.type}:${p.mobo}:${p.cpu}:${p.psu}:${(p.gpus || []).join(',')}`;
    return instance(key, () => buildRig(o.type, p));
  }
  if (def.kind === 'device') return instance(`dev:${def.look}`, () => buildDevice(def.look));
  if (def.kind === 'holder') { const items = o.items || []; const key = `hold:${o.type}:${o.type === 'container' ? (items.length ? (PLACEABLE[items[0].id]?.hydro ? 'h' : 'a') : 'e') : items.map((i) => i.id).join(',')}`; return instance(key, () => buildHolder(o.type, items), { dist: o.type === 'container' ? 12 : 4 }); }
  if (def.kind === 'cooling') return instance(`cool:${o.type}`, () => buildCooling(o.type));
  return instance(`decor:${o.type}`, () => buildDecor(o.type));
}
