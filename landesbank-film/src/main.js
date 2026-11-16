import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  V, ss, ramp, lerp, vlerp, clamp, toon, glowMat, ctex, add, box, cyl, sph, grp, glow, cone, camoTex,
  facade, noiseTex, sign, skyDome, makePerson, pose, place, faceTo, makeRig, rnd, setSeed,
} from './lib.js';

const Q = new URLSearchParams(location.search);
const W = +(Q.get('w') || 720), H = +(Q.get('h') || 1280);
const TL = await (await fetch('/build/timeline.json')).json();

// ---------------- Renderer ----------------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, W / H, 0.03, 700);
camera.layers.enable(1); scene.add(camera);
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.55, 0.55, 0.8);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const pmrem = new THREE.PMREMGenerator(renderer);
const ENV = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const fadeMat = new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false, toneMapped: false });
const fadeQ = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), fadeMat); fadeQ.position.z = -0.1; fadeQ.renderOrder = 999; camera.add(fadeQ);
const camFill = new THREE.PointLight(0xb8c6ff, 0.3, 4, 2); camFill.position.set(0, 0.2, 0.25); camera.add(camFill);

const sky = skyDome(scene, '#03050c', '#0d1630', '#1c2240', 700);
const STARS_NONE = null;

// ---------------- Zeitachse ----------------
const SH = {}; for (const s of TL.shots) SH[s.id] = s;
const LINES = []; for (const s of TL.shots) for (const l of s.lines) LINES.push({ who: l.who, a: s.start + l.start, b: s.start + l.start + l.dur });
function talk(who, T) {
  for (const l of LINES) if (l.who === who && T >= l.a && T <= l.b) {
    const k = Math.abs(Math.sin(T * 21) * 0.6 + Math.sin(T * 13.7 + 1) * 0.4);
    return clamp(k * 1.3) * ramp(T, l.a, l.a + 0.05) * (1 - ramp(T, l.b - 0.06, l.b));
  }
  return 0;
}
const LS = (id, i) => SH[id].lines[i].start;
const LE = (id, i) => SH[id].lines[i].start + SH[id].lines[i].dur;

// ---------------- Kamera ----------------
function cam(pos, look, fov = 60, roll = 0) {
  camera.position.copy(pos); camera.up.set(0, 1, 0); camera.lookAt(look);
  if (roll) camera.rotateZ(roll);
  camera.fov = fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
}
const hand = (T, a, f = 1) => V(
  Math.sin(T * 1.7 * f) * 0.6 + Math.sin(T * 3.1 * f + 2) * 0.4,
  Math.sin(T * 1.3 * f + 1) * 0.6 + Math.sin(T * 2.7 * f) * 0.4,
  Math.sin(T * 1.1 * f + 4) * 0.5).multiplyScalar(a);
const toCam = (w) => camera.worldToLocal(w.clone());
const dirToCam = (d) => d.clone().applyQuaternion(camera.quaternion.clone().invert());

// ---------------- Figuren ----------------
const camoMat = new THREE.MeshStandardMaterial({ map: camoTex, roughness: 0.9 });
const ben = makePerson({ top: 0x2b3445, pants: 0x22252b, hood: true, zip: true, hat: 'beanie', hatColor: 0x3d434e, hair: 0x2a1d14, skin: 0xe0ae88, backpack: 0x3c4232 });
const malik = makePerson({ top: 0x7a2626, pants: 0x2e3a52, collar: 0x5e1c1c, zip: true, hair: 0x120d0a, skin: 0xb07a55, shoes: 0xdedede });
const soldOpts = (skin) => ({ topMat: camoMat, pantsMat: camoMat, hat: 'helmet', vest: 0x4a5536, gloves: 0x1c1c1c, rifle: true, skin, shoes: 0x111111, hair: 0x1a1410 });
const sol = [makePerson(soldOpts(0xd9a07c)), makePerson(soldOpts(0xc48b66)), makePerson(soldOpts(0xe3b391))];
const PEOPLE = [ben, malik, ...sol];
for (const p of PEOPLE) scene.add(p.root);
const malPhoneScr = malik.phone.children[1];

// ---------------- POV-Hände + Handy ----------------
const R = makeRig(camera, 0x2b3445, 0xe0ae88);
const phoneTex = ctex(360, 760, () => {});
const phoneScreen = add(R.phone, new THREE.PlaneGeometry(0.068, 0.146), new THREE.MeshBasicMaterial({ map: phoneTex, toneMapped: false }), 0, 0, 0.0047, { cast: false, recv: false });
function drawPhone(t) {
  const g = phoneTex.userData.g, w = 360, h = 760;
  g.fillStyle = '#0b0f17'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e8ecf4'; g.font = '600 22px Inter'; g.textAlign = 'left'; g.fillText('23:47', 26, 40);
  g.textAlign = 'right'; g.fillText('▮▮▮  84%', w - 22, 40);
  g.fillStyle = '#141b29'; g.fillRect(0, 60, w, 92);
  g.fillStyle = '#3a4152'; g.beginPath(); g.arc(52, 106, 26, 0, 7); g.fill();
  g.fillStyle = '#c8cedb'; g.font = '700 28px Inter'; g.textAlign = 'center'; g.fillText('?', 52, 116);
  g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = '700 26px Inter'; g.fillText('Unbekannt', 92, 100);
  g.fillStyle = '#8a93a6'; g.font = '500 18px Inter'; g.fillText('+49 ••• ••• •• ••', 92, 128);
  if (t > 0.75) {
    const k = ss((t - 0.75) / 0.25), y0 = 200;
    g.save(); g.translate(22, y0); g.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k); g.globalAlpha = k;
    g.fillStyle = '#262d3b'; g.beginPath(); g.roundRect(0, 0, 300, 318, 22); g.fill();
    const L = [['⚠ HEUTE NACHT.', '#fff', 700], ['03:00 UHR.', '#fff', 700], ['ATOMSCHLAG.', '#ff4a4a', 800], ['', '', 0],
      ['Die Wahrheit liegt', '#dfe5f0', 500], ['in der LANDESBANK.', '#dfe5f0', 600], ['Ebene −3.', '#dfe5f0', 600], ['', '', 0], ['Sag es NIEMANDEM.', '#ffcf5a', 700]];
    let y = 44; for (const [s, c, wgt] of L) { if (s) { g.fillStyle = c; g.font = `${wgt} 27px Inter`; g.fillText(s, 20, y); } y += s ? 33 : 14; }
    g.fillStyle = '#7c8598'; g.font = '500 17px Inter'; g.fillText('23:47', 240, 302);
    g.restore();
  }
  if (t > 0.5 && t < 2.0) { // Banner
    const k = ramp(t, 0.5, 0.7) * (1 - ramp(t, 1.7, 2.0));
    g.fillStyle = `rgba(40,48,64,${0.95 * k})`; g.beginPath(); g.roundRect(14, 64 - 70 * (1 - k), w - 28, 70, 16); g.fill();
    g.fillStyle = `rgba(255,255,255,${k})`; g.font = '700 20px Inter'; g.fillText('Neue Nachricht · Unbekannt', 30, 106 - 70 * (1 - k));
  }
  g.fillStyle = '#1a2130'; g.fillRect(0, h - 74, w, 74); g.fillStyle = '#2c3446'; g.beginPath(); g.roundRect(18, h - 58, w - 90, 42, 21); g.fill();
  g.fillStyle = '#3d7bff'; g.beginPath(); g.arc(w - 40, h - 37, 21, 0, 7); g.fill();
  phoneTex.needsUpdate = true;
}

// ---------------- Sets ----------------
const SETS = {};
function makeSet(name, ox, oy, oz, opts) { const g = grp(scene, ox, oy, oz); SETS[name] = { g, ...opts }; return g; }
const lamp = (p, x, z, h = 4.4, int = 30, shadow = false, col = 0xffc27a) => {
  const pole = toon(0x1d1f22, { roughness: 0.5, metalness: 0.5 });
  cyl(p, 0.07, 0.1, h, pole, x, h / 2, z);
  box(p, 0.5, 0.06, 0.06, pole, x + 0.22, h - 0.05, z);
  const l = grp(p, x + 0.45, h - 0.3, z);
  box(l, 0.32, 0.12, 0.32, pole, 0, 0.2, 0); add(l, new THREE.CylinderGeometry(0.1, 0.16, 0.3, 4), glowMat(0xffe0a8), 0, 0, 0, { cast: false });
  glow(l, col, 2.4, 0, 0, 0, 0.75);
  const pl = new THREE.PointLight(col, int, 22, 1.7); pl.position.set(0, -0.1, 0); l.add(pl);
  if (shadow) { pl.castShadow = true; pl.shadow.mapSize.set(512, 512); pl.shadow.bias = -0.002; }
  return pl;
};
function roofGeo(w, d, rh) {
  const s = new THREE.Shape(); s.moveTo(-d / 2 - 0.3, 0); s.lineTo(d / 2 + 0.3, 0); s.lineTo(0, rh); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: w + 0.4, bevelEnabled: false }); g.translate(0, 0, -(w + 0.4) / 2); g.rotateY(Math.PI / 2); return g;
}
function makeCar(p, x, z, ry, color) {
  const g = grp(p, x, 0, z); g.rotation.y = ry;
  const body = toon(color, { roughness: 0.35, metalness: 0.4 });
  box(g, 1.8, 0.62, 4.3, body, 0, 0.6, 0); box(g, 1.62, 0.55, 2.1, body, 0, 1.18, -0.2);
  const glass = toon(0x0d1420, { roughness: 0.1, metalness: 0.6 });
  box(g, 1.66, 0.4, 1.9, glass, 0, 1.2, -0.2); box(g, 1.5, 0.42, 2.18, glass, 0, 1.19, -0.2);
  const tire = toon(0x111111);
  for (const [a, b] of [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]]) cyl(g, 0.34, 0.34, 0.24, tire, a, 0.34, b, { rot: [0, 0, Math.PI / 2] });
  box(g, 0.3, 0.12, 0.05, glowMat(0x5a1010), -0.6, 0.72, -2.16); box(g, 0.3, 0.12, 0.05, glowMat(0x5a1010), 0.6, 0.72, -2.16);
  box(g, 0.3, 0.12, 0.05, toon(0xcfd4da, { metalness: 0.6, roughness: 0.2 }), -0.6, 0.72, 2.16); box(g, 0.3, 0.12, 0.05, toon(0xcfd4da, { metalness: 0.6, roughness: 0.2 }), 0.6, 0.72, 2.16);
  return g;
}
function makeTruck(p, x, z, ry) {
  const g = grp(p, x, 0, z); g.rotation.y = ry;
  const ol = toon(0x4a5236, { roughness: 0.85 }), dk = toon(0x2a2e22), tire = toon(0x121212);
  box(g, 2.5, 0.5, 7.4, dk, 0, 0.95, 0);
  box(g, 2.45, 1.9, 2.0, ol, 0, 2.05, 2.6); box(g, 2.2, 0.75, 0.05, toon(0x101820, { roughness: 0.1, metalness: 0.5 }), 0, 2.45, 3.62);
  box(g, 2.6, 0.35, 4.8, ol, 0, 1.35, -1.0);
  const tg = new THREE.CylinderGeometry(1.3, 1.3, 4.8, 18, 1, false, 0, Math.PI); tg.rotateX(Math.PI / 2); tg.rotateZ(Math.PI / 2);
  add(g, tg, toon(0x3f4630, { roughness: 1, side: THREE.DoubleSide }), 0, 2.1, -1.0, { scale: [1, 0.9, 1] });
  box(g, 2.6, 0.6, 4.8, toon(0x3f4630, { roughness: 1 }), 0, 1.8, -1.0);
  for (const zz of [2.7, -0.6, -2.4]) for (const s of [-1, 1]) cyl(g, 0.52, 0.52, 0.42, tire, s * 1.15, 0.52, zz, { rot: [0, 0, Math.PI / 2] });
  for (const s of [-1, 1]) { box(g, 0.25, 0.18, 0.05, glowMat(0xfff1c8), s * 0.95, 1.35, 3.62); }
  return g;
}
function jerseyGeo(len) {
  const s = new THREE.Shape(); s.moveTo(-0.32, 0); s.lineTo(0.32, 0); s.lineTo(0.2, 0.25); s.lineTo(0.12, 0.9); s.lineTo(-0.12, 0.9); s.lineTo(-0.2, 0.25); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); g.translate(0, 0, -len / 2); return g;
}
const concrete = new THREE.MeshStandardMaterial({ map: noiseTex('#8e8c86', ['#7a7873', '#a3a19b', '#6e6c68'], 4000, [0.5, 0.5]), roughness: 0.95 });
function barrier(p, x, z, ry, len = 2.4) { add(p, jerseyGeo(len), concrete, x, 0, z, { rot: [0, ry, 0] }); }
function searchlight(p, x, y, z) {
  const base = grp(p, x, 0, z); const steel = toon(0x3a3d42, { metalness: 0.5, roughness: 0.5 });
  for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) cyl(base, 0.07, 0.07, y, steel, dx, y / 2, dz);
  box(base, 2.1, 0.15, 2.1, steel, 0, y, 0);
  const piv = grp(base, 0, y + 0.7, 0); piv.rotation.order = 'YXZ';
  cyl(piv, 0.45, 0.38, 0.75, toon(0x24272b, { metalness: 0.5, roughness: 0.4 }), 0, 0, 0, { rot: [Math.PI / 2, 0, 0] });
  add(piv, new THREE.CircleGeometry(0.4, 24), glowMat(0xfff6e0), 0, 0, 0.38, { cast: false });
  glow(piv, 0xfff4dd, 4, 0, 0, 0.6, 0.9);
  const beam = cone(piv, 0xdfe8ff, 6.5, 85, 0.05);
  const sp = new THREE.SpotLight(0xf0f4ff, 30000, 140, 0.085, 0.45, 2); piv.add(sp); sp.target = grp(piv, 0, 0, 10);
  sp.castShadow = true; sp.shadow.mapSize.set(1024, 1024); sp.shadow.bias = -0.0005;
  return { base, piv, sp, beam };
}

