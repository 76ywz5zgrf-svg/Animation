import * as THREE from 'three';

const T = await (await fetch('build/timeline.json')).json();
const SC = Object.fromEntries(T.scenes.map((s) => [s.id, s]));
const U = T.u;
const W = 1080, H = 1920;

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ---------- kleine Helfer ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const easeOut = (k) => 1 - Math.pow(1 - clamp(k), 3);
const backOut = (k) => { k = clamp(k); const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const prog = (t, a, d) => clamp((t - a) / d);
function rng(seed) { let s = seed >>> 0; return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let r = Math.imul(s ^ (s >>> 15), 1 | s); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
function mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; return m; }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// ---------- Texturen ----------
function brickTex() {
  const r = rng(11);
  const t = canvasTex(512, 512, (g) => {
    g.fillStyle = '#9a9592'; g.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 8; row++) for (let col = -1; col < 4; col++) {
      const x = col * 128 + (row % 2 ? 64 : 0), y = row * 64, v = 196 + Math.floor(r() * 26);
      g.fillStyle = `rgb(${v},${v - 3},${v - 6})`; g.fillRect(x + 4, y + 4, 120, 56);
      g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(x + 4, y + 4, 120, 6);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function floorTex() {
  const t = canvasTex(256, 256, (g) => {
    g.fillStyle = '#8d8a90'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#c9c6cc'; g.fillRect(5, 5, 246, 246);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(5, 5, 246, 10);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const BRICK = brickTex(), FLOOR = floorTex();
function wallMat(color, rx, ry) { const t = BRICK.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshLambertMaterial({ map: t, color }); }

function makeRoom(wallColor = 0xffffff, floorColor = 0xffffff) {
  const g = new THREE.Group();
  const ft = FLOOR.clone(); ft.needsUpdate = true; ft.repeat.set(16, 16);
  const floor = mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshLambertMaterial({ map: ft, color: floorColor }), 0, 0, 2, false);
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  g.add(mesh(new THREE.PlaneGeometry(14, 9), wallMat(wallColor, 3.5, 2.25), 0, 4.5, -5, false));
  const l = mesh(new THREE.PlaneGeometry(24, 9), wallMat(wallColor, 6, 2.25), -5.5, 4.5, 2, false); l.rotation.y = Math.PI / 2; g.add(l);
  const r = mesh(new THREE.PlaneGeometry(24, 9), wallMat(wallColor, 6, 2.25), 5.5, 4.5, 2, false); r.rotation.y = -Math.PI / 2; g.add(r);
  return g;
}
function addLights(scene, o = {}) {
  const hemi = new THREE.HemisphereLight(o.sky ?? 0xfff4e6, o.ground ?? 0x8c8590, o.hemi ?? 2.0);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(o.dirColor ?? 0xfff0dd, o.dir ?? 2.2);
  dir.position.set(...(o.dirPos ?? [3, 8, 6]));
  dir.castShadow = true; dir.shadow.mapSize.set(2048, 2048);
  Object.assign(dir.shadow.camera, { left: -7, right: 7, top: 8, bottom: -4, near: 0.5, far: 30 });
  dir.shadow.bias = -0.0015; dir.shadow.radius = 5;
  scene.add(dir);
  return { hemi, dir };
}
function painting(x, y, w, h, seed, z = -4.93) {
  const g = new THREE.Group(); const r = rng(seed);
  g.add(mesh(new THREE.BoxGeometry(w + 0.18, h + 0.18, 0.08), lam(0x8a5a2b), 0, 0, 0));
  const hue = Math.floor(r() * 360);
  const tex = canvasTex(128, 128, (c) => {
    c.fillStyle = `hsl(${hue},55%,62%)`; c.fillRect(0, 0, 128, 128);
    c.fillStyle = `hsl(${(hue + 150) % 360},50%,45%)`; c.beginPath(); c.moveTo(0, 128); c.lineTo(0, 80); c.quadraticCurveTo(60, 40, 128, 90); c.lineTo(128, 128); c.fill();
    c.fillStyle = `hsl(${(hue + 60) % 360},85%,78%)`; c.beginPath(); c.arc(90, 38, 16, 0, 7); c.fill();
  });
  g.add(mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex }), 0, 0, 0.045, false));
  g.position.set(x, y, z); return g;
}
function wallLamp(x, y, z = -4.9) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.12, 0.4, 0.14), lam(0x4a4038), 0, -0.1, 0));
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff0a8 });
  g.add(mesh(new THREE.SphereGeometry(0.17, 16, 12), bulbMat, 0, 0.2, 0.12, false));
  g.position.set(x, y, z); g.userData.bulb = bulbMat; return g;
}
function pedestal() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.85, 1.05, 0.85), lam(0xe9e4dc), 0, 0.525, 0));
  g.add(mesh(new THREE.BoxGeometry(1.05, 0.1, 1.05), lam(0xf6f2ea), 0, 1.1, 0));
  g.add(mesh(new THREE.BoxGeometry(1.0, 0.12, 1.0), lam(0xd9d3c8), 0, 0.06, 0));
  g.add(mesh(new THREE.BoxGeometry(0.6, 0.1, 0.6), lam(0xb3122b), 0, 1.2, 0));
  return g;
}
function trophy() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffc934, metalness: 0.25, roughness: 0.35, emissive: 0x7a4a00, emissiveIntensity: 0.55, side: THREE.DoubleSide });
  const pts = [[0, 0], [0.2, 0], [0.2, 0.05], [0.07, 0.1], [0.05, 0.28], [0.09, 0.33], [0.22, 0.45], [0.27, 0.62], [0.28, 0.74]].map((p) => new THREE.Vector2(p[0], p[1]));
  g.add(mesh(new THREE.LatheGeometry(pts, 28), mat));
  for (const s of [-1, 1]) { const h = mesh(new THREE.TorusGeometry(0.12, 0.028, 8, 18, Math.PI), mat, s * 0.27, 0.56, 0); h.rotation.z = -s * Math.PI / 2; g.add(h); }
  g.add(mesh(new THREE.BoxGeometry(0.34, 0.08, 0.34), lam(0x3a2a1e), 0, -0.04, 0));
  return g;
}
function numberSprite(n) {
  const tex = canvasTex(128, 128, (c) => {
    c.fillStyle = '#1b1b28'; c.beginPath(); c.roundRect(8, 8, 112, 112, 22); c.fill();
    c.fillStyle = '#ffd21f'; c.font = '900 92px Poppins'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), 64, 70);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex })); s.scale.set(0.5, 0.5, 1); return s;
}

