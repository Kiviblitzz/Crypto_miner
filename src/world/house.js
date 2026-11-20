// Altbau-Hinterhaus: Treppenhaus zwischen Wohnung (Standort „kinder“) und Kellerraum („keller“).
// Wird einmal gebaut und bleibt in der Szene – in beiden Standort-Szenen identisch, nur verschoben.
// Haus-Koordinaten = Wohnungs-Koordinaten (Wohnung x 0..4, z 0..3,5, Boden y = 0).
// Kellerraum: x −3..4, z 0..5, Boden y = −2,7 (HOUSE_OFF.keller).
//
//   z=−2,2  Haustür (Eingangsflur y = −0,85)          Treppe nach oben (über der Kellertreppe, Deko)
//   z=0,2   Halbtreppe hoch (5 Stufen) | Kellertreppe runter (11 Stufen) → 16 Stufen Wohnung ↔ Keller
//   z=1,32  Podest (Hochparterre, y = 0): Wohnungstür, Briefkästen, Pakete
//   z=2,9   Kellergang (y = −2,7): Tür zum Kellerraum (Westwand), Zähler, Lattenverschlag
import * as THREE from 'three';
import { TEX, M, mat, textTexture } from './materials.js';
import { instance, X } from './models.js';

export const HOUSE_OFF = { kinder: [0, 0, 0], keller: [-3.0, -2.7, 0] }; // Haus = lokal + Versatz
export const isHouse = (id) => !!HOUSE_OFF[id];

// Ebenen und Maße
export const LV = { L0: 0, LE: -0.85, LK: -2.7 };
const L0 = 0, LE = -0.85, LK = -2.7, LC = 2.6, LU = 2.89, LS = 5.6;
const WX = 4.18, EX = 6.85, NZ = -2.2, SZ = 4.6, PX0 = 5.55, PX1 = 5.65, KZ = 6.6, KZ2 = 7.6;
const HF = { zs: 0.2, R: 5, run: 0.28, rise: 0.17 };            // Halbtreppe Eingang → Podest
const KT = { zs: 0.2, R: 11, run: 0.27, rise: (LE - LK) / 11 };  // Kellertreppe
const UP = { zs: 3.3, R: 17, run: 0.25, rise: 0.17 };           // Treppe ins 1. OG (Richtung −z)
const HF_END = HF.zs + (HF.R - 1) * HF.run, KT_END = KT.zs + (KT.R - 1) * KT.run, UP_END = UP.zs - (UP.R - 1) * UP.run;
// Umriss des Gebäudes (für das Loch im Hofboden), gegen den Uhrzeigersinn in x/z
export const FOOTPRINT = [[-3.15, -0.15], [4.0, -0.15], [4.0, -2.35], [7.0, -2.35], [7.0, 7.75], [4.0, 7.75], [4.0, 5.15], [-3.15, 5.15]];

