import * as THREE from './node_modules/three/build/three.module.js';

const W = 720, H = 1280;
const TL = await (await fetch('timeline.json')).json();
const LN = Object.fromEntries(TL.lines.map(l => [l.id, l]));
const WS = (id, i) => LN[id].words[i].s;
const EV = TL.ev;

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out);
const octx = out.getContext('2d');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 400);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
scene.background = canvasTex(4, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3f8ee0'); gr.addColorStop(0.6, '#8cc4f2'); gr.addColorStop(1, '#d9eeff');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
scene.fog = new THREE.Fog(0xcfe6fb, 45, 140);

const hemi = new THREE.HemisphereLight(0xdcecff, 0x9a8f80, 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3e0, 2.4);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 120 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
scene.add(sun); scene.add(sun.target);

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent = scene, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
}

// ---------- world ----------
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M(0xc2c5cb));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
// road
const road = new THREE.Mesh(new THREE.PlaneGeometry(400, 9), M(0x8a8d93)); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, 9); road.receiveShadow = true; scene.add(road);
for (let x = -120; x < 120; x += 6) { const s = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.3), M(0xf4f4f4)); s.rotation.x = -Math.PI / 2; s.position.set(x, 0.02, 9); scene.add(s); }
box(400, 0.25, 0.5, M(0xe3e3e3), 0, 0.12, 4.3); box(400, 0.25, 0.5, M(0xe3e3e3), 0, 0.12, 13.7);

const windowTex = canvasTex(64, 96, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#bfe3ff'); gr.addColorStop(1, '#8fc5f0');
  g.fillStyle = gr; g.fillRect(6, 6, w - 12, h - 12); g.fillStyle = '#ffffff'; g.fillRect(w / 2 - 3, 0, 6, h); g.fillRect(0, h / 2 - 3, w, 6);
  g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.moveTo(10, 40); g.lineTo(28, 10); g.lineTo(36, 10); g.lineTo(14, 48); g.fill();
});
const winMat = new THREE.MeshStandardMaterial({ map: windowTex, roughness: 0.3 });
function building(x, z, w, h, d, color, trim = 0xe9e4d8) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  box(w, h, d, M(color), 0, h / 2, 0, g);
  box(w + 0.4, 0.4, d + 0.4, M(trim), 0, h + 0.2, 0, g);
  box(w + 0.2, 0.5, d + 0.2, M(trim), 0, 0.25, 0, g);
  const cols = Math.max(1, Math.floor(w / 3)), rows = Math.max(1, Math.floor((h - 1.5) / 3.2));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const wx = -w / 2 + (c + 0.5) * (w / cols), wy = 2.2 + r * 3.2;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.1), winMat); p.position.set(wx, wy, d / 2 + 0.02); g.add(p);
    box(1.8, 0.18, 0.25, M(trim), wx, wy - 1.12, d / 2 + 0.1, g);
  }
  return g;
}
function signTex(text, bg = '#f2efe6', fg = '#2b3240') {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = '#cfc9b8'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = fg; g.font = '900 84px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4);
  });
}
// town hall
const hall = building(0, -16, 22, 13, 8, 0xb4532f);
{
  const s = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), new THREE.MeshStandardMaterial({ map: signTex('RATHAUS') })); s.position.set(0, 10.6, 4.05); hall.add(s);
  box(6, 4, 8.4, M(0xb4532f), 0, 15, 0, hall); box(6.6, 0.4, 9, M(0xe9e4d8), 0, 17.2, 0, hall);
  const clock = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (g) => {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#333'; g.lineWidth = 6; g.stroke();
    g.lineCap = 'round'; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 24); g.moveTo(64, 64); g.lineTo(92, 70); g.stroke();
  }) })); clock.position.set(0, 15, 4.25); hall.add(clock);
  box(4, 4.6, 0.3, M(0x2f4f86), 0, 2.3, 4.05, hall);
  for (const sx of [-1, 1]) for (const k of [0, 1]) box(0.9, 8, 0.9, M(0xeee8da), sx * (3 + k * 3.5), 4, 4.4, hall);
  // flag
  box(0.12, 6, 0.12, M(0xdddddd), 0, 20, 0, hall);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), new THREE.MeshStandardMaterial({ color: 0xf2c230, side: THREE.DoubleSide })); fl.position.set(1.25, 22.2, 0); hall.add(fl);
}
// stage in front of town hall
const stage = new THREE.Group(); stage.position.set(0, 0, -7.5); scene.add(stage);
box(10, 1.0, 4.5, M(0xc58b4c), 0, 0.5, 0, stage);
for (let i = 0; i < 3; i++) box(2.4, 0.33 * (i + 1), 0.6, M(0xb57b3f), 0, 0.165 * (i + 1), 2.55 + (2 - i) * 0.6, stage);
const podium = box(1.4, 1.3, 0.8, M(0x7a3b22), 0, 1.65, 0.9, stage);
box(1.6, 0.12, 1.0, M(0x5b2a17), 0, 2.36, 0.9, stage);
const banner = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.6), new THREE.MeshStandardMaterial({ map: signTex('EHRLICH = KLEIN', '#ffffff', '#c22f2f'), side: THREE.DoubleSide }));
banner.position.set(0, 5.3, -1.6); stage.add(banner); box(0.15, 5.4, 0.15, M(0x666666), -4.6, 2.7, -1.6, stage); box(0.15, 5.4, 0.15, M(0x666666), 4.6, 2.7, -1.6, stage);

const houseCols = [0xb4532f, 0xe7d7b5, 0x6f97c8, 0xc9694a, 0xf0e9dc, 0x9bbf7a, 0xd98f5a];
let hi = 0;
for (let x = -84; x <= 84; x += 14) { if (Math.abs(x) < 14) continue; building(x, -13 - (hi % 2) * 2, 12, 8 + (hi * 5) % 9, 7, houseCols[hi % houseCols.length]); hi++; }
for (let x = -77; x <= 84; x += 15) { building(x, 26, 13, 7 + (hi * 3) % 8, 7, houseCols[(hi + 3) % houseCols.length]); hi++; }
const school = building(26, -13, 13, 9, 7.5, 0x6f97c8);
{ const s = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.7), new THREE.MeshStandardMaterial({ map: signTex('SCHULE') })); s.position.set(0, 7.2, 3.8); school.add(s); }
function tree(x, z, s = 1) {
  box(0.6 * s, 2.4 * s, 0.6 * s, M(0x7a5233), x, 1.2 * s, z);
  box(2.6 * s, 2.2 * s, 2.6 * s, M(0x4f9a45), x, 3.3 * s, z); box(1.8 * s, 1.4 * s, 1.8 * s, M(0x5fae52), x, 4.9 * s, z);
}
for (let x = -90; x <= 90; x += 11) { if (Math.abs(x + 3) > 16) tree(x + 3, 2.4, 0.9); }
// lamp posts & benches
for (let x = -60; x <= 60; x += 22) { box(0.18, 4.5, 0.18, M(0x333a44), x, 2.25, 3.4); box(0.7, 0.35, 0.7, M(0xfff1b8, { emissive: 0x554411 }), x, 4.6, 3.4); }