// ---------- Figuren ----------
function makeChar(o) {
  const g = new THREE.Group(); const c = { g };
  const skin = lam(o.skin ?? 0xf0b98d), top = lam(o.top), bottom = lam(o.bottom ?? o.top), shoe = lam(o.shoes ?? 0x2a2a30);
  c.legs = [-1, 1].map((sx) => {
    const p = new THREE.Group(); p.position.set(sx * 0.14, 0.8, 0);
    p.add(mesh(new THREE.CapsuleGeometry(0.105, 0.5, 6, 12), bottom, 0, -0.36, 0));
    const s = mesh(new THREE.SphereGeometry(0.13, 12, 10), shoe, 0, -0.72, 0.07); s.scale.set(1, 0.6, 1.6); p.add(s);
    g.add(p); return p;
  });
  c.torso = mesh(new THREE.CapsuleGeometry(0.3, 0.42, 8, 20), top, 0, 1.15, 0); c.torso.scale.set(o.wide ?? 1, 1, 0.82); g.add(c.torso);
  c.head = new THREE.Group(); c.head.position.set(0, 1.8, 0); g.add(c.head);
  const hd = mesh(new THREE.SphereGeometry(0.3, 28, 22), skin); hd.scale.set(1, 1.04, 0.96); c.head.add(hd);
  c.eyes = []; c.pupils = []; c.brows = [];
  for (const sx of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(sx * 0.115, 0.05, 0.25);
    const w = mesh(new THREE.SphereGeometry(0.088, 16, 14), new THREE.MeshLambertMaterial({ color: 0xffffff }), 0, 0, 0, false); w.scale.z = 0.55; e.add(w);
    const p = mesh(new THREE.SphereGeometry(0.04, 12, 10), new THREE.MeshBasicMaterial({ color: 0x111118 }), 0, 0, 0.043, false); e.add(p);
    c.head.add(e); c.eyes.push(e); c.pupils.push(p);
    const b = mesh(new THREE.BoxGeometry(0.14, 0.03, 0.03), lam(o.brow ?? 0x3a2a1e), sx * 0.115, 0.185, 0.265, false); c.head.add(b); c.brows.push(b);
  }
  c.head.add(mesh(new THREE.SphereGeometry(0.048, 12, 10), lam(o.nose ?? 0xe0a276), 0, -0.035, 0.295, false));
  c.mouth = mesh(new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshBasicMaterial({ color: 0x4a1418 }), 0, -0.155, 0.262, false); c.mouth.scale.set(1.1, 0.18, 0.3); c.head.add(c.mouth);
  if (o.hair !== null) { const h = mesh(new THREE.SphereGeometry(0.318, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), lam(o.hair ?? 0x5a3a22), 0, 0.02, -0.01); h.rotation.x = -0.28; c.head.add(h); c.hair = h; }
  c.arms = [-1, 1].map((sx) => {
    const p = new THREE.Group(); p.position.set(sx * 0.38 * (o.wide ?? 1), 1.5, 0); p.rotation.z = sx * 0.13;
    p.add(mesh(new THREE.CapsuleGeometry(0.085, 0.46, 6, 12), top, 0, -0.3, 0));
    p.add(mesh(new THREE.SphereGeometry(0.1, 12, 10), skin, 0, -0.66, 0));
    g.add(p); return p;
  });
  c.armL = c.arms[0]; c.armR = c.arms[1]; // L = links im Bild (x<0), wenn die Figur zur Kamera schaut
  return c;
}
function restPose(c) {
  c.g.position.y = 0; c.head.rotation.set(0, 0, 0);
  c.arms.forEach((a, i) => a.rotation.set(0, 0, (i ? 1 : -1) * 0.13));
  c.legs.forEach((l) => l.rotation.set(0, 0, 0));
  c.mouth.scale.set(1.1, 0.18, 0.3); c.eyes.forEach((e) => e.scale.set(1, 1, 1)); c.pupils.forEach((p) => p.position.set(0, 0, 0.043));
  c.brows.forEach((b, i) => { b.rotation.z = 0; b.position.y = 0.185; });
}
function blink(c, t, phase = 0) { const k = ((t + phase) % 2.9) < 0.1 ? 0.12 : 1; c.eyes.forEach((e) => (e.scale.y = k)); }
function talk(c, t, on) { c.mouth.scale.y = on ? 0.35 + 0.75 * Math.abs(Math.sin(t * 15) * Math.sin(t * 6.3 + 1)) : 0.18; c.mouth.scale.x = on ? 0.95 : 1.1; }
function walk(c, t, speed = 9) { const s = Math.sin(t * speed); c.legs[0].rotation.x = s * 0.6; c.legs[1].rotation.x = -s * 0.6; c.arms[0].rotation.x = -s * 0.5; c.arms[1].rotation.x = s * 0.5; c.g.position.y = Math.abs(Math.cos(t * speed)) * 0.05; }
const speaking = (t, id) => t >= U[id].start && t <= U[id].end;