// ---------- Texturen ----------
const texC = new Map();
function ctex(key, w, h, draw, srgb = true) {
  if (texC.has(key)) return texC.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.userData.shared = true; texC.set(key, t); return t;
}
const rnd = (() => { let s = 1234567; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
// Zementfliesen im Eingang: 1 m = 5 × 5 Fliesen, ockergelb/anthrazit mit Rautenmuster
const tilesTex = () => ctex('hTiles', 512, 512, (g, W) => {
  const n = 5, s = W / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = i * s, y = j * s, alt = (i + j) % 2;
    g.fillStyle = alt ? '#b9894e' : '#e3d6bd'; g.fillRect(x, y, s, s);
    g.fillStyle = alt ? '#3a3633' : '#a8743f'; g.beginPath(); g.moveTo(x + s / 2, y + s * 0.18); g.lineTo(x + s * 0.82, y + s / 2); g.lineTo(x + s / 2, y + s * 0.82); g.lineTo(x + s * 0.18, y + s / 2); g.closePath(); g.fill();
    g.fillStyle = alt ? '#e3d6bd' : '#3a3633'; g.beginPath(); g.arc(x + s / 2, y + s / 2, s * 0.08, 0, 7); g.fill();
    g.strokeStyle = 'rgba(40,30,20,.55)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, s - 2, s - 2);
  }
  for (let k = 0; k < 4000; k++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.06)'; g.fillRect(rnd() * W, rnd() * W, 2, 2); }
  // abgelaufene Mitte (Laufspur)
  const gr = g.createRadialGradient(W / 2, W / 2, 20, W / 2, W / 2, W * 0.7); gr.addColorStop(0, 'rgba(255,240,215,.12)'); gr.addColorStop(1, 'rgba(255,240,215,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W);
});
// Ochsenblutrot lackierte Trittstufe, in der Mitte bis aufs Holz abgelaufen (eine Stufe = ganze Textur)
const treadTex = () => ctex('hTread', 512, 128, (g, W, H) => {
  g.fillStyle = '#6a2519'; g.fillRect(0, 0, W, H);
  for (let k = 0; k < 18; k++) { g.strokeStyle = `rgba(30,8,4,${0.1 + rnd() * 0.15})`; g.lineWidth = 1 + rnd() * 2; g.beginPath(); const y = rnd() * H; g.moveTo(0, y); g.bezierCurveTo(W * 0.3, y + rnd() * 6 - 3, W * 0.7, y + rnd() * 6 - 3, W, y + rnd() * 4 - 2); g.stroke(); }
  const gr = g.createRadialGradient(W * 0.5, H * 0.62, 10, W * 0.5, H * 0.62, W * 0.34); gr.addColorStop(0, 'rgba(176,128,84,.85)'); gr.addColorStop(0.55, 'rgba(150,96,60,.45)'); gr.addColorStop(1, 'rgba(150,96,60,0)');
  g.save(); g.scale(1, 0.45); g.translate(0, H * 0.75); g.fillStyle = gr; g.fillRect(0, -H, W, H * 3); g.restore();
  g.fillStyle = 'rgba(255,220,190,.06)'; g.fillRect(0, H - 10, W, 4);
});
// Kalk-geweißelte Ziegelwand im Keller (kühl, fleckig), 1 m Kachel
const brickWashTex = () => ctex('hBrickWash', 512, 512, (g, W) => {
  g.fillStyle = '#c4c7c2'; g.fillRect(0, 0, W, W);
  const bh = 512 / 14, bw = 512 / 4;
  for (let r = 0; r < 14; r++) for (let c = -1; c < 5; c++) {
    const x = c * bw + (r % 2) * bw / 2, y = r * bh, v = 186 + rnd() * 26;
    g.fillStyle = `rgb(${v},${v + 3},${v + 1})`; g.fillRect(x + 3, y + 3, bw - 6, bh - 6);
    if (rnd() < 0.18) { g.fillStyle = 'rgba(150,110,90,.18)'; g.fillRect(x + 6, y + 6, bw * rnd() * 0.7, bh - 12); }
  }
  for (let k = 0; k < 30; k++) { const x = rnd() * W, y = rnd() * W, r = 10 + rnd() * 60; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(90,96,92,.12)'); gr.addColorStop(1, 'rgba(90,96,92,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); }
  for (let k = 0; k < 6000; k++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.08)'; g.fillRect(rnd() * W, rnd() * W, 1.5, 1.5); }
});
// Leimfarbe oben (leicht gelblich, mit Schmutzschleiern)
const plasterTex = () => ctex('hPlaster', 256, 256, (g, W) => {
  g.fillStyle = '#e2dac8'; g.fillRect(0, 0, W, W);
  for (let k = 0; k < 2500; k++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.035)' : 'rgba(255,255,255,.05)'; g.fillRect(rnd() * W, rnd() * W, 2, 2); }
  for (let k = 0; k < 8; k++) { const x = rnd() * W, y = rnd() * W, r = 20 + rnd() * 70; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(120,100,70,.06)'); gr.addColorStop(1, 'rgba(120,100,70,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); }
});
// Ölsockel (glänzend graugrün) mit Abrieb
const dadoTex = () => ctex('hDado', 256, 256, (g, W) => {
  g.fillStyle = '#6d8574'; g.fillRect(0, 0, W, W);
  for (let k = 0; k < 1600; k++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.05)'; g.fillRect(rnd() * W, rnd() * W, 2, 1); }
  for (let k = 0; k < 10; k++) { g.strokeStyle = 'rgba(40,30,25,.18)'; g.lineWidth = 1; g.beginPath(); const x = rnd() * W, y = rnd() * W; g.moveTo(x, y); g.lineTo(x + rnd() * 40 - 20, y + rnd() * 8); g.stroke(); }
});

// ---------- Materialien ----------
const MAT = () => ({
  plaster: mat('hPlasterM', { map: plasterTex(), roughness: 0.95 }),
  dado: mat('hDadoM', { map: dadoTex(), roughness: 0.32, metalness: 0.02 }),
  line: mat('hDadoLine', { color: 0x3a2c22, roughness: 0.5 }),
  ceil: mat('hCeil', { map: plasterTex(), color: 0xf4f0e6, roughness: 1 }),
  tiles: mat('hTilesM', { map: tilesTex(), roughness: 0.55 }),
  boards: mat('hBoards', { map: TEX.wood([1, 1]), color: 0x8c6a4e, roughness: 0.6 }),
  tread: mat('hTreadM', { map: treadTex(), roughness: 0.42 }),
  riser: mat('hRiser', { color: 0x5f2418, roughness: 0.45 }),
  wange: mat('hWange', { color: 0x4a2a1c, roughness: 0.45 }),
  rail: mat('hRail', { color: 0x3a2314, roughness: 0.32, metalness: 0.05 }),
  bal: mat('hBal', { color: 0x2e1d12, roughness: 0.4 }),
  conc: mat('hConc', { map: TEX.concrete([1, 1], 122), roughness: 0.92 }),
  kwall: mat('hKWall', { map: brickWashTex(), roughness: 0.95 }),
  kceil: mat('hKCeil', { map: TEX.concrete([1, 1], 150), color: 0xd8dcdc, roughness: 1 }),
  steel: mat('hSteel', { color: 0x3d4146, roughness: 0.45, metalness: 0.7 }),
  doorApt: mat('hDoorApt', { color: 0xe4d9bf, roughness: 0.48 }),
  doorAptD: mat('hDoorAptD', { color: 0xcdbf9f, roughness: 0.5 }),
  frame: mat('hFrame', { color: 0xeee6d2, roughness: 0.45 }),
  doorK: mat('hDoorK', { color: 0x7d8a7a, roughness: 0.7 }),
  doorKD: mat('hDoorKD', { color: 0x5d6a5b, roughness: 0.75 }),
  doorN: mat('hDoorN', { color: 0x7a5236, roughness: 0.5 }),
  haus: mat('hHaus', { color: 0x2c4536, roughness: 0.42 }),
  brass: X.brass(),
  black: mat('hBlack', { color: 0x050505, roughness: 1 }),
  mbox: mat('hMbox', { color: 0x8f969b, roughness: 0.4, metalness: 0.6 }),
  mboxD: mat('hMboxD', { color: 0x2b2f33, roughness: 0.5, metalness: 0.4 }),
  globe: mat('hGlobe', { color: 0xfff4e2, emissive: 0xffd9a8, emissiveIntensity: 1.6, roughness: 0.3 }),
  globeK: mat('hGlobeK', { color: 0xf2f6ff, emissive: 0xe4ecff, emissiveIntensity: 1.8, roughness: 0.3 }),
  globeDim: mat('hGlobeDim', { color: 0xfff1dc, emissive: 0xffcf94, emissiveIntensity: 0.7, roughness: 0.3 }),
  switchGlow: mat('hSwitch', { color: 0x5a2a08, emissive: 0xff8a2a, emissiveIntensity: 1.8, roughness: 0.4 }),
  switchBox: mat('hSwitchBox', { color: 0xe8e2d4, roughness: 0.5 }),
  slat: mat('hSlat', { color: 0x8e6e4e, roughness: 0.85 }),
  mat: mat('hMatDoor', { color: 0x5b4a3a, roughness: 1 }),
  matN: mat('hMatN', { color: 0x7a3a2a, roughness: 1 }),
  cable: M.cable(),
});

// ---------- Geometrie-Helfer ----------
// Quader mit Welt-UVs (Textur je us Meter) – große Wände und kleine Teile passen zusammen
function wbox(w, h, d, us = 1) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / us, uv.getY(k) * dims[f][1] / us); }
  return g;
}
function B(g, x0, x1, y0, y1, z0, z1, m, us = 1) {
  const mesh = new THREE.Mesh(wbox(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), us), m);
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); g.add(mesh); return mesh;
}
// Quader mit normalen 0..1-UVs (z. B. Trittstufe: eine Stufe = ganze Textur)
function Bu(g, x0, x1, y0, y1, z0, z1, m) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m); mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); g.add(mesh); return mesh; }
// Viereck (a→b→c→d gegen den Uhrzeigersinn von der Sichtseite), planare UVs in Metern
function quad(g, a, b, c, d, m, us = 1) {
  const geo = new THREE.BufferGeometry(), A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), D = new THREE.Vector3(...d);
  const ux = Bv.clone().sub(A), lu = ux.length(); ux.normalize(); const vy = D.clone().sub(A); const n = ux.clone().cross(vy).normalize(); const uy = n.clone().cross(ux);
  const pts = [a, b, c, d].map((p) => new THREE.Vector3(...p)), uvs = [];
  for (const p of pts) { const r = p.clone().sub(A); uvs.push(r.dot(ux) / us, r.dot(uy) / us); }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap((p) => [p.x, p.y, p.z]), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals();
  void lu; const mesh = new THREE.Mesh(geo, m); g.add(mesh); return mesh;
}
// Stab zwischen zwei Punkten
function rod(g, a, b, r, m, seg = 10) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), dir = Bv.clone().sub(A), len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), m); mesh.position.copy(A).add(Bv).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); g.add(mesh); return mesh;
}
// Schräges Brett entlang der Linie (za,ya)→(zb,yb), Höhe h quer zur Neigung
function sloped(g, x0, x1, za, ya, zb, yb, h, m) {
  const dz = zb - za, dy = yb - ya, len = Math.hypot(dz, dy), mesh = new THREE.Mesh(wbox(x1 - x0, h, len), m);
  mesh.position.set((x0 + x1) / 2, (ya + yb) / 2, (za + zb) / 2); mesh.rotation.x = Math.atan2(-dy, dz); g.add(mesh); return mesh;
}
// Vollkörper aus einem Profil in der z/y-Ebene, ausgedehnt von x0 bis x1
function prism(g, pts, x0, x1, m) {
  const sh = new THREE.Shape(); pts.forEach(([z, y], i) => (i ? sh.lineTo(z, y) : sh.moveTo(z, y)));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0, bevelEnabled: false });
  geo.applyMatrix4(new THREE.Matrix4().set(0, 0, -1, x1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1)); // (z, y, d) → (x1 − d, y, z), Drehsinn bleibt
  geo.computeVertexNormals(); const mesh = new THREE.Mesh(geo, m); g.add(mesh); return mesh;
}
// Wand entlang z (x0..x1) mit Öffnungen [{z0, z1, y0, y1}]
function wallZ(g, x0, x1, z0, z1, y0, y1, m, holes = [], us = 1) {
  const cuts = [z0, z1, ...holes.flatMap((h) => [h.z0, h.z1])].filter((z) => z >= z0 && z <= z1).sort((a, b) => a - b);
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i], b = cuts[i + 1]; if (b - a < 1e-4) continue;
    const mid = (a + b) / 2, hs = holes.filter((h) => h.z0 < mid && h.z1 > mid).sort((p, q) => p.y0 - q.y0);
    let y = y0; for (const h of hs) { if (h.y0 > y) B(g, x0, x1, y, h.y0, a, b, m, us); y = Math.max(y, h.y1); } if (y < y1) B(g, x0, x1, y, y1, a, b, m, us);
  }
}
function wallX(g, z0, z1, x0, x1, y0, y1, m, holes = [], us = 1) {
  const cuts = [x0, x1, ...holes.flatMap((h) => [h.x0, h.x1])].filter((x) => x >= x0 && x <= x1).sort((a, b) => a - b);
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i], b = cuts[i + 1]; if (b - a < 1e-4) continue;
    const mid = (a + b) / 2, hs = holes.filter((h) => h.x0 < mid && h.x1 > mid).sort((p, q) => p.y0 - q.y0);
    let y = y0; for (const h of hs) { if (h.y0 > y) B(g, a, b, y, h.y0, z0, z1, m, us); y = Math.max(y, h.y1); } if (y < y1) B(g, a, b, y, y1, z0, z1, m, us);
  }
}
const label = (lines, w, h, bg, opts = {}) => { const t = textTexture(lines, { w, h, bg, ...opts }); t.userData.shared = true; const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }); m.userData.shared = true; return m; };
function sign(g, w, h, m, x, y, z, ry = 0) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.y = ry; g.add(p); return p; }

// Treppenlauf entlang z: erste Stufenkante zs, Richtung dir (±1), R Steigungen, Auftritt run, Steigung rise (± = hoch/runter), Startniveau y0
function steps(g, { x0, x1, zs, dir, R, run, rise, y0 }, T, { tread = T.tread, riser = T.riser, nose = true, conc = false } = {}) {
  for (let k = 1; k < R; k++) {
    const y = y0 + k * rise, za = zs + dir * (k - 1) * run, zb = zs + dir * k * run;
    const zn = za - dir * 0.03; // Stufenkante steht etwas vor
    if (conc) { if (nose) B(g, x0 + 0.02, x1 - 0.02, y - 0.012, y + 0.004, Math.min(za - dir * 0.035, za + dir * 0.004), Math.max(za - dir * 0.035, za + dir * 0.004), T.steel); continue; }
    Bu(g, x0, x1, y - 0.04, y, Math.min(zn, zb), Math.max(zn, zb), tread);
    const lo = rise > 0 ? y - rise : y, hi = rise > 0 ? y - 0.04 : y - rise;
    B(g, x0 + 0.005, x1 - 0.005, lo, hi, Math.min(za, za - dir * 0.02), Math.max(za, za - dir * 0.02), riser);
  }
}