// ---------- props ----------
const cardboard = M(0xc9955a);
function crate(parent) { const g = new THREE.Group(); box(0.8, 0.6, 0.6, cardboard, 0, 0.3, 0, g); box(0.82, 0.06, 0.08, M(0xe8d2a8), 0, 0.6, 0, g); parent.add(g); return g; }
const boxesPile = new THREE.Group(); scene.add(boxesPile);
for (let i = 0; i < 4; i++) { const c = crate(boxesPile); c.position.set((i % 2) * 0.9, Math.floor(i / 2) * 0.6, 0); }
function broom(parent) {
  const g = new THREE.Group(); box(0.08, 1.6, 0.08, M(0x8a5a2b), 0, 0, 0, g, false); box(0.5, 0.35, 0.15, M(0xd9b45a), 0, -0.9, 0, g, false); parent.add(g); return g;
}

// ---------- characters ----------
function faceDraw(g, s, exp, mouthOpen, opt) {
  g.clearRect(0, 0, s, s);
  const ex = [s * 0.32, s * 0.68], ey = s * 0.44;
  const eyeW = s * 0.07, eyeH = exp === 'shock' || exp === 'panic' ? s * 0.12 : s * 0.095;
  g.fillStyle = '#1b1b1b';
  for (const x of ex) {
    if (exp === 'happy' && !mouthOpen) { g.lineWidth = s * 0.035; g.strokeStyle = '#1b1b1b'; g.beginPath(); g.arc(x, ey + 4, eyeW, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); continue; }
    if (exp === 'sus' || exp === 'smug') { g.fillRect(x - eyeW, ey - eyeH * 0.15, eyeW * 2, eyeH * 0.6); continue; }
    g.beginPath(); g.ellipse(x, ey, eyeW, eyeH, 0, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - eyeW * 0.3, ey - eyeH * 0.4, s * 0.022, 0, 7); g.fill(); g.fillStyle = '#1b1b1b';
  }
  // brows
  g.lineWidth = s * 0.035; g.lineCap = 'round'; g.strokeStyle = '#1b1b1b';
  const brow = { neutral: [0, 0], happy: [-2, -2], sus: [8, -6], smug: [-4, 6], shock: [-10, -10], panic: [-8, 8], sad: [-8, 8], angry: [10, -10] }[exp] || [0, 0];
  for (let i = 0; i < 2; i++) {
    const x = ex[i], d = i === 0 ? 1 : -1; g.beginPath();
    g.moveTo(x - s * 0.08, ey - s * 0.16 + brow[0] * d * (i === 0 ? 1 : -1) * 0 + (i === 0 ? brow[0] : brow[1]) * 0.6);
    g.lineTo(x + s * 0.08, ey - s * 0.16 + (i === 0 ? brow[1] : brow[0]) * 0.6); g.stroke();
  }
  if (opt.glasses) { g.lineWidth = s * 0.025; for (const x of ex) { g.beginPath(); g.arc(x, ey, s * 0.11, 0, 7); g.stroke(); } g.beginPath(); g.moveTo(ex[0] + s * .11, ey); g.lineTo(ex[1] - s * .11, ey); g.stroke(); }
  if (opt.cheeks) { g.fillStyle = 'rgba(255,120,120,.35)'; for (const x of ex) { g.beginPath(); g.ellipse(x, ey + s * 0.15, s * 0.06, s * 0.035, 0, 0, 7); g.fill(); } }
  // mouth
  const my = s * 0.7, mx = s * 0.5;
  if (opt.mustache) { g.fillStyle = '#3a2a1a'; g.beginPath(); g.ellipse(mx - s * 0.08, my - s * 0.07, s * 0.1, s * 0.04, 0.2, 0, 7); g.ellipse(mx + s * 0.08, my - s * 0.07, s * 0.1, s * 0.04, -0.2, 0, 7); g.fill(); }
  g.fillStyle = '#1b1b1b'; g.strokeStyle = '#1b1b1b'; g.lineWidth = s * 0.03;
  if (mouthOpen > 0.05) {
    g.beginPath(); g.ellipse(mx, my, s * (exp === 'shock' || exp === 'panic' ? 0.08 : 0.1), s * (0.03 + 0.07 * mouthOpen), 0, 0, 7); g.fill();
    g.fillStyle = '#d65a5a'; g.beginPath(); g.ellipse(mx, my + s * 0.03 * mouthOpen, s * 0.05, s * 0.025 * mouthOpen, 0, 0, 7); g.fill();
  } else if (exp === 'happy' || exp === 'smug') {
    g.beginPath(); g.arc(mx + (exp === 'smug' ? s * 0.04 : 0), my - s * 0.06, s * 0.11, 0.25 * Math.PI, (exp === 'smug' ? 0.6 : 0.75) * Math.PI); g.stroke();
  } else if (exp === 'shock') { g.beginPath(); g.ellipse(mx, my, s * 0.05, s * 0.07, 0, 0, 7); g.fill(); }
  else if (exp === 'sad' || exp === 'panic') { g.beginPath(); g.arc(mx, my + s * 0.08, s * 0.08, 1.2 * Math.PI, 1.8 * Math.PI); g.stroke(); }
  else { g.beginPath(); g.moveTo(mx - s * 0.06, my); g.lineTo(mx + s * 0.06, my - (exp === 'sus' ? s * 0.02 : 0)); g.stroke(); }
}