function makeDetective() {
  const c = makeChar({ top: 0xb98649, bottom: 0x4a3b2e, shoes: 0x2b1d12, hair: 0x6b3d1c });
  const coat = mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.5, 20), lam(0xb98649), 0, 0.78, 0); coat.scale.z = 0.85; c.g.add(coat);
  c.g.add(mesh(new THREE.CylinderGeometry(0.305, 0.305, 0.07, 20), lam(0x4a3320), 0, 1.02, 0).translateZ(0)).scale.z = 0.85;
  const col = mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 18), lam(0xa57338), 0, 1.5, 0.02); col.rotation.x = Math.PI / 2; c.g.add(col);
  const hat = new THREE.Group();
  hat.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 26), lam(0x5a3a1f), 0, 0, 0));
  hat.add(mesh(new THREE.CylinderGeometry(0.24, 0.29, 0.25, 22), lam(0x5a3a1f), 0, 0.13, 0));
  hat.add(mesh(new THREE.CylinderGeometry(0.295, 0.295, 0.07, 22), lam(0x2a1a10), 0, 0.05, 0));
  hat.position.set(0, 0.21, 0); hat.rotation.x = -0.1; c.head.add(hat);
  // Lupe in der rechten Hand (zeigt bei nach vorn gestrecktem Arm nach oben)
  const mag = new THREE.Group();
  const hdl = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.26, 10), lam(0x2a1a10), 0, 0, 0.16); hdl.rotation.x = Math.PI / 2; mag.add(hdl);
  mag.add(mesh(new THREE.TorusGeometry(0.16, 0.028, 10, 26), lam(0x2a2a30), 0, 0, 0.44).rotateY(0));
  const lens = mesh(new THREE.CircleGeometry(0.15, 24), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }), 0, 0, 0.44, false); mag.add(lens);
  mag.children[1].rotation.x = Math.PI / 2; lens.rotation.x = Math.PI / 2;
  mag.position.set(0, -0.66, 0); c.arms[1].add(mag); c.mag = mag;
  return c;
}
function makeGuard() {
  const c = makeChar({ top: 0x2b4aa0, bottom: 0x1c2c5e, hair: 0x3a2a1e });
  c.g.add(mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.08, 20), lam(0x15151c), 0, 0.95, 0)).scale.z = 0.84;
  c.g.add(mesh(new THREE.BoxGeometry(0.1, 0.09, 0.03), lam(0xffd21f), 0, 0.95, 0.265, false));
  c.g.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), lam(0xffd21f), -0.14, 1.36, 0.245, false));
  const cap = new THREE.Group();
  cap.add(mesh(new THREE.CylinderGeometry(0.3, 0.29, 0.16, 22), lam(0x1c2c5e), 0, 0.02, 0));
  const visor = mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.03, 20, 1, false, -Math.PI / 2, Math.PI), lam(0x101018), 0, -0.05, 0.1); visor.scale.z = 1.25; cap.add(visor);
  cap.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), lam(0xffd21f), 0, 0.03, 0.29, false));
  cap.position.set(0, 0.25, 0); c.head.add(cap);
  return c;
}
function makeCleaner() {
  const c = makeChar({ top: 0x21a69a, bottom: 0x21a69a, shoes: 0xffffff, hair: 0xd9344a, skin: 0xf3c4a0, brow: 0x5a3a22 });
  const skirt = mesh(new THREE.CylinderGeometry(0.3, 0.46, 0.55, 20), lam(0x21a69a), 0, 0.72, 0); skirt.scale.z = 0.85; c.g.add(skirt);
  c.g.add(mesh(new THREE.BoxGeometry(0.36, 0.62, 0.03), lam(0xffffff), 0, 0.98, 0.3, false));
  c.hair.scale.set(1.03, 1.05, 1.03);
  c.head.add(mesh(new THREE.SphereGeometry(0.1, 10, 8), lam(0xd9344a), 0, 0.1, -0.31));
  for (const sx of [-1, 1]) c.head.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), lam(0xf59aa0), sx * 0.2, -0.07, 0.2, false));
  // Kerze in der rechten Hand
  const candle = new THREE.Group();
  candle.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.03, 14), lam(0xc9a227), 0, 0.02, 0));
  candle.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 10), lam(0xfff6e0), 0, 0.13, 0));
  const flame = mesh(new THREE.SphereGeometry(0.045, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffb02e }), 0, 0.29, 0, false); flame.scale.y = 1.8; candle.add(flame);
  const fl = new THREE.PointLight(0xffa040, 2.5, 4, 1.5); fl.position.set(0, 0.3, 0.1); candle.add(fl);
  candle.position.set(0, -0.72, 0); c.arms[1].add(candle); c.candle = candle; c.flame = flame; c.flameLight = fl;
  // Wischmopp
  const mop = new THREE.Group();
  mop.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.7, 8), lam(0xb07a3c), 0, 0.85, 0));
  const head = mesh(new THREE.SphereGeometry(0.2, 12, 10), lam(0xe8e8f0), 0, 0.08, 0); head.scale.set(1.3, 0.45, 0.8); mop.add(head);
  mop.position.set(-0.62, 0, 0.12); mop.rotation.z = -0.1; c.g.add(mop);
  return c;
}
function makeDirector() {
  const c = makeChar({ top: 0x3b3e4c, bottom: 0x2c2e3a, hair: 0xb9bcc6, wide: 1.12, brow: 0x8a8d96 });
  c.g.add(mesh(new THREE.BoxGeometry(0.17, 0.34, 0.03), lam(0xffffff), 0, 1.36, 0.26, false));
  c.g.add(mesh(new THREE.BoxGeometry(0.07, 0.3, 0.035), lam(0xd9263a), 0, 1.33, 0.275, false));
  const gm = lam(0x15151c);
  for (const sx of [-1, 1]) c.head.add(mesh(new THREE.TorusGeometry(0.1, 0.016, 8, 20), gm, sx * 0.115, 0.05, 0.3, false));
  c.head.add(mesh(new THREE.BoxGeometry(0.05, 0.016, 0.016), gm, 0, 0.06, 0.305, false));
  const mo = mesh(new THREE.BoxGeometry(0.2, 0.05, 0.05), lam(0x9a9da6), 0, -0.09, 0.285, false); c.head.add(mo);
  return c;
}