// ---------- Türblätter (beweglich) ----------
function aptLeaf(T) {
  const g = new THREE.Group();
  // Drehpunkt = Bandseite; Blatt reicht in lokaler −z-Richtung 0,815 m, Dicke ±0,0225 in x
  B(g, -0.0225, 0.0225, 0, 2.03, -0.79, 0, T.doorApt);
  for (const s of [-1, 1]) {
    const fx = s * 0.0235;
    for (const [y0, y1] of [[0.16, 0.86], [1.06, 1.88]]) {
      B(g, fx - 0.004, fx + 0.004, y0, y1, -0.69, -0.1, T.doorAptD);
      for (const [a, b, c, d] of [[y0 - 0.025, y0, -0.715, -0.075], [y1, y1 + 0.025, -0.715, -0.075], [y0, y1, -0.715, -0.69], [y0, y1, -0.1, -0.075]]) B(g, fx - 0.008, fx + 0.008, a, b, c, d, T.frame);
    }
    // Drücker + Langschild (Messing)
    B(g, Math.min(fx, fx + s * 0.008), Math.max(fx, fx + s * 0.008), 0.88, 1.12, -0.745, -0.705, T.brass);
    rod(g, [fx + s * 0.02, 1.04, -0.725], [fx + s * 0.02, 1.04, -0.62], 0.009, T.brass, 10);
    rod(g, [fx, 1.04, -0.725], [fx + s * 0.02, 1.04, -0.725], 0.008, T.brass, 10);
  }
  // Türspion (Flurseite)
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 12), T.brass); sp.rotation.z = Math.PI / 2; sp.position.set(0, 1.5, -0.395); g.add(sp);
  return g;
}
function kellerLeaf(T) {
  const g = new THREE.Group();
  const LW = 0.84;
  B(g, -0.015, 0.015, 0.005, 2.03, -LW, 0, T.doorKD);
  for (let i = 0; i < 6; i++) { const z0 = -LW + i * (LW / 6); for (const s of [-1, 1]) B(g, Math.min(s * 0.015, s * 0.02), Math.max(s * 0.015, s * 0.02), 0.005, 2.03, z0 + 0.004, z0 + LW / 6 - 0.004, i % 2 ? T.doorK : T.doorKD); }
  for (const s of [-1, 1]) {
    for (const y of [0.25, 1.0, 1.75]) B(g, Math.min(s * 0.02, s * 0.034), Math.max(s * 0.02, s * 0.034), y, y + 0.12, -LW + 0.03, -0.03, T.doorKD); // Querleisten
    B(g, Math.min(s * 0.02, s * 0.03), Math.max(s * 0.02, s * 0.03), 0.9, 1.1, -LW + 0.03, -LW + 0.07, T.steel);
    rod(g, [s * 0.045, 1.02, -LW + 0.05], [s * 0.045, 1.02, -LW + 0.16], 0.009, T.steel, 8);
    rod(g, [s * 0.03, 1.02, -LW + 0.05], [s * 0.045, 1.02, -LW + 0.05], 0.008, T.steel, 8);
  }
  return g;
}

// ---------- Kleinzeug ----------
function stroller(g, x, z, ry, T) {
  const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry; g.add(s);
  const body = mat('hStrollerBody', { color: 0x334c66, roughness: 0.8 }), frame = mat('hStrollerFrame', { color: 0xb8bcc2, roughness: 0.3, metalness: 0.8 });
  B(s, -0.28, 0.28, 0.42, 0.72, -0.4, 0.38, body);
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.56, 18, 1, true, 0, Math.PI), mat('hStrollerHood', { color: 0x2a3e55, roughness: 0.85, side: THREE.DoubleSide })); hood.rotation.set(0, 0, Math.PI / 2); hood.position.set(0, 0.72, -0.18); hood.scale.set(1, 1, 0.9); s.add(hood);
  for (const [wx, wz] of [[-0.27, -0.33], [0.27, -0.33], [-0.27, 0.32], [0.27, 0.32]]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 8, 20), M.rubber()); w.rotation.y = Math.PI / 2; w.position.set(wx, 0.13, wz); s.add(w); }
  rod(s, [-0.24, 0.42, 0.3], [-0.24, 1.0, 0.58], 0.012, frame); rod(s, [0.24, 0.42, 0.3], [0.24, 1.0, 0.58], 0.012, frame); rod(s, [-0.26, 1.0, 0.58], [0.26, 1.0, 0.58], 0.016, M.black());
  rod(s, [-0.27, 0.14, -0.33], [-0.27, 0.42, 0.0], 0.01, frame); rod(s, [0.27, 0.14, -0.33], [0.27, 0.42, 0.0], 0.01, frame); rod(s, [-0.27, 0.14, 0.32], [-0.27, 0.42, 0.0], 0.01, frame); rod(s, [0.27, 0.14, 0.32], [0.27, 0.42, 0.0], 0.01, frame);
  return s;
}
function bike(g, x, y, z, ry) {
  const b = new THREE.Group(); b.position.set(x, y, z); b.rotation.y = ry; g.add(b);
  const fr = mat('hBikeFrame', { color: 0x8c2a22, roughness: 0.4, metalness: 0.5 }), chrome = X.chrome();
  for (const wx of [-0.52, 0.52]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.022, 8, 28), M.rubber()); w.position.set(wx, 0.35, 0); b.add(w); for (let i = 0; i < 6; i++) { const sp = rod(b, [wx, 0.35, 0], [wx + Math.cos(i) * 0.31, 0.35 + Math.sin(i) * 0.31, 0], 0.002, chrome, 4); sp.castShadow = false; } }
  rod(b, [-0.52, 0.35, 0], [-0.05, 0.38, 0], 0.016, fr); rod(b, [-0.05, 0.38, 0], [0.38, 0.78, 0], 0.018, fr); rod(b, [-0.12, 0.8, 0], [0.38, 0.78, 0], 0.016, fr); rod(b, [-0.05, 0.38, 0], [-0.12, 0.8, 0], 0.017, fr); rod(b, [-0.52, 0.35, 0], [-0.12, 0.8, 0], 0.012, fr);
  rod(b, [0.38, 0.78, 0], [0.52, 0.35, 0], 0.014, chrome); rod(b, [0.36, 0.78, 0], [0.33, 0.98, 0], 0.012, chrome); rod(b, [0.33, 0.98, -0.24], [0.33, 0.98, 0.24], 0.012, M.black());
  B(b, -0.24, -0.04, 0.84, 0.88, -0.06, 0.06, M.black());
  return b;
}
function lightSwitch(g, x, y, z, ry, T) {
  const s = new THREE.Group(); s.position.set(x, y, z); s.rotation.y = ry; g.add(s);
  B(s, -0.04, 0.04, -0.045, 0.045, 0, 0.018, T.switchBox); B(s, -0.022, 0.022, -0.02, 0.02, 0.018, 0.024, T.switchGlow);
  return s;
}
function globeLamp(g, x, y, z, m) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), m); s.position.set(x, y - 0.16, z); s.scale.set(1, 0.9, 1); g.add(s);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.05, 16), mat('hLampCap', { color: 0x8a7a5a, roughness: 0.4, metalness: 0.7 })); cap.position.set(x, y - 0.035, z); g.add(cap);
  return s;
}
function cageLamp(g, x, y, z, T) { // Kellerleuchte mit Schutzkorb an der Wand (x = Wandfläche, zeigt nach −x)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16), T.steel); base.rotation.z = Math.PI / 2; base.position.set(x - 0.02, y, z); g.add(base);
  const gl = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), T.globeK); gl.position.set(x - 0.09, y, z); g.add(gl);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI; rod(g, [x - 0.04, y + Math.cos(a) * 0.075, z + Math.sin(a) * 0.075], [x - 0.16, y + Math.cos(a) * 0.075, z + Math.sin(a) * 0.075], 0.004, T.steel, 4); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.004, 4, 20), T.steel); ring.rotation.y = Math.PI / 2; ring.position.set(x - 0.1, y, z); g.add(ring);
}
function doorMat(g, x0, x1, z0, z1, y, m) { const p = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.012, z1 - z0), m); p.position.set((x0 + x1) / 2, y + 0.006, (z0 + z1) / 2); p.receiveShadow = true; g.add(p); }

