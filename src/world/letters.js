// Briefe auf dem Schreibtisch (Start ohne Handy): Deniz' Zettel und Papas Umschlag. Anschauen, E: lesen (UI.readLetter), dann sind sie weg.
// Liegen in room.letterSpots (rooms.js), solange game.s.letters[who] noch 0 ist.
import * as THREE from 'three';
import { box, labelMat } from './models.js';
import { mat } from './materials.js';

function letterModel(who) {
  const g = new THREE.Group();
  if (who === 'deniz') { // gefalteter Zettel mit Kugelschreiber-Schrift
    const paper = labelMat('letterDeniz', 256, 192, (c, w, h) => {
      c.fillStyle = '#f6f2e6'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(120,150,200,.35)'; c.lineWidth = 2; for (let y = 34; y < h; y += 26) { c.beginPath(); c.moveTo(10, y); c.lineTo(w - 10, y); c.stroke(); }
      c.fillStyle = '#2a3f8f'; c.font = 'italic 600 22px Nunito, sans-serif';
      ['Hey!', 'Deine alten PC-Teile', 'stehen unten im Keller', 'im Regal …', '– Deniz'].forEach((t, i) => c.fillText(t, 18 + (i === 4 ? 110 : 0), 28 + i * 26));
    });
    box(g, 0.2, 0.004, 0.15, paper, 0, 0, 0, 0, 0);
    const fold = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05), mat('letterFold', { color: 0xece6d6, roughness: 0.9, side: THREE.DoubleSide }));
    fold.rotation.x = -Math.PI / 2 + 0.35; fold.position.set(0, 0.012, -0.085); g.add(fold);
  } else { // brauner Umschlag, „Für dich“, mit Geldschein-Ecke
    const env = labelMat('letterPapa', 256, 128, (c, w, h) => {
      c.fillStyle = '#d9c39b'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(90,60,30,.35)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(w / 2, h * 0.55); c.lineTo(w, 0); c.stroke();
      c.fillStyle = '#3a2a1a'; c.font = 'italic 700 26px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('Für dich – Papa', w / 2, h - 18);
    });
    box(g, 0.22, 0.006, 0.11, env, 0, 0, 0, 0, 0);
    box(g, 0.07, 0.002, 0.03, mat('letterNote', { color: 0x9db48a, roughness: 0.8 }), 0.07, 0.006, -0.05, 0.2, 0);
  }
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}

export function syncLetters(world) {
  const s = world.game.s, spots = world.room?.letterSpots;
  if (!world.letterGroup) { world.letterGroup = new THREE.Group(); world.scene.add(world.letterGroup); }
  world.letterItems ||= {};
  const want = spots && s?.letters ? Object.keys(spots).filter((w) => w in s.letters && !s.letters[w]) : [];
  for (const [who, g] of Object.entries(world.letterItems)) if (!want.includes(who) || g.userData.fac !== world.facId) { world.letterGroup.remove(g); delete world.letterItems[who]; }
  for (const who of want) {
    if (world.letterItems[who]) continue;
    const [x, y, z, ry] = spots[who], g = letterModel(who);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.2), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.03; g.add(hit); // etwas größere Trefferfläche
    g.position.set(x, y, z); g.rotation.y = ry; g.userData.fac = world.facId;
    g.traverse((m) => { m.userData.letter = who; });
    world.letterGroup.add(g); world.letterItems[who] = g;
  }
}