// ---------- Einblendungen ----------
const ui = document.getElementById('ui');
const caps = [];
const COL = { white: '#ffffff', yellow: '#ffd21f', red: '#ff4747', green: '#3dff7a', blue: '#6fb0ff', purple: '#c29bff', orange: '#ff9a3d' };
function cap(html, top, size, color, tin, tout, o = {}) {
  const el = document.createElement('div');
  el.className = 'cap' + (o.thin ? ' thin' : '');
  el.style.top = top + 'px'; el.style.fontSize = size + 'px'; el.style.color = COL[color] ?? color;
  el.innerHTML = html; ui.appendChild(el);
  const c = { el, tin, tout, pulse: o.pulse ?? 0 }; caps.push(c); return c;
}
const hl = (txt, color, scale = 1.25) => `<span style="color:${COL[color]};font-weight:900;font-size:${scale}em">${txt}</span>`;
function updateCaps(t) {
  for (const c of caps) {
    if (t < c.tin || t >= c.tout) { c.el.style.opacity = 0; continue; }
    const k = (t - c.tin) / 0.2;
    let s = 0.55 + 0.45 * backOut(k);
    if (c.pulse) s *= 1 + c.pulse * Math.sin((t - c.tin) * 9);
    c.el.style.opacity = clamp(k * 2.5); c.el.style.transform = `scale(${s.toFixed(4)})`;
  }
}

const scenes = {};
const mkCam = (fov = 40) => new THREE.PerspectiveCamera(fov, W / H, 0.1, 80);

// ===== 1. Hook =====
{
  const S = SC.hook, scene = new THREE.Scene(), cam = mkCam();
  scene.background = new THREE.Color(0x191a2b);
  scene.add(makeRoom(0xf4efe9));
  addLights(scene, { hemi: 1.7, dir: 2.0 });
  const ped = pedestal(); ped.position.set(0, 0, -2.4); scene.add(ped);
  const cone = mesh(new THREE.ConeGeometry(1.1, 5.5, 28, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }), 0, 3.9, -2.4, false); scene.add(cone);
  scene.add(painting(-2.6, 2.6, 1.3, 1.0, 3), painting(2.6, 2.6, 1.3, 1.0, 8), wallLamp(-1.3, 3.2), wallLamp(1.3, 3.2));
  const det = makeDetective(); det.g.rotation.y = Math.PI; scene.add(det.g);
  cap('1 DIEBSTAHL', 150, 124, 'white', U.hook1.start, S.end);
  cap('3 VERDÄCHTIGE', 290, 112, 'yellow', U.hook2.start, S.end);
  cap('Nur einer lügt …', 1290, 68, 'white', U.hook3.start, S.end, { thin: true });
  scenes.hook = { scene, cam, update(t) {
    const k = prog(t, S.start, S.end - S.start), z = lerp(3.4, 0.6, k);
    restPose(det); walk(det, t); det.g.position.z = z; det.g.position.x = 0.6;
    cam.position.set(-0.7, 2.7, z + 4.7); cam.lookAt(0.25, 1.45, z - 2.6);
  } };
}

// ===== 2. Die Tat =====
{
  const S = SC.crime, scene = new THREE.Scene(), cam = mkCam();
  scene.background = new THREE.Color(0x0c0d18);
  scene.add(makeRoom(0xf4efe9));
  const L = addLights(scene, { hemi: 1.7, dir: 2.0 });
  const ped = pedestal(); ped.position.set(0, 0, -2.4); scene.add(ped);
  const tr = trophy(); tr.position.set(0, 1.29, -2.4); scene.add(tr);
  const lamps = [wallLamp(-1.5, 3.3), wallLamp(1.5, 3.3)]; scene.add(...lamps);
  scene.add(painting(-2.7, 2.5, 1.3, 1.0, 3), painting(2.7, 2.5, 1.3, 1.0, 8));
  const thief = makeChar({ top: 0x0a0a10, bottom: 0x0a0a10, skin: 0x0a0a10, hair: 0x0a0a10, shoes: 0x0a0a10, nose: 0x0a0a10, brow: 0x0a0a10 });
  thief.eyes.forEach((e) => (e.children[0].material = new THREE.MeshBasicMaterial({ color: 0xffffff }))); thief.mouth.visible = false;
  thief.g.rotation.y = -Math.PI / 2; scene.add(thief.g);
  const morning = U.crime3.start - 0.12, off = T.powerOff;
  cap('MITTERNACHT', 150, 118, 'white', U.crime1.start, morning);
  cap('STROMAUSFALL!', 290, 104, 'yellow', off, morning);
  cap('AM NÄCHSTEN MORGEN …', 175, 66, 'white', morning, S.end, { thin: true });
  cap('Der goldene Pokal ist', 1285, 62, 'white', U.crime3.start, S.end, { thin: true });
  cap('VERSCHWUNDEN!', 1365, 104, 'red', lerp(U.crime3.start, U.crime3.end, 0.6), S.end);
  scenes.crime = { scene, cam, flashAt: [off, off + 0.5, morning], update(t) {
    const k = prog(t, S.start, S.end - S.start);
    cam.position.set(0, 2.0, lerp(4.6, 2.9, ease(k))); cam.lookAt(0, 1.75, -2.4);
    const dark = t >= off && t < morning, day = t >= morning;
    const bolt = (dark && ((t - off) < 0.09 || (t - off > 0.5 && t - off < 0.6))) ? 1 : 0;
    L.hemi.color.set(dark ? 0x6f86ff : 0xfff4e6); L.hemi.intensity = dark ? 0.22 + bolt * 3.2 : day ? 2.1 : 1.6;
    L.dir.color.set(dark ? 0x7f95ff : day ? 0xfff6e8 : 0xffe6bd); L.dir.intensity = dark ? 0.25 + bolt * 2 : day ? 2.4 : 1.9;
    lamps.forEach((l) => l.userData.bulb.color.set(dark ? 0x3a3a48 : 0xfff0a8));
    scene.background.set(dark ? 0x05060c : 0x191a2b);
    const steal = off + 1.0;
    tr.visible = t < steal;
    tr.rotation.y = t * 0.8;
    thief.g.visible = dark;
    if (dark) { const kk = prog(t, off + 0.15, 1.6); restPose(thief); walk(thief, t, 12); thief.g.position.set(lerp(3.6, -3.4, kk), thief.g.position.y, -1.5); thief.g.rotation.y = -Math.PI / 2; }
    if (day) { cam.position.x += Math.sin(t * 40) * 0.012 * (1 - prog(t, morning, 0.5)); }
  } };
}

