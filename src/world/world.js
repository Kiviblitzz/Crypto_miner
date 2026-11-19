// 3D-Welt in Ego-Perspektive: Renderer, Spieler, Standorte, Interaktion per Fadenkreuz, Bauen, Tag/Nacht, Karte
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Player } from './player.js';
import { ViewModel } from './viewmodel.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Farbgebung: leichte Wärme, etwas Sättigung, weiche Vignette (läuft nach dem Tonemapping)
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, vignette: { value: 0.2 }, sat: { value: 0.98 }, warm: { value: 0.0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; uniform float vignette; uniform float sat; uniform float warm; varying vec2 vUv;\n' +
    'void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)); c.rgb = mix(vec3(l), c.rgb, sat);\n' +
    ' c.rgb += vec3(-0.012, 0.0, 0.016) * (1.0 - smoothstep(0.0, 0.45, l)); c.rgb = mix(c.rgb, c.rgb * vec3(1.035, 1.0, 0.95), smoothstep(0.35, 1.0, l)); c.rgb = mix(c.rgb, c.rgb * c.rgb * (3.0 - 2.0 * c.rgb), 0.22);\n' +
    ' vec2 d = (vUv - 0.5) * vec2(1.0, 0.82); float v = smoothstep(0.78, 0.22, length(d));\n' +
    ' c.rgb *= mix(1.0 - vignette, 1.0, v); gl_FragColor = c; }',
};
import { buildRoom, buildOutside } from './rooms.js';
import { objectModel, rigPartModel, loosePartModel } from './models.js';
import { nightMats, nightGround } from './rooms.js';
const NIGHT_GRASS = new THREE.Color(0x1d2a1f), NIGHT_FACADE = new THREE.Color(0x4a5068);
import { M, mat } from './materials.js';
import { FACILITY } from '../data/world.js';
import { PLACEABLE, PART } from '../data/hardware.js';
import { fmtHash, fmtUSD, fmtDate, fmtCoin } from '../sim/game.js';

const tmpV = new THREE.Vector3();

