// Möbel fürs Kinderzimmer (und Wiederverwendung): von Hand modelliert aus weichen, abgerundeten Teilen.
// Jedes Möbel ist lokal um (0,0,0) gebaut, Unterkante y=0.
import * as THREE from 'three';
import { M, mat } from './materials.js';
import { box, boxC, soft, cyl, sph, lathe, tube, rod, plane, X, labelMat } from './models.js';

const C4 = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

export function furniture(type) {
  const g = new THREE.Group();
  if (type === 'bed') {
    // Kopfende bei -Z
    const wood = mat('bedWood', { color: 0xb48c63, roughness: 0.6 }), woodL = mat('bedWoodL', { color: 0xc49e74, roughness: 0.6 });
    for (const [a, b] of C4) box(g, 0.07, 0.34, 0.07, wood, a * 0.465, 0, b * 0.965, 0, 0.012);
    for (const s of [-1, 1]) box(g, 0.05, 0.16, 1.86, woodL, s * 0.475, 0.16, 0, 0, 0.012);
    box(g, 1.0, 0.86, 0.06, wood, 0, 0.0, -0.99, 0, 0.02);
    for (let i = 0; i < 4; i++) box(g, 0.2, 0.42, 0.012, woodL, -0.33 + i * 0.22, 0.38, -0.955, 0, 0.006);
    box(g, 1.06, 0.05, 0.1, woodL, 0, 0.86, -0.99, 0, 0.022);
    box(g, 1.0, 0.44, 0.05, wood, 0, 0.0, 0.985, 0, 0.018);
    box(g, 1.04, 0.04, 0.08, woodL, 0, 0.44, 0.985, 0, 0.018);
    soft(g, 0.92, 0.2, 1.88, mat('mattress', { color: 0xf3f3f0, roughness: 0.9 }), 0, 0.27, 0.0, 0.07);
    // Bettdecke (dick, weich) + umgeschlagenes Laken
    soft(g, 0.98, 0.11, 1.36, mat('blanket', { color: 0x4d6c96, roughness: 0.95 }), 0, 0.42, 0.26, 0.05);
    soft(g, 0.99, 0.07, 0.2, mat('sheetFold', { color: 0xe9eef5, roughness: 0.9 }), 0, 0.45, -0.38, 0.034);
    const p = soft(g, 0.62, 0.14, 0.36, mat('pillow', { color: 0xffffff, roughness: 0.95 }), 0, 0.46, -0.72, 0.065); p.rotation.x = -0.14;
    const p2 = soft(g, 0.32, 0.26, 0.09, mat('pillowYel', { color: 0xd6a54e, roughness: 0.95 }), 0.24, 0.5, -0.86, 0.04); p2.rotation.set(-0.35, 0.2, 0.08);
  } else if (type === 'wardrobe') {
    // Front zeigt nach +X
    const body = mat('wardrobe', { color: 0xe8e2d6, roughness: 0.55 }), dark = mat('wardrobePlinth', { color: 0xbab3a4, roughness: 0.6 });
    box(g, 0.6, 0.08, 0.96, dark, -0.01, 0, 0, 0, 0.01);
    box(g, 0.6, 1.88, 1.0, body, 0, 0.08, 0, 0, 0.015);
    box(g, 0.64, 0.05, 1.04, body, 0.01, 1.96, 0, 0, 0.02);
    for (const s of [-1, 1]) {
      box(g, 0.02, 1.8, 0.485, body, 0.305, 0.12, s * 0.248, 0, 0.008);
      box(g, 0.006, 1.55, 0.4, mat('wardrobePanel', { color: 0xddd6c8, roughness: 0.55 }), 0.316, 0.24, s * 0.248, 0, 0.003);
      tube(g, [[0.33, 0.95, s * 0.03], [0.345, 0.97, s * 0.03], [0.345, 1.25, s * 0.03], [0.33, 1.27, s * 0.03]], 0.007, X.chrome(), 12, 8);
    }
  } else if (type === 'desk') {
    // Tischplatte 1.5×0.5, Rückseite bei -Z
    const top = mat('desk', { color: 0xd8c3a0, roughness: 0.5 }), edge = mat('deskEdge', { color: 0xa98a63, roughness: 0.55 });
    box(g, 1.5, 0.035, 0.5, top, 0, 0.705, 0, 0, 0.012);
    box(g, 1.5, 0.012, 0.5, edge, 0, 0.695, 0, 0, 0.005);
    // Links: Metallgestell; rechts: Schubladen-Container
    for (const z of [-0.2, 0.2]) box(g, 0.04, 0.695, 0.04, M.darkMetal(), -0.7, 0, z, 0, 0.008);
    box(g, 0.04, 0.04, 0.44, M.darkMetal(), -0.7, 0.04, 0, 0, 0.008);
    box(g, 0.04, 0.03, 0.44, M.darkMetal(), -0.7, 0.66, 0, 0, 0.008);
    box(g, 0.42, 0.68, 0.48, top, 0.52, 0.0, 0.0, 0, 0.012);
    for (let i = 0; i < 3; i++) {
      box(g, 0.39, 0.2, 0.015, edge, 0.52, 0.03 + i * 0.215, 0.243, 0, 0.006);
      tube(g, [[0.46, 0.13 + i * 0.215, 0.25], [0.465, 0.13 + i * 0.215, 0.27], [0.575, 0.13 + i * 0.215, 0.27], [0.58, 0.13 + i * 0.215, 0.25]], 0.005, X.chrome(), 10, 6);
    }
    box(g, 1.0, 0.4, 0.015, edge, -0.15, 0.3, -0.235, 0, 0.005);
    // Tastatur mit Tasten
    const kb = new THREE.Group(); kb.position.set(-0.15, 0.74, 0.08); kb.rotation.x = 0.04; g.add(kb);
    box(kb, 0.44, 0.022, 0.15, mat('kbBody', { color: 0x1d1f24, roughness: 0.5 }), 0, 0, 0, 0, 0.008);
    const cap = mat('keycap', { color: 0x2c2f36, roughness: 0.6 }), capA = mat('keycapA', { color: 0xffb000, roughness: 0.5 });
    for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) {
      if (r === 4 && c > 3 && c < 10) continue;
      box(kb, 0.022, 0.011, 0.022, (r === 0 && c === 0) || (r === 3 && c === 2) ? capA : cap, -0.196 + c * 0.028, 0.02, -0.054 + r * 0.027, 0, 0.004);
    }
    box(kb, 0.162, 0.011, 0.022, cap, 0.0, 0.02, 0.054, 0, 0.004);
    // Maus + Mauspad
    box(g, 0.26, 0.004, 0.22, mat('mousepad', { color: 0x283a5e, roughness: 0.95 }), 0.25, 0.74, 0.1, 0, 0.002);
    sph(g, 0.034, mat('mouse', { color: 0x1d1f24, roughness: 0.35 }), 0.27, 0.752, 0.12, 0.95, 0.55, 1.5);
    boxC(g, 0.002, 0.004, 0.024, M.ledBlue(), 0.27, 0.769, 0.09, 0);
    tube(g, [[0.27, 0.75, 0.07], [0.26, 0.745, -0.02], [0.2, 0.745, -0.12], [0.15, 0.74, -0.24]], 0.0025, M.cable(), 12, 5);
    // Tasse mit Henkel und Kaffee
    const mug = mat('mug', { color: 0xb85a3c, roughness: 0.35 });
    lathe(g, [[0, 0], [0.036, 0], [0.04, 0.006], [0.041, 0.1], [0.044, 0.104], [0.036, 0.104], [0.035, 0.09], [0, 0.09]], mug, 0.62, 0.74, -0.05, 32);
    sph(g, 0.034, mat('coffee', { color: 0x3a2312, roughness: 0.15 }), 0.62, 0.825, -0.05, 1, 0.08, 1);
    const hdl = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0075, 10, 20, Math.PI), mug); hdl.position.set(0.662, 0.795, -0.05); hdl.rotation.z = -Math.PI / 2; g.add(hdl);
    // Lautsprecher + Notizblock + Stift
    for (const s of [-1, 1]) { box(g, 0.08, 0.15, 0.09, mat('speaker', { color: 0x202227, roughness: 0.6 }), -0.15 + s * 0.36, 0.74, -0.15, 0, 0.012); cyl(g, 0.026, 0.026, 0.006, M.black(), -0.15 + s * 0.36, 0.82, -0.104, 20, 'z'); cyl(g, 0.012, 0.012, 0.006, M.darkMetal(), -0.15 + s * 0.36, 0.84, -0.102, 16, 'z'); }
    box(g, 0.15, 0.012, 0.2, mat('notepad', { color: 0xf6f0d8, roughness: 0.9 }), -0.58, 0.74, 0.05, 0.15, 0.003);
    cyl(g, 0.004, 0.004, 0.14, mat('pen', { color: 0x2266cc, roughness: 0.4 }), -0.56, 0.756, 0.05, 8, 'x').rotation.y = 0.5;
  } else if (type === 'monitor') {
    // Bildschirm: Rahmen + Rückseite + Fuß (Bildfläche separat)
    const blk = mat('monBody', { color: 0x15161a, roughness: 0.4, metalness: 0.2 });
    box(g, 0.52, 0.32, 0.022, blk, 0, 0.16, 0, 0, 0.008);
    box(g, 0.3, 0.2, 0.04, blk, 0, 0.22, -0.025, 0, 0.02);
    box(g, 0.05, 0.22, 0.03, M.darkMetal(), 0, 0.02, -0.06, 0, 0.01);
    box(g, 0.24, 0.012, 0.17, M.darkMetal(), 0, 0.0, -0.03, 0, 0.006);
    boxC(g, 0.004, 0.004, 0.004, M.ledBlue(), 0.22, 0.168, 0.012, 0);
    plane(g, 0.06, 0.012, labelMat('monLogo', 128, 26, (c, w, h) => { c.fillStyle = '#15161a'; c.fillRect(0, 0, w, h); c.fillStyle = '#9aa0a8'; c.font = 'bold 20px Arial'; c.textAlign = 'center'; c.fillText('LUMEN', w / 2, 20); }), 0, 0.168, 0.0115);
    tube(g, [[0, 0.2, -0.045], [0.02, 0.12, -0.09], [0.05, 0.01, -0.12], [0.1, 0.0, -0.2]], 0.003, M.cable(), 10, 5);
  } else if (type === 'chair') {
    // Bürostuhl: Sternfuß mit Rollen, Gaslift, Sitzkissen, Rückenlehne (+Z), Armlehnen
    const fab = mat('chairFab', { color: 0x8a7466, roughness: 0.92 }), acc = mat('chairAcc', { color: 0xc77a34, roughness: 0.75 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2, ex = Math.cos(a) * 0.27, ez = Math.sin(a) * 0.27;
      rod(g, [0, 0.08, 0], [ex, 0.055, ez], 0.016, M.black(), 8);
      sph(g, 0.025, M.black(), ex, 0.025, ez, 1, 1, 0.75);
      cyl(g, 0.006, 0.006, 0.03, M.darkMetal(), ex, 0.055, ez, 8);
    }
    cyl(g, 0.04, 0.035, 0.05, M.black(), 0, 0.09, 0, 16);
    cyl(g, 0.022, 0.022, 0.3, X.chrome(), 0, 0.26, 0, 14);
    box(g, 0.2, 0.04, 0.2, M.black(), 0, 0.4, 0, 0, 0.01);
    soft(g, 0.48, 0.09, 0.48, fab, 0, 0.43, 0, 0.04);
    soft(g, 0.4, 0.02, 0.36, acc, 0, 0.515, -0.01, 0.01);
    for (const s of [-1, 1]) {
      rod(g, [s * 0.2, 0.44, 0.05], [s * 0.25, 0.6, 0.05], 0.012, M.black(), 8);
      soft(g, 0.06, 0.03, 0.24, M.black(), s * 0.25, 0.6, 0.02, 0.012);
    }
    rod(g, [0, 0.44, 0.2], [0, 0.6, 0.27], 0.02, M.black(), 10);
    const back = new THREE.Group(); back.position.set(0, 0.55, 0.27); back.rotation.x = -0.12; g.add(back);
    soft(back, 0.46, 0.5, 0.08, fab, 0, -0.04, 0, 0.04);
    soft(back, 0.3, 0.1, 0.05, acc, 0, 0.38, 0.025, 0.022);
    soft(back, 0.14, 0.34, 0.012, acc, 0, 0.02, -0.04, 0.005);
  } else if (type === 'lampion') {
    // Papier-Lampion mit Kabel (Deckenleuchte)
    cyl(g, 0.004, 0.004, 0.32, M.cable(), 0, 0.16, 0, 8);
    cyl(g, 0.03, 0.03, 0.03, X.brass(), 0, 0.0, 0, 16);
    sph(g, 0.15, M.lampShade(), 0, -0.15, 0, 1, 0.92, 1, 24, 18);
  } else if (type === 'desklamp') {
    // Schreibtischlampe (Gelenkarm, Messing-Schirm)
    const brass = mat('lampBrass', { color: 0xd9a441, roughness: 0.35, metalness: 0.8 });
    cyl(g, 0.07, 0.08, 0.02, M.black(), 0, 0.01, 0, 24);
    rod(g, [0, 0.02, 0], [0.04, 0.26, -0.02], 0.007, M.black(), 8);
    rod(g, [0.04, 0.26, -0.02], [0.17, 0.36, 0.04], 0.007, M.black(), 8);
    sph(g, 0.012, brass, 0.04, 0.26, -0.02);
    const head = lathe(g, [[0.0, 0.0], [0.03, 0.0], [0.03, 0.03], [0.075, 0.1], [0.072, 0.105], [0.0, 0.03]], brass, 0.17, 0.36, 0.04, 24); head.rotation.z = Math.PI * 0.82; head.rotation.x = 0.25;
    sph(head, 0.016, mat('bulbWarm', { color: 0x332211, emissive: 0xffd9a0, emissiveIntensity: 0.8 }), 0, 0.07, 0);
  } else if (type === 'fairy') {
    // Lichterkette an der Wand (hängt in Bögen)
    const bulb = mat('fairyBulb', { color: 0x332211, emissive: 0xffc070, emissiveIntensity: 2.8 });
    const pts = [];
    for (let i = 0; i <= 56; i++) { const t = i / 56, x = -1.65 + t * 3.3, y = -Math.pow(Math.sin(t * 3 * Math.PI), 2) * 0.12; pts.push([x, y, 0]); if (i % 2 === 0) sph(g, 0.011, bulb, x, y - 0.012, 0.004, 1, 1.3, 1, 8, 6); }
    tube(g, pts, 0.0018, M.cable(), 80, 4);
  } else if (type === 'radiator') {
    // Heizkörper unter dem Fenster
    const wht = mat('radiator', { color: 0xcdc4b6, roughness: 0.75, metalness: 0 });
    for (let i = 0; i < 16; i++) box(g, 0.045, 0.54, 0.07, wht, -0.4 + i * 0.054, 0.0, 0, 0, 0.012);
    box(g, 0.9, 0.03, 0.05, wht, 0, 0.03, 0, 0, 0.01); box(g, 0.9, 0.03, 0.05, wht, 0, 0.5, 0, 0, 0.01);
    cyl(g, 0.022, 0.022, 0.07, M.white(), 0.48, 0.42, 0, 16); cyl(g, 0.02, 0.02, 0.04, mat('thermoCap', { color: 0xdedad2, roughness: 0.5 }), 0.48, 0.48, 0, 16);
  } else if (type === 'mattress') {
    // Matratze direkt auf dem Boden (Kopfende bei +Z), zerknautschte Decke, plattes Kissen
    soft(g, 0.9, 0.17, 1.98, mat('mattressOld', { color: 0xe6dfcf, roughness: 0.95 }), 0, 0, 0, 0.06);
    box(g, 0.91, 0.012, 1.99, mat('mattressSeam', { color: 0xcfc4ae, roughness: 0.9 }), 0, 0.08, 0, 0, 0.004);
    const duv = mat('duvetOld', { color: 0x6c7f8f, roughness: 0.97 });
    const d1 = soft(g, 0.95, 0.1, 0.95, duv, -0.02, 0.16, -0.32, 0.045); d1.rotation.set(0.03, 0.08, -0.04);
    const d2 = soft(g, 0.62, 0.13, 0.55, duv, 0.12, 0.2, 0.32, 0.06); d2.rotation.set(-0.12, -0.35, 0.08);
    const d3 = soft(g, 0.4, 0.09, 0.42, mat('duvetIn', { color: 0xd9dfe4, roughness: 0.95 }), -0.24, 0.19, 0.18, 0.04); d3.rotation.set(0.1, 0.6, 0.05);
    const p = soft(g, 0.56, 0.1, 0.36, mat('pillowOld', { color: 0xf0ece2, roughness: 0.95 }), -0.05, 0.17, 0.74, 0.05); p.rotation.set(0.12, 0.08, 0.05);
  } else if (type === 'cot') {
    // Feldbett (Kopfende bei +Z): Alu-Rahmen mit X-Beinen, grüne Bespannung, Schlafsack, Kissen – Papas Ecke in der Werkstatt
    const alu = X.chrome(), cloth = mat('cotCloth', { color: 0x58663f, roughness: 0.9 });
    for (const s of [-1, 1]) cyl(g, 0.014, 0.014, 1.9, alu, s * 0.33, 0.4, 0, 10, 'z');
    for (const z of [-0.88, -0.3, 0.3, 0.88]) for (const s of [-1, 1]) { const l = cyl(g, 0.011, 0.011, 0.5, alu, s * 0.33, 0.2, z, 8); l.rotation.x = s * 0.5; }
    for (const z of [-0.95, 0.95]) cyl(g, 0.012, 0.012, 0.68, alu, 0, 0.4, z, 8, 'x');
    soft(g, 0.66, 0.03, 1.86, cloth, 0, 0.385, 0, 0.012);
    soft(g, 0.6, 0.09, 1.3, mat('sleepBag', { color: 0x2f5d8a, roughness: 0.85 }), 0.01, 0.41, -0.22, 0.04);
    soft(g, 0.6, 0.07, 0.22, mat('sleepBagIn', { color: 0xd0a24a, roughness: 0.9 }), 0.01, 0.47, 0.4, 0.03);
    const p = soft(g, 0.5, 0.09, 0.3, mat('pillowOld', { color: 0xf0ece2, roughness: 0.95 }), -0.02, 0.43, 0.74, 0.04); p.rotation.set(0.08, 0.06, 0);
  } else if (type === 'clothesrail') {
    // Kleiderstange auf Rollen mit ein paar Hemden und Hoodies (entlang Z)
    const ch = X.chrome();
    for (const z of [-0.45, 0.45]) { rod(g, [0, 0.04, z], [0, 1.62, z], 0.012, ch, 10); rod(g, [-0.22, 0.04, z], [0.22, 0.04, z], 0.012, ch, 10); for (const x of [-0.2, 0.2]) sph(g, 0.022, M.black(), x, 0.022, z); }
    rod(g, [0, 1.62, -0.47], [0, 1.62, 0.47], 0.012, ch, 10);
    const cols = [0x3c4a5e, 0x8a3b32, 0x2f2f33, 0x6f7f5e, 0xc9b48c, 0x4a5160];
    // T-Shirts und Hoodies als Umriss (Ebene quer zur Stange), weich abgerundet, auf Drahtbügeln
    const garment = (col, z, long, i) => {
      const P = long ? [[-0.07, 0], [0.07, 0], [0.2, -0.05], [0.29, -0.52], [0.23, -0.55], [0.17, -0.26], [0.17, -0.74], [-0.17, -0.74], [-0.17, -0.26], [-0.23, -0.55], [-0.29, -0.52], [-0.2, -0.05]]
        : [[-0.06, 0], [0.06, 0], [0.19, -0.05], [0.25, -0.2], [0.16, -0.24], [0.16, -0.68], [-0.16, -0.68], [-0.16, -0.24], [-0.25, -0.2], [-0.19, -0.05]];
      const s = new THREE.Shape(); P.forEach(([x, y], k) => (k ? s.lineTo(x, y) : s.moveTo(x, y)));
      const geo = new THREE.ExtrudeGeometry(s, { depth: 0.018, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 4 }); geo.translate(0, 0, -0.009);
      const m = new THREE.Mesh(geo, mat('shirt' + i, { color: col, roughness: 0.95 })); m.position.set(0, 1.575, z); m.rotation.y = ((i * 37) % 7 - 3) * 0.03; g.add(m);
      tube(g, [[0, 1.62, z], [0, 1.6, z], [-0.17, 1.53, z], [0.17, 1.53, z], [0, 1.6, z]], 0.003, ch, 10, 4);
    };
    for (let i = 0; i < 6; i++) garment(cols[i], -0.36 + i * 0.145, i % 3 === 1, i);
    soft(g, 0.4, 0.3, 0.5, mat('ikeaBag', { color: 0x2a5aa8, roughness: 0.7 }), 0.02, 0.0, 0.05, 0.04);
  } else if (type === 'kitchenette') {
    // Pantryküche 1,1 m: Unterschrank mit Minikühlschrank, Spüle, zwei Kochplatten, Wasserkocher (Front +Z)
    const body = mat('kitBody', { color: 0xdedbd2, roughness: 0.6 }), top = mat('kitTop', { color: 0x8a7a64, roughness: 0.55 }), steel = X.chrome();
    box(g, 1.1, 0.84, 0.55, body, 0, 0.0, 0, 0, 0.01);
    box(g, 1.12, 0.035, 0.57, top, 0, 0.84, 0, 0, 0.006);
    box(g, 0.5, 0.78, 0.012, mat('fridgeDoor', { color: 0xecebe6, roughness: 0.45 }), -0.28, 0.03, 0.281, 0, 0.004); box(g, 0.02, 0.18, 0.02, steel, -0.06, 0.5, 0.29, 0, 0.004);
    box(g, 0.5, 0.78, 0.012, mat('kitDoor', { color: 0xd4cfc2, roughness: 0.55 }), 0.28, 0.03, 0.281, 0, 0.004); box(g, 0.02, 0.18, 0.02, steel, 0.06, 0.5, 0.29, 0, 0.004);
    box(g, 0.44, 0.012, 0.36, mat('sinkSteel', { color: 0xb9bec4, roughness: 0.25, metalness: 0.9 }), 0.26, 0.876, -0.03, 0, 0.004);
    box(g, 0.34, 0.006, 0.26, mat('sinkHole', { color: 0x52575c, roughness: 0.35, metalness: 0.8 }), 0.26, 0.884, -0.03, 0, 0.002);
    rod(g, [0.26, 0.876, -0.24], [0.26, 1.08, -0.24], 0.012, steel, 10); rod(g, [0.26, 1.08, -0.24], [0.26, 1.06, -0.1], 0.01, steel, 10);
    box(g, 0.44, 0.05, 0.4, M.black(), -0.27, 0.875, -0.02, 0, 0.01);
    for (const x of [-0.37, -0.17]) cyl(g, 0.075, 0.075, 0.012, mat('hotplate', { color: 0x2a2b2e, roughness: 0.6, metalness: 0.3 }), x, 0.93, -0.02, 24);
    for (const x of [-0.4, -0.3]) cyl(g, 0.014, 0.014, 0.02, M.offwhite(), x, 0.9, 0.18, 12, 'z');
    lathe(g, [[0, 0], [0.07, 0], [0.075, 0.12], [0.06, 0.2], [0, 0.21]], mat('kettle', { color: 0xc9cbd0, roughness: 0.3, metalness: 0.6 }), -0.15, 0.875, 0.1, 20);
    // schmutziges Geschirr in der Spüle
    cyl(g, 0.1, 0.1, 0.012, M.white(), 0.22, 0.896, -0.04, 24); cyl(g, 0.1, 0.1, 0.012, M.white(), 0.24, 0.91, -0.02, 24);
    lathe(g, [[0, 0], [0.034, 0], [0.038, 0.09], [0, 0.09]], mat('mug2', { color: 0x3a6b8a, roughness: 0.35 }), 0.36, 0.89, -0.12, 18);
  } else if (type === 'beercrate') {
    // Bierkiste als Nachttisch: Wecker, Handyladekabel, Wasserflasche
    const red = mat('crateRed', { color: 0x9c2a20, roughness: 0.55 });
    box(g, 0.3, 0.3, 0.4, red, 0, 0, 0, 0, 0.012);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) cyl(g, 0.03, 0.03, 0.06, mat('bottleCap', { color: 0xd9b440, roughness: 0.4, metalness: 0.6 }), -0.075 + i * 0.15, 0.31, -0.15 + j * 0.1, 12);
    box(g, 0.32, 0.018, 0.42, mat('crateBoard', { color: 0xb59a76, roughness: 0.8 }), 0, 0.34, 0, 0, 0.004);
    box(g, 0.11, 0.07, 0.05, M.black(), -0.06, 0.358, -0.1, 0.3, 0.012);
    box(g, 0.08, 0.035, 0.002, mat('clockFace', { color: 0x120808, emissive: 0xff3a2a, emissiveIntensity: 1.4 }), -0.055, 0.37, -0.073, 0.3, 0);
    lathe(g, [[0, 0], [0.035, 0], [0.035, 0.2], [0.012, 0.25], [0.012, 0.28], [0, 0.28]], mat('waterBottle', { color: 0xbfd8e8, roughness: 0.1, transparent: true, opacity: 0.55 }), 0.08, 0.358, 0.12, 16);
    tube(g, [[0.05, 0.36, -0.15], [0.12, 0.33, -0.21], [0.16, 0.1, -0.21], [0.2, 0.01, -0.12]], 0.0025, M.white(), 12, 4);
  } else if (type === 'movingboxes') {
    // Umzugskartons, gestapelt, einer offen
    const c = mat('movBox', { color: 0xb58d5c, roughness: 0.92 }), t = mat('movTape', { color: 0xc8b07c, roughness: 0.5 }), wr = mat('movWrite', { color: 0x2a2a2a, roughness: 0.8 });
    for (const [x, y, z, w, h, d, ry] of [[0, 0, 0, 0.48, 0.34, 0.38, 0.03], [0.02, 0.34, 0.01, 0.46, 0.32, 0.36, -0.06], [-0.01, 0.66, 0, 0.42, 0.28, 0.34, 0.1]]) { box(g, w, h, d, c, x, y, z, ry, 0.008); box(g, w * 1.004, 0.004, 0.06, t, x, y + h, z, ry, 0); box(g, 0.14, 0.04, 0.002, wr, x + 0.05, y + h * 0.55, z + d / 2 + 0.002, ry, 0); }
  } else if (type === 'openbox') {
    // offener Umzugskarton mit aufgeklappten Laschen, oben Klamotten
    const c = mat('movBox', { color: 0xb58d5c, roughness: 0.92 });
    box(g, 0.4, 0.3, 0.34, c, 0, 0, 0, 0, 0.006);
    for (const [z, rx] of [[-0.17, -0.7], [0.17, 0.7]]) { const f = box(g, 0.4, 0.004, 0.16, c, 0, 0.3, z + Math.sign(z) * 0.05, 0, 0); f.rotation.x = rx; }
    soft(g, 0.32, 0.12, 0.28, mat('boxStuff', { color: 0x6a5a8a, roughness: 0.9 }), 0, 0.2, 0, 0.03);
  } else if (type === 'barebulb') {
    // Nackte Glühbirne am Kabel (Ursprung an der Decke)
    cyl(g, 0.0035, 0.0035, 0.42, M.cable(), 0, -0.21, 0, 6);
    cyl(g, 0.022, 0.02, 0.06, mat('bulbSocketOld', { color: 0x2a2622, roughness: 0.5 }), 0, -0.45, 0, 14);
    cyl(g, 0.04, 0.04, 0.01, M.white(), 0, -0.004, 0, 16);
    sph(g, 0.033, mat('bareBulb', { color: 0x6a5a40, emissive: 0xffc878, emissiveIntensity: 2.6, roughness: 0.2 }), 0, -0.505, 0, 1, 1.2, 1, 16, 12);
  } else if (type === 'pizzabox') {
    box(g, 0.33, 0.04, 0.33, mat('pizzaBox', { color: 0xcfb48a, roughness: 0.9 }), 0, 0, 0, 0, 0.004);
    box(g, 0.18, 0.002, 0.12, mat('pizzaPrint', { color: 0xb8322a, roughness: 0.8 }), 0.02, 0.04, 0.03, 0, 0);
    box(g, 0.33, 0.04, 0.33, mat('pizzaBox', { color: 0xcfb48a, roughness: 0.9 }), 0.03, 0.042, -0.02, 0.15, 0.004);
  } else if (type === 'bookshelf') {
    const wood = mat('shelfWood', { color: 0xbfa77f, roughness: 0.6 }), side = mat('desk', { color: 0xd8c3a0, roughness: 0.5 });
    for (const s of [-1, 1]) box(g, 0.022, 1.9, 0.32, side, s * 0.214, 0, 0, 0, 0.006);
    box(g, 0.45, 0.012, 0.32, side, 0, 1.888, 0, 0, 0.005);
    box(g, 0.43, 1.88, 0.01, mat('shelfBack', { color: 0xc8b48c, roughness: 0.7 }), 0, 0.01, -0.155, 0, 0.003);
    for (const y of [0.0, 0.4, 0.8, 1.2, 1.6]) box(g, 0.41, 0.02, 0.3, wood, 0, y, 0.0, 0, 0.005);
    const cols = [0x8f4a42, 0x4a6a8a, 0x5a7d56, 0xb8954a, 0x6a5a82, 0x3a3a3c, 0xa8683e];
    let k = 0;
    for (const y of [0.42, 0.82]) {
      let x = -0.19;
      while (x < 0.17) {
        const w = 0.025 + ((k * 7) % 4) * 0.007, h = 0.2 + ((k * 5) % 5) * 0.022, d = 0.18 + ((k * 3) % 3) * 0.02;
        const b = box(g, w, h, d, mat('book' + (k % cols.length), { color: cols[k % cols.length], roughness: 0.75 }), x + w / 2, y, 0.02, 0, 0.003);
        if (k % 9 === 8) { b.rotation.z = 0.25; b.position.x += 0.03; x += 0.05; }
        x += w + 0.003; k++;
      }
    }
    // Pokal, Pflanze, Box
    lathe(g, [[0, 0], [0.04, 0], [0.04, 0.02], [0.012, 0.03], [0.01, 0.08], [0.045, 0.12], [0.05, 0.17], [0.044, 0.17], [0.038, 0.125], [0, 0.11]], X.brass(), -0.1, 1.22, 0.02, 28);
    lathe(g, [[0, 0], [0.05, 0], [0.06, 0.1], [0, 0.1]], X.terracotta(), 0.1, 1.22, 0.02, 20);
    for (let i = 0; i < 6; i++) sph(g, 0.04, X.leaf(), 0.1 + Math.cos(i) * 0.03, 1.36 + (i % 3) * 0.02, 0.02 + Math.sin(i) * 0.03, 0.7, 1.4, 0.4);
    box(g, 0.34, 0.16, 0.24, mat('storageBox', { color: 0x6f8fb0, roughness: 0.8 }), 0, 1.62, 0.02, 0, 0.015);
    box(g, 0.3, 0.12, 0.2, mat('storageBox2', { color: 0xe6d9b5, roughness: 0.8 }), 0, 0.02, 0.02, 0, 0.012);
  }
  return g;
}