// ===== 3. Der Detektiv =====
{
  const S = SC.det, scene = new THREE.Scene(), cam = mkCam();
  scene.background = new THREE.Color(0x191a2b);
  scene.add(makeRoom(0xf4efe9));
  addLights(scene, { hemi: 1.9, dir: 2.1, dirPos: [2, 6, 7] });
  scene.add(painting(-1.6, 2.7, 1.2, 0.9, 5), painting(1.7, 2.9, 1.0, 1.2, 12));
  const det = makeDetective(); scene.add(det.g);
  cap('DETEKTIV FUCHS', 150, 108, 'yellow', U.det1.start, S.end);
  cap(`befragt ${hl('3 VERDÄCHTIGE', 'yellow', 1.15)}`, 1310, 62, 'white', lerp(U.det1.start, U.det1.end, 0.42), S.end, { thin: true });
  scenes.det = { scene, cam, update(t) {
    const k = prog(t, S.start, S.end - S.start), r = easeOut(prog(t, S.start + 0.15, 0.55));
    restPose(det); blink(det, t);
    det.armR.rotation.x = -1.72 * r; det.armR.rotation.z = lerp(0.13, -0.42, r); det.armR.rotation.y = 0;
    det.head.rotation.z = 0.08 * r; det.head.rotation.y = -0.12 * r + Math.sin(t * 2) * 0.04;
    det.brows[1].position.y = 0.185 + 0.035 * r; det.brows[0].rotation.z = -0.25 * r;
    det.g.position.y = Math.sin(t * 3) * 0.01;
    cam.position.set(lerp(0.35, 0.15, k), 1.84, lerp(3.0, 2.6, ease(k))); cam.lookAt(0, 1.74, 0);
  } };
}

// ===== 4.–6. Die Verdächtigen =====
function suspectScene(id, nr, title, color, wall, glow, maker, quote, pose) {
  const S = SC[id], scene = new THREE.Scene(), cam = mkCam();
  scene.background = new THREE.Color(0x101018);
  scene.add(makeRoom(wall, wall));
  const L = addLights(scene, { hemi: 1.25, dir: 1.7, sky: glow, ground: 0x554f66, dirPos: [2, 6, 7] });
  const pl = new THREE.PointLight(glow, 30, 12, 1.6); pl.position.set(0, 3.2, -3.2); scene.add(pl);
  scene.add(painting(-1.9, 3.0, 1.1, 0.9, 20 + nr), wallLamp(1.9, 3.1));
  const c = maker(); scene.add(c.g);
  const q = U[id + 'q'], n = U[id + 'n'];
  cap(`VERDÄCHTIGER ${nr}`, 135, 60, 'white', n.start, S.end, { thin: true });
  cap(title, 212, 108, color, lerp(n.start, n.end, 0.25), S.end);
  cap(quote[0], 1300, 60, 'white', q.start, S.end, { thin: true });
  cap(quote[1], 1378, 60, 'white', lerp(q.start, q.end, 0.45), S.end, { thin: true });
  scenes[id] = { scene, cam, c, update(t) {
    const k = prog(t, S.start, S.end - S.start), on = speaking(t, id + 'q');
    restPose(c); blink(c, t, nr); talk(c, t, on);
    c.g.position.y = Math.abs(Math.sin(t * 7)) * (on ? 0.025 : 0.008);
    c.head.rotation.y = Math.sin(t * 2.3) * 0.08;
    pose(c, t, on, prog(t, q.start, 0.35));
    cam.position.set(lerp(-0.25, 0.25, k), 1.72, lerp(3.45, 3.0, ease(k))); cam.lookAt(0, 1.5, 0);
  } };
}
suspectScene('s1', 1, 'DER WACHMANN', 'yellow', 0xbfd0ff, 0x5a8cff, makeGuard,
  ['„Ich steckte die ganze Nacht', `im ${hl('AUFZUG', 'yellow')} fest!“`],
  (c, t, on, k) => { const e = easeOut(k); c.armL.rotation.z = -0.13 - 1.0 * e; c.armR.rotation.z = 0.13 + 1.0 * e; c.armL.rotation.x = c.armR.rotation.x = -0.5 * e; c.brows.forEach((b, i) => { b.position.y = 0.185 + 0.04 * e; b.rotation.z = (i ? -1 : 1) * 0.25 * e; }); c.head.rotation.z = Math.sin(t * 5) * 0.05 * e; });
suspectScene('s2', 2, 'DIE PUTZFRAU', 'yellow', 0xdcc8ff, 0xa06bff, makeCleaner,
  ['„Ich habe bei ' + hl('KERZENLICHT', 'yellow', 1.15), 'den Boden gewischt.“'],
  (c, t, on, k) => { const e = easeOut(k); c.armR.rotation.x = -1.15 - 0.25 * e; c.armR.rotation.z = 0.25; c.candle.rotation.x = -c.armR.rotation.x; c.candle.rotation.z = -0.25; c.flame.scale.set(1 + Math.sin(t * 23) * 0.12, 1.8 + Math.sin(t * 17) * 0.25, 1); c.flameLight.intensity = 2.5 + Math.sin(t * 19) * 0.5; c.armL.rotation.z = -0.55; c.armL.rotation.x = -0.25; c.head.rotation.z = 0.06 * Math.sin(t * 4); });