// Status-Symbole: gezeichnete Abzeichen (keine Betriebssystem-Emoji)
function iconTexture(kind, ring) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 16; g.shadowOffsetY = 4;
  g.fillStyle = ring; g.beginPath(); g.arc(S / 2, S / 2, 84, 0, Math.PI * 2); g.fill();
  g.shadowColor = 'transparent'; g.lineWidth = 10; g.strokeStyle = 'rgba(42,22,6,0.85)'; g.stroke();
  g.fillStyle = '#fff8ec'; g.strokeStyle = 'rgba(42,22,6,0.85)'; g.lineWidth = 8; g.lineJoin = 'round'; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (kind === 'power') { g.beginPath(); g.moveTo(140, 62); g.lineTo(96, 136); g.lineTo(126, 136); g.lineTo(112, 196); g.lineTo(162, 112); g.lineTo(130, 112); g.closePath(); g.stroke(); g.fill(); }
  else { const txt = { broken: '!', warn: '!', empty: '+', sleep: 'Zz' }[kind] || '?'; g.font = (kind === 'sleep' ? '700 86px' : '700 120px') + ' Fredoka, Nunito, Arial'; g.strokeText(txt, S / 2, S / 2 + 6); g.fillText(txt, S / 2, S / 2 + 6); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export class World {
  constructor(canvas, game) {
    this.game = game; this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = 0.98;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(r);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.45;
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.05, 2500);
    // Orbit-Steuerung nur für Titelbild und Karte (Imperium)
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.08;
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    this.controls.maxPolarAngle = 1.42; this.controls.enabled = false;
    // Ego-Spieler
    this.player = new Player(this.camera, canvas);
    this.mode = 'title';
    this.touchMode = window.matchMedia?.('(pointer: coarse)').matches || false;
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === canvas;
      this.player.locked = locked; if (locked) this.player.lockAt = performance.now();
      if (!locked && this.mode === 'play' && !this.expectUnlock) { this.cancelPlacement(); this.onPause?.(); }
      this.expectUnlock = false;
      this.onLockChange?.(locked);
    });
    document.addEventListener('pointerlockerror', () => { this.lockFailed = true; this.onLockChange?.(false); });
    this.doorGroup = new THREE.Group(); this.scene.add(this.doorGroup);
    this.scene.add(this.camera); this.vm = new ViewModel(this.camera);
    this.aim = null;

    // Licht
    this.hemi = new THREE.HemisphereLight(0xfff0dc, 0x6b5440, 0.5); this.scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0x9db4ff, 0); this.scene.add(this.moon); this.scene.add(this.moon.target);
    this.sun = new THREE.DirectionalLight(0xfff1dc, 2.5); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.fill = new THREE.AmbientLight(0xffe6cc, 0.22); this.scene.add(this.fill);
    // Himmelskuppel mit Verlauf und Sonnenscheibe, dazu Sterne
    this.skyU = { top: { value: new THREE.Color(0x6fa3dc) }, horizon: { value: new THREE.Color(0xdfe9f2) }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(0xfff2d0) } };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({ uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vDir; void main(){ float h = clamp(vDir.y, 0.0, 1.0); vec3 c = mix(horizon, top, pow(h, 0.55)); float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0); c += sunCol * (pow(s, 600.0) * 2.0 + pow(s, 12.0) * 0.18); gl_FragColor = vec4(c, 1.0); }' }));
    this.sky.renderOrder = -10; this.scene.add(this.sky);
    { const n = 700, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, y = Math.abs(u) * 0.9 + 0.08, r = Math.sqrt(1 - y * y); pos.set([Math.cos(t) * r * 380, y * 380, Math.sin(t) * r * 380], i * 3); }
      const gs = new THREE.BufferGeometry(); gs.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.stars = new THREE.Points(gs, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false })); this.scene.add(this.stars);
      // Mond: tief am Himmel in Fensterrichtung
      const mc = document.createElement('canvas'); mc.width = mc.height = 128; const mg = mc.getContext('2d');
      const halo = mg.createRadialGradient(64, 64, 18, 64, 64, 64); halo.addColorStop(0, 'rgba(255,244,214,.55)'); halo.addColorStop(1, 'rgba(255,244,214,0)'); mg.fillStyle = halo; mg.fillRect(0, 0, 128, 128);
      const disc = mg.createRadialGradient(56, 56, 4, 64, 64, 26); disc.addColorStop(0, '#fffaf0'); disc.addColorStop(1, '#efe2c4'); mg.fillStyle = disc; mg.beginPath(); mg.arc(64, 64, 26, 0, 7); mg.fill();
      mg.fillStyle = 'rgba(190,170,140,.35)'; for (const [cx, cy, cr] of [[56, 58, 6], [72, 70, 4], [68, 52, 3.5], [54, 74, 3]]) { mg.beginPath(); mg.arc(cx, cy, cr, 0, 7); mg.fill(); }
      const mt = new THREE.CanvasTexture(mc); mt.colorSpace = THREE.SRGBColorSpace;
      this.moonSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mt, transparent: true, opacity: 0, depthWrite: false, fog: false })); this.moonSp.scale.set(30, 30, 1);
      this.moonSp.position.copy(new THREE.Vector3(-0.5, 0.1, -1).normalize().multiplyScalar(360)); this.moonSp.renderOrder = -9; this.stars.add(this.moonSp); }

    // Postprocessing
    // Multisampling im Composer: glatte Kanten trotz Nachbearbeitung (Bloom)
    const rt = new THREE.WebGLRenderTarget(window.innerWidth || 1280, window.innerHeight || 720, { samples: 4, type: THREE.HalfFloatType });
    this.composer = new EffectComposer(r, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // Weiche Kontaktschatten (Umgebungsverdeckung) – nur in kleinen Räumen, in großen Hallen zu teuer
    this.gtao = new GTAOPass(this.scene, this.camera, 1280, 720);
    this.gtao.updateGtaoMaterial({ radius: 0.38, distanceExponent: 1.2, thickness: 1.0, scale: 1.0, samples: 12 });
    this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6 });
    this.gtao.blendIntensity = 0.75;
    { const ov = this.gtao.overrideVisibility.bind(this.gtao); this.gtao.overrideVisibility = () => { ov(); this.scene.traverse((o) => { if (o.visible && (o.isSprite || (o.isMesh && o.material && o.material.transparent && !o.material.depthWrite))) { o.visible = false; (this.gtao._hiddenExtra ||= []).push(o); } }); }; const rv = this.gtao.restoreVisibility.bind(this.gtao); this.gtao.restoreVisibility = () => { rv(); (this.gtao._hiddenExtra || []).forEach((o) => (o.visible = true)); this.gtao._hiddenExtra = []; }; }
    this.composer.addPass(this.gtao);
    // Weiche Kontur um das anvisierte Objekt
    this.outline = new OutlinePass(new THREE.Vector2(1280, 720), this.scene, this.camera);
    Object.assign(this.outline, { edgeStrength: 1.8, edgeGlow: 0, edgeThickness: 1, pulsePeriod: 0 });
    this.outline.visibleEdgeColor.set(0xffdda0); this.outline.hiddenEdgeColor.set(0x4a4030);
    this.composer.addPass(this.outline);
    // Leuchten für herumliegende Teile (nur am Anfang aktiv)
    this.glow = new OutlinePass(new THREE.Vector2(1280, 720), this.scene, this.camera);
    Object.assign(this.glow, { edgeStrength: 2.4, edgeGlow: 0.45, edgeThickness: 1.2, pulsePeriod: 2.6, enabled: false });
    this.glow.visibleEdgeColor.set(0xffb547); this.glow.hiddenEdgeColor.set(0x5a3a10);
    this.composer.addPass(this.glow);
    { const vp = new RenderPass(this.vm.scene, this.camera); vp.clear = false; vp.clearDepth = true; this.composer.addPass(vp); }
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.28, 0.55, 1.1);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader); this.composer.addPass(this.grade);
    this.quality = 'high';

    this.objGroup = new THREE.Group(); this.scene.add(this.objGroup);
    this.entries = new Map(); // uid -> {group, key, sprite}
    this.icons = { broken: iconTexture('broken', '#ff6b5e'), warn: iconTexture('warn', '#ffb000'), power: iconTexture('power', '#a08a74'), empty: iconTexture('empty', '#ffa867'), sleep: iconTexture('sleep', '#b08a62') };
    this.raycaster = new THREE.Raycaster(); this.mouse = new THREE.Vector2(); this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.keys = {}; this.placing = null; this.selected = null; this.hoverUid = null;
    this.selBox = new THREE.Box3Helper(new THREE.Box3(), 0xffffff); this.selBox.material.transparent = true; this.selBox.material.opacity = 0.18; this.selBox.material.depthWrite = false; this.selBox.visible = false; this.scene.add(this.selBox);
    this.ghostOk = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.35, emissive: 0x6fb8ff, emissiveIntensity: 0.25, depthWrite: false });
    this.ghostBad = new THREE.MeshStandardMaterial({ color: 0xff7a72, transparent: true, opacity: 0.38, emissive: 0xff4a40, emissiveIntensity: 0.2, depthWrite: false });
    this.footprint = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.2, depthWrite: false }));
    this.footprint.rotation.x = -Math.PI / 2; this.footprint.visible = false; this.scene.add(this.footprint);
    this.gridHelper = null;
    this.clock = new THREE.Clock(); this.t = 0; this.transition = null;
    this.bindInput();
    window.addEventListener('resize', () => this.resize()); this.resize();
    game.on('objects', (fac) => { if (fac === this.facId) this.syncObjects(); });
    game.on('loose', () => this.syncLoose());
    game.on('update', () => this.spawnIncome());
  }

  setQuality(q) {
    this.quality = q;
    const r = this.renderer;
    r.shadowMap.enabled = q !== 'low';
    r.setPixelRatio(q === 'low' ? 1 : Math.min(window.devicePixelRatio, 1.75));
    this.composer.setPixelRatio(r.getPixelRatio());
    this.bloom.enabled = q === 'high';
    if (this.gtao) this.gtao.enabled = q === 'high' && (this.def?.tier ?? 0) <= 2;
    document.body.classList.toggle('lowfx', q === 'low');
    this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false); this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  // ---------- Standort ----------
  loadFacility(id) {
    this.cancelPlacement(); this.select(null); this.onHover?.(null);
    if (this.room) { this.scene.remove(this.room.root); this.scene.remove(this.outside); for (const l of this.roomLights) this.scene.remove(l); }
    for (const e of this.entries.values()) this.objGroup.remove(e.group);
    this.entries.clear();
    const def = this.def = FACILITY[id]; this.facId = id;
    if (this.gtao) this.gtao.enabled = def.tier <= 2; // in großen Hallen zu teuer
    this.room = buildRoom(def); this.scene.add(this.room.root); this.screensDirty = true; this.syncLoose();
    this.outside = buildOutside(this.room.outside, def); this.scene.add(this.outside);
    this.roomLights = this.room.lights.map((L) => { const p = new THREE.PointLight(L.color, L.intensity, L.dist, 1.6); p.position.set(...L.pos); this.scene.add(p); return p; });
    if (this.gridHelper) this.scene.remove(this.gridHelper);
    const gpts = []; const step = def.w * def.d > 600 ? 1 : def.grid;
    for (let x = 0; x <= def.w + 1e-6; x += step) gpts.push(x, 0, 0, x, 0, def.d);
    for (let z = 0; z <= def.d + 1e-6; z += step) gpts.push(0, 0, z, def.w, 0, z);
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gpts, 3));
    this.gridHelper = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.12 }));
    this.gridHelper.position.y = 0.006;
    this.gridHelper.visible = false; this.scene.add(this.gridHelper);
    // Schatten-Kamera an Raumgröße anpassen
    const s = Math.max(def.w, def.d) * 0.75 + 2;
    const sc = this.sun.shadow.camera; sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.near = 0.5; sc.far = s * 6; sc.updateProjectionMatrix();
    // Spieler an der Tür absetzen, Blick in den Raum
    const span = Math.max(def.w, def.d);
    const sp = this.room.spawn || { x: def.w / 2, z: def.d - 1, look: [def.w / 2, def.d / 2] };
    this.player.setPose(sp.x, sp.z, 0); this.player.lookAtPoint(sp.look[0], sp.look[1]); this.player.apply();
    this.transition = null;
    this.controls.target.set(def.w / 2, 0, def.d / 2);
    this.camera.near = 0.05; this.camera.updateProjectionMatrix();
    // Türen als Interaktionsflächen
    this.doorGroup.clear();
    for (const d of this.room.doors || []) { const m = new THREE.Mesh(new THREE.BoxGeometry(...d.s), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(...d.c); m.userData.door = d; this.doorGroup.add(m); }
    for (const p of this.room.props || []) { const m = new THREE.Mesh(new THREE.BoxGeometry(...p.s), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(...p.c); m.userData.prop = p; this.doorGroup.add(m); }
    // Freien Platz zum Erscheinen suchen (falls dort inzwischen etwas steht)
    if (this.collides(this.player.pos.x, this.player.pos.z, this.player.radius)) {
      outer: for (let r = 0.5; r < span; r += 0.5) for (let a = 0; a < 16; a++) { const x = sp.x + Math.cos(a / 16 * Math.PI * 2) * r, z = sp.z + Math.sin(a / 16 * Math.PI * 2) * r; if (!this.collides(x, z, this.player.radius)) { this.player.pos.set(x, 0, z); break outer; } }
      this.player.apply();
    }
    for (const wl of this.room.walls) wl.group.visible = true;
    this.room.ceil.visible = true;
    if (this.people) { this.scene.remove(this.people); this.people = null; }
    this.popups?.forEach((p) => (p.visible = false));
    if (this.xmas) { this.scene.remove(this.xmas); this.xmas = null; }
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
      if (e && e.key === '__anim' && this.install?.uid === o.uid) { e.obj = o; continue; }
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
    this.updateStatus(); this.syncPeople(); if (this.ghostSpec && !this.ghost?.parent?.parent) this.applyGhost();
  }
  updateStatus() {
    const sm = this.game.summary[this.facId]; if (!sm) return;
    const span = 6; const sc = 0.2;
    for (const [uid, e] of this.entries) {
      const a = sm.per.get(uid); const def = PLACEABLE[e.obj.type];
      let icon = null;
      if (sm.tripped && def.kind !== 'decor') icon = 'power';
      else if (a?.status === 'broken' || a?.status === 'partial') icon = 'broken';
      else if (a?.status === 'incomplete' || a?.status === 'psu') icon = 'warn';
      else if (a?.status === 'empty') icon = 'empty';
      else if (e.obj.type === 'tower' && e.obj.parts && !this.game.s.flags.miningStarted) icon = null; // dafür gibt es den Zielhinweis am Objekt
      else if (a?.status === 'off' && e.obj.parts && !this.game.pcReady(e.obj)) icon = 'empty';
      else if (a?.status === 'idle' || a?.status === 'off') icon = 'sleep';
      e.running = !sm.tripped && a && a.watt > 0;
      if (e.obj.type === 'tower') { if (!e.light) { e.light = new THREE.PointLight(0xffa860, 0, 0.7, 2); e.light.position.set(0, 0.34, 0); e.group.add(e.light); } e.light.intensity = e.running ? 0.35 : 0; }
      e.sprite.visible = !!icon && this.mode !== 'title' && !(this.focus && this.focusUid === uid);
      if (icon) { e.sprite.material.map = this.icons[icon]; const bb = e.group.userData.bbox; e.sprite.position.set(0, (bb ? bb.max.y : 1) + (e.obj.type === 'tower' ? 0.1 : 0.22), 0); e.sprite.scale.set(sc, sc, sc); }
    }
    if (this.selected) this.refreshSelBox();
    this.syncPeople();
    if (this.heatMode) this.updateHeat();
    this.updateSolar(); this.updateSeason();
  }

  // ---------- Auswahl ----------
  // Nahansicht beim PC-Zusammenbau: Kamera fährt an die Glasseite des Gehäuses
  focusObject(uid) {
    const e = uid && this.entries.get(uid);
    this.focusUid = e ? uid : null;
    this.room?.root.traverse((m) => { if (m.userData.focusHide) m.visible = !e; });
    if (!e) { this.focus = null; this.updateStatus(); return; }
    const o = e.obj, rot = -(o.rot || 0) * Math.PI / 2, rotV = (x, y, z) => new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot).add(new THREE.Vector3(o.x, 0, o.z));
    const pos = rotV(0.62, 0.6, 0.45), look = rotV(0, 0.26, 0);
    const right = new THREE.Vector3().subVectors(look, pos).cross(new THREE.Vector3(0, 1, 0)).normalize();
    look.addScaledVector(right, 0.12);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(pos, look, new THREE.Vector3(0, 1, 0)));
    this.focus = { pos, q, light: rotV(0.32, 0.48, 0.18) };
    if (!this.focusLight) { this.focusLight = new THREE.PointLight(0xfff2df, 0, 0.75, 1.6); this.scene.add(this.focusLight); }
    if (e.sprite) e.sprite.visible = false;
  }
  // Einbau-Animation: das neue Teil gleitet von der offenen Seite ins Gehäuse und rastet ein
  animateInstall(uid, type) {
    const e = this.entries.get(uid), o = e?.obj; if (!e || !o?.parts) return;
    const p = o.parts, without = { ...p, gpus: [...(p.gpus || [])] };
    if (type === 'gpu') without.gpus.pop(); else without[type] = null;
    const base = objectModel({ ...o, parts: without }); base.traverse((m) => { m.userData.uid = uid; });
    const part = rigPartModel(o, type); part.traverse((m) => { m.castShadow = true; m.userData.uid = uid; });
    base.add(part); base.add(e.sprite);
    this.objGroup.remove(e.group); e.group = base; e.key = '__anim'; this.objGroup.add(base);
    base.position.set(o.x, 0, o.z); base.rotation.y = -o.rot * Math.PI / 2;
    this.install = { uid, part, t: 0 }; this.updateInstall(0);
    if (this.outline && this.selected === uid) this.outline.selectedObjects = [base];
  }
  updateInstall(dt) {
    const a = this.install; if (!a) return;
    a.t += dt; const k = Math.min(1, a.t / 0.58), c1 = 1.70158, c3 = c1 + 1, eb = 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
    a.part.position.set(Math.max(0, 1 - eb) * 0.24, (1 - k) * (1 - k) * 0.03, 0);
    const pk = Math.max(0, Math.min(1, (a.t - 0.46) / 0.2)); a.part.scale.setScalar(1 + 0.01 * Math.sin(pk * Math.PI));
    if (k >= 1 && !a.snapped) { a.snapped = true; this.onSnap?.(a.uid); }
    if (a.t > 0.76) { this.install = null; const e = this.entries.get(a.uid); if (e) e.key = null; this.syncObjects(); if (this.selected === a.uid) this.refreshSelBox(); this.onInstalled?.(a.uid); }
  }
  // Halbtransparente Vorschau: hier kommt das Teil hin
  ghostPart(uid, type, id) { this.ghostSpec = uid && type && id ? { uid, type, id } : null; this.applyGhost(); }
  applyGhost() {
    if (this.ghost) { this.ghost.parent?.remove(this.ghost); this.ghost = null; }
    const sp = this.ghostSpec, e = sp && this.entries.get(sp.uid); if (!e?.obj?.parts || e.key === '__anim') return;
    const p = e.obj.parts, parts = { ...p, gpus: [...(p.gpus || [])] };
    if (sp.type === 'gpu') parts.gpus.push(sp.id); else parts[sp.type] = sp.id;
    const g = rigPartModel({ ...e.obj, parts }, sp.type);
    this.ghostMat ||= new THREE.MeshBasicMaterial({ color: 0x9fe8bd, transparent: true, opacity: 0.14, depthWrite: false });
    this.ghostLine ||= new THREE.LineBasicMaterial({ color: 0x9fe8bd, transparent: true, opacity: 0.72, depthWrite: false });
    const edges = [];
    g.traverse((m) => { if (m.isMesh) { m.material = this.ghostMat; m.castShadow = false; m.raycast = () => {}; if (m.geometry.attributes.position.count < 4000) { const l = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 80), this.ghostLine); l.raycast = () => {}; edges.push([m, l]); } } });
    for (const [m, l] of edges) m.add(l);
    this.ghost = g; e.group.add(g);
  }
  // Weltpunkt → Bildschirmposition (für Hinweise am Objekt)
  toScreen(x, y, z) {
    const cam = this.camera; cam.updateMatrixWorld(); const cs = new THREE.Vector3(x, y, z).applyMatrix4(cam.matrixWorldInverse), v = new THREE.Vector3(x, y, z).project(cam);
    const sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight, front = cs.z < -0.1;
    return { x: sx, y: sy, front, on: front && sx > 40 && sx < innerWidth - 40 && sy > 60 && sy < innerHeight - 40, side: cs.x < 0 ? -1 : 1, dist: cam.position.distanceTo(new THREE.Vector3(x, y, z)) };
  }
  // Herumliegende Teile im Zimmer (leuchten, bis man sie aufhebt)
  syncLoose() {
    if (!this.looseGroup) { this.looseGroup = new THREE.Group(); this.scene.add(this.looseGroup); }
    const s = this.game.s, spots = this.room?.looseSpots, want = spots && s?.loose ? Object.keys(s.loose).filter((t) => spots[t]) : [];
    this.looseItems ||= {};
    for (const [t, g] of Object.entries(this.looseItems)) if (!want.includes(t) && !g.userData.flying) { this.looseGroup.remove(g); if (g.userData.haloMesh) this.looseGroup.remove(g.userData.haloMesh); delete this.looseItems[t]; }
    for (const t of want) {
      if (this.looseItems[t]) continue;
      const [x, y, z, ry] = spots[t], g = loosePartModel(t, s.loose[t]);
      g.position.set(x, y, z); g.rotation.y = ry; g.traverse((m) => { m.userData.loose = t; if (m.isMesh) { m.castShadow = true; } });
      // Weicher Lichtfleck flach auf der Ablagefläche (kein zur Kamera gedrehtes Sprite mit harten Schnittkanten)
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: this.haloTex(), color: 0xffb547, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4 }));
      halo.rotation.x = -Math.PI / 2; halo.position.set(x, y + 0.004, z); halo.raycast = () => {}; halo.renderOrder = 2; this.looseGroup.add(halo); g.userData.haloMesh = halo; g.userData.y0 = y;
      this.looseGroup.add(g); this.looseItems[t] = g;
    }
    const left = Object.values(this.looseItems).filter((g) => !g.userData.flying);
    this.looseGroup.visible = this.mode !== 'title';
    this.glow.selectedObjects = left; this.glow.enabled = left.length > 0 && this.mode !== 'title';
  }
  haloTex() {
    if (this._halo) return this._halo; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,220,150,.9)'); gr.addColorStop(0.35, 'rgba(255,180,70,.35)'); gr.addColorStop(1, 'rgba(255,160,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    this._halo = new THREE.CanvasTexture(c); this._halo.colorSpace = THREE.SRGBColorSpace; return this._halo;
  }
  // Aufheben: das Teil fliegt kurz zur Kamera und verschwindet
  pickupFx(t) {
    const g = this.looseItems?.[t]; if (!g) return; g.userData.flying = 0.001; g.traverse((m) => { if (m.isMesh) m.raycast = () => {}; }); this.aimLockUntil = this.t + 0.4; this.syncLoose();
  }
  updateLoose(dt) {
    if (!this.looseItems) return;
    for (const [t, g] of Object.entries(this.looseItems)) {
      const h = g.userData.haloMesh; if (h) h.material.opacity = g.userData.flying ? 0 :  (t === this.markLoose ? 0.3 : 0.1) + (t === this.markLoose ? 0.06 : 0.02) * Math.sin(this.t * 2.4 + g.position.x * 3);
      if (g.userData.flying) {
        const f = (g.userData.flying += dt), k = Math.min(1, f / 0.42), tgt = this.camera.position.clone().addScaledVector(this.camera.getWorldDirection(new THREE.Vector3()), 0.3).add(new THREE.Vector3(0, -0.45, 0));
        g.position.lerp(tgt, k * 0.35); g.scale.setScalar(Math.max(0.001, 1 - 1.6 * k)); g.rotation.y += dt * 6;
        if (k >= 1) { this.looseGroup.remove(g); if (g.userData.haloMesh) this.looseGroup.remove(g.userData.haloMesh); delete this.looseItems[t]; }
      }
    }
  }
  // Erstes Einschalten: Lüfter laufen hoch, der Monitor bootet den Miner
  powerOn(uid) {
    const e = this.entries.get(uid); if (e) e.spinK = 0;
    this.bootPending = true; this.screensDirty = true; this.pulse(uid); const e2 = this.entries.get(uid), bb = e2?.group.userData.bbox; if (e2 && !this.focus) this.coinBurst(new THREE.Vector3(e2.group.position.x, (bb ? bb.max.y : 0.5) + 0.1, e2.group.position.z), 6);
  }
  // Kamera zum Monitor (Miner bootet)
  focusMonitor() {
    const pr = this.room?.props?.find((p) => p.action === 'market'); if (!pr) return;
    const pos = new THREE.Vector3(pr.c[0] + 0.18, pr.c[1] + 0.05, pr.c[2] + 0.62), look = new THREE.Vector3(pr.c[0] + 0.05, pr.c[1], pr.c[2]);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(pos, look, new THREE.Vector3(0, 1, 0)));
    this.focus = { pos, q, light: new THREE.Vector3(pr.c[0] + 0.4, pr.c[1] + 0.15, pr.c[2] + 0.5) }; this.focusUid = null;
    if (this.bootPending) { this.bootT = this.t; this.bootPending = false; this.screensDirty = true; }
    if (!this.focusLight) { this.focusLight = new THREE.PointLight(0xfff2df, 0, 0.75, 1.6); this.scene.add(this.focusLight); }
  }
  select(uid) {
    this.selected = uid; this.refreshSelBox();
    this.onSelect?.(uid);
  }
  refreshSelBox() {
    const e = this.selected && this.entries.get(this.selected);
    this.selBox.visible = false;
    if (this.outline) this.outline.selectedObjects = e ? [e.group] : [];
    if (!e) return;
  }

  // ---------- Bauen ----------
  startPlacement(type, moveUid = null, template = null) {
    this.cancelPlacement();
    const def = PLACEABLE[type];
    const src = moveUid ? this.game.findObj(moveUid) : template ? template : { type, parts: def.kind === 'rig' ? { mobo: null, cpu: null, psu: null, gpus: [] } : undefined, items: def.kind === 'holder' ? [] : undefined };
    const ghost = objectModel(src);
    ghost.traverse((m) => { if (m.isMesh) { m.material = this.ghostOk; m.castShadow = false; } });
    this.scene.add(ghost);
    this.vm.setTablet(moveUid ? 'Verschieben: ' + def.name : def.name);
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
  reach() { return Math.min(8, 3.2 + Math.max(this.def.w, this.def.d) * 0.06); }
  updatePlacement() {
    const p = this.placing; if (!p) return;
    const [w, d] = this.footprintOf(p.def, p.rot); const g = this.def.grid;
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const maxD = this.reach() + Math.max(w, d) / 2;
    const pl = this.player.pos;
    let hit = this.raycaster.ray.intersectPlane(this.floorPlane, tmpV);
    if (!hit || Math.hypot(tmpV.x - pl.x, tmpV.z - pl.z) > maxD) { const f = this.player.forward(); tmpV.set(pl.x + f.x * maxD, 0, pl.z + f.z * maxD); }
    let x = Math.round((tmpV.x - w / 2) / g) * g + w / 2, z = Math.round((tmpV.z - d / 2) / g) * g + d / 2;
    x = Math.min(Math.max(x, w / 2), this.def.w - w / 2); z = Math.min(Math.max(z, d / 2), this.def.d - d / 2);
    p.x = x; p.z = z;
    const r = this.player.radius + 0.05, pr = this.player.pos;
    const cx = Math.max(x - w / 2, Math.min(pr.x, x + w / 2)), cz = Math.max(z - d / 2, Math.min(pr.z, z + d / 2));
    p.valid = this.canPlace(p.def, x, z, p.rot, p.moveUid) && Math.hypot(pr.x - cx, pr.z - cz) > r;
    p.ghost.position.set(x, 0.002, z); p.ghost.rotation.y = -p.rot * Math.PI / 2;
    const m = p.valid ? this.ghostOk : this.ghostBad;
    p.ghost.traverse((o) => { if (o.isMesh) o.material = m; });
    this.footprint.position.set(x, 0.01, z); this.footprint.scale.set(w, d, 1); this.footprint.material.color.set(p.valid ? 0xbfe6ff : 0xff7a72);
  }
  confirmPlacement() {
    const p = this.placing; if (!p || !p.valid) return;
    if (p.moveUid) {
      const o = this.game.findObj(p.moveUid); o.x = p.x; o.z = p.z; o.rot = p.rot;
      this.cancelPlacement(); this.syncObjects(); return;
    }
    const o = this.onPlace?.(p.type, p.x, p.z, p.rot, p.template);
    if (o && !this.player.keys.Shift) { this.cancelPlacement(); this.onPlaced?.(o); }
  }

  // ---------- Modi & Pointer Lock ----------
  setMode(m) {
    this.mode = m;
    this.player.enabled = m === 'play';
    this.controls.enabled = m === 'map';
    if (m === 'play') this.requestLock();
    else if (document.pointerLockElement) { this.expectUnlock = true; document.exitPointerLock(); }
    if (this.looseGroup) { this.looseGroup.visible = m !== 'title'; this.glow.enabled = m !== 'title' && this.glow.selectedObjects.length > 0; }
    if (m !== 'play') { this.aim = null; this.onAim?.(null); if (!this.selected) this.selBox.visible = false; this.popups?.forEach((p) => (p.visible = false)); }
    this.onModeChange?.(m);
  }
  requestLock() {
    if (this.touchMode || this.mode !== 'play' || document.pointerLockElement === this.canvas) return;
    const plain = () => { try { const r = this.canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { this.lockFailed = true; this.onLockChange?.(false); }); } catch (e) { this.lockFailed = true; } };
    // Rohe Mausbewegung (ohne Beschleunigung) vermeidet Sprünge beim schnellen Drehen; ältere Browser fallen zurück
    if (this.noRawMouse) { plain(); return; }
    try { const r = this.canvas.requestPointerLock({ unadjustedMovement: true }); if (r && r.catch) r.catch((err) => { if (err?.name === 'NotSupportedError') { this.noRawMouse = true; plain(); } else { this.lockFailed = true; this.onLockChange?.(false); } }); } catch (e) { this.noRawMouse = true; plain(); }
  }
  // Kollision des Spielers mit Raum, Möbeln und Objekten
  collides(x, z, r) {
    const def = this.def;
    if (x < r || z < r || x > def.w - r || z > def.d - r) return true;
    const hitRect = (a) => { const cx = Math.max(a.x0, Math.min(x, a.x1)), cz = Math.max(a.z0, Math.min(z, a.z1)); return (x - cx) ** 2 + (z - cz) ** 2 < r * r; };
    if (this.room.blocked.some(hitRect)) return true;
    for (const o of this.game.facObjects(this.facId)) if (hitRect(this.rectOf(o))) return true;
    return false;
  }

  // ---------- Eingabe ----------
  bindInput() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (ev) => {
      if (this.mode === 'ui') { this.onCanvasClickInUI?.(); return; }
      if (this.mode !== 'play') return;
      if (!this.player.locked && !this.touchMode && !this.lockFailed) { this.requestLock(); return; }
      if (ev.button === 2) { if (this.placing) this.cancelPlacement(); return; }
      if (ev.button !== 0) return;
      if (this.touchMode) { this.touchDown = [ev.clientX, ev.clientY]; return; }
      this.primaryAction();
    });
    c.addEventListener('pointerup', (ev) => {
      if (!this.touchMode || !this.touchDown || this.mode !== 'play') return;
      const moved = Math.hypot(ev.clientX - this.touchDown[0], ev.clientY - this.touchDown[1]); this.touchDown = null;
      if (moved < 10) this.primaryAction();
    });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.player.keys[k] = true;
      if (this.mode !== 'play') return;
      if (k === 'r' && this.placing) { this.placing.rot = (this.placing.rot + 1) % 4; this.updatePlacement(); }
      if (k === 'e' && !this.placing) this.primaryAction();
      if ((k === 'x' || k === 'Backspace') && this.placing) this.cancelPlacement();
      if (k === 'h' && this.game.has('heat')) { const on = this.toggleHeat(); this.onHeat?.(on); }
      if (k === 'f') { const on = this.vm.toggleLamp(); this.onLamp?.(on); }
    });
    window.addEventListener('keyup', (e) => { this.player.keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
    window.addEventListener('blur', () => { this.player.keys = {}; });
  }
  primaryAction() {
    if (this.placing) { this.confirmPlacement(); return; }
    const a = this.aim; if (!a) { this.onNoAim?.(); return; }
    if (a.loose) this.onLoose?.(a.loose);
    else if (a.door) this.onDoor?.(a.door);
    else if (a.prop) this.onProp?.(a.prop);
    else if (a.uid) this.onInteract?.(a.uid);
  }
  // Was liegt unter dem Fadenkreuz?
  updateAim() {
    if (this.aimLockUntil && this.t < this.aimLockUntil) { if (this.aim) { this.aim = null; this.onAim?.(null); } return; }
    if (this.placing) { if (this.aim) { this.aim = null; this.onAim?.(null); } this.selBox.visible = false; this.outline.selectedObjects = []; return; }
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = this.reach() + 1.5;
    const hits = this.raycaster.intersectObjects([...this.objGroup.children, ...this.doorGroup.children, ...(this.looseGroup?.children || []), this.room.root], true);
    this.raycaster.far = Infinity;
    let aim = null; const looseHit = hits.some((x) => x.object.userData.loose);
    for (const h of hits) {
      const o = h.object; if (o.isSprite) continue;
      if (o.userData.prop && looseHit) continue; // Teile auf dem Bett haben Vorrang vor der Schlafen-Box
      if (o.userData.prop?.action === 'sleep' && this.game.s.feat && !this.game.s.flags.miningStarted) continue; // vor dem ersten PC gibt es nichts zu verschlafen
      if (o.userData.loose) { aim = { loose: o.userData.loose, dist: h.distance }; break; }
      if (o.userData.door) { aim = { door: o.userData.door, dist: h.distance }; break; }
      if (o.userData.prop) { aim = { prop: o.userData.prop, dist: h.distance }; if (o.userData.prop.action === 'market' && this.bootPending) { this.bootT = this.t; this.bootPending = false; this.screensDirty = true; } break; }
      if (o.userData.uid) { aim = { uid: o.userData.uid, dist: h.distance }; break; }
      if (o.isMesh && o.visible) break; // Wand/Möbel verdeckt
    }
    const akey = (a) => (a ? a.uid || (a.loose && 'loose:' + a.loose) || (a.door || a.prop)?.label : null), key = akey(aim), prev = akey(this.aim);
    this.aim = aim;
    if (key !== prev) this.onAim?.(aim);
    const e = aim?.uid && this.entries.get(aim.uid), lp = aim?.loose && this.looseItems?.[aim.loose];
    this.outline.selectedObjects = e ? [e.group] : lp ? [lp] : [];
    if (!this.selected) this.selBox.visible = false;
  }
  pick() { return this.aim?.uid || null; }
  // Alte API (Rundgang) – Ego-Perspektive ist jetzt immer aktiv
  enterFP() { this.setMode('play'); }

  // ---------- Schwebende Ertrags-Einblendungen ----------
  spawnIncome() {
    if (this.empire || this.mode !== 'play' || this.focus || !this.game.s.speed || document.body.classList.contains('show-build')) return;
    const now = this.t; if (this.lastIncome && now - this.lastIncome < 3.0) return; this.lastIncome = now;
    const sm = this.game.summary[this.facId]; if (!sm || sm.tripped) return;
    this.popups ||= [];
    const cand = [];
    for (const [uid, e] of this.entries) { const a = sm.per.get(uid); if (!a || !a.units.length) continue; const rev = a.units.reduce((x, u) => x + u.rev, 0) * sm.throttle; const u0 = a.units.find((u) => u.coin && u.rev > 0); if (rev > 0.01) cand.push([e, rev, u0]); }
    cand.sort(() => Math.random() - 0.5);
    for (const [e, rev, u0] of cand.slice(0, 6)) {
      let p = this.popups.find((q) => !q.visible);
      if (!p) { if (this.popups.length >= 14) break; const c = document.createElement('canvas'); c.width = 256; c.height = 64; const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; p = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })); p.renderOrder = 15; p.userData.c = c; this.scene.add(p); this.popups.push(p); }
      const c = p.userData.c, g = c.getContext('2d'); g.clearRect(0, 0, 256, 64); g.fillStyle = 'rgba(38,28,22,.86)'; g.beginPath(); g.roundRect(14, 6, 228, 52, 26); g.fill();
      g.font = '600 34px Fredoka, Nunito, Arial'; g.textAlign = 'center'; g.shadowColor = 'transparent'; const coin = u0?.coin || 'BTC', asCoin = !(this.game.s.autoSell?.[coin] > 0); const px = this.game.price(coin) || 1;
      const per = 3.0 / ([Infinity, 4.0, 1.6, 0.5, 0.12][this.game.s.speed] || 4); // Anteil eines Tages pro Einblendung
      const txt = asCoin ? `+${fmtCoin((rev / px) * per)} ${coin}` : '+' + fmtUSD(rev * per); g.fillStyle = asCoin ? '#ffc640' : '#6fdc9c'; g.fillText(txt, 128, 44, 210); g.shadowColor = 'transparent';
      p.material.map.needsUpdate = true;
      const bb = e.group.userData.bbox, sc = Math.min(0.38, Math.max(0.2, this.camera.position.distanceTo(e.group.position) * 0.2)); p.position.set(e.group.position.x, (bb ? bb.max.y : 0.6) + 0.28, e.group.position.z);
      p.scale.set(sc, sc / 4, 1); p.visible = true; p.userData.life = 0; p.userData.y0 = p.position.y; p.material.opacity = 1;
      this.coinBurst(new THREE.Vector3(e.group.position.x, (bb ? bb.max.y : 0.6) + 0.02, e.group.position.z), 3); this.onIncome?.();
    }
  }
  pulse(uid) { const e = this.entries.get(uid); if (!e || !this.outline) return; this.outline.selectedObjects = [e.group]; this.outline.pulsePeriod = 0.5; this.outline.visibleEdgeColor.set(0xffc23a); clearTimeout(this.pulseT); this.pulseT = setTimeout(() => { this.outline.pulsePeriod = 0; this.outline.visibleEdgeColor.set(0xffdda0); }, 1500); }
  // Vorschaubild für den Bau-Katalog: Modell im kleinen Fotostudio rendern (einmal pro Typ)
  thumbnail(type) {
    this.thumbs ||= new Map(); if (this.thumbs.has(type)) return this.thumbs.get(type);
    const W = 480, H = 320, r = this.renderer;
    if (!this.thumbScene) {
      const sc = (this.thumbScene = new THREE.Scene()); sc.environment = this.scene.environment;
      sc.add(new THREE.HemisphereLight(0xfff4e6, 0x3a3530, 0.7));
      const k = new THREE.DirectionalLight(0xffffff, 1.3); k.position.set(2, 3, 2.5); sc.add(k);
      this.thumbCam = new THREE.PerspectiveCamera(30, W / H, 0.01, 200);
      this.thumbRT = new THREE.WebGLRenderTarget(W, H, { samples: 4 });
    }
    const def = PLACEABLE[type];
    const model = objectModel({ type, parts: def.kind === 'rig' ? { mobo: null, cpu: null, psu: null, gpus: [] } : undefined, items: def.kind === 'holder' ? [] : undefined, rot: 0 });
    this.thumbScene.add(model);
    const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const rad = size.length() / 2; let dist = rad / Math.sin(THREE.MathUtils.degToRad(15)) * 1.2;
    const dir = new THREE.Vector3(1, 0.62, 1.25).normalize(), cam = this.thumbCam, tgt = c.clone();
    const corners = []; for (let i = 0; i < 8; i++) corners.push(new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
    // Eng einrahmen: Objekt füllt ~70 % der Höhe bzw. ~84 % der Breite, steht unten auf einer gemeinsamen Standlinie (NDC y = −0,72)
    let ext = [0, 0, 0, 0];
    for (let it = 0; it < 6; it++) {
      cam.position.copy(tgt).addScaledVector(dir, dist); cam.lookAt(tgt); cam.near = dist / 50; cam.far = dist * 4; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const q of corners) { const v = q.clone().project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
      ext = [x0, x1, y0, y1];
      const sx = (x1 - x0) / 2 / 0.84, sy = (y1 - y0) / 2 / 0.84, sc = Math.max(sx, sy);
      const want = new THREE.Vector3((x0 + x1) / 2, y0 + 0.74 * sc, 0.5);
      const off = want.unproject(cam).sub(new THREE.Vector3(0, 0, 0.5).unproject(cam));
      tgt.add(off); dist *= 0.35 + 0.65 * sc;
    }
    cam.position.copy(tgt).addScaledVector(dir, dist); cam.lookAt(tgt); cam.near = dist / 50; cam.far = dist * 4; cam.updateProjectionMatrix();
    const prevT = r.getRenderTarget(); r.setRenderTarget(this.thumbRT); r.setClearColor(0x000000, 0); r.clear(); r.render(this.thumbScene, this.thumbCam);
    const px = new Uint8Array(W * H * 4); r.readRenderTargetPixels(this.thumbRT, 0, 0, W, H, px); r.setRenderTarget(prevT);
    this.thumbScene.remove(model);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const si = ((H - 1 - y) * W + x) * 4, di = (y * W + x) * 4; for (let k = 0; k < 3; k++) { const v = px[si + k] / 255, t = v / (1 + v * 0.6); img.data[di + k] = Math.min(255, Math.pow(t * 1.15, 1 / 2.2) * 255); } img.data[di + 3] = px[si + 3]; }
    g.putImageData(img, 0, 0);
    // Weicher Bodenschatten unter dem Objekt (hinter die Modellpixel gelegt)
    { const cx = W / 2, cy = H * 0.87, rx = Math.max(26, Math.min(W * 0.36, (ext[1] - ext[0]) / 2 * W / 2 * 0.95)), ry = rx * 0.2;
      g.save(); g.globalCompositeOperation = 'destination-over'; g.translate(cx, cy); g.scale(1, ry / rx); const sh = g.createRadialGradient(0, 0, 0, 0, 0, rx); sh.addColorStop(0, 'rgba(25,16,10,.55)'); sh.addColorStop(1, 'rgba(25,16,10,0)'); g.fillStyle = sh; g.beginPath(); g.arc(0, 0, rx, 0, 7); g.fill(); g.restore(); }
    const url = cv.toDataURL('image/png'); this.thumbs.set(type, url); return url;
  }
  // Kleine Münzen springen aus dem Gerät (Rückmeldung für Einkommen)
  coinBurst(pos, n) {
    if (!this.coinTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(26, 24, 4, 32, 32, 30); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.5, '#ffc93a'); gr.addColorStop(1, '#c98a00'); g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill(); g.strokeStyle = 'rgba(120,70,0,.6)'; g.lineWidth = 3; g.stroke(); g.fillStyle = 'rgba(120,70,0,.75)'; g.font = '700 34px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('₿', 32, 34); this.coinTex = new THREE.CanvasTexture(c); this.coinTex.colorSpace = THREE.SRGBColorSpace; this.coins = []; }
    for (let i = 0; i < n; i++) {
      let k = this.coins.find((q) => !q.visible);
      if (!k) { if (this.coins.length >= 40) return; k = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.coinTex, transparent: true, depthWrite: false })); k.renderOrder = 9; this.scene.add(k); this.coins.push(k); }
      const a = Math.random() * Math.PI * 2, sp = 0.35 + Math.random() * 0.35;
      k.position.copy(pos); k.position.y -= 0.08; k.visible = true; k.scale.setScalar(0.07);
      k.userData = { v: new THREE.Vector3(Math.cos(a) * sp, 1.3 + Math.random() * 0.6, Math.sin(a) * sp), life: 0, spin: (Math.random() - 0.5) * 12 };
      k.material.opacity = 1;
    }
  }
  updatePopups(dt) {
    if (this.coins) for (const k of this.coins) { if (!k.visible) continue; const u = k.userData; u.life += dt; u.v.y -= 4.2 * dt; k.position.addScaledVector(u.v, dt); k.material.rotation += u.spin * dt; k.scale.setScalar(0.07 * (1 - Math.max(0, u.life - 0.6) * 1.5)); k.material.opacity = Math.max(0, 1 - Math.max(0, u.life - 0.55) * 2.2); if (u.life > 1.0) k.visible = false; }
    if (!this.popups) return;
    for (const p of this.popups) { if (!p.visible) continue; p.userData.life += dt; p.position.y = p.userData.y0 + p.userData.life * 0.16; p.material.opacity = Math.max(0, 1 - p.userData.life / 1.2); if (p.userData.life > 1.2) p.visible = false; }
  }

  // ---------- Jahreszeit: Weihnachtsbaum im Dezember ----------
  updateSeason() {
    const m = new Date(this.game.s.day * 86400000).getUTCMonth();
    const spots = { 0: [0.3, 1.25], 1: [6.6, 4.7], 2: [9.4, 7.4] };
    const want = m === 11 && spots[this.def.tier] && !this.empire;
    if (want && !this.xmas) {
      const g = (this.xmas = new THREE.Group()); const [x, z] = spots[this.def.tier]; g.position.set(x, 0, z);
      const green = mat('xmasGreen', { color: 0x1f6b2e, roughness: 0.8 });
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.18, 12), mat('pot', { color: 0xb5643c, roughness: 0.8 })); pot.position.y = 0.09; g.add(pot);
      [[0.32, 0.5, 0.42], [0.25, 0.42, 0.72], [0.17, 0.34, 0.98]].forEach(([r, h, y]) => { const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), green); c.position.y = y; c.castShadow = true; g.add(c); });
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), mat('xmasStar', { color: 0x332200, emissive: 0xffd400, emissiveIntensity: 3 })); star.position.y = 1.2; g.add(star);
      const cols = [M.ledRed(), M.ledBlue(), M.ledAmber(), M.ledGreen2()];
      for (let i = 0; i < 18; i++) { const a = i * 2.4, y = 0.35 + (i / 18) * 0.75, r = 0.3 * (1 - (y - 0.3) / 0.95) + 0.03; const b = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), cols[i % 4]); b.position.set(Math.cos(a) * r, y, Math.sin(a) * r); g.add(b); }
      this.scene.add(g);
    } else if (!want && this.xmas) { this.scene.remove(this.xmas); this.xmas = null; }
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
    if (this.gtao) this.gtao.enabled = false; if (this.outline) this.outline.selectedObjects = [];
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
      cx.fillStyle = 'rgba(38,28,22,0.88)'; cx.beginPath(); cx.roundRect(4, 4, 504, 120, 28); cx.fill(); cx.fillStyle = '#ffc23a'; cx.font = '700 54px Fredoka, Nunito, sans-serif'; cx.textAlign = 'center'; cx.fillText(def.name, 256, 62);
      const sm = this.game.summary[id]; cx.fillStyle = '#f3e6d4'; cx.font = '600 26px Nunito, sans-serif';
      const sha = sm ? (sm.hashByAlgo.sha256 || 0) * sm.throttle : 0;
      cx.fillText(`${def.w}×${def.d} m · ${sm ? (sm.watt / 1000).toFixed(sm.watt < 1e4 ? 2 : 0) : 0} kW${sha ? ' · ' + fmtHash(sha) : ''}`, 256, 106);
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
    this.savedPose = { x: this.player.pos.x, z: this.player.pos.z, yaw: this.player.yaw, pitch: this.player.pitch };
    this.setMode('map'); this.camera.fov = 45; this.camera.updateProjectionMatrix();
    this.room.ceil.visible = false; if (this.weather) this.weather.visible = false; this.doorGroup.visible = false;
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
    this.camera.fov = 60; this.camera.updateProjectionMatrix(); this.doorGroup.visible = true;
    this.loadFacility(this.facId);
    const sp = this.savedPose; if (sp) { this.player.setPose(sp.x, sp.z, sp.yaw, sp.pitch); }
    this.onEmpire?.(false);
  }

  // ---------- Personal (NPCs) ----------
  // Figur: Kapsel-Gliedmaßen mit Gelenken, Schuhe, Gesicht (Augen, Nase, Ohren), Haare oder Helm
  makePerson(vest = 0xff8a00, hat = true, skin = 0xe0b394, hair = 0x2a1a10) {
    const g = new THREE.Group();
    const cap = (r, len, seg = 12) => { const k = `cap${r}|${len}`; if (!this._pg) this._pg = new Map(); if (!this._pg.has(k)) { const geo = new THREE.CapsuleGeometry(r, len, 4, seg); geo.translate(0, -len / 2 - r * 0.6, 0); this._pg.set(k, geo); } return this._pg.get(k); };
    const mk = (geo, m, parent, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; parent.add(o); return o; };
    const pants = mat('npcPants', { color: 0x2b3446, roughness: 0.9 }), skinM = mat('npcSkin' + skin, { color: skin, roughness: 0.65 }), vestM = mat('npcVest' + vest, { color: vest, roughness: 0.6, emissive: vest, emissiveIntensity: 0.08 });
    const shirt = mat('npcShirt', { color: 0x3c4250, roughness: 0.85 }), shoe = mat('npcShoe', { color: 0x1d1f24, roughness: 0.6 }), dark = mat('npcEye', { color: 0x15171c, roughness: 0.2 });
    const stripe = mat('npcStripe', { color: 0xdddddd, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.3 }), hairM = mat('npcHair' + hair, { color: hair, roughness: 0.9 });
    const sph = (r) => new THREE.SphereGeometry(r, 16, 12);
    // Beine mit Hüftgelenk (Pivot oben)
    const leg = (x) => { const l = new THREE.Group(); l.position.set(x, 0.86, 0); g.add(l); mk(cap(0.066, 0.62), pants, l, 0, 0, 0); const sh = mk(new RoundedBoxGeometry(0.11, 0.07, 0.24, 3, 0.03), shoe, l, 0, -0.82, 0.035); sh.castShadow = true; return l; };
    const legL = leg(-0.085), legR = leg(0.085);
    mk(new RoundedBoxGeometry(0.31, 0.14, 0.19, 3, 0.05), pants, g, 0, 0.9, 0);
    // Oberkörper (Kapsel, abgeflacht) + Warnwesten-Streifen
    mk(new THREE.CapsuleGeometry(0.16, 0.28, 6, 18), vestM, g, 0, 1.2, 0, 1.05, 1, 0.66);
    for (const y of [1.08, 1.2]) mk(new THREE.CylinderGeometry(0.17, 0.17, 0.035, 22, 1, true), stripe, g, 0, y, 0, 1.05, 1, 0.68);
    mk(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 12), skinM, g, 0, 1.47, 0);
    // Arme mit Schultergelenk
    const arm = (x) => { const a = new THREE.Group(); a.position.set(x, 1.4, 0); g.add(a); mk(cap(0.052, 0.24), shirt, a, 0, 0.02, 0); mk(cap(0.043, 0.2), skinM, a, 0, -0.27, 0); mk(sph(0.048), skinM, a, 0, -0.58, 0.01, 0.85, 1.15, 0.7); return a; };
    const armL = arm(-0.22), armR = arm(0.22);
    // Kopf mit Gesicht
    const hy = 1.62;
    mk(sph(0.108), skinM, g, 0, hy, 0, 0.94, 1.08, 1);
    for (const s of [-1, 1]) { mk(sph(0.024), skinM, g, s * 0.1, hy, -0.005, 0.5, 1, 0.8); mk(sph(0.012), dark, g, s * 0.036, hy + 0.018, 0.094); mk(new THREE.BoxGeometry(0.032, 0.007, 0.01), hairM, g, s * 0.037, hy + 0.043, 0.096); }
    mk(sph(0.017), skinM, g, 0, hy - 0.008, 0.106, 0.8, 1, 1);
    mk(new THREE.BoxGeometry(0.036, 0.006, 0.006), mat('npcMouth', { color: 0x8a4a3a, roughness: 0.6 }), g, 0, hy - 0.048, 0.098);
    let hairMesh = null;
    if (hat) {
      mk(new THREE.SphereGeometry(0.125, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('npcHat', { color: 0xffd400, roughness: 0.4 }), g, 0, hy + 0.02, 0);
      mk(new THREE.CylinderGeometry(0.135, 0.14, 0.012, 22), mat('npcHat', { color: 0xffd400, roughness: 0.4 }), g, 0, hy + 0.02, 0.02, 1, 1, 1.12);
      mk(new THREE.BoxGeometry(0.02, 0.06, 0.2), mat('npcHat', { color: 0xffd400, roughness: 0.4 }), g, 0, hy + 0.13, 0);
    } else {
      hairMesh = mk(new THREE.SphereGeometry(0.116, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, g, 0, hy + 0.012, -0.008, 0.96, 1.05, 1.05);
      hairMesh.rotation.x = -0.25;
    }
    g.userData = { legL, legR, armL, armR, hair: hairMesh, phase: Math.random() * 6, target: null, wait: 0, speed: 1.1 + Math.random() * 0.4 };
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
    // Familie: Papa in der Werkstatt, Opa im Keller (nach dem Starkstrom)
    const fam = [];
    if (tier === 2) fam.push(['papa', 0x7a5230, 0xd9a983, 1.4, 0.95, Math.PI]);
    if (tier === 1 && (s.fac.keller?.power || 0) > 0) fam.push(['opa', 0x5b6b4a, 0xe2b896, 4.2, 0.75, Math.PI]);
    for (const [key, vest, skin, x, z, ry] of fam) {
      if (this.people.userData[key]) continue;
      const p = this.makePerson(vest, false, skin); p.userData.static = true; p.userData.work = true;
      p.position.set(x, 0, z); p.rotation.y = ry; this.people.userData[key] = p; this.people.add(p);
      if (p.userData.hair) p.userData.hair.material = mat('npcGrayHair', { color: 0xbfbfbf, roughness: 0.9 });
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
    // Kamera / Spieler
    if (this.mode === 'map') {
      if (this.transition) { const tr = this.transition; tr.t += dt / tr.dur; const k = tr.t >= 1 ? 1 : 1 - Math.pow(1 - tr.t, 3); this.camera.position.lerpVectors(tr.from, tr.to, k); this.camera.lookAt(this.controls.target); if (tr.t >= 1) this.transition = null; }
      else this.controls.update();
    } else if (this.mode === 'title') {
      this.camera.lookAt(this.controls.target);
    } else {
      if (this.mode === 'play') {
        const scale = this.def.tier >= 3 ? 1.6 : 1;
        this.player.update(dt, (x, z, r) => this.collides(x, z, r), scale);
        if (this.placing) this.updatePlacement(); else this.updateAim();
      } else this.player.apply();
      // Weiche Fahrt zur Nahansicht und zurück
      this.focusK = Math.max(0, Math.min(1, (this.focusK || 0) + (this.focus && this.mode === 'ui' ? dt : -dt) / 0.6));
      if (this.focusK > 0 && (this.focus || this.fc)) {
        const f = this.focus, k = this.focusK * this.focusK * (3 - 2 * this.focusK);
        if (f) { if (!this.fc) this.fc = { pos: f.pos.clone(), q: f.q.clone(), light: f.light.clone() }; const a = 1 - Math.exp(-dt * 3.2); this.fc.pos.lerp(f.pos, a); this.fc.q.slerp(f.q, a); this.fc.light.lerp(f.light, a); }
        this.camera.position.lerp(this.fc.pos, k); this.camera.quaternion.slerp(this.fc.q, k);
        if (this.focusLight) { this.focusLight.position.copy(this.fc.light); this.focusLight.intensity = 1.45 * k; }
        if (this.outline && !this.outline.pulsePeriod) this.outline.edgeStrength = 1.8 - 1.35 * k;
      } else { this.fc = null; if (this.focusLight) this.focusLight.intensity = 0; if (this.outline) this.outline.edgeStrength = 1.8; }
    }
    this.vm.update(dt, { moving: this.player.moving && this.mode === 'play', bob: this.player.bob, placing: !!this.placing, visible: this.mode === 'play' || this.mode === 'ui', uiOpen: this.mode === 'ui' });
    // Tag/Nacht
    // Optik-Uhr: Licht folgt der Spielzeit gedämpft (höchstens ein Tag pro 90 s) – kein Flackern bei hohem Tempo
    if (this.mode === 'title' || this.visFrac == null) this.visFrac = s.frac;
    else { const df = (s.frac - this.visFrac + 1) % 1; this.visFrac = (this.visFrac + Math.min(df, dt / 90)) % 1; }
    this.updateDaylight(this.visFrac);
    this.updatePeople(dt); this.updateSmoke(dt); this.updateWeather(dt); this.updatePopups(dt); this.updateInstall(dt); this.updateLoose(dt); if (this.ghostMat) { this.ghostMat.opacity = 0.1; this.ghostLine.opacity = 0.38 + 0.06 * Math.sin(this.t * 4); }
    // Lüfter & LEDs
    const fanSpeed = 28 * dt;
    for (const e of this.entries.values()) {
      if (!e.group.userData.fans.length) continue;
      const def = PLACEABLE[e.obj.type];
      const run = e.running && !this.game.s.paused; e.spinK = run ? Math.min(1, (e.spinK ?? 1) + dt / 1.4) : Math.max(0, (e.spinK ?? 0) - dt / 2.5);
      if (e.spinK > 0) { const spd = (def.kind === 'cooling' ? fanSpeed * 0.5 : fanSpeed) * e.spinK * e.spinK; for (const f of e.group.userData.fans) f.rotateZ(spd); }
    }
    const blink = (Math.sin(this.t * 7) > 0.2) ? 3.5 : 0.6, blink2 = (Math.sin(this.t * 5.3 + 1) > -0.3) ? 3 : 0.4;
    M.ledGreen().emissiveIntensity = blink; M.ledGreen2().emissiveIntensity = blink2; M.ledAmber().emissiveIntensity = blink2 * 0.9;
    M.rgb().emissive.setHSL(0.07 + 0.05 * Math.sin(this.t * 0.6), 0.95, 0.55); { let on = false; for (const e of this.entries.values()) if (e.running) { on = true; break; } const tgt = on && this.mode !== 'title' ? 2.2 : this.mode === 'title' ? 0.6 : 0.15; M.rgb().emissiveIntensity += (tgt - M.rgb().emissiveIntensity) * Math.min(1, dt * 3); }
    // Rendern
    if (this.quality === 'low') { const r = this.renderer; r.render(this.scene, this.camera); if (this.vm.root.visible) { r.autoClear = false; r.clearDepth(); r.render(this.vm.scene, this.camera); r.autoClear = true; } } else this.composer.render();
  }

  updateDaylight(frac) {
    const hour = frac * 24;
    const elev = Math.sin(((hour - 6.5) / 13) * Math.PI); // >0 tagsüber
    const day = Math.max(0, elev);
    const def = this.def, span = Math.max(def.w, def.d);
    const az = ((hour - 6) / 12) * Math.PI;
    this.sun.position.set(def.w / 2 + Math.cos(az) * span * 1.5, Math.max(0.3, elev) * span * 2 + 2, def.d / 2 - Math.sin(az) * span * 0.8 - span);
    this.sun.target.position.set(def.w / 2, 0, def.d / 2);
    const sunUp = THREE.MathUtils.smoothstep(elev, -0.05, 0.1);
    this.sun.intensity = sunUp * (0.12 + day * 1.7);
    this.moon.intensity = 0.22 * (1 - THREE.MathUtils.smoothstep(elev, -0.1, 0.1)); this.moon.position.set(def.w / 2 - span * 0.4, span * 2.2, def.d / 2 - span * 1.6); this.moon.target.position.set(def.w / 2, 0, def.d / 2);
    const warm = Math.max(0, 1 - Math.abs(elev) * 3);
    this.sun.color.setRGB(1, 0.92 - warm * 0.25, 0.85 - warm * 0.4);
    this.hemi.intensity = 0.15 + day * 0.3; this.fill.intensity = 0;
    if (day <= 0) this.sun.color.setRGB(0.55, 0.65, 1.0);
    const night = new THREE.Color(0x0b1226), dayc = new THREE.Color(def.style === 'fjord' ? 0x9cc2e6 : 0x8fbbe8), dusk = new THREE.Color(0xe7925a);
    const sky = night.clone().lerp(dayc, Math.min(1, day * 1.6)); sky.lerp(dusk, warm * 0.45 * (elev > -0.3 ? 1 : 0));
    this.scene.background = sky; if (this.scene.fog) this.scene.fog.color.copy(sky);
    if (this.sky) {
      const nightT = 1 - Math.min(1, day * 2.2);
      this.skyU.top.value.set(0x6fa3dc).lerp(new THREE.Color(0x51618f), warm * 0.6).lerp(new THREE.Color(0x070b18), nightT);
      this.skyU.horizon.value.set(def.style === 'fjord' ? 0xd6e6f2 : 0xdfe9f2).lerp(new THREE.Color(0xf2a66a), warm * 0.8).lerp(new THREE.Color(0x1b2340), nightT);
      this.skyU.sunDir.value.copy(this.sun.position).sub(this.sun.target.position).normalize();
      this.sky.position.set(def.w / 2, 0, def.d / 2); this.stars.position.copy(this.sky.position);
      this.stars.material.opacity = Math.max(0, nightT - 0.2) * 0.9; if (this.moonSp) this.moonSp.material.opacity = Math.min(1, Math.max(0, nightT - 0.15) * 1.4);
      for (const m of nightGround) m.color.copy(m.userData.day).lerp(m.userData.night || NIGHT_GRASS, nightT * 0.85);
      for (const m of nightMats) m.color.setRGB(1, 1, 1).lerp(NIGHT_FACADE, nightT * 0.8);
      for (const m of nightMats) m.emissiveIntensity = nightT * 1.3;
      M.window().color.set(0xbfe2ff).lerp(new THREE.Color(0x101a33), nightT); M.window().opacity = 0.35 - 0.22 * nightT;
    }
    this.scene.environmentIntensity = 0.25 + day * 0.2;
    const lampK = 0.75 + (1 - day) * 0.6;
    this.renderer.toneMappingExposure = 0.98 + (1 - day) * 0.08;
    if (this.vm?.hemi) { this.vm.hemi.intensity = 0.45 + day * 0.95; this.vm.key.intensity = 0.35 + day * 1.25; this.vm.hemi.color.set(day > 0.2 ? 0xfff6ea : 0xffd8a8); }
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
        if (s.feat && !s.flags.miningStarted) { g.fillStyle = '#050403'; g.fillRect(0, 0, W, H); g.fillStyle = '#3a2a18'; g.beginPath(); g.arc(W - 18, H - 16, 4, 0, 7); g.fill(); sc.tex.needsUpdate = true; continue; }
        g.fillStyle = '#140b04'; g.fillRect(0, 0, W, H); g.font = 'bold 26px monospace'; g.fillStyle = '#ffb347';
        g.fillText('miner v0.3 – ' + fmtDate(s.day), 14, 34);
        g.font = '21px monospace';
        const lines = [];
        if (this.bootT != null && this.t - this.bootT < 5.5) {
          const pc = this.game.facObjects(this.facId).find((o) => o.type === 'tower'), gpu = pc?.parts?.gpus?.[0], a = pc && sm?.per.get(pc.uid);
          const boot = ['Starte Miner ...', `GPU gefunden: ${gpu ? PART[gpu].name : '-'}`, 'Verbinde mit dem Bitcoin-Netz ...', `Schürfe! ${a?.units?.[0]?.h ? fmtHash(a.units[0].h, 'sha256') : ''}`];
          g.font = 'bold 24px monospace'; boot.slice(0, 1 + Math.floor((this.t - this.bootT) / 1.1)).forEach((l, k) => g.fillText(l, 14, 80 + k * 36, W - 28));
          sc.tex.needsUpdate = true; continue;
        }
        let i = 0;
        for (const o of this.game.facObjects(this.facId)) { const a = sm?.per.get(o.uid); if (!a || !a.units.length) continue; const u = a.units[0]; lines.push(`RIG${i++}: ${u.h ? fmtHash(u.h, u.algo) : 'idle'} ${u.coin || ''}`); if (lines.length >= 4) break; }
        lines.push(`BTC ${fmtUSD(this.game.price('BTC'))}  T ${sm ? sm.temp.toFixed(1) : '--'}C`);
        lines.push(`> ${Math.floor(this.t * 2) % 2 ? '_' : ' '}`);
        lines.forEach((l, k) => g.fillText(l, 14, 76 + k * 34, W - 28));
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
