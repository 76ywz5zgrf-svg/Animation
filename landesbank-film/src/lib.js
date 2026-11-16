// Gemeinsame Bausteine: Materialien, Texturen, Figuren, POV-Hände
import * as THREE from 'three';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ss = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const ramp = (t, a, b) => ss((t - a) / (b - a));
export const lerp = (a, b, u) => a + (b - a) * u;
export const vlerp = (a, b, u) => V(lerp(a.x, b.x, u), lerp(a.y, b.y, u), lerp(a.z, b.z, u));

let seed = 1337;
export const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
export const setSeed = (s) => { seed = s; };

// ---------- Materialien ----------
const grad = new THREE.DataTexture(new Uint8Array([55, 120, 190, 255]), 4, 1, THREE.RedFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
const cache = {};
export function toon(color, opts = {}) {
  const key = color + JSON.stringify(Object.keys(opts).length ? Object.entries(opts).map(([k, v]) => [k, v && v.uuid ? v.uuid : v]) : 0);
  if (!cache[key]) cache[key] = new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, ...opts });
  return cache[key];
}
export const glowMat = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity });

export function ctex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.userData.canvas = c; t.userData.g = g;
  return t;
}

// ---------- Geometrie-Helfer ----------
export function add(parent, geo, mat, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  if (o.rot) m.rotation.set(...o.rot);
  if (o.scale) m.scale.set(...o.scale);
  m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false;
  if (o.layer) m.layers.set(o.layer);
  parent.add(m); return m;
}
export const box = (p, w, h, d, mat, x, y, z, o) => add(p, new THREE.BoxGeometry(w, h, d), mat, x, y, z, o);
export const cyl = (p, r1, r2, h, mat, x, y, z, o = {}) => add(p, new THREE.CylinderGeometry(r1, r2, h, o.seg || 16), mat, x, y, z, o);
export const sph = (p, r, mat, x, y, z, o) => add(p, new THREE.SphereGeometry(r, 20, 14), mat, x, y, z, o);
export function cap(p, r, len, mat, x, y, z, o) { // Kapsel, hängt vom Pivot nach unten
  const g = new THREE.CapsuleGeometry(r, len, 6, 14); g.translate(0, -(len / 2 + r * 0.6), 0);
  return add(p, g, mat, x, y, z, o);
}
export function grp(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

const glowTex = ctex(128, 128, (g) => {
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
});
export function glow(parent, color, size, x, y, z, opacity = 0.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.set(size, size, 1); s.position.set(x, y, z); s.layers.set(1); parent.add(s); return s;
}
export function cone(parent, color, radius, len, opacity = 0.1) { // Lichtkegel entlang +z
  const g = new THREE.ConeGeometry(radius, len, 28, 1, true); g.translate(0, -len / 2, 0); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  m.layers.set(1); parent.add(m); return m;
}

// ---------- Texturen ----------
export const camoTex = ctex(256, 256, (g, w, h) => {
  g.fillStyle = '#56663f'; g.fillRect(0, 0, w, h); setSeed(42);
  for (const [col, n, r] of [['#2f3d27', 70, 16], ['#7a6a42', 45, 12], ['#1c241a', 60, 8], ['#8c9a62', 35, 9]]) {
    g.fillStyle = col;
    for (let i = 0; i < n; i++) { g.beginPath(); g.ellipse(rnd() * w, rnd() * h, r * (0.5 + rnd()), r * (0.4 + rnd() * 0.6), rnd() * 3, 0, 7); g.fill(); }
  }
}, [2, 2]);

export function facade(cols, rows, wall, litChance, sd) {
  setSeed(sd);
  const cells = []; for (let i = 0; i < cols * rows; i++) cells.push(rnd() < litChance ? (rnd() < 0.5 ? '#ffd98a' : '#ffe9b8') : null);
  const draw = (emis) => (g, w, h) => {
    g.fillStyle = emis ? '#000' : wall; g.fillRect(0, 0, w, h);
    const cw = w / cols, ch = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const lit = cells[r * cols + c];
      if (!emis) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(c * cw + cw * 0.18, r * ch + ch * 0.16, cw * 0.64, ch * 0.62); }
      g.fillStyle = lit ? lit : (emis ? '#000' : '#1a2238');
      g.fillRect(c * cw + cw * 0.22, r * ch + ch * 0.2, cw * 0.56, ch * 0.54);
      if (!emis) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(c * cw + cw * 0.49, r * ch + ch * 0.2, cw * 0.03, ch * 0.54); }
    }
  };
  const map = ctex(512, 512, draw(false)), em = ctex(512, 512, draw(true));
  return new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, map, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0.55 });
}