suspectScene('s3', 3, 'DER DIREKTOR', 'yellow', 0xffcdb8, 0xff6a4a, makeDirector,
  ['„Ich habe die ganze Nacht', `im Büro ${hl('FERNGESEHEN', 'yellow', 1.15)}.“`],
  (c, t, on, k) => { const e = easeOut(k); c.armR.rotation.x = -1.3 * e; c.armR.rotation.z = 0.13 + 0.5 * e + Math.sin(t * 8) * 0.15 * e; c.armL.rotation.z = -0.75; c.armL.rotation.x = 0.1; c.brows.forEach((b, i) => { b.rotation.z = (i ? 1 : -1) * 0.2; }); c.head.rotation.z = -0.07 * e; });

// ===== 7.–9. Gegenüberstellung: Frage, Countdown, Auflösung =====
{
  const scene = new THREE.Scene(), cam = mkCam();
  scene.background = new THREE.Color(0x191a2b);
  const room = makeRoom(0xf4efe9); scene.add(room);
  const L = addLights(scene, { hemi: 1.8, dir: 2.1 });
  const green = new THREE.PointLight(0x3dff7a, 0, 14, 1.4); green.position.set(1, 3.5, 0.5); scene.add(green);
  scene.add(painting(-2.7, 3.2, 1.3, 1.0, 3), painting(2.7, 3.2, 1.3, 1.0, 8), wallLamp(-1.0, 3.6), wallLamp(1.0, 3.6));
  const X = [-1.0, 0, 1.0], Z = -1.6;
  const sus = [makeGuard(), makeCleaner(), makeDirector()];
  sus.forEach((c, i) => { c.g.position.set(X[i], 0, Z); scene.add(c.g); const n = numberSprite(i + 1); n.position.set(X[i], 2.62, Z); scene.add(n); c.num = n; });
  const det = makeDetective(); det.g.position.set(0, 0, 1.7); det.g.rotation.y = Math.PI; scene.add(det.g);
  const tr = trophy(); scene.add(tr);
  const Q = SC.q, C = SC.cd, R = SC.rev, c0 = T.countdownStart;
  cap('WER IST', 150, 124, 'white', U.q1.start, C.start);
  cap('DER DIEB?', 290, 124, 'yellow', lerp(U.q1.start, U.q1.end, 0.4), C.start);
  const bar = document.createElement('div'); bar.className = 'bar'; ui.insertBefore(bar, ui.firstChild);
  cap('DU HAST 5 SEKUNDEN', 62, 64, 'white', C.start, C.end, { thin: true });
  cap('Schreib deine Antwort', 1300, 60, 'white', U.cd2.start, C.end, { thin: true });
  cap(`in die ${hl('KOMMENTARE!', 'yellow', 1.15)}`, 1375, 62, 'white', lerp(U.cd2.start, U.cd2.end, 0.4), C.end, { thin: true });
  cap('<span class="pill" style="background:#ff2d55;font-size:46px">♥ LIKEN</span><span class="pill" style="background:#22222e;font-size:46px">+ FOLGEN</span>', 1500, 38, 'white', U.cd2.end - 0.2, C.end, { thin: true });
  cap('AUFLÖSUNG', 150, 104, 'white', U.rev1.start, R.end);
  cap('DER DIREKTOR!', 275, 116, 'green', U.rev2.start, R.end, { pulse: 0.03 });
  const ring = document.getElementById('ring'), arc = document.getElementById('ringArc'), num = document.getElementById('ringNum');
  const wide = { p: [0, 2.6, 7.0], l: [0, 1.95, -0.6] };
  const close = (i) => ({ p: [X[i] * 0.75, 1.92, 1.05], l: [X[i], 1.78, Z] });
  const setCam = (a, b, k) => { cam.position.set(lerp(a.p[0], b.p[0], k), lerp(a.p[1], b.p[1], k), lerp(a.p[2], b.p[2], k)); cam.lookAt(lerp(a.l[0], b.l[0], k), lerp(a.l[1], b.l[1], k), lerp(a.l[2], b.l[2], k)); };
  const cdCuts = [1, 2, 3].map((i) => c0 + i).concat([c0 + 4]);
  function update(t) {
    const inCd = t >= C.start && t < R.start, inRev = t >= R.start;
    sus.forEach((c, i) => { restPose(c); blink(c, t, i * 0.7); c.g.position.set(X[i], Math.abs(Math.sin(t * 6 + i)) * 0.01, Z); c.g.rotation.y = 0; c.num.visible = !inRev; });
    // feste Requisiten-Posen
    sus[1].armR.rotation.x = -1.15; sus[1].armR.rotation.z = 0.25; sus[1].candle.rotation.x = 1.15; sus[1].candle.rotation.z = -0.25; sus[1].armL.rotation.z = -0.55; sus[1].armL.rotation.x = -0.25;
    sus[1].flame.scale.set(1 + Math.sin(t * 23) * 0.12, 1.8 + Math.sin(t * 17) * 0.25, 1);
    restPose(det); det.g.position.set(0, 0, 1.7);
    det.armR.rotation.x = -2.75; det.armR.rotation.z = -0.3 + Math.sin(t * 9) * 0.12; det.head.rotation.z = Math.sin(t * 2.2) * 0.1;
    L.hemi.color.set(0xfff4e6); L.hemi.intensity = 1.8; green.intensity = 0; tr.visible = false;
    bar.style.opacity = inCd ? 1 : 0; ring.style.opacity = inCd && t >= c0 - 0.2 ? 1 : 0;
    det.g.visible = false;
    if (!inCd && !inRev) { setCam(wide, wide, 0); cam.position.z -= prog(t, Q.start, Q.end - Q.start) * 0.4; }
    if (inCd) {
      const e = clamp(t - c0, 0, T.countdownLen - 0.001), sec = Math.floor(e), n = 5 - sec, f = e - sec;
      num.textContent = n; num.setAttribute('fill', n <= 2 ? '#ff4747' : '#ffffff');
      arc.setAttribute('stroke-dashoffset', (804.2 * (e / T.countdownLen)).toFixed(1));
      ring.style.transform = `scale(${(1 + 0.12 * Math.max(0, 1 - f * 5)).toFixed(3)})`;
      sus.forEach((c, i) => { c.pupils.forEach((p) => (p.position.x = Math.sin(t * 7 + i * 2) * 0.03)); c.brows.forEach((b, j) => { b.rotation.z = (j ? -1 : 1) * 0.22; b.position.y = 0.2; }); });
      if (sec >= 1 && sec <= 3) { const cl = close(sec - 1); det.g.visible = false; setCam(cl, cl, 0); cam.position.z -= f * 0.18; }
      else { setCam(wide, wide, 0); cam.position.z -= (sec === 4 ? 0.9 * f : 0.4 + 0.2 * f); }
    }
    if (inRev) {
      const hit = U.rev2.start, k = easeOut(prog(t, hit - 0.08, 0.4)), d = sus[2];
      const cl = { p: [0.8, 1.85, 2.3], l: [1.12, 1.5, Z] };
      const w2 = { p: [0, 2.6, 6.6], l: [0, 1.95, -0.6] };
      setCam(w2, cl, k);
      
      const g = clamp((t - hit) / 0.25);
      green.intensity = 26 * g; L.hemi.color.set(0xfff4e6).lerp(new THREE.Color(0xc8ffd8), g);
      if (t >= hit) {
        const j = t - hit;
        d.g.position.y = Math.max(0, Math.sin(Math.min(j, 0.5) * Math.PI / 0.5)) * 0.28 + Math.abs(Math.sin(t * 11)) * 0.015;
        d.armL.rotation.z = -0.13 - 2.5 * easeOut(j / 0.2); d.armR.rotation.z = 0.13 + 2.5 * easeOut(j / 0.2);
        d.mouth.scale.set(0.9, 1.25, 0.3); d.eyes.forEach((e) => e.scale.set(1.25, 1.25, 1)); d.brows.forEach((b) => (b.position.y = 0.23));
        d.pupils.forEach((p) => (p.position.x = Math.sin(t * 20) * 0.012));
        sus[0].g.rotation.y = 0.7 * easeOut(j / 0.3); sus[1].g.rotation.y = 0.9 * easeOut(j / 0.3);
        sus[0].armR.rotation.x = -1.5 * easeOut(j / 0.3); sus[0].armR.rotation.z = 0.5;
        // der Pokal faellt ihm aus dem Jackett
        const fall = clamp(j / 0.45), yy = lerp(1.25, 0.06, fall * fall) + (j > 0.45 ? Math.abs(Math.sin((j - 0.45) * 9)) * 0.22 * Math.exp(-(j - 0.45) * 4) : 0);
        tr.visible = true; tr.position.set(X[2] + 0.62, yy, Z + 0.25); tr.rotation.z = (1 - fall) * 1.2; tr.rotation.y = j * 2;
      }
    }
  }
  const s = { scene, cam, update, flashAt: cdCuts.concat([U.rev2.start - 0.05]) };
  scenes.q = scenes.cd = scenes.rev = s;
}

