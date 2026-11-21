// Papas Miner auf der Werkbank und die Umzugskisten in der Werkstatt (Spiel: src/sim/papa.js, Oberfläche: UI.papaRig)
// Beides steht nur in der Werkstatt-Szene. Anschauen und E: Requisite { action: 'papaRig' } bzw. { action: 'crate', key }.
import * as THREE from 'three';
import { objectModel, rigPartModel, box, labelMat, releaseModel } from './models.js';
import { mat } from './materials.js';

export const PAPA_RIG_AT = { x: 2.3, y: 0.91, z: 0.42, rot: 1 }; // auf der Werkbank rechts neben dem alten Fernseher, Glasseite zum Raum

const LED = { psu: 0xff3b2f, heat: 0xffa020 };
// Freigeben: Modell-Vorlagen abmelden, eigene Geometrien und Materialien löschen (geteilte aus den Caches bleiben)
function free(root) {
  if (!root) return; const tpl = new Set();
  root.traverse((m) => { if (m.userData.tkey) { releaseModel(m); m.traverse((c) => tpl.add(c)); } });
  root.traverse((m) => { if (tpl.has(m)) return; if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose(); for (const x of [].concat(m.material || [])) if (!x.userData.shared) x.dispose(); });
}

// Umzugskarton mit Klebeband und „UMZUG“ in Papas Schrift
function crateModel() {
  const g = new THREE.Group(), c = mat('movBox', { color: 0xb58d5c, roughness: 0.92 }), t = mat('movTape', { color: 0xc8b07c, roughness: 0.5 });
  box(g, 0.5, 0.44, 0.5, c, 0, 0, 0, 0, 0.01); box(g, 0.505, 0.004, 0.08, t, 0, 0.44, 0, 0, 0); box(g, 0.08, 0.44, 0.505, t, 0, 0, 0, 0, 0);
  const lbl = labelMat('crateUmzug', 256, 128, (cx, w, h) => { cx.fillStyle = '#c9a36e'; cx.fillRect(0, 0, w, h); cx.fillStyle = '#23201b'; cx.font = 'italic 800 64px Nunito, Arial'; cx.textAlign = 'center'; cx.fillText('UMZUG', w / 2, 70); cx.font = 'italic 600 30px Nunito, Arial'; cx.fillText('vorsichtig!', w / 2, 112); });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), lbl); p.position.set(0, 0.24, s * 0.253); if (s < 0) p.rotation.y = Math.PI; g.add(p); }
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}
// Schild „Papas Miner“ (Abschluss der Quest)
function signModel() {
  const g = new THREE.Group(), lbl = labelMat('papaSign', 256, 96, (cx, w, h) => { cx.fillStyle = '#f4ecd8'; cx.fillRect(0, 0, w, h); cx.strokeStyle = '#7a5230'; cx.lineWidth = 8; cx.strokeRect(4, 4, w - 8, h - 8); cx.fillStyle = '#2b2118'; cx.font = 'italic 800 42px Nunito, Arial'; cx.textAlign = 'center'; cx.fillText('Papas Miner', w / 2, 52); cx.font = 'italic 600 20px Nunito, Arial'; cx.fillText('nicht anfassen!', w / 2, 80); });
  box(g, 0.24, 0.1, 0.012, lbl, 0, 0.02, 0, 0, 0); box(g, 0.02, 0.03, 0.06, mat('signFoot', { color: 0x7a5230, roughness: 0.7 }), 0, 0, -0.02, 0, 0);
  g.rotation.x = -0.25; return g;
}

