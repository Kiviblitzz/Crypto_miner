// Prozedurale 3D-Modelle: alles aus Grundkörpern gebaut, dann nach Material zusammengeführt (wenige Draw-Calls)
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { M, mat } from './materials.js';
import { PLACEABLE, PART } from '../data/hardware.js';

// ---------- Helfer ----------
const _boxG = new Map();
function boxGeo(w, h, d) { const k = `${w}|${h}|${d}`; if (!_boxG.has(k)) _boxG.set(k, new THREE.BoxGeometry(w, h, d)); return _boxG.get(k); }
export function box(parent, w, h, d, material, x = 0, y = 0, z = 0, ry = 0) {
  const m = new THREE.Mesh(boxGeo(w, h, d), material); m.position.set(x, y + h / 2, z); m.rotation.y = ry; parent.add(m); return m;
}
export function boxC(parent, w, h, d, material, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(boxGeo(w, h, d), material); m.position.set(x, y, z); parent.add(m); return m; }
export function cyl(parent, rt, rb, h, material, x = 0, y = 0, z = 0, seg = 16, axis = 'y') {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  if (axis === 'z') m.rotation.x = Math.PI / 2; if (axis === 'x') m.rotation.z = Math.PI / 2;
  parent.add(m); return m;
}
function disc(parent, r, material, x, y, z, axis = 'z') { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), material); m.position.set(x, y, z); if (axis === 'y') m.rotation.x = -Math.PI / 2; if (axis === '-z') m.rotation.y = Math.PI; if (axis === 'x') m.rotation.y = Math.PI / 2; if (axis === '-x') m.rotation.y = -Math.PI / 2; parent.add(m); return m; }

// Lüfter: Achse = lokale Z. Gibt Gruppe zurück; Rotor ist als spin markiert
export function fan(parent, r, { blade = M.fanBlade(), frame = M.black(), n = 7, square = false, grill = false, depth = 0.012 } = {}) {
  const g = new THREE.Group(); parent.add(g);
  if (square) { const s = r * 2.15; boxC(g, s, s * 0.12, depth, frame, 0, s / 2 - s * 0.06, 0); boxC(g, s, s * 0.12, depth, frame, 0, -s / 2 + s * 0.06, 0); boxC(g, s * 0.12, s, depth, frame, s / 2 - s * 0.06, 0, 0); boxC(g, s * 0.12, s, depth, frame, -s / 2 + s * 0.06, 0, 0); }
  else { const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, r * 0.06, 6, 24), frame); g.add(ring); }
  const rotor = new THREE.Group(); rotor.userData.spin = true; g.add(rotor);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.32, r * 0.32, depth * 0.9, 16), frame); hub.rotation.x = Math.PI / 2; rotor.add(hub);
  const bg = new THREE.BoxGeometry(r * 0.72, r * 0.3, depth * 0.25);
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(bg, blade); const a = (i / n) * Math.PI * 2;
    b.position.set(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, 0); b.rotation.order = 'ZYX'; b.rotation.set(0.5, 0, a); rotor.add(b);
  }
  if (grill) { const gm = new THREE.Mesh(new THREE.CircleGeometry(r * 1.02, 24), M.grill()); gm.position.z = depth * 0.6; g.add(gm); }
  return g;
}

// ---------- Grafikkarte (Länge entlang X, Höhe Y, Lüfter zeigen nach +Z) ----------
export function gpuModel(parent, look) {
  const g = new THREE.Group(); parent.add(g);
  const L = look.len, H = 0.112, T = 0.016 + 0.016 * look.slot;
  const red = look.brand === 'crimson';
  const shroud = red ? M.shroudDark() : (look.len > 0.28 ? M.shroudSilver() : M.shroudDark());
  const accent = red ? M.crimson() : M.verdant();
  boxC(g, L, H, 0.003, M.pcbGreen(), L / 2, H / 2, -T / 2 + 0.0015);
  boxC(g, L, H - 0.004, T - 0.012, shroud, L / 2, H / 2 + 0.002, 0.002);
  boxC(g, L, 0.006, T - 0.01, accent, L / 2, H - 0.003, 0.002);
  boxC(g, L * 0.98, H * 0.96, 0.002, M.darkMetal(), L / 2, H / 2, -T / 2 - 0.002);
  boxC(g, 0.004, H + 0.012, T + 0.004, M.alu(), -0.002, H / 2 + 0.004, 0);
  boxC(g, 0.07, 0.008, 0.002, M.copper(), L * 0.35, -0.004, -T / 2 + 0.0015);
  boxC(g, 0.03, 0.012, 0.012, M.black(), L - 0.04, H + 0.006, -0.002);
  boxC(g, L * 0.6, 0.005, 0.002, M.rgb(), L / 2, H - 0.012, T / 2 - 0.004);
  const n = look.fans, r = Math.min(H * 0.42, (L / n) * 0.44);
  for (let i = 0; i < n; i++) { const f = fan(g, r, { n: 9, depth: 0.006 }); f.position.set((L / n) * (i + 0.5), H / 2 + 0.002, T / 2 - 0.001); }
  return g;
}

