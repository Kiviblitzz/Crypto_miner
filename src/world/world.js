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
import { M } from './materials.js';
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
    this.icons = { broken: iconTexture('🔥', '#d33'), warn: iconTexture('⚠️', '#e9a400'), power: iconTexture('⚡', '#444'), empty: iconTexture('➕', '#2b6cd6') };
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
    this.cancelPlacement(); this.select(null);
    if (this.room) { this.scene.remove(this.room.root); this.scene.remove(this.outside); for (const l of this.roomLights) this.scene.remove(l); }
    for (const e of this.entries.values()) this.objGroup.remove(e.group);
    this.entries.clear();
    const def = this.def = FACILITY[id]; this.facId = id;
    this.room = buildRoom(def); this.scene.add(this.room.root);
    this.outside = buildOutside(this.room.outside, def); this.scene.add(this.outside);
    this.roomLights = this.room.lights.map((L) => { const p = new THREE.PointLight(L.color, L.intensity, L.dist, 1.6); p.position.set(...L.pos); this.scene.add(p); return p; });
    if (this.gridHelper) this.scene.remove(this.gridHelper);
    this.gridHelper = new THREE.GridHelper(Math.max(def.w, def.d), Math.max(def.w, def.d) / def.grid, 0x6ad1ff, 0x6ad1ff);
    this.gridHelper.material.transparent = true; this.gridHelper.material.opacity = 0.18; this.gridHelper.position.set(Math.max(def.w, def.d) / 2, 0.006, Math.max(def.w, def.d) / 2);
    this.gridHelper.visible = false; this.scene.add(this.gridHelper);
    // Schatten-Kamera an Raumgröße anpassen
    const s = Math.max(def.w, def.d) * 0.75 + 2;
    const sc = this.sun.shadow.camera; sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.near = 0.5; sc.far = s * 6; sc.updateProjectionMatrix();
    // Kamera
    const span = Math.max(def.w, def.d);
    this.controls.target.set(def.w / 2, 0, def.d / 2);
    this.controls.minDistance = Math.max(1.2, span * 0.15); this.controls.maxDistance = span * 2.6 + 6;
    const dist = span * 1.15 + 2.5;
    const endPos = new THREE.Vector3(def.w / 2 + dist * 0.55, dist * 0.78, def.d / 2 + dist * 0.75);
    if (cinematic) {
      const startPos = new THREE.Vector3(def.w / 2 + 1, 1.4, def.d / 2 + 1.5);
      this.camera.position.copy(startPos);
      this.transition = { from: startPos, to: endPos, t: 0, dur: 3.2 };
    } else this.camera.position.copy(endPos);
    this.camera.near = span > 30 ? 0.2 : 0.05; this.camera.updateProjectionMatrix();
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
    this.updateStatus();
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
      e.running = !sm.tripped && a && a.watt > 0;
      e.sprite.visible = !!icon;
      if (icon) { e.sprite.material.map = this.icons[icon]; const bb = e.group.userData.bbox; e.sprite.position.set(0, (bb ? bb.max.y : 1) + 0.25 * Math.max(1, span / 12), 0); e.sprite.scale.set(sc, sc, sc); }
    }
    if (this.selected) this.refreshSelBox();
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
      this.select(this.pick());
    });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      this.keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true;
      if (e.key === 'r' || e.key === 'R') { if (this.placing) { this.placing.rot = (this.placing.rot + 1) % 4; this.updatePlacement(); } }
      if (e.key === 'Escape') { if (this.placing) this.cancelPlacement(); else this.select(null); }
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
    const uid = this.pick();
    this.canvas.style.cursor = uid ? 'pointer' : 'default';
  }

  // ---------- Rundgang ----------
  enterFP() {
    if (this.fpActive) return;
    this.cancelPlacement(); this.select(null);
    this.savedCam = { pos: this.camera.position.clone(), target: this.controls.target.clone() };
    this.fpActive = true; this.controls.enabled = false;
    const eye = this.def.tier === 0 ? 1.55 : 1.7;
    this.camera.position.set(this.def.w / 2, eye, this.def.d * 0.75); this.camera.lookAt(this.def.w / 2, eye, 0);
    for (const wl of this.room.walls) wl.group.visible = true; this.room.ceil.visible = this.def.tier < 3;
    this.fp.lock();
    this.onFP?.(true);
  }
  exitFP() {
    if (!this.fpActive) return;
    this.fpActive = false; this.controls.enabled = true; this.room.ceil.visible = false;
    this.camera.position.copy(this.savedCam.pos); this.controls.target.copy(this.savedCam.target); this.camera.lookAt(this.controls.target);
    this.onFP?.(false);
  }
  fpClick() { const uid = this.pick(true); if (uid) { this.fp.unlock(); this.select(uid); } }

  // ---------- Pro Frame ----------
  update() {
    const dt = Math.min(0.05, this.clock.getDelta()); this.t += dt;
    const s = this.game.s;
    // Kamera
    if (this.transition) {
      const tr = this.transition; tr.t += dt / tr.dur; const k = tr.t >= 1 ? 1 : 1 - Math.pow(1 - tr.t, 3);
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
      for (const wl of this.room.walls) {
        const n = wl.outward; let outside;
        if (n.z < 0) outside = cp.z < 0; else if (n.z > 0) outside = cp.z > this.def.d; else if (n.x < 0) outside = cp.x < 0; else outside = cp.x > this.def.w;
        wl.group.visible = !outside || cp.y < 0;
      }
    }
    // Tag/Nacht
    this.updateDaylight(s.frac);
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
    this.sun.intensity = 0.1 + day * 1.7;
    const warm = Math.max(0, 1 - Math.abs(elev) * 3);
    this.sun.color.setRGB(1, 0.92 - warm * 0.25, 0.85 - warm * 0.4);
    this.hemi.intensity = 0.18 + day * 0.42;
    const night = new THREE.Color(0x0b1226), dayc = new THREE.Color(def.style === 'fjord' ? 0x9cc2e6 : 0x8fbbe8), dusk = new THREE.Color(0xe7925a);
    const sky = night.clone().lerp(dayc, Math.min(1, day * 1.6)); sky.lerp(dusk, warm * 0.45 * (elev > -0.3 ? 1 : 0));
    this.scene.background = sky; if (this.scene.fog) this.scene.fog.color.copy(sky);
    this.scene.environmentIntensity = 0.25 + day * 0.3;
    const lampK = 0.55 + (1 - day) * 0.6;
    this.roomLights?.forEach((l, i) => (l.intensity = this.room.lights[i].intensity * lampK));
  }

  // Großer Bildschirm im Rechenzentrum
  drawScreens() {
    if (!this.room) return;
    for (const sc of this.room.screens) {
      const g = sc.canvas.getContext('2d'), W = sc.canvas.width, H = sc.canvas.height;
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