// ===== SET: Altstadt =====
const street = makeSet('street', 0, 0, 0, { sky: true, fog: new THREE.FogExp2(0x0b1120, 0.022), fill: 0.25 });
{
  const g = street;
  const cob = ctex(512, 512, (c, w, h) => {
    c.fillStyle = '#26272c'; c.fillRect(0, 0, w, h); setSeed(3);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 17; x++) { const v = 52 + rnd() * 34 | 0; c.fillStyle = `rgb(${v},${v},${v + 5})`; c.beginPath(); c.roundRect(x * 32 + 2 - (y % 2) * 16, y * 32 + 2, 28, 28, 8); c.fill(); }
  }, [40, 40]);
  add(g, new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ map: cob, roughness: 0.55, metalness: 0.1 }), 0, 0, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  const slab = new THREE.MeshStandardMaterial({ map: noiseTex('#5a5a5e', ['#4e4e52', '#66666a'], 2500, [30, 2], '#3f3f44'), roughness: 0.8 });
  box(g, 120, 0.15, 3, slab, 0, 0.075, -7); box(g, 120, 0.15, 3, slab, 0, 0.075, 7);
  setSeed(11);
  const walls = ['#b9a68c', '#c7b9a0', '#9d8a76', '#b7a28a', '#a59985', '#c2ae92', '#8f8172'];
  for (const side of [-1, 1]) {
    let x = -48;
    while (x < 48) {
      const w = 6 + rnd() * 3, h = 8 + rnd() * 6, d = 8, cx = x + w / 2, cz = side * 12.5;
      const wall = walls[(rnd() * walls.length) | 0];
      const fac = facade(Math.round(w / 2), Math.round(h / 3), wall, 0.32, (rnd() * 1e6) | 0);
      const plain = toon(new THREE.Color(wall).multiplyScalar(0.55).getHex());
      const mats = [plain, plain, plain, plain, side < 0 ? fac : plain, side < 0 ? plain : fac];
      box(g, w, h, d, mats, cx, h / 2, cz);
      add(g, roofGeo(w, d, 3 + rnd() * 1.5), toon(0x4a2520, { roughness: 0.9 }), cx, h, cz);
      if (rnd() < 0.6) box(g, 0.6, 1.6, 0.6, toon(0x6b4a3c), cx + (rnd() - 0.5) * w * 0.6, h + 1.8, cz + 1.5);
      box(g, 1.1, 2.2, 0.15, toon(0x3b2416), cx, 1.1, side * 8.48);
      x += w + 0.02;
    }
  }
  // Kirchturm & Stadt in der Ferne
  box(g, 5, 26, 5, toon(0x6e665a), -6, 13, 45); add(g, new THREE.ConeGeometry(3.8, 12, 4), toon(0x2c4a44), -6, 32, 45, { rot: [0, Math.PI / 4, 0] });
  glow(g, 0xffd28a, 2, -6, 20, 42.4, 0.5);
  makeCar(g, -7, -4.6, Math.PI / 2, 0x5b6e7d); makeCar(g, 9, 4.6, -Math.PI / 2, 0x7d2c2c); makeCar(g, 18, -4.6, Math.PI / 2, 0x2e2f33); makeCar(g, -19, 4.6, -Math.PI / 2, 0xb8b3a6);
  lamp(g, -1.6, 0.9, 4.4, 34, true); lamp(g, -16, -5.4, 4.4, 26); lamp(g, 15, 5.4, 4.4, 26); lamp(g, 30, -5.4, 4.4, 26); lamp(g, -30, 5.4, 4.4, 26);
  const moon = new THREE.DirectionalLight(0x8ea8ff, 0.45); moon.position.set(-20, 35, -12); g.add(moon); g.add(moon.target);
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 90 }); moon.shadow.bias = -0.0008;
  g.add(new THREE.HemisphereLight(0x33447a, 0x0b0b12, 0.55));
}