// ---------- Statischer Bau (wird zu wenigen Meshes zusammengeführt) ----------
function buildStatic(T, glass) {
  const g = new THREE.Group();
  // Böden
  B(g, WX, EX, LE - 0.15, LE, NZ, HF.zs, T.tiles);                           // Eingangsflur: Zementfliesen
  B(g, WX, PX1, L0 - 0.04, L0, HF_END - 0.03, SZ, T.boards, 2);               // Podest: Dielen
  B(g, PX1, EX, L0 - 0.04, L0, UP.zs, SZ, T.boards, 2);
  B(g, WX, EX, -0.3, L0 - 0.04, UP.zs, SZ, T.kceil);                         // Podestplatte über dem Kellergang
  B(g, PX1, EX, LK - 0.15, LK, KT_END, KZ, T.conc);                           // Kellergang
  B(g, WX, PX1, LK - 0.15, LK, UP.zs, SZ, T.conc);
  // Halbtreppe + Podest-Unterbau (Seite zur Kellertreppe = gekalkte Wand)
  const hp = []; for (let k = 0; k < HF.R; k++) { const z = HF.zs + k * HF.run; hp.push([z, LE + k * HF.rise - 0.04], [z, LE + (k + 1) * HF.rise - 0.04]); } hp.push([UP.zs, L0 - 0.04], [UP.zs, LK - 0.15], [HF.zs, LK - 0.15]);
  prism(g, hp, WX, PX1, T.kwall);
  steps(g, { x0: WX, x1: PX0, zs: HF.zs, dir: 1, R: HF.R, run: HF.run, rise: HF.rise, y0: LE }, T);
  B(g, WX + 0.005, PX0 - 0.005, LE + (HF.R - 1) * HF.rise, L0 - 0.04, HF_END - 0.02, HF_END, T.riser); // letzte Setzstufe
  // Kellertreppe: Beton, Kantenschutz aus Stahl
  const kp = []; for (let k = 0; k < KT.R; k++) { const z = KT.zs + k * KT.run; kp.push([z, LE - k * KT.rise], [z, LE - (k + 1) * KT.rise]); } kp.push([KT_END, LK - 0.15], [KT.zs, LK - 0.15]);
  prism(g, kp, PX1, EX, T.conc);
  steps(g, { x0: PX1, x1: EX, zs: KT.zs, dir: 1, R: KT.R + 1, run: KT.run, rise: -KT.rise, y0: LE + KT.rise }, T, { conc: true });
  // Treppe ins 1. OG über der Kellertreppe: Platte (Unterseite = Decke der Kellertreppe), Stufen, Wangen
  const slope = UP.rise / UP.run, line = (z) => (UP.zs - z) * slope; // Linie der Stufen-Innenkanten
  quad(g, [PX1, line(KT.zs) - 0.2, KT.zs], [EX, line(KT.zs) - 0.2, KT.zs], [EX, line(UP.zs) - 0.2, UP.zs], [PX1, line(UP.zs) - 0.2, UP.zs], T.kwall);
  quad(g, [PX1, line(UP_END) - 0.2, UP_END], [EX, line(UP_END) - 0.2, UP_END], [EX, line(KT.zs) - 0.2, KT.zs], [PX1, line(KT.zs) - 0.2, KT.zs], T.plaster);
  for (let k = 1; k <= UP.R; k++) { // Stufenkörper als Keil über der Platte
    const za = UP.zs - (k - 1) * UP.run, zb = UP.zs - k * UP.run, y = k * UP.rise;
    if (k < UP.R) { Bu(g, PX1, EX, y - 0.04, y, zb, za + 0.03, T.tread); B(g, PX1 + 0.005, EX - 0.005, line(za) - 0.05, y - 0.04, za - 0.02, za, T.riser); }
    else B(g, PX1 + 0.005, EX - 0.005, line(za) - 0.05, LU, za - 0.02, za, T.riser);
  }
  sloped(g, PX1 - 0.045, PX1, UP.zs + 0.03, line(UP.zs) + 0.04, UP_END, line(UP_END) + 0.04, 0.5, T.wange); // Wange zur Halle hin
  // Oberes Podest (1. OG) und Treppenschacht
  B(g, PX1, EX, LU - 0.3, LU, NZ, UP_END, T.boards, 2);
  B(g, PX1, EX, LU - 0.32, LU - 0.3, NZ, UP_END, T.ceil);
  // Decken
  B(g, WX, PX0, LC, LC + 0.15, NZ, SZ, T.ceil); B(g, PX0, EX, LC, LC + 0.15, 2.6, SZ, T.ceil);
  B(g, PX0, EX, LS, LS + 0.15, NZ, 2.75, T.ceil);
  B(g, PX1, EX, -0.3, -0.15, SZ, KZ2, T.kceil);                                // Decke Kellergang (Süd)
  // ---- Wände ----
  // West (Wohnungsseite): dünne Putzschicht vor der Wohnungswand, außen Fassade
  wallZ(g, 4.15, WX, NZ - 0.15, SZ + 0.15, LE - 0.15, LC + 0.15, T.plaster, [{ z0: 2.6, z1: 3.45, y0: L0, y1: 2.05 }, { z0: HF_END, z1: SZ + 0.2, y0: LE - 0.3, y1: L0 - 0.25 }]);
  B(g, 4.0, 4.15, LE - 0.3, LC + 0.15, NZ - 0.15, -0.15, T.plaster); B(g, 4.0, 4.15, -0.3, LC + 0.15, 3.5, SZ + 0.15, T.plaster);
  wallZ(g, 4.15, WX, UP.zs, SZ, LK - 0.15, -0.3, T.kwall, [{ z0: 3.4, z1: 4.3, y0: LK, y1: LK + 2.05 }]);  // Kellergang: Tür zum Kellerraum
  B(g, 4.0, 4.15, LK - 0.15, -0.3, SZ, SZ + 0.15, T.kwall);
  // Ost: Eingangsflur verputzt, Kellerabgang gekalkt, darüber verputzt
  B(g, EX, EX + 0.15, LE - 0.3, LS + 0.15, NZ - 0.15, HF.zs, T.plaster);
  const bl = (z) => line(z) - 0.2;
  prism(g, [[HF.zs, LK - 0.15], [KZ2 + 0.15, LK - 0.15], [KZ2 + 0.15, -0.3], [UP.zs, -0.3], [UP.zs, bl(UP.zs)], [HF.zs, bl(HF.zs)]], EX, EX + 0.15, T.kwall);
  prism(g, [[HF.zs, bl(HF.zs)], [UP.zs, bl(UP.zs)], [UP.zs, -0.3], [SZ + 0.15, -0.3], [SZ + 0.15, LS + 0.15], [HF.zs, LS + 0.15]], EX, EX + 0.15, T.plaster);
  // Nord mit Haustür (x 5,0..6,0) und Oberlicht, oben das Treppenhausfenster
  wallX(g, NZ - 0.15, NZ, 4.0, EX + 0.15, LE - 0.3, LS + 0.15, T.plaster, [{ x0: 5.0, x1: 6.0, y0: LE, y1: LE + 2.75 }, { x0: 5.85, x1: 6.6, y0: 3.3, y1: 4.95 }]);
  // Süd: Podest-Abschluss (Nachbartür x 5,75..6,6), darunter Kellergang-Fülle
  wallX(g, SZ, SZ + 0.15, 4.0, EX + 0.15, -0.3, LC + 0.15, T.plaster, [{ x0: 5.78, x1: 6.6, y0: L0, y1: 2.05 }]);
  B(g, 4.0, PX1, LK - 0.15, -0.3, SZ, KZ2 + 0.15, T.kwall);
  B(g, PX1, EX + 0.15, LK - 0.15, -0.15, KZ2, KZ2 + 0.15, T.kwall);
  // Schacht über der Treppe: Westwand (dunkler Durchgang ins 1. OG), Südwand
  wallZ(g, PX0, PX1, NZ, 2.75, LC, LS + 0.15, T.plaster, [{ z0: -2.05, z1: -1.15, y0: LU, y1: LU + 2.0 }]);
  B(g, PX0 - 0.6, PX0, LU, LU + 2.0, -2.05, -1.15, T.black);
  B(g, PX0, EX, LC, LS + 0.15, 2.6, 2.75, T.plaster);
  // Ölsockel (graugrün) mit Abschlusslinie: Eingang, Halbtreppe (schräg), Podest, Ostwand entlang der Treppe nach oben
  const dz = 0.006, DH = 1.35;
  B(g, WX, WX + dz, LE, LE + DH, NZ, HF.zs, T.dado); B(g, WX, WX + dz + 0.004, LE + DH, LE + DH + 0.025, NZ, HF.zs, T.line);
  B(g, EX - dz, EX, LE, LE + DH, NZ, HF.zs, T.dado); B(g, EX - dz - 0.004, EX, LE + DH, LE + DH + 0.025, NZ, HF.zs, T.line);
  wallX(g, NZ, NZ + dz, WX, EX, LE, LE + DH, T.dado, [{ x0: 4.98, x1: 6.02, y0: LE - 1, y1: LE + 3 }]); wallX(g, NZ, NZ + dz + 0.004, WX, EX, LE + DH, LE + DH + 0.025, T.line, [{ x0: 4.98, x1: 6.02, y0: LE - 1, y1: LE + 3 }]);
  quad(g, [WX + dz, LE, HF.zs], [WX + dz, L0, HF_END], [WX + dz, L0 + DH, HF_END], [WX + dz, LE + DH, HF.zs], T.dado);
  quad(g, [WX + dz + 0.004, LE + DH, HF.zs], [WX + dz + 0.004, L0 + DH, HF_END], [WX + dz + 0.004, L0 + DH + 0.025, HF_END], [WX + dz + 0.004, LE + DH + 0.025, HF.zs], T.line);
  wallZ(g, WX, WX + dz, HF_END, SZ, L0, L0 + DH, T.dado, [{ z0: 2.55, z1: 3.5, y0: -1, y1: 3 }]); wallZ(g, WX, WX + dz + 0.004, HF_END, SZ, L0 + DH, L0 + DH + 0.025, T.line, [{ z0: 2.55, z1: 3.5, y0: -1, y1: 3 }]);
  wallX(g, SZ - dz, SZ, WX, EX, L0, L0 + DH, T.dado, [{ x0: 5.73, x1: 6.65, y0: -1, y1: 3 }]); wallX(g, SZ - dz - 0.004, SZ, WX, EX, L0 + DH, L0 + DH + 0.025, T.line, [{ x0: 5.73, x1: 6.65, y0: -1, y1: 3 }]);
  B(g, EX - dz, EX, L0, L0 + DH, UP.zs, SZ, T.dado);
  quad(g, [EX - dz, line(UP_END), UP_END], [EX - dz, line(UP.zs), UP.zs], [EX - dz, line(UP.zs) + 1.0, UP.zs], [EX - dz, line(UP_END) + 1.0, UP_END], T.dado);
  // Sockelleisten im Keller (grau)
  for (const [x0, x1, z0, z1] of [[PX1, PX1 + 0.012, KT_END, SZ], [EX - 0.012, EX, KT_END, KZ], [WX, WX + 0.012, UP.zs, 3.4], [WX, WX + 0.012, 4.3, SZ]]) B(g, x0, x1, LK, LK + 0.09, z0, z1, T.steel);
  // ---- Geländer: Halbtreppe + Podest zur Kellertreppe hin ----
  const RX = 5.6, hy = (z) => (z < HF.zs ? LE : z > HF_END ? L0 : LE + (z - HF.zs) / (HF_END - HF.zs) * (L0 - LE));
  B(g, RX - 0.045, RX + 0.045, LE, LE + 1.12, HF.zs - 0.09, HF.zs, T.rail); // Antrittspfosten
  rod(g, [RX, hy(HF.zs) + 0.95, HF.zs - 0.04], [RX, hy(HF_END) + 0.95, HF_END], 0.028, T.rail, 12);
  rod(g, [RX, L0 + 0.95, HF_END], [RX, L0 + 0.95, UP.zs - 0.04], 0.028, T.rail, 12);
  for (let z = HF.zs + 0.12; z < UP.zs - 0.06; z += 0.12) { const y0 = hy(z) + (z < HF_END ? 0.02 : 0), y1 = hy(z) + 0.93; rod(g, [RX, y0, z], [RX, y1, z], 0.011, T.bal, 8); }
  rod(g, [RX, hy(HF.zs) + 0.04, HF.zs], [RX, hy(HF_END) + 0.04, HF_END], 0.02, T.bal, 8); // Fußleiste
  // ---- Geländer der Treppe nach oben (auf der Wange) ----
  const uy = (z) => line(z) + 0.92;
  rod(g, [PX1 - 0.02, uy(UP.zs) + 0.1, UP.zs], [PX1 - 0.02, uy(UP_END), UP_END], 0.028, T.rail, 12);
  for (let k = 1; k < UP.R; k++) { const z = UP.zs - (k - 0.5) * UP.run; rod(g, [PX1 - 0.02, line(z) + 0.3, z], [PX1 - 0.02, uy(z), z], 0.011, T.bal, 8); }
  B(g, PX1 - 0.065, PX1 + 0.025, L0, uy(UP.zs) + 0.12, UP.zs - 0.03, UP.zs + 0.06, T.rail);
  B(g, PX1 - 0.065, PX1 + 0.025, LU, LU + 1.05, UP_END - 0.08, UP_END, T.rail);
  // Handlauf an der Kellerwand (Ost) auf Haltern
  const ky = (z) => LE + 0.9 - (z - KT.zs) / (KT_END - KT.zs) * (LE - LK);
  rod(g, [EX - 0.07, ky(KT.zs - 0.15), KT.zs - 0.15], [EX - 0.07, ky(KT_END + 0.2), KT_END + 0.2], 0.02, T.steel, 10);
  for (const z of [KT.zs + 0.1, (KT.zs + KT_END) / 2, KT_END]) rod(g, [EX - 0.07, ky(z), z], [EX, ky(z), z], 0.008, T.steel, 6);
  // ---- Türrahmen ----
  // Wohnungstür (Flurseite): Futter + Bekleidung
  for (const [z0, z1] of [[2.6, 2.63], [3.42, 3.45]]) B(g, 4.0, WX + 0.01, L0, 2.05, z0, z1, T.frame);
  B(g, 4.0, WX + 0.01, 2.02, 2.05, 2.6, 3.45, T.frame);
  for (const [z0, z1] of [[2.53, 2.6], [3.45, 3.52]]) B(g, WX, WX + 0.02, L0, 2.12, z0, z1, T.frame);
  B(g, WX, WX + 0.02, 2.05, 2.12, 2.53, 3.52, T.frame);
  // Türschwellen (schließen den Boden in der Maueröffnung)
  B(g, 3.98, WX + 0.02, L0 - 0.12, L0 + 0.008, 2.6, 3.45, mat('hSill', { color: 0x6b4a30, roughness: 0.55 }));
  B(g, 3.98, WX + 0.02, LK - 0.15, LK + 0.01, 3.4, 4.3, T.steel);
  // Kellertür (Gangseite)
  for (const [z0, z1] of [[3.4, 3.43], [4.27, 4.3]]) B(g, 4.0, WX + 0.01, LK, LK + 2.05, z0, z1, T.steel);
  B(g, 4.0, WX + 0.01, LK + 2.02, LK + 2.05, 3.4, 4.3, T.steel);
  for (const [z0, z1] of [[3.34, 3.4], [4.3, 4.36]]) B(g, WX, WX + 0.02, LK, LK + 2.1, z0, z1, T.doorKD);
  B(g, WX, WX + 0.02, LK + 2.05, LK + 2.1, 3.34, 4.36, T.doorKD);
  // Nachbartür (Podest Süd): zu
  B(g, 5.78, 6.6, L0, 2.05, SZ + 0.04, SZ + 0.085, T.doorN);
  for (const [y0, y1] of [[0.2, 0.9], [1.1, 1.85]]) B(g, 5.86, 6.52, y0, y1, SZ + 0.03, SZ + 0.04, mat('hDoorND', { color: 0x67452e, roughness: 0.5 }));
  for (const [x0, x1] of [[5.71, 5.78], [6.6, 6.67]]) B(g, x0, x1, L0, 2.12, SZ - 0.02, SZ, T.frame); B(g, 5.71, 6.67, 2.05, 2.12, SZ - 0.02, SZ, T.frame);
  B(g, 5.84, 5.88, 0.98, 1.12, SZ + 0.02, SZ + 0.04, T.brass); rod(g, [5.86, 1.06, SZ + 0.02], [5.96, 1.06, SZ + 0.02], 0.009, T.brass, 8);
  sign(g, 0.16, 0.05, label([{ text: 'KOWALCZYK', font: 'bold 30px Georgia, serif', color: '#2a1d10' }], 256, 80, '#d8c08a'), 6.19, 1.6, SZ + 0.028, Math.PI);
  doorMat(g, 5.85, 6.55, 4.12, 4.55, L0, T.matN);
  // Haustür: Holz mit Milchglas, Ziergitter, Oberlicht
  wallX(g, NZ - 0.07, NZ - 0.02, 5.0, 6.0, LE, LE + 2.2, T.haus, [{ x0: 5.08, x1: 5.46, y0: LE + 1.05, y1: LE + 2.0 }, { x0: 5.54, x1: 5.92, y0: LE + 1.05, y1: LE + 2.0 }]);
  for (const x0 of [5.08, 5.54]) { const gl = B(g, x0, x0 + 0.38, LE + 1.05, LE + 2.0, NZ - 0.05, NZ - 0.04, glass); gl.userData.frost = true; for (let i = 1; i < 4; i++) rod(g, [x0 + 0.095 * i, LE + 1.05, NZ - 0.018], [x0 + 0.095 * i, LE + 2.0, NZ - 0.018], 0.006, M.black(), 6); rod(g, [x0, LE + 1.52, NZ - 0.018], [x0 + 0.38, LE + 1.52, NZ - 0.018], 0.006, M.black(), 6); }
  for (const [x0, x1, y0, y1] of [[5.08, 5.46, LE + 0.15, LE + 0.85], [5.54, 5.92, LE + 0.15, LE + 0.85]]) B(g, x0, x1, y0, y1, NZ - 0.02, NZ - 0.01, mat('hHausD', { color: 0x243a2d, roughness: 0.45 }));
  { const gl = B(g, 5.0, 6.0, LE + 2.27, LE + 2.75, NZ - 0.075, NZ - 0.065, glass); gl.userData.frost = true; for (let i = 1; i < 5; i++) rod(g, [5.0 + i * 0.2, LE + 2.27, NZ - 0.03], [5.0 + i * 0.2, LE + 2.75, NZ - 0.03], 0.006, M.black(), 6); }
  B(g, 4.94, 6.06, LE + 2.2, LE + 2.27, NZ - 0.08, NZ - 0.01, T.haus);
  for (const [x0, x1] of [[4.92, 5.0], [6.0, 6.08]]) B(g, x0, x1, LE, LE + 2.78, NZ - 0.01, NZ + 0.01, T.frame); B(g, 4.92, 6.08, LE + 2.7, LE + 2.78, NZ - 0.01, NZ + 0.01, T.frame);
  B(g, 5.88, 5.93, LE + 0.95, LE + 1.15, NZ - 0.01, NZ + 0.005, T.brass); rod(g, [5.9, LE + 1.07, NZ + 0.03], [5.78, LE + 1.07, NZ + 0.03], 0.011, T.brass, 8); rod(g, [5.9, LE + 1.07, NZ], [5.9, LE + 1.07, NZ + 0.03], 0.009, T.brass, 8);
  doorMat(g, 5.1, 5.9, NZ + 0.05, NZ + 0.6, LE, T.mat);
  // Treppenhausfenster (Milchglas mit Sprossen)
  { const gl = B(g, 5.85, 6.6, 3.3, 4.95, NZ - 0.08, NZ - 0.07, glass); gl.userData.frost = true; rod(g, [6.225, 3.3, NZ - 0.06], [6.225, 4.95, NZ - 0.06], 0.012, T.frame, 6); rod(g, [5.85, 4.1, NZ - 0.06], [6.6, 4.1, NZ - 0.06], 0.012, T.frame, 6); B(g, 5.8, 6.65, 3.24, 3.3, NZ - 0.02, NZ + 0.1, T.frame); }
  // Wohnungstür: Fußmatte, Klingelschild, Lichtschalter
  doorMat(g, WX + 0.05, WX + 0.5, 2.68, 3.38, L0, T.mat);
  sign(g, 0.1, 0.06, label([{ text: '2', font: 'bold 60px Georgia, serif', color: '#3a2a12' }], 128, 80, '#c9a24a'), WX + 0.021, 1.62, 3.66, Math.PI / 2);
  lightSwitch(g, WX + 0.01, 1.05, 3.68, Math.PI / 2, T); lightSwitch(g, WX + 0.01, LE + 1.05, NZ + 0.35, Math.PI / 2, T);
  lightSwitch(g, EX - 0.01, LE + 1.05, -0.05, -Math.PI / 2, T); lightSwitch(g, WX + 0.01, LK + 1.05, 3.3 + 0.03, Math.PI / 2, T);
  // Briefkästen am Podest (Südwand), darunter landen die Pakete
  { const x0 = 4.32, y0 = 0.98, bw = 0.34, bh = 0.24; B(g, x0 - 0.02, x0 + 3 * bw + 0.02, y0 - 0.02, y0 + 2 * bh + 0.02, SZ - 0.13, SZ, T.mboxD);
    const names = ['Yilmaz', 'Hübner', 'Kowalczyk', 'Braun', '—', 'Wohnung 2'];
    for (let i = 0; i < 6; i++) { const cx = x0 + (i % 3) * bw + bw / 2, cy = y0 + Math.floor(i / 3) * bh + bh / 2;
      B(g, cx - bw / 2 + 0.008, cx + bw / 2 - 0.008, cy - bh / 2 + 0.008, cy + bh / 2 - 0.008, SZ - 0.14, SZ - 0.13, T.mbox);
      B(g, cx - 0.1, cx + 0.1, cy + 0.04, cy + 0.06, SZ - 0.15, SZ - 0.14, T.mboxD);
      sign(g, 0.11, 0.028, label([{ text: names[i], font: 'bold 26px Arial', color: '#1d1d1d' }], 192, 48, i === 5 ? '#fff6c8' : '#e8e8e2'), cx, cy - 0.05, SZ - 0.151, Math.PI);
    } }
  // Schild „Keller“ über dem Abgang, Hausordnung im Eingang
  sign(g, 0.36, 0.12, label([{ text: 'KELLER ↓', font: 'bold 64px Arial', color: '#f2f2f2' }], 320, 110, '#24402f'), 6.25, 1.72, 0.25, Math.PI);
  for (const x of [6.12, 6.38]) rod(g, [x, 1.78, 0.25], [x, line(0.25) - 0.19, 0.25], 0.003, M.black(), 4);
  { const c = document.createElement('canvas'); c.width = 256; c.height = 340; const x = c.getContext('2d'); x.fillStyle = '#f3ecda'; x.fillRect(0, 0, 256, 340); x.fillStyle = '#2a2015'; x.font = 'bold 26px Georgia, serif'; x.textAlign = 'center'; x.fillText('Hausordnung', 128, 42); x.font = '14px Georgia, serif'; x.textAlign = 'left'; const L = ['§1 Ruhezeiten 13–15 und', '     ab 22 Uhr einhalten.', '§2 Treppenhaus wöchentlich', '     reinigen (siehe Plan).', '§3 Kinderwagen und Fahrräder', '     nicht im Flur abstellen.', '§4 Kellertür stets', '     verschlossen halten.', '§5 Mülltrennung beachten!', '', '       Die Hausverwaltung']; L.forEach((l, i) => x.fillText(l, 18, 82 + i * 22)); x.strokeStyle = '#5a4630'; x.lineWidth = 6; x.strokeRect(3, 3, 250, 334);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.shared = true; const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }); m.userData.shared = true; sign(g, 0.3, 0.4, m, WX + 0.012, LE + 1.65, -0.9, Math.PI / 2); }
  // Kinderwagen der Nachbarn am Fuß der Treppe nach oben, Fahrrad im Eingang
  stroller(g, 6.1, 3.75, 0.08, T);
  bike(g, 6.62, LE, -1.25, Math.PI / 2 - 0.06);
  // Lampen
  globeLamp(g, 4.85, LC, 2.9, T.globe); globeLamp(g, 4.85, LC, -1.1, T.globe); globeLamp(g, 6.25, LS, -1.5, T.globeDim);
  cageLamp(g, EX, -0.15, 1.55, T);
  { const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 20), T.steel); bulb.position.set(6.25, -0.335, 4.7); g.add(bulb); const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 20), T.globeK); gl.position.set(6.25, -0.375, 4.7); g.add(gl); }
  // Kabel und Rohre im Kellergang
  rod(g, [PX1 + 0.08, -0.38, KT_END], [PX1 + 0.08, -0.38, KZ2], 0.035, mat('hPipe', { color: 0x8d9298, roughness: 0.4, metalness: 0.6 }), 10);
  rod(g, [EX - 0.1, -0.42, KT_END + 0.4], [EX - 0.1, -0.42, KZ2], 0.012, T.cable, 6);
  // Zählertafel (Stromzähler der Mieter) an der Ostwand
  { const z0 = 5.0, y0 = LK + 1.15; B(g, EX - 0.03, EX, y0, y0 + 0.9, z0, z0 + 1.2, mat('hBoard', { color: 0x4b4f48, roughness: 0.7 }));
    for (let i = 0; i < 4; i++) { const cz = z0 + 0.17 + i * 0.29; B(g, EX - 0.16, EX - 0.03, y0 + 0.28, y0 + 0.62, cz - 0.1, cz + 0.1, mat('hMeter', { color: 0x2a2c2e, roughness: 0.4 }));
      sign(g, 0.16, 0.12, label([{ text: '0' + (3471 + i * 811) % 99999, font: 'bold 34px monospace', color: '#111' }, { text: 'kWh', font: '22px Arial', color: '#333' }], 160, 120, '#e6e1d2'), EX - 0.161, y0 + 0.48, cz, -Math.PI / 2); }
    sign(g, 0.3, 0.08, label([{ text: 'ZÄHLER HH', font: 'bold 40px Arial', color: '#eee' }], 256, 70, '#7a2a1e'), EX - 0.031, y0 + 0.8, z0 + 0.6, -Math.PI / 2); }
  // Lattenverschlag am Gangende mit Vorhängeschloss, dahinter Gerümpel
  { for (let i = 0; i < 14; i++) { const x0 = PX1 + 0.02 + i * 0.085; B(g, x0, x0 + 0.06, LK + 0.02, -0.32, KZ, KZ + 0.025, T.slat); }
    for (const y of [LK + 0.3, LK + 1.9]) B(g, PX1, EX, y, y + 0.08, KZ + 0.025, KZ + 0.05, T.slat);
    B(g, 6.3, 6.36, LK + 1.0, LK + 1.08, KZ - 0.02, KZ, T.steel);
    const lock = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 12), T.steel); lock.position.set(6.33, LK + 0.98, KZ - 0.03); g.add(lock); B(g, 6.31, 6.35, LK + 0.91, LK + 0.96, KZ - 0.04, KZ - 0.02, T.brass);
    const card = mat('hCarton', { color: 0xa8865c, roughness: 0.95 });
    for (const [x, y, z, w, h, d] of [[5.95, LK, 7.1, 0.5, 0.4, 0.4], [6.45, LK, 7.25, 0.45, 0.55, 0.4], [6.0, LK + 0.4, 7.15, 0.4, 0.3, 0.35], [6.4, LK, 6.85, 0.35, 0.25, 0.3]]) B(g, x - w / 2, x + w / 2, y, y + h, z - d / 2, z + d / 2, card);
    sign(g, 0.18, 0.06, label([{ text: '1. OG re.', font: 'bold 30px Arial', color: '#222' }], 192, 64, '#f0ead8'), 6.0, LK + 1.6, KZ - 0.002, Math.PI);
    sign(g, 0.2, 0.07, label([{ text: 'HP links', font: 'bold 30px Arial', color: '#222' }], 192, 64, '#f0ead8'), WX + 0.025, LK + 1.65, 3.85, Math.PI / 2); }
  return g;
}