// ---------- Rig-Modelle ----------
function mobo(parent, w, d, x, y, z, vertical = false) {
  const g = new THREE.Group(); parent.add(g);
  boxC(g, w, 0.003, d, M.pcbBlack(), 0, 0, 0);
  boxC(g, 0.05, 0.004, 0.05, M.alu(), -w * 0.2, 0.003, -d * 0.15);
  boxC(g, 0.014, 0.03, d * 0.5, M.black(), w * 0.3, 0.016, -d * 0.1);
  boxC(g, 0.014, 0.03, d * 0.5, M.black(), w * 0.36, 0.016, -d * 0.1);
  boxC(g, 0.04, 0.03, 0.02, M.darkMetal(), -w * 0.45, 0.016, -d * 0.4);
  g.position.set(x, y, z); if (vertical) g.rotation.z = Math.PI / 2; return g;
}
function cpuCooler(parent, x, y, z, rotX = 0) {
  const g = new THREE.Group(); parent.add(g);
  boxC(g, 0.1, 0.12, 0.05, M.fins(), 0, 0.065, 0);
  const f = fan(g, 0.045, { square: true, n: 7 }); f.position.set(0, 0.065, 0.03);
  cyl(g, 0.004, 0.004, 0.06, M.copper(), -0.02, 0.03, 0);
  g.position.set(x, y, z); g.rotation.x = rotX; return g;
}
function psuBox(parent, x, y, z, w = 0.15, h = 0.086, d = 0.16) {
  box(parent, w, h, d, M.black(), x, y, z);
  const f = fan(parent, 0.05, { n: 9, grill: true }); f.position.set(x, y + h + 0.001, z); f.rotation.x = -Math.PI / 2;
  box(parent, 0.02, 0.012, 0.02, M.black(), x - w / 2 + 0.03, y + h * 0.4, z + d / 2);
}