function shirtTex(o) {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = o.shirt; g.fillRect(0, 0, w, h);
    if (o.style === 'hoodie') {
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(28, 78, 72, 34);
      g.strokeStyle = '#f4f4f4'; g.lineWidth = 4; g.beginPath(); g.moveTo(50, 0); g.lineTo(48, 40); g.moveTo(78, 0); g.lineTo(80, 40); g.stroke();
    }
    if (o.style === 'suit') {
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(38, 0); g.lineTo(90, 0); g.lineTo(64, 70); g.fill();
      g.fillStyle = '#c62828'; g.beginPath(); g.moveTo(58, 6); g.lineTo(70, 6); g.lineTo(72, 50); g.lineTo(64, 62); g.lineTo(56, 50); g.fill();
      g.fillStyle = '#f2c230'; g.beginPath(); g.arc(96, 40, 7, 0, 7); g.fill();
    }
    if (o.style === 'cardigan') { g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(64, 30 + i * 22, 4, 0, 7); g.fill(); } g.fillRect(62, 0, 4, h); }
    if (o.letter) { g.fillStyle = o.letterColor || '#fff'; g.font = '900 54px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.letter, 64, o.style === 'hoodie' ? 58 : 64); }
    if (o.stripe) { g.fillStyle = o.stripe; g.fillRect(0, 100, w, 10); }
  });
}