// ===== 10. Erklärung: kein Strom, kein Fernseher =====
{
  const S = SC.exp, scene = new THREE.Scene(), cam = mkCam();
  scene.background = new THREE.Color(0x0a0b16);
  scene.add(makeRoom(0x9fb0e8, 0xa9b4dc));
  addLights(scene, { hemi: 0.75, dir: 0.7, sky: 0x8fa4ff, ground: 0x30344e, dirColor: 0x9fb4ff, dirPos: [-3, 6, 6] });
  const grp = new THREE.Group(); grp.position.z = -1.2; scene.add(grp);
  grp.add(mesh(new THREE.BoxGeometry(2.0, 0.12, 0.8), lam(0x8a5a2b), 0, 0.8, 0));
  for (const sx of [-1, 1]) grp.add(mesh(new THREE.BoxGeometry(0.12, 0.8, 0.7), lam(0x6f4722), sx * 0.85, 0.4, 0));
  grp.add(mesh(new THREE.BoxGeometry(1.45, 0.9, 0.1), lam(0x1b1c26), 0, 1.5, 0));
  grp.add(mesh(new THREE.PlaneGeometry(1.3, 0.75), new THREE.MeshBasicMaterial({ color: 0x07080d }), 0, 1.5, 0.052, false));
  const shine = mesh(new THREE.PlaneGeometry(0.16, 0.9), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05 }), -0.3, 1.5, 0.055, false); shine.rotation.z = -0.5; shine.scale.y = 0.8; grp.add(shine);
  grp.add(mesh(new THREE.BoxGeometry(0.5, 0.12, 0.25), lam(0x1b1c26), 0, 0.98, 0));
  grp.add(mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshBasicMaterial({ color: 0x3a0d0d }), 0.62, 1.1, 0.055, false));
  // Kerze daneben
  const candle = new THREE.Group();
  candle.add(mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.03, 14), lam(0xc9a227), 0, 0.015, 0));
  candle.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.26, 10), lam(0xfff6e0), 0, 0.16, 0));
  const flame = mesh(new THREE.SphereGeometry(0.05, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffb02e }), 0, 0.35, 0, false); candle.add(flame);
  const fl = new THREE.PointLight(0xffa040, 6, 7, 1.4); fl.position.set(0, 0.4, 0.25); candle.add(fl);
  candle.position.set(-0.78, 0.86, 0.22); grp.add(candle);
  // herausgezogener Stecker
  grp.add(mesh(new THREE.BoxGeometry(0.22, 0.22, 0.04), lam(0xf2f2f2), 1.5, 0.5, -3.72 + 0.0, false));
  const xm = document.getElementById('xmark');
  const xin = lerp(U.exp1.start, U.exp1.end, 0.72);
  cap('KEIN STROM', 150, 120, 'white', U.exp1.start, S.end);
  cap('= KEIN FERNSEHER!', 292, 92, 'yellow', lerp(U.exp1.start, U.exp1.end, 0.45), S.end);
  cap(`Er hat ${hl('GELOGEN!', 'red', 1.3)}`, 1330, 74, 'white', U.exp2.start, S.end, { thin: true });
  scenes.exp = { scene, cam, xm, flashAt: [xin], update(t) {
    const k = prog(t, S.start, S.end - S.start);
    flame.scale.set(1 + Math.sin(t * 23) * 0.12, 1.9 + Math.sin(t * 17) * 0.3, 1); fl.intensity = 6 + Math.sin(t * 19) * 1.2;
    cam.position.set(lerp(-0.2, 0.2, k), 1.55, lerp(3.2, 2.7, ease(k))); cam.lookAt(0, 1.42, -1.2);
    const a = (t - xin) / 0.22;
    xm.style.opacity = t >= xin ? 1 : 0; xm.style.transform = `scale(${(0.4 + 0.6 * backOut(a)).toFixed(3)}) rotate(${(-8 + 8 * clamp(a)).toFixed(2)}deg)`;
  } };
}