export function buildRig(type, parts) {
  const root = new THREE.Group();
  const gpus = (parts?.gpus || []).map((id) => PART[id]).filter(Boolean);
  if (type === 'tower') {
    const W = 0.22, H = 0.47, D = 0.46;
    box(root, W, 0.008, D, M.black(), 0, 0, 0);
    box(root, 0.008, H, D, M.black(), -W / 2, 0, 0);
    box(root, W, 0.008, D, M.black(), 0, H - 0.008, 0);
    box(root, W, H, 0.01, M.blackGloss(), 0, 0, D / 2);
    box(root, W, H, 0.008, M.black(), 0, 0, -D / 2);
    box(root, 0.004, H - 0.02, D - 0.02, M.glass(), W / 2, 0.01, 0);
    box(root, 0.02, H * 0.9, 0.012, M.rgb(), -W / 2 + 0.02, 0.02, D / 2 - 0.02);
    box(root, 0.006, 0.006, 0.004, M.ledBlue(), W / 2 - 0.04, H - 0.04, D / 2 + 0.006);
    const fr = fan(root, 0.055, { n: 7 }); fr.position.set(0, H * 0.62, D / 2 - 0.02);
    const fb = fan(root, 0.055, { n: 7 }); fb.position.set(0, H * 0.75, -D / 2 + 0.02); fb.rotation.y = Math.PI;
    if (parts?.mobo) mobo(root, 0.3, 0.24, -W / 2 + 0.012, H * 0.6, 0, true).rotation.set(0, 0, -Math.PI / 2);
    if (parts?.cpu) cpuCooler(root, -W / 2 + 0.016, H * 0.78, 0.0, 0).rotation.set(0, 0, -Math.PI / 2);
    if (parts?.psu) psuBox(root, 0, 0.008, -0.08);
    gpus.forEach((g, i) => { const m = gpuModel(root, g.look); m.position.set(-W / 2 + 0.014, H * 0.5 - i * 0.07, -D / 2 + 0.03); m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0))); });
  } else if (type === 'crate') {
    // Milchkiste
    const S = 0.36, Hc = 0.28;
    box(root, S, 0.012, S, M.crate(), 0, 0, 0);
    for (const [x, z, w, d] of [[0, S / 2, S, 0.012], [0, -S / 2, S, 0.012], [S / 2, 0, 0.012, S], [-S / 2, 0, 0.012, S]]) box(root, w, Hc, d, M.crate(), x, 0, z);
    if (parts?.mobo) mobo(root, 0.3, 0.3, 0, Hc + 0.005, 0);
    if (parts?.cpu) cpuCooler(root, -0.05, Hc + 0.008, 0.02);
    if (parts?.psu) psuBox(root, 0.05, 0.012, 0.02, 0.15, 0.086, 0.16);
    // Holzlatte für die GPUs
    box(root, S + 0.06, 0.02, 0.03, mat('woodbar', { color: 0x9b6b3a, roughness: 0.8 }), 0, Hc + 0.18, -0.1);
    gpus.forEach((g, i) => { const n = Math.max(gpus.length, 1); const m = gpuModel(root, g.look); m.position.set(-S / 2 + 0.04 + i * (S / Math.max(n - 0.5, 1)), Hc + 0.06, 0.12); m.rotation.set(0, Math.PI / 2, 0); cableRiser(root, m.position.x, Hc + 0.03, 0.0); });
  } else {
    const def = PLACEABLE[type]; const Wd = def.size[0] - 0.08, D = 0.42, Hf = 0.52;
    const rail = M.alu();
    for (const x of [-Wd / 2, Wd / 2]) for (const z of [-D / 2, D / 2]) box(root, 0.025, Hf, 0.025, rail, x, 0, z);
    for (const y of [0.12, Hf - 0.02]) { box(root, Wd, 0.02, 0.025, rail, 0, y, D / 2); box(root, Wd, 0.02, 0.025, rail, 0, y, -D / 2); }
    for (const x of [-Wd / 2, Wd / 2]) box(root, 0.025, 0.02, D, rail, x, 0.12, 0);
    box(root, Wd, 0.006, D, M.aluDark(), 0, 0.13, 0);
    box(root, Wd, 0.02, 0.025, rail, 0, Hf - 0.02, 0.0);
    if (parts?.mobo) mobo(root, 0.3, 0.25, -Wd / 2 + 0.2, 0.14, -0.02);
    if (parts?.cpu) cpuCooler(root, -Wd / 2 + 0.15, 0.142, -0.02);
    if (parts?.psu) { psuBox(root, Wd / 2 - 0.12, 0.136, -0.04); if (def.maxGpu >= 8) psuBox(root, Wd / 2 - 0.3, 0.136, -0.04); }
    const n = Math.max(1, def.maxGpu), sp = Wd / n;
    gpus.forEach((g, i) => { const m = gpuModel(root, g.look); m.position.set(-Wd / 2 + sp * (i + 0.5) - 0.02, Hf - 0.01, g.look.len / 2 + 0.0); m.rotation.set(0, Math.PI / 2, 0); cableRiser(root, m.position.x, 0.2, 0.05); });
  }
  return root;
}
function cableRiser(root, x, y, z) { box(root, 0.025, 0.012, 0.03, M.black(), x, y, z); cyl(root, 0.003, 0.003, 0.18, M.cableBlue(), x + 0.01, y + 0.1, z + 0.02); }