function badgeTex(n) {
  return canvasTex(160, 160, (g, w) => {
    const red = n === 0;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(w / 2 + 3, w / 2 + 5, 66, 0, 7); g.fill();
    g.fillStyle = red ? '#e53935' : '#ffffff'; g.beginPath(); g.arc(w / 2, w / 2, 66, 0, 7); g.fill();
    g.lineWidth = 9; g.strokeStyle = red ? '#ffffff' : '#111111'; g.stroke();
    g.fillStyle = red ? '#ffffff' : '#111111'; g.font = `900 ${String(n).length > 2 ? 56 : String(n).length > 1 ? 72 : 84}px Inter, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), w / 2, w / 2 + 5);
  });
}
const badgeCache = {};
const badgeMat = n => badgeCache[n] || (badgeCache[n] = new THREE.SpriteMaterial({ map: badgeTex(n), depthTest: true, transparent: true }));

const chars = [];
function makeChar(o) {
  const c = { o, root: new THREE.Group(), exp: 'neutral', mouth: 0, faceKey: '' };
  const skin = M(o.skin || 0xf3d49b), shirt = M(o.shirt), pants = M(o.pants || 0x24262b);
  const front = new THREE.MeshStandardMaterial({ map: shirtTex(o), roughness: 0.85 });
  const body = new THREE.Group(); c.root.add(body); c.body = body;
  // legs
  c.legs = [-1, 1].map(sx => { const p = new THREE.Group(); p.position.set(sx * 0.25, 1, 0); body.add(p); box(0.49, 1, 0.5, pants, 0, -0.5, 0, p); box(0.5, 0.12, 0.56, M(o.shoes || 0x111111), 0, -0.94, 0.03, p); return p; });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.5), [shirt, shirt, shirt, shirt, front, shirt]); torso.position.y = 1.5; torso.castShadow = true; body.add(torso);
  if (o.sash) { c.sash = box(0.22, 1.25, 0.56, M(0xf2c230, { metalness: 0.3, roughness: 0.4 }), 0, 1.5, 0, body); c.sash.rotation.z = 0.75; }
  c.arms = [-1, 1].map(sx => { const p = new THREE.Group(); p.position.set(sx * 0.75, 1.95, 0); body.add(p); box(0.48, 0.8, 0.48, shirt, 0, -0.4, 0, p); box(0.46, 0.22, 0.46, skin, 0, -0.9, 0, p); return p; });
  // head
  const head = new THREE.Group(); head.position.y = 2.0; body.add(head); c.head = head;
  box(0.82, 0.78, 0.78, skin, 0, 0.42, 0, head);
  const fc = document.createElement('canvas'); fc.width = fc.height = 256; c.fctx = fc.getContext('2d');
  c.ftex = new THREE.CanvasTexture(fc); c.ftex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.78), new THREE.MeshStandardMaterial({ map: c.ftex, transparent: true, roughness: 0.9 }));
  face.position.set(0, 0.42, 0.392); head.add(face);
  const hairM = M(o.hair || 0x2a1d14);
  if (o.hairStyle === 'spiky' || o.hairStyle === 'messy') {
    box(0.88, 0.22, 0.86, hairM, 0, 0.86, -0.01, head); box(0.88, 0.5, 0.2, hairM, 0, 0.62, -0.34, head);
    box(0.12, 0.35, 0.8, hairM, -0.43, 0.68, -0.02, head); box(0.12, 0.35, 0.8, hairM, 0.43, 0.68, -0.02, head);
    const n = o.hairStyle === 'spiky' ? 9 : 7;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, r = 0.25 + (i % 2) * 0.12;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.42, 4), hairM);
      sp.position.set(Math.cos(a) * r, 0.98, Math.sin(a) * r * 0.9 - 0.04); sp.rotation.set(Math.sin(a) * 0.7, a, -Math.cos(a) * 0.7); sp.castShadow = true; head.add(sp);
    }
    // fringe
    for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 4), hairM); f.position.set(-0.22 + i * 0.22, 0.72, 0.38); f.rotation.set(Math.PI - 0.5, 0, (i - 1) * 0.3); head.add(f); }
  } else if (o.hairStyle === 'bun') {
    box(0.88, 0.2, 0.86, hairM, 0, 0.86, 0, head); box(0.88, 0.45, 0.2, hairM, 0, 0.62, -0.34, head);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), hairM); b.position.set(0, 1.08, -0.15); head.add(b);
  } else if (o.hairStyle === 'cap') {
    box(0.9, 0.22, 0.9, M(o.capColor || 0xd33), 0, 0.9, 0, head); box(0.8, 0.06, 0.4, M(o.capColor || 0xd33), 0, 0.82, 0.55, head);
  }
  if (o.hat) {
    const hat = new THREE.Group(); hat.position.y = 0.82; head.add(hat); c.hat = hat;
    const hm = M(0x15151a, { roughness: 0.5 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 24), hm); brim.castShadow = true; hat.add(brim);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 1.05, 24), hm); top.position.y = 0.55; top.castShadow = true; hat.add(top);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.445, 0.445, 0.16, 24), M(0xc62828)); band.position.y = 0.14; hat.add(band);
    // the fake "0" sticker, glued on a little stick on top of the hat
    box(0.04, 0.5, 0.04, M(0x777777), 0, 1.3, 0, hat, false);
    const fake = new THREE.Sprite(badgeMat(0)); fake.scale.set(0.55, 0.55, 1); fake.position.y = 1.7; hat.add(fake); c.fakeBadge = fake;
  }
  c.badge = new THREE.Sprite(badgeMat(0)); c.badge.scale.set(0.5, 0.5, 1); scene.add(c.badge);
  if (o.broom) { c.broom = broom(c.arms[1]); c.broom.position.set(-0.2, -1.0, 0.35); c.broom.rotation.x = 0.3; }
  scene.add(c.root); chars.push(c); return c;
}
const sizeOf = n => 0.8 + 0.04 * n;

// cast
const leo = makeChar({ shirt: '#3a8fe0', style: 'hoodie', letter: '★', letterColor: '#ffd23f', hair: 0x2b1a10, hairStyle: 'spiky', pants: 0x2b3550, shoes: 0xf2f2f2, cheeks: true });
const tim = makeChar({ shirt: '#f08a24', style: 'hoodie', hair: 0xc4472b, hairStyle: 'messy', pants: 0x3b3b44, cheeks: false });
const mayor = makeChar({ shirt: '#22305a', style: 'suit', pants: 0x1a2240, hair: 0x5a4030, hairStyle: 'none', hat: true, mustache: true, cheeks: true, skin: 0xf0cf98 });
const oma = makeChar({ shirt: '#8e5bb5', style: 'cardigan', hair: 0xd8d8d8, hairStyle: 'bun', glasses: true, pants: 0x5a5a66 });
const teacher = makeChar({ shirt: '#2f9e78', style: 'plain', hair: 0x6b3b1f, hairStyle: 'bun', glasses: true, pants: 0x333344 });
const leoCopy = makeChar({ shirt: '#3a8fe0', style: 'hoodie', letter: '★', letterColor: '#ffd23f', hair: 0x2b1a10, hairStyle: 'spiky', pants: 0x2b3550, shoes: 0xf2f2f2, cheeks: true, sash: true });
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const shirtCols = ['#d64545', '#4caf50', '#7e57c2', '#26a69a', '#ef6c00', '#5c6bc0', '#ec407a', '#8d6e63', '#fdd835', '#00897b', '#9ccc65', '#e53935'];
const hairCols = [0x2a1d14, 0xd9a441, 0x6b3b1f, 0x111111, 0xb85c38, 0xe8d18a];
const crowdNums = [3, 12, 7, 25, 5, 18, 9, 31, 4, 14, 2, 21];
const crowd = crowdNums.map((n, i) => {
  const c = makeChar({ shirt: shirtCols[i], style: i % 3 === 0 ? 'hoodie' : 'plain', letter: i % 4 === 1 ? String((i * 7) % 30) : '', hair: hairCols[i % hairCols.length], hairStyle: ['spiky', 'messy', 'bun', 'cap', 'messy'][i % 5], capColor: [0xd33, 0x2a6, 0x36c][i % 3], pants: [0x24262b, 0x2b3550, 0x4a3b2a][i % 3], glasses: i % 6 === 4 });
  c.num = n; c.rx = rnd(); c.ry = rnd(); return c;
});
const bob = crowd[4]; // the guy whose number ticks in the intro

// ---------- animation helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { x = clamp(x); return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
const lerp = (a, b, t) => a + (b - a) * t;
const lerpV = (a, b, t) => new THREE.Vector3(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
const springPop = x => x < 0 ? 0 : x > 1 ? 1 : 1 + Math.sin(x * Math.PI * 2.5) * Math.exp(-x * 5) * 0.35 * (1 - x) + (x < 0.15 ? 0 : 0) ;
function mouthFor(spk, t) {
  for (const l of TL.lines) {
    if (l.spk !== spk || t < l.start - 0.05 || t > l.end + 0.05) continue;
    for (const w of l.words) if (t >= w.s && t <= w.e + 0.02) {
      const ph = (t - w.s) / Math.max(0.12, (w.e - w.s));
      return 0.35 + 0.65 * Math.abs(Math.sin(ph * Math.PI * Math.max(1, Math.round((w.e - w.s) / 0.14))));
    }
  }
  return 0;
}
const speaking = spk => t => mouthFor(spk, t);

function pose(c, p, t) {
  // p: {pos:[x,z], rot, size, exp, walk, wave, point, cheer, carry, sweep, look, panic, num, hideBadge, talkSpk}
  c.root.visible = true;
  c.root.position.set(p.pos[0], p.y || 0, p.pos[1]);
  c.root.rotation.y = p.rot || 0;
  const s = p.size ?? sizeOf(p.num ?? 0); c.root.scale.setScalar(s);
  const ph = t * (p.walkSpeed || 9) + (c.rx || 0) * 6;
  const breathe = Math.sin(t * 2.2 + (c.ry || 0) * 5) * 0.015;
  c.body.position.y = breathe + (p.walk ? Math.abs(Math.sin(ph)) * 0.08 : 0) + (p.jump ? Math.abs(Math.sin(t * 7 + (c.rx || 0) * 5)) * 0.35 : 0);
  c.body.rotation.z = p.wobble ? Math.sin(t * 9) * 0.06 : 0;
  c.legs[0].rotation.x = p.walk ? Math.sin(ph) * 0.7 : 0; c.legs[1].rotation.x = p.walk ? -Math.sin(ph) * 0.7 : 0;
  let a0x = p.walk ? -Math.sin(ph) * 0.6 : Math.sin(t * 1.7 + (c.rx || 0) * 4) * 0.04, a1x = p.walk ? Math.sin(ph) * 0.6 : -a0x, a0z = 0.05, a1z = -0.05;
  if (p.wave) { a1z = -2.6 + Math.sin(t * 10) * 0.35; a1x = 0; }
  if (p.cheer) { a0z = 2.5 + Math.sin(t * 9 + (c.rx || 0) * 6) * 0.25; a1z = -2.5 - Math.sin(t * 9 + (c.rx || 0) * 6) * 0.25; a0x = a1x = 0; }
  if (p.point) { a1x = -1.5; a1z = -0.1; }
  if (p.carry) { a0x = a1x = -1.35; a0z = 0.12; a1z = -0.12; }
  if (p.sweep) { a0x = -0.9 + Math.sin(t * 8) * 0.4; a1x = -0.9 + Math.sin(t * 8) * 0.4; a0z = 0.3; a1z = -0.3; }
  if (p.panic) { a0z = 2.2 + Math.sin(t * 22) * 0.4; a1z = -2.2 - Math.sin(t * 22 + 1) * 0.4; a0x = a1x = 0; }
  if (p.shrug) { a0z = 0.9; a1z = -0.9; a0x = a1x = -0.5; }
  if (p.handsHips) { a0z = 0.6; a1z = -0.6; }
  c.arms[0].rotation.set(a0x, 0, a0z); c.arms[1].rotation.set(a1x, 0, a1z);
  c.head.rotation.set(p.lookUp || 0, (p.look || 0) + (p.shake ? Math.sin(t * 18) * 0.25 : 0), p.tilt || 0);
  if (c.broom) c.broom.visible = !!p.broom;
  // face
  const m = p.talkSpk ? mouthFor(p.talkSpk, t) : 0;
  const exp = p.exp || 'neutral';
  const key = exp + '|' + Math.round(m * 6);
  if (key !== c.faceKey) { faceDraw(c.fctx, 256, exp, m, c.o); c.ftex.needsUpdate = true; c.faceKey = key; }
  // badge
  c.root.updateMatrixWorld(true);
  const top = new THREE.Vector3(0, c.o.hat ? 3.0 : 3.25, 0); c.root.localToWorld(top);
  const bs = (p.badgeScale || 1) * Math.max(0.55, Math.min(2.6, 0.42 + s * 0.18));
  c.badge.position.copy(top).add(new THREE.Vector3(0, 0.35 * bs, 0));
  c.badge.material = badgeMat(p.num ?? 0);
  c.badge.scale.setScalar(bs * (p.badgePop ?? 1));
  c.badge.visible = !p.hideBadge;
}
function hideAll() { for (const c of chars) { c.root.visible = false; c.badge.visible = false; } boxesPile.visible = false; confetti.visible = false; drops.visible = false; }
function cam(pos, look, fov = 50) {
  camera.position.set(...pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(new THREE.Vector3(...look));
  sun.position.set(look[0] + 14, 30, look[2] + 18); sun.target.position.set(look[0], 0, look[2]);
}
function camMove(a, b, la, lb, k, fov = 50) { const e = ease(k); cam(lerpV(a, b, e).toArray(), lerpV(la, lb, e).toArray(), fov); }

// confetti + sweat drops
const confetti = new THREE.Group(); scene.add(confetti);
const confCols = [0xe53935, 0xfdd835, 0x43a047, 0x1e88e5, 0x8e24aa, 0xff7043];
for (let i = 0; i < 160; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.2), new THREE.MeshBasicMaterial({ color: confCols[i % 6], side: THREE.DoubleSide })); p.userData = { x: rnd() * 12 - 6, z: rnd() * 6 - 3, s: 0.6 + rnd(), ph: rnd() * 10, y0: rnd() * 10 }; confetti.add(p); }
function confettiAt(cx, cz, t) {
  confetti.visible = true;
  for (const p of confetti.children) { const u = p.userData; const y = 9 - ((t * u.s * 1.6 + u.y0) % 10); p.position.set(cx + u.x + Math.sin(t * 2 + u.ph) * 0.4, y, cz + u.z); p.rotation.set(t * 3 + u.ph, t * 2 * u.s, u.ph); }
}
const drops = new THREE.Group(); scene.add(drops);
for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshStandardMaterial({ color: 0x7fd3ff, roughness: 0.1 })); d.scale.y = 1.6; drops.add(d); }
function sweat(c, t) {
  drops.visible = true; const hp = new THREE.Vector3(0, 2.75, 0); c.root.localToWorld(hp);
  drops.children.forEach((d, i) => { const k = ((t * 1.3 + i * 0.33) % 1); d.position.set(hp.x + (i - 1) * 0.35 * c.root.scale.x, hp.y + 0.3 * c.root.scale.x - k * 0.6 * c.root.scale.x, hp.z + 0.4 * c.root.scale.x); d.scale.setScalar(c.root.scale.x * (1 - k * 0.5)); d.scale.y *= 1.6; });
}

// crowd placement helper
function crowdLayout(t, opts = {}) {
  crowd.forEach((c, i) => {
    const row = Math.floor(i / 6), col = i % 6;
    const x = (opts.cx || 0) + (col - 2.5) * 2.0 + (row ? 1 : 0) + (c.rx - 0.5) * 0.6;
    const z = (opts.cz || 0) + row * 2.4 + (c.ry - 0.5) * 0.8;
    pose(c, { pos: [x, z], rot: opts.rot ?? Math.PI, num: c.num, cheer: opts.cheer && (i % 3 !== 2 || opts.allCheer), jump: opts.jump && i % 2 === 0, exp: opts.exp || (opts.cheer ? 'happy' : 'neutral'), look: (c.rx - 0.5) * 0.3, lookUp: opts.lookUp || 0 }, t);
  });
}

// ---------- shots ----------
const S = [];
const shot = (start, fn) => S.push({ start, fn });
const B = id => LN[id].start - 0.12;

// 0) hook: the hat with the fake 0, slow menacing push-in
shot(0, (t, k, d) => {
  pose(mayor, { pos: [0, -6.9], y: 1.0, rot: 0, size: sizeOf(0), num: 0, hideBadge: true, exp: t > WS('n0', 5) ? 'smug' : 'happy', tilt: Math.sin(t * 1.5) * 0.05 }, t);
  const e = ease(k / d);
  cam([lerp(1.5, 0.2, e), lerp(2.6, 3.3, e), lerp(-1.0, -4.3, e)], [0, lerp(3.2, 3.9, e), -7], 46);
});
// 1) town wide: people of different sizes walking
shot(B('n1'), (t, k, d) => {
  crowd.forEach((c, i) => {
    const dir = i % 2 ? 1 : -1; const lane = -2 + (i % 4) * 1.8;
    const x = ((c.rx * 40 + dir * t * 1.6 * (1.2 - c.num * 0.01)) % 40 + 40) % 40 - 20;
    pose(c, { pos: [x, lane + 1], rot: dir > 0 ? Math.PI / 2 : -Math.PI / 2, num: c.num, walk: true, walkSpeed: 7 }, t);
  });
  pose(leo, { pos: [1.5, 8.5], rot: 0.2, num: 0, exp: 'happy', look: 0.2 }, t);
  camMove([-2, 6, 24], [2, 4.8, 20], [0, 3, 2], [1, 3, 3], k / d);
});
// 2) "Jede Lüge: plus eins" - bob's number ticks
shot(WS('n1', 8) - 0.1, (t, k) => {
  const g = clamp((t - EV.bobTick) / 0.45); const n = t >= EV.bobTick ? 6 : 5;
  const sz = lerp(sizeOf(5), sizeOf(6), springPop(g) * (g > 0 ? 1 : 0));
  pose(bob, { pos: [0, 0], rot: 0, size: g > 0 ? sz : sizeOf(5), num: n, exp: g > 0 ? 'shock' : 'smug', talkSpk: null, badgePop: g > 0 && g < 1 ? 1 + Math.sin(g * Math.PI) * 0.5 : 1, look: -0.1 }, t);
  cam([0.6, 2.3, 4.4], [0, 2.4, 0], 50);
});
// 3) "Und alle sehen deine Zahl" crowd sizes
shot(WS('n1', 12) - 0.1, (t, k, d) => {
  crowdLayout(t, { cx: 0, cz: 6, rot: 0, exp: 'neutral' });
  camMove([0, 3, 20], [0, 6, 18], [0, 3, 6], [0, 4.5, 6], k / d);
});
// 4) Leo intro
shot(B('n2'), (t, k, d) => {
  const walkEnd = 1.0;
  const z = lerp(4, 7.5, clamp(k / walkEnd));
  pose(leo, { pos: [0, z], rot: 0, num: 0, walk: k < walkEnd, exp: 'happy', wave: k > walkEnd + 0.2 && t < WS('n2', 5), badgePop: t > WS('n2', 6) ? 1 + Math.sin(clamp((t - WS('n2', 6)) / 0.4) * Math.PI) * 0.6 : 1 }, t);
  crowd.slice(0, 4).forEach((c, i) => pose(c, { pos: [-4 + i * 2.6 + (i > 1 ? 2.6 : 0), 0.5 - (i % 2)], rot: 0.3 * (i - 1.5), num: c.num }, t));
  const zoom = clamp((t - WS('n2', 5)) / 0.6);
  camMove([0.5, 1.9, z + 4.6], [0.3, 2.5, z + 3.3], [0, 1.4, z], [0, 2.4, z], zoom, 50);
});
// 5) Tim lies to the teacher, in front of the school
shot(B('t1'), (t, k) => {
  const g = clamp((t - EV.timGrow) / 0.5);
  const sz = g > 0 ? lerp(sizeOf(7), sizeOf(8), springPop(g)) : sizeOf(7);
  pose(tim, { pos: [25, -4], rot: -0.5, size: sz, num: g > 0 ? 8 : 7, exp: g > 0 ? 'shock' : 'smug', talkSpk: 'tim', badgePop: g > 0 && g < 1 ? 1 + Math.sin(g * Math.PI) * 0.6 : 1, handsHips: g <= 0 }, t);
  pose(teacher, { pos: [23.2, -3.4], rot: 0.9, num: 2, exp: g > 0 ? 'sus' : 'neutral', handsHips: true }, t);
  pose(leo, { pos: [26.8, -2.6], rot: -0.9, num: 0, exp: g > 0 ? 'shock' : 'neutral', look: 0.2 }, t);
  cam([24.3, 2.3, 1.2], [24.8, 2.2, -3.6], 52);
});
// 6) "Wer wieder schrumpfen will ..." Tim looks at oma's boxes
shot(B('n3'), (t, k, d) => {
  pose(tim, { pos: [-24, 6], rot: 0.6, num: 8, exp: 'sad', walk: k < 1.5, }, t);
  pose(oma, { pos: [-21, 6.5], rot: -1.0, num: 1, exp: 'happy' }, t);
  boxesPile.visible = true; boxesPile.position.set(-22.5, 0, 4.6);
  camMove([-19, 3.5, 14], [-20.5, 3, 12.5], [-22.5, 1.5, 5.5], [-22.5, 1.8, 5.5], k / d);
});
// 7) Tim carries the boxes, then shrinks
shot(B('t2'), (t, k) => {
  const g = clamp((t - EV.timShrink) / 0.6);
  const sz = g > 0 ? lerp(sizeOf(8), sizeOf(7), springPop(g)) : sizeOf(8);
  const carrying = t < EV.timShrink - 0.1;
  const x = lerp(-24, -21.5, clamp(k / 1.5));
  pose(tim, { pos: [x, 6], rot: g > 0 ? 0.2 : Math.PI / 2 - 0.4, size: sz, num: g > 0 ? 7 : 8, exp: g > 0 ? 'happy' : 'sad', talkSpk: 'tim', carry: carrying, walk: carrying && k < 1.5, badgePop: g > 0 && g < 1 ? 1 + Math.sin(g * Math.PI) * 0.6 : 1, cheer: g > 0.4 }, t);
  pose(oma, { pos: [-19.5, 7], rot: -1.3, num: 1, exp: 'happy', wave: g > 0 }, t);
  boxesPile.visible = carrying; if (carrying) { boxesPile.position.set(0, 0, 0); tim.root.updateMatrixWorld(true); const hp = new THREE.Vector3(-0.45, 1.25, 0.75); tim.root.localToWorld(hp); boxesPile.position.copy(hp); boxesPile.rotation.y = tim.root.rotation.y; boxesPile.scale.setScalar(0.6 * sz); }
  else boxesPile.scale.setScalar(1);
  cam([-22.5, 2.5, 13], [-22.2, 2.0, 6.2], 48);
});
// 8) Town hall: the mayor on stage
shot(B('n4'), (t, k, d) => {
  boxesPile.scale.setScalar(1); boxesPile.rotation.y = 0;
  crowdLayout(t, { cx: 0, cz: -1, rot: Math.PI, cheer: true, allCheer: false, jump: true });
  pose(mayor, { pos: [0, -6.9], y: 1.0, rot: 0, size: sizeOf(0), num: 0, hideBadge: true, exp: 'happy', wave: true }, t);
  const close = t > WS('n4', 6) - 0.1;
  if (!close) camMove([0, 9, 15], [0, 6, 9], [0, 3, -8], [0, 2.4, -7], k / (WS('n4', 6) - B('n4')), 50);
  else camMove([0.4, 3.3, -2.4], [0.2, 3.6, -3.5], [0, 2.9, -7], [0, 3.6, -7], (t - WS('n4', 6)) / 2.5, 50);
});
// 9) mayor speech
shot(B('m1'), (t, k) => {
  crowdLayout(t, { cx: 0, cz: -1, rot: Math.PI, cheer: t > LN.m1.words[3].s, jump: true });
  pose(mayor, { pos: [0, -6.9], y: 1.0, rot: 0, size: sizeOf(0), num: 0, hideBadge: true, exp: t > LN.m1.words[5].s ? 'smug' : 'happy', talkSpk: 'mayor', wave: t < LN.m1.words[2].s, point: false, cheer: t > LN.m1.words[2].s && t < LN.m1.words[5].s }, t);
  cam([1.0, 2.7, -3.4], [0, 3.0, -7], 46);
});
// 10a) Leo suspicious
shot(B('n5'), (t, k) => {
  crowdLayout(t, { cx: 0, cz: -1, rot: Math.PI, cheer: true, jump: false });
  pose(leo, { pos: [11, 4], rot: Math.PI + 0.6, num: 0, exp: 'sus', tilt: 0.12 }, t);
  cam([9.7, 2.1, 2.1], [11, 2.0, 4], 48);
});
// 10b) the hat
shot(WS('n5', 5) - 0.1, (t, k) => {
  pose(mayor, { pos: [0, -6.9], y: 1.0, rot: 0, size: sizeOf(0), num: 0, hideBadge: true, exp: 'happy', wave: true }, t);
  const z = lerp(-2.0, -4.2, ease(k / 3.2));
  cam([0, 4.0, z], [0, 4.0, -7], 46);
});
// 10c) everybody doing the mayor's tasks, the mayor relaxing
shot(WS('n5', 11) - 0.1, (t, k, d) => {
  crowd.forEach((c, i) => {
    if (i > 7) return;
    const x = -9 + i * 2.5, z = -1 + (i % 2) * 1.6;
    if (i % 2) pose(c, { pos: [x, z], rot: 0.2, num: c.num, sweep: true, broom: true, exp: 'sad' }, t);
    else pose(c, { pos: [x + Math.sin(t * 0.8 + i) * 0.4, z], rot: Math.PI / 2, num: c.num, carry: true, walk: true, exp: 'sad' }, t);
  });
  boxesPile.visible = false;
  pose(mayor, { pos: [0, -6.9], y: 1.0, rot: 0, size: sizeOf(0), num: 0, hideBadge: true, exp: 'smug', tilt: 0.15 + Math.sin(t * 2) * 0.05 }, t);
  camMove([-3, 9, 11], [3, 9, 11], [0, 1.5, -4.5], [0, 2, -5], k / d, 52);
});
// 11) Leo calls him out
shot(B('l1'), (t, k) => {
  crowdLayout(t, { cx: 0, cz: 0.5, rot: Math.PI, exp: 'shock' });
  pose(leo, { pos: [1.2, -4.3], rot: Math.PI - 0.15, num: 0, exp: 'angry', talkSpk: 'leo', point: t > LN.l1.words[2].s, }, t);
  pose(mayor, { pos: [0, -6.9], y: 1.0, rot: 0.15, size: sizeOf(0), num: 0, hideBadge: true, exp: t > LN.l1.words[10].s ? 'shock' : 'happy' }, t);
  const first = t < LN.l1.words[8].s;
  if (first) cam([2.0, 2.0, 0.2], [0.8, 2.2, -4.3], 46);
  else cam([3.4, 2.4, -3.2], [0.4, 2.6, -6.0], 46);
});
// 12) mayor panics
shot(B('m2'), (t, k) => {
  pose(mayor, { pos: [0, -6.9], y: 1.0, rot: 0, size: sizeOf(0), num: 0, hideBadge: true, exp: 'panic', talkSpk: 'mayor', shrug: t > LN.m2.words[3].s, panic: t < LN.m2.words[3].s, shake: t > LN.m2.words[3].s }, t);
  sweat(mayor, t);
  cam([0.3, 3.2, -4.0], [0, 3.1, -7], 46);
});
// 13) the hat falls -> 99 -> he grows giant
shot(B('n6'), (t, k) => {
  const hf = clamp((t - EV.hatFall) / 0.9);
  const rev = t >= EV.mayorReveal;
  const gk = clamp((t - EV.mayorGrow) / 1.6);
  const n = gk > 0.2 ? 100 : 99;
  const sz = lerp(sizeOf(0), sizeOf(100), ease(gk)) * (1 + Math.sin(gk * 30) * 0.02 * (1 - gk));
  pose(mayor, { pos: [0, -7.2], y: 1.0, rot: 0, size: sz, num: rev ? n : 0, hideBadge: !rev, exp: rev ? 'shock' : 'panic', panic: !rev, wobble: gk > 0 && gk < 1, badgePop: rev && t < EV.mayorReveal + 0.4 ? 1 + Math.sin((t - EV.mayorReveal) / 0.4 * Math.PI) * 0.6 : 1 }, t);
  // hat flies off
  mayor.hat.position.set(hf * 1.6, 0.82 + Math.sin(hf * Math.PI) * 1.2 - hf * hf * 2.3, hf * 0.6);
  mayor.hat.rotation.set(hf * 2.5, 0, -hf * 3.5);
  mayor.hat.visible = hf < 1 || (t - EV.hatFall) < 1.4;
  crowdLayout(t, { cx: 0, cz: 0.5, rot: Math.PI, exp: 'shock', lookUp: -gk * 0.5 });
  if (t < EV.mayorGrow) cam([0, 3.4, -3.3], [0, 3.3, -7], 48);
  else camMove([0, 3.4, -3.3], [0, 7.5, 12], [0, 3.3, -7], [0, 8, -7], gk, 52);
});
// 14) Leo looks up at the giant
shot(B('l2'), (t, k) => {
  pose(mayor, { pos: [0, -7.2], y: 1.0, rot: 0.25, size: sizeOf(100), num: 100, exp: 'panic', shrug: true, badgeScale: 1.3 }, t);
  mayor.hat.visible = false;
  pose(leo, { pos: [1.6, -0.5], rot: Math.PI + 0.3, num: 0, exp: 'angry', talkSpk: 'leo', point: true, lookUp: -0.5 }, t);
  crowdLayout(t, { cx: -9, cz: 0.5, rot: Math.PI, exp: 'shock', lookUp: -0.5 });
  cam([6.5, 1.4, 9.5], [0.5, 9.6, -6], 74);
});
// 15) giant mayor does all the tasks
shot(B('n7'), (t, k, d) => {
  pose(mayor, { pos: [30 - k * 1.2, 0], rot: -Math.PI / 2 + 0.4, size: sizeOf(100), num: 100, exp: 'sad', sweep: true, broom: true, badgeScale: 1.6 }, t);
  mayor.hat.visible = false;
  boxesPile.visible = true; boxesPile.position.set(24, 0, 3); boxesPile.scale.setScalar(1.3); boxesPile.rotation.y = 0.3;
  crowd.slice(0, 5).forEach((c, i) => pose(c, { pos: [20 + i * 1.6, 10 + (i % 2)], rot: Math.PI + 0.6, num: c.num, exp: 'happy', cheer: i % 2 === 0 }, t));
  camMove([14, 6, 22], [16, 7, 21], [26, 7, 0], [25, 8, 0], k / d, 55);
});
// 16) Leo is the new mayor
shot(WS('n7', 6) - 0.1, (t, k, d) => {
  pose(leoCopy, { pos: [0, -6.9], y: 1.0, rot: 0, num: 0, exp: 'happy', wave: t < WS('n7', 10), cheer: t >= WS('n7', 10), jump: t > LN.n7.end }, t);
  crowdLayout(t, { cx: 0, cz: -1, rot: Math.PI, cheer: true, allCheer: true, jump: true });
  confettiAt(0, -4, t);
  const kk = clamp(k / 3.5);
  camMove([0, 4.6, -2.6], [0, 3.0, -3.4], [0, 2.4, -6.9], [0, 2.6, -6.9], kk, 52);
});

function layout(t) {
  hideAll();
  mayor.hat.position.set(0, 0.82, 0); mayor.hat.rotation.set(0, 0, 0); mayor.hat.visible = true;
  boxesPile.scale.setScalar(1); boxesPile.rotation.y = 0;
  let i = S.length - 1; while (i > 0 && S[i].start > t) i--;
  const sh = S[i], next = S[i + 1] ? S[i + 1].start : TL.total;
  sh.fn(t, t - sh.start, next - sh.start);
}

// ---------- captions ----------
function captionAt(t) {
  for (const l of TL.lines) for (let i = 0; i < l.words.length; i++) {
    const w = l.words[i], nx = l.words[i + 1];
    const end = nx ? nx.s : Math.min(l.end + 0.25, w.e + 0.4);
    if (t >= w.s - 0.03 && t < end) return { w: w.w.replace(/[.,:;]+$/, ''), k: t - w.s, spk: l.spk };
  }
  return null;
}
function drawCaption(t) {
  const c = captionAt(t); if (!c) return;
  const sc = 1 + 0.35 * Math.exp(-c.k * 20) * (c.k > 0 ? 1 : 0);
  octx.save(); octx.translate(W / 2, H * 0.64); octx.scale(sc, sc);
  let fs = 74; octx.font = `900 ${fs}px Inter, sans-serif`;
  while (octx.measureText(c.w).width > W * 0.86 && fs > 30) { fs -= 4; octx.font = `900 ${fs}px Inter, sans-serif`; }
  octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.lineJoin = 'round';
  octx.lineWidth = 14; octx.strokeStyle = '#111'; octx.strokeText(c.w, 0, 0);
  const KEY = /^(lügt|Lüge|lüge|Null|Hut|versteckt|Geheimnis|Neunundneunzig|verarscht|Ups|niemals|eins|Zahl|Aufgaben|Wahrheit|Kleinste)/i;
  if (KEY.test(c.w)) { octx.lineWidth = 16; octx.strokeText(c.w, 0, 0); octx.fillStyle = '#ffd54a'; octx.fillText(c.w, 0, 0); octx.restore(); return; }
  octx.fillStyle = c.spk === 'N' ? '#ffffff' : c.spk === 'leo' ? '#ffe14d' : c.spk === 'mayor' ? '#ff8a80' : '#ffcc80';
  octx.fillText(c.w, 0, 0);
  octx.restore();
}

window.TOTAL = TL.total;
window.renderAt = (t) => {
  layout(t);
  // camera shake + zoom punches on story beats
  const hits = [[EV.bobTick, .05, .10], [EV.timGrow, .06, .12], [EV.timShrink, .03, .06], [EV.hatFall, .10, .10], [EV.mayorReveal, .12, .16], [EV.mayorGrow, .35, .10], [WS('n2', 6), .02, .08], [WS('n4', 9), .02, .08], [LN.l1.words[8].s, .05, .10]];
  let sh = 0, punch = 0;
  for (const [e, a, p] of hits) if (t >= e) { const x = t - e; sh += a * Math.exp(-x * 4) * (e === EV.mayorGrow ? (x < 1.8 ? 1 : 0) * 3 : 1); punch += p * Math.exp(-x * 7); }
  if (sh > 0.001) { camera.position.x += Math.sin(t * 71) * sh; camera.position.y += Math.cos(t * 53) * sh; }
  if (punch > 0.001) { camera.fov *= 1 - punch; camera.updateProjectionMatrix(); }
  renderer.render(scene, camera);
  octx.drawImage(renderer.domElement, 0, 0);
  // vignette (red pulse while the mayor panics)
  const panicK = t > LN.m2.start && t < EV.mayorReveal + 1 ? 0.35 + 0.25 * Math.sin(t * 9) : 0;
  const vg = octx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, panicK ? `rgba(150,0,0,${panicK})` : 'rgba(0,0,0,0.45)');
  octx.fillStyle = vg; octx.fillRect(0, 0, W, H);
  drawCaption(t);
  // white flashes on the big reveals
  let fl = 0; for (const e of [EV.hatFall, EV.mayorReveal, EV.timGrow, EV.bobTick]) if (t >= e) fl = Math.max(fl, (e === EV.mayorReveal ? 0.9 : 0.45) * Math.exp(-(t - e) * 9));
  if (fl > 0.01) { octx.fillStyle = `rgba(255,255,255,${fl})`; octx.fillRect(0, 0, W, H); }
  // fade in / out
  const fo = Math.max(clamp(1 - t / 0.4), clamp((t - (TL.total - 0.8)) / 0.8));
  if (fo > 0) { octx.fillStyle = `rgba(0,0,0,${fo})`; octx.fillRect(0, 0, W, H); }
  return out.toDataURL('image/jpeg', 0.92);
};
await document.fonts.load('900 40px Inter');
window.READY = true;