export function noiseTex(base, speck, n, repeat, lines) {
  return ctex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h); setSeed(n);
    for (let i = 0; i < n; i++) { g.fillStyle = speck[i % speck.length]; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3); }
    if (lines) { g.strokeStyle = lines; g.lineWidth = 3; g.strokeRect(0, 0, w, h); }
  }, repeat);
}

export function sign(parent, w, h, draw, x, y, z, rotY = 0, emissive = false, px = 256) {
  const t = ctex(Math.round(px * w / h), px, draw);
  const mat = emissive ? new THREE.MeshBasicMaterial({ map: t, transparent: true }) : new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, transparent: true });
  const m = add(parent, new THREE.PlaneGeometry(w, h), mat, x, y, z, { rot: [0, rotY, 0], cast: false });
  m.userData.tex = t; return m;
}

export function skyDome(scene, top, mid, low, stars = 500) {
  const t = ctex(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h * 0.5);
    gr.addColorStop(0, top); gr.addColorStop(0.75, mid); gr.addColorStop(1, low);
    g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = low; g.fillRect(0, h * 0.5, w, h * 0.5); setSeed(5);
    for (let i = 0; i < stars; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.7})`; const s = rnd() < 0.1 ? 2 : 1; g.fillRect(rnd() * w, rnd() * h * 0.42, s, s); }
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 20), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -10; scene.add(m); return m;
}

// ---------- Figur ----------
export function makePerson(o) {
  const skin = toon(o.skin || 0xe2b08c), top = o.topMat || toon(o.top), pants = o.pantsMat || toon(o.pants), shoes = toon(o.shoes || 0x1b1b1f);
  const root = new THREE.Group(); const P = { root, o };
  const body = grp(root, 0, 0.95, 0); P.body = body;
  add(body, new THREE.CapsuleGeometry(0.135, 0.13, 6, 14), pants, 0, 0.0, 0, { rot: [0, 0, Math.PI / 2], scale: [1, 1, 0.85] });
  P.leg = {};
  for (const [k, s] of [['L', -1], ['R', 1]]) {
    const hip = grp(body, s * 0.1, 0, 0); cap(hip, 0.085, 0.3, pants, 0, 0.05, 0);
    const knee = grp(hip, 0, -0.45, 0); cap(knee, 0.07, 0.3, pants, 0, 0.04, 0);
    box(knee, 0.1, 0.09, 0.27, shoes, 0, -0.455, 0.055);
    P.leg[k] = { hip, knee };
  }
  const chest = grp(body, 0, 0.04, 0); P.chest = chest;
  add(chest, new THREE.CapsuleGeometry(0.17, 0.27, 8, 18), top, 0, 0.3, 0, { scale: [1.18, 1, 0.8] });
  if (o.hood) add(chest, new THREE.TorusGeometry(0.1, 0.045, 8, 16), top, 0, 0.56, -0.03, { rot: [Math.PI / 2.3, 0, 0] });
  if (o.collar) add(chest, new THREE.TorusGeometry(0.095, 0.035, 8, 16), toon(o.collar), 0, 0.57, 0, { rot: [Math.PI / 2, 0, 0] });
  if (o.zip) box(chest, 0.012, 0.42, 0.01, toon(0x222222), 0, 0.3, 0.137);
  if (o.vest) {
    box(chest, 0.36, 0.34, 0.3, toon(o.vest), 0, 0.3, 0);
    for (const x of [-0.1, 0.02, 0.13]) box(chest, 0.09, 0.11, 0.06, toon(0x2d3524), x, 0.2, 0.17);
    box(chest, 0.1, 0.05, 0.02, toon(0x111111), -0.09, 0.4, 0.16);
  }
  if (o.backpack) { box(chest, 0.3, 0.38, 0.15, toon(o.backpack), 0, 0.3, -0.2); box(chest, 0.2, 0.12, 0.05, toon(0x2a2d33), 0, 0.22, -0.29); }
  cyl(chest, 0.05, 0.055, 0.1, skin, 0, 0.6, 0);
  const head = grp(chest, 0, 0.64, 0); P.head = head;
  sph(head, 0.115, skin, 0, 0.115, 0, { scale: [0.94, 1.12, 1] });
  sph(head, 0.022, skin, -0.108, 0.105, 0, { scale: [0.5, 1, 0.8] }); sph(head, 0.022, skin, 0.108, 0.105, 0, { scale: [0.5, 1, 0.8] });
  add(head, new THREE.ConeGeometry(0.017, 0.045, 8), skin, 0, 0.1, 0.118, { rot: [Math.PI / 2.4, 0, 0] });
  P.eyes = []; P.brows = [];
  for (const s of [-1, 1]) {
    const e = grp(head, s * 0.041, 0.132, 0.096);
    sph(e, 0.016, toon(0xeeeae4, { roughness: 0.3 }), 0, 0, 0, { scale: [1.15, 0.85, 0.5], cast: false });
    sph(e, 0.0085, toon(0x3a2616, { roughness: 0.2 }), 0, -0.001, 0.007, { scale: [1, 1, 0.5], cast: false });
    sph(e, 0.0045, toon(0x050505, { roughness: 0.1 }), 0, -0.001, 0.0095, { scale: [1, 1, 0.4], cast: false });
    add(e, new THREE.SphereGeometry(0.0175, 14, 8, 0, 6.3, 0, 1.3), skin, 0, 0.001, 0.0, { scale: [1.2, 1, 0.62], rot: [0.35, 0, 0], cast: false });
    P.eyes.push(e);
    P.brows.push(box(head, 0.04, 0.009, 0.012, toon(o.hair || 0x2a1d14), s * 0.043, 0.168, 0.103, { rot: [0, 0, -s * 0.08], cast: false }));
  }
  P.mouth = box(head, 0.046, 0.007, 0.012, toon(0x3b1614), 0, 0.052, 0.106, { cast: false });
  const hairMat = toon(o.hair || 0x2a1d14);
  if (o.hat === 'beanie') {
    add(head, new THREE.SphereGeometry(0.123, 20, 12, 0, 6.3, 0, 1.75), toon(o.hatColor), 0, 0.14, -0.005, { rot: [-0.18, 0, 0], scale: [0.98, 1.12, 1.03] });
    add(head, new THREE.TorusGeometry(0.117, 0.02, 8, 20), toon(o.hatColor), 0, 0.158, -0.004, { rot: [Math.PI / 2 - 0.18, 0, 0] });
    add(head, new THREE.SphereGeometry(0.12, 16, 8, 0, 6.3, 1.5, 0.7), hairMat, 0, 0.115, -0.012, { rot: [-0.5, 0, 0] });
  } else if (o.hat === 'helmet') {
    add(head, new THREE.SphereGeometry(0.14, 20, 12, 0, 6.3, 0, 1.72), o.topMat, 0, 0.125, -0.005, { rot: [-0.1, 0, 0], scale: [1, 1.02, 1.1] });
    box(head, 0.025, 0.012, 0.2, toon(0x1b1f17), -0.118, 0.07, 0.0, { rot: [0.5, 0, 0] }); box(head, 0.025, 0.012, 0.2, toon(0x1b1f17), 0.118, 0.07, 0.0, { rot: [0.5, 0, 0] });
  } else {
    add(head, new THREE.SphereGeometry(0.122, 20, 12, 0, 6.3, 0, 1.55), hairMat, 0, 0.128, -0.012, { rot: [-0.35, 0, 0], scale: [1, 1.12, 1.05] });
    sph(head, 0.05, hairMat, 0.03, 0.225, 0.07, { scale: [1.4, 0.6, 1] });
  }
  P.arm = {};
  for (const [k, s] of [['L', -1], ['R', 1]]) {
    const sh = grp(chest, s * 0.25, 0.5, 0); cap(sh, 0.056, 0.2, top, 0, 0.04, 0);
    const el = grp(sh, 0, -0.29, 0); cap(el, 0.046, 0.18, top, 0, 0.035, 0); cyl(el, 0.05, 0.05, 0.03, top, 0, -0.27, 0);
    const hand = grp(el, 0, -0.29, 0); const hm = o.gloves ? toon(o.gloves) : skin;
    add(hand, new THREE.CapsuleGeometry(0.034, 0.05, 6, 10), hm, 0, -0.055, 0, { scale: [1, 1, 0.55] });
    add(hand, new THREE.CapsuleGeometry(0.012, 0.035, 4, 8), hm, -s * 0.03, -0.04, 0.012, { rot: [0, 0, s * 0.5] });
    P.arm[k] = { sh, el, hand };
  }
  // Handy-Requisite in der rechten Hand
  const ph = grp(P.arm.R.hand, 0, -0.06, 0.03); ph.rotation.set(-1.2, 0, 0);
  box(ph, 0.07, 0.145, 0.01, toon(0x15171c), 0, 0, 0);
  box(ph, 0.06, 0.13, 0.002, glowMat(0xcfe6ff), 0, 0, 0.007, { cast: false });
  ph.visible = false; P.phone = ph;
  if (o.rifle) {
    const r = grp(chest, 0.05, 0.27, 0.24); r.rotation.set(0, 0.25, -0.35); P.rifle = r;
    const dk = toon(0x1c1e22);
    box(r, 0.05, 0.07, 0.55, dk, 0, 0, 0); cyl(r, 0.014, 0.014, 0.3, dk, 0, 0.01, 0.4, { rot: [Math.PI / 2, 0, 0] });
    box(r, 0.04, 0.16, 0.06, dk, 0, -0.1, -0.05, { rot: [0.3, 0, 0] }); box(r, 0.045, 0.09, 0.2, dk, 0, -0.02, -0.36);
    box(r, 0.03, 0.04, 0.16, dk, 0, 0.06, 0.02);
    const fl = grp(r, 0, -0.045, 0.3); cyl(fl, 0.022, 0.018, 0.1, toon(0x2b2e33), 0, 0, 0, { rot: [Math.PI / 2, 0, 0] });
    const aim = grp(root, 0, 1.25, 0.6); P.aim = aim; // Lampe folgt dem Körper, nicht der schrägen Waffe
    const sl = new THREE.SpotLight(0xfff2d0, 260, 30, 0.36, 0.6, 1.6); aim.add(sl); const tg = grp(aim, 0, -0.1, 6); sl.target = tg;
    P.cone = cone(aim, 0xfff2d0, 3.0, 9, 0.07); glow(aim, 0xfff6dd, 0.5, 0, 0, 0.02, 0.9);
    P.flash = aim; P.spot = sl;
  }
  root.traverse((m) => { if (m.isMesh) { m.castShadow = m.castShadow && true; } });
  return P;
}

export function pose(P, a = {}) {
  const { walk = 0, phase = 0, crouch = 0, lean = 0, talk = 0, headX = 0, headY = 0, wide = 0, turn = 0 } = a;
  const c = crouch * 1.2, sw = Math.sin(phase) * walk;
  P.body.position.y = 0.05 + 0.9 * Math.cos(c) + Math.abs(Math.cos(phase)) * walk * 0.035;
  P.body.rotation.y = turn;
  P.leg.L.hip.rotation.x = -c - sw; P.leg.R.hip.rotation.x = -c + sw;
  P.leg.L.knee.rotation.x = 2 * c + Math.max(0, Math.cos(phase)) * walk * 1.1; P.leg.R.knee.rotation.x = 2 * c + Math.max(0, -Math.cos(phase)) * walk * 1.1;
  P.chest.rotation.set(lean + walk * 0.12, 0, 0);
  P.head.rotation.set(headX - lean * 0.6, headY, 0);
  const dA = a.arms || {};
  const L = dA.L || [sw * 0.9, -0.1, -0.2 - walk * 0.7], R = dA.R || [-sw * 0.9, 0.1, -0.2 - walk * 0.7];
  P.arm.L.sh.rotation.set(L[0], 0, L[1]); P.arm.L.el.rotation.set(L[2], 0, 0);
  P.arm.R.sh.rotation.set(R[0], 0, R[1]); P.arm.R.el.rotation.set(R[2], 0, 0);
  if (P.rifle && !dA.L) { // Waffe vor der Brust
    P.arm.L.sh.rotation.set(-0.75, 0.35, 0); P.arm.L.el.rotation.x = -1.0;
    P.arm.R.sh.rotation.set(-0.35, -0.2, 0); P.arm.R.el.rotation.x = -1.5;
  }
  P.mouth.scale.set(1 - talk * 0.25, 1 + talk * 5.5 + wide * 3, 1);
  for (const e of P.eyes) e.scale.setScalar(1 + wide * 0.32);
  for (const b of P.brows) b.position.y = 0.168 + wide * 0.016;
}
export function place(P, x, y, z, rotY, a) { P.root.visible = true; P.root.position.set(x, y, z); P.root.rotation.y = rotY; pose(P, a); }
export const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

// ---------- POV-Hände (im Kameraraum) ----------
export function makeRig(camera, sleeveColor, skinColor) {
  const rig = new THREE.Group(); camera.add(rig);
  const skin = toon(skinColor), sleeve = toon(sleeveColor);
  const R = { rig, arms: {} };
  for (const [k, s] of [['L', -1], ['R', 1]]) {
    const fg = new THREE.CylinderGeometry(0.036, 0.055, 1, 14); fg.translate(0, 0.5, 0);
    const fore = add(rig, fg, sleeve, 0, 0, 0, { cast: false, recv: false });
    const cuff = add(rig, new THREE.TorusGeometry(0.037, 0.012, 8, 14), sleeve, 0, 0, 0, { cast: false, recv: false });
    const hand = grp(rig);
    add(hand, new THREE.SphereGeometry(0.045, 16, 10), skin, 0, 0, 0, { scale: [1, 0.42, 1.12], cast: false, recv: false });
    const fingers = [];
    for (let i = 0; i < 4; i++) {
      const f = grp(hand, (i - 1.5) * 0.0185, 0, -0.045);
      const g1 = new THREE.CapsuleGeometry(0.0098, 0.03, 4, 8); g1.rotateX(Math.PI / 2); g1.translate(0, 0, -0.022);
      add(f, g1, skin, 0, 0, 0, { cast: false, recv: false });
      const f2 = grp(f, 0, 0, -0.045);
      const g2 = new THREE.CapsuleGeometry(0.009, 0.028 - (i === 3 ? 0.008 : 0), 4, 8); g2.rotateX(Math.PI / 2); g2.translate(0, 0, -0.02);
      add(f2, g2, skin, 0, 0, 0, { cast: false, recv: false });
      fingers.push([f, f2]);
    }
    const th = grp(hand, 0, 0, 0.005);
    const tg = new THREE.CapsuleGeometry(0.0115, 0.04, 4, 8); tg.rotateX(Math.PI / 2); tg.translate(0, 0, -0.03);
    const thumb = add(th, tg, skin, 0, 0, 0, { cast: false, recv: false });
    R.arms[k] = { fore, cuff, hand, fingers, th, thumb, s };
  }
  // Handy
  const phone = grp(rig); R.phone = phone;
  add(phone, new THREE.BoxGeometry(0.076, 0.158, 0.009), toon(0x121418), 0, 0, 0, { cast: false, recv: false });
  R.setArm = (k, elbow, hand, fingerDir, palmN, curl = 0.3, thumbSide = null, visible = true) => {
    const A = R.arms[k]; A.fore.visible = A.cuff.visible = A.hand.visible = visible; if (!visible) return;
    const z = fingerDir.clone().normalize().negate();
    const y = palmN.clone().normalize().negate(); y.addScaledVector(z, -y.dot(z)).normalize();
    const x = new THREE.Vector3().crossVectors(y, z);
    A.hand.position.copy(hand); A.hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    const wrist = hand.clone().addScaledVector(z, 0.05);
    if (wrist.distanceTo(elbow) > 0.34) elbow = wrist.clone().add(elbow.clone().sub(wrist).normalize().multiplyScalar(0.34));
    const d = wrist.clone().sub(elbow); const len = d.length();
    A.fore.position.copy(elbow); A.fore.scale.set(1, len, 1); A.fore.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    A.cuff.position.copy(wrist).addScaledVector(d, -0.01); A.cuff.quaternion.setFromUnitVectors(V(0, 0, 1), d);
    const cs = Array.isArray(curl) ? curl : [curl, curl, curl, curl];
    A.fingers.forEach(([f, f2], i) => { f.rotation.x = -cs[i] * 0.9; f2.rotation.x = -cs[i] * 1.1; });
    const ts = thumbSide === null ? -A.s : thumbSide;
    A.th.position.x = ts * 0.04; A.th.rotation.set(-0.2, ts * 0.75, 0);
  };
  return R;
}