// ---------- Einzelgeräte ----------
export function buildDevice(look, parent = new THREE.Group()) {
  const g = new THREE.Group(); parent.add(g);
  if (look === 'asic' || look === 'whirl') {
    const W = look === 'whirl' ? 0.15 : 0.16, H = look === 'whirl' ? 0.22 : 0.195, D = look === 'whirl' ? 0.42 : 0.36;
    const body = look === 'whirl' ? mat('whirlBody', { color: 0x3a3f47, roughness: 0.4, metalness: 0.7 }) : M.alu();
    box(g, W, H, D, body, 0, 0, 0);
    box(g, W + 0.002, H * 0.7, D * 0.8, M.fins(), 0, H * 0.15, 0);
    for (const zs of [1, -1]) {
      box(g, W + 0.004, H + 0.004, 0.025, M.black(), 0, -0.002, zs * (D / 2 + 0.012));
      const f = fan(g, 0.066, { n: 7, grill: true, depth: 0.012 }); f.position.set(0, H / 2, zs * (D / 2 + 0.026)); if (zs < 0) f.rotation.y = Math.PI;
      if (look === 'whirl') break;
    }
    if (look === 'asic') { box(g, W * 0.85, 0.07, D * 0.6, M.darkMetal(), 0, H, -0.02); box(g, 0.02, 0.02, 0.02, M.black(), 0.04, H + 0.07, 0.05); }
    box(g, 0.006, 0.006, 0.004, M.ledGreen(), -0.04, H - 0.025, -D / 2 - 0.027);
    box(g, 0.006, 0.006, 0.004, M.ledRed(), -0.025, H - 0.025, -D / 2 - 0.027);
    box(g, 0.016, 0.012, 0.004, M.ledAmber(), 0.04, H - 0.03, -D / 2 - 0.027);
  } else if (look === 'asic_old') {
    const W = 0.2, H = 0.2, D = 0.3;
    for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) box(g, 0.012, H, 0.012, M.alu(), x, 0, z);
    for (let i = 0; i < 4; i++) box(g, W - 0.02, 0.003, D - 0.02, M.pcbBlue(), 0, 0.03 + i * 0.045, 0);
    for (let i = 0; i < 4; i++) box(g, W * 0.7, 0.02, D * 0.6, M.fins(), 0, 0.035 + i * 0.045, 0);
    const f = fan(g, 0.06, { n: 7, square: true }); f.position.set(0, H / 2, D / 2 + 0.01);
    box(g, 0.006, 0.006, 0.004, M.ledGreen2(), 0.07, H - 0.03, D / 2 + 0.01);
  } else if (look === 'hydro') {
    const W = 0.44, H = 0.09, D = 0.56;
    box(g, W, H, D, M.alu(), 0, 0, 0);
    box(g, W * 0.9, 0.004, D * 0.9, M.fins(), 0, H, 0);
    cyl(g, 0.012, 0.012, 0.1, M.hose(), -0.1, H / 2, -D / 2 - 0.05, 10, 'z');
    cyl(g, 0.012, 0.012, 0.1, M.hoseRed(), 0.1, H / 2, -D / 2 - 0.05, 10, 'z');
    box(g, 0.006, 0.006, 0.004, M.ledGreen(), 0.18, H * 0.6, D / 2 + 0.003);
  } else if (look === 'fpga') {
    box(g, 0.2, 0.06, 0.16, mat('acryl', { color: 0xdfe8f0, roughness: 0.1, transparent: true, opacity: 0.5 }), 0, 0, 0);
    box(g, 0.18, 0.004, 0.14, M.pcbGreen(), 0, 0.062, 0);
    for (let i = 0; i < 4; i++) box(g, 0.03, 0.006, 0.03, M.black(), -0.06 + i * 0.04, 0.066, -0.02);
    const f = fan(g, 0.025, { n: 7, square: true }); f.position.set(0.0, 0.08, 0.04); f.rotation.x = -Math.PI / 2;
    box(g, 0.005, 0.005, 0.005, M.ledGreen2(), 0.07, 0.066, 0.05);
  } else if (look === 'usb') {
    box(g, 0.3, 0.025, 0.06, M.black(), 0, 0, 0);
    for (let i = 0; i < 10; i++) { box(g, 0.016, 0.06, 0.008, M.aluDark(), -0.135 + i * 0.03, 0.025, 0.0); box(g, 0.012, 0.004, 0.009, M.ledBlue(), -0.135 + i * 0.03, 0.07, 0); }
    cyl(g, 0.004, 0.004, 0.3, M.cable(), 0.18, 0.01, 0.0, 6, 'x');
  }
  return g;
}