// ===== SET: Landesbank aussen =====
const BO = V(0, 0, -400);
const bank = makeSet('bank', BO.x, BO.y, BO.z, { sky: true, fog: new THREE.FogExp2(0x0b1120, 0.014), fill: 0.5 });
const B = (x, y, z) => V(x + BO.x, y + BO.y, z + BO.z);
let SL1, SL2;
{
  const g = bank;
  const asph = noiseTex('#232428', ['#2b2c31', '#1c1d20', '#33343a'], 6000, [40, 40]);
  add(g, new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ map: asph, roughness: 0.7, metalness: 0.05 }), 0, 0, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  add(g, new THREE.PlaneGeometry(46, 13), new THREE.MeshStandardMaterial({ map: noiseTex('#4b4a47', ['#55544f', '#42413e'], 3000, [12, 4], '#3a3936'), roughness: 0.8 }), 0, 0.01, 6.5, { rot: [-Math.PI / 2, 0, 0], cast: false });
  const fac = facade(16, 6, '#9c9584', 0.14, 77), facS = facade(7, 6, '#9c9584', 0.1, 78), stone = toon(0x7f796c);
  box(g, 40, 20, 18, [facS, facS, stone, stone, fac, stone], 0, 10, -9);
  box(g, 41, 0.8, 19, toon(0x6d675c), 0, 20.4, -9);
  for (let i = 0; i < 6; i++) cyl(g, 0.45, 0.5, 7.6, toon(0xb8b1a1), -7.5 + i * 3, 4.3, 1.6);
  box(g, 18, 1.2, 3.2, toon(0xa9a292), 0, 8.6, 1.4);
  for (let i = 0; i < 3; i++) box(g, 18 - i * 0.6, 0.18, 3.6 - i * 0.6, toon(0x8d877a), 0, 0.09 + i * 0.18, 1.6 - i * 0.3);
  box(g, 6, 3.6, 0.2, toon(0x121822, { roughness: 0.1, metalness: 0.6, emissive: 0x0a1424 }), 0, 2.3, 0.05);
  sign(g, 13, 1.7, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#fff1cf'; c.font = `800 ${h * 0.62}px Inter`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('L A N D E S B A N K', w / 2, h * 0.55); }, 0, 10.2, 0.12, 0, true, 200);
  // Seitentür (Lieferanteneingang) an der Ostwand x=20
  box(g, 0.12, 2.3, 1.5, toon(0x3c4148, { metalness: 0.5, roughness: 0.5 }), 20.06, 1.15, 4.6);
  box(g, 0.3, 0.25, 0.5, toon(0x222222), 20.2, 2.75, 4.6); glow(g, 0xffd9a0, 1.6, 20.35, 2.6, 4.6, 0.8);
  const dl = new THREE.PointLight(0xffcf8f, 12, 10, 1.8); dl.position.set(20.6, 2.6, 4.6); g.add(dl);
  sign(g, 1.6, 0.35, (c, w, h) => { c.fillStyle = '#e8e2d2'; c.fillRect(0, 0, w, h); c.fillStyle = '#222'; c.font = `700 ${h * 0.45}px Inter`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('LIEFERANTENEINGANG', w / 2, h / 2); }, 20.08, 3.1, 4.6, Math.PI / 2, false, 128);
  // Flutlicht an der Fassade
  for (const s of [-1, 1]) {
    const sp = new THREE.SpotLight(0xe4ecff, 1100, 45, 0.55, 0.6, 2); sp.position.set(s * 11, 0.3, 7); g.add(sp);
    const tg = grp(g, s * 9, 13, 0); sp.target = tg; box(g, 0.5, 0.3, 0.4, toon(0x222), s * 11, 0.2, 7); glow(g, 0xe8f0ff, 1.5, s * 11, 0.45, 6.8, 0.8);
  }
  // Zaun
  const chain = ctex(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(165,170,176,1)'; c.lineWidth = 3; for (let i = -w; i < w * 2; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke(); c.beginPath(); c.moveTo(i, h); c.lineTo(i + h, 0); c.stroke(); } });
  const post = toon(0x55595e, { metalness: 0.6, roughness: 0.4 });
  const fence = (x1, z1, x2, z2) => {
    const L = Math.hypot(x2 - x1, z2 - z1), t = chain.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(L / 0.5, 2.6 / 0.5);
    const m = add(g, new THREE.PlaneGeometry(L, 2.6), new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.5 }), (x1 + x2) / 2, 1.3, (z1 + z2) / 2, { rot: [0, -Math.atan2(z2 - z1, x2 - x1), 0], cast: false });
    const n = Math.ceil(L / 3); for (let i = 0; i <= n; i++) cyl(g, 0.05, 0.05, 2.9, post, lerp(x1, x2, i / n), 1.45, lerp(z1, z2, i / n));
    const tr = cyl(g, 0.03, 0.03, L, post, (x1 + x2) / 2, 2.6, (z1 + z2) / 2, { rot: [0, -Math.atan2(z2 - z1, x2 - x1), Math.PI / 2] });
    for (let k = 0; k < Math.floor(L / 0.6); k++) { const u = (k + 0.5) / Math.floor(L / 0.6); add(g, new THREE.TorusGeometry(0.17, 0.008, 4, 10), post, lerp(x1, x2, u), 2.85, lerp(z1, z2, u), { rot: [0, -Math.atan2(z2 - z1, x2 - x1), 0], cast: false }); }
  };
  fence(-34, 14, -3.5, 14); fence(3.5, 14, 27, 14); fence(27, 14, 27, 8.6); fence(27, 6.4, 27, -24);
  // Schranke
  box(g, 0.3, 1.1, 0.3, toon(0xc8c8c8), -3.6, 0.55, 14.6); const arm = grp(g, -3.6, 1.0, 14.6); arm.rotation.z = 0.95;
  for (let i = 0; i < 7; i++) box(arm, 1, 0.1, 0.08, toon(i % 2 ? 0xd12b2b : 0xeeeeee), 0.5 + i, 0, 0);
  box(g, 1.8, 2.4, 1.6, toon(0x5f6457), -6, 1.2, 15.6); box(g, 1.9, 0.12, 1.7, toon(0x3a3d36), -6, 2.45, 15.6);
  glow(g, 0xffe2b0, 1, -5.1, 1.6, 16.42, 0.6); box(g, 0.05, 0.7, 0.9, glowMat(0x403520), -5.08, 1.6, 15.6);
  makeTruck(g, -11, 21, 0.25); makeTruck(g, 8, 23, -0.4);
  for (let i = 0; i < 7; i++) barrier(g, -21 + i * 3.1, 25.5, Math.PI / 2);
  for (let i = 0; i < 4; i++) barrier(g, 30, 9.6 + i * 2.5, 0);
  SL1 = searchlight(g, -17, 5, 17); SL2 = searchlight(g, 23, 6, 29);
  // Strassenlaternen
  for (const x of [-24, -8, 8, 24]) lamp(g, x, 33, 5.5, 40);
  // Stadt drumherum
  setSeed(99);
  for (let i = 0; i < 26; i++) {
    const a = -2.6 + i * 0.2, r = 70 + rnd() * 30, w = 10 + rnd() * 10, h = 15 + rnd() * 35;
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r * 0.9;
    if (bz > 20) continue;
    const f = facade(Math.round(w / 2.5), Math.round(h / 3.2), '#4c4f58', 0.25, i * 7 + 3);
    add(g, new THREE.BoxGeometry(w, h, w), f, bx, h / 2, bz, { cast: false });
  }
  const moon = new THREE.DirectionalLight(0x8ea8ff, 0.4); moon.position.set(-25, 40, 20); g.add(moon); g.add(moon.target);
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 120 }); moon.shadow.bias = -0.0008;
  g.add(new THREE.HemisphereLight(0x33447a, 0x0b0b12, 0.5));
}