// Szene abgleichen: Miner (je Schritt), LED, Schild, Umzugskisten. Kostet nichts, solange sich nichts ändert.
export function syncPapa(world) {
  const g = world.game, s = g.s, P = s?.papa, here = world.facId === 'werkstatt' && !!world.room;
  if (!world.papaGroup) { world.papaGroup = new THREE.Group(); world.scene.add(world.papaGroup); }
  const crates = here ? g.moveCrates().filter((e) => e.pos) : [], rig = here && P?.st && P.rig ? P.rig : null;
  const key = here ? JSON.stringify([rig, P?.st, crates.map((e) => [e.sid, e.pos])]) : '';
  if (key === world.papaKey && world.papaGroup.parent) return; world.papaKey = key;
  for (const ch of [...world.papaGroup.children]) { world.papaGroup.remove(ch); free(ch); }
  world.papaEntry = null; world.papaLed = null; world.papaCrates = {};
  if (!here) return;
  if (rig) {
    const A = PAPA_RIG_AT, grp = new THREE.Group(); grp.position.set(A.x, A.y, A.z); grp.rotation.y = -A.rot * Math.PI / 2;
    const obj = { uid: 'papa', type: 'tower', x: A.x, y: A.y, z: A.z, rot: A.rot, parts: rig };
    const model = objectModel(obj); grp.add(model); grp.userData.model = model;
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshStandardMaterial({ color: 0x113311, emissive: LED[P.st] || 0x3ddc84, emissiveIntensity: 1.4 })); led.position.set(0, 0.42, 0.25); grp.add(led); world.papaLed = led;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.62), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(0, 0.3, 0.04); grp.add(hit);
    const hint = P.st === 'psu' ? 'piept' : P.st === 'heat' ? 'zu heiß' : 'läuft';
    hit.userData.prop = { action: 'papaRig', label: 'Papas Miner', hint, papa: true };
    let sp = null; if (P.st === 'heat' || P.st === 'psu') { sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: world.icons.warn, depthTest: false, transparent: true })); sp.position.set(0, 0.62, 0); sp.scale.set(0.16, 0.16, 0.16); sp.renderOrder = 10; grp.add(sp); }
    world.papaGroup.add(grp);
    if (P.st === 'done') { const sg = signModel(); sg.position.set(A.x - 0.32, A.y, A.z + 0.3); sg.rotation.y = 0.35; world.papaGroup.add(sg); }
    world.papaEntry = { group: grp, obj, sprite: null, warn: sp }; // warn: Hinweis-Symbol (in der Nahansicht aus)
  }
  for (const e of crates) {
    const c = crateModel(); c.position.set(e.pos[0], 0, e.pos[1]); c.rotation.y = ((e.sid.length * 37) % 7 - 3) * 0.05;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.5, 0.56), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.24; c.add(hit);
    hit.userData.prop = { action: 'crate', key: e.sid, label: 'crate:' + e.sid, hint: 'Auspacken', name: g.stockName(e) };
    world.papaGroup.add(c); world.papaCrates[e.sid] = c;
  }
}

// Jedes Bild: LED blinkt, Piepen in der Nähe (Netzteil zu schwach), Einbau-Animation des neuen Netzteils
export function updatePapa(world, dt) {
  const P = world.game.s?.papa, led = world.papaLed;
  const wn = world.papaEntry?.warn; if (wn) wn.visible = world.focusUid !== 'papa' && world.mode !== 'title';
  if (led) { const st = P?.st, on = st === 'psu' ? Math.floor(world.t * 2.5) % 2 === 0 : st === 'heat' ? Math.sin(world.t * 6) > 0 : true; led.material.emissiveIntensity = on ? 1.6 : 0.05; }
  if (P?.st === 'psu' && world.papaEntry && world.mode !== 'title') {
    const A = PAPA_RIG_AT, d = Math.hypot(world.player.pos.x - A.x, world.player.pos.z - A.z);
    world.papaBeepT = (world.papaBeepT || 0) - dt;
    if (d < 6 && world.papaBeepT <= 0) { world.papaBeepT = 2.6; world.onPapaBeep?.(d); }
  }
  const a = world.papaAnim; if (!a) return;
  a.t += dt; const k = Math.min(1, a.t / 0.58), c1 = 1.70158, c3 = c1 + 1, eb = 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
  a.part.position.set(Math.max(0, 1 - eb) * 0.24, (1 - k) * (1 - k) * 0.03, 0);
  if (a.t > 0.76) { world.papaAnim = null; world.papaKey = null; syncPapa(world); }
}
// Netzteil gleitet ins Gehäuse (wie World.animateInstall), danach wird der Miner neu aufgebaut
export function papaInstall(world, type = 'psu') {
  const e = world.papaEntry, P = world.game.s?.papa; if (!e || !P?.rig) return;
  const grp = e.group, old = grp.userData.model; if (old) { grp.remove(old); free(old); }
  const parts = { ...P.rig, gpus: [...P.rig.gpus] }; parts[type] = null;
  const base = objectModel({ type: 'tower', parts }), part = rigPartModel({ type: 'tower', parts: P.rig }, type);
  part.traverse((m) => { m.castShadow = true; }); base.add(part); grp.add(base); grp.userData.model = base;
  world.papaAnim = { t: 0, part };
}