// ---------- Halter ----------
export function buildHolder(type, items = []) {
  const root = new THREE.Group();
  if (type === 'shelf') {
    const W = 0.96, D = 0.46, H = 1.8;
    for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) box(root, 0.03, H, 0.03, mat('shelfBlue', { color: 0x2b5fa8, roughness: 0.5, metalness: 0.5 }), x, 0, z);
    const levels = [0.08, 0.52, 0.96, 1.4];
    for (const y of levels) box(root, W, 0.025, D, mat('shelfBoard', { color: 0xc8b896, roughness: 0.8 }), 0, y, 0);
    items.forEach((it, i) => { const d = PLACEABLE[it.id]; const lv = Math.floor(i / 2), side = i % 2; const m = buildDevice(d.look, root); m.position.set(side ? 0.24 : -0.24, levels[lv] + 0.025, 0); if (d.look === 'asic' || d.look === 'whirl') m.rotation.y = 0; });
  } else if (type === 'rack') {
    const W = 0.62, D = 1.1, H = 2.0;
    box(root, W, 0.08, D, M.black(), 0, 0, 0);
    box(root, W, 0.03, D, M.black(), 0, H - 0.03, 0);
    for (const x of [-W / 2 + 0.01, W / 2 - 0.01]) box(root, 0.02, H, D, M.darkMetal(), x, 0, 0);
    box(root, W - 0.03, H - 0.12, 0.012, M.perforated(), 0, 0.08, D / 2);
    box(root, 0.02, 0.2, 0.03, M.alu(), W / 2 - 0.06, 1.0, D / 2 + 0.02);
    box(root, W - 0.03, 0.06, 0.005, M.ledBlue(), 0, H - 0.1, D / 2 + 0.008);
    const levels = [0.12, 0.6, 1.08, 1.56];
    for (const y of levels) box(root, W - 0.05, 0.012, D - 0.05, M.steel(), 0, y - 0.012, 0);
    items.forEach((it, i) => { const d = PLACEABLE[it.id]; const lv = Math.floor(i / 3), col = i % 3; if (lv > 3) return; const m = buildDevice(d.look, root); if (d.look === 'hydro') { m.position.set(0, levels[lv] + col * 0.12, 0); } else m.position.set(-0.18 + col * 0.18, levels[lv], 0); });
  } else if (type === 'container') {
    const L = 12.2, W = 2.44, H = 2.9;
    const shell = mat('containerShell', { color: 0x2f6f73, roughness: 0.55, metalness: 0.5 });
    const corr = mat('containerCorr', { color: 0x2f6f73, roughness: 0.5, metalness: 0.5, map: null });
    box(root, L, H, W, shell, 0, 0.1, 0);
    // Wellblech-Rippen
    for (let x = -L / 2 + 0.2; x < L / 2 - 0.1; x += 0.3) { box(root, 0.1, H - 0.2, 0.04, corr, x, 0.2, W / 2); box(root, 0.1, H - 0.2, 0.04, corr, x, 0.2, -W / 2); }
    // Füße / Eckbeschläge
    for (const x of [-L / 2, L / 2 - 0.2]) for (const z of [-W / 2, W / 2 - 0.2]) box(root, 0.2, 0.2, 0.2, M.darkMetal(), x + 0.1, 0, z + 0.1);
    // Lüfterwand
    const hydro = items.some((it) => PLACEABLE[it.id]?.hydro);
    if (!hydro) for (let i = 0; i < 10; i++) { const f = fan(root, 0.28, { n: 7, square: true, frame: M.darkMetal(), depth: 0.06 }); f.position.set(-L / 2 + 0.9 + i * 1.15, 1.6, W / 2 + 0.06); }
    else {
      // Trockenkühler auf dem Dach
      box(root, L * 0.8, 0.6, W * 0.9, M.darkMetal(), 0, H + 0.1, 0);
      for (let i = 0; i < 6; i++) { const f = fan(root, 0.38, { n: 7, frame: M.black(), depth: 0.06 }); f.position.set(-L * 0.33 + i * (L * 0.66 / 5), H + 0.72, 0); f.rotation.x = -Math.PI / 2; }
      cyl(root, 0.08, 0.08, H, M.hose(), L / 2 - 0.6, H / 2 + 0.3, W / 2 + 0.1, 10);
      cyl(root, 0.08, 0.08, H, M.hoseRed(), L / 2 - 0.9, H / 2 + 0.3, W / 2 + 0.1, 10);
    }
    // Türen
    box(root, 0.05, H - 0.3, W - 0.2, M.darkMetal(), L / 2 + 0.03, 0.25, 0);
    for (const z of [-0.5, 0.5]) box(root, 0.06, H - 0.5, 0.04, M.steel(), L / 2 + 0.06, 0.35, z);
    // Status-Leiste
    box(root, L * 0.9, 0.06, 0.02, items.length ? M.ledGreen() : M.ledAmber(), 0, H - 0.25, W / 2 + 0.05);
    box(root, 2.0, 0.35, 0.02, mat('hwPlate', { color: 0xf2f2f2, roughness: 0.5 }), L / 2 - 1.6, H - 0.7, -W / 2 - 0.05);
    // Treppe
    for (let i = 0; i < 3; i++) box(root, 0.3, 0.1, 0.9, M.steel(), L / 2 + 0.3 + i * 0.25, i * 0.18, 0);
  }
  return root;
}

