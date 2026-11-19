// Prozedurale Texturen (Canvas) und geteilte Materialien
import * as THREE from 'three';

const texCache = new Map();
function canvasTex(key, w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const k = key + repeat.join('x');
  if (texCache.has(k)) return texCache.get(k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(k, t); return t;
}
const R = (a, b) => a + Math.random() * (b - a);
function speckle(g, w, h, n, colors, size = [1, 2]) { for (let i = 0; i < n; i++) { g.fillStyle = colors[(Math.random() * colors.length) | 0]; const s = R(...size); g.fillRect(Math.random() * w, Math.random() * h, s, s); } }

export const TEX = {
  wood: (rep) => canvasTex('wood', 512, 512, (g, w, h) => {
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      const y = (r * h) / rows, off = (r % 2) * 180 + R(0, 60);
      for (let x = -off; x < w; x += 300) {
        const l = 38 + R(-6, 6);
        g.fillStyle = `hsl(28, 45%, ${l}%)`; g.fillRect(x, y, 300, h / rows);
        for (let k = 0; k < 14; k++) { g.strokeStyle = `hsla(25, 50%, ${l - R(5, 12)}%, 0.35)`; g.lineWidth = R(0.5, 2); g.beginPath(); const yy = y + R(2, h / rows - 2); g.moveTo(x, yy); g.bezierCurveTo(x + 100, yy + R(-3, 3), x + 200, yy + R(-3, 3), x + 300, yy + R(-2, 2)); g.stroke(); }
        g.fillStyle = 'rgba(20,10,5,0.55)'; g.fillRect(x, y, 2, h / rows);
      }
      g.fillStyle = 'rgba(20,10,5,0.6)'; g.fillRect(0, y, w, 2);
    }
  }, { repeat: rep }),
  concrete: (rep, tint = 128) => canvasTex('concrete' + tint, 512, 512, (g, w, h) => {
    g.fillStyle = `rgb(${tint},${tint},${tint - 4})`; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { const v = Math.random() < 0.5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},${R(0.015, 0.05)})`; g.beginPath(); g.arc(R(0, w), R(0, h), R(20, 90), 0, 7); g.fill(); }
    speckle(g, w, h, 5000, ['rgba(0,0,0,0.12)', 'rgba(255,255,255,0.08)']);
  }, { repeat: rep }),
  epoxy: (rep) => canvasTex('epoxy', 512, 512, (g, w, h) => {
    g.fillStyle = '#7b8088'; g.fillRect(0, 0, w, h); speckle(g, w, h, 3000, ['rgba(255,255,255,0.08)', 'rgba(0,0,0,0.08)']);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
  }, { repeat: rep }),
  tiles: (rep) => canvasTex('tiles', 256, 256, (g, w, h) => {
    g.fillStyle = '#c9ced6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9aa1ab'; g.fillRect(0, 0, w, 4); g.fillRect(0, 0, 4, h);
    speckle(g, w, h, 800, ['rgba(0,0,0,0.05)', 'rgba(255,255,255,0.2)']);
  }, { repeat: rep }),
  perfTile: (rep) => canvasTex('perftile', 256, 256, (g, w, h) => {
    g.fillStyle = '#c9ced6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5c636d'; for (let y = 24; y < h - 16; y += 14) for (let x = 24; x < w - 16; x += 14) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
    g.fillStyle = '#9aa1ab'; g.fillRect(0, 0, w, 4); g.fillRect(0, 0, 4, h);
  }, { repeat: rep }),
  brick: (rep) => canvasTex('brick', 512, 512, (g, w, h) => {
    g.fillStyle = '#b9b1a5'; g.fillRect(0, 0, w, h);
    const bh = 32, bw = 96;
    for (let y = 0, r = 0; y < h; y += bh, r++) for (let x = -(r % 2) * bw / 2; x < w; x += bw) {
      g.fillStyle = `hsl(${R(8, 18)}, ${R(35, 50)}%, ${R(34, 44)}%)`; g.fillRect(x + 3, y + 3, bw - 6, bh - 6);
      speckle(g, w, h, 0, []);
    }
    speckle(g, w, h, 4000, ['rgba(0,0,0,0.1)', 'rgba(255,255,255,0.06)']);
  }, { repeat: rep }),
  plaster: (rep, color = '#e9e2d4') => canvasTex('plaster' + color, 256, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h); speckle(g, w, h, 2500, ['rgba(0,0,0,0.035)', 'rgba(255,255,255,0.06)'], [1, 3]);
  }, { repeat: rep }),
  corrugated: (rep, color = '#8d96a0') => canvasTex('corr' + color, 256, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, 'rgba(0,0,0,0.25)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)'); g.fillStyle = gr; g.fillRect(x, 0, 16, h); }
    speckle(g, w, h, 800, ['rgba(0,0,0,0.08)']);
  }, { repeat: rep }),
  carpet: (rep, hue = 210) => canvasTex('carpet' + hue, 256, 256, (g, w, h) => {
    g.fillStyle = `hsl(${hue},30%,32%)`; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, [`hsla(${hue},30%,20%,0.4)`, `hsla(${hue},40%,45%,0.4)`]);
    g.strokeStyle = `hsl(${hue},35%,55%)`; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
  }, { repeat: rep }),
  grill: () => canvasTex('grill', 128, 128, (g, w, h) => {
    g.fillStyle = '#111'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#8a8f96'; g.lineWidth = 3;
    for (let r = 10; r < 64; r += 10) { g.beginPath(); g.arc(64, 64, r, 0, 7); g.stroke(); }
    g.beginPath(); g.moveTo(0, 64); g.lineTo(128, 64); g.moveTo(64, 0); g.lineTo(64, 128); g.stroke();
  }),
  perforated: (rep) => canvasTex('perf', 128, 128, (g, w, h) => {
    g.fillStyle = '#2a2e35'; g.fillRect(0, 0, w, h); g.fillStyle = '#07080a';
    for (let y = 4; y < h; y += 8) for (let x = 4 + ((y / 8) % 2) * 4; x < w; x += 8) { g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); }
  }, { repeat: rep }),
  fins: (rep) => canvasTex('fins', 128, 128, (g, w, h) => {
    g.fillStyle = '#9aa0a8'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 6) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, 0, 2, h); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 2, 0, 1, h); }
  }, { repeat: rep }),
  pcb: (color = '#1d4f33') => canvasTex('pcb' + color, 256, 128, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(210,180,90,0.35)'; g.lineWidth = 1;
    for (let i = 0; i < 70; i++) { g.beginPath(); let x = R(0, w), y = R(0, h); g.moveTo(x, y); for (let k = 0; k < 3; k++) { if (Math.random() < 0.5) x += R(-60, 60); else y += R(-40, 40); g.lineTo(x, y); } g.stroke(); }
    speckle(g, w, h, 200, ['#222', '#ccc', '#a07030'], [2, 5]);
  }),
  stripes: () => canvasTex('stripes', 128, 32, (g, w, h) => {
    g.fillStyle = '#e8c100'; g.fillRect(0, 0, w, h); g.fillStyle = '#111';
    for (let x = -h; x < w; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.fill(); }
  }, { repeat: [4, 1] }),
  crate: () => canvasTex('crate', 128, 128, (g, w, h) => {
    g.fillStyle = '#1f5fb8'; g.fillRect(0, 0, w, h); g.fillStyle = '#0b2a55';
    for (let y = 16; y < h - 8; y += 22) for (let x = 10; x < w - 10; x += 22) { g.fillRect(x, y, 14, 12); }
  }),
  sky: (top = '#6fa8e8', bottom = '#e8f1ff') => canvasTex('sky' + top + bottom, 64, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }),
};

// Poster / Bildschirme
export function textTexture(lines, { w = 512, h = 512, bg = '#111', fg = '#fff', font = 'bold 56px Inter, Arial', accent = null, deco = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (deco) deco(g, w, h);
  if (accent) { g.fillStyle = accent; g.fillRect(0, h - 24, w, 24); }
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => { g.font = l.font || font; g.fillStyle = l.color || fg; g.fillText(l.text ?? l, w / 2, (l.y ?? (h / (lines.length + 1)) * (i + 1))); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

const matCache = new Map();
export function mat(key, params) {
  if (matCache.has(key)) return matCache.get(key);
  const m = params.physical ? new THREE.MeshPhysicalMaterial(params) : new THREE.MeshStandardMaterial(params);
  delete m.physical; m.name = key; matCache.set(key, m); return m;
}

export const M = {
  black: () => mat('black', { color: 0x15161a, roughness: 0.55, metalness: 0.2 }),
  blackGloss: () => mat('blackGloss', { color: 0x0d0e11, roughness: 0.25, metalness: 0.4 }),
  darkMetal: () => mat('darkMetal', { color: 0x30343b, roughness: 0.45, metalness: 0.7 }),
  alu: () => mat('alu', { color: 0xb9bec6, roughness: 0.32, metalness: 0.85 }),
  aluDark: () => mat('aluDark', { color: 0x7d838c, roughness: 0.4, metalness: 0.8 }),
  steel: () => mat('steel', { color: 0x5a6068, roughness: 0.5, metalness: 0.75 }),
  white: () => mat('white', { color: 0xeeeeea, roughness: 0.5, metalness: 0.05 }),
  offwhite: () => mat('offwhite', { color: 0xd9d6cf, roughness: 0.6 }),
  copper: () => mat('copper', { color: 0xc87a4a, roughness: 0.3, metalness: 0.9 }),
  crimson: () => mat('crimson', { color: 0xb3122a, roughness: 0.35, metalness: 0.45 }),
  verdant: () => mat('verdant', { color: 0x63c624, roughness: 0.35, metalness: 0.3 }),
  shroudDark: () => mat('shroudDark', { color: 0x1c1e22, roughness: 0.35, metalness: 0.55 }),
  shroudSilver: () => mat('shroudSilver', { color: 0x9097a0, roughness: 0.3, metalness: 0.85 }),
  pcbGreen: () => mat('pcbGreen', { map: TEX.pcb('#1d4f33'), roughness: 0.6, metalness: 0.1 }),
  pcbBlack: () => mat('pcbBlack', { map: TEX.pcb('#16191d'), roughness: 0.6, metalness: 0.1 }),
  pcbBlue: () => mat('pcbBlue', { map: TEX.pcb('#183a6b'), roughness: 0.6, metalness: 0.1 }),
  glass: () => mat('glass', { color: 0x9fb8c8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false }),
  window: () => mat('window', { color: 0xbfe2ff, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.35, depthWrite: false }),
  fins: () => mat('fins', { map: TEX.fins([4, 1]), roughness: 0.35, metalness: 0.85 }),
  grill: () => mat('grill', { map: TEX.grill(), roughness: 0.5, metalness: 0.6 }),
  perforated: () => mat('perforated', { map: TEX.perforated([6, 12]), roughness: 0.5, metalness: 0.6 }),
  fanBlade: () => mat('fanBlade', { color: 0x1a1b1e, roughness: 0.6, side: THREE.DoubleSide }),
  fanBladeWhite: () => mat('fanBladeWhite', { color: 0xdedede, roughness: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }),
  crate: () => mat('crate', { map: TEX.crate(), roughness: 0.7 }),
  rubber: () => mat('rubber', { color: 0x222222, roughness: 0.9 }),
  cable: () => mat('cable', { color: 0x111111, roughness: 0.7 }),
  cableYellow: () => mat('cableYellow', { color: 0xe0b000, roughness: 0.6 }),
  cableBlue: () => mat('cableBlue', { color: 0x2266cc, roughness: 0.5 }),
  water: () => mat('water', { color: 0x2a7bd1, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.8 }),
  hose: () => mat('hose', { color: 0x1d63b8, roughness: 0.4 }),
  hoseRed: () => mat('hoseRed', { color: 0xc23a2a, roughness: 0.4 }),
  stripes: () => mat('stripes', { map: TEX.stripes(), roughness: 0.6 }),
  // LEDs (werden in main.js animiert)
  ledGreen: () => mat('ledGreen', { color: 0x0a2a0a, emissive: 0x33ff66, emissiveIntensity: 3 }),
  ledGreen2: () => mat('ledGreen2', { color: 0x0a2a0a, emissive: 0x33ff66, emissiveIntensity: 3 }),
  ledBlue: () => mat('ledBlue', { color: 0x0a0a2a, emissive: 0x3388ff, emissiveIntensity: 3 }),
  ledRed: () => mat('ledRed', { color: 0x2a0a0a, emissive: 0xff2222, emissiveIntensity: 4 }),
  ledAmber: () => mat('ledAmber', { color: 0x2a1a0a, emissive: 0xffaa22, emissiveIntensity: 3 }),
  ledWhite: () => mat('ledWhite', { color: 0x333333, emissive: 0xfff4e0, emissiveIntensity: 2.5 }),
  rgb: () => mat('rgb', { color: 0x111111, emissive: 0xff00aa, emissiveIntensity: 2.2 }),
  screen: () => mat('screen', { color: 0x050810, emissive: 0x2a6fd6, emissiveIntensity: 1.2, roughness: 0.2 }),
  lampShade: () => mat('lampShade', { color: 0xfff6e0, emissive: 0xffd9a0, emissiveIntensity: 1.6, side: THREE.DoubleSide }),
  tube: () => mat('tube', { color: 0xffffff, emissive: 0xf2f7ff, emissiveIntensity: 2.5 }),
};
