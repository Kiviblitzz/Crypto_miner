// PC-Monitor in der Wohnung: Kamerafahrt an den Bildschirm, die Börsen-Seite als echtes HTML auf der Bildschirmfläche
// (matrix3d-Overlay, am Ende pixelgenau) und ohne Fokus eine scharfe Mini-Ansicht auf der Canvas-Textur.
import * as THREE from 'three';
import { fmtUSD, fmtCoin, fmtDate, fmtHash } from '../sim/game.js';
import { PART } from '../data/hardware.js';
import { coinRate } from '../ui/market.js';

const UP = new THREE.Vector3(0, 1, 0), _c = new THREE.Vector3();
export const pcScreen = (world) => world.room?.screens?.find((s) => s.kind === 'pc' && s.mesh) || null;

// Zielpose vor dem Bildschirm: er füllt gut 85 % der Höhe unter der Topbar (top: deren Unterkante in px), Blick genau senkrecht
// (dann bildet die Kamera die Fläche als reines Rechteck ab und die Seite liegt pixelgenau, Maßstab 1)
export function monitorPose(world, top = 0) {
  const sc = pcScreen(world); if (!sc) return null;
  const m = sc.mesh, cam = world.camera; m.updateWorldMatrix(true, false);
  const { width: sw, height: sh } = m.geometry.parameters;
  const c = new THREE.Vector3().setFromMatrixPosition(m.matrixWorld), n = new THREE.Vector3(0, 0, 1).transformDirection(m.matrixWorld).normalize();
  const iw = innerWidth, ih = innerHeight, t = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
  const y0 = Math.min(ih * 0.2, top + 12), y1 = ih - 12, Hpx = Math.min(ih * 0.88, y1 - y0, (iw - 24) / (sw / sh)); // Platz unter der Topbar
  const d = (sh * ih) / (2 * t * Hpx), ppm = ih / (2 * t * d), cy = (y0 + y1) / 2, off = (cy - ih / 2) / ppm; // Bildschirm etwas unter die Mitte
  const pos = c.clone().addScaledVector(n, d).addScaledVector(UP, off), look = c.clone().addScaledVector(UP, off);
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(pos, look, UP));
  // Steht ein Stuhl davor (rooms.js: sc.seat), setzt man sich erst: Augen auf Sitzhöhe, ein Stück vor dem Bildschirm, leicht zur Stuhlseite
  let seat = null;
  if (sc.seat) { const floor = m.parent ? new THREE.Vector3().setFromMatrixPosition(m.parent.matrixWorld).y : 0, right = new THREE.Vector3().crossVectors(UP, n).normalize(); seat = c.clone().addScaledVector(n, sc.seat.d).addScaledVector(right, sc.seat.dx || 0); seat.y = floor + sc.seat.eye; }
  return { pos, look, q, seat, W: Math.round(sw * ppm), H: Math.round(sh * ppm), sc };
}

// Homographie: Rechteck (0,0)–(W,H) → Viereck p[0..3] (oben links, oben rechts, unten rechts, unten links) als CSS matrix3d
function quadMatrix(W, H, p) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = p;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let a, b, c, d, e, f, g = 0, hh = 0;
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) { a = x1 - x0; c = x2 - x1; e = x0; b = y1 - y0; d = y2 - y1; f = y0; }
  else {
    const den = dx1 * dy2 - dx2 * dy1; if (Math.abs(den) < 1e-12) return null;
    g = (dx3 * dy2 - dx2 * dy3) / den; hh = (dx1 * dy3 - dx3 * dy1) / den;
    a = x1 - x0 + g * x1; c = x3 - x0 + hh * x3; e = x0; b = y1 - y0 + g * y1; d = y3 - y0 + hh * y3; f = y0;
  }
  const r = (v) => (Math.abs(v) < 1e-12 ? 0 : +v.toPrecision(10));
  return `matrix3d(${r(a / W)},${r(b / W)},0,${r(g / W)},${r(c / H)},${r(d / H)},0,${r(hh / H)},0,0,1,0,${r(e)},${r(f)},0,1)`;
}