// ---------- Kühlung & Deko ----------
export function buildCooling(type) {
  const root = new THREE.Group();
  if (type === 'fan') {
    cyl(root, 0.17, 0.19, 0.03, M.white(), 0, 0.015, 0, 24);
    cyl(root, 0.015, 0.015, 1.0, M.alu(), 0, 0.5, 0, 10);
    box(root, 0.1, 0.1, 0.12, M.white(), 0, 0.98, -0.04);
    const head = new THREE.Group(); head.position.set(0, 1.05, 0.04); root.add(head);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.008, 6, 32), M.white()); head.add(ring);
    const f = fan(head, 0.18, { n: 5, blade: M.fanBladeWhite(), frame: M.white(), depth: 0.02 });
    const gr = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), mat('fanGrill', { color: 0xffffff, transparent: true, opacity: 0.15, depthWrite: false })); gr.position.z = 0.03; head.add(gr);
  } else if (type === 'mobileac') {
    box(root, 0.45, 0.76, 0.36, M.white(), 0, 0, 0);
    for (let i = 0; i < 6; i++) box(root, 0.38, 0.01, 0.02, M.offwhite(), 0, 0.5 + i * 0.035, 0.18);
    box(root, 0.08, 0.03, 0.005, M.ledBlue(), 0.12, 0.7, 0.181);
    cyl(root, 0.07, 0.07, 0.7, mat('hoseGrey', { color: 0xbfc3c7, roughness: 0.7 }), 0, 0.85, -0.3, 12).rotation.x = 1.0;
  } else if (type === 'splitac') {
    box(root, 0.9, 1.7, 0.36, M.white(), 0, 0, 0);
    for (let i = 0; i < 10; i++) box(root, 0.8, 0.012, 0.03, M.offwhite(), 0, 1.0 + i * 0.05, 0.18);
    box(root, 0.16, 0.06, 0.006, M.screen(), 0, 0.8, 0.181);
  } else if (type === 'indfan') {
    const fr = M.darkMetal();
    box(root, 0.95, 0.08, 0.4, fr, 0, 0, 0);
    const f = fan(root, 0.42, { n: 5, square: true, frame: fr, depth: 0.3, blade: mat('indBlade', { color: 0x8d949c, roughness: 0.4, metalness: 0.8, side: THREE.DoubleSide }) });
    f.position.set(0, 0.55, 0);
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), M.grill()); gr.position.set(0, 0.55, 0.16); root.add(gr);
  } else if (type === 'evap') {
    box(root, 1.4, 1.5, 0.9, mat('evapBody', { color: 0xd9dcd2, roughness: 0.6 }), 0, 0, 0);
    box(root, 1.2, 1.1, 0.02, mat('evapPad', { color: 0xc7a86a, roughness: 0.9 }), 0, 0.2, 0.45);
    box(root, 0.02, 1.1, 0.7, mat('evapPad', { color: 0xc7a86a, roughness: 0.9 }), 0.7, 0.2, 0);
    const f = fan(root, 0.4, { n: 6, frame: M.darkMetal(), depth: 0.1 }); f.position.set(0, 1.52, 0); f.rotation.x = -Math.PI / 2;
  } else if (type === 'crac') {
    box(root, 1.9, 2.0, 0.9, mat('cracBody', { color: 0xcfd3d8, roughness: 0.45, metalness: 0.3 }), 0, 0, 0);
    box(root, 1.75, 1.5, 0.01, M.perforated(), 0, 0.1, 0.455);
    box(root, 0.3, 0.18, 0.01, M.screen(), 0.6, 1.72, 0.456);
    box(root, 0.04, 0.04, 0.01, M.ledGreen(), -0.7, 1.75, 0.456);
  }
  return root;
}
export function buildDecor(type) {
  const root = new THREE.Group();
  if (type === 'plant') {
    cyl(root, 0.13, 0.1, 0.25, mat('pot', { color: 0xb5643c, roughness: 0.8 }), 0, 0.125, 0, 16);
    const leaf = mat('leaf', { color: 0x3c8a3a, roughness: 0.7 });
    for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), leaf); const a = i * 2.4; l.scale.set(0.6, 2.6, 0.25); l.position.set(Math.cos(a) * 0.07, 0.42 + (i % 3) * 0.05, Math.sin(a) * 0.07); l.rotation.set(Math.sin(a) * 0.6, a, Math.cos(a) * 0.6); root.add(l); }
  } else if (type === 'lamp') {
    cyl(root, 0.14, 0.14, 0.02, M.black(), 0, 0.01, 0, 20); cyl(root, 0.012, 0.012, 1.5, M.black(), 0, 0.76, 0, 8);
    cyl(root, 0.12, 0.2, 0.25, M.lampShade(), 0, 1.55, 0, 20, 'y').material = M.lampShade();
  } else if (type === 'sofa') {
    const fab = mat('sofaFab', { color: 0x3a3f5c, roughness: 0.95 });
    box(root, 1.4, 0.4, 0.85, fab, 0, 0, 0); box(root, 1.4, 0.45, 0.2, fab, 0, 0.4, -0.33);
    box(root, 0.18, 0.25, 0.85, fab, -0.62, 0.4, 0); box(root, 0.18, 0.25, 0.85, fab, 0.62, 0.4, 0);
    box(root, 0.6, 0.12, 0.6, mat('cushion', { color: 0x5560a0, roughness: 0.95 }), -0.32, 0.4, 0.05);
    box(root, 0.6, 0.12, 0.6, mat('cushion', { color: 0x5560a0, roughness: 0.95 }), 0.32, 0.4, 0.05);
  }
  return root;
}