// ===== SET: Gang =====
const CO = V(300, 0, 0);
const corr = makeSet('corr', CO.x, CO.y, CO.z, { sky: false, fog: new THREE.FogExp2(0x07090c, 0.035), fill: 0.5, bg: 0x000000 });
const C = (x, y, z) => V(x + CO.x, y, z + CO.z);
const corrLights = [];
{
  const g = corr;
  const WALL = ctex(256, 256, (c, w, h) => {
    c.fillStyle = '#c4bfb1'; c.fillRect(0, 0, w, h); c.fillStyle = '#34463f'; c.fillRect(0, h * 0.58, w, h * 0.42);
    c.fillStyle = '#20302a'; c.fillRect(0, h * 0.56, w, h * 0.03); setSeed(8);
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(0,0,0,${rnd() * 0.08})`; c.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 6, 2 + rnd() * 12); }
  });
  const wallMat = (len) => { const t = WALL.clone(); t.needsUpdate = true; t.wrapS = THREE.RepeatWrapping; t.repeat.set(len / 3, 1); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }); };
  const wz = (x, z1, z2) => { const L = Math.abs(z2 - z1); box(g, 0.2, 3, L, wallMat(L), x, 1.5, (z1 + z2) / 2); };
  const wx = (z, x1, x2) => { const L = Math.abs(x2 - x1); box(g, L, 3, 0.2, wallMat(L), (x1 + x2) / 2, 1.5, z); };
  const fl = new THREE.MeshStandardMaterial({ map: noiseTex('#55595e', ['#4d5156', '#5f6369', '#45494d'], 5000, [3, 16]), roughness: 0.35, metalness: 0.1 });
  box(g, 30, 0.1, 40, fl, 0, -0.05, -14);
  box(g, 30, 0.1, 40, toon(0x6b6d70), 0, 3.05, -14, { cast: false });
  wz(-1.7, 3, -8); wz(-1.7, -13, -22); wz(-1.7, -26, -31); wz(1.7, 3, -22); wz(1.7, -26, -31);
  wx(-8, -3.7, -1.7); wx(-13, -3.7, -1.7); wz(-3.7, -8, -13); wx(3, -1.7, 1.7); wx(-31, -1.7, 1.7);
  wx(-22, -12, -1.7); wx(-22, 1.7, 12); wx(-26, -12, -1.7); wx(-26, 1.7, 12);
  const pipe = toon(0x6f7a80, { metalness: 0.5, roughness: 0.4 }), red = toon(0x7d2a22, { metalness: 0.3, roughness: 0.5 });
  cyl(g, 0.08, 0.08, 34, pipe, 1.45, 2.75, -14, { rot: [Math.PI / 2, 0, 0] }); cyl(g, 0.045, 0.045, 34, red, 1.25, 2.8, -14, { rot: [Math.PI / 2, 0, 0] });
  cyl(g, 0.11, 0.11, 34, pipe, -1.45, 2.72, -14, { rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 9; i++) {
    const z = 1 - i * 4; const on = ![3, 5].includes(i);
    box(g, 0.2, 0.06, 1.3, on ? glowMat(0xeef4ff) : toon(0x8d9196), 0, 2.98, z, { cast: false });
    if (on) { const pl = new THREE.PointLight(0xe6eeff, 7, 9, 1.8); pl.position.set(0, 2.7, z); g.add(pl); corrLights.push({ pl, i }); }
  }
  for (const z of [-24]) { const pl = new THREE.PointLight(0xe6eeff, 4, 9, 1.8); pl.position.set(-5, 2.7, z); g.add(pl); box(g, 1.3, 0.06, 0.2, glowMat(0xeef4ff), -5, 2.98, z, { cast: false }); }
  const door = toon(0x5d6b70, { metalness: 0.4, roughness: 0.5 });
  const lbl = (x, z, ry, text) => sign(g, 0.7, 0.22, (c, w, h) => { c.fillStyle = '#efe9d8'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d1d1d'; c.font = `700 ${h * 0.55}px Inter`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2); }, x, 2.35, z, ry, false, 96);
  box(g, 0.08, 2.1, 1.0, door, 1.59, 1.05, -6); lbl(1.56, -6, -Math.PI / 2, 'TECHNIK');
  box(g, 0.08, 2.1, 1.0, door, -1.59, 1.05, -17); lbl(-1.56, -17, Math.PI / 2, 'ARCHIV');
  box(g, 0.08, 2.2, 1.6, toon(0x9aa1a8, { metalness: 0.6, roughness: 0.3 }), 1.59, 1.1, -18); lbl(1.56, -18, -Math.PI / 2, 'AUFZUG');
  sign(g, 0.5, 0.2, (c, w, h) => { c.fillStyle = '#0a8a3a'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = `800 ${h * 0.5}px Inter`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('NOTAUSGANG', w / 2, h / 2); }, 0, 2.7, -30.85, 0, true, 80);
  const wood = new THREE.MeshStandardMaterial({ map: ctex(128, 128, (c, w, h) => { c.fillStyle = '#8a6a43'; c.fillRect(0, 0, w, h); for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#7a5c38' : '#957349'; c.fillRect(0, i * 26, w, 24); } c.strokeStyle = '#4e3a22'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8); c.beginPath(); c.moveTo(0, 0); c.lineTo(w, h); c.stroke(); }), roughness: 0.9 });
  for (const [x, y, z, s] of [[-2.15, 0.45, -11.2, 0.9], [-2.15, 0.45, -10.25, 0.9], [-3.05, 0.45, -12.3, 0.9], [-3.05, 1.3, -12.3, 0.8], [-3.2, 0.4, -8.6, 0.8]]) box(g, s, s, s, wood, x, y, z);
  for (const [x, z] of [[-3.2, -11.3], [-2.6, -12.4]]) cyl(g, 0.3, 0.3, 0.9, toon(0x1f4f8a, { roughness: 0.5 }), x, 0.45, z);
  g.add(new THREE.HemisphereLight(0x8090a0, 0x101010, 0.12));
}

// ===== SET: Aufzug =====
const EO = V(300, 0, 100);
const elev = makeSet('elev', EO.x, EO.y, EO.z, { sky: false, fog: null, fill: 0.04, env: 0.3, exp: 0.72, bg: 0x000000 });
let elevBtn, elevDisp;
{
  const g = elev; const steel = toon(0x8f959c, { metalness: 0.75, roughness: 0.32 });
  box(g, 2.4, 0.1, 2.6, toon(0x2b2d30, { roughness: 0.6 }), 0, -0.05, 0);
  box(g, 2.4, 0.1, 2.6, toon(0xcfd2d6), 0, 2.45, 0, { cast: false });
  box(g, 0.08, 2.5, 2.4, steel, -1.04, 1.2, 0); box(g, 0.08, 2.5, 2.4, steel, 1.04, 1.2, 0); box(g, 2.2, 2.5, 0.08, steel, 0, 1.2, 1.14);
  box(g, 1.0, 2.3, 0.06, steel, -0.5, 1.15, -1.12); box(g, 1.0, 2.3, 0.06, steel, 0.5, 1.15, -1.12); box(g, 0.01, 2.3, 0.07, toon(0x222), 0, 1.15, -1.1);
  box(g, 0.05, 0.05, 2.0, toon(0x666a70, { metalness: 0.8, roughness: 0.25 }), -0.97, 0.95, 0);
  box(g, 1.4, 0.04, 1.4, glowMat(0xfff4e2), 0, 2.39, 0, { cast: false });
  const pl = new THREE.PointLight(0xfff0dc, 4, 6, 1.6); pl.position.set(0, 2.2, 0); g.add(pl);
  // Tastenfeld rechts
  const panel = sign(g, 0.26, 0.62, (c, w, h) => {
    c.fillStyle = '#2b2f35'; c.fillRect(0, 0, w, h); c.fillStyle = '#d7dbe0'; c.font = `700 ${w * 0.18}px Inter`; c.textAlign = 'right'; c.textBaseline = 'middle';
    ['0', '−1', '−2', '−3'].forEach((s, i) => c.fillText(s, w * 0.42, h * (0.2 + i * 0.2)));
    c.fillStyle = '#aab'; c.font = `600 ${w * 0.1}px Inter`; c.textAlign = 'center'; c.fillText('NUR MIT SCHLÜSSEL', w / 2, h * 0.93);
  }, 1.0, 1.35, -0.35, -Math.PI / 2, false, 256);
  const btns = [];
  for (let i = 0; i < 4; i++) {
    const y = 1.35 + 0.31 - 0.62 * (0.2 + i * 0.2), z = -0.35 + 0.035;
    btns.push(cyl(g, 0.026, 0.026, 0.02, toon(0xb9bec4, { metalness: 0.7, roughness: 0.3 }), 0.99, y, z, { rot: [0, 0, Math.PI / 2] }));
  }
  elevBtn = btns[3];
  box(g, 0.02, 0.035, 0.09, toon(0x111111), 0.995, 1.35 + 0.31 - 0.62 * 0.88, -0.35);
  const dt = ctex(256, 96, () => {});
  elevDisp = add(g, new THREE.PlaneGeometry(0.4, 0.15), new THREE.MeshBasicMaterial({ map: dt, toneMapped: false }), 0, 2.32, -1.08, { cast: false });
  elevDisp.userData.tex = dt;
}
function drawDisp(s, arrow) {
  const t = elevDisp.userData.tex, c = t.userData.g;
  c.fillStyle = '#080404'; c.fillRect(0, 0, 256, 96); c.fillStyle = '#ff3a22'; c.font = '700 64px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText((arrow ? '▼ ' : '') + s, 128, 52); t.needsUpdate = true;
}

// ===== SET: Tresor + Kommandozentrale =====
const VO = V(300, 0, 250);
const vault = makeSet('vault', VO.x, VO.y, VO.z, { sky: false, fog: new THREE.FogExp2(0x05070b, 0.02), fill: 0.25, env: 0.05, exp: 0.8, bg: 0x000000 });
const VV = (x, y, z) => V(x + VO.x, y, z + VO.z);
let alarmFill; const hallLamps = []; let doorPiv, wheel, screenTex, folderCover, alarmLights = [], alarmBeacons = [], vaultLights = [];
{
  const g = vault;
  const conc = new THREE.MeshStandardMaterial({ map: noiseTex('#4a4d52', ['#43464b', '#53565b', '#3c3e42'], 6000, [6, 6]), roughness: 0.9 });
  const fl = new THREE.MeshStandardMaterial({ map: noiseTex('#3d4045', ['#36393d', '#45484d'], 5000, [8, 10]), roughness: 0.3, metalness: 0.15 });
  box(g, 24, 0.1, 30, fl, 0, -0.05, 0); box(g, 24, 0.2, 30, conc, 0, 10.1, 0, { cast: false });
  box(g, 0.4, 10, 30, conc, -12, 5, 0); box(g, 0.4, 10, 30, conc, 12, 5, 0); box(g, 24, 10, 0.4, conc, 0, 5, 15);
  const ws = new THREE.Shape(); ws.moveTo(-12, 0); ws.lineTo(12, 0); ws.lineTo(12, 10); ws.lineTo(-12, 10); ws.closePath();
  const hole = new THREE.Path(); hole.absarc(0, 2.05, 2.08, 0, Math.PI * 2, true); ws.holes.push(hole);
  const wg = new THREE.ExtrudeGeometry(ws, { depth: 1.2, bevelEnabled: false, curveSegments: 48 }); wg.translate(0, 0, -16.2);
  add(g, wg, conc);
  const ringG = new THREE.TorusGeometry(2.25, 0.18, 12, 64); add(g, ringG, toon(0x7d8187, { metalness: 0.7, roughness: 0.35 }), 0, 2.05, -14.95);
  // Tür
  doorPiv = grp(g, -2.05, 2.05, -15.5);
  const steel = toon(0x8a9096, { metalness: 0.6, roughness: 0.45 }), dsteel = toon(0x5c6167, { metalness: 0.6, roughness: 0.5 });
  const door = grp(doorPiv, 2.05, 0, 0);
  cyl(door, 2.02, 2.02, 0.9, steel, 0, 0, 0, { rot: [Math.PI / 2, 0, 0], seg: 64 });
  for (const r of [1.85, 1.35, 0.85]) add(door, new THREE.TorusGeometry(r, 0.035, 8, 64), dsteel, 0, 0, 0.46);
  for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; cyl(door, 0.06, 0.06, 0.12, dsteel, Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0.48, { rot: [Math.PI / 2, 0, 0] }); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; box(door, 0.5, 0.18, 0.2, dsteel, Math.cos(a) * 2.1, Math.sin(a) * 2.1, 0, { rot: [0, 0, a] }); }
  cyl(door, 0.38, 0.42, 0.25, dsteel, 0, 0, 0.55, { rot: [Math.PI / 2, 0, 0] });
  wheel = grp(door, 0, 0, 0.72);
  add(wheel, new THREE.TorusGeometry(0.55, 0.045, 10, 40), toon(0xb8bdc3, { metalness: 0.85, roughness: 0.25 }));
  for (let i = 0; i < 4; i++) box(wheel, 1.1, 0.06, 0.06, toon(0xb8bdc3, { metalness: 0.85, roughness: 0.25 }), 0, 0, 0, { rot: [0, 0, i * Math.PI / 4 * 2 / 2 * 1] });
  for (let i = 0; i < 4; i++) sph(wheel, 0.06, toon(0x2a2a2a), Math.cos(i * Math.PI / 2) * 0.55, Math.sin(i * Math.PI / 2) * 0.55, 0);
  for (const y of [1.2, -1.2]) box(doorPiv, 0.5, 0.5, 1.0, dsteel, -0.1, y, 0);
  // Warnstreifen + Schilder
  add(g, new THREE.PlaneGeometry(7, 1.2), new THREE.MeshStandardMaterial({ map: ctex(512, 88, (c, w, h) => { c.fillStyle = '#e5b416'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; for (let x = -h; x < w; x += 44) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 22, h); c.lineTo(x + 22 + h, 0); c.lineTo(x + h, 0); c.fill(); } }), roughness: 0.6 }), 0, 0.01, -13.7, { rot: [-Math.PI / 2, 0, 0], cast: false });
  sign(g, 5, 0.9, (c, w, h) => { c.fillStyle = '#d9d4c4'; c.fillRect(0, 0, w, h); c.fillStyle = '#9b1515'; c.fillRect(0, 0, w, h * 0.12); c.fillRect(0, h * 0.88, w, h * 0.12); c.fillStyle = '#151515'; c.font = `800 ${h * 0.34}px Inter`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('EBENE −3 · SICHERHEITSBEREICH', w / 2, h * 0.38); c.font = `600 ${h * 0.2}px Inter`; c.fillText('ZUTRITT NUR FÜR BEFUGTE', w / 2, h * 0.7); }, 0, 5.4, -14.98, 0, false, 160);
  for (const s of [-1, 1]) {
    const sp = new THREE.SpotLight(0xcfe0ff, 130, 30, 0.5, 0.5, 1.8); sp.position.set(s * 4, 9.6, -9); g.add(sp); sp.target = grp(g, s * 0.6, 1.5, -15);
    sp.castShadow = true; sp.shadow.mapSize.set(1024, 1024); sp.shadow.bias = -0.0005; vaultLights.push(sp);
    box(g, 0.6, 0.3, 0.6, toon(0x222), s * 4, 9.85, -9); glow(g, 0xdfeaff, 1.4, s * 4, 9.6, -9, 0.7);
    for (const z of [-6, 4]) { const pl = new THREE.PointLight(0xffb36b, 6, 12, 1.8); pl.position.set(s * 11.4, 4.5, z); g.add(pl); hallLamps.push(pl); box(g, 0.25, 0.4, 0.25, glowMat(0xffc58a), s * 11.7, 4.5, z); glow(g, 0xffb36b, 1.2, s * 11.5, 4.5, z, 0.6); }
  }
  for (const s of [-1, 1]) cyl(g, 0.18, 0.18, 30, toon(0x5a6168, { metalness: 0.5, roughness: 0.4 }), s * 11.5, 8.8, 0, { rot: [Math.PI / 2, 0, 0] });
  g.add(new THREE.HemisphereLight(0x5c6a85, 0x0a0a0a, 0.18));
  // Kommandozentrale
  const dark = toon(0x1c2026, { roughness: 0.6 });
  box(g, 20, 0.1, 20.4, toon(0x15181d, { roughness: 0.25, metalness: 0.3 }), 0, -0.04, -26.2);
  box(g, 20, 0.2, 20.4, toon(0x0e1014), 0, 8.1, -26.2, { cast: false });
  box(g, 0.3, 8, 20.4, dark, -10, 4, -26.2); box(g, 0.3, 8, 20.4, dark, 10, 4, -26.2); box(g, 20, 8, 0.3, dark, 0, 4, -36.35);
  for (let i = 0; i < 5; i++) box(g, 0.25, 8, 0.25, toon(0x2b313a), -8 + i * 4, 4, -36.1);
  screenTex = ctex(1400, 700, () => {});
  add(g, new THREE.PlaneGeometry(14, 7), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }), 0, 4.4, -36.15, { cast: false });
  box(g, 14.4, 7.4, 0.12, toon(0x0a0a0c), 0, 4.4, -36.24);
  const mon = ctex(256, 160, (c, w, h) => { c.fillStyle = '#04121e'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2fd18a'; c.lineWidth = 3; c.beginPath(); for (let x = 0; x < w; x += 8) c.lineTo(x, h * 0.6 + Math.sin(x * 0.07) * 20 + Math.sin(x * 0.21) * 8); c.stroke(); c.fillStyle = '#3fb2ff'; for (let i = 0; i < 5; i++) c.fillRect(14, 14 + i * 14, 40 + (i * 37) % 90, 6); c.fillStyle = '#ff4646'; c.fillRect(w - 60, 14, 46, 18); });
  const monMat = new THREE.MeshBasicMaterial({ map: mon, toneMapped: false, color: 0x9aa8b8 });
  for (const z of [-27, -31]) for (let i = 0; i < 4; i++) {
    const x = -6 + i * 4;
    box(g, 3.2, 0.9, 1.0, toon(0x262b33, { roughness: 0.4, metalness: 0.3 }), x, 0.45, z);
    for (const dx of [-0.8, 0.8]) { box(g, 0.75, 0.48, 0.05, toon(0x0c0c0c), x + dx, 1.25, z - 0.25, { rot: [-0.15, 0, 0] }); add(g, new THREE.PlaneGeometry(0.68, 0.42), monMat, x + dx, 1.25, z - 0.22, { rot: [-0.15, 0, 0], cast: false }); }
    box(g, 0.55, 0.08, 0.55, toon(0x111), x, 0.55, z + 1.0); cyl(g, 0.04, 0.04, 0.5, toon(0x333), x, 0.28, z + 1.0); box(g, 0.55, 0.6, 0.08, toon(0x111), x, 0.9, z + 1.3);
  }
  for (const [x, z] of [[-6, -22], [6, -22], [0, -33]]) { const pl = new THREE.PointLight(0x3a7bd5, 10, 16, 1.6); pl.position.set(x, 6.5, z); g.add(pl); }
  const scrL = new THREE.PointLight(0x4aa3ff, 60, 26, 1.6); scrL.position.set(0, 4.4, -33); g.add(scrL);
  // Tisch + Akte
  box(g, 1.7, 0.06, 1.1, toon(0x2e333b, { roughness: 0.4, metalness: 0.4 }), 0, 0.88, -21.1);
  for (const [a, b] of [[-0.75, -0.45], [0.75, -0.45], [-0.75, 0.45], [0.75, 0.45]]) cyl(g, 0.03, 0.03, 0.86, toon(0x222), a, 0.43, -21.1 + b);
  const fold = grp(g, 0, 0.915, -21.05);
  const redM = toon(0x8f1d1d, { roughness: 0.7 });
  box(fold, 0.32, 0.01, 0.44, redM, 0, 0, 0);
  const pageT = ctex(320, 440, (c, w, h) => {
    c.fillStyle = '#f2eee2'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b1b1b'; c.font = '800 24px Inter'; c.fillText('OPERATION MORGENROT', 18, 44);
    c.font = '600 15px monospace'; const L = ['Einstufung: STRENG GEHEIM', '', 'Schutzplätze Ebene −3:', '   4.000 Personen', '', 'Zugang:', ' – Regierung', ' – Bundeswehr', ' – Bankvorstand', '', 'Zeitpunkt: 03:00 Uhr', '', 'Warnung der Bevölkerung:'];
    L.forEach((s, i) => c.fillText(s, 18, 80 + i * 22));
    c.save(); c.translate(160, 400); c.rotate(-0.12); c.strokeStyle = '#c21b1b'; c.lineWidth = 4; c.strokeRect(-128, -26, 256, 46); c.fillStyle = '#c21b1b'; c.font = '900 24px Inter'; c.textAlign = 'center'; c.fillText('NICHT VORGESEHEN', 0, 6); c.restore();
  });
  const pageM = new THREE.MeshStandardMaterial({ map: pageT, roughness: 0.9 }), pw = toon(0xece8dc);
  box(fold, 0.3, 0.012, 0.42, [pw, pw, pageM, pw, pw, pw], 0.005, 0.011, 0);
  folderCover = grp(fold, -0.16, 0.019, 0);
  const coverT = ctex(320, 440, (c, w, h) => { c.fillStyle = '#8f1d1d'; c.fillRect(0, 0, w, h); c.fillStyle = '#f0d9c8'; c.font = '800 26px Inter'; c.textAlign = 'center'; c.fillText('OPERATION', w / 2, 120); c.fillText('MORGENROT', w / 2, 154); c.save(); c.translate(w / 2, 290); c.rotate(-0.15); c.strokeStyle = '#fff'; c.lineWidth = 5; c.strokeRect(-120, -32, 240, 56); c.fillStyle = '#fff'; c.font = '900 30px Inter'; c.fillText('STRENG GEHEIM', 0, 8); c.restore(); });
  box(folderCover, 0.32, 0.008, 0.44, [redM, redM, new THREE.MeshStandardMaterial({ map: coverT, roughness: 0.7 }), redM, redM, redM], 0.16, 0, 0);
  // Alarm
  alarmFill = new THREE.PointLight(0xff1a10, 0, 40, 1.2); alarmFill.position.set(0, 6, -16); g.add(alarmFill);
  for (const [x, z] of [[-9.7, -20], [9.7, -20], [-9.7, -32], [9.7, -32], [-11.7, -12], [11.7, -12]]) {
    const b = cyl(g, 0.16, 0.16, 0.3, glowMat(0x330000), x, 7.2, z, { cast: false }); alarmBeacons.push(b);
    const sp = new THREE.SpotLight(0xff1a10, 0, 30, 0.45, 0.5, 1.5); sp.position.set(x, 7.1, z); g.add(sp); sp.target = grp(g, x, 3, z + 5); alarmLights.push(sp);
  }
}
function drawScreen(T, alarm) {
  const c = screenTex.userData.g, w = 1400, h = 700;
  c.fillStyle = alarm ? '#1a0408' : '#03101d'; c.fillRect(0, 0, w, h);
  c.strokeStyle = alarm ? 'rgba(255,60,60,0.12)' : 'rgba(60,160,255,0.12)'; c.lineWidth = 1;
  for (let x = 0; x < w; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y < h; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  const acc = alarm ? '#ff5a5a' : '#46b8ff';
  c.fillStyle = acc; c.font = '700 26px Inter'; c.textAlign = 'left'; c.fillText('NOTFALLPROTOKOLL  »MORGENROT«  ·  STRENG GEHEIM', 36, 50);
  const DE = [[6.0, 51.8], [5.9, 51.0], [6.1, 50.1], [6.4, 49.5], [7.0, 49.2], [8.2, 48.97], [7.6, 47.6], [8.6, 47.6], [9.6, 47.5], [10.5, 47.5], [11.0, 47.4], [12.2, 47.6], [13.0, 47.5], [13.0, 48.3], [13.8, 48.6], [12.5, 49.5], [12.1, 50.3], [13.3, 50.6], [14.8, 50.9], [15.0, 51.1], [14.6, 51.8], [14.7, 52.6], [14.4, 53.3], [14.2, 53.9], [13.0, 54.4], [11.3, 54.1], [10.9, 54.4], [9.9, 54.8], [8.6, 54.9], [8.6, 53.9], [7.0, 53.5], [7.2, 52.9], [6.7, 52.5]];
  const mx = (lo) => 80 + (lo - 5.5) * 0.63 * 85, my = (la) => 90 + (55.2 - la) * 72;
  c.beginPath(); DE.forEach(([lo, la], i) => i ? c.lineTo(mx(lo), my(la)) : c.moveTo(mx(lo), my(la))); c.closePath();
  c.fillStyle = alarm ? 'rgba(255,60,60,0.16)' : 'rgba(40,140,230,0.2)'; c.fill(); c.strokeStyle = acc; c.lineWidth = 3; c.stroke();
  const cities = [['Berlin', 13.4, 52.5], ['Hamburg', 10.0, 53.55], ['München', 11.58, 48.14], ['Köln', 6.96, 50.94], ['Frankfurt', 8.68, 50.11], ['Stuttgart', 9.18, 48.78]];
  cities.forEach(([n, lo, la], i) => {
    const x = mx(lo), y = my(la), p = (T * 0.8 + i * 0.17) % 1;
    c.strokeStyle = `rgba(255,70,70,${1 - p})`; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 8 + p * 34, 0, 7); c.stroke();
    c.fillStyle = '#ff4646'; c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill(); c.fillStyle = '#d8e6f5'; c.font = '600 18px Inter'; c.fillText(n, x + 12, y - 10);
  });
  const rem = Math.max(0, 2759 - (T - SH.vault_wide.start)), mm = Math.floor(rem / 60), sec = Math.floor(rem % 60), cs = Math.floor((rem % 1) * 100);
  c.fillStyle = '#9fb3c8'; c.font = '700 30px Inter'; c.fillText('EINSCHLAG IN', 760, 170);
  c.fillStyle = '#ff3b30'; c.font = '800 118px Inter'; c.fillText(`00:${String(mm).padStart(2, '0')}:${String(sec).padStart(2, '0')}`, 750, 290);
  c.font = '700 44px Inter'; c.fillText('.' + String(cs).padStart(2, '0'), 1252, 290);
  c.fillStyle = '#9fb3c8'; c.font = '600 26px Inter'; c.fillText('ZEITPUNKT: 03:00:00 MEZ', 760, 340);
  const rows = [['SCHUTZRAUM EBENE −3', 'BEREIT', '#37d67a'], ['PLÄTZE (4.000)', 'RESERVIERT', '#37d67a'], ['EVAKUIERUNG BEVÖLKERUNG', 'NICHT VORGESEHEN', '#ff4646'], ['INFORMATION ÖFFENTLICHKEIT', 'GESPERRT', '#ff4646']];
  rows.forEach(([a, b, col], i) => { const y = 420 + i * 58; c.fillStyle = '#c4d2e2'; c.font = '600 24px Inter'; c.fillText(a, 760, y); c.fillStyle = col; c.font = '800 24px Inter'; c.textAlign = 'right'; c.fillText(b, 1360, y); c.textAlign = 'left'; c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(760, y + 14, 600, 2); });
  if (alarm && (T * 2) % 1 < 0.5) { c.fillStyle = 'rgba(255,40,40,0.9)'; c.fillRect(0, h - 70, w, 70); c.fillStyle = '#fff'; c.font = '900 40px Inter'; c.textAlign = 'center'; c.fillText('⚠  UNBEFUGTER ZUTRITT – EBENE −3  ⚠', w / 2, h - 22); c.textAlign = 'left'; }
  screenTex.needsUpdate = true;
}

// ---------------- Frame-Setup ----------------
function reset() {
  for (const p of PEOPLE) { p.root.visible = false; p.phone.visible = false; if (p.spot) { p.flash.visible = true; p.cone.visible = true; p.flash.rotation.set(0, 0, 0); } }
  for (const k of ['L', 'R']) R.setArm(k, V(0, 0, 0), V(0, 0, -1), V(0, 0, -1), V(0, 1, 0), 0, null, false);
  R.phone.visible = false; fadeMat.opacity = 0; fadeMat.color.set(0);
  for (const a of alarmLights) a.intensity = 0; alarmFill.intensity = 0; for (const v of vaultLights) v.intensity = 130; for (const h of hallLamps) h.intensity = 6; for (const b of alarmBeacons) b.material.color.set(0x330000);
  doorPiv.rotation.y = 0; wheel.rotation.z = 0; folderCover.rotation.z = 0;
}
function show(name) {
  for (const k in SETS) SETS[k].g.visible = k === name;
  const s = SETS[name]; sky.visible = !!s.sky; scene.fog = s.fog; scene.background = s.sky ? null : new THREE.Color(s.bg || 0);
  renderer.toneMappingExposure = s.exp || 1.1; scene.environment = s.env ? ENV : null; scene.environmentIntensity = s.env || 0; camFill.intensity = s.fill;
}
// POV-Hände: locker im Bild / an Weltpunkt festhalten
function idle(T, which = 'LR', o = {}) {
  for (const k of which) {
    const s = k === 'L' ? -1 : 1, sw = hand(T + s * 1.7, o.sway ?? 0.008, 1.2);
    const hp = V(s * (o.x ?? 0.1), (o.y ?? -0.17) + (o.lift || 0), o.z ?? -0.36).add(sw);
    R.setArm(k, V(s * 0.22, -0.6, 0.0), hp, V(-s * 0.3, 0.55, -1), V(-s * 0.55, -0.75, -0.2), o.curl ?? 0.6, null);
  }
}
function gripW(k, w, fingerW = V(0, 0, -1), palmW = V(0, -1, 0), curl = 0.75) {
  const s = k === 'L' ? -1 : 1;
  R.setArm(k, V(s * 0.24, -0.6, 0.02), toCam(w), dirToCam(fingerW), dirToCam(palmW), curl, null);
}
const FWD_BEN = 0.27; // Ben schaut zu Malik
const benStreet = () => place(ben, 0, 0, 0, FWD_BEN, {});

// ---------------- Shots ----------------
const introCurve = new THREE.CatmullRomCurve3([V(-8, 21, -6.2), V(-6.2, 10, -5.6), V(-3.8, 3.6, -4.2), V(-2.4, 2.0, -2.9)]);
const SHOTS = {
  intro_wide(t, d, T) {
    show('street');
    const u = 1 - Math.pow(1 - t / d, 2.2);
    const p = introCurve.getPoint(u), look = vlerp(V(0, 0, 6), V(0.25, 1.35, 0.6), ss(u * 1.15));
    cam(p.add(hand(T, 0.03)), look, lerp(50, 44, u));
    place(ben, 0, 0, 0, FWD_BEN, { headX: 0.45, arms: { L: [0.05, -0.1, -0.15], R: [-0.85, 0.2, -1.35] } }); ben.phone.visible = true;
    place(malik, 0.35, 0, 1.25, FWD_BEN + Math.PI + 0.5, { headY: Math.sin(T * 0.7) * 0.4, arms: { L: [0.1, -0.12, -0.3], R: [0.1, 0.12, -0.3] } });
  },
  phone(t, d, T) {
    show('street');
    place(malik, 0.35, 0, 1.25, FWD_BEN + Math.PI + lerp(0.5, 0, ramp(t, 2.0, 3.0)), { talk: talk('MALIK', T), headY: lerp(0.4, 0, ramp(t, 2.0, 3.0)), arms: { L: [0.1, -0.12, -0.3], R: [0.1, 0.12, -0.3] } });
    const up = ramp(t, 2.9, 3.7), pitch = lerp(-0.62, -0.12, up);
    const pos = V(0, 1.74, 0).add(hand(T, 0.01)), f = V(Math.sin(FWD_BEN + 0.06), 0, Math.cos(FWD_BEN + 0.06));
    cam(pos, pos.clone().add(f).add(V(0, Math.tan(pitch), 0)), lerp(62, 56, t / d));
    drawPhone(t); R.phone.visible = true;
    const vib = (t > 0.5 && t < 0.92) || (t > 1.1 && t < 1.52) ? V(Math.sin(T * 190) * 0.0025, Math.cos(T * 170) * 0.002, 0) : V(0, 0, 0);
    const pp = V(0.0, lerp(-0.075, -0.24, up), -0.3).add(vib).add(hand(T, 0.004, 2));
    R.phone.position.copy(pp); R.phone.rotation.set(lerp(0.12, -0.5, up), -0.06, 0.03);
    R.setArm('R', V(0.22, -0.5, 0.04), pp.clone().add(V(0.012, -0.075, -0.016)), V(0.05, 1, 0), V(0, 0, 1), 0.12, 1);
    idle(T, 'L', { x: 0.085, y: lerp(-0.2, -0.17, up), z: -0.33 });
  },
  malik_talk(t, d, T) {
    show('street');
    const l2 = LS('malik_talk', 2), buzz = l2 - 1.15;
    const pos = V(0, 1.74, 0).add(hand(T, 0.012));
    const target = V(0.35, 1.6, 1.25).add(V(lerp(-0.1, 0.05, t / d), 0, 0));
    cam(pos, target, lerp(56, 46, ss(t / d)));
    // Handy zu Malik gedreht
    const hold = 1 - ramp(t, LE('malik_talk', 0) + 0.4, LE('malik_talk', 0) + 0.9);
    if (hold > 0) {
      R.phone.visible = true; drawPhone(5);
      const pp = V(0.06, lerp(-0.42, -0.16, ramp(t, 0, 0.4)) - (1 - hold) * 0.4, -0.45);
      R.phone.position.copy(pp); R.phone.rotation.set(0.15, Math.PI - 0.15, 0);
      R.setArm('R', V(0.26, -0.55, -0.05), pp.clone().add(V(0.01, -0.075, -0.016)), V(0.05, 1, 0), V(0, 0, 1), 0.12, 1);
    }
    if (hold <= 0.02) {
      R.phone.visible = true; drawPhone(5);
      const pp = V(0.1, -0.2, -0.34).add(hand(T, 0.006, 1.4));
      R.phone.position.copy(pp); R.phone.rotation.set(-0.9, -0.25, 0.1);
      R.setArm('R', V(0.24, -0.55, 0.02), pp.clone().add(V(0.012, -0.03, -0.06)), V(-0.05, 0.6, -0.8), V(0, 0.8, 0.6), 0.15, 1);
    }
    const gest = t > LS('malik_talk', 1) && t < LE('malik_talk', 1) ? 0.04 * Math.max(0, Math.sin(T * 5)) : 0;
    idle(T, 'L', { lift: gest + (hold > 0.02 ? 0 : 0.01) });
    const crossed = 1 - ramp(t, buzz + 0.1, buzz + 0.5);
    const look = ramp(t, buzz + 0.3, buzz + 0.7) * (1 - ramp(t, l2 - 0.15, l2 + 0.2));
    const skeptic = t > LS('malik_talk', 1) && t < LE('malik_talk', 1) ? Math.sin(T * 4) * 0.12 : 0;
    const arms = crossed > 0.5 ? { L: [0.12, -0.05, -0.25], R: [0.12, 0.05, -0.25] } : { L: [0.1, -0.12, -0.3], R: [lerp(0, -1.0, ramp(t, buzz + 0.1, buzz + 0.5)), 0.1, lerp(-0.3, -1.35, ramp(t, buzz + 0.1, buzz + 0.5))] };
    place(malik, 0.35, 0, 1.25, FWD_BEN + Math.PI, { talk: talk('MALIK', T), headY: skeptic, headX: look * 0.45, wide: ramp(t, l2 - 0.3, l2), arms });
    malik.phone.visible = crossed <= 0.5; malPhoneScr.material.color.set(t > buzz ? 0xcfe6ff : 0x223344);
    if (t > buzz && t < buzz + 0.45) malik.root.position.x += Math.sin(T * 120) * 0.004;
  },
  decide(t, d, T) {
    show('street'); benStreet();
    const l1 = LS('decide', 1), l2 = LS('decide', 2);
    place(ben, 0, 0, 0, FWD_BEN, { talk: talk('BEN', T), headX: -0.05, arms: { L: [0.05, -0.1, -0.2], R: [0.05, 0.1, -0.2] } });
    place(malik, 0.35, 0, 1.25, FWD_BEN + Math.PI, { talk: talk('MALIK', T), wide: t > l1 ? 0.6 : 0, headY: t > l1 && t < l2 ? Math.sin(T * 3) * 0.06 : 0, arms: t > l1 && t < l2 ? { L: [-0.5, -0.3, -1.2], R: [-0.5, 0.3, -1.2] } : undefined });
    if (t < l1 - 0.1) {
      const u = t / (l1 - 0.1);
      cam(vlerp(V(2.6, 1.5, -0.4), V(1.8, 1.62, 0.1), ss(u)).add(hand(T, 0.01)), V(0.15, 1.62, 0.6), lerp(42, 30, ss(u)));
    } else if (t < l2 - 0.1) {
      const u = (t - l1) / (l2 - l1);
      cam(vlerp(V(-0.5, 1.78, -0.42), V(-0.42, 1.76, -0.28), u).add(hand(T, 0.006)), V(0.35, 1.66, 1.25), lerp(34, 28, u));
    } else {
      const u = (t - l2) / (d - l2);
      cam(vlerp(V(0.85, 1.76, 1.7), V(0.75, 1.75, 1.55), u).add(hand(T, 0.006)), V(0, 1.68, 0), lerp(30, 22, ss(u)));
    }
  },
  bank_wide(t, d, T) {
    show('bank'); const u = ss(t / d);
    cam(vlerp(B(-16, 5.5, 46), B(20, 4.5, 42), u), vlerp(B(-14, 7, 0), B(24, 4, 6), u), 48);
    patrol(T); SL1.piv.rotation.set(0.12, Math.sin(T * 0.35) * 0.7, 0); SL2.piv.rotation.set(0.15, -0.8 + Math.sin(T * 0.3) * 0.5, 0);
  },
  barrier(t, d, T) {
    show('bank'); patrol(T);
    const duck = ramp(t, d - 1.9, d - 1.5);
    const pos = B(30.72, lerp(1.05, 0.8, duck), 12.8).add(hand(T, 0.008));
    const mpos = B(30.6, 0, 11.75);
    const toM = ramp(t, 0.0, 0.35) * (1 - ramp(t, LE('barrier', 0) + 0.05, LE('barrier', 0) + 0.55));
    cam(pos, vlerp(B(20.5, lerp(1.5, 1.15, duck), 6.0).add(hand(T, 0.06)), B(30.6, 0.95, 11.7), toM), 64);
    gripW('L', B(30.12, 0.9 - duck * 0.1, 12.55), V(-1, -0.2, 0.15), V(0, -1, 0), 0.8);
    gripW('R', B(30.12, 0.9 - duck * 0.1, 12.15), V(-1, -0.2, -0.15), V(0, -1, 0), 0.8);
    place(malik, mpos.x, 0, mpos.z, faceTo(mpos.x, mpos.z, pos.x, pos.z) - 0.2, { crouch: lerp(0.75, 0.95, duck), lean: 0.2 + duck * 0.3, headX: duck * 0.5, talk: talk('MALIK', T), arms: { L: [-0.7, -0.1, -1.2], R: [-0.6, 0.1, -1.0] } });
    // Suchscheinwerfer streift über die Sperre
    const k = ramp(t, d - 2.6, d - 0.3);
    SL2.piv.rotation.set(0.17, lerp(-1.3, -0.15, k), 0); SL1.piv.rotation.set(0.12, Math.sin(T * 0.35) * 0.7, 0);
  },
  soldier_zoom(t, d, T) {
    show('bank'); patrol(T, true);
    const s = sol[2]; const walk = ramp(t, 0.9, 1.2), dist = Math.max(0, t - 0.9) * 1.4;
    const rot = lerp(Math.PI / 2 + 0.4, Math.PI, ramp(t, 0.7, 1.1));
    place(s, B(22.4, 0, 0).x, 0, B(0, 0, 4.4 - dist).z, rot, { walk: walk * 0.8, phase: dist * 2.7 });
    s.flash.rotation.y = Math.sin(T * 1.3) * 0.3;
    const z = ss(clamp(t / 1.7));
    if (z < 0.25) { gripW('L', B(30.12, 0.9, 12.55), V(-1, -0.2, 0.15)); gripW('R', B(30.12, 0.9, 12.15), V(-1, -0.2, -0.15)); }
    cam(B(31.4, 1.05, 12.8).add(hand(T, 0.012 + z * 0.004)), B(22.4, 1.4, 4.4 - dist * 0.85).add(hand(T, 0.05 * z, 1.4)), lerp(64, 17, z));
    SL1.piv.rotation.set(0.12, Math.sin(T * 0.35) * 0.7, 0); SL2.piv.rotation.set(0.17, -0.15 + Math.sin(T * 0.4) * 0.3, 0);
  },
  run(t, d, T) {
    show('bank'); patrol(T, true);
    const path = new THREE.CatmullRomCurve3([B(31.4, 1.6, 12.8), B(29, 1.6, 9.5), B(27, 1.6, 7.5), B(24, 1.6, 6.2), B(21.0, 1.6, 4.9)]);
    const u = clamp(t / 3.3), uu = u * u * (3 - 2 * u) * 0.6 + u * 0.4;
    const p = path.getPoint(uu), ahead = path.getPoint(Math.min(1, uu + 0.12));
    const ph = t * 15;
    p.y += Math.abs(Math.sin(ph)) * 0.07 - 0.04; p.x += Math.sin(ph) * 0.03;
    cam(p, ahead.add(V(0, -0.15 + Math.sin(ph) * 0.03, 0)), 70, Math.sin(ph) * 0.025);
    const mp = path.getPoint(Math.min(1, uu + 0.22)), mp2 = path.getPoint(Math.min(1, uu + 0.25));
    place(malik, mp.x, 0, mp.z, faceTo(mp.x, mp.z, mp2.x, mp2.z), { walk: 1.15, phase: ph * 0.5, lean: 0.25 });
    for (const k of ['L', 'R']) { const s = k === 'L' ? -1 : 1, sw = Math.sin(ph * 0.5) * s; R.setArm(k, V(s * 0.3, -0.62, 0.05 - sw * 0.1), V(s * 0.2, -0.38 + sw * 0.06, -0.3 - sw * 0.12), V(-s * 0.3, 0.3, -1), V(-s * 0.5, -0.5, 0), 0.9); }
    fadeMat.opacity = ramp(t, d - 0.55, d);
  },
  corridor(t, d, T) {
    show('corr'); flicker(T);
    const l1 = LS('corridor', 1), stop = ramp(t, l1 - 0.2, l1 + 0.4);
    const walkT = Math.min(t, l1 + 0.2), zc = 0.5 - walkT * 1.25;
    const ph = walkT * 7;
    const pos = C(0.05, lerp(1.72 + Math.sin(ph) * 0.025, 1.05, stop), zc);
    cam(pos.add(hand(T, 0.01)), C(lerp(0.2, 0.5, stop), lerp(1.6, 1.3, stop), -24), lerp(66, 58, stop));
    const mz = zc - 1.7;
    idle(T + ph * 0.1, 'LR', { x: 0.11, y: lerp(-0.18, -0.13, stop), z: -0.36, sway: 0.012, curl: lerp(0.4, 0.2, stop) });
    place(malik, C(-0.45, 0, 0).x, 0, C(0, 0, mz).z, lerp(Math.PI, 0.3, ramp(t, l1 - 0.25, l1 + 0.1)), { walk: (1 - stop) * 0.6, phase: ph, crouch: stop * 0.8, talk: talk('MALIK', T), wide: stop, arms: stop > 0.5 ? { L: [-0.4, -0.2, -0.6], R: [-1.3, 0.3, -0.4] } : undefined });
    const s = sol[0], sk = ramp(t, l1 - 0.7, d);
    place(s, C(lerp(4.5, 1.2, sk), 0, 0).x, 0, C(0, 0, -24.2).z, -Math.PI / 2 + sk * 0.6, { walk: 0.7, phase: T * 5 });
    s.flash.rotation.y = 0.35;
    fadeMat.opacity = 1 - ramp(t, 0, 0.6);
  },
  hide(t, d, T) {
    show('corr'); flicker(T);
    const u = t / d, beat = Math.pow(Math.max(0, Math.sin(T * Math.PI * 2 / 0.82)), 8);
    cam(vlerp(C(-3.45, 0.62, -7.9), C(-3.3, 0.7, -8.5), ss(u)).add(hand(T, 0.006)), C(-0.6, 1.0, -16), lerp(56, 46, ss(u)) - beat * 0.8);
    place(ben, C(-2.75, 0, 0).x, 0, C(0, 0, -9.35).z, 2.5, { crouch: 0.95, lean: 0.35, headY: -0.4, arms: { L: [-0.7, -0.1, -1.4], R: [-0.6, 0.1, -1.2] } });
    place(malik, C(-3.05, 0, 0).x, 0, C(0, 0, -10.2).z, 2.4, { crouch: 1.0, lean: 0.45, headY: 0.3, headX: 0.2, wide: 1, arms: { L: [-1.0, 0.4, -1.8], R: [-1.0, -0.4, -1.8] } });
    const s = sol[0], sk = clamp((t - 0.0) / 3.6), stopS = t > 1.4 && t < 2.6 ? 1 : 0;
    const z = lerp(-23.5, -15.6, ss(sk));
    place(s, C(0.4, 0, 0).x, 0, C(0, 0, z).z, 0, { walk: stopS ? 0 : 0.7, phase: z * 2.6, talk: talk('SOLDAT', T), headY: Math.sin(T * 1.5) * 0.3 });
    s.flash.rotation.y = Math.sin(T * 1.2) * 0.5 - 0.2;
  },
  hide_pov(t, d, T) {
    show('corr'); flicker(T);
    const beat = Math.pow(Math.max(0, Math.sin(T * Math.PI * 2 / 0.82)), 8);
    const pos = C(-2.35, 1.05, -9.4).add(hand(T, 0.006));
    cam(pos, C(0.2, 1.2, -15.3).add(hand(T, 0.05)), 50 - beat * 1.2);
    place(malik, C(-3.35, 0, 0).x, 0, C(0, 0, -9.9).z, 2.6, { crouch: 1.0, lean: 0.5, headX: 0.3, wide: 1, arms: { L: [-1.0, 0.4, -1.8], R: [-1.0, -0.4, -1.8] } });
    const s = sol[0], turn = ramp(t, 3.2, 3.8), away = Math.max(0, t - 3.6) * 1.3;
    const sp = C(0.4, 0, -15.6 - away);
    place(s, sp.x, 0, sp.z, lerp(-0.25, Math.PI, turn), { walk: t > 3.6 ? 0.7 : 0, phase: away * 2.6, talk: talk('SOLDAT', T), headY: lerp(-0.4, 0, turn) });
    s.flash.rotation.set(0.05, lerp(-0.7, 0.5, ramp(t, 0.3, 2.0)) * (1 - turn), 0);
    const tense = 0.004 * Math.sin(T * 7);
    idle(T, 'LR', { x: 0.075, y: -0.15 + tense, z: -0.42, curl: 0.85, sway: 0.003 });
  },
  elevator(t, d, T) {
    show('elev');
    const moving = t > 2.0 ? Math.sin(T * 40) * 0.0015 * (1 - ramp(t, 2.8, 3.1)) : 0;
    const pos = V(EO.x - 0.15, 1.72 + moving, EO.z + 0.45);
    const lookP = vlerp(V(EO.x + 1.0, 1.4, EO.z - 0.3), V(EO.x + 1.0, 1.3, EO.z - 0.35), ss(t / 2));
    cam(pos.add(hand(T, 0.004)), t < 2.6 ? lookP : vlerp(lookP, V(EO.x, 2.25, EO.z - 1.08), ramp(t, 2.6, 3.1)), lerp(64, 56, ss(t / d)));
    const pressed = t > 1.9; elevBtn.material = pressed ? glowMat(0xffa040) : elevBtn.material;
    if (!pressed) elevBtn.material = toon(0xb9bec4, { metalness: 0.7, roughness: 0.3 });
    const btnW = elevBtn.getWorldPosition(new THREE.Vector3()).add(V(-0.035, 0, 0));
    const reach = ramp(t, 0.6, 1.85) * (1 - ramp(t, 2.1, 2.7));
    const rest = V(0.25, -0.45, -0.25), tip = toCam(btnW.add(V(-0.06 * (1 - ramp(t, 1.75, 1.9)), 0, 0)));
    const hp = vlerp(rest, tip.clone().add(dirToCam(V(-0.08, -0.01, 0.0))), ss(reach));
    if (reach > 0.01) R.setArm('R', V(0.3, -0.55, 0.05), hp, dirToCam(V(1, 0.05, 0)), dirToCam(V(0, -1, 0)), [0, 1, 1, 1], 1);
    idle(T, 'L', { x: 0.09, y: -0.19, z: -0.34 });
    if (reach <= 0.01) idle(T, 'R', { x: 0.1, y: -0.2, z: -0.34 });
    const fl = t < 2.2 ? '0' : t < 2.55 ? '−1' : t < 2.9 ? '−2' : '−3';
    drawDisp(fl, t > 2.0 && t < 3.0);
    fadeMat.opacity = ramp(t, d - 0.4, d);
  },
  vault_wide(t, d, T) {
    show('vault'); const u = ss(t / d);
    cam(vlerp(VV(7.5, 8.5, 10), VV(3.2, 2.4, 1.0), u).add(hand(T, 0.02)), vlerp(VV(0, 1.6, -15), VV(-0.2, 2.1, -15), u), lerp(52, 46, u));
    const l0 = LS('vault_wide', 0);
    place(ben, VV(-0.65, 0, 0).x, 0, VV(0, 0, -9.0).z, Math.PI + 0.05, { headX: -0.3, arms: { L: [0.05, -0.1, -0.2], R: [0.05, 0.1, -0.2] } });
    place(malik, VV(0.7, 0, 0).x, 0, VV(0, 0, -9.4).z, Math.PI - 0.1, { headX: -0.25, headY: t > l0 - 0.2 ? -0.7 : 0, talk: talk('MALIK', T), wide: 0.5 });
    fadeMat.opacity = 1 - ramp(t, 0, 0.5);
  },
  wheel(t, d, T) {
    show('vault');
    const spin = ss(clamp(t / 2.7)) * Math.PI * 1.35, open = ss(clamp((t - 3.1) / 2.5));
    wheel.rotation.z = -spin; doorPiv.rotation.y = -open * 1.45;
    const back = ramp(t, 3.0, 4.4);
    const pos = VV(0.03, 1.72, -14.12 + back * 1.4).add(hand(T, 0.006 + (t > 2.6 && t < 3.0 ? 0.02 : 0)));
    cam(pos, VV(lerp(0, 0.4, back), lerp(2.25, 1.9, back), -15.5), lerp(80, 64, back));
    const hands = 1 - ramp(t, 2.9, 3.3);
    if (hands <= 0.02) idle(T, 'LR', { y: -0.16 });
    if (hands > 0.02) {
      wheel.updateMatrixWorld(true);
      for (const [k, a0] of [['L', 2.0], ['R', 1.15]]) {
        const a = a0, rim = wheel.localToWorld(V(Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.09));
        const tan = wheel.localToWorld(V(Math.cos(a + 0.3) * 0.55, Math.sin(a + 0.3) * 0.55, 0.02)).sub(rim).normalize();
        const s = k === 'L' ? -1 : 1;
        const hp = vlerp(toCam(rim), V(s * 0.25, -0.5, -0.2), 1 - hands);
        R.setArm(k, V(s * 0.3, -0.55, 0.05), hp, dirToCam(s < 0 ? tan.clone().negate() : tan), dirToCam(V(0, 0, -1)), 0.9, null);
      }
    }
  },
  reveal(t, d, T) {
    show('vault'); doorPiv.rotation.y = -1.45; drawScreen(T, false);
    const u = ss(clamp(t / 3.6)), ph = t * 7 * (1 - u * 0.6);
    const pos = VV(0, 1.72 + Math.sin(ph) * 0.02 * (1 - u), lerp(-13.4, -18.6, u));
    cam(pos.add(hand(T, 0.008)), VV(0, lerp(2.4, 4.0, u), -36), lerp(66, 50, ss(t / d)));
    place(malik, VV(1.1, 0, 0).x, 0, VV(0, 0, lerp(-14.6, -19.4, ss(clamp((t - 0.3) / 3.6)))).z, Math.PI, { walk: 0.5 * (1 - u), phase: ph, headX: -0.25 });
    folderCover.rotation.z = 0;
    idle(T + ph * 0.1, 'LR', { y: lerp(-0.18, -0.15, u), sway: 0.01 * (1 - u) + 0.005 });
  },
  folder(t, d, T) {
    show('vault'); doorPiv.rotation.y = -1.45; drawScreen(T, false);
    const l1 = LS('folder', 1), l2 = LS('folder', 2);
    const open = ss(clamp((t - 0.25) / 1.0)); folderCover.rotation.z = open * (Math.PI - 0.06);
    place(malik, VV(0.1, 0, 0).x, 0, VV(0, 0, -22.35).z, 0, { talk: talk('MALIK', T), headX: t < l1 ? 0.45 : 0, wide: t > l1 ? 0.8 : 0, arms: { L: [-0.6, -0.1, -0.7], R: [-0.6, 0.1, -0.7] } });
    place(ben, VV(0, 0, 0).x, 0, VV(0, 0, -19.9).z, Math.PI, { talk: talk('BEN', T), headX: 0.2 });
    if (t < l1 - 0.12) {
      ben.root.visible = false;
      const u = t / (l1 - 0.12);
      cam(VV(0.02, 1.72, -19.85).add(hand(T, 0.004)), VV(0, lerp(0.95, 1.05, ss(u)), lerp(-21.1, -21.3, u)), lerp(60, 50, ss(u)));
      folderCover.updateMatrixWorld(true);
      const edge = folderCover.localToWorld(V(0.3, 0.01, 0.05));
      const hp = vlerp(V(0.22, -0.45, -0.2), toCam(edge), ramp(t, 0.0, 0.3) * (1 - ramp(t, 1.3, 1.8)));
      const rest = ramp(t, 1.3, 1.8);
      if (rest < 0.5) R.setArm('R', V(0.3, -0.6, 0.0), hp, dirToCam(V(-0.4, -0.2, -1)), dirToCam(V(0, -1, 0)), 0.3, null);
      else gripW('R', VV(0.2, 0.93, -20.66), V(-0.3, 0, -1), V(0, -1, 0), 0.35);
      gripW('L', VV(-0.2, 0.93, -20.62), V(0.3, 0, -1), V(0, -1, 0), 0.35);
    } else if (t < l2 - 0.1) {
      const u = (t - l1) / (l2 - l1);
      cam(vlerp(VV(0.75, 1.62, -20.7), VV(0.6, 1.64, -21.0), u).add(hand(T, 0.004)), VV(0.1, 1.64, -22.35), lerp(36, 28, u));
    } else {
      const u = ss((t - l2) / (d - l2));
      cam(vlerp(VV(-1.4, 1.95, -18.6), VV(-0.4, 3.0, -25.5), u).add(hand(T, 0.01)), VV(0.8, 4.0, -36), lerp(52, 30, u));
    }
  },
  alarm(t, d, T) {
    show('vault'); doorPiv.rotation.y = -1.45; drawScreen(T, t > 0.5); folderCover.rotation.z = Math.PI - 0.06;
    const on = t > 0.5;
    for (const v of vaultLights) v.intensity = on ? 25 : 130; for (const h of hallLamps) h.intensity = on ? 0 : 6;
    alarmFill.intensity = on ? 30 * (0.4 + 0.6 * Math.max(0, Math.sin(T * 9))) : 0;
    for (let i = 0; i < alarmLights.length; i++) {
      const a = alarmLights[i]; a.intensity = on ? 400 : 0;
      const ang = T * 5 + i * 1.3; a.target.position.set(a.position.x + Math.cos(ang) * 6, 1.5, a.position.z + Math.sin(ang) * 6);
      alarmBeacons[i].material.color.set(on && Math.sin(ang * 2) > 0 ? 0xff2010 : 0x550000);
    }
    const turn = ss(clamp((t - 1.0) / 0.8)), yaw = turn * Math.PI;
    const pos = VV(-0.1, 1.72, -20.6).add(hand(T, on ? 0.012 : 0.004, on ? 1.8 : 1));
    const dir = V(-Math.sin(yaw) * 0.3, 0, -Math.cos(yaw));
    const look = pos.clone().add(dir.multiplyScalar(10)).add(V(0, lerp(2.0, -0.8, turn), 0));
    cam(pos, look, lerp(60, 52, ramp(t, 1.8, 3.5)), Math.sin(T * 9) * 0.01 * turn);
    place(malik, VV(1.1, 0, 0).x, 0, VV(0, 0, -20.3).z, lerp(Math.PI, 0.2, turn), { talk: talk('MALIK', T), wide: on ? 1 : 0, headY: t > d - 1.4 ? -0.8 : 0, arms: t > 2.6 ? { L: [-2.7, -0.3, -0.3], R: [-2.7, 0.3, -0.3] } : undefined });
    const enter = ramp(t, 0.6, 2.2);
    sol.slice(0, 2).forEach((s, i) => {
      const p = VV(i ? 0.95 : -0.85, 0, lerp(-14.2, -16.3 - i * 0.4, enter));
      place(s, p.x, 0, p.z, faceTo(p.x, p.z, pos.x, pos.z), { walk: enter < 1 ? 0.6 : 0, phase: T * 6 + i, talk: i === 0 ? talk('SOLDAT', T) : 0 });
      s.flash.rotation.set(0.05, Math.sin(T * 3 + i) * 0.05, 0); s.cone.visible = false;
    });
    const up = ramp(t, 2.6, 3.1);
    if (up <= 0.01) idle(T, 'LR', { y: -0.17, sway: on ? 0.015 : 0.006 });
    if (up > 0.01) for (const k of ['L', 'R']) { const s = k === 'L' ? -1 : 1; R.setArm(k, V(s * 0.42, -0.4, -0.05), V(s * 0.24, lerp(-0.5, 0.06, up), -0.42), V(0, 1, -0.1), V(0, 0, -1), 0.08, null); }
    fadeMat.color.set(0x000000); fadeMat.opacity = ramp(t, d - 0.3, d);
  },
  end(t, d, T) { show('vault'); fadeMat.opacity = 1; },
};
function patrol(T, noGuard) {
  const g0 = sol[0], g1 = sol[1];
  place(g0, B(1.8, 0, 0).x, 0, B(0, 0, 15.6).z, Math.sin(T * 0.4) * 0.5, { headY: Math.sin(T * 0.9) * 0.4 });
  g0.flash.rotation.set(0.25, Math.sin(T * 0.5) * 0.5, 0);
  const cyc = (T * 1.2) % 44, x = cyc < 22 ? -18 + cyc : 4 - (cyc - 22), dir = cyc < 22 ? Math.PI / 2 : -Math.PI / 2;
  place(g1, B(x, 0, 0).x, 0, B(0, 0, 12.5).z, dir, { walk: 0.7, phase: T * 4.6 });
  if (!noGuard) { const s = sol[2]; place(s, B(22.4, 0, 0).x, 0, B(0, 0, 4.4).z, Math.PI / 2 + 0.4, { headY: Math.sin(T * 0.8) * 0.5 }); s.flash.rotation.y = Math.sin(T * 1.3) * 0.3; }
}
function flicker(T) {
  for (const { pl, i } of corrLights) pl.intensity = i === 4 ? (Math.sin(T * 31) > 0.3 || (T * 3) % 1 < 0.6 ? 7 : 0.5) : 7;
}

// ---------------- API ----------------
window.renderFrame = (f) => {
  const T = f / TL.fps; let s = TL.shots[TL.shots.length - 1];
  for (const x of TL.shots) if (T >= x.start && T < x.start + x.dur) { s = x; break; }
  reset(); SHOTS[s.id](T - s.start, s.dur, T);
  sky.position.copy(camera.position);
  composer.render();
  return renderer.domElement.toDataURL('image/jpeg', 0.92);
};
window.FRAMES = Math.round(TL.total * TL.fps);
window.ready = true;