// ===== 11. Abschluss =====
{
  const S = SC.cta, scene = new THREE.Scene(), cam = mkCam();
  scene.background = new THREE.Color(0x191a2b);
  scene.add(makeRoom(0xe9fff0, 0xf0fff4));
  addLights(scene, { hemi: 2.0, dir: 2.2, sky: 0xeafff0 });
  const gl = new THREE.PointLight(0x3dff7a, 30, 12, 1.5); gl.position.set(0, 3, -3); scene.add(gl);
  scene.add(painting(-1.9, 3.3, 1.1, 0.9, 30), painting(1.9, 3.3, 1.1, 0.9, 31));
  const det = makeDetective(); scene.add(det.g);
  const tr = trophy(); tr.scale.setScalar(1.15); scene.add(tr);
  const r = rng(99), conf = [];
  const colors = [0xffd21f, 0xff4747, 0x3dff7a, 0x6fb0ff, 0xc29bff, 0xffffff];
  for (let i = 0; i < 110; i++) {
    const m = mesh(new THREE.PlaneGeometry(0.09, 0.14), new THREE.MeshBasicMaterial({ color: colors[i % 6], side: THREE.DoubleSide }), 0, 0, 0, false);
    m.userData = { x: (r() - 0.5) * 4.2, z: (r() - 0.5) * 3 + 0.3, y0: 3.4 + r() * 4.5, v: 1.3 + r() * 1.2, p: r() * 6.28, s: 2 + r() * 4 };
    conf.push(m); scene.add(m);
  }
  cap('RICHTIG GELÖST?', 150, 106, 'yellow', U.cta1.start, S.end);
  cap('Mehr Rätsel?', 1310, 70, 'white', U.cta2.start, S.end, { thin: true });
  cap('<span class="pill" style="background:#ff2d55;font-size:50px;padding:20px 46px">+ JETZT FOLGEN</span>', 1415, 50, 'white', lerp(U.cta2.start, U.cta2.end, 0.3), S.end, { thin: true, pulse: 0.045 });
  scenes.cta = { scene, cam, update(t) {
    const lt = t - S.start, k = prog(t, S.start, S.end - S.start);
    restPose(det); blink(det, t);
    const j = Math.abs(Math.sin(lt * 5.2)) * 0.22;
    det.g.position.y = j; det.armL.rotation.z = -2.75; det.armR.rotation.z = 2.75; det.mag.visible = false;
    det.mouth.scale.set(1.0, 0.95, 0.3); det.brows.forEach((b) => (b.position.y = 0.22));
    det.legs[0].rotation.z = -0.15 * (j / 0.22); det.legs[1].rotation.z = 0.15 * (j / 0.22);
    tr.position.set(0, 2.42 + j, 0); tr.rotation.y = lt * 1.5;
    conf.forEach((m) => { const u = m.userData; let y = u.y0 - lt * u.v; m.position.set(u.x + Math.sin(lt * 2 + u.p) * 0.15, y, u.z); m.rotation.set(lt * u.s, lt * u.s * 0.7 + u.p, u.p); m.visible = y > 0.02; });
    cam.position.set(0, 2.2, lerp(6.0, 5.4, ease(k))); cam.lookAt(0, 2.25, 0);
  } };
}

// ---------- Bild berechnen ----------
const flash = document.getElementById('flash');
const cuts = T.scenes.slice(1).map((s) => s.start).filter((x) => x !== SC.cd.start);
for (const s of Object.values(scenes)) if (s.flashAt) cuts.push(...s.flashAt);
window.renderFrame = (t) => {
  t = clamp(t, 0, T.duration - 1e-4);
  const sc = T.scenes.find((s) => t >= s.start && t < s.end) ?? T.scenes[T.scenes.length - 1];
  const s = scenes[sc.id];
  document.getElementById('ring').style.opacity = 0; document.getElementById('xmark').style.opacity = 0;
  ui.querySelector('.bar').style.opacity = 0;
  s.update(t);
  updateCaps(t);
  let f = 0; for (const c of cuts) if (t >= c && t < c + 0.14) f = Math.max(f, 0.55 * (1 - (t - c) / 0.14));
  flash.style.opacity = f.toFixed(3);
  renderer.render(s.scene, s.cam);
};
await document.fonts.load('900 60px Poppins'); await document.fonts.load('800 60px Poppins'); await document.fonts.ready;
window.TL = T; window.renderFrame(0); window.ready = true;