// ---------- Baking & Instanzen ----------
const templates = new Map();
function bake(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map(); const spins = [];
  const visit = (o) => {
    if (o.userData.spin) { spins.push({ obj: o, m: o.matrixWorld.clone() }); return; }
    if (o.isMesh) {
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
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
export function instance(key, builder) {
  let t = templates.get(key);
  if (!t) { t = bake(builder()); templates.set(key, t); }
  const g = new THREE.Group();
  for (const { geom, mat: m } of t.meshes) { const mesh = new THREE.Mesh(geom, m); mesh.castShadow = !m.transparent; mesh.receiveShadow = true; g.add(mesh); }
  g.userData.fans = [];
  for (const { obj, m } of t.spins) {
    const c = obj.clone(true); m.decompose(c.position, c.quaternion, c.scale); g.add(c); g.userData.fans.push(c);
  }
  g.userData.bbox = t.bbox;
  return g;
}

// Modell für ein Spielobjekt bauen
export function objectModel(o) {
  const def = PLACEABLE[o.type];
  if (def.kind === 'rig') {
    const p = o.parts || {}; const key = `rig:${o.type}:${p.mobo}:${p.cpu}:${p.psu}:${(p.gpus || []).join(',')}`;
    return instance(key, () => buildRig(o.type, p));
  }
  if (def.kind === 'device') return instance(`dev:${def.look}`, () => buildDevice(def.look));
  if (def.kind === 'holder') { const items = o.items || []; const key = `hold:${o.type}:${o.type === 'container' ? (items.length ? (PLACEABLE[items[0].id]?.hydro ? 'h' : 'a') : 'e') : items.map((i) => i.id).join(',')}`; return instance(key, () => buildHolder(o.type, items)); }
  if (def.kind === 'cooling') return instance(`cool:${o.type}`, () => buildCooling(o.type));
  return instance(`decor:${o.type}`, () => buildDecor(o.type));
}