// Die Seite auf der Bildschirmfläche: sichtbar nur während Fokus bzw. Fahrt, klickbar erst, wenn die Kamera angekommen ist
export class MonitorOverlay {
  constructor(world) { this.w = world; this.root = null; this.el = null; this.tick = null; this.pts = [0, 1, 2, 3].map(() => new THREE.Vector3()); }
  attach(el, tick) {
    if (!this.root) { this.root = document.createElement('div'); this.root.id = 'mon3d'; const hud = document.getElementById('hud'); if (hud) hud.before(this.root); else document.body.append(this.root); }
    if (this.el && this.el !== el) this.el.remove();
    this.el = el; this.tick = tick; el.style.opacity = '0'; el.style.pointerEvents = 'none'; this.root.append(el); this.root.style.display = '';
    this.update();
  }
  update() {
    const w = this.w, el = this.el; if (!el) return;
    this.tick?.();
    const K = w.focusK || 0, sc = (w.focus?.page && w.focus.sc) || (w.fc?.page && w.fc.sc);
    if (!sc || K <= 0 || !sc.mesh.parent) { if (!w.focus?.page && K <= 0) { el.remove(); this.el = null; this.tick = null; this.root.style.display = 'none'; } else { el.style.opacity = '0'; el.style.pointerEvents = 'none'; } return; }
    const cam = w.camera, m = sc.mesh; cam.updateMatrixWorld(); m.updateWorldMatrix(true, false);
    const { width: sw, height: sh } = m.geometry.parameters, iw = innerWidth, ih = innerHeight;
    const loc = [[-sw / 2, sh / 2], [sw / 2, sh / 2], [sw / 2, -sh / 2], [-sw / 2, -sh / 2]], q = [];
    for (let i = 0; i < 4; i++) {
      const v = this.pts[i].set(loc[i][0], loc[i][1], 0).applyMatrix4(m.matrixWorld);
      if (_c.copy(v).applyMatrix4(cam.matrixWorldInverse).z > -cam.near) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; return; } // hinter der Kamera
      v.project(cam); q.push([(v.x + 1) / 2 * iw, (1 - v.y) / 2 * ih]);
    }
    const W = el.offsetWidth || 1, H = el.offsetHeight || 1, done = K >= 1 && !!w.focus?.page;
    const flat = Math.abs(q[0][0] - q[3][0]) < 0.6 && Math.abs(q[1][0] - q[2][0]) < 0.6 && Math.abs(q[0][1] - q[1][1]) < 0.6 && Math.abs(q[3][1] - q[2][1]) < 0.6 && Math.abs(q[1][0] - q[0][0] - W) < 2 && Math.abs(q[3][1] - q[0][1] - H) < 2;
    const tf = done && flat ? `translate(${Math.round(q[0][0])}px, ${Math.round(q[0][1])}px)` : quadMatrix(W, H, q); // angekommen: pixelgenau, gestochen scharf
    if (tf && el.style.transform !== tf) el.style.transform = tf;
    const o = Math.max(0, Math.min(1, (K - 0.55) / 0.4)); el.style.opacity = o.toFixed(3);
    el.style.pointerEvents = done ? 'auto' : 'none';
  }
}