// ---------- Paket (gelb-brauner Karton, Klebeband, Etikett) ----------
const parcelBase = () => mat('hParcel', { map: ctex('hParcelTex', 256, 256, (g, W) => { g.fillStyle = '#c49a5e'; g.fillRect(0, 0, W, W); for (let k = 0; k < 2000; k++) { g.fillStyle = rnd() < 0.5 ? 'rgba(90,60,30,.08)' : 'rgba(255,230,180,.08)'; g.fillRect(rnd() * W, rnd() * W, 2, 1); } g.fillStyle = '#f2c230'; g.fillRect(0, W * 0.72, W, W * 0.14); g.fillStyle = '#b8201c'; g.font = 'bold 30px Arial'; g.fillText('SCHNELLPAKET', 14, W * 0.83); }), roughness: 0.92 });
export function parcelModel(text, seed = 0) {
  const g = new THREE.Group(), r = (n) => ((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  const big = /grafik|gpu|karte|netzteil|mainboard/i.test(text || ''), w = big ? 0.5 : 0.34 + r(1) * 0.12, h = big ? 0.2 : 0.16 + r(2) * 0.12, d = big ? 0.34 : 0.26 + r(3) * 0.1;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), parcelBase()); body.position.y = h / 2; body.castShadow = body.receiveShadow = true; g.add(body);
  const tape = mat('hTape', { color: 0xd9c08a, roughness: 0.35 });
  for (const [sx, sz] of [[w + 0.004, 0.05], [0.05, d + 0.004]]) { const t = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.003, sz), tape); t.position.y = h + 0.0015; g.add(t); }
  const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, h * 0.6, 0.003), tape); t2.position.set(0, h * 0.7, d / 2 + 0.0015); g.add(t2);
  const c = document.createElement('canvas'); c.width = 256; c.height = 160; const x = c.getContext('2d');
  x.fillStyle = '#fbfaf5'; x.fillRect(0, 0, 256, 160); x.fillStyle = '#111'; x.font = 'bold 20px Arial'; x.fillText('An: Wohnung 2, HP links', 10, 28); x.font = '18px Arial'; x.fillText('Lindental · Hinterhaus', 10, 52);
  x.font = 'bold 26px Arial'; x.fillStyle = '#b8201c'; x.fillText(String(text || 'Paket').slice(0, 16), 10, 88);
  x.fillStyle = '#111'; let px = 10; while (px < 240) { const bw = 1 + Math.floor(r(px) * 3); if (r(px + 0.5) > 0.35) x.fillRect(px, 104, bw, 44); px += bw + 1; }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(0.2, w * 0.5), Math.min(0.125, w * 0.31)), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  lab.rotation.x = -Math.PI / 2; lab.rotation.z = 0.1 - r(4) * 0.2; lab.position.set(w * 0.18, h + 0.004, -d * 0.12); g.add(lab);
  g.userData.size = [w, h, d];
  return g;
}

