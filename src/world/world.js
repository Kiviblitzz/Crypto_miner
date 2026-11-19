// 3D-Welt: Renderer, Kamera, Standort laden, Objekte synchronisieren, Bauen/Auswählen, Tag/Nacht, Rundgang
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildRoom, buildOutside } from './rooms.js';
import { objectModel } from './models.js';
import { M, mat } from './materials.js';
import { FACILITY } from '../data/world.js';
import { PLACEABLE } from '../data/hardware.js';
import { fmtHash, fmtUSD, fmtDate } from '../sim/game.js';

const tmpV = new THREE.Vector3();

function iconTexture(emoji, bg) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 6; g.stroke();
  g.font = '64px "Segoe UI Emoji", "Noto Color Emoji", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emoji, 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class World {
  constructor(canvas, game) {
    this.game = game; this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.92;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(r);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.45;
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.05, 2500);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.08;
    this.controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    this.controls.maxPolarAngle = 1.42; this.controls.screenSpacePanning = false;
    this.fp = new PointerLockControls(this.camera, document.body);
    this.fp.addEventListener('unlock', () => this.exitFP());
    document.addEventListener('pointerlockerror', () => { if (this.fpActive) { this.exitFP(); this.onFPError?.(); } });

    // Licht
    this.hemi = new THREE.HemisphereLight(0xcfe6ff, 0x5a4a3a, 0.7); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1dc, 2.5); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.fill = new THREE.AmbientLight(0xffffff, 0.12); this.scene.add(this.fill);

    // Postprocessing
    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.45, 0.3, 0.97);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.quality = 'high';

    this.objGroup = new THREE.Group(); this.scene.add(this.objGroup);
    this.entries = new Map(); // uid -> {group, key, sprite}
    this.icons = { broken: iconTexture('🔥', '#d33'), warn: iconTexture('⚠️', '#e9a400'), power: iconTexture('⚡', '#444'), empty: iconTexture('➕', '#2b6cd6'), sleep: iconTexture('💤', '#5a6475') };
    this.raycaster = new THREE.Raycaster(); this.mouse = new THREE.Vector2(); this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.keys = {}; this.placing = null; this.selected = null; this.hoverUid = null;
    this.selBox = new THREE.Box3Helper(new THREE.Box3(), 0x35d0ff); this.selBox.visible = false; this.scene.add(this.selBox);
    this.ghostOk = new THREE.MeshStandardMaterial({ color: 0x30ff90, transparent: true, opacity: 0.45, emissive: 0x10ff60, emissiveIntensity: 0.4, depthWrite: false });
    this.ghostBad = new THREE.MeshStandardMaterial({ color: 0xff3030, transparent: true, opacity: 0.45, emissive: 0xff1010, emissiveIntensity: 0.4, depthWrite: false });
    this.footprint = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x30ff90, transparent: true, opacity: 0.25, depthWrite: false }));
    this.footprint.rotation.x = -Math.PI / 2; this.footprint.visible = false; this.scene.add(this.footprint);
    this.gridHelper = null;
    this.clock = new THREE.Clock(); this.t = 0; this.transition = null;
    this.bindInput();
    window.addEventListener('resize', () => this.resize()); this.resize();
    game.on('objects', (fac) => { if (fac === this.facId) this.syncObjects(); });
    game.on('update', () => this.spawnIncome());
  }

  setQuality(q) {
    this.quality = q;
    this.renderer.shadowMap.enabled = q !== 'low';
    this.renderer.setPixelRatio(q === 'low' ? 1 : Math.min(window.devicePixelRatio, 1.75));
    this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false); this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  // ---------- Standort ----------
  loadFacility(id, { cinematic = false } = {}) {
    this.cancelPlacement(); this.select(null); this.onHover?.(null);
    if (this.room) { this.scene.remove(this.room.root); this.scene.remove(this.outside); for (const l of this.roomLights) this.scene.remove(l); }
    for (const e of this.entries.values()) this.objGroup.remove(e.group);
    this.entries.clear();
    const def = this.def = FACILITY[id]; this.facId = id;
    this.room = buildRoom(def); this.scene.add(this.room.root);
    this.outside = buildOutside(this.room.outside, def); this.scene.add(this.outside);
    this.roomLights = this.room.lights.map((L) => { const p = new THREE.PointLight(L.color, L.intensity, L.dist, 1.6); p.position.set(...L.pos); this.scene.add(p); return p; });
    if (this.gridHelper) this.scene.remove(this.gridHelper);
    const gpts = []; const step = def.w * def.d > 600 ? 1 : def.grid;
    for (let x = 0; x <= def.w + 1e-6; x += step) gpts.push(x, 0, 0, x, 0, def.d);
    for (let z = 0; z <= def.d + 1e-6; z += step) gpts.push(0, 0, z, def.w, 0, z);
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gpts, 3));
    this.gridHelper = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0x6ad1ff, transparent: true, opacity: 0.22 }));
    this.gridHelper.position.y = 0.006;
    this.gridHelper.visible = false; this.scene.add(this.gridHelper);
    // Schatten-Kamera an Raumgröße anpassen
    const s = Math.max(def.w, def.d) * 0.75 + 2;
    const sc = this.sun.shadow.camera; sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.near = 0.5; sc.far = s * 6; sc.updateProjectionMatrix();
    // Kamera
    const span = Math.max(def.w, def.d);
    this.controls.target.set(def.w / 2, 0, def.d / 2);
    this.controls.minDistance = Math.max(1.2, span * 0.15); this.controls.maxDistance = span * 2.6 + 6;
    const dist = def.tier === 0 ? span * 1.15 + 2.5 : span * 1.0 + 2.2;
    const endPos = new THREE.Vector3(def.w / 2 + dist * 0.55, dist * 0.78, def.d / 2 + dist * 0.75);
    if (cinematic) {
      const startPos = new THREE.Vector3(def.w / 2 + 1, 1.4, def.d / 2 + 1.5);
      this.camera.position.copy(startPos);
      this.transition = { from: startPos, to: endPos, t: 0, dur: 3.6, hold: true };
    } else { this.transition = null; this.camera.position.copy(endPos); }
    this.camera.near = span > 30 ? 0.2 : 0.05; this.camera.updateProjectionMatrix();
    if (this.people) { this.scene.remove(this.people); this.people = null; }
    this.popups?.forEach((p) => (p.visible = false));
    this.buildWeather();
    this.scene.fog = def.style === 'fjord' ? new THREE.Fog(0xb8c8d8, 250, 900) : new THREE.Fog(0x9fb8d0, 60 + span * 3, 260 + span * 6);
    this.syncObjects();
  }

  // ---------- Objekte ----------
  objKey(o) { return JSON.stringify([o.type, o.parts, o.items?.map((i) => i.id)]); }
  syncObjects() {
    const objs = this.game.facObjects(this.facId);
    const seen = new Set();
    for (const o of objs) {
      seen.add(o.uid);
      let e = this.entries.get(o.uid);
      const key = this.objKey(o);
      if (e && e.key !== key) { this.objGroup.remove(e.group); e = null; }
      if (!e) {
        const g = objectModel(o); g.traverse((m) => { m.userData.uid = o.uid; });
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.icons.warn, depthTest: false, transparent: true })); sp.visible = false; sp.renderOrder = 10;
        g.add(sp);
        e = { group: g, key, sprite: sp }; this.entries.set(o.uid, e); this.objGroup.add(g);
      }
      e.group.position.set(o.x, 0, o.z); e.group.rotation.y = -o.rot * Math.PI / 2;
      e.obj = o;
    }
    for (const [uid, e] of this.entries) if (!seen.has(uid)) { this.objGroup.remove(e.group); this.entries.delete(uid); if (this.selected === uid) this.select(null); }
    this.updateStatus(); this.syncPeople();
  }
  updateStatus() {
    const sm = this.game.summary[this.facId]; if (!sm) return;
    const span = Math.max(this.def.w, this.def.d);
    const sc = 0.32 * Math.max(1, span / 12);
    for (const [uid, e] of this.entries) {
      const a = sm.per.get(uid); const def = PLACEABLE[e.obj.type];
      let icon = null;
      if (sm.tripped && def.kind !== 'decor') icon = 'power';
      else if (a?.status === 'broken' || a?.status === 'partial') icon = 'broken';
      else if (a?.status === 'incomplete' || a?.status === 'psu') icon = 'warn';
      else if (a?.status === 'empty') icon = 'empty';
      else if (a?.status === 'idle' || a?.status === 'off') icon = 'sleep';
      e.running = !sm.tripped && a && a.watt > 0;
      e.sprite.visible = !!icon;
      if (icon) { e.sprite.material.map = this.icons[icon]; const bb = e.group.userData.bbox; e.sprite.position.set(0, (bb ? bb.max.y : 1) + 0.25 * Math.max(1, span / 12), 0); e.sprite.scale.set(sc, sc, sc); }
    }
    if (this.selected) this.refreshSelBox();
    this.syncPeople();
    if (this.heatMode) this.updateHeat();
    this.updateSolar();
  }

  // ---------- Auswahl ----------
  select(uid) {
    this.selected = uid; this.refreshSelBox();
    this.onSelect?.(uid);
  }
  refreshSelBox() {
    const e = this.selected && this.entries.get(this.selected);
    if (!e) { this.selBox.visible = false; return; }
    this.selBox.box.setFromObject(e.group); this.selBox.box.expandByScalar(0.03); this.selBox.visible = true;
  }

  // ---------- Bauen ----------
  startPlacement(type, moveUid = null, template = null) {
    this.cancelPlacement();
    const def = PLACEABLE[type];
    const src = moveUid ? this.game.findObj(moveUid) : template ? template : { type, parts: def.kind === 'rig' ? { mobo: null, cpu: null, psu: null, gpus: [] } : undefined, items: def.kind === 'holder' ? [] : undefined };
    const ghost = objectModel(src);
    ghost.traverse((m) => { if (m.isMesh) { m.material = this.ghostOk; m.castShadow = false; } });
    this.scene.add(ghost);
    this.placing = { type, def, ghost, rot: moveUid ? this.game.findObj(moveUid).rot : template ? template.rot : 0, moveUid, template, valid: false, x: 0, z: 0 };
    if (moveUid) { const e = this.entries.get(moveUid); if (e) e.group.visible = false; }
    this.gridHelper.visible = true; this.footprint.visible = true;
    this.onPlacing?.(true);
  }
  cancelPlacement() {
    if (!this.placing) return;
    this.scene.remove(this.placing.ghost);
    if (this.placing.moveUid) { const e = this.entries.get(this.placing.moveUid); if (e) e.group.visible = true; }
    this.placing = null; this.gridHelper.visible = false; this.footprint.visible = false;
    this.onPlacing?.(false);
  }
  footprintOf(def, rot) { const [w, d] = def.size; return rot % 2 ? [d, w] : [w, d]; }
  rectOf(o) { const def = PLACEABLE[o.type]; const [w, d] = this.footprintOf(def, o.rot); return { x0: o.x - w / 2, x1: o.x + w / 2, z0: o.z - d / 2, z1: o.z + d / 2 }; }
  canPlace(def, x, z, rot, ignoreUid) {
    const [w, d] = this.footprintOf(def, rot); const e = 0.001;
    const r = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 };
    if (r.x0 < -e || r.z0 < -e || r.x1 > this.def.w + e || r.z1 > this.def.d + e) return false;
    const hit = (a) => a.x0 < r.x1 - e && a.x1 > r.x0 + e && a.z0 < r.z1 - e && a.z1 > r.z0 + e;
    if (this.room.blocked.some(hit)) return false;
    for (const o of this.game.facObjects(this.facId)) if (o.uid !== ignoreUid && hit(this.rectOf(o))) return false;
    return true;
  }
  updatePlacement() {
    const p = this.placing; if (!p) return;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.floorPlane, tmpV)) return;
    const [w, d] = this.footprintOf(p.def, p.rot); const g = this.def.grid;
    let x = Math.round((tmpV.x - w / 2) / g) * g + w / 2, z = Math.round((tmpV.z - d / 2) / g) * g + d / 2;
    x = Math.min(Math.max(x, w / 2), this.def.w - w / 2); z = Math.min(Math.max(z, d / 2), this.def.d - d / 2);
    p.x = x; p.z = z; p.valid = this.canPlace(p.def, x, z, p.rot, p.moveUid);
    p.ghost.position.set(x, 0.002, z); p.ghost.rotation.y = -p.rot * Math.PI / 2;
    const m = p.valid ? this.ghostOk : this.ghostBad;
    p.ghost.traverse((o) => { if (o.isMesh) o.material = m; });
    this.footprint.position.set(x, 0.01, z); this.footprint.scale.set(w, d, 1); this.footprint.material.color.set(p.valid ? 0x30ff90 : 0xff3030);
  }
  confirmPlacement() {
    const p = this.placing; if (!p || !p.valid) return;
    if (p.moveUid) {
      const o = this.game.findObj(p.moveUid); o.x = p.x; o.z = p.z; o.rot = p.rot;
      const uid = p.moveUid; this.cancelPlacement(); this.syncObjects(); this.select(uid); return;
    }
    const o = this.onPlace?.(p.type, p.x, p.z, p.rot, p.template);
    if (o && !this.keys.Shift) { this.cancelPlacement(); this.select(o.uid); }
  }

  // ---------- Eingabe ----------
  bindInput() {
    const c = this.canvas;
    let downPos = null;
    c.addEventListener('pointermove', (ev) => {
      this.mouse.set((ev.clientX / window.innerWidth) * 2 - 1, -(ev.clientY / window.innerHeight) * 2 + 1);
      this.clientPos = [ev.clientX, ev.clientY];
      if (this.placing) this.updatePlacement(); else this.hoverCheck();
    });
    c.addEventListener('pointerdown', (ev) => { downPos = [ev.clientX, ev.clientY, ev.button]; });
    c.addEventListener('pointerup', (ev) => {
      if (!downPos) return; const moved = Math.hypot(ev.clientX - downPos[0], ev.clientY - downPos[1]) > 6; const btn = downPos[2]; downPos = null;
      if (this.fpActive) { if (btn === 0) this.fpClick(); return; }
      if (moved) return;
      if (btn === 2 && this.placing) { this.cancelPlacement(); return; }
      if (btn !== 0) return;
      if (this.placing) { this.confirmPlacement(); return; }
      if (this.empire) return;
      this.select(this.pick());
    });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('dblclick', () => {
      if (this.placing || this.fpActive || this.empire) return;
      const uid = this.pick(); const e = uid && this.entries.get(uid); if (!e) return;
      const bb = new THREE.Box3().setFromObject(e.group); const ctr = bb.getCenter(new THREE.Vector3()); const size = bb.getSize(new THREE.Vector3()).length();
      const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
      const dist = Math.max(this.controls.minDistance, size * 2.2 + 0.6);
      const to = ctr.clone().addScaledVector(dir, dist); ctr.y = 0;
      this.focusAnim = { fromT: this.controls.target.clone(), toT: ctr, fromP: this.camera.position.clone(), toP: to, t: 0 };
    });
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      this.keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true;
      if (e.key === 'r' || e.key === 'R') { if (this.placing) { this.placing.rot = (this.placing.rot + 1) % 4; this.updatePlacement(); } }
      if (e.key === 'Escape') { if (this.placing) this.cancelPlacement(); else this.select(null); }
      if ((e.key === 'h' || e.key === 'H') && !this.fpActive) { const on = this.toggleHeat(); this.onHeat?.(on); }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
  }
  pick(fromCenter = false) {
    if (fromCenter) this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera); else this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.objGroup.children, true);
    for (const h of hits) if (h.object.userData.uid && !h.object.isSprite) return h.object.userData.uid;
    return null;
  }
  hoverCheck() {
    const uid = this.fpActive || this.empire ? null : this.pick();
    this.canvas.style.cursor = uid ? 'pointer' : 'default';
    this.onHover?.(uid, this.clientPos);
  }

  // ---------- Rundgang ----------
  enterFP() {
    if (this.fpActive) return;
    if (this.empire) this.hideEmpire();
    this.cancelPlacement(); this.select(null);
    this.savedCam = { pos: this.camera.position.clone(), target: this.controls.target.clone() };
    this.fpActive = true; this.controls.enabled = false;
    const eye = this.def.tier === 0 ? 1.55 : 1.7;
    this.camera.position.set(this.def.w / 2, eye, this.def.d * 0.75); this.camera.lookAt(this.def.w / 2, eye, 0);
    for (const wl of this.room.walls) wl.group.visible = true; this.room.ceil.visible = this.def.tier < 3;
    try { const r = this.fp.lock(); r?.catch?.(() => { this.exitFP(); this.onFPError?.(); }); } catch (e) { this.exitFP(); this.onFPError?.(); }
    this.onFP?.(true);
  }
  exitFP() {
    if (!this.fpActive) return;
    this.fpActive = false; this.controls.enabled = true; this.room.ceil.visible = false;
    this.camera.position.copy(this.savedCam.pos); this.controls.target.copy(this.savedCam.target); this.camera.lookAt(this.controls.target);
    this.onFP?.(false);
  }
  fpClick() { const uid = this.pick(true); if (uid) { this.fp.unlock(); this.select(uid); } }

  // ---------- Schwebende Ertrags-Einblendungen ----------
  spawnIncome() {
    if (this.empire || this.fpActive || !this.game.s.speed) return;
    const now = this.t; if (this.lastIncome && now - this.lastIncome < 1.1) return; this.lastIncome = now;
    const sm = this.game.summary[this.facId]; if (!sm || sm.tripped) return;
    this.popups ||= [];
    const cand = [];
    for (const [uid, e] of this.entries) { const a = sm.per.get(uid); if (!a || !a.units.length) continue; const rev = a.units.reduce((x, u) => x + u.rev, 0) * sm.throttle; if (rev > 0.01) cand.push([e, rev]); }
    cand.sort(() => Math.random() - 0.5);
    for (const [e, rev] of cand.slice(0, 6)) {
      let p = this.popups.find((q) => !q.visible);
      if (!p) { if (this.popups.length >= 14) break; const c = document.createElement('canvas'); c.width = 256; c.height = 64; const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; p = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })); p.renderOrder = 15; p.userData.c = c; this.scene.add(p); this.popups.push(p); }
      const c = p.userData.c, g = c.getContext('2d'); g.clearRect(0, 0, 256, 64);
      g.font = 'bold 40px Arial'; g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,0.75)'; const txt = '+' + fmtUSD(rev); g.strokeText(txt, 128, 46); g.fillStyle = '#5dff9c'; g.fillText(txt, 128, 46);
      p.material.map.needsUpdate = true;
      const span = Math.max(this.def.w, this.def.d), sc = 0.6 * Math.max(1, span / 6);
      const bb = e.group.userData.bbox; p.position.set(e.group.position.x, (bb ? bb.max.y : 0.6) + 0.15, e.group.position.z);
      p.scale.set(sc, sc / 4, 1); p.visible = true; p.userData.life = 0; p.userData.y0 = p.position.y; p.material.opacity = 1;
    }
  }
  updatePopups(dt) {
    if (!this.popups) return;
    const span = Math.max(this.def.w, this.def.d);
    for (const p of this.popups) { if (!p.visible) continue; p.userData.life += dt; p.position.y = p.userData.y0 + p.userData.life * 0.35 * Math.max(1, span / 12); p.material.opacity = Math.max(0, 1 - p.userData.life / 1.6); if (p.userData.life > 1.6) p.visible = false; }
  }

  // ---------- Solarfeld neben dem Gebäude ----------
  updateSolar() {
    const kwp = this.game.s.fac[this.facId]?.solar || 0;
    if (this.solarKwp === kwp && this.solarFacId === this.facId) return;
    this.solarKwp = kwp; this.solarFacId = this.facId;
    if (this.solarMesh) { this.scene.remove(this.solarMesh); this.solarMesh = null; }
    if (!kwp) return;
    const n = Math.min(600, Math.round(kwp / 0.4));
    if (!this.panelGeo) {
      const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
      g.fillStyle = '#14254a'; g.fillRect(0, 0, 64, 128); g.strokeStyle = '#6f87b8'; g.lineWidth = 1.5;
      for (let x = 0; x <= 64; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
      for (let y = 0; y <= 128; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      this.panelMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.25, metalness: 0.4 });
      this.panelGeo = new THREE.BoxGeometry(1.0, 0.04, 1.65);
    }
    const im = new THREE.InstancedMesh(this.panelGeo, this.panelMat, n); im.castShadow = true;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5, 0, 0)), sc = new THREE.Vector3(1, 1, 1);
    const perRow = Math.max(4, Math.floor((this.def.d + 4) / 1.15));
    for (let i = 0; i < n; i++) { const row = Math.floor(i / perRow), col = i % perRow; m4.compose(new THREE.Vector3(this.def.w + 3 + row * 2.6, 0.75, -1 + col * 1.15), q, sc); im.setMatrixAt(i, m4); }
    im.rotation.y = 0; this.solarMesh = im; this.scene.add(im);
  }

  // ---------- Wetter: Schnee & Polarlicht ----------
  buildWeather() {
    if (this.weather) { this.scene.remove(this.weather); this.weather = null; }
    const def = this.def, g = (this.weather = new THREE.Group()); this.scene.add(g);
    const span = Math.max(def.w, def.d) + 40, n = def.style === 'fjord' ? 5000 : 1800;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      let x, z; do { x = def.w / 2 + (Math.random() - 0.5) * span * 1.6; z = def.d / 2 + (Math.random() - 0.5) * span * 1.6; } while (x > -1 && x < def.w + 1 && z > -1 && z < def.d + 1);
      pos[i * 3] = x; pos[i * 3 + 1] = Math.random() * 30; pos[i * 3 + 2] = z;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const c = document.createElement('canvas'); c.width = c.height = 32; const cx = c.getContext('2d'); const gr = cx.createRadialGradient(16, 16, 1, 16, 16, 15); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 32, 32);
    this.snow = new THREE.Points(geo, new THREE.PointsMaterial({ size: def.style === 'fjord' ? 0.35 : 0.12, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.9 }));
    g.add(this.snow);
    if (def.style === 'fjord') {
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: { t: { value: 0 }, k: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `varying vec2 vUv; uniform float t; uniform float k;
          void main(){
            float x = vUv.x * 6.0;
            float band = sin(x * 1.3 + t * 0.25) * 0.12 + sin(x * 3.1 - t * 0.4) * 0.05 + 0.45;
            float d = abs(vUv.y - band);
            float a = (1.0 - smoothstep(0.0, 0.28, d)) * (0.55 + 0.45 * sin(x * 7.0 + t * 0.8));
            a *= smoothstep(0.0, 0.15, vUv.x) * (1.0 - smoothstep(0.85, 1.0, vUv.x));
            vec3 col = mix(vec3(0.1, 1.0, 0.55), vec3(0.6, 0.3, 1.0), smoothstep(band, band + 0.3, vUv.y));
            gl_FragColor = vec4(col * a * k, a * k);
          }`,
      });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(1100, 220, 1, 1), mat); pl.position.set(def.w / 2, 150, -600); pl.rotation.x = 0.2; pl.frustumCulled = false;
      g.add(pl); this.aurora = mat;
    } else this.aurora = null;
  }
  updateWeather(dt) {
    if (!this.weather) return;
    const d = new Date(this.game.s.day * 86400000), m = d.getUTCMonth();
    const fj = this.def.style === 'fjord';
    const winter = fj ? (m >= 9 || m <= 3) : (m === 11 || m <= 1);
    const snowing = winter && !this.empire && (fj || Math.sin(this.game.s.day * 0.7) > 0.1);
    this.snow.visible = snowing;
    if (snowing) {
      const p = this.snow.geometry.attributes.position, arr = p.array;
      for (let i = 0; i < arr.length; i += 3) { arr[i + 1] -= dt * (1.2 + (i % 7) * 0.1); if (arr[i + 1] < 0) arr[i + 1] = 30; }
      this.snow.position.x = Math.sin(this.t * 0.3) * 0.4;
      p.needsUpdate = true;
    }
    if (this.aurora) { const hour = this.game.s.frac * 24; const night = hour > 19.5 || hour < 5 ? 1 : hour > 18.5 ? hour - 18.5 : hour < 6 ? 6 - hour : 0; this.aurora.uniforms.t.value = this.t; this.aurora.uniforms.k.value = night * (this.empire ? 0 : 1); }
  }

  // ---------- Wärmebild (wie die Overlays im Vorbild) ----------
  heatTex(hot) {
    const k = hot ? 'hotTex' : 'coldTex'; if (this[k]) return this[k];
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    if (hot) { gr.addColorStop(0, 'rgba(255,40,0,0.85)'); gr.addColorStop(0.45, 'rgba(255,170,0,0.45)'); gr.addColorStop(1, 'rgba(255,220,0,0)'); }
    else { gr.addColorStop(0, 'rgba(40,160,255,0.8)'); gr.addColorStop(1, 'rgba(40,160,255,0)'); }
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return (this[k] = new THREE.CanvasTexture(c));
  }
  toggleHeat(on = !this.heatMode) { this.heatMode = on; this.updateHeat(); return on; }
  updateHeat() {
    if (this.heatGroup) { this.scene.remove(this.heatGroup); this.heatGroup = null; }
    if (!this.heatMode || this.empire) return;
    const sm = this.game.summary[this.facId]; if (!sm) return;
    const g = (this.heatGroup = new THREE.Group()); this.scene.add(g);
    const hot = new THREE.MeshBasicMaterial({ map: this.heatTex(true), transparent: true, depthWrite: false, toneMapped: false });
    const cold = new THREE.MeshBasicMaterial({ map: this.heatTex(false), transparent: true, depthWrite: false, toneMapped: false, opacity: 0.8 });
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    for (const [uid, e] of this.entries) {
      const a = sm.per.get(uid); if (!a) continue;
      const def = PLACEABLE[e.obj.type];
      if (def.kind === 'cooling') { const r = Math.min(8, Math.sqrt(def.cool) / 22); const m = new THREE.Mesh(geo, cold); m.scale.set(r * 2, 1, r * 2); m.position.set(e.obj.x, 0.02, e.obj.z); g.add(m); continue; }
      if (a.heat <= 0) continue;
      const r = Math.min(10, Math.max(0.35, Math.sqrt(a.heat) / 28)) * (0.7 + Math.min(1, Math.max(0, (sm.temp - 25) / 20)) * 0.6);
      const m = new THREE.Mesh(geo, hot); m.scale.set(r * 2, 1, r * 2); m.position.set(e.obj.x, 0.025, e.obj.z); g.add(m);
    }
  }

  // ---------- Imperium-Ansicht: alle Standorte nebeneinander ----------
  showEmpire() {
    if (this.empire) return;
    this.cancelPlacement(); this.select(null); this.onHover?.(null);
    if (this.heatGroup) { this.scene.remove(this.heatGroup); this.heatGroup = null; }
    const vis = [this.room.root, this.outside, this.objGroup, this.people, this.solarMesh].filter(Boolean);
    vis.forEach((o) => (o.visible = false)); this.roomLights.forEach((l) => (l.visible = false));
    const g = (this.empire = new THREE.Group()); this.scene.add(g); this.empireHidden = vis;
    let x = 0; const ids = this.game.s.unlocked.slice().sort((a, b) => FACILITY[a].tier - FACILITY[b].tier);
    let maxD = 0;
    for (const id of ids) {
      const def = FACILITY[id]; const room = buildRoom(def);
      for (const wl of room.walls) wl.group.visible = wl.name === 'back' || wl.name === 'left';
      room.root.position.set(x, 0, -def.d / 2); g.add(room.root);
      for (const o of this.game.facObjects(id)) { const m = objectModel(o); m.position.set(x + o.x, 0, -def.d / 2 + o.z); m.rotation.y = -o.rot * Math.PI / 2; g.add(m); }
      // Schild
      const c = document.createElement('canvas'); c.width = 512; c.height = 128; const cx = c.getContext('2d');
      cx.fillStyle = 'rgba(14,17,23,0.85)'; cx.fillRect(0, 0, 512, 128); cx.fillStyle = '#ffb000'; cx.font = 'bold 54px Arial'; cx.textAlign = 'center'; cx.fillText(def.name, 256, 62);
      const sm = this.game.summary[id]; cx.fillStyle = '#e8edf4'; cx.font = '30px Arial'; cx.fillText(`${def.w}×${def.d} m · ${sm ? (sm.watt / 1000).toFixed(sm.watt < 1e4 ? 2 : 0) : 0} kW`, 256, 106);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false })); const sc = Math.max(5, def.w * 0.3);
      sp.scale.set(sc, sc / 4, 1); sp.position.set(x + def.w / 2, def.h + sc * 0.25 + 1, -def.d / 2 - 0.5); sp.renderOrder = 20; g.add(sp);
      x += def.w + Math.max(3, def.w * 0.25); maxD = Math.max(maxD, def.d);
    }
    const total = x;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(total + 200, maxD + 200), mat('empireGround', { color: 0x4f7a3c, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(total / 2, -0.12, 0); ground.receiveShadow = true; g.add(ground);
    this.empireDef = { w: total, d: maxD, h: 10, tier: 9, grid: 1 };
    const sc2 = this.sun.shadow.camera; const sz = total * 0.6 + 10; sc2.left = -sz; sc2.right = sz; sc2.top = sz; sc2.bottom = -sz; sc2.far = sz * 6; sc2.updateProjectionMatrix();
    this.savedCamE = { pos: this.camera.position.clone(), target: this.controls.target.clone(), def: this.def };
    this.def = { ...this.def, w: total, d: maxD, style: 'empire' };
    this.controls.maxDistance = total * 2 + 40; this.controls.minDistance = 2;
    this.controls.target.set(total / 2, 0, 0);
    const end = new THREE.Vector3(total / 2 + total * 0.08, total * 0.42 + 8, total * 0.62 + 10);
    const start = new THREE.Vector3(2.5, 3.2, 4.5);
    this.camera.position.copy(start); this.camera.near = 0.2; this.camera.updateProjectionMatrix();
    this.transition = { from: start, to: end, t: 0, dur: 4.5 };
    this.onEmpire?.(true);
  }
  hideEmpire() {
    if (!this.empire) return;
    this.scene.remove(this.empire); this.empire = null;
    this.empireHidden.forEach((o) => (o.visible = true)); this.roomLights.forEach((l) => (l.visible = true));
    this.loadFacility(this.facId);
    this.onEmpire?.(false);
  }

  // ---------- Personal (NPCs) ----------
  makePerson(vest = 0xff8a00, hat = true, skin = 0xe0b394) {
    const g = new THREE.Group();
    const mk = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    const pants = mat('npcPants', { color: 0x2b3446, roughness: 0.9 }), skinM = mat('npcSkin' + skin, { color: skin, roughness: 0.8 }), vestM = mat('npcVest' + vest, { color: vest, roughness: 0.6, emissive: vest, emissiveIntensity: 0.08 });
    const legG = new THREE.BoxGeometry(0.12, 0.8, 0.14); legG.translate(0, -0.4, 0);
    const armG = new THREE.BoxGeometry(0.09, 0.62, 0.1); armG.translate(0, -0.31, 0);
    const legL = mk(legG, pants, -0.08, 0.82, 0), legR = mk(legG, pants, 0.08, 0.82, 0);
    mk(new THREE.BoxGeometry(0.36, 0.56, 0.22), vestM, 0, 1.1, 0);
    mk(new THREE.BoxGeometry(0.37, 0.05, 0.23), mat('npcStripe', { color: 0xdddddd, emissive: 0xffffff, emissiveIntensity: 0.3 }), 0, 1.05, 0);
    const armL = mk(armG, vestM, -0.24, 1.36, 0), armR = mk(armG, vestM, 0.24, 1.36, 0);
    mk(new THREE.SphereGeometry(0.12, 14, 10), skinM, 0, 1.52, 0);
    if (hat) { const h = mk(new THREE.SphereGeometry(0.135, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('npcHat', { color: 0xffd400, roughness: 0.4 }), 0, 1.55, 0); }
    else mk(new THREE.BoxGeometry(0.25, 0.08, 0.25), mat('npcHair', { color: 0x2a1a10, roughness: 0.9 }), 0, 1.63, -0.01);
    g.userData = { legL, legR, armL, armR, phase: Math.random() * 6, target: null, wait: 0, speed: 1.1 + Math.random() * 0.4 };
    return g;
  }
  syncPeople() {
    const s = this.game.s;
    if (!this.people) { this.people = new THREE.Group(); this.scene.add(this.people); }
    const tier = this.def.tier;
    let want = 0;
    if (tier >= 2 && s.flags.gmbh) want = 1;
    if (tier >= 3) want += Math.min(7, s.staff.tech);
    if (tier === 2 && s.flags.debt) want = Math.max(want, 1);
    if (tier === 0 && !this.people.userData.me) {
      const me = this.makePerson(0x3a6ea5, false, 0xe8c0a0); me.userData.static = true;
      me.userData.legL.rotation.x = me.userData.legR.rotation.x = -1.45; me.userData.armL.rotation.x = me.userData.armR.rotation.x = -1.1;
      me.position.set(2.75, -0.36, 0.72); me.rotation.y = Math.PI; this.scene.add(me); this.people.userData.me = me; this.people.add(me);
    }
    // Familie: Papa in der Werkstatt, Opa im Keller (nach dem Starkstrom)
    const fam = [];
    if (tier === 2) fam.push(['papa', 0x7a5230, 0xd9a983, 1.4, 0.95, Math.PI]);
    if (tier === 1 && (s.fac.keller?.power || 0) > 0) fam.push(['opa', 0x5b6b4a, 0xe2b896, 4.2, 0.75, Math.PI]);
    for (const [key, vest, skin, x, z, ry] of fam) {
      if (this.people.userData[key]) continue;
      const p = this.makePerson(vest, false, skin); p.userData.static = true; p.userData.work = true;
      p.position.set(x, 0, z); p.rotation.y = ry; this.people.userData[key] = p; this.people.add(p);
      p.children.filter((c) => c.geometry?.type === 'BoxGeometry' && Math.abs(c.position.y - 1.63) < 0.01).forEach((h) => (h.material = mat('npcGrayHair', { color: 0xbfbfbf, roughness: 0.9 })));
    }
    want += fam.length;
    if (this.people.userData.me) want += 1;
    while (this.people.children.length > want) { const ch = this.people.children; let i = ch.length - 1; while (i >= 0 && ch[i].userData.static) i--; if (i < 0) break; this.people.remove(ch[i]); }
    while (this.people.children.length < want) {
      const first = !this.people.children.some((c) => !c.userData.static);
      const p = first ? this.makePerson(0x2e6fd6, false, 0xc89a72) : this.makePerson(0xff8a00, tier >= 3);
      const pt = this.randomFloorPoint(); p.position.set(pt.x, 0, pt.z); this.people.add(p);
    }
  }
  randomFloorPoint() {
    for (let i = 0; i < 30; i++) {
      const x = 0.5 + Math.random() * (this.def.w - 1), z = 0.5 + Math.random() * (this.def.d - 1);
      const r = { x0: x - 0.3, x1: x + 0.3, z0: z - 0.3, z1: z + 0.3 };
      const hit = (a) => a.x0 < r.x1 && a.x1 > r.x0 && a.z0 < r.z1 && a.z1 > r.z0;
      if (this.room.blocked.some(hit)) continue;
      if (this.game.facObjects(this.facId).some((o) => hit(this.rectOf(o)))) continue;
      return new THREE.Vector3(x, 0, z);
    }
    return new THREE.Vector3(this.def.w / 2, 0, this.def.d / 2);
  }
  updatePeople(dt) {
    if (!this.people) return;
    const paused = !this.game.s.speed;
    for (const p of this.people.children) {
      const u = p.userData;
      if (u.static && u.work) { u.armR.rotation.x = -0.9 + Math.sin(this.t * 3) * 0.25; u.armL.rotation.x = -0.7 + Math.cos(this.t * 2.3) * 0.1; continue; }
      if (u.static) { u.armR.rotation.x = -1.1 + Math.sin(this.t * 9) * 0.04; u.armL.rotation.x = -1.1 + Math.cos(this.t * 8) * 0.04; continue; }
      if (!u.target || u.wait > 0) {
        u.wait -= dt; if (u.wait <= 0 && !u.target) u.target = this.randomFloorPoint();
        const k = Math.sin(this.t * 2 + u.phase) * 0.05; u.armR.rotation.x = -0.6 + k; u.armL.rotation.x = k; u.legL.rotation.x = u.legR.rotation.x = 0;
        if (!u.target) continue;
        if (u.wait > 0) continue;
      }
      if (paused) continue;
      const d = tmpV.subVectors(u.target, p.position); d.y = 0; const dist = d.length();
      if (dist < 0.1) { u.target = null; u.wait = 1.5 + Math.random() * 4; continue; }
      d.normalize(); p.position.addScaledVector(d, Math.min(dist, u.speed * dt));
      p.rotation.y = Math.atan2(d.x, d.z);
      u.phase += dt * u.speed * 6; const sw = Math.sin(u.phase) * 0.55;
      u.legL.rotation.x = sw; u.legR.rotation.x = -sw; u.armL.rotation.x = -sw * 0.8; u.armR.rotation.x = sw * 0.8;
    }
  }
  // ---------- Rauch für defekte Geräte ----------
  updateSmoke(dt) {
    if (!this.smoke) {
      this.smoke = []; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(80,80,80,0.9)'); gr.addColorStop(1, 'rgba(80,80,80,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      this.smokeTex = new THREE.CanvasTexture(c);
    }
    for (const e of this.entries.values()) {
      if (e.sprite.visible && e.sprite.material.map === this.icons.broken && Math.random() < dt * 3 && this.smoke.length < 60) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.smokeTex, transparent: true, depthWrite: false, opacity: 0.7 }));
        const bb = e.group.userData.bbox; sp.position.set(e.group.position.x + (Math.random() - 0.5) * 0.2, (bb ? bb.max.y : 0.5) * 0.8, e.group.position.z + (Math.random() - 0.5) * 0.2);
        sp.scale.setScalar(0.15); sp.userData.life = 0; this.scene.add(sp); this.smoke.push(sp);
      }
    }
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const sp = this.smoke[i]; sp.userData.life += dt;
      sp.position.y += dt * 0.35; sp.scale.setScalar(0.15 + sp.userData.life * 0.35); sp.material.opacity = Math.max(0, 0.7 - sp.userData.life * 0.35);
      if (sp.userData.life > 2) { this.scene.remove(sp); sp.material.dispose(); this.smoke.splice(i, 1); }
    }
  }

  // ---------- Pro Frame ----------
  update() {
    const dt = Math.min(0.05, this.clock.getDelta()); this.t += dt;
    const s = this.game.s;
    // Kamera
    if (this.focusAnim) {
      const f = this.focusAnim; f.t = Math.min(1, f.t + dt / 0.6); const k = 1 - Math.pow(1 - f.t, 3);
      this.controls.target.lerpVectors(f.fromT, f.toT, k); this.camera.position.lerpVectors(f.fromP, f.toP, k);
      if (f.t >= 1) this.focusAnim = null;
    }
    if (this.transition) {
      const tr = this.transition; if (!tr.hold) tr.t += dt / tr.dur; const k = tr.t >= 1 ? 1 : 1 - Math.pow(1 - tr.t, 3);
      this.camera.position.lerpVectors(tr.from, tr.to, k); if (tr.t >= 1) this.transition = null;
    }
    if (this.fpActive) {
      const sp = (this.keys.Shift ? 6 : 3) * dt * (this.def.tier >= 3 ? 2.5 : 1);
      if (this.keys.w) this.fp.moveForward(sp); if (this.keys.s) this.fp.moveForward(-sp);
      if (this.keys.d) this.fp.moveRight(sp); if (this.keys.a) this.fp.moveRight(-sp);
      const p = this.camera.position; p.x = Math.min(Math.max(p.x, 0.25), this.def.w - 0.25); p.z = Math.min(Math.max(p.z, 0.25), this.def.d - 0.25);
    } else {
      const k = this.keys; const span = Math.max(this.def.w, this.def.d);
      const pan = (k.w || k.ArrowUp ? 1 : 0) - (k.s || k.ArrowDown ? 1 : 0), side = (k.d || k.ArrowRight ? 1 : 0) - (k.a || k.ArrowLeft ? 1 : 0);
      if (pan || side) {
        const dist = this.camera.position.distanceTo(this.controls.target);
        const fwd = new THREE.Vector3().subVectors(this.controls.target, this.camera.position); fwd.y = 0; fwd.normalize();
        const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
        const mv = fwd.multiplyScalar(pan).add(right.multiplyScalar(side)).multiplyScalar(dist * 0.9 * dt);
        this.controls.target.add(mv); this.camera.position.add(mv);
      }
      if (k.q || k.e) { const ang = (k.q ? 1 : -1) * dt * 1.2; const off = new THREE.Vector3().subVectors(this.camera.position, this.controls.target); off.applyAxisAngle(new THREE.Vector3(0, 1, 0), ang); this.camera.position.copy(this.controls.target).add(off); }
      const t = this.controls.target; t.x = Math.min(Math.max(t.x, -2), this.def.w + 2); t.z = Math.min(Math.max(t.z, -2), this.def.d + 2); t.y = 0;
      if (!this.transition) this.controls.update();
      // Wände zur Kamera ausblenden
      const cp = this.camera.position;
      if (!this.empire) for (const wl of this.room.walls) {
        const n = wl.outward; let outside;
        if (n.z < 0) outside = cp.z < 0; else if (n.z > 0) outside = cp.z > this.def.d; else if (n.x < 0) outside = cp.x < 0; else outside = cp.x > this.def.w;
        wl.group.visible = !outside || cp.y < 0;
      }
    }
    // Tag/Nacht
    this.updateDaylight(s.frac);
    this.updatePeople(dt); this.updateSmoke(dt); this.updateWeather(dt); this.updatePopups(dt);
    // Lüfter & LEDs
    const fanSpeed = 28 * dt;
    for (const e of this.entries.values()) {
      if (!e.group.userData.fans.length) continue;
      const def = PLACEABLE[e.obj.type];
      if (e.running && !this.game.s.paused) { const spd = def.kind === 'cooling' ? fanSpeed * 0.5 : fanSpeed; for (const f of e.group.userData.fans) f.rotateZ(spd); }
    }
    const blink = (Math.sin(this.t * 7) > 0.2) ? 3.5 : 0.6, blink2 = (Math.sin(this.t * 5.3 + 1) > -0.3) ? 3 : 0.4;
    M.ledGreen().emissiveIntensity = blink; M.ledGreen2().emissiveIntensity = blink2; M.ledAmber().emissiveIntensity = blink2 * 0.9;
    M.rgb().emissive.setHSL((this.t * 0.08) % 1, 1, 0.5);
    // Rendern
    if (this.quality === 'low') this.renderer.render(this.scene, this.camera); else this.composer.render();
  }

  updateDaylight(frac) {
    const hour = frac * 24;
    const elev = Math.sin(((hour - 6.5) / 13) * Math.PI); // >0 tagsüber
    const day = Math.max(0, elev);
    const def = this.def, span = Math.max(def.w, def.d);
    const az = ((hour - 6) / 12) * Math.PI;
    this.sun.position.set(def.w / 2 + Math.cos(az) * span * 1.5, Math.max(0.15, elev) * span * 2 + 2, def.d / 2 - Math.sin(az) * span * 0.8 - span);
    this.sun.target.position.set(def.w / 2, 0, def.d / 2);
    this.sun.intensity = 0.12 + day * 1.7;
    const warm = Math.max(0, 1 - Math.abs(elev) * 3);
    this.sun.color.setRGB(1, 0.92 - warm * 0.25, 0.85 - warm * 0.4);
    this.hemi.intensity = 0.05 + day * 0.55; this.fill.intensity = 0.04 + day * 0.08;
    if (day <= 0) this.sun.color.setRGB(0.55, 0.65, 1.0);
    const night = new THREE.Color(0x0b1226), dayc = new THREE.Color(def.style === 'fjord' ? 0x9cc2e6 : 0x8fbbe8), dusk = new THREE.Color(0xe7925a);
    const sky = night.clone().lerp(dayc, Math.min(1, day * 1.6)); sky.lerp(dusk, warm * 0.45 * (elev > -0.3 ? 1 : 0));
    this.scene.background = sky; if (this.scene.fog) this.scene.fog.color.copy(sky);
    this.scene.environmentIntensity = 0.07 + day * 0.4;
    const lampK = 0.75 + (1 - day) * 0.6;
    this.renderer.toneMappingExposure = 0.92 + (1 - day) * 0.25;
    this.roomLights?.forEach((l, i) => (l.intensity = this.room.lights[i].intensity * lampK));
  }

  // Großer Bildschirm im Rechenzentrum
  drawScreens() {
    if (!this.room) return;
    for (const sc of this.room.screens) {
      const g = sc.canvas.getContext('2d'), W = sc.canvas.width, H = sc.canvas.height;
      if (sc.kind === 'pc') {
        // Mining-Konsole auf dem Monitor im Kinderzimmer – mit echten Werten
        const s = this.game.s, sm = this.game.summary[this.facId];
        g.fillStyle = '#020a02'; g.fillRect(0, 0, W, H); g.font = 'bold 26px monospace'; g.fillStyle = '#7f7';
        g.fillText('miner v2.' + (s.day % 7) + ' – ' + fmtDate(s.day), 14, 34);
        g.font = '21px monospace';
        const lines = [];
        let i = 0;
        for (const o of this.game.facObjects(this.facId)) { const a = sm?.per.get(o.uid); if (!a || !a.units.length) continue; const u = a.units[0]; lines.push(`RIG${i++}: ${u.h ? fmtHash(u.h, u.algo) : 'idle'} ${u.coin || ''}`); if (lines.length >= 4) break; }
        lines.push(`BTC ${fmtUSD(this.game.price('BTC'))}  T ${sm ? sm.temp.toFixed(1) : '--'}C`);
        lines.push(`> ${Math.floor(this.t * 2) % 2 ? '_' : ' '}`);
        lines.forEach((l, k) => g.fillText(l, 14, 76 + k * 34));
        sc.tex.needsUpdate = true; continue;
      }
      const s = this.game.s; g.fillStyle = '#04101c'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#7fe3ff'; g.font = 'bold 54px Arial'; g.fillText('HASHWERK · NOC', 40, 80);
      g.font = '34px monospace'; g.fillStyle = '#cfe';
      const btcH = this.game.algoHash('sha256');
      const lines = [`Datum        ${fmtDate(s.day)}`, `Hashrate     ${fmtHash(btcH)}`, `BTC-Kurs     ${fmtUSD(this.game.price('BTC'))}`, `Netzanteil   ${(btcH / this.game.netHash('BTC') * 100).toFixed(4)} %`, `Vermögen     ${fmtUSD(this.game.netWorth())}`];
      lines.forEach((l, i) => g.fillText(l, 40, 160 + i * 62));
      const hist = s.stats.history.slice(-120); if (hist.length > 2) { const mx = Math.max(...hist.map((x) => x.n)) || 1; g.strokeStyle = '#38f39a'; g.lineWidth = 4; g.beginPath(); hist.forEach((p, i) => { const x = 620 + (i / (hist.length - 1)) * 370, y = 460 - (p.n / mx) * 300; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
      sc.tex.needsUpdate = true;
    }
  }
}