// ---------- Mini-Ansicht auf der Monitor-Textur (ohne Fokus): aus 2–3 m lesbar ----------
const FUN = 'Fredoka, Nunito, Arial, sans-serif', TXT = 'Nunito, Arial, sans-serif';
export function drawPcScreen(world, sc) {
  const cv = sc.canvas, g = cv.getContext('2d'), W = cv.width, H = cv.height, k = W / 1024, game = world.game, s = game.s;
  g.setTransform(k, 0, 0, k, 0, 0); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  const w = 1024, hh = H / k;
  if (s.feat && !s.flags.miningStarted) { g.fillStyle = '#050403'; g.fillRect(0, 0, w, hh); g.fillStyle = '#3a2a18'; g.beginPath(); g.arc(w - 36, hh - 32, 8, 0, 7); g.fill(); return; } // aus, Standby-LED
  const sm = game.summary[world.facId];
  if (world.bootT != null && world.t - world.bootT < 5.5) { // Booten: die alte Konsole
    g.fillStyle = '#140b04'; g.fillRect(0, 0, w, hh); g.fillStyle = '#ffb347'; g.font = 'bold 50px monospace'; g.fillText('miner v0.3 – ' + fmtDate(s.day), 28, 72, w - 56);
    const pc = game.facObjects(world.facId).find((o) => o.type === 'tower'), gpu = pc?.parts?.gpus?.[0], a = pc && sm?.per.get(pc.uid);
    const boot = ['Starte Miner ...', gpu ? `GPU gefunden: ${PART[gpu].name}` : `Keine GPU – rechne mit der CPU (${PART[pc?.parts?.cpu]?.name || 'CPU'})`, 'Verbinde mit dem Bitcoin-Netz ...', `Schürfe! ${a?.units?.[0]?.h ? fmtHash(a.units[0].h, 'sha256') : ''}`];
    g.font = 'bold 46px monospace'; boot.slice(0, 1 + Math.floor((world.t - world.bootT) / 1.1)).forEach((l, i) => g.fillText(l, 28, 170 + i * 76, w - 56));
    return;
  }
  // Börse im Kleinen: Kurs groß, Änderung, 30-Tage-Linie, Mining-Status, Bestand
  const bg = g.createLinearGradient(0, 0, 0, hh); bg.addColorStop(0, '#1b1a1d'); bg.addColorStop(1, '#0e0e10'); g.fillStyle = bg; g.fillRect(0, 0, w, hh);
  const p = game.price('BTC'), p7 = game.price('BTC', s.day - 7), ch = p7 > 0 ? (p / p7 - 1) * 100 : null, L = 56, R = w - 56;
  g.fillStyle = '#f7931a'; g.beginPath(); g.arc(L + 22, 58, 22, 0, 7); g.fill(); g.fillStyle = '#1a1206'; g.font = `700 30px ${FUN}`; g.textAlign = 'center'; g.fillText('₿', L + 22, 69); g.textAlign = 'left';
  g.fillStyle = '#b4aa9d'; g.font = `700 40px ${TXT}`; g.fillText('BITCOIN', L + 62, 73);
  if (ch != null) { g.textAlign = 'right'; g.fillStyle = ch >= 0 ? '#73d99f' : '#ff8a80'; g.font = `700 48px ${FUN}`; g.fillText(`${ch >= 0 ? '▲' : '▼'} ${Math.abs(ch).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`, R, 74); g.textAlign = 'left'; }
  g.fillStyle = '#f5efe6'; g.font = `700 172px ${FUN}`; g.fillText(fmtUSD(p), L - 6, 236, R - L);
  // 30 Tage
  const pts = []; for (let d = s.day - 30; d <= s.day; d++) { const v = game.price('BTC', d); if (v > 0) pts.push(v); }
  if (pts.length > 2) {
    const mn = Math.min(...pts), mx = Math.max(...pts), y0 = 268, y1 = 360, X = (i) => L + (i / (pts.length - 1)) * (R - L), Y = (v) => y1 - ((v - mn) / (mx - mn || 1)) * (y1 - y0);
    const gr = g.createLinearGradient(0, y0, 0, y1 + 10); gr.addColorStop(0, 'rgba(240,181,74,.28)'); gr.addColorStop(1, 'rgba(240,181,74,0)');
    g.beginPath(); pts.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.lineTo(R, y1 + 10); g.lineTo(L, y1 + 10); g.closePath(); g.fillStyle = gr; g.fill();
    g.beginPath(); pts.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.strokeStyle = '#f0b54a'; g.lineWidth = 6; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke();
    g.fillStyle = '#f0b54a'; g.beginPath(); g.arc(R, Y(pts[pts.length - 1]), 11, 0, 7); g.fill();
  }
  // Mining-Status: groß, das zweite, was man aus der Entfernung lesen können soll
  const r = coinRate(game, 'BTC'), on = r.perDay > 0, tripped = sm?.tripped;
  g.fillStyle = on ? '#73d99f' : tripped ? '#ff8a80' : '#f0b54a'; g.beginPath(); g.arc(L + 20, 438, on && Math.floor(world.t) % 2 ? 15 : 13, 0, 7); g.fill();
  g.font = `700 82px ${FUN}`; g.fillText(on ? `schürft ${fmtCoin(r.perDay)} BTC/Tag` : tripped ? 'Sicherung raus!' : 'Miner pausiert', L + 56, 466, R - L - 56);
  const wl = s.wallet.BTC, have = world.liveBtc?.() ?? wl.ex + wl.cold; // wie im HUD: mit dem heute schon Geschürften (Market setzt liveBtc)
  g.fillStyle = '#b4aa9d'; g.font = `700 50px ${TXT}`; g.fillText(`Du hast ${fmtCoin(have)} BTC`, L, 548, R - L);
}