// ---------- Haus bauen ----------
export function buildHouse() {
  const T = MAT();
  const root = new THREE.Group(); root.name = 'house';
  // Milchglas: leuchtet mit dem Tageslicht (Welt setzt emissiveIntensity)
  const glass = new THREE.MeshStandardMaterial({ color: 0xd6dde2, emissive: 0xd8e6f2, emissiveIntensity: 0.6, roughness: 0.7 }); glass.userData.shared = true;
  const stat = instance('house:static', () => buildStatic(T, glass), { lod: false });
  root.add(stat);
  // Türen
  const doors = {};
  const mkDoor = (key, leaf, hinge, openRot, cx, cy, cz) => { const piv = new THREE.Group(); piv.position.set(...hinge); piv.add(leaf); leaf.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); root.add(piv); doors[key] = { pivot: piv, open: openRot, t: 0, c: [cx, cy, cz] }; };
  mkDoor('apt', instance('house:aptLeaf', () => aptLeaf(T), { lod: false }), [4.06, L0, 3.42], 1.52, 4.09, L0 + 1.0, 3.025);
  mkDoor('keller', instance('house:kellerLeaf', () => kellerLeaf(T), { lod: false }), [4.06, LK, 4.27], 1.52, 4.09, LK + 1.0, 3.85);
  // Treffer-Flächen: Haustür (Reisen), Kellertür (nur abgeschlossen: Hinweis)
  const hit = (c, s, door) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...s), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(...c); m.userData.door = door; m.userData.hit = true; root.add(m); return m; };
  hit([5.5, LE + 1.1, NZ + 0.02], [1.0, 2.2, 0.16], { kind: 'haustuer', label: 'Haustür', c: [5.5, LE + 1.1, NZ] });
  hit([4.12, LK + 1.0, 3.85], [0.16, 2.0, 0.86], { kind: 'kellertuer', label: 'Kellertür', c: [4.1, LK + 1.0, 3.85] });
  const parcels = new THREE.Group(); parcels.name = 'parcels'; root.add(parcels);
  // Lichter (Haus-Koordinaten): Treppenhaus warm, Keller kühl
  const lights = [
    { pos: [4.85, LC - 0.35, 2.9], color: 0xffcf96, intensity: 2.2, dist: 7.5 },
    { pos: [4.85, LC - 0.35, -1.1], color: 0xffcf96, intensity: 2.4, dist: 7.5 },
    { pos: [EX - 0.25, -0.2, 1.55], color: 0xdbe6ff, intensity: 0.85, dist: 4.6 },
    { pos: [6.25, -0.55, 4.7], color: 0xd8e4ff, intensity: 1.9, dist: 5.5 },
  ];
  // Begehbare Flächen: {x0,x1,z0,z1, y | ramp:[za,ya,zb,yb], door?}
  const walk = [
    { x0: WX, x1: PX0, z0: HF_END + HF.run / 2, z1: SZ, y: L0 },
    { x0: PX0, x1: EX, z0: UP.zs, z1: SZ, y: L0 },
    { x0: 3.95, x1: WX + 0.02, z0: 2.635, z1: 3.415, y: L0, door: 'apt' },
    { x0: WX, x1: PX0, z0: HF.zs - HF.run / 2, z1: HF_END + HF.run / 2, ramp: [HF.zs - HF.run / 2, LE, HF_END + HF.run / 2, L0] },
    { x0: WX, x1: EX, z0: NZ, z1: HF.zs, y: LE },
    { x0: PX1, x1: EX, z0: KT.zs - KT.run / 2, z1: KT_END + KT.run / 2, ramp: [KT.zs - KT.run / 2, LE, KT_END + KT.run / 2, LK] },
    { x0: PX1, x1: EX, z0: KT_END, z1: KZ, y: LK },
    { x0: WX, x1: PX1, z0: UP.zs, z1: SZ, y: LK },
    { x0: 3.95, x1: WX + 0.02, z0: 3.435, z1: 4.265, y: LK, door: 'keller' },
  ];
  // Feste Hindernisse mit Höhenbereich {x0,x1,z0,z1,y0,y1}
  const solid = [];
  const S = (x0, x1, z0, z1, y0 = -4, y1 = 7) => solid.push({ x0, x1, z0, z1, y0, y1 });
  // Westwand mit Öffnungen (Wohnungstür, Kellertür)
  S(4.0, WX, NZ - 0.15, 2.6); S(4.0, WX, 2.6, 3.4, -4, L0 - 0.02); S(4.0, WX, 2.6, 3.45, 2.05, 7); S(4.0, WX, 3.4, 3.45, LK + 2.05, L0 - 0.02);
  S(4.0, WX, 3.45, 4.3, LK + 2.05, 7); S(4.0, WX, 4.3, KZ2 + 0.15);
  S(EX, EX + 0.15, NZ - 0.15, KZ2 + 0.15); S(4.0, EX + 0.15, NZ - 0.15, NZ);
  S(4.0, EX + 0.15, SZ, SZ + 0.15, -0.3, 7); S(4.0, PX1, SZ, KZ2 + 0.15, -4, -0.3); S(PX1, EX, KZ, KZ + 0.06, -4, -0.3);
  S(PX0, PX1, HF.zs, UP.zs, -4, L0 + 1.0); S(PX0 - 0.03, PX1, HF.zs - 0.1, HF.zs, -4, LE + 1.12); // Brüstung + Antrittspfosten
  S(5.78, 6.45, 3.32, 4.16, -0.3, 1.1);                          // Kinderwagen
  S(6.38, EX, -1.95, -0.55, LE - 0.1, LE + 1.1);                 // Fahrrad
  S(4.32, 5.36, SZ - 0.15, SZ, 0.9, 1.5);                        // Briefkästen
  S(EX - 0.17, EX, 5.0, 6.2, LK + 1.15, LK + 2.05);              // Zählertafel
  const P = {
    haustuerSpawn: { x: 5.5, y: LE, z: -1.45, look: [4.9, 1.6] },
    aptDoor: [4.25, L0 + 1.3, 3.025], kellerDoor: [4.3, LK + 1.3, 3.85], haustuer: [5.5, LE + 1.35, NZ + 0.05],
    stairTop: [6.25, LE + 0.75, 0.35], stairBottom: [6.25, LK + 1.0, 2.95], landing: [4.9, L0 + 0.9, 1.9],
    parcels: [4.52, L0, 4.1],
  };
  const glassMats = [glass];
  const lampMats = [[T.globe, 1.6], [T.globeK, 1.8], [T.globeDim, 0.7]]; // Treppenhauslicht: geht an, sobald man im Flur ist
  // Decken/Böden als Sichtschutz für den Zielstrahl (z. B. Pakete auf dem Podest nicht durch die Kellerdecke anvisieren)
  const slabs = [{ x0: WX, x1: EX, z0: UP.zs, z1: SZ, y0: -0.3, y1: -0.04 }, { x0: WX, x1: PX1, z0: HF.zs, z1: UP.zs, y0: LK, y1: -0.04 }, { x0: PX1, x1: EX, z0: SZ, z1: KZ2, y0: -0.3, y1: -0.15 }, { x0: WX, x1: EX, z0: NZ, z1: HF.zs, y0: LE - 0.15, y1: LE }, { x0: WX, x1: EX, z0: NZ, z1: SZ, y0: LC, y1: LC + 0.15 }];
  return { root, doors, parcels, lights, walk, solid, slabs, points: P, glass: glassMats, lampMats, switchDown: -1.95, switchUp: -1.6 };
}

const hofMats = new Map();
// ---------- Hof hinter dem Haus (aus der Wohnung und den Kellerfenstern zu sehen) ----------
// In Haus-Koordinaten gebaut; die Welt verschiebt die Gruppe in die Szene. Hofboden y = −1,12 mit Loch für das Gebäude.
export function buildHof(nightMats, nightGround, facade) {
  const g = new THREE.Group(), GY = -1.12;
  const shape = new THREE.Shape([[-60, 60], [70, 60], [70, -70], [-60, -70]].map(([x, z]) => new THREE.Vector2(x, -z)));
  shape.holes.push(new THREE.Path(FOOTPRINT.map(([x, z]) => new THREE.Vector2(x, -z)).reverse()));
  const pav = mat('hofPave', { map: ctex('hofPaveTex', 512, 512, (x, W) => { x.fillStyle = '#7d7a74'; x.fillRect(0, 0, W, W); const s = W / 12; for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) { const v = 105 + rnd() * 40; x.fillStyle = `rgb(${v},${v - 3},${v - 8})`; x.beginPath(); x.ellipse((i + 0.5 + (j % 2) * 0.5) * s, (j + 0.5) * s, s * 0.45, s * 0.42, rnd(), 0, 7); x.fill(); } }), roughness: 0.95 });
  pav.userData.day ??= pav.color.clone(); pav.userData.night ??= new THREE.Color(0x30323a); if (!nightGround.includes(pav)) nightGround.push(pav);
  const geo = new THREE.ShapeGeometry(shape); geo.rotateX(-Math.PI / 2);
  { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.6, uv.getY(i) / 1.6); }
  const ground = new THREE.Mesh(geo, pav); ground.position.y = GY; ground.receiveShadow = true; g.add(ground);
  // Vorderhaus (Rückfassade) gegenüber, Seitenflügel links und rechts
  // Fassaden-Kachel = 4 Fensterachsen × 3 Geschosse ≈ 10 × 9 m
  const facRep = (col, rx, ry) => { const k = col + '|' + rx + 'x' + ry; if (hofMats.has(k)) return hofMats.get(k); const b = facade(col), m = b.clone(); for (const key of ['map', 'emissiveMap']) { const t = b[key].clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.needsUpdate = true; t.userData.shared = true; m[key] = t; } m.userData.shared = true; nightMats.push(m); hofMats.set(k, m); return m; };
  const fac = (w, h, d, col, x, z) => { const mats = [facRep(col, d / 10, h / 9), facRep(col, d / 10, h / 9), M.darkMetal(), M.darkMetal(), facRep(col, w / 10, h / 9), facRep(col, w / 10, h / 9)]; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats); m.position.set(x, GY + h / 2, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  fac(30, 17, 10, '#d9cdb4', 2, -16);
  fac(10, 14, 16, '#cfc4ae', -12, -3); fac(10, 14, 16, '#e2d5bd', 17, -3);
  // Mülltonnen, Teppichstange, Fahrradständer, Kastanie
  const bin = (x, z, col) => { const b = new THREE.Group(); b.position.set(x, GY, z); g.add(b); const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.0, 0.72), mat('bin' + col, { color: col, roughness: 0.6 })); body.position.y = 0.5; body.castShadow = true; b.add(body); const lid = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.78), mat('binLid' + col, { color: col, roughness: 0.5 })); lid.position.set(0, 1.03, 0.02); lid.rotation.x = -0.06; b.add(lid); for (const sx of [-0.22, 0.22]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 14), M.rubber()); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.09, 0.36); b.add(w); } };
  bin(-1.8, -1.6, 0x3a3f44); bin(-1.1, -1.6, 0x2f5a9e); bin(-0.4, -1.6, 0xc9a227); bin(0.3, -1.6, 0x6b4a2a);
  { const pm = mat('hofPole', { color: 0x4a4f54, roughness: 0.5, metalness: 0.6 }); rod(g, [-4.5, GY, -6], [-4.5, GY + 1.9, -6], 0.03, pm); rod(g, [-1.5, GY, -6], [-1.5, GY + 1.9, -6], 0.03, pm); rod(g, [-4.5, GY + 1.85, -6], [-1.5, GY + 1.85, -6], 0.025, pm); }
  { const pm = mat('hofRack', { color: 0x9aa0a6, roughness: 0.4, metalness: 0.7 }); for (let i = 0; i < 4; i++) { const x = 2.2 + i * 0.7; const a = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.02, 6, 16, Math.PI), pm); a.position.set(x, GY, -4.2); g.add(a); } bike(g, 2.9, GY, -4.4, 0.02); }
  { const t = new THREE.Group(); t.position.set(7.5, GY, -8); g.add(t); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.38, 4.2, 10), mat('hofTrunk', { color: 0x4e3a2a, roughness: 1 })); tr.position.y = 2.1; tr.castShadow = true; t.add(tr);
    const leaf = mat('hofLeaf', { color: 0x46753a, roughness: 0.9 }); for (const [x, y, z, r] of [[0, 5.6, 0, 2.6], [1.6, 5.0, 0.8, 1.8], [-1.5, 5.2, -0.6, 1.9], [0.4, 6.8, -0.4, 1.7]]) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leaf); c.position.set(x, y, z); c.castShadow = true; t.add(c); } }

  void nightMats; void nightGround;
  return g;
}
